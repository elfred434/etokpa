export const TWO_FA_TTL_SECONDS = 10 * 60; // TTL réel du backend (TwoFAService::TTL_MINUTES = 10)
export const TWO_FA_MAX_ATTEMPTS = 3;

const PENDING_EMAIL_KEY = 'tokpa_pending_email';
const EXPIRES_AT_KEY = 'tokpa_2fa_expires_at';
const EXPIRES_EMAIL_KEY = 'tokpa_2fa_expires_email';
const ATTEMPTS_KEY = 'tokpa_2fa_attempts';
const ATTEMPTS_EMAIL_KEY = 'tokpa_2fa_attempts_email';

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export function startTwoFaSession(email: string, now = Date.now()): number {
  const deadline = now + TWO_FA_TTL_SECONDS * 1000;
  const normalized = normalizeEmail(email);
  localStorage.setItem(PENDING_EMAIL_KEY, email);
  localStorage.setItem(EXPIRES_AT_KEY, String(deadline));
  localStorage.setItem(EXPIRES_EMAIL_KEY, normalized);
  localStorage.setItem(ATTEMPTS_KEY, String(TWO_FA_MAX_ATTEMPTS));
  localStorage.setItem(ATTEMPTS_EMAIL_KEY, normalized);
  return deadline;
}

export function getTwoFaDeadline(email: string, now = Date.now()): number {
  const normalized = normalizeEmail(email);
  const storedEmail = localStorage.getItem(EXPIRES_EMAIL_KEY);
  const rawDeadline = localStorage.getItem(EXPIRES_AT_KEY);
  const parsed = rawDeadline ? Number(rawDeadline) : NaN;

  if (storedEmail === normalized && Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }

  const deadline = now + TWO_FA_TTL_SECONDS * 1000;
  localStorage.setItem(EXPIRES_AT_KEY, String(deadline));
  localStorage.setItem(EXPIRES_EMAIL_KEY, normalized);
  return deadline;
}

export function getTwoFaSecondsLeft(deadline: number, now = Date.now()): number {
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}

export function getTwoFaAttemptsLeft(email: string): number {
  const normalized = normalizeEmail(email);
  const storedEmail = localStorage.getItem(ATTEMPTS_EMAIL_KEY);
  const rawAttempts = localStorage.getItem(ATTEMPTS_KEY);
  const parsed = rawAttempts != null ? Number(rawAttempts) : NaN;

  if (storedEmail === normalized && Number.isFinite(parsed) && parsed >= 0) {
    return Math.min(TWO_FA_MAX_ATTEMPTS, Math.floor(parsed));
  }

  localStorage.setItem(ATTEMPTS_KEY, String(TWO_FA_MAX_ATTEMPTS));
  localStorage.setItem(ATTEMPTS_EMAIL_KEY, normalized);
  return TWO_FA_MAX_ATTEMPTS;
}

export function setTwoFaAttemptsLeft(email: string, attempts: number): void {
  const clamped = Math.max(0, Math.min(TWO_FA_MAX_ATTEMPTS, Math.floor(attempts)));
  localStorage.setItem(ATTEMPTS_KEY, String(clamped));
  localStorage.setItem(ATTEMPTS_EMAIL_KEY, normalizeEmail(email));
}

export function clearTwoFaSession(): void {
  localStorage.removeItem(PENDING_EMAIL_KEY);
  localStorage.removeItem(EXPIRES_AT_KEY);
  localStorage.removeItem(EXPIRES_EMAIL_KEY);
  localStorage.removeItem(ATTEMPTS_KEY);
  localStorage.removeItem(ATTEMPTS_EMAIL_KEY);
}
