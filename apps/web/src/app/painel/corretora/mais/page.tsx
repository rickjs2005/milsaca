import Link from "next/link";
import {
  Store,
  Truck,
  Wallet,
  Users,
  Building2,
  TrendingUp,
  MessagesSquare,
  BarChart3,
  Sparkles,
  User,
  ChevronRight,
  LogOut,
  CheckSquare,
  CalendarDays,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getProfile } from "@/lib/auth";
import { isCorretoraDono } from "../_lib/corretora";

export const metadata = { title: "Mais — Painel da corretora" };

type Item = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Só o dono vê (Pagamentos, Assinatura, Equipe). */
  ownerOnly?: boolean;
};
type Group = { title: string; items: Item[] };

// Tudo que não cabe nas 4 abas principais do mobile. Espelha a sidebar do
// desktop pra garantir paridade de navegação no celular.
const GROUPS: Group[] = [
  {
    title: "Operação",
    items: [
      {
        href: "/painel/corretora/tarefas",
        label: "Tarefas",
        icon: CheckSquare,
      },
      {
        href: "/painel/corretora/agenda",
        label: "Agenda",
        icon: CalendarDays,
      },
      {
        href: "/painel/corretora/ofertas",
        label: "Oferta ao Comprador",
        icon: Store,
      },
      { href: "/painel/corretora/entregas", label: "Entregas", icon: Truck },
      {
        href: "/painel/corretora/pagamentos",
        label: "Pagamento ao Produtor",
        icon: Wallet,
        ownerOnly: true,
      },
    ],
  },
  {
    title: "Mercado",
    items: [
      { href: "/painel/corretora/cotacoes", label: "Cotações", icon: TrendingUp },
      {
        href: "/painel/corretora/analytics",
        label: "Analytics",
        icon: BarChart3,
      },
      {
        href: "/painel/corretora/comunidade",
        label: "Comunidade",
        icon: MessagesSquare,
      },
    ],
  },
  {
    title: "Cadastros",
    items: [
      { href: "/painel/corretora/produtores", label: "Produtores", icon: Users },
      {
        href: "/painel/corretora/compradores",
        label: "Compradores",
        icon: Building2,
      },
    ],
  },
  {
    title: "Conta",
    items: [
      {
        href: "/painel/corretora/assinatura",
        label: "Assinatura",
        icon: Sparkles,
        ownerOnly: true,
      },
      {
        href: "/painel/corretora/equipe",
        label: "Equipe",
        icon: Users,
        ownerOnly: true,
      },
      { href: "/painel/corretora/perfil", label: "Perfil", icon: User },
    ],
  },
];

export default async function MaisPage() {
  const profile = await getProfile();
  const isDono = isCorretoraDono(profile);
  const groups = GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((it) => !it.ownerOnly || isDono),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-h1 text-milsaca-cafezal">Mais</h1>
        <p className="mt-1 text-body-sm text-neutral-600">
          Todas as áreas da corretora.
        </p>
      </header>

      {groups.map((group) => (
        <section key={group.title} className="space-y-2">
          <h2 className="text-caption font-semibold uppercase tracking-wider text-neutral-500">
            {group.title}
          </h2>
          <Card>
            <CardContent className="divide-y divide-neutral-200 p-0">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 px-card py-3.5 transition-colors hover:bg-milsaca-cream first:rounded-t-card last:rounded-b-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-milsaca-cafezal/10 text-milsaca-cafezal">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="flex-1 text-body-sm font-medium text-milsaca-cafezal">
                      {item.label}
                    </span>
                    <ChevronRight className="h-4 w-4 text-neutral-400" />
                  </Link>
                );
              })}
            </CardContent>
          </Card>
        </section>
      ))}

      <form action="/sair" method="post">
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-md border border-neutral-200 bg-white py-3 text-body-sm font-medium text-neutral-600 transition-colors hover:bg-milsaca-cream hover:text-milsaca-cafezal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </form>
    </div>
  );
}
