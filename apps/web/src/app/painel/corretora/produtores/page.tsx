import Link from "next/link";
import { Plus, Users, Mail, Phone, MapPin, MessageCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import { listProdutoresEContatos, getCorretoraNome } from "./_lib/queries";
import {
  buildWhatsAppInviteUrl,
  defaultInviteMessage,
} from "./_lib/whatsapp";

export const metadata = { title: "Produtores — Painel da corretora" };

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default async function ProdutoresPage() {
  const profile = await getProfile();
  if (!profile?.corretora_id) {
    redirect("/painel/escolher?error=Sem%20corretora%20vinculada");
  }

  const [items, corretoraNome] = await Promise.all([
    listProdutoresEContatos(profile.corretora_id),
    getCorretoraNome(profile.corretora_id),
  ]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-milsaca-verde">
            Produtores
          </h1>
          <p className="text-sm text-milsaca-verde-claro">
            Sua carteira de produtores. Cadastre um contato mesmo antes do
            produtor entrar na plataforma — quando ele logar com o mesmo email,
            os leads dele migram automaticamente.
          </p>
        </div>
        <Button
          asChild
          className="bg-milsaca-verde text-milsaca-cream hover:bg-milsaca-verde-claro"
        >
          <Link href="/painel/corretora/produtores/novo">
            <Plus className="mr-2 h-4 w-4" />
            Novo produtor
          </Link>
        </Button>
      </header>

      {items.length === 0 ? (
        <Card className="border-dashed border-milsaca-cream-escuro bg-transparent">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-milsaca-verde/10 text-milsaca-verde">
              <Users className="h-6 w-6" />
            </span>
            <p className="text-sm text-milsaca-verde">
              Nenhum produtor cadastrado ainda.
            </p>
            <p className="text-xs text-milsaca-verde-claro">
              Comece adicionando os contatos da sua carteira.
            </p>
            <Button
              asChild
              size="sm"
              className="mt-2 bg-milsaca-verde text-milsaca-cream hover:bg-milsaca-verde-claro"
            >
              <Link href="/painel/corretora/produtores/novo">
                Cadastrar produtor
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-milsaca-cream-escuro">
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="bg-milsaca-cream-escuro/40 text-xs uppercase tracking-wider text-milsaca-verde-claro">
                <tr>
                  <th className="px-5 py-3 text-left">Nome</th>
                  <th className="px-5 py-3 text-left">Contato</th>
                  <th className="px-5 py-3 text-left">Fazenda / Local</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-right">Negócios</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-milsaca-cream-escuro">
                {items.map((p) => {
                  const waUrl = buildWhatsAppInviteUrl({
                    phone: p.phone,
                    message: defaultInviteMessage({
                      corretoraNome,
                      produtorNome: p.full_name,
                      siteUrl: SITE_URL,
                    }),
                  });
                  const detalheHref =
                    p.kind === "contato"
                      ? `/painel/corretora/produtores/contatos/${p.id}`
                      : null;
                  return (
                    <tr
                      key={`${p.kind}-${p.id}`}
                      className="hover:bg-milsaca-cream-escuro/30"
                    >
                      <td className="px-5 py-3">
                        {detalheHref ? (
                          <Link
                            href={detalheHref}
                            className="font-medium text-milsaca-verde hover:underline"
                          >
                            {p.full_name}
                          </Link>
                        ) : (
                          <span className="font-medium text-milsaca-verde">
                            {p.full_name}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-milsaca-verde">
                        <div className="space-y-1 text-xs">
                          {p.email && (
                            <div className="flex items-center gap-1.5">
                              <Mail className="h-3 w-3 text-milsaca-verde-claro" />
                              {p.email}
                            </div>
                          )}
                          {p.phone && (
                            <div className="flex items-center gap-1.5">
                              <Phone className="h-3 w-3 text-milsaca-verde-claro" />
                              {p.phone}
                            </div>
                          )}
                          {!p.email && !p.phone && (
                            <span className="text-milsaca-verde-claro">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-milsaca-verde">
                        <div className="space-y-1 text-xs">
                          {p.fazenda_nome && (
                            <div className="font-medium">{p.fazenda_nome}</div>
                          )}
                          {(p.city || p.state) && (
                            <div className="flex items-center gap-1.5 text-milsaca-verde-claro">
                              <MapPin className="h-3 w-3" />
                              {[p.city, p.state].filter(Boolean).join(" / ")}
                            </div>
                          )}
                          {!p.fazenda_nome && !p.city && !p.state && (
                            <span className="text-milsaca-verde-claro">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        {p.kind === "produtor" ? (
                          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                            Cadastrado
                          </Badge>
                        ) : p.claimed ? (
                          <Badge className="bg-milsaca-verde text-milsaca-cream hover:bg-milsaca-verde">
                            Vinculado
                          </Badge>
                        ) : (
                          <Badge className="bg-milsaca-dourado/20 text-milsaca-verde hover:bg-milsaca-dourado/20">
                            Pendente
                          </Badge>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right text-milsaca-verde">
                        <div className="text-xs">
                          <span className="font-medium">{p.qtd_leads}</span>{" "}
                          leads
                          {p.qtd_contratos > 0 && (
                            <>
                              {" · "}
                              <span className="font-medium">
                                {p.qtd_contratos}
                              </span>{" "}
                              contratos
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right">
                        {waUrl ? (
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:underline"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                            WhatsApp
                          </a>
                        ) : (
                          <span className="text-xs text-milsaca-verde-claro">
                            sem telefone
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
