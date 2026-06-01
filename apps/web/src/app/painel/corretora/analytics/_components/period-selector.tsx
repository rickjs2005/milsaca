"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/utils";
import { PERIODS, PERIOD_LABEL, type Period } from "../_lib/period";

/**
 * Seletor de período GLOBAL do Analytics. Grava em `?periodo=` (estado na URL)
 * e deixa o server component recalcular tudo. Pills no desktop, select no
 * mobile (economia de espaço).
 */
export function PeriodSelector({ value }: { value: Period }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  function setPeriod(p: Period) {
    const next = new URLSearchParams(params.toString());
    next.set("periodo", p);
    startTransition(() => {
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    });
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2",
        pending && "pointer-events-none opacity-60",
      )}
    >
      {/* DESKTOP: pills */}
      <div className="hidden items-center gap-1 rounded-pill border border-neutral-200 bg-white p-1 sm:flex">
        {PERIODS.map((p) => {
          const active = value === p;
          return (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              aria-pressed={active}
              className={cn(
                "rounded-pill px-3 py-1 text-caption font-medium transition-colors",
                active
                  ? "bg-milsaca-cafezal text-milsaca-cream"
                  : "text-neutral-600 hover:text-milsaca-cafezal",
              )}
            >
              {PERIOD_LABEL[p]}
            </button>
          );
        })}
      </div>

      {/* MOBILE: select */}
      <select
        aria-label="Período"
        value={value}
        onChange={(e) => setPeriod(e.target.value as Period)}
        className="h-10 rounded-md border border-neutral-200 bg-white px-3 text-body-sm text-milsaca-cafezal outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/40 sm:hidden"
      >
        {PERIODS.map((p) => (
          <option key={p} value={p}>
            {PERIOD_LABEL[p]}
          </option>
        ))}
      </select>
    </div>
  );
}
