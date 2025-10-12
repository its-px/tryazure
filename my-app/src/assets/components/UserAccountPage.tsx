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
} from "@mui/material";
import { supabase } from "./supabaseClient";
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonIcon from '@mui/icons-material/Person';
import { colors, commonStyles, getStatusColor } from "../../theme";

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
  
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [profile, setProfile] = useState<UserProfile>({ full_name: '', phone: '' });
  const [editedProfile, setEditedProfile] = useState<UserProfile>({ full_name: '', phone: '' });

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
          flexDirection: { xs: 'column', sm: 'row' },
          ...commonStyles.card,
          opacity: booking.status === 'cancelled' ? 0.6 : 1
        }}
      >
        {/* Date Section */}
        <Box
          sx={{
            width: { xs: '100%', sm: '100px' },
            display: 'flex',
            flexDirection: { xs: 'row', sm: 'column' },
            alignItems: 'center',
            justifyContent: 'center',
            borderRight: { xs: 'none', sm: `3px solid ${colors.accent.main}` },
            borderBottom: { xs: `3px solid ${colors.accent.main}`, sm: 'none' },
            padding: { xs: 1.5, sm: 2 },
            backgroundColor: colors.background.light,
            gap: { xs: 1, sm: 0 }
          }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.875rem', sm: '0.75rem' } }}>
            {dateInfo.month}
          </Typography>
          <Typography variant="h4" fontWeight="bold" sx={{ fontSize: { xs: '1.75rem', sm: '2.125rem' } }}>
            {dateInfo.day}
          </Typography>
        </Box>

        {/* Booking Details */}
        <CardContent sx={{ flex: 1, position: 'relative', padding: { xs: 1.5, sm: 2 } }}>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexDirection={{ xs: 'column', sm: 'row' }} gap={{ xs: 1, sm: 0 }}>
            <Box flex={1}>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.875rem', sm: '0.875rem' } }}>
                {getServiceNames(booking.services)}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', mt: 1, fontSize: { xs: '0.875rem', sm: '0.875rem' } }}>
                <PersonIcon sx={{ fontSize: { xs: 14, sm: 16 }, mr: 0.5 }} />
                {getProfessionalName(booking.professional_id)}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.875rem', sm: '0.875rem' } }}>
                Location: {booking.location === 'your_place' ? 'At Your Place' : 'At Our Place'}
              </Typography>
              <Box
                sx={{
                  mt: 1,
                  display: 'inline-block',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  backgroundColor: getStatusColor(booking.status),
                  color: 'white',
                  fontSize: { xs: '0.65rem', sm: '0.75rem' },
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
                sx={{ 
                  alignSelf: { xs: 'flex-end', sm: 'flex-start' },
                  mt: { xs: 1, sm: 0 }
                }}
              >
                <DeleteIcon sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }} />
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
        <CircularProgress sx={{ color: colors.accent.main }} />
      </Box>
    );
  }

  if (!user) {
    return (
      <Box sx={{ ...commonStyles.pageContainer, textAlign: "center" }}>
        <Typography variant="h4" gutterBottom sx={{ fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' } }}>
          User Account
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Please login to view your account and booking history
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ ...commonStyles.container }}>
      {/* User Profile Header */}
      <Card sx={{ mb: 3, ...commonStyles.cardElevated }}>
        <CardContent sx={{ padding: { xs: 2, sm: 3 } }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" flexDirection={{ xs: 'column', sm: 'row' }} gap={{ xs: 2, sm: 0 }}>
            <Box display="flex" alignItems="center" gap={2} width={{ xs: '100%', sm: 'auto' }}>
              <Box
                sx={{
                  width: { xs: 50, sm: 60 },
                  height: { xs: 50, sm: 60 },
                  borderRadius: '50%',
                  backgroundColor: colors.accent.main,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: { xs: '1.25rem', sm: '1.5rem' },
                  fontWeight: 'bold'
                }}
              >
                {profile.full_name ? profile.full_name[0].toUpperCase() : user.email[0].toUpperCase()}
              </Box>
              <Box flex={1}>
                <Typography variant="h6" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                  {profile.full_name || 'User'}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                  {user.email}
                </Typography>
                {profile.phone && (
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                    {profile.phone}
                  </Typography>
                )}
              </Box>
            </Box>
            <Box display="flex" gap={1} width={{ xs: '100%', sm: 'auto' }} justifyContent={{ xs: 'center', sm: 'flex-end' }}>
              <IconButton onClick={() => setShowEditProfile(true)} sx={{ color: colors.accent.main }}>
                <EditIcon sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }} />
              </IconButton>
              <Button 
                variant="outlined" 
                color="error" 
                onClick={handleSignOut}
                size={window.innerWidth < 600 ? "small" : "medium"}
                sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
              >
                Sign Out
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Tabs for Upcoming vs Past */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={(_, newValue) => setActiveTab(newValue)}
          variant="fullWidth"
          sx={{
            '& .MuiTab-root': {
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
              minHeight: { xs: '48px', sm: '48px' }
            }
          }}
        >
          <Tab label={`Upcoming (${upcomingBookings.length})`} />
          <Tab label={`History (${pastBookings.length})`} />
        </Tabs>
      </Box>

      {/* Bookings List */}
      {activeTab === 0 && (
        <Box>
          {upcomingBookings.length === 0 ? (
            <Box textAlign="center" py={{ xs: 4, sm: 8 }}>
              <Typography variant="h6" color="text.secondary" gutterBottom sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                No upcoming appointments
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.875rem', sm: '0.875rem' } }}>
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
            <Box textAlign="center" py={{ xs: 4, sm: 8 }}>
              <Typography variant="h6" color="text.secondary" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                No booking history yet
              </Typography>
            </Box>
          ) : (
            pastBookings.map(booking => renderBookingCard(booking, false))
          )}
        </Box>
      )}

      {/* Edit Profile Dialog */}
      <Dialog 
        open={showEditProfile} 
        onClose={() => setShowEditProfile(false)} 
        maxWidth="sm" 
        fullWidth
        fullScreen={window.innerWidth < 600}
      >
        <DialogTitle sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>Edit Profile</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={2}>
            <TextField
              label="Full Name"
              value={editedProfile.full_name}
              onChange={(e) => setEditedProfile({...editedProfile, full_name: e.target.value})}
              fullWidth
              size={window.innerWidth < 600 ? "small" : "medium"}
            />
            <TextField
              label="Phone Number"
              value={editedProfile.phone}
              onChange={(e) => setEditedProfile({...editedProfile, phone: e.target.value})}
              fullWidth
              size={window.innerWidth < 600 ? "small" : "medium"}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ padding: { xs: 2, sm: 3 } }}>
          <Button onClick={() => setShowEditProfile(false)} size={window.innerWidth < 600 ? "small" : "medium"}>
            Cancel
          </Button>
          <Button 
            onClick={handleUpdateProfile} 
            variant="contained"
            sx={{ backgroundColor: colors.accent.main }}
            size={window.innerWidth < 600 ? "small" : "medium"}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Cancel Booking Dialog */}
      <Dialog 
        open={showCancelDialog} 
        onClose={() => setShowCancelDialog(false)}
        fullScreen={window.innerWidth < 600}
      >
        <DialogTitle sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>Cancel Booking</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
            Are you sure you want to cancel this booking?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ padding: { xs: 2, sm: 3 } }}>
          <Button 
            onClick={() => setShowCancelDialog(false)}
            size={window.innerWidth < 600 ? "small" : "medium"}
          >
            No, Keep It
          </Button>
          <Button 
            onClick={handleCancelBooking} 
            color="error" 
            variant="contained"
            size={window.innerWidth < 600 ? "small" : "medium"}
          >
            Yes, Cancel Booking
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}