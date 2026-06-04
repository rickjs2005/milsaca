-- =================================================================
-- Milsaca — WhatsApp: amostra como vínculo válido (Brief 3, liga WhatsApp do laudo)
-- Data: 2026-06-04
-- =================================================================
-- enqueue_notification_whatsapp re-checava o vínculo corretora↔produtor só por
-- lead/contrato/entrega; uma AMOSTRA endereçada à corretora não habilitava o
-- WhatsApp (o aviso in-app já funcionava via 20261090). Adiciona a cláusula de
-- amostra ao check — assim o laudo/recebida/recusa também ENFILEIRAM WhatsApp.
-- (O envio real continua dependendo do provider do send-dispatch.) Idempotente
-- (create or replace). Mantém security definer + search_path vazio.
-- =================================================================
create or replace function public.enqueue_notification_whatsapp(p_user_id uuid, p_mensagem text)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_corretora uuid;
  v_phone text;
  v_template uuid;
  v_ok boolean;
begin
  v_corretora := public.current_corretora();

  v_ok := public.is_admin() or (
    public.is_corretora() and (
      exists (select 1 from public.leads l
               where l.produtor_id = p_user_id and l.corretora_id = v_corretora)
      or exists (select 1 from public.contratos c
                  where c.produtor_id = p_user_id and c.corretora_id = v_corretora)
      or exists (select 1 from public.entregas e
                  where e.produtor_id = p_user_id and e.corretora_id = v_corretora)
      or exists (select 1 from public.amostras a
                  where a.produtor_id = p_user_id and a.corretora_id = v_corretora)
    )
  );
  if not v_ok then
    return;
  end if;

  select coalesce(pr.whatsapp, p.phone)
    into v_phone
  from public.profiles p
  left join public.produtores pr on pr.profile_id = p.id
  where p.id = p_user_id;

  if v_phone is null or btrim(v_phone) = '' then
    return;
  end if;

  select id into v_template
    from public.notification_templates
   where channel = 'whatsapp' and kind = 'notificacao' and active
   limit 1;

  insert into public.message_dispatches
    (template_id, channel, recipient, payload, corretora_id, profile_id)
  values (
    v_template, 'whatsapp', v_phone,
    jsonb_build_object('mensagem', p_mensagem),
    v_corretora, p_user_id
  );
end;
$function$;
