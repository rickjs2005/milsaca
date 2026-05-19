#!/usr/bin/env node
/**
 * Atualiza templates de email do Supabase Auth via Management API.
 *
 * Uso:
 *   $env:SUPABASE_ACCESS_TOKEN = "sbp_xxx"
 *   node scripts/update-auth-template.mjs <template-name>
 *
 * Templates disponíveis: confirmation, recovery, magic_link, invite
 * Project ref vem de NEXT_PUBLIC_SUPABASE_URL em .env.local.
 *
 * Endpoint: PATCH /v1/projects/{ref}/config/auth
 * Quando customiza um template, a API marca o flag correspondente em
 * mailer_templates_custom_contents automaticamente.
 */

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(here, "..", ".env.local");

async function loadEnv() {
  const raw = await readFile(envPath, "utf8");
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
  }
  return env;
}

const CONFIRMATION_BODY = `<div style="font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #2D3A2E;">
  <h2 style="color: #2D3A2E; margin: 0 0 16px;">Confirme seu email</h2>

  <p style="margin: 0 0 24px; line-height: 1.5;">
    Use o código abaixo pra ativar sua conta no Milsaca:
  </p>

  <div style="background: #FAF7F0; border: 2px solid #C9A961; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
    <div style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #2D3A2E; font-family: monospace;">
      {{ .Token }}
    </div>
  </div>

  <p style="margin: 0 0 12px; line-height: 1.5; font-size: 14px;">
    O código expira em <strong>1 hora</strong>. Cheque também a pasta de spam se não vir na caixa de entrada.
  </p>

  <p style="margin: 24px 0 0; font-size: 12px; color: #4A5C4C; border-top: 1px solid #EFEADB; padding-top: 12px;">
    Se não foi você que solicitou esse cadastro, é seguro ignorar este email.
  </p>
</div>`;

const TEMPLATES = {
  confirmation: {
    subject: "Seu código de confirmação Milsaca: {{ .Token }}",
    body: CONFIRMATION_BODY,
    subjectField: "mailer_subjects_confirmation",
    bodyField: "mailer_templates_confirmation_content",
  },
};

const ok = (m) => console.log(`\x1b[32m✓\x1b[0m ${m}`);
const fail = (m) => console.log(`\x1b[31m✗\x1b[0m ${m}`);

async function main() {
  const name = process.argv[2];
  if (!name || !TEMPLATES[name]) {
    fail(`Template inválido. Use: ${Object.keys(TEMPLATES).join(", ")}`);
    process.exit(1);
  }

  const env = await loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!url) {
    fail("NEXT_PUBLIC_SUPABASE_URL ausente em apps/web/.env.local");
    process.exit(1);
  }
  if (!token) {
    fail("SUPABASE_ACCESS_TOKEN não setado.");
    console.error('  $env:SUPABASE_ACCESS_TOKEN = "sbp_xxx"');
    process.exit(1);
  }

  const ref = url.replace(/^https?:\/\//, "").split(".")[0];
  const tpl = TEMPLATES[name];

  console.log(`projeto:   ${ref}`);
  console.log(`template:  ${name}`);
  console.log(`subject:   ${tpl.subject}`);
  console.log(`body len:  ${tpl.body.length} bytes\n`);

  const res = await fetch(
    `https://api.supabase.com/v1/projects/${ref}/config/auth`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        [tpl.subjectField]: tpl.subject,
        [tpl.bodyField]: tpl.body,
      }),
    },
  );

  const text = await res.text();
  console.log(`status: ${res.status}`);
  if (!res.ok) {
    console.log(text);
    fail("update falhou");
    process.exit(1);
  }
  ok(`template '${name}' atualizado`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
