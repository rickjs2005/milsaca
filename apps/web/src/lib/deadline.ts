import type { StatusTone } from "@/components/status-badge";

export type DeadlineInfo = {
  /** Dias até o prazo (negativo = vencido). null se sem data. */
  dias: number | null;
  /** Tom semântico pro semáforo: verde >7d, âmbar ≤7d, vermelho ≤3d/vencido. */
  tone: StatusTone;
  /** Rótulo curto: "DD/MM/AA" quando longe, "Expira em N dias" quando perto. */
  label: string;
  /** true quando perto/vencido (≤7d) — vale destacar. */
  urgente: boolean;
};

function fmtDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y.slice(2)}`;
}

/**
 * Semáforo de prazo genérico — validade de oferta, vencimento de contrato,
 * prazo de entrega. Pure (client+server safe).
 */
export function deadlineStatus(iso: string | null): DeadlineInfo {
  if (!iso) return { dias: null, tone: "neutral", label: "—", urgente: false };
  const dias = Math.ceil(
    (new Date(`${iso.slice(0, 10)}T00:00:00`).getTime() - Date.now()) /
      86_400_000,
  );
  if (dias < 0) return { dias, tone: "danger", label: "Expirada", urgente: true };
  if (dias === 0)
    return { dias, tone: "danger", label: "Expira hoje", urgente: true };
  if (dias <= 3)
    return {
      dias,
      tone: "danger",
      label: `Expira em ${dias} dia${dias === 1 ? "" : "s"}`,
      urgente: true,
    };
  if (dias <= 7)
    return { dias, tone: "warning", label: `Expira em ${dias} dias`, urgente: true };
  return { dias, tone: "success", label: fmtDate(iso), urgente: false };
}
