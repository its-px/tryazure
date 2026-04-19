/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { setCurrentStep, setUserSelections } from "../../slices/appSlice";
import type { RootState } from "../../configureStore";
import { supabase } from "../components/supabaseClient";
import { useResolvedColors } from "../../hooks/useResolvedColors";
import { useTenantContext } from "../../context/useTenantContext";
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
import {
  fetchProfessionals,
  getProfessionalNameByCode,
  type ProfessionalOption,
} from "../components/professionalsService";
import BookingSMSService from "../components/BookingSMSService";

export default function UserPanel() {
  const colors = useResolvedColors();
  const { tenant } = useTenantContext();
  // Page navigation
  const [currentPage, setCurrentPage] = React.useState<
    "booking" | "info" | "qr" | "account"
  >("booking");

  // Booking states
  const [availableDates, setAvailableDates] = React.useState<string[]>([]);
  const [showLoginModal, setShowLoginModal] = React.useState(false);
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);
  const [services, setServices] = React.useState<Service[]>([]);
  const [professionals, setProfessionals] = React.useState<
    ProfessionalOption[]
  >([]);

  const dispatch = useDispatch();
  const currentStep =
    useSelector((state: RootState) => state.app.currentStep) ?? 1;
  const userSelections = useSelector(
    (state: RootState) => state.app.userSelections,
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
    const hasSelections =
      selectedLocation || selectedServices.length > 0 || selectedProfessional;

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

  // Load services from database once tenant is ready
  useEffect(() => {
    let isMounted = true;

    const loadServices = async () => {
      // Only load if tenant is actually available (not just loading)
      if (!tenant?.id) {
        console.log("[UserPanel] Tenant not ready yet, skipping service load");
        return;
      }

      try {
        console.log("[UserPanel] Loading services for tenant:", tenant.id);
        // Verify tenant context is set on the server by checking current_setting
        // This ensures set_current_tenant RPC has completed
        const testQuery = await supabase.rpc("get_current_tenant_id").single();

        if (testQuery.error) {
          console.warn(
            "[UserPanel] Could not verify tenant context:",
            testQuery.error,
          );
        } else {
          console.log(
            "[UserPanel] Server tenant context verified:",
            testQuery.data,
          );
        }

        // Now fetch services - REST API will use the tenant_id filter
        const data = await fetchServices(tenant.id);
        if (isMounted) {
          console.log(
            "[UserPanel] Services loaded for tenant:",
            data.length,
            "services",
          );
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
  }, [tenant?.id]);

  // Load professionals scoped to current tenant
  useEffect(() => {
    let isMounted = true;

    const loadProfessionals = async () => {
      if (!tenant?.id) return;

      try {
        const data = await fetchProfessionals(tenant.id);
        if (isMounted) {
          setProfessionals(data);

          // Reset selected professional if it no longer exists in this tenant.
          if (
            selectedProfessional &&
            !data.some((p) => p.code === selectedProfessional)
          ) {
            dispatch(
              setUserSelections({
                selectedLocation: null,
                selectedServices: [],
                selectedProfessional: null,
                selectedDate: "",
                selectedSlot: null,
                serviceDuration: 0,
              }),
            );
          }
        }
      } catch (err) {
        console.error("[UserPanel] Error loading professionals:", err);
      }
    };

    loadProfessionals();

    return () => {
      isMounted = false;
    };
  }, [tenant?.id, dispatch, selectedProfessional]);

  const getProfessionalName = (code: string | null | undefined) =>
    getProfessionalNameByCode(professionals, code);

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
        console.log(
          "[loadAvailableDates] Starting, professional:",
          selectedProfessional,
        );

        // Get token from localStorage
        const storageKey = "sb-auth-token";
        let token = null;
        try {
          const storedSession = localStorage.getItem(storageKey);
          if (storedSession) {
            const parsed = JSON.parse(storedSession);
            token = parsed?.access_token;
          }
        } catch (err) {
          console.error("[loadAvailableDates] Error reading token:", err);
        }

        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        const headers: Record<string, string> = {
          apikey: supabaseKey,
          "Content-Type": "application/json",
        };

        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        if (!tenant?.id) {
          console.log("[loadAvailableDates] Tenant not ready yet");
          setAvailableDates([]);
          return;
        }

        if (!selectedProfessional) {
          console.log(
            "[loadAvailableDates] No professional selected, loading all dates",
          );
          const response = await fetch(
            `${supabaseUrl}/rest/v1/availability?tenant_id=eq.${tenant.id}&select=date`,
            {
              headers,
            },
          );

          if (!isMounted) return;

          if (!response.ok) {
            console.error(
              "[loadAvailableDates] Error fetching dates:",
              response.statusText,
            );
            setAvailableDates([]);
          } else {
            const data = await response.json();
            console.log("[loadAvailableDates] Dates loaded:", data?.length);
            setAvailableDates(data?.map((d: any) => d.date) || []);
          }
          return;
        }

        console.log("[loadAvailableDates] Loading shop dates...");
        const shopResponse = await fetch(
          `${supabaseUrl}/rest/v1/availability?tenant_id=eq.${tenant.id}&select=date`,
          {
            headers,
          },
        );

        const shopDates = shopResponse.ok ? await shopResponse.json() : null;

        if (!isMounted) return;

        if (!shopDates || shopDates.length === 0) {
          console.error("[loadAvailableDates] No shop dates available");
          setAvailableDates([]);
          return;
        }

        console.log(
          "[loadAvailableDates] Shop dates loaded:",
          shopDates.length,
        );

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
            //console.log("[loadAvailableDates] Checking slots for date:", date);
            const slotsResponse = await fetch(
              `${supabaseUrl}/rest/v1/rpc/get_available_slots`,
              {
                method: "POST",
                headers,
                body: JSON.stringify({
                  p_professional_id: selectedProfessional,
                  p_date: date,
                  p_service_duration_minutes: checkDuration,
                  p_tenant_id: tenant.id,
                }),
              },
            );

            if (slotsResponse.ok) {
              const slots = await slotsResponse.json();
              if (slots && slots.length > 0) {
                datesWithSlots.push(date);
              }
            } else {
              console.error(
                "[loadAvailableDates] Error checking slots for",
                date,
                ":",
                slotsResponse.statusText,
              );
            }
          } catch (err) {
            console.error(
              "[loadAvailableDates] Exception checking slots for date:",
              date,
              err,
            );
          }
        }

        console.log(
          "[loadAvailableDates] Dates with slots:",
          datesWithSlots.length,
        );

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
  }, [selectedProfessional, serviceDuration, tenant?.id]);

  // Reset booking state and clear localStorage

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
      0,
    );
    dispatch(
      setUserSelections({
        selectedLocation: userSelections?.selectedLocation ?? null,
        selectedServices: newSelectedServices,
        selectedProfessional: userSelections?.selectedProfessional ?? null,
        selectedDate: userSelections?.selectedDate ?? "",
        selectedSlot: userSelections?.selectedSlot ?? null,
        serviceDuration: totalDuration,
      }),
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
  // Check auth state from localStorage (bypass hanging Supabase client)
  useEffect(() => {
    let isMounted = true;

    const checkAuth = () => {
      console.log("[UserPanel] Checking auth from localStorage...");
      try {
        const storedSession = localStorage.getItem("sb-auth-token");
        if (storedSession) {
          const session = JSON.parse(storedSession);
          // Check if session is expired
          const now = Math.floor(Date.now() / 1000);
          if (session.expires_at && session.expires_at > now && session.user) {
            console.log(
              "[UserPanel] Found valid session for user:",
              session.user.id,
            );
            if (isMounted) {
              setIsLoggedIn(true);
              setShowLoginModal(false);
              // Check upcoming appointments
              checkUpcomingAppointments(session.user.id).catch((err) => {
                console.error("Error checking appointments:", err);
              });
            }
          } else {
            console.log("[UserPanel] Session expired or invalid");
            if (isMounted) setIsLoggedIn(false);
          }
        } else {
          console.log("[UserPanel] No session in localStorage");
          if (isMounted) setIsLoggedIn(false);
        }
      } catch (err) {
        console.error("[UserPanel] Error checking auth:", err);
        if (isMounted) setIsLoggedIn(false);
      }
    };

    // Check auth immediately
    checkAuth();

    // Listen for storage changes (sign-in/sign-out from other components)
    const handleStorageChange = () => {
      console.log("[UserPanel] Storage changed, rechecking auth...");
      checkAuth();
    };

    window.addEventListener("storage", handleStorageChange);

    // Also poll periodically in case storage event doesn't fire
    //const pollInterval = setInterval(checkAuth, 2000);

    return () => {
      isMounted = false;
      window.removeEventListener("storage", handleStorageChange);
      //clearInterval(pollInterval);
    };
  }, []); // Only run once on mount

  const handleProfessionalSelect = (professionalId: string) => {
    dispatch(
      setUserSelections({
        selectedLocation: userSelections?.selectedLocation ?? null,
        selectedServices: userSelections?.selectedServices ?? [],
        selectedProfessional: professionalId,
        selectedDate: "",
        selectedSlot: null,
        serviceDuration: userSelections?.serviceDuration ?? 0,
      }),
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
      }),
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

    // Get session from localStorage
    const storedSession = localStorage.getItem("sb-auth-token");
    if (!storedSession) {
      setShowLoginModal(true);
      alert("Please login to complete your booking");
      return;
    }

    const session = JSON.parse(storedSession);
    const user = session?.user;

    if (!user) {
      setShowLoginModal(true);
      alert("Please login to complete your booking");
      return;
    }

    if (!tenant?.id) {
      alert("Tenant not loaded yet. Please refresh and try again.");
      return;
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    const headers = {
      apikey: supabaseKey,
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    };

    // Check for overlapping time slots using direct REST API
    try {
      const checkResponse = await fetch(
        `${supabaseUrl}/rest/v1/bookings?professional_id=eq.${selectedProfessional}&date=eq.${selectedDate}&tenant_id=eq.${tenant.id}&select=id,start_time,end_time`,
        {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${session.access_token}`,
          },
        },
      );

      if (!checkResponse.ok) {
        console.error("Error checking booking:", checkResponse.statusText);
        alert("Error checking availability");
        return;
      }

      const conflictingBookings = await checkResponse.json();

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
            "❌ This time slot is already booked. Please select a different time slot.",
          );
          return;
        }
      }
    } catch (checkError) {
      console.error("Error checking for conflicts:", checkError);
      alert("Error checking availability. Please try again.");
      return;
    }

    const bookingData = {
      user_id: user.id,
      tenant_id: tenant.id,
      date: selectedDate,
      location: selectedLocation,
      services: JSON.stringify(selectedServices),
      professional_id: selectedProfessional,
      start_time: selectedSlot.start_time,
      end_time: selectedSlot.end_time,
    };

    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/bookings`, {
        method: "POST",
        headers,
        body: JSON.stringify(bookingData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Booking error:", errorText);
        if (errorText.includes("23505") || errorText.includes("duplicate")) {
          alert("❌ This professional is already booked on this date!");
        } else {
          alert("❌ Error creating booking: " + errorText);
        }
        return;
      }

      const insertedBookings = await response.json();
      const insertedBooking = insertedBookings?.[0];

      // IMPORTANT: Capture values BEFORE clearing state for email/SMS sending
      const capturedUser = user; // Capture user object
      const capturedDate = selectedDate;
      const capturedSlot = selectedSlot;
      const capturedLocation = selectedLocation;
      const capturedProfessional = selectedProfessional;
      const capturedServices = selectedServices;
      const serviceNames = selectedServices.map((id) => {
        const s = services.find((s) => s.id === id);
        return s?.name || id; // fallback to id if not found
      });

      // Get user email - handle both object and string cases
      const userEmail =
        typeof capturedUser === "string" ? capturedUser : capturedUser?.email;

      console.log("📋 Captured booking data:", {
        user: userEmail,
        userType: typeof capturedUser,
        date: capturedDate,
        slot: `${capturedSlot?.start_time} - ${capturedSlot?.end_time}`,
        location: capturedLocation,
        professional: capturedProfessional,
        services: serviceNames,
      });

      alert("✅ Booking confirmed successfully!");

      // Show notification with captured values - run in background, don't block email
      // Use setTimeout to make it non-blocking
      setTimeout(async () => {
        try {
          await showBookingNotification({
            date: capturedDate,
            services: capturedServices,
            id: insertedBooking?.id || Date.now(),
          });
          console.log("✅ Browser notification sent");
        } catch (notifError) {
          console.error("❌ Notification error:", notifError);
        }
      }, 0);

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
        }),
      );
      localStorage.removeItem("bookingState");

      // If on account page, refresh it by toggling the key
      if (currentPage === "account") {
        // Force UserAccountPage to refresh by changing key
        setCurrentPage("booking");
        setTimeout(() => setCurrentPage("account"), 100);
      }

      // Get phone number from profiles table (with timeout to prevent hanging)
      let userPhone: string | null = null;
      const userId = typeof capturedUser === "object" ? capturedUser?.id : null;

      console.log("🔍 Step 1: About to fetch phone number for user:", userId);

      if (userId) {
        try {
          // Add 5 second timeout for phone lookup
          const phonePromise = supabase
            .from("profiles")
            .select("phone")
            .eq("id", userId)
            .single();

          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Phone lookup timeout")), 5000),
          );

          const { data: profile, error: profileError } = (await Promise.race([
            phonePromise,
            timeoutPromise,
          ])) as { data: { phone: string } | null; error: Error | null };

          if (profileError) {
            console.warn(
              "Could not read phone from profiles table:",
              profileError.message,
            );
          } else if (profile?.phone) {
            userPhone = profile.phone;
            const masked = `${profile.phone.substring(
              0,
              3,
            )}***${profile.phone.substring(profile.phone.length - 4)}`;
            console.log(
              "Found phone in profiles table for user (masked):",
              masked,
            );
          }
        } catch (err) {
          console.error("Error querying profiles for phone:", err);
          // Continue without phone - don't block email
        }
      } else {
        console.log("🔍 No user ID found, skipping phone lookup");
      }

      console.log("🔍 Step 2: Phone lookup complete. Moving to SMS check...");

      console.log("🔍 Checking for SMS confirmation requirements:", {
        userHasPhone: !!userPhone,
        phoneNumber: userPhone
          ? `${userPhone.substring(0, 3)}***${userPhone.substring(
              userPhone.length - 4,
            )}`
          : "N/A",
        isValidPhone: userPhone
          ? BookingSMSService.validatePhoneNumber(userPhone)
          : false,
        bookingId: insertedBooking?.id?.toString() || "Unknown",
      });

      // Run SMS in background with timeout - don't block email
      if (userPhone && BookingSMSService.validatePhoneNumber(userPhone)) {
        const smsDetails = {
          date: capturedDate,
          time: `${capturedSlot.start_time} - ${capturedSlot.end_time}`,
          service: serviceNames.join(", "),
          professional: getProfessionalName(capturedProfessional),
          location: capturedLocation,
          bookingId: insertedBooking?.id?.toString() || "Unknown",
        };

        // Run SMS async with timeout - don't await, don't block email
        (async () => {
          try {
            console.log("📱 Initiating SMS booking confirmation...", {
              recipient: `${userPhone.substring(0, 3)}***${userPhone.substring(
                userPhone.length - 4,
              )}`,
              ...smsDetails,
            });

            const smsPromise = BookingSMSService.sendBookingConfirmation(
              userPhone,
              smsDetails,
            );

            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error("SMS timeout")), 10000),
            );

            const smsResult = (await Promise.race([
              smsPromise,
              timeoutPromise,
            ])) as {
              messageId: string;
              success: boolean;
              cost: string;
              currency: string;
            };

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
            });
          }
        })();
      } else {
        console.log("📱 SMS confirmation skipped:", {
          reason: !userPhone
            ? "No phone number provided"
            : "Invalid phone number format",
          phoneNumber: userPhone || "Not provided",
          bookingId: insertedBooking?.id?.toString() || "Unknown",
        });
      }

      console.log("🔍 Step 3: SMS section complete. Starting email section...");

      // Send booking confirmation email
      console.log("📧 Preparing to send booking email...");
      console.log("📧 Email validation:", {
        hasUser: !!capturedUser,
        userEmail: userEmail,
        userType: typeof capturedUser,
        hasSlot: !!capturedSlot,
        hasStartTime: !!capturedSlot?.start_time,
        hasEndTime: !!capturedSlot?.end_time,
      });

      if (!userEmail) {
        console.error("❌ Cannot send email: user email is missing", {
          user: capturedUser,
          userEmail,
        });
      } else if (!capturedSlot?.start_time || !capturedSlot?.end_time) {
        console.error("❌ Cannot send email: time slot is missing", {
          slot: capturedSlot,
        });
      } else {
        const userName =
          typeof capturedUser === "object"
            ? capturedUser?.user_metadata?.full_name
            : null;
        const emailPayload = {
          email: userEmail,
          name: userName || "Customer",
          bookingDate: capturedDate,
          startTime: capturedSlot.start_time,
          endTime: capturedSlot.end_time,
          location: capturedLocation,
          services: serviceNames,
          professional: capturedProfessional,
        };

        console.log("📧 Email payload:", emailPayload);

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
              body: JSON.stringify(emailPayload),
            },
          );

          const result = await response.json();
          if (result.success) {
            console.log(
              "✅ Booking confirmation email sent successfully!",
              result.data?.id,
            );
          } else {
            console.error("❌ Email API returned error:", result.error);
            alert(
              "⚠️ Booking confirmed but email notification failed. Please check your email settings.",
            );
          }
        } catch (err) {
          console.error("❌ Exception calling email Edge Function:", err);
          alert(
            "⚠️ Booking confirmed but email notification failed. Please check your email settings.",
          );
        }
      }

      console.log("🔍 Step 4: Email section complete. Booking flow finished!");
    } catch (bookingError) {
      console.error("Overall booking error:", bookingError);
      alert("❌ Error creating booking. Please try again.");
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
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "flex-end",
                  px: 3,
                  mb: 2,
                }}
              >
                {/* <Button
                  onClick={handleResetBooking}
                  size="small"
                  variant="outlined"
                  color="warning"
                  sx={{ fontSize: "0.75rem" }}
                >
                  Start Over
                </Button> */}
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
                professionals={professionals}
              />
            )}

            {currentStep === 4 && (
              <div>
                <h3>
                  Select a Date for {getProfessionalName(selectedProfessional)}
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
                            selectedLocation:
                              userSelections?.selectedLocation ?? null,
                            selectedServices:
                              userSelections?.selectedServices ?? [],
                            selectedProfessional:
                              userSelections?.selectedProfessional ?? null,
                            selectedDate: dates[0] || "",
                            selectedSlot: userSelections?.selectedSlot ?? null,
                            serviceDuration:
                              userSelections?.serviceDuration ?? 0,
                          }),
                        )
                      }
                      allowedDates={availableDates}
                    />
                    <TimeSlotsStep
                      professionalId={selectedProfessional}
                      tenantId={tenant?.id ?? null}
                      selectedDate={selectedDate}
                      serviceDuration={serviceDuration}
                      selectedSlot={selectedSlot}
                      onSlotSelect={(slot) =>
                        dispatch(
                          setUserSelections({
                            selectedLocation:
                              userSelections?.selectedLocation ?? null,
                            selectedServices:
                              userSelections?.selectedServices ?? [],
                            selectedProfessional:
                              userSelections?.selectedProfessional ?? null,
                            selectedDate: userSelections?.selectedDate ?? "",
                            selectedSlot: slot,
                            serviceDuration:
                              userSelections?.serviceDuration ?? 0,
                          }),
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
                <p>Professional: {getProfessionalName(selectedProfessional)}</p>
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
