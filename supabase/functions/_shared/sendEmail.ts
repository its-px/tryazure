// Shared Resend send + booking-link builder for the cron email functions
// (notify-waitlist, send-rebooking-nudges, send-review-requests). One place
// for the from-address, HTML shell, and how a tenant's public URL is built.

const FROM = "team@pxbs.site";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** The tenant's real public URL. Tenants are resolved by registered domain
 * (get_tenant_by_domain), so link to that — never a slugified display name. */
export function tenantBookingUrl(tenant: { domain?: string | null } | null): string {
  return tenant?.domain ? `https://${tenant.domain}` : "https://pxbs.site";
}

/** App page that confirms a marketing opt-out (see unsubscribe edge function). */
export function unsubscribePageUrl(tenant: { domain?: string | null } | null, token: string): string {
  return `${tenantBookingUrl(tenant)}/unsubscribe?t=${encodeURIComponent(token)}`;
}

export async function sendEmail(
  resendApiKey: string,
  to: string,
  subject: string,
  opts: {
    greetingName: string;
    bodyText: string;
    ctaLabel: string;
    ctaUrl: string;
    // Marketing emails must carry a one-click opt-out (Law 3471/2006 art. 11).
    unsubscribe?: { token: string; pageUrl: string };
  },
): Promise<boolean> {
  const unsub = opts.unsubscribe;
  // @ts-ignore - Deno global at runtime
  const fnUrl = unsub ? `${Deno.env.get("SUPABASE_URL")}/functions/v1/unsubscribe?t=${encodeURIComponent(unsub.token)}` : "";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify({
      from: FROM,
      to,
      subject,
      ...(unsub
        ? {
            headers: {
              "List-Unsubscribe": `<${fnUrl}>`,
              "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
            },
          }
        : {}),
      html: `
        <!DOCTYPE html>
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <p>Hi ${escapeHtml(opts.greetingName)},</p>
              <p>${escapeHtml(opts.bodyText)}</p>
              <p style="text-align: center; margin: 24px 0;">
                <a href="${opts.ctaUrl}" style="display: inline-block; padding: 12px 28px; background-color: #2e7d32; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold;">${escapeHtml(opts.ctaLabel)}</a>
              </p>
              <p>Thank you!</p>
              ${unsub ? `<p style="font-size: 12px; color: #888;">Don't want these emails? <a href="${escapeHtml(unsub.pageUrl)}" style="color: #888;">Unsubscribe</a></p>` : ""}
            </div>
          </body>
        </html>
      `,
    }),
  });
  if (!res.ok) {
    console.error("Resend error:", await res.text());
  }
  return res.ok;
}
