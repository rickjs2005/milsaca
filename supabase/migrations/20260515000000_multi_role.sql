-- =================================================================
-- Milsaca — multi-role por usuário
-- Data: 2026-05-15
-- =================================================================
--
-- Um usuário pode ter mais de um papel ao mesmo tempo
-- (ex.: produtor + corretora). Mantemos a coluna `role` (singular)
-- para compatibilidade com helpers/políticas existentes, mas o
-- conjunto de papéis válidos passa a ser `roles` (array).
--
-- Convenção:
--   - `role` continua valendo como "papel principal" (default produtor).
--   - `roles` contém TODOS os papéis ativos do usuário.
--   - Convidamos sempre que `role` esteja contido em `roles`.

-- 1) Adicionar coluna roles
alter table public.profiles
  add column if not exists roles public.user_role[] not null default array[]::public.user_role[];

-- 2) Backfill: garantir que role já existente entre em roles
update public.profiles
   set roles = array[role]
 where roles = '{}';

-- 3) Constraint: roles não pode ser vazio e deve conter role
alter table public.profiles
  add constraint profiles_roles_not_empty check (array_length(roles, 1) >= 1);

alter table public.profiles
  add constraint profiles_role_in_roles check (role = any(roles));

-- 4) Atualizar handle_new_user para preencher ambos
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.user_role := coalesce(
    (new.raw_user_meta_data->>'role')::public.user_role,
    'produtor'
  );
begin
  insert into public.profiles (id, role, roles, full_name)
  values (
    new.id,
    v_role,
    array[v_role],
    new.raw_user_meta_data->>'full_name'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 5) Helper que retorna todos os papéis do user logado
create or replace function public.current_roles()
returns public.user_role[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(roles, array[]::public.user_role[])
    from public.profiles
   where id = auth.uid()
$$;

-- 6) is_corretora() pra usar em RLS quando precisar saber só "é corretora?"
create or replace function public.is_corretora()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select 'corretora' = any(coalesce(
    (select roles from public.profiles where id = auth.uid()),
    array[]::public.user_role[]
  ))
$$;
