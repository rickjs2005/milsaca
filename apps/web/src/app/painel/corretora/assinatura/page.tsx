import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Info,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getProfile } from "@/lib/auth";
import { createClient } from "@milsaca/db/web/server";
import { getCorretoraSubscriptionInfo } from "../_lib/corretora";
import {
  detectCurrentTier,
  loadPlans,
  PLANS,
  whatsappLinkForUpgrade,
} from "./_lib/plans-catalog";
import { PlanCard } from "./_components/plan-card";

export const metadata = { title: "Assinatura — Painel da corretora" };

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

const STATUS_LABEL: Record<string, string> = {
  trial: "Trial gratuito ativo",
  active: "Plano ativo",
  past_due: "Pagamento em atraso",
  canceled: "Assinatura cancelada",
  expired: "Trial expirado",
  none: "Sem plano",
};

const STATUS_TONE: Record<string, string> = {
  trial: "bg-sky-50 text-sky-800 ring-sky-200",
  active: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  past_due: "bg-rose-50 text-rose-800 ring-rose-200",
  canceled: "bg-slate-100 text-slate-700 ring-slate-200",
  expired: "bg-rose-50 text-rose-800 ring-rose-200",
  none: "bg-milsaca-dourado/15 text-milsaca-cafezal ring-milsaca-dourado/40",
};

async function loadCorretoraName(corretoraId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("corretoras")
    .select("name")
    .eq("id", corretoraId)
    .maybeSingle<{ name: string | null }>();
  return data?.name ?? null;
}

