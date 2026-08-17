/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
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
import { Link, useSearchParams } from "react-router-dom";
import {
  showBookingNotification,
  checkUpcomingAppointments,
} from "../../notifications";
import TimeSlotsStep from "../components/TimeSlotsStep";
import { fetchServices, type Service } from "../components/servicesService";
import { fetchProducts, type Product } from "../components/productsService";
import {
  fetchProfessionals,
  getProfessionalNameByCode,
  type ProfessionalOption,
} from "../components/professionalsService";
import BookingSMSService from "../components/BookingSMSService";

// Furthest step reachable given selections made so far — used to stop
// someone deep-linking (or hitting Back/Forward into) a step whose
// prerequisites aren't met, e.g. ?step=4 with no service selected.
function maxReachableStepFor(sel: {
  selectedLocation: unknown;
  selectedServices: unknown[];
  selectedProfessional: unknown;
  selectedDate: string;
  selectedSlot: unknown;
}) {
  if (!sel.selectedLocation) return 1;
  if (!(Array.isArray(sel.selectedServices) && sel.selectedServices.length > 0))
    return 2;
  // Step 3 (professional) is always satisfied — null means "any professional".
  if (!(sel.selectedDate && sel.selectedSlot)) return 4;
  return 5;
}

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
  // Retail add-ons: picked on the summary step, not part of Redux
  // userSelections since (unlike service/professional/time) they don't
  // gate step progression and don't need to survive the login redirect.
  const [products, setProducts] = React.useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = React.useState<
    Record<string, number>
  >({});

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
  const locationStepEnabled = tenant?.config?.locationStepEnabled !== false;
  const prefersReducedMotion = useReducedMotion();
  const previousStepRef = React.useRef(currentStep);
  const [stepDirection, setStepDirection] = React.useState<1 | -1>(1);
  // Set when we open the login modal to gate step 4 -> 5, so we can resume
  // the flow once the user logs in instead of stranding them on the time step.
  const awaitingLoginRef = React.useRef(false);

  // URL step tracking so browser Back/Forward moves between wizard steps.
  // localStorage (below) already covers refresh-recovery of selections; this
  // only mirrors currentStep into ?step= so history entries exist per step.
  const [searchParams, setSearchParams] = useSearchParams();
  const goToStep = React.useCallback(
    (step: number, options?: { push?: boolean }) => {
      const push = options?.push ?? true;
      dispatch(setCurrentStep(step));
      const params = new URLSearchParams(searchParams);
      params.set("step", String(step));
      setSearchParams(params, { replace: !push });
    },
    [dispatch, searchParams, setSearchParams],
  );

  // When the tenant disables the location step, skip it: default the
  // location and jump straight to step 2 so canProceedNext()/booking
  // submission (which requires selectedLocation) keep working unchanged.
  useEffect(() => {
    if (!locationStepEnabled && currentStep <= 1) {
      if (selectedLocation === null) {
        dispatch(
          setUserSelections({
            selectedLocation: "our_place",
            selectedServices: userSelections?.selectedServices ?? [],
            selectedProfessional: userSelections?.selectedProfessional ?? null,
            selectedDate: userSelections?.selectedDate ?? "",
            selectedSlot: userSelections?.selectedSlot ?? null,
            serviceDuration: userSelections?.serviceDuration ?? 0,
          }),
        );
      }
      goToStep(2, { push: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationStepEnabled, currentStep]);

  useEffect(() => {
    if (currentStep !== previousStepRef.current) {
      setStepDirection(currentStep > previousStepRef.current ? 1 : -1);
      previousStepRef.current = currentStep;
    }
  }, [currentStep]);

  const stepVariants = {
    initial: (direction: 1 | -1) => ({
      opacity: 0,
      y: prefersReducedMotion ? 0 : direction > 0 ? 12 : -12,
    }),
    animate: {
      opacity: 1,
      y: 0,
    },
    exit: (direction: 1 | -1) => ({
      opacity: 0,
      y: prefersReducedMotion ? 0 : direction > 0 ? -8 : 8,
    }),
  };

  const stepTransition = {
    duration: prefersReducedMotion ? 0.08 : 0.26,
    ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
  };

  const pageVariants = {
    initial: {
      opacity: 0,
      y: prefersReducedMotion ? 0 : 12,
    },
    animate: {
      opacity: 1,
      y: 0,
    },
    exit: {
      opacity: 0,
      y: prefersReducedMotion ? 0 : -8,
    },
  };

  const pageTransition = {
    duration: prefersReducedMotion ? 0.08 : 0.28,
    ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
  };

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

  // Restore an in-progress booking after a full-page reload. Google login does
  // a full OAuth redirect that wipes Redux, so without this the user loses all
  // their selections. Runs once on mount.
  useEffect(() => {
    try {
      const saved = localStorage.getItem("bookingState");
      if (!saved) return;
      const s = JSON.parse(saved);
      // Expire stale drafts after 1 hour.
      if (!s.timestamp || Date.now() - s.timestamp > 60 * 60 * 1000) {
        localStorage.removeItem("bookingState");
        return;
      }
      dispatch(
        setUserSelections({
          selectedLocation: s.selectedLocation ?? null,
          selectedServices: s.selectedServices ?? [],
          selectedProfessional: s.selectedProfessional ?? null,
          selectedDate: s.selectedDate ?? "",
          selectedSlot: s.selectedSlot ?? null,
          serviceDuration: s.serviceDuration ?? 0,
        }),
      );

      // If we left for login from the step-4 gate and now have a session,
      // resume at the summary step instead of the time picker.
      const resume = localStorage.getItem("resumeBookingAfterLogin");
      localStorage.removeItem("resumeBookingAfterLogin");
      let hasSession = false;
      try {
        const sess = JSON.parse(localStorage.getItem("sb-auth-token") || "null");
        hasSession = !!(
          sess?.user && sess.expires_at > Math.floor(Date.now() / 1000)
        );
      } catch {
        /* ignore malformed session */
      }

      const localStep = resume && hasSession ? 5 : (s.currentStep ?? 1);
      // A ?step= in the URL (deep link, or a reload while parked mid-wizard)
      // wins over the localStorage step, but only up to what's reachable.
      const urlStepRaw = Number(searchParams.get("step"));
      const finalStep =
        urlStepRaw >= 1 && urlStepRaw <= totalSteps
          ? Math.min(urlStepRaw, maxReachableStepFor(s))
          : localStep;
      goToStep(finalStep, { push: false });
    } catch {
      /* ignore malformed draft */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync currentStep FROM the URL — handles the browser's native Back/Forward,
  // which changes ?step= without going through goToStep/dispatch.
  useEffect(() => {
    const raw = searchParams.get("step");
    if (!raw) return;
    const urlStep = Number(raw);
    if (!Number.isFinite(urlStep) || urlStep === currentStep) return;
    const maxReachable = maxReachableStepFor({
      selectedLocation,
      selectedServices,
      selectedProfessional,
      selectedDate,
      selectedSlot,
    });
    const target = Math.min(Math.max(urlStep, 1), maxReachable);
    if (target !== urlStep) {
      const params = new URLSearchParams(searchParams);
      params.set("step", String(target));
      setSearchParams(params, { replace: true });
    }
    if (target !== currentStep) {
      dispatch(setCurrentStep(target));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

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

  // Load retail add-on products scoped to current tenant
  useEffect(() => {
    let isMounted = true;
    if (!tenant?.id) return;
    fetchProducts(tenant.id).then((data) => {
      if (isMounted) setProducts(data);
    });
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
    code === null ? "Any professional" : getProfessionalNameByCode(professionals, code);

  // Deep-link pre-fill: ?service_ids=a,b&worker_id=c lets marketing links
  // (SMS/email/social) jump straight to a pre-selected service+professional
  // instead of starting the wizard from scratch. Param names match the
  // competitor site's (Datelly) convention. Runs once services/professionals
  // are loaded, only if the user hasn't already made selections.
  const appliedDeepLinkRef = React.useRef(false);
  useEffect(() => {
    if (appliedDeepLinkRef.current) return;
    if (services.length === 0 && professionals.length === 0) return;
    const serviceIdsParam = searchParams.get("service_ids");
    const workerIdParam = searchParams.get("worker_id");
    if (!serviceIdsParam && !workerIdParam) return;
    appliedDeepLinkRef.current = true;

    const requestedServiceIds = serviceIdsParam
      ? serviceIdsParam.split(",").map((id) => id.trim()).filter(Boolean)
      : [];
    const validServiceIds = requestedServiceIds.filter((id) =>
      services.some((s) => s.id === id),
    );
    const validProfessional =
      workerIdParam && professionals.some((p) => p.code === workerIdParam)
        ? workerIdParam
        : null;

    if (validServiceIds.length === 0 && !validProfessional) return;

    const totalDuration = validServiceIds.reduce((sum, id) => {
      const service = services.find((s) => s.id === id);
      return sum + (service?.duration_minutes || 0);
    }, 0);

    dispatch(
      setUserSelections({
        selectedLocation: userSelections?.selectedLocation ?? null,
        selectedServices: validServiceIds,
        selectedProfessional: validProfessional,
        selectedDate: "",
        selectedSlot: null,
        serviceDuration: totalDuration,
      }),
    );

    // Jump to the furthest step the deep link actually satisfies: professional
    // step if only a service was given, time step if both were given.
    if (validServiceIds.length > 0 && validProfessional) {
      goToStep(4, { push: false });
    } else if (validServiceIds.length > 0) {
      goToStep(3, { push: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [services, professionals]);

  // One-tap rebooking: ?autobook_token=... from an SMS "book again" link.
  // Looks up the ORIGINAL booking server-side (RLS blocks a plain client
  // select by token), then pre-fills service/professional/location only —
  // never date/time, which must be freshly checked for availability. Login
  // is still required to actually complete the booking (unchanged gate at
  // step 4→5). An invalid/expired token is ignored silently.
  const appliedAutobookRef = React.useRef(false);
  useEffect(() => {
    if (appliedAutobookRef.current) return;
    if (services.length === 0) return;
    const autobookToken = searchParams.get("autobook_token");
    if (!autobookToken) return;
    appliedAutobookRef.current = true;

    (async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/autobook-lookup`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({ token: autobookToken }),
          },
        );
        const result = await response.json();
        if (!result.success) return;

        const rawServiceIds: string[] = Array.isArray(result.booking?.services)
          ? result.booking.services
          : typeof result.booking?.services === "string"
            ? JSON.parse(result.booking.services)
            : [];
        const validServiceIds = rawServiceIds.filter((id) =>
          services.some((s) => s.id === id),
        );
        const validProfessional =
          result.booking?.professional_id &&
          professionals.some((p) => p.code === result.booking.professional_id)
            ? result.booking.professional_id
            : null;
        if (validServiceIds.length === 0) return;

        const totalDuration = validServiceIds.reduce((sum, id) => {
          const service = services.find((s) => s.id === id);
          return sum + (service?.duration_minutes || 0);
        }, 0);

        dispatch(
          setUserSelections({
            selectedLocation: result.booking?.location ?? null,
            selectedServices: validServiceIds,
            selectedProfessional: validProfessional,
            selectedDate: "",
            selectedSlot: null,
            serviceDuration: totalDuration,
          }),
        );
        goToStep(4, { push: false });
      } catch (err) {
        console.error("Autobook lookup failed:", err);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [services, professionals]);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const handler = (event: MessageEvent) => {
      if (event.data?.type === "SHOW_ACCOUNT_PAGE") {
        setCurrentPage("account");
      }
    };
    navigator.serviceWorker.addEventListener("message", handler);
    return () => navigator.serviceWorker.removeEventListener("message", handler);
  }, []);

  // Load available dates based on selected professional
  useEffect(() => {
    let isMounted = true;

    const controller = new AbortController();

    const loadAvailableDates = async () => {
      try {
        console.log(
          "[loadAvailableDates] Starting, professional:",
          selectedProfessional,
        );

        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token ?? null;

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

        console.log("[loadAvailableDates] Fetching available dates via RPC...");
        const checkDuration = serviceDuration > 0 ? serviceDuration : 30;

        const datesResponse = await fetch(
          `${supabaseUrl}/rest/v1/rpc/get_available_dates`,
          {
            method: "POST",
            headers,
            signal: controller.signal,
            body: JSON.stringify({
              p_professional_id: selectedProfessional,
              p_tenant_id: tenant.id,
              p_service_duration_minutes: checkDuration,
            }),
          },
        );

        if (!isMounted) return;

        if (!datesResponse.ok) {
          console.error("[loadAvailableDates] RPC error:", datesResponse.statusText);
          setAvailableDates([]);
          return;
        }

        const rows = await datesResponse.json();
        const datesWithSlots = (rows as { date: string }[]).map((r) => r.date);
        console.log("[loadAvailableDates] Dates with slots:", datesWithSlots.length);

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
      controller.abort();
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
      awaitingLoginRef.current = true;
      // Persisted so the resume survives Google's full-page OAuth redirect.
      localStorage.setItem("resumeBookingAfterLogin", "1");
      setShowLoginModal(true);

      return;
    }
    if (canProceedNext()) {
      goToStep(currentStep + 1);
    }
  };

  // After the user logs in from the step-4 gate, resume the flow: advance to
  // the summary step instead of leaving them on the date/time picker.
  useEffect(() => {
    if (isLoggedIn && awaitingLoginRef.current) {
      awaitingLoginRef.current = false;
      localStorage.removeItem("resumeBookingAfterLogin");
      setShowLoginModal(false);
      if (currentStep === 4 && canProceedNext()) {
        goToStep(5);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, currentStep, dispatch]);

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

    // storage events don't fire in the tab that wrote localStorage, so also
    // recheck on Supabase's own auth events (covers sign-in in this tab)
    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      checkAuth();
    });

    return () => {
      isMounted = false;
      window.removeEventListener("storage", handleStorageChange);
      authListener.subscription.unsubscribe();
    };
  }, []); // Only run once on mount

  const handleProfessionalSelect = (professionalId: string | null) => {
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
    goToStep(2);
  };

  const canProceedNext = () => {
    switch (currentStep) {
      case 1:
        return selectedLocation !== null;
      case 2:
        return Array.isArray(selectedServices) && selectedServices.length > 0;
      case 3:
        // ponytail: null now means "any professional" (default), not "unset" —
        // the step is always satisfiable.
        return true;
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
      !Array.isArray(selectedServices) ||
      selectedServices.length === 0 ||
      !selectedSlot
    ) {
      alert("Please complete all steps including selecting a time slot");
      return;
    }
    if (!isLoggedIn) {
      setShowLoginModal(true);

      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    const user = session?.user;

    if (!user) {
      setShowLoginModal(true);
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

    // Check whether a given professional already has an overlapping booking
    // for the selected date/slot, using direct REST API.
    const hasConflict = async (professionalCode: string) => {
      const checkResponse = await fetch(
        `${supabaseUrl}/rest/v1/bookings?professional_id=eq.${professionalCode}&date=eq.${selectedDate}&tenant_id=eq.${tenant.id}&select=id,start_time,end_time`,
        {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${session.access_token}`,
          },
        },
      );

      if (!checkResponse.ok) {
        throw new Error(checkResponse.statusText);
      }

      const conflictingBookings = await checkResponse.json();
      return (conflictingBookings || []).some((booking: any) => {
        // Two time slots overlap if: new_start < existing_end AND new_end > existing_start
        return (
          selectedSlot.start_time < booking.end_time &&
          selectedSlot.end_time > booking.start_time
        );
      });
    };

    let resolvedProfessional = selectedProfessional;

    try {
      if (resolvedProfessional) {
        if (await hasConflict(resolvedProfessional)) {
          alert(
            "This time slot is already booked. Please select a different time slot.",
          );
          return;
        }
      } else {
        // ponytail: "Any professional" — pick the first tenant professional
        // free for this slot. No load-balancing; upgrade to round-robin /
        // least-booked if that matters later.
        for (const p of professionals) {
          if (!(await hasConflict(p.code))) {
            resolvedProfessional = p.code;
            break;
          }
        }
        if (!resolvedProfessional) {
          alert(
            "No professionals are available for this time slot. Please pick a different time.",
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
      professional_id: resolvedProfessional,
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
        if (
          errorText.includes("23505") ||
          errorText.includes("23P01") ||
          errorText.includes("duplicate") ||
          errorText.includes("bookings_no_overlap")
        ) {
          alert("This professional is already booked on this date!");
        } else {
          alert("Error creating booking: " + errorText);
        }
        return;
      }

      const insertedBookings = await response.json();
      const insertedBooking = insertedBookings?.[0];

      // Record any add-on products picked on the summary step. Best-effort:
      // a failure here shouldn't undo the booking itself.
      const productEntries = Object.entries(selectedProducts).filter(
        ([, qty]) => qty > 0,
      );
      if (insertedBooking?.id && productEntries.length > 0) {
        try {
          const rows = productEntries.map(([productId, quantity]) => {
            const product = products.find((p) => p.id === productId);
            return {
              booking_id: insertedBooking.id,
              product_id: productId,
              tenant_id: tenant.id,
              quantity,
              unit_price: product?.price ?? 0,
            };
          });
          await fetch(`${supabaseUrl}/rest/v1/booking_products`, {
            method: "POST",
            headers,
            body: JSON.stringify(rows),
          });
        } catch (productError) {
          console.error("Error recording booking products:", productError);
        }
      }

      // IMPORTANT: Capture values BEFORE clearing state for email/SMS sending
      const capturedUser = user; // Capture user object
      const capturedDate = selectedDate;
      const capturedSlot = selectedSlot;
      const capturedLocation = selectedLocation;
      // ponytail: use the resolved (concrete) professional, not the raw
      // selection — "any professional" must show the actual assignee here.
      const capturedProfessional = resolvedProfessional;
      const capturedServices = selectedServices;
      const serviceNames = selectedServices.map((id) => {
        const s = services.find((s) => s.id === id);
        return s?.name || id; // fallback to id if not found
      });

      // Get user email - handle both object and string cases
      const userEmail =
        typeof capturedUser === "string" ? capturedUser : capturedUser?.email;

      console.log("Captured booking data:", {
        user: userEmail,
        userType: typeof capturedUser,
        date: capturedDate,
        slot: `${capturedSlot?.start_time} - ${capturedSlot?.end_time}`,
        location: capturedLocation,
        professional: capturedProfessional,
        services: serviceNames,
      });

      alert("Booking confirmed successfully!");

      // Show notification with captured values - run in background, don't block email
      // Use setTimeout to make it non-blocking
      setTimeout(async () => {
        try {
          await showBookingNotification({
            date: capturedDate,
            services: capturedServices,
            id: insertedBooking?.id || Date.now(),
          });
          console.log("Browser notification sent");
        } catch (notifError) {
          console.error("Notification error:", notifError);
        }
      }, 0);

      // Clear booking state and localStorage
      goToStep(1, { push: false });
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
      setSelectedProducts({});
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

      console.log("Step 1: About to fetch phone number for user:", userId);

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
        console.log("No user ID found, skipping phone lookup");
      }

      console.log("Step 2: Phone lookup complete. Moving to SMS check...");

      console.log("Checking for SMS confirmation requirements:", {
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
          actionToken: insertedBooking?.sms_action_token as string | undefined,
          rebookToken: insertedBooking?.autobook_token as string | undefined,
          appUrl: window.location.origin,
        };

        // Run SMS async with timeout - don't await, don't block email
        (async () => {
          try {
            console.log("Initiating SMS booking confirmation...", {
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

            console.log("SMS booking confirmation completed successfully:", {
              messageId: smsResult.messageId,
              success: smsResult.success,
              cost: smsResult.cost,
              currency: smsResult.currency,
              bookingId: smsDetails.bookingId,
            });
          } catch (smsError) {
            console.error("SMS booking confirmation failed:", {
              error:
                smsError instanceof Error ? smsError.message : String(smsError),
              bookingId: insertedBooking?.id?.toString() || "Unknown",
            });
          }
        })();
      } else {
        console.log("SMS confirmation skipped:", {
          reason: !userPhone
            ? "No phone number provided"
            : "Invalid phone number format",
          phoneNumber: userPhone || "Not provided",
          bookingId: insertedBooking?.id?.toString() || "Unknown",
        });
      }

      console.log("Step 3: SMS section complete. Starting email section...");

      // Send booking confirmation email
      console.log("Preparing to send booking email...");
      console.log("Email validation:", {
        hasUser: !!capturedUser,
        userEmail: userEmail,
        userType: typeof capturedUser,
        hasSlot: !!capturedSlot,
        hasStartTime: !!capturedSlot?.start_time,
        hasEndTime: !!capturedSlot?.end_time,
      });

      if (!userEmail) {
        console.error("Cannot send email: user email is missing", {
          user: capturedUser,
          userEmail,
        });
      } else if (!capturedSlot?.start_time || !capturedSlot?.end_time) {
        console.error("Cannot send email: time slot is missing", {
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
          tenantSlug: tenant?.slug ?? null,
          appUrl: window.location.origin,
        };

        console.log("Email payload:", emailPayload);

        try {
          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send_booking_email`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              },
              body: JSON.stringify(emailPayload),
            },
          );

          const result = await response.json();
          if (result.success) {
            console.log(
              "Booking confirmation email sent successfully!",
              result.data?.id,
            );
          } else {
            console.error("Email API returned error:", result.error);
            alert(
              "Booking confirmed but email notification failed. Please check your email settings.",
            );
          }
        } catch (err) {
          console.error("Exception calling email Edge Function:", err);
          alert(
            "Booking confirmed but email notification failed. Please check your email settings."
          );
        }
      }

      console.log("Step 4: Email section complete. Booking flow finished!");
    } catch (bookingError) {
      console.error("Overall booking error:", bookingError);
      alert("Error creating booking. Please try again.");
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
          <div style={{ paddingTop: "8px" }}>
            <NavigationComponent
              currentStep={locationStepEnabled ? currentStep : currentStep - 1}
              totalSteps={locationStepEnabled ? totalSteps : totalSteps - 1}
              onPreviousStep={() =>
                goToStep(Math.max(locationStepEnabled ? 1 : 2, currentStep - 1))
              }
              onNextStep={handleNextStep}
              canProceedNext={canProceedNext()}
            />

            <AnimatePresence mode="wait" initial={false}>
              {currentStep === 1 && (
                <motion.div
                  key="step-1"
                  custom={stepDirection}
                  variants={stepVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={stepTransition}
                  style={{
                    willChange: prefersReducedMotion
                      ? "auto"
                      : "transform, opacity",
                  }}
                >
                  <LocationStep
                    selectedLocation={selectedLocation}
                    onLocationSelect={handleLocationSelect}
                  />
                </motion.div>
              )}

              {currentStep === 2 && (
                <motion.div
                  key="step-2"
                  custom={stepDirection}
                  variants={stepVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={stepTransition}
                  style={{
                    willChange: prefersReducedMotion
                      ? "auto"
                      : "transform, opacity",
                  }}
                >
                  <ServicesStep
                    selectedServices={selectedServices}
                    onServiceToggle={handleServiceToggle}
                  />
                </motion.div>
              )}

              {currentStep === 3 && (
                <motion.div
                  key="step-3"
                  custom={stepDirection}
                  variants={stepVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={stepTransition}
                  style={{
                    willChange: prefersReducedMotion
                      ? "auto"
                      : "transform, opacity",
                  }}
                >
                  <ProfessionalStep
                    selectedProfessional={selectedProfessional}
                    onProfessionalSelect={handleProfessionalSelect}
                    professionals={professionals}
                    serviceDuration={serviceDuration}
                  />
                </motion.div>
              )}

              {currentStep === 4 && (
                <motion.div
                  key="step-4"
                  custom={stepDirection}
                  variants={stepVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={stepTransition}
                  style={{
                    willChange: prefersReducedMotion
                      ? "auto"
                      : "transform, opacity",
                  }}
                >
                  <div>
                    <Box sx={{ px: { xs: 2, md: 3 }, mb: 2 }}>
                      <Box sx={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: colors.accent.light, mb: 0.75 }}>
                        Step 4 of 5
                      </Box>
                      <Box sx={{ fontSize: { xs: 22, md: 26 }, fontWeight: 700, color: colors.text.primary }}>
                        Pick a Date & Time
                      </Box>
                      <Box sx={{ fontSize: 14, color: colors.text.secondary, mt: 0.5 }}>
                        For {getProfessionalName(selectedProfessional)}
                      </Box>
                    </Box>

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
                          This professional has no available dates. Either all
                          dates are booked or the admin hasn't set any
                          availability yet.
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
                                selectedSlot:
                                  userSelections?.selectedSlot ?? null,
                                serviceDuration:
                                  userSelections?.serviceDuration ?? 0,
                              }),
                            )
                          }
                          allowedDates={availableDates}
                        />
                        <TimeSlotsStep
                          professionalId={selectedProfessional}
                          professionals={professionals}
                          tenantId={tenant?.id ?? null}
                          selectedDate={selectedDate}
                          serviceDuration={serviceDuration}
                          selectedSlot={selectedSlot}
                          serviceId={userSelections?.selectedServices?.[0] ?? null}
                          userId={(() => {
                            // ponytail: same localStorage session read used by slotService,
                            // no need to thread a prop from a higher-level effect.
                            try {
                              const sess = JSON.parse(localStorage.getItem("sb-auth-token") || "null");
                              return sess?.user?.id ?? null;
                            } catch {
                              return null;
                            }
                          })()}
                          onSlotSelect={(slot) =>
                            dispatch(
                              setUserSelections({
                                selectedLocation:
                                  userSelections?.selectedLocation ?? null,
                                selectedServices:
                                  userSelections?.selectedServices ?? [],
                                selectedProfessional:
                                  userSelections?.selectedProfessional ?? null,
                                selectedDate:
                                  userSelections?.selectedDate ?? "",
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
                </motion.div>
              )}

              {currentStep === 5 && (
                <motion.div
                  key="step-5"
                  custom={stepDirection}
                  variants={stepVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={stepTransition}
                  style={{
                    willChange: prefersReducedMotion
                      ? "auto"
                      : "transform, opacity",
                  }}
                >
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
                      Professional: {getProfessionalName(selectedProfessional)}
                    </p>
                    <p>Date: {selectedDate}</p>
                    {selectedSlot && (
                      <p>
                        Time: {selectedSlot.start_time.substring(0, 5)} -{" "}
                        {selectedSlot.end_time.substring(0, 5)}
                      </p>
                    )}
                    {products.length > 0 && (
                      <Box sx={{ mt: 2 }}>
                        <h4 style={{ marginBottom: 8 }}>Add products</h4>
                        {products.map((product) => {
                          const qty = selectedProducts[product.id] ?? 0;
                          return (
                            <Box
                              key={product.id}
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                py: 0.75,
                              }}
                            >
                              <span>
                                {product.name} (€{product.price})
                              </span>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                <Button
                                  size="small"
                                  onClick={() =>
                                    setSelectedProducts((prev) => ({
                                      ...prev,
                                      [product.id]: Math.max(0, qty - 1),
                                    }))
                                  }
                                >
                                  -
                                </Button>
                                <span>{qty}</span>
                                <Button
                                  size="small"
                                  onClick={() =>
                                    setSelectedProducts((prev) => ({
                                      ...prev,
                                      [product.id]: qty + 1,
                                    }))
                                  }
                                >
                                  +
                                </Button>
                              </Box>
                            </Box>
                          );
                        })}
                      </Box>
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
                </motion.div>
              )}
            </AnimatePresence>
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
          if (currentPage !== "booking") {
            goToStep(1, { push: false });
          }
          setCurrentPage("booking");
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
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={currentPage}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransition}
            style={{
              width: "100%",
              willChange: prefersReducedMotion ? "auto" : "transform, opacity",
            }}
          >
            {renderPage()}
          </motion.div>
        </AnimatePresence>
        <Link to="/"></Link>
      </div>
    </div>
  );
}
