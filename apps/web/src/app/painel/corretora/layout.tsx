import { redirect } from "next/navigation";
import { requireUser, getProfile, enforceProfileStatus } from "@/lib/auth";
import { createClient } from "@milsaca/db/web/server";
import { CorretoraSidebar } from "./_components/sidebar";
import {
  getCorretoraOnboarding,
  needsCorretoraOnboarding,
} from "./_lib/corretora";

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
  const corretora = await loadCorretora(profile?.corretora_id ?? null);
  const showSwitcher = (profile?.roles.length ?? 0) > 1;

  // Gate de onboarding — sem CNPJ/cidade/WhatsApp + nome do operador,
  // redireciona pra rota top-level /onboarding/corretora (fora deste
  // layout, sem risco de loop).
  if (profile?.corretora_id) {
    const onboarding = await getCorretoraOnboarding(profile.corretora_id);
    if (needsCorretoraOnboarding(profile, onboarding)) {
      redirect("/onboarding/corretora");
    }
  }

  const corretoraLabel = corretora
    ? [corretora.name, [corretora.city, corretora.state].filter(Boolean).join("/")]
        .filter(Boolean)
        .join(" · ")
    : null;

  return (
    <div className="flex min-h-screen bg-milsaca-cream">
      <CorretoraSidebar
        operatorName={profile?.full_name ?? user.email ?? "operador"}
        operatorEmail={user.email ?? ""}
        corretoraLabel={corretoraLabel}
        showSwitcher={showSwitcher}
      />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-8 py-10">{children}</div>
      </div>
    </div>
  );
}
