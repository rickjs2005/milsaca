export type UserRole = "produtor" | "corretora" | "admin";

export type ProfileStatus = "ativo" | "pendente" | "bloqueado";

export interface Profile {
  id: string;
  role: UserRole;
  roles: UserRole[];
  status: ProfileStatus;
  corretora_id: string | null;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Corretora {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  state: string | null;
  phone: string | null;
  email: string | null;
  verified: boolean;
  created_at: string;
  updated_at: string;
}

export type LeadStatus =
  | "novo"
  | "em_negociacao"
  | "convertido"
  | "perdido"
  | "arquivado";

export interface Lead {
  id: string;
  corretora_id: string;
  produtor_id: string | null;
  status: LeadStatus;
  coffee_type: string | null;
  bag_count: number | null;
  proposed_price: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type ContratoStatus =
  | "rascunho"
  | "em_analise"
  | "ativo"
  | "finalizado"
  | "cancelado";

export interface Contrato {
  id: string;
  corretora_id: string;
  produtor_id: string;
  lead_id: string | null;
  code: string;
  status: ContratoStatus;
  coffee_type: string | null;
  bag_count: number | null;
  total_value: number | null;
  signed_at: string | null;
  created_at: string;
  updated_at: string;
}

// ===== Domínio do café: lotes + laudo COB =====

export type CoffeeSpecie = "arabica" | "conillon";

export type CoffeeProcesso =
  | "natural"
  | "cereja_descascado"
  | "cd_desmucilado"
  | "despolpado"
  | "fermentacao_induzida";

export type LoteStatus =
  | "rascunho"
  | "aguardando_classificacao"
  | "classificado"
  | "fora_de_tipo"
  | "rebeneficiar"
  | "vendido"
  | "arquivado";

export interface Lote {
  id: string;
  corretora_id: string;
  produtor_id: string;
  codigo: string;
  safra: string | null;
  descricao: string | null;
  specie: CoffeeSpecie;
  processo: CoffeeProcesso | null;
  peso_sacas: number | null;
  peso_kg: number | null;
  umidade_inicial: number | null;
  status: LoteStatus;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClassificacaoCob {
  id: string;
  lote_id: string;
  corretora_id: string;
  classificador_id: string | null;
  total_defeitos: number;
  tipo: string | null;
  pontuacao: number | null;
  fora_de_tipo: boolean;
  fora_de_tipo_motivos: unknown; // string[] no app, jsonb no banco
  schema_version: number;
  defeitos_crus: unknown; // DefeitosCrus do @milsaca/cob
  brocados_por_defeito: number;
  bebida: string | null;
  classe: string | null;
  aspecto: "bom" | "regular" | "mau" | null;
  torra: string | null;
  peneiras: unknown; // Array<{ peneira: string; percentual: number }>
  peneira_dominante: string | null;
  bica_corrida: boolean;
  umidade: number | null;
  pva: number | null;
  impurezas_pct: number | null;
  observacoes: string | null;
  pdf_url: string | null;
  anulada: boolean;
  anulada_motivo: string | null;
  created_at: string;
  updated_at: string;
}

export type { Database } from "./database";
