import { createClient } from "@milsaca/db/web/server";
import type { RegiaoCafeeira } from "@/app/admin/(panel)/corretoras/_components/regioes";

export type CorretoraListItem = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  state: string | null;
  phone: string | null;
  email: string | null;
  verified: boolean;
  regioes_atendimento: RegiaoCafeeira[];
  lat: number | null;
  lng: number | null;
  is_favorita: boolean;
  qtd_negociacoes: number;
  qtd_contratos: number;
};

/**
 * Lista corretoras pra produtor a partir da view `corretoras_publicas`
 * (não vaza cnpj/endereço/IE/CEP), marcando favoritas e contagens de
 * leads/contratos em que o produtor participou.
 */
export async function listCorretorasParaProdutor(
  produtorId: string,
): Promise<CorretoraListItem[]> {
  const supabase = await createClient();

  const [corretorasRes, favoritosRes, leadsRes, contratosRes] =
    await Promise.all([
      supabase
        .from("corretoras_publicas")
        .select(
          "id, name, slug, city, state, phone, email, verified, regioes_atendimento, lat, lng",
        )
        .order("verified", { ascending: false })
        .order("name", { ascending: true })
        .limit(500),
      supabase
        .from("favoritos")
        .select("corretora_id")
        .eq("produtor_id", produtorId),
      supabase
        .from("leads")
        .select("corretora_id")
        .eq("produtor_id", produtorId),
      supabase
        .from("contratos")
        .select("corretora_id")
        .eq("produtor_id", produtorId),
    ]);

  const favoritas = new Set(
    ((favoritosRes.data ?? []) as { corretora_id: string }[]).map(
      (r) => r.corretora_id,
    ),
  );
  const leadsCount = new Map<string, number>();
  for (const r of (leadsRes.data ?? []) as { corretora_id: string }[]) {
    leadsCount.set(r.corretora_id, (leadsCount.get(r.corretora_id) ?? 0) + 1);
  }
  const contratosCount = new Map<string, number>();
  for (const r of (contratosRes.data ?? []) as { corretora_id: string }[]) {
    contratosCount.set(
      r.corretora_id,
      (contratosCount.get(r.corretora_id) ?? 0) + 1,
    );
  }

  type Row = {
    id: string | null;
    name: string | null;
    slug: string | null;
    city: string | null;
    state: string | null;
    phone: string | null;
    email: string | null;
    verified: boolean | null;
    regioes_atendimento: RegiaoCafeeira[] | null;
    lat: number | string | null;
    lng: number | string | null;
  };

  const rows = ((corretorasRes.data ?? []) as Row[])
    .filter((c): c is Row & { id: string; name: string; slug: string } =>
      !!c.id && !!c.name && !!c.slug,
    )
    .map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      city: c.city,
      state: c.state,
      phone: c.phone,
      email: c.email,
      verified: c.verified ?? false,
      regioes_atendimento: c.regioes_atendimento ?? [],
      lat: c.lat != null ? Number(c.lat) : null,
      lng: c.lng != null ? Number(c.lng) : null,
      is_favorita: favoritas.has(c.id),
      qtd_negociacoes: leadsCount.get(c.id) ?? 0,
      qtd_contratos: contratosCount.get(c.id) ?? 0,
    }));

  // Favoritas no topo, mantendo a ordem alfabética intra-grupos.
  return rows.sort((a, b) => {
    if (a.is_favorita !== b.is_favorita) return a.is_favorita ? -1 : 1;
    if (a.verified !== b.verified) return a.verified ? -1 : 1;
    return a.name.localeCompare(b.name, "pt-BR");
  });
}
