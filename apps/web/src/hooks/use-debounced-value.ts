"use client";

// useDebouncedValue / useDebouncedCallback — debounce reutilizável que estava
// reimplementado à mão com setTimeout/clearTimeout em dois lugares (filter-bar
// e command-palette). Centraliza o agendamento + cleanup do timer pra cada
// call-site só dizer "o quê" e "depois de quanto tempo".
//
// - useDebouncedValue: atrasa a propagação de um valor; o retorno só muda
//   `delayMs` após o valor parar de mudar. Bom pra busca textual em URL.
// - useDebouncedCallback: retorna uma versão debounced de um callback; cada
//   chamada reinicia o timer e só a última dispara. Bom quando o efeito do
//   debounce é uma ação (ex.: disparar busca dentro de startTransition), não
//   um valor derivado.

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Retorna `value` atrasado em `delayMs`. Reagenda a cada mudança e limpa o
 * timer no unmount / antes de reagendar.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);

  return debounced;
}

/**
 * Retorna uma versão debounced de `fn`: cada chamada reinicia o timer e só a
 * última sobrevive. Mantém uma ref pra `fn` (sempre chama a versão atual sem
 * recriar o callback) e limpa o timer pendente no unmount.
 */
export function useDebouncedCallback<A extends unknown[]>(
  fn: (...args: A) => void,
  delayMs: number,
): (...args: A) => void {
  const fnRef = useRef(fn);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return useCallback(
    (...args: A) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        fnRef.current(...args);
      }, delayMs);
    },
    [delayMs],
  );
}
