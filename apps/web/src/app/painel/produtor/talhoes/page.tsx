import { redirect } from "next/navigation";
import { CheckCircle2, Info, MapPin, MapPinOff } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { createClient } from "@milsaca/db/web/server";
import { getProfile } from "@/lib/auth";
import { resumoGeometria } from "@/lib/geo";
import { getProdutorByProfileId } from "../_lib/produtor";
import { criarTalhao, excluirTalhao } from "./_actions";
import { NovoTalhaoForm } from "./_components/novo-talhao-form";

export const metadata = { title: "Minha lavoura — Milsaca" };

type SearchParams = Promise<{ saved?: string; error?: string }>;

type TalhaoRow = {
  id: string;
  nome: string;
  area_ha: number | string | null;
  geojson: unknown | null;
  origem: string;
  created_at: string;
};

const ORIGEM_LABEL: Record<string, string> = {
  gps: "GPS na lavoura",
  mapa: "Marcado no mapa",
  arquivo: "Arquivo do CAR",
  manual: "Digitado",
};

export default async function TalhoesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const profile = await getProfile();
  if (!profile) redirect("/entrar");
  const produtor = await getProdutorByProfileId(profile.id);
  if (!produtor) redirect("/painel/produtor");
  const sp = await searchParams;

  const supabase = await createClient();
  const { data } = await supabase
    .from("talhoes")
    .select("id, nome, area_ha, geojson, origem, created_at")
    .eq("produtor_id", produtor.id)
    .order("created_at", { ascending: false });
  const talhoes = (data ?? []) as TalhaoRow[];
  const semGeo = talhoes.filter((t) => !t.geojson).length;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-h1 text-milsaca-cafezal">Minha lavoura</h1>
        <p className="mt-1 max-w-2xl text-body-sm text-neutral-600">
          Cadastre os talhões do seu café com a localização. Isso vai ser
          exigido para o café vendido à Europa a partir da safra 2026/2027 —
          quem já tem a localização registrada sai na frente.
        </p>
      </header>

      {sp.saved && (
        <div className="flex items-center gap-2 rounded-md border border-success-100 bg-success-50 px-4 py-2 text-sm text-success-700">
          <CheckCircle2 className="h-4 w-4" />
          {sp.saved}
        </div>
      )}
      {sp.error && (
        <div className="rounded-md border border-danger-100 bg-danger-50 px-4 py-2 text-sm text-danger-700">
          {sp.error}
        </div>
      )}

      <Card className="border-milsaca-cream-escuro">
        <CardHeader>
          <CardTitle className="text-base">Novo talhão</CardTitle>
          <CardDescription>
            Se estiver na lavoura agora, use o botão de localização — é o
            jeito mais fácil.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NovoTalhaoForm action={criarTalhao} />
        </CardContent>
      </Card>

      <Card className="border-milsaca-cream-escuro">
        <CardHeader>
          <CardTitle className="text-base">
            Meus talhões{" "}
            <span className="text-neutral-400">({talhoes.length})</span>
          </CardTitle>
          {semGeo > 0 && (
            <CardDescription className="text-warning-700">
              {semGeo} talhão(ões) ainda sem localização.
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {talhoes.length === 0 ? (
            <p className="py-6 text-center text-body-sm text-neutral-500">
              Nenhum talhão cadastrado ainda.
            </p>
          ) : (
            <ul className="divide-y divide-milsaca-cream-escuro">
              {talhoes.map((t) => {
                const resumo = resumoGeometria(t.geojson);
                return (
                  <li
                    key={t.id}
                    className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3"
                  >
                    {t.geojson ? (
                      <MapPin className="h-4 w-4 shrink-0 text-success-600" />
                    ) : (
                      <MapPinOff className="h-4 w-4 shrink-0 text-warning-500" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-body-sm font-medium text-milsaca-preto">
                        {t.nome}
                        {t.area_ha != null ? (
                          <span className="ml-2 text-caption text-neutral-500">
                            {Number(t.area_ha).toLocaleString("pt-BR")} ha
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-0.5 text-caption text-neutral-500">
                        {resumo ?? "Sem localização"} ·{" "}
                        {ORIGEM_LABEL[t.origem] ?? t.origem}
                      </p>
                    </div>
                    {t.geojson ? (
                      <Badge className="border-success-100 bg-success-50 text-success-700">
                        Localizado
                      </Badge>
                    ) : (
                      <Badge className="border-warning-100 bg-warning-50 text-warning-700">
                        Falta localização
                      </Badge>
                    )}
                    <form action={excluirTalhao}>
                      <input type="hidden" name="id" value={t.id} />
                      <ConfirmSubmit
                        variant="ghost"
                        size="sm"
                        confirmTitle="Remover talhão"
                        confirmMessage={
                          <>
                            Remover <strong>{t.nome}</strong>? Se ele estiver
                            vinculado a algum lote, o vínculo também some.
                          </>
                        }
                        confirmButtonLabel="Remover"
                        confirmButtonVariant="destructive"
                        pendingLabel="Removendo…"
                      >
                        Remover
                      </ConfirmSubmit>
                    </form>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="border-milsaca-cream-escuro bg-milsaca-cream-escuro/30">
        <CardContent className="flex items-start gap-3 py-4 text-body-sm text-milsaca-verde-claro">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Talhão até 4 hectares pode ser registrado só com um ponto (o botão
            de localização resolve). Acima disso, a Europa pede o desenho da
            área — use a opção &quot;Colar do CAR&quot; ou peça ajuda à sua
            corretora.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
