/**
 * Contexte local Axios pour les lectures lancées par un refresh automatique/réseau.
 * La marque reste attachée à la config jusqu'au traitement de l'erreur appelant,
 * même si le bus a déjà terminé son animation minimale.
 */
interface RefreshAwareConfig {
  __tokpaBackgroundRefresh?: boolean;
}

export function markBackgroundRefreshRequest(config: object): void {
  (config as RefreshAwareConfig).__tokpaBackgroundRefresh = true;
}

export function isBackgroundRefreshApiError(error: unknown): boolean {
  const config = (error as { config?: RefreshAwareConfig } | null)?.config;
  return Boolean(config?.__tokpaBackgroundRefresh);
}
