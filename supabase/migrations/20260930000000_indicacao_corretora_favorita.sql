-- Link de indicação da corretora: quando um PRODUTOR cria conta via link de
-- indicação (`/indicacao/{slug}` → cadastro com metadata `ref_corretora`), a
-- corretora indicadora já entra como FAVORITA dele. Estende handle_new_user
-- (reproduz o corpo de 20260658 + bloco best-effort do favorito).
--
-- O favorito é best-effort: cast/FK inválidos NUNCA derrubam a criação da conta
-- (bloco begin/exception). Idempotente via unique(produtor_id, corretora_id).
-- Aplicada no remoto via MCP apply_migration.
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
    else 'produtor'::public.user_role
  end;
  v_status public.profile_status := case
    when v_role = 'corretora' then 'pendente'::public.profile_status
    else 'ativo'::public.profile_status
  end;
begin
  insert into public.profiles (id, role, roles, full_name, status)
  values (new.id, v_role, array[v_role], v_new_full_name, v_status)
  on conflict (id) do nothing;

  if v_email <> '' then
    for v_contato in
      select id, full_name, phone, fazenda_nome, city, state, cpf_cnpj, car, caepf
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

      insert into public.produtores (profile_id, fazenda_nome, city, state, cpf_cnpj, car, caepf)
      select new.id, v_contato.fazenda_nome, v_contato.city, v_contato.state,
             v_contato.cpf_cnpj, v_contato.car, v_contato.caepf
      where not exists (
        select 1 from public.produtores where profile_id = new.id
      );
    end loop;
  end if;

  -- Indicação: produtor que entrou por link de corretora (/indicacao/{slug})
  -- já favorita ela. `ref_corretora` = SLUG da corretora (resolvido aqui).
  if v_role = 'produtor'
     and coalesce(new.raw_user_meta_data->>'ref_corretora', '') <> '' then
    begin
      insert into public.favoritos (produtor_id, corretora_id)
      select new.id, c.id
        from public.corretoras c
       where c.slug = new.raw_user_meta_data->>'ref_corretora'
      on conflict (produtor_id, corretora_id) do nothing;
    exception when others then
      null; -- favorito é best-effort; nunca bloqueia o signup
    end;
  end if;

  return new;
end;
$$;
