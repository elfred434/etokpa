import { useEffect, useState } from 'react';
import { Link, useParams } from '@tanstack/react-router';
import toast from 'react-hot-toast';
import ClientNavbar from '../../../components/layout/client/ClientNavbar';
import ClientBottomNav from '../../../components/layout/client/ClientBottomNav';
import MIcon from '../../../components/shared/MIcon';
import EmptyState from '../../../components/shared/EmptyState';
import ApiErrorState from '../../../components/shared/ApiErrorState';
import { useAppDispatch } from '../../../hooks/useStore';
import { add } from '../../../store/slices/cart/cartSlice';
import type { Product } from '../../../types/models';
import { catalogApi, type ApiBundle, type ApiProduct } from '../../../services/api';
import { mapApiProduct } from '../../../utils/productMap';
import { absImageUrl } from '../../../utils/imageUrl';
import { alertApiError, apiErrorStatus } from '../../../utils/apiError';
import { useLanguage } from '../../../context/LanguageContext';
import { tx } from '../../../i18n/tx';

/* ---- Fiche pack 100 % API (route /pack/$packId) ----
 * Le backend n'expose pas GET /bundles/{id} : la fiche lit la liste publique
 * GET /bundles et retrouve le pack par son identifiant.
 *
 * Le panier n'accepte que des produits : « Ajouter au panier » n'envoie pas le
 * pack, mais chacun de ses produits avec la quantité du pack.
 */

type PackLine = {
  id: number;
  nom: string;
  qte: number;
  prix: number | null;
  prixMinimum: number | null;
  stock: number;
  disponible: boolean;
  description: string | null;
  imageUrl: string | null;
  image: string | null;
};

/** Produit du pack → modèle du panier. Mêmes règles que la fiche produit (mapApiProduct). */
function toCartProduct(l: PackLine): Product {
  const asApiProduct: ApiProduct = {
    id: l.id,
    nom: l.nom,
    description: l.description ?? undefined,
    prix: l.prix ?? 0,
    prix_minimum: l.prixMinimum ?? l.prix ?? 0,
    devise: 'XOF',
    image_url: l.imageUrl,
    stock: l.stock,
    disponible: l.disponible,
  };
  return mapApiProduct(asApiProduct);
}

