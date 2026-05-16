import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import type { LaudoPublico } from "./queries";

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
  brandStack: { gap: 2 },
  brand: { fontSize: 18, fontWeight: 700, color: COLORS.verde },
  brandSub: { fontSize: 8, color: COLORS.verdeClaro },
  doc: { alignItems: "flex-end", gap: 2 },
  docTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: COLORS.verde,
  },
  docMeta: { fontSize: 8, color: COLORS.verdeClaro },

  section: { marginBottom: 14 },
  sectionTitle: {
    fontSize: 9,
    fontWeight: 700,
    color: COLORS.verde,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
  },

  rowGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  field: { minWidth: 110, marginBottom: 4 },
  fieldLabel: { fontSize: 7, color: COLORS.verdeClaro, textTransform: "uppercase", letterSpacing: 0.5 },
  fieldValue: { fontSize: 10, color: COLORS.text, fontWeight: 700 },

  tipoBox: {
    borderWidth: 1.5,
    borderColor: COLORS.verde,
    padding: 10,
    borderRadius: 4,
    backgroundColor: COLORS.cream,
    marginBottom: 12,
  },
  tipoBoxFora: {
    borderColor: COLORS.rose,
    backgroundColor: "#fdecef",
  },
  tipoLabel: { fontSize: 8, color: COLORS.verdeClaro, marginBottom: 2 },
  tipoValue: { fontSize: 20, fontWeight: 700, color: COLORS.verde },
  tipoValueFora: { color: COLORS.rose },
  foraMotivos: { marginTop: 4, fontSize: 8, color: COLORS.rose },

  table: {
    borderWidth: 1,
    borderColor: COLORS.creamEscuro,
    borderRadius: 2,
  },
  thead: {
    flexDirection: "row",
    backgroundColor: COLORS.creamEscuro,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.creamEscuro,
  },
  th: {
    flex: 1,
    fontSize: 7,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: COLORS.verdeClaro,
  },
  thRight: { textAlign: "right" },
  tr: {
    flexDirection: "row",
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.creamEscuro,
  },
  trLast: { borderBottomWidth: 0 },
  td: { flex: 1, fontSize: 9 },
  tdRight: { textAlign: "right" },

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
  qrBlock: { alignItems: "center", gap: 2 },
  qrImage: { width: 70, height: 70 },
  qrText: { fontSize: 6, color: COLORS.verdeClaro, maxWidth: 110, textAlign: "center" },
  footerMeta: { fontSize: 7, color: COLORS.verdeClaro, gap: 2, alignItems: "flex-end" },
  footerMetaLine: { fontSize: 7, color: COLORS.verdeClaro },
});

const SPECIE_LABEL: Record<string, string> = {
  arabica: "Arábica",
  conillon: "Conillón",
};

const PROCESSO_LABEL: Record<string, string> = {
  natural: "Natural",
  cereja_descascado: "Cereja descascado",
  cd_desmucilado: "CD desmucilado",
  despolpado: "Despolpado",
  fermentacao_induzida: "Fermentação induzida",
};

