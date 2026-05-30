-- =================================================================
-- Comprovantes de pagamento — Supabase Storage (bucket privado)
-- =================================================================
-- Gap C1: a corretora marca um pagamento ao produtor como "pago" e anexa
-- a foto/PDF do PIX como comprovante. Arquivo real, bucket PRIVADO; o
-- produtor vê via signed URL gerada no server.
--
-- CONVENÇÃO DE PATH (segue o app em
-- apps/web/src/app/painel/corretora/pagamentos/_actions.ts):
--     {corretora_id}/{pagamento_id}.{ext}
--   - segmento [1] do path = corretora_id (dono/tenant)
--   - segmento [2] do path = "{pagamento_id}.{ext}" (nome do arquivo);
--     o pagamento_id é o nome do arquivo SEM extensão.
--   Ex.: "a1b2.../9f8e....jpg"
--
-- storage.objects já vem com RLS habilitada pelo Supabase; aqui só criamos
-- o bucket e as policies. Migration idempotente.
-- =================================================================

-- Bucket privado (não recria se já existir).
insert into storage.buckets (id, name, public)
values ('comprovantes', 'comprovantes', false)
on conflict (id) do nothing;

-- ---------------------------------------------------------------
-- Policies para o bucket 'comprovantes'
-- Helpers do projeto: public.current_corretora() (uuid da corretora do
-- usuário logado) e public.is_admin() (boolean).
-- ---------------------------------------------------------------

-- Drop idempotente (permite re-rodar a migration sem erro).
drop policy if exists "comprovantes_corretora_select" on storage.objects;
drop policy if exists "comprovantes_corretora_insert" on storage.objects;
drop policy if exists "comprovantes_corretora_update" on storage.objects;
drop policy if exists "comprovantes_corretora_delete" on storage.objects;
drop policy if exists "comprovantes_produtor_select" on storage.objects;
drop policy if exists "comprovantes_admin_all" on storage.objects;

-- Corretora dona (1º segmento do path = current_corretora()): CRUD completo.
create policy "comprovantes_corretora_select"
  on storage.objects for select
  using (
    bucket_id = 'comprovantes'
    and (storage.foldername(name))[1] = public.current_corretora()::text
  );

create policy "comprovantes_corretora_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'comprovantes'
    and (storage.foldername(name))[1] = public.current_corretora()::text
  );

create policy "comprovantes_corretora_update"
  on storage.objects for update
  using (
    bucket_id = 'comprovantes'
    and (storage.foldername(name))[1] = public.current_corretora()::text
  )
  with check (
    bucket_id = 'comprovantes'
    and (storage.foldername(name))[1] = public.current_corretora()::text
  );

create policy "comprovantes_corretora_delete"
  on storage.objects for delete
  using (
    bucket_id = 'comprovantes'
    and (storage.foldername(name))[1] = public.current_corretora()::text
  );

-- Produtor dono do pagamento: SELECT (leitura via signed URL).
-- O 2º segmento do path é "{pagamento_id}.{ext}"; comparamos o pagamento_id
-- (filename SEM extensão) com produtor_pagamentos.id cujo produtor_id = auth.uid().
-- split_part(..., '.', 1) remove a extensão de forma robusta.
create policy "comprovantes_produtor_select"
  on storage.objects for select
  using (
    bucket_id = 'comprovantes'
    and exists (
      select 1
      from public.produtor_pagamentos pp
      where pp.produtor_id = auth.uid()
        and pp.id::text = split_part((storage.foldername(name))[2], '.', 1)
    )
  );

-- Admin da plataforma: tudo.
create policy "comprovantes_admin_all"
  on storage.objects for all
  using (bucket_id = 'comprovantes' and public.is_admin())
  with check (bucket_id = 'comprovantes' and public.is_admin());
