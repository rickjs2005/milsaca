-- =================================================================
-- Milsaca — Corretoras v2: identidade completa
-- Data: 2026-05-18
-- =================================================================
-- Hoje a tabela corretoras tem só name/slug/city/state/phone/email.
-- Pra demonstrar a corretora pro produtor (com confiança) e pra
-- emitir documentos (espelho, contratos, NFP-e futuro), precisa de:
--   - CNPJ e Inscrição Estadual
--   - endereço completo (CEP, logradouro, bairro)
--   - site institucional, descrição curta, logo_url
--
-- O campo phone existente continua sendo o WhatsApp principal da
-- corretora (já usado em wa.me em vários lugares); telefone_fixo é
-- adicionado pra contato de mesa.
-- =================================================================

alter table public.corretoras
  add column if not exists cnpj          text,
  add column if not exists inscricao_est text,
  add column if not exists cep           text,
  add column if not exists endereco      text,
  add column if not exists bairro        text,
  add column if not exists telefone_fixo text,
  add column if not exists site_url      text,
  add column if not exists descricao     text,
  add column if not exists logo_url      text;

create unique index if not exists corretoras_cnpj_unique
  on public.corretoras (cnpj)
  where cnpj is not null;
