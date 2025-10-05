import { useEffect, useState } from "react";
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Button, 
  CircularProgress,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Divider
} from "@mui/material";
import { supabase } from "./supabaseClient";
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonIcon from '@mui/icons-material/Person';

interface Booking {
  id: string;
  date: string;
  location: string;
  services: string;
  professional_id: string;
  status: string;
  created_at: string;
}

interface UserProfile {
  full_name: string;
  phone: string;
}

export default function UserAccountPage() {
  const [user, setUser] = useState<any>(null);
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
  const [pastBookings, setPastBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  
  // Profile edit states
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [profile, setProfile] = useState<UserProfile>({ full_name: '', phone: '' });
  const [editedProfile, setEditedProfile] = useState<UserProfile>({ full_name: '', phone: '' });

  // Cancel dialog
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState<string | null>(null);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    
    if (user) {
      await loadUserProfile(user.id);
      await loadUserBookings(user.id);
    } else {
      setLoading(false);
    }
  };

  const loadUserProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("id", userId)
      .single();

    if (!error && data) {
      setProfile(data);
      setEditedProfile(data);
    }
  };

  const loadUserBookings = async (userId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("user_id", userId)
      .order("date", { ascending: true });

    if (error) {
      console.error("Error loading bookings:", error);
    } else {
      const today = new Date().toISOString().split('T')[0];
      const upcoming = data?.filter(b => b.date >= today && b.status !== 'cancelled') || [];
      const past = data?.filter(b => b.date < today || b.status === 'cancelled') || [];
      
      setUpcomingBookings(upcoming);
      setPastBookings(past);
    }
    setLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setUpcomingBookings([]);
    setPastBookings([]);
  };

  const handleUpdateProfile = async () => {
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: editedProfile.full_name,
        phone: editedProfile.phone
      })
      .eq("id", user.id);

    if (error) {
      alert("Error updating profile: " + error.message);
    } else {
      setProfile(editedProfile);
      setShowEditProfile(false);
      alert("Profile updated successfully!");
    }
  };

  const handleCancelBooking = async () => {
    if (!bookingToCancel) return;

    const { error } = await supabase
      .from("bookings")
      .update({ status: 'cancelled' })
      .eq("id", bookingToCancel);

    if (error) {
      alert("Error cancelling booking: " + error.message);
    } else {
      alert("Booking cancelled successfully!");
      if (user) loadUserBookings(user.id);
      setShowCancelDialog(false);
      setBookingToCancel(null);
    }
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      month: date.toLocaleDateString('en-US', { month: 'short' }),
      day: date.getDate(),
      fullDate: date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    };
  };

  const renderBookingCard = (booking: Booking, isUpcoming: boolean) => {
    const dateInfo = formatDate(booking.date);
    
    return (
      <Card 
        key={booking.id}
        sx={{ 
          mb: 2,
          display: 'flex',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          opacity: booking.status === 'cancelled' ? 0.6 : 1
        }}
      >
        {/* Date Section */}
        <Box
          sx={{
            width: '100px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            borderRight: '3px solid #2e7d32',
            padding: 2,
            backgroundColor: '#f5f5f5'
          }}
        >
          <Typography variant="caption" color="text.secondary">
            {dateInfo.month}
          </Typography>
          <Typography variant="h4" fontWeight="bold">
            {dateInfo.day}
          </Typography>
        </Box>

        {/* Booking Details */}
        <CardContent sx={{ flex: 1, position: 'relative' }}>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start">
            <Box>
              <Typography variant="body2" color="text.secondary">
                {getServiceNames(booking.services)}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                <PersonIcon sx={{ fontSize: 16, mr: 0.5 }} />
                {getProfessionalName(booking.professional_id)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Location: {booking.location === 'your_place' ? 'At Your Place' : 'At Our Place'}
              </Typography>
              <Box
                sx={{
                  mt: 1,
                  display: 'inline-block',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  backgroundColor: 
                    booking.status === 'confirmed' ? '#4caf50' :
                    booking.status === 'pending' ? '#ff9800' :
                    booking.status === 'cancelled' ? '#f44336' : '#9e9e9e',
                  color: 'white',
                  fontSize: '0.75rem',
                  fontWeight: 'bold'
                }}
              >
                {booking.status.toUpperCase()}
              </Box>
            </Box>

            {/* Action Button */}
            {isUpcoming && booking.status !== 'cancelled' && (
              <IconButton 
                color="error"
                onClick={() => {
                  setBookingToCancel(booking.id);
                  setShowCancelDialog(true);
                }}
              >
                <DeleteIcon />
              </IconButton>
            )}
          </Box>
        </CardContent>
      </Card>
    );
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
      {/* User Profile Header */}
      <Card sx={{ mb: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box display="flex" alignItems="center" gap={2}>
              <Box
                sx={{
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  backgroundColor: '#2e7d32',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '1.5rem',
                  fontWeight: 'bold'
                }}
              >
                {profile.full_name ? profile.full_name[0].toUpperCase() : user.email[0].toUpperCase()}
              </Box>
              <Box>
                <Typography variant="h6">
                  {profile.full_name || 'User'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {user.email}
                </Typography>
                {profile.phone && (
                  <Typography variant="body2" color="text.secondary">
                    {profile.phone}
                  </Typography>
                )}
              </Box>
            </Box>
            <Box display="flex" gap={1}>
              <IconButton onClick={() => setShowEditProfile(true)} color="primary">
                <EditIcon />
              </IconButton>
              <Button variant="outlined" color="error" onClick={handleSignOut}>
                Sign Out
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Tabs for Upcoming vs Past */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          <Tab label={`Upcoming Appointments (${upcomingBookings.length})`} />
          <Tab label={`History (${pastBookings.length})`} />
        </Tabs>
      </Box>

      {/* Bookings List */}
      {activeTab === 0 && (
        <Box>
          {upcomingBookings.length === 0 ? (
            <Box textAlign="center" py={8}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No upcoming appointments
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Book your first appointment to get started!
              </Typography>
            </Box>
          ) : (
            upcomingBookings.map(booking => renderBookingCard(booking, true))
          )}
        </Box>
      )}

      {activeTab === 1 && (
        <Box>
          {pastBookings.length === 0 ? (
            <Box textAlign="center" py={8}>
              <Typography variant="h6" color="text.secondary">
                No booking history yet
              </Typography>
            </Box>
          ) : (
            pastBookings.map(booking => renderBookingCard(booking, false))
          )}
        </Box>
      )}

      {/* Edit Profile Dialog */}
      <Dialog open={showEditProfile} onClose={() => setShowEditProfile(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Profile</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={2}>
            <TextField
              label="Full Name"
              value={editedProfile.full_name}
              onChange={(e) => setEditedProfile({...editedProfile, full_name: e.target.value})}
              fullWidth
            />
            <TextField
              label="Phone Number"
              value={editedProfile.phone}
              onChange={(e) => setEditedProfile({...editedProfile, phone: e.target.value})}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowEditProfile(false)}>Cancel</Button>
          <Button onClick={handleUpdateProfile} variant="contained">Save Changes</Button>
        </DialogActions>
      </Dialog>

      {/* Cancel Booking Dialog */}
      <Dialog open={showCancelDialog} onClose={() => setShowCancelDialog(false)}>
        <DialogTitle>Cancel Booking</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to cancel this booking?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCancelDialog(false)}>No, Keep It</Button>
          <Button onClick={handleCancelBooking} color="error" variant="contained">
            Yes, Cancel Booking
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}