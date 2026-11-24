// Pont global monté à la racine : active notifications temps réel, auto-refresh et sync panier.
import { useEffect, useRef, useState } from 'react';
import { useCartSync } from '../../hooks/useCartSync';
import { useAutoRefresh } from '../../hooks/useRefresh';
import { useRealtimeNotifications } from '../../hooks/useRealtimeNotifications';
import { rememberSessionUser } from '../../routes/authGuard';
import { authApi } from '../../services/api';
import { store } from '../../store';
import { clear, clearProductRemovalNotices } from '../../store/slices/cart/cartSlice';

type StoredRole = string | { nom?: string } | null;
type StoredUser = { role?: StoredRole } | null;

const CART_SYNC_ROLES = new Set(['client', 'admin', 'super_admin']);

// Vérifie la condition métier hasCartSession.
function hasCartSession(): boolean {
  if (!localStorage.getItem('tokpa_token')) return false;

  try {
    const rawUser = localStorage.getItem('tokpa_user');
    if (!rawUser) return false;
    const user = JSON.parse(rawUser) as StoredUser;
    const role = typeof user?.role === 'string' ? user.role : user?.role?.nom;
    return typeof role === 'string' && CART_SYNC_ROLES.has(role);
  } catch {
    return false;
  }
}

// Composant React SystemBridge : prépare l’état et affiche son interface.
export default function SystemBridge() {
  const [sessionKey, setSessionKey] = useState<number>(() =>
    localStorage.getItem('tokpa_token') ? 1 : 0,
  );
  const [cartKey, setCartKey] = useState<number>(() => (hasCartSession() ? 1 : 0));
  const wasAuthenticatedRef = useRef<boolean>(Boolean(localStorage.getItem('tokpa_token')));

  // Enregistre les écouteurs d’événements navigateur et les nettoie au démontage.
  useEffect(() => {
    const onAuthChanged = () => {
      const hasToken = Boolean(localStorage.getItem('tokpa_token'));
      const key = hasToken ? Date.now() : 0;
      if (wasAuthenticatedRef.current && !hasToken) {
        store.dispatch(clear());
        store.dispatch(clearProductRemovalNotices());
      }
      wasAuthenticatedRef.current = hasToken;
      setSessionKey(key);
      setCartKey(hasCartSession() ? key : 0);
    };
    window.addEventListener('tokpa:auth-changed', onAuthChanged);
    return () => window.removeEventListener('tokpa:auth-changed', onAuthChanged);
  }, []);

  // Synchronise l’état avec le stockage local du navigateur.
  useEffect(() => {
    if (!sessionKey || !localStorage.getItem('tokpa_token')) return;
    let alive = true;
    authApi
      .getProfile()
      .then((res) => {
        if (!alive) return;
        const user = (res as { data?: Record<string, unknown> })?.data ?? res;
        if (user && typeof user === 'object' && !Array.isArray(user)) {
          rememberSessionUser(user as Record<string, unknown>);
        }
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [sessionKey]);

  useCartSync(cartKey);
  useRealtimeNotifications(sessionKey);
  useAutoRefresh();

  return null;
}
