-- =================================================================
-- Milsaca — Bloco C: alvos de preço (price_alerts)
-- Data: 2026-05-22
-- =================================================================

-- Adiciona 'price_alert' ao enum notification_kind (idempotente)
do $$
begin
  if not exists (
    select 1 from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'notification_kind' and e.enumlabel = 'price_alert'
  ) then
    alter type public.notification_kind add value 'price_alert';
  end if;
end $$;

-- Produtor cadastra alvo "me avise quando café arábica natural na
-- praça Manhuaçu bater R$ 2.000/saca". Cron varre alvos após sync,
-- compara contra última cotação do (product, region), dispara
-- message_dispatch + system_event se bateu condição.
--
-- Dedup: alvo só dispara a cada 24h (evita spam quando preço oscila
-- em torno do alvo).
-- =================================================================

create table if not exists public.price_alerts (
  id                uuid primary key default extensions.uuid_generate_v4(),
  produtor_id       uuid not null references public.profiles(id) on delete cascade,
  product_id        uuid not null references public.coffee_types(id) on delete cascade,
  region_id         uuid references public.pracas(id) on delete set null,
  target_price      numeric(12,2) not null check (target_price > 0),
  condition         text not null
    check (condition in ('acima_de','abaixo_de')),
  channel           text not null
    check (channel in ('app','whatsapp','email'))
    default 'app',
  active            boolean not null default true,
  last_triggered_at timestamptz,
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
alter table public.price_alerts enable row level security;

create index if not exists price_alerts_produtor_idx
  on public.price_alerts (produtor_id, active);
create index if not exists price_alerts_product_idx
  on public.price_alerts (product_id, active);

-- RLS: produtor lê/edita os próprios; admin tudo.
drop policy if exists price_alerts_owner_select on public.price_alerts;
create policy price_alerts_owner_select
  on public.price_alerts for select
  using (auth.uid() = produtor_id or public.is_admin());

drop policy if exists price_alerts_owner_write on public.price_alerts;
create policy price_alerts_owner_write
  on public.price_alerts for all
  using (auth.uid() = produtor_id or public.is_admin())
  with check (auth.uid() = produtor_id or public.is_admin());

drop trigger if exists tg_set_updated_at_price_alerts on public.price_alerts;
create trigger tg_set_updated_at_price_alerts
  before update on public.price_alerts
  for each row execute function public.tg_set_updated_at();

comment on table public.price_alerts is
  'Alvos de preço cadastrados por produtores. Cron check_price_targets dispara message_dispatch quando última cotação do (product, region) bate a condição. Dedup 24h.';

-- -----------------------------------------------------------------
-- Template de notificação pro alerta
-- -----------------------------------------------------------------
insert into public.notification_templates (channel, kind, name, body, subject, variables)
values
  ('whatsapp', 'alvo_preco_atingido_whatsapp',
   'Alvo de preço atingido — WhatsApp',
   'Oi {{nome}}, sua cotação alvo de {{produto}} {{condicao}} R$ {{alvo}}/saca foi atingida agora. Preço atual: R$ {{preco_atual}}. Praça: {{praca}}. Corretora: {{corretora}}.',
   null,
   '["nome","produto","condicao","alvo","preco_atual","praca","corretora"]'::jsonb),
  ('email', 'alvo_preco_atingido_email',
   'Alvo de preço atingido — Email',
   'Olá {{nome}}, o preço de {{produto}} {{condicao}} {{alvo}} R$/saca foi atingido. Preço atual: R$ {{preco_atual}}/saca. Praça: {{praca}}. Corretora que postou: {{corretora}}. Acesse /painel/produtor/cotacoes pra ver detalhes.',
   'Alvo de preço atingido — Milsaca',
   '["nome","produto","condicao","alvo","preco_atual","praca","corretora"]'::jsonb)
on conflict (channel, kind) do nothing;

-- -----------------------------------------------------------------
-- check_price_targets — varre alvos e dispara notificações
-- -----------------------------------------------------------------
create or replace function public.check_price_targets() returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count        integer := 0;
  v_alert        record;
  v_quote        record;
  v_template_id  uuid;
  v_tpl_kind     text;
  v_match        boolean;
  v_recipient    text;
  v_condicao_txt text;
  v_produto_name text;
  v_praca_name   text;
  v_produtor_name text;
  v_produtor_phone text;
  v_produtor_email text;
begin
  for v_alert in
    select pa.id, pa.produtor_id, pa.product_id, pa.region_id,
           pa.target_price, pa.condition, pa.channel,
           pa.last_triggered_at
      from public.price_alerts pa
      join public.coffee_types ct on ct.id = pa.product_id
     where pa.active = true
       and ct.active = true
       and (pa.last_triggered_at is null
            or pa.last_triggered_at < now() - interval '24 hours')
  loop
    -- Busca última cotação manual ativa que bate (product, opcional region)
    select c.id, c.price, c.region, c.region_id, c.corretora_id,
           cor.name as corretora_name
      into v_quote
      from public.cotacoes c
      left join public.corretoras cor on cor.id = c.corretora_id
     where c.status = 'active'
       and c.product_id = v_alert.product_id
       and (v_alert.region_id is null or c.region_id = v_alert.region_id)
     order by c.reference_date desc, c.created_at desc
     limit 1;

    if not found then
      continue;
    end if;

    -- Match da condição
    if v_alert.condition = 'acima_de' then
      v_match := v_quote.price >= v_alert.target_price;
      v_condicao_txt := 'subir acima de';
    else
      v_match := v_quote.price <= v_alert.target_price;
      v_condicao_txt := 'cair abaixo de';
    end if;

    if not v_match then
      continue;
    end if;

    -- Dados pro template
    select name into v_produto_name from public.coffee_types where id = v_alert.product_id;
    if v_alert.region_id is not null then
      select name into v_praca_name from public.pracas where id = v_alert.region_id;
    else
      v_praca_name := coalesce(v_quote.region, '—');
    end if;

    select p.full_name, p.phone, u.email
      into v_produtor_name, v_produtor_phone, v_produtor_email
      from public.profiles p
      left join auth.users u on u.id = p.id
     where p.id = v_alert.produtor_id;

    -- Escolhe template + recipient pelo canal
    if v_alert.channel = 'whatsapp' then
      v_tpl_kind := 'alvo_preco_atingido_whatsapp';
      v_recipient := v_produtor_phone;
    elsif v_alert.channel = 'email' then
      v_tpl_kind := 'alvo_preco_atingido_email';
      v_recipient := v_produtor_email;
    else
      -- app: in-app notification via notifications table (legacy)
      v_tpl_kind := null;
      v_recipient := v_alert.produtor_id::text;
    end if;

    if v_tpl_kind is not null and v_recipient is not null and v_recipient <> '' then
      select id into v_template_id
        from public.notification_templates
       where channel = v_alert.channel and kind = v_tpl_kind and active = true
       limit 1;

      if v_template_id is not null then
        insert into public.message_dispatches (
          template_id, channel, recipient, payload, profile_id, corretora_id
        ) values (
          v_template_id, v_alert.channel, v_recipient,
          jsonb_build_object(
            'nome', coalesce(v_produtor_name, 'produtor'),
            'produto', coalesce(v_produto_name, '—'),
            'condicao', v_condicao_txt,
            'alvo', v_alert.target_price,
            'preco_atual', v_quote.price,
            'praca', coalesce(v_praca_name, '—'),
            'corretora', coalesce(v_quote.corretora_name, '—')
          ),
          v_alert.produtor_id,
          v_quote.corretora_id
        );
      end if;
    end if;

    -- Notificação in-app (sempre, pra produtor ver no app)
    insert into public.notifications (user_id, kind, title, body, data)
    values (
      v_alert.produtor_id,
      'price_alert'::public.notification_kind,
      'Alvo de preço atingido',
      coalesce(v_produto_name, 'Café') || ' ' || v_condicao_txt || ' R$ ' ||
        v_alert.target_price::text || '/saca · agora R$ ' || v_quote.price::text,
      jsonb_build_object(
        'alert_id', v_alert.id,
        'product_id', v_alert.product_id,
        'region', v_praca_name,
        'corretora', v_quote.corretora_name,
        'preco_atual', v_quote.price
      )
    );

    update public.price_alerts
       set last_triggered_at = now()
     where id = v_alert.id;

    perform public.fn_log_system_event(
      'alert.price_triggered',
      'success',
      jsonb_build_object(
        'alert_id', v_alert.id,
        'product_id', v_alert.product_id,
        'condition', v_alert.condition,
        'target', v_alert.target_price,
        'actual', v_quote.price
      )
    );

    v_count := v_count + 1;
  end loop;

  perform public.fn_log_system_event(
    'cron.check-price-targets.run',
    'success',
    jsonb_build_object('triggered_count', v_count)
  );

  return v_count;
exception when others then
  perform public.fn_log_system_event(
    'cron.check-price-targets.run',
    'failed',
    '{}'::jsonb,
    sqlerrm
  );
  raise;
end;
$$;

grant execute on function public.check_price_targets() to authenticated;

-- -----------------------------------------------------------------
-- Cron: roda 30min depois de cada sync (12:30 e 21:30 UTC), dias úteis
-- -----------------------------------------------------------------
do $$
begin
  if exists (select 1 from cron.job where jobname = 'milsaca-check-price-targets') then
    perform cron.unschedule('milsaca-check-price-targets');
  end if;
end $$;

select cron.schedule(
  'milsaca-check-price-targets',
  '30 12,21 * * 1-5',
  $$select public.check_price_targets();$$
);
