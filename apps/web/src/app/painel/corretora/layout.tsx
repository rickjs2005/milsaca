import { requireUser, getProfile } from "@/lib/auth";
import { createClient } from "@milsaca/db/web/server";
import { CorretoraSidebar } from "./_components/sidebar";

async function loadCorretoraName(corretoraId: string | null) {
  if (!corretoraId) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("corretoras")
    .select("name")
    .eq("id", corretoraId)
    .maybeSingle<{ name: string }>();
  return data?.name ?? null;
}

export default async function PainelCorretoraLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser("/painel/corretora");
  const profile = await getProfile();
  const corretoraName = await loadCorretoraName(profile?.corretora_id ?? null);
  const showSwitcher = (profile?.roles.length ?? 0) > 1;

  return (
    <div className="flex min-h-screen bg-milsaca-cream">
      <CorretoraSidebar
        userEmail={user.email ?? "corretora"}
        corretoraName={corretoraName}
        showSwitcher={showSwitcher}
      />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-8 py-10">{children}</div>
      </div>
    </div>
  );
}
