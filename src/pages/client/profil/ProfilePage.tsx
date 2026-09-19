import ClientNavbar from '../../../components/layout/client/ClientNavbar';
import ClientBottomNav from '../../../components/layout/client/ClientBottomNav';
import ClientFooter from '../../../components/layout/client/ClientFooter';
import ProfileHeader from '../../../components/client/profil/ProfileHeader';
import ProfileStats from '../../../components/client/profil/ProfileStats';
import ProfileLandmarks from '../../../components/client/profil/ProfileLandmarks';
import ProfileRecentOrders from '../../../components/client/profil/ProfileRecentOrders';
import ProfileSettings from '../../../components/client/profil/ProfileSettings';

/**
 * Page Profil Client — copie conforme de la maquette Stitch `profil_points_de_rep_re_tokpa`.
 */
export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-page pt-[52px] font-body text-on-surface">
      <ClientNavbar />

      <main className="mx-auto w-full max-w-[760px] px-3 py-lg pb-[80px] sm:px-4 lg:pb-lg">
        {/* Header profil */}
        <ProfileHeader />

        {/* Statistiques */}
        <ProfileStats />

        {/* Points de repère */}
        <ProfileLandmarks />

        {/* Commandes récentes */}
        <ProfileRecentOrders />

        {/* Paramètres & Sécurité */}
        <ProfileSettings />
      </main>

      <ClientFooter />
      <ClientBottomNav />
    </div>
  );
}
