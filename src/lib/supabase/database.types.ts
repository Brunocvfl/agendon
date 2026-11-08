
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "appointments": {
                  Row: {
                    "client_id": string,"created_at": string,"fim": string,"id": string,"inicio": string,"origem": Database["public"]['Enums']["appointment_origin"],"professional_id": string,"salon_id": string,"service_id": string,"status": Database["public"]['Enums']["appointment_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "client_id": string,"created_at"?: string,"fim": string,"id"?: string,"inicio": string,"origem"?: Database["public"]['Enums']["appointment_origin"],"professional_id": string,"salon_id": string,"service_id": string,"status"?: Database["public"]['Enums']["appointment_status"]
                  }
                  Update: {
                    "client_id"?: string,"created_at"?: string,"fim"?: string,"id"?: string,"inicio"?: string,"origem"?: Database["public"]['Enums']["appointment_origin"],"professional_id"?: string,"salon_id"?: string,"service_id"?: string,"status"?: Database["public"]['Enums']["appointment_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "appointments_client_id_salon_id_fkey"
      columns: ["client_id","salon_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id","salon_id"]
    },{
      foreignKeyName: "appointments_professional_id_salon_id_fkey"
      columns: ["professional_id","salon_id"]
isOneToOne: false
      referencedRelation: "professionals"
      referencedColumns: ["id","salon_id"]
    },{
      foreignKeyName: "appointments_service_id_salon_id_fkey"
      columns: ["service_id","salon_id"]
isOneToOne: false
      referencedRelation: "services"
      referencedColumns: ["id","salon_id"]
    }
                  ]
                },"audit_log": {
                  Row: {
                    "acao": string,"created_at": string,"id": number,"registro_id": string | null,"salon_id": string,"tabela": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "acao": string,"created_at"?: string,"id"?: never,"registro_id"?: string | null,"salon_id": string,"tabela": string,"user_id"?: string | null
                  }
                  Update: {
                    "acao"?: string,"created_at"?: string,"id"?: never,"registro_id"?: string | null,"salon_id"?: string,"tabela"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "audit_log_salon_id_fkey"
      columns: ["salon_id"]
isOneToOne: false
      referencedRelation: "salons"
      referencedColumns: ["id"]
    }
                  ]
                },"clients": {
                  Row: {
                    "anonimizado_em": string | null,"consentimento_origem": string | null,"consentimento_whatsapp_em": string | null,"created_at": string,"id": string,"nome": string,"observacoes": string | null,"optout_em": string | null,"salon_id": string,"telefone": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "anonimizado_em"?: string | null,"consentimento_origem"?: string | null,"consentimento_whatsapp_em"?: string | null,"created_at"?: string,"id"?: string,"nome": string,"observacoes"?: string | null,"optout_em"?: string | null,"salon_id": string,"telefone"?: string | null
                  }
                  Update: {
                    "anonimizado_em"?: string | null,"consentimento_origem"?: string | null,"consentimento_whatsapp_em"?: string | null,"created_at"?: string,"id"?: string,"nome"?: string,"observacoes"?: string | null,"optout_em"?: string | null,"salon_id"?: string,"telefone"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "clients_salon_id_fkey"
      columns: ["salon_id"]
isOneToOne: false
      referencedRelation: "salons"
      referencedColumns: ["id"]
    }
                  ]
                },"members": {
                  Row: {
                    "created_at": string,"id": string,"perfil": Database["public"]['Enums']["member_role"],"salon_id": string,"status": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"perfil": Database["public"]['Enums']["member_role"],"salon_id": string,"status"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"perfil"?: Database["public"]['Enums']["member_role"],"salon_id"?: string,"status"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "members_salon_id_fkey"
      columns: ["salon_id"]
isOneToOne: false
      referencedRelation: "salons"
      referencedColumns: ["id"]
    }
                  ]
                },"message_log": {
                  Row: {
                    "appointment_id": string | null,"created_at": string,"custo_estimado": number | null,"id": string,"meta_message_id": string | null,"salon_id": string,"status": string,"tipo": string
                  }
                  ComputedFields: never
                  Insert: {
                    "appointment_id"?: string | null,"created_at"?: string,"custo_estimado"?: number | null,"id"?: string,"meta_message_id"?: string | null,"salon_id": string,"status"?: string,"tipo": string
                  }
                  Update: {
                    "appointment_id"?: string | null,"created_at"?: string,"custo_estimado"?: number | null,"id"?: string,"meta_message_id"?: string | null,"salon_id"?: string,"status"?: string,"tipo"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "message_log_appointment_id_fkey"
      columns: ["appointment_id"]
isOneToOne: false
      referencedRelation: "appointments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "message_log_salon_id_fkey"
      columns: ["salon_id"]
isOneToOne: false
      referencedRelation: "salons"
      referencedColumns: ["id"]
    }
                  ]
                },"message_templates": {
                  Row: {
                    "ativo": boolean,"id": string,"salon_id": string,"status_meta": string,"texto": string,"tipo": string
                  }
                  ComputedFields: never
                  Insert: {
                    "ativo"?: boolean,"id"?: string,"salon_id": string,"status_meta"?: string,"texto": string,"tipo": string
                  }
                  Update: {
                    "ativo"?: boolean,"id"?: string,"salon_id"?: string,"status_meta"?: string,"texto"?: string,"tipo"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "message_templates_salon_id_fkey"
      columns: ["salon_id"]
isOneToOne: false
      referencedRelation: "salons"
      referencedColumns: ["id"]
    }
                  ]
                },"professional_services": {
                  Row: {
                    "duracao_min": number | null,"preco": number | null,"professional_id": string,"salon_id": string,"service_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "duracao_min"?: number | null,"preco"?: number | null,"professional_id": string,"salon_id": string,"service_id": string
                  }
                  Update: {
                    "duracao_min"?: number | null,"preco"?: number | null,"professional_id"?: string,"salon_id"?: string,"service_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "professional_services_professional_id_salon_id_fkey"
      columns: ["professional_id","salon_id"]
isOneToOne: false
      referencedRelation: "professionals"
      referencedColumns: ["id","salon_id"]
    },{
      foreignKeyName: "professional_services_service_id_salon_id_fkey"
      columns: ["service_id","salon_id"]
isOneToOne: false
      referencedRelation: "services"
      referencedColumns: ["id","salon_id"]
    }
                  ]
                },"professionals": {
                  Row: {
                    "ativo": boolean,"created_at": string,"id": string,"member_id": string | null,"nome": string,"salon_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "ativo"?: boolean,"created_at"?: string,"id"?: string,"member_id"?: string | null,"nome": string,"salon_id": string
                  }
                  Update: {
                    "ativo"?: boolean,"created_at"?: string,"id"?: string,"member_id"?: string | null,"nome"?: string,"salon_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "professionals_member_id_fkey"
      columns: ["member_id"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "professionals_salon_id_fkey"
      columns: ["salon_id"]
isOneToOne: false
      referencedRelation: "salons"
      referencedColumns: ["id"]
    }
                  ]
                },"salons": {
                  Row: {
                    "created_at": string,"endereco": string | null,"fuso": string,"id": string,"nome": string,"plano": string,"slug": string,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"endereco"?: string | null,"fuso"?: string,"id"?: string,"nome": string,"plano"?: string,"slug": string,"status"?: string
                  }
                  Update: {
                    "created_at"?: string,"endereco"?: string | null,"fuso"?: string,"id"?: string,"nome"?: string,"plano"?: string,"slug"?: string,"status"?: string
                  }
                  Relationships: [
                    
                  ]
                },"services": {
                  Row: {
                    "ativo": boolean,"created_at": string,"duracao_min": number,"id": string,"nome": string,"preco": number,"salon_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "ativo"?: boolean,"created_at"?: string,"duracao_min": number,"id"?: string,"nome": string,"preco": number,"salon_id": string
                  }
                  Update: {
                    "ativo"?: boolean,"created_at"?: string,"duracao_min"?: number,"id"?: string,"nome"?: string,"preco"?: number,"salon_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "services_salon_id_fkey"
      columns: ["salon_id"]
isOneToOne: false
      referencedRelation: "salons"
      referencedColumns: ["id"]
    }
                  ]
                },"subscriptions": {
                  Row: {
                    "ciclo_inicio": string,"max_agendamentos_mes": number,"max_agendas": number,"plano": string,"salon_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "ciclo_inicio"?: string,"max_agendamentos_mes"?: number,"max_agendas"?: number,"plano"?: string,"salon_id": string
                  }
                  Update: {
                    "ciclo_inicio"?: string,"max_agendamentos_mes"?: number,"max_agendas"?: number,"plano"?: string,"salon_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "subscriptions_salon_id_fkey"
      columns: ["salon_id"]
isOneToOne: true
      referencedRelation: "salons"
      referencedColumns: ["id"]
    }
                  ]
                },"time_off": {
                  Row: {
                    "fim": string,"id": string,"inicio": string,"motivo": string | null,"professional_id": string,"salon_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "fim": string,"id"?: string,"inicio": string,"motivo"?: string | null,"professional_id": string,"salon_id": string
                  }
                  Update: {
                    "fim"?: string,"id"?: string,"inicio"?: string,"motivo"?: string | null,"professional_id"?: string,"salon_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "time_off_professional_id_salon_id_fkey"
      columns: ["professional_id","salon_id"]
isOneToOne: false
      referencedRelation: "professionals"
      referencedColumns: ["id","salon_id"]
    }
                  ]
                },"working_hours": {
                  Row: {
                    "dia_semana": number,"fim": string,"id": string,"inicio": string,"professional_id": string,"salon_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "dia_semana": number,"fim": string,"id"?: string,"inicio": string,"professional_id": string,"salon_id": string
                  }
                  Update: {
                    "dia_semana"?: number,"fim"?: string,"id"?: string,"inicio"?: string,"professional_id"?: string,"salon_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "working_hours_professional_id_salon_id_fkey"
      columns: ["professional_id","salon_id"]
isOneToOne: false
      referencedRelation: "professionals"
      referencedColumns: ["id","salon_id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "create_salon":
{ Args: { "p_nome": string,"p_slug": string }; Returns: string
                           }
          }
          Enums: {
            "appointment_origin": "publico"|"painel","appointment_status": "agendado"|"confirmado"|"concluido"|"faltou"|"cancelado","member_role": "dono"|"recepcao"|"profissional"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "appointment_origin": ["publico", "painel"],"appointment_status": ["agendado", "confirmado", "concluido", "faltou", "cancelado"],"member_role": ["dono", "recepcao", "profissional"]
          }
        }
} as const
