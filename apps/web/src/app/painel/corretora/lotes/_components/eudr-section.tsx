import {
  CheckCircle2,
  Download,
  FileText,
  Leaf,
  MapPin,
  MapPinOff,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  XCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/submit-button";
import { createClient } from "@milsaca/db/web/server";
import { resumoGeometria } from "@/lib/geo";
import {
  desvincularTalhao,
  verificarDesmatamentoLote,
  vincularTalhao,
} from "../_actions";

const CHECKLIST_LABEL: Record<string, string> = {
  produtor_cadastrado: "Produtor com cadastro completo",
  cpf_cnpj: "CPF/CNPJ do produtor informado",
  car_numero: "Número do CAR informado no perfil do produtor",
  car_documento: "Documento do CAR anexado (Documentos)",
  talhao_vinculado: "Pelo menos um talhão vinculado ao lote",
  talhoes_georreferenciados: "Todos os talhões vinculados com localização",
  safra: "Safra do lote informada",
};

type ChecklistItem = { key: string; ok: boolean };
type Checklist = { completo: boolean; itens: ChecklistItem[] };

type TalhaoLite = {
  id: string;
  nome: string;
  area_ha: number | string | null;
  geojson: unknown | null;
};

export type Verificacao = {
  talhao_id: string;
  status: string;
  alertas: unknown;
  verificado_em: string;
};

/** Última verificação de desmatamento de cada talhão (mapa talhao_id → row). */
async function loadUltimasVerificacoes(
  talhaoIds: string[],
): Promise<Map<string, Verificacao>> {
  const map = new Map<string, Verificacao>();
  if (talhaoIds.length === 0) return map;
  const supabase = await createClient();
  const { data } = await supabase
    .from("talhao_verificacoes")
    .select("talhao_id, status, alertas, verificado_em")
    .in("talhao_id", talhaoIds)
    .order("verificado_em", { ascending: false })
    .limit(talhaoIds.length * 5);
  for (const v of (data ?? []) as Verificacao[]) {
    if (!map.has(v.talhao_id)) map.set(v.talhao_id, v);
  }
  return map;
}

async function loadEudr(loteId: string, produtorProfileId: string) {
  const supabase = await createClient();

  const [checklistRes, vinculadosRes, produtorRes] = await Promise.all([
    supabase.rpc("eudr_checklist", { p_lote_id: loteId }),
    supabase
      .from("lote_talhoes")
      .select("talhao_id, talhoes(id, nome, area_ha, geojson)")
      .eq("lote_id", loteId),
    supabase
      .from("produtores")
      .select("id")
      .eq("profile_id", produtorProfileId)
      .maybeSingle(),
  ]);

  const vinculados = (vinculadosRes.data ?? [])
    .map((r) => r.talhoes as unknown as TalhaoLite | null)
    .filter((t): t is TalhaoLite => t != null);

  let disponiveis: TalhaoLite[] = [];
  if (produtorRes.data) {
    const { data } = await supabase
      .from("talhoes")
      .select("id, nome, area_ha, geojson")
      .eq("produtor_id", produtorRes.data.id)
      .order("nome");
    const vinculadosIds = new Set(vinculados.map((t) => t.id));
    disponiveis = ((data ?? []) as TalhaoLite[]).filter(
      (t) => !vinculadosIds.has(t.id),
    );
  }

  const checklist = (checklistRes.data ?? {
    completo: false,
    itens: [],
  }) as Checklist;

  return { checklist, vinculados, disponiveis };
}

/**
 * Seção "Conformidade EUDR" do detalhe do lote: checklist + vínculo de
 * talhões do produtor + export GeoJSON pro exportador (base do dossiê).
 */
export async function EudrSection({
  loteId,
  produtorProfileId,
}: {
  loteId: string;
  produtorProfileId: string;
}) {
  const { checklist, vinculados, disponiveis } = await loadEudr(
    loteId,
    produtorProfileId,
  );
  const temGeo = vinculados.some((t) => t.geojson != null);
  const verificacoes = await loadUltimasVerificacoes(
    vinculados.filter((t) => t.geojson != null).map((t) => t.id),
  );

  return (
    <Card className="border-milsaca-cream-escuro">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Leaf className="h-4 w-4 text-success-600" />
            Conformidade EUDR
          </CardTitle>
          {checklist.completo ? (
            <Badge className="border-success-100 bg-success-50 text-success-700">
              Pronto para a Europa
            </Badge>
          ) : (
            <Badge className="border-warning-100 bg-warning-50 text-warning-700">
              Pendências
            </Badge>
          )}
        </div>
        <CardDescription>
          Exigido para café exportado à União Europeia a partir de 30/12/2026:
          origem georreferenciada e documentação do produtor.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <ul className="space-y-1.5">
          {checklist.itens.map((item) => (
            <li
              key={item.key}
              className="flex items-center gap-2 text-body-sm"
            >
              {item.ok ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-success-600" />
              ) : (
                <XCircle className="h-4 w-4 shrink-0 text-danger-500" />
              )}
              <span className={item.ok ? "text-neutral-600" : "text-milsaca-preto"}>
                {CHECKLIST_LABEL[item.key] ?? item.key}
              </span>
            </li>
          ))}
        </ul>

        <div>
          <p className="text-label text-milsaca-preto">
            Talhões de origem ({vinculados.length})
          </p>
          {vinculados.length > 0 ? (
            <ul className="mt-2 divide-y divide-milsaca-cream-escuro">
              {vinculados.map((t) => (
                <li
                  key={t.id}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2"
                >
                  {t.geojson ? (
                    <MapPin className="h-4 w-4 shrink-0 text-success-600" />
                  ) : (
                    <MapPinOff className="h-4 w-4 shrink-0 text-warning-500" />
                  )}
                  <span className="min-w-0 flex-1 truncate text-body-sm text-milsaca-preto">
                    {t.nome}
                    {t.area_ha != null ? (
                      <span className="ml-2 text-caption text-neutral-500">
                        {Number(t.area_ha).toLocaleString("pt-BR")} ha
                      </span>
                    ) : null}
                    <span className="ml-2 text-caption text-neutral-500">
                      {resumoGeometria(t.geojson) ?? "sem localização"}
                    </span>
                  </span>
                  <form action={desvincularTalhao}>
                    <input type="hidden" name="lote_id" value={loteId} />
                    <input type="hidden" name="talhao_id" value={t.id} />
                    <SubmitButton variant="ghost" size="sm" pendingLabel="…">
                      Desvincular
                    </SubmitButton>
                  </form>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-body-sm text-neutral-500">
              Nenhum talhão vinculado — vincule abaixo os talhões de onde este
              café saiu.
            </p>
          )}
        </div>

        {disponiveis.length > 0 ? (
          <form action={vincularTalhao} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="lote_id" value={loteId} />
            <div className="min-w-56 flex-1 space-y-1.5">
              <label
                htmlFor={`eudr-talhao-${loteId}`}
                className="text-label text-milsaca-preto"
              >
                Vincular talhão do produtor
              </label>
              <Select
                id={`eudr-talhao-${loteId}`}
                name="talhao_id"
                defaultValue=""
                required
              >
                <option value="" disabled>
                  Selecione…
                </option>
                {disponiveis.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome}
                    {t.geojson ? "" : " (sem localização)"}
                  </option>
                ))}
              </Select>
            </div>
            <SubmitButton variant="primary" pendingLabel="Vinculando…">
              Vincular
            </SubmitButton>
          </form>
        ) : (
          <p className="text-body-sm text-neutral-500">
            {vinculados.length > 0
              ? "Todos os talhões do produtor já estão vinculados."
              : "O produtor ainda não tem talhões cadastrados — peça pra ele usar a página “Minha lavoura” no app, ou cadastre por ele em campo."}
          </p>
        )}

        {temGeo && (
          <div className="border-t border-milsaca-cream-escuro pt-4">
            <p className="text-label text-milsaca-preto">
              Análise de desmatamento (MapBiomas Alerta)
            </p>
            <p className="mt-0.5 text-caption text-neutral-500">
              Alertas públicos de desmatamento após 31/12/2020 (corte EUDR),
              conferidos contra a geometria de cada talhão.
            </p>
            <ul className="mt-2 space-y-1.5">
              {vinculados
                .filter((t) => t.geojson != null)
                .map((t) => {
                  const v = verificacoes.get(t.id);
                  const nAlertas = Array.isArray(v?.alertas)
                    ? v.alertas.length
                    : 0;
                  return (
                    <li
                      key={t.id}
                      className="flex items-center gap-2 text-body-sm"
                    >
                      {!v ? (
                        <ShieldQuestion className="h-4 w-4 shrink-0 text-neutral-400" />
                      ) : v.status === "sem_alerta" ? (
                        <ShieldCheck className="h-4 w-4 shrink-0 text-success-600" />
                      ) : v.status === "alerta_detectado" ? (
                        <ShieldAlert className="h-4 w-4 shrink-0 text-danger-500" />
                      ) : (
                        <ShieldQuestion className="h-4 w-4 shrink-0 text-warning-500" />
                      )}
                      <span className="min-w-0 flex-1 truncate text-neutral-600">
                        {t.nome}
                      </span>
                      {!v ? (
                        <span className="text-caption text-neutral-400">
                          nunca verificado
                        </span>
                      ) : v.status === "sem_alerta" ? (
                        <span className="text-caption text-success-700">
                          sem alerta ·{" "}
                          {new Date(v.verificado_em).toLocaleDateString("pt-BR")}
                        </span>
                      ) : v.status === "alerta_detectado" ? (
                        <span className="text-caption font-medium text-danger-700">
                          {nAlertas} alerta(s) ·{" "}
                          {new Date(v.verificado_em).toLocaleDateString("pt-BR")}
                        </span>
                      ) : (
                        <span className="text-caption text-warning-700">
                          erro na consulta
                        </span>
                      )}
                    </li>
                  );
                })}
            </ul>
            <form action={verificarDesmatamentoLote} className="mt-3">
              <input type="hidden" name="lote_id" value={loteId} />
              <SubmitButton variant="outline" pendingLabel="Consultando MapBiomas…">
                <ShieldCheck className="mr-2 h-4 w-4" />
                Verificar desmatamento agora
              </SubmitButton>
            </form>
          </div>
        )}

        {temGeo && (
          <div className="flex flex-wrap items-start gap-3 border-t border-milsaca-cream-escuro pt-4">
            <div>
              <Button asChild variant="primary">
                <a
                  href={`/painel/corretora/lotes/${loteId}/dossie-eudr`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Dossiê EUDR (PDF)
                </a>
              </Button>
              <p className="mt-1.5 text-caption text-neutral-500">
                Documento completo: produtor, talhões, checklist e hash do
                anexo.
              </p>
            </div>
            <div>
              <Button asChild variant="outline">
                <a href={`/painel/corretora/lotes/${loteId}/eudr`} download>
                  <Download className="mr-2 h-4 w-4" />
                  Exportar GeoJSON
                </a>
              </Button>
              <p className="mt-1.5 text-caption text-neutral-500">
                Versão de máquina para a due diligence (DDS/TRACES) do
                exportador.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
