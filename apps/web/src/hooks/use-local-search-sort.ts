"use client";

// useLocalSearchSort — busca textual + ordenação client-side das telas-lista da
// corretora. Encapsula o esqueleto repetido em ~9 views: estado de `query` e
// `sort`, o `trim().toLowerCase()`, o atalho "sem busca = mantém tudo", o
// `campos.join(" ").toLowerCase().includes(q)` e o `[...list].sort(...)`.
//
// Cada view só descreve o que é específico dela:
//   - `searchFields(item)` — campos que entram na busca (null/undefined viram
//     "" no join, então pode passar `item.codigo ?? null` direto).
//   - `compare(a, b, sortKey)` — comparador por chave de ordenação.
//   - `filter(item)` — predicado extra opcional (filtros que não vêm da busca,
//     ex.: tipo/status/urgência ou filtros vindos da URL via `current.*`).
//
// `deps` lista os valores reativos lidos por `filter`/`compare`/`searchFields`
// além de item/query/sort (ex.: `[tipo]`, `[current, cotacoesBySpecie]`) — é o
// que dispara o recálculo, igual às deps do useMemo original de cada view.

import { useMemo, useState } from "react";
import type { DependencyList } from "react";

export interface LocalSearchSortConfig<T, S extends string> {
  initialSort: S;
  searchFields: (item: T) => Array<string | null | undefined>;
  compare: (a: T, b: T, sortKey: S) => number;
  filter?: (item: T) => boolean;
}

export function useLocalSearchSort<T, S extends string>(
  items: T[],
  config: LocalSearchSortConfig<T, S>,
  deps: DependencyList = [],
) {
  const { initialSort, searchFields, compare, filter } = config;
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<S>(initialSort);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = items.filter((item) => {
      if (filter && !filter(item)) return false;
      if (!q) return true;
      return searchFields(item).join(" ").toLowerCase().includes(q);
    });
    return [...list].sort((a, b) => compare(a, b, sort));
    // deps cobrem os valores reativos extras; o resto é capturado a cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, query, sort, ...deps]);

  return { query, setQuery, sort, setSort, filtered };
}
