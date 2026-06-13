"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Input } from "@/components/ui/input";

type Props = {
  /** Nome do campo no form (vai pra FormData). */
  name: string;
  /** Valor inicial. */
  defaultValue?: string;
  /** UF (2 letras) que filtra a busca. Sem UF, autocomplete fica off. */
  uf?: string | null;
  placeholder?: string;
  required?: boolean;
  /** ID do input do estado pra fazer reactivity quando o UF muda. */
  ufFieldId?: string;
};

type Municipio = { id: number; nome: string };

// Cache global por UF (vive enquanto a aba existe) — evita refetch
// quando o user troca de campo e volta.
const cacheByUf = new Map<string, Municipio[]>();

async function fetchMunicipios(uf: string): Promise<Municipio[]> {
  const cached = cacheByUf.get(uf);
  if (cached) return cached;
  const r = await fetch(
    `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`,
    { cache: "force-cache" },
  );
  if (!r.ok) throw new Error(`IBGE ${r.status}`);
  const data = (await r.json()) as Municipio[];
  const sorted = data
    .map((m) => ({ id: m.id, nome: m.nome }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  cacheByUf.set(uf, sorted);
  return sorted;
}

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Seletor de município brasileiro via API pública do IBGE (sem token,
 * sem custo). Ao escolher a UF e tocar no campo, a lista de cidades
 * daquele estado abre na hora — dá pra rolar e tocar, ou digitar pra
 * filtrar. Aceita texto livre como fallback (se a lista não carregar,
 * o valor digitado segue salvo).
 *
 * Quando há um input de UF no mesmo form com `id=ufFieldId`, escuta
 * mudanças dele em tempo real e troca a lista.
 */
export function MunicipioAutocomplete({
  name,
  defaultValue,
  uf,
  placeholder,
  required,
  ufFieldId,
}: Props) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [open, setOpen] = useState(false);
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [currentUf, setCurrentUf] = useState<string | null>(uf?.toUpperCase() ?? null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  // Carrega municípios quando a UF muda
  useEffect(() => {
    if (!currentUf || currentUf.length !== 2) {
      setMunicipios([]);
      setFailed(false);
      return;
    }
    let active = true;
    setLoading(true);
    setFailed(false);
    fetchMunicipios(currentUf)
      .then((list) => {
        if (active) setMunicipios(list);
      })
      .catch(() => {
        if (active) {
          setMunicipios([]);
          setFailed(true);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [currentUf]);

  // Reage a mudanças no input de UF do mesmo form
  useEffect(() => {
    if (!ufFieldId) return;
    const el = document.getElementById(ufFieldId) as HTMLInputElement | HTMLSelectElement | null;
    if (!el) return;
    const handler = () => {
      const v = (el.value ?? "").trim().toUpperCase();
      setCurrentUf(v.length === 2 ? v : null);
      // Troca de estado: limpa a cidade pra não ficar incoerente.
      setValue("");
    };
    el.addEventListener("input", handler);
    el.addEventListener("change", handler);
    return () => {
      el.removeEventListener("input", handler);
      el.removeEventListener("change", handler);
    };
  }, [ufFieldId]);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const q = normalize(value);
  // Com UF definida, mostra a lista mesmo sem digitar (abre ao focar).
  // Digitar filtra. Limita a 60 itens pra manter o dropdown leve.
  const matches = currentUf
    ? municipios.filter((m) => q.length === 0 || normalize(m.nome).includes(q))
    : [];
  const suggestions = matches.slice(0, 60);
  const hasMore = matches.length > suggestions.length;

  return (
    <div ref={containerRef} className="relative">
      <Input
        name={name}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder ?? (currentUf ? "Toque para escolher a cidade" : "Cidade")}
        required={required}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
      />
      {open && suggestions.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-md border border-input bg-white shadow-elevated"
        >
          {suggestions.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setValue(m.nome);
                  setOpen(false);
                }}
                className="block w-full px-3 py-2.5 text-left text-sm text-neutral-700 hover:bg-milsaca-cream-escuro/40"
              >
                {m.nome}
              </button>
            </li>
          ))}
          {hasMore ? (
            <li className="px-3 py-2 text-[11px] text-neutral-400">
              Digite para filtrar mais cidades…
            </li>
          ) : null}
        </ul>
      ) : null}
      {loading ? (
        <p className="mt-1 text-[11px] text-neutral-400">Carregando cidades de {currentUf}…</p>
      ) : failed ? (
        <p className="mt-1 text-[11px] text-neutral-400">
          Não consegui carregar a lista — pode digitar a cidade manualmente.
        </p>
      ) : !currentUf ? (
        <p className="mt-1 text-[11px] text-neutral-400">Escolha a UF primeiro pra listar as cidades.</p>
      ) : null}
    </div>
  );
}
