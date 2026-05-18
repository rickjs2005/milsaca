import { Toaster } from "sonner";
import { requireAppAdmin } from "@/lib/auth";
import { createClient } from "@milsaca/db/web/server";
import { AdminShell } from "./_components/admin-shell";
import { ToastFromSearchParams } from "./_components/toast-from-search-params";

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
    <>
      <AdminShell
        adminName={adminName ?? user.email ?? "admin"}
        adminEmail={user.email ?? ""}
        pendentesCount={pendentesCount}
      >
        {children}
      </AdminShell>
      <ToastFromSearchParams />
      <Toaster richColors position="top-right" />
    </>
  );
}
