import ClientNavbar from '../../../components/layout/client/ClientNavbar';
import ClientBottomNav from '../../../components/layout/client/ClientBottomNav';
import DarkFooter from '../../../components/layout/client/DarkFooter';
import PaymentsPanel from '../../../components/payments/PaymentsPanel';
import { useAuthGuard } from '../../../hooks/useAuthGuard';
import { useLanguage } from '../../../context/LanguageContext';
import { tx } from '../../../i18n/tx';

/** Paiements du compte connecté. Pas de contrôle de rôle : l'API ne renvoie que les siens. */
export default function PaymentsPage() {
  useLanguage();
  useAuthGuard();
  return (
    <div className="min-h-screen bg-warm pb-24">
      <ClientNavbar />
      <main className="mx-auto w-full max-w-[1200px] px-4 pt-[calc(52px+24px)]">
        <PaymentsPanel source="mine" title={tx("Mes paiements")} />
      </main>
      <DarkFooter />
      <ClientBottomNav />
    </div>
  );
}
