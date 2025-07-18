export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      credit: {
        Row: {
          id: string
          lab_credits: number | null
          module: string
          period_end: string
          period_start: string
          rum_pageviews: number | null
          site_id: string
          updated_at: string | null
          user_email: string | null
          user_id: string
        }
        Insert: {
          id?: string
          lab_credits?: number | null
          module: string
          period_end: string
          period_start: string
          rum_pageviews?: number | null
          site_id: string
          updated_at?: string | null
          user_email?: string | null
          user_id: string
        }
        Update: {
          id?: string
          lab_credits?: number | null
          module?: string
          period_end?: string
          period_start?: string
          rum_pageviews?: number | null
          site_id?: string
          updated_at?: string | null
          user_email?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_user_email_fkey"
            columns: ["user_email"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["email"]
          },
        ]
      }
      crux_jobs: {
        Row: {
          created_at: string | null
          domain: string | null
          id: string
          results: Json | null
          status: string | null
          updated_at: string | null
          urls: string[]
        }
        Insert: {
          created_at?: string | null
          domain?: string | null
          id?: string
          results?: Json | null
          status?: string | null
          updated_at?: string | null
          urls: string[]
        }
        Update: {
          created_at?: string | null
          domain?: string | null
          id?: string
          results?: Json | null
          status?: string | null
          updated_at?: string | null
          urls?: string[]
        }
        Relationships: []
      }
      orders: {
        Row: {
          billing_cycle_end: string | null
          billing_cycle_start: string | null
          favicon_file: string | null
          gsc_token: string | null
          has_lab_access: boolean | null
          has_rum_access: boolean | null
          order_date: string
          order_id: string
          order_status: boolean
          subscription_started_at: string | null
          user_email: string
          website_address: string
          website_name: string
        }
        Insert: {
          billing_cycle_end?: string | null
          billing_cycle_start?: string | null
          favicon_file?: string | null
          gsc_token?: string | null
          has_lab_access?: boolean | null
          has_rum_access?: boolean | null
          order_date?: string
          order_id?: string
          order_status: boolean
          subscription_started_at?: string | null
          user_email: string
          website_address: string
          website_name: string
        }
        Update: {
          billing_cycle_end?: string | null
          billing_cycle_start?: string | null
          favicon_file?: string | null
          gsc_token?: string | null
          has_lab_access?: boolean | null
          has_rum_access?: boolean | null
          order_date?: string
          order_id?: string
          order_status?: boolean
          subscription_started_at?: string | null
          user_email?: string
          website_address?: string
          website_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_user_email_fkey"
            columns: ["user_email"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["email"]
          },
        ]
      }
      pageperf_data: {
        Row: {
          blocking_scripts: Json | null
          browser: string | null
          browser_version: string | null
          cls_data: Json | null
          created_at: string
          crux_cls_avg: number | null
          crux_cls_good: number | null
          crux_cls_p75: number | null
          crux_cls_poor: number | null
          crux_fcp_avg: number | null
          crux_fcp_good: number | null
          crux_fcp_p75: number | null
          crux_fcp_poor: number | null
          crux_inp_avg: number | null
          crux_inp_good: number | null
          crux_inp_p75: number | null
          crux_inp_poor: number | null
          crux_lcp_avg: number | null
          crux_lcp_good: number | null
          crux_lcp_p75: number | null
          crux_lcp_poor: number | null
          crux_ttfb_avg: number | null
          crux_ttfb_good: number | null
          crux_ttfb_p75: number | null
          crux_ttfb_poor: number | null
          device_type: string
          document_decodedbody_size: number | null
          document_encodedbody_size: number | null
          document_timing: Json | null
          document_transfersize: number | null
          documenttitle: string | null
          dom_complete_max: number | null
          dom_complete_mean: number | null
          dom_complete_min: number | null
          dom_elements_max: number | null
          dom_elements_mean: number | null
          dom_elements_min: number | null
          dom_interactive_max: number | null
          dom_interactive_mean: number | null
          dom_interactive_min: number | null
          domain: string | null
          domains: Json | null
          inp_latency_max: number | null
          inp_latency_mean: number | null
          inp_latency_min: number | null
          lab_cls_max: number | null
          lab_cls_mean: number | null
          lab_cls_min: number | null
          lab_contentsize: number | null
          lab_css_contentsize_max: number | null
          lab_css_contentsize_mean: number | null
          lab_css_contentsize_min: number | null
          lab_css_request_count_max: number | null
          lab_css_request_count_mean: number | null
          lab_css_request_count_min: number | null
          lab_css_transfersize_max: number | null
          lab_css_transfersize_mean: number | null
          lab_css_transfersize_min: number | null
          lab_domain_lookup: number | null
          lab_error_max: number | null
          lab_error_mean: number | null
          lab_error_min: number | null
          lab_fcp_max: number | null
          lab_fcp_mean: number | null
          lab_fcp_min: number | null
          lab_fid_max: number | null
          lab_fid_mean: number | null
          lab_fid_min: number | null
          lab_firstmeaningfulpaint_max: number | null
          lab_firstmeaningfulpaint_mean: number | null
          lab_firstmeaningfulpaint_min: number | null
          lab_font_contentsize_max: number | null
          lab_font_contentsize_mean: number | null
          lab_font_contentsize_min: number | null
          lab_font_request_count_max: number | null
          lab_font_request_count_mean: number | null
          lab_font_request_count_min: number | null
          lab_font_transfersize_max: number | null
          lab_font_transfersize_mean: number | null
          lab_font_transfersize_min: number | null
          lab_fullyloaded_max: number | null
          lab_fullyloaded_mean: number | null
          lab_fullyloaded_min: number | null
          lab_html_contentsize_max: number | null
          lab_html_contentsize_mean: number | null
          lab_html_contentsize_min: number | null
          lab_html_request_count_max: number | null
          lab_html_request_count_mean: number | null
          lab_html_request_count_min: number | null
          lab_html_transfersize_max: number | null
          lab_html_transfersize_mean: number | null
          lab_html_transfersize_min: number | null
          lab_image_contentsize_max: number | null
          lab_image_contentsize_mean: number | null
          lab_image_contentsize_min: number | null
          lab_image_request_count_max: number | null
          lab_image_request_count_mean: number | null
          lab_image_request_count_min: number | null
          lab_image_transfersize_max: number | null
          lab_image_transfersize_mean: number | null
          lab_image_transfersize_min: number | null
          lab_js_contentsize_max: number | null
          lab_js_contentsize_mean: number | null
          lab_js_contentsize_min: number | null
          lab_js_request_count_max: number | null
          lab_js_request_count_mean: number | null
          lab_js_request_count_min: number | null
          lab_js_transfersize_max: number | null
          lab_js_transfersize_mean: number | null
          lab_js_transfersize_min: number | null
          lab_json_contentsize_max: number | null
          lab_json_contentsize_mean: number | null
          lab_json_contentsize_min: number | null
          lab_json_request_count_max: number | null
          lab_json_request_count_mean: number | null
          lab_json_request_count_min: number | null
          lab_json_transfersize_max: number | null
          lab_json_transfersize_mean: number | null
          lab_json_transfersize_min: number | null
          lab_lcp_max: number | null
          lab_lcp_mean: number | null
          lab_lcp_min: number | null
          lab_speed_index_max: number | null
          lab_speed_index_mean: number | null
          lab_speed_index_min: number | null
          lab_srt_max: number | null
          lab_srt_mean: number | null
          lab_srt_min: number | null
          lab_svg_contentsize_max: number | null
          lab_svg_contentsize_mean: number | null
          lab_svg_contentsize_min: number | null
          lab_svg_request_count_max: number | null
          lab_svg_request_count_mean: number | null
          lab_svg_request_count_min: number | null
          lab_svg_transfersize_max: number | null
          lab_svg_transfersize_mean: number | null
          lab_svg_transfersize_min: number | null
          lab_tbt_max: number | null
          lab_tbt_mean: number | null
          lab_tbt_min: number | null
          lab_total_contentsize_max: number | null
          lab_total_contentsize_mean: number | null
          lab_total_contentsize_min: number | null
          lab_total_requests_max: number | null
          lab_total_requests_mean: number | null
          lab_total_requests_min: number | null
          lab_total_transfersize_max: number | null
          lab_total_transfersize_mean: number | null
          lab_total_transfersize_min: number | null
          lab_ttfb_max: number | null
          lab_ttfb_mean: number | null
          lab_ttfb_min: number | null
          lcp_data: Json | null
          lcp_element_size_max: number | null
          lcp_element_size_mean: number | null
          lcp_element_size_min: number | null
          lcp_timing: Json | null
          page_address: string
          page_filmstrip: string | null
          page_screenshot: string | null
          pageload_timing: Json | null
          pageweight: number | null
          performance_score_max: number | null
          performance_score_mean: number | null
          performance_score_min: number | null
          record_id: string
          third_party_content_size_max: number | null
          third_party_content_size_mean: number | null
          third_party_content_size_min: number | null
          third_party_req_max: number | null
          third_party_req_mean: number | null
          third_party_req_min: number | null
          third_party_transfer_size_max: number | null
          third_party_transfer_size_mean: number | null
          third_party_transfer_size_min: number | null
          useragent: string | null
          windowsize: string | null
        }
        Insert: {
          blocking_scripts?: Json | null
          browser?: string | null
          browser_version?: string | null
          cls_data?: Json | null
          created_at: string
          crux_cls_avg?: number | null
          crux_cls_good?: number | null
          crux_cls_p75?: number | null
          crux_cls_poor?: number | null
          crux_fcp_avg?: number | null
          crux_fcp_good?: number | null
          crux_fcp_p75?: number | null
          crux_fcp_poor?: number | null
          crux_inp_avg?: number | null
          crux_inp_good?: number | null
          crux_inp_p75?: number | null
          crux_inp_poor?: number | null
          crux_lcp_avg?: number | null
          crux_lcp_good?: number | null
          crux_lcp_p75?: number | null
          crux_lcp_poor?: number | null
          crux_ttfb_avg?: number | null
          crux_ttfb_good?: number | null
          crux_ttfb_p75?: number | null
          crux_ttfb_poor?: number | null
          device_type: string
          document_decodedbody_size?: number | null
          document_encodedbody_size?: number | null
          document_timing?: Json | null
          document_transfersize?: number | null
          documenttitle?: string | null
          dom_complete_max?: number | null
          dom_complete_mean?: number | null
          dom_complete_min?: number | null
          dom_elements_max?: number | null
          dom_elements_mean?: number | null
          dom_elements_min?: number | null
          dom_interactive_max?: number | null
          dom_interactive_mean?: number | null
          dom_interactive_min?: number | null
          domain?: string | null
          domains?: Json | null
          inp_latency_max?: number | null
          inp_latency_mean?: number | null
          inp_latency_min?: number | null
          lab_cls_max?: number | null
          lab_cls_mean?: number | null
          lab_cls_min?: number | null
          lab_contentsize?: number | null
          lab_css_contentsize_max?: number | null
          lab_css_contentsize_mean?: number | null
          lab_css_contentsize_min?: number | null
          lab_css_request_count_max?: number | null
          lab_css_request_count_mean?: number | null
          lab_css_request_count_min?: number | null
          lab_css_transfersize_max?: number | null
          lab_css_transfersize_mean?: number | null
          lab_css_transfersize_min?: number | null
          lab_domain_lookup?: number | null
          lab_error_max?: number | null
          lab_error_mean?: number | null
          lab_error_min?: number | null
          lab_fcp_max?: number | null
          lab_fcp_mean?: number | null
          lab_fcp_min?: number | null
          lab_fid_max?: number | null
          lab_fid_mean?: number | null
          lab_fid_min?: number | null
          lab_firstmeaningfulpaint_max?: number | null
          lab_firstmeaningfulpaint_mean?: number | null
          lab_firstmeaningfulpaint_min?: number | null
          lab_font_contentsize_max?: number | null
          lab_font_contentsize_mean?: number | null
          lab_font_contentsize_min?: number | null
          lab_font_request_count_max?: number | null
          lab_font_request_count_mean?: number | null
          lab_font_request_count_min?: number | null
          lab_font_transfersize_max?: number | null
          lab_font_transfersize_mean?: number | null
          lab_font_transfersize_min?: number | null
          lab_fullyloaded_max?: number | null
          lab_fullyloaded_mean?: number | null
          lab_fullyloaded_min?: number | null
          lab_html_contentsize_max?: number | null
          lab_html_contentsize_mean?: number | null
          lab_html_contentsize_min?: number | null
          lab_html_request_count_max?: number | null
          lab_html_request_count_mean?: number | null
          lab_html_request_count_min?: number | null
          lab_html_transfersize_max?: number | null
          lab_html_transfersize_mean?: number | null
          lab_html_transfersize_min?: number | null
          lab_image_contentsize_max?: number | null
          lab_image_contentsize_mean?: number | null
          lab_image_contentsize_min?: number | null
          lab_image_request_count_max?: number | null
          lab_image_request_count_mean?: number | null
          lab_image_request_count_min?: number | null
          lab_image_transfersize_max?: number | null
          lab_image_transfersize_mean?: number | null
          lab_image_transfersize_min?: number | null
          lab_js_contentsize_max?: number | null
          lab_js_contentsize_mean?: number | null
          lab_js_contentsize_min?: number | null
          lab_js_request_count_max?: number | null
          lab_js_request_count_mean?: number | null
          lab_js_request_count_min?: number | null
          lab_js_transfersize_max?: number | null
          lab_js_transfersize_mean?: number | null
          lab_js_transfersize_min?: number | null
          lab_json_contentsize_max?: number | null
          lab_json_contentsize_mean?: number | null
          lab_json_contentsize_min?: number | null
          lab_json_request_count_max?: number | null
          lab_json_request_count_mean?: number | null
          lab_json_request_count_min?: number | null
          lab_json_transfersize_max?: number | null
          lab_json_transfersize_mean?: number | null
          lab_json_transfersize_min?: number | null
          lab_lcp_max?: number | null
          lab_lcp_mean?: number | null
          lab_lcp_min?: number | null
          lab_speed_index_max?: number | null
          lab_speed_index_mean?: number | null
          lab_speed_index_min?: number | null
          lab_srt_max?: number | null
          lab_srt_mean?: number | null
          lab_srt_min?: number | null
          lab_svg_contentsize_max?: number | null
          lab_svg_contentsize_mean?: number | null
          lab_svg_contentsize_min?: number | null
          lab_svg_request_count_max?: number | null
          lab_svg_request_count_mean?: number | null
          lab_svg_request_count_min?: number | null
          lab_svg_transfersize_max?: number | null
          lab_svg_transfersize_mean?: number | null
          lab_svg_transfersize_min?: number | null
          lab_tbt_max?: number | null
          lab_tbt_mean?: number | null
          lab_tbt_min?: number | null
          lab_total_contentsize_max?: number | null
          lab_total_contentsize_mean?: number | null
          lab_total_contentsize_min?: number | null
          lab_total_requests_max?: number | null
          lab_total_requests_mean?: number | null
          lab_total_requests_min?: number | null
          lab_total_transfersize_max?: number | null
          lab_total_transfersize_mean?: number | null
          lab_total_transfersize_min?: number | null
          lab_ttfb_max?: number | null
          lab_ttfb_mean?: number | null
          lab_ttfb_min?: number | null
          lcp_data?: Json | null
          lcp_element_size_max?: number | null
          lcp_element_size_mean?: number | null
          lcp_element_size_min?: number | null
          lcp_timing?: Json | null
          page_address: string
          page_filmstrip?: string | null
          page_screenshot?: string | null
          pageload_timing?: Json | null
          pageweight?: number | null
          performance_score_max?: number | null
          performance_score_mean?: number | null
          performance_score_min?: number | null
          record_id?: string
          third_party_content_size_max?: number | null
          third_party_content_size_mean?: number | null
          third_party_content_size_min?: number | null
          third_party_req_max?: number | null
          third_party_req_mean?: number | null
          third_party_req_min?: number | null
          third_party_transfer_size_max?: number | null
          third_party_transfer_size_mean?: number | null
          third_party_transfer_size_min?: number | null
          useragent?: string | null
          windowsize?: string | null
        }
        Update: {
          blocking_scripts?: Json | null
          browser?: string | null
          browser_version?: string | null
          cls_data?: Json | null
          created_at?: string
          crux_cls_avg?: number | null
          crux_cls_good?: number | null
          crux_cls_p75?: number | null
          crux_cls_poor?: number | null
          crux_fcp_avg?: number | null
          crux_fcp_good?: number | null
          crux_fcp_p75?: number | null
          crux_fcp_poor?: number | null
          crux_inp_avg?: number | null
          crux_inp_good?: number | null
          crux_inp_p75?: number | null
          crux_inp_poor?: number | null
          crux_lcp_avg?: number | null
          crux_lcp_good?: number | null
          crux_lcp_p75?: number | null
          crux_lcp_poor?: number | null
          crux_ttfb_avg?: number | null
          crux_ttfb_good?: number | null
          crux_ttfb_p75?: number | null
          crux_ttfb_poor?: number | null
          device_type?: string
          document_decodedbody_size?: number | null
          document_encodedbody_size?: number | null
          document_timing?: Json | null
          document_transfersize?: number | null
          documenttitle?: string | null
          dom_complete_max?: number | null
          dom_complete_mean?: number | null
          dom_complete_min?: number | null
          dom_elements_max?: number | null
          dom_elements_mean?: number | null
          dom_elements_min?: number | null
          dom_interactive_max?: number | null
          dom_interactive_mean?: number | null
          dom_interactive_min?: number | null
          domain?: string | null
          domains?: Json | null
          inp_latency_max?: number | null
          inp_latency_mean?: number | null
          inp_latency_min?: number | null
          lab_cls_max?: number | null
          lab_cls_mean?: number | null
          lab_cls_min?: number | null
          lab_contentsize?: number | null
          lab_css_contentsize_max?: number | null
          lab_css_contentsize_mean?: number | null
          lab_css_contentsize_min?: number | null
          lab_css_request_count_max?: number | null
          lab_css_request_count_mean?: number | null
          lab_css_request_count_min?: number | null
          lab_css_transfersize_max?: number | null
          lab_css_transfersize_mean?: number | null
          lab_css_transfersize_min?: number | null
          lab_domain_lookup?: number | null
          lab_error_max?: number | null
          lab_error_mean?: number | null
          lab_error_min?: number | null
          lab_fcp_max?: number | null
          lab_fcp_mean?: number | null
          lab_fcp_min?: number | null
          lab_fid_max?: number | null
          lab_fid_mean?: number | null
          lab_fid_min?: number | null
          lab_firstmeaningfulpaint_max?: number | null
          lab_firstmeaningfulpaint_mean?: number | null
          lab_firstmeaningfulpaint_min?: number | null
          lab_font_contentsize_max?: number | null
          lab_font_contentsize_mean?: number | null
          lab_font_contentsize_min?: number | null
          lab_font_request_count_max?: number | null
          lab_font_request_count_mean?: number | null
          lab_font_request_count_min?: number | null
          lab_font_transfersize_max?: number | null
          lab_font_transfersize_mean?: number | null
          lab_font_transfersize_min?: number | null
          lab_fullyloaded_max?: number | null
          lab_fullyloaded_mean?: number | null
          lab_fullyloaded_min?: number | null
          lab_html_contentsize_max?: number | null
          lab_html_contentsize_mean?: number | null
          lab_html_contentsize_min?: number | null
          lab_html_request_count_max?: number | null
          lab_html_request_count_mean?: number | null
          lab_html_request_count_min?: number | null
          lab_html_transfersize_max?: number | null
          lab_html_transfersize_mean?: number | null
          lab_html_transfersize_min?: number | null
          lab_image_contentsize_max?: number | null
          lab_image_contentsize_mean?: number | null
          lab_image_contentsize_min?: number | null
          lab_image_request_count_max?: number | null
          lab_image_request_count_mean?: number | null
          lab_image_request_count_min?: number | null
          lab_image_transfersize_max?: number | null
          lab_image_transfersize_mean?: number | null
          lab_image_transfersize_min?: number | null
          lab_js_contentsize_max?: number | null
          lab_js_contentsize_mean?: number | null
          lab_js_contentsize_min?: number | null
          lab_js_request_count_max?: number | null
          lab_js_request_count_mean?: number | null
          lab_js_request_count_min?: number | null
          lab_js_transfersize_max?: number | null
          lab_js_transfersize_mean?: number | null
          lab_js_transfersize_min?: number | null
          lab_json_contentsize_max?: number | null
          lab_json_contentsize_mean?: number | null
          lab_json_contentsize_min?: number | null
          lab_json_request_count_max?: number | null
          lab_json_request_count_mean?: number | null
          lab_json_request_count_min?: number | null
          lab_json_transfersize_max?: number | null
          lab_json_transfersize_mean?: number | null
          lab_json_transfersize_min?: number | null
          lab_lcp_max?: number | null
          lab_lcp_mean?: number | null
          lab_lcp_min?: number | null
          lab_speed_index_max?: number | null
          lab_speed_index_mean?: number | null
          lab_speed_index_min?: number | null
          lab_srt_max?: number | null
          lab_srt_mean?: number | null
          lab_srt_min?: number | null
          lab_svg_contentsize_max?: number | null
          lab_svg_contentsize_mean?: number | null
          lab_svg_contentsize_min?: number | null
          lab_svg_request_count_max?: number | null
          lab_svg_request_count_mean?: number | null
          lab_svg_request_count_min?: number | null
          lab_svg_transfersize_max?: number | null
          lab_svg_transfersize_mean?: number | null
          lab_svg_transfersize_min?: number | null
          lab_tbt_max?: number | null
          lab_tbt_mean?: number | null
          lab_tbt_min?: number | null
          lab_total_contentsize_max?: number | null
          lab_total_contentsize_mean?: number | null
          lab_total_contentsize_min?: number | null
          lab_total_requests_max?: number | null
          lab_total_requests_mean?: number | null
          lab_total_requests_min?: number | null
          lab_total_transfersize_max?: number | null
          lab_total_transfersize_mean?: number | null
          lab_total_transfersize_min?: number | null
          lab_ttfb_max?: number | null
          lab_ttfb_mean?: number | null
          lab_ttfb_min?: number | null
          lcp_data?: Json | null
          lcp_element_size_max?: number | null
          lcp_element_size_mean?: number | null
          lcp_element_size_min?: number | null
          lcp_timing?: Json | null
          page_address?: string
          page_filmstrip?: string | null
          page_screenshot?: string | null
          pageload_timing?: Json | null
          pageweight?: number | null
          performance_score_max?: number | null
          performance_score_mean?: number | null
          performance_score_min?: number | null
          record_id?: string
          third_party_content_size_max?: number | null
          third_party_content_size_mean?: number | null
          third_party_content_size_min?: number | null
          third_party_req_max?: number | null
          third_party_req_mean?: number | null
          third_party_req_min?: number | null
          third_party_transfer_size_max?: number | null
          third_party_transfer_size_mean?: number | null
          third_party_transfer_size_min?: number | null
          useragent?: string | null
          windowsize?: string | null
        }
        Relationships: []
      }
      pageperf_data_desktop: {
        Row: {
          blocking_scripts: Json | null
          browser: string | null
          browser_version: string | null
          cls_data: Json | null
          created_at: string
          crux_cls_avg: number | null
          crux_cls_good: number | null
          crux_cls_p75: number | null
          crux_cls_poor: number | null
          crux_fcp_avg: number | null
          crux_fcp_good: number | null
          crux_fcp_p75: number | null
          crux_fcp_poor: number | null
          crux_inp_avg: number | null
          crux_inp_good: number | null
          crux_inp_p75: number | null
          crux_inp_poor: number | null
          crux_lcp_avg: number | null
          crux_lcp_good: number | null
          crux_lcp_p75: number | null
          crux_lcp_poor: number | null
          crux_ttfb_avg: number | null
          crux_ttfb_good: number | null
          crux_ttfb_p75: number | null
          crux_ttfb_poor: number | null
          device_type: string
          document_decodedbody_size: number | null
          document_encodedbody_size: number | null
          document_timing: Json | null
          document_transfersize: number | null
          documenttitle: string | null
          dom_complete_max: number | null
          dom_complete_mean: number | null
          dom_complete_min: number | null
          dom_elements_max: number | null
          dom_elements_mean: number | null
          dom_elements_min: number | null
          dom_interactive_max: number | null
          dom_interactive_mean: number | null
          dom_interactive_min: number | null
          domain: string | null
          domains: Json | null
          inp_latency_max: number | null
          inp_latency_mean: number | null
          inp_latency_min: number | null
          lab_cls_max: number | null
          lab_cls_mean: number | null
          lab_cls_min: number | null
          lab_contentsize: number | null
          lab_css_contentsize_max: number | null
          lab_css_contentsize_mean: number | null
          lab_css_contentsize_min: number | null
          lab_css_request_count_max: number | null
          lab_css_request_count_mean: number | null
          lab_css_request_count_min: number | null
          lab_css_transfersize_max: number | null
          lab_css_transfersize_mean: number | null
          lab_css_transfersize_min: number | null
          lab_domain_lookup: number | null
          lab_error_max: number | null
          lab_error_mean: number | null
          lab_error_min: number | null
          lab_fcp_max: number | null
          lab_fcp_mean: number | null
          lab_fcp_min: number | null
          lab_fid_max: number | null
          lab_fid_mean: number | null
          lab_fid_min: number | null
          lab_firstmeaningfulpaint_max: number | null
          lab_firstmeaningfulpaint_mean: number | null
          lab_firstmeaningfulpaint_min: number | null
          lab_font_contentsize_max: number | null
          lab_font_contentsize_mean: number | null
          lab_font_contentsize_min: number | null
          lab_font_request_count_max: number | null
          lab_font_request_count_mean: number | null
          lab_font_request_count_min: number | null
          lab_font_transfersize_max: number | null
          lab_font_transfersize_mean: number | null
          lab_font_transfersize_min: number | null
          lab_fullyloaded_max: number | null
          lab_fullyloaded_mean: number | null
          lab_fullyloaded_min: number | null
          lab_html_contentsize_max: number | null
          lab_html_contentsize_mean: number | null
          lab_html_contentsize_min: number | null
          lab_html_request_count_max: number | null
          lab_html_request_count_mean: number | null
          lab_html_request_count_min: number | null
          lab_html_transfersize_max: number | null
          lab_html_transfersize_mean: number | null
          lab_html_transfersize_min: number | null
          lab_image_contentsize_max: number | null
          lab_image_contentsize_mean: number | null
          lab_image_contentsize_min: number | null
          lab_image_request_count_max: number | null
          lab_image_request_count_mean: number | null
          lab_image_request_count_min: number | null
          lab_image_transfersize_max: number | null
          lab_image_transfersize_mean: number | null
          lab_image_transfersize_min: number | null
          lab_js_contentsize_max: number | null
          lab_js_contentsize_mean: number | null
          lab_js_contentsize_min: number | null
          lab_js_request_count_max: number | null
          lab_js_request_count_mean: number | null
          lab_js_request_count_min: number | null
          lab_js_transfersize_max: number | null
          lab_js_transfersize_mean: number | null
          lab_js_transfersize_min: number | null
          lab_json_contentsize_max: number | null
          lab_json_contentsize_mean: number | null
          lab_json_contentsize_min: number | null
          lab_json_request_count_max: number | null
          lab_json_request_count_mean: number | null
          lab_json_request_count_min: number | null
          lab_json_transfersize_max: number | null
          lab_json_transfersize_mean: number | null
          lab_json_transfersize_min: number | null
          lab_lcp_max: number | null
          lab_lcp_mean: number | null
          lab_lcp_min: number | null
          lab_speed_index_max: number | null
          lab_speed_index_mean: number | null
          lab_speed_index_min: number | null
          lab_srt_max: number | null
          lab_srt_mean: number | null
          lab_srt_min: number | null
          lab_svg_contentsize_max: number | null
          lab_svg_contentsize_mean: number | null
          lab_svg_contentsize_min: number | null
          lab_svg_request_count_max: number | null
          lab_svg_request_count_mean: number | null
          lab_svg_request_count_min: number | null
          lab_svg_transfersize_max: number | null
          lab_svg_transfersize_mean: number | null
          lab_svg_transfersize_min: number | null
          lab_tbt_max: number | null
          lab_tbt_mean: number | null
          lab_tbt_min: number | null
          lab_total_contentsize_max: number | null
          lab_total_contentsize_mean: number | null
          lab_total_contentsize_min: number | null
          lab_total_requests_max: number | null
          lab_total_requests_mean: number | null
          lab_total_requests_min: number | null
          lab_total_transfersize_max: number | null
          lab_total_transfersize_mean: number | null
          lab_total_transfersize_min: number | null
          lab_ttfb_max: number | null
          lab_ttfb_mean: number | null
          lab_ttfb_min: number | null
          lcp_data: Json | null
          lcp_element_size_max: number | null
          lcp_element_size_mean: number | null
          lcp_element_size_min: number | null
          lcp_timing: Json | null
          page_address: string
          page_filmstrip: string | null
          page_screenshot: string | null
          pageload_timing: Json | null
          pageweight: number | null
          performance_score_max: number | null
          performance_score_mean: number | null
          performance_score_min: number | null
          record_id: string
          third_party_content_size_max: number | null
          third_party_content_size_mean: number | null
          third_party_content_size_min: number | null
          third_party_req_max: number | null
          third_party_req_mean: number | null
          third_party_req_min: number | null
          third_party_transfer_size_max: number | null
          third_party_transfer_size_mean: number | null
          third_party_transfer_size_min: number | null
          useragent: string | null
          windowsize: string | null
        }
        Insert: {
          blocking_scripts?: Json | null
          browser?: string | null
          browser_version?: string | null
          cls_data?: Json | null
          created_at: string
          crux_cls_avg?: number | null
          crux_cls_good?: number | null
          crux_cls_p75?: number | null
          crux_cls_poor?: number | null
          crux_fcp_avg?: number | null
          crux_fcp_good?: number | null
          crux_fcp_p75?: number | null
          crux_fcp_poor?: number | null
          crux_inp_avg?: number | null
          crux_inp_good?: number | null
          crux_inp_p75?: number | null
          crux_inp_poor?: number | null
          crux_lcp_avg?: number | null
          crux_lcp_good?: number | null
          crux_lcp_p75?: number | null
          crux_lcp_poor?: number | null
          crux_ttfb_avg?: number | null
          crux_ttfb_good?: number | null
          crux_ttfb_p75?: number | null
          crux_ttfb_poor?: number | null
          device_type: string
          document_decodedbody_size?: number | null
          document_encodedbody_size?: number | null
          document_timing?: Json | null
          document_transfersize?: number | null
          documenttitle?: string | null
          dom_complete_max?: number | null
          dom_complete_mean?: number | null
          dom_complete_min?: number | null
          dom_elements_max?: number | null
          dom_elements_mean?: number | null
          dom_elements_min?: number | null
          dom_interactive_max?: number | null
          dom_interactive_mean?: number | null
          dom_interactive_min?: number | null
          domain?: string | null
          domains?: Json | null
          inp_latency_max?: number | null
          inp_latency_mean?: number | null
          inp_latency_min?: number | null
          lab_cls_max?: number | null
          lab_cls_mean?: number | null
          lab_cls_min?: number | null
          lab_contentsize?: number | null
          lab_css_contentsize_max?: number | null
          lab_css_contentsize_mean?: number | null
          lab_css_contentsize_min?: number | null
          lab_css_request_count_max?: number | null
          lab_css_request_count_mean?: number | null
          lab_css_request_count_min?: number | null
          lab_css_transfersize_max?: number | null
          lab_css_transfersize_mean?: number | null
          lab_css_transfersize_min?: number | null
          lab_domain_lookup?: number | null
          lab_error_max?: number | null
          lab_error_mean?: number | null
          lab_error_min?: number | null
          lab_fcp_max?: number | null
          lab_fcp_mean?: number | null
          lab_fcp_min?: number | null
          lab_fid_max?: number | null
          lab_fid_mean?: number | null
          lab_fid_min?: number | null
          lab_firstmeaningfulpaint_max?: number | null
          lab_firstmeaningfulpaint_mean?: number | null
          lab_firstmeaningfulpaint_min?: number | null
          lab_font_contentsize_max?: number | null
          lab_font_contentsize_mean?: number | null
          lab_font_contentsize_min?: number | null
          lab_font_request_count_max?: number | null
          lab_font_request_count_mean?: number | null
          lab_font_request_count_min?: number | null
          lab_font_transfersize_max?: number | null
          lab_font_transfersize_mean?: number | null
          lab_font_transfersize_min?: number | null
          lab_fullyloaded_max?: number | null
          lab_fullyloaded_mean?: number | null
          lab_fullyloaded_min?: number | null
          lab_html_contentsize_max?: number | null
          lab_html_contentsize_mean?: number | null
          lab_html_contentsize_min?: number | null
          lab_html_request_count_max?: number | null
          lab_html_request_count_mean?: number | null
          lab_html_request_count_min?: number | null
          lab_html_transfersize_max?: number | null
          lab_html_transfersize_mean?: number | null
          lab_html_transfersize_min?: number | null
          lab_image_contentsize_max?: number | null
          lab_image_contentsize_mean?: number | null
          lab_image_contentsize_min?: number | null
          lab_image_request_count_max?: number | null
          lab_image_request_count_mean?: number | null
          lab_image_request_count_min?: number | null
          lab_image_transfersize_max?: number | null
          lab_image_transfersize_mean?: number | null
          lab_image_transfersize_min?: number | null
          lab_js_contentsize_max?: number | null
          lab_js_contentsize_mean?: number | null
          lab_js_contentsize_min?: number | null
          lab_js_request_count_max?: number | null
          lab_js_request_count_mean?: number | null
          lab_js_request_count_min?: number | null
          lab_js_transfersize_max?: number | null
          lab_js_transfersize_mean?: number | null
          lab_js_transfersize_min?: number | null
          lab_json_contentsize_max?: number | null
          lab_json_contentsize_mean?: number | null
          lab_json_contentsize_min?: number | null
          lab_json_request_count_max?: number | null
          lab_json_request_count_mean?: number | null
          lab_json_request_count_min?: number | null
          lab_json_transfersize_max?: number | null
          lab_json_transfersize_mean?: number | null
          lab_json_transfersize_min?: number | null
          lab_lcp_max?: number | null
          lab_lcp_mean?: number | null
          lab_lcp_min?: number | null
          lab_speed_index_max?: number | null
          lab_speed_index_mean?: number | null
          lab_speed_index_min?: number | null
          lab_srt_max?: number | null
          lab_srt_mean?: number | null
          lab_srt_min?: number | null
          lab_svg_contentsize_max?: number | null
          lab_svg_contentsize_mean?: number | null
          lab_svg_contentsize_min?: number | null
          lab_svg_request_count_max?: number | null
          lab_svg_request_count_mean?: number | null
          lab_svg_request_count_min?: number | null
          lab_svg_transfersize_max?: number | null
          lab_svg_transfersize_mean?: number | null
          lab_svg_transfersize_min?: number | null
          lab_tbt_max?: number | null
          lab_tbt_mean?: number | null
          lab_tbt_min?: number | null
          lab_total_contentsize_max?: number | null
          lab_total_contentsize_mean?: number | null
          lab_total_contentsize_min?: number | null
          lab_total_requests_max?: number | null
          lab_total_requests_mean?: number | null
          lab_total_requests_min?: number | null
          lab_total_transfersize_max?: number | null
          lab_total_transfersize_mean?: number | null
          lab_total_transfersize_min?: number | null
          lab_ttfb_max?: number | null
          lab_ttfb_mean?: number | null
          lab_ttfb_min?: number | null
          lcp_data?: Json | null
          lcp_element_size_max?: number | null
          lcp_element_size_mean?: number | null
          lcp_element_size_min?: number | null
          lcp_timing?: Json | null
          page_address: string
          page_filmstrip?: string | null
          page_screenshot?: string | null
          pageload_timing?: Json | null
          pageweight?: number | null
          performance_score_max?: number | null
          performance_score_mean?: number | null
          performance_score_min?: number | null
          record_id?: string
          third_party_content_size_max?: number | null
          third_party_content_size_mean?: number | null
          third_party_content_size_min?: number | null
          third_party_req_max?: number | null
          third_party_req_mean?: number | null
          third_party_req_min?: number | null
          third_party_transfer_size_max?: number | null
          third_party_transfer_size_mean?: number | null
          third_party_transfer_size_min?: number | null
          useragent?: string | null
          windowsize?: string | null
        }
        Update: {
          blocking_scripts?: Json | null
          browser?: string | null
          browser_version?: string | null
          cls_data?: Json | null
          created_at?: string
          crux_cls_avg?: number | null
          crux_cls_good?: number | null
          crux_cls_p75?: number | null
          crux_cls_poor?: number | null
          crux_fcp_avg?: number | null
          crux_fcp_good?: number | null
          crux_fcp_p75?: number | null
          crux_fcp_poor?: number | null
          crux_inp_avg?: number | null
          crux_inp_good?: number | null
          crux_inp_p75?: number | null
          crux_inp_poor?: number | null
          crux_lcp_avg?: number | null
          crux_lcp_good?: number | null
          crux_lcp_p75?: number | null
          crux_lcp_poor?: number | null
          crux_ttfb_avg?: number | null
          crux_ttfb_good?: number | null
          crux_ttfb_p75?: number | null
          crux_ttfb_poor?: number | null
          device_type?: string
          document_decodedbody_size?: number | null
          document_encodedbody_size?: number | null
          document_timing?: Json | null
          document_transfersize?: number | null
          documenttitle?: string | null
          dom_complete_max?: number | null
          dom_complete_mean?: number | null
          dom_complete_min?: number | null
          dom_elements_max?: number | null
          dom_elements_mean?: number | null
          dom_elements_min?: number | null
          dom_interactive_max?: number | null
          dom_interactive_mean?: number | null
          dom_interactive_min?: number | null
          domain?: string | null
          domains?: Json | null
          inp_latency_max?: number | null
          inp_latency_mean?: number | null
          inp_latency_min?: number | null
          lab_cls_max?: number | null
          lab_cls_mean?: number | null
          lab_cls_min?: number | null
          lab_contentsize?: number | null
          lab_css_contentsize_max?: number | null
          lab_css_contentsize_mean?: number | null
          lab_css_contentsize_min?: number | null
          lab_css_request_count_max?: number | null
          lab_css_request_count_mean?: number | null
          lab_css_request_count_min?: number | null
          lab_css_transfersize_max?: number | null
          lab_css_transfersize_mean?: number | null
          lab_css_transfersize_min?: number | null
          lab_domain_lookup?: number | null
          lab_error_max?: number | null
          lab_error_mean?: number | null
          lab_error_min?: number | null
          lab_fcp_max?: number | null
          lab_fcp_mean?: number | null
          lab_fcp_min?: number | null
          lab_fid_max?: number | null
          lab_fid_mean?: number | null
          lab_fid_min?: number | null
          lab_firstmeaningfulpaint_max?: number | null
          lab_firstmeaningfulpaint_mean?: number | null
          lab_firstmeaningfulpaint_min?: number | null
          lab_font_contentsize_max?: number | null
          lab_font_contentsize_mean?: number | null
          lab_font_contentsize_min?: number | null
          lab_font_request_count_max?: number | null
          lab_font_request_count_mean?: number | null
          lab_font_request_count_min?: number | null
          lab_font_transfersize_max?: number | null
          lab_font_transfersize_mean?: number | null
          lab_font_transfersize_min?: number | null
          lab_fullyloaded_max?: number | null
          lab_fullyloaded_mean?: number | null
          lab_fullyloaded_min?: number | null
          lab_html_contentsize_max?: number | null
          lab_html_contentsize_mean?: number | null
          lab_html_contentsize_min?: number | null
          lab_html_request_count_max?: number | null
          lab_html_request_count_mean?: number | null
          lab_html_request_count_min?: number | null
          lab_html_transfersize_max?: number | null
          lab_html_transfersize_mean?: number | null
          lab_html_transfersize_min?: number | null
          lab_image_contentsize_max?: number | null
          lab_image_contentsize_mean?: number | null
          lab_image_contentsize_min?: number | null
          lab_image_request_count_max?: number | null
          lab_image_request_count_mean?: number | null
          lab_image_request_count_min?: number | null
          lab_image_transfersize_max?: number | null
          lab_image_transfersize_mean?: number | null
          lab_image_transfersize_min?: number | null
          lab_js_contentsize_max?: number | null
          lab_js_contentsize_mean?: number | null
          lab_js_contentsize_min?: number | null
          lab_js_request_count_max?: number | null
          lab_js_request_count_mean?: number | null
          lab_js_request_count_min?: number | null
          lab_js_transfersize_max?: number | null
          lab_js_transfersize_mean?: number | null
          lab_js_transfersize_min?: number | null
          lab_json_contentsize_max?: number | null
          lab_json_contentsize_mean?: number | null
          lab_json_contentsize_min?: number | null
          lab_json_request_count_max?: number | null
          lab_json_request_count_mean?: number | null
          lab_json_request_count_min?: number | null
          lab_json_transfersize_max?: number | null
          lab_json_transfersize_mean?: number | null
          lab_json_transfersize_min?: number | null
          lab_lcp_max?: number | null
          lab_lcp_mean?: number | null
          lab_lcp_min?: number | null
          lab_speed_index_max?: number | null
          lab_speed_index_mean?: number | null
          lab_speed_index_min?: number | null
          lab_srt_max?: number | null
          lab_srt_mean?: number | null
          lab_srt_min?: number | null
          lab_svg_contentsize_max?: number | null
          lab_svg_contentsize_mean?: number | null
          lab_svg_contentsize_min?: number | null
          lab_svg_request_count_max?: number | null
          lab_svg_request_count_mean?: number | null
          lab_svg_request_count_min?: number | null
          lab_svg_transfersize_max?: number | null
          lab_svg_transfersize_mean?: number | null
          lab_svg_transfersize_min?: number | null
          lab_tbt_max?: number | null
          lab_tbt_mean?: number | null
          lab_tbt_min?: number | null
          lab_total_contentsize_max?: number | null
          lab_total_contentsize_mean?: number | null
          lab_total_contentsize_min?: number | null
          lab_total_requests_max?: number | null
          lab_total_requests_mean?: number | null
          lab_total_requests_min?: number | null
          lab_total_transfersize_max?: number | null
          lab_total_transfersize_mean?: number | null
          lab_total_transfersize_min?: number | null
          lab_ttfb_max?: number | null
          lab_ttfb_mean?: number | null
          lab_ttfb_min?: number | null
          lcp_data?: Json | null
          lcp_element_size_max?: number | null
          lcp_element_size_mean?: number | null
          lcp_element_size_min?: number | null
          lcp_timing?: Json | null
          page_address?: string
          page_filmstrip?: string | null
          page_screenshot?: string | null
          pageload_timing?: Json | null
          pageweight?: number | null
          performance_score_max?: number | null
          performance_score_mean?: number | null
          performance_score_min?: number | null
          record_id?: string
          third_party_content_size_max?: number | null
          third_party_content_size_mean?: number | null
          third_party_content_size_min?: number | null
          third_party_req_max?: number | null
          third_party_req_mean?: number | null
          third_party_req_min?: number | null
          third_party_transfer_size_max?: number | null
          third_party_transfer_size_mean?: number | null
          third_party_transfer_size_min?: number | null
          useragent?: string | null
          windowsize?: string | null
        }
        Relationships: []
      }
      pageperf_data_mobile: {
        Row: {
          blocking_scripts: Json | null
          browser: string | null
          browser_version: string | null
          cls_data: Json | null
          created_at: string
          crux_cls_avg: number | null
          crux_cls_good: number | null
          crux_cls_p75: number | null
          crux_cls_poor: number | null
          crux_fcp_avg: number | null
          crux_fcp_good: number | null
          crux_fcp_p75: number | null
          crux_fcp_poor: number | null
          crux_inp_avg: number | null
          crux_inp_good: number | null
          crux_inp_p75: number | null
          crux_inp_poor: number | null
          crux_lcp_avg: number | null
          crux_lcp_good: number | null
          crux_lcp_p75: number | null
          crux_lcp_poor: number | null
          crux_ttfb_avg: number | null
          crux_ttfb_good: number | null
          crux_ttfb_p75: number | null
          crux_ttfb_poor: number | null
          device_type: string
          document_decodedbody_size: number | null
          document_encodedbody_size: number | null
          document_timing: Json | null
          document_transfersize: number | null
          documenttitle: string | null
          dom_complete_max: number | null
          dom_complete_mean: number | null
          dom_complete_min: number | null
          dom_elements_max: number | null
          dom_elements_mean: number | null
          dom_elements_min: number | null
          dom_interactive_max: number | null
          dom_interactive_mean: number | null
          dom_interactive_min: number | null
          domain: string | null
          domains: Json | null
          inp_latency_max: number | null
          inp_latency_mean: number | null
          inp_latency_min: number | null
          lab_cls_max: number | null
          lab_cls_mean: number | null
          lab_cls_min: number | null
          lab_contentsize: number | null
          lab_css_contentsize_max: number | null
          lab_css_contentsize_mean: number | null
          lab_css_contentsize_min: number | null
          lab_css_request_count_max: number | null
          lab_css_request_count_mean: number | null
          lab_css_request_count_min: number | null
          lab_css_transfersize_max: number | null
          lab_css_transfersize_mean: number | null
          lab_css_transfersize_min: number | null
          lab_domain_lookup: number | null
          lab_error_max: number | null
          lab_error_mean: number | null
          lab_error_min: number | null
          lab_fcp_max: number | null
          lab_fcp_mean: number | null
          lab_fcp_min: number | null
          lab_fid_max: number | null
          lab_fid_mean: number | null
          lab_fid_min: number | null
          lab_firstmeaningfulpaint_max: number | null
          lab_firstmeaningfulpaint_mean: number | null
          lab_firstmeaningfulpaint_min: number | null
          lab_font_contentsize_max: number | null
          lab_font_contentsize_mean: number | null
          lab_font_contentsize_min: number | null
          lab_font_request_count_max: number | null
          lab_font_request_count_mean: number | null
          lab_font_request_count_min: number | null
          lab_font_transfersize_max: number | null
          lab_font_transfersize_mean: number | null
          lab_font_transfersize_min: number | null
          lab_fullyloaded_max: number | null
          lab_fullyloaded_mean: number | null
          lab_fullyloaded_min: number | null
          lab_html_contentsize_max: number | null
          lab_html_contentsize_mean: number | null
          lab_html_contentsize_min: number | null
          lab_html_request_count_max: number | null
          lab_html_request_count_mean: number | null
          lab_html_request_count_min: number | null
          lab_html_transfersize_max: number | null
          lab_html_transfersize_mean: number | null
          lab_html_transfersize_min: number | null
          lab_image_contentsize_max: number | null
          lab_image_contentsize_mean: number | null
          lab_image_contentsize_min: number | null
          lab_image_request_count_max: number | null
          lab_image_request_count_mean: number | null
          lab_image_request_count_min: number | null
          lab_image_transfersize_max: number | null
          lab_image_transfersize_mean: number | null
          lab_image_transfersize_min: number | null
          lab_js_contentsize_max: number | null
          lab_js_contentsize_mean: number | null
          lab_js_contentsize_min: number | null
          lab_js_request_count_max: number | null
          lab_js_request_count_mean: number | null
          lab_js_request_count_min: number | null
          lab_js_transfersize_max: number | null
          lab_js_transfersize_mean: number | null
          lab_js_transfersize_min: number | null
          lab_json_contentsize_max: number | null
          lab_json_contentsize_mean: number | null
          lab_json_contentsize_min: number | null
          lab_json_request_count_max: number | null
          lab_json_request_count_mean: number | null
          lab_json_request_count_min: number | null
          lab_json_transfersize_max: number | null
          lab_json_transfersize_mean: number | null
          lab_json_transfersize_min: number | null
          lab_lcp_max: number | null
          lab_lcp_mean: number | null
          lab_lcp_min: number | null
          lab_speed_index_max: number | null
          lab_speed_index_mean: number | null
          lab_speed_index_min: number | null
          lab_srt_max: number | null
          lab_srt_mean: number | null
          lab_srt_min: number | null
          lab_svg_contentsize_max: number | null
          lab_svg_contentsize_mean: number | null
          lab_svg_contentsize_min: number | null
          lab_svg_request_count_max: number | null
          lab_svg_request_count_mean: number | null
          lab_svg_request_count_min: number | null
          lab_svg_transfersize_max: number | null
          lab_svg_transfersize_mean: number | null
          lab_svg_transfersize_min: number | null
          lab_tbt_max: number | null
          lab_tbt_mean: number | null
          lab_tbt_min: number | null
          lab_total_contentsize_max: number | null
          lab_total_contentsize_mean: number | null
          lab_total_contentsize_min: number | null
          lab_total_requests_max: number | null
          lab_total_requests_mean: number | null
          lab_total_requests_min: number | null
          lab_total_transfersize_max: number | null
          lab_total_transfersize_mean: number | null
          lab_total_transfersize_min: number | null
          lab_ttfb_max: number | null
          lab_ttfb_mean: number | null
          lab_ttfb_min: number | null
          lcp_data: Json | null
          lcp_element_size_max: number | null
          lcp_element_size_mean: number | null
          lcp_element_size_min: number | null
          lcp_timing: Json | null
          page_address: string
          page_filmstrip: string | null
          page_screenshot: string | null
          pageload_timing: Json | null
          pageweight: number | null
          performance_score_max: number | null
          performance_score_mean: number | null
          performance_score_min: number | null
          record_id: string
          third_party_content_size_max: number | null
          third_party_content_size_mean: number | null
          third_party_content_size_min: number | null
          third_party_req_max: number | null
          third_party_req_mean: number | null
          third_party_req_min: number | null
          third_party_transfer_size_max: number | null
          third_party_transfer_size_mean: number | null
          third_party_transfer_size_min: number | null
          useragent: string | null
          windowsize: string | null
        }
        Insert: {
          blocking_scripts?: Json | null
          browser?: string | null
          browser_version?: string | null
          cls_data?: Json | null
          created_at: string
          crux_cls_avg?: number | null
          crux_cls_good?: number | null
          crux_cls_p75?: number | null
          crux_cls_poor?: number | null
          crux_fcp_avg?: number | null
          crux_fcp_good?: number | null
          crux_fcp_p75?: number | null
          crux_fcp_poor?: number | null
          crux_inp_avg?: number | null
          crux_inp_good?: number | null
          crux_inp_p75?: number | null
          crux_inp_poor?: number | null
          crux_lcp_avg?: number | null
          crux_lcp_good?: number | null
          crux_lcp_p75?: number | null
          crux_lcp_poor?: number | null
          crux_ttfb_avg?: number | null
          crux_ttfb_good?: number | null
          crux_ttfb_p75?: number | null
          crux_ttfb_poor?: number | null
          device_type: string
          document_decodedbody_size?: number | null
          document_encodedbody_size?: number | null
          document_timing?: Json | null
          document_transfersize?: number | null
          documenttitle?: string | null
          dom_complete_max?: number | null
          dom_complete_mean?: number | null
          dom_complete_min?: number | null
          dom_elements_max?: number | null
          dom_elements_mean?: number | null
          dom_elements_min?: number | null
          dom_interactive_max?: number | null
          dom_interactive_mean?: number | null
          dom_interactive_min?: number | null
          domain?: string | null
          domains?: Json | null
          inp_latency_max?: number | null
          inp_latency_mean?: number | null
          inp_latency_min?: number | null
          lab_cls_max?: number | null
          lab_cls_mean?: number | null
          lab_cls_min?: number | null
          lab_contentsize?: number | null
          lab_css_contentsize_max?: number | null
          lab_css_contentsize_mean?: number | null
          lab_css_contentsize_min?: number | null
          lab_css_request_count_max?: number | null
          lab_css_request_count_mean?: number | null
          lab_css_request_count_min?: number | null
          lab_css_transfersize_max?: number | null
          lab_css_transfersize_mean?: number | null
          lab_css_transfersize_min?: number | null
          lab_domain_lookup?: number | null
          lab_error_max?: number | null
          lab_error_mean?: number | null
          lab_error_min?: number | null
          lab_fcp_max?: number | null
          lab_fcp_mean?: number | null
          lab_fcp_min?: number | null
          lab_fid_max?: number | null
          lab_fid_mean?: number | null
          lab_fid_min?: number | null
          lab_firstmeaningfulpaint_max?: number | null
          lab_firstmeaningfulpaint_mean?: number | null
          lab_firstmeaningfulpaint_min?: number | null
          lab_font_contentsize_max?: number | null
          lab_font_contentsize_mean?: number | null
          lab_font_contentsize_min?: number | null
          lab_font_request_count_max?: number | null
          lab_font_request_count_mean?: number | null
          lab_font_request_count_min?: number | null
          lab_font_transfersize_max?: number | null
          lab_font_transfersize_mean?: number | null
          lab_font_transfersize_min?: number | null
          lab_fullyloaded_max?: number | null
          lab_fullyloaded_mean?: number | null
          lab_fullyloaded_min?: number | null
          lab_html_contentsize_max?: number | null
          lab_html_contentsize_mean?: number | null
          lab_html_contentsize_min?: number | null
          lab_html_request_count_max?: number | null
          lab_html_request_count_mean?: number | null
          lab_html_request_count_min?: number | null
          lab_html_transfersize_max?: number | null
          lab_html_transfersize_mean?: number | null
          lab_html_transfersize_min?: number | null
          lab_image_contentsize_max?: number | null
          lab_image_contentsize_mean?: number | null
          lab_image_contentsize_min?: number | null
          lab_image_request_count_max?: number | null
          lab_image_request_count_mean?: number | null
          lab_image_request_count_min?: number | null
          lab_image_transfersize_max?: number | null
          lab_image_transfersize_mean?: number | null
          lab_image_transfersize_min?: number | null
          lab_js_contentsize_max?: number | null
          lab_js_contentsize_mean?: number | null
          lab_js_contentsize_min?: number | null
          lab_js_request_count_max?: number | null
          lab_js_request_count_mean?: number | null
          lab_js_request_count_min?: number | null
          lab_js_transfersize_max?: number | null
          lab_js_transfersize_mean?: number | null
          lab_js_transfersize_min?: number | null
          lab_json_contentsize_max?: number | null
          lab_json_contentsize_mean?: number | null
          lab_json_contentsize_min?: number | null
          lab_json_request_count_max?: number | null
          lab_json_request_count_mean?: number | null
          lab_json_request_count_min?: number | null
          lab_json_transfersize_max?: number | null
          lab_json_transfersize_mean?: number | null
          lab_json_transfersize_min?: number | null
          lab_lcp_max?: number | null
          lab_lcp_mean?: number | null
          lab_lcp_min?: number | null
          lab_speed_index_max?: number | null
          lab_speed_index_mean?: number | null
          lab_speed_index_min?: number | null
          lab_srt_max?: number | null
          lab_srt_mean?: number | null
          lab_srt_min?: number | null
          lab_svg_contentsize_max?: number | null
          lab_svg_contentsize_mean?: number | null
          lab_svg_contentsize_min?: number | null
          lab_svg_request_count_max?: number | null
          lab_svg_request_count_mean?: number | null
          lab_svg_request_count_min?: number | null
          lab_svg_transfersize_max?: number | null
          lab_svg_transfersize_mean?: number | null
          lab_svg_transfersize_min?: number | null
          lab_tbt_max?: number | null
          lab_tbt_mean?: number | null
          lab_tbt_min?: number | null
          lab_total_contentsize_max?: number | null
          lab_total_contentsize_mean?: number | null
          lab_total_contentsize_min?: number | null
          lab_total_requests_max?: number | null
          lab_total_requests_mean?: number | null
          lab_total_requests_min?: number | null
          lab_total_transfersize_max?: number | null
          lab_total_transfersize_mean?: number | null
          lab_total_transfersize_min?: number | null
          lab_ttfb_max?: number | null
          lab_ttfb_mean?: number | null
          lab_ttfb_min?: number | null
          lcp_data?: Json | null
          lcp_element_size_max?: number | null
          lcp_element_size_mean?: number | null
          lcp_element_size_min?: number | null
          lcp_timing?: Json | null
          page_address: string
          page_filmstrip?: string | null
          page_screenshot?: string | null
          pageload_timing?: Json | null
          pageweight?: number | null
          performance_score_max?: number | null
          performance_score_mean?: number | null
          performance_score_min?: number | null
          record_id?: string
          third_party_content_size_max?: number | null
          third_party_content_size_mean?: number | null
          third_party_content_size_min?: number | null
          third_party_req_max?: number | null
          third_party_req_mean?: number | null
          third_party_req_min?: number | null
          third_party_transfer_size_max?: number | null
          third_party_transfer_size_mean?: number | null
          third_party_transfer_size_min?: number | null
          useragent?: string | null
          windowsize?: string | null
        }
        Update: {
          blocking_scripts?: Json | null
          browser?: string | null
          browser_version?: string | null
          cls_data?: Json | null
          created_at?: string
          crux_cls_avg?: number | null
          crux_cls_good?: number | null
          crux_cls_p75?: number | null
          crux_cls_poor?: number | null
          crux_fcp_avg?: number | null
          crux_fcp_good?: number | null
          crux_fcp_p75?: number | null
          crux_fcp_poor?: number | null
          crux_inp_avg?: number | null
          crux_inp_good?: number | null
          crux_inp_p75?: number | null
          crux_inp_poor?: number | null
          crux_lcp_avg?: number | null
          crux_lcp_good?: number | null
          crux_lcp_p75?: number | null
          crux_lcp_poor?: number | null
          crux_ttfb_avg?: number | null
          crux_ttfb_good?: number | null
          crux_ttfb_p75?: number | null
          crux_ttfb_poor?: number | null
          device_type?: string
          document_decodedbody_size?: number | null
          document_encodedbody_size?: number | null
          document_timing?: Json | null
          document_transfersize?: number | null
          documenttitle?: string | null
          dom_complete_max?: number | null
          dom_complete_mean?: number | null
          dom_complete_min?: number | null
          dom_elements_max?: number | null
          dom_elements_mean?: number | null
          dom_elements_min?: number | null
          dom_interactive_max?: number | null
          dom_interactive_mean?: number | null
          dom_interactive_min?: number | null
          domain?: string | null
          domains?: Json | null
          inp_latency_max?: number | null
          inp_latency_mean?: number | null
          inp_latency_min?: number | null
          lab_cls_max?: number | null
          lab_cls_mean?: number | null
          lab_cls_min?: number | null
          lab_contentsize?: number | null
          lab_css_contentsize_max?: number | null
          lab_css_contentsize_mean?: number | null
          lab_css_contentsize_min?: number | null
          lab_css_request_count_max?: number | null
          lab_css_request_count_mean?: number | null
          lab_css_request_count_min?: number | null
          lab_css_transfersize_max?: number | null
          lab_css_transfersize_mean?: number | null
          lab_css_transfersize_min?: number | null
          lab_domain_lookup?: number | null
          lab_error_max?: number | null
          lab_error_mean?: number | null
          lab_error_min?: number | null
          lab_fcp_max?: number | null
          lab_fcp_mean?: number | null
          lab_fcp_min?: number | null
          lab_fid_max?: number | null
          lab_fid_mean?: number | null
          lab_fid_min?: number | null
          lab_firstmeaningfulpaint_max?: number | null
          lab_firstmeaningfulpaint_mean?: number | null
          lab_firstmeaningfulpaint_min?: number | null
          lab_font_contentsize_max?: number | null
          lab_font_contentsize_mean?: number | null
          lab_font_contentsize_min?: number | null
          lab_font_request_count_max?: number | null
          lab_font_request_count_mean?: number | null
          lab_font_request_count_min?: number | null
          lab_font_transfersize_max?: number | null
          lab_font_transfersize_mean?: number | null
          lab_font_transfersize_min?: number | null
          lab_fullyloaded_max?: number | null
          lab_fullyloaded_mean?: number | null
          lab_fullyloaded_min?: number | null
          lab_html_contentsize_max?: number | null
          lab_html_contentsize_mean?: number | null
          lab_html_contentsize_min?: number | null
          lab_html_request_count_max?: number | null
          lab_html_request_count_mean?: number | null
          lab_html_request_count_min?: number | null
          lab_html_transfersize_max?: number | null
          lab_html_transfersize_mean?: number | null
          lab_html_transfersize_min?: number | null
          lab_image_contentsize_max?: number | null
          lab_image_contentsize_mean?: number | null
          lab_image_contentsize_min?: number | null
          lab_image_request_count_max?: number | null
          lab_image_request_count_mean?: number | null
          lab_image_request_count_min?: number | null
          lab_image_transfersize_max?: number | null
          lab_image_transfersize_mean?: number | null
          lab_image_transfersize_min?: number | null
          lab_js_contentsize_max?: number | null
          lab_js_contentsize_mean?: number | null
          lab_js_contentsize_min?: number | null
          lab_js_request_count_max?: number | null
          lab_js_request_count_mean?: number | null
          lab_js_request_count_min?: number | null
          lab_js_transfersize_max?: number | null
          lab_js_transfersize_mean?: number | null
          lab_js_transfersize_min?: number | null
          lab_json_contentsize_max?: number | null
          lab_json_contentsize_mean?: number | null
          lab_json_contentsize_min?: number | null
          lab_json_request_count_max?: number | null
          lab_json_request_count_mean?: number | null
          lab_json_request_count_min?: number | null
          lab_json_transfersize_max?: number | null
          lab_json_transfersize_mean?: number | null
          lab_json_transfersize_min?: number | null
          lab_lcp_max?: number | null
          lab_lcp_mean?: number | null
          lab_lcp_min?: number | null
          lab_speed_index_max?: number | null
          lab_speed_index_mean?: number | null
          lab_speed_index_min?: number | null
          lab_srt_max?: number | null
          lab_srt_mean?: number | null
          lab_srt_min?: number | null
          lab_svg_contentsize_max?: number | null
          lab_svg_contentsize_mean?: number | null
          lab_svg_contentsize_min?: number | null
          lab_svg_request_count_max?: number | null
          lab_svg_request_count_mean?: number | null
          lab_svg_request_count_min?: number | null
          lab_svg_transfersize_max?: number | null
          lab_svg_transfersize_mean?: number | null
          lab_svg_transfersize_min?: number | null
          lab_tbt_max?: number | null
          lab_tbt_mean?: number | null
          lab_tbt_min?: number | null
          lab_total_contentsize_max?: number | null
          lab_total_contentsize_mean?: number | null
          lab_total_contentsize_min?: number | null
          lab_total_requests_max?: number | null
          lab_total_requests_mean?: number | null
          lab_total_requests_min?: number | null
          lab_total_transfersize_max?: number | null
          lab_total_transfersize_mean?: number | null
          lab_total_transfersize_min?: number | null
          lab_ttfb_max?: number | null
          lab_ttfb_mean?: number | null
          lab_ttfb_min?: number | null
          lcp_data?: Json | null
          lcp_element_size_max?: number | null
          lcp_element_size_mean?: number | null
          lcp_element_size_min?: number | null
          lcp_timing?: Json | null
          page_address?: string
          page_filmstrip?: string | null
          page_screenshot?: string | null
          pageload_timing?: Json | null
          pageweight?: number | null
          performance_score_max?: number | null
          performance_score_mean?: number | null
          performance_score_min?: number | null
          record_id?: string
          third_party_content_size_max?: number | null
          third_party_content_size_mean?: number | null
          third_party_content_size_min?: number | null
          third_party_req_max?: number | null
          third_party_req_mean?: number | null
          third_party_req_min?: number | null
          third_party_transfer_size_max?: number | null
          third_party_transfer_size_mean?: number | null
          third_party_transfer_size_min?: number | null
          useragent?: string | null
          windowsize?: string | null
        }
        Relationships: []
      }
      pageSummery: {
        Row: {
          created_at: string
          data: Json
          device_type: string | null
          id: number
          page_address: string | null
        }
        Insert: {
          created_at?: string
          data: Json
          device_type?: string | null
          id?: number
          page_address?: string | null
        }
        Update: {
          created_at?: string
          data?: Json
          device_type?: string | null
          id?: number
          page_address?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string
          email: string
          firstname: string
          id: string | null
          lastname: string
        }
        Insert: {
          created_at?: string
          email: string
          firstname: string
          id?: string | null
          lastname: string
        }
        Update: {
          created_at?: string
          email?: string
          firstname?: string
          id?: string | null
          lastname?: string
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
