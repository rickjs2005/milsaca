import { getProfile, requireUser } from "@/lib/auth";
import { ProdutorSidebar } from "./_components/sidebar";

export default async function PainelProdutorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser("/painel/produtor");
  const profile = await getProfile();
  const showSwitcher = (profile?.roles.length ?? 0) > 1;

  return (
    <div className="flex min-h-screen bg-milsaca-cream">
      <ProdutorSidebar
        userEmail={user.email ?? "produtor"}
        showSwitcher={showSwitcher}
      />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-8 py-10">{children}</div>
      </div>
    </div>
  );
}
