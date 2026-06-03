import { AlertTriangle } from "lucide-react";
import { isDemoModeAsync } from "@/lib/quotes-mode";

/**
 * Badge visível quando o modo de cotações é `demo`. Avisa o usuário que
 * cotações mostradas podem incluir dados fake de seed local — não
 * confiar pra decisão de mercado.
 *
 * Lê a flag hot-swappable de `platform_settings` (com fallback pra env).
 * Server Component async. Em modo `real` (padrão), retorna null.
 */
export async function DemoModeBadge() {
  if (!(await isDemoModeAsync())) return null;
  return (
    <div className="flex items-center gap-2 rounded-md border border-warning-100 bg-warning-50 px-3 py-2 text-xs text-warning-700">
      <AlertTriangle aria-hidden className="h-3.5 w-3.5" />
      <span>
        <strong>Modo Demonstração</strong> — algumas cotações podem ser dados
        de exemplo (não confiáveis pra decisão real).
      </span>
    </div>
  );
}
