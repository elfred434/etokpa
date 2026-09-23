import { Link } from '@tanstack/react-router';
import ClientNavbar from '../../../components/layout/client/ClientNavbar';
import ClientBottomNav from '../../../components/layout/client/ClientBottomNav';
import MIcon from '../../../components/shared/MIcon';
import { useLanguage } from '../../../context/LanguageContext';

/**
 * OrderTrackingPage — Reproduction 100% fidèle de `suivi_de_commande_tokpa/code.html`
 */
export default function OrderTrackingPage() {
  const { isFr } = useLanguage();

  return (
    <div className="bg-bg-app font-body text-on-surface antialiased min-h-screen flex flex-col">
      {/* Top Navigation Anchor */}
      <ClientNavbar />

      {/* Main Viewport Canvas */}
      <main className="flex-grow pt-[52px] pb-[80px] md:pb-0 relative overflow-hidden flex flex-col">
        {/* GPS MAP SECTION */}
        <section className="relative h-[500px] sm:h-[600px] w-full map-grid overflow-hidden bg-[#E8F4FD]">
          {/* Simulated Street Network Grid */}
          <svg className="absolute inset-0 w-full h-full opacity-40" preserveAspectRatio="none" viewBox="0 0 1000 1000">
            <path
              d="M0,200 L1000,200 M0,500 L1000,500 M0,800 L1000,800 M200,0 L200,1000 M500,0 L500,1000 M800,0 L800,1000"
              fill="none"
              stroke="#CBD5E1"
              strokeWidth="2"
            />
            {/* Route Path */}
            <path
              d="M200,200 L500,200 L500,500 L800,500 L800,800"
              fill="none"
              stroke="#f97316"
              strokeDasharray="12,8"
              strokeWidth="4"
              className="animate-pulse"
            />
          </svg>

          {/* Seller Marker */}
          <div className="absolute top-[20%] left-[20%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
            <div className="w-10 h-10 bg-primary-container rounded-full flex items-center justify-center border-4 border-white shadow-lg">
              <MIcon name="store" className="text-white text-[20px]" />
            </div>
            <span className="mt-xs bg-white px-sm py-xs rounded-lg text-micro shadow-sm border border-border-default font-bold">
              Marché Dantokpa
            </span>
          </div>

          {/* Delivery Rider Marker */}
          <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-20">
            <div className="w-10 h-10 bg-success rounded-full flex items-center justify-center border-4 border-white shadow-lg animate-bounce">
              <MIcon name="motorcycle" className="text-white text-[20px]" />
            </div>
          </div>

          {/* Destination Marker */}
          <div className="absolute top-[80%] left-[80%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
            <div className="w-10 h-10 bg-info rounded-full flex items-center justify-center border-4 border-white shadow-lg">
              <MIcon name="location_on" className="text-white text-[20px]" />
            </div>
            <span className="mt-xs bg-white px-sm py-xs rounded-lg text-micro shadow-sm border border-border-default font-bold">
              {isFr ? 'Votre adresse' : 'Your address'}
            </span>
          </div>

          {/* Floating Action Button */}
          <button
            type="button"
            className="absolute bottom-md right-md w-12 h-12 bg-white rounded-full flex items-center justify-center border border-border-default shadow-md hover:bg-bg-secondary transition-colors cursor-pointer"
          >
            <MIcon name="my_location" className="text-text-main" />
          </button>
        </section>

        {/* STATUS PANEL (Floating Bottom Sheet) */}
        <section className="relative flex-grow bg-white rounded-t-[20px] shadow-[0_-8px_30px_rgba(0,0,0,0.08)] px-lg pt-lg pb-xl z-40 -mt-8 overflow-y-auto max-w-[800px] mx-auto w-full">
          <div className="w-12 h-1.5 bg-border-default rounded-full mx-auto mb-lg" />

          {/* Header Status */}
          <div className="flex justify-between items-start mb-lg">
            <div>
              <div className="inline-flex items-center gap-xs px-md py-xs bg-primary-tint border border-primary-light rounded-full mb-sm">
                <span className="w-2 h-2 rounded-full bg-primary-container inline-block" />
                <span className="text-label text-primary-dark font-bold">
                  {isFr ? 'En livraison' : 'Out for delivery'}
                </span>
              </div>
              <div className="flex items-center gap-sm text-primary-container">
                <MIcon name="schedule" />
                <span className="font-h3">
                  {isFr ? 'Arrivée estimée : 12 minutes' : 'Estimated arrival: 12 minutes'}
                </span>
              </div>
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
              <span className="text-micro mt-sm text-text-secondary">{isFr ? 'En attente' : 'Pending'}</span>
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
                {isFr ? 'Livraison' : 'Delivery'}
              </span>
            </div>

            {/* Step 4: Empty */}
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-white border-2 border-border-default flex items-center justify-center text-border-default" />
              <span className="text-micro mt-sm text-text-tertiary">{isFr ? 'Livré' : 'Delivered'}</span>
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
                <p className="text-secondary text-text-secondary">Livreur Zone Cadjehoun</p>
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
              <span className="text-text-secondary">3 articles</span>
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
