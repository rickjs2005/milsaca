export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          corretora_id: string | null
          created_at: string
          entity: string
          entity_id: string | null
          id: string
          payload: Json
        }
        Insert: {
          action: string
          actor_id?: string | null
          corretora_id?: string | null
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: string
          payload?: Json
        }
        Update: {
          action?: string
          actor_id?: string | null
          corretora_id?: string | null
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: string
          payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_corretora_id_fkey"
            columns: ["corretora_id"]
            isOneToOne: false
            referencedRelation: "corretoras"
            referencedColumns: ["id"]
          },
        ]
      }
      classificacoes_cob: {
        Row: {
          anulada: boolean
          anulada_motivo: string | null
          aspecto: string | null
          bebida: string | null
          bica_corrida: boolean
          brocados_por_defeito: number
          classe: string | null
          classificador_id: string | null
          corretora_id: string
          created_at: string
          defeitos_crus: Json
          fora_de_tipo: boolean
          fora_de_tipo_motivos: Json
          id: string
          impurezas_pct: number | null
          lote_id: string
          observacoes: string | null
          pdf_url: string | null
          peneira_dominante: string | null
          peneiras: Json
          pontuacao: number | null
          pva: number | null
          schema_version: number
          tipo: string | null
          torra: string | null
          total_defeitos: number
          umidade: number | null
          updated_at: string
        }
        Insert: {
          anulada?: boolean
          anulada_motivo?: string | null
          aspecto?: string | null
          bebida?: string | null
          bica_corrida?: boolean
          brocados_por_defeito?: number
          classe?: string | null
          classificador_id?: string | null
          corretora_id: string
          created_at?: string
          defeitos_crus: Json
          fora_de_tipo?: boolean
          fora_de_tipo_motivos?: Json
          id?: string
          impurezas_pct?: number | null
          lote_id: string
          observacoes?: string | null
          pdf_url?: string | null
          peneira_dominante?: string | null
          peneiras?: Json
          pontuacao?: number | null
          pva?: number | null
          schema_version?: number
          tipo?: string | null
          torra?: string | null
          total_defeitos: number
          umidade?: number | null
          updated_at?: string
        }
        Update: {
          anulada?: boolean
          anulada_motivo?: string | null
          aspecto?: string | null
          bebida?: string | null
          bica_corrida?: boolean
          brocados_por_defeito?: number
          classe?: string | null
          classificador_id?: string | null
          corretora_id?: string
          created_at?: string
          defeitos_crus?: Json
          fora_de_tipo?: boolean
          fora_de_tipo_motivos?: Json
          id?: string
          impurezas_pct?: number | null
          lote_id?: string
          observacoes?: string | null
          pdf_url?: string | null
          peneira_dominante?: string | null
          peneiras?: Json
          pontuacao?: number | null
          pva?: number | null
          schema_version?: number
          tipo?: string | null
          torra?: string | null
          total_defeitos?: number
          umidade?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "classificacoes_cob_classificador_id_fkey"
            columns: ["classificador_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classificacoes_cob_corretora_id_fkey"
            columns: ["corretora_id"]
            isOneToOne: false
            referencedRelation: "corretoras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classificacoes_cob_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
        ]
      }
      contratos: {
        Row: {
          bag_count: number | null
          code: string
          coffee_type: string | null
          corretora_id: string
          created_at: string
          id: string
          lead_id: string | null
          produtor_id: string
          signed_at: string | null
          status: Database["public"]["Enums"]["contrato_status"]
          total_value: number | null
          updated_at: string
        }
        Insert: {
          bag_count?: number | null
          code: string
          coffee_type?: string | null
          corretora_id: string
          created_at?: string
          id?: string
          lead_id?: string | null
          produtor_id: string
          signed_at?: string | null
          status?: Database["public"]["Enums"]["contrato_status"]
          total_value?: number | null
          updated_at?: string
        }
        Update: {
          bag_count?: number | null
          code?: string
          coffee_type?: string | null
          corretora_id?: string
          created_at?: string
          id?: string
          lead_id?: string | null
          produtor_id?: string
          signed_at?: string | null
          status?: Database["public"]["Enums"]["contrato_status"]
          total_value?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contratos_corretora_id_fkey"
            columns: ["corretora_id"]
            isOneToOne: false
            referencedRelation: "corretoras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_produtor_id_fkey"
            columns: ["produtor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      corretoras: {
        Row: {
          city: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          slug: string
          state: string | null
          updated_at: string
          verified: boolean
        }
        Insert: {
          city?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          slug: string
          state?: string | null
          updated_at?: string
          verified?: boolean
        }
        Update: {
          city?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          slug?: string
          state?: string | null
          updated_at?: string
          verified?: boolean
        }
        Relationships: []
      }
      cotacoes: {
        Row: {
          coffee_type: string
          created_at: string
          id: string
          payload: Json
          price: number
          reference_date: string
          region: string | null
          source: string | null
        }
        Insert: {
          coffee_type: string
          created_at?: string
          id?: string
          payload?: Json
          price: number
          reference_date: string
          region?: string | null
          source?: string | null
        }
        Update: {
          coffee_type?: string
          created_at?: string
          id?: string
          payload?: Json
          price?: number
          reference_date?: string
          region?: string | null
          source?: string | null
        }
        Relationships: []
      }
      favoritos: {
        Row: {
          corretora_id: string
          created_at: string
          id: string
          produtor_id: string
        }
        Insert: {
          corretora_id: string
          created_at?: string
          id?: string
          produtor_id: string
        }
        Update: {
          corretora_id?: string
          created_at?: string
          id?: string
          produtor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favoritos_corretora_id_fkey"
            columns: ["corretora_id"]
            isOneToOne: false
            referencedRelation: "corretoras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favoritos_produtor_id_fkey"
            columns: ["produtor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_events: {
        Row: {
          actor_id: string | null
          corretora_id: string
          created_at: string
          id: string
          kind: string
          lead_id: string
          payload: Json
        }
        Insert: {
          actor_id?: string | null
          corretora_id: string
          created_at?: string
          id?: string
          kind: string
          lead_id: string
          payload?: Json
        }
        Update: {
          actor_id?: string | null
          corretora_id?: string
          created_at?: string
          id?: string
          kind?: string
          lead_id?: string
          payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "lead_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_events_corretora_id_fkey"
            columns: ["corretora_id"]
            isOneToOne: false
            referencedRelation: "corretoras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          bag_count: number | null
          coffee_type: string | null
          corretora_id: string
          created_at: string
          id: string
          notes: string | null
          produtor_id: string | null
          proposed_price: number | null
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string
        }
        Insert: {
          bag_count?: number | null
          coffee_type?: string | null
          corretora_id: string
          created_at?: string
          id?: string
          notes?: string | null
          produtor_id?: string | null
          proposed_price?: number | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Update: {
          bag_count?: number | null
          coffee_type?: string | null
          corretora_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          produtor_id?: string | null
          proposed_price?: number | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_corretora_id_fkey"
            columns: ["corretora_id"]
            isOneToOne: false
            referencedRelation: "corretoras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_produtor_id_fkey"
            columns: ["produtor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lotes: {
        Row: {
          codigo: string
          corretora_id: string
          created_at: string
          descricao: string | null
          id: string
          observacoes: string | null
          peso_kg: number | null
          peso_sacas: number | null
          processo: Database["public"]["Enums"]["coffee_processo"] | null
          produtor_id: string
          safra: string | null
          specie: Database["public"]["Enums"]["coffee_specie"]
          status: Database["public"]["Enums"]["lote_status"]
          umidade_inicial: number | null
          updated_at: string
        }
        Insert: {
          codigo: string
          corretora_id: string
          created_at?: string
          descricao?: string | null
          id?: string
          observacoes?: string | null
          peso_kg?: number | null
          peso_sacas?: number | null
          processo?: Database["public"]["Enums"]["coffee_processo"] | null
          produtor_id: string
          safra?: string | null
          specie: Database["public"]["Enums"]["coffee_specie"]
          status?: Database["public"]["Enums"]["lote_status"]
          umidade_inicial?: number | null
          updated_at?: string
        }
        Update: {
          codigo?: string
          corretora_id?: string
          created_at?: string
          descricao?: string | null
          id?: string
          observacoes?: string | null
          peso_kg?: number | null
          peso_sacas?: number | null
          processo?: Database["public"]["Enums"]["coffee_processo"] | null
          produtor_id?: string
          safra?: string | null
          specie?: Database["public"]["Enums"]["coffee_specie"]
          status?: Database["public"]["Enums"]["lote_status"]
          umidade_inicial?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lotes_corretora_id_fkey"
            columns: ["corretora_id"]
            isOneToOne: false
            referencedRelation: "corretoras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lotes_produtor_id_fkey"
            columns: ["produtor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          data: Json
          id: string
          kind: Database["public"]["Enums"]["notification_kind"]
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          data?: Json
          id?: string
          kind: Database["public"]["Enums"]["notification_kind"]
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          data?: Json
          id?: string
          kind?: Database["public"]["Enums"]["notification_kind"]
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      produtores: {
        Row: {
          altitude_m: number | null
          area_ha: number | null
          city: string | null
          created_at: string
          fazenda_nome: string | null
          id: string
          preferencias: Json
          profile_id: string
          state: string | null
          updated_at: string
        }
        Insert: {
          altitude_m?: number | null
          area_ha?: number | null
          city?: string | null
          created_at?: string
          fazenda_nome?: string | null
          id?: string
          preferencias?: Json
          profile_id: string
          state?: string | null
          updated_at?: string
        }
        Update: {
          altitude_m?: number | null
          area_ha?: number | null
          city?: string | null
          created_at?: string
          fazenda_nome?: string | null
          id?: string
          preferencias?: Json
          profile_id?: string
          state?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "produtores_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          corretora_id: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          roles: Database["public"]["Enums"]["user_role"][]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          corretora_id?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          roles?: Database["public"]["Enums"]["user_role"][]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          corretora_id?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          roles?: Database["public"]["Enums"]["user_role"][]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_corretora_id_fkey"
            columns: ["corretora_id"]
            isOneToOne: false
            referencedRelation: "corretoras"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_corretora: { Args: never; Returns: string }
      current_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      current_roles: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"][]
      }
      is_admin: { Args: never; Returns: boolean }
      is_corretora: { Args: never; Returns: boolean }
    }
    Enums: {
      coffee_processo:
        | "natural"
        | "cereja_descascado"
        | "cd_desmucilado"
        | "despolpado"
        | "fermentacao_induzida"
      coffee_specie: "arabica" | "conillon"
      contrato_status:
        | "rascunho"
        | "em_analise"
        | "ativo"
        | "finalizado"
        | "cancelado"
      lead_status:
        | "novo"
        | "em_negociacao"
        | "convertido"
        | "perdido"
        | "arquivado"
      lote_status:
        | "rascunho"
        | "aguardando_classificacao"
        | "classificado"
        | "fora_de_tipo"
        | "rebeneficiar"
        | "vendido"
        | "arquivado"
      notification_kind: "lead" | "contrato" | "cotacao" | "sistema"
      user_role: "produtor" | "corretora" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      coffee_processo: [
        "natural",
        "cereja_descascado",
        "cd_desmucilado",
        "despolpado",
        "fermentacao_induzida",
      ],
      coffee_specie: ["arabica", "conillon"],
      contrato_status: [
        "rascunho",
        "em_analise",
        "ativo",
        "finalizado",
        "cancelado",
      ],
      lead_status: [
        "novo",
        "em_negociacao",
        "convertido",
        "perdido",
        "arquivado",
      ],
      lote_status: [
        "rascunho",
        "aguardando_classificacao",
        "classificado",
        "fora_de_tipo",
        "rebeneficiar",
        "vendido",
        "arquivado",
      ],
      notification_kind: ["lead", "contrato", "cotacao", "sistema"],
      user_role: ["produtor", "corretora", "admin"],
    },
  },
} as const