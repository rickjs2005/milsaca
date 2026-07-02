// Template do PDF do Dossiê EUDR (F2) — mesmo visual do laudo COB
// (apps/web/src/app/laudos/_lib/pdf-template.tsx): Helvetica, paleta
// Milsaca, header com QR. O QR aponta pra página PÚBLICA do lote (sem
// PII); os dados sensíveis (CPF, CAR, coordenadas) vivem só no PDF, que
// circula corretora → exportador.

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import type { EudrData, EudrTalhao } from "./eudr-export";

const COLORS = {
  verde: "#2D3A2E",
  verdeClaro: "#4A5C4C",
  dourado: "#C9A961",
  cream: "#FAF7F0",
  creamEscuro: "#EFEADB",
  rose: "#be123c",
  emerald: "#047857",
  text: "#1a1a1a",
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 60,
    paddingHorizontal: 40,
    fontSize: 9,
    color: COLORS.text,
    fontFamily: "Helvetica",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 18,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.verde,
    paddingBottom: 12,
  },
  brand: { fontSize: 18, fontWeight: 700, color: COLORS.verde },
  brandSub: { fontSize: 8, color: COLORS.verdeClaro },
  doc: { alignItems: "flex-end", gap: 2 },
  docTitle: { fontSize: 10, fontWeight: 700, color: COLORS.verde },
  docMeta: { fontSize: 8, color: COLORS.verdeClaro },

  regBox: {
    borderWidth: 1.5,
    borderColor: COLORS.verde,
    backgroundColor: COLORS.cream,
    borderRadius: 4,
    padding: 10,
    marginBottom: 14,
  },
  regTitle: { fontSize: 10, fontWeight: 700, color: COLORS.verde, marginBottom: 3 },
  regText: { fontSize: 8, color: COLORS.verdeClaro, lineHeight: 1.5 },

  section: { marginBottom: 14 },
  sectionTitle: {
    fontSize: 9,
    fontWeight: 700,
    color: COLORS.verde,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
  },
  rowGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  field: { minWidth: 110, marginBottom: 4 },
  fieldLabel: {
    fontSize: 7,
    color: COLORS.verdeClaro,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  fieldValue: { fontSize: 10, color: COLORS.text, fontWeight: 700 },

  table: { borderWidth: 1, borderColor: COLORS.creamEscuro, borderRadius: 2 },
  thead: {
    flexDirection: "row",
    backgroundColor: COLORS.creamEscuro,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  th: {
    flex: 1,
    fontSize: 7,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: COLORS.verdeClaro,
  },
  tr: {
    flexDirection: "row",
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.creamEscuro,
  },
  td: { flex: 1, fontSize: 9 },

  checkRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 3 },
  checkOk: { fontSize: 9, color: COLORS.emerald, fontWeight: 700 },
  checkFail: { fontSize: 9, color: COLORS.rose, fontWeight: 700 },
  checkLabel: { fontSize: 9, color: COLORS.text },

  hashBox: {
    backgroundColor: COLORS.creamEscuro,
    borderRadius: 3,
    padding: 8,
    marginTop: 4,
  },
  hashLabel: { fontSize: 7, color: COLORS.verdeClaro, textTransform: "uppercase" },
  hashValue: { fontSize: 7, fontFamily: "Courier", color: COLORS.text },

  footer: {
    position: "absolute",
    left: 40,
    right: 40,
    bottom: 30,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderTopWidth: 1,
    borderTopColor: COLORS.creamEscuro,
    paddingTop: 10,
  },
  footerText: { fontSize: 7, color: COLORS.verdeClaro },
});

const SPECIE_LABEL: Record<string, string> = {
  arabica: "Arábica",
  conillon: "Conillón",
};

const ORIGEM_LABEL: Record<string, string> = {
  gps: "GPS em campo",
  mapa: "Marcado no mapa",
  arquivo: "Arquivo (CAR/agrônomo)",
  manual: "Digitado",
};

function geoResumo(t: EudrTalhao): { tipo: string; coords: string } {
  const g = t.geojson as { type?: string; coordinates?: unknown } | null;
  if (!g?.type) return { tipo: "—", coords: "sem localização" };
  if (g.type === "Point" && Array.isArray(g.coordinates)) {
    const [lng, lat] = g.coordinates as number[];
    return { tipo: "Ponto", coords: `${lat?.toFixed(6)}, ${lng?.toFixed(6)}` };
  }
  if (g.type === "Polygon" && Array.isArray(g.coordinates)) {
    const anel = (g.coordinates as number[][][])[0] ?? [];
    const c = centroide(anel);
    return {
      tipo: `Polígono (${anel.length} vértices)`,
      coords: c ? `centro ~${c[1].toFixed(5)}, ${c[0].toFixed(5)}` : "—",
    };
  }
  if (g.type === "MultiPolygon" && Array.isArray(g.coordinates)) {
    const partes = (g.coordinates as number[][][][]).length;
    return { tipo: `Multipolígono (${partes} áreas)`, coords: "ver GeoJSON anexo" };
  }
  return { tipo: g.type, coords: "ver GeoJSON anexo" };
}

// Média simples dos vértices — aproximação suficiente pra referência visual.
function centroide(anel: number[][]): [number, number] | null {
  const pontos = anel.filter(
    (p) => typeof p[0] === "number" && typeof p[1] === "number",
  );
  if (pontos.length === 0) return null;
  let sx = 0;
  let sy = 0;
  for (const p of pontos) {
    sx += p[0] as number;
    sy += p[1] as number;
  }
  return [sx / pontos.length, sy / pontos.length];
}

export type ChecklistItemPdf = { key: string; ok: boolean; label: string };

