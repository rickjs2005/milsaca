/**
 * Tipos do banco Supabase.
 *
 * Placeholder até gerar os tipos reais com:
 *   pnpm db:types         # local
 *   pnpm db:types:remote  # remoto
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
