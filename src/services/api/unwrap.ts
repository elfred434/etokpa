// eslint-disable-next-line @typescript-eslint/no-explicit-any
// Fonctions utilitaires d’extraction des réponses API paginées et de formatage des montants/dates.
export function unwrap(res: any): any {
  const body = res?.data ?? res;
  if (body && typeof body === 'object' && 'success' in body && 'data' in body) {
    return body.data;
  }
  return body;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
// Helper listOf : réalise le traitement métier associé.
export function listOf(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.data)) return payload.data;
  return [];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
// Helper metaOf : réalise le traitement métier associé.
export function metaOf(res: any): { page: number; total: number } | null {
  const body = res?.data ?? res;
  const meta = body?.meta ?? body;
  if (meta && typeof meta === 'object' && ('current_page' in meta || 'total' in meta)) {
    return { page: meta.current_page ?? meta.page ?? 1, total: meta.total ?? 0 };
  }
  return null;
}

// Transforme ou formate les données via fmtFcfa.
export function fmtFcfa(n: number | string | null | undefined): string {
  const v = typeof n === 'string' ? parseFloat(n) : n;
  if (v == null || Number.isNaN(v)) return '—';
  return `${Math.round(v).toLocaleString('fr-FR')} FCFA`;
}

// Helper heureCourte : réalise le traitement métier associé.
export function heureCourte(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

// Helper dateCourte : réalise le traitement métier associé.
export function dateCourte(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}
