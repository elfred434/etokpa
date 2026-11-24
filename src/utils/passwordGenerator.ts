
// Génère des mots de passe aléatoires robustes pour la création de comptes.
export const LOWER = 'abcdefghijkmnpqrstuvwxyz';
export const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
export const DIGITS = '23456789';
export const SYMBOLS = '!@#$%^&*_-+=?';

export const PASSWORD_ALPHABET = LOWER + UPPER + DIGITS + SYMBOLS;

export const DEFAULT_PASSWORD_LENGTH = 16;
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 64;

// Helper randomUint32 : réalise le traitement métier associé.
function randomUint32(): number {
  const cryptoObj = globalThis.crypto;
  if (!cryptoObj || typeof cryptoObj.getRandomValues !== 'function') {
    throw new Error('crypto.getRandomValues est indisponible : générateur de mot de passe impossible.');
  }
  const bucket = new Uint32Array(1);
  cryptoObj.getRandomValues(bucket);
  return bucket[0];
}

// Helper randomBelow : réalise le traitement métier associé.
function randomBelow(max: number): number {
  if (max <= 0) return 0;
  const limit = Math.floor(0x100000000 / max) * max;
  let draw = randomUint32();
  while (draw >= limit) draw = randomUint32();
  return draw % max;
}

// Helper pick : réalise le traitement métier associé.
function pick(alphabet: string): string {
  return alphabet[randomBelow(alphabet.length)];
}

// Helper shuffle : réalise le traitement métier associé.
function shuffle(chars: string[]): string[] {
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = randomBelow(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars;
}

// Génère et déclenche l’export via generatePassword.
export function generatePassword(length: number = DEFAULT_PASSWORD_LENGTH): string {
  const size = Math.trunc(length);
  if (!Number.isFinite(size) || size < MIN_PASSWORD_LENGTH || size > MAX_PASSWORD_LENGTH) {
    throw new RangeError(
      `Longueur de mot de passe hors bornes (${MIN_PASSWORD_LENGTH}–${MAX_PASSWORD_LENGTH}) : ${length}`,
    );
  }

  const forced = [pick(LOWER), pick(UPPER), pick(DIGITS), pick(SYMBOLS)];
  const chars: string[] = [...forced];
  while (chars.length < size) chars.push(pick(PASSWORD_ALPHABET));

  return shuffle(chars).join('');
}
