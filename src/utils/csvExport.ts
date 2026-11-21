/**
 * Export CSV UTF-8 avec BOM (\uFEFF) et séparateur `;` (accents préservés dans Excel).
 * Neutralise l'injection de formules tableur (CWE-1236 : préfixes `=`, `+`, `-`, `@`, `\t`, `\r`).
 */
const FORMULA_PREFIX_RE = /^[=+\-@\t\r]/;

export function sanitizeCsvCell(value: unknown): string {
  const normalized = String(value ?? '').replace(/\r?\n/g, ' ');
  const neutralized = FORMULA_PREFIX_RE.test(normalized) ? `'${normalized}` : normalized;
  return `"${neutralized.replace(/"/g, '""')}"`;
}

export function buildCsvContent(headers: string[], rows: Array<Array<unknown>>): string {
  const lines = [
    headers.map(sanitizeCsvCell).join(';'),
    ...rows.map((row) => row.map(sanitizeCsvCell).join(';')),
  ];
  return `\uFEFF${lines.join('\n')}`;
}

export function downloadCsvFile(filename: string, headers: string[], rows: Array<Array<unknown>>): void {
  const content = buildCsvContent(headers, rows);
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
