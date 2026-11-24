// Marque les requêtes Axios silencieuses afin d’éviter les alertes réseau intrusives.
interface RefreshAwareConfig {
  __tokpaBackgroundRefresh?: boolean;
}

// Helper markBackgroundRefreshRequest : réalise le traitement métier associé.
export function markBackgroundRefreshRequest(config: object): void {
  (config as RefreshAwareConfig).__tokpaBackgroundRefresh = true;
}

// Vérifie la condition métier isBackgroundRefreshApiError.
export function isBackgroundRefreshApiError(error: unknown): boolean {
  const config = (error as { config?: RefreshAwareConfig } | null)?.config;
  return Boolean(config?.__tokpaBackgroundRefresh);
}
