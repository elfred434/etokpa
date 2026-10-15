import ClientNavbar from '../../../components/layout/client/ClientNavbar';
import ClientBottomNav from '../../../components/layout/client/ClientBottomNav';
import ParametresPanel from '../../../components/settings/ParametresPanel';
import { useAuthGuard } from '../../../hooks/useAuthGuard';
import { useLanguage } from '../../../context/LanguageContext';
import { tx } from '../../../i18n/tx';

/**
 * Paramètres (espace client) — `/parametres`.
 *
 * Regroupe les deux réglages qui encombraient la barre de navigation :
 * le thème (clair / sombre / système) et la langue (fr → pt). Accessible par
 * l'icône ⚙ de la barre et par l'entrée « Paramètres » de la page Profil.
 */
export default function ParametresPage() {
  useLanguage();
  useAuthGuard();
  return (
    <div className="min-h-screen bg-warm pb-24">
      <ClientNavbar />
      <main className="mx-auto w-full max-w-[900px] px-4 pt-[calc(52px+24px)]">
        <header className="mb-md">
          <h1 className="font-h1 text-h1 font-bold text-text-main">{tx('Paramètres')}</h1>
          <p className="mt-xs font-body text-secondary text-text-secondary">
            {tx('Préférences conservées sur cet appareil')}
          </p>
        </header>
        <ParametresPanel />
      </main>
      <ClientBottomNav />
    </div>
  );
}
