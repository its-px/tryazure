import { lazy, Suspense, useState, type FormEvent } from "react";
import { Box, Button, TextField, Typography, Paper, CircularProgress } from "@mui/material";
import type { Session } from "@supabase/supabase-js";
import type { Role } from "../../App";
import { supabase } from "../components/supabaseClient";
import { slugify, slugError } from "../../components/tenantSlug";
import { useTranslation } from "react-i18next";

// slugError() returns English (it mirrors the edge function); translate at display.
const SLUG_ERROR_KEYS: Record<string, string> = {
  "Use 3-30 lowercase letters, numbers or hyphens (no hyphen at the start or end)": "signup.slug_format",
  "Hyphens can't be doubled": "signup.slug_double_hyphen",
  "That address is reserved": "signup.slug_reserved",
};

const LoginModal = lazy(() => import("../components/LoginModal"));

// Shown at /owner with no session — e.g. right after signup redirects to the new
// subdomain, where the apex login doesn't carry over (sessions are per-origin).
export function OwnerSignIn({ businessName }: { businessName?: string }) {
  const { t } = useTranslation();
  const [loginOpen, setLoginOpen] = useState(false);
  return (
    <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", p: 2 }}>
      {loginOpen && (
        <Suspense fallback={null}>
          <LoginModal open onClose={() => setLoginOpen(false)} />
        </Suspense>
      )}
      <Paper sx={{ p: { xs: 3, sm: 4 }, width: "100%", maxWidth: 460, textAlign: "center" }}>
        <Typography variant="h5" sx={{ mb: 1, fontWeight: 700 }}>
          {businessName ? t("owner_signin.manage", { name: businessName }) : t("owner_signin.title")}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {t("owner_signin.text")}
        </Typography>
        <Button variant="contained" onClick={() => setLoginOpen(true)}>
          {t("login.sign_in")}
        </Button>
      </Paper>
    </Box>
  );
}

interface SignupPageProps {
  session: Session | null;
  role: Role | null;
}

// Self-serve "Start free trial": sign in (existing LoginModal), then name the business.
// The create-tenant edge function does the real validation and makes the caller owner.
export default function SignupPage({ session, role }: SignupPageProps) {
  const { t } = useTranslation();
  const [loginOpen, setLoginOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const problem = slug ? slugError(slug) : null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { data, error: fnError } = await supabase.functions.invoke("create-tenant", {
      body: { name, slug, phone, address },
    });
    if (fnError || !data?.url) {
      // Non-2xx: supabase-js puts the Response in error.context.
      const body = await (fnError as { context?: Response })?.context?.json?.().catch(() => null);
      setError(body?.error ?? data?.error ?? t("signup.create_error"));
      setBusy(false);
      return;
    }
    // Dev has no wildcard subdomains; ?tenant= resolves any slug in dev (useTenant).
    window.location.assign(import.meta.env.DEV ? `/owner?tenant=${data.slug}` : data.url);
  };

  let content;
  if (!session) {
    content = (
      <>
        <Typography sx={{ mb: 2 }}>
          {t("signup.sign_in_first")}
        </Typography>
        <Button variant="contained" onClick={() => setLoginOpen(true)}>
          {t("signup.sign_in_button")}
        </Button>
      </>
    );
  } else if (role && role !== "user") {
    content = (
      <Typography>
        {t("signup.already_owner")}
      </Typography>
    );
  } else {
    content = (
      <Box component="form" onSubmit={submit} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <TextField
          label={t("signup.business_name")}
          required
          value={name}
          inputProps={{ maxLength: 80 }}
          onChange={(e) => {
            setName(e.target.value);
            if (!slugEdited) setSlug(slugify(e.target.value));
          }}
        />
        <TextField
          label={t("signup.booking_address")}
          required
          value={slug}
          inputProps={{ maxLength: 30 }}
          onChange={(e) => {
            setSlugEdited(true);
            setSlug(e.target.value.toLowerCase());
          }}
          error={!!problem}
          helperText={problem ? t(SLUG_ERROR_KEYS[problem] ?? "", { defaultValue: problem }) : t("signup.clients_book_at", { url: `https://${slug || "your-name"}.pxbs.site` })}
        />
        <TextField label={t("signup.business_phone")} type="tel" value={phone} inputProps={{ maxLength: 30 }} onChange={(e) => setPhone(e.target.value)} />
        <TextField label={t("signup.business_address")} value={address} inputProps={{ maxLength: 200 }} onChange={(e) => setAddress(e.target.value)} />
        {error && <Typography color="error">{error}</Typography>}
        <Button type="submit" variant="contained" disabled={busy || !name.trim() || !slug || !!problem}>
          {busy ? <CircularProgress size={22} /> : t("signup.create_business")}
        </Button>
        <Typography variant="caption" color="text.secondary">
          {t("signup.trial_note")}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", p: 2 }}>
      {loginOpen && (
        <Suspense fallback={null}>
          <LoginModal open onClose={() => setLoginOpen(false)} />
        </Suspense>
      )}
      <Paper sx={{ p: { xs: 3, sm: 4 }, width: "100%", maxWidth: 460 }}>
        <Typography variant="h5" sx={{ mb: 0.5, fontWeight: 700 }}>
          {t("signup.title")}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {t("signup.subtitle")}
        </Typography>
        {content}
        <Typography variant="body2" sx={{ mt: 3 }}>
          <a href="/">{t("legal.back")}</a> · {t("signup.questions")} <a href="mailto:hello@pxbs.site">hello@pxbs.site</a>
        </Typography>
      </Paper>
    </Box>
  );
}
