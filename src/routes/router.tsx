import { createRootRoute, createRoute, createRouter, Outlet } from '@tanstack/react-router';
import { Toaster } from 'react-hot-toast';
// import { IconLogout } from '@tabler/icons-react';
import ConnexionPage from '../pages/auth/ConnexionPage';
import InscriptionPage from '../pages/auth/InscriptionPage';
import Verification2faPage from '../pages/auth/Verification2faPage';
import NotificationsPage from '../pages/client/notifications/NotificationsPage';
import PreviewPage from '../pages/preview/PreviewPage';

/** Placeholder temporaire post-connexion (les écrans client arrivent au Sprint 1). */
// function PlaceholderHome() {
//   return (
//     <div className="flex min-h-screen items-center justify-center bg-page p-md">
//       <div className="card w-full max-w-[440px] text-center">
//         <h1 className="text-h2 text-ink">Connexion réussie 🎉</h1>
//         <p className="mt-sm text-ink-2">
//           Espace post-authentification provisoire — les écrans client (catalogue, panier…)
//           arrivent au Sprint 1.
//         </p>
//         <Link to="/connexion" className="btn btn-ghost mt-lg w-full">
//           <IconLogout size={18} />
//           Se déconnecter
//         </Link>
//       </div>
//     </div>
//   );
// }

const rootRoute = createRootRoute({
  component: () => (
    <>
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
});

const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: ConnexionPage });
const connexionRoute = createRoute({ getParentRoute: () => rootRoute, path: '/connexion', component: ConnexionPage });
const inscriptionRoute = createRoute({ getParentRoute: () => rootRoute, path: '/inscription', component: InscriptionPage });
const verificationRoute = createRoute({ getParentRoute: () => rootRoute, path: '/verification-2fa', component: Verification2faPage });
const notificationsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/notifications', component: NotificationsPage });
// Route temporaire de review des composants Sprint 1 (retirée à l'assemblage des pages).
const previewRoute = createRoute({ getParentRoute: () => rootRoute, path: '/preview', component: PreviewPage });

const routeTree = rootRoute.addChildren([
  indexRoute,
  connexionRoute,
  inscriptionRoute,
  verificationRoute,
  notificationsRoute,
  previewRoute,
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
