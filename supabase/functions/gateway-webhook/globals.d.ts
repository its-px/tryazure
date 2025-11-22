// Local type declarations to satisfy TypeScript in the editor for Deno imports
// These declarations are only for the editor/tsserver and do not affect runtime in Deno.

declare module "https://deno.land/std@0.168.0/http/server.ts" {
  export function serve(
    handler: (req: Request) => Response | Promise<Response>
  ): void;
}

declare module "https://esm.sh/@supabase/supabase-js@2" {
  // Minimal shape for the createClient helper used in this function.
  export function createClient(url: string, key: string): any;
}

// Provide a minimal 'Deno' global so the editor won't complain. At runtime
// the real Deno global is used inside the Supabase Edge Function environment.
/// <reference path="../send-sms/globals.d.ts" />
