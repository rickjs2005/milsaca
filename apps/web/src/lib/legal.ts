/**
 * Versões dos documentos legais — fonte única de verdade.
 *
 * Importadas em politica-privacidade/page.tsx (exibição) e em
 * cadastrar/_actions.ts (gravação do consentimento em lgpd_consents.version).
 * Mantê-las aqui evita o risco de registrar a versão errada quando só um
 * dos dois lugares for atualizado (achado 3.7 da auditoria).
 *
 * Ao publicar uma nova versão de um documento, bumpar a constante aqui.
 */
export const POLITICA_VERSAO = "2026-05-19";
export const TERMOS_VERSAO = "2026-05-19";

/**
 * Versão do modelo de contrato. Entra no payload canônico do content_hash
 * (contratos/_actions.ts) pra que mudanças no formato do contrato sejam
 * rastreáveis. Bumpar só quando o conteúdo/estrutura do contrato mudar —
 * isso altera o hash de contratos FUTUROS (os já assinados mantêm o hash
 * gravado, não há recálculo retroativo).
 */
export const CONTRATO_VERSAO = "2026-05-30";
