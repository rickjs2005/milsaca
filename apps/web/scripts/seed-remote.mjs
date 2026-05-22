#!/usr/bin/env node
/**
 * Seed do Supabase remoto com dados de exemplo.
 *
 * Uso (a partir da raiz do monorepo):
 *   pnpm --filter @milsaca/web seed <email_do_produtor>
 *
 * Lê NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SECRET_KEY de apps/web/.env.local.
 * Idempotente: pode rodar de novo sem duplicar dados.
 *
 * Cobre todas as features do fim de semana 2026-05-16:
 * - Corretoras (verified + segunda corretora pra testar favoritar)
 * - Profile multi-role (produtor + corretora) vinculado à Cooxupé
 * - Cotações tipadas (specie + process)
 * - Contatos sombra (produtor_contatos)
 * - Leads (vinculados a produtor real E a contato sombra)
 * - Lead events de timeline
 * - Contratos (1 ativo, 1 rascunho)
 * - Lote + classificação COB (pra testar PDF/QR público)
 * - Favoritos
 */

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const here = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(here, "..", ".env.local");

async function loadEnv() {
  const raw = await readFile(envPath, "utf8");
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return env;
}

function todayMinus(days) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Uso: node scripts/seed-remote.mjs <email_do_produtor>");
    process.exit(1);
  }

  const env = await loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = env.SUPABASE_SECRET_KEY;
  if (!url || !secret) {
    console.error(
      "Faltam NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SECRET_KEY em apps/web/.env.local",
    );
    process.exit(1);
  }

  const admin = createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // ============================================================
  // 1) Encontrar produtor pelo email
  // ============================================================
  console.log(`> Buscando user "${email}" em auth.users...`);
  let userId = null;
  let page = 1;
  while (!userId) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 100,
    });
    if (error) throw error;
    const found = data.users.find(
      (u) => (u.email ?? "").toLowerCase() === email.toLowerCase(),
    );
    if (found) userId = found.id;
    if (data.users.length < 100) break;
    page += 1;
  }
  if (!userId) {
    console.error(
      `\n  Usuário "${email}" não encontrado em auth.users.\n` +
        "  Faça login uma vez em http://localhost:3000/entrar (basta abrir o /entrar,\n" +
        "  pedir o código por email e confirmar) e rode o seed de novo.\n",
    );
    process.exit(1);
  }
  console.log(`  user_id = ${userId}`);

  // ============================================================
  // 2) Corretoras (2 — Cooxupé verificada e Carmo Coffees)
  // ============================================================
  console.log("> Upsert corretoras (Cooxupé + Carmo Coffees)...");
  const { data: cooxupe, error: cooxErr } = await admin
    .from("corretoras")
    .upsert(
      {
        name: "Cooxupé",
        slug: "cooxupe",
        city: "Guaxupé",
        state: "MG",
        phone: "+5535999999999",
        email: "contato@cooxupe.com.br",
        verified: true,
      },
      { onConflict: "slug" },
    )
    .select("id, name")
    .single();
  if (cooxErr) throw cooxErr;

  const { data: carmo, error: carmoErr } = await admin
    .from("corretoras")
    .upsert(
      {
        name: "Carmo Coffees",
        slug: "carmo-coffees",
        city: "Carmo de Minas",
        state: "MG",
        phone: "+5535988887777",
        email: "contato@carmocoffees.com",
        verified: true,
      },
      { onConflict: "slug" },
    )
    .select("id, name")
    .single();
  if (carmoErr) throw carmoErr;
  console.log(`  ${cooxupe.name} (${cooxupe.id})`);
  console.log(`  ${carmo.name} (${carmo.id})`);

  // ============================================================
  // 3) Profile com multi-role
  // ============================================================
  console.log("> Profile: roles=[produtor, corretora], vinculado à Cooxupé");
  const { error: profErr } = await admin.from("profiles").upsert(
    {
      id: userId,
      role: "produtor",
      roles: ["produtor", "corretora"],
      corretora_id: cooxupe.id,
      full_name: "Rick Januário",
      phone: "+5533988887777",
    },
    { onConflict: "id" },
  );
  if (profErr) throw profErr;

  // 3.1) Produtores estendido (fazenda)
  const { data: prodExisting } = await admin
    .from("produtores")
    .select("id")
    .eq("profile_id", userId)
    .maybeSingle();
  if (prodExisting) {
    await admin
      .from("produtores")
      .update({
        fazenda_nome: "Sítio Boa Vista",
        city: "Manhuaçu",
        state: "MG",
        area_ha: 14.5,
        altitude_m: 950,
      })
      .eq("profile_id", userId);
  } else {
    await admin.from("produtores").insert({
      profile_id: userId,
      fazenda_nome: "Sítio Boa Vista",
      city: "Manhuaçu",
      state: "MG",
      area_ha: 14.5,
      altitude_m: 950,
    });
  }
  console.log("  produtor estendido ok (Sítio Boa Vista, 14,5 ha)");

  // ============================================================
  // 4) Cotações tipadas (specie + process)
  // ============================================================
  // GUARD: cotações fake bloqueadas em modo real (default).
  // Pra dev local rodar com QUOTES_MODE=demo na linha de comando.
  const quotesMode = process.env.QUOTES_MODE ?? "real";
  if (quotesMode !== "demo") {
    console.log(
      "> Cotações: PULADO (QUOTES_MODE != 'demo'). " +
        "Pra seedar cotações fake em dev, use: " +
        "QUOTES_MODE=demo pnpm --filter @milsaca/web seed <email>",
    );
  } else {
    console.log("> Cotações DEMO (QUOTES_MODE=demo) — 6 cotações fake...");
  const cotacoes = [
    {
      coffee_type: "Arábica",
      specie: "arabica",
      process: "natural",
      region: "Sul de Minas",
      price: 1417.0,
      reference_date: todayMinus(2),
      source: "CEPEA",
    },
    {
      coffee_type: "Arábica",
      specie: "arabica",
      process: "natural",
      region: "Sul de Minas",
      price: 1438.0,
      reference_date: todayMinus(1),
      source: "CEPEA",
    },
    {
      coffee_type: "Arábica",
      specie: "arabica",
      process: "natural",
      region: "Sul de Minas",
      price: 1450.0,
      reference_date: todayMinus(0),
      source: "CEPEA",
    },
    {
      coffee_type: "Arábica",
      specie: "arabica",
      process: "cereja_descascado",
      region: "Sul de Minas",
      price: 1505.0,
      reference_date: todayMinus(0),
      source: "CEPEA",
    },
    {
      coffee_type: "Conillón",
      specie: "conillon",
      process: "natural",
      region: "Espírito Santo",
      price: 991.0,
      reference_date: todayMinus(1),
      source: "CEPEA",
    },
    {
      coffee_type: "Conillón",
      specie: "conillon",
      process: "natural",
      region: "Espírito Santo",
      price: 980.0,
      reference_date: todayMinus(0),
      source: "CEPEA",
    },
  ];
    for (const c of cotacoes) {
      const cWithTenant = { ...c, corretora_id: cooxupe.id };
      const { data: existing } = await admin
        .from("cotacoes")
        .select("id")
        .eq("specie", c.specie)
        .eq("reference_date", c.reference_date)
        .eq("process", c.process)
        .eq("corretora_id", cooxupe.id)
        .maybeSingle();
      if (existing) {
        await admin.from("cotacoes").update(cWithTenant).eq("id", existing.id);
      } else {
        const { error } = await admin.from("cotacoes").insert(cWithTenant);
        if (error) throw error;
      }
    }
    console.log(`  ${cotacoes.length} cotações DEMO ok`);
  }

  // ============================================================
  // 5) Contatos sombra da Cooxupé (Fase 2)
  // ============================================================
  console.log("> Contatos sombra (produtor_contatos)...");
  await admin
    .from("produtor_contatos")
    .delete()
    .eq("corretora_id", cooxupe.id);

  const { data: contatos, error: contErr } = await admin
    .from("produtor_contatos")
    .insert([
      {
        corretora_id: cooxupe.id,
        full_name: "José Carvalho",
        email: "jose.carvalho@exemplo.com",
        phone: "+5533999990001",
        fazenda_nome: "Fazenda Cachoeira",
        city: "Caratinga",
        state: "MG",
        notes: "Produz arábica natural, sempre tira ~150 sacas em julho.",
      },
      {
        corretora_id: cooxupe.id,
        full_name: "Maria Oliveira",
        phone: "+5533999990002",
        fazenda_nome: "Sítio das Palmeiras",
        city: "Manhuaçu",
        state: "MG",
        notes: "Contato via WhatsApp. Ainda não tem email.",
      },
    ])
    .select("id, full_name");
  if (contErr) throw contErr;
  console.log(`  ${contatos.length} contatos sombra ok`);

  // ============================================================
  // 6) Leads (mix de produtor real + contato sombra)
  // ============================================================
  console.log("> Leads (apaga e recria pra ser idempotente)...");
  // Apaga leads exemplo da Cooxupé (produtor real + sombras)
  await admin
    .from("leads")
    .delete()
    .eq("corretora_id", cooxupe.id);

  const leads = [
    {
      corretora_id: cooxupe.id,
      produtor_id: userId,
      contato_id: null,
      status: "convertido",
      coffee_type: "Arábica",
      bag_count: 320,
      proposed_price: 1440.0,
      notes: "Proposta aceita após negociação por WhatsApp.",
    },
    {
      corretora_id: cooxupe.id,
      produtor_id: userId,
      contato_id: null,
      status: "em_negociacao",
      coffee_type: "Arábica",
      bag_count: 80,
      proposed_price: 1430.0,
      notes: "Aguardando contraproposta.",
    },
    {
      corretora_id: cooxupe.id,
      produtor_id: userId,
      contato_id: null,
      status: "perdido",
      coffee_type: "Conillón",
      bag_count: 200,
      proposed_price: 950.0,
      notes: "Preço abaixo do esperado pelo produtor.",
    },
    {
      corretora_id: cooxupe.id,
      produtor_id: null,
      contato_id: contatos[0].id,
      status: "novo",
      coffee_type: "Arábica",
      bag_count: 150,
      proposed_price: 1460.0,
      notes: "Lead novo via WhatsApp. José avaliando.",
    },
    {
      corretora_id: cooxupe.id,
      produtor_id: null,
      contato_id: contatos[1].id,
      status: "em_negociacao",
      coffee_type: "Arábica",
      bag_count: 60,
      proposed_price: 1455.0,
      notes: "Maria pediu pra retornar quarta.",
    },
  ];
  const { data: insLeads, error: leadsErr } = await admin
    .from("leads")
    .insert(leads)
    .select("id, status, produtor_id, contato_id");
  if (leadsErr) throw leadsErr;
  console.log(`  ${insLeads.length} leads ok`);

  // ============================================================
  // 7) Lead events (timeline) — adiciona alguns no lead convertido
  // ============================================================
  console.log("> Lead events (timeline) no lead convertido...");
  const convertido = insLeads.find((l) => l.status === "convertido");
  if (convertido) {
    await admin
      .from("lead_events")
      .delete()
      .eq("lead_id", convertido.id);
    await admin.from("lead_events").insert([
      {
        lead_id: convertido.id,
        corretora_id: cooxupe.id,
        actor_id: userId,
        kind: "created",
        payload: {
          coffee_type: "Arábica",
          bag_count: 320,
          proposed_price: 1440.0,
        },
      },
      {
        lead_id: convertido.id,
        corretora_id: cooxupe.id,
        actor_id: userId,
        kind: "comment",
        payload: { text: "Produtor confirmou recebimento da amostra." },
      },
      {
        lead_id: convertido.id,
        corretora_id: cooxupe.id,
        actor_id: userId,
        kind: "status_changed",
        payload: {
          from: "novo",
          to: "em_negociacao",
          comment: "Iniciamos negociação por WhatsApp.",
        },
      },
      {
        lead_id: convertido.id,
        corretora_id: cooxupe.id,
        actor_id: userId,
        kind: "status_changed",
        payload: {
          from: "em_negociacao",
          to: "convertido",
          comment: "Proposta aceita. Vamos pra contrato.",
        },
      },
    ]);
    console.log(`  4 eventos no lead ${convertido.id.slice(0, 8)}`);
  }

  // ============================================================
  // 8) Contratos (1 ativo + 1 rascunho)
  // ============================================================
  console.log("> Contratos...");
  await admin
    .from("contratos")
    .delete()
    .eq("corretora_id", cooxupe.id)
    .eq("produtor_id", userId);

  const year = new Date().getFullYear();
  const contratos = [
    {
      corretora_id: cooxupe.id,
      produtor_id: userId,
      lead_id: convertido?.id ?? null,
      code: `cooxupe-${year}-0001`,
      status: "ativo",
      coffee_type: "Arábica",
      bag_count: 320,
      total_value: 320 * 1440.0,
      signed_at: new Date().toISOString(),
    },
    {
      corretora_id: cooxupe.id,
      produtor_id: userId,
      lead_id: null,
      code: `cooxupe-${year}-0002`,
      status: "rascunho",
      coffee_type: "Conillón",
      bag_count: 100,
      total_value: 100 * 980.0,
      signed_at: null,
    },
  ];
  const { error: ctErr } = await admin.from("contratos").insert(contratos);
  if (ctErr) throw ctErr;
  console.log(`  ${contratos.length} contratos ok`);

  // ============================================================
  // 9) Lote + classificação COB (Fase 10 — testa PDF/QR)
  // ============================================================
  console.log("> Lote + classificação COB...");
  await admin
    .from("classificacoes_cob")
    .delete()
    .eq("corretora_id", cooxupe.id);
  await admin
    .from("lotes")
    .delete()
    .eq("corretora_id", cooxupe.id);

  const { data: lote, error: loteErr } = await admin
    .from("lotes")
    .insert({
      corretora_id: cooxupe.id,
      produtor_id: userId,
      codigo: "LM-2026-0001",
      specie: "arabica",
      processo: "natural",
      safra: "2025/2026",
      peso_sacas: 320,
      umidade_inicial: 11.5,
      status: "classificado",
      descricao: "Lote do talhão norte, colheita 2026-04.",
    })
    .select("id")
    .single();
  if (loteErr) throw loteErr;

  // Classificação realista — Tipo 6, sem ser Fora de Tipo
  const { error: classErr } = await admin.from("classificacoes_cob").insert({
    lote_id: lote.id,
    corretora_id: cooxupe.id,
    classificador_id: userId,
    total_defeitos: 26,
    tipo: "6",
    pontuacao: 0,
    fora_de_tipo: false,
    fora_de_tipo_motivos: [],
    schema_version: 1,
    defeitos_crus: {
      pretos: 1,
      verdes: 3,
      ardidos: 2,
      brocados: 8,
      conchas: 2,
      quebrados: 6,
    },
    brocados_por_defeito: 3,
    bebida: "Dura",
    classe: "Fina",
    aspecto: "bom",
    torra: "Média",
    peneiras: [
      { peneira: "17", percentual: 45.0 },
      { peneira: "16", percentual: 30.0 },
      { peneira: "15", percentual: 20.0 },
      { peneira: "14", percentual: 5.0 },
    ],
    peneira_dominante: "17",
    bica_corrida: false,
    umidade: 11.3,
    pva: 1.0,
    impurezas_pct: 0.2,
    observacoes:
      "Lote bem cuidado, baixo PVA, peneira dominante 17. Apto pra exportação.",
  });
  if (classErr) throw classErr;
  console.log(`  Lote LM-2026-0001 + classificação Tipo 6 ok`);

  // ============================================================
  // 10) Favoritos (Fase 8)
  // ============================================================
  console.log("> Favoritos...");
  await admin
    .from("favoritos")
    .delete()
    .eq("produtor_id", userId);
  await admin
    .from("favoritos")
    .insert([
      { produtor_id: userId, corretora_id: cooxupe.id },
      { produtor_id: userId, corretora_id: carmo.id },
    ]);
  console.log(`  2 favoritos ok`);

  console.log("\n✓ Seed completo concluído. Pronto pra testar.");
  console.log(`\nLinks úteis:`);
  console.log(`  http://localhost:3000/entrar`);
  console.log(`  http://localhost:3000/painel/escolher`);
  console.log(`  http://localhost:3000/painel/corretora`);
  console.log(`  http://localhost:3000/painel/produtor`);
}

main().catch((err) => {
  console.error("\nFalhou:", err);
  process.exit(1);
});
