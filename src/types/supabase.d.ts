// Type definitions for extended Supabase client with postgres support
import { SupabaseClient } from '@supabase/supabase-js';

declare module '@supabase/supabase-js' {
  interface SupabaseClient {
    postgres?: {
      query: (options: { query: string }) => Promise<{ data?: any[] }>;
    };
    channel: (name: string) => {
      on: (event: string, options: any, callback: (payload: any) => void) => any;
      subscribe: () => any;
      unsubscribe: () => void;
    };
  }
}

export interface ExtendedSupabaseClient extends SupabaseClient {
  postgres?: {
    query: (options: { query: string }) => Promise<{ data?: any[] }>;
  };
}