const DEFEITO_LABEL: Record<string, string> = {
  pretos: "Pretos",
  verdes: "Verdes",
  ardidos: "Ardidos",
  brocados: "Brocados",
  conchas: "Conchas",
  quebrados: "Quebrados",
  cocos: "Cocos",
  marinheiros: "Marinheiros",
  paus_pequenos: "Paus pequenos",
  paus_medios: "Paus médios",
  paus_grandes: "Paus grandes",
  pedras_pequenas: "Pedras pequenas",
  pedras_medias: "Pedras médias",
  pedras_grandes: "Pedras grandes",
  cascas_grandes: "Cascas grandes",
  cascas_pequenas: "Cascas pequenas",
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export type LaudoPdfProps = {
  laudo: LaudoPublico;
  qrDataUrl: string;
  publicUrl: string;
};

export function LaudoPdf({ laudo, qrDataUrl, publicUrl }: LaudoPdfProps) {
  const fora = laudo.fora_de_tipo;
  const defeitos = laudo.defeitos_crus
    ? Object.entries(laudo.defeitos_crus)
        .filter(([, v]) => typeof v === "number" && v > 0)
        .sort((a, b) => (b[1] as number) - (a[1] as number))
    : [];

  const peneirasTop = (laudo.peneiras ?? [])
    .filter((p) => p.percentual > 0)
    .sort((a, b) => b.percentual - a.percentual)
    .slice(0, 5);

  return (
    <Document
      title={`Laudo COB ${laudo.lote.codigo}`}
      author={laudo.corretora.name}
      subject={`Laudo de classificação IN 8/2003 — lote ${laudo.lote.codigo}`}
    >
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.brandStack}>
            <Text style={styles.brand}>{laudo.corretora.name}</Text>
            <Text style={styles.brandSub}>
              {[laudo.corretora.city, laudo.corretora.state]
                .filter(Boolean)
                .join(" / ")}
              {laudo.corretora.email ? ` · ${laudo.corretora.email}` : ""}
              {laudo.corretora.verified ? "  · Verificada na Milsaca" : ""}
            </Text>
          </View>
          <View style={styles.doc}>
            <Text style={styles.docTitle}>LAUDO DE CLASSIFICAÇÃO COB</Text>
            <Text style={styles.docMeta}>IN 8/2003 — MAPA</Text>
            <Text style={styles.docMeta}>Emitido em {formatDate(laudo.created_at)}</Text>
          </View>
        </View>

        {/* Tipo destacado */}
        <View style={[styles.tipoBox, fora ? styles.tipoBoxFora : {}]}>
          <Text style={styles.tipoLabel}>Resultado</Text>
          {fora ? (
            <>
              <Text style={[styles.tipoValue, styles.tipoValueFora]}>
                FORA DE TIPO
              </Text>
              {laudo.fora_de_tipo_motivos &&
                laudo.fora_de_tipo_motivos.length > 0 && (
                  <Text style={styles.foraMotivos}>
                    Motivos:{" "}
                    {laudo.fora_de_tipo_motivos.join(" · ")}
                  </Text>
                )}
            </>
          ) : (
            <Text style={styles.tipoValue}>
              {laudo.bica_corrida
                ? "Bica corrida"
                : `Tipo ${laudo.tipo ?? "—"}`}
              {laudo.classe ? ` · ${laudo.classe}` : ""}
            </Text>
          )}
        </View>

        {/* Dados do lote */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lote</Text>
          <View style={styles.rowGrid}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Código</Text>
              <Text style={styles.fieldValue}>{laudo.lote.codigo}</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Espécie</Text>
              <Text style={styles.fieldValue}>
                {SPECIE_LABEL[laudo.lote.specie] ?? laudo.lote.specie}
              </Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Processo</Text>
              <Text style={styles.fieldValue}>
                {laudo.lote.processo
                  ? (PROCESSO_LABEL[laudo.lote.processo] ?? laudo.lote.processo)
                  : "—"}
              </Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Safra</Text>
              <Text style={styles.fieldValue}>{laudo.lote.safra ?? "—"}</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Peso (sacas 60kg)</Text>
              <Text style={styles.fieldValue}>
                {laudo.lote.peso_sacas != null
                  ? laudo.lote.peso_sacas.toLocaleString("pt-BR")
                  : "—"}
              </Text>
            </View>
          </View>
        </View>

        {/* Indicadores da classificação */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Indicadores</Text>
          <View style={styles.rowGrid}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Total de defeitos</Text>
              <Text style={styles.fieldValue}>
                {laudo.total_defeitos}
                <Text style={{ fontSize: 8, fontWeight: 400 }}> em 300g</Text>
              </Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Pontuação</Text>
              <Text style={styles.fieldValue}>
                {laudo.pontuacao ?? "—"}
              </Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Bebida</Text>
              <Text style={styles.fieldValue}>{laudo.bebida ?? "—"}</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Aspecto</Text>
              <Text style={styles.fieldValue}>{laudo.aspecto ?? "—"}</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Torra</Text>
              <Text style={styles.fieldValue}>{laudo.torra ?? "—"}</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Umidade (%)</Text>
              <Text style={styles.fieldValue}>
                {laudo.umidade != null
                  ? laudo.umidade.toLocaleString("pt-BR", {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    })
                  : "—"}
              </Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Impurezas (%)</Text>
              <Text style={styles.fieldValue}>
                {laudo.impurezas_pct != null
                  ? laudo.impurezas_pct.toLocaleString("pt-BR", {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    })
                  : "—"}
              </Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>PVA (%)</Text>
              <Text style={styles.fieldValue}>
                {laudo.pva != null
                  ? laudo.pva.toLocaleString("pt-BR", {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    })
                  : "—"}
              </Text>
            </View>
          </View>
        </View>

        {/* Defeitos crus */}
        {defeitos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Defeitos contados ({laudo.brocados_por_defeito} brocados por defeito)
            </Text>
            <View style={styles.table}>
              <View style={styles.thead}>
                <Text style={styles.th}>Defeito</Text>
                <Text style={[styles.th, styles.thRight]}>Grãos</Text>
              </View>
              {defeitos.map(([k, v], i) => (
                <View
                  key={k}
                  style={[
                    styles.tr,
                    i === defeitos.length - 1 ? styles.trLast : {},
                  ]}
                >
                  <Text style={styles.td}>{DEFEITO_LABEL[k] ?? k}</Text>
                  <Text style={[styles.td, styles.tdRight]}>{String(v)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Peneiras */}
        {peneirasTop.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Peneiras{" "}
              {laudo.peneira_dominante
                ? `· Dominante: ${laudo.peneira_dominante}`
                : ""}
            </Text>
            <View style={styles.table}>
              <View style={styles.thead}>
                <Text style={styles.th}>Peneira</Text>
                <Text style={[styles.th, styles.thRight]}>%</Text>
              </View>
              {peneirasTop.map((p, i) => (
                <View
                  key={p.peneira}
                  style={[
                    styles.tr,
                    i === peneirasTop.length - 1 ? styles.trLast : {},
                  ]}
                >
                  <Text style={styles.td}>{p.peneira}</Text>
                  <Text style={[styles.td, styles.tdRight]}>
                    {p.percentual.toLocaleString("pt-BR", {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    })}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Observações */}
        {laudo.observacoes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Observações</Text>
            <Text style={{ fontSize: 9, lineHeight: 1.4 }}>
              {laudo.observacoes}
            </Text>
          </View>
        )}

        {/* Footer fixo: QR + meta */}
        <View style={styles.footer} fixed>
          <View style={styles.qrBlock}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- Image do @react-pdf não aceita alt */}
            <Image src={qrDataUrl} style={styles.qrImage} />
            <Text style={styles.qrText}>
              Verifique este laudo escaneando o QR ou acessando o link.
            </Text>
          </View>
          <View style={styles.footerMeta}>
            <Text style={styles.footerMetaLine}>
              Link público: {publicUrl}
            </Text>
            <Text style={styles.footerMetaLine}>
              Schema IN 8/2003 · v{laudo.schema_version}
            </Text>
            <Text style={styles.footerMetaLine}>
              Gerado pela Milsaca · milsaca.app
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
