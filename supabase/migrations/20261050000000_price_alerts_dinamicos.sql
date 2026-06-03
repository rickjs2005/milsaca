-- =================================================================
-- Milsaca — Alertas de preço DINÂMICOS (2026-06-03)
-- =================================================================
-- Além de "subir acima de" / "cair abaixo de" (valor fixo), o produtor
-- passa a poder criar:
--   - melhor_preco: "me avise quando aparecer o melhor preço da praça"
--   - acima_media : "me avise quando alguém pagar X% acima da média"
--
-- Esses comparam o GRUPO (product + praça opcional): pega a última cotação
-- ativa de cada corretora e calcula max + média. Reusa o cron
-- check_price_targets (12:30/21:30 UTC) e o dedup de 24h.
-- Idempotente.
-- =================================================================

-- 1) Relaxar constraints antigas (nomes auto-gerados → drop dinâmico) -------
do $$
declare c text;
begin
  for c in
    select conname from pg_constraint
     where conrelid = 'public.price_alerts'::regclass and contype = 'c'
       and (pg_get_constraintdef(oid) ilike '%condition%'
            or pg_get_constraintdef(oid) ilike '%target_price%')
  loop
    execute format('alter table public.price_alerts drop constraint %I', c);
  end loop;
end $$;

alter table public.price_alerts alter column target_price drop not null;
alter table public.price_alerts add column if not exists target_pct numeric(6,2);

-- 2) Novas constraints -----------------------------------------------------
alter table public.price_alerts drop constraint if exists price_alerts_condition_valid;
alter table public.price_alerts add constraint price_alerts_condition_valid
  check (condition in ('acima_de','abaixo_de','melhor_preco','acima_media'));

alter table public.price_alerts drop constraint if exists price_alerts_params_valid;
alter table public.price_alerts add constraint price_alerts_params_valid check (
  (condition in ('acima_de','abaixo_de') and target_price is not null and target_price > 0)
  or (condition = 'acima_media' and target_pct is not null and target_pct > 0)
  or (condition = 'melhor_preco')
);

-- 3) Templates pros alertas dinâmicos (genéricos, via {{detalhe}}) ---------
insert into public.notification_templates (channel, kind, name, body, subject, variables)
values
  ('whatsapp', 'alvo_dinamico_whatsapp',
   'Alerta de preço (dinâmico) — WhatsApp',
   'Oi {{nome}}, {{detalhe}} — {{produto}} em {{praca}}. Corretora: {{corretora}}. Veja em /painel/produtor/cotacoes.',
   null,
   '["nome","detalhe","produto","praca","corretora"]'::jsonb),
  ('email', 'alvo_dinamico_email',
   'Alerta de preço (dinâmico) — Email',
   'Olá {{nome}}, {{detalhe}}. Café: {{produto}}. Praça: {{praca}}. Corretora: {{corretora}}. Acesse /painel/produtor/cotacoes pra ver.',
   'Alerta de preço — Milsaca',
   '["nome","detalhe","produto","praca","corretora"]'::jsonb)
on conflict (channel, kind) do nothing;

-- 4) Reescreve check_price_targets cobrindo os 4 tipos ---------------------
create or replace function public.check_price_targets() returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count          integer := 0;
  v_alert          record;
  v_quote          record;
  v_template_id    uuid;
  v_tpl_kind       text;
  v_match          boolean;
  v_dynamic        boolean;
  v_condicao_txt   text;
  v_detalhe        text;
  v_titulo         text;
  v_recipient      text;
  v_produto_name   text;
  v_praca_name     text;
  v_corretora_name text;
  v_preco_atual    numeric;
  v_corretora_id   uuid;
  v_max            numeric;
  v_avg            numeric;
  v_n              integer;
  v_pct            numeric;
  v_produtor_name  text;
  v_produtor_phone text;
  v_produtor_email text;
  v_payload        jsonb;
