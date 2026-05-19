import Image from "next/image";
import logo from "@/app/icon.png";

/**
 * Logo MilSaca em PNG (saco + grão + seta + wordmark).
 *
 * Usado em páginas públicas centralizadas (auth, onboarding, aguardando).
 * Pra header de sidebar do painel, mantém o padrão Coffee+texto inline
 * porque o PNG completo é alto demais pra um header compacto.
 *
 * Tamanho padrão 160px casa bem com hero das páginas de auth.
 */
type Props = {
  size?: number;
  priority?: boolean;
  className?: string;
};

export function MilsacaLogo({
  size = 160,
  priority = false,
  className,
}: Props) {
  return (
    <Image
      src={logo}
      alt="MilSaca — Corretagem de café"
      width={size}
      height={size}
      priority={priority}
      placeholder="blur"
      className={className}
    />
  );
}
