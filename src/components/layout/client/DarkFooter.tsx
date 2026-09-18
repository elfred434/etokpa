import toast from 'react-hot-toast';
import MIcon from '../../shared/MIcon';

const soon = (label: string) => () => toast(`${label} — bientôt disponible`);

/** Footer sombre de l'accueil — copie conforme du code.html Stitch. */
export default function DarkFooter() {
  return (
    <footer className="mt-xl bg-on-surface py-xl text-warm">
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-xl px-4 md:grid-cols-4">
        <div className="col-span-1">
          <h2 className="mb-md font-h2 text-h2 text-primary-light">TOKPa</h2>
          <p className="text-body text-surface-variant">
            Le meilleur du marché béninois dans votre poche. Fraîcheur garantie et prix négociables.
          </p>
        </div>

        <div>
          <h4 className="mb-md font-bold">Plateforme</h4>
          <ul className="flex flex-col gap-sm text-body text-surface-variant">
            <li>
              <button type="button" onClick={soon('Comment ça marche')} className="hover:text-white">
                Comment ça marche
              </button>
            </li>
            <li>
              <button type="button" onClick={soon('Devenir Vendeur')} className="hover:text-white">
                Devenir Vendeur
              </button>
            </li>
            <li>
              <button type="button" onClick={soon('Devenir Livreur')} className="hover:text-white">
                Devenir Livreur
              </button>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="mb-md font-bold">Aide</h4>
          <ul className="flex flex-col gap-sm text-body text-surface-variant">
            <li>
              <button type="button" onClick={soon('Support Client')} className="hover:text-white">
                Support Client
              </button>
            </li>
            <li>
              <button type="button" onClick={soon("Conditions d'utilisation")} className="hover:text-white">
                Conditions d'utilisation
              </button>
            </li>
            <li>
              <button type="button" onClick={soon('Politique de confidentialité')} className="hover:text-white">
                Politique de confidentialité
              </button>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="mb-md font-bold">Suivez-nous</h4>
          <div className="flex gap-md">
            <button
              type="button"
              onClick={soon('Facebook')}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-on-surface-variant transition-colors hover:bg-primary-shade"
              aria-label="Facebook"
            >
              <MIcon name="face_nod" />
            </button>
            <button
              type="button"
              onClick={soon('Partager')}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-on-surface-variant transition-colors hover:bg-primary-shade"
              aria-label="Partager"
            >
              <MIcon name="share" />
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-xl max-w-[1200px] border-t border-on-surface-variant px-4 pt-lg text-center text-label text-surface-variant">
        © 2024 TOKPa. Tous droits réservés. Cotonou, Bénin.
      </div>
    </footer>
  );
}
