import { useEffect } from "react";
import { useTenantContext } from "../context/useTenantContext";

type BusinessInfo = {
  name?: string;
  address?: string;
  phone?: string;
  hours?: { day: string; hours: string }[];
};

const DAY: Record<string, string> = {
  monday: "Mo", tuesday: "Tu", wednesday: "We", thursday: "Th",
  friday: "Fr", saturday: "Sa", sunday: "Su",
};

// "Tuesday" + "10:00 - 20:00" -> "Tu 10:00-20:00"; closed/unparseable days are skipped.
// eslint-disable-next-line react-refresh/only-export-components -- exported for its test
export function openingHours(hours: BusinessInfo["hours"] = []): string[] {
  return hours.flatMap(({ day, hours: h }) => {
    const d = DAY[day?.toLowerCase?.() ?? ""];
    const m = /^(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})$/.exec(h?.trim() ?? "");
    return d && m ? [`${d} ${m[1]}-${m[2]}`] : [];
  });
}

function setMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = content;
}

// Per-tenant <head>: title, description, OG tags and LocalBusiness JSON-LD.
// ponytail: client-side only — Google renders JS, but link-preview bots that
// don't will see index.html's generic RENDEZVOUS tags.
export default function TenantHead() {
  const { tenant, logoUrl } = useTenantContext();

  useEffect(() => {
    if (!tenant) return;
    const info = (tenant.config?.businessInfo ?? {}) as BusinessInfo;
    const description = `Book an appointment online at ${tenant.name}${info.address ? `, ${info.address}` : ""}.`;
    const url = window.location.origin + "/";
    const image = new URL(logoUrl, url).href;

    document.title = tenant.name;
    setMeta("name", "description", description);
    setMeta("property", "og:title", tenant.name);
    setMeta("property", "og:description", description);
    setMeta("property", "og:url", url);
    setMeta("property", "og:image", image);
    setMeta("name", "twitter:title", tenant.name);
    setMeta("name", "twitter:description", description);
    setMeta("name", "twitter:image", image);

    const hours = openingHours(info.hours);
    const ld = {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: tenant.name,
      url,
      image,
      ...(info.address && { address: info.address }),
      ...(info.phone && { telephone: info.phone }),
      ...(hours.length && { openingHours: hours }),
    };
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(ld);
    document.head.appendChild(script);
    return () => script.remove();
  }, [tenant, logoUrl]);

  return null;
}
