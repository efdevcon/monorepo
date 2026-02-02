// Database types for Supabase

export interface Database {
  public: {
    Tables: {
      documents: {
        Row: {
          id: string;
          content: string;
          embedding: number[] | null;
          source_type: string;
          source_repo: string | null;
          source_id: string;
          source_hash: string | null;
          metadata: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          content: string;
          embedding?: number[] | null;
          source_type: string;
          source_repo?: string | null;
          source_id: string;
          source_hash?: string | null;
          metadata?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          content?: string;
          embedding?: number[] | null;
          source_type?: string;
          source_repo?: string | null;
          source_id?: string;
          source_hash?: string | null;
          metadata?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Functions: {
      match_documents: {
        Args: {
          query_embedding: number[];
          match_count?: number;
          match_threshold?: number;
          filter_source_type?: string | null;
          filter_source_repo?: string | null;
        };
        Returns: {
          id: string;
          content: string;
          source_type: string;
          source_repo: string | null;
          source_id: string;
          metadata: Record<string, unknown>;
          similarity: number;
        }[];
      };
    };
  };
}

// Convenience types
export type Document = Database["public"]["Tables"]["documents"]["Row"];
export type MatchedDocument =
  Database["public"]["Functions"]["match_documents"]["Returns"][number];

// Chat message type (for request/response, stored in client localStorage)
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
