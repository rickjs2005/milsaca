-- =================================================================
-- Milsaca — F1: Gestão documental (tabela documentos + bucket Storage)
-- Data: 2026-07-02 (timestamp único — ver docs/milsaca/convencao-migrations.md)
-- =================================================================
-- Fundação da F1 (e do dossiê EUDR/F2): documentos anexáveis a produtor,
-- lote, contrato ou à própria corretora, com categoria, validade e
-- versionamento por encadeamento (nunca sobrescreve arquivo).
--
-- MODELO DE POSSE:
--   - `produtores` é GLOBAL por perfil (profile_id unique) — documento de
--     produtor (CAR, ITR) pertence ao PRODUTOR (corretora_id NULL) e fica
--     visível às corretoras com relação real (lead/contrato) com ele.
--   - Documento de lote/contrato/corretora pertence ao tenant
--     (corretora_id obrigatório).
--
-- STORAGE (bucket privado 'documentos'):
--   Path: {pasta}/{documento_id}.{ext}
--     pasta = corretora_id (docs do tenant) OU profile_id do produtor
--     (docs do próprio produtor). Leitura via signed URL no server.
--   NOTA: usamos storage.filename(name) — NÃO (storage.foldername(name))[2]
--   como no bucket comprovantes, porque foldername() exclui o último
--   segmento (o arquivo) e [2] é NULL num path de 2 segmentos.
--
-- Versionamento: nova versão = nova linha (versao = anterior+1,
-- substitui_documento_id aponta pra anterior). Soft-delete via deleted_at
-- (padrão LGPD do projeto); queries filtram, RLS não esconde do dono.
--
-- Idempotente: guards em enum/tabela/policies. Expand-only.
-- =================================================================

-- -----------------------------------------------------------------
-- 1. Enums
-- -----------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'documento_owner_kind') then
    create type public.documento_owner_kind as enum
      ('produtor', 'lote', 'contrato', 'corretora');
  end if;
  if not exists (select 1 from pg_type where typname = 'documento_categoria') then
    create type public.documento_categoria as enum
      ('car', 'itr', 'procuracao', 'certificado', 'nota_fiscal',
       'contrato_assinado', 'outro');
  end if;
end $$;

-- -----------------------------------------------------------------
-- 2. Tabela
-- -----------------------------------------------------------------
create table if not exists public.documentos (
  id                     uuid primary key default extensions.uuid_generate_v4(),
  -- NULL somente para documento de produtor (dono é o produtor, não o tenant).
  corretora_id           uuid references public.corretoras(id) on delete cascade,
  owner_kind             public.documento_owner_kind not null,
  owner_id               uuid not null,
  categoria              public.documento_categoria not null default 'outro',
  titulo                 text not null check (char_length(titulo) between 1 and 160),
  storage_path           text not null unique,
  mime_type              text not null,
  tamanho_bytes          bigint not null default 0 check (tamanho_bytes >= 0),
  valido_ate             date,
  versao                 integer not null default 1 check (versao >= 1),
  substitui_documento_id uuid references public.documentos(id) on delete set null,
  uploaded_by            uuid references public.profiles(id) on delete set null,
  deleted_at             timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  -- Doc de tenant exige corretora_id; doc de produtor pode ser do próprio.
  constraint documentos_corretora_obrigatoria
    check (owner_kind = 'produtor' or corretora_id is not null)
);

create index if not exists documentos_corretora_idx
  on public.documentos (corretora_id, owner_kind, owner_id)
  where corretora_id is not null;
create index if not exists documentos_owner_idx
  on public.documentos (owner_kind, owner_id);
create index if not exists documentos_valido_ate_idx
  on public.documentos (valido_ate)
  where valido_ate is not null and deleted_at is null;

drop trigger if exists tg_set_updated_at_documentos on public.documentos;
create trigger tg_set_updated_at_documentos
  before update on public.documentos
  for each row execute function public.tg_set_updated_at();

comment on table public.documentos is
  'Gestão documental (F1): anexos de produtor/lote/contrato/corretora com categoria, validade e versionamento encadeado. Arquivo real no bucket documentos.';

