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
    PostgrestVersion: "12.2.3"
  }
  public: {
    Tables: {
      cloudflare_auth: {
        Row: {
          config_backup: Json | null
          created_at: string
          id: number
          site_id: string | null
          status: string | null
          token: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          config_backup?: Json | null
          created_at?: string
          id?: number
          site_id?: string | null
          status?: string | null
          token?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          config_backup?: Json | null
          created_at?: string
          id?: number
          site_id?: string | null
          status?: string | null
          token?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cloudflare_auth_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "cloudflare_kv_tracking"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "cloudflare_auth_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "cloudflare_auth_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "v_cf_zone_per_site"
            referencedColumns: ["order_id"]
          },
        ]
      }
      email_reporting: {
        Row: {
          id: string
          optional_email: string | null
          order_id: string
          report_verbosity: number
        }
        Insert: {
          id?: string
          optional_email?: string | null
          order_id: string
          report_verbosity?: number
        }
        Update: {
          id?: string
          optional_email?: string | null
          order_id?: string
          report_verbosity?: number
        }
        Relationships: [
          {
            foreignKeyName: "email_reporting_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "cloudflare_kv_tracking"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "email_reporting_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "email_reporting_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_cf_zone_per_site"
            referencedColumns: ["order_id"]
          },
        ]
      }
      experts_pool: {
        Row: {
          capacity: number
          expert_id: string
          is_available: boolean
          last_assigned_at: string | null
          rr_position: number
        }
        Insert: {
          capacity?: number
          expert_id: string
          is_available?: boolean
          last_assigned_at?: string | null
          rr_position?: number
        }
        Update: {
          capacity?: number
          expert_id?: string
          is_available?: boolean
          last_assigned_at?: string | null
          rr_position?: number
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string
          read: boolean
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message: string
          read?: boolean
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string
          read?: boolean
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      optimization_tasks: {
        Row: {
          actual_impact: Json | null
          assigned_to: string | null
          category: string | null
          completed_at: string | null
          created_at: string | null
          description: string | null
          id: string
          impact_score: number | null
          status: string | null
          title: string
          user_service_id: string
        }
        Insert: {
          actual_impact?: Json | null
          assigned_to?: string | null
          category?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          impact_score?: number | null
          status?: string | null
          title: string
          user_service_id: string
        }
        Update: {
          actual_impact?: Json | null
          assigned_to?: string | null
          category?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          impact_score?: number | null
          status?: string | null
          title?: string
          user_service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "optimization_tasks_user_service_id_fkey"
            columns: ["user_service_id"]
            isOneToOne: false
            referencedRelation: "cloudflare_kv_tracking"
            referencedColumns: ["service_id"]
          },
          {
            foreignKeyName: "optimization_tasks_user_service_id_fkey"
            columns: ["user_service_id"]
            isOneToOne: false
            referencedRelation: "user_services"
            referencedColumns: ["id"]
          },
        ]
      }
      order_assignments: {
        Row: {
          accepted_at: string | null
          assigned_at: string
          assigned_by: string | null
          completed_at: string | null
          expert_id: string
          id: string
          is_active: boolean
          order_id: string
          skip_reason: string | null
          status: string
        }
        Insert: {
          accepted_at?: string | null
          assigned_at?: string
          assigned_by?: string | null
          completed_at?: string | null
          expert_id: string
          id?: string
          is_active?: boolean
          order_id: string
          skip_reason?: string | null
          status?: string
        }
        Update: {
          accepted_at?: string | null
          assigned_at?: string
          assigned_by?: string | null
          completed_at?: string | null
          expert_id?: string
          id?: string
          is_active?: boolean
          order_id?: string
          skip_reason?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_assignments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "cloudflare_kv_tracking"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_assignments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_assignments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_cf_zone_per_site"
            referencedColumns: ["order_id"]
          },
        ]
      }
      order_conversations: {
        Row: {
          channel_type: string
          created_at: string
          id: string
          last_message_at: string
          order_id: string
          updated_at: string
        }
        Insert: {
          channel_type: string
          created_at?: string
          id?: string
          last_message_at?: string
          order_id: string
          updated_at?: string
        }
        Update: {
          channel_type?: string
          created_at?: string
          id?: string
          last_message_at?: string
          order_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_conversations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "cloudflare_kv_tracking"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_conversations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_conversations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_cf_zone_per_site"
            referencedColumns: ["order_id"]
          },
        ]
      }
      order_messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          email_notified_at: string | null
          id: string
          is_system: boolean
          read_at: string | null
          sender_id: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          email_notified_at?: string | null
          id?: string
          is_system?: boolean
          read_at?: string | null
          sender_id: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          email_notified_at?: string | null
          id?: string
          is_system?: boolean
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "order_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          favicon_file: string | null
          order_date: string
          order_id: string
          order_status: boolean
          product_type: string | null
          report_email: string | null
          rum_connection: boolean | null
          setup_completed_at: string | null
          setup_step: number
          tour: Json
          usage_by_site: number
          user_id: string
          website_address: string
          website_name: string
          weekly_report: boolean | null
        }
        Insert: {
          favicon_file?: string | null
          order_date?: string
          order_id?: string
          order_status: boolean
          product_type?: string | null
          report_email?: string | null
          rum_connection?: boolean | null
          setup_completed_at?: string | null
          setup_step?: number
          tour?: Json
          usage_by_site?: number
          user_id?: string
          website_address: string
          website_name: string
          weekly_report?: boolean | null
        }
        Update: {
          favicon_file?: string | null
          order_date?: string
          order_id?: string
          order_status?: boolean
          product_type?: string | null
          report_email?: string | null
          rum_connection?: boolean | null
          setup_completed_at?: string | null
          setup_step?: number
          tour?: Json
          usage_by_site?: number
          user_id?: string
          website_address?: string
          website_name?: string
          weekly_report?: boolean | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          email: string | null
          id: string
          role: string | null
        }
        Insert: {
          email?: string | null
          id: string
          role?: string | null
        }
        Update: {
          email?: string | null
          id?: string
          role?: string | null
        }
        Relationships: []
      }
      rum_daily_distributions: {
        Row: {
          day: string
          device_type: string
          domain_name: string
          good: Json
          inserted_at: string
          needs_improvement: Json
          poor: Json
          updated_at: string
        }
        Insert: {
          day: string
          device_type: string
          domain_name: string
          good?: Json
          inserted_at?: string
          needs_improvement?: Json
          poor?: Json
          updated_at?: string
        }
        Update: {
          day?: string
          device_type?: string
          domain_name?: string
          good?: Json
          inserted_at?: string
          needs_improvement?: Json
          poor?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rum_daily_distributions_domain_name_fkey"
            columns: ["domain_name"]
            isOneToOne: false
            referencedRelation: "cloudflare_kv_tracking"
            referencedColumns: ["website_name"]
          },
          {
            foreignKeyName: "rum_daily_distributions_domain_name_fkey"
            columns: ["domain_name"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["website_name"]
          },
          {
            foreignKeyName: "rum_daily_distributions_domain_name_fkey"
            columns: ["domain_name"]
            isOneToOne: false
            referencedRelation: "v_cf_zone_per_site"
            referencedColumns: ["website_name"]
          },
        ]
      }
      rum_history_new: {
        Row: {
          cls: Json
          created_at: string
          day: string
          domain_name: string
          fcp: Json
          inp: Json
          lcp: Json
          ttfb: Json
        }
        Insert: {
          cls?: Json
          created_at?: string
          day: string
          domain_name: string
          fcp?: Json
          inp?: Json
          lcp?: Json
          ttfb?: Json
        }
        Update: {
          cls?: Json
          created_at?: string
          day?: string
          domain_name?: string
          fcp?: Json
          inp?: Json
          lcp?: Json
          ttfb?: Json
        }
        Relationships: [
          {
            foreignKeyName: "rum_history_new_domain_name_fkey"
            columns: ["domain_name"]
            isOneToOne: false
            referencedRelation: "cloudflare_kv_tracking"
            referencedColumns: ["website_name"]
          },
          {
            foreignKeyName: "rum_history_new_domain_name_fkey"
            columns: ["domain_name"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["website_name"]
          },
          {
            foreignKeyName: "rum_history_new_domain_name_fkey"
            columns: ["domain_name"]
            isOneToOne: false
            referencedRelation: "v_cf_zone_per_site"
            referencedColumns: ["website_name"]
          },
        ]
      }
      rum_metrics: {
        Row: {
          backend_response_ms: number | null
          browser_family: string | null
          cache_status: string | null
          city: string | null
          cls_rating: string | null
          cls_value: number | null
          connect_ms: number | null
          country: string | null
          created_at: string | null
          current_page: string | null
          decoded_bytes: number | null
          device_memory_gb: number | null
          device_type: string | null
          diagnostic_evidence: Json | null
          dns_ms: number | null
          domain_name: string | null
          error_count: number | null
          events: Json | null
          failed_resource_count: number | null
          fcp_ms: number | null
          fcp_rating: string | null
          id: number
          inp_ms: number | null
          inp_rating: string | null
          language: string | null
          lcp_ms: number | null
          lcp_rating: string | null
          long_task_count: number | null
          network_downlink_mbps: number | null
          network_effective_type: string | null
          network_rtt_ms: number | null
          origin_hit: boolean | null
          os_family: string | null
          pageview_id: string | null
          poor_connection: boolean | null
          previous_page: string | null
          provider: string | null
          queue_ms: number | null
          redirect_ms: number | null
          referrer_domain: string | null
          region: string | null
          resource_css_bytes: number | null
          resource_css_count: number | null
          resource_css_duration_ms: number | null
          resource_duration_ms: number | null
          resource_image_bytes: number | null
          resource_image_count: number | null
          resource_image_duration_ms: number | null
          resource_other_bytes: number | null
          resource_other_count: number | null
          resource_other_duration_ms: number | null
          resource_request_count: number | null
          resource_script_bytes: number | null
          resource_script_count: number | null
          resource_script_duration_ms: number | null
          resource_transfer_bytes: number | null
          schema_version: number | null
          session_id: string | null
          tls_handshake_ms: number | null
          transfer_bytes: number | null
          ttfb_ms: number | null
          ttfb_rating: string | null
        }
        Insert: {
          backend_response_ms?: number | null
          browser_family?: string | null
          cache_status?: string | null
          city?: string | null
          cls_rating?: string | null
          cls_value?: number | null
          connect_ms?: number | null
          country?: string | null
          created_at?: string | null
          current_page?: string | null
          decoded_bytes?: number | null
          device_memory_gb?: number | null
          device_type?: string | null
          diagnostic_evidence?: Json | null
          dns_ms?: number | null
          domain_name?: string | null
          error_count?: number | null
          events?: Json | null
          failed_resource_count?: number | null
          fcp_ms?: number | null
          fcp_rating?: string | null
          id?: number
          inp_ms?: number | null
          inp_rating?: string | null
          language?: string | null
          lcp_ms?: number | null
          lcp_rating?: string | null
          long_task_count?: number | null
          network_downlink_mbps?: number | null
          network_effective_type?: string | null
          network_rtt_ms?: number | null
          origin_hit?: boolean | null
          os_family?: string | null
          pageview_id?: string | null
          poor_connection?: boolean | null
          previous_page?: string | null
          provider?: string | null
          queue_ms?: number | null
          redirect_ms?: number | null
          referrer_domain?: string | null
          region?: string | null
          resource_css_bytes?: number | null
          resource_css_count?: number | null
          resource_css_duration_ms?: number | null
          resource_duration_ms?: number | null
          resource_image_bytes?: number | null
          resource_image_count?: number | null
          resource_image_duration_ms?: number | null
          resource_other_bytes?: number | null
          resource_other_count?: number | null
          resource_other_duration_ms?: number | null
          resource_request_count?: number | null
          resource_script_bytes?: number | null
          resource_script_count?: number | null
          resource_script_duration_ms?: number | null
          resource_transfer_bytes?: number | null
          schema_version?: number | null
          session_id?: string | null
          tls_handshake_ms?: number | null
          transfer_bytes?: number | null
          ttfb_ms?: number | null
          ttfb_rating?: string | null
        }
        Update: {
          backend_response_ms?: number | null
          browser_family?: string | null
          cache_status?: string | null
          city?: string | null
          cls_rating?: string | null
          cls_value?: number | null
          connect_ms?: number | null
          country?: string | null
          created_at?: string | null
          current_page?: string | null
          decoded_bytes?: number | null
          device_memory_gb?: number | null
          device_type?: string | null
          diagnostic_evidence?: Json | null
          dns_ms?: number | null
          domain_name?: string | null
          error_count?: number | null
          events?: Json | null
          failed_resource_count?: number | null
          fcp_ms?: number | null
          fcp_rating?: string | null
          id?: number
          inp_ms?: number | null
          inp_rating?: string | null
          language?: string | null
          lcp_ms?: number | null
          lcp_rating?: string | null
          long_task_count?: number | null
          network_downlink_mbps?: number | null
          network_effective_type?: string | null
          network_rtt_ms?: number | null
          origin_hit?: boolean | null
          os_family?: string | null
          pageview_id?: string | null
          poor_connection?: boolean | null
          previous_page?: string | null
          provider?: string | null
          queue_ms?: number | null
          redirect_ms?: number | null
          referrer_domain?: string | null
          region?: string | null
          resource_css_bytes?: number | null
          resource_css_count?: number | null
          resource_css_duration_ms?: number | null
          resource_duration_ms?: number | null
          resource_image_bytes?: number | null
          resource_image_count?: number | null
          resource_image_duration_ms?: number | null
          resource_other_bytes?: number | null
          resource_other_count?: number | null
          resource_other_duration_ms?: number | null
          resource_request_count?: number | null
          resource_script_bytes?: number | null
          resource_script_count?: number | null
          resource_script_duration_ms?: number | null
          resource_transfer_bytes?: number | null
          schema_version?: number | null
          session_id?: string | null
          tls_handshake_ms?: number | null
          transfer_bytes?: number | null
          ttfb_ms?: number | null
          ttfb_rating?: string | null
        }
        Relationships: []
      }
      rum_origin_hits_agg: {
        Row: {
          agg_time: string
          domain_name: string
          origin_hit_count: number
          origin_hit_percentage: number
          total_origin_events: number
        }
        Insert: {
          agg_time: string
          domain_name: string
          origin_hit_count: number
          origin_hit_percentage: number
          total_origin_events: number
        }
        Update: {
          agg_time?: string
          domain_name?: string
          origin_hit_count?: number
          origin_hit_percentage?: number
          total_origin_events?: number
        }
        Relationships: [
          {
            foreignKeyName: "rum_origin_hits_agg_domain_name_fkey"
            columns: ["domain_name"]
            isOneToOne: false
            referencedRelation: "cloudflare_kv_tracking"
            referencedColumns: ["website_name"]
          },
          {
            foreignKeyName: "rum_origin_hits_agg_domain_name_fkey"
            columns: ["domain_name"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["website_name"]
          },
          {
            foreignKeyName: "rum_origin_hits_agg_domain_name_fkey"
            columns: ["domain_name"]
            isOneToOne: false
            referencedRelation: "v_cf_zone_per_site"
            referencedColumns: ["website_name"]
          },
        ]
      }
      system_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      ticket_messages: {
        Row: {
          created_at: string | null
          id: string
          message: string
          sender_name: string | null
          sender_role: string | null
          ticket_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          sender_name?: string | null
          sender_role?: string | null
          ticket_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          sender_name?: string | null
          sender_role?: string | null
          ticket_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          created_at: string | null
          id: string
          message: string
          related_order: string | null
          status: string | null
          subject: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          related_order?: string | null
          status?: string | null
          subject: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          related_order?: string | null
          status?: string | null
          subject?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_services: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          metadata: Json | null
          order_id: string | null
          purchased_at: string | null
          service_type: Database["public"]["Enums"]["service_type_enum"]
          status: string | null
          updated_at: string | null
          user_id: string
          website_name: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          order_id?: string | null
          purchased_at?: string | null
          service_type: Database["public"]["Enums"]["service_type_enum"]
          status?: string | null
          updated_at?: string | null
          user_id: string
          website_name?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          order_id?: string | null
          purchased_at?: string | null
          service_type?: Database["public"]["Enums"]["service_type_enum"]
          status?: string | null
          updated_at?: string | null
          user_id?: string
          website_name?: string | null
        }
        Relationships: []
      }
      website_metadata: {
        Row: {
          description: string | null
          id: number
          last_updated: string | null
          mobile_optimized: boolean | null
          site_type: string | null
          title: string | null
          url: string
        }
        Insert: {
          description?: string | null
          id?: number
          last_updated?: string | null
          mobile_optimized?: boolean | null
          site_type?: string | null
          title?: string | null
          url: string
        }
        Update: {
          description?: string | null
          id?: number
          last_updated?: string | null
          mobile_optimized?: boolean | null
          site_type?: string | null
          title?: string | null
          url?: string
        }
        Relationships: []
      }
      wordpress_cred: {
        Row: {
          cred_id: string
          order_id: string
          payment_id: string | null
          wp_address: string
          wp_login_url: string
        }
        Insert: {
          cred_id?: string
          order_id: string
          payment_id?: string | null
          wp_address: string
          wp_login_url: string
        }
        Update: {
          cred_id?: string
          order_id?: string
          payment_id?: string | null
          wp_address?: string
          wp_login_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "wordpress_cred_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "cloudflare_kv_tracking"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "wordpress_cred_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "wordpress_cred_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "v_cf_zone_per_site"
            referencedColumns: ["order_id"]
          },
        ]
      }
      wp_key: {
        Row: {
          created_at: string
          domain: string | null
          hmac_expires_at: string | null
          hmac_signature: string | null
          hmac_verified_at: string | null
          id: number
          last_checked_at: string | null
          plugin_active_at: string | null
          rum_active_at: string | null
          rum_assigned_at: string | null
          wp_secret: string | null
        }
        Insert: {
          created_at?: string
          domain?: string | null
          hmac_expires_at?: string | null
          hmac_signature?: string | null
          hmac_verified_at?: string | null
          id?: number
          last_checked_at?: string | null
          plugin_active_at?: string | null
          rum_active_at?: string | null
          rum_assigned_at?: string | null
          wp_secret?: string | null
        }
        Update: {
          created_at?: string
          domain?: string | null
          hmac_expires_at?: string | null
          hmac_signature?: string | null
          hmac_verified_at?: string | null
          id?: number
          last_checked_at?: string | null
          plugin_active_at?: string | null
          rum_active_at?: string | null
          rum_assigned_at?: string | null
          wp_secret?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wp_key_domain_fkey"
            columns: ["domain"]
            isOneToOne: true
            referencedRelation: "cloudflare_kv_tracking"
            referencedColumns: ["website_name"]
          },
          {
            foreignKeyName: "wp_key_domain_fkey"
            columns: ["domain"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["website_name"]
          },
          {
            foreignKeyName: "wp_key_domain_fkey"
            columns: ["domain"]
            isOneToOne: true
            referencedRelation: "v_cf_zone_per_site"
            referencedColumns: ["website_name"]
          },
        ]
      }
      wp_scans: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: string
          results: Json | null
          scan_type: string
          started_at: string | null
          status: string | null
          user_service_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          results?: Json | null
          scan_type: string
          started_at?: string | null
          status?: string | null
          user_service_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          results?: Json | null
          scan_type?: string
          started_at?: string | null
          status?: string | null
          user_service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wp_scans_user_service_id_fkey"
            columns: ["user_service_id"]
            isOneToOne: false
            referencedRelation: "cloudflare_kv_tracking"
            referencedColumns: ["service_id"]
          },
          {
            foreignKeyName: "wp_scans_user_service_id_fkey"
            columns: ["user_service_id"]
            isOneToOne: false
            referencedRelation: "user_services"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      cloudflare_kv_tracking: {
        Row: {
          cf_status: string | null
          config_backup: Json | null
          expires_at: string | null
          favicon_file: string | null
          metadata: Json | null
          order_date: string | null
          order_id: string | null
          order_status: boolean | null
          product_type: string | null
          purchased_at: string | null
          report_email: string | null
          rum_connection: boolean | null
          service_id: string | null
          service_status: string | null
          service_type: Database["public"]["Enums"]["service_type_enum"] | null
          token: string | null
          usage_by_site: number | null
          user_id: string | null
          website_address: string | null
          website_name: string | null
          weekly_report: boolean | null
        }
        Relationships: []
      }
      experts_pool_live: {
        Row: {
          active_load: number | null
          capacity: number | null
          expert_id: string | null
          is_available: boolean | null
          last_assigned_at: string | null
          rr_position: number | null
        }
        Insert: {
          active_load?: never
          capacity?: number | null
          expert_id?: string | null
          is_available?: boolean | null
          last_assigned_at?: string | null
          rr_position?: number | null
        }
        Update: {
          active_load?: never
          capacity?: number | null
          expert_id?: string | null
          is_available?: boolean | null
          last_assigned_at?: string | null
          rr_position?: number | null
        }
        Relationships: []
      }
      v_cf_zone_per_site: {
        Row: {
          config_backup: Json | null
          order_id: string | null
          order_status: boolean | null
          status: string | null
          token: string | null
          user_id: string | null
          website_name: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      aggregate_daily_web_metrics: {
        Args: { target_date: string }
        Returns: undefined
      }
      aggregate_web_metrics_for_date_range: {
        Args: { end_date: string; start_date: string }
        Returns: undefined
      }
      aggregate_web_metrics_for_today: { Args: never; Returns: undefined }
      analyze_domain_performance: {
        Args: { end_date?: string; start_date?: string; target_domain: string }
        Returns: {
          cls_p75: number
          cls_status: string
          cwv_failure_score: number
          device_type: string
          domain: string
          fcp_p75: number
          inp_p75: number
          inp_status: string
          lcp_p75: number
          lcp_status: string
          measurement_count: number
          measurement_date: string
          metrics_available: number
          normalized_score: number
          overall_cwv_pass_rate: number
          page_address: string
          page_rank: number
          page_size_mb: number
          pct_css_content: number
          pct_image_content: number
          pct_js_content: number
          pct_passing_cls: number
          pct_passing_inp: number
          pct_passing_lcp: number
          pct_passing_ttfb: number
          pct_third_party_content: number
          pct_third_party_requests: number
          performance_impact: number
          performance_rank: number
          performance_score: number
          request_count: number
          result_type: string
          ttfb_p75: number
          unique_pages: number
        }[]
      }
      analyze_fcp_by_device: {
        Args: { domain_filter?: string; time_range?: string }
        Returns: {
          avg_fcp_value: number
          connection_type: string
          device_type: string
          good_count: number
          max_fcp_value: number
          min_fcp_value: number
          needs_improvement_count: number
          occurrence_count: number
          p75_fcp_value: number
          p90_fcp_value: number
          p95_fcp_value: number
          poor_count: number
        }[]
      }
      analyze_lcp_by_device: {
        Args: { domain_filter: string }
        Returns: {
          avg_element_render_delay: number
          avg_lcp_value: number
          avg_resource_load_delay: number
          avg_resource_load_duration: number
          device_memory_gb: string
          device_type: string
          element_target: string
          font_family: string
          font_size: string
          font_weight: string
          good_count: number
          lcp_asset_url: string
          loading_priority: string
          memory_usage_bytes: number
          needs_improvement_count: number
          network_transfer_bytes: number
          occurrence_count: number
          p75_lcp_value: number
          page_url: string
          poor_count: number
          top_3_render_blockers: string
          ttfb_ms: number
        }[]
      }
      bytea_to_text: { Args: { data: string }; Returns: string }
      cls_elements: {
        Args: { p_domain_name: string }
        Returns: {
          cls_score: number
          current_page: string
          dev_type: string
          impact_json: Json
          involved_elems: Json
          l_mode: string
          most_frequent_element: string
          occ_count: number
          rect_json: Json
          shift_json: Json
          time_avg: number
        }[]
      }
      cwv_dist_by_connection: {
        Args: {
          p_domain: string
          p_end: string
          p_metric: string
          p_start: string
        }
        Returns: {
          connection_type: string
          desktop_good: number
          desktop_needs_improvement: number
          desktop_poor: number
          mobile_good: number
          mobile_needs_improvement: number
          mobile_poor: number
          other_good: number
          other_needs_improvement: number
          other_poor: number
          tablet_good: number
          tablet_needs_improvement: number
          tablet_poor: number
        }[]
      }
      daily_aggregate_usage_by_userid: {
        Args: never
        Returns: {
          total_usage: number
          user_id: string
        }[]
      }
      dashboard_multimetrix: {
        Args: { date_range_days?: number; domain_name_param: string }
        Returns: {
          country_code: string
          country_name: string
          device_type: string
          dom_load_avg: number
          sample_count: number
          speed_index: number
          ttfb_avg: number
        }[]
      }
      delete_old_rum_metrics: { Args: never; Returns: undefined }
      ensure_order_conversations: {
        Args: { p_order_id: string }
        Returns: undefined
      }
      font_analysis: {
        Args: { p_domain: string }
        Returns: {
          avg_lcp: number
          avg_render_delay: number
          avg_resource_size: number
          device: string
          font_family: string
          font_file_url: string
          font_weight: string
          major_pages: string[]
          poor_lcp_percentage: number
          total_occurrences: number
        }[]
      }
      get_current_user_role: { Args: never; Returns: string }
      get_filtered_rum_metrics: {
        Args: {
          p_date_range: string
          p_device_type?: string
          p_domain_name: string
          p_end_date?: string
          p_top_countries_limit?: number
        }
        Returns: {
          result_data: Json
          result_type: string
        }[]
      }
      get_lcp_image_metrics: {
        Args: {
          p_domain_name?: string
          p_end_date?: string
          p_start_date?: string
        }
        Returns: {
          avg_decoded_body_size: number
          avg_element_render_delay: number
          avg_height: number
          avg_lcp_ms: number
          avg_resource_load_delay: number
          avg_resource_load_duration: number
          avg_time_to_first_byte: number
          avg_transfer_size: number
          avg_width: number
          device_type: string
          domain_name: string
          image_url: string
          max_lcp_ms: number
          min_lcp_ms: number
          occurrence_count: number
          p75_lcp_ms: number
          pct_exceeding_cwv: number
          pct_lazy: number
          period: string
        }[]
      }
      get_mailing_list: {
        Args: never
        Returns: {
          email: string
          report_verbosity: number
          website_name: string
        }[]
      }
      get_rum_history: {
        Args: { p_domain: string; p_from: string; p_to: string }
        Returns: {
          cls: Json
          day: string
          fcp: Json
          inp: Json
          lcp: Json
          ttfb: Json
        }[]
      }
      get_rum_web_vitals_metrics: {
        Args: { p_date_range?: string; p_domain_name: string }
        Returns: {
          cls_avg: number
          cls_max: number
          cls_min: number
          cls_p50: number
          cls_p75: number
          cls_p90: number
          cls_p95: number
          cls_p99: number
          cls_samples: number
          device_category: string
          fcp_avg: number
          fcp_max: number
          fcp_min: number
          fcp_p50: number
          fcp_p75: number
          fcp_p90: number
          fcp_p95: number
          fcp_p99: number
          fcp_samples: number
          inp_avg: number
          inp_max: number
          inp_min: number
          inp_p50: number
          inp_p75: number
          inp_p90: number
          inp_p95: number
          inp_p99: number
          inp_samples: number
          lcp_avg: number
          lcp_max: number
          lcp_min: number
          lcp_p50: number
          lcp_p75: number
          lcp_p90: number
          lcp_p95: number
          lcp_p99: number
          lcp_samples: number
          report_date: string
          ttfb_avg: number
          ttfb_max: number
          ttfb_min: number
          ttfb_p50: number
          ttfb_p75: number
          ttfb_p90: number
          ttfb_p95: number
          ttfb_p99: number
          ttfb_samples: number
        }[]
      }
      get_web_vital_counts_by_url:
        | {
            Args: {
              p_device_type?: string
              p_domain: string
              p_end?: string
              p_limit?: number
              p_metric: string
              p_start?: string
            }
            Returns: {
              good: number
              needs_improvement: number
              poor: number
              url: string
            }[]
          }
        | {
            Args: { p_domain: string; p_limit?: number; p_metric: string }
            Returns: {
              good: number
              needs_improvement: number
              poor: number
              url: string
            }[]
          }
      get_yesterday_usage_counts: {
        Args: never
        Returns: {
          domain_name: string
          usage_count: number
        }[]
      }
      http: {
        Args: { request: Database["public"]["CompositeTypes"]["http_request"] }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "http_request"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_delete:
        | {
            Args: { uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { content: string; content_type: string; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_get:
        | {
            Args: { uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { data: Json; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_head: {
        Args: { uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_header: {
        Args: { field: string; value: string }
        Returns: Database["public"]["CompositeTypes"]["http_header"]
        SetofOptions: {
          from: "*"
          to: "http_header"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_list_curlopt: {
        Args: never
        Returns: {
          curlopt: string
          value: string
        }[]
      }
      http_patch: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_post:
        | {
            Args: { content: string; content_type: string; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { data: Json; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_put: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_reset_curlopt: { Args: never; Returns: boolean }
      http_set_curlopt: {
        Args: { curlopt: string; value: string }
        Returns: boolean
      }
      inp_elements: {
        Args: { p_domain_name: string }
        Returns: {
          created_at: string
          current_page: string
          device: string
          inp_value: number
          input_delay: number
          interaction_type: string
          presentation_delay: number
          processing_duration: number
          rating: string
          responsible_scripts: string
          target_element: string
        }[]
      }
      is_active_order_expert: { Args: { p_order_id: string }; Returns: boolean }
      is_order_owner: { Args: { p_order_id: string }; Returns: boolean }
      page_performance_analysis: {
        Args: { p_domain?: string }
        Returns: {
          avg_cls: number
          avg_inp_ms: number
          avg_lcp_ms: number
          cls_elements: Json
          current_page: string
          device_type: string
          inp_elements: Json
          lcp_elements: Json
          performance_group: string
          visit_count: number
        }[]
      }
      pick_next_expert: { Args: never; Returns: string }
      process_web_vitals_date_range: {
        Args: { end_date?: string; start_date: string }
        Returns: {
          process_date: string
          rows_inserted: number
        }[]
      }
      rum_cls_shifts: {
        Args: { p_domain: string }
        Returns: {
          area_delta: number
          current_page: string
          current_rect: Json
          device_type: string
          distance_moved: number
          dx: number
          dy: number
          involved_elements: Json
          load_state: string
          previous_rect: Json
          row_id: number
          target: string
          time_ms: number
          total_cls_value: number
          value: number
          viewport_ratio: number
        }[]
      }
      rum_diagnostic_evidence_is_valid: {
        Args: { p_evidence: Json }
        Returns: boolean
      }
      rum_distributions_all_metrics: {
        Args: { p_domain_name: string; p_end: string; p_start: string }
        Returns: {
          device_type: string
          good_count: number
          metric: string
          needs_improvement_count: number
          poor_count: number
        }[]
      }
      rum_inp_interactions: {
        Args: { p_domain: string }
        Returns: {
          created_at: string
          current_page: string
          device_type: string
          inp_value: number
          input_delay: number
          interaction_type: string
          presentation_delay: number
          processing_duration: number
          rating: string
          responsible_scripts: string
          row_id: number
          target_element: string
        }[]
      }
      rum_lcp_candidates: {
        Args: { p_domain: string; p_end?: string; p_start?: string }
        Returns: {
          asset_url: string
          candidate_ttfb_ms: number
          current_page: string
          decoded_bytes: number
          device_memory_gb: string
          device_type: string
          domain_name: string
          element_render_delay_ms: number
          fetch_priority: string
          font_family: string
          font_size: string
          font_transfer_bytes: number
          font_url: string
          font_weight: string
          image_height: number
          image_width: number
          is_lazy: boolean
          lcp_rating: string
          lcp_value: number
          render_blockers: string
          resource_load_delay_ms: number
          resource_load_duration_ms: number
          row_id: number
          target: string
          transfer_bytes: number
        }[]
      }
      rum_metric_readings: {
        Args: { p_domain: string; p_end?: string; p_start: string }
        Returns: {
          current_page: string
          device_type: string
          metric_name: string
          metric_value: number
          network_effective_type: string
          rating: string
          report_date: string
          row_id: number
        }[]
      }
      set_email_reporting: {
        Args: { p_entries: Json; p_order_id: string }
        Returns: undefined
      }
      text_to_bytea: { Args: { data: string }; Returns: string }
      ttfb_contributors: {
        Args: { p_domain: string }
        Returns: {
          avg_downlink: number
          avg_rtt: number
          device_type: string
          occurrence_count: number
          origin_hit_rate: number
          p75_dns: number
          p75_server: number
          p75_tcp: number
          p75_ttfb: number
          page_path: string
          top_country: string
          top_isp: string
        }[]
      }
      upsert_rum_metrics_batch: { Args: { payloads: Json }; Returns: undefined }
      upsert_rum_metrics_batch_single: {
        Args: { payloads: Json }
        Returns: undefined
      }
      urlencode:
        | { Args: { data: Json }; Returns: string }
        | {
            Args: { string: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.urlencode(string => bytea), public.urlencode(string => varchar). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { string: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.urlencode(string => bytea), public.urlencode(string => varchar). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
      verify_website_user_match: {
        Args: { user_id_arg: string; website_name_arg: string }
        Returns: boolean
      }
    }
    Enums: {
      email_verbosity:
        | "summary_only"
        | "analytics_only"
        | "summary_analytics"
        | "full_report"
      service_type_enum: "managed_wp" | "rum_renewal" | "free"
    }
    CompositeTypes: {
      http_header: {
        field: string | null
        value: string | null
      }
      http_request: {
        method: unknown
        uri: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content_type: string | null
        content: string | null
      }
      http_response: {
        status: number | null
        content_type: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content: string | null
      }
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
    Enums: {
      email_verbosity: [
        "summary_only",
        "analytics_only",
        "summary_analytics",
        "full_report",
      ],
      service_type_enum: ["managed_wp", "rum_renewal", "free"],
    },
  },
} as const
