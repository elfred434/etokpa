// Historique des paiements client et téléchargement des reçus PDF.
import ClientNavbar from '../../../components/layout/client/ClientNavbar';
import ClientBottomNav from '../../../components/layout/client/ClientBottomNav';
import PaymentsPanel from '../../../components/payments/PaymentsPanel';
import MobileTableBridge from '../../../components/shared/MobileTableBridge';
import { useAuthGuard } from '../../../hooks/useAuthGuard';
import { useLanguage } from '../../../context/LanguageContext';
import { tx } from '../../../i18n/tx';

// Composant de la page Payments : gère le chargement des données et le rendu.
export default function PaymentsPage() {
  useLanguage();
  useAuthGuard();
  // Retourne le rendu JSX du composant.
  return (
    <div className="min-h-screen bg-warm pb-24">
      <ClientNavbar />
      <main id="client-payments" className="mx-auto w-full max-w-[1200px] px-4 pt-[calc(52px+24px)]">
        <PaymentsPanel source="mine" title={tx("Mes paiements")} />
      </main>
      <MobileTableBridge rootId="client-payments" />
      <ClientBottomNav />
    </div>
  );
}
