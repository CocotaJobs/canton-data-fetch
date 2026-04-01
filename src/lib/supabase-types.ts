export interface Database {
  public: {
    Tables: {
      scraped_pages: {
        Row: {
          id: string;
          url: string;
          title: string;
          markdown: string;
          description: string;
          status: "running" | "completed" | "failed";
          error: string | null;
          scraped_at: string;
        };
        Insert: {
          id?: string;
          url: string;
          title?: string;
          markdown?: string;
          description?: string;
          status?: "running" | "completed" | "failed";
          error?: string | null;
          scraped_at?: string;
        };
        Update: {
          id?: string;
          url?: string;
          title?: string;
          markdown?: string;
          description?: string;
          status?: "running" | "completed" | "failed";
          error?: string | null;
          scraped_at?: string;
        };
      };
      company_profiles: {
        Row: {
          id: string;
          name: string;
          industry: string;
          description: string;
          looking_for: string;
          keywords: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          industry?: string;
          description?: string;
          looking_for?: string;
          keywords?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          industry?: string;
          description?: string;
          looking_for?: string;
          keywords?: string;
          updated_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
