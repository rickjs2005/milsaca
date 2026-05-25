-- =================================================================
-- Milsaca — produtor responde proposta no mobile
-- Data: 2026-05-25
-- =================================================================
-- A Fase 9a criou a tabela `propostas` com RLS restrita a quem é
-- dona da corretora (current_corretora()). Pro produtor poder aceitar
-- ou rejeitar uma proposta direto no app mobile, precisa:
--   (a) SELECT da proposta quando o lead aponta pra ele
--   (b) UPDATE só pra transicionar status de "enviada" pra
--       "aceita"|"rejeitada" — não pode alterar valor, mensagem, etc.
--
-- Policies aditivas: ficam SOBRE as policies da corretora (RLS em PG é
-- OR — se qualquer policy permite, libera). Corretora continua com
-- controle total.
-- =================================================================

-- Leitura: produtor vê propostas dos leads dele
drop policy if exists propostas_select_produtor on public.propostas;
create policy propostas_select_produtor on public.propostas
  for select to authenticated
  using (
    exists (
      select 1
      from public.leads
      where leads.id = propostas.lead_id
        and leads.produtor_id = auth.uid()
    )
  );

-- Update: produtor só pode mover de "enviada" pra "aceita" ou "rejeitada".
-- Outras transições continuam restritas à corretora (policy propostas_update).
drop policy if exists propostas_update_produtor on public.propostas;
create policy propostas_update_produtor on public.propostas
  for update to authenticated
  using (
    status = 'enviada'
    and exists (
      select 1
      from public.leads
      where leads.id = propostas.lead_id
        and leads.produtor_id = auth.uid()
    )
  )
  with check (
    status in ('aceita', 'rejeitada')
    and exists (
      select 1
      from public.leads
      where leads.id = propostas.lead_id
        and leads.produtor_id = auth.uid()
    )
  );

comment on policy propostas_select_produtor on public.propostas is
  'Produtor lê propostas dos próprios leads. Aditiva à policy da corretora.';
comment on policy propostas_update_produtor on public.propostas is
  'Produtor aceita/rejeita propostas enviadas pelos próprios leads. Outras transições só pela corretora.';
