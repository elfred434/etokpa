// @vitest-environment jsdom
/**
 * Actualisation des informations — bouton + processus silencieux.
 *
 * Couvre :
 *  - le bus (`requestRefresh`) : notifie le bus temps réel existant (scope 'all'),
 *    les abonnés du bus global, expose l'état `busy`/`lastRefreshAt` et le
 *    drapeau `silentRefreshActive()` ;
 *  - le bouton `RefreshButton` : rendu, clic → rafraîchissement, rotation de
 *    l'icône (aria-busy), verrouillage pendant l'appel, toast de fin ;
 *  - le processus silencieux `useAutoRefresh` : tic toutes les 30 s si l'onglet
 *    est visible, rien si l'onglet est masqué, reprise au retour (`online`) ;
 *  - `useGlobalRefreshTick` : compteur utilisable en dépendance d'un `useEffect` ;
 *  - l'i18n des nouvelles phrases (les 5 langues).
 */
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import RefreshButton from '../src/components/shared/RefreshButton';
import { useAutoRefresh, useGlobalRefreshTick, useRefreshState } from '../src/hooks/useRefresh';
import { subscribeRealtimeRefresh } from '../src/hooks/useRealtimeNotifications';
import {
  backgroundRefreshActive,
  onGlobalRefresh,
  refreshState,
  requestRefresh,
  silentRefreshActive,
} from '../src/services/refresh/refreshBus';
import { useLiveRows } from '../src/services/api/useLiveRows';
import { alertApiError } from '../src/utils/apiError';
import toast from 'react-hot-toast';
import { tx } from '../src/i18n/tx';

/** Espionne l'événement temps réel existant (scope 'all' attendu). */
function captureRealtimeScopes(): string[] {
  const scopes: string[] = [];
  const handler = (ev: Event) => {
    const detail = (ev as CustomEvent<{ scope?: string }>).detail;
    if (detail?.scope) scopes.push(detail.scope);
  };
  window.addEventListener('tokpa:realtime-refresh', handler as EventListener);
  afterEach(() => window.removeEventListener('tokpa:realtime-refresh', handler as EventListener));
  return scopes;
}

// La langue est persistée en localStorage : on repart du français à chaque test
// (le test i18n, lui, change la langue dans son propre corps).
beforeEach(() => {
  localStorage.setItem('tokpa_lang', 'fr');
});

/**
 * Laisse le rafraîchissement en cours SE TERMINER avant de rendre les vraies
 * horloges : sans ça, la rotation (MIN_SPINNER_MS) resterait en attente et
 * l'état « occupé » fuiterait vers les tests suivants.
 */
async function laisserTerminer(): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(800); // > MIN_SPINNER_MS
  });
  expect(refreshState().busy).toBe(false);
  expect(silentRefreshActive()).toBe(false);
}

describe('bus de rafraîchissement', () => {
  it('notifie le bus temps réel avec le scope « all » et les abonnés globaux', async () => {
    const scopes = captureRealtimeScopes();
    const vus: string[] = [];
    const off = onGlobalRefresh((origin) => {
      vus.push(origin);
    });

    await requestRefresh('manual');

    expect(scopes).toEqual(['all']);
    expect(vus).toEqual(['manual']);
    off();
  });

  it('un événement « all » réveille aussi les abonnés temps réel ciblés', () => {
    const callback = vi.fn();
    const off = subscribeRealtimeRefresh(['orders'], callback);

    window.dispatchEvent(new CustomEvent('tokpa:realtime-refresh', { detail: { scope: 'all' } }));

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith({ scope: 'all' });
    off();
  });

  it('expose busy pendant l’appel puis lastRefreshAt à la fin', async () => {
    expect(refreshState().busy).toBe(false);

    const promesse = requestRefresh('auto');
    // Pendant l'appel : occupé + drapeau silencieux actif (les pages n'affichent
    // pas leur squelette de chargement).
    expect(refreshState().busy).toBe(true);
    expect(silentRefreshActive()).toBe(true);

    await promesse;

    expect(refreshState().busy).toBe(false);
    expect(silentRefreshActive()).toBe(false);
    expect(refreshState().lastRefreshAt).toBeTypeOf('number');
    expect(refreshState().origin).toBe('auto');
    expect(backgroundRefreshActive()).toBe(false);
  });

  it('distingue le bouton manuel du rafraîchissement automatique silencieux', async () => {
    const vuPendantAppel: boolean[] = [];
    const off = onGlobalRefresh(() => {
      vuPendantAppel.push(backgroundRefreshActive());
    });

    await requestRefresh('manual');
    expect(backgroundRefreshActive()).toBe(false);
    await requestRefresh('auto');
    expect(backgroundRefreshActive()).toBe(false);
    expect(vuPendantAppel).toEqual([false, true]);
    off();
  });

  it('n’affiche pas de toast réseau pendant un rafraîchissement automatique', async () => {
    const erreurToast = vi.spyOn(toast, 'error');
    const off = onGlobalRefresh(() => {
      alertApiError({ response: { status: 503, data: { message: 'API indisponible' } } });
    });

    await requestRefresh('auto');

    expect(erreurToast).not.toHaveBeenCalled();
    off();
    erreurToast.mockRestore();
  });

  it('garde le silence pour une erreur tardive d’une requête lancée en arrière-plan', () => {
    const erreurToast = vi.spyOn(toast, 'error');

    alertApiError({
      config: { __tokpaBackgroundRefresh: true },
      response: { status: 503, data: { message: 'API indisponible' } },
    });

    expect(erreurToast).not.toHaveBeenCalled();
    erreurToast.mockRestore();
  });

  it('attend les abonnés qui renvoient une promesse', async () => {
    let fini = false;
    const off = onGlobalRefresh(async () => {
      await new Promise((r) => setTimeout(r, 10));
      fini = true;
    });
    await requestRefresh('auto');
    expect(fini).toBe(true);
    off();
  });

  it('n’échoue jamais si un abonné lève une exception', async () => {
    const off = onGlobalRefresh(() => {
      throw new Error('abonné défaillant');
    });
    await expect(requestRefresh('auto')).resolves.toBeUndefined();
    off();
  });
});

