import { useState } from "react";
import { Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Link } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useTenantContext } from "../../context/useTenantContext";
import { getPolicyHours, getPolicyText } from "./cancellationPolicy";

// Required consent checkbox; renders nothing when the tenant has no policy.
export default function CancellationPolicyConsent({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  const { t, i18n } = useTranslation();
  const { tenant } = useTenantContext();
  const [open, setOpen] = useState(false);
  const hours = getPolicyHours(tenant?.config);
  if (!hours) return null;
  const text = getPolicyText(tenant?.config, i18n.language) || t("cancel_policy.default_text", { hours });

  return (
    <Box sx={{ mt: 2 }}>
      <FormControlLabel
        control={<Checkbox checked={checked} onChange={(e) => onChange(e.target.checked)} />}
        label={
          <span>
            {t("cancel_policy.agree")}{" "}
            <Link component="button" type="button" underline="always" onClick={(e) => { e.preventDefault(); setOpen(true); }}>
              {t("cancel_policy.link")}
            </Link>
          </span>
        }
      />
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{t("cancel_policy.title")}</DialogTitle>
        <DialogContent sx={{ whiteSpace: "pre-wrap" }}>{text}</DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>{t("cancel_policy.close")}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
