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
      amostras: {
        Row: {
          corretora_id: string
          created_at: string
          data_entrega_prevista: string | null
          data_recebida: string | null
          data_resultado: string | null
          id: string
          laudo_observacoes: string | null
          lote_id: string
          mensagem: string | null
          motivo_recusa: string | null
          preco_oferta: number | null
          produtor_id: string
          resultado_bebida: string | null
          resultado_fora_de_tipo: boolean
          resultado_tipo: string | null
          status: Database["public"]["Enums"]["amostra_status"]
          updated_at: string
        }
        Insert: {
          corretora_id: string
          created_at?: string
          data_entrega_prevista?: string | null
          data_recebida?: string | null
          data_resultado?: string | null
          id?: string
          laudo_observacoes?: string | null
          lote_id: string
          mensagem?: string | null
          motivo_recusa?: string | null
          preco_oferta?: number | null
          produtor_id: string
          resultado_bebida?: string | null
          resultado_fora_de_tipo?: boolean
          resultado_tipo?: string | null
          status?: Database["public"]["Enums"]["amostra_status"]
          updated_at?: string
        }
        Update: {
          corretora_id?: string
          created_at?: string
          data_entrega_prevista?: string | null
          data_recebida?: string | null
          data_resultado?: string | null
          id?: string
          laudo_observacoes?: string | null
          lote_id?: string
          mensagem?: string | null
          motivo_recusa?: string | null
          preco_oferta?: number | null
          produtor_id?: string
          resultado_bebida?: string | null
          resultado_fora_de_tipo?: boolean
          resultado_tipo?: string | null
          status?: Database["public"]["Enums"]["amostra_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "amostras_corretora_id_fkey"
            columns: ["corretora_id"]
            isOneToOne: false
            referencedRelation: "corretoras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amostras_corretora_id_fkey"
            columns: ["corretora_id"]
            isOneToOne: false
            referencedRelation: "corretoras_publicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amostras_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amostras_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes_publicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amostras_produtor_id_fkey"
            columns: ["produtor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amostras_produtor_id_fkey"
            columns: ["produtor_id"]
            isOneToOne: false
            referencedRelation: "social_perfis"
            referencedColumns: ["id"]
          },
        ]
      }
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
            foreignKeyName: "audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "social_perfis"
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
            foreignKeyName: "classificacoes_cob_classificador_id_fkey"
            columns: ["classificador_id"]
            isOneToOne: false
            referencedRelation: "social_perfis"
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
          {
            foreignKeyName: "classificacoes_cob_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes_publicos"
            referencedColumns: ["id"]
          },
        ]
      }
      coffee_types: {
        Row: {
          active: boolean
          created_at: string
          default_unit: string
          id: string
          name: string
          notes: string | null
          process: string | null
          slug: string
          species: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          default_unit?: string
          id?: string
          name: string
          notes?: string | null
          process?: string | null
          slug: string
          species: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          default_unit?: string
          id?: string
          name?: string
          notes?: string | null
          process?: string | null
          slug?: string
          species?: string
          updated_at?: string
        }
        Relationships: []
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
          content_hash: string | null
          corretora_id: string
          created_at: string
          id: string
          lead_id: string | null
          lote_id: string | null
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
          content_hash?: string | null
          corretora_id: string
          created_at?: string
          id?: string
          lead_id?: string | null
          lote_id?: string | null
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
          content_hash?: string | null
          corretora_id?: string
          created_at?: string
          id?: string
          lead_id?: string | null
          lote_id?: string | null
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
            foreignKeyName: "contratos_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes_publicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_produtor_id_fkey"
            columns: ["produtor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_produtor_id_fkey"
            columns: ["produtor_id"]
            isOneToOne: false
            referencedRelation: "social_perfis"
            referencedColumns: ["id"]
          },
        ]
      }
      corretora_avaliacoes: {
        Row: {
          comment: string | null
          corretora_id: string
          created_at: string
          id: string
          produtor_id: string
          rating: number
          updated_at: string
        }
        Insert: {
          comment?: string | null
          corretora_id: string
          created_at?: string
          id?: string
          produtor_id: string
          rating: number
          updated_at?: string
        }
        Update: {
          comment?: string | null
          corretora_id?: string
          created_at?: string
          id?: string
          produtor_id?: string
          rating?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "corretora_avaliacoes_corretora_id_fkey"
            columns: ["corretora_id"]
            isOneToOne: false
            referencedRelation: "corretoras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corretora_avaliacoes_corretora_id_fkey"
            columns: ["corretora_id"]
            isOneToOne: false
            referencedRelation: "corretoras_publicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corretora_avaliacoes_produtor_id_fkey"
            columns: ["produtor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corretora_avaliacoes_produtor_id_fkey"
            columns: ["produtor_id"]
            isOneToOne: false
            referencedRelation: "social_perfis"
            referencedColumns: ["id"]
          },
        ]
      }
      corretora_invites: {
        Row: {
          corretora_id: string
          created_at: string
          created_by: string
          email: string | null
          expires_at: string
          token: string
          used_at: string | null
          used_by_user_id: string | null
        }
        Insert: {
          corretora_id: string
          created_at?: string
          created_by: string
          email?: string | null
          expires_at?: string
          token?: string
          used_at?: string | null
          used_by_user_id?: string | null
        }
        Update: {
          corretora_id?: string
          created_at?: string
          created_by?: string
          email?: string | null
          expires_at?: string
          token?: string
          used_at?: string | null
          used_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "corretora_invites_corretora_id_fkey"
            columns: ["corretora_id"]
            isOneToOne: false
            referencedRelation: "corretoras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corretora_invites_corretora_id_fkey"
            columns: ["corretora_id"]
            isOneToOne: false
            referencedRelation: "corretoras_publicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corretora_invites_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corretora_invites_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "social_perfis"
            referencedColumns: ["id"]
          },
        ]
      }
      corretora_waitlist: {
        Row: {
          city: string | null
          created_at: string
          email: string | null
          id: string
          invited_at: string | null
          message: string | null
          name: string
          notes: string | null
          state: string | null
          status: string
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          city?: string | null
          created_at?: string
          email?: string | null
          id?: string
          invited_at?: string | null
          message?: string | null
          name: string
          notes?: string | null
          state?: string | null
          status?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          city?: string | null
          created_at?: string
          email?: string | null
          id?: string
          invited_at?: string | null
          message?: string | null
          name?: string
          notes?: string | null
          state?: string | null
          status?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      corretoras: {
        Row: {
          bairro: string | null
          cep: string | null
          city: string | null
          cnpj: string | null
          created_at: string
          deleted_at: string | null
          descricao: string | null
          email: string | null
          endereco: string | null
          especialidades: string[]
          id: string
          inscricao_est: string | null
          lat: number | null
          lng: number | null
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
          deleted_at?: string | null
          descricao?: string | null
          email?: string | null
          endereco?: string | null
          especialidades?: string[]
          id?: string
          inscricao_est?: string | null
          lat?: number | null
          lng?: number | null
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
          deleted_at?: string | null
          descricao?: string | null
          email?: string | null
          endereco?: string | null
          especialidades?: string[]
          id?: string
          inscricao_est?: string | null
          lat?: number | null
          lng?: number | null
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
          corretora_id: string
          created_at: string
          currency: string
          id: string
          is_manual: boolean
          payload: Json
          price: number
          process: Database["public"]["Enums"]["coffee_processo"] | null
          product_id: string | null
          reference_date: string
          region: string | null
          region_id: string | null
          source: string | null
          source_id: string | null
          specie: Database["public"]["Enums"]["coffee_specie"] | null
          status: string
          unit: string
          valid_until: string | null
        }
        Insert: {
          coffee_type: string
          corretora_id: string
          created_at?: string
          currency?: string
          id?: string
          is_manual?: boolean
          payload?: Json
          price: number
          process?: Database["public"]["Enums"]["coffee_processo"] | null
          product_id?: string | null
          reference_date: string
          region?: string | null
          region_id?: string | null
          source?: string | null
          source_id?: string | null
          specie?: Database["public"]["Enums"]["coffee_specie"] | null
          status?: string
          unit?: string
          valid_until?: string | null
        }
        Update: {
          coffee_type?: string
          corretora_id?: string
          created_at?: string
          currency?: string
          id?: string
          is_manual?: boolean
          payload?: Json
          price?: number
          process?: Database["public"]["Enums"]["coffee_processo"] | null
          product_id?: string | null
          reference_date?: string
          region?: string | null
          region_id?: string | null
          source?: string | null
          source_id?: string | null
          specie?: Database["public"]["Enums"]["coffee_specie"] | null
          status?: string
          unit?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cotacoes_corretora_id_fkey"
            columns: ["corretora_id"]
            isOneToOne: false
            referencedRelation: "corretoras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotacoes_corretora_id_fkey"
            columns: ["corretora_id"]
            isOneToOne: false
            referencedRelation: "corretoras_publicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotacoes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "coffee_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotacoes_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "pracas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotacoes_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "quote_sources"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "contrato_saldo"
            referencedColumns: ["contrato_id"]
          },
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
          {
            foreignKeyName: "entregas_produtor_id_fkey"
            columns: ["produtor_id"]
            isOneToOne: false
            referencedRelation: "social_perfis"
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
          {
            foreignKeyName: "favoritos_produtor_id_fkey"
            columns: ["produtor_id"]
            isOneToOne: false
            referencedRelation: "social_perfis"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_distribution_rules: {
        Row: {
          action: string
          active: boolean
          conditions: Json
          created_at: string
          id: string
          name: string
          notes: string | null
          priority: number
          updated_at: string
        }
        Insert: {
          action?: string
          active?: boolean
          conditions?: Json
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          priority?: number
          updated_at?: string
        }
        Update: {
          action?: string
          active?: boolean
          conditions?: Json
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          priority?: number
          updated_at?: string
        }
        Relationships: []
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
            foreignKeyName: "lead_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "social_perfis"
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
      lead_waitlist: {
        Row: {
          contact: string | null
          created_at: string
          handled_at: string | null
          handled_by: string | null
          id: string
          notes: string | null
          payload: Json
          region: string | null
          source: string
          specie: string | null
          status: string
          updated_at: string
        }
        Insert: {
          contact?: string | null
          created_at?: string
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          notes?: string | null
          payload?: Json
          region?: string | null
          source: string
          specie?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          contact?: string | null
          created_at?: string
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          notes?: string | null
          payload?: Json
          region?: string | null
          source?: string
          specie?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_waitlist_handled_by_fkey"
            columns: ["handled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_waitlist_handled_by_fkey"
            columns: ["handled_by"]
            isOneToOne: false
            referencedRelation: "social_perfis"
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
          origem: Database["public"]["Enums"]["lead_origem"] | null
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
          origem?: Database["public"]["Enums"]["lead_origem"] | null
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
          origem?: Database["public"]["Enums"]["lead_origem"] | null
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
          {
            foreignKeyName: "leads_produtor_id_fkey"
            columns: ["produtor_id"]
            isOneToOne: false
            referencedRelation: "social_perfis"
            referencedColumns: ["id"]
          },
        ]
      }
      lgpd_consents: {
        Row: {
          created_at: string
          email: string | null
          granted: boolean
          id: string
          ip_hash: string | null
          kind: Database["public"]["Enums"]["lgpd_consent_kind"]
          metadata: Json
          profile_id: string | null
          user_agent: string | null
          version: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          granted?: boolean
          id?: string
          ip_hash?: string | null
          kind: Database["public"]["Enums"]["lgpd_consent_kind"]
          metadata?: Json
          profile_id?: string | null
          user_agent?: string | null
          version: string
        }
        Update: {
          created_at?: string
          email?: string | null
          granted?: boolean
          id?: string
          ip_hash?: string | null
          kind?: Database["public"]["Enums"]["lgpd_consent_kind"]
          metadata?: Json
          profile_id?: string | null
          user_agent?: string | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "lgpd_consents_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lgpd_consents_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "social_perfis"
            referencedColumns: ["id"]
          },
        ]
      }
      lotes: {
        Row: {
          beneficiado: boolean
          codigo: string
          corretora_id: string | null
          created_at: string
          descricao: string | null
          id: string
          observacoes: string | null
          peso_kg: number | null
          peso_por_volume_kg: number | null
          peso_sacas: number | null
          peso_sacas_legado: number | null
          processo: Database["public"]["Enums"]["coffee_processo"] | null
          produtor_id: string
          qtd_volumes: number | null
          safra: string | null
          specie: Database["public"]["Enums"]["coffee_specie"]
          status: Database["public"]["Enums"]["lote_status"]
          umidade_inicial: number | null
          unidade_entrada: string | null
          updated_at: string
        }
        Insert: {
          beneficiado?: boolean
          codigo: string
          corretora_id?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          observacoes?: string | null
          peso_kg?: number | null
          peso_por_volume_kg?: number | null
          peso_sacas?: number | null
          peso_sacas_legado?: number | null
          processo?: Database["public"]["Enums"]["coffee_processo"] | null
          produtor_id: string
          qtd_volumes?: number | null
          safra?: string | null
          specie: Database["public"]["Enums"]["coffee_specie"]
          status?: Database["public"]["Enums"]["lote_status"]
          umidade_inicial?: number | null
          unidade_entrada?: string | null
          updated_at?: string
        }
        Update: {
          beneficiado?: boolean
          codigo?: string
          corretora_id?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          observacoes?: string | null
          peso_kg?: number | null
          peso_por_volume_kg?: number | null
          peso_sacas?: number | null
          peso_sacas_legado?: number | null
          processo?: Database["public"]["Enums"]["coffee_processo"] | null
          produtor_id?: string
          qtd_volumes?: number | null
          safra?: string | null
          specie?: Database["public"]["Enums"]["coffee_specie"]
          status?: Database["public"]["Enums"]["lote_status"]
          umidade_inicial?: number | null
          unidade_entrada?: string | null
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
          {
            foreignKeyName: "lotes_produtor_id_fkey"
            columns: ["produtor_id"]
            isOneToOne: false
            referencedRelation: "social_perfis"
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
      market_quotes_history: {
        Row: {
          captured_date: string
          price_brl_cents: number | null
          price_usd_cents: number | null
          quoted_at: string
          source: string
          symbol: string
          updated_at: string
          variation_pct: number | null
        }
        Insert: {
          captured_date: string
          price_brl_cents?: number | null
          price_usd_cents?: number | null
          quoted_at: string
          source: string
          symbol: string
          updated_at?: string
          variation_pct?: number | null
        }
        Update: {
          captured_date?: string
          price_brl_cents?: number | null
          price_usd_cents?: number | null
          quoted_at?: string
          source?: string
          symbol?: string
          updated_at?: string
          variation_pct?: number | null
        }
        Relationships: []
      }
      message_dispatches: {
        Row: {
          attempts: number
          channel: string
          corretora_id: string | null
          created_at: string
          error: string | null
          id: string
          lead_id: string | null
          payload: Json
          profile_id: string | null
          recipient: string
          scheduled_at: string | null
          sent_at: string | null
          status: string
          template_id: string | null
        }
        Insert: {
          attempts?: number
          channel: string
          corretora_id?: string | null
          created_at?: string
          error?: string | null
          id?: string
          lead_id?: string | null
          payload?: Json
          profile_id?: string | null
          recipient: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          template_id?: string | null
        }
        Update: {
          attempts?: number
          channel?: string
          corretora_id?: string | null
          created_at?: string
          error?: string | null
          id?: string
          lead_id?: string | null
          payload?: Json
          profile_id?: string | null
          recipient?: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_dispatches_corretora_id_fkey"
            columns: ["corretora_id"]
            isOneToOne: false
            referencedRelation: "corretoras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_dispatches_corretora_id_fkey"
            columns: ["corretora_id"]
            isOneToOne: false
            referencedRelation: "corretoras_publicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_dispatches_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_dispatches_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "social_perfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_dispatches_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "notification_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      metas_venda: {
        Row: {
          alerta_id: string | null
          created_at: string
          id: string
          observacoes: string | null
          preco_alvo: number
          produtor_id: string
          sacas: number
          status: string
          updated_at: string
        }
        Insert: {
          alerta_id?: string | null
          created_at?: string
          id?: string
          observacoes?: string | null
          preco_alvo: number
          produtor_id: string
          sacas: number
          status?: string
          updated_at?: string
        }
        Update: {
          alerta_id?: string | null
          created_at?: string
          id?: string
          observacoes?: string | null
          preco_alvo?: number
          produtor_id?: string
          sacas?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "metas_venda_alerta_id_fkey"
            columns: ["alerta_id"]
            isOneToOne: false
            referencedRelation: "price_alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metas_venda_produtor_id_fkey"
            columns: ["produtor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metas_venda_produtor_id_fkey"
            columns: ["produtor_id"]
            isOneToOne: false
            referencedRelation: "social_perfis"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: string
          reporter_id: string | null
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          target_id: string
          target_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reporter_id?: string | null
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          target_id: string
          target_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reporter_id?: string | null
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          target_id?: string
          target_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "moderation_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moderation_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "social_perfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moderation_reports_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moderation_reports_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "social_perfis"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_templates: {
        Row: {
          active: boolean
          body: string
          channel: string
          created_at: string
          id: string
          kind: string
          name: string
          subject: string | null
          updated_at: string
          variables: Json
        }
        Insert: {
          active?: boolean
          body: string
          channel: string
          created_at?: string
          id?: string
          kind: string
          name: string
          subject?: string | null
          updated_at?: string
          variables?: Json
        }
        Update: {
          active?: boolean
          body?: string
          channel?: string
          created_at?: string
          id?: string
          kind?: string
          name?: string
          subject?: string | null
          updated_at?: string
          variables?: Json
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
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "social_perfis"
            referencedColumns: ["id"]
          },
        ]
      }
      ofertas_comprador: {
        Row: {
          bag_count: number | null
          comprador_id: string
          corretora_id: string
          created_at: string
          created_by: string | null
          id: string
          lote_id: string | null
          mensagem: string | null
          preco_saca: number
          status: Database["public"]["Enums"]["oferta_status"]
          updated_at: string
          validade_ate: string | null
        }
        Insert: {
          bag_count?: number | null
          comprador_id: string
          corretora_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          lote_id?: string | null
          mensagem?: string | null
          preco_saca: number
          status?: Database["public"]["Enums"]["oferta_status"]
          updated_at?: string
          validade_ate?: string | null
        }
        Update: {
          bag_count?: number | null
          comprador_id?: string
          corretora_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          lote_id?: string | null
          mensagem?: string | null
          preco_saca?: number
          status?: Database["public"]["Enums"]["oferta_status"]
          updated_at?: string
          validade_ate?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ofertas_comprador_comprador_id_fkey"
            columns: ["comprador_id"]
            isOneToOne: false
            referencedRelation: "compradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ofertas_comprador_corretora_id_fkey"
            columns: ["corretora_id"]
            isOneToOne: false
            referencedRelation: "corretoras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ofertas_comprador_corretora_id_fkey"
            columns: ["corretora_id"]
            isOneToOne: false
            referencedRelation: "corretoras_publicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ofertas_comprador_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ofertas_comprador_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "social_perfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ofertas_comprador_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ofertas_comprador_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes_publicos"
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
      platform_settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "platform_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "social_perfis"
            referencedColumns: ["id"]
          },
        ]
      }
      pracas: {
        Row: {
          active: boolean
          city: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          region_group: string | null
          slug: string
          state: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          city?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          region_group?: string | null
          slug: string
          state: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          city?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          region_group?: string | null
          slug?: string
          state?: string
          updated_at?: string
        }
        Relationships: []
      }
      price_alerts: {
        Row: {
          active: boolean
          channel: string
          condition: string
          created_at: string
          id: string
          last_triggered_at: string | null
          notes: string | null
          product_id: string
          produtor_id: string
          region_id: string | null
          target_pct: number | null
          target_price: number | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          channel?: string
          condition: string
          created_at?: string
          id?: string
          last_triggered_at?: string | null
          notes?: string | null
          product_id: string
          produtor_id: string
          region_id?: string | null
          target_pct?: number | null
          target_price?: number | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          channel?: string
          condition?: string
          created_at?: string
          id?: string
          last_triggered_at?: string | null
          notes?: string | null
          product_id?: string
          produtor_id?: string
          region_id?: string | null
          target_pct?: number | null
          target_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_alerts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "coffee_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_alerts_produtor_id_fkey"
            columns: ["produtor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_alerts_produtor_id_fkey"
            columns: ["produtor_id"]
            isOneToOne: false
            referencedRelation: "social_perfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_alerts_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "pracas"
            referencedColumns: ["id"]
          },
        ]
      }
      produtor_contatos: {
        Row: {
          caepf: string | null
          car: string | null
          city: string | null
          claimed_profile_id: string | null
          corretora_id: string
          cpf_cnpj: string | null
          created_at: string
          deleted_at: string | null
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
          caepf?: string | null
          car?: string | null
          city?: string | null
          claimed_profile_id?: string | null
          corretora_id: string
          cpf_cnpj?: string | null
          created_at?: string
          deleted_at?: string | null
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
          caepf?: string | null
          car?: string | null
          city?: string | null
          claimed_profile_id?: string | null
          corretora_id?: string
          cpf_cnpj?: string | null
          created_at?: string
          deleted_at?: string | null
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
            foreignKeyName: "produtor_contatos_claimed_profile_id_fkey"
            columns: ["claimed_profile_id"]
            isOneToOne: false
            referencedRelation: "social_perfis"
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
            referencedRelation: "contrato_saldo"
            referencedColumns: ["contrato_id"]
          },
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
          {
            foreignKeyName: "produtor_pagamentos_produtor_id_fkey"
            columns: ["produtor_id"]
            isOneToOne: false
            referencedRelation: "social_perfis"
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
          deleted_at: string | null
          fazenda_nome: string | null
          foto_capa_url: string | null
          id: string
          indicacao_geografica: string | null
          lat: number | null
          lng: number | null
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
          deleted_at?: string | null
          fazenda_nome?: string | null
          foto_capa_url?: string | null
          id?: string
          indicacao_geografica?: string | null
          lat?: number | null
          lng?: number | null
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
          deleted_at?: string | null
          fazenda_nome?: string | null
          foto_capa_url?: string | null
          id?: string
          indicacao_geografica?: string | null
          lat?: number | null
          lng?: number | null
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
          {
            foreignKeyName: "produtores_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "social_perfis"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          apelido: string | null
          avatar_url: string | null
          corretora_id: string | null
          corretora_role:
            | Database["public"]["Enums"]["corretora_member_role"]
            | null
          created_at: string
          deleted_at: string | null
          full_name: string | null
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          roles: Database["public"]["Enums"]["user_role"][]
          status: Database["public"]["Enums"]["profile_status"]
          updated_at: string
        }
        Insert: {
          apelido?: string | null
          avatar_url?: string | null
          corretora_id?: string | null
          corretora_role?:
            | Database["public"]["Enums"]["corretora_member_role"]
            | null
          created_at?: string
          deleted_at?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          roles?: Database["public"]["Enums"]["user_role"][]
          status?: Database["public"]["Enums"]["profile_status"]
          updated_at?: string
        }
        Update: {
          apelido?: string | null
          avatar_url?: string | null
          corretora_id?: string | null
          corretora_role?:
            | Database["public"]["Enums"]["corretora_member_role"]
            | null
          created_at?: string
          deleted_at?: string | null
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
      propostas: {
        Row: {
          bag_count: number | null
          corretora_id: string
          created_at: string
          created_by: string | null
          enviada_em: string | null
          id: string
          lead_id: string | null
          lote_id: string | null
          mensagem: string | null
          preco_saca: number
          respondida_em: string | null
          status: Database["public"]["Enums"]["proposta_status"]
          updated_at: string
          validade_ate: string | null
        }
        Insert: {
          bag_count?: number | null
          corretora_id: string
          created_at?: string
          created_by?: string | null
          enviada_em?: string | null
          id?: string
          lead_id?: string | null
          lote_id?: string | null
          mensagem?: string | null
          preco_saca: number
          respondida_em?: string | null
          status?: Database["public"]["Enums"]["proposta_status"]
          updated_at?: string
          validade_ate?: string | null
        }
        Update: {
          bag_count?: number | null
          corretora_id?: string
          created_at?: string
          created_by?: string | null
          enviada_em?: string | null
          id?: string
          lead_id?: string | null
          lote_id?: string | null
          mensagem?: string | null
          preco_saca?: number
          respondida_em?: string | null
          status?: Database["public"]["Enums"]["proposta_status"]
          updated_at?: string
          validade_ate?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "propostas_corretora_id_fkey"
            columns: ["corretora_id"]
            isOneToOne: false
            referencedRelation: "corretoras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propostas_corretora_id_fkey"
            columns: ["corretora_id"]
            isOneToOne: false
            referencedRelation: "corretoras_publicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propostas_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propostas_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "social_perfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propostas_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propostas_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propostas_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes_publicos"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_sources: {
        Row: {
          active: boolean
          created_at: string
          id: string
          last_error_at: string | null
          last_error_message: string | null
          last_success_at: string | null
          name: string
          notes: string | null
          provider: string | null
          slug: string
          type: string
          update_frequency: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          last_error_at?: string | null
          last_error_message?: string | null
          last_success_at?: string | null
          name: string
          notes?: string | null
          provider?: string | null
          slug: string
          type: string
          update_frequency?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          last_error_at?: string | null
          last_error_message?: string | null
          last_success_at?: string | null
          name?: string
          notes?: string | null
          provider?: string | null
          slug?: string
          type?: string
          update_frequency?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          hits: number
          key: string
          window_start: string
        }
        Insert: {
          hits?: number
          key: string
          window_start: string
        }
        Update: {
          hits?: number
          key?: string
          window_start?: string
        }
        Relationships: []
      }
      social_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          post_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          post_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "social_perfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      social_follows: {
        Row: {
          created_at: string
          followed_id: string
          follower_id: string
        }
        Insert: {
          created_at?: string
          followed_id: string
          follower_id: string
        }
        Update: {
          created_at?: string
          followed_id?: string
          follower_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_follows_followed_id_fkey"
            columns: ["followed_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_follows_followed_id_fkey"
            columns: ["followed_id"]
            isOneToOne: false
            referencedRelation: "social_perfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "social_perfis"
            referencedColumns: ["id"]
          },
        ]
      }
      social_likes: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "social_perfis"
            referencedColumns: ["id"]
          },
        ]
      }
      social_posts: {
        Row: {
          audio_path: string | null
          author_id: string
          body: string | null
          comments_count: number
          created_at: string
          id: string
          image_path: string | null
          likes_count: number
          updated_at: string
          video_path: string | null
        }
        Insert: {
          audio_path?: string | null
          author_id: string
          body?: string | null
          comments_count?: number
          created_at?: string
          id?: string
          image_path?: string | null
          likes_count?: number
          updated_at?: string
          video_path?: string | null
        }
        Update: {
          audio_path?: string | null
          author_id?: string
          body?: string | null
          comments_count?: number
          created_at?: string
          id?: string
          image_path?: string | null
          likes_count?: number
          updated_at?: string
          video_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "social_perfis"
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
      system_events: {
        Row: {
          attempts: number
          created_at: string
          error: string | null
          id: string
          kind: string
          payload: Json
          processed_at: string | null
          scheduled_at: string | null
          status: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          error?: string | null
          id?: string
          kind: string
          payload?: Json
          processed_at?: string | null
          scheduled_at?: string | null
          status?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          error?: string | null
          id?: string
          kind?: string
          payload?: Json
          processed_at?: string | null
          scheduled_at?: string | null
          status?: string
        }
        Relationships: []
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
          {
            foreignKeyName: "whatsapp_leads_produtor_id_fkey"
            columns: ["produtor_id"]
            isOneToOne: false
            referencedRelation: "social_perfis"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      contrato_saldo: {
        Row: {
          code: string | null
          contrato_id: string | null
          corretora_id: string | null
          produtor_id: string | null
          sacas_contratadas: number | null
          sacas_em_transito: number | null
          sacas_entregues: number | null
          sacas_excedente: number | null
          sacas_pendentes: number | null
          status: Database["public"]["Enums"]["contrato_status"] | null
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
            foreignKeyName: "contratos_corretora_id_fkey"
            columns: ["corretora_id"]
            isOneToOne: false
            referencedRelation: "corretoras_publicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_produtor_id_fkey"
            columns: ["produtor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_produtor_id_fkey"
            columns: ["produtor_id"]
            isOneToOne: false
            referencedRelation: "social_perfis"
            referencedColumns: ["id"]
          },
        ]
      }
      corretoras_publicas: {
        Row: {
          city: string | null
          created_at: string | null
          descricao: string | null
          email: string | null
          especialidades: string[] | null
          id: string | null
          lat: number | null
          lng: number | null
          logo_url: string | null
          name: string | null
          phone: string | null
          rating_count: number | null
          rating_media: number | null
          regioes_atendimento:
            | Database["public"]["Enums"]["regiao_cafeeira"][]
            | null
          site_url: string | null
          slug: string | null
          state: string | null
          total_negociacoes: number | null
          total_produtores: number | null
          verified: boolean | null
        }
        Insert: {
          city?: string | null
          created_at?: string | null
          descricao?: string | null
          email?: string | null
          especialidades?: string[] | null
          id?: string | null
          lat?: number | null
          lng?: number | null
          logo_url?: string | null
          name?: string | null
          phone?: string | null
          rating_count?: never
          rating_media?: never
          regioes_atendimento?:
            | Database["public"]["Enums"]["regiao_cafeeira"][]
            | null
          site_url?: string | null
          slug?: string | null
          state?: string | null
          total_negociacoes?: never
          total_produtores?: never
          verified?: boolean | null
        }
        Update: {
          city?: string | null
          created_at?: string | null
          descricao?: string | null
          email?: string | null
          especialidades?: string[] | null
          id?: string | null
          lat?: number | null
          lng?: number | null
          logo_url?: string | null
          name?: string | null
          phone?: string | null
          rating_count?: never
          rating_media?: never
          regioes_atendimento?:
            | Database["public"]["Enums"]["regiao_cafeeira"][]
            | null
          site_url?: string | null
          slug?: string | null
          state?: string | null
          total_negociacoes?: never
          total_produtores?: never
          verified?: boolean | null
        }
        Relationships: []
      }
      lotes_publicos: {
        Row: {
          altitude_m: number | null
          certificacoes: Json | null
          classificacao_bebida: string | null
          classificacao_bica_corrida: boolean | null
          classificacao_fora_de_tipo: boolean | null
          classificacao_peneira: string | null
          classificacao_pontuacao: number | null
          classificacao_tipo: string | null
          codigo: string | null
          corretora_city: string | null
          corretora_descricao: string | null
          corretora_id: string | null
          corretora_logo_url: string | null
          corretora_name: string | null
          corretora_slug: string | null
          corretora_state: string | null
          corretora_verified: boolean | null
          created_at: string | null
          descricao: string | null
          foto_capa_url: string | null
          id: string | null
          indicacao_geografica: string | null
          peso_kg: number | null
          peso_sacas: number | null
          processo: Database["public"]["Enums"]["coffee_processo"] | null
          produtor_city: string | null
          produtor_id: string | null
          produtor_state: string | null
          safra: string | null
          specie: Database["public"]["Enums"]["coffee_specie"] | null
          status: Database["public"]["Enums"]["lote_status"] | null
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
          {
            foreignKeyName: "lotes_produtor_id_fkey"
            columns: ["produtor_id"]
            isOneToOne: false
            referencedRelation: "social_perfis"
            referencedColumns: ["id"]
          },
        ]
      }
      social_perfis: {
        Row: {
          apelido: string | null
          avatar_url: string | null
          corretora_id: string | null
          corretora_nome: string | null
          created_at: string | null
          full_name: string | null
          id: string | null
          roles: Database["public"]["Enums"]["user_role"][] | null
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
      unified_quotes: {
        Row: {
          corretora_id: string | null
          corretora_name: string | null
          currency: string | null
          id: string | null
          id_raw_uuid: string | null
          price: number | null
          product_id: string | null
          product_label: string | null
          quote_date: string | null
          region_id: string | null
          region_label: string | null
          source_slug: string | null
          source_type: string | null
          source_url: string | null
          unit: string | null
          updated_at: string | null
          variation_pct: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_cancel_subscription: { Args: { p_id: string }; Returns: undefined }
      admin_grant_corretora_tier: {
        Args: {
          p_corretora_id: string
          p_period_end?: string
          p_plan_id?: string
          p_tier: string
        }
        Returns: undefined
      }
      admin_update_subscription: {
        Args: {
          p_current_period_end: string
          p_id: string
          p_notes: string
          p_plan_id: string
          p_status: string
          p_trial_ends_at: string
        }
        Returns: undefined
      }
      anonimizar_titular: { Args: { p_user_id: string }; Returns: undefined }
      approve_corretora: {
        Args: {
          p_city: string
          p_cnpj: string
          p_name: string
          p_profile_id: string
          p_slug: string
          p_state: string
        }
        Returns: {
          corretora_id: string
          error_msg: string
          success: boolean
        }[]
      }
      check_and_increment_rate: {
        Args: { p_key: string; p_limit: number; p_window_seconds: number }
        Returns: Json
      }
      check_price_targets: { Args: never; Returns: number }
      check_queue_failures: { Args: never; Returns: number }
      cleanup_old_notifications: { Args: never; Returns: number }
      consume_corretora_invite: {
        Args: { consuming_user_id: string; invite_token: string }
        Returns: {
          corretora_id: string
          error_msg: string
          success: boolean
        }[]
      }
      contrapropor_lead: {
        Args: { p_lead_id: string; p_mensagem?: string; p_preco_saca: number }
        Returns: {
          error_msg: string
          success: boolean
        }[]
      }
      current_corretora: { Args: never; Returns: string }
      current_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      current_roles: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"][]
      }
      enqueue_notification_whatsapp: {
        Args: { p_mensagem: string; p_user_id: string }
        Returns: undefined
      }
      expire_subscriptions: { Args: never; Returns: number }
      expire_trials: { Args: never; Returns: number }
      fn_log_system_event: {
        Args: {
          p_error?: string
          p_kind: string
          p_payload?: Json
          p_status: string
        }
        Returns: string
      }
      founder_program_status: { Args: never; Returns: Json }
      gerar_convite_corretora_self: {
        Args: { p_email?: string }
        Returns: {
          error_msg: string
          token: string
        }[]
      }
      get_contrato_publico: { Args: { p_id: string }; Returns: Json }
      get_corretora_invite: {
        Args: { invite_token: string }
        Returns: {
          corretora_id: string
          corretora_name: string
          corretora_slug: string
          email: string
          expires_at: string
          invalid_reason: string
          is_valid: boolean
          token: string
        }[]
      }
      get_laudo_publico: { Args: { p_id: string }; Returns: Json }
      get_quotes_mode: { Args: never; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      is_app_admin: { Args: never; Returns: boolean }
      is_corretora: { Args: never; Returns: boolean }
      is_corretora_dono: { Args: never; Returns: boolean }
      list_convites_corretora_self: {
        Args: never
        Returns: {
          created_at: string
          email: string
          expires_at: string
          token: string
        }[]
      }
      list_corretora_operadores: {
        Args: never
        Returns: {
          corretora_role: Database["public"]["Enums"]["corretora_member_role"]
          full_name: string
          id: string
          is_self: boolean
          phone: string
          status: Database["public"]["Enums"]["profile_status"]
        }[]
      }
      list_pending_corretora_signups: {
        Args: never
        Returns: {
          corretora_city: string
          corretora_cnpj: string
          corretora_name: string
          corretora_uf: string
          corretora_whatsapp: string
          email: string
          full_name: string
          profile_id: string
          signup_at: string
        }[]
      }
      log_audit: {
        Args: {
          p_action: string
          p_entity: string
          p_entity_id: string
          p_payload?: Json
        }
        Returns: undefined
      }
      mark_stale_cotacoes: { Args: never; Returns: number }
      mark_subscription_paid: { Args: { p_id: string }; Returns: string }
      mask_doc: { Args: { p_doc: string }; Returns: string }
      mask_nome: { Args: { p_nome: string }; Returns: string }
      notify_repasse_whatsapp: {
        Args: { p_evento: string; p_pagamento_id: string }
        Returns: undefined
      }
      nudge_delivery_late: { Args: never; Returns: number }
      nudge_stale_leads: { Args: never; Returns: number }
      nudge_trial_ending: { Args: never; Returns: number }
      pick_eligible_corretora: {
        Args: { p_region?: string; p_specie?: string }
        Returns: string
      }
      process_pending_dispatches: { Args: never; Returns: number }
      remover_operador_corretora: {
        Args: { p_target: string }
        Returns: {
          error_msg: string
          success: boolean
        }[]
      }
      reprocess_system_event: {
        Args: { p_event_id: string }
        Returns: undefined
      }
      revogar_convite_corretora_self: {
        Args: { p_token: string }
        Returns: undefined
      }
      social_pode_publicar: { Args: never; Returns: boolean }
      subscription_effective_status: {
        Args: { sub: Database["public"]["Tables"]["subscriptions"]["Row"] }
        Returns: Database["public"]["Enums"]["subscription_status"]
      }
      v1_criar_oferta_produtor: {
        Args: {
          p_bag_count?: number
          p_corretora_id: string
          p_observacoes?: string
          p_preco_alvo?: number
          p_processo?: string
          p_specie: string
        }
        Returns: {
          error_msg: string
          lead_id: string
          success: boolean
        }[]
      }
      v1_listar_propostas_produtor: {
        Args: { p_only_pending?: boolean }
        Returns: {
          bag_count: number
          coffee_type: string
          corretora_id: string
          corretora_nome: string
          corretora_phone: string
          created_at: string
          enviada_em: string
          id: string
          lead_id: string
          mensagem: string
          preco_saca: number
          respondida_em: string
          status: Database["public"]["Enums"]["proposta_status"]
          validade_ate: string
        }[]
      }
      v1_responder_proposta: {
        Args: { p_proposta_id: string; p_resposta: string }
        Returns: {
          error_msg: string
          success: boolean
        }[]
      }
      validate_whatsapp_lead: {
        Args: { p_lead_id: string }
        Returns: undefined
      }
    }
    Enums: {
      amostra_status:
        | "agendada"
        | "recebida"
        | "classificada"
        | "recusada"
        | "cancelada"
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
      corretora_member_role: "dono" | "operador"
      entrega_status:
        | "programada"
        | "em_transito"
        | "recebida"
        | "conferida"
        | "cancelada"
      lead_origem: "whatsapp" | "formulario" | "vitrine" | "manual"
      lead_status:
        | "novo"
        | "em_negociacao"
        | "convertido"
        | "perdido"
        | "arquivado"
      lgpd_consent_kind:
        | "termos_uso"
        | "politica_privacidade"
        | "marketing_email"
        | "marketing_whatsapp"
        | "compartilhamento_corretora"
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
        | "price_alert"
        | "social"
      oferta_status: "rascunho" | "enviada" | "aceita" | "recusada" | "expirada"
      pagamento_status: "pendente" | "pago" | "vencido" | "cancelado"
      produtor_specie: "arabica" | "conilon" | "ambos"
      produtor_status: "sombra" | "ativo" | "pendente" | "bloqueado"
      profile_status: "ativo" | "pendente" | "bloqueado"
      proposta_status:
        | "rascunho"
        | "enviada"
        | "aceita"
        | "rejeitada"
        | "expirada"
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
      amostra_status: [
        "agendada",
        "recebida",
        "classificada",
        "recusada",
        "cancelada",
      ],
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
      corretora_member_role: ["dono", "operador"],
      entrega_status: [
        "programada",
        "em_transito",
        "recebida",
        "conferida",
        "cancelada",
      ],
      lead_origem: ["whatsapp", "formulario", "vitrine", "manual"],
      lead_status: [
        "novo",
        "em_negociacao",
        "convertido",
        "perdido",
        "arquivado",
      ],
      lgpd_consent_kind: [
        "termos_uso",
        "politica_privacidade",
        "marketing_email",
        "marketing_whatsapp",
        "compartilhamento_corretora",
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
        "price_alert",
        "social",
      ],
      oferta_status: ["rascunho", "enviada", "aceita", "recusada", "expirada"],
      pagamento_status: ["pendente", "pago", "vencido", "cancelado"],
      produtor_specie: ["arabica", "conilon", "ambos"],
      produtor_status: ["sombra", "ativo", "pendente", "bloqueado"],
      profile_status: ["ativo", "pendente", "bloqueado"],
      proposta_status: [
        "rascunho",
        "enviada",
        "aceita",
        "rejeitada",
        "expirada",
      ],
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
} as const
