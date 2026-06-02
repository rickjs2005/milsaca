-- =================================================================
-- Milsaca — WhatsApp automático em TODA notificação do produtor
-- Data: 2026-06-02
-- =================================================================
-- Generaliza o padrão do repasse: o notify() (sininho in-app) passa a também
-- enfileirar um WhatsApp com o mesmo texto. Assim contrato/entrega/lead/
-- proposta/repasse — tudo que avisa o produtor — sai por WhatsApp em sincronia
-- com o sininho, sem fiação por evento. Supera o caminho bespoke do repasse
-- (notify_repasse_whatsapp), que deixa de ser chamado.
--
-- Template único {{mensagem}} (o título+corpo da notificação já são pt-BR
-- prontos). RPC SECURITY DEFINER porque message_dispatches.INSERT exige
-- is_admin() — a autorização aqui ESPELHA a policy notifications_insert
-- (corretora só fala com produtor com quem tem lead/contrato/entrega).
-- =================================================================

insert into public.notification_templates (channel, kind, name, body, variables, active)
values
  ('whatsapp', 'notificacao', 'Notificação Milsaca (WhatsApp)',
   E'{{mensagem}}\n\n— Milsaca',
   '["mensagem"]'::jsonb, true)
on conflict (channel, kind) do update
  set name = excluded.name, body = excluded.body,
      variables = excluded.variables, active = true, updated_at = now();

create or replace function public.enqueue_notification_whatsapp(
  p_user_id uuid,
  p_mensagem text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_corretora uuid;
  v_phone text;
  v_template uuid;
  v_ok boolean;
begin
  v_corretora := public.current_corretora();

  -- Autorização: mesma régua de notifications_insert. Admin pode tudo;
  -- corretora só notifica produtor com quem tem vínculo (lead/contrato/entrega).
  v_ok := public.is_admin() or (
    public.is_corretora() and (
      exists (select 1 from public.leads l
               where l.produtor_id = p_user_id and l.corretora_id = v_corretora)
      or exists (select 1 from public.contratos c
                  where c.produtor_id = p_user_id and c.corretora_id = v_corretora)
      or exists (select 1 from public.entregas e
                  where e.produtor_id = p_user_id and e.corretora_id = v_corretora)
    )
  );
  if not v_ok then
    return;
  end if;

  -- Telefone do destinatário (produtores.whatsapp > profiles.phone).
  select coalesce(pr.whatsapp, p.phone)
    into v_phone
  from public.profiles p
  left join public.produtores pr on pr.profile_id = p.id
  where p.id = p_user_id;

  if v_phone is null or btrim(v_phone) = '' then
    return; -- sem telefone, sem WhatsApp
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
$$;

grant execute on function public.enqueue_notification_whatsapp(uuid, text) to authenticated;
