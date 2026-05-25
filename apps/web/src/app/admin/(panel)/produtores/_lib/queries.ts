import { createClient } from "@milsaca/db/web/server";

export type ProdutorListItem = {
  profile_id: string;
  full_name: string | null;
  phone: string | null;
  status: "ativo" | "pendente" | "bloqueado";
  created_at: string;
  fazenda_nome: string | null;
  city: string | null;
  state: string | null;
  area_ha: number | null;
  whatsapp: string | null;
  produtor_status: "sombra" | "ativo" | "pendente" | "bloqueado" | null;
};

export type ProdutorListFilters = {
  state?: string | null;
  search?: string | null;
  status?: string | null;
};

const PAGE_SIZE = 50;

/**
 * Lista produtores cruzando profiles + produtores. Profiles é a fonte
 * de verdade do "usuário"; produtores é o perfil estendido. Pode haver
 * profile sem registro em produtores ainda (signup recente).
 */
export async function listProdutores(
  filters: ProdutorListFilters,
  page: number,
): Promise<{ rows: ProdutorListItem[]; count: number }> {
  const supabase = await createClient();
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let q = supabase
    .from("profiles")
    .select(
      `id, full_name, phone, status, created_at,
       produtores(fazenda_nome, city, state, area_ha, whatsapp, status)`,
      { count: "exact" },
    )
    .contains("roles", ["produtor"])
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters.search) {
    q = q.ilike("full_name", `%${filters.search}%`);
  }
  if (filters.status) {
    q = q.eq("status", filters.status);
  }

  const { data, count } = await q;

  type Joined = {
    id: string;
    full_name: string | null;
    phone: string | null;
    status: "ativo" | "pendente" | "bloqueado";
    created_at: string;
    produtores:
      | {
          fazenda_nome: string | null;
          city: string | null;
          state: string | null;
          area_ha: number | null;
          whatsapp: string | null;
          status: "sombra" | "ativo" | "pendente" | "bloqueado" | null;
        }
      | { fazenda_nome: string | null; city: string | null; state: string | null; area_ha: number | null; whatsapp: string | null; status: "sombra" | "ativo" | "pendente" | "bloqueado" | null }[]
      | null;
  };

  const rows = ((data ?? []) as unknown as Joined[])
    .map((r) => {
      const p = Array.isArray(r.produtores)
        ? r.produtores[0] ?? null
        : r.produtores;
      return {
        profile_id: r.id,
        full_name: r.full_name,
        phone: r.phone,
        status: r.status,
        created_at: r.created_at,
        fazenda_nome: p?.fazenda_nome ?? null,
        city: p?.city ?? null,
        state: p?.state ?? null,
        area_ha: p?.area_ha ?? null,
        whatsapp: p?.whatsapp ?? null,
        produtor_status: p?.status ?? null,
      };
    })
    .filter((r) => {
      if (filters.state) return r.state === filters.state;
      return true;
    });

  return { rows, count: count ?? 0 };
}

export const PRODUTORES_PAGE_SIZE = PAGE_SIZE;

export type ProdutorDetalhe = {
  profile_id: string;
  full_name: string | null;
  phone: string | null;
  status: "ativo" | "pendente" | "bloqueado";
  created_at: string;
  email: string | null;
  // Produtor (extended)
  fazenda_nome: string | null;
  city: string | null;
  state: string | null;
  area_ha: number | null;
  altitude_m: number | null;
  whatsapp: string | null;
  cpf_cnpj: string | null;
  specie: "arabica" | "conilon" | "ambos" | null;
  produtor_status: "sombra" | "ativo" | "pendente" | "bloqueado" | null;
  preco_alvo: number | null;
  // Stats
  leadsCount: number;
  contratosCount: number;
  favoritasCount: number;
};

