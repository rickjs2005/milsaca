"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export type MobileFilterOption = {
  value: string;
  label: string;
  count?: number;
};

/**
 * Seletor de filtro responsivo pro mobile.
 *
 * Espelha o comportamento das "pills" do desktop (que navegam por `<Link>`),
 * mas como um `<select>` nativo — melhor pra telas estreitas. Ao mudar, monta
 * a URL preservando os demais query params já presentes; value "" remove o param.
 */
export function MobileFilterSelect({
  label,
  options,
  current,
  paramName,
  className,
}: {
  label: string;
  options: MobileFilterOption[];
  current: string;
  paramName: string;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(paramName, value);
    else params.delete(paramName);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <label className={cn("flex flex-col gap-1", className)}>
      <span className="text-caption font-medium text-neutral-600">{label}</span>
      <select
        value={current}
        onChange={onChange}
        className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-body-sm text-milsaca-cafezal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {options.map((o) => (
          <option key={o.value || "all"} value={o.value}>
            {o.count != null ? `${o.label} (${o.count})` : o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
