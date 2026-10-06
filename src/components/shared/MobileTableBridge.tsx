import { useEffect, useState } from 'react';
import MIcon from './MIcon';
import { tx } from '../../i18n/tx';

type Sheet = { title: string; rows: { label: string; value: string }[] };

const HIDE = 'tokpa-mobile-hide';

function cellText(cell: Element): string {
  return (cell.textContent ?? '').replace(/\s+/g, ' ').trim();
}

/** Garde l'identité (2 premières colonnes) et les actions, masque le reste sous 768 px. */
function compact(root: ParentNode) {
  root.querySelectorAll('table').forEach((table) => {
    const headRow = table.querySelector('thead tr');
    const heads = headRow ? [...headRow.children] : [];
    const bodyRows = [...table.querySelectorAll('tbody tr')].filter((row) => {
      const cells = [...row.children].filter((cell) => cell.tagName === 'TD');
      return cells.length > 1 && !cells.some((cell) => Number((cell as HTMLTableCellElement).colSpan) > 1);
    });
    const width = Math.max(heads.length, ...bodyRows.map((row) => row.children.length), 0);
    if (width < 3) return;
    const last = width - 1;
    const lastHasAction = bodyRows.some((row) => row.children[last]?.querySelector('button, a, input, select'));
    const keep = new Set([0, 1, ...(lastHasAction ? [last] : [])]);
    const mark = (cell: Element, index: number) => {
      if (cell.tagName !== 'TH' && cell.tagName !== 'TD') return;
      if (Number((cell as HTMLTableCellElement).colSpan) > 1) return;
      cell.classList.toggle(HIDE, !keep.has(index));
    };
    heads.forEach(mark);
    bodyRows.forEach((row) => [...row.children].forEach(mark));
  });
}

function sheetFromRow(row: HTMLTableRowElement): Sheet | null {
  const table = row.closest('table');
  if (!table || table.dataset.mobileDetail === 'native') return null;
  const headers = [...table.querySelectorAll('thead th')].map((th) => cellText(th));
  const cells = [...row.querySelectorAll(':scope > td')].filter((td) => td.colSpan <= 1);
  if (cells.length < 2) return null;
  const rows = cells
    .map((td, index) => ({ label: headers[index] || `Info ${index + 1}`, value: cellText(td) }))
    .filter((item) => item.value && item.value !== '—');
  if (rows.length === 0) return null;
  return { title: rows[0].value, rows };
}

/** Tables admin / manager : colonnes réduites sur téléphone, détail au clic. */
export default function MobileTableBridge({ rootId }: { rootId: string }) {
  const [sheet, setSheet] = useState<Sheet | null>(null);

  useEffect(() => {
    const root = document.getElementById(rootId);
    if (!root) return;
    const run = () => compact(root);
    run();
    const observer = new MutationObserver(run);
    observer.observe(root, { childList: true, subtree: true });
    const onClick = (event: MouseEvent) => {
      if (!window.matchMedia('(max-width: 767px)').matches) return;
      const target = event.target as HTMLElement | null;
      if (!target || target.closest('button, a, input, select, textarea, label')) return;
      const row = target.closest('tbody tr');
      if (!row || !root.contains(row)) return;
      const next = sheetFromRow(row);
      if (!next) return;
      event.preventDefault();
      event.stopPropagation();
      setSheet(next);
    };
    root.addEventListener('click', onClick);
    return () => {
      observer.disconnect();
      root.removeEventListener('click', onClick);
    };
  }, [rootId]);

  if (!sheet) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 sm:items-center sm:p-4" onClick={() => setSheet(null)}>
      <div
        className="max-h-[85vh] w-full max-w-[640px] overflow-y-auto rounded-t-2xl bg-white p-4 shadow-2xl sm:rounded-2xl"
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 className="text-h3 font-h3 font-bold break-words">{sheet.title}</h2>
          <button type="button" className="shrink-0 rounded-lg p-1 text-text-secondary" aria-label={tx('Fermer')} onClick={() => setSheet(null)}>
            <MIcon name="close" />
          </button>
        </div>
        <dl className="space-y-3">
          {sheet.rows.map((row) => (
            <div key={`${row.label}-${row.value}`} className="border-b border-border-default pb-2 last:border-b-0">
              <dt className="text-micro font-semibold uppercase tracking-wide text-text-secondary">{row.label}</dt>
              <dd className="mt-1 break-words text-label font-semibold text-on-surface">{row.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
