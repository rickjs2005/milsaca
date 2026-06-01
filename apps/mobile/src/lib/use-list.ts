// useList — padrão de carregamento de dados das telas do painel mobile.
//
// Encapsula o ciclo `fetch + loading + error + pull-to-refresh` que estava
// duplicado em ~9 telas, e resolve dois bugs que vinham junto com a cópia:
//   1. setState após unmount / corrida: cada chamada recebe um id; respostas
//      de chamadas antigas (ou após desmontar) são descartadas, então trocar
//      de filtro rápido ou sair da tela não sobrescreve dados nem avisa o RN.
//   2. `refreshing` travado: o reset fica em `finally`, então se o fetcher
//      lançar o spinner sempre volta a `false`.
//
// O `fetcher` deve retornar os dados; retornar `undefined` é tratado como
// "ainda não dá pra carregar" (ex.: `if (!profile) return`) e mantém o estado
// atual. `deps` segue a semântica do useCallback: quando muda, recarrega.

import { useCallback, useEffect, useRef, useState } from "react";
import type { DependencyList, Dispatch, SetStateAction } from "react";

export interface UseListResult<T> {
  /** Dados carregados, ou `null` enquanto o primeiro fetch não resolve. */
  data: T | null;
  /** Mensagem de erro do último carregamento, ou `null`. */
  error: string | null;
  /** `true` durante um pull-to-refresh (não no carregamento inicial). */
  refreshing: boolean;
  /** Recarrega sem ativar o spinner de refresh (use no botão "Tentar de novo"). */
  reload: () => Promise<void>;
  /** Recarrega ativando o spinner de refresh (use no RefreshControl). */
  onRefresh: () => Promise<void>;
  /** Atualização local/otimista dos dados (ex.: favoritar, remover item). */
  setData: Dispatch<SetStateAction<T | null>>;
}

export function useList<T>(
  fetcher: () => Promise<T | undefined>,
  deps: DependencyList,
  fallbackError = "Não conseguimos carregar os dados.",
): UseListResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const mounted = useRef(true);
  const runId = useRef(0);
  // Mantém o fetcher mais recente sem retriggar o efeito de load: o efeito só
  // re-dispara quando `deps` muda (igual ao useCallback original), mas a
  // chamada sempre usa a closure atual (props/estado mais recentes).
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const fallbackRef = useRef(fallbackError);
  fallbackRef.current = fallbackError;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(
    async (mode: "load" | "refresh") => {
      const callId = ++runId.current;
      // Descarta se o componente desmontou ou se uma chamada mais nova começou.
      const stale = () => !mounted.current || callId !== runId.current;
      setError(null);
      if (mode === "refresh") setRefreshing(true);
      try {
        const result = await fetcherRef.current();
        if (stale()) return;
        if (result !== undefined) setData(result);
      } catch (err) {
        if (stale()) return;
        setError(err instanceof Error ? err.message : fallbackRef.current);
      } finally {
        if (mounted.current && mode === "refresh") setRefreshing(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps,
  );

  useEffect(() => {
    run("load");
  }, [run]);

  const reload = useCallback(() => run("load"), [run]);
  const onRefresh = useCallback(() => run("refresh"), [run]);

  return { data, error, refreshing, reload, onRefresh, setData };
}
