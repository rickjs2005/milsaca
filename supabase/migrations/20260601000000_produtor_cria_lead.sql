-- =================================================================
-- Milsaca — produtor cria lead direto do mobile (Fase B)
-- Data: 2026-05-25
-- =================================================================
-- A tela "Ofertar café" do mobile (apps/mobile/app/(painel)/ofertar.tsx)
-- precisa que o produtor consiga inserir um lead em QUALQUER corretora
-- (não só na "casa" dele). A policy `leads_tenant_write` original só
-- permite a dona da corretora — produtor era bloqueado.
--
-- Policy aditiva (RLS é OR): produtor insere lead em SEU NOME pra
-- qualquer corretora ativa. Restrição: status forçado a 'novo' pra
-- evitar abusos (não dá pra criar lead já 'convertido' por exemplo).
-- =================================================================

drop policy if exists leads_produtor_insert on public.leads;
create policy leads_produtor_insert on public.leads
  for insert to authenticated
  with check (
    produtor_id = auth.uid()
    and status = 'novo'
  );

comment on policy leads_produtor_insert on public.leads is
  'Produtor cria lead em próprio nome via app mobile (Ofertar café). status forçado a novo.';
