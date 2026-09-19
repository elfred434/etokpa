import toast from 'react-hot-toast';
import MIcon from '../../shared/MIcon';
import { useLanguage } from '../../../context/LanguageContext';

const soon = (label: string) => () => toast(`${label} — bientôt disponible`);

/** Footer sombre de l'accueil — copie conforme du code.html Stitch. */
export default function DarkFooter() {
  const { isFr } = useLanguage();

  return (
    <footer className="mt-xl bg-on-surface py-xl text-warm">
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-xl px-4 md:grid-cols-4">
        <div className="col-span-1">
          <h2 className="mb-md font-h2 text-h2 text-primary-light">TOKPa</h2>
          <p className="text-body text-surface-variant">
            {isFr
              ? 'Le meilleur du marché béninois dans votre poche. Fraîcheur garantie et prix négociables.'
              : 'The best of the Benin market in your pocket. Guaranteed freshness and negotiable prices.'}
          </p>
        </div>

        <div>
          <h4 className="mb-md font-bold">{isFr ? 'Plateforme' : 'Platform'}</h4>
          <ul className="flex flex-col gap-sm text-body text-surface-variant">
            <li>
              <button type="button" onClick={soon(isFr ? 'Comment ça marche' : 'How it works')} className="hover:text-white">
                {isFr ? 'Comment ça marche' : 'How it works'}
              </button>
            </li>
            <li>
              <button type="button" onClick={soon(isFr ? 'Devenir Vendeur' : 'Become a Seller')} className="hover:text-white">
                {isFr ? 'Devenir Vendeur' : 'Become a Seller'}
              </button>
            </li>
            <li>
              <button type="button" onClick={soon(isFr ? 'Devenir Livreur' : 'Become a Delivery Driver')} className="hover:text-white">
                {isFr ? 'Devenir Livreur' : 'Become a Delivery Driver'}
              </button>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="mb-md font-bold">{isFr ? 'Aide' : 'Help'}</h4>
          <ul className="flex flex-col gap-sm text-body text-surface-variant">
            <li>
              <button type="button" onClick={soon(isFr ? 'Support Client' : 'Customer Support')} className="hover:text-white">
                {isFr ? 'Support Client' : 'Customer Support'}
              </button>
            </li>
            <li>
              <button type="button" onClick={soon(isFr ? "Conditions d'utilisation" : 'Terms of Service')} className="hover:text-white">
                {isFr ? "Conditions d'utilisation" : 'Terms of Service'}
              </button>
            </li>
            <li>
              <button type="button" onClick={soon(isFr ? 'Politique de confidentialité' : 'Privacy Policy')} className="hover:text-white">
                {isFr ? 'Politique de confidentialité' : 'Privacy Policy'}
              </button>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="mb-md font-bold">{isFr ? 'Suivez-nous' : 'Follow Us'}</h4>
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
        © 2024 TOKPa. {isFr ? 'Tous droits réservés.' : 'All rights reserved.'} Cotonou, Bénin.
      </div>
    </footer>
  );
}
