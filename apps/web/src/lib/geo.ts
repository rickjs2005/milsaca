// Helpers puros de geolocalização (F2/EUDR). Sem dependência de mapa —
// validação leve de GeoJSON pro fluxo "colar do CAR/agrônomo" e montagem
// de Point a partir de lat/lng (GPS ou manual).

export type GeoJsonGeometry = {
  type: "Point" | "Polygon" | "MultiPolygon";
  coordinates: unknown;
};

const TIPOS_ACEITOS = new Set(["Point", "Polygon", "MultiPolygon"]);

export function pointGeoJson(lat: number, lng: number): GeoJsonGeometry {
  // GeoJSON é [lng, lat] — ordem inversa do que o GPS mostra. Erro clássico.
  return { type: "Point", coordinates: [lng, lat] };
}

export function latLngValidos(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180 &&
    // (0,0) é o valor clássico de GPS falhado — rejeita.
    !(lat === 0 && lng === 0)
  );
}

/**
 * Extrai uma geometria aceitável de um texto GeoJSON colado pelo usuário.
 * Aceita a geometria direta, Feature ou FeatureCollection (pega a 1ª
 * geometria compatível — caso comum: export do CAR com um polígono).
 * Retorna null se não achar nada utilizável. A validação topológica de
 * verdade acontece no banco (st_isvalid, na RPC criar_talhao).
 */
export function extrairGeometria(texto: string): GeoJsonGeometry | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(texto);
  } catch {
    return null;
  }
  return acharGeometria(parsed, 0);
}

function acharGeometria(node: unknown, depth: number): GeoJsonGeometry | null {
  if (depth > 3 || node == null || typeof node !== "object") return null;
  const obj = node as Record<string, unknown>;

  if (typeof obj.type === "string" && TIPOS_ACEITOS.has(obj.type)) {
    if (!Array.isArray(obj.coordinates)) return null;
    return { type: obj.type, coordinates: obj.coordinates } as GeoJsonGeometry;
  }
  if (obj.type === "Feature") {
    return acharGeometria(obj.geometry, depth + 1);
  }
  if (obj.type === "FeatureCollection" && Array.isArray(obj.features)) {
    for (const f of obj.features) {
      const g = acharGeometria(f, depth + 1);
      if (g) return g;
    }
  }
  return null;
}

/** Resumo curto pra UI ("Ponto −20.1234, −42.5678" / "Polígono (12 vértices)"). */
export function resumoGeometria(geojson: unknown): string | null {
  if (!geojson || typeof geojson !== "object") return null;
  const g = geojson as { type?: string; coordinates?: unknown };
  if (g.type === "Point" && Array.isArray(g.coordinates)) {
    const [lng, lat] = g.coordinates as number[];
    if (typeof lat === "number" && typeof lng === "number") {
      return `Ponto ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }
    return "Ponto";
  }
  if (g.type === "Polygon" && Array.isArray(g.coordinates)) {
    const anel = (g.coordinates as unknown[][])[0];
    return `Polígono${Array.isArray(anel) ? ` (${anel.length} vértices)` : ""}`;
  }
  if (g.type === "MultiPolygon") return "Multipolígono";
  return null;
}
