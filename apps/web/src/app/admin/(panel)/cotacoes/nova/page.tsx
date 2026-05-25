import Link from "next/link";
import { requireAppAdmin } from "@/lib/auth";
import { createClient } from "@milsaca/db/web/server";
import { PageHeader } from "@/components/page-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";
import { createCotacaoAdmin } from "../_actions";

export const metadata = { title: "Nova cotação · Admin Milsaca" };

type SearchParams = Promise<{ error?: string }>;

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default async function NovaCotacaoAdminPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAppAdmin();
  const { error } = await searchParams;

  const supabase = await createClient();
  const [{ data: corretoras }, { data: produtos }, { data: pracas }, { data: fontes }] =
    await Promise.all([
      supabase
        .from("corretoras")
        .select("id, name, city, state")
        .order("name", { ascending: true })
        .limit(500),
      supabase
        .from("coffee_types")
        .select("id, name, species, process")
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

  const corretorasList =
    (corretoras ?? []) as {
      id: string;
      name: string;
      city: string | null;
      state: string | null;
    }[];
  const produtosList =
    (produtos ?? []) as { id: string; name: string; species: string }[];
  const pracasList =
    (pracas ?? []) as {
      id: string;
      name: string;
      state: string;
      region_group: string | null;
    }[];
  const fontesList = (fontes ?? []) as { id: string; slug: string; name: string }[];

  // Default source: admin_manual
  const defaultSourceId =
    fontesList.find((f) => f.slug === "admin_manual")?.id ?? "";

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="Compliance · Cotações"
        title="Nova cotação manual"
        description="Posta cotação em nome de uma corretora. Aparece no painel do produtor (com nome da corretora) e em /painel/corretora/cotacoes."
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Cotações", href: "/admin/cotacoes" },
          { label: "Nova" },
        ]}
      />

      {error ? (
        <p className="mb-4 rounded-md border border-rose-500/30 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      <form
        action={createCotacaoAdmin}
        className="grid gap-5 rounded-card border border-slate-200 bg-white p-6 shadow-card sm:grid-cols-2"
      >
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="corretora_id">Corretora *</Label>
          <select
            id="corretora_id"
            name="corretora_id"
            required
            defaultValue=""
            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-milsaca-dourado focus:outline-none focus:ring-2 focus:ring-milsaca-dourado/30"
          >
            <option value="" disabled>
              Selecione...
            </option>
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
          <Label htmlFor="product_id">Tipo de café *</Label>
          <select
            id="product_id"
            name="product_id"
            required
            defaultValue=""
            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-milsaca-dourado focus:outline-none focus:ring-2 focus:ring-milsaca-dourado/30"
          >
            <option value="" disabled>
              Selecione...
            </option>
            {produtosList.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <p className="text-[10px] text-slate-500">
            Catálogo em /admin/cotacoes/tipos.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="region_id">Praça</Label>
          <select
            id="region_id"
            name="region_id"
            defaultValue=""
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
          <p className="text-[10px] text-slate-500">
            Catálogo em /admin/cotacoes/pracas.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="reference_date">Data de referência *</Label>
          <Input
            id="reference_date"
            name="reference_date"
            type="date"
            required
            defaultValue={todayISO()}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="valid_until">Válido até</Label>
          <Input
            id="valid_until"
            name="valid_until"
            type="date"
            placeholder="(opcional)"
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
            placeholder="1.850,00"
          />
        </div>

        <div className="grid grid-cols-2 gap-2 sm:col-span-1">
          <div className="space-y-2">
            <Label htmlFor="currency">Moeda</Label>
            <select
              id="currency"
              name="currency"
              defaultValue="BRL"
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
              defaultValue="saca_60kg"
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
          <Label htmlFor="source_id">Fonte da cotação</Label>
          <select
            id="source_id"
            name="source_id"
            defaultValue={defaultSourceId}
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

        <input type="hidden" name="status" value="active" />

        <div className="flex flex-col-reverse items-stretch justify-end gap-3 border-t border-slate-100 pt-4 sm:col-span-2 sm:flex-row sm:items-center">
          <Button asChild variant="outline">
            <Link href="/admin/cotacoes">Cancelar</Link>
          </Button>
          <SubmitButton
            className="gap-2 bg-milsaca-cafezal text-milsaca-cream hover:bg-milsaca-folha"
            pendingLabel="Cadastrando..."
          >
            Cadastrar cotação
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
