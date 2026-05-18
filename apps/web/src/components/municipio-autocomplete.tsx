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
  try {
    const r = await fetch(
      `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`,
      { cache: "force-cache" },
    );
    if (!r.ok) return [];
    const data = (await r.json()) as Municipio[];
    const sorted = data
      .map((m) => ({ id: m.id, nome: m.nome }))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    cacheByUf.set(uf, sorted);
    return sorted;
  } catch {
    return [];
  }
}

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Autocomplete de município brasileiro via API pública do IBGE
 * (sem token, sem custo). Aceita texto livre como fallback — se o
 * user digitar algo que não existe na lista, valor segue salvo.
 *
 * Se `uf` for fornecido, restringe ao estado. Se não, vira input
 * texto puro (autocomplete fica desligado).
 *
 * Quando há um input de UF no mesmo form com `id=ufFieldId`, escuta
 * mudanças dele em tempo real e troca a lista — perfeito pra forms
 * onde UF e cidade ficam lado a lado.
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
  const [currentUf, setCurrentUf] = useState<string | null>(uf?.toUpperCase() ?? null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  // Carrega municípios quando UF muda
  useEffect(() => {
    if (!currentUf || currentUf.length !== 2) {
      setMunicipios([]);
      return;
    }
    fetchMunicipios(currentUf).then(setMunicipios);
  }, [currentUf]);

  // Reage a mudanças no input de UF do mesmo form
  useEffect(() => {
    if (!ufFieldId) return;
    const el = document.getElementById(ufFieldId) as HTMLInputElement | null;
    if (!el) return;
    const handler = () => {
      const v = (el.value ?? "").trim().toUpperCase();
      setCurrentUf(v.length === 2 ? v : null);
    };
    handler();
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
  const suggestions = currentUf && q.length >= 2
    ? municipios
        .filter((m) => normalize(m.nome).includes(q))
        .slice(0, 8)
    : [];

  const showHelp = currentUf && municipios.length === 0;

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
        placeholder={placeholder ?? (currentUf ? "Digite a cidade..." : "Cidade")}
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
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-input bg-white shadow-md"
        >
          {suggestions.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => {
                  setValue(m.nome);
                  setOpen(false);
                }}
                className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-milsaca-cream-escuro/40"
              >
                {m.nome}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {showHelp ? (
        <p className="mt-1 text-[10px] text-slate-400">
          Sem internet pra autocomplete — digite a cidade manualmente.
        </p>
      ) : null}
      {!currentUf ? (
        <p className="mt-1 text-[10px] text-slate-400">
          Preencha a UF primeiro pra sugerir cidades.
        </p>
      ) : null}
    </div>
  );
}
