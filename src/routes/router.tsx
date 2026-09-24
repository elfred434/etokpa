import { createRootRoute, createRoute, createRouter, Outlet } from '@tanstack/react-router';
import { Toaster } from 'react-hot-toast';
import ConnexionPage from '../pages/auth/ConnexionPage';
import InscriptionPage from '../pages/auth/InscriptionPage';
import Verification2faPage from '../pages/auth/Verification2faPage';
import ResetPasswordPage from '../pages/auth/ResetPasswordPage';
import NotificationsPage from '../pages/client/notifications/NotificationsPage';
import PreviewPage from '../pages/preview/PreviewPage';
import HomePage from '../pages/client/accueil/HomePage';
import CatalogPage from '../pages/client/catalogue/CatalogPage';
import ProductPage from '../pages/client/fiche-produit/ProductPage';
import CartPage from '../pages/client/panier/CartPage';
import ConfirmationPage from '../pages/client/confirmation-commande/ConfirmationPage';
import ProfilePage from '../pages/client/profil/ProfilePage';
import NegotiationsPage from '../pages/client/negociations/NegotiationsPage';
import OrderTrackingPage from '../pages/client/commandes/OrderTrackingPage';
import OrdersListPage from '../pages/client/commandes/OrdersListPage';
import MessagingPage from '../pages/client/messagerie/MessagingPage';
import AdminCatalogPage from '../pages/admin/catalogue/AdminCatalogPage';
import AdminCategoriesPage from '../pages/admin/categories/AdminCategoriesPage';
import NotFoundPage from '../pages/NotFoundPage';
import SystemBridge from '../components/system/SystemBridge';

const rootRoute = createRootRoute({
  component: () => (
    <>
      <SystemBridge />
      <Outlet />
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: '#111827',
            color: '#FFFFFF',
            borderRadius: '10px',
            fontSize: '14px',
            padding: '10px 16px',
          },
          success: { iconTheme: { primary: '#10B981', secondary: '#FFFFFF' } },
          error: { iconTheme: { primary: '#EF4444', secondary: '#FFFFFF' } },
        }}
      />
    </>
  ),
  notFoundComponent: NotFoundPage,
});

const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: HomePage });
const connexionRoute = createRoute({ getParentRoute: () => rootRoute, path: '/connexion', component: ConnexionPage });
const inscriptionRoute = createRoute({ getParentRoute: () => rootRoute, path: '/inscription', component: InscriptionPage });
const verificationRoute = createRoute({ getParentRoute: () => rootRoute, path: '/verification-2fa', component: Verification2faPage });
// Lien envoyé par POST /api/auth/forgot-password : /reset-password?token=...&email=...
const resetPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/reset-password',
  component: ResetPasswordPage,
  validateSearch: (search: Record<string, unknown>): { token?: string; email?: string } => ({
    token: typeof search.token === 'string' ? search.token : undefined,
    email: typeof search.email === 'string' ? search.email : undefined,
  }),
});
const notificationsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/notifications', component: NotificationsPage });
const catalogueRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/catalogue',
  component: CatalogPage,
  validateSearch: (search: Record<string, unknown>): { q?: string } => ({
    q: typeof search.q === 'string' ? search.q : undefined,
  }),
});
const produitRoute = createRoute({ getParentRoute: () => rootRoute, path: '/produit/$productId', component: ProductPage });
const panierRoute = createRoute({ getParentRoute: () => rootRoute, path: '/panier', component: CartPage });
const confirmationRoute = createRoute({ getParentRoute: () => rootRoute, path: '/confirmation', component: ConfirmationPage });
const profilRoute = createRoute({ getParentRoute: () => rootRoute, path: '/profil', component: ProfilePage });
const negociationsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/negociations', component: NegotiationsPage });
const orderTrackingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/commandes/suivi',
  component: OrderTrackingPage,
  validateSearch: (search: Record<string, unknown>): { order?: string } => ({
    order: typeof search.order === 'string' ? search.order : undefined,
  }),
});
const ordersListRoute = createRoute({ getParentRoute: () => rootRoute, path: '/commandes', component: OrdersListPage });
const messagingRoute = createRoute({ getParentRoute: () => rootRoute, path: '/messagerie', component: MessagingPage });
const adminCatalogueRoute = createRoute({ getParentRoute: () => rootRoute, path: '/admin/catalogue', component: AdminCatalogPage });
const adminCategoriesRoute = createRoute({ getParentRoute: () => rootRoute, path: '/admin/categories', component: AdminCategoriesPage });
// Route temporaire de review des composants (retirée à la fin du Sprint 1).
const previewRoute = createRoute({ getParentRoute: () => rootRoute, path: '/preview', component: PreviewPage });

const routeTree = rootRoute.addChildren([
  indexRoute,
  connexionRoute,
  inscriptionRoute,
  verificationRoute,
  resetPasswordRoute,
  notificationsRoute,
  catalogueRoute,
  produitRoute,
  panierRoute,
  confirmationRoute,
  profilRoute,
  negociationsRoute,
  ordersListRoute,
  orderTrackingRoute,
  messagingRoute,
  adminCatalogueRoute,
  adminCategoriesRoute,
  previewRoute,
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
