// Transforme les lignes de tableaux sur mobile en fiche détaillée ouvrable au toucher.
import { useEffect, useState } from 'react';
import { DIALOG_CANCEL_BTN_CLASS, DialogFrame } from './DialogFrame';
import { tx } from '../../i18n/tx';

type Sheet = { title: string; rows: { label: string; value: string }[] };

const HIDE = 'tokpa-mobile-hide';

// Helper cellText : réalise le traitement métier associé.
function cellText(cell: Element): string {
  return (cell.textContent ?? '').replace(/\s+/g, ' ').trim();
}

// Helper compact : réalise le traitement métier associé.
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

// Helper sheetFromRow : réalise le traitement métier associé.
function sheetFromRow(row: HTMLTableRowElement): Sheet | null {
  const table = row.closest('table');
  if (!table || table.dataset.mobileDetail === 'native') return null;
  const headers = [...table.querySelectorAll('thead th')].map((th) => cellText(th));
  const cells = [...row.querySelectorAll<HTMLTableCellElement>(':scope > td')].filter((td) => td.colSpan <= 1);
  if (cells.length < 2) return null;
  const rows = cells
    .map((td, index) => ({ label: headers[index] || `Info ${index + 1}`, value: cellText(td) }))
    .filter((item) => item.value && item.value !== '—');
  if (rows.length === 0) return null;
  return { title: rows[0].value, rows };
}

// Composant React MobileTableBridge : prépare l’état et affiche son interface.
export default function MobileTableBridge({ rootId }: { rootId: string }) {
  const [sheet, setSheet] = useState<Sheet | null>(null);

  // Enregistre les écouteurs d’événements navigateur et les nettoie au démontage.
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
      const row = target.closest<HTMLTableRowElement>('tbody tr');
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
  // Retourne le rendu JSX du composant.
  return (
    <DialogFrame
      icon="info"
      title={sheet.title}
      onClose={() => setSheet(null)}
      footer={
        <button type="button" className={DIALOG_CANCEL_BTN_CLASS} onClick={() => setSheet(null)}>
          {tx('Fermer')}
        </button>
      }
    >
      <dl className="space-y-3">
        {sheet.rows.map((row) => (
          <div key={`${row.label}-${row.value}`} className="border-b border-border-default pb-2 last:border-b-0">
            <dt className="text-micro font-semibold uppercase tracking-wide text-text-secondary">{row.label}</dt>
            <dd className="mt-1 break-words text-label font-semibold text-on-surface">{row.value}</dd>
          </div>
        ))}
      </dl>
    </DialogFrame>
  );
}
