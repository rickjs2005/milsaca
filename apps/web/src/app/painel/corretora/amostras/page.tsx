import { redirect } from "next/navigation";
import { CheckCircle2, FlaskConical, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatusBadge, type StatusTone } from "@/components/status-badge";
import { getProfile } from "@/lib/auth";
import {
  loadAmostrasCorretora,
  type AmostraCorretora,
  type AmostraStatus,
} from "./_lib/queries";
import { enviarLaudo, marcarRecebida, recusarAmostra } from "./_actions";

export const metadata = { title: "Amostras — Painel da corretora" };

type SearchParams = Promise<{ ok?: string; error?: string }>;

const SPECIE_LABEL: Record<"arabica" | "conillon", string> = {
  arabica: "Arábica",
  conillon: "Conillón",
};

const STATUS_META: Record<
  AmostraStatus,
  { tone: StatusTone; label: string }
> = {
  agendada: { tone: "warning", label: "Agendada" },
  recebida: { tone: "info", label: "Recebida" },
  classificada: { tone: "success", label: "Classificada" },
  recusada: { tone: "danger", label: "Recusada" },
  cancelada: { tone: "neutral", label: "Cancelada" },
};

const moneyBRL = (n: number) =>
  n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });

function fmtDate(iso: string | null): string | null {
  if (!iso) return null;
  // date puro (YYYY-MM-DD) — evita timezone shift do new Date.
  const [y, m, d] = iso.slice(0, 10).split("-");
  return d && m && y ? `${d}/${m}/${y}` : iso;
}

function cafeLabel(a: AmostraCorretora): string {
  const partes: string[] = [];
  if (a.loteCodigo) partes.push(a.loteCodigo);
  if (a.loteSpecie) partes.push(SPECIE_LABEL[a.loteSpecie]);
  if (a.lotePesoSacas != null) {
    partes.push(`${a.lotePesoSacas.toLocaleString("pt-BR")} sacas`);
  }
  return partes.join(" · ") || "Café não identificado";
}

