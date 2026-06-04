"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@milsaca/db/web/server";
import { requireUser } from "@/lib/auth";
import { bagsParaKg, sacasParaKg } from "@/lib/unidades";
import { friendlyPostgresError } from "@/lib/postgres-error";
import { safeError } from "@/lib/logger";
import { getReqLogger } from "@/lib/req-logger";

const SPECIES = ["arabica", "conillon"] as const;
const PROCESSOS = [
  "natural",
  "cereja_descascado",
  "cd_desmucilado",
  "despolpado",
  "fermentacao_induzida",
] as const;

// número opcional, aceita "8,33" ou "8.33"; vira null se vazio/ inválido.
const num = z
  .union([z.string(), z.number()])
  .optional()
  .transform((v) => {
    if (v == null || v === "") return null;
    const x = Number(String(v).trim().replace(",", "."));
    return Number.isFinite(x) && x >= 0 ? x : null;
  });

const optText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null));

const schema = z.object({
  specie: z.enum(SPECIES, { message: "Escolha a espécie." }),
  processo: z
    .enum(PROCESSOS)
    .nullish()
    .transform((v) => v ?? null),
  safra: optText(20),
  descricao: optText(500),
  unidade_entrada: z.enum(["saca", "bag", "kg"], {
    message: "Escolha a unidade.",
  }),
  qtd_bags: num,
  peso_por_bag: num,
  qtd_sacas: num,
  qtd_kg: num,
  // checkbox: "on" quando marcado, ausente quando não. Default false = saca estimada.
  beneficiado: z
    .union([z.string(), z.undefined()])
    .optional()
    .transform((v) => v === "on" || v === "true"),
});

const NOVO = "/painel/produtor/cafe/novo";
const erro = (msg: string): never =>
  redirect(`${NOVO}?error=${encodeURIComponent(msg)}`);

export async function registrarCafe(formData: FormData) {
  const user = await requireUser("/painel/produtor");

  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    // redirect direto (não via helper) p/ o TS estreitar parsed.success.
    redirect(
      `${NOVO}?error=${encodeURIComponent(parsed.error.issues.map((i) => i.message).join("; "))}`,
    );
  }
  const f = parsed.data;

  // peso_kg é a VERDADE — derivado da entrada via @/lib/unidades (nunca grava
  // sacas como número digitado). Guarda também como o produtor informou.
  let pesoKg: number;
  let qtdVolumes: number | null = null;
  let pesoPorVolume: number | null = null;

  if (f.unidade_entrada === "bag") {
    if (!f.qtd_bags || !f.peso_por_bag) {
      erro("Informe a quantidade de bags e o peso por bag.");
    }
    pesoKg = bagsParaKg(f.qtd_bags!, f.peso_por_bag!);
    qtdVolumes = f.qtd_bags!;
    pesoPorVolume = f.peso_por_bag!;
  } else if (f.unidade_entrada === "saca") {
    if (!f.qtd_sacas) erro("Informe o número de sacas.");
    pesoKg = sacasParaKg(f.qtd_sacas!);
    qtdVolumes = f.qtd_sacas!;
    pesoPorVolume = 60;
  } else {
    if (!f.qtd_kg) erro("Informe o peso em kg.");
    pesoKg = f.qtd_kg!;
  }

  if (!(pesoKg > 0)) erro("A quantidade precisa ser maior que zero.");

  const supabase = await createClient();

  // Código automático PROD-{ano}-{seq por produtor}.
  const { count } = await supabase
    .from("lotes")
    .select("id", { count: "exact", head: true })
    .eq("produtor_id", user.id);
  const ano = new Date().getFullYear();
  const codigo = `PROD-${ano}-${String((count ?? 0) + 1).padStart(4, "0")}`;

  // Lote rascunho do produtor: sem corretora (vende pelo fluxo de Corretoras).
  // RLS lotes_produtor_insert_rascunho exige produtor_id=auth.uid() + corretora_id null + rascunho.
  const { error } = await supabase.from("lotes").insert({
    produtor_id: user.id,
    corretora_id: null,
    codigo,
    specie: f.specie,
    processo: f.processo,
    safra: f.safra,
    descricao: f.descricao,
    peso_kg: pesoKg,
    unidade_entrada: f.unidade_entrada,
    qtd_volumes: qtdVolumes,
    peso_por_volume_kg: pesoPorVolume,
    beneficiado: f.beneficiado,
    status: "rascunho",
  });

  if (error) {
    const log = await getReqLogger({ action: "registrarCafe", userId: user.id });
    log.error("registrar_cafe_falhou", {
      code: error.code,
      err: safeError(error),
    });
    erro(friendlyPostgresError(error));
  }

  revalidatePath("/painel/produtor");
  revalidatePath("/painel/produtor/laudos");
  redirect(
    `/painel/produtor?ok=${encodeURIComponent("Café registrado no seu estoque.")}`,
  );
}
