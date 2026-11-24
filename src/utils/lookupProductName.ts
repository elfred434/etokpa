// Résout et met en cache le nom d’un produit à partir de son identifiant.
import { catalogApi } from '../services/api';
import { unwrap } from '../services/api/unwrap';

const cache = new Map<number, string>();

// Helper lookupProductName : réalise le traitement métier associé.
export async function lookupProductName(id: number): Promise<string> {
  const cached = cache.get(id);
  if (cached) return cached;
  try {
    const body = unwrap(await catalogApi.getProduct(id));
    const rawNom = body?.nom ?? body?.data?.nom;
    const nom = typeof rawNom === 'string' ? rawNom.trim() : '';
    if (nom) cache.set(id, nom);
    return nom;
  } catch {
    return '';
  }
}
