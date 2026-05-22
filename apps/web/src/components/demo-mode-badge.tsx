import { AlertTriangle } from "lucide-react";
import { isDemoMode } from "@/lib/quotes-mode";

/**
 * Badge visível quando QUOTES_MODE=demo. Avisa o usuário que cotações
 * mostradas podem incluir dados fake de seed local — não confiar pra
 * decisão de mercado.
 *
 * Em modo `real` (padrão), retorna null e nada é renderizado.
 */
export function DemoModeBadge() {
  if (!isDemoMode()) return null;
  return (
    <div className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
      <AlertTriangle aria-hidden className="h-3.5 w-3.5" />
      <span>
        <strong>Modo Demonstração</strong> — algumas cotações podem ser dados
        de exemplo (não confiáveis pra decisão real).
      </span>
    </div>
  );
}
