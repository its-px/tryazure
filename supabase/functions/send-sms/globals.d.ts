// Global type declarations for Deno runtime and remote modules

declare global {
  const Deno: {
    env: {
      get(key: string): string | undefined;
    };
  };
}

// Declare remote modules for Deno
declare module "https://deno.land/std@0.168.0/http/server.ts" {
  export function serve(
    handler: (request: Request) => Response | Promise<Response>
  ): void;
}

declare module "https://esm.sh/@supabase/supabase-js@2" {
  export function createClient(supabaseUrl: string, supabaseKey: string): any;
}

// btoa function for base64 encoding
declare function btoa(data: string): string;

export {};
