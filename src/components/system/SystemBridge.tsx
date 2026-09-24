import { useEffect, useState } from 'react';
import { useCartSync } from '../../hooks/useCartSync';
import { useRealtimeNotifications } from '../../hooks/useRealtimeNotifications';

/**
 * Une session client est active : token présent + rôle `client`.
 * Le panier API (`/cart`) est dans le groupe `role:client` côté backend →
 * pour un admin/manager/livreur, l'appel `GET /cart` renvoie 403 (inutile + bruit console).
 */
function isClientSession(): boolean {
  if (!localStorage.getItem('tokpa_token')) return false;
  try {
    const raw = localStorage.getItem('tokpa_user');
    if (!raw) return false;
    const u = JSON.parse(raw) as { role?: string | { nom?: string } };
    const role = typeof u.role === 'string' ? u.role : u.role?.nom;
    return role === 'client';
  } catch {
    return false;
  }
}

/**
 * Pont système (rendu null) monté une fois à la racine de l'app :
 *  - useCartSync : synchronise le panier Redux avec le panier backend (Redis).
 *  - useRealtimeNotifications : écoute le canal Reverb `notifications.{userId}`
 *    (statuts commande, négociations, paiements, assignation livreur)
 *    → toasts + événements de rafraîchissement pour les pages.
 *
 * Se (re)branche automatiquement à chaque changement de session
 * (événement `tokpa:auth-changed` émis par services/api/auth.ts).
 */
export default function SystemBridge() {
  const [sessionKey, setSessionKey] = useState<number>(() =>
    localStorage.getItem('tokpa_token') ? 1 : 0,
  );
  // Sync panier = rôle client UNIQUEMENT (sinon 403 `role:client` sur /cart).
  const [cartKey, setCartKey] = useState<number>(() => (isClientSession() ? 1 : 0));

  useEffect(() => {
    const onAuthChanged = () => {
      const key = localStorage.getItem('tokpa_token') ? Date.now() : 0;
      setSessionKey(key);
      setCartKey(isClientSession() ? key : 0);
    };
    window.addEventListener('tokpa:auth-changed', onAuthChanged);
    return () => window.removeEventListener('tokpa:auth-changed', onAuthChanged);
  }, []);

  useCartSync(cartKey);
  useRealtimeNotifications(sessionKey);

  return null;
}
