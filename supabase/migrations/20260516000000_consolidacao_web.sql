-- =================================================================
-- Milsaca — Consolidação do web (fim de semana 2026-05-16/17)
-- =================================================================
-- Mudanças:
--   1. cotacoes: corretora pode escrever (não só admin)
--   2. cotacoes: colunas tipadas `specie` + `process`
--   3. lead_events: produtor envolvido lê timeline
--   4. profiles: corretora lê produtores relacionados (lead/contrato/favorito)
--   5. produtor_contatos: tabela sombra (cadastro sem auth.user)
--   6. leads: aceitar contato pendente OU produtor real (XOR)
--   7. handle_new_user: claim automático via email no signup
-- =================================================================

-- ----------------------------------------------------------------
-- 1 + 2. cotacoes
-- ----------------------------------------------------------------
alter table public.cotacoes
  add column if not exists specie  public.coffee_specie,
  add column if not exists process public.coffee_processo;

create index if not exists cotacoes_specie_process_date_idx
  on public.cotacoes (specie, process, reference_date desc);

drop policy if exists "cotacoes_admin_write" on public.cotacoes;
create policy "cotacoes_corretora_write"
  on public.cotacoes for all
  using (public.is_admin() or public.is_corretora())
  with check (public.is_admin() or public.is_corretora());

grant insert, update, delete on public.cotacoes to authenticated;

-- ----------------------------------------------------------------
-- 3. lead_events: produtor envolvido lê timeline
-- ----------------------------------------------------------------
drop policy if exists "lead_events_tenant_read" on public.lead_events;
create policy "lead_events_envolvido_read"
  on public.lead_events for select
  using (
    public.is_admin()
    or corretora_id = public.current_corretora()
    or lead_id in (
      select id from public.leads where produtor_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------
-- 4. profiles: corretora lê produtores relacionados
-- ----------------------------------------------------------------
create policy "profiles_corretora_read_related"
  on public.profiles for select
  using (
    'produtor' = any(coalesce(roles, array[]::public.user_role[]))
    and (
      id in (select produtor_id from public.leads      where corretora_id = public.current_corretora() and produtor_id is not null)
      or id in (select produtor_id from public.contratos where corretora_id = public.current_corretora())
      or id in (select produtor_id from public.favoritos where corretora_id = public.current_corretora())
    )
  );

-- ----------------------------------------------------------------
-- 5. produtor_contatos (sombra)
-- ----------------------------------------------------------------
create table if not exists public.produtor_contatos (
  id uuid primary key default extensions.uuid_generate_v4(),
  corretora_id uuid not null references public.corretoras(id) on delete cascade,
  email text,
  phone text,
  full_name text not null,
  fazenda_nome text,
  city text,
  state text,
  notes text,
  claimed_profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists produtor_contatos_corretora_idx
  on public.produtor_contatos (corretora_id);
create index if not exists produtor_contatos_email_idx
  on public.produtor_contatos (lower(email)) where email is not null;
create index if not exists produtor_contatos_claimed_idx
  on public.produtor_contatos (claimed_profile_id) where claimed_profile_id is not null;

drop trigger if exists produtor_contatos_set_updated_at on public.produtor_contatos;
create trigger produtor_contatos_set_updated_at
  before update on public.produtor_contatos
  for each row execute function public.tg_set_updated_at();

alter table public.produtor_contatos enable row level security;

drop policy if exists "produtor_contatos_tenant_rw" on public.produtor_contatos;
create policy "produtor_contatos_tenant_rw"
  on public.produtor_contatos for all
  using (public.is_admin() or corretora_id = public.current_corretora())
  with check (public.is_admin() or corretora_id = public.current_corretora());

grant select, insert, update, delete on public.produtor_contatos to authenticated;

-- ----------------------------------------------------------------
-- 6. leads: aceitar contato pendente
-- ----------------------------------------------------------------
alter table public.leads
  add column if not exists contato_id uuid references public.produtor_contatos(id) on delete set null;

create index if not exists leads_contato_id_idx on public.leads (contato_id);

-- XOR: exatamente um dos dois deve estar preenchido.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'leads_exatamente_um_produtor'
  ) then
    alter table public.leads
      add constraint leads_exatamente_um_produtor
      check ((produtor_id is not null)::int + (contato_id is not null)::int = 1)
      not valid;
    -- not valid: não força nos dados existentes (todos já têm produtor_id)
    -- novos inserts sempre validam
  end if;
end$$;

-- ----------------------------------------------------------------
-- 7. handle_new_user: claim automático
-- ----------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(coalesce(new.email, ''));
  v_contato record;
  v_new_full_name text := new.raw_user_meta_data->>'full_name';
begin
  -- cria profile (mantém comportamento anterior)
  insert into public.profiles (id, role, full_name)
  values (
    new.id,
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'produtor'),
    v_new_full_name
  )
  on conflict (id) do nothing;

  -- claim: vincula contatos pendentes com o mesmo email
  if v_email <> '' then
    for v_contato in
      select id, full_name, phone, fazenda_nome, city, state
        from public.produtor_contatos
       where lower(email) = v_email
         and claimed_profile_id is null
    loop
      update public.produtor_contatos
         set claimed_profile_id = new.id
       where id = v_contato.id;

      -- migra leads do contato pro produtor real
      update public.leads
         set produtor_id = new.id,
             contato_id  = null
       where contato_id = v_contato.id;

      -- backfilla profile.full_name se vazio
      update public.profiles
         set full_name = coalesce(full_name, v_contato.full_name),
             phone     = coalesce(phone, v_contato.phone)
       where id = new.id;

      -- cria produtores estendido se ainda não existir
      insert into public.produtores (profile_id, fazenda_nome, city, state)
      select new.id, v_contato.fazenda_nome, v_contato.city, v_contato.state
      where not exists (
        select 1 from public.produtores where profile_id = new.id
      );
    end loop;
  end if;

  return new;
end;
$$;
