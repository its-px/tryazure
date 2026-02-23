import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Helper to determine if DST is active in Athens
function isDSTActive(year: number, month: number, day: number): boolean {
  // DST in Europe/Athens: Last Sunday of March 03:00 to Last Sunday of October 04:00

  // Definitely DST (April through September)
  if (month >= 4 && month <= 9) return true;

  // Not DST (November through February)
  if (month === 11 || month === 12 || month === 1 || month === 2) return false;

  // March: check if on or after last Sunday
  if (month === 3) {
    const lastSunday = new Date(Date.UTC(year, 2, 31));
    const lastSundayDate = 31 - lastSunday.getUTCDay();
    return day >= lastSundayDate;
  }

  // October: check if before last Sunday
  if (month === 10) {
    const lastSunday = new Date(Date.UTC(year, 9, 31));
    const lastSundayDate = 31 - lastSunday.getUTCDay();
    return day < lastSundayDate;
  }

  return false;
}

// Helper to convert Athens local time to UTC (returns ICS-formatted string)
function convertAthensToUTC(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): string {
  const offset = isDSTActive(year, month, day) ? 3 : 2;
  const utcDate = new Date(
    Date.UTC(year, month - 1, day, hour - offset, minute, 0),
  );

  const utcYear = utcDate.getUTCFullYear();
  const utcMonth = String(utcDate.getUTCMonth() + 1).padStart(2, "0");
  const utcDay = String(utcDate.getUTCDate()).padStart(2, "0");
  const utcHours = String(utcDate.getUTCHours()).padStart(2, "0");
  const utcMins = String(utcDate.getUTCMinutes()).padStart(2, "0");

  return `${utcYear}${utcMonth}${utcDay}T${utcHours}${utcMins}00Z`;
}

