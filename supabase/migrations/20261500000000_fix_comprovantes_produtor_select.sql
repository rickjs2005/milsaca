-- =================================================================
-- Milsaca — Fix: produtor nunca conseguia ver o comprovante do repasse
-- Data: 2026-07-02 (timestamp único — ver docs/milsaca/convencao-migrations.md)
-- =================================================================
-- A policy comprovantes_produtor_select (20260711) comparava o pagamento_id
-- com (storage.foldername(name))[2]. Só que storage.foldername() retorna os
-- segmentos de PASTA (exclui o arquivo) — no path do bucket
-- ({corretora_id}/{pagamento_id}.{ext}) o array tem 1 elemento e [2] é NULL,
-- então o EXISTS nunca casava e o produtor não tinha SELECT no objeto.
-- Sintoma: em /painel/produtor/financeiro o createSignedUrl falha silencioso
-- e o link "Ver comprovante" nunca aparece pro produtor.
--
-- Fix: usar storage.filename(name) (o nome do arquivo de fato) e extrair o
-- id sem extensão. Mesmo padrão adotado no bucket documentos (20261490).
-- auth.uid() vira (select auth.uid()) — convenção initplan (20261450).
-- =================================================================

drop policy if exists "comprovantes_produtor_select" on storage.objects;
create policy "comprovantes_produtor_select"
  on storage.objects for select
  using (
    bucket_id = 'comprovantes'
    and exists (
      select 1
      from public.produtor_pagamentos pp
      where pp.produtor_id = (select auth.uid())
        and pp.id::text = split_part(storage.filename(name), '.', 1)
    )
  );
