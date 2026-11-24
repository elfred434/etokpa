// Page des préférences client (langue et thème d’affichage).
import ClientNavbar from '../../../components/layout/client/ClientNavbar';
import ClientBottomNav from '../../../components/layout/client/ClientBottomNav';
import ParametresPanel from '../../../components/settings/ParametresPanel';
import { useAuthGuard } from '../../../hooks/useAuthGuard';
import { useLanguage } from '../../../context/LanguageContext';
import { tx } from '../../../i18n/tx';

// Composant de la page Parametres : gère le chargement des données et le rendu.
export default function ParametresPage() {
  useLanguage();
  useAuthGuard();
  // Retourne le rendu JSX du composant.
  return (
    <div className="min-h-screen bg-warm pb-24">
      <ClientNavbar />
      <main className="mx-auto w-full max-w-[1100px] px-4 pt-[calc(52px+24px)] lg:px-lg">
        <header className="mb-md">
          <h1 className="font-h1 text-h1 font-bold text-text-main">{tx('Paramètres')}</h1>
          <p className="mt-xs font-body text-secondary text-text-secondary">
            {tx('Préférences conservées sur cet appareil')}
          </p>
        </header>
        <ParametresPanel desktopColumns />
      </main>
      <ClientBottomNav />
    </div>
  );
}
