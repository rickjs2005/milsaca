import { redirect } from "next/navigation";
import { requireUser, getProfile, enforceProfileStatus } from "@/lib/auth";
import { createClient } from "@milsaca/db/web/server";
import { ToastFromSearchParams } from "@/components/toast-from-search-params";
import { PanelShell } from "@/components/panel-shell";
import { getSupportChannels } from "@/lib/support";
import { CorretoraSidebar } from "./_components/sidebar";
import { CorretoraBottomNav } from "./_components/bottom-nav";
import { SubscriptionBanner } from "./_components/subscription-banner";
import {
  getCorretoraOnboarding,
  getCorretoraSubscriptionInfo,
  isCorretoraDono,
  needsCorretoraOnboarding,
} from "./_lib/corretora";
import { loadSidebarBadges } from "./_lib/dashboard";

async function loadCorretora(corretoraId: string | null) {
  if (!corretoraId) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("corretoras")
    .select("name, city, state")
    .eq("id", corretoraId)
    .maybeSingle<{ name: string; city: string | null; state: string | null }>();
  return data ?? null;
}

export default async function PainelCorretoraLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser("/painel/corretora");
  const profile = await getProfile();
  enforceProfileStatus(profile);

  // Guard de papel: quem não tem o papel 'corretora' não fica preso/perdido
  // aqui — manda pra /painel, que roteia pro lugar certo (admin → /admin,
  // papel único → painel correspondente, multi-papel → /painel/escolher).
  if (profile && !profile.roles.includes("corretora")) {
    redirect("/painel");
  }

  const showSwitcher = (profile?.roles.length ?? 0) > 1;

  // UMA onda paralela em vez de 4 awaits em fila: cada await sequencial é
  // uma ida de ~170ms até o Supabase (us-west) — a fila respondia por boa
  // parte do TTFB de ~1,5s do painel (medição 2026-06-12).
  const cid = profile?.corretora_id ?? null;
  const [corretora, onboarding, subscription, badges, support] =
    await Promise.all([
      loadCorretora(cid),
      cid ? getCorretoraOnboarding(cid) : Promise.resolve(null),
      cid ? getCorretoraSubscriptionInfo(cid) : Promise.resolve(null),
      cid ? loadSidebarBadges(cid) : Promise.resolve(undefined),
      getSupportChannels(),
    ]);

  // Gate de onboarding — sem CNPJ/cidade/WhatsApp + nome do operador,
  // redireciona pra rota top-level /onboarding/corretora (fora deste
  // layout, sem risco de loop).
  if (profile?.corretora_id && needsCorretoraOnboarding(profile, onboarding)) {
    redirect("/onboarding/corretora");
  }

  const corretoraLabel = corretora
    ? [corretora.name, [corretora.city, corretora.state].filter(Boolean).join("/")]
        .filter(Boolean)
        .join(" · ")
    : null;

  return (
    <>
      <PanelShell
        brandLabel="Corretora"
        bottomNav={<CorretoraBottomNav />}
        sidebar={
          <CorretoraSidebar
            operatorName={profile?.full_name ?? user.email ?? "operador"}
            operatorEmail={user.email ?? ""}
            corretoraLabel={corretoraLabel}
            showSwitcher={showSwitcher}
            badges={badges}
            isDono={isCorretoraDono(profile)}
            support={support}
          />
        }
      >
        <div className="mx-auto max-w-screen-2xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
          {subscription ? <SubscriptionBanner info={subscription} /> : null}
          {children}
        </div>
      </PanelShell>
      <ToastFromSearchParams />
    </>
  );
}
