import validator from "validator";

export interface GuestDetails {
  name: string;
  phone: string;
  email: string;
  consent: boolean;
}

export type GuestErrors = Partial<Record<keyof GuestDetails, true>>;

// Mirrors the limits enforced server-side in create_guest_booking().
export function validateGuestDetails(g: GuestDetails): GuestErrors {
  const errors: GuestErrors = {};
  const name = g.name.trim();
  if (name.length < 2 || name.length > 100) errors.name = true;
  if (!/^\+?[0-9 ()-]{7,20}$/.test(g.phone.trim())) errors.phone = true;
  const email = g.email.trim();
  if (email.length > 254 || !validator.isEmail(email)) errors.email = true;
  if (!g.consent) errors.consent = true;
  return errors;
}