alter table public.documentos enable row level security;

-- -----------------------------------------------------------------
-- 3. RLS da tabela
-- -----------------------------------------------------------------
drop policy if exists documentos_admin_all on public.documentos;
create policy documentos_admin_all
  on public.documentos for all
  using (public.is_admin())
  with check (public.is_admin());

-- Corretora: CRUD nos documentos do próprio tenant. O with check amarra o
-- vínculo (owner) ao tenant — não dá pra anexar doc em lote/contrato alheio.
drop policy if exists documentos_corretora_all on public.documentos;
create policy documentos_corretora_all
  on public.documentos for all
  using (corretora_id = public.current_corretora())
  with check (
    corretora_id = public.current_corretora()
    and (
      (owner_kind = 'corretora' and owner_id = public.current_corretora())
      or (owner_kind = 'lote' and exists (
            select 1 from public.lotes l
             where l.id = owner_id and l.corretora_id = public.current_corretora()))
      or (owner_kind = 'contrato' and exists (
            select 1 from public.contratos c
             where c.id = owner_id and c.corretora_id = public.current_corretora()))
      -- Corretora pode anexar doc a produtor RELACIONADO (procuração etc.);
      -- o doc fica do tenant (corretora_id preenchido), não do produtor.
      or (owner_kind = 'produtor' and exists (
            select 1 from public.produtores p
             where p.id = owner_id
               and (
                 exists (select 1 from public.leads l
                          where l.produtor_id = p.profile_id
                            and l.corretora_id = public.current_corretora())
                 or exists (select 1 from public.contratos c
                             where c.produtor_id = p.profile_id
                               and c.corretora_id = public.current_corretora())
               )))
    )
  );

-- Corretora: VÊ documentos que o produtor relacionado subiu (CAR, ITR...).
drop policy if exists documentos_corretora_select_produtor on public.documentos;
create policy documentos_corretora_select_produtor
  on public.documentos for select
  using (
    owner_kind = 'produtor'
    and corretora_id is null
    and exists (
      select 1 from public.produtores p
       where p.id = owner_id
         and (
           exists (select 1 from public.leads l
                    where l.produtor_id = p.profile_id
                      and l.corretora_id = public.current_corretora())
           or exists (select 1 from public.contratos c
                       where c.produtor_id = p.profile_id
                         and c.corretora_id = public.current_corretora())
         )
    )
  );

-- Produtor: VÊ docs sobre ele (dele ou anexados por corretora) e dos
-- contratos em que é parte.
drop policy if exists documentos_produtor_select on public.documentos;
create policy documentos_produtor_select
  on public.documentos for select
  using (
    (owner_kind = 'produtor' and exists (
       select 1 from public.produtores p
        where p.id = owner_id and p.profile_id = (select auth.uid())))
    or (owner_kind = 'contrato' and exists (
       select 1 from public.contratos c
        where c.id = owner_id and c.produtor_id = (select auth.uid())))
  );

-- Produtor: INSERE doc próprio (CAR/ITR/certificado) — sem tenant.
drop policy if exists documentos_produtor_insert on public.documentos;
create policy documentos_produtor_insert
  on public.documentos for insert
  with check (
    owner_kind = 'produtor'
    and corretora_id is null
    and uploaded_by = (select auth.uid())
    and exists (
      select 1 from public.produtores p
       where p.id = owner_id and p.profile_id = (select auth.uid()))
  );

-- Produtor: UPDATE/DELETE só no que ELE subiu (não mexe em doc da corretora).
drop policy if exists documentos_produtor_update on public.documentos;
create policy documentos_produtor_update
  on public.documentos for update
  using (
    uploaded_by = (select auth.uid())
    and owner_kind = 'produtor'
    and corretora_id is null
  )
  with check (
    uploaded_by = (select auth.uid())
    and owner_kind = 'produtor'
    and corretora_id is null
  );

drop policy if exists documentos_produtor_delete on public.documentos;
create policy documentos_produtor_delete
  on public.documentos for delete
  using (
    uploaded_by = (select auth.uid())
    and owner_kind = 'produtor'
    and corretora_id is null
  );

