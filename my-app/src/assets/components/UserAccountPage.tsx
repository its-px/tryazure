import { useEffect, useState } from "react";
import { Box, Typography, Card, CardContent, Button, CircularProgress } from "@mui/material";
import { supabase } from "./supabaseClient";

interface Booking {
  id: string;
  date: string;
  location: string;
  services: string;
  professional_id: string;
  status: string;
  created_at: string;
}

export default function UserAccountPage() {
  const [user, setUser] = useState<any>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    
    if (user) {
      loadUserBookings(user.id);
    } else {
      setLoading(false);
    }
  };

  const loadUserBookings = async (userId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("user_id", userId)
      .order("date", { ascending: false });

    if (error) {
      console.error("Error loading bookings:", error);
    } else {
      setBookings(data || []);
    }
    setLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setBookings([]);
  };

  const getProfessionalName = (profId: string) => {
    if (profId === 'prof1') return 'Person 1';
    if (profId === 'prof2') return 'Person 2';
    return profId;
  };

  const getServiceNames = (servicesJson: string) => {
    try {
      const services = JSON.parse(servicesJson);
      return services.join(', ');
    } catch {
      return servicesJson;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return (
      <Box sx={{ padding: 4, textAlign: "center" }}>
        <Typography variant="h4" gutterBottom>
          User Account
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Please login to view your account and booking history
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ padding: 4, maxWidth: '1200px', margin: '0 auto' }}>
      {/* User Info Header */}
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          mb: 4,
          padding: 3,
          backgroundColor: '#f5f5f5',
          borderRadius: '10px'
        }}
      >
        <Box>
          <Typography variant="h4" gutterBottom>
            Welcome, {user.email}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            User ID: {user.id}
          </Typography>
        </Box>
        <Button 
          variant="outlined" 
          color="error"
          onClick={handleSignOut}
        >
          Sign Out
        </Button>
      </Box>

      {/* Bookings Section */}
      <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
        Your Bookings ({bookings.length})
      </Typography>

      {bookings.length === 0 ? (
        <Box 
          sx={{ 
            textAlign: 'center', 
            padding: 4, 
            backgroundColor: '#f9f9f9',
            borderRadius: '10px'
          }}
        >
          <Typography variant="h6" color="text.secondary">
            No bookings yet
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Start by booking your first appointment!
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {bookings.map((booking) => (
            <Card 
              key={booking.id}
              sx={{ 
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }
              }}
            >
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                  <Box flex={1}>
                    <Typography variant="h6" gutterBottom>
                      Booking for {booking.date}
                    </Typography>
                    
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Professional:</strong> {getProfessionalName(booking.professional_id)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Location:</strong> {booking.location === 'your_place' ? 'At Your Place' : 'At Our Place'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Services:</strong> {getServiceNames(booking.services)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Status:</strong> {booking.status}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        <strong>Booked on:</strong> {new Date(booking.created_at).toLocaleDateString()}
                      </Typography>
                    </Box>
                  </Box>

                  <Box>
                    <Box
                      sx={{
                        padding: '6px 12px',
                        borderRadius: '20px',
                        backgroundColor: 
                          booking.status === 'confirmed' ? '#4caf50' :
                          booking.status === 'pending' ? '#ff9800' :
                          booking.status === 'cancelled' ? '#f44336' : '#9e9e9e',
                        color: 'white',
                        fontSize: '0.875rem',
                        fontWeight: 'bold',
                        textTransform: 'uppercase'
                      }}
                    >
                      {booking.status}
                    </Box>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
    </Box>
  );
}