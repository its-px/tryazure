/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { setCurrentStep, setUserSelections } from "../../slices/appSlice";
import type { RootState } from "../../configureStore";
import { supabase } from "../components/supabaseClient";
import { getColors } from "../../theme";
import { BigCalendar } from "../components/BigCalendar";
import NavigationComponent from "../components/NavigationComponent";
import LocationStep from "../components/LocationStep";
import ServicesStep from "../components/ServicesStep";
import ProfessionalStep from "../components/ProfessionalStep";
import Hero from "../components/hero";
import InfoPage from "../components/InfoPage";
import { Box } from "@mui/material";
import LoginModal from "../components/LoginModal";
import { Button } from "@mui/material";
import UserAccountPage from "../components/UserAccountPage";
//import { Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import { Link } from "react-router-dom";
import {
  showBookingNotification,
  checkUpcomingAppointments,
} from "../../notifications";
import TimeSlotsStep from "../components/TimeSlotsStep";
import { fetchServices, type Service } from "../components/servicesService";
import BookingSMSService from "../components/BookingSMSService";

export default function UserPanel() {
  const mode = useSelector((state: RootState) => state.theme?.mode ?? "dark");
  const colors = getColors(mode);
  // Page navigation
  const [currentPage, setCurrentPage] = React.useState<
    "booking" | "info" | "qr" | "account"
  >("booking");

  // Booking states
  const [availableDates, setAvailableDates] = React.useState<string[]>([]);
  const [showLoginModal, setShowLoginModal] = React.useState(false);
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);
  const [services, setServices] = React.useState<Service[]>([]);

  const dispatch = useDispatch();
  const currentStep =
    useSelector((state: RootState) => state.app.currentStep) ?? 1;
  const userSelections = useSelector(
    (state: RootState) => state.app.userSelections
  );
  const {
    selectedLocation = null,
    selectedServices = [],
    selectedProfessional = null,
    selectedDate = "",
    selectedSlot = null,
    serviceDuration = 0,
  } = userSelections || {};
  const totalSteps = 5;

  // Save booking state to localStorage whenever Redux state changes (do NOT dispatch here)
  useEffect(() => {
    // Only save if user has made selections (not just default values)
    const hasSelections = selectedLocation || selectedServices.length > 0 || selectedProfessional;
    
    if (hasSelections) {
      const bookingState = {
        selectedLocation,
        selectedServices,
        selectedProfessional,
        selectedDate,
        selectedSlot,
        currentStep,
        serviceDuration,
        timestamp: Date.now(), // Add timestamp for expiration
      };
      localStorage.setItem("bookingState", JSON.stringify(bookingState));
    }
  }, [
    selectedLocation,
    selectedServices,
    selectedProfessional,
    selectedDate,
    selectedSlot,
    currentStep,
    serviceDuration,
  ]);

  // Restore booking state from localStorage on mount
  // COMMENTED OUT FOR TESTING - Check if this feature causes issues with service loading
  useEffect(() => {
    console.log("localStorage restoration is DISABLED for testing");
    // const savedState = localStorage.getItem("bookingState");
    
    // if (savedState) {
    //   try {
    //     const state = JSON.parse(savedState);
    //     const { currentStep: savedStep, timestamp, ...selectionsOnly } = state;

    //     // Check if state is expired (older than 24 hours)
    //     const EXPIRATION_TIME = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    //     const isExpired = timestamp && (Date.now() - timestamp > EXPIRATION_TIME);

    //     if (isExpired) {
    //       console.log("Booking state expired, clearing localStorage");
    //       localStorage.removeItem("bookingState");
    //       return;
    //     }

    //     // Validate the restored state
    //     const isValidState = () => {
    //       // Must have selectedServices as an array
    //       if (!selectionsOnly.selectedServices) return false;
          
    //       // Convert object to array if needed (serialization fix)
    //       if (!Array.isArray(selectionsOnly.selectedServices)) {
    //         selectionsOnly.selectedServices = Object.values(selectionsOnly.selectedServices);
    //       }
          
    //       // Must have at least some selection to restore
    //       const hasValidSelections = 
    //         selectionsOnly.selectedLocation || 
    //         selectionsOnly.selectedServices.length > 0 || 
    //         selectionsOnly.selectedProfessional;
          
    //       return hasValidSelections && Array.isArray(selectionsOnly.selectedServices);
    //     };

    //     if (isValidState()) {
    //       console.log("Restoring booking state from localStorage");
    //       dispatch(setUserSelections({
    //         selectedLocation: selectionsOnly.selectedLocation || null,
    //         selectedServices: selectionsOnly.selectedServices || [],
    //         selectedProfessional: selectionsOnly.selectedProfessional || null,
    //         selectedDate: selectionsOnly.selectedDate || "",
    //         selectedSlot: selectionsOnly.selectedSlot || null,
    //         serviceDuration: selectionsOnly.serviceDuration || 0,
    //       }));
    //       if (savedStep && savedStep > 1) dispatch(setCurrentStep(savedStep));
    //     } else {
    //       console.log("Invalid or empty booking state, clearing localStorage");
    //       localStorage.removeItem("bookingState");
    //     }
    //   } catch (err) {
    //     console.error("Error restoring booking state, clearing localStorage:", err);
    //     localStorage.removeItem("bookingState");
    //   }
    // }
  }, [dispatch]);

  // Load services from database once on mount
  useEffect(() => {
    let isMounted = true;

    const loadServices = async () => {
      try {
        const data = await fetchServices();
        if (isMounted) {
          setServices(data);
        }
      } catch (err) {
        console.error("Error loading services:", err);
      }
    };

    loadServices();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data?.type === "SHOW_ACCOUNT_PAGE") {
          setCurrentPage("account"); // <-- switch to User Account
        }
      });
    }
  }, []);

  // Load available dates based on selected professional
  useEffect(() => {
    let isMounted = true;

    const loadAvailableDates = async () => {
      try {
        if (!selectedProfessional) {
          const { data, error } = await supabase
            .from("availability")
            .select("date");

          if (!isMounted) return;

          if (error) {
            console.error("Error fetching available dates:", error);
            setAvailableDates([]);
          } else {
            setAvailableDates(data?.map((d: any) => d.date) || []);
          }
          return;
        }

        const { data: shopDates, error: shopError } = await supabase
          .from("availability")
          .select("date");

        if (!isMounted) return;

        if (shopError || !shopDates) {
          console.error("Error fetching shop dates:", shopError);
          setAvailableDates([]);
          return;
        }

        // Check each date to see if it has any available slots
        // Only include dates that have at least one available slot
        const datesWithSlots: string[] = [];

        for (const dateEntry of shopDates) {
          if (!isMounted) break;

          const date = dateEntry.date;
          // Check if there are any available slots for this date
          // We'll use a minimum service duration of 30 minutes for the check
          // If serviceDuration is set, use it; otherwise use 30 minutes as default
          const checkDuration = serviceDuration > 0 ? serviceDuration : 30;

          try {
            const { data: slots, error: slotsError } = await supabase.rpc(
              "get_available_slots",
              {
                p_professional_id: selectedProfessional,
                p_date: date,
                p_service_duration_minutes: checkDuration,
              }
            );

            if (!slotsError && slots && slots.length > 0) {
              datesWithSlots.push(date);
            }
          } catch (err) {
            console.error("Error checking slots for date:", date, err);
          }
        }

        if (isMounted) {
          setAvailableDates(datesWithSlots);
        }
      } catch (err) {
        console.error("Exception in loadAvailableDates:", err);
        if (isMounted) {
          setAvailableDates([]);
        }
      }
    };

    loadAvailableDates();

    return () => {
      isMounted = false;
    };
  }, [selectedProfessional, serviceDuration]);

  // Reset booking state and clear localStorage
  const handleResetBooking = () => {
    localStorage.removeItem("bookingState");
    dispatch(setCurrentStep(1));
    dispatch(setUserSelections({
      selectedLocation: null,
      selectedServices: [],
      selectedProfessional: null,
      selectedDate: "",
      selectedSlot: null,
      serviceDuration: 0,
    }));
    console.log("Booking state reset and localStorage cleared");
  };

  const handleServiceToggle = (serviceId: string) => {
    const newSelectedServices: string[] = Array.isArray(selectedServices)
      ? selectedServices.includes(serviceId)
        ? selectedServices.filter((id: string) => id !== serviceId)
        : [...selectedServices, serviceId]
      : [serviceId];
    // Calculate total duration based on selected services from database
    const totalDuration = newSelectedServices.reduce(
      (sum: number, id: string) => {
        const service = services.find((s) => s.id === id);
        return sum + (service?.duration_minutes || 0);
      },
      0
    );
    dispatch(
      setUserSelections({
        selectedLocation: userSelections?.selectedLocation ?? null,
        selectedServices: newSelectedServices,
        selectedProfessional: userSelections?.selectedProfessional ?? null,
        selectedDate: userSelections?.selectedDate ?? "",
        selectedSlot: userSelections?.selectedSlot ?? null,
        serviceDuration: totalDuration,
      })
    );
  };

  const handleNextStep = () => {
    // If moving to final step (summary/booking), check login
    if (currentStep === 4 && !isLoggedIn) {
      setShowLoginModal(true);
      alert("Please login to complete your booking");
      return;
    }
    if (canProceedNext()) {
      dispatch(setCurrentStep(currentStep + 1));
    }
  };

  // Check if user is logged in and handle auth changes
  useEffect(() => {
    let isMounted = true;
    let isLoggedInRef = isLoggedIn;

    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (isMounted) {
        setIsLoggedIn(!!user);
        isLoggedInRef = !!user;

        // Check for upcoming appointments when user is logged in
        if (user) {
          try {
            await checkUpcomingAppointments(supabase, user.id);
          } catch (err) {
            console.error("Error checking appointments:", err);
          }
        }
      }
    };

    checkAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return;

      const wasLoggedOut = !isLoggedInRef && !!session;
      setIsLoggedIn(!!session);
      isLoggedInRef = !!session;

      // If user just logged in, handle login actions
      if (wasLoggedOut && session?.user) {
        try {
          await checkUpcomingAppointments(supabase, session.user.id);
          setShowLoginModal(false);
        } catch (err) {
          console.error("Error handling login:", err);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [isLoggedIn]); // Keep dependency but use ref to prevent infinite loops

  const handleProfessionalSelect = (professionalId: string) => {
    dispatch(
      setUserSelections({
        selectedLocation: userSelections?.selectedLocation ?? null,
        selectedServices: userSelections?.selectedServices ?? [],
        selectedProfessional: professionalId,
        selectedDate: "",
        selectedSlot: null,
        serviceDuration: userSelections?.serviceDuration ?? 0,
      })
    );
  };

  const handleLocationSelect = (location: "your_place" | "our_place") => {
    dispatch(
      setUserSelections({
        selectedLocation: location,
        selectedServices: userSelections?.selectedServices ?? [],
        selectedProfessional: userSelections?.selectedProfessional ?? null,
        selectedDate: userSelections?.selectedDate ?? "",
        selectedSlot: userSelections?.selectedSlot ?? null,
        serviceDuration: userSelections?.serviceDuration ?? 0,
      })
    );
    dispatch(setCurrentStep(2));
  };

  const canProceedNext = () => {
    switch (currentStep) {
      case 1:
        return selectedLocation !== null;
      case 2:
        return Array.isArray(selectedServices) && selectedServices.length > 0;
      case 3:
        return selectedProfessional !== null;
      case 4:
        return (
          selectedDate !== "" &&
          availableDates.length > 0 &&
          selectedSlot !== null
        );
      case 5:
        return false;
      default:
        return false;
    }
  };

  const handleCompleteBooking = async () => {
    if (
      !selectedDate ||
      !selectedLocation ||
      !selectedProfessional ||
      !Array.isArray(selectedServices) ||
      selectedServices.length === 0 ||
      !selectedSlot
    ) {
      alert("Please complete all steps including selecting a time slot");
      return;
    }
    if (!isLoggedIn) {
      setShowLoginModal(true);
      alert("Please login to complete your booking");
      return;
    }

    // Check for overlapping time slots instead of just checking if date is booked
    // Two time slots overlap if: new_start < existing_end AND new_end > existing_start
    const { data: conflictingBookings, error: checkError } = await supabase
      .from("bookings")
      .select("id, start_time, end_time")
      .eq("professional_id", selectedProfessional)
      .eq("date", selectedDate);

    if (checkError) {
      console.error("Error checking booking:", checkError);
      alert("Error checking availability");
      return;
    }

    // Check if any existing booking overlaps with the selected time slot
    if (conflictingBookings && conflictingBookings.length > 0) {
      const hasOverlap = conflictingBookings.some((booking: any) => {
        const existingStart = booking.start_time;
        const existingEnd = booking.end_time;
        const newStart = selectedSlot.start_time;
        const newEnd = selectedSlot.end_time;

        // Two time slots overlap if: new_start < existing_end AND new_end > existing_start
        return newStart < existingEnd && newEnd > existingStart;
      });

      if (hasOverlap) {
        alert(
          "❌ This time slot is already booked. Please select a different time slot."
        );
        return;
      }
    }

    // Check if user is logged in BEFORE attempting to create booking
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setShowLoginModal(true);
      alert("Please login to complete your booking");
      return;
    }

    const bookingData = {
      user_id: user.id,
      date: selectedDate,
      location: selectedLocation,
      services: JSON.stringify(selectedServices),
      professional_id: selectedProfessional,
      status: "confirmed",
      start_time: selectedSlot.start_time,
      end_time: selectedSlot.end_time,
    };

    const { error } = await supabase.from("bookings").insert([bookingData]);

    if (error) {
      console.error("Booking error:", error);
      if (error.code === "23505") {
        alert("❌ This professional is already booked on this date!");
      } else {
        alert("❌ Error creating booking: " + error.message);
      }
    } else {
      alert("✅ Booking confirmed successfully!");
      // Get the actual booking ID from the response if available
      const { data: insertedBooking } = await supabase
        .from("bookings")
        .select("id")
        .eq("user_id", user?.id)
        .eq("date", selectedDate)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      await showBookingNotification(
        {
          date: selectedDate,
          services: selectedServices, // Pass array directly
          id: insertedBooking?.id || Date.now(),
        },
        supabase
      );
      // Clear booking state and localStorage
      dispatch(setCurrentStep(1));
      dispatch(
        setUserSelections({
          selectedLocation: null,
          selectedServices: [],
          selectedProfessional: null,
          selectedDate: "",
          selectedSlot: null,
          serviceDuration: 0,
        })
      );
      localStorage.removeItem("bookingState");

      // If on account page, refresh it by toggling the key
      if (currentPage === "account") {
        // Force UserAccountPage to refresh by changing key
        setCurrentPage("booking");
        setTimeout(() => setCurrentPage("account"), 100);
      }

      const serviceNames = selectedServices.map((id) => {
        const s = services.find((s) => s.id === id);
        return s?.name || id; // fallback to id if not found
      });

      // Send SMS confirmation if user has phone number
      // Phone may come from auth metadata, auth.phone, or the `profiles` table.
      let userPhone: string | null =
        user?.user_metadata?.phone || (user as any)?.phone || null;

      // Fallback: read profiles.phone for this user if available
      if (!userPhone && user?.id) {
        try {
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("phone")
            .eq("id", user.id)
            .single();

          if (!profileError && profile?.phone) {
            userPhone = profile.phone;
            const masked = `${profile.phone.substring(
              0,
              3
            )}***${profile.phone.substring(profile.phone.length - 4)}`;
            console.log(
              "Found phone in profiles table for user (masked):",
              masked
            );
          } else if (profileError) {
            console.warn(
              "Could not read phone from profiles table:",
              profileError.message || profileError
            );
          }
        } catch (err) {
          console.error("Error querying profiles for phone fallback:", err);
        }
      }

      console.log("🔍 Checking for SMS confirmation requirements:", {
        userHasPhone: !!userPhone,
        phoneNumber: userPhone
          ? `${userPhone.substring(0, 3)}***${userPhone.substring(
              userPhone.length - 4
            )}`
          : "N/A",
        isValidPhone: userPhone
          ? BookingSMSService.validatePhoneNumber(userPhone)
          : false,
        bookingId: insertedBooking?.id?.toString() || "Unknown",
      });

      if (userPhone && BookingSMSService.validatePhoneNumber(userPhone)) {
        try {
          const smsDetails = {
            date: selectedDate,
            time: `${selectedSlot.start_time} - ${selectedSlot.end_time}`,
            service: serviceNames.join(", "),
            professional:
              selectedProfessional === "prof1" ? "Person 1" : "Person 2",
            location: selectedLocation,
            bookingId: insertedBooking?.id?.toString() || "Unknown",
          };

          console.log("📱 Initiating SMS booking confirmation...", {
            recipient: `${userPhone.substring(0, 3)}***${userPhone.substring(
              userPhone.length - 4
            )}`,
            ...smsDetails,
          });

          const smsResult = await BookingSMSService.sendBookingConfirmation(
            userPhone,
            smsDetails
          );

          console.log("✅ SMS booking confirmation completed successfully:", {
            messageId: smsResult.messageId,
            success: smsResult.success,
            cost: smsResult.cost,
            currency: smsResult.currency,
            bookingId: smsDetails.bookingId,
          });
        } catch (smsError) {
          console.error("❌ SMS booking confirmation failed:", {
            error:
              smsError instanceof Error ? smsError.message : String(smsError),
            bookingId: insertedBooking?.id?.toString() || "Unknown",
            phoneNumber: `${userPhone.substring(0, 3)}***${userPhone.substring(
              userPhone.length - 4
            )}`,
          });
          // Don't fail the booking if SMS fails - log for admin review
        }
      } else {
        console.log("📱 SMS confirmation skipped:", {
          reason: !userPhone
            ? "No phone number provided"
            : "Invalid phone number format",
          phoneNumber: userPhone || "Not provided",
          bookingId: insertedBooking?.id?.toString() || "Unknown",
        });
      }

      console.log("Booking payload:", {
        email: user?.email,
        name: user?.user_metadata?.full_name || "Customer",
        bookingDate: selectedDate,
        startTime: selectedSlot?.start_time,
        endTime: selectedSlot?.end_time,
        location: selectedLocation,
        services: selectedServices,
        professional: selectedProfessional,
      });
      try {
        const response = await fetch(
          "https://qrvxmqksekxbtipdnfru.supabase.co/functions/v1/send_booking_email",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization:
                "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFydnhtcWtzZWt4YnRpcGRuZnJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0MTI5MjMsImV4cCI6MjA3MTk4ODkyM30._BiC3KYWKR5HTz7osjHxxwA-mdHIy867IelMbHvsEPc",
            },
            body: JSON.stringify({
              email: user?.email,
              name: user?.user_metadata?.full_name || "Customer",
              bookingDate: selectedDate,
              startTime: selectedSlot.start_time,
              endTime: selectedSlot.end_time,
              location: selectedLocation,
              services: serviceNames,
              professional: selectedProfessional,
            }),
          }
        );

        const result = await response.json();
        if (result.success) {
          console.log("Booking confirmation email sent:", result.data.id);
        } else {
          console.error("Failed to send confirmation email:", result.error);
        }
      } catch (err) {
        console.error("Error calling Edge Function:", err);
      }
    }
  };

  // All booking state is managed by Redux. No local booking state remains.

  // Render different pages based on currentPage
  const renderPage = () => {
    switch (currentPage) {
      case "info":
        return <InfoPage />;

      case "qr":
        return (
          <Box sx={{ padding: 4, textAlign: "center" }}>
            <h2>QR Code Page</h2>

            <Box textAlign="center" mt={3}>
              <Box
                component="img"
                src="/qr.png"
                alt="qr"
                sx={{
                  width: "20%",
                  maxHeight: 700,
                  objectFit: "cover",
                  borderRadius: 2,
                }}
              />
            </Box>
          </Box>
        );

      case "account":
        return (
          <Box sx={{ padding: 4, textAlign: "center" }}>
            {!isLoggedIn ? (
              <>
                <h2>User Account</h2>
                <p>Please login to view your account</p>
                <Button
                  variant="contained"
                  onClick={() => setShowLoginModal(true)}
                  sx={{ mt: 2 }}
                >
                  Login
                </Button>
              </>
            ) : (
              <UserAccountPage />
            )}
          </Box>
        );

      case "booking":

      // eslint-disable-next-line no-fallthrough
      default:
        return (
          <div style={{ textAlign: "center", marginTop: "50px" }}>
            {/* <h2>Customer Panel</h2> */}

            {/* Reset button - visible at all steps */}
            {currentStep > 1 && (
              <Box sx={{ display: "flex", justifyContent: "flex-end", px: 3, mb: 2 }}>
                <Button
                  onClick={handleResetBooking}
                  size="small"
                  variant="outlined"
                  color="warning"
                  sx={{ fontSize: "0.75rem" }}
                >
                  Start Over
                </Button>
              </Box>
            )}

            {currentStep > 1 && (
              <NavigationComponent
                currentStep={currentStep}
                totalSteps={totalSteps}
                onPreviousStep={() => dispatch(setCurrentStep(currentStep - 1))}
                onNextStep={handleNextStep}
                canProceedNext={canProceedNext()}
              />
            )}

            {currentStep === 1 && (
              <LocationStep
                selectedLocation={selectedLocation}
                onLocationSelect={handleLocationSelect}
              />
            )}

            {currentStep === 2 && (
              <ServicesStep
                selectedServices={selectedServices}
                onServiceToggle={handleServiceToggle}
              />
            )}

            {currentStep === 3 && (
              <ProfessionalStep
                selectedProfessional={selectedProfessional}
                onProfessionalSelect={handleProfessionalSelect}
              />
            )}

            {currentStep === 4 && (
              <div>
                <h3>
                  Select a Date for{" "}
                  {selectedProfessional === "prof1" ? "Person 1" : "Person 2"}
                </h3>

                {availableDates.length === 0 ? (
                  <Box
                    sx={{
                      padding: 4,
                      backgroundColor: colors.background.card,
                      border: `2px solid ${colors.border.main}`,
                      borderRadius: 2,
                      margin: 2,
                    }}
                  >
                    <h4 style={{ color: colors.text.primary }}>
                      No Available Dates
                    </h4>
                    <p style={{ color: colors.text.secondary }}>
                      This professional has no available dates. Either all dates
                      are booked or the admin hasn't set any availability yet.
                    </p>
                    <p style={{ color: colors.text.secondary }}>
                      Please go back and select a different professional.
                    </p>
                  </Box>
                ) : (
                  <>
                    <p>Choose an available date for your appointment:</p>
                    <BigCalendar
                      selectedDates={[selectedDate]}
                      setSelectedDates={(dates: string[]) =>
                        dispatch(
                          setUserSelections({
                            selectedLocation: userSelections?.selectedLocation ?? null,
                            selectedServices: userSelections?.selectedServices ?? [],
                            selectedProfessional: userSelections?.selectedProfessional ?? null,
                            selectedDate: dates[0] || "",
                            selectedSlot: userSelections?.selectedSlot ?? null,
                            serviceDuration: userSelections?.serviceDuration ?? 0,
                          })
                        )
                      }
                      allowedDates={availableDates}
                    />
                    <TimeSlotsStep
                      professionalId={selectedProfessional}
                      selectedDate={selectedDate}
                      serviceDuration={serviceDuration}
                      selectedSlot={selectedSlot}
                      onSlotSelect={(slot) =>
                        dispatch(
                          setUserSelections({
                            selectedLocation: userSelections?.selectedLocation ?? null,
                            selectedServices: userSelections?.selectedServices ?? [],
                            selectedProfessional: userSelections?.selectedProfessional ?? null,
                            selectedDate: userSelections?.selectedDate ?? "",
                            selectedSlot: slot,
                            serviceDuration: userSelections?.serviceDuration ?? 0,
                          })
                        )
                      }
                    />
                    {selectedDate && (
                      <Box
                        sx={{
                          mt: 1,
                          mb: 5,
                          p: 3,
                          backgroundColor: colors.accent.main,
                          borderRadius: 1,
                        }}
                      >
                        <p
                          style={{
                            margin: 0,
                            fontWeight: "bold",
                            color: colors.text.primary,
                          }}
                        >
                          Selected Date: {selectedDate}
                        </p>
                      </Box>
                    )}
                  </>
                )}
              </div>
            )}

            {currentStep === 5 && (
              <div style={{ padding: "40px" }}>
                <h3>Booking Summary</h3>
                <p>
                  Location:{" "}
                  {selectedLocation === "your_place"
                    ? "At Your Place"
                    : "At Our Place"}
                </p>
                <p>Services: {selectedServices.length} selected</p>
                <p>
                  Professional:{" "}
                  {selectedProfessional === "prof1"
                    ? "Person 1"
                    : selectedProfessional === "prof2"
                    ? "Person 2"
                    : selectedProfessional}
                </p>
                <p>Date: {selectedDate}</p>
                {selectedSlot && (
                  <p>
                    Time: {selectedSlot.start_time.substring(0, 5)} -{" "}
                    {selectedSlot.end_time.substring(0, 5)}
                  </p>
                )}
                <Button
                  onClick={handleCompleteBooking}
                  variant="contained"
                  sx={{
                    mt: 2,
                    px: 3,
                    backgroundColor: colors.accent.main,
                    "&:hover": { backgroundColor: colors.accent.hover },
                  }}
                >
                  Confirm Booking
                </Button>
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div
      style={{
        width: "100%",
        minHeight: "100vh",
        margin: 0,
        padding: 0,
        backgroundColor: colors.background.dark,
      }}
    >
      {/* Login Modal - Always available, controlled by showLoginModal state */}
      <LoginModal
        open={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />

      {/* Hero Navigation - Always visible at top */}
      <Hero
        onBookingClick={() => {
          setCurrentPage("booking");
          setCurrentStep(1);
        }}
        onInfoClick={() => setCurrentPage("info")}
        onQRClick={() => setCurrentPage("qr")}
        onAccountClick={() => setCurrentPage("account")}
        //onExitClick={() => setShowLogoutDialog(true)}
        isLoggedIn={isLoggedIn}
        currentPage={currentPage}
      />
      <div style={{ width: "100%" }}>
        {/* Render the selected page below the Hero */}
        {renderPage()}
        <Link to="/"></Link>
      </div>
    </div>
  );
}
