-- =================================================================
-- Milsaca — Aceite/recusa de proposta notifica a corretora (gap)
-- Data: 2026-06-02
-- =================================================================
-- Assimetria: quando o produtor CONTRAPROPÕE, a corretora é avisada
-- (contrapropor_lead); quando ACEITA/RECUSA, ninguém avisava. Aqui a
-- v1_responder_proposta passa a notificar os membros ativos da corretora
-- (in-app — a corretora trabalha no painel web), espelhando o padrão do
-- contrapropor_lead. Preserva o guard de vencimento + o avanço do lead.
-- create or replace.
-- =================================================================

create or replace function public.v1_responder_proposta(
  p_proposta_id uuid,
  p_resposta text
)
returns table (success boolean, error_msg text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rows int;
  v_lead_id uuid;
  v_corretora_id uuid;
  v_produtor_nome text;
begin
  if auth.uid() is null then
    return query select false, 'forbidden';
    return;
  end if;
  if p_resposta not in ('aceita', 'rejeitada') then
    return query select false, 'resposta_invalida';
    return;
  end if;

  -- Vencida (lazy)
  update public.propostas pr
     set status = 'expirada'::public.proposta_status, respondida_em = now()
   where pr.id = p_proposta_id
     and pr.status = 'enviada'
     and pr.validade_ate is not null
     and pr.validade_ate < now()
     and exists (select 1 from public.leads l
                  where l.id = pr.lead_id and l.produtor_id = auth.uid());
  get diagnostics v_rows = row_count;
  if v_rows > 0 then
    return query select false, 'proposta_expirada';
    return;
  end if;

  -- Resposta (compare-and-set) — captura lead/corretora
  update public.propostas pr
     set status = p_resposta::public.proposta_status, respondida_em = now()
   where pr.id = p_proposta_id
     and pr.status = 'enviada'
     and (pr.validade_ate is null or pr.validade_ate >= now())
     and exists (select 1 from public.leads l
                  where l.id = pr.lead_id and l.produtor_id = auth.uid())
  returning pr.lead_id, pr.corretora_id into v_lead_id, v_corretora_id;
  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    return query select false, 'proposta_indisponivel';
    return;
  end if;

  select coalesce(full_name, 'O produtor') into v_produtor_nome
    from public.profiles where id = auth.uid();

  -- Aceite avança o lead 'novo' -> 'em_negociacao' + timeline
  if p_resposta = 'aceita' and v_lead_id is not null then
    update public.leads set status = 'em_negociacao'
     where id = v_lead_id and status = 'novo';
    if v_corretora_id is not null then
      insert into public.lead_events (lead_id, corretora_id, actor_id, kind, payload)
      values (v_lead_id, v_corretora_id, auth.uid(), 'comment',
        jsonb_build_object('text', 'Produtor aceitou a proposta — negociação em andamento.'));
    end if;
  end if;

  -- Notifica os membros ativos da corretora (in-app) — fecha a assimetria.
  if v_corretora_id is not null then
    insert into public.notifications (user_id, kind, title, body, data)
    select
      pr.id,
      'lead'::public.notification_kind,
      case when p_resposta = 'aceita'
        then 'Proposta aceita pelo produtor'
        else 'Proposta recusada pelo produtor' end,
      v_produtor_nome || case when p_resposta = 'aceita'
        then ' aceitou a proposta.'
        else ' recusou a proposta.' end,
      jsonb_build_object('lead_id', v_lead_id)
    from public.profiles pr
    where pr.corretora_id = v_corretora_id
      and pr.deleted_at is null;
  end if;

  return query select true, null::text;
end;
$$;