export function DossieEudrPdf({
  data,
  checklist,
  geojsonHash,
  qrDataUrl,
  publicUrl,
  emitidoEm,
}: {
  data: EudrData;
  checklist: ChecklistItemPdf[];
  geojsonHash: string;
  qrDataUrl: string;
  publicUrl: string;
  emitidoEm: string;
}) {
  const { lote, produtor, produtorNome, corretoraNome, talhoes } = data;
  const areaTotal = talhoes.reduce((acc, t) => acc + (t.area_ha ?? 0), 0);

  return (
    <Document
      title={`Dossiê EUDR — Lote ${lote.codigo}`}
      author="Milsaca"
      subject="Dossiê de rastreabilidade EUDR (Regulamento UE 2023/1115)"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>Milsaca</Text>
            <Text style={styles.brandSub}>
              Plataforma de corretagem e rastreabilidade de café
            </Text>
          </View>
          <View style={styles.doc}>
            <Text style={styles.docTitle}>DOSSIÊ DE RASTREABILIDADE — EUDR</Text>
            <Text style={styles.docMeta}>Lote {lote.codigo}</Text>
            <Text style={styles.docMeta}>Emitido em {emitidoEm}</Text>
          </View>
        </View>

        <View style={styles.regBox}>
          <Text style={styles.regTitle}>
            Regulamento (UE) 2023/1115 — produtos livres de desmatamento
          </Text>
          <Text style={styles.regText}>
            Este dossiê consolida a identificação do produtor e a
            geolocalização dos talhões de origem do lote, na forma exigida
            para a due diligence (DDS) do operador que colocar o produto no
            mercado da União Europeia. Data de corte do regulamento:
            31/12/2020. O arquivo GeoJSON anexo (hash abaixo) é a versão de
            máquina desta mesma informação.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Produtor</Text>
          <View style={styles.rowGrid}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Nome</Text>
              <Text style={styles.fieldValue}>{produtorNome ?? "—"}</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>CPF/CNPJ</Text>
              <Text style={styles.fieldValue}>{produtor?.cpf_cnpj ?? "—"}</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>CAR</Text>
              <Text style={styles.fieldValue}>{produtor?.car ?? "—"}</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Fazenda</Text>
              <Text style={styles.fieldValue}>
                {produtor?.fazenda_nome ?? "—"}
              </Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Município/UF</Text>
              <Text style={styles.fieldValue}>
                {produtor?.city
                  ? `${produtor.city}/${produtor.state ?? ""}`
                  : "—"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lote</Text>
          <View style={styles.rowGrid}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Código</Text>
              <Text style={styles.fieldValue}>{lote.codigo}</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Safra</Text>
              <Text style={styles.fieldValue}>{lote.safra ?? "—"}</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Espécie</Text>
              <Text style={styles.fieldValue}>
                {SPECIE_LABEL[lote.specie] ?? lote.specie}
              </Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Sacas (60kg)</Text>
              <Text style={styles.fieldValue}>
                {lote.peso_sacas != null
                  ? lote.peso_sacas.toLocaleString("pt-BR")
                  : "—"}
              </Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Corretora</Text>
              <Text style={styles.fieldValue}>{corretoraNome || "—"}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Talhões de origem ({talhoes.length}
            {areaTotal > 0
              ? ` — ${areaTotal.toLocaleString("pt-BR")} ha`
              : ""}
            )
          </Text>
          <View style={styles.table}>
            <View style={styles.thead}>
              <Text style={[styles.th, { flex: 1.4 }]}>Talhão</Text>
              <Text style={styles.th}>Área (ha)</Text>
              <Text style={[styles.th, { flex: 1.4 }]}>Geometria</Text>
              <Text style={[styles.th, { flex: 1.6 }]}>Coordenadas (lat, lng)</Text>
              <Text style={styles.th}>Captura</Text>
            </View>
            {talhoes.map((t) => {
              const g = geoResumo(t);
              return (
                <View key={t.id} style={styles.tr}>
                  <Text style={[styles.td, { flex: 1.4 }]}>{t.nome}</Text>
                  <Text style={styles.td}>
                    {t.area_ha != null
                      ? t.area_ha.toLocaleString("pt-BR")
                      : "—"}
                  </Text>
                  <Text style={[styles.td, { flex: 1.4 }]}>{g.tipo}</Text>
                  <Text style={[styles.td, { flex: 1.6 }]}>{g.coords}</Text>
                  <Text style={styles.td}>
                    {ORIGEM_LABEL[t.origem] ?? t.origem}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Checklist de conformidade</Text>
          {checklist.map((item) => (
            <View key={item.key} style={styles.checkRow}>
              <Text style={item.ok ? styles.checkOk : styles.checkFail}>
                {item.ok ? "[ok]" : "[pendente]"}
              </Text>
              <Text style={styles.checkLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Integridade do anexo GeoJSON</Text>
          <Text style={styles.regText}>
            O arquivo lote-{lote.codigo}-eudr.geojson exportado pela
            plataforma corresponde a este dossiê quando seu SHA-256 for:
          </Text>
          <View style={styles.hashBox}>
            <Text style={styles.hashLabel}>SHA-256</Text>
            <Text style={styles.hashValue}>{geojsonHash}</Text>
          </View>
        </View>

        <View style={styles.footer} fixed>
          <View>
            <Text style={styles.footerText}>
              Documento gerado pela plataforma Milsaca — {publicUrl}
            </Text>
            <Text style={styles.footerText}>
              Contém dados pessoais (LGPD): uso restrito à cadeia de
              comercialização e due diligence do lote.
            </Text>
          </View>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image não tem alt */}
          <Image src={qrDataUrl} style={{ width: 56, height: 56 }} />
        </View>
      </Page>
    </Document>
  );
}
