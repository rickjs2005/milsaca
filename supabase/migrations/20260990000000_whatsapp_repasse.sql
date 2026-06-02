-- =================================================================
-- Milsaca — WhatsApp automático no repasse (gap de notificação)
-- Data: 2026-06-02
-- =================================================================
-- O módulo de repasses era 100% silencioso: o produtor não era avisado nem
-- quando tinha valor a receber, nem quando o pagamento era confirmado. Aqui:
--   - 2 templates WhatsApp (repasse_criado, repasse_pago).
--   - RPC notify_repasse_whatsapp(pagamento_id, evento): deriva o destinatário
--     do PRÓPRIO pagamento (não dá pra spoofar telefone), exige que o pagamento
--     seja da corretora do caller (current_corretora) e enfileira em
--     message_dispatches. O send-dispatch entrega (stub até plugar provider).
-- O sininho in-app continua sendo feito pela server action (notify()).
-- Idempotente (on conflict / create or replace).
-- =================================================================

-- 1. Templates WhatsApp ----------------------------------------------------
insert into public.notification_templates (channel, kind, name, body, variables, active)
values
  ('whatsapp', 'repasse_criado', 'Repasse a receber (WhatsApp)',
   E'Olá {{produtor}}! 🌱☕\n\nA {{corretora}} registrou um repasse de R$ {{valor}} a receber (contrato {{contrato}}). Você acompanha o status no app da Milsaca.\n\nQualquer dúvida, é só chamar aqui.',
   '["produtor","valor","contrato","corretora"]'::jsonb, true),
  ('whatsapp', 'repasse_pago', 'Repasse confirmado (WhatsApp)',
   E'Olá {{produtor}}! 🌱☕\n\nSeu repasse de R$ {{valor}} (contrato {{contrato}}) foi confirmado pela {{corretora}}.\n\nQualquer dúvida, é só chamar aqui. — Milsaca',
   '["produtor","valor","contrato","corretora"]'::jsonb, true)
on conflict (channel, kind) do update
  set name = excluded.name,
      body = excluded.body,
      variables = excluded.variables,
      active = true,
      updated_at = now();

-- 2. RPC de enfileiramento -------------------------------------------------
create or replace function public.notify_repasse_whatsapp(
  p_pagamento_id uuid,
  p_evento text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_corretora uuid;
  v_produtor uuid;
  v_valor numeric;
  v_contrato uuid;
  v_status text;
  v_kind text;
  v_status_esperado text;
  v_phone text;
  v_produtor_nome text;
  v_corretora_nome text;
  v_contrato_code text;
  v_template uuid;
begin
  if p_evento not in ('criado', 'pago') then
    return;
  end if;
  v_kind := 'repasse_' || p_evento;
  v_status_esperado := case when p_evento = 'pago' then 'pago' else 'pendente' end;

  v_corretora := public.current_corretora();
  if v_corretora is null then
    return;
  end if;

  -- Pagamento PRECISA ser da corretora do caller (segurança) e estar no
  -- status coerente com o evento.
  select pp.produtor_id, pp.valor_liquido, pp.contrato_id, pp.status::text
    into v_produtor, v_valor, v_contrato, v_status
  from public.produtor_pagamentos pp
  where pp.id = p_pagamento_id
    and pp.corretora_id = v_corretora;

  if v_produtor is null or v_status <> v_status_esperado then
    return;
  end if;

  -- Telefone vem do PRÓPRIO produtor do pagamento (não do caller).
  select coalesce(pr.whatsapp, p.phone), p.full_name
    into v_phone, v_produtor_nome
  from public.profiles p
  left join public.produtores pr on pr.profile_id = p.id
  where p.id = v_produtor;

  if v_phone is null or btrim(v_phone) = '' then
    return; -- sem telefone, não há WhatsApp a enviar
  end if;

  select name into v_corretora_nome from public.corretoras where id = v_corretora;
  select code into v_contrato_code from public.contratos where id = v_contrato;
  select id into v_template
    from public.notification_templates
   where channel = 'whatsapp' and kind = v_kind and active
   limit 1;

  insert into public.message_dispatches
    (template_id, channel, recipient, payload, corretora_id, profile_id)
  values (
    v_template,
    'whatsapp',
    v_phone,
    jsonb_build_object(
      'produtor', coalesce(v_produtor_nome, 'produtor'),
      'valor', translate(
        to_char(coalesce(v_valor, 0), 'FM999G999G999G990D00'), '.,', ',.'
      ),
      'contrato', coalesce(v_contrato_code, '—'),
      'corretora', coalesce(v_corretora_nome, 'sua corretora')
    ),
    v_corretora,
    v_produtor
  );
end;
$$;

grant execute on function public.notify_repasse_whatsapp(uuid, text) to authenticated;
