import Link from "next/link";
import { redirect } from "next/navigation";
import { FlaskConical } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge, type StatusTone } from "@/components/status-badge";
import { getProfile } from "@/lib/auth";
import {
  loadMinhasAmostras,
  listLotesParaAmostra,
  listFavoritasParaAmostra,
  type MinhaAmostra,
} from "./_lib/queries";
import { agendarAmostra, cancelarAmostra } from "./_actions";

export const metadata = { title: "Amostras — Painel do produtor" };

const selectClass =
  "flex h-10 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-body-sm text-milsaca-cafezal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1";

const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function dataBR(iso: string | null): string {
  if (!iso) return "—";
  // date puro (YYYY-MM-DD) → evita deslocamento de fuso lendo só a parte da data.
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

const STATUS_META: Record<string, { tone: StatusTone; label: string }> = {
  agendada: { tone: "warning", label: "Agendada" },
  recebida: { tone: "info", label: "Recebida" },
  classificada: { tone: "success", label: "Classificada" },
  recusada: { tone: "danger", label: "Recusada" },
  cancelada: { tone: "neutral", label: "Cancelada" },
};

type SearchParams = Promise<{ ok?: string; error?: string }>;

export default async function AmostrasPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const profile = await getProfile();
  if (!profile) redirect("/entrar");

  const sp = await searchParams;

  const [amostras, lotes, favoritas] = await Promise.all([
    loadMinhasAmostras(profile.id),
    listLotesParaAmostra(profile.id),
    listFavoritasParaAmostra(profile.id),
  ]);

  // Agrupa por lote (mantendo a ordem mais-recente-primeiro do carregamento).
  const grupos = new Map<string, MinhaAmostra[]>();
  for (const a of amostras) {
    const chave = a.loteCodigo ?? "—";
    const arr = grupos.get(chave) ?? [];
    arr.push(a);
    grupos.set(chave, arr);
  }

  const semFavoritas = favoritas.length === 0;
  const semLotes = lotes.length === 0;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-h1 text-milsaca-cafezal">Amostras</h1>
        <p className="mt-1 text-body-sm text-neutral-600">
          Você leva uma amostra do seu café na corretora; ela analisa e te manda
          o laudo (bebida e tipo) junto com o preço que pagaria por saca.
        </p>
      </header>

      {sp.ok ? (
        <p className="rounded-md bg-success-50 px-3 py-2 text-body-sm text-success-700">
          {sp.ok}
        </p>
      ) : null}
      {sp.error ? (
        <p className="rounded-md bg-danger-50 px-3 py-2 text-body-sm text-danger-700">
          {sp.error}
        </p>
      ) : null}

      {/* Agendar entrega de amostra */}
      <Card>
        <CardContent className="p-card">
          <h2 className="text-h3 text-milsaca-cafezal">
            Agendar entrega de amostra
          </h2>

          {semFavoritas ? (
            <p className="mt-3 rounded-md bg-warning-50 px-3 py-2 text-body-sm text-warning-700">
              Favorite uma corretora primeiro pra poder agendar a entrega.{" "}
              <Link
                href="/painel/produtor/corretoras"
                className="font-medium text-milsaca-dourado-texto underline-offset-2 hover:underline"
              >
                Ver corretoras
              </Link>
            </p>
          ) : semLotes ? (
            <p className="mt-3 rounded-md bg-warning-50 px-3 py-2 text-body-sm text-warning-700">
              Registre um café primeiro pra escolher qual lote levar.{" "}
              <Link
                href="/painel/produtor/cafe/novo"
                className="font-medium text-milsaca-dourado-texto underline-offset-2 hover:underline"
              >
                Registrar café
              </Link>
            </p>
          ) : (
            <form action={agendarAmostra} className="mt-4 space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="lote_id">Lote *</Label>
                  <select
                    id="lote_id"
                    name="lote_id"
                    required
                    defaultValue=""
                    className={selectClass}
                  >
                    <option value="" disabled>
                      Escolha o lote
                    </option>
                    {lotes.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.codigo} ·{" "}
                        {l.specie === "conillon" ? "Conilón" : "Arábica"}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="corretora_id">Corretora *</Label>
                  <select
                    id="corretora_id"
                    name="corretora_id"
                    required
                    defaultValue=""
                    className={selectClass}
                  >
                    <option value="" disabled>
                      Escolha a corretora
                    </option>
                    {favoritas.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="data_entrega_prevista">
                    Quando vai entregar
                  </Label>
                  <Input
                    id="data_entrega_prevista"
                    name="data_entrega_prevista"
                    type="date"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mensagem">Mensagem pra corretora</Label>
                <textarea
                  id="mensagem"
                  name="mensagem"
                  rows={3}
                  className="flex w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-body-sm text-milsaca-cafezal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                  placeholder="Ex.: levo a amostra na quinta de manhã"
                />
              </div>

              <div className="flex justify-end">
                <Button type="submit" variant="primary">
                  Agendar amostra
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Lista de amostras agrupadas por lote */}
      {amostras.length === 0 ? (
        <Card tone="muted" className="border-dashed">
          <CardContent className="p-card">
            <EmptyState
              icon={FlaskConical}
              title="Você ainda não agendou amostras"
              description="Escolha um lote e uma corretora favorita pra agendar a entrega de uma amostra. Quando ela classificar, o laudo e o preço aparecem aqui."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {[...grupos.entries()].map(([loteCodigo, doLote]) => (
            <section key={loteCodigo} className="space-y-3">
              <h2 className="text-h3 text-milsaca-cafezal">
                Lote {loteCodigo}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {doLote.map((a) => (
                  <AmostraCard key={a.id} amostra={a} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function AmostraCard({ amostra: a }: { amostra: MinhaAmostra }) {
  const meta = STATUS_META[a.status] ?? { tone: "neutral", label: a.status };
  const podeCancelar = a.status === "agendada" || a.status === "recebida";

  return (
    <Card>
      <CardContent className="space-y-3 p-card">
        <div className="flex items-start justify-between gap-2">
          <p className="text-body font-medium text-milsaca-cafezal">
            {a.corretoraNome ?? "Corretora"}
          </p>
          <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
        </div>

        {a.status === "agendada" ? (
          <p className="text-body-sm text-neutral-600">
            {a.dataEntregaPrevista
              ? `Vai entregar em ${dataBR(a.dataEntregaPrevista)}.`
              : "Aguardando você levar a amostra na corretora."}
          </p>
        ) : null}

        {a.status === "recebida" ? (
          <p className="text-body-sm text-neutral-600">
            Corretora tem sua amostra · em análise.
          </p>
        ) : null}

        {a.status === "classificada" ? (
          <div className="space-y-1.5">
            <p className="text-body-sm text-neutral-700">
              {a.resultadoForaDeTipo
                ? "Laudo: Fora de tipo"
                : `Laudo: ${a.resultadoBebida ?? "—"}${
                    a.resultadoTipo ? ` · Tipo ${a.resultadoTipo}` : ""
                  }`}
            </p>
            {a.precoOferta != null ? (
              <p className="text-body-sm font-medium text-milsaca-cafezal">
                Pagaria {moeda.format(a.precoOferta)}/saca
              </p>
            ) : null}
            {a.laudoObservacoes ? (
              <p className="text-caption text-neutral-500">
                {a.laudoObservacoes}
              </p>
            ) : null}
          </div>
        ) : null}

        {a.status === "recusada" ? (
          <p className="text-body-sm text-danger-700">
            Recusada{a.motivoRecusa ? `: ${a.motivoRecusa}` : "."}
          </p>
        ) : null}

        {a.mensagem ? (
          <p className="text-caption text-neutral-500">“{a.mensagem}”</p>
        ) : null}

        {podeCancelar ? (
          <form action={cancelarAmostra} className="flex justify-end">
            <input type="hidden" name="id" value={a.id} />
            <Button type="submit" variant="outline" size="sm">
              Cancelar
            </Button>
          </form>
        ) : null}
      </CardContent>
    </Card>
  );
}
