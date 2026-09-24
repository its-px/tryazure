// Subdomain rules for self-serve signup. Mirrors slugError() in
// supabase/functions/create-tenant/index.ts, which is authoritative.
const RESERVED = new Set([
  "www", "admin", "api", "app", "mail", "smtp", "ftp", "cdn", "static", "assets",
  "dashboard", "billing", "help", "support", "status", "blog", "docs", "owner", "signup",
]);

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30)
    .replace(/-+$/, "");
}

export function slugError(slug: string): string | null {
  if (!/^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/.test(slug)) {
    return "Use 3-30 lowercase letters, numbers or hyphens (no hyphen at the start or end)";
  }
  if (slug.includes("--")) return "Hyphens can't be doubled";
  if (RESERVED.has(slug) || slug.startsWith("demo")) return "That address is reserved";
  return null;
}
