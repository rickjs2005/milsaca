import { ComunidadePerfilPage } from "@/components/social/pages/perfil";
import type { SocialSearchParams } from "@/components/social/pages/feed";

export const metadata = { title: "Perfil — Comunidade" };

const BASE = "/painel/corretora/comunidade";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: SocialSearchParams;
}) {
  const { id } = await params;
  return (
    <ComunidadePerfilPage base={BASE} perfilId={id} searchParams={searchParams} />
  );
}
