import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import ClientNavbar from '../../../components/layout/client/ClientNavbar';
import ClientFooter from '../../../components/layout/client/ClientFooter';
import ClientBottomNav from '../../../components/layout/client/ClientBottomNav';
import MIcon from '../../../components/shared/MIcon';
import EmptyState from '../../../components/shared/EmptyState';
import { DELIVERY_FEES, ZONES } from '../../../constants/mockData';
import { useAppDispatch, useAppSelector } from '../../../hooks/useStore';
import { remove, setQuantity, selectCount, selectSubtotal, selectSavings } from '../../../store/slices/cart/cartSlice';

/**
 * Page Panier & Caisse — Reproduction 100% fidèle de `panier_caisse_tokpa/code.html`
 */
export default function CartPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const items = useAppSelector((s) => s.cart.items);
  const count = useAppSelector((s) => selectCount(s.cart.items));
  const subtotal = useAppSelector((s) => selectSubtotal(s.cart.items));
  const savings = useAppSelector((s) => selectSavings(s.cart.items));

  const [landmark, setLandmark] = useState('Face au carrefour Cadjehoun, en face de la pharmacie Sainte-Marie');
  const [zoneId, setZoneId] = useState('z1');
  const [landmarkError, setLandmarkError] = useState(false);

  const deliveryFee = DELIVERY_FEES[zoneId] ?? 500;
  const grandTotal = Math.max(0, subtotal - savings + deliveryFee);

  const handlePaid = () => {
    if (!landmark.trim()) {
      setLandmarkError(true);
      return;
    }
    navigate({
      to: '/confirmation',
      state: { total: grandTotal, zone: zoneId } as Record<string, unknown>,
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-bg-app font-body text-text-main">
      <ClientNavbar />

      {/* Main Content Container */}
      <main className="mt-[52px] md:mt-[64px] flex-grow w-full max-w-[1200px] mx-auto px-md md:px-lg py-xl pb-24">
        {/* Progress Bar Stepper */}
        <div className="w-full mb-xl overflow-x-auto">
          <div className="flex items-center justify-between min-w-[600px] md:w-full relative px-xl py-2">
            {/* Line Background */}
            <div className="absolute top-[22px] left-[60px] right-[60px] h-[3px] bg-border-default -z-10 rounded-full" />
            {/* Active Line Fill */}
            <div className="absolute top-[22px] left-[60px] w-[33%] h-[3px] bg-primary-container -z-10 rounded-full" />

            {/* Step 1: Panier (Completed) */}
            <div className="flex flex-col items-center gap-sm text-primary-container">
              <div className="w-9 h-9 rounded-full border-2 border-primary-container bg-white text-primary-container flex items-center justify-center font-bold text-h3 transition-all duration-300">
                <MIcon name="check" style={{ fontSize: 20 }} />
              </div>
              <span className="font-label text-label font-medium text-primary-container">Panier</span>
            </div>

            {/* Step 2: Livraison (Active) */}
            <div className="flex flex-col items-center gap-sm text-primary-container">
              <div className="w-9 h-9 rounded-full border-2 border-primary-container bg-primary-container text-white flex items-center justify-center font-bold text-h3 shadow-md transition-all duration-300">
                2
              </div>
              <span className="font-label text-label font-bold text-primary-container">Livraison</span>
            </div>

            {/* Step 3: Paiement */}
            <div className="flex flex-col items-center gap-sm text-text-tertiary">
              <div className="w-9 h-9 rounded-full border-2 border-border-default bg-bg-app text-text-tertiary flex items-center justify-center font-bold text-h3 transition-all duration-300">
                3
              </div>
              <span className="font-label text-label text-text-tertiary">Paiement</span>
            </div>

            {/* Step 4: Confirmation */}
            <div className="flex flex-col items-center gap-sm text-text-tertiary">
              <div className="w-9 h-9 rounded-full border-2 border-border-default bg-bg-app text-text-tertiary flex items-center justify-center font-bold text-h3 transition-all duration-300">
                4
              </div>
              <span className="font-label text-label text-text-tertiary">Confirmation</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-lg">
          {/* Left Column: Basket & Delivery */}
          <div className="lg:w-[60%] flex flex-col gap-lg">
            {/* Articles Section */}
            <div className="bg-white rounded-lg p-lg shadow-sm border border-border-default/50">
              <div className="flex items-center gap-sm mb-lg border-b border-border-default pb-md">
                <MIcon name="shopping_cart" className="text-primary-container" />
                <h2 className="font-h2 text-h2 text-on-surface">Votre panier ({count} articles)</h2>
              </div>

              {/* Article List */}
              {items.length === 0 ? (
                <EmptyState
                  icon={() => <MIcon name="shopping_cart" className="text-4xl text-text-tertiary" />}
                  title="Votre panier est vide"
                  description="Ajoutez des produits frais du marché pour commencer vos achats."
                  action={
                    <button
                      type="button"
                      className="px-lg py-3 bg-primary-container hover:bg-primary-hover text-white rounded-lg font-bold transition-all shadow-md cursor-pointer"
                      onClick={() => navigate({ to: '/catalogue' })}
                    >
                      Explorer le marché
                    </button>
                  }
                />
              ) : (
                <div className="flex flex-col gap-md">
                  {items.map((item) => {
                    const isNegotiated = !!item.product.negotiated;
                    const unitPrice = item.product.prix;
                    const oldPrice = item.product.negotiated?.oldPrice;

                    return (
                      <div
                        key={item.product.id}
                        className="flex items-center gap-md py-md border-b border-border-default last:border-0 group"
                      >
                        {/* Thumbnail */}
                        <div className="w-20 h-20 rounded-lg flex-shrink-0 bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center relative overflow-hidden">
                          {item.product.image ? (
                            <img
                              src={item.product.image}
                              alt={item.product.nom}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <MIcon name="psychiatry" className="text-primary-container text-[32px]" />
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-grow min-w-0">
                          <div className="flex items-center gap-sm mb-xs flex-wrap">
                            <h3 className="font-h3 text-h3 text-on-surface truncate font-bold">{item.product.nom}</h3>
                            {isNegotiated && (
                              <span className="bg-[#F59E0B]/10 text-[#F59E0B] text-micro px-2 py-0.5 rounded-full border border-[#F59E0B]/20 font-bold uppercase tracking-wider">
                                Offre acceptée
                              </span>
                            )}
                          </div>
                          <p className="text-secondary text-text-secondary truncate">
                            {item.product.origine || 'Marché Dantokpa'} · {item.product.quantite || '1kg'}
                          </p>

                          <div className="flex items-center gap-sm mt-xs">
                            <p className="font-price text-primary-container font-bold">
                              {unitPrice.toLocaleString('fr-FR')} FCFA
                            </p>
                            {oldPrice && (
                              <p className="text-secondary text-text-tertiary line-through">
                                {oldPrice.toLocaleString('fr-FR')} FCFA
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Quantity & Delete */}
                        <div className="flex flex-col items-end gap-md">
                          <div className="flex items-center bg-bg-app rounded-[6px] p-0.5 border border-border-default">
                            <button
                              type="button"
                              onClick={() =>
                                dispatch(setQuantity({ productId: item.product.id, quantity: Math.max(1, item.quantity - 1) }))
                              }
                              className="w-8 h-8 flex items-center justify-center text-primary-container hover:bg-primary-tint rounded-[4px] transition-colors cursor-pointer font-bold"
                            >
                              -
                            </button>
                            <span className="px-3 font-bold text-on-surface">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() =>
                                dispatch(setQuantity({ productId: item.product.id, quantity: item.quantity + 1 }))
                              }
                              className="w-8 h-8 flex items-center justify-center text-primary-container hover:bg-primary-tint rounded-[4px] transition-colors cursor-pointer font-bold"
                            >
                              +
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => dispatch(remove(item.product.id))}
                            className="text-error hover:bg-error-light p-2 rounded-full transition-colors opacity-80 sm:opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                            title="Supprimer"
                          >
                            <MIcon name="delete" className="text-[20px]" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Point de Repère Section */}
            <div className="bg-white rounded-lg p-lg shadow-sm border border-border-default/50">
              <div className="flex items-center gap-sm mb-lg">
                <MIcon name="location_on" className="text-primary-container" />
                <h2 className="font-h2 text-h2 text-on-surface">Lieu de livraison</h2>
              </div>
              <div className="space-y-md">
                <div>
                  <label className="block font-label text-secondary text-text-secondary mb-xs">
                    Point de repère (requis)
                  </label>
                  <div className="relative">
                    <MIcon name="edit_location" className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                    <input
                      className={`w-full pl-10 pr-4 py-3 bg-white rounded-lg border-1.5 ${
                        landmarkError ? 'border-error' : 'border-border-default'
                      } focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none transition-all text-body`}
                      type="text"
                      value={landmark}
                      onChange={(e) => {
                        setLandmark(e.target.value);
                        if (e.target.value.trim()) setLandmarkError(false);
                      }}
                      placeholder="Ex: Face à la pharmacie, portail bleu..."
                    />
                  </div>
                  {landmarkError && (
                    <p className="mt-1 text-xs font-semibold text-error">
                      Veuillez préciser un point de repère précis pour le livreur.
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-md items-end">
                  <div>
                    <label className="block font-label text-secondary text-text-secondary mb-xs">
                      Zone de livraison
                    </label>
                    <div className="relative">
                      <MIcon name="map" className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                      <select
                        className="w-full pl-10 pr-10 py-3 bg-white rounded-lg border-1.5 border-border-default appearance-none focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none transition-all text-body"
                        value={zoneId}
                        onChange={(e) => setZoneId(e.target.value)}
                      >
                        {ZONES.map((z) => (
                          <option key={z.id} value={z.id}>
                            {z.nom}
                          </option>
                        ))}
                      </select>
                      <MIcon name="expand_more" className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
                    </div>
                  </div>

                  <div className="bg-primary-tint p-lg rounded-lg border border-primary-light flex items-center justify-between">
                    <span className="text-body font-medium text-on-primary-container">Frais de livraison</span>
                    <span className="font-price text-primary-container font-bold">
                      {deliveryFee.toLocaleString('fr-FR')} FCFA
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Summary (Sticky) */}
          <div className="lg:w-[40%]">
            <div className="bg-white rounded-lg p-lg shadow-sm border border-border-default/50 sticky top-[72px]">
              <h2 className="font-h2 text-h2 text-on-surface mb-lg">Récapitulatif</h2>
              <div className="space-y-sm pb-lg border-b border-border-default">
                <div className="flex justify-between items-center">
                  <span className="text-body text-text-secondary">Sous-total</span>
                  <span className="text-body font-medium text-on-surface">
                    {subtotal.toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
                {savings > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-body text-text-secondary">Économie (négociations)</span>
                    <span className="text-body font-medium text-success">
                      -{savings.toLocaleString('fr-FR')} FCFA
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-body text-text-secondary">Frais de livraison</span>
                  <span className="text-body font-medium text-on-surface">
                    {deliveryFee.toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
              </div>

              <div className="py-lg flex justify-between items-center">
                <span className="font-h2 text-h2 text-on-surface">Total</span>
                <span className="font-price text-[22px] text-primary-container font-bold">
                  {grandTotal.toLocaleString('fr-FR')} FCFA
                </span>
              </div>

              <div className="flex flex-col gap-md">
                <button
                  type="button"
                  onClick={handlePaid}
                  disabled={items.length === 0}
                  className="w-full py-4 bg-primary-container hover:bg-primary-hover text-white rounded-lg font-h3 flex items-center justify-center gap-sm transition-all transform active:scale-95 shadow-md shadow-primary-container/20 cursor-pointer disabled:opacity-50"
                >
                  <MIcon name="credit_card" />
                  Payer avec FedaPay
                </button>

                <div className="flex items-center justify-center gap-xs py-sm px-md bg-success-light text-success-dark rounded-full border border-success-light">
                  <MIcon name="verified_user" className="text-[18px]" />
                  <span className="text-micro font-bold">Paiement sécurisé FedaPay</span>
                </div>

                <button
                  type="button"
                  onClick={() => navigate({ to: '/catalogue' })}
                  className="w-full py-3 border-2 border-primary-container text-primary-container hover:bg-primary-tint rounded-lg font-label font-bold transition-colors cursor-pointer"
                >
                  Continuer les achats
                </button>
              </div>

              <div className="mt-lg p-md bg-bg-app rounded-lg">
                <div className="flex gap-sm">
                  <MIcon name="info" className="text-info shrink-0" />
                  <p className="text-secondary text-text-secondary">
                    Livraison prévue dans <span className="font-bold text-on-surface">35-50 min</span> par nos coursiers partenaires TOKPa Express.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <ClientFooter />
      <ClientBottomNav />
    </div>
  );
}
