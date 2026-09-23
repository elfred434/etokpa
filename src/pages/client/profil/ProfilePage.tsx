import { useEffect, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import toast from 'react-hot-toast';
import ClientNavbar from '../../../components/layout/client/ClientNavbar';
import ClientBottomNav from '../../../components/layout/client/ClientBottomNav';
import MIcon from '../../../components/shared/MIcon';
import { useLanguage } from '../../../context/LanguageContext';
import { useAuthGuard } from '../../../hooks/useAuthGuard';
import { authApi, landmarksApi, ordersApi, type UserProfile, type PointRepereItem } from '../../../services/api';

interface Landmark {
  id: string;
  nom: string;
  isDefault?: boolean;
  description: string;
  zone: string;
  icon: string;
}

interface OrderItem {
  id: string;
  date: string;
  totalLabel: string;
  statusFr: string;
  statusEn: string;
  active: boolean;
}

/**
 * ProfilePage — Uniquement données réelles Backend Laravel (Pas de fausses données statiques frontend)
 */
export default function ProfilePage() {
  const navigate = useNavigate();
  const { language, toggleLanguage, isFr } = useLanguage();
  const { isAuthenticated, isLoading } = useAuthGuard('/connexion');

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);
  const [recentOrders, setRecentOrders] = useState<OrderItem[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);

  // Edit / Add Landmark Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLandmark, setEditingLandmark] = useState<Landmark | null>(null);
  const [formNom, setFormNom] = useState('');
  const [formDesc, setFormDescription] = useState('');
  const [formZone, setFormZone] = useState('Zone Cadjehoun');
  const [formIcon, setFormIcon] = useState('location_on');

  // Load real data from Backend Laravel API
  useEffect(() => {
    if (!isAuthenticated) return;

    setIsDataLoading(true);

    // 1. GET /api/profile
    const p1 = authApi.getProfile()
      .then((res) => {
        if (res?.data) {
          setProfile(res.data);
        }
      })
      .catch((err) => {
        console.error('Failed to load profile:', err);
      });

    // 2. GET /api/landmarks
    const p2 = landmarksApi.getLandmarks()
      .then((res) => {
        if (Array.isArray(res)) {
          const mapped: Landmark[] = res.map((l: PointRepereItem, index: number) => ({
            id: String(l.id || index),
            nom: l.nom || 'Point de repère',
            description: l.description || l.quartier || 'Non spécifié',
            zone: l.zone || 'Zone Cadjehoun',
            icon: 'location_on',
            isDefault: index === 0,
          }));
          setLandmarks(mapped);
        }
      })
      .catch((err) => {
        console.error('Failed to load landmarks:', err);
      });

    // 3. GET /api/orders
    const p3 = ordersApi.getOrders()
      .then((res) => {
        const orderList = res?.data || (Array.isArray(res) ? res : []);
        if (Array.isArray(orderList)) {
          const mappedOrders: OrderItem[] = orderList.map((o) => {
            const isEnLivraison = o.statut === 'en_cours' || o.statut === 'en_attente';
            return {
              id: String(o.id),
              date: o.created_at ? new Date(o.created_at).toLocaleDateString() : 'Récemment',
              totalLabel: `${(o.montant_total || 0).toLocaleString('fr-FR')} FCFA`,
              statusFr: o.statut === 'livre' ? 'Livré' : o.statut === 'annule' ? 'Annulé' : 'En cours',
              statusEn: o.statut === 'livre' ? 'Delivered' : o.statut === 'annule' ? 'Cancelled' : 'In progress',
              active: isEnLivraison,
            };
          });
          setRecentOrders(mappedOrders);
        }
      })
      .catch((err) => {
        console.error('Failed to load orders:', err);
      });

    Promise.allSettled([p1, p2, p3]).then(() => setIsDataLoading(false));
  }, [isAuthenticated]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="bg-bg-app min-h-screen flex items-center justify-center font-body text-text-main">
        <div className="flex flex-col items-center gap-3">
          <MIcon name="sync" className="text-primary text-4xl animate-spin" />
          <p className="text-sm font-semibold text-text-secondary">Redirection vers la connexion...</p>
        </div>
      </div>
    );
  }

  const userFullName = profile?.nom_complet || (profile?.prenom ? `${profile.prenom} ${profile.nom}` : 'Utilisateur TOKPa');
  const userRole = typeof profile?.role === 'object' ? profile.role.nom : profile?.role || 'Client';
  const orderCount = profile?.stats?.commandes_effectuees ?? recentOrders.length;
  const landmarkCount = profile?.stats?.points_repere_enregistres ?? landmarks.length;

  const handleOpenAdd = () => {
    setEditingLandmark(null);
    setFormNom('');
    setFormDescription('');
    setFormZone('Zone Cadjehoun');
    setFormIcon('location_on');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (lm: Landmark) => {
    setEditingLandmark(lm);
    setFormNom(lm.nom);
    setFormDescription(lm.description);
    setFormZone(lm.zone);
    setFormIcon(lm.icon);
    setIsModalOpen(true);
  };

  const handleDeleteLandmark = async (id: string) => {
    try {
      await landmarksApi.deleteLandmark(id);
      setLandmarks((prev) => prev.filter((l) => l.id !== id));
      toast.success(isFr ? 'Point de repère supprimé' : 'Landmark deleted');
    } catch (e) {
      toast.error('Erreur lors de la suppression du repère');
    }
  };

  const handleSaveLandmark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNom.trim()) return;

    try {
      await landmarksApi.createLandmark({
        nom: formNom,
        description: formDesc,
        zone: formZone,
      });

      // Reload landmarks
      const updated = await landmarksApi.getLandmarks();
      if (Array.isArray(updated)) {
        setLandmarks(
          updated.map((l: PointRepereItem, index: number) => ({
            id: String(l.id || index),
            nom: l.nom || 'Point de repère',
            description: l.description || l.quartier || 'Non spécifié',
            zone: l.zone || 'Zone Cadjehoun',
            icon: 'location_on',
            isDefault: index === 0,
          }))
        );
      }
      toast.success(isFr ? 'Point de repère enregistré !' : 'Landmark saved!');
      setIsModalOpen(false);
    } catch (e) {
      toast.error('Erreur lors de l’enregistrement du point de repère');
    }
  };

  const handleLogout = async () => {
    await authApi.logout();
    toast.success(isFr ? 'Déconnexion effectuée' : 'Logged out');
    navigate({ to: '/connexion' });
  };

  return (
    <div className="bg-bg-app min-h-screen pb-24 font-body text-text-main">
      <ClientNavbar />

      <main className="max-w-[720px] mx-auto mt-[76px] px-md">
        {/* PROFILE HEADER (Real Backend User Info) */}
        <section className="bg-bg-card rounded-[14px] p-lg border border-border-default flex flex-col sm:flex-row items-start sm:items-center justify-between gap-md mb-md shadow-xs">
          <div className="flex items-center gap-md">
            <div className="w-16 h-16 rounded-full bg-primary-tint flex items-center justify-center text-[22px] font-bold text-primary-dark shrink-0 border border-primary-light">
              {userFullName.substring(0, 2).toUpperCase()}
            </div>
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
                <span className="text-secondary">{profile?.email || 'Non renseigné'}</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => toast(isFr ? 'Modification du profil' : 'Edit profile')}
            className="px-md py-sm bg-white border border-border-default text-text-secondary rounded-lg font-label text-label flex items-center gap-sm transition-all hover:bg-bg-secondary cursor-pointer"
          >
            <MIcon name="edit" className="text-sm" />
            {isFr ? 'Modifier' : 'Edit'}
          </button>
        </section>

        {/* REAL BACKEND STATS */}
        <section className="grid grid-cols-2 gap-md mb-md">
          <div className="bg-bg-card p-md rounded-[10px] border border-border-default flex flex-col items-center justify-center text-center shadow-xs">
            <span className="font-h2 text-h2 text-text-main font-bold">{orderCount}</span>
            <span className="text-micro text-text-tertiary uppercase mt-1">
              {isFr ? 'Commandes' : 'Orders'}
            </span>
          </div>
          <div className="bg-bg-card p-md rounded-[10px] border border-border-default flex flex-col items-center justify-center text-center shadow-xs">
            <span className="font-h2 text-h2 text-primary-container font-bold">{landmarkCount}</span>
            <span className="text-micro text-text-tertiary uppercase mt-1">
              {isFr ? 'Points de repère' : 'Landmarks'}
            </span>
          </div>
        </section>

        {/* LANDMARKS SECTION */}
        <section className="mb-md">
          <div className="flex justify-between items-center mb-sm">
            <h3 className="font-h3 text-h3 text-text-main font-bold">
              {isFr ? 'Mes points de repère' : 'My landmarks'}
            </h3>
            <button
              type="button"
              onClick={handleOpenAdd}
              className="bg-primary-container text-white px-md py-sm rounded-[10px] font-label text-label flex items-center gap-sm shadow-sm cursor-pointer hover:bg-primary-hover transition-all"
            >
              <MIcon name="add" />
              {isFr ? 'Nouveau' : 'Add new'}
            </button>
          </div>

          {landmarks.length === 0 ? (
            <div className="bg-bg-card p-lg rounded-[10px] border border-border-default text-center text-text-secondary">
              <MIcon name="location_off" className="text-3xl text-text-tertiary mb-2" />
              <p className="text-sm font-semibold">Aucun point de repère enregistré</p>
              <p className="text-xs text-text-tertiary mt-1">Ajoutez un point de repère pour accélérer vos livraisons.</p>
            </div>
          ) : (
            <div className="space-y-sm">
              {landmarks.map((lm) => (
                <div
                  key={lm.id}
                  className="bg-bg-card p-md rounded-[10px] border border-border-default flex items-center justify-between group hover:border-primary-light transition-colors"
                >
                  <div className="flex items-center gap-md">
                    <div className="w-10 h-10 rounded-full bg-primary-tint flex items-center justify-center text-primary-container shrink-0">
                      <MIcon name={lm.icon} />
                    </div>
                    <div>
                      <div className="flex items-center gap-sm">
                        <span className="font-medium text-body text-text-main font-bold">{lm.nom}</span>
                        {lm.isDefault && (
                          <span className="px-sm py-0.5 bg-success-light text-success text-[10px] rounded-full font-bold uppercase tracking-tighter">
                            {isFr ? 'Par défaut' : 'Default'}
                          </span>
                        )}
                      </div>
                      <p className="text-secondary text-text-secondary">{lm.description}</p>
                      <span className="inline-block mt-1 px-sm py-0.5 bg-gray-100 text-text-secondary text-micro rounded-md">
                        {lm.zone}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-sm">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(lm)}
                      className="p-sm text-primary-container hover:bg-primary-tint rounded-lg transition-colors cursor-pointer"
                    >
                      <MIcon name="edit" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteLandmark(lm.id)}
                      className="p-sm text-error hover:bg-error-light rounded-lg transition-colors cursor-pointer"
                    >
                      <MIcon name="delete" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* RECENT ORDERS SECTION */}
        <section className="mb-md">
          <div className="flex justify-between items-center mb-sm">
            <h3 className="font-h3 text-h3 text-text-main font-bold">
              {isFr ? 'Mes commandes récentes' : 'Recent orders'}
            </h3>
            <Link to="/commandes/suivi" className="text-primary-container font-label text-label hover:underline font-bold">
              {isFr ? 'Voir tout' : 'See all'}
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <div className="bg-bg-card p-lg rounded-[10px] border border-border-default text-center text-text-secondary">
              <MIcon name="shopping_bag" className="text-3xl text-text-tertiary mb-2" />
              <p className="text-sm font-semibold">Aucune commande enregistrée</p>
              <p className="text-xs text-text-tertiary mt-1">Vos commandes apparaîtront ici une fois validées.</p>
            </div>
          ) : (
            <div className="bg-bg-card border border-border-default rounded-[14px] overflow-hidden">
              <div className="divide-y divide-border-default">
                {recentOrders.map((o) => (
                  <div key={o.id} className="p-md flex items-center justify-between hover:bg-bg-secondary transition-colors">
                    <div className="flex flex-col">
                      <span className="font-bold text-text-main">Commande #{o.id}</span>
                      <span className="text-secondary text-text-tertiary">{o.date}</span>
                    </div>
                    <div className="font-bold text-primary-container">{o.totalLabel}</div>
                    <div className="flex items-center gap-md">
                      <span
                        className={
                          o.active
                            ? 'px-sm py-1 bg-primary-tint border border-primary-light text-primary-dark text-micro rounded-full font-bold uppercase'
                            : 'px-sm py-1 bg-success-light text-success text-micro rounded-full font-bold uppercase'
                        }
                      >
                        {isFr ? o.statusFr : o.statusEn}
                      </span>
                      <Link
                        to={o.active ? '/commandes/suivi' : '/confirmation'}
                        className="text-primary-container font-label text-label flex items-center gap-xs font-bold"
                      >
                        {o.active ? (isFr ? 'Suivre' : 'Track') : (isFr ? 'Détails' : 'Details')}
                        <MIcon name="chevron_right" className="text-sm" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* SECURITY & SETTINGS */}
        <section className="mb-xl">
          <h3 className="font-h3 text-h3 text-text-main mb-sm font-bold">
            {isFr ? 'Paramètres & Sécurité' : 'Settings & Security'}
          </h3>
          <div className="bg-bg-card border border-border-default rounded-[14px] overflow-hidden">
            <button
              type="button"
              onClick={() => toast(isFr ? 'Changement de mot de passe' : 'Change password')}
              className="w-full p-md flex items-center justify-between hover:bg-bg-secondary transition-colors text-left cursor-pointer"
            >
              <div className="flex items-center gap-md">
                <MIcon name="lock" className="text-text-secondary" />
                <span className="text-body text-text-main">{isFr ? 'Changer mot de passe' : 'Change password'}</span>
              </div>
              <MIcon name="chevron_right" className="text-text-tertiary" />
            </button>

            <Link
              to="/notifications"
              className="w-full p-md flex items-center justify-between border-t border-border-default hover:bg-bg-secondary transition-colors text-left"
            >
              <div className="flex items-center gap-md">
                <MIcon name="notifications_active" className="text-text-secondary" />
                <span className="text-body text-text-main">{isFr ? 'Notifications' : 'Notifications'}</span>
              </div>
              <MIcon name="chevron_right" className="text-text-tertiary" />
            </Link>

            <button
              type="button"
              onClick={toggleLanguage}
              className="w-full p-md flex items-center justify-between border-t border-border-default hover:bg-bg-secondary transition-colors text-left cursor-pointer"
            >
              <div className="flex items-center gap-md">
                <MIcon name="language" className="text-text-secondary" />
                <span className="text-body text-text-main">{isFr ? 'Langue' : 'Language'}</span>
              </div>
              <div className="flex items-center gap-sm">
                <span className="text-secondary text-text-tertiary font-bold uppercase">{language}</span>
                <MIcon name="chevron_right" className="text-text-tertiary" />
              </div>
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="w-full p-md flex items-center gap-md border-t border-border-default hover:bg-error-light transition-colors text-error font-medium cursor-pointer"
            >
              <MIcon name="logout" />
              {isFr ? 'Déconnexion' : 'Logout'}
            </button>
          </div>
        </section>
      </main>

      {/* Modal Landmark Add/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-on-surface/60 backdrop-blur-sm z-[100] flex items-center justify-center px-4 animate-fade-in">
          <div className="bg-white w-full max-w-[500px] rounded-xl shadow-2xl overflow-hidden p-lg">
            <div className="flex justify-between items-center mb-md border-b border-border-default pb-3">
              <h3 className="font-h2 text-h2 font-bold">
                {editingLandmark ? (isFr ? 'Modifier le repère' : 'Edit landmark') : (isFr ? 'Nouveau point de repère' : 'New landmark')}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <MIcon name="close" />
              </button>
            </div>

            <form onSubmit={handleSaveLandmark} className="space-y-md">
              <div>
                <label className="block text-label mb-1 text-text-secondary font-medium">Nom du point de repère</label>
                <input
                  type="text"
                  value={formNom}
                  onChange={(e) => setFormNom(e.target.value)}
                  placeholder="Ex: Maison Maman, Carrefour..."
                  required
                  className="w-full px-md py-2 rounded-lg border border-border-default focus:border-primary outline-none"
                />
              </div>

              <div>
                <label className="block text-label mb-1 text-text-secondary font-medium">Description précise</label>
                <textarea
                  rows={3}
                  value={formDesc}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Ex: Face à la pharmacie, portail bleu..."
                  required
                  className="w-full px-md py-2 rounded-lg border border-border-default focus:border-primary outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-md">
                <div>
                  <label className="block text-label mb-1 text-text-secondary font-medium">Zone</label>
                  <select
                    value={formZone}
                    onChange={(e) => setFormZone(e.target.value)}
                    className="w-full px-md py-2 rounded-lg border border-border-default focus:border-primary outline-none"
                  >
                    <option value="Zone Cadjehoun">Zone Cadjehoun</option>
                    <option value="Zone Haie Vive">Zone Haie Vive</option>
                    <option value="Zone Akpakpa">Zone Akpakpa</option>
                    <option value="Zone Calavi">Zone Calavi</option>
                  </select>
                </div>

                <div>
                  <label className="block text-label mb-1 text-text-secondary font-medium">Icône</label>
                  <select
                    value={formIcon}
                    onChange={(e) => setFormIcon(e.target.value)}
                    className="w-full px-md py-2 rounded-lg border border-border-default focus:border-primary outline-none"
                  >
                    <option value="location_on">Localisation</option>
                    <option value="home">Maison</option>
                    <option value="work">Bureau</option>
                    <option value="store">Magasin</option>
                  </select>
                </div>
              </div>

              <div className="pt-md border-t border-border-default flex justify-end gap-md">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-md py-2 rounded-lg border border-border-default font-medium hover:bg-gray-50 transition-all cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-lg py-2 rounded-lg bg-primary-container hover:bg-primary-hover text-white font-bold transition-all shadow-md cursor-pointer"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BottomNavBar */}
      <ClientBottomNav />
    </div>
  );
}