export default async function AssinaturaPage() {
  const profile = await getProfile();
  if (!profile?.corretora_id) {
    redirect("/painel/escolher?error=Sem%20corretora%20vinculada");
  }

  const [subscription, corretoraName, plans] = await Promise.all([
    getCorretoraSubscriptionInfo(profile.corretora_id),
    loadCorretoraName(profile.corretora_id),
    loadPlans(),
  ]);

  const currentTier = detectCurrentTier(
    subscription.planName,
    subscription.effectiveStatus,
  );

  const expiry =
    subscription.currentPeriodEnd ?? subscription.trialEndsAt ?? null;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="flex items-center gap-2 text-2xl sm:text-3xl font-semibold tracking-tight text-milsaca-verde">
          <Sparkles className="h-7 w-7 text-milsaca-dourado" />
          Assinatura
        </h1>
        <p className="mt-1 text-sm text-milsaca-verde-claro">
          Veja seu plano atual, faça upgrade e libere recursos comerciais.
        </p>
      </header>

      {/* ============================================================ */}
      {/* Card de status atual                                          */}
      {/* ============================================================ */}
      <StatusCard
        statusLabel={
          STATUS_LABEL[subscription.effectiveStatus] ??
          subscription.effectiveStatus
        }
        statusTone={
          STATUS_TONE[subscription.effectiveStatus] ??
          STATUS_TONE["none"] ??
          ""
        }
        planName={subscription.planName}
        currentTier={currentTier}
        expiry={expiry}
        daysUntilExpiry={subscription.daysUntilExpiry}
        corretoraName={corretoraName}
      />

      {/* ============================================================ */}
      {/* Grid de planos                                                */}
      {/* ============================================================ */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-milsaca-verde-claro">
              Planos disponíveis
            </h2>
            <p className="text-xs text-milsaca-verde-claro/70">
              Ativação manual com a equipe Milsaca via WhatsApp. Sem cartão
              guardado, sem pegadinha.
            </p>
          </div>
        </div>

        <div className="grid gap-5 pt-3 sm:grid-cols-2">
          {plans.map((plan) => (
            <PlanCard
              key={plan.tier}
              plan={plan}
              currentTier={currentTier}
              corretoraName={corretoraName}
            />
          ))}
        </div>
      </section>

      {/* ============================================================ */}
      {/* FAQ curto                                                      */}
      {/* ============================================================ */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-milsaca-verde-claro">
          Perguntas comuns
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <FaqCard
            question="Como pago?"
            answer="Por enquanto a Milsaca ativa o plano manualmente. Você fala com a gente no WhatsApp e a gente envia boleto, Pix ou cobrança recorrente conforme preferir."
          />
          <FaqCard
            question="Posso cancelar a qualquer momento?"
            answer="Sim. Não tem fidelidade. Você usa enquanto faz sentido pra corretora e cancela quando quiser — sem multa."
          />
          <FaqCard
            question="O que acontece se atrasar?"
            answer="Você continua vendo os dados existentes em modo leitura. Criar novos contratos, lotes e entregas fica bloqueado até regularizar. Nada se perde."
          />
          <FaqCard
            question="Como funciona o 1º mês grátis?"
            answer="Você ativa o Premium e usa o painel completo por 30 dias sem pagar nada. Só a partir do 2º mês entra a mensalidade de R$100. Se não fizer sentido, é só cancelar antes — sem cobrança."
          />
        </div>
      </section>
    </div>
  );
}

/* ====================================================================== */
/* Pieces                                                                  */
/* ====================================================================== */

function StatusCard({
  statusLabel,
  statusTone,
  planName,
  currentTier,
  expiry,
  daysUntilExpiry,
  corretoraName,
}: {
  statusLabel: string;
  statusTone: string;
  planName: string | null;
  currentTier: "gratuito" | "premium";
  expiry: string | null;
  daysUntilExpiry: number | null;
  corretoraName: string | null;
}) {
  const planDisplay = planName ?? PLANS.find((p) => p.tier === currentTier)?.name ?? "Gratuito";
  const isOnFreePlan = currentTier === "gratuito";
  const upgradeHref = whatsappLinkForUpgrade("premium", corretoraName);

  return (
    <Card className="overflow-hidden border-milsaca-cream-escuro shadow-card">
      <div className="grid gap-4 p-6 sm:grid-cols-[1fr_auto] sm:items-center sm:p-7">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ring-1 ring-inset ${statusTone}`}
            >
              {statusLabel}
            </span>
            <h2 className="text-xl font-semibold text-milsaca-verde">
              {planDisplay}
            </h2>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-milsaca-verde-claro">
            {expiry ? (
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Vence em {formatDate(expiry)}
              </span>
            ) : null}
            {daysUntilExpiry != null ? (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {daysUntilExpiry} dia{daysUntilExpiry === 1 ? "" : "s"} restante
                {daysUntilExpiry === 1 ? "" : "s"}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          {isOnFreePlan ? (
            <Link
              href={upgradeHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center gap-1.5 rounded-md bg-milsaca-dourado px-4 text-sm font-semibold text-milsaca-preto shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_8px_24px_-8px_rgba(201,169,97,0.45)] transition-all hover:brightness-105"
            >
              <Sparkles className="h-4 w-4" />
              Liberar painel completo
            </Link>
          ) : (
            <Link
              href={`https://wa.me/5533999999999?text=${encodeURIComponent(`Olá! Quero conversar sobre minha assinatura no Milsaca${corretoraName ? ` (${corretoraName})` : ""}.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center gap-1.5 rounded-md border border-milsaca-cafezal px-4 text-sm font-semibold text-milsaca-cafezal transition-colors hover:bg-milsaca-cafezal hover:text-milsaca-cream"
            >
              <MessageCircle className="h-4 w-4" />
              Falar com a Milsaca
            </Link>
          )}
        </div>
      </div>
      {isOnFreePlan ? (
        <div className="flex items-start gap-2 border-t border-milsaca-cream-escuro bg-milsaca-cream/40 px-6 py-3 text-xs text-milsaca-verde">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-milsaca-dourado" />
          <span>
            No <strong>Premium</strong> (R$100/mês, 1º mês grátis) você libera
            contratos completos, analytics comercial, automação de follow-up,
            leads ilimitados e múltiplos operadores. A maioria das corretoras
            que migra paga o plano em menos de 2 contratos fechados.
          </span>
        </div>
      ) : null}
    </Card>
  );
}

function FaqCard({ question, answer }: { question: string; answer: string }) {
  return (
    <Card className="border-milsaca-cream-escuro">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm text-milsaca-verde">
          <CheckCircle2 className="h-3.5 w-3.5 text-milsaca-dourado" />
          {question}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-[13px] leading-relaxed text-milsaca-verde-claro">
          {answer}
        </CardDescription>
      </CardContent>
    </Card>
  );
}

