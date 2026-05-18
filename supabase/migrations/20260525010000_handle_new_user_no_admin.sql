-- =================================================================
-- Milsaca — defesa em profundidade no signup
-- Data: 2026-05-18
-- =================================================================
-- Admin não pode ser criado via signup. Mesmo que alguém envie
-- raw_user_meta_data.role = 'admin' diretamente pela API, o trigger
-- normaliza pra 'produtor' (default seguro).
--
-- Admin é provisionado SÓ via tabela public.app_admins (manualmente).
-- =================================================================

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
  v_role_raw text := new.raw_user_meta_data->>'role';
  v_role public.user_role := case
    when v_role_raw = 'corretora' then 'corretora'::public.user_role
    else 'produtor'::public.user_role  -- nunca admin, qualquer outro vira produtor
  end;
  v_status public.profile_status := case
    when v_role = 'corretora' then 'pendente'::public.profile_status
    else 'ativo'::public.profile_status
  end;
begin
  insert into public.profiles (id, role, roles, full_name, status)
  values (
    new.id,
    v_role,
    array[v_role],
    v_new_full_name,
    v_status
  )
  on conflict (id) do nothing;

  -- Claim automático: vincula contatos pendentes com o mesmo email
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

      update public.leads
         set produtor_id = new.id,
             contato_id  = null
       where contato_id = v_contato.id;

      update public.profiles
         set full_name = coalesce(full_name, v_contato.full_name),
             phone     = coalesce(phone, v_contato.phone)
       where id = new.id;

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
