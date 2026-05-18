import { requireAppAdmin } from "@/lib/auth";
import { createClient } from "@milsaca/db/web/server";
import { AdminSidebar } from "./_components/sidebar";

export const metadata = {
  title: "Admin — Milsaca",
};

async function loadPendentesCount(): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("status", "pendente")
    .contains("roles", ["corretora"]);
  return count ?? 0;
}

async function loadAdminName(userId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .maybeSingle<{ full_name: string | null }>();
  return data?.full_name ?? null;
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAppAdmin();
  const [pendentesCount, adminName] = await Promise.all([
    loadPendentesCount(),
    loadAdminName(user.id),
  ]);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <AdminSidebar
        adminName={adminName ?? user.email ?? "admin"}
        adminEmail={user.email ?? ""}
        pendentesCount={pendentesCount}
      />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-8 py-10">{children}</div>
      </div>
    </div>
  );
}
