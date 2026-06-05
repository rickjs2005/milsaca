import Link from "next/link";
import { CalendarDays, Truck, Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { getProfile } from "@/lib/auth";
import { fmtDate } from "@/lib/format";
import { loadAgenda, type AgendaItem } from "./_lib/queries";

export const metadata = { title: "Agenda — Painel da corretora" };

export default async function AgendaPage() {
  const profile = await getProfile();
  const corretoraId = profile?.corretora_id ?? "";
  const agenda = await loadAgenda(corretoraId);

  const total =
    agenda.hoje.length + agenda.amanha.length + agenda.semana.length;

  return (
    <div className="space-y-section">
      <header>
        <h1 className="flex items-center gap-2 text-h1 tracking-tight text-milsaca-cafezal">
          <CalendarDays className="h-6 w-6 text-milsaca-cafezal/70" />
          Agenda comercial
        </h1>
        <p className="mt-1 text-body-sm text-neutral-600">
          Entregas previstas e vencimentos de repasse nos próximos dias.
        </p>
      </header>

      {total === 0 ? (
        <Card tone="muted">
          <CardContent className="py-12 text-center">
            <p className="text-body font-medium text-milsaca-cafezal">
              Nada marcado pros próximos dias.
            </p>
            <p className="mx-auto mt-1 max-w-sm text-body-sm text-neutral-600">
              Entregas e repasses com data aparecem aqui conforme você fecha
              negócios.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-section">
          <Balde titulo="Hoje" itens={agenda.hoje} />
          <Balde titulo="Amanhã" itens={agenda.amanha} />
          <Balde titulo="Esta semana" itens={agenda.semana} />
        </div>
      )}
    </div>
  );
}

function Balde({ titulo, itens }: { titulo: string; itens: AgendaItem[] }) {
  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-label font-semibold uppercase tracking-wider text-neutral-600">
        {titulo}
        <span className="rounded-pill bg-neutral-100 px-2 py-0.5 text-caption font-semibold text-neutral-600">
          {itens.length}
        </span>
      </h2>
      {itens.length === 0 ? (
        <p className="rounded-card border border-dashed border-neutral-200 bg-milsaca-cream/30 px-card py-4 text-center text-caption text-neutral-500">
          Nada marcado.
        </p>
      ) : (
        <Card>
          <CardContent className="divide-y divide-neutral-200 p-0">
            {itens.map((it) => (
              <ItemRow key={`${it.tipo}-${it.id}`} item={it} />
            ))}
          </CardContent>
        </Card>
      )}
    </section>
  );
}

function ItemRow({ item }: { item: AgendaItem }) {
  const Icon = item.tipo === "entrega" ? Truck : Wallet;
  return (
    <Link
      href={item.href}
      className="flex items-center gap-3 px-card py-3.5 transition-colors hover:bg-milsaca-cream first:rounded-t-card last:rounded-b-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-milsaca-cafezal/10 text-milsaca-cafezal">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-body-sm font-semibold text-milsaca-cafezal">
          {item.titulo}
        </p>
        <p className="mt-0.5 truncate text-caption text-neutral-600">
          {item.sub}
        </p>
      </div>
      <div className="shrink-0 text-right">
        {item.atrasado ? (
          <StatusBadge tone="danger">Atrasado</StatusBadge>
        ) : (
          <span className="text-caption font-medium text-neutral-600">
            {fmtDate(item.data)}
          </span>
        )}
      </div>
    </Link>
  );
}
