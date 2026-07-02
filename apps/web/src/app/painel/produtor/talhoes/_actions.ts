"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@milsaca/db/web/server";
import type { Json } from "@milsaca/types/database";
import { friendlyPostgresError } from "@/lib/postgres-error";
import { safeError } from "@/lib/logger";
import { getReqLogger } from "@/lib/req-logger";
import { getProfile } from "@/lib/auth";
import {
  extrairGeometria,
  latLngValidos,
  pointGeoJson,
} from "@/lib/geo";
import { getProdutorByProfileId } from "../_lib/produtor";

const TALHOES = "/painel/produtor/talhoes";

function fail(msg: string): never {
  redirect(`${TALHOES}?error=${encodeURIComponent(msg)}`);
}

function ok(msg: string): never {
  redirect(`${TALHOES}?saved=${encodeURIComponent(msg)}`);
}

async function ensureProdutor() {
  const profile = await getProfile();
  if (!profile) redirect("/entrar");
  const produtor = await getProdutorByProfileId(profile.id);
  if (!produtor) redirect("/painel/produtor");
  return { profile, produtor };
}

/**
 * Cria um talhão. A geometria pode vir de três fontes (nesta ordem de
 * prioridade): GeoJSON colado (export do CAR/agrônomo) > lat/lng (GPS da
 * lavoura ou digitado). Sem geometria também vale — o talhão nasce
 * "pendente de localização" e trava o checklist EUDR até completar.
 */
export async function criarTalhao(formData: FormData) {
  const { produtor } = await ensureProdutor();

  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome || nome.length > 120)
    fail("Dê um nome ao talhão (até 120 caracteres).");

  const areaRaw = String(formData.get("area_ha") ?? "").trim();
  const areaHa = areaRaw ? Number(areaRaw.replace(",", ".")) : null;
  if (areaHa != null && (!Number.isFinite(areaHa) || areaHa <= 0))
    fail("Área inválida.");

  let geojson: Json | null = null;
  let origem = "manual";

  const geojsonTexto = String(formData.get("geojson_texto") ?? "").trim();
  const latRaw = String(formData.get("lat") ?? "").trim();
  const lngRaw = String(formData.get("lng") ?? "").trim();

  if (geojsonTexto) {
    const geom = extrairGeometria(geojsonTexto);
    if (!geom)
      fail(
        "GeoJSON inválido — cole um Point, Polygon ou MultiPolygon (ou um Feature/FeatureCollection com um deles).",
      );
    geojson = geom as unknown as Json;
    origem = "arquivo";
  } else if (latRaw && lngRaw) {
    const lat = Number(latRaw.replace(",", "."));
    const lng = Number(lngRaw.replace(",", "."));
    if (!latLngValidos(lat, lng))
      fail("Coordenadas inválidas — confira latitude e longitude.");
    geojson = pointGeoJson(lat, lng) as unknown as Json;
    origem = String(formData.get("origem") ?? "") === "gps" ? "gps" : "manual";
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("criar_talhao", {
    p_produtor_id: produtor.id,
    p_nome: nome,
    p_area_ha: areaHa,
    p_geojson: geojson,
    p_origem: origem,
  });

  if (error) {
    const log = await getReqLogger({ action: "criarTalhao" });
    log.error("talhao_criar_falhou", { code: error.code, err: safeError(error) });
    if (error.message.includes("geometria_invalida"))
      fail("A geometria enviada é inválida. Confira o arquivo/coordenadas.");
    fail(friendlyPostgresError(error));
  }

  revalidatePath(TALHOES);
  ok(
    geojson
      ? "Talhão cadastrado com localização. 🌱"
      : "Talhão cadastrado — falta marcar a localização.",
  );
}

/** Remove um talhão (a RLS garante que é do próprio produtor). */
export async function excluirTalhao(formData: FormData) {
  const { produtor } = await ensureProdutor();

  const id = String(formData.get("id") ?? "").trim();
  if (!id) fail("Talhão inválido.");

  const supabase = await createClient();
  const { data: deleted, error } = await supabase
    .from("talhoes")
    .delete()
    .eq("id", id)
    .eq("produtor_id", produtor.id)
    .select("id");

  if (error) {
    // FK de lote_talhoes é ON DELETE CASCADE, então erro aqui é outra coisa.
    fail(friendlyPostgresError(error));
  }
  if (!deleted || deleted.length === 0) fail("Talhão não encontrado.");

  revalidatePath(TALHOES);
  ok("Talhão removido.");
}