export async function getProdutorDetalhe(
  profileId: string,
): Promise<ProdutorDetalhe | null> {
  const supabase = await createClient();

  const [profileRes, produtorRes, leadsRes, contratosRes, favoritosRes] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, phone, status, created_at")
        .eq("id", profileId)
        .maybeSingle(),
      supabase
        .from("produtores")
        .select(
          "fazenda_nome, city, state, area_ha, altitude_m, whatsapp, cpf_cnpj, specie, status, preco_alvo",
        )
        .eq("profile_id", profileId)
        .maybeSingle(),
      supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("produtor_id", profileId),
      supabase
        .from("contratos")
        .select("*", { count: "exact", head: true })
        .eq("produtor_id", profileId),
      supabase
        .from("favoritos")
        .select("*", { count: "exact", head: true })
        .eq("produtor_id", profileId),
    ]);

  const profile = profileRes.data;
  if (!profile) return null;
  const p = produtorRes.data;

  return {
    profile_id: profile.id,
    full_name: profile.full_name,
    phone: profile.phone,
    status: profile.status as "ativo" | "pendente" | "bloqueado",
    created_at: profile.created_at,
    email: null, // auth.users.email requer service role; vazio por enquanto
    fazenda_nome: p?.fazenda_nome ?? null,
    city: p?.city ?? null,
    state: p?.state ?? null,
    area_ha: p?.area_ha ?? null,
    altitude_m: p?.altitude_m ?? null,
    whatsapp: p?.whatsapp ?? null,
    cpf_cnpj: p?.cpf_cnpj ?? null,
    specie: p?.specie ?? null,
    produtor_status: p?.status ?? null,
    preco_alvo: p?.preco_alvo ?? null,
    leadsCount: leadsRes.count ?? 0,
    contratosCount: contratosRes.count ?? 0,
    favoritasCount: favoritosRes.count ?? 0,
  };
}

export type ProdutorRelLead = {
  id: string;
  status: string;
  coffee_type: string | null;
  bag_count: number | null;
  proposed_price: number | null;
  created_at: string;
  corretora: { id: string; name: string } | null;
};

export async function listProdutorLeads(
  profileId: string,
  limit = 20,
): Promise<ProdutorRelLead[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("leads")
    .select(
      "id, status, coffee_type, bag_count, proposed_price, created_at, corretora_id, corretoras(id, name)",
    )
    .eq("produtor_id", profileId)
    .order("created_at", { ascending: false })
    .limit(limit);

  type Row = {
    id: string;
    status: string;
    coffee_type: string | null;
    bag_count: number | null;
    proposed_price: number | null;
    created_at: string;
    corretora_id: string;
    corretoras: { id: string; name: string } | { id: string; name: string }[] | null;
  };
  return ((data ?? []) as unknown as Row[]).map((r) => ({
    id: r.id,
    status: r.status,
    coffee_type: r.coffee_type,
    bag_count: r.bag_count,
    proposed_price: r.proposed_price,
    created_at: r.created_at,
    corretora: Array.isArray(r.corretoras)
      ? r.corretoras[0] ?? null
      : r.corretoras,
  }));
}

export type ProdutorRelContrato = {
  id: string;
  code: string;
  status: string;
  bag_count: number | null;
  total_value: number | null;
  signed_at: string | null;
  created_at: string;
  corretora: { id: string; name: string } | null;
};

export async function listProdutorContratos(
  profileId: string,
  limit = 20,
): Promise<ProdutorRelContrato[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("contratos")
    .select(
      "id, code, status, bag_count, total_value, signed_at, created_at, corretora_id, corretoras(id, name)",
    )
    .eq("produtor_id", profileId)
    .order("created_at", { ascending: false })
    .limit(limit);

  type Row = {
    id: string;
    code: string;
    status: string;
    bag_count: number | null;
    total_value: number | null;
    signed_at: string | null;
    created_at: string;
    corretora_id: string;
    corretoras: { id: string; name: string } | { id: string; name: string }[] | null;
  };
  return ((data ?? []) as unknown as Row[]).map((r) => ({
    id: r.id,
    code: r.code,
    status: r.status,
    bag_count: r.bag_count,
    total_value: r.total_value,
    signed_at: r.signed_at,
    created_at: r.created_at,
    corretora: Array.isArray(r.corretoras)
      ? r.corretoras[0] ?? null
      : r.corretoras,
  }));
}
