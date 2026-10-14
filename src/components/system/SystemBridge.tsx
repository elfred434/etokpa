import { useEffect, useState } from 'react';
import { useCartSync } from '../../hooks/useCartSync';
import { useAutoRefresh } from '../../hooks/useRefresh';
import { useRealtimeNotifications } from '../../hooks/useRealtimeNotifications';

/** Session ouverte, quel que soit le rôle : le panier clientèle est celui de cet utilisateur. */
function hasOpenSession(): boolean {
  return !!localStorage.getItem('tokpa_token');
}

/**
 * Pont système (rendu null) monté une fois à la racine de l'app :
 *  - useCartSync : synchronise le panier Redux avec le panier backend (Redis).
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
  const [cartKey, setCartKey] = useState<number>(() => (hasOpenSession() ? 1 : 0));

  useEffect(() => {
    const onAuthChanged = () => {
      const key = localStorage.getItem('tokpa_token') ? Date.now() : 0;
      setSessionKey(key);
      setCartKey(hasOpenSession() ? key : 0);
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
