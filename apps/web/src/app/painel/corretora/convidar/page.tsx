import { headers } from "next/headers";
import { UserPlus } from "lucide-react";
import { createClient } from "@milsaca/db/web/server";
import { ensureCorretora } from "../_lib/corretora";
import { ConviteProdutores } from "./_components/convite-produtores";

export const metadata = { title: "Convidar produtores — Painel da corretora" };

export default async function ConvidarProdutoresPage() {
  const profile = await ensureCorretora();

  const supabase = await createClient();
  const { data: corretora } = await supabase
    .from("corretoras")
    .select("name, slug")
    .eq("id", profile.corretora_id)
    .maybeSingle<{ name: string; slug: string }>();

  const nome = corretora?.name ?? "sua corretora";
  const slug = corretora?.slug ?? "";

  // URL absoluta a partir do host da requisição (sem hardcode de domínio).
  const h = await headers();
  const host = h.get("host") ?? "milsaca.app";
  const proto =
    h.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const link = slug ? `${proto}://${host}/indicacao/${slug}` : "";

  const message =
    `Olá! 👋 Crie sua conta grátis na Milsaca e acompanhe o mercado do café pelo celular. ` +
    `Lá você encontra todas as corretoras da nossa região — e a ${nome} já fica entre as suas favoritas: ${link}`;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="flex items-center gap-2 text-h1 text-milsaca-cafezal">
          <UserPlus className="h-7 w-7" />
          Convidar produtores
        </h1>
        <p className="mt-1 max-w-2xl text-body-sm text-neutral-600">
          Um link só seu pra mandar pros seus produtores. Quem criar conta por
          ele já te adiciona como corretora favorita — e continua vendo o mercado
          inteiro. Mande pra quantos quiser pela lista de transmissão do seu
          WhatsApp.
        </p>
      </header>

      {link ? (
        <ConviteProdutores link={link} message={message} />
      ) : (
        <div className="rounded-card border border-dashed border-neutral-300 bg-white p-card text-body-sm text-neutral-600">
          Complete o cadastro da corretora (nome/cidade) pra gerar seu link de
          convite.
        </div>
      )}
    </div>
  );
}
