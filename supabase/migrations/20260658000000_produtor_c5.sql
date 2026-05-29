-- =================================================================
-- Milsaca — C5: CPF/CNPJ (+ CAR/CAEPF) no cadastro pela corretora
-- Data: 2026-06-58
-- =================================================================
-- Fecha o gap do "—" no espelho. Duas frentes (decisão do dono: as duas):
--   (1) LEITURA ESCOPADA: a corretora passa a LER o cadastro (produtores)
--       de um produtor real SOMENTE quando tem contrato ou lead com ele
--       (execução de contrato — base legal LGPD). Aditiva à policy
--       owner-only existente (RLS é OR).
--   (2) CAPTURA: a corretora preenche cpf_cnpj/car/caepf no contato-sombra
--       (produtor_contatos); no signup do produtor, o claim copia esses
--       campos pra produtores.
-- =================================================================

-- (2a) Colunas no contato-sombra (espelham produtores).
alter table public.produtor_contatos
  add column if not exists cpf_cnpj text,
  add column if not exists car      text,
  add column if not exists caepf    text;

-- (1) Leitura escopada de produtores pela corretora relacionada.
drop policy if exists produtores_corretora_related_read on public.produtores;
create policy produtores_corretora_related_read on public.produtores
  for select to authenticated
  using (
    public.current_corretora() is not null
    and (
      exists (
        select 1 from public.contratos c
        where c.produtor_id = produtores.profile_id
          and c.corretora_id = public.current_corretora()
      )
      or exists (
        select 1 from public.leads l
        where l.produtor_id = produtores.profile_id
          and l.corretora_id = public.current_corretora()
      )
    )
  );

comment on policy produtores_corretora_related_read on public.produtores is
  'Corretora lê o cadastro do produtor com quem tem contrato/lead (execução de contrato). Aditiva à owner-only; escrita continua só do titular.';

-- (2b) Claim no signup copia também cpf_cnpj/car/caepf do contato-sombra.
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

  return new;
end;
$$;
