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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          created_at: string
          created_by: string
          details: Json
          household_id: string | null
          id: string
          logged_at: string
          timezone: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          details?: Json
          household_id?: string | null
          id?: string
          logged_at: string
          timezone?: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          details?: Json
          household_id?: string | null
          id?: string
          logged_at?: string
          timezone?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          chat_date: string
          content: string
          created_at: string
          household_id: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          chat_date: string
          content: string
          created_at?: string
          household_id: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          chat_date?: string
          content?: string
          created_at?: string
          household_id?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      cohort_statistics: {
        Row: {
          active_baby_count: number
          avg_feed_volume: number | null
          avg_feed_volume_change: number | null
          cohort_label: string
          cohort_month: string
          created_at: string | null
          fallback_tier: string | null
          feed_count_change: number | null
          feed_count_per_day: number | null
          id: string
          insight_text: string | null
          metric_coverage: Json | null
          naps_per_day: number | null
          naps_per_day_change: number | null
          night_sleep_change: number | null
          night_sleep_hours: number | null
          solids_started_pct: number | null
          updated_at: string | null
          week_end_date: string
          week_start_date: string
        }
        Insert: {
          active_baby_count?: number
          avg_feed_volume?: number | null
          avg_feed_volume_change?: number | null
          cohort_label: string
          cohort_month: string
          created_at?: string | null
          fallback_tier?: string | null
          feed_count_change?: number | null
          feed_count_per_day?: number | null
          id?: string
          insight_text?: string | null
          metric_coverage?: Json | null
          naps_per_day?: number | null
          naps_per_day_change?: number | null
          night_sleep_change?: number | null
          night_sleep_hours?: number | null
          solids_started_pct?: number | null
          updated_at?: string | null
          week_end_date: string
          week_start_date: string
        }
        Update: {
          active_baby_count?: number
          avg_feed_volume?: number | null
          avg_feed_volume_change?: number | null
          cohort_label?: string
          cohort_month?: string
          created_at?: string | null
          fallback_tier?: string | null
          feed_count_change?: number | null
          feed_count_per_day?: number | null
          id?: string
          insight_text?: string | null
          metric_coverage?: Json | null
          naps_per_day?: number | null
          naps_per_day_change?: number | null
          night_sleep_change?: number | null
          night_sleep_hours?: number | null
          solids_started_pct?: number | null
          updated_at?: string | null
          week_end_date?: string
          week_start_date?: string
        }
        Relationships: []
      }
      collaborators: {
        Row: {
          created_at: string
          household_id: string | null
          id: string
          invited_by: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          household_id?: string | null
          id?: string
          invited_by: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          household_id?: string | null
          id?: string
          invited_by?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collaborators_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_activity_summaries: {
        Row: {
          avg_nap_length: number | null
          avg_wake_window: number | null
          created_at: string | null
          diaper_count: number | null
          feed_count: number | null
          feed_unit: string | null
          household_id: string
          id: string
          measurements: Json | null
          nap_count: number | null
          nap_details: Json | null
          summary_date: string
          total_feed_volume: number | null
          total_nap_minutes: number | null
          updated_at: string | null
          wake_windows: Json | null
        }
        Insert: {
          avg_nap_length?: number | null
          avg_wake_window?: number | null
          created_at?: string | null
          diaper_count?: number | null
          feed_count?: number | null
          feed_unit?: string | null
          household_id: string
          id?: string
          measurements?: Json | null
          nap_count?: number | null
          nap_details?: Json | null
          summary_date: string
          total_feed_volume?: number | null
          total_nap_minutes?: number | null
          updated_at?: string | null
          wake_windows?: Json | null
        }
        Update: {
          avg_nap_length?: number | null
          avg_wake_window?: number | null
          created_at?: string | null
          diaper_count?: number | null
          feed_count?: number | null
          feed_unit?: string | null
          household_id?: string
          id?: string
          measurements?: Json | null
          nap_count?: number | null
          nap_details?: Json | null
          summary_date?: string
          total_feed_volume?: number | null
          total_nap_minutes?: number | null
          updated_at?: string | null
          wake_windows?: Json | null
        }
        Relationships: []
      }
      daily_data_pulse: {
        Row: {
          created_at: string | null
          date: string
          feed_volume_change_percent: number | null
          household_id: string
          id: string
          sleep_change_percent: number | null
          total_sleep_hours: number | null
          total_sleep_minutes: number | null
          wake_average_diff_minutes: number | null
          wake_average_hours: number | null
          wake_average_minutes: number | null
        }
        Insert: {
          created_at?: string | null
          date: string
          feed_volume_change_percent?: number | null
          household_id: string
          id?: string
          sleep_change_percent?: number | null
          total_sleep_hours?: number | null
          total_sleep_minutes?: number | null
          wake_average_diff_minutes?: number | null
          wake_average_hours?: number | null
          wake_average_minutes?: number | null
        }
        Update: {
          created_at?: string | null
          date?: string
          feed_volume_change_percent?: number | null
          household_id?: string
          id?: string
          sleep_change_percent?: number | null
          total_sleep_hours?: number | null
          total_sleep_minutes?: number | null
          wake_average_diff_minutes?: number | null
          wake_average_hours?: number | null
          wake_average_minutes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_data_pulse_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_schedule_predictions: {
        Row: {
          accuracy_score: number | null
          created_at: string
          generated_at: string
          household_id: string
          id: string
          last_accuracy_check: string | null
          predicted_schedule: Json
          prediction_date: string
        }
        Insert: {
          accuracy_score?: number | null
          created_at?: string
          generated_at?: string
          household_id: string
          id?: string
          last_accuracy_check?: string | null
          predicted_schedule: Json
          prediction_date: string
        }
        Update: {
          accuracy_score?: number | null
          created_at?: string
          generated_at?: string
          household_id?: string
          id?: string
          last_accuracy_check?: string | null
          predicted_schedule?: Json
          prediction_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_schedule_predictions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          baby_birthday: string | null
          baby_name: string | null
          baby_photo_url: string | null
          baby_sex: string | null
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          baby_birthday?: string | null
          baby_name?: string | null
          baby_photo_url?: string | null
          baby_sex?: string | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Update: {
          baby_birthday?: string | null
          baby_name?: string | null
          baby_photo_url?: string | null
          baby_sex?: string | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      invite_links: {
        Row: {
          code: string
          created_at: string
          created_by: string
          expires_at: string
          household_id: string | null
          id: string
          role: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by: string
          expires_at: string
          household_id?: string | null
          id?: string
          role?: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          expires_at?: string
          household_id?: string | null
          id?: string
          role?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invite_links_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          baby_birth_date: string | null
          baby_name: string | null
          created_at: string
          daily_recap_enabled: boolean | null
          daily_recap_include_notes: boolean | null
          daily_recap_notifications: boolean | null
          full_name: string | null
          id: string
          night_sleep_end_hour: number | null
          night_sleep_start_hour: number | null
          photo_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          baby_birth_date?: string | null
          baby_name?: string | null
          created_at?: string
          daily_recap_enabled?: boolean | null
          daily_recap_include_notes?: boolean | null
          daily_recap_notifications?: boolean | null
          full_name?: string | null
          id?: string
          night_sleep_end_hour?: number | null
          night_sleep_start_hour?: number | null
          photo_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          baby_birth_date?: string | null
          baby_name?: string | null
          created_at?: string
          daily_recap_enabled?: boolean | null
          daily_recap_include_notes?: boolean | null
          daily_recap_notifications?: boolean | null
          full_name?: string | null
          id?: string
          night_sleep_end_hour?: number | null
          night_sleep_start_hour?: number | null
          photo_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invite: { Args: { invite_code: string }; Returns: string }
      generate_invite_code: { Args: never; Returns: string }
      get_accessible_household_ids: {
        Args: { _user_id: string }
        Returns: {
          household_id: string
        }[]
      }
      get_chat_date: {
        Args: { timestamp_tz: string; user_timezone: string }
        Returns: string
      }
      get_collaborators_with_profiles: {
        Args: { _household_id: string }
        Returns: {
          created_at: string
          full_name: string
          household_id: string
          id: string
          invited_by: string
          role: string
          user_id: string
        }[]
      }
      user_has_household_access: {
        Args: { _household_id: string; _user_id: string }
        Returns: boolean
      }
      user_is_parent_in_household: {
        Args: { _user_id: string }
        Returns: boolean
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
    Enums: {},
  },
} as const
