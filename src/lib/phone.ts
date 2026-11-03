/** Normalizes a phone to E.164; 10-digit numbers are assumed to be Mexican. */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (raw.trim().startsWith("+")) return digits.length >= 10 && digits.length <= 15 ? `+${digits}` : null;
  if (digits.length === 10) return `+52${digits}`;
  if (digits.length >= 11 && digits.length <= 15) return `+${digits}`;
  return null;
}

/** Staff log in with their email; guardians and pickup people with their phone. */
export function normalizeLogin(raw: string): string | null {
  const value = raw.trim();
  return value.includes("@") ? value.toLowerCase() : normalizePhone(value);
}
