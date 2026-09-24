import { Box, Container, Typography, Button } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { LEGAL, type LegalDoc } from "./legalContent";
import LegalFooter from "./LegalFooter";

export default function LegalPage({ doc }: { doc: LegalDoc }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { title, sections } = LEGAL[i18n.language?.startsWith("gr") ? "gr" : "en"][doc];

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Button size="small" onClick={() => (history.length > 1 ? navigate(-1) : navigate("/"))}>
        ← {t("legal.back")}
      </Button>
      <Typography variant="h4" component="h1" sx={{ mt: 2, mb: 3 }}>{title}</Typography>
      {sections.map((s) => (
        <Box key={s.h} component="section" sx={{ mb: 3 }}>
          <Typography variant="h6" component="h2" gutterBottom>{s.h}</Typography>
          {s.p.map((p) => (
            <Typography key={p} variant="body2" paragraph sx={{ whiteSpace: "pre-line" }}>{p}</Typography>
          ))}
        </Box>
      ))}
      <LegalFooter />
    </Container>
  );
}