export default function PackPage() {
  useLanguage();
  const dispatch = useAppDispatch();
  const { packId } = useParams({ from: '/pack/$packId' });

  const [pack, setPack] = useState<ApiBundle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  // Échec autre que 404 : message de l'API + Réessayer (pas de pack factice).
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // GET /api/bundles → le pack demandé
  useEffect(() => {
    let alive = true;
    setIsLoading(true);
    setNotFound(false);
    setLoadError(null);
    catalogApi
      .getBundles()
      .then((res) => {
        if (!alive) return;
        const list: ApiBundle[] = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        const found = list.find((b) => String(b.id) === String(packId)) ?? null;
        if (found) setPack(found);
        else setNotFound(true);
      })
      .catch((err) => {
        if (!alive) return;
        // 404 = pack inexistant ; tout autre échec = message exact de l'API
        if (apiErrorStatus(err) === 404) setNotFound(true);
        else setLoadError(alertApiError(err, 'pack-load'));
      })
      .finally(() => {
        if (alive) setIsLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [packId, reloadKey]);

  /* ---------- États de chargement / erreur ---------- */
  if (isLoading) {
    return (
      <div className="bg-bg-app min-h-screen flex items-center justify-center font-body text-text-main">
        <MIcon name="sync" className="text-primary text-4xl animate-spin" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="bg-bg-app min-h-screen pb-24 font-body text-text-main">
        <ClientNavbar />
        <main className="flex justify-center pt-[80px] px-md">
          <div className="w-full max-w-[560px] bg-white rounded-xl border border-border-default p-xl">
            <ApiErrorState
              title={tx("Impossible de charger le pack")}
              message={loadError}
              onRetry={() => setReloadKey((k) => k + 1)}
            />
          </div>
        </main>
        <ClientBottomNav />
      </div>
    );
  }

  if (notFound || !pack) {
    return (
      <div className="bg-bg-app min-h-screen pb-24 font-body text-text-main">
        <ClientNavbar />
        <main className="flex justify-center pt-[80px] px-md">
          <div className="w-full max-w-[560px] bg-white rounded-xl border border-border-default p-xl">
            <EmptyState
              icon={<MIcon name="search_off" className="text-4xl text-primary" />}
              title={tx("Pack introuvable")}
              description={tx("Ce pack n’existe pas ou n’est plus disponible au marché.")}
              action={
                <Link
                  to="/catalogue"
                  search={{ cat: 'pack' }}
                  className="px-lg py-3 bg-primary-container text-white rounded-lg font-bold"
                >
                  {tx("Retour aux packs")}
                </Link>
              }
            />
          </div>
        </main>
        <ClientBottomNav />
      </div>
    );
  }

  const inclus = pack.products ?? pack.produits ?? [];
  const prixTotal = Number(pack.prix_total ?? 0);
  const prixMinimum = pack.prix_minimum == null ? null : Number(pack.prix_minimum);
  const disponible = pack.disponible !== false;
  const image = absImageUrl(pack.img_url);

  // Somme des produits au prix catalogue : sert de repère, jamais de prix de vente.
  const lignes: PackLine[] = inclus.map((it) => ({
    id: Number(it.id),
    nom: it.nom,
    qte: Math.max(1, Number(it.pivot?.qte ?? 1)),
    prix: it.prix == null || it.prix === '' ? null : Number(it.prix),
    prixMinimum: it.prix_minimum == null || it.prix_minimum === '' ? null : Number(it.prix_minimum),
    stock: Number(it.stock ?? 0),
    disponible: it.disponible !== false,
    description: it.description ?? null,
    imageUrl: it.image_url ?? it.img_url ?? null,
    image: absImageUrl(it.image_url ?? it.img_url),
  }));

  // Un produit indisponible bloque la commande entière (le backend refuse en 422).
  const indisponibles = lignes.filter((l) => !l.disponible || l.stock <= 0);
  const peutAjouter = lignes.length > 0 && indisponibles.length === 0;
  const sommeProduits = lignes.reduce((s, l) => s + (l.prix ?? 0) * l.qte, 0);

  /**
   * Le panier ne connaît pas les packs : on y met les produits du pack,
   * chacun avec la quantité définie par le pack.
   */
  const addPackToCart = () => {
    if (!peutAjouter) {
      toast.error(
        tx("Impossible d’ajouter ce pack : un de ses produits est indisponible."),
      );
      return;
    }
    lignes.forEach((l) => dispatch(add({ product: toCartProduct(l), quantity: l.qte })));
    toast.success(
      `${lignes.length} ${tx("produit(s) du pack ajoutés au panier")}`,
    );
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-[#fcfaf8] font-body text-ink">
      <ClientNavbar />
      <div className="flex flex-1 justify-center px-3 pb-[80px] pt-[64px] sm:px-6 md:px-12 md:pb-8 md:pt-[72px] lg:px-20 xl:px-40">
        <div className="flex w-full max-w-[1200px] flex-1 flex-col">
          {/* ---- Breadcrumbs ---- */}
          <div className="flex flex-wrap gap-2 py-3 md:px-10">
            <Link to="/" className="text-xs font-medium leading-normal text-[#9e6b47] sm:text-sm">
              {tx("Accueil")}
            </Link>
            <span className="text-xs font-medium leading-normal text-[#9e6b47] sm:text-sm">/</span>
            <Link to="/catalogue" search={{ cat: 'pack' }} className="text-xs font-medium leading-normal text-[#9e6b47] sm:text-sm">
              {tx("Packs & Bundles")}
            </Link>
            <span className="text-xs font-medium leading-normal text-[#9e6b47] sm:text-sm">/</span>
            <span className="text-xs font-medium leading-normal text-[#1c130d] sm:text-sm">{pack.nom}</span>
          </div>

          <main className="grid grid-cols-1 gap-6 rounded-xl bg-white p-4 pb-8 shadow-sm md:gap-8 md:px-10 md:pb-12 lg:grid-cols-2">
            {/* LEFT COLUMN: Image */}
            <div className="flex flex-col gap-4 md:gap-6">
              <div className="relative flex h-[260px] w-full items-center justify-center overflow-hidden rounded-[14px] bg-gradient-to-br from-[#FFF7ED] to-[#FED7AA] sm:h-[320px] md:h-[400px]">
                <div
                  className={`absolute left-4 top-4 flex items-center gap-1.5 rounded-full border px-3 py-1 shadow-sm ${
                    disponible ? 'border-success bg-success-light' : 'border-error bg-error-light'
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${disponible ? 'bg-success' : 'bg-error'}`} />
                  <span className={`text-xs font-semibold ${disponible ? 'text-success-dark' : 'text-error-dark'}`}>
                    {disponible ? tx("Disponible") : tx("Rupture de stock")}
                  </span>
                </div>
                {image ? (
                  <img src={image} alt={pack.nom} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-4 text-primary-hover">
                    <MIcon name="shopping_basket" style={{ fontSize: 64 }} />
                    <span className="text-xs font-medium opacity-70">{tx("Photo bientôt disponible")}</span>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: Details */}
            <div className="flex flex-col gap-6">
              <div>
                <p className="mb-1 text-micro uppercase tracking-widest text-ink-3">{tx("Packs & Bundles")}</p>
                <h1 className="text-h1 text-ink">{pack.nom}</h1>
                <div className="mt-3 flex flex-wrap items-center gap-4">
                  {inclus.length > 0 && (
                    <span className="text-micro text-ink-2">
                      {inclus.length} {tx("produit(s) inclus dans ce pack")}
                    </span>
                  )}
                </div>
              </div>

              <hr className="border-line" />

              <div className="flex items-end gap-3">
                <span className="text-[28px] font-bold leading-none text-primary">
                  {prixTotal.toLocaleString('fr-FR')} FCFA
                </span>
              </div>

              {prixMinimum !== null && (
                <p className="text-[12px] italic text-ink-2">
                  {tx("Prix min. négociable")} : {prixMinimum.toLocaleString('fr-FR')} FCFA
                </p>
              )}

              {/* Le panier enregistre des produits, pas des packs : le pack y entre par ses produits. */}
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={addPackToCart}
                  disabled={!peutAjouter}
                  className="flex w-full transform items-center justify-center gap-2 rounded-[10px] bg-primary py-3.5 font-bold text-white transition-all hover:bg-primary-hover active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <MIcon name="add_shopping_cart" />
                  {tx("Ajouter le pack au panier")}
                </button>

                {lignes.length === 0 ? (
                  <p className="text-[12px] italic text-ink-2">
                    {tx("Ce pack ne contient aucun produit : rien à ajouter au panier.")}
                  </p>
                ) : indisponibles.length > 0 ? (
                  <p className="text-[12px] font-semibold text-error">
                    {indisponibles.map((l) => l.nom).join(', ')} —{' '}
                    {tx("indisponible(s) : le pack ne peut pas être commandé.")}
                  </p>
                ) : (
                  <p className="text-[12px] italic text-ink-2">
                    {lignes.length} {tx("produit(s) rejoindront le panier au prix catalogue, soit")}{' '}
                    {sommeProduits.toLocaleString('fr-FR')} FCFA
                    {sommeProduits !== prixTotal && (
                      <>
                        {' '}
                        {tx("au lieu des")} {prixTotal.toLocaleString('fr-FR')} FCFA {tx("du pack.")}
                      </>
                    )}
                  </p>
                )}
              </div>
            </div>
          </main>

          {/* ---- Composition du pack ---- */}
          <section className="mx-auto mt-8 mb-20 w-full max-w-[1200px] overflow-hidden rounded-xl bg-white shadow-sm">
            <div className="border-b border-line px-4 py-4 sm:px-8">
              <h3 className="text-h3 text-ink">{tx("Produits inclus")}</h3>
            </div>

            {lignes.length === 0 ? (
              <div className="p-4 md:p-8">
                <EmptyState
                  icon={<MIcon name="inventory_2" className="text-4xl text-primary" />}
                  title={tx("Composition non renseignée")}
                  description={tx("Les produits de ce pack ne sont pas encore renseignés.")}
                />
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {lignes.map((l) => (
                  <li key={l.id} className="flex items-center gap-4 px-4 py-3 md:px-8">
                    <div className="flex h-[54px] w-[54px] shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-[#FFF7ED] to-[#FED7AA]">
                      {l.image ? (
                        <img src={l.image} alt={l.nom} className="h-full w-full object-cover" />
                      ) : (
                        <MIcon name="local_mall" className="text-[22px] text-primary-hover" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-ink">{l.nom}</p>
                      <p className="text-micro text-ink-2">
                        {tx("Quantité")} : {l.qte}
                        {l.prix !== null && !Number.isNaN(l.prix) && (
                          <> · {l.prix.toLocaleString('fr-FR')} FCFA</>
                        )}
                      </p>
                    </div>
                    <Link
                      to="/produit/$productId"
                      params={{ productId: String(l.id) }}
                      className="flex shrink-0 items-center gap-1 rounded-lg border border-primary px-3 py-2 text-label font-bold text-primary transition-colors hover:bg-primary-lighter"
                    >
                      {tx("Voir le produit")}
                      <MIcon name="chevron_right" className="text-sm" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            {pack.description && (
              <div className="border-t border-line p-4 md:p-8">
                <h4 className="mb-2 text-label font-bold uppercase tracking-widest text-ink-3">
                  {tx("Description")}
                </h4>
                <p className="max-w-3xl text-body leading-relaxed text-ink-2">{pack.description}</p>
              </div>
            )}
          </section>
        </div>
      </div>
      <ClientBottomNav />
    </div>
  );
}
