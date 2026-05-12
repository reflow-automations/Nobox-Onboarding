// Gegenereerd via `supabase gen types typescript` voor project djarvwzvbxlcnxkxczpc (Orakel chat).
// Trimmed naar alleen de onboarding-tabellen + minimum-noodzakelijke meta-types voor Supabase JS v2.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.1";
  };
  public: {
    Tables: {
      onboarding_intakes: {
        Row: {
          adres: string | null;
          bedrijfsnaam: string;
          bijzonderheden: string | null;
          brand_document_filename: string | null;
          brand_document_mime: string | null;
          brand_document_path: string | null;
          brand_document_size: number | null;
          brand_notes: string | null;
          clickup_folder_id: string | null;
          clickup_folder_url: string | null;
          contactpersoon: Json;
          created_at: string;
          diensten: string[];
          doelen: Json;
          drive_folder_id: string | null;
          drive_folder_url: string | null;
          ga4: Json;
          gewenste_startdatum: string | null;
          google_ads: Json;
          id: string;
          internal_notes: string | null;
          kvk: string | null;
          meta_business: Json;
          overige_platforms: string | null;
          raw_payload: Json | null;
          reference_id: string;
          search_console: Json;
          status: Database["public"]["Enums"]["onboarding_status"];
          updated_at: string;
          voorkeur_vergader_tijd: string | null;
          website: string | null;
        };
        Insert: {
          adres?: string | null;
          bedrijfsnaam: string;
          bijzonderheden?: string | null;
          brand_document_filename?: string | null;
          brand_document_mime?: string | null;
          brand_document_path?: string | null;
          brand_document_size?: number | null;
          brand_notes?: string | null;
          clickup_folder_id?: string | null;
          clickup_folder_url?: string | null;
          contactpersoon?: Json;
          created_at?: string;
          diensten?: string[];
          doelen?: Json;
          drive_folder_id?: string | null;
          drive_folder_url?: string | null;
          ga4?: Json;
          gewenste_startdatum?: string | null;
          google_ads?: Json;
          id?: string;
          internal_notes?: string | null;
          kvk?: string | null;
          meta_business?: Json;
          overige_platforms?: string | null;
          raw_payload?: Json | null;
          reference_id?: string;
          search_console?: Json;
          status?: Database["public"]["Enums"]["onboarding_status"];
          updated_at?: string;
          voorkeur_vergader_tijd?: string | null;
          website?: string | null;
        };
        Update: {
          adres?: string | null;
          bedrijfsnaam?: string;
          bijzonderheden?: string | null;
          brand_document_filename?: string | null;
          brand_document_mime?: string | null;
          brand_document_path?: string | null;
          brand_document_size?: number | null;
          brand_notes?: string | null;
          clickup_folder_id?: string | null;
          clickup_folder_url?: string | null;
          contactpersoon?: Json;
          created_at?: string;
          diensten?: string[];
          doelen?: Json;
          drive_folder_id?: string | null;
          drive_folder_url?: string | null;
          ga4?: Json;
          gewenste_startdatum?: string | null;
          google_ads?: Json;
          id?: string;
          internal_notes?: string | null;
          kvk?: string | null;
          meta_business?: Json;
          overige_platforms?: string | null;
          raw_payload?: Json | null;
          reference_id?: string;
          search_console?: Json;
          status?: Database["public"]["Enums"]["onboarding_status"];
          updated_at?: string;
          voorkeur_vergader_tijd?: string | null;
          website?: string | null;
        };
        Relationships: [];
      };
      onboarding_intake_logs: {
        Row: {
          created_at: string;
          event: string;
          id: number;
          intake_id: string;
          payload: Json | null;
        };
        Insert: {
          created_at?: string;
          event: string;
          id?: number;
          intake_id: string;
          payload?: Json | null;
        };
        Update: {
          created_at?: string;
          event?: string;
          id?: number;
          intake_id?: string;
          payload?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "onboarding_intake_logs_intake_id_fkey";
            columns: ["intake_id"];
            isOneToOne: false;
            referencedRelation: "onboarding_intakes";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      generate_nbx_reference: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
    };
    Enums: {
      onboarding_status:
        | "received"
        | "drive_created"
        | "mails_sent"
        | "clickup_created"
        | "completed"
        | "failed";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
