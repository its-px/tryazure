import { useEffect, useRef, useState } from "react";
import { Box, Button } from "@mui/material";
import { QRCodeCanvas } from "qrcode.react";
import { useTranslation } from "react-i18next";
import { supabase } from "./supabaseClient";
import { useTenantContext } from "../../context/useTenantContext";
import { buildProfessionalLink, tenantBaseUrl } from "./proLinkUtils";
import type { ProfessionalOption } from "./professionalsService";

function LinkRow({ label, url, fileName }: { label: string; url: string; fileName: string }) {
  const { t } = useTranslation();
  const wrap = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt(t("proLinks.copy_prompt"), url);
    }
  };
  const download = () => {
    const canvas = wrap.current?.querySelector("canvas");
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `${fileName}.png`;
    a.click();
  };

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 1, flexWrap: "wrap" }}>
      <Box ref={wrap} sx={{ p: 0.5, bgcolor: "#fff", borderRadius: "6px", lineHeight: 0 }}>
        <QRCodeCanvas value={url} size={512} marginSize={2} style={{ width: 72, height: 72 }} aria-label={t("proLinks.qr_aria", { name: label })} />
      </Box>
      <Box sx={{ flex: 1, minWidth: 160 }}>
        <Box sx={{ fontSize: 14, fontWeight: 600 }}>{label}</Box>
        <Box sx={{ fontSize: 12, opacity: 0.7, wordBreak: "break-all" }}>{url}</Box>
      </Box>
      <Button size="small" variant="outlined" onClick={copy}>{copied ? t("proLinks.copied") : t("proLinks.copy")}</Button>
      <Button size="small" variant="outlined" onClick={download}>{t("proLinks.download_qr")}</Button>
    </Box>
  );
}

export default function ProfessionalLinks({ professionals }: { professionals: ProfessionalOption[] }) {
  const { t } = useTranslation();
  const { tenant } = useTenantContext();
  const [domain, setDomain] = useState<string | null>(null);
  const tenantId = tenant?.id;

  useEffect(() => {
    if (!tenantId) return;
    supabase.from("tenants").select("domain").eq("id", tenantId).maybeSingle().then(({ data }) => setDomain(data?.domain ?? null));
  }, [tenantId]);

  if (!tenant) return null;
  const base = tenantBaseUrl(tenant, domain, window.location.origin);

  return (
    <Box sx={{ mt: 3 }}>
      <Box sx={{ fontSize: 16, fontWeight: 700, mb: 0.5 }}>{t("proLinks.title")}</Box>
      <Box sx={{ fontSize: 13, opacity: 0.7, mb: 1 }}>{t("proLinks.hint")}</Box>
      <LinkRow label={t("proLinks.tenant_wide")} url={base} fileName={`${tenant.slug}-booking-qr`} />
      {professionals.map((p) => (
        <LinkRow key={p.id} label={p.name} url={buildProfessionalLink(base, p.id)} fileName={`${tenant.slug}-${p.code}-qr`} />
      ))}
    </Box>
  );
}
