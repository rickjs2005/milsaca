import { createClient } from "@milsaca/db/web/server";

/**
 * Estado do programa de fundadoras (5 primeiras corretoras grátis vitalício).
 * Lê a RPC pública `founder_program_status` — necessária porque
 * `platform_settings` não é legível por anon e a página /cadastrar é pública.
 */
export type FounderProgramStatus = {
  open: boolean; // flag manual (admin abre/fecha em /admin/configuracoes)
  total: number; // total de vagas
  used: number; // fundadoras ativas hoje
  slotsLeft: number;
  accepting: boolean; // open && ainda há vaga
};

export async function getFounderProgramStatus(): Promise<FounderProgramStatus> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("founder_program_status");

  const raw = (data ?? {}) as { open?: boolean; total?: number; used?: number };
  const open = raw.open ?? true;
  const total = typeof raw.total === "number" ? raw.total : 5;
  const used = typeof raw.used === "number" ? raw.used : 0;
  const slotsLeft = Math.max(0, total - used);

  return { open, total, used, slotsLeft, accepting: open && slotsLeft > 0 };
}
