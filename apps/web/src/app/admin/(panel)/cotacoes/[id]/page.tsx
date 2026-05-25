import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAppAdmin } from "@/lib/auth";
import { createClient } from "@milsaca/db/web/server";
import { PageHeader } from "@/components/page-header";
import { StatusBadge, type StatusTone } from "@/components/status-badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { updateCotacaoAdmin, deleteCotacaoAdmin } from "../_actions";

export const metadata = { title: "Editar cotação · Admin Milsaca" };

const STATUS_TONE: Record<string, StatusTone> = {
  active: "success",
  stale: "warning",
  error: "danger",
  hidden: "neutral",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Ativa",
  stale: "Desatualizada",
  error: "Erro",
  hidden: "Oculta",
};

export default async function EditCotacaoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAppAdmin();
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: row }, { data: corretoras }, { data: produtos }, { data: pracas }, { data: fontes }] =
    await Promise.all([
      supabase
        .from("cotacoes")
        .select(
          "id, corretora_id, product_id, region_id, source_id, coffee_type, specie, process, region, source, reference_date, price, currency, unit, valid_until, status",
        )
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("corretoras")
        .select("id, name, city, state")
        .order("name", { ascending: true })
        .limit(500),
      supabase
        .from("coffee_types")
        .select("id, name")
        .eq("active", true)
        .order("species", { ascending: true })
        .order("name", { ascending: true }),
      supabase
        .from("pracas")
        .select("id, name, state, region_group")
        .eq("active", true)
        .order("state", { ascending: true })
        .order("name", { ascending: true }),
      supabase
        .from("quote_sources")
        .select("id, slug, name, type")
        .in("type", ["admin_manual", "broker_manual"])
        .eq("active", true)
        .order("name", { ascending: true }),
    ]);

  if (!row) notFound();

  const corretorasList =
    (corretoras ?? []) as {
      id: string;
      name: string;
      city: string | null;
      state: string | null;
    }[];
  const produtosList = (produtos ?? []) as { id: string; name: string }[];
  const pracasList =
    (pracas ?? []) as {
      id: string;
      name: string;
      state: string;
      region_group: string | null;
    }[];
  const fontesList = (fontes ?? []) as { id: string; slug: string; name: string }[];

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="Compliance · Cotações"
        title={`Editar cotação · ${row.coffee_type}`}
        description={`Atualize qualquer campo. Mudança propaga pro painel da corretora e do produtor em segundos.`}
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Cotações", href: "/admin/cotacoes" },
          { label: "Editar" },
        ]}
        actions={
          <StatusBadge tone={STATUS_TONE[row.status] ?? "neutral"}>
            {STATUS_LABEL[row.status] ?? row.status}
          </StatusBadge>
        }
      />

      <form
        action={updateCotacaoAdmin}
        className="grid gap-5 rounded-card border border-slate-200 bg-white p-6 shadow-card sm:grid-cols-2"
      >
        <input type="hidden" name="id" value={row.id} />

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="corretora_id">Corretora *</Label>
          <select
            id="corretora_id"
            name="corretora_id"
            required
            defaultValue={row.corretora_id}
            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-milsaca-dourado focus:outline-none focus:ring-2 focus:ring-milsaca-dourado/30"
          >
            {corretorasList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.city || c.state
                  ? ` — ${[c.city, c.state].filter(Boolean).join(" / ")}`
                  : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="product_id">Tipo de café</Label>
          <select
            id="product_id"
            name="product_id"
            defaultValue={row.product_id ?? ""}
            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-milsaca-dourado focus:outline-none focus:ring-2 focus:ring-milsaca-dourado/30"
          >
            <option value="">— (manter texto antigo)</option>
            {produtosList.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="region_id">Praça</Label>
          <select
            id="region_id"
            name="region_id"
            defaultValue={row.region_id ?? ""}
            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-milsaca-dourado focus:outline-none focus:ring-2 focus:ring-milsaca-dourado/30"
          >
            <option value="">— (sem praça)</option>
            {pracasList.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}/{p.state}
                {p.region_group ? ` · ${p.region_group}` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="reference_date">Data de referência *</Label>
          <Input
            id="reference_date"
            name="reference_date"
            type="date"
            required
            defaultValue={row.reference_date}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="valid_until">Válido até</Label>
          <Input
            id="valid_until"
            name="valid_until"
            type="date"
            defaultValue={row.valid_until ? row.valid_until.slice(0, 10) : ""}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="price">Preço *</Label>
          <Input
            id="price"
            name="price"
            type="text"
            inputMode="decimal"
            required
            defaultValue={String(row.price).replace(".", ",")}
          />
        </div>

        <div className="grid grid-cols-2 gap-2 sm:col-span-1">
          <div className="space-y-2">
            <Label htmlFor="currency">Moeda</Label>
            <select
              id="currency"
              name="currency"
              defaultValue={row.currency ?? "BRL"}
              className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-milsaca-dourado focus:outline-none focus:ring-2 focus:ring-milsaca-dourado/30"
            >
              <option value="BRL">BRL</option>
              <option value="USD">USD</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="unit">Unidade</Label>
            <select
              id="unit"
              name="unit"
              defaultValue={row.unit ?? "saca_60kg"}
              className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-milsaca-dourado focus:outline-none focus:ring-2 focus:ring-milsaca-dourado/30"
            >
              <option value="saca_60kg">Saca 60kg</option>
              <option value="kg">kg</option>
              <option value="arroba">Arroba</option>
              <option value="libra">Libra</option>
              <option value="tonelada">Tonelada</option>
            </select>
          </div>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="source_id">Fonte</Label>
          <select
            id="source_id"
            name="source_id"
            defaultValue={row.source_id ?? ""}
            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-milsaca-dourado focus:outline-none focus:ring-2 focus:ring-milsaca-dourado/30"
          >
            <option value="">— (sem fonte)</option>
            {fontesList.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            name="status"
            defaultValue={row.status}
            className="flex h-10 w-full max-w-xs rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-milsaca-dourado focus:outline-none focus:ring-2 focus:ring-milsaca-dourado/30"
          >
            <option value="active">Ativa — produtor vê</option>
            <option value="hidden">Oculta — produtor não vê</option>
            <option value="stale">Desatualizada</option>
            <option value="error">Erro</option>
          </select>
        </div>

        <div className="flex flex-col-reverse items-stretch justify-end gap-3 border-t border-slate-100 pt-4 sm:col-span-2 sm:flex-row sm:items-center">
          <Button asChild variant="outline">
            <Link href="/admin/cotacoes">Cancelar</Link>
          </Button>
          <SubmitButton
            className="gap-2 bg-milsaca-cafezal text-milsaca-cream hover:bg-milsaca-folha"
            pendingLabel="Salvando..."
          >
            Salvar alterações
          </SubmitButton>
        </div>
      </form>

      <form
        action={deleteCotacaoAdmin}
        className="mt-6 flex justify-end"
      >
        <input type="hidden" name="id" value={row.id} />
        <ConfirmSubmit
          variant="ghost"
          size="sm"
          className="text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700"
          confirmTitle="Apagar cotação?"
          confirmMessage={
            <p>
              Cotação é removida permanentemente. Produtor deixa de ver. Pra
              ocultar temporariamente, prefira mudar o status pra{" "}
              <strong>Oculta</strong> acima.
            </p>
          }
          confirmButtonLabel="Apagar"
          confirmButtonVariant="destructive"
          pendingLabel="Apagando..."
        >
          Apagar cotação permanentemente
        </ConfirmSubmit>
      </form>
    </div>
  );
}
