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

export async function sendEmail(
  resendApiKey: string,
  to: string,
  subject: string,
  opts: { greetingName: string; bodyText: string; ctaLabel: string; ctaUrl: string },
): Promise<boolean> {
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
