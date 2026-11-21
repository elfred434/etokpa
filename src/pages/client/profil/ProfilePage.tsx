import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import toast from 'react-hot-toast';
import ClientNavbar from '../../../components/layout/client/ClientNavbar';
import ClientBottomNav from '../../../components/layout/client/ClientBottomNav';
import MIcon from '../../../components/shared/MIcon';
import { DetailPanelSkeleton } from '../../../components/shared/Skeleton';
import {
  DIALOG_CANCEL_BTN_CLASS,
  DIALOG_PRIMARY_BTN_CLASS,
  DialogFrame,
} from '../../../components/shared/DialogFrame';
import { alertApiError, extractApiError, formatApiError } from '../../../utils/apiError';
import { useLanguage } from '../../../context/LanguageContext';
import { currentRole, hasSession } from '../../../routes/authGuard';
import { authApi, ordersApi, paymentsApi, type UserProfile } from '../../../services/api';
import { dateCourte, fmtFcfa, listOf, unwrap } from '../../../services/api/unwrap';
import { tx } from '../../../i18n/tx';
import { silentRefreshActive, useGlobalRefreshTick } from '../../../hooks/useRefresh';
import { rememberSessionUser } from '../../../routes/authGuard';
import ProfilePhotoField from '../../../components/shared/ProfilePhotoField';
import UserAvatar from '../../../components/shared/UserAvatar';
import ProfileLandmarks from '../../../components/client/profil/ProfileLandmarks';
import { displayPhoto, writeLocalPhoto } from '../../../utils/profilePhoto';

/** Nombre de lignes montrées dans les aperçus du profil (commandes, paiements). */
const PROFILE_LIST_LIMIT = 5;

interface OrderItem {
  id: number;
  date: string;
  totalLabel: string;
  statut: string;
  statusFr: string;
  statusEn: string;
  active: boolean;
}

/** Ligne de l'aperçu « Mes paiements » du profil. */
interface PaymentItem {
  id: number;
  orderId: number | null;
  date: string;
  totalLabel: string;
  statusFr: string;
  statusEn: string;
  tone: string;
}

/** Mapping statut backend → affichage (machine à états TOKPa). */
const STATUT_LABELS: Record<string, { fr: string; en: string; active: boolean }> = {
  en_attente: { fr: 'En attente', en: 'Pending', active: true },
  en_preparation: { fr: 'En préparation', en: 'Preparing', active: true },
  en_livraison: { fr: 'En livraison', en: 'In delivery', active: true },
  livre: { fr: 'Livrée', en: 'Delivered', active: false },
  annule: { fr: 'Annulée', en: 'Cancelled', active: false },
};

/** Mapping statut de paiement → libellé + pastille (aligné sur PaymentsPanel). */
const PAYMENT_LABELS: Record<string, { fr: string; en: string; tone: string }> = {
  en_attente: { fr: 'Paiement en attente', en: 'Payment pending', tone: 'bg-bg-secondary text-text-secondary' },
  reussi: { fr: 'Paiement réussi', en: 'Payment successful', tone: 'bg-success-light text-success' },
  echoue: { fr: 'Paiement échoué', en: 'Payment failed', tone: 'bg-error-light text-error' },
  rembourse: { fr: 'Paiement remboursé', en: 'Payment refunded', tone: 'bg-primary-tint text-primary-dark' },
};

/**
 * ProfilePage — données 100 % backend :
 *   - GET /api/profile            → infos utilisateur
 *   - PUT /api/profile            → modification identité
 *   - POST /api/auth/change-password
 *   - GET /api/orders             → 5 dernières commandes (statuts réels)
 *   - GET /api/payments           → 5 derniers paiements du compte
 * Les repères personnels sont lus et modifiés depuis ProfileLandmarks; le client
 * choisit toujours un point de livraison de zone pour chaque commande.
 */
