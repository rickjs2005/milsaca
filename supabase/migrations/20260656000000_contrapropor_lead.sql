-- =================================================================
-- Milsaca — contraproposta LEVE do produtor (gap P5, versão web)
-- Data: 2026-06-56
-- =================================================================
-- A negociação no web é WhatsApp-first por desenho. Esta RPC dá uma
-- estrutura mínima: o produtor manda UM contra-valor que (1) entra no
-- histórico do lead (lead_events) e (2) notifica os operadores da
-- corretora (in-app). A corretora responde mandando nova proposta ou
-- pelo WhatsApp. NÃO mexe em `propostas`/enum — negociação fina segue fora.
--
-- SECURITY DEFINER: precisa inserir em lead_events e notifications (cuja
-- policy de insert é restrita); carimba sempre auth.uid() e valida que o
-- lead é do produtor logado.
-- =================================================================

create or replace function public.contrapropor_lead(
  p_lead_id uuid,
  p_preco_saca numeric,
  p_mensagem text default null
)
returns table (success boolean, error_msg text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_corretora_id uuid;
  v_produtor_nome text;
  v_msg text := nullif(btrim(coalesce(p_mensagem, '')), '');
begin
  if auth.uid() is null then
    return query select false, 'forbidden';
    return;
  end if;
  if p_preco_saca is null or p_preco_saca <= 0 then
    return query select false, 'preco_invalido';
    return;
  end if;

  -- O lead precisa ser do produtor logado.
  select corretora_id
    into v_corretora_id
    from public.leads
   where id = p_lead_id and produtor_id = auth.uid();
  if v_corretora_id is null then
    return query select false, 'lead_invalido';
    return;
  end if;

  select coalesce(full_name, 'Produtor')
    into v_produtor_nome
    from public.profiles
   where id = auth.uid();

  -- 1) Evento no histórico do lead (aparece no timeline dos dois lados).
  insert into public.lead_events (lead_id, corretora_id, actor_id, kind, payload)
  values (
    p_lead_id,
    v_corretora_id,
    auth.uid(),
    'contraproposta',
    jsonb_build_object('preco_saca', p_preco_saca, 'mensagem', v_msg)
  );

  -- 2) Avança o lead pra "em_negociacao" se ainda estava "novo".
  update public.leads
     set status = 'em_negociacao'
   where id = p_lead_id and status = 'novo';

  -- 3) Notifica os operadores ativos da corretora (in-app).
  insert into public.notifications (user_id, kind, title, body, data)
  select
    pr.id,
    'lead'::public.notification_kind,
    'Contraproposta recebida',
    v_produtor_nome
      || ' propôs R$ '
      || trim(to_char(p_preco_saca, 'FM999999990.00'))
      || '/saca.',
    jsonb_build_object('lead_id', p_lead_id, 'preco_saca', p_preco_saca)
  from public.profiles pr
  where pr.corretora_id = v_corretora_id
    and pr.deleted_at is null;

  return query select true, null::text;
exception
  when others then
    return query select false, 'erro: ' || sqlerrm;
end;
$$;

revoke all on function public.contrapropor_lead(uuid, numeric, text) from public, anon;
grant execute on function public.contrapropor_lead(uuid, numeric, text) to authenticated;

comment on function public.contrapropor_lead(uuid, numeric, text) is
  'Contraproposta leve do produtor: registra lead_event "contraproposta" + notifica operadores da corretora. Valida lead do auth.uid(). Não toca em propostas.';