-- -----------------------------------------------------------------
-- 4. Bucket privado + policies de Storage
-- -----------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('documentos', 'documentos', false)
on conflict (id) do nothing;

drop policy if exists "documentos_corretora_select" on storage.objects;
drop policy if exists "documentos_corretora_insert" on storage.objects;
drop policy if exists "documentos_corretora_update" on storage.objects;
drop policy if exists "documentos_corretora_delete" on storage.objects;
drop policy if exists "documentos_produtor_select" on storage.objects;
drop policy if exists "documentos_produtor_insert" on storage.objects;
drop policy if exists "documentos_produtor_update" on storage.objects;
drop policy if exists "documentos_produtor_delete" on storage.objects;
drop policy if exists "documentos_cross_select_produtor" on storage.objects;
drop policy if exists "documentos_cross_select_corretora" on storage.objects;
drop policy if exists "documentos_admin_all" on storage.objects;

-- Pasta do tenant: CRUD da corretora.
create policy "documentos_corretora_select"
  on storage.objects for select
  using (
    bucket_id = 'documentos'
    and (storage.foldername(name))[1] = public.current_corretora()::text
  );
create policy "documentos_corretora_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'documentos'
    and (storage.foldername(name))[1] = public.current_corretora()::text
  );
create policy "documentos_corretora_update"
  on storage.objects for update
  using (
    bucket_id = 'documentos'
    and (storage.foldername(name))[1] = public.current_corretora()::text
  )
  with check (
    bucket_id = 'documentos'
    and (storage.foldername(name))[1] = public.current_corretora()::text
  );
create policy "documentos_corretora_delete"
  on storage.objects for delete
  using (
    bucket_id = 'documentos'
    and (storage.foldername(name))[1] = public.current_corretora()::text
  );

-- Pasta do produtor (profile_id): CRUD do próprio produtor.
create policy "documentos_produtor_select"
  on storage.objects for select
  using (
    bucket_id = 'documentos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy "documentos_produtor_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'documentos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy "documentos_produtor_update"
  on storage.objects for update
  using (
    bucket_id = 'documentos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'documentos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy "documentos_produtor_delete"
  on storage.objects for delete
  using (
    bucket_id = 'documentos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Leitura CRUZADA — produtor lê arquivo em pasta de corretora quando o
-- registro em `documentos` é visível a ele (docs sobre ele / seus contratos).
-- filename sem extensão = documentos.id (via storage.filename, NÃO foldername).
create policy "documentos_cross_select_produtor"
  on storage.objects for select
  using (
    bucket_id = 'documentos'
    and exists (
      select 1 from public.documentos d
       where d.id::text = split_part(storage.filename(name), '.', 1)
         and d.deleted_at is null
         and (
           (d.owner_kind = 'produtor' and exists (
              select 1 from public.produtores p
               where p.id = d.owner_id and p.profile_id = (select auth.uid())))
           or (d.owner_kind = 'contrato' and exists (
              select 1 from public.contratos c
               where c.id = d.owner_id and c.produtor_id = (select auth.uid())))
         )
    )
  );

-- Leitura CRUZADA — corretora lê arquivo na pasta do produtor relacionado.
create policy "documentos_cross_select_corretora"
  on storage.objects for select
  using (
    bucket_id = 'documentos'
    and exists (
      select 1 from public.documentos d
       where d.id::text = split_part(storage.filename(name), '.', 1)
         and d.deleted_at is null
         and d.owner_kind = 'produtor'
         and d.corretora_id is null
         and exists (
           select 1 from public.produtores p
            where p.id = d.owner_id
              and (
                exists (select 1 from public.leads l
                         where l.produtor_id = p.profile_id
                           and l.corretora_id = public.current_corretora())
                or exists (select 1 from public.contratos c
                            where c.produtor_id = p.profile_id
                              and c.corretora_id = public.current_corretora())
              )
         )
    )
  );

create policy "documentos_admin_all"
  on storage.objects for all
  using (bucket_id = 'documentos' and public.is_admin())
  with check (bucket_id = 'documentos' and public.is_admin());
