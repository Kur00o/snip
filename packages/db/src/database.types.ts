/* eslint-disable */
// Generated from the Supabase project `snip` (vojyxsrlxxrmusrabeem). Do not edit by hand.
// Regenerate after schema changes: Supabase MCP generate_typescript_types, or
//   npx supabase gen types typescript --project-id vojyxsrlxxrmusrabeem > packages/db/src/database.types.ts

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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      assets: {
        Row: {
          business_id: string
          created_at: string
          id: string
          kind: string
          mime_type: string | null
          size_bytes: number | null
          storage_path: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          kind: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          kind?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "assets_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_kits: {
        Row: {
          accent_color: string | null
          body_font: string | null
          business_id: string
          created_at: string
          extra: Json
          heading_font: string | null
          id: string
          logo_path: string | null
          primary_color: string
          secondary_color: string | null
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          body_font?: string | null
          business_id: string
          created_at?: string
          extra?: Json
          heading_font?: string | null
          id?: string
          logo_path?: string | null
          primary_color?: string
          secondary_color?: string | null
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          body_font?: string | null
          business_id?: string
          created_at?: string
          extra?: Json
          heading_font?: string | null
          id?: string
          logo_path?: string | null
          primary_color?: string
          secondary_color?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_kits_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          category: string | null
          city: string | null
          created_at: string
          goals: string | null
          id: string
          name: string
          onboarding_done: boolean
          owner_id: string
          target_audience: string | null
          tone: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          city?: string | null
          created_at?: string
          goals?: string | null
          id?: string
          name: string
          onboarding_done?: boolean
          owner_id: string
          target_audience?: string | null
          tone?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          city?: string | null
          created_at?: string
          goals?: string | null
          id?: string
          name?: string
          onboarding_done?: boolean
          owner_id?: string
          target_audience?: string | null
          tone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "businesses_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      clips: {
        Row: {
          business_id: string
          created_at: string
          duration_sec: number | null
          id: string
          reel_id: string
          shot_id: string | null
          storage_path: string
          transcript: string | null
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          duration_sec?: number | null
          id?: string
          reel_id: string
          shot_id?: string | null
          storage_path: string
          transcript?: string | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          duration_sec?: number | null
          id?: string
          reel_id?: string
          shot_id?: string | null
          storage_path?: string
          transcript?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clips_reel_id_business_id_fkey"
            columns: ["reel_id", "business_id"]
            isOneToOne: false
            referencedRelation: "reels"
            referencedColumns: ["id", "business_id"]
          },
          {
            foreignKeyName: "clips_shot_id_business_id_fkey"
            columns: ["shot_id", "business_id"]
            isOneToOne: false
            referencedRelation: "shots"
            referencedColumns: ["id", "business_id"]
          },
        ]
      }
      conversations: {
        Row: {
          business_id: string
          created_at: string
          id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          attempts: number
          business_id: string
          created_at: string
          error: string | null
          id: string
          kind: string
          locked_at: string | null
          payload: Json
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          business_id: string
          created_at?: string
          error?: string | null
          id?: string
          kind: string
          locked_at?: string | null
          payload?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          business_id?: string
          created_at?: string
          error?: string | null
          id?: string
          kind?: string
          locked_at?: string | null
          payload?: Json
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          business_id: string
          content: string | null
          conversation_id: string
          created_at: string
          id: string
          model_used: string | null
          role: string
          tool_calls: Json | null
        }
        Insert: {
          business_id: string
          content?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          model_used?: string | null
          role: string
          tool_calls?: Json | null
        }
        Update: {
          business_id?: string
          content?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          model_used?: string | null
          role?: string
          tool_calls?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_business_id_fkey"
            columns: ["conversation_id", "business_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id", "business_id"]
          },
        ]
      }
      post_insights: {
        Row: {
          business_id: string
          captured_on: string
          comments: number | null
          created_at: string
          id: string
          likes: number | null
          reach: number | null
          saves: number | null
          schedule_id: string
          shares: number | null
          views: number | null
          watch_time_sec: number | null
        }
        Insert: {
          business_id: string
          captured_on?: string
          comments?: number | null
          created_at?: string
          id?: string
          likes?: number | null
          reach?: number | null
          saves?: number | null
          schedule_id: string
          shares?: number | null
          views?: number | null
          watch_time_sec?: number | null
        }
        Update: {
          business_id?: string
          captured_on?: string
          comments?: number | null
          created_at?: string
          id?: string
          likes?: number | null
          reach?: number | null
          saves?: number | null
          schedule_id?: string
          shares?: number | null
          views?: number | null
          watch_time_sec?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "post_insights_schedule_id_business_id_fkey"
            columns: ["schedule_id", "business_id"]
            isOneToOne: false
            referencedRelation: "schedules"
            referencedColumns: ["id", "business_id"]
          },
        ]
      }
      posts: {
        Row: {
          brief: string | null
          business_id: string
          caption: string | null
          conversation_id: string | null
          created_at: string
          hashtags: string[]
          id: string
          status: string
          template_id: string | null
          type: string
          updated_at: string
        }
        Insert: {
          brief?: string | null
          business_id: string
          caption?: string | null
          conversation_id?: string | null
          created_at?: string
          hashtags?: string[]
          id?: string
          status?: string
          template_id?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          brief?: string | null
          business_id?: string
          caption?: string | null
          conversation_id?: string | null
          created_at?: string
          hashtags?: string[]
          id?: string
          status?: string
          template_id?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_conversation_id_business_id_fkey"
            columns: ["conversation_id", "business_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id", "business_id"]
          },
          {
            foreignKeyName: "posts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      reels: {
        Row: {
          business_id: string
          created_at: string
          id: string
          music_track: string | null
          output_path: string | null
          post_id: string
          script: string | null
          subtitles_srt: string | null
          target_seconds: number | null
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          music_track?: string | null
          output_path?: string | null
          post_id: string
          script?: string | null
          subtitles_srt?: string | null
          target_seconds?: number | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          music_track?: string | null
          output_path?: string | null
          post_id?: string
          script?: string | null
          subtitles_srt?: string | null
          target_seconds?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reels_post_id_business_id_fkey"
            columns: ["post_id", "business_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id", "business_id"]
          },
        ]
      }
      schedules: {
        Row: {
          attempts: number
          business_id: string
          created_at: string
          error: string | null
          external_post_id: string | null
          id: string
          post_id: string
          publish_at: string
          social_account_id: string
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          business_id: string
          created_at?: string
          error?: string | null
          external_post_id?: string | null
          id?: string
          post_id: string
          publish_at: string
          social_account_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          business_id?: string
          created_at?: string
          error?: string | null
          external_post_id?: string | null
          id?: string
          post_id?: string
          publish_at?: string
          social_account_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedules_post_id_business_id_fkey"
            columns: ["post_id", "business_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id", "business_id"]
          },
          {
            foreignKeyName: "schedules_social_account_id_business_id_fkey"
            columns: ["social_account_id", "business_id"]
            isOneToOne: false
            referencedRelation: "social_accounts"
            referencedColumns: ["id", "business_id"]
          },
        ]
      }
      shots: {
        Row: {
          business_id: string
          created_at: string
          description: string | null
          duration_sec: number | null
          framing: string | null
          id: string
          position: number
          reel_id: string
          tips: string | null
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          description?: string | null
          duration_sec?: number | null
          framing?: string | null
          id?: string
          position: number
          reel_id: string
          tips?: string | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          description?: string | null
          duration_sec?: number | null
          framing?: string | null
          id?: string
          position?: number
          reel_id?: string
          tips?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shots_reel_id_business_id_fkey"
            columns: ["reel_id", "business_id"]
            isOneToOne: false
            referencedRelation: "reels"
            referencedColumns: ["id", "business_id"]
          },
        ]
      }
      slides: {
        Row: {
          body: string | null
          business_id: string
          created_at: string
          headline: string | null
          id: string
          image_path: string | null
          layout: Json
          position: number
          post_id: string
          updated_at: string
        }
        Insert: {
          body?: string | null
          business_id: string
          created_at?: string
          headline?: string | null
          id?: string
          image_path?: string | null
          layout?: Json
          position: number
          post_id: string
          updated_at?: string
        }
        Update: {
          body?: string | null
          business_id?: string
          created_at?: string
          headline?: string | null
          id?: string
          image_path?: string | null
          layout?: Json
          position?: number
          post_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "slides_post_id_business_id_fkey"
            columns: ["post_id", "business_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id", "business_id"]
          },
        ]
      }
      social_accounts: {
        Row: {
          business_id: string
          created_at: string
          external_id: string
          handle: string | null
          id: string
          platform: string
          status: string
          token_expires_at: string | null
          token_secret_id: string | null
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          external_id: string
          handle?: string | null
          id?: string
          platform: string
          status?: string
          token_expires_at?: string | null
          token_secret_id?: string | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          external_id?: string
          handle?: string | null
          id?: string
          platform?: string
          status?: string
          token_expires_at?: string | null
          token_secret_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_accounts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          business_id: string | null
          created_at: string
          html_path: string
          id: string
          is_system: boolean
          kind: string
          name: string
          slots: Json
          updated_at: string
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          html_path: string
          id?: string
          is_system?: boolean
          kind: string
          name: string
          slots?: Json
          updated_at?: string
        }
        Update: {
          business_id?: string | null
          created_at?: string
          html_path?: string
          id?: string
          is_system?: boolean
          kind?: string
          name?: string
          slots?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "templates_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      timeline_items: {
        Row: {
          business_id: string
          clip_id: string
          created_at: string
          end_sec: number | null
          id: string
          overlay_text: string | null
          position: number
          reel_id: string
          start_sec: number
          transition: string | null
          updated_at: string
        }
        Insert: {
          business_id: string
          clip_id: string
          created_at?: string
          end_sec?: number | null
          id?: string
          overlay_text?: string | null
          position: number
          reel_id: string
          start_sec?: number
          transition?: string | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          clip_id?: string
          created_at?: string
          end_sec?: number | null
          id?: string
          overlay_text?: string | null
          position?: number
          reel_id?: string
          start_sec?: number
          transition?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "timeline_items_clip_id_business_id_fkey"
            columns: ["clip_id", "business_id"]
            isOneToOne: false
            referencedRelation: "clips"
            referencedColumns: ["id", "business_id"]
          },
          {
            foreignKeyName: "timeline_items_reel_id_business_id_fkey"
            columns: ["reel_id", "business_id"]
            isOneToOne: false
            referencedRelation: "reels"
            referencedColumns: ["id", "business_id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_job: {
        Args: {
          p_kinds: string[]
          p_max_attempts?: number
          p_stale_after?: string
        }
        Returns: {
          attempts: number
          business_id: string
          created_at: string
          error: string | null
          id: string
          kind: string
          locked_at: string | null
          payload: Json
          status: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "jobs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      complete_job: {
        Args: { p_error?: string; p_job_id: string; p_max_attempts?: number }
        Returns: {
          attempts: number
          business_id: string
          created_at: string
          error: string | null
          id: string
          kind: string
          locked_at: string | null
          payload: Json
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "jobs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      disconnect_social_account: {
        Args: { p_account_id: string }
        Returns: undefined
      }
      get_social_token: { Args: { p_account_id: string }; Returns: string }
      set_social_token: {
        Args: { p_account_id: string; p_expires_at?: string; p_token: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
