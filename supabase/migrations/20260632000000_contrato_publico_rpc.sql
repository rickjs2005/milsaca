-- =================================================================
-- Milsaca — Fase 2: RPC pública de verificação de contrato (3.1)
-- =================================================================
-- Molde de get_laudo_publico (20260516010000): SECURITY DEFINER
-- contorna RLS de contratos/corretoras/profiles/produtores/compradores,
-- mas a função projeta SÓ campos seguros e MASCARA toda PII.
--
-- NUNCA expor: total_value, comissao_pct, comissao_total, CPF/CNPJ
-- completo, telefone, email. O objetivo é só provar a existência e a
-- integridade (content_hash) do documento — não revelar a operação.
--
-- Mascaramento:
--   - nome: primeiro nome + inicial do sobrenome + "***" (João S***)
--   - cpf/cnpj: só os 4 últimos dígitos (***-**.123-45 estilo simples)
-- =================================================================

-- Mascara um nome: "João da Silva" -> "João S***"; "Maria" -> "Maria"
create or replace function public.mask_nome(p_nome text)
returns text
language sql
immutable
as $$
  select case
    when p_nome is null or btrim(p_nome) = '' then '—'
    when array_length(regexp_split_to_array(btrim(p_nome), '\s+'), 1) = 1
      then (regexp_split_to_array(btrim(p_nome), '\s+'))[1]
    else
      (regexp_split_to_array(btrim(p_nome), '\s+'))[1]
      || ' '
      || left((regexp_split_to_array(btrim(p_nome), '\s+'))[
           array_length(regexp_split_to_array(btrim(p_nome), '\s+'), 1)
         ], 1)
      || '***'
  end;
$$;

-- Mascara cpf/cnpj: mantém só os 4 últimos dígitos. "12345678901" -> "•••••••8901"
create or replace function public.mask_doc(p_doc text)
returns text
language sql
immutable
as $$
  select case
    when p_doc is null or btrim(p_doc) = '' then null
    else repeat('•', greatest(length(regexp_replace(p_doc, '\D', '', 'g')) - 4, 0))
         || right(regexp_replace(p_doc, '\D', '', 'g'), 4)
  end;
$$;

create or replace function public.get_contrato_publico(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', ct.id,
    'code', ct.code,
    'status', ct.status,
    'signed_at', ct.signed_at,
    'content_hash', ct.content_hash,
    'corretora', jsonb_build_object(
      'name', co.name,
      'city', co.city,
      'state', co.state
    ),
    'produtor', jsonb_build_object(
      'nome', public.mask_nome(pr.full_name),
      'doc', public.mask_doc(pd.cpf_cnpj),
      'city', pd.city,
      'state', pd.state
    ),
    'comprador', case
      when cp.id is null then null
      else jsonb_build_object(
        'nome', public.mask_nome(cp.name),
        'doc', public.mask_doc(cp.cnpj),
        'city', cp.city,
        'state', cp.state
      )
    end
  )
  from public.contratos ct
  join public.corretoras co on co.id = ct.corretora_id
  left join public.profiles pr on pr.id = ct.produtor_id
  left join public.produtores pd on pd.profile_id = ct.produtor_id
  left join public.compradores cp on cp.id = ct.comprador_id
  where ct.id = p_id;
$$;

grant execute on function public.mask_nome(text) to anon, authenticated;
grant execute on function public.mask_doc(text) to anon, authenticated;
grant execute on function public.get_contrato_publico(uuid) to anon, authenticated;

comment on function public.get_contrato_publico(uuid) is
  'Verificação pública de contrato. Projeta só campos seguros/mascarados (sem valor/comissão/PII completa). Molde de get_laudo_publico.';
