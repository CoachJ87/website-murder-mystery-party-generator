export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      character_assignments: {
        Row: {
          access_token: string
          character_id: string
          created_at: string
          guest_email: string
          guest_name: string
          id: string
          is_sent: boolean
          mystery_id: string
          sent_at: string | null
          updated_at: string
        }
        Insert: {
          access_token?: string
          character_id: string
          created_at?: string
          guest_email: string
          guest_name: string
          id?: string
          is_sent?: boolean
          mystery_id: string
          sent_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string
          character_id?: string
          created_at?: string
          guest_email?: string
          guest_name?: string
          id?: string
          is_sent?: boolean
          mystery_id?: string
          sent_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_character_assignments_character_id"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "mystery_characters"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          additional_details: string | null
          created_at: string | null
          display_status: string | null
          has_accomplice: boolean | null
          has_complete_package: boolean | null
          id: string
          is_completed: boolean | null
          is_paid: boolean | null
          mystery_data: Json | null
          needs_package_generation: boolean | null
          package_generated_at: string | null
          player_count: number | null
          purchase_date: string | null
          script_type: string | null
          status: string | null
          system_instruction: string | null
          theme: string | null
          title: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          additional_details?: string | null
          created_at?: string | null
          display_status?: string | null
          has_accomplice?: boolean | null
          has_complete_package?: boolean | null
          id?: string
          is_completed?: boolean | null
          is_paid?: boolean | null
          mystery_data?: Json | null
          needs_package_generation?: boolean | null
          package_generated_at?: string | null
          player_count?: number | null
          purchase_date?: string | null
          script_type?: string | null
          status?: string | null
          system_instruction?: string | null
          theme?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          additional_details?: string | null
          created_at?: string | null
          display_status?: string | null
          has_accomplice?: boolean | null
          has_complete_package?: boolean | null
          id?: string
          is_completed?: boolean | null
          is_paid?: boolean | null
          mystery_data?: Json | null
          needs_package_generation?: boolean | null
          package_generated_at?: string | null
          player_count?: number | null
          purchase_date?: string | null
          script_type?: string | null
          status?: string | null
          system_instruction?: string | null
          theme?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string | null
          created_at: string | null
          id: string
          is_ai: boolean | null
          role: string
        }
        Insert: {
          content: string
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          is_ai?: boolean | null
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          is_ai?: boolean | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_messages_conversation_id"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      mystery_characters: {
        Row: {
          background: string | null
          character_name: string
          created_at: string | null
          description: string | null
          final_accomplice: string | null
          final_guilty: string | null
          final_innocent: string | null
          id: string
          introduction: string | null
          package_id: string | null
          questioning_options: Json | null
          relationships: Json | null
          round_scripts: Json | null
          round1_statement: string | null
          round2_accomplice: string | null
          round2_guilty: string | null
          round2_innocent: string | null
          round2_questions: string | null
          round2_statement: string | null
          round3_accomplice: string | null
          round3_guilty: string | null
          round3_innocent: string | null
          round3_questions: string | null
          round3_statement: string | null
          round4_accomplice: string | null
          round4_guilty: string | null
          round4_innocent: string | null
          round4_questions: string | null
          rumors: string | null
          secret: string | null
          secrets: Json | null
          updated_at: string | null
          whereabouts: string | null
        }
        Insert: {
          background?: string | null
          character_name: string
          created_at?: string | null
          description?: string | null
          final_accomplice?: string | null
          final_guilty?: string | null
          final_innocent?: string | null
          id?: string
          introduction?: string | null
          package_id?: string | null
          questioning_options?: Json | null
          relationships?: Json | null
          round_scripts?: Json | null
          round1_statement?: string | null
          round2_accomplice?: string | null
          round2_guilty?: string | null
          round2_innocent?: string | null
          round2_questions?: string | null
          round2_statement?: string | null
          round3_accomplice?: string | null
          round3_guilty?: string | null
          round3_innocent?: string | null
          round3_questions?: string | null
          round3_statement?: string | null
          round4_accomplice?: string | null
          round4_guilty?: string | null
          round4_innocent?: string | null
          round4_questions?: string | null
          rumors?: string | null
          secret?: string | null
          secrets?: Json | null
          updated_at?: string | null
          whereabouts?: string | null
        }
        Update: {
          background?: string | null
          character_name?: string
          created_at?: string | null
          description?: string | null
          final_accomplice?: string | null
          final_guilty?: string | null
          final_innocent?: string | null
          id?: string
          introduction?: string | null
          package_id?: string | null
          questioning_options?: Json | null
          relationships?: Json | null
          round_scripts?: Json | null
          round1_statement?: string | null
          round2_accomplice?: string | null
          round2_guilty?: string | null
          round2_innocent?: string | null
          round2_questions?: string | null
          round2_statement?: string | null
          round3_accomplice?: string | null
          round3_guilty?: string | null
          round3_innocent?: string | null
          round3_questions?: string | null
          round3_statement?: string | null
          round4_accomplice?: string | null
          round4_guilty?: string | null
          round4_innocent?: string | null
          round4_questions?: string | null
          rumors?: string | null
          secret?: string | null
          secrets?: Json | null
          updated_at?: string | null
          whereabouts?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mystery_characters_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "mystery_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      mystery_packages: {
        Row: {
          conversation_id: string | null
          created_at: string | null
          detective_script: string | null
          evidence_cards: Json | null
          game_overview: string | null
          generation_completed_at: string | null
          generation_started_at: string | null
          generation_status: Json | null
          host_guide: string | null
          hosting_tips: string | null
          id: string
          legacy_content: string | null
          materials: string | null
          partial_content: Json | null
          preparation_instructions: string | null
          relationship_matrix: Json | null
          timeline: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string | null
          detective_script?: string | null
          evidence_cards?: Json | null
          game_overview?: string | null
          generation_completed_at?: string | null
          generation_started_at?: string | null
          generation_status?: Json | null
          host_guide?: string | null
          hosting_tips?: string | null
          id?: string
          legacy_content?: string | null
          materials?: string | null
          partial_content?: Json | null
          preparation_instructions?: string | null
          relationship_matrix?: Json | null
          timeline?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          conversation_id?: string | null
          created_at?: string | null
          detective_script?: string | null
          evidence_cards?: Json | null
          game_overview?: string | null
          generation_completed_at?: string | null
          generation_started_at?: string | null
          generation_status?: Json | null
          host_guide?: string | null
          hosting_tips?: string | null
          id?: string
          legacy_content?: string | null
          materials?: string | null
          partial_content?: Json | null
          preparation_instructions?: string | null
          relationship_matrix?: Json | null
          timeline?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          has_purchased: boolean | null
          id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          has_purchased?: boolean | null
          id: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          has_purchased?: boolean | null
          id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