export default function ProfilePage() {
  const navigate = useNavigate();
  const { language, isFr } = useLanguage();
  const isAuthenticated = hasSession();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [recentOrders, setRecentOrders] = useState<OrderItem[]>([]);
  const [recentPayments, setRecentPayments] = useState<PaymentItem[]>([]);
  const [orderSheet, setOrderSheet] = useState<OrderItem | null>(null);
  const [paymentSheet, setPaymentSheet] = useState<PaymentItem | null>(null);
  // Nombre total de commandes — GET /dashboard (GET /orders est paginé par 15)
  const [dashCount, setDashCount] = useState<number | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const refreshTick = useGlobalRefreshTick();

  // Modals
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [formPrenom, setFormPrenom] = useState('');
  const [formNomUser, setFormNomUser] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formTelephone, setFormTelephone] = useState('');
  const [formPhoto, setFormPhoto] = useState<string | null>(null);

  const [pwModalOpen, setPwModalOpen] = useState(false);
  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [pwError, setPwError] = useState<string | null>(null);

  const loadProfile = async () => {
    try {
      const res = await authApi.getProfile();
      const p: UserProfile | undefined = res?.data ?? res;
      if (p) {
        setProfile(p);
        rememberSessionUser(p as unknown as Record<string, unknown>);
      }
    } catch (err) {
      alertApiError(err, 'profile-load');
    }
  };

  // Chargement initial : profil + commandes
  useEffect(() => {
    if (!isAuthenticated) return;
    if (!silentRefreshActive()) setIsDataLoading(true);

    const p1 = loadProfile();

    const p2 = ordersApi
      .getOrders()
      .then((res) => {
        const list: Record<string, unknown>[] = res?.data ?? (Array.isArray(res) ? res : []);
        const mapped: OrderItem[] = list
          .map((o) => {
            const order = (o.data ?? o) as Record<string, unknown>;
            const statut = String(order.statut ?? "en_attente");
            const label = STATUT_LABELS[statut] ?? { fr: statut, en: statut, active: false };
            return {
              id: Number(order.id),
              date: order.created_at
                ? new Date(String(order.created_at)).toLocaleDateString('fr-FR')
                : order.date_commande
                  ? new Date(String(order.date_commande)).toLocaleDateString('fr-FR')
                  : tx("Récemment"),
              totalLabel: `${Number(order.montant_total ?? 0).toLocaleString('fr-FR')} FCFA`,
              statut,
              statusFr: label.fr,
              statusEn: label.en,
              active: label.active,
            };
          })
          .filter((o) => o.id > 0);
        setRecentOrders(mapped);
      })
      .catch((err) => alertApiError(err, 'profile-orders'));

    const p3 = authApi
      .getDashboard()
      .then((d) => {
        const n = Number(d?.commandes);
        setDashCount(Number.isFinite(n) ? n : null);
      })
      .catch((err) => alertApiError(err, 'profile-dashboard'));

    // GET /payments renvoie la liste complète des paiements du compte : on la
    // garde entière (pour le compteur) et l'aperçu en affiche les 5 premiers.
    const p4 = paymentsApi
      .listMine()
      .then((res) => {
        const rows = listOf(unwrap(res)) as Record<string, unknown>[];
        const mapped: PaymentItem[] = rows
          .map((raw) => {
            const p = ((raw as { data?: unknown }).data ?? raw) as Record<string, unknown>;
            const statut = String(p.statut ?? 'en_attente');
            const label =
              PAYMENT_LABELS[statut] ?? { fr: statut, en: statut, tone: 'bg-bg-secondary text-text-secondary' };
            const iso = (p.paid_at ?? p.created_at ?? null) as string | null;
            const orderId = p.order_id == null ? null : Number(p.order_id);
            return {
              id: Number(p.id),
              orderId: Number.isFinite(orderId) ? orderId : null,
              date: iso ? dateCourte(iso) : tx("Récemment"),
              totalLabel: fmtFcfa(p.montant as number | string | null),
              statusFr: label.fr,
              statusEn: label.en,
              tone: label.tone,
            };
          })
          .filter((p) => p.id > 0);
        setRecentPayments(mapped);
      })
      .catch((err) => alertApiError(err, 'profile-payments'));

    Promise.allSettled([p1, p2, p3, p4]).then(() => setIsDataLoading(false));
  }, [isAuthenticated, refreshTick]);

  if (!isAuthenticated) {
    return (
      <div className="bg-bg-app min-h-screen pb-24 font-body text-text-main">
        <ClientNavbar />
        <main className="mx-auto mt-[76px] flex w-full max-w-[1200px] justify-center px-4 py-10 text-center sm:px-6">
          <section className="relative w-full max-w-[620px] overflow-hidden rounded-3xl border border-border-default bg-bg-card shadow-lg">
            <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-primary-container via-secondary-container to-primary-container" />
            <div className="flex flex-col items-center px-6 py-10 sm:px-10 sm:py-12">
              <Link
                to="/connexion"
                search={{ redirect: '/profil' }}
                className="group inline-flex h-20 w-20 items-center justify-center rounded-full bg-primary-container text-white shadow-md ring-4 ring-primary-tint transition duration-200 hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-[6px] focus-visible:ring-primary active:translate-y-0"
                aria-label={tx("Se connecter")}
                title={tx("Se connecter")}
                data-testid="profile-login-icon"
              >
                <MIcon name="person" className="text-[38px] transition-transform duration-200 group-hover:scale-110" />
              </Link>
              <h1 className="mt-7 max-w-[520px] font-h2 text-h2 font-bold">
                {tx("Connectez-vous pour voir votre profil")}
              </h1>
              <p className="mt-3 max-w-[480px] text-sm leading-6 text-text-secondary">
                {tx("Vos commandes et vos points de repère s’affichent ici.")}
              </p>
              <Link
                to="/connexion"
                search={{ redirect: '/profil' }}
                className="btn btn-primary mt-8 min-w-[13rem] gap-2 rounded-xl px-6 font-bold shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary"
              >
                <span>{tx("Se connecter")}</span>
                <MIcon name="arrow_forward" className="text-[20px]" />
              </Link>
            </div>
          </section>
        </main>
        <ClientBottomNav />
      </div>
    );
  }

  const userFullName =
    [profile?.prenom, profile?.nom].filter(Boolean).join(' ').trim() || profile?.nom_complet || 'Utilisateur TOKPa';
  const userRole = typeof profile?.role === 'object' ? profile.role.nom : profile?.role || 'Client';
  const role = currentRole();
  const orderCount = !role || role === 'client' ? (dashCount ?? recentOrders.length) : recentOrders.length;
  const paymentCount = recentPayments.length;

  // ---- Modification du profil (PUT /profile) ----
  const handleOpenEditProfile = () => {
    setFormPrenom(profile?.prenom ?? '');
    setFormNomUser(profile?.nom ?? '');
    setFormEmail(profile?.email ?? '');
    setFormTelephone(profile?.telephone ?? '');
    setFormPhoto(displayPhoto(profile?.image_profil));
    setEditProfileOpen(true);
  };

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    const email = formEmail.trim();
    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      toast.error(tx("Adresse e-mail invalide."));
      return;
    }
    setSaving(true);
    try {
      const prenom = formPrenom.trim();
      const nom = formNomUser.trim();
      const fullName = [prenom, nom].filter(Boolean).join(' ');
      const serverPhoto = formPhoto && !formPhoto.startsWith('data:') && formPhoto.length <= 500 ? formPhoto : undefined;
      const res = await authApi.updateProfile({
        prenom,
        nom,
        ...(prenom && nom ? {} : { nom_complet: fullName }),
        email,
        telephone: formTelephone.trim() || undefined,
        ...(formPhoto ? (serverPhoto ? { image_profil: serverPhoto } : {}) : { image_profil: null }),
      });
      const updated = unwrap(res) as UserProfile | undefined;
      if (formPhoto?.startsWith('data:')) writeLocalPhoto(formPhoto);
      else if (!formPhoto) writeLocalPhoto(null);
      rememberSessionUser({
        ...(updated && typeof updated === 'object' ? updated : {}),
        prenom,
        nom,
        nom_complet: [prenom, nom].filter(Boolean).join(' '),
        email: updated?.email || email,
        image_profil: updated?.image_profil ?? serverPhoto ?? null,
      });
      toast.success(isFr ? tx("Profil mis à jour") : 'Profile updated');
      if (email && updated?.email && updated.email !== email) {
        toast.error(tx("L’adresse e-mail saisie n’a pas été conservée par le serveur."));
      }
      if (formPhoto?.startsWith('data:')) {
        toast(tx("Cette photo reste affichée sur cet appareil : le serveur ne garde qu’un lien court."));
      }
      setEditProfileOpen(false);
      await loadProfile();
    } catch (err: unknown) {
      toast.error(formatApiError(extractApiError(err)));
    } finally {
      setSaving(false);
    }
  };

  // ---- Changement de mot de passe (POST /auth/change-password) ----
  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPwError(null);
    if (pwNew.length < 8) {
      setPwError(isFr ? tx("Le nouveau mot de passe doit contenir au moins 8 caractères.") : 'New password must be at least 8 characters.');
      return;
    }
    if (pwNew !== pwConfirm) {
      setPwError(isFr ? 'Les mots de passe ne correspondent pas.' : 'Passwords do not match.');
      return;
    }
    setSaving(true);
    try {
      const res = await authApi.changePassword({
        current_password: pwCurrent,
        new_password: pwNew,
        new_password_confirmation: pwConfirm,
      });
      toast.success(res?.message || (isFr ? tx("Mot de passe modifié") : 'Password changed'));
      setPwModalOpen(false);
      setPwCurrent('');
      setPwNew('');
      setPwConfirm('');
    } catch (err: unknown) {
      setPwError(formatApiError(extractApiError(err)));
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await authApi.logout();
    toast.success(isFr ? tx("Déconnexion effectuée") : 'Logged out');
    navigate({ to: '/connexion' });
  };

  return (
    <div className="bg-bg-app min-h-screen pb-24 font-body text-text-main">
      <ClientNavbar />

      <main className="mx-auto mt-[76px] w-full max-w-[720px] px-md lg:max-w-[1200px] lg:grid lg:grid-cols-2 lg:gap-x-lg lg:gap-y-lg lg:px-lg">
        {isDataLoading ? (
          <DetailPanelSkeleton label={tx('Chargement du profil…')} className="lg:col-span-2" />
        ) : (
          <>
            {/* PROFILE HEADER */}
            <section className="bg-bg-card rounded-[14px] p-lg border border-border-default flex flex-col sm:flex-row items-start sm:items-center justify-between gap-md mb-md shadow-xs lg:col-span-2 lg:mb-0">
              <div className="flex items-center gap-md">
                <UserAvatar
                  name={userFullName}
                  photo={displayPhoto(profile?.image_profil)}
                  fallback="CL"
                  className="h-16 w-16 shrink-0 border border-primary-light bg-primary-tint text-[22px] text-primary-dark"
                />
                <div>
                  <div className="flex flex-wrap items-center gap-sm">
                    <h2 className="font-h2 text-h2 text-text-main font-bold">{userFullName}</h2>
                    <span className="inline-flex items-center gap-xs px-sm py-1 bg-success-light text-success text-micro rounded-full font-bold uppercase tracking-wider">
                      <MIcon name="verified_user" className="!text-xs" style={{ fontVariationSettings: "'FILL' 1" }} />
                      {userRole}
                    </span>
                  </div>
                  <div className="flex items-center text-text-secondary mt-1">
                    <MIcon name="mail" className="text-sm mr-1" />
                    <span className="break-all text-secondary">{profile?.email || tx("Non renseigné")}</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleOpenEditProfile}
                className="px-md py-sm bg-bg-card border border-border-default text-text-secondary rounded-lg font-label text-label flex items-center gap-sm transition-all hover:bg-bg-secondary cursor-pointer"
              >
                <MIcon name="edit" className="text-sm" />
                {isFr ? tx("Modifier") : 'Edit'}
              </button>
            </section>

            {/* STATS (calculées sur les données API réelles) */}
            <section className="grid grid-cols-2 gap-md mb-md lg:col-span-2 lg:mb-0">
              <div className="bg-bg-card p-md rounded-[10px] border border-border-default flex flex-col items-center justify-center text-center shadow-xs">
                <span className="font-h2 text-h2 text-text-main font-bold">{orderCount}</span>
                <span className="text-micro text-text-tertiary uppercase mt-1">
                  {isFr ? tx("Commandes") : 'Orders'}
                </span>
              </div>
              <div className="bg-bg-card p-md rounded-[10px] border border-border-default flex flex-col items-center justify-center text-center shadow-xs">
                <span className="font-h2 text-h2 text-primary-container font-bold">{paymentCount}</span>
                <span className="text-micro text-text-tertiary uppercase mt-1">
                  {isFr ? tx("Paiements") : 'Payments'}
                </span>
              </div>
            </section>

            {/* ORDERS SECTION */}
            <section className="mb-md lg:mb-0">
              <div className="flex items-center justify-between mb-sm">
                <h3 className="font-h3 text-h3 text-text-main font-bold">
                  {isFr ? tx("Mes commandes récentes") : 'Recent orders'}
                </h3>
                <Link
                  to="/commandes"
                  className="text-primary-container font-label text-label hover:underline font-bold"
                >
                  {isFr ? tx("Voir tout") : 'See all'}
                </Link>
              </div>

              {recentOrders.length === 0 ? (
                <div className="bg-bg-card p-lg rounded-[10px] border border-border-default text-center text-text-secondary">
                  <MIcon name="shopping_bag" className="text-3xl text-text-tertiary mb-2" />
                  <p className="text-sm font-semibold">{tx("Aucune commande enregistrée")}</p>
                  <p className="text-xs text-text-tertiary mt-1">
                    {tx("Vos commandes apparaîtront ici une fois validées.")}
                  </p>
                </div>
              ) : (
                <div className="bg-bg-card border border-border-default rounded-[14px] overflow-hidden">
                  <div className="divide-y divide-border-default">
                    {recentOrders.slice(0, PROFILE_LIST_LIMIT).map((o) => (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => setOrderSheet(o)}
                        className="flex w-full items-center justify-between gap-3 p-md text-left transition-colors hover:bg-bg-secondary"
                      >
                        <span className="min-w-0">
                          <span className="block font-bold text-text-main">Commande #{o.id}</span>
                          <span className="hidden text-secondary text-text-tertiary md:block">{o.date}</span>
                        </span>
                        <span className="hidden font-bold text-primary-container md:block">{o.totalLabel}</span>
                        <span
                          className={
                            o.active
                              ? 'shrink-0 rounded-full border border-primary-light bg-primary-tint px-sm py-1 text-micro font-bold uppercase text-primary-dark'
                              : 'shrink-0 rounded-full bg-success-light px-sm py-1 text-micro font-bold uppercase text-success'
                          }
                        >
                          {isFr ? o.statusFr : o.statusEn}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* PAYMENTS SECTION — 5 derniers paiements du compte */}
            <section className="mb-md lg:mb-0">
              <div className="flex items-center justify-between mb-sm">
                <h3 className="font-h3 text-h3 text-text-main font-bold">
                  {isFr ? tx("Mes paiements") : 'My payments'}
                </h3>
                <Link
                  to="/paiements"
                  className="text-primary-container font-label text-label hover:underline font-bold"
                >
                  {isFr ? tx("Voir tout") : 'See all'}
                </Link>
              </div>

              {recentPayments.length === 0 ? (
                <div className="bg-bg-card p-lg rounded-[10px] border border-border-default text-center text-text-secondary">
                  <MIcon name="payments" className="text-3xl text-text-tertiary mb-2" />
                  <p className="text-sm font-semibold">{tx("Aucun paiement enregistré")}</p>
                  <p className="text-xs text-text-tertiary mt-1">
                    {tx("Vos paiements apparaîtront ici après votre première commande.")}
                  </p>
                </div>
              ) : (
                <div className="bg-bg-card border border-border-default rounded-[14px] overflow-hidden">
                  <div className="divide-y divide-border-default">
                    {recentPayments.slice(0, PROFILE_LIST_LIMIT).map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPaymentSheet(p)}
                        className="flex w-full items-center justify-between gap-3 p-md text-left transition-colors hover:bg-bg-secondary"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-bold text-text-main">
                            {p.orderId ? `${tx("Commande")} #${p.orderId}` : `${tx("Paiement")} #${p.id}`}
                          </span>
                          <span className="hidden text-secondary text-text-tertiary md:block">{p.date}</span>
                        </span>
                        <span className="hidden font-bold text-primary-container md:block">{p.totalLabel}</span>
                        <span className={`shrink-0 rounded-full px-sm py-1 text-micro font-bold uppercase ${p.tone}`}>
                          {isFr ? p.statusFr : p.statusEn}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {(role === 'client' || role === 'admin') && (
              <div className="lg:col-span-2">
                <ProfileLandmarks />
              </div>
            )}

            {/* SECURITY & SETTINGS */}
            <section className="mb-xl lg:col-span-2 lg:mb-0">
              <h3 className="font-h3 text-h3 text-text-main mb-sm font-bold">
                {isFr ? tx("Paramètres & Sécurité") : 'Settings & Security'}
              </h3>
              <div className="bg-bg-card border border-border-default rounded-[14px] overflow-hidden">
                <button
                  type="button"
                  onClick={() => setPwModalOpen(true)}
                  className="w-full p-md flex items-center justify-between hover:bg-bg-secondary transition-colors text-left cursor-pointer"
                >
                  <div className="flex items-center gap-md">
                    <MIcon name="lock" className="text-text-secondary" />
                    <span className="text-body text-text-main">
                      {isFr ? tx("Changer mot de passe") : 'Change password'}
                    </span>
                  </div>
                  <MIcon name="chevron_right" className="text-text-tertiary" />
                </button>

                <Link
                  to="/notifications"
                  className="w-full p-md flex items-center justify-between border-t border-border-default hover:bg-bg-secondary transition-colors text-left"
                >
                  <div className="flex items-center gap-md">
                    <MIcon name="notifications_active" className="text-text-secondary" />
                    <span className="text-body text-text-main">{tx("Notifications")}</span>
                  </div>
                  <MIcon name="chevron_right" className="text-text-tertiary" />
                </Link>

                <Link
                  to="/parametres"
                  className="w-full p-md flex items-center justify-between border-t border-border-default hover:bg-bg-secondary transition-colors text-left"
                >
                  <div className="flex items-center gap-md">
                    <MIcon name="settings" className="text-text-secondary" />
                    <div className="flex flex-col">
                      <span className="text-body text-text-main">{tx("Paramètres")}</span>
                      <span className="text-label text-text-tertiary">{tx("Langue et thème")}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-sm">
                    <span className="text-secondary text-text-tertiary font-bold uppercase">{language}</span>
                    <MIcon name="chevron_right" className="text-text-tertiary" />
                  </div>
                </Link>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full p-md flex items-center gap-md border-t border-border-default hover:bg-error-light transition-colors text-error font-medium cursor-pointer"
                >
                  <MIcon name="logout" />
                  {isFr ? tx("Déconnexion") : 'Logout'}
                </button>
              </div>
            </section>
          </>
        )}
      </main>

      {/* Modal Edit Profile (PUT /api/profile) */}
      {editProfileOpen && (
        <DialogFrame
          icon="edit"
          title={isFr ? tx("Modifier mon profil") : 'Edit my profile'}
          maxWidth="32rem"
          disabled={saving}
          onClose={() => setEditProfileOpen(false)}
          footer={
            <>
              <button
                type="button"
                disabled={saving}
                onClick={() => setEditProfileOpen(false)}
                className={DIALOG_CANCEL_BTN_CLASS}
              >
                {isFr ? tx("Annuler") : 'Cancel'}
              </button>
              <button
                type="submit"
                form="profile-edit-form"
                disabled={saving}
                className={DIALOG_PRIMARY_BTN_CLASS}
              >
                {isFr ? tx("Enregistrer") : 'Save'}
              </button>
            </>
          }
        >
          <form id="profile-edit-form" onSubmit={handleSaveProfile} className="space-y-md">
            <ProfilePhotoField
              name={[formPrenom, formNomUser].filter(Boolean).join(' ') || userFullName}
              photo={formPhoto}
              onChange={setFormPhoto}
              onClear={() => setFormPhoto(null)}
            />
            <div>
              <label className="block text-label mb-1 text-text-secondary font-medium">{tx("Prénom")}</label>
              <input
                type="text"
                value={formPrenom}
                onChange={(e) => setFormPrenom(e.target.value)}
                required
                className="w-full px-md py-2 rounded-lg border border-border-default bg-bg-card text-text-main focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-label mb-1 text-text-secondary font-medium">{tx("Nom")}</label>
              <input
                type="text"
                value={formNomUser}
                onChange={(e) => setFormNomUser(e.target.value)}
                required
                className="w-full px-md py-2 rounded-lg border border-border-default bg-bg-card text-text-main focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-label mb-1 text-text-secondary font-medium">{tx("Adresse e-mail")}</label>
              <input
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                autoComplete="email"
                className="w-full px-md py-2 rounded-lg border border-border-default bg-bg-card text-text-main focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-label mb-1 text-text-secondary font-medium">{tx("Téléphone")}</label>
              <input
                type="tel"
                value={formTelephone}
                onChange={(e) => setFormTelephone(e.target.value)}
                placeholder="+229 90 00 00 00"
                className="w-full px-md py-2 rounded-lg border border-border-default bg-bg-card text-text-main focus:border-primary outline-none"
              />
            </div>
          </form>
        </DialogFrame>
      )}

      {/* Modal Change Password (POST /api/auth/change-password) */}
      {pwModalOpen && (
        <DialogFrame
          icon="lock"
          title={isFr ? tx("Changer le mot de passe") : 'Change password'}
          maxWidth="32rem"
          disabled={saving}
          onClose={() => setPwModalOpen(false)}
          footer={
            <>
              <button
                type="button"
                disabled={saving}
                onClick={() => setPwModalOpen(false)}
                className={DIALOG_CANCEL_BTN_CLASS}
              >
                {isFr ? tx("Annuler") : 'Cancel'}
              </button>
              <button
                type="submit"
                form="profile-password-form"
                disabled={saving}
                className={DIALOG_PRIMARY_BTN_CLASS}
              >
                {isFr ? tx("Changer") : 'Change'}
              </button>
            </>
          }
        >
          <form id="profile-password-form" onSubmit={handleChangePassword} className="space-y-md">
            <div>
              <label className="block text-label mb-1 text-text-secondary font-medium">
                {tx("Mot de passe actuel")}
              </label>
              <input
                type="password"
                value={pwCurrent}
                onChange={(e) => setPwCurrent(e.target.value)}
                required
                className="w-full px-md py-2 rounded-lg border border-border-default bg-bg-card text-text-main focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-label mb-1 text-text-secondary font-medium">
                {tx("Nouveau mot de passe")}
              </label>
              <input
                type="password"
                value={pwNew}
                onChange={(e) => setPwNew(e.target.value)}
                required
                className="w-full px-md py-2 rounded-lg border border-border-default bg-bg-card text-text-main focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-label mb-1 text-text-secondary font-medium">
                {tx("Confirmer le nouveau mot de passe")}
              </label>
              <input
                type="password"
                value={pwConfirm}
                onChange={(e) => setPwConfirm(e.target.value)}
                required
                className="w-full px-md py-2 rounded-lg border border-border-default bg-bg-card text-text-main focus:border-primary outline-none"
              />
            </div>

            {pwError && (
              <div className="p-3 bg-error-light border border-error/20 rounded-lg text-xs font-semibold text-error-dark">
                {pwError}
              </div>
            )}
          </form>
        </DialogFrame>
      )}

      {orderSheet && (
        <DialogFrame
          icon="receipt_long"
          title={`${tx("Commande")} #${orderSheet.id}`}
          onClose={() => setOrderSheet(null)}
          footer={
            <>
              <button type="button" className={DIALOG_CANCEL_BTN_CLASS} onClick={() => setOrderSheet(null)}>
                {tx("Fermer")}
              </button>
              <Link
                to={orderSheet.active ? '/commandes/suivi' : '/commandes'}
                search={orderSheet.active ? { order: String(orderSheet.id) } : { detail: String(orderSheet.id) }}
                className={`${DIALOG_PRIMARY_BTN_CLASS} text-center`}
              >
                {orderSheet.active ? tx("Suivre") : tx("Détails")}
              </Link>
            </>
          }
        >
          <dl className="space-y-3 text-label">
            <div><dt className="text-micro uppercase text-text-secondary">{tx("Date")}</dt><dd className="font-semibold">{orderSheet.date}</dd></div>
            <div><dt className="text-micro uppercase text-text-secondary">{tx("Montant")}</dt><dd className="font-semibold">{orderSheet.totalLabel}</dd></div>
            <div><dt className="text-micro uppercase text-text-secondary">{tx("Statut")}</dt><dd className="font-semibold">{isFr ? orderSheet.statusFr : orderSheet.statusEn}</dd></div>
          </dl>
        </DialogFrame>
      )}
      {paymentSheet && (
        <DialogFrame
          icon="payments"
          title={`${tx("Paiement")} #${paymentSheet.id}`}
          onClose={() => setPaymentSheet(null)}
          footer={
            <>
              <button type="button" className={DIALOG_CANCEL_BTN_CLASS} onClick={() => setPaymentSheet(null)}>
                {tx("Fermer")}
              </button>
              <Link to="/paiements" className={`${DIALOG_PRIMARY_BTN_CLASS} text-center`}>
                {tx("Voir tout")}
              </Link>
            </>
          }
        >
          <dl className="space-y-3 text-label">
            <div><dt className="text-micro uppercase text-text-secondary">{tx("Commande")}</dt><dd className="font-semibold">{paymentSheet.orderId ? `#${paymentSheet.orderId}` : '—'}</dd></div>
            <div><dt className="text-micro uppercase text-text-secondary">{tx("Date")}</dt><dd className="font-semibold">{paymentSheet.date}</dd></div>
            <div><dt className="text-micro uppercase text-text-secondary">{tx("Montant")}</dt><dd className="font-semibold">{paymentSheet.totalLabel}</dd></div>
            <div><dt className="text-micro uppercase text-text-secondary">{tx("Statut")}</dt><dd className="font-semibold">{isFr ? paymentSheet.statusFr : paymentSheet.statusEn}</dd></div>
          </dl>
        </DialogFrame>
      )}

      <ClientBottomNav />
    </div>
  );
}
