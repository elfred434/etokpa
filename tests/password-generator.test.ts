import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_PASSWORD_LENGTH,
  DIGITS,
  LOWER,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  PASSWORD_ALPHABET,
  SYMBOLS,
  UPPER,
  generatePassword,
} from '../src/utils/passwordGenerator';
import { passwordScore } from '../src/utils/passwordScore';

describe('générateur de mot de passe (module crypto)', () => {
  it('produit la longueur par défaut et les longueurs demandées', () => {
    expect(generatePassword()).toHaveLength(DEFAULT_PASSWORD_LENGTH);
    expect(generatePassword(MIN_PASSWORD_LENGTH)).toHaveLength(MIN_PASSWORD_LENGTH);
    expect(generatePassword(MAX_PASSWORD_LENGTH)).toHaveLength(MAX_PASSWORD_LENGTH);
  });

  it('contient au moins une minuscule, une majuscule, un chiffre et un symbole', () => {
    for (let i = 0; i < 50; i += 1) {
      const pw = generatePassword();
      expect([...pw].some((c) => LOWER.includes(c))).toBe(true);
      expect([...pw].some((c) => UPPER.includes(c))).toBe(true);
      expect([...pw].some((c) => DIGITS.includes(c))).toBe(true);
      expect([...pw].some((c) => SYMBOLS.includes(c))).toBe(true);
    }
  });

  it("n'utilise que l'alphabet déclaré", () => {
    for (let i = 0; i < 50; i += 1) {
      for (const c of generatePassword(32)) {
        expect(PASSWORD_ALPHABET).toContain(c);
      }
    }
  });

  it('atteint le score 4 du barème d\'inscription', () => {
    for (let i = 0; i < 50; i += 1) {
      expect(passwordScore(generatePassword())).toBe(4);
    }
  });

  it('tire 200 mots de passe tous distincts', () => {
    const set = new Set(Array.from({ length: 200 }, () => generatePassword()));
    expect(set.size).toBe(200);
  });

  it('s\'appuie sur crypto.getRandomValues, jamais sur Math.random', () => {
    const randomSpy = vi.spyOn(Math, 'random');
    const cryptoSpy = vi.spyOn(globalThis.crypto, 'getRandomValues');
    try {
      generatePassword();
      expect(cryptoSpy).toHaveBeenCalled();
      expect(randomSpy).not.toHaveBeenCalled();
    } finally {
      randomSpy.mockRestore();
      cryptoSpy.mockRestore();
    }
  });

  it('refuse les longueurs hors bornes', () => {
    expect(() => generatePassword(MIN_PASSWORD_LENGTH - 1)).toThrow(RangeError);
    expect(() => generatePassword(MAX_PASSWORD_LENGTH + 1)).toThrow(RangeError);
    expect(() => generatePassword(Number.NaN)).toThrow(RangeError);
  });
});
