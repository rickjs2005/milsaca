import {
  ComunidadeFeedPage,
  type SocialSearchParams,
} from "@/components/social/pages/feed";

export const metadata = { title: "Comunidade — Painel da corretora" };

const BASE = "/painel/corretora/comunidade";

export default function Page({
  searchParams,
}: {
  searchParams: SocialSearchParams;
}) {
  return <ComunidadeFeedPage base={BASE} searchParams={searchParams} />;
}
