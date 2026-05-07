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
      app_settings: {
        Row: {
          id: string
          sales_approval_threshold: number
          sell_by_buffer_days: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          sales_approval_threshold?: number
          sell_by_buffer_days?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          sales_approval_threshold?: number
          sell_by_buffer_days?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      approval_rules: {
        Row: {
          active: boolean
          approver_l1_role: string
          approver_l2_role: string
          approver_l3_role: string
          budget_allocated: number
          budget_spent_mtd: number
          created_at: string
          department: string
          id: string
          threshold_l1: number
          threshold_l2: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          approver_l1_role?: string
          approver_l2_role?: string
          approver_l3_role?: string
          budget_allocated?: number
          budget_spent_mtd?: number
          created_at?: string
          department: string
          id?: string
          threshold_l1?: number
          threshold_l2?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          approver_l1_role?: string
          approver_l2_role?: string
          approver_l3_role?: string
          budget_allocated?: number
          budget_spent_mtd?: number
          created_at?: string
          department?: string
          id?: string
          threshold_l1?: number
          threshold_l2?: number
          updated_at?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          new_value: Json | null
          old_value: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      inventory_batches: {
        Row: {
          batch_number: string
          created_at: string
          expiry_date: string | null
          id: string
          manufacturing_date: string | null
          product_id: string
          quantity_allocated: number
          quantity_available: number
          received_date: string
          status: Database["public"]["Enums"]["batch_status"]
          store_id: string | null
          unit_cost_at_receipt: number
        }
        Insert: {
          batch_number: string
          created_at?: string
          expiry_date?: string | null
          id?: string
          manufacturing_date?: string | null
          product_id: string
          quantity_allocated?: number
          quantity_available?: number
          received_date?: string
          status?: Database["public"]["Enums"]["batch_status"]
          store_id?: string | null
          unit_cost_at_receipt?: number
        }
        Update: {
          batch_number?: string
          created_at?: string
          expiry_date?: string | null
          id?: string
          manufacturing_date?: string | null
          product_id?: string
          quantity_allocated?: number
          quantity_available?: number
          received_date?: string
          status?: Database["public"]["Enums"]["batch_status"]
          store_id?: string | null
          unit_cost_at_receipt?: number
        }
        Relationships: [
          {
            foreignKeyName: "inventory_batches_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_batches_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      markdown_events: {
        Row: {
          approved_by: string | null
          batch_id: string | null
          created_at: string
          discount_percent: number
          effective_date: string
          expiry_date: string | null
          financial_impact: number
          id: string
          new_price: number
          original_price: number
          product_id: string
          reason_code: Database["public"]["Enums"]["markdown_reason"]
          source_system: Database["public"]["Enums"]["markdown_source"]
          status: Database["public"]["Enums"]["markdown_status"]
        }
        Insert: {
          approved_by?: string | null
          batch_id?: string | null
          created_at?: string
          discount_percent: number
          effective_date?: string
          expiry_date?: string | null
          financial_impact?: number
          id?: string
          new_price: number
          original_price: number
          product_id: string
          reason_code?: Database["public"]["Enums"]["markdown_reason"]
          source_system?: Database["public"]["Enums"]["markdown_source"]
          status?: Database["public"]["Enums"]["markdown_status"]
        }
        Update: {
          approved_by?: string | null
          batch_id?: string | null
          created_at?: string
          discount_percent?: number
          effective_date?: string
          expiry_date?: string | null
          financial_impact?: number
          id?: string
          new_price?: number
          original_price?: number
          product_id?: string
          reason_code?: Database["public"]["Enums"]["markdown_reason"]
          source_system?: Database["public"]["Enums"]["markdown_source"]
          status?: Database["public"]["Enums"]["markdown_status"]
        }
        Relationships: [
          {
            foreignKeyName: "markdown_events_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "inventory_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "markdown_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          category_id: string | null
          created_at: string
          current_sales_price: number
          default_sales_price: number
          expiry_trackable: boolean
          id: string
          lead_time_days: number
          name: string
          primary_supplier_id: string | null
          reorder_point: number
          reorder_quantity: number
          sell_by_days: number | null
          shelf_life_days: number | null
          sku: string
          tax_code_id: string | null
          unit_cost: number
          updated_at: string
          valuation_method: Database["public"]["Enums"]["valuation_method"]
        }
        Insert: {
          active?: boolean
          category_id?: string | null
          created_at?: string
          current_sales_price?: number
          default_sales_price?: number
          expiry_trackable?: boolean
          id?: string
          lead_time_days?: number
          name: string
          primary_supplier_id?: string | null
          reorder_point?: number
          reorder_quantity?: number
          sell_by_days?: number | null
          shelf_life_days?: number | null
          sku: string
          tax_code_id?: string | null
          unit_cost?: number
          updated_at?: string
          valuation_method?: Database["public"]["Enums"]["valuation_method"]
        }
        Update: {
          active?: boolean
          category_id?: string | null
          created_at?: string
          current_sales_price?: number
          default_sales_price?: number
          expiry_trackable?: boolean
          id?: string
          lead_time_days?: number
          name?: string
          primary_supplier_id?: string | null
          reorder_point?: number
          reorder_quantity?: number
          sell_by_days?: number | null
          shelf_life_days?: number | null
          sku?: string
          tax_code_id?: string | null
          unit_cost?: number
          updated_at?: string
          valuation_method?: Database["public"]["Enums"]["valuation_method"]
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_primary_supplier_id_fkey"
            columns: ["primary_supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_tax_code_id_fkey"
            columns: ["tax_code_id"]
            isOneToOne: false
            referencedRelation: "tax_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      purchase_order_lines: {
        Row: {
          id: string
          po_id: string
          product_id: string
          quantity: number
          received_quantity: number
          unit_cost: number
        }
        Insert: {
          id?: string
          po_id: string
          product_id: string
          quantity: number
          received_quantity?: number
          unit_cost: number
        }
        Update: {
          id?: string
          po_id?: string
          product_id?: string
          quantity?: number
          received_quantity?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_lines_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          approved_by: string | null
          created_at: string
          created_by: string | null
          department: string | null
          expected_date: string | null
          id: string
          notes: string | null
          po_number: string
          receipt_posted_at: string | null
          receipt_posted_by: string | null
          receipt_status: Database["public"]["Enums"]["receipt_status"]
          receipt_submitted_at: string | null
          receipt_submitted_by: string | null
          received_date: string | null
          status: Database["public"]["Enums"]["po_status"]
          supplier_id: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          department?: string | null
          expected_date?: string | null
          id?: string
          notes?: string | null
          po_number: string
          receipt_posted_at?: string | null
          receipt_posted_by?: string | null
          receipt_status?: Database["public"]["Enums"]["receipt_status"]
          receipt_submitted_at?: string | null
          receipt_submitted_by?: string | null
          received_date?: string | null
          status?: Database["public"]["Enums"]["po_status"]
          supplier_id: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          department?: string | null
          expected_date?: string | null
          id?: string
          notes?: string | null
          po_number?: string
          receipt_posted_at?: string | null
          receipt_posted_by?: string | null
          receipt_status?: Database["public"]["Enums"]["receipt_status"]
          receipt_submitted_at?: string | null
          receipt_submitted_by?: string | null
          received_date?: string | null
          status?: Database["public"]["Enums"]["po_status"]
          supplier_id?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_items: {
        Row: {
          batch_id: string | null
          discount_applied: number
          id: string
          line_note: string | null
          product_id: string | null
          quantity: number
          quantity_returned: number
          tax_amount: number
          transaction_id: string
          unit_price: number
        }
        Insert: {
          batch_id?: string | null
          discount_applied?: number
          id?: string
          line_note?: string | null
          product_id?: string | null
          quantity: number
          quantity_returned?: number
          tax_amount?: number
          transaction_id: string
          unit_price: number
        }
        Update: {
          batch_id?: string | null
          discount_applied?: number
          id?: string
          line_note?: string | null
          product_id?: string | null
          quantity?: number
          quantity_returned?: number
          tax_amount?: number
          transaction_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "inventory_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_items_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "sales_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_return_items: {
        Row: {
          batch_id: string | null
          id: string
          original_sales_item_id: string | null
          product_id: string
          quantity: number
          return_id: string
          unit_price: number
        }
        Insert: {
          batch_id?: string | null
          id?: string
          original_sales_item_id?: string | null
          product_id: string
          quantity: number
          return_id: string
          unit_price?: number
        }
        Update: {
          batch_id?: string | null
          id?: string
          original_sales_item_id?: string | null
          product_id?: string
          quantity?: number
          return_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_return_items_return_id_fkey"
            columns: ["return_id"]
            isOneToOne: false
            referencedRelation: "sales_returns"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_returns: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          occurred_at: string
          original_transaction_id: string | null
          reason: string | null
          return_number: string
          total_amount: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          occurred_at?: string
          original_transaction_id?: string | null
          reason?: string | null
          return_number: string
          total_amount?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          occurred_at?: string
          original_transaction_id?: string | null
          reason?: string | null
          return_number?: string
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_returns_original_transaction_id_fkey"
            columns: ["original_transaction_id"]
            isOneToOne: false
            referencedRelation: "sales_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_transactions: {
        Row: {
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          created_at: string
          customer_email: string | null
          customer_name: string | null
          id: string
          invoice_number: string | null
          notes: string | null
          occurred_at: string
          payment_status: string
          pending_cart: Json | null
          posted_at: string | null
          posted_by: string | null
          store_id: string | null
          total_amount: number
          transaction_id: string
        }
        Insert: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          id?: string
          invoice_number?: string | null
          notes?: string | null
          occurred_at?: string
          payment_status?: string
          pending_cart?: Json | null
          posted_at?: string | null
          posted_by?: string | null
          store_id?: string | null
          total_amount?: number
          transaction_id: string
        }
        Update: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          id?: string
          invoice_number?: string | null
          notes?: string | null
          occurred_at?: string
          payment_status?: string
          pending_cart?: Json | null
          posted_at?: string | null
          posted_by?: string | null
          store_id?: string | null
          total_amount?: number
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_transactions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          batch_id: string | null
          created_at: string
          created_by: string | null
          from_store_id: string | null
          id: string
          movement_type: Database["public"]["Enums"]["movement_type"]
          notes: string | null
          product_id: string
          quantity: number
          reason: string | null
          to_store_id: string | null
          unit_cost: number
        }
        Insert: {
          batch_id?: string | null
          created_at?: string
          created_by?: string | null
          from_store_id?: string | null
          id?: string
          movement_type: Database["public"]["Enums"]["movement_type"]
          notes?: string | null
          product_id: string
          quantity: number
          reason?: string | null
          to_store_id?: string | null
          unit_cost?: number
        }
        Update: {
          batch_id?: string | null
          created_at?: string
          created_by?: string | null
          from_store_id?: string | null
          id?: string
          movement_type?: Database["public"]["Enums"]["movement_type"]
          notes?: string | null
          product_id?: string
          quantity?: number
          reason?: string | null
          to_store_id?: string | null
          unit_cost?: number
        }
        Relationships: []
      }
      stores: {
        Row: {
          id: string
          location: string | null
          name: string
          store_code: string
        }
        Insert: {
          id?: string
          location?: string | null
          name: string
          store_code: string
        }
        Update: {
          id?: string
          location?: string | null
          name?: string
          store_code?: string
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          fill_rate: number
          id: string
          lead_time_days: number
          name: string
          on_time_rate: number
        }
        Insert: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          fill_rate?: number
          id?: string
          lead_time_days?: number
          name: string
          on_time_rate?: number
        }
        Update: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          fill_rate?: number
          id?: string
          lead_time_days?: number
          name?: string
          on_time_rate?: number
        }
        Relationships: []
      }
      tax_codes: {
        Row: {
          code: string
          description: string | null
          id: string
          rate: number
        }
        Insert: {
          code: string
          description?: string | null
          id?: string
          rate: number
        }
        Update: {
          code?: string
          description?: string | null
          id?: string
          rate?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_fefo_triggers: {
        Args: never
        Returns: {
          enabled: boolean
          function_name: string
          table_name: string
          trigger_name: string
        }[]
      }
      current_user_has_any_role: { Args: never; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      test_fefo_firing: {
        Args: never
        Returns: {
          fired: boolean
          message: string
        }[]
      }
    }
    Enums: {
      app_role:
        | "inventory_manager"
        | "purchasing_manager"
        | "cfo"
        | "compliance_officer"
        | "system_admin"
      batch_status:
        | "AVAILABLE"
        | "NEAR_EXPIRY"
        | "EXPIRED"
        | "QUARANTINED"
        | "MARKDOWN_ACTIVE"
      markdown_reason:
        | "EXPIRY_PROXIMITY"
        | "DEMAND_BELOW_THRESHOLD"
        | "PROMOTIONAL"
      markdown_source: "MANUAL" | "AI_PRICING_ENGINE"
      markdown_status: "PENDING" | "ACTIVE" | "EXPIRED" | "CANCELLED"
      movement_type:
        | "ADJUSTMENT"
        | "TRANSFER"
        | "WRITE_OFF"
        | "CYCLE_COUNT"
        | "RECEIPT"
        | "SALE"
      po_status:
        | "DRAFT"
        | "PENDING_APPROVAL"
        | "APPROVED"
        | "RECEIVED"
        | "CANCELLED"
      receipt_status: "DRAFT" | "SUBMITTED" | "POSTED"
      valuation_method: "FIFO" | "LIFO" | "WAC"
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
      app_role: [
        "inventory_manager",
        "purchasing_manager",
        "cfo",
        "compliance_officer",
        "system_admin",
      ],
      batch_status: [
        "AVAILABLE",
        "NEAR_EXPIRY",
        "EXPIRED",
        "QUARANTINED",
        "MARKDOWN_ACTIVE",
      ],
      markdown_reason: [
        "EXPIRY_PROXIMITY",
        "DEMAND_BELOW_THRESHOLD",
        "PROMOTIONAL",
      ],
      markdown_source: ["MANUAL", "AI_PRICING_ENGINE"],
      markdown_status: ["PENDING", "ACTIVE", "EXPIRED", "CANCELLED"],
      movement_type: [
        "ADJUSTMENT",
        "TRANSFER",
        "WRITE_OFF",
        "CYCLE_COUNT",
        "RECEIPT",
        "SALE",
      ],
      po_status: [
        "DRAFT",
        "PENDING_APPROVAL",
        "APPROVED",
        "RECEIVED",
        "CANCELLED",
      ],
      receipt_status: ["DRAFT", "SUBMITTED", "POSTED"],
      valuation_method: ["FIFO", "LIFO", "WAC"],
    },
  },
} as const
