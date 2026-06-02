-- =================================================================
-- Milsaca — Aceite de proposta avança o lead (auditoria: fio solto)
-- Data: 2026-06-02
-- =================================================================
-- Quando o produtor aceitava uma proposta (RPC), a proposta virava 'aceita'
-- mas o lead ficava preso em 'novo'/'em_negociacao' — nenhum lado assumia a
-- transição. Agora o aceite move o lead 'novo' -> 'em_negociacao' (negociação
-- ativa) e registra na timeline. A conversão de verdade continua sendo só ao
-- gerar o contrato (createContrato) — NÃO pula pra 'convertido' aqui.
-- Preserva o guard de vencimento (migration 20260950). create or replace.
-- =================================================================

create or replace function public.v1_responder_proposta(
  p_proposta_id uuid,
  p_resposta text
)
returns table (success boolean, error_msg text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows int;
  v_lead_id uuid;
  v_corretora_id uuid;
begin
  if auth.uid() is null then
    return query select false, 'forbidden';
    return;
  end if;
  if p_resposta not in ('aceita', 'rejeitada') then
    return query select false, 'resposta_invalida';
    return;
  end if;

  -- Vencida (lazy): expira e avisa.
  update public.propostas pr
     set status = 'expirada'::public.proposta_status,
         respondida_em = now()
   where pr.id = p_proposta_id
     and pr.status = 'enviada'
     and pr.validade_ate is not null
     and pr.validade_ate < now()
     and exists (
       select 1 from public.leads l
        where l.id = pr.lead_id and l.produtor_id = auth.uid()
     );
  get diagnostics v_rows = row_count;
  if v_rows > 0 then
    return query select false, 'proposta_expirada';
    return;
  end if;

  -- Resposta normal: só transiciona se ainda 'enviada', não vencida e do dono.
  -- Captura lead_id/corretora_id pra sincronizar o lead no aceite.
  update public.propostas pr
     set status = p_resposta::public.proposta_status,
         respondida_em = now()
   where pr.id = p_proposta_id
     and pr.status = 'enviada'
     and (pr.validade_ate is null or pr.validade_ate >= now())
     and exists (
       select 1 from public.leads l
        where l.id = pr.lead_id and l.produtor_id = auth.uid()
     )
  returning pr.lead_id, pr.corretora_id into v_lead_id, v_corretora_id;

  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    return query select false, 'proposta_indisponivel';
    return;
  end if;

  -- Aceite move o lead 'novo' -> 'em_negociacao' + timeline. Conversão real
  -- (convertido) é só ao gerar o contrato.
  if p_resposta = 'aceita' and v_lead_id is not null then
    update public.leads
       set status = 'em_negociacao'
     where id = v_lead_id
       and status = 'novo';

    if v_corretora_id is not null then
      insert into public.lead_events (lead_id, corretora_id, actor_id, kind, payload)
      values (
        v_lead_id,
        v_corretora_id,
        auth.uid(),
        'comment',
        jsonb_build_object(
          'text', 'Produtor aceitou a proposta — negociação em andamento.'
        )
      );
    end if;
  end if;

  return query select true, null::text;
end;
$$;
