export type Json =
  | string
  | number
  | boolean
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)";
  };
  public: {
    Tables: {
      cloudflare_auth: {
        Row: {
          config_backup: Json | null;
          created_at: string;
          id: number;
          site_id: string | null;
          status: string | null;
          token: string | null;
          updated_at: string | null;
          user_id: string | null;
        };
        Insert: {
          config_backup?: Json | null;
          created_at?: string;
          id?: number;
          site_id?: string | null;
          status?: string | null;
          token?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          config_backup?: Json | null;
          created_at?: string;
          id?: number;
          site_id?: string | null;
          status?: string | null;
          token?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "cloudflare_auth_site_id_fkey";
            columns: ["site_id"];
            isOneToOne: false;
            referencedRelation: "cloudflare_kv_tracking";
            referencedColumns: ["order_id"];
          },
          {
            foreignKeyName: "cloudflare_auth_site_id_fkey";
            columns: ["site_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["order_id"];
          },
        ];
      };
      orders: {
        Row: {
          favicon_file: string | null;
          order_date: string;
          order_id: string;
          order_status: boolean;
          usage_by_site: number;
          user_id: string;
          website_address: string;
          website_name: string;
        };
        Insert: {
          favicon_file?: string | null;
          order_date?: string;
          order_id?: string;
          order_status: boolean;
          usage_by_site?: number;
          user_id?: string;
          website_address: string;
          website_name: string;
        };
        Update: {
          favicon_file?: string | null;
          order_date?: string;
          order_id?: string;
          order_status?: boolean;
          usage_by_site?: number;
          user_id?: string;
          website_address?: string;
          website_name?: string;
        };
        Relationships: [];
      };
      pageperf_data: {
        Row: {
          blocking_scripts: Json | null;
          browser: string | null;
          browser_version: string | null;
          cls_data: Json | null;
          created_at: string;
          crux_cls_avg: number | null;
          crux_cls_good: number | null;
          crux_cls_p75: number | null;
          crux_cls_poor: number | null;
          crux_fcp_avg: number | null;
          crux_fcp_good: number | null;
          crux_fcp_p75: number | null;
          crux_fcp_poor: number | null;
          crux_inp_avg: number | null;
          crux_inp_good: number | null;
          crux_inp_p75: number | null;
          crux_inp_poor: number | null;
          crux_lcp_avg: number | null;
          crux_lcp_good: number | null;
          crux_lcp_p75: number | null;
          crux_lcp_poor: number | null;
          crux_ttfb_avg: number | null;
          crux_ttfb_good: number | null;
          crux_ttfb_p75: number | null;
          crux_ttfb_poor: number | null;
          device_type: string;
          document_decodedbody_size: number | null;
          document_encodedbody_size: number | null;
          document_timing: Json | null;
          document_transfersize: number | null;
          documenttitle: string | null;
          dom_complete_max: number | null;
          dom_complete_mean: number | null;
          dom_complete_min: number | null;
          dom_elements_max: number | null;
          dom_elements_mean: number | null;
          dom_elements_min: number | null;
          dom_interactive_max: number | null;
          dom_interactive_mean: number | null;
          dom_interactive_min: number | null;
          domain: string | null;
          domains: Json | null;
          inp_latency_max: number | null;
          inp_latency_mean: number | null;
          inp_latency_min: number | null;
          lab_cls_max: number | null;
          lab_cls_mean: number | null;
          lab_cls_min: number | null;
          lab_contentsize: number | null;
          lab_css_contentsize_max: number | null;
          lab_css_contentsize_mean: number | null;
          lab_css_contentsize_min: number | null;
          lab_css_request_count_max: number | null;
          lab_css_request_count_mean: number | null;
          lab_css_request_count_min: number | null;
          lab_css_transfersize_max: number | null;
          lab_css_transfersize_mean: number | null;
          lab_css_transfersize_min: number | null;
          lab_domain_lookup: number | null;
          lab_error_max: number | null;
          lab_error_mean: number | null;
          lab_error_min: number | null;
          lab_fcp_max: number | null;
          lab_fcp_mean: number | null;
          lab_fcp_min: number | null;
          lab_fid_max: number | null;
          lab_fid_mean: number | null;
          lab_fid_min: number | null;
          lab_firstmeaningfulpaint_max: number | null;
          lab_firstmeaningfulpaint_mean: number | null;
          lab_firstmeaningfulpaint_min: number | null;
          lab_font_contentsize_max: number | null;
          lab_font_contentsize_mean: number | null;
          lab_font_contentsize_min: number | null;
          lab_font_request_count_max: number | null;
          lab_font_request_count_mean: number | null;
          lab_font_request_count_min: number | null;
          lab_font_transfersize_max: number | null;
          lab_font_transfersize_mean: number | null;
          lab_font_transfersize_min: number | null;
          lab_fullyloaded_max: number | null;
          lab_fullyloaded_mean: number | null;
          lab_fullyloaded_min: number | null;
          lab_html_contentsize_max: number | null;
          lab_html_contentsize_mean: number | null;
          lab_html_contentsize_min: number | null;
          lab_html_request_count_max: number | null;
          lab_html_request_count_mean: number | null;
          lab_html_request_count_min: number | null;
          lab_html_transfersize_max: number | null;
          lab_html_transfersize_mean: number | null;
          lab_html_transfersize_min: number | null;
          lab_image_contentsize_max: number | null;
          lab_image_contentsize_mean: number | null;
          lab_image_contentsize_min: number | null;
          lab_image_request_count_max: number | null;
          lab_image_request_count_mean: number | null;
          lab_image_request_count_min: number | null;
          lab_image_transfersize_max: number | null;
          lab_image_transfersize_mean: number | null;
          lab_image_transfersize_min: number | null;
          lab_js_contentsize_max: number | null;
          lab_js_contentsize_mean: number | null;
          lab_js_contentsize_min: number | null;
          lab_js_request_count_max: number | null;
          lab_js_request_count_mean: number | null;
          lab_js_request_count_min: number | null;
          lab_js_transfersize_max: number | null;
          lab_js_transfersize_mean: number | null;
          lab_js_transfersize_min: number | null;
          lab_json_contentsize_max: number | null;
          lab_json_contentsize_mean: number | null;
          lab_json_contentsize_min: number | null;
          lab_json_request_count_max: number | null;
          lab_json_request_count_mean: number | null;
          lab_json_request_count_min: number | null;
          lab_json_transfersize_max: number | null;
          lab_json_transfersize_mean: number | null;
          lab_json_transfersize_min: number | null;
          lab_lcp_max: number | null;
          lab_lcp_mean: number | null;
          lab_lcp_min: number | null;
          lab_speed_index_max: number | null;
          lab_speed_index_mean: number | null;
          lab_speed_index_min: number | null;
          lab_srt_max: number | null;
          lab_srt_mean: number | null;
          lab_srt_min: number | null;
          lab_svg_contentsize_max: number | null;
          lab_svg_contentsize_mean: number | null;
          lab_svg_contentsize_min: number | null;
          lab_svg_request_count_max: number | null;
          lab_svg_request_count_mean: number | null;
          lab_svg_request_count_min: number | null;
          lab_svg_transfersize_max: number | null;
          lab_svg_transfersize_mean: number | null;
          lab_svg_transfersize_min: number | null;
          lab_tbt_max: number | null;
          lab_tbt_mean: number | null;
          lab_tbt_min: number | null;
          lab_total_contentsize_max: number | null;
          lab_total_contentsize_mean: number | null;
          lab_total_contentsize_min: number | null;
          lab_total_requests_max: number | null;
          lab_total_requests_mean: number | null;
          lab_total_requests_min: number | null;
          lab_total_transfersize_max: number | null;
          lab_total_transfersize_mean: number | null;
          lab_total_transfersize_min: number | null;
          lab_ttfb_max: number | null;
          lab_ttfb_mean: number | null;
          lab_ttfb_min: number | null;
          lcp_data: Json | null;
          lcp_element_size_max: number | null;
          lcp_element_size_mean: number | null;
          lcp_element_size_min: number | null;
          lcp_timing: Json | null;
          page_address: string;
          page_filmstrip: string | null;
          page_screenshot: string | null;
          pageload_timing: Json | null;
          pageweight: number | null;
          performance_score_max: number | null;
          performance_score_mean: number | null;
          performance_score_min: number | null;
          record_id: string;
          third_party_content_size_max: number | null;
          third_party_content_size_mean: number | null;
          third_party_content_size_min: number | null;
          third_party_req_max: number | null;
          third_party_req_mean: number | null;
          third_party_req_min: number | null;
          third_party_transfer_size_max: number | null;
          third_party_transfer_size_mean: number | null;
          third_party_transfer_size_min: number | null;
          useragent: string | null;
          windowsize: string | null;
        };
        Insert: {
          blocking_scripts?: Json | null;
          browser?: string | null;
          browser_version?: string | null;
          cls_data?: Json | null;
          created_at: string;
          crux_cls_avg?: number | null;
          crux_cls_good?: number | null;
          crux_cls_p75?: number | null;
          crux_cls_poor?: number | null;
          crux_fcp_avg?: number | null;
          crux_fcp_good?: number | null;
          crux_fcp_p75?: number | null;
          crux_fcp_poor?: number | null;
          crux_inp_avg?: number | null;
          crux_inp_good?: number | null;
          crux_inp_p75?: number | null;
          crux_inp_poor?: number | null;
          crux_lcp_avg?: number | null;
          crux_lcp_good?: number | null;
          crux_lcp_p75?: number | null;
          crux_lcp_poor?: number | null;
          crux_ttfb_avg?: number | null;
          crux_ttfb_good?: number | null;
          crux_ttfb_p75?: number | null;
          crux_ttfb_poor?: number | null;
          device_type: string;
          document_decodedbody_size?: number | null;
          document_encodedbody_size?: number | null;
          document_timing?: Json | null;
          document_transfersize?: number | null;
          documenttitle?: string | null;
          dom_complete_max?: number | null;
          dom_complete_mean?: number | null;
          dom_complete_min?: number | null;
          dom_elements_max?: number | null;
          dom_elements_mean?: number | null;
          dom_elements_min?: number | null;
          dom_interactive_max?: number | null;
          dom_interactive_mean?: number | null;
          dom_interactive_min?: number | null;
          domain?: string | null;
          domains?: Json | null;
          inp_latency_max?: number | null;
          inp_latency_mean?: number | null;
          inp_latency_min?: number | null;
          lab_cls_max?: number | null;
          lab_cls_mean?: number | null;
          lab_cls_min?: number | null;
          lab_contentsize?: number | null;
          lab_css_contentsize_max?: number | null;
          lab_css_contentsize_mean?: number | null;
          lab_css_contentsize_min?: number | null;
          lab_css_request_count_max?: number | null;
          lab_css_request_count_mean?: number | null;
          lab_css_request_count_min?: number | null;
          lab_css_transfersize_max?: number | null;
          lab_css_transfersize_mean?: number | null;
          lab_css_transfersize_min?: number | null;
          lab_domain_lookup?: number | null;
          lab_error_max?: number | null;
          lab_error_mean?: number | null;
          lab_error_min?: number | null;
          lab_fcp_max?: number | null;
          lab_fcp_mean?: number | null;
          lab_fcp_min?: number | null;
          lab_fid_max?: number | null;
          lab_fid_mean?: number | null;
          lab_fid_min?: number | null;
          lab_firstmeaningfulpaint_max?: number | null;
          lab_firstmeaningfulpaint_mean?: number | null;
          lab_firstmeaningfulpaint_min?: number | null;
          lab_font_contentsize_max?: number | null;
          lab_font_contentsize_mean?: number | null;
          lab_font_contentsize_min?: number | null;
          lab_font_request_count_max?: number | null;
          lab_font_request_count_mean?: number | null;
          lab_font_request_count_min?: number | null;
          lab_font_transfersize_max?: number | null;
          lab_font_transfersize_mean?: number | null;
          lab_font_transfersize_min?: number | null;
          lab_fullyloaded_max?: number | null;
          lab_fullyloaded_mean?: number | null;
          lab_fullyloaded_min?: number | null;
          lab_html_contentsize_max?: number | null;
          lab_html_contentsize_mean?: number | null;
          lab_html_contentsize_min?: number | null;
          lab_html_request_count_max?: number | null;
          lab_html_request_count_mean?: number | null;
          lab_html_request_count_min?: number | null;
          lab_html_transfersize_max?: number | null;
          lab_html_transfersize_mean?: number | null;
          lab_html_transfersize_min?: number | null;
          lab_image_contentsize_max?: number | null;
          lab_image_contentsize_mean?: number | null;
          lab_image_contentsize_min?: number | null;
          lab_image_request_count_max?: number | null;
          lab_image_request_count_mean?: number | null;
          lab_image_request_count_min?: number | null;
          lab_image_transfersize_max?: number | null;
          lab_image_transfersize_mean?: number | null;
          lab_image_transfersize_min?: number | null;
          lab_js_contentsize_max?: number | null;
          lab_js_contentsize_mean?: number | null;
          lab_js_contentsize_min?: number | null;
          lab_js_request_count_max?: number | null;
          lab_js_request_count_mean?: number | null;
          lab_js_request_count_min?: number | null;
          lab_js_transfersize_max?: number | null;
          lab_js_transfersize_mean?: number | null;
          lab_js_transfersize_min?: number | null;
          lab_json_contentsize_max?: number | null;
          lab_json_contentsize_mean?: number | null;
          lab_json_contentsize_min?: number | null;
          lab_json_request_count_max?: number | null;
          lab_json_request_count_mean?: number | null;
          lab_json_request_count_min?: number | null;
          lab_json_transfersize_max?: number | null;
          lab_json_transfersize_mean?: number | null;
          lab_json_transfersize_min?: number | null;
          lab_lcp_max?: number | null;
          lab_lcp_mean?: number | null;
          lab_lcp_min?: number | null;
          lab_speed_index_max?: number | null;
          lab_speed_index_mean?: number | null;
          lab_speed_index_min?: number | null;
          lab_srt_max?: number | null;
          lab_srt_mean?: number | null;
          lab_srt_min?: number | null;
          lab_svg_contentsize_max?: number | null;
          lab_svg_contentsize_mean?: number | null;
          lab_svg_contentsize_min?: number | null;
          lab_svg_request_count_max?: number | null;
          lab_svg_request_count_mean?: number | null;
          lab_svg_request_count_min?: number | null;
          lab_svg_transfersize_max?: number | null;
          lab_svg_transfersize_mean?: number | null;
          lab_svg_transfersize_min?: number | null;
          lab_tbt_max?: number | null;
          lab_tbt_mean?: number | null;
          lab_tbt_min?: number | null;
          lab_total_contentsize_max?: number | null;
          lab_total_contentsize_mean?: number | null;
          lab_total_contentsize_min?: number | null;
          lab_total_requests_max?: number | null;
          lab_total_requests_mean?: number | null;
          lab_total_requests_min?: number | null;
          lab_total_transfersize_max?: number | null;
          lab_total_transfersize_mean?: number | null;
          lab_total_transfersize_min?: number | null;
          lab_ttfb_max?: number | null;
          lab_ttfb_mean?: number | null;
          lab_ttfb_min?: number | null;
          lcp_data?: Json | null;
          lcp_element_size_max?: number | null;
          lcp_element_size_mean?: number | null;
          lcp_element_size_min?: number | null;
          lcp_timing?: Json | null;
          page_address: string;
          page_filmstrip?: string | null;
          page_screenshot?: string | null;
          pageload_timing?: Json | null;
          pageweight?: number | null;
          performance_score_max?: number | null;
          performance_score_mean?: number | null;
          performance_score_min?: number | null;
          record_id?: string;
          third_party_content_size_max?: number | null;
          third_party_content_size_mean?: number | null;
          third_party_content_size_min?: number | null;
          third_party_req_max?: number | null;
          third_party_req_mean?: number | null;
          third_party_req_min?: number | null;
          third_party_transfer_size_max?: number | null;
          third_party_transfer_size_mean?: number | null;
          third_party_transfer_size_min?: number | null;
          useragent?: string | null;
          windowsize?: string | null;
        };
        Update: {
          blocking_scripts?: Json | null;
          browser?: string | null;
          browser_version?: string | null;
          cls_data?: Json | null;
          created_at?: string;
          crux_cls_avg?: number | null;
          crux_cls_good?: number | null;
          crux_cls_p75?: number | null;
          crux_cls_poor?: number | null;
          crux_fcp_avg?: number | null;
          crux_fcp_good?: number | null;
          crux_fcp_p75?: number | null;
          crux_fcp_poor?: number | null;
          crux_inp_avg?: number | null;
          crux_inp_good?: number | null;
          crux_inp_p75?: number | null;
          crux_inp_poor?: number | null;
          crux_lcp_avg?: number | null;
          crux_lcp_good?: number | null;
          crux_lcp_p75?: number | null;
          crux_lcp_poor?: number | null;
          crux_ttfb_avg?: number | null;
          crux_ttfb_good?: number | null;
          crux_ttfb_p75?: number | null;
          crux_ttfb_poor?: number | null;
          device_type?: string;
          document_decodedbody_size?: number | null;
          document_encodedbody_size?: number | null;
          document_timing?: Json | null;
          document_transfersize?: number | null;
          documenttitle?: string | null;
          dom_complete_max?: number | null;
          dom_complete_mean?: number | null;
          dom_complete_min?: number | null;
          dom_elements_max?: number | null;
          dom_elements_mean?: number | null;
          dom_elements_min?: number | null;
          dom_interactive_max?: number | null;
          dom_interactive_mean?: number | null;
          dom_interactive_min?: number | null;
          domain?: string | null;
          domains?: Json | null;
          inp_latency_max?: number | null;
          inp_latency_mean?: number | null;
          inp_latency_min?: number | null;
          lab_cls_max?: number | null;
          lab_cls_mean?: number | null;
          lab_cls_min?: number | null;
          lab_contentsize?: number | null;
          lab_css_contentsize_max?: number | null;
          lab_css_contentsize_mean?: number | null;
          lab_css_contentsize_min?: number | null;
          lab_css_request_count_max?: number | null;
          lab_css_request_count_mean?: number | null;
          lab_css_request_count_min?: number | null;
          lab_css_transfersize_max?: number | null;
          lab_css_transfersize_mean?: number | null;
          lab_css_transfersize_min?: number | null;
          lab_domain_lookup?: number | null;
          lab_error_max?: number | null;
          lab_error_mean?: number | null;
          lab_error_min?: number | null;
          lab_fcp_max?: number | null;
          lab_fcp_mean?: number | null;
          lab_fcp_min?: number | null;
          lab_fid_max?: number | null;
          lab_fid_mean?: number | null;
          lab_fid_min?: number | null;
          lab_firstmeaningfulpaint_max?: number | null;
          lab_firstmeaningfulpaint_mean?: number | null;
          lab_firstmeaningfulpaint_min?: number | null;
          lab_font_contentsize_max?: number | null;
          lab_font_contentsize_mean?: number | null;
          lab_font_contentsize_min?: number | null;
          lab_font_request_count_max?: number | null;
          lab_font_request_count_mean?: number | null;
          lab_font_request_count_min?: number | null;
          lab_font_transfersize_max?: number | null;
          lab_font_transfersize_mean?: number | null;
          lab_font_transfersize_min?: number | null;
          lab_fullyloaded_max?: number | null;
          lab_fullyloaded_mean?: number | null;
          lab_fullyloaded_min?: number | null;
          lab_html_contentsize_max?: number | null;
          lab_html_contentsize_mean?: number | null;
          lab_html_contentsize_min?: number | null;
          lab_html_request_count_max?: number | null;
          lab_html_request_count_mean?: number | null;
          lab_html_request_count_min?: number | null;
          lab_html_transfersize_max?: number | null;
          lab_html_transfersize_mean?: number | null;
          lab_html_transfersize_min?: number | null;
          lab_image_contentsize_max?: number | null;
          lab_image_contentsize_mean?: number | null;
          lab_image_contentsize_min?: number | null;
          lab_image_request_count_max?: number | null;
          lab_image_request_count_mean?: number | null;
          lab_image_request_count_min?: number | null;
          lab_image_transfersize_max?: number | null;
          lab_image_transfersize_mean?: number | null;
          lab_image_transfersize_min?: number | null;
          lab_js_contentsize_max?: number | null;
          lab_js_contentsize_mean?: number | null;
          lab_js_contentsize_min?: number | null;
          lab_js_request_count_max?: number | null;
          lab_js_request_count_mean?: number | null;
          lab_js_request_count_min?: number | null;
          lab_js_transfersize_max?: number | null;
          lab_js_transfersize_mean?: number | null;
          lab_js_transfersize_min?: number | null;
          lab_json_contentsize_max?: number | null;
          lab_json_contentsize_mean?: number | null;
          lab_json_contentsize_min?: number | null;
          lab_json_request_count_max?: number | null;
          lab_json_request_count_mean?: number | null;
          lab_json_request_count_min?: number | null;
          lab_json_transfersize_max?: number | null;
          lab_json_transfersize_mean?: number | null;
          lab_json_transfersize_min?: number | null;
          lab_lcp_max?: number | null;
          lab_lcp_mean?: number | null;
          lab_lcp_min?: number | null;
          lab_speed_index_max?: number | null;
          lab_speed_index_mean?: number | null;
          lab_speed_index_min?: number | null;
          lab_srt_max?: number | null;
          lab_srt_mean?: number | null;
          lab_srt_min?: number | null;
          lab_svg_contentsize_max?: number | null;
          lab_svg_contentsize_mean?: number | null;
          lab_svg_contentsize_min?: number | null;
          lab_svg_request_count_max?: number | null;
          lab_svg_request_count_mean?: number | null;
          lab_svg_request_count_min?: number | null;
          lab_svg_transfersize_max?: number | null;
          lab_svg_transfersize_mean?: number | null;
          lab_svg_transfersize_min?: number | null;
          lab_tbt_max?: number | null;
          lab_tbt_mean?: number | null;
          lab_tbt_min?: number | null;
          lab_total_contentsize_max?: number | null;
          lab_total_contentsize_mean?: number | null;
          lab_total_contentsize_min?: number | null;
          lab_total_requests_max?: number | null;
          lab_total_requests_mean?: number | null;
          lab_total_requests_min?: number | null;
          lab_total_transfersize_max?: number | null;
          lab_total_transfersize_mean?: number | null;
          lab_total_transfersize_min?: number | null;
          lab_ttfb_max?: number | null;
          lab_ttfb_mean?: number | null;
          lab_ttfb_min?: number | null;
          lcp_data?: Json | null;
          lcp_element_size_max?: number | null;
          lcp_element_size_mean?: number | null;
          lcp_element_size_min?: number | null;
          lcp_timing?: Json | null;
          page_address?: string;
          page_filmstrip?: string | null;
          page_screenshot?: string | null;
          pageload_timing?: Json | null;
          pageweight?: number | null;
          performance_score_max?: number | null;
          performance_score_mean?: number | null;
          performance_score_min?: number | null;
          record_id?: string;
          third_party_content_size_max?: number | null;
          third_party_content_size_mean?: number | null;
          third_party_content_size_min?: number | null;
          third_party_req_max?: number | null;
          third_party_req_mean?: number | null;
          third_party_req_min?: number | null;
          third_party_transfer_size_max?: number | null;
          third_party_transfer_size_mean?: number | null;
          third_party_transfer_size_min?: number | null;
          useragent?: string | null;
          windowsize?: string | null;
        };
        Relationships: [];
      };
      plan_metadata: {
        Row: {
          default_billing_interval: string | null;
          degradation_policy: string;
          plan: string;
          price: number;
          usage_limit: number;
        };
        Insert: {
          default_billing_interval?: string | null;
          degradation_policy?: string;
          plan: string;
          price?: number;
          usage_limit: number;
        };
        Update: {
          default_billing_interval?: string | null;
          degradation_policy?: string;
          plan?: string;
          price?: number;
          usage_limit?: number;
        };
        Relationships: [];
      };
      rum_history_new: {
        Row: {
          cls: Json;
          created_at: string;
          day: string;
          domain_name: string;
          fcp: Json;
          inp: Json;
          lcp: Json;
          ttfb: Json;
        };
        Insert: {
          cls?: Json;
          created_at?: string;
          day: string;
          domain_name: string;
          fcp?: Json;
          inp?: Json;
          lcp?: Json;
          ttfb?: Json;
        };
        Update: {
          cls?: Json;
          created_at?: string;
          day?: string;
          domain_name?: string;
          fcp?: Json;
          inp?: Json;
          lcp?: Json;
          ttfb?: Json;
        };
        Relationships: [];
      };
      rum_metrics: {
        Row: {
          created_at: string | null;
          current_page: string | null;
          domain_name: string | null;
          events: Json | null;
          id: number;
          previous_page: string | null;
          session_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          current_page?: string | null;
          domain_name?: string | null;
          events?: Json | null;
          id?: number;
          previous_page?: string | null;
          session_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          current_page?: string | null;
          domain_name?: string | null;
          events?: Json | null;
          id?: number;
          previous_page?: string | null;
          session_id?: string | null;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          billing_interval: string | null;
          created_at: string | null;
          current_usage: number;
          period_ends_at: string | null;
          period_starts_at: string | null;
          plan: string;
          quantity: number;
          status: string;
          stripe_customer_id: string | null;
          stripe_session_id: string | null;
          stripe_subscription_id: string | null;
          stripe_subscription_status: string | null;
          trial_ends_at: string | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          billing_interval?: string | null;
          created_at?: string | null;
          current_usage?: number;
          period_ends_at?: string | null;
          period_starts_at?: string | null;
          plan?: string;
          quantity?: number;
          status?: string;
          stripe_customer_id?: string | null;
          stripe_session_id?: string | null;
          stripe_subscription_id?: string | null;
          stripe_subscription_status?: string | null;
          trial_ends_at?: string | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          billing_interval?: string | null;
          created_at?: string | null;
          current_usage?: number;
          period_ends_at?: string | null;
          period_starts_at?: string | null;
          plan?: string;
          quantity?: number;
          status?: string;
          stripe_customer_id?: string | null;
          stripe_session_id?: string | null;
          stripe_subscription_id?: string | null;
          stripe_subscription_status?: string | null;
          trial_ends_at?: string | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_fkey";
            columns: ["plan"];
            isOneToOne: false;
            referencedRelation: "plan_metadata";
            referencedColumns: ["plan"];
          },
        ];
      };
      user_happiness_by_geo: {
        Row: {
          cls_average_percentage: number | null;
          cls_good_percentage: number | null;
          cls_poor_percentage: number | null;
          country: string;
          device_type: string;
          domain_name: string;
          fcp_average_percentage: number | null;
          fcp_good_percentage: number | null;
          fcp_poor_percentage: number | null;
          id: number;
          inp_average_percentage: number | null;
          inp_good_percentage: number | null;
          inp_poor_percentage: number | null;
          lcp_average_percentage: number | null;
          lcp_good_percentage: number | null;
          lcp_poor_percentage: number | null;
          total_measurements: number;
          ttfb_average_percentage: number | null;
          ttfb_good_percentage: number | null;
          ttfb_poor_percentage: number | null;
        };
        Insert: {
          cls_average_percentage?: number | null;
          cls_good_percentage?: number | null;
          cls_poor_percentage?: number | null;
          country: string;
          device_type: string;
          domain_name: string;
          fcp_average_percentage?: number | null;
          fcp_good_percentage?: number | null;
          fcp_poor_percentage?: number | null;
          id?: number;
          inp_average_percentage?: number | null;
          inp_good_percentage?: number | null;
          inp_poor_percentage?: number | null;
          lcp_average_percentage?: number | null;
          lcp_good_percentage?: number | null;
          lcp_poor_percentage?: number | null;
          total_measurements: number;
          ttfb_average_percentage?: number | null;
          ttfb_good_percentage?: number | null;
          ttfb_poor_percentage?: number | null;
        };
        Update: {
          cls_average_percentage?: number | null;
          cls_good_percentage?: number | null;
          cls_poor_percentage?: number | null;
          country?: string;
          device_type?: string;
          domain_name?: string;
          fcp_average_percentage?: number | null;
          fcp_good_percentage?: number | null;
          fcp_poor_percentage?: number | null;
          id?: number;
          inp_average_percentage?: number | null;
          inp_good_percentage?: number | null;
          inp_poor_percentage?: number | null;
          lcp_average_percentage?: number | null;
          lcp_good_percentage?: number | null;
          lcp_poor_percentage?: number | null;
          total_measurements?: number;
          ttfb_average_percentage?: number | null;
          ttfb_good_percentage?: number | null;
          ttfb_poor_percentage?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "user_happiness_by_geo_domain_name_fkey";
            columns: ["domain_name"];
            isOneToOne: false;
            referencedRelation: "cloudflare_kv_tracking";
            referencedColumns: ["website_name"];
          },
          {
            foreignKeyName: "user_happiness_by_geo_domain_name_fkey";
            columns: ["domain_name"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["website_name"];
          },
        ];
      };
    };
    Views: {
      cloudflare_kv_tracking: {
        Row: {
          created_at: string | null;
          current_usage: number | null;
          default_billing_interval: string | null;
          degradation_policy: string | null;
          order_id: string | null;
          period_ends_at: string | null;
          period_starts_at: string | null;
          plan: string | null;
          price: number | null;
          quantity: number | null;
          status: string | null;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          updated_at: string | null;
          usage_limit: number | null;
          user_id: string | null;
          website_name: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_fkey";
            columns: ["plan"];
            isOneToOne: false;
            referencedRelation: "plan_metadata";
            referencedColumns: ["plan"];
          },
        ];
      };
      subscription_with_limit: {
        Row: {
          active_sites: number | null;
          computed_usage_limit: number | null;
          created_at: string | null;
          current_usage: number | null;
          degradation_policy: string | null;
          period_ends_at: string | null;
          period_starts_at: string | null;
          plan: string | null;
          quantity: number | null;
          status: string | null;
          trial_ends_at: string | null;
          updated_at: string | null;
          usage_limit: number | null;
          user_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_fkey";
            columns: ["plan"];
            isOneToOne: false;
            referencedRelation: "plan_metadata";
            referencedColumns: ["plan"];
          },
        ];
      };
    };
    Functions: {
      aggregate_daily_web_metrics: {
        Args: { target_date: string };
        Returns: undefined;
      };
      aggregate_web_metrics_for_date_range: {
        Args: { end_date: string; start_date: string };
        Returns: undefined;
      };
      aggregate_web_metrics_for_today: { Args: never; Returns: undefined };
      analyze_domain_performance: {
        Args: { end_date?: string; start_date?: string; target_domain: string };
        Returns: {
          cls_p75: number;
          cls_status: string;
          cwv_failure_score: number;
          device_type: string;
          domain: string;
          fcp_p75: number;
          inp_p75: number;
          inp_status: string;
          lcp_p75: number;
          lcp_status: string;
          measurement_count: number;
          measurement_date: string;
          metrics_available: number;
          normalized_score: number;
          overall_cwv_pass_rate: number;
          page_address: string;
          page_rank: number;
          page_size_mb: number;
          pct_css_content: number;
          pct_image_content: number;
          pct_js_content: number;
          pct_passing_cls: number;
          pct_passing_inp: number;
          pct_passing_lcp: number;
          pct_passing_ttfb: number;
          pct_third_party_content: number;
          pct_third_party_requests: number;
          performance_impact: number;
          performance_rank: number;
          performance_score: number;
          request_count: number;
          result_type: string;
          ttfb_p75: number;
          unique_pages: number;
        }[];
      };
      analyze_fcp_by_device: {
        Args: { domain_filter?: string; time_range?: string };
        Returns: {
          avg_fcp_value: number;
          connection_type: string;
          device_type: string;
          good_count: number;
          max_fcp_value: number;
          min_fcp_value: number;
          needs_improvement_count: number;
          occurrence_count: number;
          p75_fcp_value: number;
          p90_fcp_value: number;
          p95_fcp_value: number;
          poor_count: number;
        }[];
      };
      analyze_inp_by_device: {
        Args: { domain_filter?: string; time_range?: string };
        Returns: {
          affected_element: string;
          avg_inp_value: number;
          device_type: string;
          good_count: number;
          interaction_type: string;
          max_inp_value: number;
          min_inp_value: number;
          needs_improvement_count: number;
          occurrence_count: number;
          poor_count: number;
        }[];
      };
      analyze_lcp_by_device: {
        Args: { domain_filter: string; time_range?: string };
        Returns: {
          avg_element_render_delay: number;
          avg_lcp_value: number;
          avg_resource_load_delay: number;
          avg_resource_load_duration: number;
          device_type: string;
          element_target: string;
          good_count: number;
          image_url: string;
          max_lcp_value: number;
          min_lcp_value: number;
          needs_improvement_count: number;
          occurrence_count: number;
          page_url: string;
          poor_count: number;
        }[];
      };
      analyze_web_vitals_by_page: {
        Args: { domain_filter?: string; time_range?: string };
        Returns: {
          avg_cls: number;
          avg_fcp: number;
          avg_fid: number;
          avg_inp: number;
          avg_lcp: number;
          avg_ttfb: number;
          cls_good_pct: number;
          cls_needs_improvement_pct: number;
          cls_poor_pct: number;
          device_type: string;
          fcp_good_pct: number;
          fcp_needs_improvement_pct: number;
          fcp_poor_pct: number;
          fid_good_pct: number;
          fid_needs_improvement_pct: number;
          fid_poor_pct: number;
          inp_good_pct: number;
          inp_needs_improvement_pct: number;
          inp_poor_pct: number;
          lcp_good_pct: number;
          lcp_needs_improvement_pct: number;
          lcp_poor_pct: number;
          overall_score: number;
          page_address: string;
          page_url: string;
          page_view_count: number;
          performance_category: string;
          ttfb_good_pct: number;
          ttfb_needs_improvement_pct: number;
          ttfb_poor_pct: number;
        }[];
      };
      bytea_to_text: { Args: { data: string }; Returns: string };
      daily_aggregate_usage_by_userid: {
        Args: never;
        Returns: {
          total_usage: number;
          user_id: string;
        }[];
      };
      dashboard_multimetrix: {
        Args: { date_range_days?: number; domain_name_param: string };
        Returns: {
          country_code: string;
          country_name: string;
          device_type: string;
          dom_load_avg: number;
          sample_count: number;
          speed_index: number;
          ttfb_avg: number;
        }[];
      };
      delete_old_rum_metrics: { Args: never; Returns: undefined };
      get_ai_citation: {
        Args: { p_domain_name: string };
        Returns: {
          ai_citation_possibility: string;
          avg_citation_score: number;
          avg_dom_content_loaded: number;
          avg_ttfb: number;
          device_type: string;
          domain: string;
          max_citation_score: number;
          min_citation_score: number;
          std_dev_citation_score: number;
          total_sessions: number;
        }[];
      };
      get_analytics_by_device_and_country: {
        Args: { p_domain_name: string; p_time_range?: string };
        Returns: {
          avg_pages_per_session: number;
          bounce_rate_percentage: number;
          country: string;
          device_type: string;
          total_page_views: number;
          total_sessions: number;
          unique_languages: number;
          unique_visitors: number;
        }[];
      };
      get_daily_web_metrics: { Args: { target_date: string }; Returns: Json[] };
      get_filtered_rum_metrics: {
        Args: {
          p_date_range: string;
          p_device_type?: string;
          p_domain_name: string;
          p_end_date?: string;
          p_top_countries_limit?: number;
        };
        Returns: {
          result_data: Json;
          result_type: string;
        }[];
      };
      get_lcp_image_metrics: {
        Args: { p_domain_name?: string; p_time_range?: string };
        Returns: {
          avg_decoded_body_size: number;
          avg_element_render_delay: number;
          avg_height: number;
          avg_lcp_ms: number;
          avg_resource_load_delay: number;
          avg_resource_load_duration: number;
          avg_time_to_first_byte: number;
          avg_transfer_size: number;
          avg_width: number;
          device_type: string;
          domain_name: string;
          image_url: string;
          max_lcp_ms: number;
          min_lcp_ms: number;
          occurrence_count: number;
          p75_lcp_ms: number;
          pct_exceeding_cwv: number;
          pct_lazy: number;
          period: string;
        }[];
      };
      get_rum_history: {
        Args: { p_domain: string; p_from: string; p_to: string };
        Returns: {
          cls: Json;
          day: string;
          fcp: Json;
          inp: Json;
          lcp: Json;
          ttfb: Json;
        }[];
      };
      get_rum_web_vitals_metrics: {
        Args: { p_date_range?: string; p_domain_name: string };
        Returns: {
          cls_avg: number;
          cls_max: number;
          cls_min: number;
          cls_p50: number;
          cls_p75: number;
          cls_p90: number;
          cls_p95: number;
          cls_p99: number;
          cls_samples: number;
          device_category: string;
          fcp_avg: number;
          fcp_max: number;
          fcp_min: number;
          fcp_p50: number;
          fcp_p75: number;
          fcp_p90: number;
          fcp_p95: number;
          fcp_p99: number;
          fcp_samples: number;
          inp_avg: number;
          inp_max: number;
          inp_min: number;
          inp_p50: number;
          inp_p75: number;
          inp_p90: number;
          inp_p95: number;
          inp_p99: number;
          inp_samples: number;
          lcp_avg: number;
          lcp_max: number;
          lcp_min: number;
          lcp_p50: number;
          lcp_p75: number;
          lcp_p90: number;
          lcp_p95: number;
          lcp_p99: number;
          lcp_samples: number;
          report_date: string;
          ttfb_avg: number;
          ttfb_max: number;
          ttfb_min: number;
          ttfb_p50: number;
          ttfb_p75: number;
          ttfb_p90: number;
          ttfb_p95: number;
          ttfb_p99: number;
          ttfb_samples: number;
        }[];
      };
      get_web_vitals_metrics:
        | {
            Args: { p_domain: string };
            Returns: {
              avg_value: number;
              device_type: string;
              domain_name: string;
              good_percent: number;
              max_value: number;
              metric_name: string;
              min_value: number;
              needs_improvement_percent: number;
              p50: number;
              p75: number;
              p90: number;
              p95: number;
              p99: number;
              page: string;
              poor_percent: number;
              sample_count: number;
            }[];
          }
        | {
            Args: { p_date_range?: string; p_domain: string };
            Returns: {
              avg_value: number;
              device_type: string;
              domain_name: string;
              good_percent: number;
              max_value: number;
              metric_name: string;
              min_value: number;
              needs_improvement_percent: number;
              p50: number;
              p75: number;
              p90: number;
              p95: number;
              p99: number;
              page: string;
              poor_percent: number;
              sample_count: number;
            }[];
          };
      get_yesterday_usage_counts: {
        Args: never;
        Returns: {
          domain_name: string;
          usage_count: number;
        }[];
      };
      http: {
        Args: { request: Database["public"]["CompositeTypes"]["http_request"] };
        Returns: Database["public"]["CompositeTypes"]["http_response"];
        SetofOptions: {
          from: "http_request";
          to: "http_response";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      http_delete:
        | {
            Args: { uri: string };
            Returns: Database["public"]["CompositeTypes"]["http_response"];
            SetofOptions: {
              from: "*";
              to: "http_response";
              isOneToOne: true;
              isSetofReturn: false;
            };
          }
        | {
            Args: { content: string; content_type: string; uri: string };
            Returns: Database["public"]["CompositeTypes"]["http_response"];
            SetofOptions: {
              from: "*";
              to: "http_response";
              isOneToOne: true;
              isSetofReturn: false;
            };
          };
      http_get:
        | {
            Args: { uri: string };
            Returns: Database["public"]["CompositeTypes"]["http_response"];
            SetofOptions: {
              from: "*";
              to: "http_response";
              isOneToOne: true;
              isSetofReturn: false;
            };
          }
        | {
            Args: { data: Json; uri: string };
            Returns: Database["public"]["CompositeTypes"]["http_response"];
            SetofOptions: {
              from: "*";
              to: "http_response";
              isOneToOne: true;
              isSetofReturn: false;
            };
          };
      http_head: {
        Args: { uri: string };
        Returns: Database["public"]["CompositeTypes"]["http_response"];
        SetofOptions: {
          from: "*";
          to: "http_response";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      http_header: {
        Args: { field: string; value: string };
        Returns: Database["public"]["CompositeTypes"]["http_header"];
        SetofOptions: {
          from: "*";
          to: "http_header";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      http_list_curlopt: {
        Args: never;
        Returns: {
          curlopt: string;
          value: string;
        }[];
      };
      http_patch: {
        Args: { content: string; content_type: string; uri: string };
        Returns: Database["public"]["CompositeTypes"]["http_response"];
        SetofOptions: {
          from: "*";
          to: "http_response";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      http_post:
        | {
            Args: { content: string; content_type: string; uri: string };
            Returns: Database["public"]["CompositeTypes"]["http_response"];
            SetofOptions: {
              from: "*";
              to: "http_response";
              isOneToOne: true;
              isSetofReturn: false;
            };
          }
        | {
            Args: { data: Json; uri: string };
            Returns: Database["public"]["CompositeTypes"]["http_response"];
            SetofOptions: {
              from: "*";
              to: "http_response";
              isOneToOne: true;
              isSetofReturn: false;
            };
          };
      http_put: {
        Args: { content: string; content_type: string; uri: string };
        Returns: Database["public"]["CompositeTypes"]["http_response"];
        SetofOptions: {
          from: "*";
          to: "http_response";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      http_reset_curlopt: { Args: never; Returns: boolean };
      http_set_curlopt: {
        Args: { curlopt: string; value: string };
        Returns: boolean;
      };
      lcp_attribution_by_device: {
        Args: {
          p_domain?: string;
          p_from?: string;
          p_min_lcp?: number;
          p_path_like?: string;
          p_to?: string;
        };
        Returns: {
          avg_lcp: number;
          decodedbodysize: number;
          device_type: string;
          elementrenderdelay: number;
          height: number;
          islazy: boolean;
          lcp_type: string;
          max_lcp: number;
          occurrences: number;
          resourceloaddelay: number;
          resourceloadduration: number;
          target: string;
          target_url: string;
          transfersize: number;
          ttfb: number;
          url: string;
          width: number;
        }[];
      };
      page_performance_analysis: {
        Args: { p_domain?: string; p_hours?: number };
        Returns: {
          avg_cls: number;
          avg_fcp_ms: number;
          avg_inp_ms: number;
          avg_lcp_ms: number;
          avg_ttfb_ms: number;
          cls_targets: Json;
          current_page: string;
          device_type: string;
          inp_targets: Json;
          lcp_targets: Json;
          performance_group: string;
          visit_count: number;
        }[];
      };
      process_web_vitals_date_range: {
        Args: { end_date?: string; start_date: string };
        Returns: {
          process_date: string;
          rows_inserted: number;
        }[];
      };
      rum_cls: {
        Args: { p_domain_name: string; p_from: string; p_to: string };
        Returns: {
          cls_timestamp: number;
          cls_value: number;
          current_page: string;
          device_type: string;
          largest_shift_target: string;
        }[];
      };
      text_to_bytea: { Args: { data: string }; Returns: string };
      third_party_domains: {
        Args: { site_filter?: string; time_range?: string };
        Returns: {
          device_type: string;
          site_domain: string;
          top_domains: Json;
        }[];
      };
      top_landing_page: {
        Args: { p_date_range: string; p_domain_name: string };
        Returns: {
          current_page: string;
          hits: number;
          previous_page: string;
        }[];
      };
      traffic_source: {
        Args: never;
        Returns: {
          count: number;
          day: string;
          device_type: string;
          domain: string;
          referral_domain: string;
        }[];
      };
      ttfb_contributors: {
        Args: { p_date_from: string; p_date_to: string; p_domain: string };
        Returns: {
          browser: string;
          city: string;
          country: string;
          device_type: string;
          downlink: number;
          isp: string;
          network_type: string;
          os: string;
          page_path: string;
          region: string;
          rtt: number;
          timezone: string;
          ttfb_dns_lookup: number;
          ttfb_ms: number;
          ttfb_request_start: number;
          ttfb_response_start: number;
          ttfb_tcp_connection: number;
        }[];
      };
      urlencode:
        | { Args: { data: Json }; Returns: string }
        | {
            Args: { string: string };
            Returns: {
              error: true;
            } & "Could not choose the best candidate function between: public.urlencode(string => bytea), public.urlencode(string => varchar). Try renaming the parameters or the function itself in the database so function overloading can be resolved";
          }
        | {
            Args: { string: string };
            Returns: {
              error: true;
            } & "Could not choose the best candidate function between: public.urlencode(string => bytea), public.urlencode(string => varchar). Try renaming the parameters or the function itself in the database so function overloading can be resolved";
          };
      user_happiness: {
        Args: { p_date_range?: string; p_domain?: string };
        Returns: {
          avg_cls: number;
          avg_fcp: number;
          avg_inp: number;
          avg_lcp: number;
          avg_long_tasks: number;
          avg_performance_score: number;
          avg_slow_api_calls: number;
          avg_trackers: number;
          avg_ttfb: number;
          country_count: number;
          device_type: string;
          experience_quality: string;
          percentage_in_device_type: number;
          session_count: number;
        }[];
      };
      user_happiness_dist:
        | {
            Args: {
              domain_filter?: string;
              end_date?: string;
              start_date?: string;
            };
            Returns: {
              cls_average_percentage: number;
              cls_good_percentage: number;
              cls_poor_percentage: number;
              collection_date: string;
              country: string;
              device_type: string;
              domain_name: string;
              fcp_average_percentage: number;
              fcp_good_percentage: number;
              fcp_poor_percentage: number;
              inp_average_percentage: number;
              inp_good_percentage: number;
              inp_poor_percentage: number;
              lcp_average_percentage: number;
              lcp_good_percentage: number;
              lcp_poor_percentage: number;
              total_measurements: number;
              ttfb_average_percentage: number;
              ttfb_good_percentage: number;
              ttfb_poor_percentage: number;
            }[];
          }
        | {
            Args: { domain_filter?: string; target_date?: string };
            Returns: {
              cls_average_percentage: number;
              cls_good_percentage: number;
              cls_poor_percentage: number;
              country: string;
              device_type: string;
              domain_name: string;
              fcp_average_percentage: number;
              fcp_good_percentage: number;
              fcp_poor_percentage: number;
              inp_average_percentage: number;
              inp_good_percentage: number;
              inp_poor_percentage: number;
              lcp_average_percentage: number;
              lcp_good_percentage: number;
              lcp_poor_percentage: number;
              total_measurements: number;
              ttfb_average_percentage: number;
              ttfb_good_percentage: number;
              ttfb_poor_percentage: number;
            }[];
          };
      web_vitals: {
        Args: { p_domain_name: string; p_time_range: string };
        Returns: {
          avg_pages_per_session: number;
          bounce_rate_percentage: number;
          country: string;
          device_type: string;
          total_page_views: number;
          total_sessions: number;
          unique_languages: number;
          unique_visitors: number;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      http_header: {
        field: string | null;
        value: string | null;
      };
      http_request: {
        method: unknown;
        uri: string | null;
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null;
        content_type: string | null;
        content: string | null;
      };
      http_response: {
        status: number | null;
        content_type: string | null;
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null;
        content: string | null;
      };
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
