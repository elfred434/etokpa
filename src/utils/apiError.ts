/**
 * Extraction & mise en forme des erreurs API Laravel pour l'UX.
 *
 * Objectif (phase dev) : afficher à l'écran le STATUT HTTP + le message EXACT
 * renvoyé par le backend, pour identifier immédiatement ce qui cloche :
 *  - [HTTP 419] CSRF (session expirée / stateful domains)
 *  - [HTTP 422] validation (« email déjà utilisé », etc.)
 *  - [HTTP 500] plantage serveur (mailer, SQL, Redis…)
 *  - [Réseau] backend injojoignable (serveur arrêté, CORS…)
 */

export interface ApiErrorInfo {
  /** Statut HTTP, ou null si la requête n'est jamais arrivée au serveur. */
  status: number | null;
  /** Message principal (celui du backend quand il existe). */
  message: string;
  /** Erreurs de validation Laravel (422) : { champ: [messages] }. */
  fieldErrors: Record<string, string[]>;
}

/** Extrait le statut / message / erreurs de champs d'une erreur axios (ou équivalent). */
export function extractApiError(err: unknown): ApiErrorInfo {
  const e = err as {
    response?: { status?: number; data?: { message?: string; errors?: Record<string, string[]> } };
    message?: string;
  };

  if (e?.response) {
    const status = e.response.status ?? 0;
    const data = e.response.data ?? {};
    const fieldErrors = data.errors && typeof data.errors === 'object' ? data.errors : {};
    let message = (data.message || '').trim() || `Erreur HTTP ${status}`;
    if (status === 419) {
      message += ' — Session expirée (CSRF). Rechargez la page et réessayez.';
    }
    return { status, message, fieldErrors };
  }

  return {
    status: null,
    message: (e?.message || '').trim() || 'Erreur réseau inconnue',
    fieldErrors: {},
  };
}

/** Formatte pour affichage UX : « [HTTP 500] … — champ : … ». */
export function formatApiError(info: ApiErrorInfo): string {
  const prefix = info.status != null ? `[HTTP ${info.status}]` : '[Réseau]';
  let text = `${prefix} ${info.message}`;
  if (info.status === null) {
    text += ' — Backend injoignable (serveur arrêté ? CORS ? vérifiez localhost:8000).';
  }
  const fields = Object.entries(info.fieldErrors).map(([field, msgs]) => {
    const list = Array.isArray(msgs) ? msgs.join(' ') : String(msgs);
    return `${field} : ${list}`;
  });
  if (fields.length > 0) {
    text += ` — ${fields.join(' • ')}`;
  }
  return text;
}
