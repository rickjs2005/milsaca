"use client";

// useUrlFilter — helpers de href pras telas-lista da corretora cujo estado de
// filtro/paginação vive na URL (lido no server). Encapsula o par
// `filterHref` + `pageHref` que estava copiado byte-a-byte em 7 views.
//
// `filterHref(key, value)` define/limpa uma chave de filtro e SEMPRE zera a
// paginação (`page`) — antes isso era feito à mão em cada view, e a cópia já
// tinha divergido (cotacoes-view não fazia o `delete("page")`). Centralizar
// garante o reset e evita a divergência voltar.
//
// Retorna também `pathname` e `params` porque as views ainda usam o pathname
// pra "limpar filtros" (`router.push(pathname)`).

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export function useUrlFilter() {
  const pathname = usePathname();
  const params = useSearchParams();

  const filterHref = useCallback(
    (key: string, value: string): string => {
      const next = new URLSearchParams(params.toString());
      if (value) next.set(key, value);
      else next.delete(key);
      next.delete("page");
      const qs = next.toString();
      return qs ? `${pathname}?${qs}` : pathname;
    },
    [params, pathname],
  );

  const pageHref = useCallback(
    (p: number): string => {
      const next = new URLSearchParams(params.toString());
      if (p > 1) next.set("page", String(p));
      else next.delete("page");
      const qs = next.toString();
      return qs ? `${pathname}?${qs}` : pathname;
    },
    [params, pathname],
  );

  return { pathname, params, filterHref, pageHref };
}