begin
  for v_alert in
    select pa.id, pa.produtor_id, pa.product_id, pa.region_id,
           pa.target_price, pa.target_pct, pa.condition, pa.channel,
           pa.last_triggered_at
      from public.price_alerts pa
      join public.coffee_types ct on ct.id = pa.product_id
     where pa.active = true
       and ct.active = true
       and (pa.last_triggered_at is null
            or pa.last_triggered_at < now() - interval '24 hours')
  loop
    v_dynamic := v_alert.condition in ('melhor_preco','acima_media');
    v_match := false;
    v_preco_atual := null;
    v_corretora_name := null;
    v_corretora_id := null;

    select name into v_produto_name from public.coffee_types where id = v_alert.product_id;

    if not v_dynamic then
      -- ---- Tipos FIXOS: última cotação ativa do (product, região) ----
      select c.price, c.region, c.corretora_id, cor.name as corretora_name
        into v_quote
        from public.cotacoes c
        left join public.corretoras cor on cor.id = c.corretora_id
       where c.status = 'active'
         and c.product_id = v_alert.product_id
         and (v_alert.region_id is null or c.region_id = v_alert.region_id)
       order by c.reference_date desc, c.created_at desc
       limit 1;
      if not found then continue; end if;

      v_preco_atual := v_quote.price;
      v_corretora_name := v_quote.corretora_name;
      v_corretora_id := v_quote.corretora_id;
      if v_alert.region_id is not null then
        select name into v_praca_name from public.pracas where id = v_alert.region_id;
      else
        v_praca_name := coalesce(v_quote.region, '—');
      end if;

      if v_alert.condition = 'acima_de' then
        v_match := v_quote.price >= v_alert.target_price;
        v_condicao_txt := 'subir acima de';
      else
        v_match := v_quote.price <= v_alert.target_price;
        v_condicao_txt := 'cair abaixo de';
      end if;
      if not v_match then continue; end if;

      v_titulo := 'Alvo de preço atingido';
      v_detalhe := coalesce(v_produto_name,'Café') || ' ' || v_condicao_txt
                   || ' R$ ' || v_alert.target_price::text || '/saca · agora R$ '
                   || v_preco_atual::text;
    else
      -- ---- Tipos DINÂMICOS: agrega última cotação por corretora ----
      with latest as (
        select distinct on (c.corretora_id)
               c.corretora_id, c.price, c.region, cor.name as cor_name
          from public.cotacoes c
          left join public.corretoras cor on cor.id = c.corretora_id
         where c.status = 'active'
           and c.product_id = v_alert.product_id
           and (v_alert.region_id is null or c.region_id = v_alert.region_id)
         order by c.corretora_id, c.reference_date desc, c.created_at desc
      )
      select count(*), max(price), avg(price),
             (array_agg(cor_name order by price desc))[1],
             (array_agg(region   order by price desc))[1]
        into v_n, v_max, v_avg, v_corretora_name, v_praca_name
        from latest;

      if coalesce(v_n,0) = 0 then continue; end if;
      v_preco_atual := v_max;
      if v_alert.region_id is not null then
        select name into v_praca_name from public.pracas where id = v_alert.region_id;
      end if;
      v_praca_name := coalesce(v_praca_name, '—');

      if v_alert.condition = 'melhor_preco' then
        v_match := true;
        v_titulo := 'Melhor preço da praça';
        v_detalhe := 'o melhor preço agora é R$ ' || round(v_max,2)::text || '/saca';
      else
        if v_n < 2 then continue; end if;
        v_pct := ((v_max - v_avg) / v_avg) * 100;
        v_match := v_pct >= v_alert.target_pct;
        if not v_match then continue; end if;
        v_titulo := 'Preço acima da média';
        v_detalhe := 'uma corretora paga R$ ' || round(v_max,2)::text
                     || '/saca — ' || round(v_pct,1)::text || '% acima da média (R$ '
                     || round(v_avg,2)::text || ')';
      end if;
    end if;

    -- ---- Dados do produtor ----
    select p.full_name, p.phone, u.email
      into v_produtor_name, v_produtor_phone, v_produtor_email
      from public.profiles p
      left join auth.users u on u.id = p.id
     where p.id = v_alert.produtor_id;

    -- ---- Dispatch WhatsApp/Email (best-effort, via template) ----
    if v_alert.channel = 'whatsapp' then
      v_tpl_kind := case when v_dynamic then 'alvo_dinamico_whatsapp' else 'alvo_preco_atingido_whatsapp' end;
      v_recipient := v_produtor_phone;
    elsif v_alert.channel = 'email' then
      v_tpl_kind := case when v_dynamic then 'alvo_dinamico_email' else 'alvo_preco_atingido_email' end;
      v_recipient := v_produtor_email;
    else
      v_tpl_kind := null;
      v_recipient := null;
    end if;

    if v_tpl_kind is not null and v_recipient is not null and v_recipient <> '' then
      select id into v_template_id
        from public.notification_templates
       where channel = v_alert.channel and kind = v_tpl_kind and active = true
       limit 1;
      if v_template_id is not null then
        if v_dynamic then
          v_payload := jsonb_build_object(
            'nome', coalesce(v_produtor_name,'produtor'),
            'detalhe', v_detalhe,
            'produto', coalesce(v_produto_name,'—'),
            'praca', coalesce(v_praca_name,'—'),
            'corretora', coalesce(v_corretora_name,'—'));
        else
          v_payload := jsonb_build_object(
            'nome', coalesce(v_produtor_name,'produtor'),
            'produto', coalesce(v_produto_name,'—'),
            'condicao', v_condicao_txt,
            'alvo', v_alert.target_price,
            'preco_atual', v_preco_atual,
            'praca', coalesce(v_praca_name,'—'),
            'corretora', coalesce(v_corretora_name,'—'));
        end if;
        insert into public.message_dispatches (
          template_id, channel, recipient, payload, profile_id, corretora_id
        ) values (
          v_template_id, v_alert.channel, v_recipient, v_payload,
          v_alert.produtor_id, v_corretora_id
        );
      end if;
    end if;

    -- ---- Notificação in-app (sempre) ----
    insert into public.notifications (user_id, kind, title, body, data)
    values (
      v_alert.produtor_id,
      'price_alert'::public.notification_kind,
      v_titulo,
      v_detalhe,
      jsonb_build_object(
        'alert_id', v_alert.id,
        'product_id', v_alert.product_id,
        'condition', v_alert.condition,
        'region', v_praca_name,
        'corretora', v_corretora_name,
        'preco_atual', v_preco_atual
      )
    );

    update public.price_alerts set last_triggered_at = now() where id = v_alert.id;

    perform public.fn_log_system_event(
      'alert.price_triggered', 'success',
      jsonb_build_object('alert_id', v_alert.id, 'condition', v_alert.condition,
                         'actual', v_preco_atual));
    v_count := v_count + 1;
  end loop;

  perform public.fn_log_system_event(
    'cron.check-price-targets.run', 'success',
    jsonb_build_object('triggered_count', v_count));
  return v_count;
exception when others then
  perform public.fn_log_system_event(
    'cron.check-price-targets.run', 'failed', '{}'::jsonb, sqlerrm);
  raise;
end;
$$;

grant execute on function public.check_price_targets() to authenticated;
