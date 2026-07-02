// Pure slug helpers, split out from index.ts so they're testable without
// pulling in Deno.serve / supabase-js.

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 8);
}
