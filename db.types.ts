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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  auth: {
    Tables: {
      audit_log_entries: {
        Row: {
          created_at: string | null
          id: string
          instance_id: string | null
          ip_address: string
          payload: Json | null
        }
        Insert: {
          created_at?: string | null
          id: string
          instance_id?: string | null
          ip_address?: string
          payload?: Json | null
        }
        Update: {
          created_at?: string | null
          id?: string
          instance_id?: string | null
          ip_address?: string
          payload?: Json | null
        }
        Relationships: []
      }
      custom_oauth_providers: {
        Row: {
          acceptable_client_ids: string[]
          attribute_mapping: Json
          authorization_params: Json
          authorization_url: string | null
          cached_discovery: Json | null
          client_id: string
          client_secret: string
          created_at: string
          custom_claims_allowlist: string[]
          discovery_cached_at: string | null
          discovery_url: string | null
          email_optional: boolean
          enabled: boolean
          id: string
          identifier: string
          issuer: string | null
          jwks_uri: string | null
          name: string
          pkce_enabled: boolean
          provider_type: string
          scopes: string[]
          skip_nonce_check: boolean
          token_url: string | null
          updated_at: string
          userinfo_url: string | null
        }
        Insert: {
          acceptable_client_ids?: string[]
          attribute_mapping?: Json
          authorization_params?: Json
          authorization_url?: string | null
          cached_discovery?: Json | null
          client_id: string
          client_secret: string
          created_at?: string
          custom_claims_allowlist?: string[]
          discovery_cached_at?: string | null
          discovery_url?: string | null
          email_optional?: boolean
          enabled?: boolean
          id?: string
          identifier: string
          issuer?: string | null
          jwks_uri?: string | null
          name: string
          pkce_enabled?: boolean
          provider_type: string
          scopes?: string[]
          skip_nonce_check?: boolean
          token_url?: string | null
          updated_at?: string
          userinfo_url?: string | null
        }
        Update: {
          acceptable_client_ids?: string[]
          attribute_mapping?: Json
          authorization_params?: Json
          authorization_url?: string | null
          cached_discovery?: Json | null
          client_id?: string
          client_secret?: string
          created_at?: string
          custom_claims_allowlist?: string[]
          discovery_cached_at?: string | null
          discovery_url?: string | null
          email_optional?: boolean
          enabled?: boolean
          id?: string
          identifier?: string
          issuer?: string | null
          jwks_uri?: string | null
          name?: string
          pkce_enabled?: boolean
          provider_type?: string
          scopes?: string[]
          skip_nonce_check?: boolean
          token_url?: string | null
          updated_at?: string
          userinfo_url?: string | null
        }
        Relationships: []
      }
      flow_state: {
        Row: {
          auth_code: string | null
          auth_code_issued_at: string | null
          authentication_method: string
          code_challenge: string | null
          code_challenge_method:
            | Database["auth"]["Enums"]["code_challenge_method"]
            | null
          created_at: string | null
          email_optional: boolean
          id: string
          invite_token: string | null
          linking_target_id: string | null
          oauth_client_state_id: string | null
          provider_access_token: string | null
          provider_refresh_token: string | null
          provider_type: string
          referrer: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          auth_code?: string | null
          auth_code_issued_at?: string | null
          authentication_method: string
          code_challenge?: string | null
          code_challenge_method?:
            | Database["auth"]["Enums"]["code_challenge_method"]
            | null
          created_at?: string | null
          email_optional?: boolean
          id: string
          invite_token?: string | null
          linking_target_id?: string | null
          oauth_client_state_id?: string | null
          provider_access_token?: string | null
          provider_refresh_token?: string | null
          provider_type: string
          referrer?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          auth_code?: string | null
          auth_code_issued_at?: string | null
          authentication_method?: string
          code_challenge?: string | null
          code_challenge_method?:
            | Database["auth"]["Enums"]["code_challenge_method"]
            | null
          created_at?: string | null
          email_optional?: boolean
          id?: string
          invite_token?: string | null
          linking_target_id?: string | null
          oauth_client_state_id?: string | null
          provider_access_token?: string | null
          provider_refresh_token?: string | null
          provider_type?: string
          referrer?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      identities: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          identity_data: Json
          last_sign_in_at: string | null
          provider: string
          provider_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          identity_data: Json
          last_sign_in_at?: string | null
          provider: string
          provider_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          identity_data?: Json
          last_sign_in_at?: string | null
          provider?: string
          provider_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "identities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      instances: {
        Row: {
          created_at: string | null
          id: string
          raw_base_config: string | null
          updated_at: string | null
          uuid: string | null
        }
        Insert: {
          created_at?: string | null
          id: string
          raw_base_config?: string | null
          updated_at?: string | null
          uuid?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          raw_base_config?: string | null
          updated_at?: string | null
          uuid?: string | null
        }
        Relationships: []
      }
      mfa_amr_claims: {
        Row: {
          authentication_method: string
          created_at: string
          id: string
          session_id: string
          updated_at: string
        }
        Insert: {
          authentication_method: string
          created_at: string
          id: string
          session_id: string
          updated_at: string
        }
        Update: {
          authentication_method?: string
          created_at?: string
          id?: string
          session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mfa_amr_claims_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      mfa_challenges: {
        Row: {
          created_at: string
          factor_id: string
          id: string
          ip_address: unknown
          otp_code: string | null
          verified_at: string | null
          web_authn_session_data: Json | null
        }
        Insert: {
          created_at: string
          factor_id: string
          id: string
          ip_address: unknown
          otp_code?: string | null
          verified_at?: string | null
          web_authn_session_data?: Json | null
        }
        Update: {
          created_at?: string
          factor_id?: string
          id?: string
          ip_address?: unknown
          otp_code?: string | null
          verified_at?: string | null
          web_authn_session_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "mfa_challenges_auth_factor_id_fkey"
            columns: ["factor_id"]
            isOneToOne: false
            referencedRelation: "mfa_factors"
            referencedColumns: ["id"]
          },
        ]
      }
      mfa_factors: {
        Row: {
          created_at: string
          factor_type: Database["auth"]["Enums"]["factor_type"]
          friendly_name: string | null
          id: string
          last_challenged_at: string | null
          last_webauthn_challenge_data: Json | null
          phone: string | null
          secret: string | null
          status: Database["auth"]["Enums"]["factor_status"]
          updated_at: string
          user_id: string
          web_authn_aaguid: string | null
          web_authn_credential: Json | null
        }
        Insert: {
          created_at: string
          factor_type: Database["auth"]["Enums"]["factor_type"]
          friendly_name?: string | null
          id: string
          last_challenged_at?: string | null
          last_webauthn_challenge_data?: Json | null
          phone?: string | null
          secret?: string | null
          status: Database["auth"]["Enums"]["factor_status"]
          updated_at: string
          user_id: string
          web_authn_aaguid?: string | null
          web_authn_credential?: Json | null
        }
        Update: {
          created_at?: string
          factor_type?: Database["auth"]["Enums"]["factor_type"]
          friendly_name?: string | null
          id?: string
          last_challenged_at?: string | null
          last_webauthn_challenge_data?: Json | null
          phone?: string | null
          secret?: string | null
          status?: Database["auth"]["Enums"]["factor_status"]
          updated_at?: string
          user_id?: string
          web_authn_aaguid?: string | null
          web_authn_credential?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "mfa_factors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      oauth_authorizations: {
        Row: {
          approved_at: string | null
          authorization_code: string | null
          authorization_id: string
          client_id: string
          code_challenge: string | null
          code_challenge_method:
            | Database["auth"]["Enums"]["code_challenge_method"]
            | null
          created_at: string
          expires_at: string
          id: string
          nonce: string | null
          redirect_uri: string
          resource: string | null
          response_type: Database["auth"]["Enums"]["oauth_response_type"]
          scope: string
          state: string | null
          status: Database["auth"]["Enums"]["oauth_authorization_status"]
          user_id: string | null
        }
        Insert: {
          approved_at?: string | null
          authorization_code?: string | null
          authorization_id: string
          client_id: string
          code_challenge?: string | null
          code_challenge_method?:
            | Database["auth"]["Enums"]["code_challenge_method"]
            | null
          created_at?: string
          expires_at?: string
          id: string
          nonce?: string | null
          redirect_uri: string
          resource?: string | null
          response_type?: Database["auth"]["Enums"]["oauth_response_type"]
          scope: string
          state?: string | null
          status?: Database["auth"]["Enums"]["oauth_authorization_status"]
          user_id?: string | null
        }
        Update: {
          approved_at?: string | null
          authorization_code?: string | null
          authorization_id?: string
          client_id?: string
          code_challenge?: string | null
          code_challenge_method?:
            | Database["auth"]["Enums"]["code_challenge_method"]
            | null
          created_at?: string
          expires_at?: string
          id?: string
          nonce?: string | null
          redirect_uri?: string
          resource?: string | null
          response_type?: Database["auth"]["Enums"]["oauth_response_type"]
          scope?: string
          state?: string | null
          status?: Database["auth"]["Enums"]["oauth_authorization_status"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "oauth_authorizations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "oauth_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oauth_authorizations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      oauth_client_states: {
        Row: {
          code_verifier: string | null
          created_at: string
          id: string
          provider_type: string
        }
        Insert: {
          code_verifier?: string | null
          created_at: string
          id: string
          provider_type: string
        }
        Update: {
          code_verifier?: string | null
          created_at?: string
          id?: string
          provider_type?: string
        }
        Relationships: []
      }
      oauth_clients: {
        Row: {
          client_name: string | null
          client_secret_hash: string | null
          client_type: Database["auth"]["Enums"]["oauth_client_type"]
          client_uri: string | null
          created_at: string
          deleted_at: string | null
          grant_types: string
          id: string
          logo_uri: string | null
          redirect_uris: string
          registration_type: Database["auth"]["Enums"]["oauth_registration_type"]
          token_endpoint_auth_method: string
          updated_at: string
        }
        Insert: {
          client_name?: string | null
          client_secret_hash?: string | null
          client_type?: Database["auth"]["Enums"]["oauth_client_type"]
          client_uri?: string | null
          created_at?: string
          deleted_at?: string | null
          grant_types: string
          id: string
          logo_uri?: string | null
          redirect_uris: string
          registration_type: Database["auth"]["Enums"]["oauth_registration_type"]
          token_endpoint_auth_method: string
          updated_at?: string
        }
        Update: {
          client_name?: string | null
          client_secret_hash?: string | null
          client_type?: Database["auth"]["Enums"]["oauth_client_type"]
          client_uri?: string | null
          created_at?: string
          deleted_at?: string | null
          grant_types?: string
          id?: string
          logo_uri?: string | null
          redirect_uris?: string
          registration_type?: Database["auth"]["Enums"]["oauth_registration_type"]
          token_endpoint_auth_method?: string
          updated_at?: string
        }
        Relationships: []
      }
      oauth_consents: {
        Row: {
          client_id: string
          granted_at: string
          id: string
          revoked_at: string | null
          scopes: string
          user_id: string
        }
        Insert: {
          client_id: string
          granted_at?: string
          id: string
          revoked_at?: string | null
          scopes: string
          user_id: string
        }
        Update: {
          client_id?: string
          granted_at?: string
          id?: string
          revoked_at?: string | null
          scopes?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "oauth_consents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "oauth_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oauth_consents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      one_time_tokens: {
        Row: {
          created_at: string
          id: string
          relates_to: string
          token_hash: string
          token_type: Database["auth"]["Enums"]["one_time_token_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id: string
          relates_to: string
          token_hash: string
          token_type: Database["auth"]["Enums"]["one_time_token_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          relates_to?: string
          token_hash?: string
          token_type?: Database["auth"]["Enums"]["one_time_token_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "one_time_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      refresh_tokens: {
        Row: {
          created_at: string | null
          id: number
          instance_id: string | null
          parent: string | null
          revoked: boolean | null
          session_id: string | null
          token: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          instance_id?: string | null
          parent?: string | null
          revoked?: boolean | null
          session_id?: string | null
          token?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          instance_id?: string | null
          parent?: string | null
          revoked?: boolean | null
          session_id?: string | null
          token?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "refresh_tokens_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      saml_providers: {
        Row: {
          attribute_mapping: Json | null
          created_at: string | null
          entity_id: string
          id: string
          metadata_url: string | null
          metadata_xml: string
          name_id_format: string | null
          sso_provider_id: string
          updated_at: string | null
        }
        Insert: {
          attribute_mapping?: Json | null
          created_at?: string | null
          entity_id: string
          id: string
          metadata_url?: string | null
          metadata_xml: string
          name_id_format?: string | null
          sso_provider_id: string
          updated_at?: string | null
        }
        Update: {
          attribute_mapping?: Json | null
          created_at?: string | null
          entity_id?: string
          id?: string
          metadata_url?: string | null
          metadata_xml?: string
          name_id_format?: string | null
          sso_provider_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saml_providers_sso_provider_id_fkey"
            columns: ["sso_provider_id"]
            isOneToOne: false
            referencedRelation: "sso_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      saml_relay_states: {
        Row: {
          created_at: string | null
          flow_state_id: string | null
          for_email: string | null
          id: string
          redirect_to: string | null
          request_id: string
          sso_provider_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          flow_state_id?: string | null
          for_email?: string | null
          id: string
          redirect_to?: string | null
          request_id: string
          sso_provider_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          flow_state_id?: string | null
          for_email?: string | null
          id?: string
          redirect_to?: string | null
          request_id?: string
          sso_provider_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saml_relay_states_flow_state_id_fkey"
            columns: ["flow_state_id"]
            isOneToOne: false
            referencedRelation: "flow_state"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saml_relay_states_sso_provider_id_fkey"
            columns: ["sso_provider_id"]
            isOneToOne: false
            referencedRelation: "sso_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      schema_migrations: {
        Row: {
          version: string
        }
        Insert: {
          version: string
        }
        Update: {
          version?: string
        }
        Relationships: []
      }
      sessions: {
        Row: {
          aal: Database["auth"]["Enums"]["aal_level"] | null
          created_at: string | null
          factor_id: string | null
          id: string
          ip: unknown
          not_after: string | null
          oauth_client_id: string | null
          refresh_token_counter: number | null
          refresh_token_hmac_key: string | null
          refreshed_at: string | null
          scopes: string | null
          tag: string | null
          updated_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          aal?: Database["auth"]["Enums"]["aal_level"] | null
          created_at?: string | null
          factor_id?: string | null
          id: string
          ip?: unknown
          not_after?: string | null
          oauth_client_id?: string | null
          refresh_token_counter?: number | null
          refresh_token_hmac_key?: string | null
          refreshed_at?: string | null
          scopes?: string | null
          tag?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          aal?: Database["auth"]["Enums"]["aal_level"] | null
          created_at?: string | null
          factor_id?: string | null
          id?: string
          ip?: unknown
          not_after?: string | null
          oauth_client_id?: string | null
          refresh_token_counter?: number | null
          refresh_token_hmac_key?: string | null
          refreshed_at?: string | null
          scopes?: string | null
          tag?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_oauth_client_id_fkey"
            columns: ["oauth_client_id"]
            isOneToOne: false
            referencedRelation: "oauth_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sso_domains: {
        Row: {
          created_at: string | null
          domain: string
          id: string
          sso_provider_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          domain: string
          id: string
          sso_provider_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          domain?: string
          id?: string
          sso_provider_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sso_domains_sso_provider_id_fkey"
            columns: ["sso_provider_id"]
            isOneToOne: false
            referencedRelation: "sso_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      sso_providers: {
        Row: {
          created_at: string | null
          disabled: boolean | null
          id: string
          resource_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          disabled?: boolean | null
          id: string
          resource_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          disabled?: boolean | null
          id?: string
          resource_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          aud: string | null
          banned_until: string | null
          confirmation_sent_at: string | null
          confirmation_token: string | null
          confirmed_at: string | null
          created_at: string | null
          deleted_at: string | null
          email: string | null
          email_change: string | null
          email_change_confirm_status: number | null
          email_change_sent_at: string | null
          email_change_token_current: string | null
          email_change_token_new: string | null
          email_confirmed_at: string | null
          encrypted_password: string | null
          id: string
          instance_id: string | null
          invited_at: string | null
          is_anonymous: boolean
          is_sso_user: boolean
          is_super_admin: boolean | null
          last_sign_in_at: string | null
          phone: string | null
          phone_change: string | null
          phone_change_sent_at: string | null
          phone_change_token: string | null
          phone_confirmed_at: string | null
          raw_app_meta_data: Json | null
          raw_user_meta_data: Json | null
          reauthentication_sent_at: string | null
          reauthentication_token: string | null
          recovery_sent_at: string | null
          recovery_token: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          aud?: string | null
          banned_until?: string | null
          confirmation_sent_at?: string | null
          confirmation_token?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email?: string | null
          email_change?: string | null
          email_change_confirm_status?: number | null
          email_change_sent_at?: string | null
          email_change_token_current?: string | null
          email_change_token_new?: string | null
          email_confirmed_at?: string | null
          encrypted_password?: string | null
          id: string
          instance_id?: string | null
          invited_at?: string | null
          is_anonymous?: boolean
          is_sso_user?: boolean
          is_super_admin?: boolean | null
          last_sign_in_at?: string | null
          phone?: string | null
          phone_change?: string | null
          phone_change_sent_at?: string | null
          phone_change_token?: string | null
          phone_confirmed_at?: string | null
          raw_app_meta_data?: Json | null
          raw_user_meta_data?: Json | null
          reauthentication_sent_at?: string | null
          reauthentication_token?: string | null
          recovery_sent_at?: string | null
          recovery_token?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          aud?: string | null
          banned_until?: string | null
          confirmation_sent_at?: string | null
          confirmation_token?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email?: string | null
          email_change?: string | null
          email_change_confirm_status?: number | null
          email_change_sent_at?: string | null
          email_change_token_current?: string | null
          email_change_token_new?: string | null
          email_confirmed_at?: string | null
          encrypted_password?: string | null
          id?: string
          instance_id?: string | null
          invited_at?: string | null
          is_anonymous?: boolean
          is_sso_user?: boolean
          is_super_admin?: boolean | null
          last_sign_in_at?: string | null
          phone?: string | null
          phone_change?: string | null
          phone_change_sent_at?: string | null
          phone_change_token?: string | null
          phone_confirmed_at?: string | null
          raw_app_meta_data?: Json | null
          raw_user_meta_data?: Json | null
          reauthentication_sent_at?: string | null
          reauthentication_token?: string | null
          recovery_sent_at?: string | null
          recovery_token?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      webauthn_challenges: {
        Row: {
          challenge_type: string
          created_at: string
          expires_at: string
          id: string
          session_data: Json
          user_id: string | null
        }
        Insert: {
          challenge_type: string
          created_at?: string
          expires_at: string
          id?: string
          session_data: Json
          user_id?: string | null
        }
        Update: {
          challenge_type?: string
          created_at?: string
          expires_at?: string
          id?: string
          session_data?: Json
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webauthn_challenges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      webauthn_credentials: {
        Row: {
          aaguid: string | null
          attestation_type: string
          backed_up: boolean
          backup_eligible: boolean
          created_at: string
          credential_id: string
          friendly_name: string
          id: string
          last_used_at: string | null
          public_key: string
          sign_count: number
          transports: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          aaguid?: string | null
          attestation_type?: string
          backed_up?: boolean
          backup_eligible?: boolean
          created_at?: string
          credential_id: string
          friendly_name?: string
          id?: string
          last_used_at?: string | null
          public_key: string
          sign_count?: number
          transports?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          aaguid?: string | null
          attestation_type?: string
          backed_up?: boolean
          backup_eligible?: boolean
          created_at?: string
          credential_id?: string
          friendly_name?: string
          id?: string
          last_used_at?: string | null
          public_key?: string
          sign_count?: number
          transports?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webauthn_credentials_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      email: { Args: never; Returns: string }
      jwt: { Args: never; Returns: Json }
      role: { Args: never; Returns: string }
      uid: { Args: never; Returns: string }
    }
    Enums: {
      aal_level: "aal1" | "aal2" | "aal3"
      code_challenge_method: "s256" | "plain"
      factor_status: "unverified" | "verified"
      factor_type: "totp" | "webauthn" | "phone"
      oauth_authorization_status: "pending" | "approved" | "denied" | "expired"
      oauth_client_type: "public" | "confidential"
      oauth_registration_type: "dynamic" | "manual"
      oauth_response_type: "code"
      one_time_token_type:
        | "confirmation_token"
        | "reauthentication_token"
        | "recovery_token"
        | "email_change_token_new"
        | "email_change_token_current"
        | "phone_change_token"
    }
    CompositeTypes: {
      [_ in never]: never
    }
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
      one_time_orders: {
        Row: {
          amount_total: number
          checkout_session_id: string | null
          created_at: string | null
          currency: string
          customer_email: string | null
          id: string
          payment_status: string
          plan: string | null
          quantity: number
          status: string
          stripe_customer_id: string | null
          user_id: string
        }
        Insert: {
          amount_total: number
          checkout_session_id?: string | null
          created_at?: string | null
          currency?: string
          customer_email?: string | null
          id?: string
          payment_status: string
          plan?: string | null
          quantity?: number
          status?: string
          stripe_customer_id?: string | null
          user_id: string
        }
        Update: {
          amount_total?: number
          checkout_session_id?: string | null
          created_at?: string | null
          currency?: string
          customer_email?: string | null
          id?: string
          payment_status?: string
          plan?: string | null
          quantity?: number
          status?: string
          stripe_customer_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "one_time_orders_plan_fkey"
            columns: ["plan"]
            isOneToOne: false
            referencedRelation: "plan_metadata"
            referencedColumns: ["plan"]
          },
        ]
      }
      orders: {
        Row: {
          favicon_file: string | null
          order_date: string
          order_id: string
          order_status: boolean
          report_email: string | null
          rum_connection: boolean | null
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
          report_email?: string | null
          rum_connection?: boolean | null
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
          report_email?: string | null
          rum_connection?: boolean | null
          usage_by_site?: number
          user_id?: string
          website_address?: string
          website_name?: string
          weekly_report?: boolean | null
        }
        Relationships: []
      }
      plan_metadata: {
        Row: {
          default_billing_interval: string | null
          degradation_policy: string
          plan: string
          price: number
          site_limit: number | null
          usage_limit: number
          wp_plugin_audits: number
        }
        Insert: {
          default_billing_interval?: string | null
          degradation_policy?: string
          plan: string
          price?: number
          site_limit?: number | null
          usage_limit: number
          wp_plugin_audits?: number
        }
        Update: {
          default_billing_interval?: string | null
          degradation_policy?: string
          plan?: string
          price?: number
          site_limit?: number | null
          usage_limit?: number
          wp_plugin_audits?: number
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
          created_at: string | null
          current_page: string | null
          domain_name: string | null
          events: Json | null
          id: number
          previous_page: string | null
          session_id: string | null
        }
        Insert: {
          created_at?: string | null
          current_page?: string | null
          domain_name?: string | null
          events?: Json | null
          id?: number
          previous_page?: string | null
          session_id?: string | null
        }
        Update: {
          created_at?: string | null
          current_page?: string | null
          domain_name?: string | null
          events?: Json | null
          id?: number
          previous_page?: string | null
          session_id?: string | null
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
      subscriptions: {
        Row: {
          billing_interval: string | null
          created_at: string | null
          current_usage: number
          period_ends_at: string | null
          period_starts_at: string | null
          plan: string
          quantity: number
          status: string
          stripe_customer_id: string | null
          stripe_session_id: string | null
          stripe_subscription_id: string | null
          stripe_subscription_status: string | null
          trial_ends_at: string | null
          updated_at: string | null
          user_id: string
          wp_plugin_audits: number | null
        }
        Insert: {
          billing_interval?: string | null
          created_at?: string | null
          current_usage?: number
          period_ends_at?: string | null
          period_starts_at?: string | null
          plan?: string
          quantity?: number
          status?: string
          stripe_customer_id?: string | null
          stripe_session_id?: string | null
          stripe_subscription_id?: string | null
          stripe_subscription_status?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          user_id: string
          wp_plugin_audits?: number | null
        }
        Update: {
          billing_interval?: string | null
          created_at?: string | null
          current_usage?: number
          period_ends_at?: string | null
          period_starts_at?: string | null
          plan?: string
          quantity?: number
          status?: string
          stripe_customer_id?: string | null
          stripe_session_id?: string | null
          stripe_subscription_id?: string | null
          stripe_subscription_status?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          user_id?: string
          wp_plugin_audits?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_fkey"
            columns: ["plan"]
            isOneToOne: false
            referencedRelation: "plan_metadata"
            referencedColumns: ["plan"]
          },
        ]
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
            isOneToOne: false
            referencedRelation: "cloudflare_kv_tracking"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "wordpress_cred_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "wordpress_cred_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_cf_zone_per_site"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "wordpress_cred_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "one_time_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      wp_key: {
        Row: {
          created_at: string
          domain: string | null
          id: number
          wp_secret: string | null
        }
        Insert: {
          created_at?: string
          domain?: string | null
          id?: number
          wp_secret?: string | null
        }
        Update: {
          created_at?: string
          domain?: string | null
          id?: number
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
    }
    Views: {
      cloudflare_kv_tracking: {
        Row: {
          created_at: string | null
          current_usage: number | null
          default_billing_interval: string | null
          degradation_policy: string | null
          order_id: string | null
          period_ends_at: string | null
          period_starts_at: string | null
          plan: string | null
          price: number | null
          quantity: number | null
          status: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string | null
          usage_limit: number | null
          user_id: string | null
          website_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_fkey"
            columns: ["plan"]
            isOneToOne: false
            referencedRelation: "plan_metadata"
            referencedColumns: ["plan"]
          },
        ]
      }
      subscription_with_limit: {
        Row: {
          active_sites: number | null
          computed_usage_limit: number | null
          created_at: string | null
          current_usage: number | null
          degradation_policy: string | null
          period_ends_at: string | null
          period_starts_at: string | null
          plan: string | null
          quantity: number | null
          status: string | null
          trial_ends_at: string | null
          updated_at: string | null
          usage_limit: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_fkey"
            columns: ["plan"]
            isOneToOne: false
            referencedRelation: "plan_metadata"
            referencedColumns: ["plan"]
          },
        ]
      }
      v_cf_zone_per_site: {
        Row: {
          config_backup: Json | null
          order_id: string | null
          order_status: boolean | null
          site_id: string | null
          status: string | null
          token: string | null
          user_id: string | null
          website_name: string | null
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
      wp_plugin_scans: {
        Row: {
          audit_completed: number | null
          audit_limit: number | null
          user_id: string | null
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
      analyze_web_vitals_by_page: {
        Args: { domain_filter?: string; time_range?: string }
        Returns: {
          avg_cls: number
          avg_fcp: number
          avg_fid: number
          avg_inp: number
          avg_lcp: number
          avg_ttfb: number
          cls_good_pct: number
          cls_needs_improvement_pct: number
          cls_poor_pct: number
          device_type: string
          fcp_good_pct: number
          fcp_needs_improvement_pct: number
          fcp_poor_pct: number
          fid_good_pct: number
          fid_needs_improvement_pct: number
          fid_poor_pct: number
          inp_good_pct: number
          inp_needs_improvement_pct: number
          inp_poor_pct: number
          lcp_good_pct: number
          lcp_needs_improvement_pct: number
          lcp_poor_pct: number
          overall_score: number
          page_address: string
          page_url: string
          page_view_count: number
          performance_category: string
          ttfb_good_pct: number
          ttfb_needs_improvement_pct: number
          ttfb_poor_pct: number
        }[]
      }
      bytea_to_text: { Args: { data: string }; Returns: string }
      cache_analysis: {
        Args: { domain_name_param: string }
        Returns: {
          cache_status: string
          cdn_provider: string
          city: string
          country: string
          created_at: string
          current_page: string
          device: string
          dns_time: number
          id: string
          is_origin_hit: string
          network_rtt: string
          network_type: string
          server_processing_time: number
          tcp_time: number
          ttfb_total: number
        }[]
      }
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
      delete_old_rum_hits: { Args: never; Returns: undefined }
      delete_old_rum_metrics: { Args: never; Returns: undefined }
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
      get_ai_citation: {
        Args: { p_domain_name: string }
        Returns: {
          ai_citation_possibility: string
          avg_citation_score: number
          avg_dom_content_loaded: number
          avg_ttfb: number
          device_type: string
          domain: string
          max_citation_score: number
          min_citation_score: number
          std_dev_citation_score: number
          total_sessions: number
        }[]
      }
      get_analytics_by_device_and_country: {
        Args: { p_domain_name: string; p_time_range?: string }
        Returns: {
          avg_pages_per_session: number
          bounce_rate_percentage: number
          country: string
          device_type: string
          total_page_views: number
          total_sessions: number
          unique_languages: number
          unique_visitors: number
        }[]
      }
      get_daily_web_metrics: { Args: { target_date: string }; Returns: Json[] }
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
      get_web_vitals_metrics:
        | {
            Args: { p_domain: string }
            Returns: {
              avg_value: number
              device_type: string
              domain_name: string
              good_percent: number
              max_value: number
              metric_name: string
              min_value: number
              needs_improvement_percent: number
              p50: number
              p75: number
              p90: number
              p95: number
              p99: number
              page: string
              poor_percent: number
              sample_count: number
            }[]
          }
        | {
            Args: { p_date_range?: string; p_domain: string }
            Returns: {
              avg_value: number
              device_type: string
              domain_name: string
              good_percent: number
              max_value: number
              metric_name: string
              min_value: number
              needs_improvement_percent: number
              p50: number
              p75: number
              p90: number
              p95: number
              p99: number
              page: string
              poor_percent: number
              sample_count: number
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
      lcp_attribution_by_device: {
        Args: {
          p_domain?: string
          p_from?: string
          p_min_lcp?: number
          p_path_like?: string
          p_to?: string
        }
        Returns: {
          avg_lcp: number
          decodedbodysize: number
          device_type: string
          elementrenderdelay: number
          height: number
          islazy: boolean
          lcp_type: string
          max_lcp: number
          occurrences: number
          resourceloaddelay: number
          resourceloadduration: number
          target: string
          target_url: string
          transfersize: number
          ttfb: number
          url: string
          width: number
        }[]
      }
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
      process_web_vitals_date_range: {
        Args: { end_date?: string; start_date: string }
        Returns: {
          process_date: string
          rows_inserted: number
        }[]
      }
      recent_requests: {
        Args: { p_domain: string; p_limit?: number }
        Returns: {
          backend_ms: number
          cache_status: string
          city: string
          country: string
          created_at: string
          current_page: string
          decoded_size: number
          device_type: string
          experience: string
          har_data: Json
          id: number
          inp_rating: string
          inp_value: number
          lcp_rating: string
          lcp_value: number
          session_id: string
          transfer_size: number
          ttfb: number
        }[]
      }
      refresh_rum_daily_distributions: {
        Args: { p_day?: string }
        Returns: undefined
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
      text_to_bytea: { Args: { data: string }; Returns: string }
      third_party_domains: {
        Args: { site_filter?: string; time_range?: string }
        Returns: {
          device_type: string
          site_domain: string
          top_domains: Json
        }[]
      }
      top_landing_page: {
        Args: { p_date_range: string; p_domain_name: string }
        Returns: {
          current_page: string
          hits: number
          previous_page: string
        }[]
      }
      traffic_source: {
        Args: never
        Returns: {
          count: number
          day: string
          device_type: string
          domain: string
          referral_domain: string
        }[]
      }
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
      user_happiness: {
        Args: { p_date_range?: string; p_domain?: string }
        Returns: {
          avg_cls: number
          avg_fcp: number
          avg_inp: number
          avg_lcp: number
          avg_long_tasks: number
          avg_performance_score: number
          avg_slow_api_calls: number
          avg_trackers: number
          avg_ttfb: number
          country_count: number
          device_type: string
          experience_quality: string
          percentage_in_device_type: number
          session_count: number
        }[]
      }
      user_happiness_dist: {
        Args: { domain_filter: string; end_date: string; start_date: string }
        Returns: {
          country_iso: string
          device_type: string
          happy_percentage: number
          moderate_percentage: number
          total_sessions: number
          unhappy_percentage: number
        }[]
      }
      ux_map_data: {
        Args: { domain_url: string }
        Returns: {
          average_pct: number
          bad_pct: number
          country: string
          device_type: string
          good_pct: number
          network: string
          p75_cls: number
          p75_inp: number
          p75_lcp: number
          p75_ttfb: number
          total_sessions: number
        }[]
      }
      verify_website_user_match: {
        Args: { user_id_arg: string; website_name_arg: string }
        Returns: boolean
      }
      web_vitals: {
        Args: { p_domain_name: string; p_time_range: string }
        Returns: {
          avg_pages_per_session: number
          bounce_rate_percentage: number
          country: string
          device_type: string
          total_page_views: number
          total_sessions: number
          unique_languages: number
          unique_visitors: number
        }[]
      }
    }
    Enums: {
      email_verbosity:
        | "summary_only"
        | "analytics_only"
        | "summary_analytics"
        | "full_report"
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
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          owner_id: string | null
          public: boolean | null
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string | null
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Relationships: []
      }
      buckets_analytics: {
        Row: {
          created_at: string
          deleted_at: string | null
          format: string
          id: string
          name: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      buckets_vectors: {
        Row: {
          created_at: string
          id: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          metadata: Json | null
          name: string | null
          owner: string | null
          owner_id: string | null
          path_tokens: string[] | null
          updated_at: string | null
          user_metadata: Json | null
          version: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          in_progress_size: number
          key: string
          metadata: Json | null
          owner_id: string | null
          upload_signature: string
          user_metadata: Json | null
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id: string
          in_progress_size?: number
          key: string
          metadata?: Json | null
          owner_id?: string | null
          upload_signature: string
          user_metadata?: Json | null
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          in_progress_size?: number
          key?: string
          metadata?: Json | null
          owner_id?: string | null
          upload_signature?: string
          user_metadata?: Json | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string
          created_at: string
          etag: string
          id: string
          key: string
          owner_id: string | null
          part_number: number
          size: number
          upload_id: string
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          etag: string
          id?: string
          key: string
          owner_id?: string | null
          part_number: number
          size?: number
          upload_id: string
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          etag?: string
          id?: string
          key?: string
          owner_id?: string | null
          part_number?: number
          size?: number
          upload_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "s3_multipart_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      vector_indexes: {
        Row: {
          bucket_id: string
          created_at: string
          data_type: string
          dimension: number
          distance_metric: string
          id: string
          metadata_configuration: Json | null
          name: string
          updated_at: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          data_type: string
          dimension: number
          distance_metric: string
          id?: string
          metadata_configuration?: Json | null
          name: string
          updated_at?: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          data_type?: string
          dimension?: number
          distance_metric?: string
          id?: string
          metadata_configuration?: Json | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vector_indexes_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets_vectors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      allow_any_operation: {
        Args: { expected_operations: string[] }
        Returns: boolean
      }
      allow_only_operation: {
        Args: { expected_operation: string }
        Returns: boolean
      }
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string }
        Returns: undefined
      }
      extension: { Args: { name: string }; Returns: string }
      filename: { Args: { name: string }; Returns: string }
      foldername: { Args: { name: string }; Returns: string[] }
      get_common_prefix: {
        Args: { p_delimiter: string; p_key: string; p_prefix: string }
        Returns: string
      }
      get_size_by_bucket: {
        Args: never
        Returns: {
          bucket_id: string
          size: number
        }[]
      }
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_key_token?: string
          next_upload_token?: string
          prefix_param: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          _bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_token?: string
          prefix_param: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      operation: { Args: never; Returns: string }
      search: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_by_timestamp: {
        Args: {
          p_bucket_id: string
          p_level: number
          p_limit: number
          p_prefix: string
          p_sort_column: string
          p_sort_column_after: string
          p_sort_order: string
          p_start_after: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_v2: {
        Args: {
          bucket_name: string
          levels?: number
          limits?: number
          prefix: string
          sort_column?: string
          sort_column_after?: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
    }
    Enums: {
      buckettype: "STANDARD" | "ANALYTICS" | "VECTOR"
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
  auth: {
    Enums: {
      aal_level: ["aal1", "aal2", "aal3"],
      code_challenge_method: ["s256", "plain"],
      factor_status: ["unverified", "verified"],
      factor_type: ["totp", "webauthn", "phone"],
      oauth_authorization_status: ["pending", "approved", "denied", "expired"],
      oauth_client_type: ["public", "confidential"],
      oauth_registration_type: ["dynamic", "manual"],
      oauth_response_type: ["code"],
      one_time_token_type: [
        "confirmation_token",
        "reauthentication_token",
        "recovery_token",
        "email_change_token_new",
        "email_change_token_current",
        "phone_change_token",
      ],
    },
  },
  public: {
    Enums: {
      email_verbosity: [
        "summary_only",
        "analytics_only",
        "summary_analytics",
        "full_report",
      ],
    },
  },
  storage: {
    Enums: {
      buckettype: ["STANDARD", "ANALYTICS", "VECTOR"],
    },
  },
} as const
