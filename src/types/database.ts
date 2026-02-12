export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string | null;
          avatar_url: string | null;
          address: string | null;
          updated_at: string;
          email: string | null;
        };
        Insert: {
          id: string;
          username?: string | null;
          avatar_url?: string | null;
          address?: string | null;
          updated_at?: string;
          email?: string | null;
        };
        Update: {
          id?: string;
          username?: string | null;
          avatar_url?: string | null;
          address?: string | null;
          updated_at?: string;
          email?: string | null;
        };
      };
      versements: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          gains: number;
          pertes: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          gains: number;
          pertes: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          date?: string;
          gains?: number;
          pertes?: number;
          created_at?: string;
        };
      };
    };
  };
}

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Versement = Database['public']['Tables']['versements']['Row'];
export type VersementInsert = Database['public']['Tables']['versements']['Insert'];
