import toast from 'react-hot-toast';
import { IconMessageCircle, IconShare3 } from '@tabler/icons-react';

const COLS = [
  { title: 'Plateforme', links: ['Comment ça marche', 'Devenir Vendeur', 'Devenir Livreur'] },
  { title: 'Aide', links: ['Support Client', "Conditions d'utilisation", 'Politique de confidentialité'] },
];

/** Footer sombre 4 colonnes de la maquette d'accueil. */
export default function DarkFooter() {
  return (
    <footer className="mt-xl bg-[#2A1E17] px-lg py-xl text-white">
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-xl md:grid-cols-4">
        <div>
          <span className="text-h3 font-bold text-white">TOKPa</span>
          <p className="mt-sm text-[13px] leading-relaxed text-white/70">
            Le meilleur du marché béninois dans votre poche. Fraîcheur garantie et prix négociables.
          </p>
        </div>
        {COLS.map(({ title, links }) => (
          <div key={title}>
            <h3 className="text-[14px] font-semibold text-white">{title}</h3>
            <ul className="mt-md space-y-sm">
              {links.map((l) => (
                <li key={l}>
                  <button
                    type="button"
                    onClick={() => toast(`${l} — à venir`)}
                    className="text-[13px] text-white/70 transition-colors hover:text-white"
                  >
                    {l}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div>
          <h3 className="text-[14px] font-semibold text-white">Suivez-nous</h3>
          <div className="mt-md flex gap-sm">
            <button
              type="button"
              aria-label="Nous écrire"
              onClick={() => toast('Réseaux sociaux — à venir')}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
            >
              <IconMessageCircle size={18} />
            </button>
            <button
              type="button"
              aria-label="Partager"
              onClick={() => toast('Partage — à venir')}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
            >
              <IconShare3 size={18} />
            </button>
          </div>
        </div>
      </div>
      <div className="mx-auto mt-xl max-w-[1200px] border-t border-white/10 pt-lg text-center text-[12px] text-white/60">
        © 2024 TOKPa. Tous droits réservés. Cotonou, Bénin.
      </div>
    </footer>
  );
}
