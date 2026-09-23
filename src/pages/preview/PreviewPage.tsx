import { useState } from 'react';
import type { ReactNode } from 'react';
import { IconShoppingCart, IconCheck } from '@tabler/icons-react';
import ClientNavbar from '../../components/layout/client/ClientNavbar';
import ClientFooter from '../../components/layout/client/ClientFooter';
import Badge from '../../components/shared/Badge';
import StatusBadge from '../../components/shared/StatusBadge';
import Pagination from '../../components/shared/Pagination';
import EmptyState from '../../components/shared/EmptyState';
import OrderStepper from '../../components/shared/OrderStepper';
import NotificationItem from '../../components/shared/NotificationItem';
import Alert from '../../components/ui/Alert';
import TextField from '../../components/ui/TextField';
import SelectField from '../../components/ui/SelectField';
import Checkbox from '../../components/ui/Checkbox';
import Divider from '../../components/ui/Divider';
import ProductCard from '../../components/client/catalog/ProductCard';
import CategoryCard from '../../components/client/catalog/CategoryCard';
import ProductPlaceholder from '../../components/client/catalog/ProductPlaceholder';
import FilterSidebar from '../../components/client/catalog/FilterSidebar';
import type { CatalogFilters } from '../../components/client/catalog/FilterSidebar';
import CatalogToolbar from '../../components/client/catalog/CatalogToolbar';
import type { SortKey, ViewMode } from '../../components/client/catalog/CatalogToolbar';
import QuantityPicker from '../../components/client/cart/QuantityPicker';
import CartLineItem from '../../components/client/cart/CartLineItem';
import CartSummary from '../../components/client/cart/CartSummary';
import LandmarkPicker from '../../components/client/checkout/LandmarkPicker';
import FedaPayButton from '../../components/client/checkout/FedaPayButton';
import { CATEGORIES, NOTIFICATIONS, PRODUCTS } from '../../constants/mockData';
import type { CartItem } from '../../types/models';

/** Petite section titrée de la vitrine. */
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="card space-y-md p-lg">
      <h2 className="micro">{title}</h2>
      {children}
    </section>
  );
}

/**
 * Route temporaire /preview — vitrine de tous les composants du Sprint 1
 * (demande utilisateur : composants + page preview pour review).
 */
