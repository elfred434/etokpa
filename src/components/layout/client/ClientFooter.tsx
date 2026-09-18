import toast from 'react-hot-toast';

const LINKS = ['Aide', "Conditions d'utilisation", 'Politique de confidentialité', 'Contact'];

/** Footer clair des pages marchandes (maquette panier/caisse). */
export default function ClientFooter() {
  return (
    <footer className="mt-auto w-full border-t border-line bg-surface px-lg py-xl">
      <div className="mx-auto flex max-w-[1200px] flex-col justify-between gap-lg md:flex-row md:items-center">
        <div className="flex flex-col gap-sm">
          <span className="text-h3 font-medium text-primary">TOKPa</span>
          <p className="text-secondary text-ink-2">© 2024 TOKPa. Tous droits réservés.</p>
        </div>
        <nav className="flex flex-wrap gap-lg">
          {LINKS.map((label) => (
            <button
              key={label}
              type="button"
              onClick={() => toast(`${label} — à venir`)}
              className="text-secondary text-ink-2 opacity-80 transition-all hover:text-primary hover:opacity-100"
            >
              {label}
            </button>
          ))}
        </nav>
      </div>
    </footer>
  );
}
