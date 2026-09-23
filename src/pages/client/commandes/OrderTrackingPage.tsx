import { Link } from '@tanstack/react-router';
import ClientNavbar from '../../../components/layout/client/ClientNavbar';
import ClientBottomNav from '../../../components/layout/client/ClientBottomNav';
import MIcon from '../../../components/shared/MIcon';
import RealBeninMap from '../../../components/client/commandes/RealBeninMap';
import { useRiderLocation } from '../../../hooks/useRiderLocation';
import { useLanguage } from '../../../context/LanguageContext';

/**
 * OrderTrackingPage — Suivi de Commande Client avec Récupération GPS Temps Réel du Livreur (Laravel Reverb WebSocket + OpenStreetMap Cotonou)
 */
export default function OrderTrackingPage() {
  const { isFr } = useLanguage();
  const { riderCoords, estimatedMinutes, isWebSocketActive, distanceKm } = useRiderLocation({
    orderId: 'TOK-2847',
    simulatedSpeedMs: 2500,
  });

  return (
    <div className="bg-bg-app font-body text-on-surface antialiased min-h-screen flex flex-col">
      {/* Top Navigation Anchor */}
      <ClientNavbar />

      {/* Main Viewport Canvas */}
      <main className="flex-grow pt-[52px] pb-[80px] md:pb-0 relative overflow-hidden flex flex-col">
        {/* GPS MAP SECTION (REAL BENIN MAP WITH LIVE RIDER POSITION) */}
        <section className="relative h-[480px] sm:h-[580px] w-full overflow-hidden bg-[#E8F4FD]">
          <RealBeninMap riderCoords={riderCoords} />
        </section>

        {/* STATUS PANEL (Floating Bottom Sheet) */}
        <section className="relative flex-grow bg-white rounded-t-[20px] shadow-[0_-8px_30px_rgba(0,0,0,0.08)] px-lg pt-lg pb-xl z-40 -mt-8 overflow-y-auto max-w-[800px] mx-auto w-full">
          <div className="w-12 h-1.5 bg-border-default rounded-full mx-auto mb-lg" />

          {/* Header Status with Live GPS Badge */}
          <div className="flex flex-wrap justify-between items-start mb-lg gap-2">
            <div>
              <div className="inline-flex items-center gap-xs px-md py-xs bg-primary-tint border border-primary-light rounded-full mb-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-success animate-ping inline-block" />
                <span className="text-label text-primary-dark font-bold">
                  {isFr ? 'En livraison · GPS Temps Réel' : 'Live Delivery · Realtime GPS'}
                </span>
              </div>
              <div className="flex items-center gap-sm text-primary-container">
                <MIcon name="schedule" />
                <span className="font-h3 font-bold">
                  {isFr
                    ? `Arrivée estimée : ~${estimatedMinutes} min (${distanceKm} km restant)`
                    : `Estimated arrival: ~${estimatedMinutes} min (${distanceKm} km remaining)`}
                </span>
              </div>
            </div>

            <div className="text-micro bg-bg-secondary px-3 py-1.5 rounded-lg border border-border-default font-mono text-text-secondary">
              GPS: {riderCoords[0].toFixed(4)}, {riderCoords[1].toFixed(4)}
              {isWebSocketActive ? ' (WebSocket Reverb)' : ' (Live Simulator)'}
            </div>
          </div>

          {/* Progress Stepper */}
          <div className="relative flex justify-between items-center mb-xl px-sm">
            {/* Line Background */}
            <div className="absolute left-md right-md h-[3px] bg-border-default top-1/2 -translate-y-1/2 z-0" />
            {/* Active Line Progress */}
            <div className="absolute left-md w-[60%] h-[3px] bg-primary-container top-1/2 -translate-y-1/2 z-0" />

            {/* Step 1: Completed */}
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-white border-4 border-white shadow-sm">
                <MIcon name="check" className="text-[16px]" />
              </div>
              <span className="text-micro mt-sm text-text-secondary">{isFr ? 'Marché Dantokpa' : 'Dantokpa Market'}</span>
            </div>

            {/* Step 2: Completed */}
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-white border-4 border-white shadow-sm">
                <MIcon name="check" className="text-[16px]" />
              </div>
              <span className="text-micro mt-sm text-text-secondary">{isFr ? 'Préparation' : 'Preparing'}</span>
            </div>

            {/* Step 3: Active Pulsing */}
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-primary-container animate-bounce flex items-center justify-center text-white border-4 border-white shadow-sm">
                <MIcon name="local_shipping" className="text-[16px]" />
              </div>
              <span className="text-micro mt-sm text-primary-container font-bold">
                {isFr ? 'En cours de route' : 'In transit'}
              </span>
            </div>

            {/* Step 4: Empty */}
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-white border-2 border-border-default flex items-center justify-center text-border-default" />
              <span className="text-micro mt-sm text-text-tertiary">{isFr ? 'Cadjehoun' : 'Cadjehoun'}</span>
            </div>
          </div>

          {/* Rider Info Card */}
          <div className="bg-bg-secondary rounded-lg p-md mb-lg flex items-center justify-between">
            <div className="flex items-center gap-md">
              <div className="w-12 h-12 bg-success rounded-full flex items-center justify-center text-white font-bold text-h3">
                JK
              </div>
              <div>
                <h4 className="font-label text-body text-text-main font-bold">Jean Kouassi</h4>
                <p className="text-secondary text-text-secondary">Livreur Zone Cadjehoun (Cotonou)</p>
              </div>
            </div>
            <div className="flex gap-sm">
              <a
                href="tel:+22990000000"
                className="w-10 h-10 bg-white border border-border-default rounded-lg flex items-center justify-center text-primary-container active:scale-95 transition-transform"
              >
                <MIcon name="call" />
              </a>
              <Link
                to="/messagerie"
                className="w-10 h-10 bg-white border border-border-default rounded-lg flex items-center justify-center text-primary-container active:scale-95 transition-transform"
              >
                <MIcon name="chat" />
              </Link>
            </div>
          </div>

          {/* Order Summary Card */}
          <div className="border border-border-default rounded-lg p-md">
            <div className="flex justify-between items-center mb-xs">
              <span className="text-label font-bold text-text-main">Commande #TOK-2847</span>
              <Link to="/confirmation" className="text-label text-primary-container font-bold hover:underline">
                {isFr ? 'Voir les détails' : 'View details'}
              </Link>
            </div>
            <div className="flex justify-between text-body">
              <span className="text-text-secondary">3 articles (Sac de riz 50kg, Tomates fraîches)</span>
              <span className="font-price text-text-main">3 980 FCFA</span>
            </div>
          </div>
        </section>
      </main>

      {/* Bottom Navigation */}
      <ClientBottomNav />
    </div>
  );
}
