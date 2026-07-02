// Cliente da API GraphQL do MapBiomas Alerta (F2 v2 — verificação de
// desmatamento pro EUDR). SERVER-ONLY: usa credenciais de ambiente.
//
// API (schema confirmado por introspecção em 2026-07-02):
//   endpoint: https://plataforma.alerta.mapbiomas.org/api/v2/graphql
//   mutation signIn(email, password) { token }            ← Bearer p/ queries
//   query alerts(boundingBox: [Float!], startDate, dateType, limit, page) {
//     collection { alertCode areaHa detectedAt publishedAt statusName geometryWkt }
//     metadata { totalCount totalPages }
//   }
// boundingBox = [lngMin, latMin, lngMax, latMax] (ordem GeoJSON bbox).
// O bbox é filtro GROSSO — a interseção exata é conferida no PostGIS via
// RPC talhao_intersecta_wkt com o geometryWkt de cada alerta.
//
// Credenciais: MAPBIOMAS_ALERTA_EMAIL + MAPBIOMAS_ALERTA_PASSWORD (conta
// gratuita em plataforma.alerta.mapbiomas.org/sign-up). Sem elas,
// mapbiomasConfigurado() = false e a UI explica como configurar.
//
// IMPORTANTE: só importar de server actions/route handlers — lê env vars
// secretas (sem prefixo NEXT_PUBLIC_, nunca chegam ao client bundle).

const ENDPOINT = "https://plataforma.alerta.mapbiomas.org/api/v2/graphql";

/** Corte do EUDR: só interessa desmatamento após esta data. */
export const EUDR_CORTE = "2020-12-31";

export type MapbiomasAlerta = {
  alertCode: string;
  areaHa: number | null;
  detectedAt: string | null;
  publishedAt: string | null;
  statusName: string | null;
  geometryWkt: string | null;
};

export function mapbiomasConfigurado(): boolean {
  return Boolean(
    process.env.MAPBIOMAS_ALERTA_EMAIL && process.env.MAPBIOMAS_ALERTA_PASSWORD,
  );
}

async function gql<T>(
  query: string,
  variables: Record<string, unknown>,
  token?: string,
): Promise<T> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`mapbiomas_http_${res.status}`);
  const json = (await res.json()) as {
    data?: T;
    errors?: { message: string }[];
  };
  if (json.errors?.length) {
    throw new Error(`mapbiomas_gql: ${json.errors[0]?.message ?? "erro"}`);
  }
  if (!json.data) throw new Error("mapbiomas_sem_dados");
  return json.data;
}

export async function mapbiomasSignIn(): Promise<string> {
  const email = process.env.MAPBIOMAS_ALERTA_EMAIL;
  const password = process.env.MAPBIOMAS_ALERTA_PASSWORD;
  if (!email || !password) throw new Error("mapbiomas_nao_configurado");

  const data = await gql<{ signIn: { token: string } }>(
    `mutation ($email: String!, $password: String!) {
       signIn(email: $email, password: $password) { token }
     }`,
    { email, password },
  );
  return data.signIn.token;
}

/**
 * Alertas detectados após o corte EUDR dentro do bounding box.
 * Uma página de 100 cobre com folga um talhão; se houver mais, o chamador
 * fica sabendo pelo totalCount e trata como "muitos alertas na região".
 */
export async function mapbiomasAlertsByBbox(
  token: string,
  bbox: [number, number, number, number],
): Promise<{ alertas: MapbiomasAlerta[]; totalCount: number }> {
  const data = await gql<{
    alerts: {
      collection: MapbiomasAlerta[];
      metadata: { totalCount: number };
    };
  }>(
    `query ($bbox: [Float!], $startDate: BaseDate) {
       alerts(
         boundingBox: $bbox,
         startDate: $startDate,
         dateType: DetectedAt,
         limit: 100,
         page: 1
       ) {
         collection {
           alertCode
           areaHa
           detectedAt
           publishedAt
           statusName
           geometryWkt
         }
         metadata { totalCount }
       }
     }`,
    { bbox, startDate: EUDR_CORTE },
    token,
  );
  return {
    alertas: data.alerts.collection ?? [],
    totalCount: data.alerts.metadata?.totalCount ?? 0,
  };
}

/**
 * Bounding box [lngMin, latMin, lngMax, latMax] de uma geometria GeoJSON,
 * com margem (~100 m por padrão) — importante pra talhão-ponto: o ponto é
 * o "centro" da lavoura, a margem cobre a vizinhança imediata.
 */
export function bboxDeGeojson(
  geojson: unknown,
  margemGraus = 0.001,
): [number, number, number, number] | null {
  let lngMin = Infinity;
  let latMin = Infinity;
  let lngMax = -Infinity;
  let latMax = -Infinity;
  let achou = false;

  function walk(coords: unknown): void {
    if (!Array.isArray(coords)) return;
    if (
      coords.length >= 2 &&
      typeof coords[0] === "number" &&
      typeof coords[1] === "number"
    ) {
      const [lng, lat] = coords as number[];
      lngMin = Math.min(lngMin, lng as number);
      latMin = Math.min(latMin, lat as number);
      lngMax = Math.max(lngMax, lng as number);
      latMax = Math.max(latMax, lat as number);
      achou = true;
      return;
    }
    for (const c of coords) walk(c);
  }

  const g = geojson as { coordinates?: unknown } | null;
  walk(g?.coordinates);
  if (!achou) return null;
  return [
    lngMin - margemGraus,
    latMin - margemGraus,
    lngMax + margemGraus,
    latMax + margemGraus,
  ];
}