export default async function AmostrasPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const profile = await getProfile();
  if (!profile?.corretora_id) {
    redirect("/painel/escolher?error=Sem%20corretora%20vinculada");
  }

  const sp = await searchParams;
  const amostras = await loadAmostrasCorretora(profile.corretora_id);
  const aguardando = amostras.filter(
    (a) => a.status === "agendada" || a.status === "recebida",
  );
  const concluidas = amostras.filter(
    (a) =>
      a.status === "classificada" ||
      a.status === "recusada" ||
      a.status === "cancelada",
  );

  return (
    <div className="space-y-6">
      <header className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-card bg-milsaca-cafezal/10 text-milsaca-cafezal">
          <FlaskConical className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-h1 text-milsaca-verde">Amostras</h1>
          <p className="text-body-sm text-milsaca-verde-claro">
            O produtor agenda a entrega de uma amostra física. Marque como
            recebida, analise e devolva o laudo com o preço que pagaria — ou
            recuse com o motivo.
          </p>
        </div>
      </header>

      {sp.ok ? (
        <p className="rounded-card border border-success-100 bg-success-50 px-4 py-3 text-body-sm text-success-700">
          {sp.ok}
        </p>
      ) : null}
      {sp.error ? (
        <p className="rounded-card border border-danger-100 bg-danger-50 px-4 py-3 text-body-sm text-danger-700">
          {sp.error}
        </p>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-h3 text-milsaca-verde">
          Aguardando{" "}
          <span className="text-body-sm font-normal text-milsaca-verde-claro">
            ({aguardando.length})
          </span>
        </h2>
        {aguardando.length === 0 ? (
          <EmptyState texto="Nenhuma amostra aguardando análise no momento." />
        ) : (
          <div className="grid gap-4">
            {aguardando.map((a) => (
              <AmostraCard key={a.id} amostra={a} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-h3 text-milsaca-verde">
          Concluídas{" "}
          <span className="text-body-sm font-normal text-milsaca-verde-claro">
            ({concluidas.length})
          </span>
        </h2>
        {concluidas.length === 0 ? (
          <EmptyState texto="Ainda não há amostras com laudo ou recusadas." />
        ) : (
          <div className="grid gap-4">
            {concluidas.map((a) => (
              <AmostraCard key={a.id} amostra={a} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function EmptyState({ texto }: { texto: string }) {
  return (
    <Card className="border-dashed border-milsaca-cream-escuro bg-transparent">
      <CardContent className="py-8 text-center text-body-sm text-milsaca-verde-claro">
        {texto}
      </CardContent>
    </Card>
  );
}

function AmostraCard({ amostra }: { amostra: AmostraCorretora }) {
  const meta = STATUS_META[amostra.status];
  return (
    <Card className="border-milsaca-cream-escuro">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-base text-milsaca-verde">
            {amostra.produtorNome}
          </CardTitle>
          <CardDescription className="text-milsaca-verde-claro">
            {cafeLabel(amostra)}
          </CardDescription>
        </div>
        <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
      </CardHeader>
      <CardContent className="space-y-4 text-body-sm">
        <dl className="grid gap-1.5 sm:grid-cols-2">
          {amostra.dataEntregaPrevista ? (
            <Info label="Entrega prevista" value={fmtDate(amostra.dataEntregaPrevista)} />
          ) : null}
          {amostra.dataRecebida ? (
            <Info label="Recebida em" value={fmtDate(amostra.dataRecebida)} />
          ) : null}
          {amostra.dataResultado ? (
            <Info label="Laudo em" value={fmtDate(amostra.dataResultado)} />
          ) : null}
        </dl>

        {amostra.mensagem ? (
          <p className="rounded-md bg-milsaca-cream px-3 py-2 text-milsaca-verde-claro">
            <span className="font-medium text-milsaca-verde">Mensagem do produtor: </span>
            {amostra.mensagem}
          </p>
        ) : null}

        {/* ── Ações conforme o status ───────────────────────────────────── */}
        {amostra.status === "agendada" ? (
          <div className="space-y-3 border-t border-milsaca-cream-escuro pt-4">
            <form action={marcarRecebida}>
              <input type="hidden" name="id" value={amostra.id} />
              <Button type="submit" variant="primary" size="sm">
                <CheckCircle2 className="h-4 w-4" />
                Marcar como recebida
              </Button>
            </form>
            <RecusarForm id={amostra.id} />
          </div>
        ) : null}

        {amostra.status === "recebida" ? (
          <div className="space-y-4 border-t border-milsaca-cream-escuro pt-4">
            <LaudoForm id={amostra.id} pesoSacas={amostra.lotePesoSacas} />
            <RecusarForm id={amostra.id} />
          </div>
        ) : null}

        {amostra.status === "classificada" ? (
          <div className="space-y-1.5 border-t border-milsaca-cream-escuro pt-4">
            <Info
              label="Bebida"
              value={amostra.resultadoBebida ?? "—"}
            />
            <Info
              label="Tipo"
              value={
                amostra.resultadoForaDeTipo
                  ? "Fora de tipo"
                  : (amostra.resultadoTipo ?? "—")
              }
            />
            <Info
              label="Preço ofertado"
              value={
                amostra.precoOferta != null
                  ? `${moneyBRL(amostra.precoOferta)}/saca`
                  : "—"
              }
            />
            {amostra.laudoObservacoes ? (
              <p className="pt-1 text-milsaca-verde-claro">
                <span className="font-medium text-milsaca-verde">Observações: </span>
                {amostra.laudoObservacoes}
              </p>
            ) : null}
          </div>
        ) : null}

        {amostra.status === "recusada" ? (
          <div className="border-t border-milsaca-cream-escuro pt-4">
            <p className="rounded-md bg-danger-50 px-3 py-2 text-danger-700">
              <span className="font-medium">Recusada: </span>
              {amostra.motivoRecusa ?? "Sem motivo informado."}
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Info({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-center justify-between gap-3 sm:justify-start sm:gap-2">
      <dt className="text-milsaca-verde-claro">{label}:</dt>
      <dd className="font-medium text-milsaca-verde">{value ?? "—"}</dd>
    </div>
  );
}

function LaudoForm({
  id,
  pesoSacas,
}: {
  id: string;
  pesoSacas: number | null;
}) {
  return (
    <form action={enviarLaudo} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <p className="text-label font-semibold text-milsaca-verde">
        Enviar laudo ao produtor
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor={`bebida-${id}`}>Bebida</Label>
          <Input
            id={`bebida-${id}`}
            name="resultado_bebida"
            placeholder="Ex.: Dura, Mole, Riada"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`tipo-${id}`}>Tipo</Label>
          <Input
            id={`tipo-${id}`}
            name="resultado_tipo"
            placeholder="Ex.: 6, 7/8"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`preco-${id}`}>Preço (R$/saca)</Label>
          <Input
            id={`preco-${id}`}
            name="preco_oferta"
            inputMode="decimal"
            placeholder="Ex.: 1.250,00"
          />
          {pesoSacas != null ? (
            <p className="text-caption text-milsaca-verde-claro">
              Lote de {pesoSacas.toLocaleString("pt-BR")} sacas.
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2 pt-6">
          <input
            id={`fdt-${id}`}
            type="checkbox"
            name="resultado_fora_de_tipo"
            value="true"
            className="h-4 w-4 rounded border-neutral-300 text-milsaca-cafezal focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Label htmlFor={`fdt-${id}`} className="cursor-pointer">
            Fora de tipo
          </Label>
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor={`obs-${id}`}>Observações</Label>
        <textarea
          id={`obs-${id}`}
          name="laudo_observacoes"
          rows={2}
          className="flex w-full rounded-md border border-neutral-200 bg-background px-3 py-2 text-body-sm text-neutral-900 placeholder:text-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          placeholder="Notas do laudo (opcional)"
        />
      </div>
      <Button type="submit" variant="primary" size="sm">
        <CheckCircle2 className="h-4 w-4" />
        Enviar laudo
      </Button>
    </form>
  );
}

function RecusarForm({ id }: { id: string }) {
  return (
    <details className="group">
      <summary className="inline-flex cursor-pointer items-center gap-2 text-body-sm font-medium text-danger-700 hover:text-danger-600">
        <XCircle className="h-4 w-4" />
        Recusar amostra
      </summary>
      <form action={recusarAmostra} className="mt-3 space-y-2">
        <input type="hidden" name="id" value={id} />
        <div className="space-y-1">
          <Label htmlFor={`motivo-${id}`}>Motivo da recusa</Label>
          <textarea
            id={`motivo-${id}`}
            name="motivo_recusa"
            rows={2}
            required
            className="flex w-full rounded-md border border-neutral-200 bg-background px-3 py-2 text-body-sm text-neutral-900 placeholder:text-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            placeholder="Ex.: Amostra com umidade fora do padrão para análise."
          />
        </div>
        <Button type="submit" variant="danger" size="sm">
          Confirmar recusa
        </Button>
      </form>
    </details>
  );
}
