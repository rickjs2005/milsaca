-- =================================================================
-- Milsaca — Hardening de segurança: search_path de funções
--           + análise dos 3 ERROR security_definer_view
-- Data: 2026-08-01 (timestamp único — ver docs/milsaca/convencao-migrations.md)
-- =================================================================
-- Origem: Supabase advisors (security) no projeto kulanbcyrfawlhrpqxtz.
--   3x ERROR security_definer_view ........ corretoras_publicas,
--                                           unified_quotes, lotes_publicos
--   4x WARN  function_search_path_mutable .. tg_set_updated_at,
--                                           subscription_effective_status,
--                                           mask_nome, mask_doc
--
-- Esta migration RESOLVE os 4 WARNs (search_path) e NÃO altera as 3
-- views. Explicação da decisão sobre as views abaixo (Passo de análise).
--
-- -----------------------------------------------------------------
-- DECISÃO: as 3 views SECURITY DEFINER ficam COMO ESTÃO (de propósito)
-- -----------------------------------------------------------------
-- O advisor sinaliza security_definer_view (security_invoker = off) como
-- ERROR genérico, mas nestes 3 casos o `off` é uma escolha DELIBERADA e
-- DOCUMENTADA: são views públicas (lidas por `anon`) que projetam SÓ
-- colunas seguras (sem PII) e rodam como owner justamente para fazer
-- bypass da RLS das tabelas base — que, por desenho LGPD, BLOQUEIAM anon.
--
-- Trocar para `security_invoker = on` faria a view rodar com a RLS do
-- CHAMADOR (anon). Verificação das policies de SELECT das tabelas base
-- (pg_policies, em 2026-08-01) mostra que isso QUEBRARIA o acesso público:
--
--   corretoras_publicas → base `corretoras`
--     policy SELECT: (id = current_corretora()) OR is_admin()
--     + `revoke select ... from anon` (migration 20260527000000).
--     anon NÃO lê a base → view viraria 0 linhas. Catálogo público de
--     corretoras quebraria. (PII como cnpj/endereço/telefone_fixo foi
--     removida da projeção justamente para a view poder ser pública.)
--
--   lotes_publicos → bases `lotes`, `corretoras`, `produtores`, classificacoes_cob
--     lotes SELECT: is_admin() OR corretora_id=current_corretora()
--                   OR produtor_id=auth.uid()  → anon = 0 linhas.
--     corretoras (JOIN): anon bloqueado (idem acima).
--     anon NÃO lê as bases → vitrine pública de lotes (/lote/[id])
--     quebraria. (nome do produtor / fazenda / contato já foram tirados
--     da projeção — migration 20260652000000.)
--
--   unified_quotes → bases `market_quotes`, `cotacoes`, `corretoras`, ...
--     market_quotes SELECT: `true` (anon OK).
--     cotacoes SELECT: auth.role() = 'authenticated'  → anon = 0 linhas.
--     corretoras (JOIN): anon bloqueado.
--     Com invoker, anon perderia silenciosamente TODA a perna manual do
--     UNION (cotações de corretora/admin), ficando só com market_quotes.
--
-- Opção (a) — abrir policies de SELECT para anon nas tabelas base — foi
-- DESCARTADA: as bases contêm exatamente a PII (cnpj, endereço,
-- telefone_fixo, nome do produtor, fazenda, etc.) que as migrations
-- 20260527000000 e 20260652000000 fecharam por LGPD. Reabrir anon na base
-- reintroduziria o vazamento. As views são justamente a camada segura.
--
-- Portanto: opção (b) — manter as 3 views como SECURITY DEFINER e tratar
-- o ERROR do advisor como falso-positivo aceito e DOCUMENTADO. As views
-- projetam só colunas não-PII e o owner não tem privilégio de escalonar
-- nada além do SELECT projetado.
--
-- Reforço de documentação (idempotente) para deixar o intento explícito
-- a quem rodar o advisor de novo:
do $$
begin
  if to_regclass('public.corretoras_publicas') is not null then
    execute $c$comment on view public.corretoras_publicas is
      'Catálogo público de corretoras. SECURITY DEFINER (security_invoker=off) PROPOSITAL: roda como owner p/ servir anon sem RLS, projetando só colunas não-PII. NUNCA adicionar cnpj/ie/cep/endereco/bairro/telefone_fixo. Advisor security_definer_view é falso-positivo aceito.'$c$;
  end if;
  if to_regclass('public.lotes_publicos') is not null then
    execute $c$comment on view public.lotes_publicos is
      'Catálogo público de lotes. SECURITY DEFINER (security_invoker=off) PROPOSITAL: roda como owner p/ servir anon sem RLS, projetando só colunas não-PII. NUNCA adicionar cpf/cnpj/telefone/email do produtor ou da corretora, nome do produtor, nome da fazenda, geolocalização precisa ou observações internas. Contato da corretora só via fluxo autenticado + rate-limit. Advisor security_definer_view é falso-positivo aceito.'$c$;
  end if;
  if to_regclass('public.unified_quotes') is not null then
    execute $c$comment on view public.unified_quotes is
      'View unificada: market_quotes (automáticas) + cotacoes (manuais ativas). SECURITY DEFINER (security_invoker=off) PROPOSITAL: cotacoes/corretoras bloqueiam anon na RLS; trocar p/ invoker zeraria a perna manual do UNION p/ visitantes. Projeta só colunas não-PII. Advisor security_definer_view é falso-positivo aceito.'$c$;
  end if;
end $$;

-- =================================================================
-- WARN function_search_path_mutable — FIX
-- =================================================================
-- Fixa search_path nas 4 funções com search_path mutável. Todas têm
-- corpo simples e auto-contido (objetos só em `public`), então pinar
-- `public, pg_temp` não altera comportamento — só elimina o risco de
-- search_path injection. `pg_temp` por último é a recomendação oficial
-- (impede que objetos temporários do chamador sombreiem objetos reais).
-- Só o ALTER ... SET search_path; o corpo das funções NÃO é recriado.
-- Assinaturas exatas coletadas via pg_get_function_identity_arguments.

alter function public.tg_set_updated_at()                          set search_path = public, pg_temp;
alter function public.subscription_effective_status(sub public.subscriptions) set search_path = public, pg_temp;
alter function public.mask_nome(p_nome text)                       set search_path = public, pg_temp;
alter function public.mask_doc(p_doc text)                         set search_path = public, pg_temp;

-- =================================================================
-- Done. Smoke (esperado após apply):
--   -- search_path agora fixo (proconfig não-nulo) nas 4 funções:
--   select proname, proconfig from pg_proc
--    where pronamespace='public'::regnamespace
--      and proname in ('tg_set_updated_at','subscription_effective_status','mask_nome','mask_doc');
--   -- views intactas (security_invoker continua off):
--   select relname, reloptions from pg_class
--    where relname in ('corretoras_publicas','unified_quotes','lotes_publicos')
--      and relnamespace='public'::regnamespace;
-- =================================================================
