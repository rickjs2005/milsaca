import { redirect } from "next/navigation";
import { enforceProfileStatus, getProfile, requireUser } from "@/lib/auth";
import { ProdutorSidebar } from "./_components/sidebar";
import { getProdutorByProfileId, needsOnboarding } from "./_lib/produtor";

export default async function PainelProdutorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser("/painel/produtor");
  const profile = await getProfile();
  enforceProfileStatus(profile);
  const showSwitcher = (profile?.roles.length ?? 0) > 1;

  // Gate de onboarding — sem dados mínimos, manda pra rota externa
  // /onboarding/produtor (fora deste layout, sem risco de loop).
  let fazendaNome: string | null = null;
  if (profile) {
    const produtor = await getProdutorByProfileId(profile.id);
    if (needsOnboarding(profile, produtor)) {
      redirect("/onboarding/produtor");
    }
    fazendaNome = produtor?.fazenda_nome ?? null;
  }

  return (
    <div className="flex min-h-screen bg-milsaca-cream">
      <ProdutorSidebar
        producerName={profile?.full_name ?? user.email ?? "produtor"}
        producerEmail={user.email ?? ""}
        fazendaNome={fazendaNome}
        showSwitcher={showSwitcher}
      />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-8 py-10">{children}</div>
      </div>
    </div>
  );
}
