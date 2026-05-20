-- =================================================================
-- Milsaca — cotacoes vira tenant-aware (corretora_id NOT NULL)
-- Data: 2026-05-19
-- =================================================================
-- BUG fechado:
--   A tabela public.cotacoes nunca teve corretora_id. A policy de
--   write (`cotacoes_corretora_write` em 20260516000000) só checava
--   is_corretora() OR is_admin(), sem filtro de tenant. Resultado:
--   qualquer corretora autenticada conseguia DELETE/UPDATE em
--   cotações postadas por OUTRAS corretoras via UI normal.
--
--   Vazamento de integridade reportável — uma corretora podia apagar
--   o histórico de mercado postado por concorrente.
--
-- DECISÕES:
--   - SELECT continua aberto a todo authenticated (produtor precisa
--     ler "cotações de praça" de todas as corretoras pra acompanhar
--     mercado). Apenas escrita fica tenant-aware.
--   - corretora_id NOT NULL — escrita anônima ou de admin sem
--     corretora vinculada (rara) precisa ser feita via service_role.
--   - admin continua com bypass via is_admin() pra manutenção.
--   - Dados existentes em cotacoes são test data (decisão do owner em
--     2026-05-19) — DELETE all antes do ADD COLUMN NOT NULL pra evitar
--     atribuição arbitrária.
-- =================================================================

-- ----------------------------------------------------------------
-- 1. Limpar test data legado
-- ----------------------------------------------------------------
delete from public.cotacoes;

-- ----------------------------------------------------------------
-- 2. Adiciona corretora_id NOT NULL
-- ----------------------------------------------------------------
alter table public.cotacoes
  add column if not exists corretora_id uuid not null
    references public.corretoras(id) on delete cascade;

create index if not exists cotacoes_corretora_id_idx
  on public.cotacoes (corretora_id);

create index if not exists cotacoes_corretora_date_idx
  on public.cotacoes (corretora_id, reference_date desc);

-- ----------------------------------------------------------------
-- 3. Substitui policy de write por uma tenant-aware
-- ----------------------------------------------------------------
drop policy if exists "cotacoes_corretora_write" on public.cotacoes;

-- INSERT: corretora_id da linha precisa bater com current_corretora()
-- (ou admin pode tudo). using é irrelevante em INSERT puro, mas o
-- combo with check fecha por linha inserida.
create policy "cotacoes_tenant_insert"
  on public.cotacoes
  for insert
  to authenticated
  with check (
    public.is_admin()
    or corretora_id = public.current_corretora()
  );

-- UPDATE / DELETE: só toca em linhas do próprio tenant (ou admin).
create policy "cotacoes_tenant_update"
  on public.cotacoes
  for update
  to authenticated
  using (
    public.is_admin()
    or corretora_id = public.current_corretora()
  )
  with check (
    public.is_admin()
    or corretora_id = public.current_corretora()
  );

create policy "cotacoes_tenant_delete"
  on public.cotacoes
  for delete
  to authenticated
  using (
    public.is_admin()
    or corretora_id = public.current_corretora()
  );

-- ----------------------------------------------------------------
-- 4. SELECT permanece "todo authenticated lê" (produtor vê praça).
--    Policy "cotacoes_authenticated_read" do initial_schema continua
--    valendo. Documenta aqui pra ficar explícito no review.
-- ----------------------------------------------------------------
comment on table public.cotacoes is
  'Cotações manuais postadas pela corretora. SELECT público pra authenticated (produtor vê praça); INSERT/UPDATE/DELETE só pelo tenant dono via current_corretora(). market_quotes guarda snapshots automáticos.';