// Helper to generate VEVENT content
function generateICS({
  date,
  startTime,
  endTime,
  services,
  professional,
  location,
  name,
}: {
  date: string;
  startTime: string | null;
  endTime: string | null;
  services: string;
  professional: string;
  location: string;
  name: string;
}): string {
  const uid = crypto.randomUUID();
  const [year, month, day] = date.split("-").map(Number);
  const [startHour, startMinute] = (startTime || "09:00")
    .split(":")
    .map(Number);
  const [endHour, endMinute] = (endTime || "10:00").split(":").map(Number);

  const dtStart = convertAthensToUTC(year, month, day, startHour, startMinute);
  const dtEnd = convertAthensToUTC(year, month, day, endHour, endMinute);

  const now = new Date();
  const dtstamp = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}${String(now.getUTCDate()).padStart(2, "0")}T${String(now.getUTCHours()).padStart(2, "0")}${String(now.getUTCMinutes()).padStart(2, "0")}${String(now.getUTCSeconds()).padStart(2, "0")}Z`;

  const timeString =
    startTime && endTime ? `Time: ${startTime} - ${endTime}\\n` : "";
  const greeting = name ? `Hello ${name}\\n\\n` : "";
  const description = `${greeting}Appointment Details:\\n${timeString}Location: ${location}\\nServices: ${services}\\nProfessional: ${professional}`;

  return [
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:Appointment with ${professional}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    "STATUS:CONFIRMED",
    "SEQUENCE:0",
    "BEGIN:VALARM",
    "TRIGGER:-PT24H",
    "ACTION:DISPLAY",
    "DESCRIPTION:Reminder: Appointment tomorrow",
    "END:VALARM",
    "END:VEVENT",
  ].join("\r\n");
}

/**
 * Calculate the confirmation deadline: 8 hours BEFORE the appointment start
 * in Athens local time, and return a human-readable string.
 */
function calculateConfirmationDeadline(
  date: string,
  startTime: string | null,
): { display: string; isoDate: string; timeStr: string } {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = (startTime || "09:00").split(":").map(Number);

  let deadlineHour = hour - 8;
  let deadlineDay = day;
  let deadlineMonth = month;
  let deadlineYear = year;

  // Roll back to previous day if needed
  if (deadlineHour < 0) {
    deadlineHour += 24;
    deadlineDay -= 1;

    if (deadlineDay < 1) {
      deadlineMonth -= 1;
      if (deadlineMonth < 1) {
        deadlineMonth = 12;
        deadlineYear -= 1;
      }
      // Days in the rolled-back month (month is 1-indexed; Date(y, m, 0) gives last day of m-1)
      deadlineDay = new Date(deadlineYear, deadlineMonth, 0).getDate();
    }
  }

  const isoDate = `${deadlineYear}-${String(deadlineMonth).padStart(2, "0")}-${String(deadlineDay).padStart(2, "0")}`;
  const timeStr = `${String(deadlineHour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

  return {
    isoDate,
    timeStr,
    display: `${isoDate} at ${timeStr} (Athens time)`,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const {
      email,
      name,
      bookingDate,
      startTime,
      endTime,
      location,
      services,
      professional,
    } = await req.json();

    console.log("Received params:", {
      email,
      name,
      bookingDate,
      startTime,
      endTime,
      location,
      services,
      professional,
    });

    if (!email || !bookingDate || !location || !professional) {
      return new Response(
        JSON.stringify({
          error:
            "Missing required parameters: email, bookingDate, location, professional",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ error: "Supabase not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse services
    let serviceIds: string[] = [];
    if (typeof services === "string") {
      try {
        serviceIds = JSON.parse(services);
      } catch {
        serviceIds = [services];
      }
    } else if (Array.isArray(services)) {
      serviceIds = services;
    }

    let serviceNames: string[] = [];
    if (serviceIds && serviceIds.length > 0) {
      const { data: servicesData, error: servicesError } = await supabase
        .from("services")
        .select("id, name")
        .in("id", serviceIds);
      if (servicesError) {
        console.error("Error fetching services:", servicesError);
        serviceNames = serviceIds;
      } else {
        serviceNames = servicesData?.map((s) => s.name) || serviceIds;
      }
    } else {
      serviceNames = ["Service"];
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const locationText = location === "our_place" ? "Our Place" : "Your Place";
    const servicesText = Array.isArray(serviceNames)
      ? serviceNames.join(", ")
      : serviceNames;
    const displayName = name || "Customer";

    // App URL for the confirmation link (set APP_URL in your Supabase secrets)
    const appUrl = Deno.env.get("APP_URL") || "https://pxbs.site";

    // Confirmation deadline: 8 hours before the appointment
    const deadline = calculateConfirmationDeadline(
      bookingDate,
      startTime || null,
    );

    // Generate ICS
    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//PXBS//Booking App//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:REQUEST",
      generateICS({
        date: bookingDate,
        startTime: startTime || null,
        endTime: endTime || null,
        services: servicesText,
        professional,
        location: locationText,
        name: displayName,
      }),
      "END:VCALENDAR",
    ].join("\r\n");

    const encoder = new TextEncoder();
    const base64 = btoa(String.fromCharCode(...encoder.encode(icsContent)));

    const timeRow =
      startTime && endTime
        ? `
      <div class="detail-row">
        <span class="detail-label">🕐 Time:</span> ${startTime} - ${endTime}
      </div>`
        : "";

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "team@pxbs.site",
        to: email,
        subject: "✅ Booking Confirmation – Action Required",
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #2e7d32; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
                .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
                .booking-details { background-color: white; padding: 15px; margin: 20px 0; border-left: 4px solid #2e7d32; }
                .detail-row { padding: 10px 0; border-bottom: 1px solid #eee; }
                .detail-label { font-weight: bold; color: #2e7d32; }

                /* ── Confirmation action banner ── */
                .confirm-banner {
                  background-color: #fff8e1;
                  border: 2px solid #f59e0b;
                  border-radius: 8px;
                  padding: 18px 20px;
                  margin: 20px 0;
                  text-align: center;
                }
                .confirm-banner h2 {
                  color: #b45309;
                  margin: 0 0 8px;
                  font-size: 18px;
                }
                .confirm-banner p {
                  margin: 4px 0;
                  font-size: 14px;
                  color: #555;
                }
                .deadline-highlight {
                  display: inline-block;
                  background: #fef3c7;
                  border: 1px solid #f59e0b;
                  border-radius: 4px;
                  padding: 4px 10px;
                  font-weight: bold;
                  color: #92400e;
                  font-size: 15px;
                  margin: 8px 0;
                }
                .confirm-btn {
                  display: inline-block;
                  margin-top: 14px;
                  padding: 12px 28px;
                  background-color: #2e7d32;
                  color: #ffffff !important;
                  text-decoration: none;
                  border-radius: 6px;
                  font-size: 15px;
                  font-weight: bold;
                  letter-spacing: 0.3px;
                }
                .confirm-btn:hover { background-color: #1b5e20; }
                .cancel-warning {
                  margin-top: 10px;
                  font-size: 12px;
                  color: #b91c1c;
                  font-weight: bold;
                }

                .footer { background-color: #333; color: white; padding: 15px; text-align: center; border-radius: 0 0 5px 5px; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>🎉 Booking Received!</h1>
                </div>
                <div class="content">
                  <p>Hi ${displayName},</p>
                  <p>Thank you for booking with us! Please read the important notice below before your appointment is fully secured.</p>

                  <!-- ── ACTION REQUIRED BANNER ── -->
                  <div class="confirm-banner">
                    <h2>⚠️ Action Required — Confirm Your Booking</h2>
                    <p>Your booking is <strong>pending</strong> and will be <strong>automatically cancelled</strong> if not confirmed in time.</p>
                    <p>Please visit the app and confirm your booking by:</p>
                    <div class="deadline-highlight">📅 ${deadline.display}</div>
                    <br/>
                    <a href="${appUrl}/bookings" class="confirm-btn">Confirm My Booking →</a>
                    <p class="cancel-warning">
                      ❌ Bookings not confirmed by the deadline above will be automatically cancelled by the system.
                    </p>
                  </div>

                  <!-- ── APPOINTMENT DETAILS ── -->
                  <div class="booking-details">
                    <h2 style="margin-top: 0; color: #2e7d32;">Appointment Details</h2>

                    <div class="detail-row">
                      <span class="detail-label">📅 Date:</span> ${bookingDate}
                    </div>

                    ${timeRow}

                    <div class="detail-row">
                      <span class="detail-label">👤 Professional:</span> ${professional}
                    </div>

                    <div class="detail-row">
                      <span class="detail-label">📍 Location:</span> ${locationText}
                    </div>

                    <div class="detail-row">
                      <span class="detail-label">💼 Services:</span> ${servicesText}
                    </div>
                  </div>

                  <p><strong>📆 Add to Your Calendar</strong></p>
                  <p>A calendar file (.ics) is attached to this email. Open it to add this appointment to your calendar app.</p>

                  <p>We look forward to seeing you!</p>
                  <p><strong>PXBS Team</strong></p>
                </div>
                <div class="footer">
                  <p>&copy; 2025 PXBS. All rights reserved.</p>
                </div>
              </div>
            </body>
          </html>
        `,
        attachments: [
          {
            filename: "booking.ics",
            content: base64,
            content_type: "text/calendar; charset=utf-8; method=REQUEST",
          },
        ],
      }),
    });

    const responseData = await res.json();
    if (!res.ok) {
      console.error("Resend API Error:", responseData);
      return new Response(JSON.stringify({ error: responseData }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, data: responseData }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Function Error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