export default function PreviewPage() {
  const [filters, setFilters] = useState<CatalogFilters>({
    category: 'all',
    zones: [],
    maxPrice: 10000,
    availableOnly: false,
  });
  const [sort, setSort] = useState<SortKey>('popular');
  const [view, setView] = useState<ViewMode>('grid');
  const [qty, setQty] = useState(2);
  const [cart, setCart] = useState<CartItem[]>([{ product: PRODUCTS[0], quantite: 2 }]);
  const [checked, setChecked] = useState(true);
  const [page, setPage] = useState(1);
  const [zoneId, setZoneId] = useState('z1');
    const [lieu, setLieu] = useState('');

  const subtotal = cart.reduce((sum, item) => sum + item.product.prix * item.quantite, 0);

  return (
    <div className="min-h-screen bg-page pt-[52px]">
      <ClientNavbar />

      <main className="mx-auto max-w-[1200px] space-y-lg p-lg">
        <div className="card bg-primary-lighter p-lg">
          <h1 className="text-h1 text-ink">Preview — composants Sprint 1</h1>
          <p className="mt-sm text-ink-2">
            Vitrine temporaire de review : catalogue, panier, commande, paiement, notifications.
            Cette route sera retirée à l'assemblage des pages réelles.
          </p>
        </div>

        {/* ---------- Badges & statuts ---------- */}
        <div className="grid grid-cols-1 gap-lg lg:grid-cols-2">
          <Section title="Badges produits">
            <div className="flex flex-wrap gap-sm">
              <Badge variant="available" />
              <Badge variant="low" />
              <Badge variant="out" />
              <Badge variant="pack" />
              <Badge variant="promo" label="Promo -20%" />
              <Badge variant="new" />
              <Badge variant="nego" />
            </div>
          </Section>
          <Section title="Statuts de commande">
            <div className="flex flex-wrap gap-sm">
              <StatusBadge status="pending" />
              <StatusBadge status="preparing" />
              <StatusBadge status="shipping" />
              <StatusBadge status="delivered" />
              <StatusBadge status="cancelled" />
            </div>
          </Section>
        </div>

        {/* ---------- Boutons & alertes ---------- */}
        <Section title="Boutons & alertes">
          <div className="flex flex-wrap gap-sm">
            <button type="button" className="btn btn-primary">
              <IconShoppingCart size={18} /> Ajouter au panier
            </button>
            <button type="button" className="btn btn-secondary">Négocier le prix</button>
            <button type="button" className="btn btn-ghost">Favoris</button>
            <button type="button" className="btn btn-success">
              <IconCheck size={18} /> Accepter
            </button>
            <button type="button" className="btn btn-danger">Refuser</button>
            <button type="button" className="btn btn-primary" disabled>Désactivé</button>
            <button type="button" className="btn btn-primary btn-xl">Btn livreur 52px</button>
          </div>
          <Alert>Email ou mot de passe incorrect</Alert>
          <Alert variant="success">Paiement accepté par FedaPay</Alert>
          <Divider label="OU CONTINUER AVEC" />
        </Section>

        {/* ---------- Formulaires ---------- */}
        <Section title="Formulaires">
          <div className="grid grid-cols-1 gap-md md:grid-cols-2">
            <TextField label="Adresse email" placeholder="user@example.com" />
            <SelectField label="Ville/Zone">
              <option>Sélectionner votre ville</option>
              <option>Cotonou</option>
            </SelectField>
          </div>
          <Checkbox label="Se souvenir de moi" checked={checked} onChange={setChecked} />
        </Section>

        {/* ---------- Catalogue ---------- */}
        <Section title="Catalogue : toolbar, filtres, cartes, catégories">
          <CatalogToolbar count={PRODUCTS.length} sort={sort} onSort={setSort} view={view} onView={setView} />
          <div className="grid grid-cols-1 gap-lg lg:grid-cols-[260px_1fr]">
            <FilterSidebar filters={filters} onChange={setFilters} />
            <div className="space-y-lg">
              <div className="grid grid-cols-2 gap-md xl:grid-cols-3">
                {PRODUCTS.slice(0, 3).map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    onAdd={(product) =>
                      setCart((c) => {
                        const found = c.find((i) => i.product.id === product.id);
                        return found
                          ? c.map((i) => (i.product.id === product.id ? { ...i, quantite: i.quantite + 1 } : i))
                          : [...c, { product, quantite: 1 }];
                      })
                    }
                  />
                ))}
              </div>
              <div className="grid grid-cols-2 gap-md sm:grid-cols-4">
                {CATEGORIES.slice(0, 4).map((c) => (
                  <CategoryCard key={c.id} category={c} />
                ))}
              </div>
              <div className="flex flex-wrap gap-sm">
                <ProductPlaceholder categorie="vegetable" size="thumb" />
                <ProductPlaceholder categorie="fish" size="thumb" />
                <ProductPlaceholder categorie="pack" size="thumb" />
                <ProductPlaceholder categorie="spice" size="thumb" />
                <ProductPlaceholder categorie="grain" size="thumb" />
              </div>
              <Pagination page={page} pageCount={12} onChange={setPage} />
            </div>
          </div>
        </Section>

        {/* ---------- Panier & caisse ---------- */}
        <div className="grid grid-cols-1 gap-lg lg:grid-cols-[1fr_340px]">
          <Section title="Panier : lignes & quantité">
            {cart.length === 0 ? (
              <EmptyState
                icon={<IconShoppingCart size={36} strokeWidth={1.5} className="text-primary" />}
                title="Votre panier est vide"
                description="Ajoutez des produits frais du marché pour commencer."
                action={<button type="button" className="btn btn-primary">Explorer le marché</button>}
              />
            ) : (
              <div className="space-y-md">
                {cart.map((item) => (
                  <CartLineItem
                    key={item.product.id}
                    item={item}
                    onQuantityChange={(id, q) =>
                      setCart((c) => c.map((i) => (i.product.id === id ? { ...i, quantite: q } : i)))
                    }
                    onRemove={(id) => setCart((c) => c.filter((i) => i.product.id !== id))}
                  />
                ))}
                <div className="flex items-center gap-md">
                  <span className="text-[13px] text-ink-2">Quantité seule :</span>
                  <QuantityPicker quantity={qty} onChange={setQty} />
                </div>
              </div>
            )}
          </Section>
          <Section title="Caisse : récapitulatif">
            <CartSummary subtotal={subtotal} savings={0} deliveryFee={500} onPaid={() => {}} onContinueShopping={() => {}} />
          </Section>
        </div>

        {/* ---------- Commande : repère, paiement, progression ---------- */}
        <div className="grid grid-cols-1 gap-lg lg:grid-cols-2">
          <Section title="Commande : zone & point de repère (F-11, F-25)">
            <LandmarkPicker
              landmark={lieu}
              onLandmarkChange={setLieu}
              zoneId={zoneId}
              onZoneChange={setZoneId}
              deliveryFee={500}
            />
            <FedaPayButton onPaid={() => {}} />
          </Section>
          <Section title="Progression de commande (F-13)">
            <OrderStepper status="preparing" className="py-md" />
            <OrderStepper status="delivered" className="py-md" />
            <OrderStepper status="cancelled" />
          </Section>
        </div>

        {/* ---------- Notifications ---------- */}
        <Section title="Notifications (F-20) — cloche dans la navbar ci-dessus">
          <div className="space-y-sm">
            {NOTIFICATIONS.slice(0, 3).map((n) => (
              <NotificationItem key={n.id} notification={n} />
            ))}
          </div>
        </Section>
      </main>

      <ClientFooter />
    </div>
  );
}
