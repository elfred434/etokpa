/**
 * Générateur de mot de passe fort pour l'inscription (étape 2 « Sécurité »).
 *
 * Tire tous ses octets via le module Web Crypto (`globalThis.crypto.getRandomValues`),
 * disponible à l'identique dans le navigateur et dans Node.js (>= 19), donc compatible
 * avec l'environnement de tests vitest (`environment: 'node'`).
 * `Math.random` est volontairement exclu : il n'est pas cryptographiquement sûr.
 */

/** Minuscules sans caractères ambigus (l, o). */
export const LOWER = 'abcdefghijkmnpqrstuvwxyz';
/** Majuscules sans caractères ambigus (I, O). */
export const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
/** Chiffres sans 0 ni 1 confondables avec O et l. */
export const DIGITS = '23456789';
/** Symboles acceptés par les claviers FR/EN et sans guillemet ambigu. */
export const SYMBOLS = '!@#$%^&*_-+=?';

export const PASSWORD_ALPHABET = LOWER + UPPER + DIGITS + SYMBOLS;

/** Longueur par défaut et bornes acceptées. */
export const DEFAULT_PASSWORD_LENGTH = 16;
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 64;

/** Jeu d'octets tirés au sort (rechargeable pour les tests). */
function randomUint32(): number {
  const cryptoObj = globalThis.crypto;
  if (!cryptoObj || typeof cryptoObj.getRandomValues !== 'function') {
    throw new Error('crypto.getRandomValues est indisponible : générateur de mot de passe impossible.');
  }
  const bucket = new Uint32Array(1);
  cryptoObj.getRandomValues(bucket);
  return bucket[0];
}

/** Entier uniforme dans [0, max[ par rejet : aucun biais de modulo. */
function randomBelow(max: number): number {
  if (max <= 0) return 0;
  const limit = Math.floor(0x100000000 / max) * max;
  let draw = randomUint32();
  while (draw >= limit) draw = randomUint32();
  return draw % max;
}

function pick(alphabet: string): string {
  return alphabet[randomBelow(alphabet.length)];
}

/**
 * Mélange de Fisher-Yates piloté par crypto, pour que les classes
 * imposées ne soient pas toujours aux mêmes positions.
 */
function shuffle(chars: string[]): string[] {
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = randomBelow(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars;
}

/**
 * Mot de passe fort : au moins une minuscule, une majuscule, un chiffre
 * et un symbole, le reste pris dans l'alphabet complet, ordre mélangé.
 */
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
