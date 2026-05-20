-- =================================================================
-- Milsaca — LGPD: esconder linhas soft-deleted de não-admin
-- Data: 2026-05-20
-- =================================================================
-- BUG fechado:
--   A migration 20260602000000 adicionou `deleted_at timestamptz` em
--   profiles/produtores/corretoras/produtor_contatos, mas nenhuma
--   query do app filtrava. Marcar `deleted_at` em resposta a um
--   pedido LGPD NÃO escondia o titular — continuava aparecendo em
--   listagens admin e do tenant.
--
-- FIX:
--   Ajusta as policies de SELECT pra excluir `deleted_at IS NOT NULL`
--   automaticamente, EXCETO pra app_admin (que mantém visibilidade
--   pra auditoria/compliance/restauração).
--
--   Aplicada em 4 tabelas: profiles, produtores, corretoras,
--   produtor_contatos. View `corretoras_publicas` já filtrava.
--
-- NOTA: writes não precisam de adjuste — quem soft-delete fez não vai
--   tentar UPDATE depois (e admin pode tudo). Se um dia houver
--   bulk-update legítimo em soft-deleted, basta wrap em is_admin().
-- =================================================================

-- ----------------------------------------------------------------
-- profiles
-- ----------------------------------------------------------------
-- Recria 3 policies de SELECT da tabela (self_read, admin_all read,
-- corretora_read_related) com filtro de deleted_at pra não-admin.

drop policy if exists "profiles_self_read" on public.profiles;
create policy "profiles_self_read"
  on public.profiles for select
  using (
    auth.uid() = id
    and (deleted_at is null or public.is_admin())
  );

-- profiles_admin_all (FOR ALL) cobre admin com bypass; mantida sem mudança
-- pq is_admin() já libera tudo.

drop policy if exists "profiles_corretora_read_related" on public.profiles;
create policy "profiles_corretora_read_related"
  on public.profiles for select
  using (
    'produtor' = any(coalesce(roles, array[]::public.user_role[]))
    and deleted_at is null
    and (
      id in (
        select produtor_id from public.leads
         where corretora_id = public.current_corretora()
           and produtor_id is not null
      )
      or id in (
        select produtor_id from public.contratos
         where corretora_id = public.current_corretora()
      )
      or id in (
        select produtor_id from public.favoritos
         where corretora_id = public.current_corretora()
      )
    )
  );

-- ----------------------------------------------------------------
-- produtores
-- ----------------------------------------------------------------
drop policy if exists "produtores_owner_all" on public.produtores;
create policy "produtores_owner_read"
  on public.produtores for select
  using (
    (auth.uid() = profile_id or public.is_admin())
    and (deleted_at is null or public.is_admin())
  );

create policy "produtores_owner_write"
  on public.produtores for all
  using (auth.uid() = profile_id or public.is_admin())
  with check (auth.uid() = profile_id or public.is_admin());

-- ----------------------------------------------------------------
-- corretoras
-- ----------------------------------------------------------------
-- Migration 20260527 já restringiu SELECT a (id = current_corretora() OR is_admin()).
-- Adiciona filtro deleted_at pra não-admin.

drop policy if exists "corretoras_self_or_admin_read" on public.corretoras;
create policy "corretoras_self_or_admin_read"
  on public.corretoras for select
  using (
    (id = public.current_corretora() and deleted_at is null)
    or public.is_admin()
  );

-- ----------------------------------------------------------------
-- produtor_contatos
-- ----------------------------------------------------------------
drop policy if exists "produtor_contatos_tenant_rw" on public.produtor_contatos;

create policy "produtor_contatos_tenant_read"
  on public.produtor_contatos for select
  using (
    (corretora_id = public.current_corretora() and deleted_at is null)
    or public.is_admin()
  );

create policy "produtor_contatos_tenant_write"
  on public.produtor_contatos for all
  using (public.is_admin() or corretora_id = public.current_corretora())
  with check (public.is_admin() or corretora_id = public.current_corretora());

comment on column public.profiles.deleted_at is
  'LGPD soft-delete. Linhas não-null ficam invisíveis a non-admin via RLS.';
comment on column public.produtores.deleted_at is
  'LGPD soft-delete. Linhas não-null ficam invisíveis a non-admin via RLS.';
comment on column public.corretoras.deleted_at is
  'LGPD soft-delete. Linhas não-null ficam invisíveis a non-admin via RLS.';
comment on column public.produtor_contatos.deleted_at is
  'LGPD soft-delete. Linhas não-null ficam invisíveis a non-admin via RLS.';
