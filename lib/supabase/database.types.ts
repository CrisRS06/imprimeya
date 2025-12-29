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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      collage_templates: {
        Row: {
          compatible_sizes: string[] | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_premium: boolean | null
          layout_data: Json
          name: string
          premium_price: number | null
          preview_url: string | null
          slots: number
          sort_order: number | null
          thumbnail_url: string | null
        }
        Insert: {
          compatible_sizes?: string[] | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_premium?: boolean | null
          layout_data: Json
          name: string
          premium_price?: number | null
          preview_url?: string | null
          slots: number
          sort_order?: number | null
          thumbnail_url?: string | null
        }
        Update: {
          compatible_sizes?: string[] | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_premium?: boolean | null
          layout_data?: Json
          name?: string
          premium_price?: number | null
          preview_url?: string | null
          slots?: number
          sort_order?: number | null
          thumbnail_url?: string | null
        }
        Relationships: []
      }
      orders: {
        Row: {
          client_name: string | null
          client_phone: string | null
          client_session_id: string | null
          code: string
          collage_template_id: string | null
          created_at: string | null
          delivered_at: string | null
          design_data: Json
          id: string
          notes: string | null
          original_images: string[] | null
          paper_option_id: string | null
          pdf_path: string | null
          poster_cols: number | null
          poster_rows: number | null
          print_size_id: string | null
          processed_by: string | null
          processed_image_path: string | null
          processing_started_at: string | null
          product_type: Database["public"]["Enums"]["product_type"]
          quantity: number | null
          ready_at: string | null
          staff_notes: string | null
          status: Database["public"]["Enums"]["order_status"] | null
          subtotal: number | null
          total: number | null
          updated_at: string | null
        }
        Insert: {
          client_name?: string | null
          client_phone?: string | null
          client_session_id?: string | null
          code: string
          collage_template_id?: string | null
          created_at?: string | null
          delivered_at?: string | null
          design_data: Json
          id?: string
          notes?: string | null
          original_images?: string[] | null
          paper_option_id?: string | null
          pdf_path?: string | null
          poster_cols?: number | null
          poster_rows?: number | null
          print_size_id?: string | null
          processed_by?: string | null
          processed_image_path?: string | null
          processing_started_at?: string | null
          product_type: Database["public"]["Enums"]["product_type"]
          quantity?: number | null
          ready_at?: string | null
          staff_notes?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          subtotal?: number | null
          total?: number | null
          updated_at?: string | null
        }
        Update: {
          client_name?: string | null
          client_phone?: string | null
          client_session_id?: string | null
          code?: string
          collage_template_id?: string | null
          created_at?: string | null
          delivered_at?: string | null
          design_data?: Json
          id?: string
          notes?: string | null
          original_images?: string[] | null
          paper_option_id?: string | null
          pdf_path?: string | null
          poster_cols?: number | null
          poster_rows?: number | null
          print_size_id?: string | null
          processed_by?: string | null
          processed_image_path?: string | null
          processing_started_at?: string | null
          product_type?: Database["public"]["Enums"]["product_type"]
          quantity?: number | null
          ready_at?: string | null
          staff_notes?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          subtotal?: number | null
          total?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_collage_template_id_fkey"
            columns: ["collage_template_id"]
            isOneToOne: false
            referencedRelation: "collage_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_paper_option_id_fkey"
            columns: ["paper_option_id"]
            isOneToOne: false
            referencedRelation: "paper_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_print_size_id_fkey"
            columns: ["print_size_id"]
            isOneToOne: false
            referencedRelation: "print_sizes"
            referencedColumns: ["id"]
          },
        ]
      }
      paper_options: {
        Row: {
          created_at: string | null
          description: string | null
          display_name: string
          id: string
          is_active: boolean | null
          price_multiplier: number | null
          sort_order: number | null
          type: Database["public"]["Enums"]["paper_type"]
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_name: string
          id?: string
          is_active?: boolean | null
          price_multiplier?: number | null
          sort_order?: number | null
          type: Database["public"]["Enums"]["paper_type"]
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_name?: string
          id?: string
          is_active?: boolean | null
          price_multiplier?: number | null
          sort_order?: number | null
          type?: Database["public"]["Enums"]["paper_type"]
        }
        Relationships: []
      }
      print_sizes: {
        Row: {
          base_price: number
          created_at: string | null
          height_inches: number
          height_px_min: number
          height_px_optimal: number
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
          width_inches: number
          width_px_min: number
          width_px_optimal: number
        }
        Insert: {
          base_price: number
          created_at?: string | null
          height_inches: number
          height_px_min: number
          height_px_optimal: number
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
          width_inches: number
          width_px_min: number
          width_px_optimal: number
        }
        Update: {
          base_price?: number
          created_at?: string | null
          height_inches?: number
          height_px_min?: number
          height_px_optimal?: number
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
          width_inches?: number
          width_px_min?: number
          width_px_optimal?: number
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
      order_status:
        | "pending"
        | "processing"
        | "ready"
        | "delivered"
        | "cancelled"
      paper_type: "normal" | "glossy" | "matte" | "sticker" | "opalina" | "lino"
      product_type: "single_photo" | "collage" | "poster"
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
      order_status: [
        "pending",
        "processing",
        "ready",
        "delivered",
        "cancelled",
      ],
      paper_type: ["normal", "glossy", "matte", "sticker", "opalina", "lino"],
      product_type: ["single_photo", "collage", "poster"],
    },
  },
} as const
