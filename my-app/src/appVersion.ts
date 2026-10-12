const KEY = "appVersion";
const GUARD = "appVersionPurging";

export type VersionCheck = "first" | "same" | "purging" | "guarded";

// Compare the build's version with the one last seen. On change, delete Cache
// Storage ONLY, then reload once. Never unregisters the service worker (that
// would destroy the Web Push subscription) and never touches other storage
// (auth token, bookingState draft).
export function checkAppVersion(o: {
  current: string;
  local: Storage;
  session: Storage;
  caches?: CacheStorage;
  reload: () => void;
  timeoutMs?: number;
}): VersionCheck {
  const prev = o.local.getItem(KEY);
  if (prev === o.current) {
    o.session.removeItem(GUARD);
    return "same";
  }
  o.local.setItem(KEY, o.current);
  if (prev === null) return "first";
  if (o.session.getItem(GUARD)) return "guarded";
  o.session.setItem(GUARD, "1");
  let done = false;
  const go = () => {
    if (!done) {
      done = true;
      o.reload();
    }
  };
  setTimeout(go, o.timeoutMs ?? 1500); // a hung purge must not strand the app
  const c = o.caches;
  (c ? c.keys().then((ks) => Promise.all(ks.map((k) => c.delete(k)))) : Promise.resolve())
    .catch(() => {})
    .finally(go);
  return "purging";
}
