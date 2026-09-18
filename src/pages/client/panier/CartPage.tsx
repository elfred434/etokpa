import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { IconShoppingCart, IconMapPin } from '@tabler/icons-react';
import ClientNavbar from '../../../components/layout/client/ClientNavbar';
import ClientFooter from '../../../components/layout/client/ClientFooter';
import CheckoutStepper from '../../../components/client/checkout/CheckoutStepper';
import CartLineItem from '../../../components/client/cart/CartLineItem';
import CartSummary from '../../../components/client/cart/CartSummary';
import LandmarkPicker from '../../../components/client/checkout/LandmarkPicker';
import EmptyState from '../../../components/shared/EmptyState';
import { DELIVERY_FEES } from '../../../constants/mockData';
import { useAppDispatch, useAppSelector } from '../../../hooks/useStore';
import { remove, setQuantity, selectCount, selectSubtotal, selectSavings } from '../../../store/slices/cart/cartSlice';

/** Page Panier & Caisse — copie conforme de la maquette (stepper 4 étapes, colonnes 60/40). */
export default function CartPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const items = useAppSelector((s) => s.cart.items);
  const count = useAppSelector((s) => selectCount(s.cart.items));
  const subtotal = useAppSelector((s) => selectSubtotal(s.cart.items));
  const savings = useAppSelector((s) => selectSavings(s.cart.items));

  const [landmark, setLandmark] = useState('');
  const [zoneId, setZoneId] = useState('z1');
  const [landmarkError, setLandmarkError] = useState(false);

  const deliveryFee = DELIVERY_FEES[zoneId] ?? 500;

  const handlePaid = () => {
    if (!landmark.trim()) {
      setLandmarkError(true);
      return;
    }
    navigate({
      to: '/confirmation',
      state: { total: subtotal - savings + deliveryFee, zone: zoneId } as Record<string, unknown>,
    });
  };

  return (
    <div className="flex min-h-screen flex-col bg-page">
      <ClientNavbar />

      <main className="mx-auto mt-[52px] w-full max-w-[1200px] flex-1 px-md py-xl md:px-lg">
        <CheckoutStepper current={1} />

        <div className="flex flex-col gap-lg lg:flex-row">
          {/* Colonne gauche : articles + lieu */}
          <div className="flex flex-col gap-lg lg:w-[60%]">
            <div className="rounded-lg border border-line/50 bg-card p-lg shadow-sm">
              <div className="mb-lg flex items-center gap-sm border-b border-line pb-md">
                <IconShoppingCart size={22} className="text-primary" />
                <h2 className="text-h2 text-ink">Votre panier ({count} articles)</h2>
              </div>

              {items.length === 0 ? (
                <EmptyState
                  icon={IconShoppingCart}
                  title="Votre panier est vide"
                  description="Ajoutez des produits frais du marché pour commencer."
                  action={
                    <button type="button" className="btn btn-primary" onClick={() => navigate({ to: '/catalogue' })}>
                      Explorer le marché
                    </button>
                  }
                />
              ) : (
                <div className="flex flex-col">
                  {items.map((item) => (
                    <CartLineItem
                      key={item.product.id}
                      item={item}
                      onQuantityChange={(productId, quantity) => dispatch(setQuantity({ productId, quantity }))}
                      onRemove={(productId) => dispatch(remove(productId))}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-lg border border-line/50 bg-card p-lg shadow-sm">
              <div className="mb-lg flex items-center gap-sm">
                <IconMapPin size={22} className="text-primary" />
                <h2 className="text-h2 text-ink">Lieu de livraison</h2>
              </div>
              <LandmarkPicker
                landmark={landmark}
                onLandmarkChange={(v) => {
                  setLandmark(v);
                  if (v.trim()) setLandmarkError(false);
                }}
                zoneId={zoneId}
                onZoneChange={setZoneId}
                deliveryFee={deliveryFee}
                error={landmarkError}
              />
              {landmarkError && (
                <p className="mt-sm text-[13px] font-medium text-error-dark">
                  Le point de repère est requis pour commander.
                </p>
              )}
            </div>
          </div>

          {/* Colonne droite : récapitulatif sticky */}
          <div className="lg:w-[40%]">
            <CartSummary
              subtotal={subtotal}
              savings={savings}
              deliveryFee={deliveryFee}
              onPaid={handlePaid}
              onContinueShopping={() => navigate({ to: '/catalogue' })}
            />
          </div>
        </div>
      </main>

      <ClientFooter />
    </div>
  );
}
