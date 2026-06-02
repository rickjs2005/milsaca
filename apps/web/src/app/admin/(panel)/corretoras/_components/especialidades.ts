// Especialidades curadas da corretora — exibidas como prova social na página
// pública (/c/[slug]) e editáveis no form do admin. Armazenadas como text[]
// com os próprios rótulos (sem mapa de tradução): o que o admin marca é o que
// o produtor vê.
export const ESPECIALIDADES_OPCOES: string[] = [
  "Arábica",
  "Conilón",
  "Café Especial",
  "Orgânico",
  "Cereja Descascado",
  "Natural",
  "Microlote",
  "Certificado",
];

const VALID = new Set(ESPECIALIDADES_OPCOES);

/** Mantém só valores conhecidos, na ordem canônica, sem duplicar. */
export function sanitizeEspecialidades(values: string[]): string[] {
  const set = new Set(values.filter((v) => VALID.has(v)));
  return ESPECIALIDADES_OPCOES.filter((o) => set.has(o));
}
