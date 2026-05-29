import { createClient } from "@milsaca/db/web/server";

export type ProdutorListItem = {
  kind: "produtor" | "contato";
  /** id do profile (produtor real) ou do produtor_contatos (sombra) */
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  fazenda_nome: string | null;
  city: string | null;
  state: string | null;
  /** apenas produtor real */
  has_account: boolean;
  /** apenas contato sombra: se já foi reivindicado (claimed_profile_id != null) */
  claimed: boolean;
  qtd_leads: number;
  qtd_contratos: number;
  /** opaco — usado pra ordenar por atividade recente */
  last_activity: string | null;
};

export async function listProdutoresEContatos(
  corretoraId: string,
): Promise<ProdutorListItem[]> {
  const supabase = await createClient();

  // Produtores reais: união de IDs de leads + contratos + favoritos
  const [leadsRows, contratosRows, favoritosRows, contatosRows] =
    await Promise.all([
      supabase
        .from("leads")
        .select("produtor_id, created_at")
        .eq("corretora_id", corretoraId)
        .not("produtor_id", "is", null),
      supabase
        .from("contratos")
        .select("produtor_id, created_at")
        .eq("corretora_id", corretoraId),
      supabase
        .from("favoritos")
        .select("produtor_id, created_at")
        .eq("corretora_id", corretoraId),
      supabase
        .from("produtor_contatos")
        .select(
          "id, full_name, email, phone, fazenda_nome, city, state, claimed_profile_id, created_at, updated_at",
        )
        .eq("corretora_id", corretoraId)
        .order("updated_at", { ascending: false }),
    ]);

  const produtorIds = new Set<string>();
  const lastByProdutor = new Map<string, string>();

  function add(rows: { produtor_id: string | null; created_at: string }[]) {
    for (const r of rows) {
      if (!r.produtor_id) continue;
      produtorIds.add(r.produtor_id);
      const prev = lastByProdutor.get(r.produtor_id);
      if (!prev || r.created_at > prev) {
        lastByProdutor.set(r.produtor_id, r.created_at);
      }
    }
  }
  add(
    (leadsRows.data ?? []) as { produtor_id: string | null; created_at: string }[],
  );
  add(
    (contratosRows.data ?? []) as {
      produtor_id: string | null;
      created_at: string;
    }[],
  );
  add(
    (favoritosRows.data ?? []) as {
      produtor_id: string | null;
      created_at: string;
    }[],
  );

  // Lê profiles + produtores estendido dos IDs encontrados
  const profileIds = Array.from(produtorIds);
  type ProfileRow = {
    id: string;
    full_name: string | null;
    phone: string | null;
    produtores:
      | {
          fazenda_nome: string | null;
          city: string | null;
          state: string | null;
        }
      | {
          fazenda_nome: string | null;
          city: string | null;
          state: string | null;
        }[]
      | null;
  };
  const profilesData: ProfileRow[] =
    profileIds.length === 0
      ? []
      : (
          (
            await supabase
              .from("profiles")
              .select(
                "id, full_name, phone, produtores(fazenda_nome, city, state)",
              )
              .in("id", profileIds)
          ).data ?? []
        ) as ProfileRow[];

  // Contagens por produtor real
  const leadsCount = new Map<string, number>();
  const contratosCount = new Map<string, number>();
  for (const r of (leadsRows.data ?? []) as {
    produtor_id: string | null;
  }[]) {
    if (r.produtor_id)
      leadsCount.set(r.produtor_id, (leadsCount.get(r.produtor_id) ?? 0) + 1);
  }
  for (const r of (contratosRows.data ?? []) as {
    produtor_id: string | null;
  }[]) {
    if (r.produtor_id)
      contratosCount.set(
        r.produtor_id,
        (contratosCount.get(r.produtor_id) ?? 0) + 1,
      );
  }

  // Contagens por contato sombra (leads onde contato_id = contato.id)
  const contatoIds = (contatosRows.data ?? []).map((c) => c.id);
  const leadsPorContato = new Map<string, number>();
  if (contatoIds.length > 0) {
    const { data: leadsCt } = await supabase
      .from("leads")
      .select("contato_id")
      .eq("corretora_id", corretoraId)
      .in("contato_id", contatoIds);
    for (const r of (leadsCt ?? []) as { contato_id: string | null }[]) {
      if (r.contato_id)
        leadsPorContato.set(
          r.contato_id,
          (leadsPorContato.get(r.contato_id) ?? 0) + 1,
        );
    }
  }

  const produtores: ProdutorListItem[] = profilesData.map((p) => {
    const ext = Array.isArray(p.produtores) ? p.produtores[0] : p.produtores;
    return {
      kind: "produtor",
      id: p.id,
      full_name: p.full_name ?? "Sem nome",
      email: null,
      phone: p.phone,
      fazenda_nome: ext?.fazenda_nome ?? null,
      city: ext?.city ?? null,
      state: ext?.state ?? null,
      has_account: true,
      claimed: false,
      qtd_leads: leadsCount.get(p.id) ?? 0,
      qtd_contratos: contratosCount.get(p.id) ?? 0,
      last_activity: lastByProdutor.get(p.id) ?? null,
    };
  });

  const contatos: ProdutorListItem[] = (
    (contatosRows.data ?? []) as Array<{
      id: string;
      full_name: string;
      email: string | null;
      phone: string | null;
      fazenda_nome: string | null;
      city: string | null;
      state: string | null;
      claimed_profile_id: string | null;
      created_at: string;
      updated_at: string;
    }>
  ).map((c) => ({
    kind: "contato",
    id: c.id,
    full_name: c.full_name,
    email: c.email,
    phone: c.phone,
    fazenda_nome: c.fazenda_nome,
    city: c.city,
    state: c.state,
    has_account: false,
    claimed: c.claimed_profile_id != null,
    qtd_leads: leadsPorContato.get(c.id) ?? 0,
    qtd_contratos: 0,
    last_activity: c.updated_at,
  }));

  // Mescla e ordena por última atividade desc, fallback nome
  return [...produtores, ...contatos].sort((a, b) => {
    const la = a.last_activity ?? "";
    const lb = b.last_activity ?? "";
    if (la !== lb) return lb.localeCompare(la);
    return a.full_name.localeCompare(b.full_name, "pt-BR");
  });
}

export async function getContato(corretoraId: string, contatoId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("produtor_contatos")
    .select(
      "id, full_name, email, phone, fazenda_nome, city, state, cpf_cnpj, car, caepf, notes, claimed_profile_id",
    )
    .eq("corretora_id", corretoraId)
    .eq("id", contatoId)
    .maybeSingle();
  return data;
}

export async function getCorretoraNome(
  corretoraId: string,
): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("corretoras")
    .select("name")
    .eq("id", corretoraId)
    .maybeSingle();
  return data?.name ?? "Sua corretora";
}
