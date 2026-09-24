import { useEffect, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import toast from 'react-hot-toast';
import ClientNavbar from '../../../components/layout/client/ClientNavbar';
import ClientBottomNav from '../../../components/layout/client/ClientBottomNav';
import DarkFooter from '../../../components/layout/client/DarkFooter';
import MIcon from '../../../components/shared/MIcon';
import { useAppDispatch } from '../../../hooks/useStore';
import { add } from '../../../store/slices/cart/cartSlice';
import { submitOffer } from '../../../store/slices/negotiation/negotiationSlice';
import type { Product } from '../../../types/models';
import { useLanguage } from '../../../context/LanguageContext';
import { catalogApi, type ApiProduct } from '../../../services/api';
import { absImageUrl } from '../../../utils/imageUrl';

interface SelectionItem {
  id: string;
  nom: string;
  lieu: string;
  prixLabel: string;
  prix: number;
  image: string;
  badge: 'Disponible' | 'Stock Limité';
}

/** Accueil TOKPa — Connecté au Backend API Laravel + UI Stitch */
export default function HomePage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { t, isFr } = useLanguage();
  const [offre, setOffre] = useState('2100');
  const [selection, setSelection] = useState<SelectionItem[]>([]);

  // Connection API Backend GET /api/products
  useEffect(() => {
    catalogApi.getProducts({ per_page: 8 })
      .then((res) => {
        if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
          const fetched: SelectionItem[] = res.data.slice(0, 4).map((p: ApiProduct) => ({
            id: String(p.id),
            nom: p.nom,
            lieu: 'Marché Dantokpa',
            prixLabel: `${p.prix.toLocaleString('fr-FR')} FCFA`,
            prix: p.prix,
            image: absImageUrl(p.image_url ?? p.img_url) || '/images/design/tomates-1kg.png',
            badge: p.stock > 5 ? 'Disponible' : 'Stock Limité',
          }));
          setSelection(fetched);
        }
      })
      .catch((err) => {
        console.warn('API Products fallback for home:', err);
      });
  }, []);

  const atoutsList = [
    { icon: 'payments', titre: t('home.atouts.a1Title'), texte: t('home.atouts.a1Text') },
    { icon: 'local_shipping', titre: t('home.atouts.a2Title'), texte: t('home.atouts.a2Text') },
    { icon: 'location_on', titre: t('home.atouts.a3Title'), texte: t('home.atouts.a3Text') },
  ];

  const categoriesList = [
    { icon: 'potted_plant', nom: t('categories.vegetables') },
    { icon: 'set_meal', nom: t('categories.fish') },
    { icon: 'liquor', nom: t('categories.spices') },
    { icon: 'shopping_basket', nom: t('categories.packs') },
  ];

  const addToCart = (item: SelectionItem) => {
    const product: Product = {
      id: item.id,
      nom: item.nom,
      origine: item.lieu,
      quantite: 'unité',
      prix: item.prix,
      prixMinimum: Math.round(item.prix * 0.8),
      categorie: 'vegetable',
      stock: item.badge === 'Disponible' ? 'available' : 'low',
      badges: [],
      image: item.image,
    };
    dispatch(add({ product }));
    toast.success(isFr ? `${item.nom} ajouté au panier` : `${item.nom} added to cart`);
  };

  return (
    <div className="min-h-screen bg-page font-body text-on-surface">
      <ClientNavbar />

      <main className="mx-auto w-full max-w-[1200px] overflow-x-hidden px-3 sm:px-4 pb-[80px] pt-[52px] lg:pb-0">
        {/* ---- Hero ---- */}
        <section className="relative mt-md sm:mt-lg flex min-h-[380px] sm:min-h-[460px] md:min-h-[500px] items-center overflow-hidden rounded-[20px] sm:rounded-[24px] border border-line bg-white shadow-sm">
          <div className="absolute inset-0 z-0">
            <img
              alt="Marché TOKPa Illustration"
              className="h-full w-full object-cover"
              src="/images/brand/illustration-pattern.png"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-white via-white/80 to-transparent" />
          </div>
          <div className="relative z-10 max-w-3xl p-4 sm:p-8 md:p-xl">
            <h1 className="mb-sm sm:mb-md font-h1 text-[26px] sm:text-[36px] md:text-[42px] font-bold leading-tight text-primary-darker">
              {t('home.heroTitle')}
            </h1>
            <p className="mb-md sm:mb-lg text-sm sm:text-base md:text-lg leading-relaxed text-on-surface-variant">
              {t('home.heroSub')}
            </p>
            <button
              type="button"
              onClick={() => navigate({ to: '/catalogue' })}
              className="scale-interaction flex items-center gap-2 rounded-[10px] bg-primary px-4 py-3 sm:px-lg sm:py-3.5 text-xs sm:text-sm font-bold text-white hover:bg-primary-hover cursor-pointer"
            >
              {t('home.heroCta')}
              <MIcon name="arrow_forward" />
            </button>
          </div>
        </section>

        {/* ---- Value Propositions ---- */}
        <section className="my-lg sm:my-xl grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-3">
          {atoutsList.map((a) => (
            <div key={a.titre} className="flex items-start gap-md rounded-[14px] border border-line bg-card p-4 sm:p-lg">
              <div className="rounded-xl bg-primary-lighter p-2 sm:p-sm">
                <MIcon name={a.icon} className="text-[24px] sm:text-[32px] text-primary-shade" />
              </div>
              <div>
                <h3 className="font-h3 text-sm sm:text-base font-bold text-on-surface">{a.titre}</h3>
                <p className="mt-xs text-xs sm:text-body text-ink-2">{a.texte}</p>
              </div>
            </div>
          ))}
        </section>

        {/* ---- Categories Grid ---- */}
        <section className="mb-lg sm:mb-xl">
          <div className="mb-md sm:mb-lg flex items-end justify-between">
            <h2 className="font-h1 text-lg sm:text-h1 text-on-surface">{t('home.exploreCategories')}</h2>
            <Link to="/catalogue" className="flex items-center gap-1 text-xs sm:text-sm font-bold text-primary-shade hover:underline">
              {t('common.seeAll')} <MIcon name="chevron_right" className="text-[18px]" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-md md:grid-cols-4">
            {categoriesList.map((c) => (
              <div
                key={c.nom}
                onClick={() => navigate({ to: '/catalogue' })}
                className="bento-hover group flex cursor-pointer flex-col items-center gap-sm rounded-[14px] border border-transparent bg-warm-low p-4 sm:p-lg hover:border-primary-light"
              >
                <MIcon name={c.icon} className="text-[36px] sm:text-[48px] text-primary-shade transition-transform group-hover:scale-110" />
                <span className="font-h3 text-xs sm:text-base text-on-surface">{c.nom}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ---- Featured Products ---- */}
        {selection.length > 0 && (
          <section className="mb-lg sm:mb-xl">
            <div className="mb-md sm:mb-lg flex items-end justify-between">
              <h2 className="font-h1 text-lg sm:text-h1 text-on-surface">{t('home.selectionTitle')}</h2>
              <Link to="/catalogue" className="flex items-center gap-1 text-xs sm:text-sm font-bold text-primary-shade hover:underline">
                {t('common.seeAll')} <MIcon name="chevron_right" className="text-[18px]" />
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {selection.map((item) => (
                <div
                  key={item.id}
                  onClick={() => navigate({ to: '/produit/$productId', params: { productId: item.id } })}
                  className="bento-hover group cursor-pointer overflow-hidden rounded-[14px] border border-line bg-white p-md shadow-xs"
                >
                  <div className="relative mb-md h-48 sm:h-40 overflow-hidden rounded-[10px] bg-page flex items-center justify-center">
                    {item.image.startsWith('/') ? (
                      <div className="w-full h-full bg-gradient-to-br from-primary-lighter to-primary-light flex items-center justify-center">
                        <MIcon name="shopping_bag" className="text-4xl text-primary" />
                      </div>
                    ) : (
                      <img
                        src={item.image}
                        alt={item.nom}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    )}
                    <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-success px-2 py-0.5 text-micro text-white">
                      <span className="h-1.5 w-1.5 rounded-full bg-white" /> {item.badge}
                    </span>
                  </div>
                  <div className="flex flex-col gap-xs">
                    <span className="text-label text-ink-2">{item.lieu}</span>
                    <h3 className="font-h3 font-bold text-on-surface line-clamp-1">{item.nom}</h3>
                    <div className="mt-sm flex items-center justify-between">
                      <span className="font-price text-price text-primary-shade">{item.prixLabel}</span>
                      <button
                        type="button"
                        aria-label={`Ajouter ${item.nom}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          addToCart(item);
                        }}
                        className="scale-interaction flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white cursor-pointer"
                      >
                        <MIcon name="add" className="text-[18px]" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ---- Negotiation Module Placeholder ---- */}
        <section className="mb-lg sm:mb-xl bg-white rounded-[14px] border-l-[3px] border-secondary-container p-4 sm:p-lg flex flex-col md:flex-row items-center justify-between gap-md sm:gap-lg">
          <div className="w-full md:w-[70%]">
            <div className="inline-flex max-w-full items-center gap-2 bg-secondary-container/10 text-on-secondary-container px-2.5 py-1 rounded-full mb-sm text-xs sm:text-label font-medium uppercase tracking-wider overflow-hidden">
              <span className="material-symbols-outlined text-[16px] sm:text-[18px] shrink-0">handshake</span>
              <span className="truncate sm:whitespace-normal">{t('home.negoBadge')}</span>
            </div>
            <h2 className="font-h1 text-lg sm:text-h1 text-on-surface mb-xs">{t('home.negoTitle')}</h2>
            <p className="text-secondary text-xs sm:text-body leading-relaxed max-w-2xl">
              {t('home.negoText')}
            </p>
          </div>
          <div className="w-full md:w-[30%] bg-bg-app p-4 rounded-xl">
            <div className="flex flex-col gap-sm">
              <div className="flex justify-between items-center text-xs sm:text-label">
                <span className="text-secondary">{t('home.sellerPrice')}</span>
                <span className="font-bold text-on-surface">2.500 FCFA</span>
              </div>
              <div className="h-[1.5px] bg-border-default w-full"></div>
              <div className="flex justify-between items-center text-xs sm:text-label">
                <span className="text-secondary">{t('home.yourOffer')}</span>
                <input
                  className="w-20 sm:w-24 text-right border-none bg-white rounded-lg p-1 font-bold text-primary focus:ring-1 focus:ring-primary text-xs sm:text-sm"
                  type="text"
                  value={offre}
                  onChange={(e) => setOffre(e.target.value)}
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  const proposed = Number(offre.replace(/\D/g, '')) || 2100;
                  dispatch(
                    submitOffer({
                      productId: 'p_home_nego',
                      productName: 'Tomates Fraîches (1kg)',
                      originalPrice: 2500,
                      proposedPrice: proposed,
                      minPrice: 2000,
                    }),
                  );
                  toast.success(isFr ? 'Offre envoyée au marché !' : 'Offer sent to market!');
                  navigate({ to: '/negociations' });
                }}
                className="w-full bg-secondary text-white font-bold py-2 rounded-lg mt-2 text-xs sm:text-sm scale-interaction cursor-pointer"
              >
                {t('home.sendOffer')}
              </button>
            </div>
          </div>
        </section>
      </main>

      <DarkFooter />
      <ClientBottomNav />
    </div>
  );
}
