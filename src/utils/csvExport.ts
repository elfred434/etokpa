// Construit et télécharge des fichiers CSV sécurisés contre l’injection de formules.
const FORMULA_PREFIX_RE = /^[=+\-@\t\r]/;

// Transforme ou formate les données via sanitizeCsvCell.
export function sanitizeCsvCell(value: unknown): string {
  const normalized = String(value ?? '').replace(/\r?\n/g, ' ');
  const neutralized = FORMULA_PREFIX_RE.test(normalized) ? `'${normalized}` : normalized;
  return `"${neutralized.replace(/"/g, '""')}"`;
}

// Transforme ou formate les données via buildCsvContent.
export function buildCsvContent(headers: string[], rows: Array<Array<unknown>>): string {
  const lines = [
    headers.map(sanitizeCsvCell).join(';'),
    ...rows.map((row) => row.map(sanitizeCsvCell).join(';')),
  ];
  return `\uFEFF${lines.join('\n')}`;
}

// Génère et déclenche l’export via downloadCsvFile.
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
