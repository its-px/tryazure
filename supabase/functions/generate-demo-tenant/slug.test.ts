// Run with: deno test supabase/functions/generate-demo-tenant/slug.test.ts
import { slugify, randomSuffix } from "./slug.ts";

Deno.test("slugify lowercases, collapses non-alphanumerics, trims dashes", () => {
  const cases: Array<[string, string]> = [
    ["Joe's Barbershop!", "joe-s-barbershop"],
    ["  Demo  Salon  ", "demo-salon"],
    ["Already-Slug", "already-slug"],
    ["---leading and trailing---", "leading-and-trailing"],
  ];
  for (const [input, expected] of cases) {
    const actual = slugify(input);
    if (actual !== expected) {
      throw new Error(`slugify(${JSON.stringify(input)}) = ${actual}, expected ${expected}`);
    }
  }
});

Deno.test("randomSuffix produces distinct short alphanumeric strings", () => {
  const suffixes = new Set(Array.from({ length: 20 }, () => randomSuffix()));
  if (suffixes.size < 15) {
    throw new Error(`expected mostly-unique suffixes, got ${suffixes.size}/20 distinct`);
  }
  for (const s of suffixes) {
    if (!/^[a-z0-9]+$/.test(s)) throw new Error(`suffix "${s}" is not alphanumeric`);
  }
});
