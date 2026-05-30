import { cn } from "@/lib/utils";

/**
 * Status semânticos padronizados pra todo o painel. Cada um mapeia
 * pra uma tonalidade visual (verde/azul/âmbar/rosa/slate). Mantém o
 * vocabulário consistente entre módulos (corretora/assinatura/lead/
 * contrato/laudo).
 *
 * Se o status real do dominio não bate com nenhuma key, passe
 * `tone` direto e use `children` pra texto custom.
 */
export type StatusTone =
  | "success"
  | "info"
  | "warning"
  | "danger"
  | "neutral"
  | "premium";

export type StatusKey =
  | "ativo"
  | "verificado"
  | "concluido"
  | "trial"
  | "pendente"
  | "em_analise"
  | "rascunho"
  | "bloqueado"
  | "cancelado"
  | "expirado"
  | "vencida"
  | "erro"
  | "past_due"
  | "inativo";

// tone → cores semânticas da marca (tokens de fundação D1).
// Badge suave: bg-{token}-50 / text-{token}-700 / ring-{token}-100.
const TONE_CLASSES: Record<StatusTone, string> = {
  success: "bg-success-50 text-success-700 ring-success-100",
  info: "bg-info-50 text-info-700 ring-info-100",
  warning: "bg-warning-50 text-warning-700 ring-warning-100",
  danger: "bg-danger-50 text-danger-700 ring-danger-100",
  neutral: "bg-neutral-100 text-neutral-700 ring-neutral-200",
  premium: "bg-milsaca-dourado/10 text-milsaca-cafezal ring-milsaca-dourado/40",
};

// Bolinha indicadora: cor cheia (token 500) por tone.
const DOT_CLASSES: Record<StatusTone, string> = {
  success: "bg-success-500",
  info: "bg-info-500",
  warning: "bg-warning-500",
  danger: "bg-danger-500",
  neutral: "bg-neutral-400",
  premium: "bg-milsaca-dourado",
};

const KEY_TO_TONE: Record<StatusKey, { tone: StatusTone; label: string }> = {
  ativo: { tone: "success", label: "Ativo" },
  verificado: { tone: "premium", label: "Verificada" },
  concluido: { tone: "success", label: "Concluído" },
  trial: { tone: "info", label: "Trial" },
  pendente: { tone: "warning", label: "Pendente" },
  em_analise: { tone: "info", label: "Em análise" },
  rascunho: { tone: "neutral", label: "Rascunho" },
  bloqueado: { tone: "danger", label: "Bloqueado" },
  cancelado: { tone: "neutral", label: "Cancelado" },
  expirado: { tone: "danger", label: "Expirado" },
  vencida: { tone: "danger", label: "Vencida" },
  erro: { tone: "danger", label: "Erro" },
  past_due: { tone: "warning", label: "Atrasado" },
  inativo: { tone: "neutral", label: "Inativo" },
};

type Props = {
  /** Status semântico — escolhe tone + label automaticamente. */
  status?: StatusKey;
  /** Sobrepõe a tonalidade (útil pra status não-mapeados). */
  tone?: StatusTone;
  /** Texto custom; se omitido e `status` for passado, usa o label do mapa. */
  children?: React.ReactNode;
  /** Bolinha indicadora à esquerda. Padrão true pra status, false pra tone-only. */
  withDot?: boolean;
  className?: string;
};

export function StatusBadge({
  status,
  tone,
  children,
  withDot,
  className,
}: Props) {
  const resolved = status ? KEY_TO_TONE[status] : null;
  const finalTone = tone ?? resolved?.tone ?? "neutral";
  const finalLabel = children ?? resolved?.label ?? "—";
  const showDot = withDot ?? Boolean(status);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill px-2.5 py-0.5 text-caption font-medium ring-1 ring-inset",
        TONE_CLASSES[finalTone],
        className,
      )}
    >
      {showDot ? (
        <span
          aria-hidden
          className={cn("h-1.5 w-1.5 rounded-full", DOT_CLASSES[finalTone])}
        />
      ) : null}
      {finalLabel}
    </span>
  );
}
