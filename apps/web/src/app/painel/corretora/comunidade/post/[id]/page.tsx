import { ComunidadePostPage } from "@/components/social/pages/post";

export const metadata = { title: "Publicação — Comunidade" };

const BASE = "/painel/corretora/comunidade";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ComunidadePostPage base={BASE} postId={id} />;
}
