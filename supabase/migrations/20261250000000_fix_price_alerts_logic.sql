-- =================================================================
-- Milsaca — Conserto da lógica de PREÇO-ALVO (2026-06-13)
-- =================================================================
-- Corrige 3 problemas do check_price_targets() vigente
-- (20261050000000_price_alerts_dinamicos.sql):
--
--  1) melhor_preco disparava SEMPRE (v_match := true fixo) — não
--     comparava nada e cutucava a cada 24h. Agora só dá match quando
--     a cotação atual é de fato o MELHOR preço ativo do grupo
--     (product + praça opcional) E melhorou em relação ao último
--     valor notificado (last_triggered_value).
--
--  2) Disparos não eram edge-triggered: acima_de / acima_media (e os
--     demais) cutucavam todo dia enquanto a condição persistisse.
--     Agora só notifica na BORDA (não-satisfeita → satisfeita) ou
--     quando o valor melhorou de forma relevante, comparando com
--     last_triggered_value. Dedup de 24h mantido como segurança.
--
--  3) grant execute ... to authenticated dava a qualquer usuário
--     logado o poder de disparar a varredura inteira. Revogado.
--     Só service_role/postgres (o cron) executa.
--
-- Idempotente. create or replace. RLS intacta. Schema em inglês.
-- =================================================================

-- 1) Coluna pra guardar o último valor notificado (estado p/ edge-trigger)
alter table public.price_alerts
  add column if not exists last_triggered_value numeric;

comment on column public.price_alerts.last_triggered_value is
  'Último preço/valor que disparou este alerta. Usado pra tornar os '
  'disparos edge-triggered: só notifica de novo quando a condição '
  'reentra (NÃO-satisfeita → satisfeita) ou o valor melhora de forma '
  'relevante. NULL = nunca disparou.';

-- 2) Reescreve check_price_targets — edge-triggered nos 4 tipos -----------
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
  v_last_val       numeric;
  v_produtor_name  text;
  v_produtor_phone text;
  v_produtor_email text;
  v_payload        jsonb;
begin
  for v_alert in
    select pa.id, pa.produtor_id, pa.product_id, pa.region_id,
           pa.target_price, pa.target_pct, pa.condition, pa.channel,
           pa.last_triggered_at, pa.last_triggered_value
      from public.price_alerts pa
      join public.coffee_types ct on ct.id = pa.product_id
     where pa.active = true
       and ct.active = true
       -- Dedup de 24h: segurança adicional. A borda (edge-trigger) é
       -- o filtro principal e é avaliada mais abaixo, por tipo.
       and (pa.last_triggered_at is null
            or pa.last_triggered_at < now() - interval '24 hours')
  loop
    v_dynamic := v_alert.condition in ('melhor_preco','acima_media');
    v_match := false;
    v_preco_atual := null;
    v_corretora_name := null;
    v_corretora_id := null;
    v_last_val := v_alert.last_triggered_value;

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
        -- Condição satisfeita?
        v_match := v_preco_atual >= v_alert.target_price;
        v_condicao_txt := 'subir acima de';
        -- EDGE-TRIGGER: só dispara se nunca disparou (borda fria) OU se
        -- o último valor notificado NÃO satisfazia a condição (ou seja,
        -- saiu e reentrou) OU se o preço SUBIU em relação ao último
        -- (melhora relevante pra "acima_de"). Se ainda satisfaz e não
        -- melhorou, é o mesmo evento → não repete.
        if v_match and v_last_val is not null then
          if v_last_val >= v_alert.target_price
             and v_preco_atual <= v_last_val then
            v_match := false;  -- condição persistente sem melhora
          end if;
        end if;
      else
        -- abaixo_de: simétrico. "Melhora" = preço CAIU.
        v_match := v_preco_atual <= v_alert.target_price;
        v_condicao_txt := 'cair abaixo de';
        if v_match and v_last_val is not null then
          if v_last_val <= v_alert.target_price
             and v_preco_atual >= v_last_val then
            v_match := false;  -- condição persistente sem melhora
          end if;
        end if;
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
        -- v_max É o melhor (maior) preço ativo do grupo por definição
        -- (max sobre a última cotação de cada corretora). O alerta
        -- "melhor preço da praça" só faz sentido como NOVO recorde:
        -- EDGE-TRIGGER = o melhor preço atual superou o último que
        -- notificamos. Igual ou pior → não repete.
        if v_last_val is null then
          v_match := true;                 -- primeira vez: notifica o melhor atual
        else
          v_match := v_max > v_last_val;   -- só se melhorou (novo recorde)
        end if;
        if not v_match then continue; end if;
        v_titulo := 'Melhor preço da praça';
        v_detalhe := 'o melhor preço agora é R$ ' || round(v_max,2)::text || '/saca';
      else
        -- acima_media
        if v_n < 2 then continue; end if;
        v_pct := ((v_max - v_avg) / v_avg) * 100;
        v_match := v_pct >= v_alert.target_pct;
        if not v_match then continue; end if;
        -- EDGE-TRIGGER: notifica quando o spread reentra na faixa ou
        -- quando o melhor preço (v_max) supera o último notificado.
        -- Se o pico é o mesmo (ou menor) que já avisamos, não repete.
        if v_last_val is not null and v_max <= v_last_val then
          continue;
        end if;
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

    -- ---- Atualiza estado do edge-trigger + dedup 24h ----
    update public.price_alerts
       set last_triggered_at = now(),
           last_triggered_value = v_preco_atual
     where id = v_alert.id;

    perform public.fn_log_system_event(
      'alert.price_triggered', 'success',
      jsonb_build_object('alert_id', v_alert.id, 'condition', v_alert.condition,
                         'actual', v_preco_atual, 'last_value', v_last_val));
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

-- 3) Segurança: só o cron (service_role / postgres) executa a varredura.
--    Revoga de authenticated (e de PUBLIC, por garantia) pra nenhum
--    usuário logado conseguir disparar a função inteira.
revoke execute on function public.check_price_targets() from authenticated;
revoke execute on function public.check_price_targets() from public;

-- A função é SECURITY DEFINER e é chamada pelo cron job vigente
-- ('milsaca-check-price-targets', $$select public.check_price_targets();$$),
-- que roda como o owner (postgres) — não depende deste grant. Garantimos
-- service_role explicitamente sem reabrir pra authenticated.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.check_price_targets() to service_role;
  end if;
end $$;
