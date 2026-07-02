import { Box, Card, CardContent, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { useResolvedColors } from "../../hooks/useResolvedColors";
import { getCommonStyles } from "../../theme";

interface ReferralStatsProps {
  tenantId: string;
}

// ponytail: reward is just visibility for now ("X referred, Y booked") —
// no points/wallet/discount system, that's payment-adjacent and out of scope.
export default function ReferralStats({ tenantId }: ReferralStatsProps) {
  const colors = useResolvedColors();
  const commonStyles = getCommonStyles(colors);
  const [referred, setReferred] = useState(0);
  const [booked, setBooked] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) return;
    let isMounted = true;

    const load = async () => {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const storedSession = localStorage.getItem("sb-auth-token");
      let token = supabaseKey;
      try {
        token = storedSession ? JSON.parse(storedSession)?.access_token : supabaseKey;
      } catch {
        /* fall back to anon key */
      }
      const headers = {
        apikey: supabaseKey,
        Authorization: `Bearer ${token}`,
      };

      try {
        const referredRes = await fetch(
          `${supabaseUrl}/rest/v1/profiles?tenant_id=eq.${tenantId}&referred_by=not.is.null&select=id`,
          { headers },
        );
        const referredProfiles = referredRes.ok ? await referredRes.json() : [];
        if (!isMounted) return;
        setReferred(referredProfiles.length);

        if (referredProfiles.length === 0) {
          setLoading(false);
          return;
        }
        const ids = referredProfiles.map((p: { id: string }) => p.id).join(",");
        const bookedRes = await fetch(
          `${supabaseUrl}/rest/v1/bookings?tenant_id=eq.${tenantId}&user_id=in.(${ids})&select=user_id`,
          { headers },
        );
        const bookings = bookedRes.ok ? await bookedRes.json() : [];
        if (!isMounted) return;
        const distinctUsers = new Set(bookings.map((b: { user_id: string }) => b.user_id));
        setBooked(distinctUsers.size);
      } catch (err) {
        console.error("[ReferralStats] Error loading referral stats:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, [tenantId]);

  if (loading) return null;

  return (
    <Card sx={{ mt: 2, ...commonStyles.card }}>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 1 }}>
          Referral Program
        </Typography>
        <Box sx={{ display: "flex", gap: 3 }}>
          <Box>
            <Typography variant="h4">{referred}</Typography>
            <Typography variant="body2" color="text.secondary">
              Customers referred
            </Typography>
          </Box>
          <Box>
            <Typography variant="h4">{booked}</Typography>
            <Typography variant="body2" color="text.secondary">
              Referred customers who booked
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
