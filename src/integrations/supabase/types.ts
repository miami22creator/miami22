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
      alerts: {
        Row: {
          asset_id: string | null
          confidence: number
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          signal_type: string
        }
        Insert: {
          asset_id?: string | null
          confidence: number
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          signal_type: string
        }
        Update: {
          asset_id?: string | null
          confidence?: number
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          signal_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      algorithm_improvements: {
        Row: {
          accuracy_after: number | null
          accuracy_before: number | null
          ai_recommendations: string | null
          changes_made: Json
          created_at: string
          id: string
          metrics: Json | null
          version: string
        }
        Insert: {
          accuracy_after?: number | null
          accuracy_before?: number | null
          ai_recommendations?: string | null
          changes_made: Json
          created_at?: string
          id?: string
          metrics?: Json | null
          version: string
        }
        Update: {
          accuracy_after?: number | null
          accuracy_before?: number | null
          ai_recommendations?: string | null
          changes_made?: Json
          created_at?: string
          id?: string
          metrics?: Json | null
          version?: string
        }
        Relationships: []
      }
      assets: {
        Row: {
          active: boolean | null
          created_at: string | null
          id: string
          name: string
          symbol: string
          type: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          name: string
          symbol: string
          type: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          name?: string
          symbol?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      cron_executions: {
        Row: {
          error_message: string | null
          executed_at: string | null
          id: string
          job_name: string
          success: boolean | null
        }
        Insert: {
          error_message?: string | null
          executed_at?: string | null
          id?: string
          job_name: string
          success?: boolean | null
        }
        Update: {
          error_message?: string | null
          executed_at?: string | null
          id?: string
          job_name?: string
          success?: boolean | null
        }
        Relationships: []
      }
      influencers: {
        Row: {
          accuracy_score: number | null
          avatar_url: string | null
          correct_predictions: number | null
          created_at: string
          followers_count: number | null
          id: string
          influence_score: number | null
          is_active: boolean | null
          name: string
          platform: string
          total_predictions: number | null
          updated_at: string
          username: string
        }
        Insert: {
          accuracy_score?: number | null
          avatar_url?: string | null
          correct_predictions?: number | null
          created_at?: string
          followers_count?: number | null
          id?: string
          influence_score?: number | null
          is_active?: boolean | null
          name: string
          platform: string
          total_predictions?: number | null
          updated_at?: string
          username: string
        }
        Update: {
          accuracy_score?: number | null
          avatar_url?: string | null
          correct_predictions?: number | null
          created_at?: string
          followers_count?: number | null
          id?: string
          influence_score?: number | null
          is_active?: boolean | null
          name?: string
          platform?: string
          total_predictions?: number | null
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      market_news: {
        Row: {
          asset_id: string | null
          category: string | null
          created_at: string
          headline: string
          id: string
          keywords: string[] | null
          nlp_analysis: Json | null
          nlp_analyzed_at: string | null
          published_at: string
          relevance_score: number | null
          sentiment_label: string | null
          sentiment_score: number | null
          source: string
          summary: string | null
          url: string | null
        }
        Insert: {
          asset_id?: string | null
          category?: string | null
          created_at?: string
          headline: string
          id?: string
          keywords?: string[] | null
          nlp_analysis?: Json | null
          nlp_analyzed_at?: string | null
          published_at: string
          relevance_score?: number | null
          sentiment_label?: string | null
          sentiment_score?: number | null
          source: string
          summary?: string | null
          url?: string | null
        }
        Update: {
          asset_id?: string | null
          category?: string | null
          created_at?: string
          headline?: string
          id?: string
          keywords?: string[] | null
          nlp_analysis?: Json | null
          nlp_analyzed_at?: string | null
          published_at?: string
          relevance_score?: number | null
          sentiment_label?: string | null
          sentiment_score?: number | null
          source?: string
          summary?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "market_news_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      price_correlations: {
        Row: {
          asset_id: string
          created_at: string
          id: string
          measured_at: string | null
          post_id: string | null
          prediction_correct: boolean | null
          price_after: number | null
          price_before: number
          price_change_percent: number | null
          signal_confidence: number | null
          signal_type: string | null
          time_to_impact_hours: number | null
          validation_timestamp: string | null
        }
        Insert: {
          asset_id: string
          created_at?: string
          id?: string
          measured_at?: string | null
          post_id?: string | null
          prediction_correct?: boolean | null
          price_after?: number | null
          price_before: number
          price_change_percent?: number | null
          signal_confidence?: number | null
          signal_type?: string | null
          time_to_impact_hours?: number | null
          validation_timestamp?: string | null
        }
        Update: {
          asset_id?: string
          created_at?: string
          id?: string
          measured_at?: string | null
          post_id?: string | null
          prediction_correct?: boolean | null
          price_after?: number | null
          price_before?: number
          price_change_percent?: number | null
          signal_confidence?: number | null
          signal_type?: string | null
          time_to_impact_hours?: number | null
          validation_timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "price_correlations_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_correlations_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      social_posts: {
        Row: {
          analyzed_at: string | null
          asset_id: string | null
          created_at: string
          engagement_count: number | null
          id: string
          influencer_id: string
          post_text: string
          post_url: string | null
          posted_at: string
          sentiment_label: string | null
          sentiment_score: number | null
          urgency_level: string | null
        }
        Insert: {
          analyzed_at?: string | null
          asset_id?: string | null
          created_at?: string
          engagement_count?: number | null
          id?: string
          influencer_id: string
          post_text: string
          post_url?: string | null
          posted_at: string
          sentiment_label?: string | null
          sentiment_score?: number | null
          urgency_level?: string | null
        }
        Update: {
          analyzed_at?: string | null
          asset_id?: string | null
          created_at?: string
          engagement_count?: number | null
          id?: string
          influencer_id?: string
          post_text?: string
          post_url?: string | null
          posted_at?: string
          sentiment_label?: string | null
          sentiment_score?: number | null
          urgency_level?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_posts_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_posts_influencer_id_fkey"
            columns: ["influencer_id"]
            isOneToOne: false
            referencedRelation: "influencers"
            referencedColumns: ["id"]
          },
        ]
      }
      technical_indicators: {
        Row: {
          asset_id: string | null
          atr: number | null
          bollinger_lower: number | null
          bollinger_upper: number | null
          created_at: string | null
          ema_200: number | null
          ema_50: number | null
          id: string
          macd: number | null
          obv_change: number | null
          rsi: number | null
          volume: number | null
        }
        Insert: {
          asset_id?: string | null
          atr?: number | null
          bollinger_lower?: number | null
          bollinger_upper?: number | null
          created_at?: string | null
          ema_200?: number | null
          ema_50?: number | null
          id?: string
          macd?: number | null
          obv_change?: number | null
          rsi?: number | null
          volume?: number | null
        }
        Update: {
          asset_id?: string | null
          atr?: number | null
          bollinger_lower?: number | null
          bollinger_upper?: number | null
          created_at?: string | null
          ema_200?: number | null
          ema_50?: number | null
          id?: string
          macd?: number | null
          obv_change?: number | null
          rsi?: number | null
          volume?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "technical_indicators_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      trading_signals: {
        Row: {
          asset_id: string | null
          change_percent: number
          confidence: number
          created_at: string | null
          id: string
          price: number
          signal: string
        }
        Insert: {
          asset_id?: string | null
          change_percent: number
          confidence: number
          created_at?: string | null
          id?: string
          price: number
          signal: string
        }
        Update: {
          asset_id?: string | null
          change_percent?: number
          confidence?: number
          created_at?: string | null
          id?: string
          price?: number
          signal?: string
        }
        Relationships: [
          {
            foreignKeyName: "trading_signals_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      cron_jobs_status: {
        Row: {
          active: boolean | null
          command: string | null
          database: string | null
          jobid: number | null
          jobname: string | null
          nodename: string | null
          nodeport: number | null
          schedule: string | null
          username: string | null
        }
        Insert: {
          active?: boolean | null
          command?: string | null
          database?: string | null
          jobid?: number | null
          jobname?: string | null
          nodename?: string | null
          nodeport?: number | null
          schedule?: string | null
          username?: string | null
        }
        Update: {
          active?: boolean | null
          command?: string | null
          database?: string | null
          jobid?: number | null
          jobname?: string | null
          nodename?: string | null
          nodeport?: number | null
          schedule?: string | null
          username?: string | null
        }
        Relationships: []
      }
      prediction_accuracy_by_asset: {
        Row: {
          accuracy_percent: number | null
          avg_price_change: number | null
          correct_predictions: number | null
          name: string | null
          symbol: string | null
          total_predictions: number | null
          type: string | null
        }
        Relationships: []
      }
      prediction_accuracy_by_period: {
        Row: {
          accuracy_percent: number | null
          correct_predictions: number | null
          period: string | null
          total_predictions: number | null
        }
        Relationships: []
      }
      prediction_accuracy_by_signal_type: {
        Row: {
          accuracy_percent: number | null
          avg_confidence: number | null
          correct_predictions: number | null
          signal_type: string | null
          total_predictions: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      generate_all_signals: { Args: never; Returns: undefined }
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
