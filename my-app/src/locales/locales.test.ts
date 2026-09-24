import { describe, expect, it } from "vitest";
import en from "./en/translation.json";
import gr from "./gr/translation.json";

const flatten = (obj: object, prefix = ""): string[] =>
  Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object" ? flatten(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  );

describe("locales", () => {
  it("en and gr have identical key sets", () => {
    expect(flatten(gr).sort()).toEqual(flatten(en).sort());
  });
});