describe('RefreshButton', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it('déclenche un rafraîchissement global au clic', async () => {
    const vus: string[] = [];
    const off = onGlobalRefresh((o) => {
      vus.push(o);
    });
    render(createElement(RefreshButton));

    const bouton = screen.getByTestId('refresh-button');
    expect(bouton.getAttribute('aria-label')).toBe('Actualiser');

    fireEvent.click(bouton);

    await waitFor(() => expect(vus).toEqual(['manual']));
    // Retour utilisateur : l'infobulle affiche l'heure de la dernière mise à jour.
    await waitFor(() => expect(bouton.getAttribute('title')).toContain('Dernière actualisation'));
    off();
  });

  it('affiche l’état occupé (rotation) et bloque les clics répétés', async () => {
    function Hote() {
      const { busy } = useRefreshState();
      return createElement('div', null, createElement(RefreshButton), createElement('span', { 'data-testid': 'etat' }, busy ? 'occupe' : 'libre'));
    }
    render(createElement(Hote));

    const bouton = screen.getByTestId('refresh-button') as HTMLButtonElement;
    fireEvent.click(bouton);

    await waitFor(() => expect(screen.getByTestId('etat').textContent).toBe('occupe'));
    expect(bouton.getAttribute('aria-busy')).toBe('true');
    expect(bouton.disabled).toBe(true);
    expect(bouton.getAttribute('aria-label')).toBe('Actualisation en cours…');

    await waitFor(() => expect(screen.getByTestId('etat').textContent).toBe('libre'));
    expect(bouton.disabled).toBe(false);
  });
});

describe('useAutoRefresh — processus silencieux', () => {
  it('rafraîchit toutes les 30 s quand l’onglet est visible', async () => {
    vi.useFakeTimers();
    const appels: string[] = [];
    const off = onGlobalRefresh((o) => {
      appels.push(o);
    });

    function Hote() {
      useAutoRefresh();
      return null;
    }
    render(createElement(Hote));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(appels).toEqual(['auto']);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(appels).toEqual(['auto', 'auto']);
    await laisserTerminer();
    off();
    vi.useRealTimers();
  });

  it('ne consomme rien quand l’onglet est masqué, et recharge au retour', async () => {
    vi.useFakeTimers();
    const appels: string[] = [];
    const off = onGlobalRefresh((o) => {
      appels.push(o);
    });

    function Hote() {
      useAutoRefresh();
      return null;
    }
    render(createElement(Hote));

    // Onglet masqué (l'événement est indispensable : c'est lui qui horodate l'absence).
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
      await vi.advanceTimersByTimeAsync(90_000);
    });
    expect(appels).toEqual([]);

    // Retour sur l'onglet après une absence (> 8 s) : une actualisation.
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(appels).toEqual(['auto']);
    await laisserTerminer();

    off();
    vi.useRealTimers();
  });

  it('rafraîchit au retour du réseau (événement online)', async () => {
    vi.useFakeTimers();
    const appels: string[] = [];
    const off = onGlobalRefresh((o) => {
      appels.push(o);
    });

    function Hote() {
      useAutoRefresh();
      return null;
    }
    render(createElement(Hote));

    await act(async () => {
      window.dispatchEvent(new Event('online'));
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(appels).toEqual(['network']);
    await laisserTerminer();
    off();
    vi.useRealTimers();
  });
});

describe('useGlobalRefreshTick', () => {
  it('vaut 0 au montage puis s’incrémente à chaque rafraîchissement', async () => {
    function Hote() {
      const tick = useGlobalRefreshTick();
      return createElement('span', { 'data-testid': 'tick' }, String(tick));
    }
    render(createElement(Hote));
    expect(screen.getByTestId('tick').textContent).toBe('0');

    await act(async () => {
      await requestRefresh('manual');
    });
    await waitFor(() => expect(screen.getByTestId('tick').textContent).toBe('1'));

    await act(async () => {
      await requestRefresh('auto');
    });
    await waitFor(() => expect(screen.getByTestId('tick').textContent).toBe('2'));
  });
});

