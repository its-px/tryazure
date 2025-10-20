// // Supabase Edge Function to send appointment reminders
// // Run this daily via cron job or manual trigger

// import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// // CORS headers for allowing requests
// const corsHeaders = {
//   'Access-Control-Allow-Origin': '*',
//   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
// }

// Deno.serve(async (req) => {
//   // Handle CORS preflight
//   if (req.method === 'OPTIONS') {
//     return new Response('ok', { headers: corsHeaders })
//   }

//   try {
//     // Initialize Supabase client
//     const supabaseUrl = Deno.env.get('SUPABASE_URL')!
//     const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
//     const supabase = createClient(supabaseUrl, supabaseKey)

//     // Calculate tomorrow's date
//     const tomorrow = new Date()
//     tomorrow.setDate(tomorrow.getDate() + 1)
//     const tomorrowDate = tomorrow.toISOString().split('T')[0]

//     console.log(`Checking for appointments on: ${tomorrowDate}`)

//     // Get all appointments for tomorrow
//     const { data: appointments, error } = await supabase
//       .from('bookings')
//       .select(`
//         id,
//         date,
//         start_time,
//         end_time,
//         location,
//         services,
//         professional_id,
//         user_id,
//         users:user_id (
//           email,
//           user_metadata
//         )
//       `)
//       .eq('date', tomorrowDate)
//       .eq('status', 'pending')

//     if (error) {
//       console.error('Error fetching appointments:', error)
//       throw error
//     }

//     console.log(`Found ${appointments?.length || 0} appointments for tomorrow`)

//     if (!appointments || appointments.length === 0) {
//       return new Response(
//         JSON.stringify({ success: true, message: 'No appointments tomorrow', count: 0 }),
//         { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
//       )
//     }

//     // Send notifications for each appointment
//     const results = []
//     for (const appointment of appointments) {
//       try {
//         // Here you would integrate with your notification service
//         // For now, we'll just log it
//         const userEmail = appointment.users?.email
//         const userName = appointment.users?.user_metadata?.full_name || 'Customer'

//         console.log(`Sending reminder to ${userEmail} for appointment:`, {
//           date: appointment.date,
//           time: `${appointment.start_time} - ${appointment.end_time}`,
//           services: appointment.services,
//         })

//         // You can integrate with email services like:
//         // - Resend
//         // - SendGrid
//         // - AWS SES
//         // Or push notifications via web push services

//         results.push({
//           appointmentId: appointment.id,
//           email: userEmail,
//           sent: true,
//         })
//       } catch (err) {
//         console.error(`Error sending reminder for appointment ${appointment.id}:`, err)
//         results.push({
//           appointmentId: appointment.id,
//           error: err.message,
//           sent: false,
//         })
//       }
//     }

//     return new Response(
//       JSON.stringify({
//         success: true,
//         message: `Processed ${appointments.length} appointments`,
//         count: appointments.length,
//         results,
//       }),
//       { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
//     )
//   } catch (error) {
//     console.error('Function error:', error)
//     return new Response(
//       JSON.stringify({ success: false, error: error.message }),
//       {
//         status: 500,
//         headers: { ...corsHeaders, 'Content-Type': 'application/json' }
//       }
//     )
//   }
// })
