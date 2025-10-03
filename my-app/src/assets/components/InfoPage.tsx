import { Box, Button,  Typography, Paper} from "@mui/material";
import { Phone, Room } from "@mui/icons-material";

export default function InfoPage() {
  return (
    // na to ftiajo na min einai tetoio xroma 
    <Box sx={{ backgroundColor: "#1e1e1e", color: "#fff", minHeight: "100vh", p: 3 }}>
     

   

      {/* Banner */}
      <Box textAlign="center" mt={3}>
        <Box
          component="img"
          src="/petsas_banner.png"
          alt="Banner"
          sx={{ width: "100%", maxHeight: 200, objectFit: "cover", borderRadius: 2 }}
        />
      </Box>

      {/* Map */}
    {/* Map */}
<Box textAlign="center" mt={3}>
  <Paper elevation={3} sx={{ borderRadius: 2, overflow: "hidden" }}>
    <iframe
      src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d14953.81620692819!2d23.820820724187612!3d38.00856262005867!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x14a199006a263933%3A0xe1d2d53fa6b0e3b!2sTaco%20Bell!5e0!3m2!1sel!2sgr!4v1759265315524!5m2!1sel!2sgr"
      width="100%"
      height="250"
      style={{ border: 0 }}
      allowFullScreen
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
    />
    <Button startIcon={<Room />} sx={{ mt: 1, color: "#2e7d32" }}>
      Directions
    </Button>
  </Paper>
</Box>


      {/* Business Info */}
      <Box textAlign="center" mt={4}>
        <Typography variant="h5">Name&apos;s Company</Typography>
        <Typography variant="body2" sx={{ color: "gray" }}>
          Πεικων 22, Μεταμορφωση, Greece, 14451
        </Typography>

        {/* Call button */}
        <Button
          startIcon={<Phone />}
          variant="contained"
          sx={{ mt: 2, backgroundColor: "#2e7d32" }}
        >
          Call
        </Button>
      </Box>

      {/* Business Hours */}
      <Box mt={5}>
        <Typography variant="h6" textAlign="center">
          Business Hours
        </Typography>
        <Box sx={{ maxWidth: 400, mx: "auto", mt: 2 }}>
          {[
            { day: "Monday", hours: "Closed" },
            { day: "Tuesday", hours: "10:00 - 20:00" },
            { day: "Wednesday", hours: "10:00 - 18:00" },
            { day: "Thursday", hours: "10:00 - 22:00" },
            { day: "Friday", hours: "10:00 - 20:00" },
            { day: "Saturday", hours: "09:00 - 18:00" },
            { day: "Sunday", hours: "12:00 - 17:00" },
          ].map((item, idx) => (
            <Box
              key={idx}
              sx={{
                display: "flex",
                justifyContent: "space-between",
                p: 1,
                bgcolor: idx % 2 === 0 ? "#2e2e2e" : "transparent",
              }}
            >
              <Typography>{item.day}</Typography>
              <Typography>{item.hours}</Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Health & Safety */}
      <Box mt={5} textAlign="center">
        <Typography variant="h6">Venue Health and Safety Rules</Typography>
        <Box mt={2} sx={{ maxWidth: 400, mx: "auto", textAlign: "left" }}>
          <ul>
            <li>Employees wear masks</li>
            <li>Employees wear disposable gloves</li>
            <li>Disinfection of all surfaces in the workplace</li>
            <li>Disinfection between clients</li>
            <li>Maintain social distancing</li>
          </ul>
        </Box>
      </Box>
    </Box>
  );
}
