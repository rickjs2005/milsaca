import { redirect } from "next/navigation";
import { enforceProfileStatus, getProfile, requireUser } from "@/lib/auth";
import { ToastFromSearchParams } from "@/components/toast-from-search-params";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { PanelShell } from "@/components/panel-shell";
import { getSupportChannels } from "@/lib/support";
import { ProdutorSidebar } from "./_components/sidebar";
import { ProdutorBottomNav } from "./_components/bottom-nav";
import { getProdutorByProfileId, needsOnboarding } from "./_lib/produtor";

export default async function PainelProdutorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser("/painel/produtor");
  const profile = await getProfile();
  enforceProfileStatus(profile);

  // Guard de papel: quem não tem o papel 'produtor' é redirecionado pro
  // painel correto via /painel (admin → /admin, papel único → painel certo,
  // multi-papel → /painel/escolher).
  if (profile && !profile.roles.includes("produtor")) {
    redirect("/painel");
  }

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

  const support = await getSupportChannels();

  return (
    <>
      <PanelShell
        brandLabel="Produtor"
        bottomNav={<ProdutorBottomNav />}
        sidebar={
          <ProdutorSidebar
            producerName={profile?.full_name ?? user.email ?? "produtor"}
            producerEmail={user.email ?? ""}
            fazendaNome={fazendaNome}
            showSwitcher={showSwitcher}
            support={support}
          />
        }
      >
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
          {children}
        </div>
      </PanelShell>
      <ToastFromSearchParams />
      <ServiceWorkerRegister />
    </>
  );
}
