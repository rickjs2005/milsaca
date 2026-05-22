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
  const { data: corretoras } = await supabase
    .from("corretoras")
    .select("id, name, city, state")
    .order("name", { ascending: true })
    .limit(500);

  const list =
    (corretoras ?? []) as { id: string; name: string; city: string | null; state: string | null }[];

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="Compliance"
        title="Nova cotação manual"
        description="Posta cotação em nome de uma corretora. Aparece automaticamente no painel do produtor (com nome da corretora) e no /painel/corretora/cotacoes da corretora escolhida."
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
            {list.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.city || c.state
                  ? ` — ${[c.city, c.state].filter(Boolean).join(" / ")}`
                  : ""}
              </option>
            ))}
          </select>
          <p className="text-[10px] text-slate-500">
            A cotação fica vinculada a essa corretora — produtor verá &quot;cotação X de {"{nome}"}&quot;.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="specie">Espécie *</Label>
          <select
            id="specie"
            name="specie"
            required
            defaultValue="arabica"
            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-milsaca-dourado focus:outline-none focus:ring-2 focus:ring-milsaca-dourado/30"
          >
            <option value="arabica">Arábica</option>
            <option value="conillon">Conillón</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="process">Processo</Label>
          <select
            id="process"
            name="process"
            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-milsaca-dourado focus:outline-none focus:ring-2 focus:ring-milsaca-dourado/30"
          >
            <option value="">—</option>
            <option value="natural">Natural</option>
            <option value="cereja_descascado">Cereja descascado</option>
            <option value="cd_desmucilado">CD desmucilado</option>
            <option value="despolpado">Despolpado</option>
            <option value="fermentacao_induzida">Fermentação induzida</option>
          </select>
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
          <Label htmlFor="price">Preço da saca (R$) *</Label>
          <Input
            id="price"
            name="price"
            type="text"
            inputMode="decimal"
            required
            placeholder="1.850,00"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="region">Praça</Label>
          <Input id="region" name="region" placeholder="Manhuaçu / MG" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="source">Fonte</Label>
          <Input
            id="source"
            name="source"
            placeholder="CEPEA, observação local, etc."
          />
        </div>

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
