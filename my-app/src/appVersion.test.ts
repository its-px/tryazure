import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkAppVersion } from "./appVersion";

const mk = () => {
  const store = (): Storage => {
    const m = new Map<string, string>();
    return {
      getItem: (k) => m.get(k) ?? null,
      setItem: (k, v) => void m.set(k, v),
      removeItem: (k) => void m.delete(k),
    } as Storage;
  };
  const deleted: string[] = [];
  const caches = {
    keys: async () => ["a", "b"],
    delete: async (k: string) => (deleted.push(k), true),
  } as unknown as CacheStorage;
  return { local: store(), session: store(), caches, deleted, reload: vi.fn() };
};

describe("checkAppVersion", () => {
  const getRegistrations = vi.fn();
  beforeEach(() => {
    getRegistrations.mockClear();
    vi.stubGlobal("navigator", { serviceWorker: { getRegistrations } });
  });

  it("first visit stores without reload", () => {
    const m = mk();
    expect(checkAppVersion({ ...m, current: "1" })).toBe("first");
    expect(m.local.getItem("appVersion")).toBe("1");
    expect(m.reload).not.toHaveBeenCalled();
  });

  it("same version is a no-op", () => {
    const m = mk();
    m.local.setItem("appVersion", "1");
    expect(checkAppVersion({ ...m, current: "1" })).toBe("same");
    expect(m.reload).not.toHaveBeenCalled();
  });

  it("changed version purges caches, reloads once, never touches the SW or other keys", async () => {
    const m = mk();
    m.local.setItem("appVersion", "1");
    m.local.setItem("bookingState", "draft");
    expect(checkAppVersion({ ...m, current: "2" })).toBe("purging");
    await vi.waitFor(() => expect(m.reload).toHaveBeenCalledTimes(1));
    expect(m.deleted).toEqual(["a", "b"]);
    expect(m.local.getItem("bookingState")).toBe("draft");
    expect(getRegistrations).not.toHaveBeenCalled();
  });

  it("guard prevents a reload loop", () => {
    const m = mk();
    m.local.setItem("appVersion", "1");
    m.session.setItem("appVersionPurging", "1");
    expect(checkAppVersion({ ...m, current: "2" })).toBe("guarded");
    expect(m.reload).not.toHaveBeenCalled();
  });

  it("hung purge still reloads after the timeout", async () => {
    const m = mk();
    m.local.setItem("appVersion", "1");
    const caches = { keys: () => new Promise(() => {}) } as unknown as CacheStorage;
    checkAppVersion({ ...m, caches, current: "2", timeoutMs: 20 });
    await vi.waitFor(() => expect(m.reload).toHaveBeenCalledTimes(1));
  });
});
