-- =================================================================
-- Milsaca — Proposta vencida não pode ser aceita (auditoria item 9)
-- Data: 2026-06-02
-- =================================================================
-- v1_responder_proposta aceitava qualquer proposta ainda 'enviada', mesmo
-- com validade_ate no passado — o produtor travava um preço já vencido.
-- Agora: (a) se a proposta está vencida, marca como 'expirada' (lazy) e
-- devolve 'proposta_expirada'; (b) o aceite/recusa só aplica se a validade
-- for nula ou futura. Mantém o compare-and-set (status='enviada' + dono).
-- Idempotente: create or replace.
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
begin
  if auth.uid() is null then
    return query select false, 'forbidden';
    return;
  end if;
  if p_resposta not in ('aceita', 'rejeitada') then
    return query select false, 'resposta_invalida';
    return;
  end if;

  -- Vencida (lazy): se ainda 'enviada' mas validade_ate já passou, expira e
  -- avisa — não dá pra aceitar/recusar um preço que venceu.
  update public.propostas pr
     set status = 'expirada'::public.proposta_status,
         respondida_em = now()
   where pr.id = p_proposta_id
     and pr.status = 'enviada'
     and pr.validade_ate is not null
     and pr.validade_ate < now()
     and exists (
       select 1 from public.leads l
        where l.id = pr.lead_id
          and l.produtor_id = auth.uid()
     );
  get diagnostics v_rows = row_count;
  if v_rows > 0 then
    return query select false, 'proposta_expirada';
    return;
  end if;

  -- Resposta normal: só transiciona se ainda 'enviada', não vencida e do dono.
  update public.propostas pr
     set status = p_resposta::public.proposta_status,
         respondida_em = now()
   where pr.id = p_proposta_id
     and pr.status = 'enviada'
     and (pr.validade_ate is null or pr.validade_ate >= now())
     and exists (
       select 1 from public.leads l
        where l.id = pr.lead_id
          and l.produtor_id = auth.uid()
     );

  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    return query select false, 'proposta_indisponivel';
    return;
  end if;

  return query select true, null::text;
end;
$$;
