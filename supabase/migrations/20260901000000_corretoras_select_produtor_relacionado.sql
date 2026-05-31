-- =================================================================
-- Milsaca — produtor lê corretoras com quem tem relação
-- =================================================================
-- A policy `corretoras_select` só deixa a PRÓPRIA corretora se ver
-- (id = current_corretora()) ou admin. Resultado: o produtor não
-- conseguia ler NENHUMA corretora, e os joins `corretoras(name)` nos
-- painéis (propostas, contratos, favoritos) voltavam vazios — o nome da
-- corretora aparecia em branco, o que destrói a confiança do produtor.
--
-- Esta policy ADITIVA (policies são OR) permite ao produtor autenticado
-- ler as corretoras com quem ele tem um vínculo real: um lead, um
-- contrato ou um favorito. Escopo mínimo — só counterparties dele.
--
-- auth.uid() envolto em (select ...) pra avaliar 1x por query (initplan),
-- seguindo o padrão das demais policies do projeto.
-- =================================================================

drop policy if exists "corretoras_select_produtor_relacionado"
  on public.corretoras;

create policy "corretoras_select_produtor_relacionado"
  on public.corretoras
  for select
  to authenticated
  using (
    deleted_at is null
    and (
      exists (
        select 1 from public.leads l
        where l.corretora_id = corretoras.id
          and l.produtor_id = (select auth.uid())
      )
      or exists (
        select 1 from public.contratos c
        where c.corretora_id = corretoras.id
          and c.produtor_id = (select auth.uid())
      )
      or exists (
        select 1 from public.favoritos f
        where f.corretora_id = corretoras.id
          and f.produtor_id = (select auth.uid())
      )
    )
  );
