import { describe, expect, it } from "vitest";
import { buildProfessionalLink, findLinkedProfessional, tenantBaseUrl } from "./proLinkUtils";

const pros = [
  { id: "p1", code: "c1", name: "A", tenant_id: "t1" },
  { id: "p2", code: "c2", name: "B", tenant_id: "t2" },
];

describe("professional links", () => {
  it("builds on domain and slug bases", () => {
    const d = tenantBaseUrl({ slug: "x" }, "salon.gr", "http://o");
    expect(buildProfessionalLink(d, "p1")).toBe("https://salon.gr/?pro=p1");
    const s = tenantBaseUrl({ slug: "a b" }, null, "http://o");
    expect(buildProfessionalLink(s, "p1")).toBe("http://o/?tenant=a+b&pro=p1");
  });

  it("resolves only same-tenant known ids", () => {
    expect(findLinkedProfessional("p1", pros, "t1")?.code).toBe("c1");
    expect(findLinkedProfessional("p2", pros, "t1")).toBeNull();
    expect(findLinkedProfessional("nope", pros, "t1")).toBeNull();
    expect(findLinkedProfessional(null, pros, "t1")).toBeNull();
  });
});
