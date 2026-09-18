import { Link } from '@tanstack/react-router';
import toast from 'react-hot-toast';

const LINKS = ['Aide & Support', 'Vendre sur TOKPa', 'Livraison'];

/** Footer clair des pages marchandes (maquette catalogue). */
export default function ClientFooter() {
  return (
    <footer className="mt-xl border-t border-line bg-surface">
      <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-md p-lg md:flex-row">
        <p className="text-[13px] text-ink-2">
          <span className="mr-sm text-[15px] font-bold text-primary">TOKPa</span>
          © 2026 - Le Marché Béninois en ligne
        </p>
        <nav className="flex flex-wrap items-center justify-center gap-lg">
          {LINKS.map((label) => (
            <button
              key={label}
              type="button"
              onClick={() => toast(`${label} — à venir`)}
              className="text-[13px] font-medium text-ink-2 transition-colors hover:text-primary"
            >
              {label}
            </button>
          ))}
          <Link to="/notifications" className="text-[13px] font-medium text-ink-2 transition-colors hover:text-primary">
            Notifications
          </Link>
        </nav>
      </div>
    </footer>
  );
}
