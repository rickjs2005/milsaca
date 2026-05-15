export type UserRole = "produtor" | "corretora" | "admin";

export interface Profile {
  id: string;
  role: UserRole;
  roles: UserRole[];
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

export type { Database } from "./database";
