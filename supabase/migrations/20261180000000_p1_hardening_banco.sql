-- 2026-06-12 — P1 da auditoria de pré-lançamento: hardening do banco.
-- Dados atuais validados ANTES (0 linhas violando os CHECKs novos).

-- ─── 1. corretora_avaliacoes: espelhar no versionamento (era DRIFT — criada
--        direto no remoto; achado de governança da auditoria) + índices de FK ───
create table if not exists public.corretora_avaliacoes (
  id uuid primary key default gen_random_uuid(),
  corretora_id uuid not null references public.corretoras(id) on delete cascade,
  produtor_id uuid not null references public.profiles(id) on delete cascade,
  rating smallint not null check (rating >= 1 and rating <= 5),
  comment text check (comment is null or char_length(comment) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (corretora_id, produtor_id)
);
alter table public.corretora_avaliacoes enable row level security;

-- policies idênticas às do remoto (recriadas idempotentemente)
drop policy if exists avaliacoes_select on public.corretora_avaliacoes;
create policy avaliacoes_select on public.corretora_avaliacoes for select
  using (
    produtor_id = (select auth.uid())
    or corretora_id = public.current_corretora()
    or public.is_admin()
  );
drop policy if exists avaliacoes_insert on public.corretora_avaliacoes;
create policy avaliacoes_insert on public.corretora_avaliacoes for insert
  with check (
    produtor_id = (select auth.uid())
    and (
      exists (select 1 from public.leads l
        where l.corretora_id = corretora_avaliacoes.corretora_id
          and l.produtor_id = (select auth.uid()))
      or exists (select 1 from public.contratos ct
        where ct.corretora_id = corretora_avaliacoes.corretora_id
          and ct.produtor_id = (select auth.uid()))
    )
  );
drop policy if exists avaliacoes_update on public.corretora_avaliacoes;
create policy avaliacoes_update on public.corretora_avaliacoes for update
  using (produtor_id = (select auth.uid()))
  with check (produtor_id = (select auth.uid()));
drop policy if exists avaliacoes_delete on public.corretora_avaliacoes;
create policy avaliacoes_delete on public.corretora_avaliacoes for delete
  using (produtor_id = (select auth.uid()));

-- índices das FKs (advisor: unindexed_foreign_keys)
create index if not exists corretora_avaliacoes_corretora_idx
  on public.corretora_avaliacoes (corretora_id);
create index if not exists corretora_avaliacoes_produtor_idx
  on public.corretora_avaliacoes (produtor_id);

-- ─── 2. Cascatas destrutivas → RESTRICT (documento legal/financeiro NÃO
--        some num hard-delete de corretora; assimetria com produtor_id, que
--        já era restrict desde o schema inicial) ───
alter table public.contratos drop constraint contratos_corretora_id_fkey;
alter table public.contratos add constraint contratos_corretora_id_fkey
  foreign key (corretora_id) references public.corretoras(id) on delete restrict;

alter table public.produtor_pagamentos drop constraint produtor_pagamentos_corretora_id_fkey;
alter table public.produtor_pagamentos add constraint produtor_pagamentos_corretora_id_fkey
  foreign key (corretora_id) references public.corretoras(id) on delete restrict;

alter table public.subscriptions drop constraint subscriptions_corretora_id_fkey;
alter table public.subscriptions add constraint subscriptions_corretora_id_fkey
  foreign key (corretora_id) references public.corretoras(id) on delete restrict;

-- prova de consentimento LGPD sobrevive ao hard-delete do titular
-- (a tabela guarda email próprio pra esse caso)
alter table public.lgpd_consents drop constraint lgpd_consents_profile_id_fkey;
alter table public.lgpd_consents add constraint lgpd_consents_profile_id_fkey
  foreign key (profile_id) references public.profiles(id) on delete set null;

-- ─── 3. CHECKs de dinheiro/quantidade (null-safe; dados atuais limpos) ───
alter table public.contratos add constraint contratos_valores_validos check (
  (total_value is null or total_value >= 0)
  and (bag_count is null or bag_count >= 0)
  and (comissao_total is null or comissao_total >= 0)
  and (comissao_pct is null or (comissao_pct >= 0 and comissao_pct <= 100))
);

alter table public.produtor_pagamentos add constraint pagamentos_valores_validos check (
  (valor_bruto is null or valor_bruto >= 0)
  and (valor_liquido is null or valor_liquido >= 0)
  and (valor_bruto is null or valor_liquido is null or valor_liquido <= valor_bruto)
);

alter table public.cotacoes add constraint cotacoes_price_positivo check (price > 0);

alter table public.leads add constraint leads_valores_validos check (
  (bag_count is null or bag_count >= 0)
  and (proposed_price is null or proposed_price >= 0)
);

alter table public.entregas add constraint entregas_bag_count_positivo check (
  bag_count is null or bag_count > 0
);

alter table public.lotes add constraint lotes_peso_kg_nao_negativo check (
  peso_kg is null or peso_kg >= 0
);

alter table public.amostras add constraint amostras_preco_nao_negativo check (
  preco_oferta is null or preco_oferta >= 0
);

-- ─── 4. Conservação de sacas: ADVISORY LOCK por contrato (auditoria: duas
--        entregas concorrentes liam o mesmo saldo e ambas passavam — oversell).
--        Mesmo padrão do approve_corretora (20260731). ───
create or replace function public.tg_entrega_valida_saldo()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_contratado numeric;
  v_outras     numeric;
  v_nova       numeric;
begin
  if NEW.status = 'cancelada' then
    return NEW;
  end if;

  v_nova := coalesce(NEW.bag_count, 0);
  if v_nova <= 0 then
    return NEW;
  end if;

  -- serializa validações concorrentes do MESMO contrato (libera no fim da txn)
  perform pg_advisory_xact_lock(hashtextextended('entrega_saldo:' || NEW.contrato_id::text, 0));

  select bag_count into v_contratado
  from public.contratos
  where id = NEW.contrato_id;

  if v_contratado is null then
    return NEW;
  end if;

  select coalesce(sum(bag_count), 0) into v_outras
  from public.entregas
  where contrato_id = NEW.contrato_id
    and status <> 'cancelada'
    and id <> NEW.id;

  if v_outras + v_nova > v_contratado then
    raise exception
      'Saldo de sacas excedido: o contrato tem % sacas, ja ha % em entregas e esta soma % (total %). Ajuste o contrato ou a quantidade da entrega.',
      v_contratado, v_outras, v_nova, v_outras + v_nova
      using errcode = 'check_violation';
  end if;

  return NEW;
end;
$function$;

-- ─── 5. Contadores sociais blindados: autor não pode mais editar
--        likes_count/comments_count via PostgREST (privilégio por COLUNA;
--        os triggers de contagem são SECURITY DEFINER e não são afetados) ───
revoke update on public.social_posts from authenticated;
grant update (body) on public.social_posts to authenticated;

-- ─── 6. lotes_publicos: corretora/produtor soft-deletado (pedido LGPD) some
--        do catálogo ANÔNIMO (a view é definer — RLS não filtrava) ───
create or replace view public.lotes_publicos as
select
  l.id, l.codigo, l.safra, l.descricao, l.specie, l.processo,
  l.peso_sacas, l.peso_kg, l.status, l.created_at, l.corretora_id, l.produtor_id,
  c.name as corretora_name, c.slug as corretora_slug, c.city as corretora_city,
  c.state as corretora_state, c.descricao as corretora_descricao,
  c.logo_url as corretora_logo_url, c.verified as corretora_verified,
  p.city as produtor_city, p.state as produtor_state, p.altitude_m,
  p.certificacoes, p.indicacao_geografica, p.foto_capa_url,
  cl.tipo as classificacao_tipo, cl.fora_de_tipo as classificacao_fora_de_tipo,
  cl.bebida as classificacao_bebida, cl.pontuacao as classificacao_pontuacao,
  cl.peneira_dominante as classificacao_peneira,
  cl.bica_corrida as classificacao_bica_corrida
from public.lotes l
join public.corretoras c on c.id = l.corretora_id and c.deleted_at is null
left join public.produtores p on p.profile_id = l.produtor_id and p.deleted_at is null
left join lateral (
  select tipo, fora_de_tipo, bebida, pontuacao, peneira_dominante, bica_corrida
  from public.classificacoes_cob
  where lote_id = l.id and not anulada
  order by created_at desc
  limit 1
) cl on true
where l.status = any (array[
  'aguardando_classificacao'::lote_status, 'classificado'::lote_status,
  'fora_de_tipo'::lote_status, 'rebeneficiar'::lote_status, 'vendido'::lote_status
]);

-- ─── 7. Índice da FK descoberta (advisor) ───
create index if not exists metas_venda_alerta_idx on public.metas_venda (alerta_id);

-- ─── 8. Badges do sidebar em 1 RPC (eram 6 counts em TODA navegação do
--        painel da corretora — o multiplicador de queries mais caro do app) ───
create or replace function public.corretora_sidebar_badges()
returns table (
  leads_novos integer,
  em_negociacao integer,
  lotes_parados integer,
  acoes_pendentes integer
)
language sql
stable
security definer
set search_path = public
as $$
  with c as (select public.current_corretora() as id)
  select
    (select count(*) from public.leads l, c
      where l.corretora_id = c.id and l.status = 'novo')::int as leads_novos,
    (select count(*) from public.leads l, c
      where l.corretora_id = c.id and l.status = 'em_negociacao')::int as em_negociacao,
    (select count(*) from public.lotes lo, c
      where lo.corretora_id = c.id and lo.status = 'classificado'
        and lo.updated_at < now() - interval '7 days')::int as lotes_parados,
    (
      (select count(*) from public.leads l, c
        where l.corretora_id = c.id and l.status in ('novo','em_negociacao'))
      + (select count(*) from public.contratos ct, c
        where ct.corretora_id = c.id and ct.status in ('rascunho','em_analise'))
      + (select count(*) from public.produtor_pagamentos pp, c
        where pp.corretora_id = c.id and pp.status in ('vencido','pendente'))
      + (select count(*) from public.entregas e, c
        where e.corretora_id = c.id and e.status = 'recebida')
    )::int as acoes_pendentes;
$$;

revoke execute on function public.corretora_sidebar_badges() from public, anon;
grant execute on function public.corretora_sidebar_badges() to authenticated;
