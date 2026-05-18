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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      app_admins: {
        Row: {
          created_at: string
          notes: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          notes?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: []
      }
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
          {
            foreignKeyName: "audit_log_corretora_id_fkey"
            columns: ["corretora_id"]
            isOneToOne: false
            referencedRelation: "corretoras_publicas"
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
            foreignKeyName: "classificacoes_cob_corretora_id_fkey"
            columns: ["corretora_id"]
            isOneToOne: false
            referencedRelation: "corretoras_publicas"
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
      compradores: {
        Row: {
          ativo: boolean
          city: string | null
          cnpj: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          corretora_id: string
          created_at: string
          id: string
          inscricao_estadual: string | null
          name: string
          observacoes: string | null
          preferencias: Json
          regime_tributario:
            | Database["public"]["Enums"]["regime_tributario"]
            | null
          state: string | null
          tipo: string | null
          trade_name: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          city?: string | null
          cnpj?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          corretora_id: string
          created_at?: string
          id?: string
          inscricao_estadual?: string | null
          name: string
          observacoes?: string | null
          preferencias?: Json
          regime_tributario?:
            | Database["public"]["Enums"]["regime_tributario"]
            | null
          state?: string | null
          tipo?: string | null
          trade_name?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          city?: string | null
          cnpj?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          corretora_id?: string
          created_at?: string
          id?: string
          inscricao_estadual?: string | null
          name?: string
          observacoes?: string | null
          preferencias?: Json
          regime_tributario?:
            | Database["public"]["Enums"]["regime_tributario"]
            | null
          state?: string | null
          tipo?: string | null
          trade_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "compradores_corretora_id_fkey"
            columns: ["corretora_id"]
            isOneToOne: false
            referencedRelation: "corretoras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compradores_corretora_id_fkey"
            columns: ["corretora_id"]
            isOneToOne: false
            referencedRelation: "corretoras_publicas"
            referencedColumns: ["id"]
          },
        ]
      }
      contratos: {
        Row: {
          bag_count: number | null
          code: string
          coffee_type: string | null
          comissao_pct: number | null
          comissao_total: number | null
          comprador_id: string | null
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
          comissao_pct?: number | null
          comissao_total?: number | null
          comprador_id?: string | null
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
          comissao_pct?: number | null
          comissao_total?: number | null
          comprador_id?: string | null
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
            foreignKeyName: "contratos_comprador_id_fkey"
            columns: ["comprador_id"]
            isOneToOne: false
            referencedRelation: "compradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_corretora_id_fkey"
            columns: ["corretora_id"]
            isOneToOne: false
            referencedRelation: "corretoras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_corretora_id_fkey"
            columns: ["corretora_id"]
            isOneToOne: false
            referencedRelation: "corretoras_publicas"
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
          bairro: string | null
          cep: string | null
          city: string | null
          cnpj: string | null
          created_at: string
          descricao: string | null
          email: string | null
          endereco: string | null
          id: string
          inscricao_est: string | null
          logo_url: string | null
          name: string
          phone: string | null
          regioes_atendimento: Database["public"]["Enums"]["regiao_cafeeira"][]
          site_url: string | null
          slug: string
          state: string | null
          telefone_fixo: string | null
          updated_at: string
          verified: boolean
        }
        Insert: {
          bairro?: string | null
          cep?: string | null
          city?: string | null
          cnpj?: string | null
          created_at?: string
          descricao?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          inscricao_est?: string | null
          logo_url?: string | null
          name: string
          phone?: string | null
          regioes_atendimento?: Database["public"]["Enums"]["regiao_cafeeira"][]
          site_url?: string | null
          slug: string
          state?: string | null
          telefone_fixo?: string | null
          updated_at?: string
          verified?: boolean
        }
        Update: {
          bairro?: string | null
          cep?: string | null
          city?: string | null
          cnpj?: string | null
          created_at?: string
          descricao?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          inscricao_est?: string | null
          logo_url?: string | null
          name?: string
          phone?: string | null
          regioes_atendimento?: Database["public"]["Enums"]["regiao_cafeeira"][]
          site_url?: string | null
          slug?: string
          state?: string | null
          telefone_fixo?: string | null
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
          process: Database["public"]["Enums"]["coffee_processo"] | null
          reference_date: string
          region: string | null
          source: string | null
          specie: Database["public"]["Enums"]["coffee_specie"] | null
        }
        Insert: {
          coffee_type: string
          created_at?: string
          id?: string
          payload?: Json
          price: number
          process?: Database["public"]["Enums"]["coffee_processo"] | null
          reference_date: string
          region?: string | null
          source?: string | null
          specie?: Database["public"]["Enums"]["coffee_specie"] | null
        }
        Update: {
          coffee_type?: string
          created_at?: string
          id?: string
          payload?: Json
          price?: number
          process?: Database["public"]["Enums"]["coffee_processo"] | null
          reference_date?: string
          region?: string | null
          source?: string | null
          specie?: Database["public"]["Enums"]["coffee_specie"] | null
        }
        Relationships: []
      }
      entregas: {
        Row: {
          bag_count: number | null
          contrato_id: string
          corretora_id: string
          created_at: string
          data_prevista: string | null
          data_realizada: string | null
          id: string
          local_retirada: string | null
          observacoes: string | null
          peso_bruto_kg: number | null
          peso_liquido_kg: number | null
          peso_tara_kg: number | null
          produtor_id: string
          sequencia: number
          status: Database["public"]["Enums"]["entrega_status"]
          transportadora_doc: string | null
          transportadora_nome: string | null
          umidade_pct: number | null
          updated_at: string
        }
        Insert: {
          bag_count?: number | null
          contrato_id: string
          corretora_id: string
          created_at?: string
          data_prevista?: string | null
          data_realizada?: string | null
          id?: string
          local_retirada?: string | null
          observacoes?: string | null
          peso_bruto_kg?: number | null
          peso_liquido_kg?: number | null
          peso_tara_kg?: number | null
          produtor_id: string
          sequencia?: number
          status?: Database["public"]["Enums"]["entrega_status"]
          transportadora_doc?: string | null
          transportadora_nome?: string | null
          umidade_pct?: number | null
          updated_at?: string
        }
        Update: {
          bag_count?: number | null
          contrato_id?: string
          corretora_id?: string
          created_at?: string
          data_prevista?: string | null
          data_realizada?: string | null
          id?: string
          local_retirada?: string | null
          observacoes?: string | null
          peso_bruto_kg?: number | null
          peso_liquido_kg?: number | null
          peso_tara_kg?: number | null
          produtor_id?: string
          sequencia?: number
          status?: Database["public"]["Enums"]["entrega_status"]
          transportadora_doc?: string | null
          transportadora_nome?: string | null
          umidade_pct?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entregas_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entregas_corretora_id_fkey"
            columns: ["corretora_id"]
            isOneToOne: false
            referencedRelation: "corretoras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entregas_corretora_id_fkey"
            columns: ["corretora_id"]
            isOneToOne: false
            referencedRelation: "corretoras_publicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entregas_produtor_id_fkey"
            columns: ["produtor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "favoritos_corretora_id_fkey"
            columns: ["corretora_id"]
            isOneToOne: false
            referencedRelation: "corretoras_publicas"
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
            foreignKeyName: "lead_events_corretora_id_fkey"
            columns: ["corretora_id"]
            isOneToOne: false
            referencedRelation: "corretoras_publicas"
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
          contato_id: string | null
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
          contato_id?: string | null
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
          contato_id?: string | null
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
            foreignKeyName: "leads_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "produtor_contatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_corretora_id_fkey"
            columns: ["corretora_id"]
            isOneToOne: false
            referencedRelation: "corretoras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_corretora_id_fkey"
            columns: ["corretora_id"]
            isOneToOne: false
            referencedRelation: "corretoras_publicas"
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
            foreignKeyName: "lotes_corretora_id_fkey"
            columns: ["corretora_id"]
            isOneToOne: false
            referencedRelation: "corretoras_publicas"
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
      market_quotes: {
        Row: {
          fetched_at: string
          meta: Json
          price_brl_cents: number | null
          price_usd_cents: number | null
          quoted_at: string
          source: string
          source_url: string | null
          symbol: string
          variation_pct: number | null
        }
        Insert: {
          fetched_at?: string
          meta?: Json
          price_brl_cents?: number | null
          price_usd_cents?: number | null
          quoted_at: string
          source: string
          source_url?: string | null
          symbol: string
          variation_pct?: number | null
        }
        Update: {
          fetched_at?: string
          meta?: Json
          price_brl_cents?: number | null
          price_usd_cents?: number | null
          quoted_at?: string
          source?: string
          source_url?: string | null
          symbol?: string
          variation_pct?: number | null
        }
        Relationships: []
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
      plans: {
        Row: {
          active: boolean
          billing_period: Database["public"]["Enums"]["billing_period"]
          created_at: string
          description: string | null
          features: Json
          id: string
          name: string
          price_cents: number
          slug: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          billing_period?: Database["public"]["Enums"]["billing_period"]
          created_at?: string
          description?: string | null
          features?: Json
          id?: string
          name: string
          price_cents?: number
          slug: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          billing_period?: Database["public"]["Enums"]["billing_period"]
          created_at?: string
          description?: string | null
          features?: Json
          id?: string
          name?: string
          price_cents?: number
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      produtor_contatos: {
        Row: {
          city: string | null
          claimed_profile_id: string | null
          corretora_id: string
          created_at: string
          email: string | null
          fazenda_nome: string | null
          full_name: string
          id: string
          notes: string | null
          phone: string | null
          state: string | null
          updated_at: string
        }
        Insert: {
          city?: string | null
          claimed_profile_id?: string | null
          corretora_id: string
          created_at?: string
          email?: string | null
          fazenda_nome?: string | null
          full_name: string
          id?: string
          notes?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          city?: string | null
          claimed_profile_id?: string | null
          corretora_id?: string
          created_at?: string
          email?: string | null
          fazenda_nome?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "produtor_contatos_claimed_profile_id_fkey"
            columns: ["claimed_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtor_contatos_corretora_id_fkey"
            columns: ["corretora_id"]
            isOneToOne: false
            referencedRelation: "corretoras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtor_contatos_corretora_id_fkey"
            columns: ["corretora_id"]
            isOneToOne: false
            referencedRelation: "corretoras_publicas"
            referencedColumns: ["id"]
          },
        ]
      }
      produtor_pagamentos: {
        Row: {
          comprovante_url: string | null
          contrato_id: string | null
          corretora_id: string
          created_at: string
          data_paga: string | null
          data_prevista: string | null
          descontos: Json
          entrega_id: string | null
          id: string
          observacoes: string | null
          produtor_id: string
          status: Database["public"]["Enums"]["pagamento_status"]
          updated_at: string
          valor_bruto: number
          valor_liquido: number
        }
        Insert: {
          comprovante_url?: string | null
          contrato_id?: string | null
          corretora_id: string
          created_at?: string
          data_paga?: string | null
          data_prevista?: string | null
          descontos?: Json
          entrega_id?: string | null
          id?: string
          observacoes?: string | null
          produtor_id: string
          status?: Database["public"]["Enums"]["pagamento_status"]
          updated_at?: string
          valor_bruto: number
          valor_liquido: number
        }
        Update: {
          comprovante_url?: string | null
          contrato_id?: string | null
          corretora_id?: string
          created_at?: string
          data_paga?: string | null
          data_prevista?: string | null
          descontos?: Json
          entrega_id?: string | null
          id?: string
          observacoes?: string | null
          produtor_id?: string
          status?: Database["public"]["Enums"]["pagamento_status"]
          updated_at?: string
          valor_bruto?: number
          valor_liquido?: number
        }
        Relationships: [
          {
            foreignKeyName: "produtor_pagamentos_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtor_pagamentos_corretora_id_fkey"
            columns: ["corretora_id"]
            isOneToOne: false
            referencedRelation: "corretoras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtor_pagamentos_corretora_id_fkey"
            columns: ["corretora_id"]
            isOneToOne: false
            referencedRelation: "corretoras_publicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtor_pagamentos_entrega_id_fkey"
            columns: ["entrega_id"]
            isOneToOne: false
            referencedRelation: "entregas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtor_pagamentos_produtor_id_fkey"
            columns: ["produtor_id"]
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
          caepf: string | null
          canal_preferido: Database["public"]["Enums"]["canal_preferido"] | null
          car: string | null
          certificacoes: Json
          city: string | null
          cpf_cnpj: string | null
          created_at: string
          fazenda_nome: string | null
          foto_capa_url: string | null
          id: string
          indicacao_geografica: string | null
          polygon_geojson: Json | null
          preco_alvo: number | null
          preferencias: Json
          profile_id: string
          receber_cotacao_diaria: boolean
          specie: Database["public"]["Enums"]["produtor_specie"] | null
          state: string | null
          status: Database["public"]["Enums"]["produtor_status"]
          updated_at: string
          variedades: Json
          whatsapp: string | null
        }
        Insert: {
          altitude_m?: number | null
          area_ha?: number | null
          caepf?: string | null
          canal_preferido?:
            | Database["public"]["Enums"]["canal_preferido"]
            | null
          car?: string | null
          certificacoes?: Json
          city?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          fazenda_nome?: string | null
          foto_capa_url?: string | null
          id?: string
          indicacao_geografica?: string | null
          polygon_geojson?: Json | null
          preco_alvo?: number | null
          preferencias?: Json
          profile_id: string
          receber_cotacao_diaria?: boolean
          specie?: Database["public"]["Enums"]["produtor_specie"] | null
          state?: string | null
          status?: Database["public"]["Enums"]["produtor_status"]
          updated_at?: string
          variedades?: Json
          whatsapp?: string | null
        }
        Update: {
          altitude_m?: number | null
          area_ha?: number | null
          caepf?: string | null
          canal_preferido?:
            | Database["public"]["Enums"]["canal_preferido"]
            | null
          car?: string | null
          certificacoes?: Json
          city?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          fazenda_nome?: string | null
          foto_capa_url?: string | null
          id?: string
          indicacao_geografica?: string | null
          polygon_geojson?: Json | null
          preco_alvo?: number | null
          preferencias?: Json
          profile_id?: string
          receber_cotacao_diaria?: boolean
          specie?: Database["public"]["Enums"]["produtor_specie"] | null
          state?: string | null
          status?: Database["public"]["Enums"]["produtor_status"]
          updated_at?: string
          variedades?: Json
          whatsapp?: string | null
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
          status: Database["public"]["Enums"]["profile_status"]
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
          status?: Database["public"]["Enums"]["profile_status"]
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
          status?: Database["public"]["Enums"]["profile_status"]
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
          {
            foreignKeyName: "profiles_corretora_id_fkey"
            columns: ["corretora_id"]
            isOneToOne: false
            referencedRelation: "corretoras_publicas"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          canceled_at: string | null
          corretora_id: string
          created_at: string
          current_period_end: string | null
          current_period_start: string
          id: string
          notes: string | null
          plan_id: string | null
          started_at: string
          status: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          canceled_at?: string | null
          corretora_id: string
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string
          id?: string
          notes?: string | null
          plan_id?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          canceled_at?: string | null
          corretora_id?: string
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string
          id?: string
          notes?: string | null
          plan_id?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_corretora_id_fkey"
            columns: ["corretora_id"]
            isOneToOne: true
            referencedRelation: "corretoras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_corretora_id_fkey"
            columns: ["corretora_id"]
            isOneToOne: true
            referencedRelation: "corretoras_publicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_leads: {
        Row: {
          contato_email: string | null
          corretora_id: string
          created_at: string
          id: string
          ip_hash: string | null
          message: string | null
          produtor_id: string | null
          source: Database["public"]["Enums"]["whatsapp_lead_source"]
          user_agent: string | null
        }
        Insert: {
          contato_email?: string | null
          corretora_id: string
          created_at?: string
          id?: string
          ip_hash?: string | null
          message?: string | null
          produtor_id?: string | null
          source?: Database["public"]["Enums"]["whatsapp_lead_source"]
          user_agent?: string | null
        }
        Update: {
          contato_email?: string | null
          corretora_id?: string
          created_at?: string
          id?: string
          ip_hash?: string | null
          message?: string | null
          produtor_id?: string | null
          source?: Database["public"]["Enums"]["whatsapp_lead_source"]
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_leads_corretora_id_fkey"
            columns: ["corretora_id"]
            isOneToOne: false
            referencedRelation: "corretoras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_leads_corretora_id_fkey"
            columns: ["corretora_id"]
            isOneToOne: false
            referencedRelation: "corretoras_publicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_leads_produtor_id_fkey"
            columns: ["produtor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      corretoras_publicas: {
        Row: {
          city: string | null
          created_at: string | null
          descricao: string | null
          email: string | null
          id: string | null
          logo_url: string | null
          name: string | null
          phone: string | null
          regioes_atendimento:
            | Database["public"]["Enums"]["regiao_cafeeira"][]
            | null
          site_url: string | null
          slug: string | null
          state: string | null
          verified: boolean | null
        }
        Insert: {
          city?: string | null
          created_at?: string | null
          descricao?: string | null
          email?: string | null
          id?: string | null
          logo_url?: string | null
          name?: string | null
          phone?: string | null
          regioes_atendimento?:
            | Database["public"]["Enums"]["regiao_cafeeira"][]
            | null
          site_url?: string | null
          slug?: string | null
          state?: string | null
          verified?: boolean | null
        }
        Update: {
          city?: string | null
          created_at?: string | null
          descricao?: string | null
          email?: string | null
          id?: string | null
          logo_url?: string | null
          name?: string | null
          phone?: string | null
          regioes_atendimento?:
            | Database["public"]["Enums"]["regiao_cafeeira"][]
            | null
          site_url?: string | null
          slug?: string | null
          state?: string | null
          verified?: boolean | null
        }
        Relationships: []
      }
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
      get_laudo_publico: { Args: { p_id: string }; Returns: Json }
      is_admin: { Args: never; Returns: boolean }
      is_app_admin: { Args: never; Returns: boolean }
      is_corretora: { Args: never; Returns: boolean }
      list_pending_corretora_signups: {
        Args: never
        Returns: {
          corretora_city: string
          corretora_cnpj: string
          corretora_name: string
          email: string
          full_name: string
          profile_id: string
          signup_at: string
        }[]
      }
      subscription_effective_status: {
        Args: { sub: Database["public"]["Tables"]["subscriptions"]["Row"] }
        Returns: Database["public"]["Enums"]["subscription_status"]
      }
    }
    Enums: {
      billing_period: "monthly" | "yearly"
      canal_preferido: "app" | "whatsapp" | "email" | "sms"
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
      entrega_status:
        | "programada"
        | "em_transito"
        | "recebida"
        | "conferida"
        | "cancelada"
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
      notification_kind:
        | "lead"
        | "contrato"
        | "cotacao"
        | "sistema"
        | "entrega"
        | "pagamento"
      pagamento_status: "pendente" | "pago" | "vencido" | "cancelado"
      produtor_specie: "arabica" | "conilon" | "ambos"
      produtor_status: "sombra" | "ativo" | "pendente" | "bloqueado"
      profile_status: "ativo" | "pendente" | "bloqueado"
      regiao_cafeeira:
        | "zona_da_mata"
        | "sul_de_minas"
        | "cerrado_mineiro"
        | "matas_de_minas"
        | "caparao"
        | "mogiana"
        | "espirito_santo"
        | "bahia"
        | "rondonia"
        | "outras"
      regime_tributario:
        | "simples_nacional"
        | "lucro_presumido"
        | "lucro_real"
        | "mei"
        | "isento"
      subscription_status:
        | "trial"
        | "active"
        | "past_due"
        | "canceled"
        | "expired"
      user_role: "produtor" | "corretora" | "admin"
      whatsapp_lead_source:
        | "catalogo_corretoras"
        | "perfil_corretora"
        | "home_publica"
        | "outro"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          owner_id: string | null
          public: boolean | null
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string | null
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Relationships: []
      }
      buckets_analytics: {
        Row: {
          created_at: string
          deleted_at: string | null
          format: string
          id: string
          name: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      buckets_vectors: {
        Row: {
          created_at: string
          id: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          metadata: Json | null
          name: string | null
          owner: string | null
          owner_id: string | null
          path_tokens: string[] | null
          updated_at: string | null
          user_metadata: Json | null
          version: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          in_progress_size: number
          key: string
          metadata: Json | null
          owner_id: string | null
          upload_signature: string
          user_metadata: Json | null
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id: string
          in_progress_size?: number
          key: string
          metadata?: Json | null
          owner_id?: string | null
          upload_signature: string
          user_metadata?: Json | null
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          in_progress_size?: number
          key?: string
          metadata?: Json | null
          owner_id?: string | null
          upload_signature?: string
          user_metadata?: Json | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string
          created_at: string
          etag: string
          id: string
          key: string
          owner_id: string | null
          part_number: number
          size: number
          upload_id: string
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          etag: string
          id?: string
          key: string
          owner_id?: string | null
          part_number: number
          size?: number
          upload_id: string
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          etag?: string
          id?: string
          key?: string
          owner_id?: string | null
          part_number?: number
          size?: number
          upload_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "s3_multipart_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      vector_indexes: {
        Row: {
          bucket_id: string
          created_at: string
          data_type: string
          dimension: number
          distance_metric: string
          id: string
          metadata_configuration: Json | null
          name: string
          updated_at: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          data_type: string
          dimension: number
          distance_metric: string
          id?: string
          metadata_configuration?: Json | null
          name: string
          updated_at?: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          data_type?: string
          dimension?: number
          distance_metric?: string
          id?: string
          metadata_configuration?: Json | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vector_indexes_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets_vectors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      allow_any_operation: {
        Args: { expected_operations: string[] }
        Returns: boolean
      }
      allow_only_operation: {
        Args: { expected_operation: string }
        Returns: boolean
      }
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string }
        Returns: undefined
      }
      extension: { Args: { name: string }; Returns: string }
      filename: { Args: { name: string }; Returns: string }
      foldername: { Args: { name: string }; Returns: string[] }
      get_common_prefix: {
        Args: { p_delimiter: string; p_key: string; p_prefix: string }
        Returns: string
      }
      get_size_by_bucket: {
        Args: never
        Returns: {
          bucket_id: string
          size: number
        }[]
      }
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_key_token?: string
          next_upload_token?: string
          prefix_param: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          _bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_token?: string
          prefix_param: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      operation: { Args: never; Returns: string }
      search: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_by_timestamp: {
        Args: {
          p_bucket_id: string
          p_level: number
          p_limit: number
          p_prefix: string
          p_sort_column: string
          p_sort_column_after: string
          p_sort_order: string
          p_start_after: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_v2: {
        Args: {
          bucket_name: string
          levels?: number
          limits?: number
          prefix: string
          sort_column?: string
          sort_column_after?: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
    }
    Enums: {
      buckettype: "STANDARD" | "ANALYTICS" | "VECTOR"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      billing_period: ["monthly", "yearly"],
      canal_preferido: ["app", "whatsapp", "email", "sms"],
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
      entrega_status: [
        "programada",
        "em_transito",
        "recebida",
        "conferida",
        "cancelada",
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
      notification_kind: [
        "lead",
        "contrato",
        "cotacao",
        "sistema",
        "entrega",
        "pagamento",
      ],
      pagamento_status: ["pendente", "pago", "vencido", "cancelado"],
      produtor_specie: ["arabica", "conilon", "ambos"],
      produtor_status: ["sombra", "ativo", "pendente", "bloqueado"],
      profile_status: ["ativo", "pendente", "bloqueado"],
      regiao_cafeeira: [
        "zona_da_mata",
        "sul_de_minas",
        "cerrado_mineiro",
        "matas_de_minas",
        "caparao",
        "mogiana",
        "espirito_santo",
        "bahia",
        "rondonia",
        "outras",
      ],
      regime_tributario: [
        "simples_nacional",
        "lucro_presumido",
        "lucro_real",
        "mei",
        "isento",
      ],
      subscription_status: [
        "trial",
        "active",
        "past_due",
        "canceled",
        "expired",
      ],
      user_role: ["produtor", "corretora", "admin"],
      whatsapp_lead_source: [
        "catalogo_corretoras",
        "perfil_corretora",
        "home_publica",
        "outro",
      ],
    },
  },
  storage: {
    Enums: {
      buckettype: ["STANDARD", "ANALYTICS", "VECTOR"],
    },
  },
} as const
