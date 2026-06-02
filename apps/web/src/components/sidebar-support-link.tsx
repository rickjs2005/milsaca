import { LifeBuoy } from "lucide-react";

/**
 * Link "Suporte" exibido no rodapé das sidebars dos painéis (produtor e
 * corretora). Prioriza o WhatsApp (canal padrão no Brasil) e cai pro
 * e-mail quando não há número configurado. Não renderiza nada se nenhum
 * canal estiver definido em `platform_settings`.
 */
export function SidebarSupportLink({
  waHref,
  mailHref,
}: {
  waHref: string | null;
  mailHref: string | null;
}) {
  const href = waHref ?? mailHref;
  if (!href) return null;
  const external = Boolean(waHref);

  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-body-sm font-medium text-milsaca-cream/65 transition-colors hover:bg-white/5 hover:text-milsaca-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-milsaca-dourado focus-visible:ring-inset"
    >
      <LifeBuoy className="h-4 w-4" />
      Suporte
    </a>
  );
}
