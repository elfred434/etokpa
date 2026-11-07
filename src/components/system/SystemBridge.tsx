import { useEffect, useState } from 'react';
import { useCartSync } from '../../hooks/useCartSync';
import { useAutoRefresh } from '../../hooks/useRefresh';
import { useRealtimeNotifications } from '../../hooks/useRealtimeNotifications';

type StoredRole = string | { nom?: string } | null;
type StoredUser = { role?: StoredRole } | null;

const CART_SYNC_ROLES = new Set(['client', 'admin', 'super_admin']);

/** Le panier serveur est limité aux rôles autorisés par les routes Laravel. */
function hasCartSession(): boolean {
  if (!localStorage.getItem('tokpa_token')) return false;

  try {
    const rawUser = localStorage.getItem('tokpa_user');
    if (!rawUser) return false;
    const user = JSON.parse(rawUser) as StoredUser;
    const role = typeof user?.role === 'string' ? user.role : user?.role?.nom;
    return typeof role === 'string' && CART_SYNC_ROLES.has(role);
  } catch {
    // Sans profil exploitable, ne pas appeler une route protégée par rôle.
    return false;
  }
}

/**
 * Pont système (rendu null) monté une fois à la racine de l'app :
 *  - useCartSync : synchronise le panier pour les rôles autorisés par le backend.
 *  - useRealtimeNotifications : écoute le canal Reverb `notifications.{userId}`
 *    (statuts commande, négociations, paiements, assignation livreur)
 *    → toasts + événements de rafraîchissement pour les pages.
 *  - useAutoRefresh : processus d'actualisation SILENCIEUSE (30 s si l'onglet est
 *    visible, retour d'onglet, retour du réseau) — mêmes effets que le bouton
 *    « Actualiser », sans aucun clic.
 *
 * Se (re)branche automatiquement à chaque changement de session
 * (événement `tokpa:auth-changed` émis par services/api/auth.ts).
 */
export default function SystemBridge() {
  const [sessionKey, setSessionKey] = useState<number>(() =>
    localStorage.getItem('tokpa_token') ? 1 : 0,
  );
  const [cartKey, setCartKey] = useState<number>(() => (hasCartSession() ? 1 : 0));

  useEffect(() => {
    const onAuthChanged = () => {
      const key = localStorage.getItem('tokpa_token') ? Date.now() : 0;
      setSessionKey(key);
      setCartKey(hasCartSession() ? key : 0);
    };
    window.addEventListener('tokpa:auth-changed', onAuthChanged);
    return () => window.removeEventListener('tokpa:auth-changed', onAuthChanged);
  }, []);

  useCartSync(cartKey);
  useRealtimeNotifications(sessionKey);
  // Actualisation silencieuse globale : catalogue, commandes, panier, notifications…
  useAutoRefresh();

  return null;
}
