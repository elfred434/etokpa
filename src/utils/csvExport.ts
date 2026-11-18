/**
 * Export CSV UTF-8 avec BOM (\uFEFF) et séparateur `;` (accents préservés dans Excel).
 */
export function buildCsvContent(headers: string[], rows: Array<Array<unknown>>): string {
  const cell = (value: unknown) => `"${String(value ?? '').replace(/\r?\n/g, ' ').replace(/"/g, '""')}"`;
  const lines = [
    headers.map(cell).join(';'),
    ...rows.map((row) => row.map(cell).join(';')),
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
