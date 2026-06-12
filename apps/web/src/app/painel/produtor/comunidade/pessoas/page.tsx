import { ComunidadePessoasPage } from "@/components/social/pages/pessoas";
import type { SocialSearchParams } from "@/components/social/pages/feed";

export const metadata = { title: "Pessoas — Comunidade" };

const BASE = "/painel/produtor/comunidade";

export default function Page({
  searchParams,
}: {
  searchParams: SocialSearchParams;
}) {
  return <ComunidadePessoasPage base={BASE} searchParams={searchParams} />;
}
