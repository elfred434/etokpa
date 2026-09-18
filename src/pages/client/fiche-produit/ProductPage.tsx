import { useState } from 'react';
import { Link, useParams } from '@tanstack/react-router';
import clsx from 'clsx';
import {
  IconStarFilled,
  IconMapPin,
  IconCircleCheck,
  IconRefresh,
  IconCash,
  IconShoppingCart,
} from '@tabler/icons-react';
import toast from 'react-hot-toast';
import ClientNavbar from '../../../components/layout/client/ClientNavbar';
import ClientFooter from '../../../components/layout/client/ClientFooter';
import Badge from '../../../components/shared/Badge';
import QuantityPicker from '../../../components/client/cart/QuantityPicker';
import ProductPlaceholder from '../../../components/client/catalog/ProductPlaceholder';
import { CATEGORIES, PRODUCTS, PRODUCT_DETAILS, SELLER } from '../../../constants/mockData';
import { formatFCFA } from '../../../utils/format';
import { useAppDispatch } from '../../../hooks/useStore';
import { add } from '../../../store/slices/cart/cartSlice';
import { useNavigate } from '@tanstack/react-router';

const TABS = ['Description', 'Vendeur', 'Avis (127)'] as const;

/** Fiche produit — copie conforme de la maquette fiche produit. */
export default function ProductPage() {
  const { productId } = useParams({ from: '/produit/$productId' });
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [qty, setQty] = useState(2);
  const [tab, setTab] = useState<(typeof TABS)[number]>('Description');

  const product = PRODUCTS.find((p) => p.id === productId);
  if (!product) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page">
        <p className="text-ink-2">Produit introuvable.</p>
      </div>
    );
  }

  const category = CATEGORIES.find((c) => c.id === product.categorie);
  const details = PRODUCT_DETAILS[product.id] ?? {
    paras: [
      `${product.nom} sélectionné au ${product.origine} par nos vendeurs partenaires certifiés. Qualité contrôlée à la main, fraîcheur garantie du marché à votre porte.`,
      `Conditionné en ${product.quantite}, ce produit respecte les circuits courts TOKPa : producteurs locaux, prix juste, négociation possible.`,
    ],
    origine: product.origine.replace('Marché ', ''),
    fraicheur: 'Arrivage du jour',
    poids: product.quantite,
    conservation: 'Selon produit, au frais',
  };
  const offre = Math.round((product.prix * 0.85) / 10) * 10;

  const addToCart = () => {
    dispatch(add({ product, quantity: qty }));
    toast.success(`${product.nom} × ${qty} ajouté au panier`);
  };

  return (
    <div className="flex min-h-screen flex-col bg-page">
      <ClientNavbar />

      <main className="mx-auto w-full max-w-[1200px] flex-1 px-md py-lg md:px-lg">
        {/* Fil d'Ariane */}
        <nav className="mb-md flex items-center gap-sm text-[13px]" aria-label="Fil d'Ariane">
          <Link to="/" className="text-ink-2 hover:text-primary">Accueil</Link>
          <span className="text-ink-3">/</span>
          <Link to="/catalogue" className="text-ink-2 hover:text-primary">
            {category?.nom ?? 'Marché'}
          </Link>
          <span className="text-ink-3">/</span>
          <span className="font-medium text-ink">{product.nom}</span>
        </nav>

        <div className="card grid grid-cols-1 gap-xl p-lg md:p-xl lg:grid-cols-2">
          {/* Galerie */}
          <div>
            <div className="relative">
              <Badge variant={product.stock} className="absolute left-md top-md z-10" />
              {product.image ? (
                <img src={product.image} alt={product.nom} className="h-[420px] w-full rounded-[10px] object-cover" />
              ) : (
                <ProductPlaceholder categorie={product.categorie} className="h-[420px]!" />
              )}
            </div>
            <div className="mt-md flex gap-sm">
              {[0, 1, 2, 3].map((i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Visuel ${i + 1}`}
                  className={clsx(
                    'flex h-16 w-16 items-center justify-center rounded-[10px] transition-all',
                    i === 0 ? 'border-2 border-primary bg-card' : 'bg-primary-lighter opacity-70 hover:opacity-100',
                  )}
                >
                  {product.image && i === 0 ? (
                    <img src={product.image} alt="" className="h-full w-full rounded-[8px] object-cover" />
                  ) : (
                    <ProductPlaceholder categorie={product.categorie} size="thumb" className="h-full w-full!" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Infos */}
          <div>
            <p className="micro">{category?.nom ?? 'Légumes frais'}</p>
            <h1 className="mt-xs text-h1 text-ink">{product.nom}</h1>

            <div className="mt-md flex flex-wrap items-center gap-lg">
              <span className="flex items-center gap-sm text-[15px]">
                <IconStarFilled size={20} className="text-amber" />
                <span className="font-bold text-ink">4.5/5</span>
                <span className="text-[13px] text-ink-2">(127 avis)</span>
              </span>
              <span className="flex items-center gap-sm text-[14px] text-ink-2">
                <IconMapPin size={18} className="text-primary" />
                {product.origine}, Zone Akpakpa
              </span>
            </div>

            {/* Vendeur */}
            <div className="mt-lg flex items-center justify-between rounded-[12px] bg-page p-md">
              <div className="flex items-center gap-sm">
                <span className="avatar avatar-client">{SELLER.initiales}</span>
                <div>
                  <p className="text-[14px] font-semibold text-ink">{SELLER.nom}</p>
                  <p className="flex items-center gap-xs text-[13px] text-success-dark">
                    <IconCircleCheck size={16} />
                    Vendeur vérifié
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => toast('Profil vendeur — Sprint 2')}
                className="text-[13px] font-medium text-primary hover:underline"
              >
                Voir profil
              </button>
            </div>

            <div className="my-lg h-px bg-line" aria-hidden="true" />

            <div className="flex items-baseline gap-sm">
              <span className="text-[28px] font-bold text-primary">{formatFCFA(product.prix)}</span>
              <span className="text-[14px] text-ink-2">/ {product.quantite}</span>
            </div>

            <div className="mt-md flex items-center gap-md">
              <span className="text-[14px] text-ink-2">Quantité</span>
              <QuantityPicker quantity={qty} onChange={setQty} />
            </div>

            {/* Module négociation */}
            <div className="mt-lg rounded-r-[12px] border-l-[3px] border-amber bg-amber-light p-lg">
              <p className="flex items-center gap-sm text-micro font-bold tracking-wider text-amber-text uppercase">
                <IconCash size={18} className="text-amber" />
                Proposer votre budget
              </p>
              <div className="mt-md grid grid-cols-[1fr_auto_1fr] items-center gap-sm">
                <div className="rounded-[10px] bg-page p-md text-center">
                  <p className="micro">Prix vendeur</p>
                  <p className="mt-xs font-bold text-ink">{formatFCFA(product.prix)}</p>
                </div>
                <IconRefresh size={20} className="text-amber" />
                <div className="rounded-[10px] border border-dashed border-amber bg-[#FEF3C7] p-md text-center">
                  <p className="micro">Votre offre</p>
                  <p className="mt-xs font-bold text-amber-text">{formatFCFA(offre)}</p>
                </div>
              </div>
              <p className="mt-sm text-[12px] italic text-amber-text">
                Budget min. accepté par le vendeur : {formatFCFA(product.prixMinimum)}
              </p>
              <button
                type="button"
                onClick={() => toast('Négociation — disponible au Sprint 2')}
                className="btn btn-success mt-md w-full"
              >
                Envoyer l'offre
              </button>
              <button
                type="button"
                onClick={() => toast('Négociation annulée')}
                className="mx-auto mt-sm block text-[12px] text-ink-2 hover:text-ink"
              >
                Annuler la négociation
              </button>
            </div>

            <button type="button" onClick={addToCart} className="btn btn-primary mt-lg w-full">
              <IconShoppingCart size={20} />
              Ajouter au panier
            </button>
            <button
              type="button"
              onClick={() => {
                addToCart();
                navigate({ to: '/panier' });
              }}
              className="btn btn-ghost mt-md w-full"
            >
              Acheter maintenant
            </button>
          </div>
        </div>

        {/* Onglets */}
        <div className="card mt-lg p-0">
          <div className="flex border-b border-line">
            {TABS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={clsx(
                  '-mb-px border-b-2 px-lg py-md text-[14px] transition-colors',
                  tab === t ? 'border-primary font-semibold text-ink' : 'border-transparent text-ink-2 hover:text-ink',
                )}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="p-xl">
            {tab === 'Description' && (
              <>
                <h3 className="text-h3 text-ink">Détails du produit</h3>
                {details.paras.map((p) => (
                  <p key={p.slice(0, 24)} className="mt-md text-[15px] leading-relaxed text-ink-2">
                    {p}
                  </p>
                ))}
                <div className="mt-xl grid grid-cols-2 gap-lg md:grid-cols-4">
                  {[
                    ['Origine', details.origine],
                    ['Fraîcheur', details.fraicheur],
                    ['Poids moyen', details.poids],
                    ['Conservation', details.conservation],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <p className="micro">{label}</p>
                      <p className="mt-xs text-[14px] font-medium text-ink">{value}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
            {tab === 'Vendeur' && (
              <div className="flex items-center gap-md">
                <span className="avatar avatar-lg avatar-client">{SELLER.initiales}</span>
                <div>
                  <p className="text-[15px] font-semibold text-ink">{SELLER.nom}</p>
                  <p className="flex items-center gap-xs text-[13px] text-success-dark">
                    <IconCircleCheck size={16} />
                    Vendeuse partenaire certifiée — {product.origine}
                  </p>
                  <p className="mt-sm max-w-[520px] text-[13px] leading-relaxed text-ink-2">
                    S'approvisionne quotidiennement auprès des producteurs locaux de la zone de Ouidah
                    pour vous offrir le meilleur de la terre.
                  </p>
                </div>
              </div>
            )}
            {tab === 'Avis (127)' && (
              <div className="space-y-lg">
                {[
                  { nom: 'Kossi A.', note: 5, texte: 'Très frais, livré rapidement à Cadjehoun. Je recommande !' },
                  { nom: 'Mariam D.', note: 4, texte: 'Bonne qualité, négociation acceptée en 10 minutes.' },
                ].map((a) => (
                  <div key={a.nom} className="flex items-start gap-md">
                    <span className="avatar avatar-client">{a.nom[0]}</span>
                    <div>
                      <p className="flex items-center gap-sm text-[14px] font-semibold text-ink">
                        {a.nom}
                        <span className="flex items-center gap-xs text-[12px] font-normal text-amber">
                          <IconStarFilled size={14} /> {a.note}/5
                        </span>
                      </p>
                      <p className="mt-xs text-[13px] text-ink-2">{a.texte}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <ClientFooter />
    </div>
  );
}