describe('useLiveRows — actualisation des données API', () => {
  it('relit les données sur le bouton global sans afficher de chargement plein écran', async () => {
    let version = 0;
    const fetcher = vi.fn(async () => ({ data: [{ id: ++version }] }));

    function Hote() {
      const { rows, loading } = useLiveRows(fetcher);
      return createElement(
        'div',
        null,
        createElement('span', { 'data-testid': 'row-id' }, String(rows[0]?.id ?? 'vide')),
        createElement('span', { 'data-testid': 'rows-loading' }, String(loading)),
      );
    }

    render(createElement(Hote));
    await waitFor(() => expect(screen.getByTestId('row-id').textContent).toBe('1'));
    expect(screen.getByTestId('rows-loading').textContent).toBe('false');

    await act(async () => {
      await requestRefresh('manual');
    });

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('row-id').textContent).toBe('2');
    expect(screen.getByTestId('rows-loading').textContent).toBe('false');
  });

  it('conserve les anciennes lignes si un rafraîchissement silencieux échoue', async () => {
    let calls = 0;
    const fetcher = vi.fn(async () => {
      calls += 1;
      if (calls > 1) throw new Error('réseau indisponible');
      return { data: [{ id: 42 }] };
    });

    function Hote() {
      const { rows, loading, err } = useLiveRows(fetcher);
      return createElement(
        'div',
        null,
        createElement('span', { 'data-testid': 'row-id' }, String(rows[0]?.id ?? 'vide')),
        createElement('span', { 'data-testid': 'rows-loading' }, String(loading)),
        createElement('span', { 'data-testid': 'rows-error' }, err ?? ''),
      );
    }

    render(createElement(Hote));
    await waitFor(() => expect(screen.getByTestId('row-id').textContent).toBe('42'));
    await act(async () => {
      await requestRefresh('auto');
    });

    expect(screen.getByTestId('row-id').textContent).toBe('42');
    expect(screen.getByTestId('rows-loading').textContent).toBe('false');
    expect(screen.getByTestId('rows-error').textContent).toBe('');
  });
});

describe('i18n des phrases d’actualisation', () => {
  it('traduit les nouvelles phrases dans les 5 langues', () => {
    const attendus: Array<[string, string]> = [
      ['fr', 'Actualiser'],
      ['en', 'Refresh'],
      ['es', 'Actualizar'],
      ['de', 'Aktualisieren'],
      ['pt', 'Atualizar'],
    ];
    for (const [lang, attendu] of attendus) {
      localStorage.setItem('tokpa_lang', lang);
      expect(tx('Actualiser'), `Actualiser en ${lang}`).toBe(attendu);
    }
    localStorage.setItem('tokpa_lang', 'es');
    expect(tx('Actualisation en cours…')).toBe('Actualizando…');
    expect(tx('Dernière actualisation')).toBe('Última actualización');
    expect(tx('Actualisation automatique')).toBe('Actualización automática');
    expect(tx('Informations actualisées.')).toBe('Información actualizada.');
  });
});

/**
 * Intégration : le bouton est bien CÂBLÉ dans la barre cliente réelle
 * (ClientNavbar montée dans un vrai routeur mémoire), et un clic déclenche
 * le rafraîchissement global — comme le ferait le navigateur.
 */
describe('ClientNavbar — intégration du bouton', () => {
  it('rend le bouton « Actualiser » et rafraîchit au clic', async () => {
    localStorage.setItem('tokpa_lang', 'fr');
    vi.doMock('../src/services/api/client', () => ({
      apiClient: { get: vi.fn().mockResolvedValue({ data: { data: [] } }), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
    }));
    vi.doMock('../src/services/realtime/echo', () => ({
      initEcho: vi.fn(),
      shutdownEcho: vi.fn(),
      windowEcho: () => null,
    }));

    const { createRootRoute, createRoute, createRouter, createMemoryHistory, RouterProvider } =
      await import('@tanstack/react-router');
    const { LanguageProvider } = await import('../src/context/LanguageContext');
    const { Provider } = await import('react-redux');
    const { store } = await import('../src/store');
    const { default: ClientNavbar } = await import('../src/components/layout/client/ClientNavbar');

    const rootRoute = createRootRoute();
    const pageRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/catalogue',
      component: () => createElement(ClientNavbar),
    });
    const router = createRouter({
      routeTree: rootRoute.addChildren([pageRoute]),
      history: createMemoryHistory({ initialEntries: ['/catalogue'] }),
    });

    const appels: string[] = [];
    const off = onGlobalRefresh((o) => {
      appels.push(o);
    });

    // La navbar lit le panier Redux : on monte le vrai store de l'application.
    render(
      createElement(Provider, { store }, createElement(LanguageProvider, null, createElement(RouterProvider, { router }))),
    );

    const bouton = await screen.findByTestId('refresh-button');
    expect(bouton.getAttribute('aria-label')).toBe('Actualiser');

    fireEvent.click(bouton);
    await waitFor(() => expect(appels).toEqual(['manual']));

    off();
    vi.doUnmock('../src/services/api/client');
    vi.doUnmock('../src/services/realtime/echo');
  });
});
