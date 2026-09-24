import { useState } from 'react';
import AdminLayout from '../../components/layout/admin/AdminLayout';
import MIcon from '../../components/shared/MIcon';

/** Activité récente — données statiques du design Stitch (copie conforme). */
interface Activity {
  id: string;
  action: string;
  detail: string;
  status: string;
  statusColor: string;
  date: string;
  time: string;
  userName: string;
  userRole: string;
  userPhone: string;
  userZone: string;
  amount: string;
  payment: string;
  fee: string;
  deliveryFee: string;
  items: string;
  vendor: string;
  audit: string;
  cta: string;
  isDriver?: boolean;
}

const ACTIVITIES: Activity[] = [
  {
    id: 'CMD-2023-TOK2850',
    action: 'Nouvelle commande',
    detail: 'Commande #TOK-2850',
    status: 'Succès',
    statusColor: 'bg-success-light text-success',
    date: '15 Mai 2024',
    time: '10:45',
    userName: 'S. Dossou',
    userRole: 'Client vérifié (Acheteur)',
    userPhone: '+229 97 45 12 88',
    userZone: 'Akpakpa (PK3, Cotonou)',
    amount: '24 500 FCFA',
    payment: 'MTN Mobile Money (*880#)',
    fee: '750 FCFA',
    deliveryFee: '1 200 FCFA',
    items: 'Sac de Riz 25kg (1x), Huile de palme 5L (2x), Épices Dantokpa (4 sachets)',
    vendor: 'Dame Affi - Hangar C3, Marché Dantokpa',
    audit: "Validation auto • IP: 154.68.23.11 (MTN Bénin) • Signature SHA-256 OK",
    cta: 'Voir la commande',
  },
  {
    id: 'NEG-9082-RZ25',
    action: 'Négociation acceptée',
    detail: 'Produit: Sac de Riz 25kg',
    status: 'Info',
    statusColor: 'bg-info-light text-info',
    date: '15 Mai 2024',
    time: '10:32',
    userName: 'K. Adande',
    userRole: 'Grossiste agréé Dantokpa',
    userPhone: '+229 95 12 77 34',
    userZone: 'Dantokpa (Secteur Céréales)',
    amount: '17 500 FCFA',
    payment: 'Moov Money (*155#)',
    fee: '500 FCFA',
    deliveryFee: '800 FCFA',
    items: 'Sac de Riz Parfumé 25kg (Prix catalogue: 19 000 FCFA)',
    vendor: 'Stand Grossiste Adande Frères - Bloc A-08',
    audit: "Accord bilatéral validé par l'agent superviseur TOKPa #AD-04",
    cta: "Inspecter l'offre",
  },
  {
    id: 'DRV-4412-MOTO',
    action: 'Nouveau livreur',
    detail: 'Attente validation documents',
    status: 'En attente',
    statusColor: 'bg-amber-light text-amber-text',
    date: '15 Mai 2024',
    time: '10:15',
    userName: 'M. Gnonlonfoun',
    userRole: 'Livreur Partenaire Express',
    userPhone: '+229 66 89 31 02',
    userZone: 'Cadjehoun & Haie Vive',
    amount: 'N/A (Candidature)',
    payment: 'Caution Mobile Money enregistrée (25 000 FCFA)',
    fee: '0 FCFA',
    deliveryFee: 'Forfait course standard',
    items: 'Dossier complet : Moto Boxer 150cc, Permis A2, Assurance valide, CIP N° 10928372',
    vendor: 'TOKPa Logistique Flotte Cotonou',
    audit: "En attente d'inspection physique des pièces d'identité au QG Cadjehoun",
    cta: 'Examiner les documents',
    isDriver: true,
  },
  {
    id: 'STK-ALERT-PALM5L',
    action: 'Alerte Stock',
    detail: 'Huile de palme 5L (Faible)',
    status: 'Alerte',
    statusColor: 'bg-error-container text-on-error-container',
    date: '15 Mai 2024',
    time: '09:58',
    userName: 'Marchand Tokpa',
    userRole: 'Vendeur Grossiste Épicerie',
    userPhone: '+229 96 30 44 19',
    userZone: 'Dantokpa Marché Intérieur (Stand B-14)',
    amount: 'Seuil critique (2 unités)',
    payment: 'Réapprovisionnement en attente',
    fee: 'N/A',
    deliveryFee: 'N/A',
    items: 'Bidon Huile de palme raffinée 5L (Seuil mini: 15 unités)',
    vendor: 'Établissements Maman Chantal - Tokpa',
    audit: 'Détection automatique par capteur d inventaire TOKPa Stock System',
    cta: 'Notifier le marchand',
  },
];

/** Documents du dossier adhésion livreur (design — bloc « documents fournis »). */
const DRIVER_DOCS = [
  { icon: 'badge', title: 'CIP / NPI Béninois', sub: 'N° 10928372 • ANIP Bénin', status: 'Vérifié', ok: true },
  { icon: 'two_wheeler', title: 'Permis Catégorie A/A1', sub: 'Délivré par ANATT Bénin', status: 'Vérifié', ok: true },
  { icon: 'receipt', title: 'Fiche & Immatriculation', sub: 'Moto Bajaj Boxer 150cc', status: 'Vérifié', ok: true },
  { icon: 'home_pin', title: 'Attestation de résidence', sub: 'Chef Quartier Cadjehoun', status: 'En examen', ok: false },
];

const BAR_HEIGHTS = ['60%', '45%', '75%', '65%', '90%', '55%', '80%'];
const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const ZONES = [
  { name: 'Akpakpa', pct: '45%', color: 'bg-primary-container' },
  { name: 'Cadjehoun', pct: '35%', color: 'bg-secondary-container' },
  { name: 'Fidjrossè', pct: '20%', color: 'bg-tertiary-container' },
];

/**
 * AdminDashboardPage — « Tableau de bord global » — copie conforme statique du
 * design Stitch (`tableau_de_bord_global_admin_tokpa/code.html`).
 */
export default function AdminDashboardPage() {
  const [selected, setSelected] = useState<Activity | null>(null);

  return (
    <AdminLayout currentPath="/admin">
      {/* KPI SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-md">
        <div className="stat-card-gradient p-lg rounded-lg border border-border-default hover:shadow-lg transition-all duration-300">
          <div className="flex justify-between items-start mb-sm">
            <span className="font-secondary text-label text-text-secondary uppercase tracking-wider">
              Volume d'affaires (GMV)
            </span>
            <span className="p-2 bg-primary-light text-primary rounded-lg material-symbols-outlined">payments</span>
          </div>
          <div className="space-y-xs">
            <h2 className="font-h1 text-h1 text-on-surface">12 450 000 FCFA</h2>
            <div className="flex items-center gap-1 text-success">
              <MIcon name="trending_up" className="text-sm" />
              <span className="font-secondary text-label font-bold">+12% vs mois dernier</span>
            </div>
          </div>
        </div>

        <div className="stat-card-gradient p-lg rounded-lg border border-border-default hover:shadow-lg transition-all duration-300">
          <div className="flex justify-between items-start mb-sm">
            <span className="font-secondary text-label text-text-secondary uppercase tracking-wider">
              Commandes totales
            </span>
            <span className="p-2 bg-secondary-container/20 text-secondary rounded-lg material-symbols-outlined">
              shopping_cart
            </span>
          </div>
          <div className="space-y-xs">
            <h2 className="font-h1 text-h1 text-on-surface">1 248</h2>
            <div className="flex items-center gap-1 text-success">
              <MIcon name="trending_up" className="text-sm" />
              <span className="font-secondary text-label font-bold">+5.4%</span>
            </div>
          </div>
        </div>

        <div className="stat-card-gradient p-lg rounded-lg border border-border-default hover:shadow-lg transition-all duration-300">
          <div className="flex justify-between items-start mb-sm">
            <span className="font-secondary text-label text-text-secondary uppercase tracking-wider">
              Nouveaux utilisateurs
            </span>
            <span className="p-2 bg-tertiary-container/20 text-tertiary rounded-lg material-symbols-outlined">
              person_add
            </span>
          </div>
          <div className="space-y-xs">
            <h2 className="font-h1 text-h1 text-on-surface">156</h2>
            <div className="flex items-center gap-1">
              <span className="px-2 py-0.5 bg-success-light text-success-dark rounded-full font-secondary text-micro font-bold">
                +8% ce mois
              </span>
            </div>
          </div>
        </div>

        <div className="stat-card-gradient p-lg rounded-lg border border-border-default hover:shadow-lg transition-all duration-300">
          <div className="flex justify-between items-start mb-sm">
            <span className="font-secondary text-label text-text-secondary uppercase tracking-wider">
              Taux de livraison
            </span>
            <span className="p-2 bg-success-light text-success rounded-lg material-symbols-outlined">
              local_shipping
            </span>
          </div>
          <div className="space-y-xs">
            <h2 className="font-h1 text-h1 text-on-surface">94.2%</h2>
            <div className="flex items-center gap-1 text-success">
              <MIcon name="check_circle" className="text-sm" />
              <span className="font-secondary text-label font-bold">Excellent</span>
            </div>
          </div>
        </div>
      </div>

      {/* CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
        {/* Croissance des ventes */}
        <div className="lg:col-span-2 bg-bg-card p-lg rounded-lg border border-border-default">
          <div className="flex justify-between items-center mb-xl">
            <div>
              <h3 className="font-h2 text-h2 text-on-surface">Croissance des ventes</h3>
              <p className="font-secondary text-label text-text-secondary">Performances journalières du réseau</p>
            </div>
            <select className="bg-bg-app border-none text-label rounded-lg px-md py-sm font-secondary">
              <option>7 derniers jours</option>
              <option>30 derniers jours</option>
            </select>
          </div>
          <div className="h-[280px] w-full flex items-end justify-between gap-2 px-4 relative overflow-hidden">
            <div className="absolute inset-x-0 bottom-0 top-0 pointer-events-none opacity-20">
              <svg className="w-full h-full stroke-primary fill-transparent stroke-[0.5]" preserveAspectRatio="none" viewBox="0 0 100 100">
                <path d="M0,80 Q10,75 20,60 T40,65 T60,40 T80,30 T100,10" vectorEffect="non-scaling-stroke" />
              </svg>
            </div>
            {BAR_HEIGHTS.map((h, i) => (
              <div
                key={DAYS[i]}
                className="w-full bg-primary-light h-full rounded-t-lg transition-all hover:bg-primary"
                style={{ height: h }}
              />
            ))}
          </div>
          <div className="flex justify-between mt-sm px-4 font-secondary text-micro text-text-tertiary">
            {DAYS.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
        </div>

        {/* Ventes par Zone */}
        <div className="bg-bg-card p-lg rounded-lg border border-border-default">
          <h3 className="font-h2 text-h2 text-on-surface mb-xl">Ventes par Zone</h3>
          <div className="relative h-[220px] flex items-center justify-center">
            <div className="w-40 h-40 rounded-full border-[12px] border-primary-container relative flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-[12px] border-secondary-container border-l-transparent border-b-transparent -rotate-45" />
              <div className="absolute inset-0 rounded-full border-[12px] border-tertiary-container border-t-transparent border-r-transparent border-b-transparent rotate-90" />
              <div className="text-center">
                <span className="block font-h3 text-h3 text-on-surface">Total</span>
                <span className="font-price text-price text-primary">450</span>
              </div>
            </div>
          </div>
          <div className="mt-lg space-y-sm">
            {ZONES.map((z) => (
              <div key={z.name} className="flex items-center justify-between">
                <div className="flex items-center gap-sm">
                  <span className={`w-3 h-3 rounded-full ${z.color}`} />
                  <span className="font-secondary text-label">{z.name}</span>
                </div>
                <span className="font-secondary text-label font-bold">{z.pct}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* LOWER SECTION: TABLE & ALERTS */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-lg items-start">
        {/* RECENT ACTIVITIES TABLE */}
        <div className="xl:col-span-3 bg-bg-card rounded-lg border border-border-default overflow-hidden shadow-sm">
          <div className="p-lg border-b border-border-default flex justify-between items-center">
            <h3 className="font-h2 text-h2 text-on-surface">Activités Récentes de la Plateforme</h3>
            <button
              type="button"
              className="text-primary font-secondary text-label font-bold flex items-center gap-1 hover:underline cursor-pointer"
            >
              Tout voir <MIcon name="arrow_forward" className="text-sm" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left font-secondary">
              <thead className="bg-bg-secondary text-text-tertiary text-micro uppercase tracking-widest border-b border-border-default">
                <tr>
                  <th className="px-lg py-md">Date</th>
                  <th className="px-lg py-md">Type d'action</th>
                  <th className="px-lg py-md">Utilisateur</th>
                  <th className="px-lg py-md">Détails</th>
                  <th className="px-lg py-md">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default text-label">
                {ACTIVITIES.map((a) => (
                  <tr
                    key={a.id}
                    onClick={() => setSelected(a)}
                    className="hover:bg-orange-50/60 transition-colors cursor-pointer"
                  >
                    <td className="px-lg py-md text-text-secondary">{a.time}</td>
                    <td className="px-lg py-md font-bold">{a.action}</td>
                    <td className="px-lg py-md">{a.userName}</td>
                    <td className="px-lg py-md">{a.detail}</td>
                    <td className="px-lg py-md">
                      <span className={`px-3 py-1 font-bold rounded-full text-micro ${a.statusColor}`}>
                        {a.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* SYSTEM ALERTS */}
        <div className="space-y-md">
          <div className="bg-bg-card p-lg rounded-lg border border-border-default border-l-4 border-l-error">
            <div className="flex items-center gap-sm mb-md text-error">
              <MIcon name="warning" />
              <h4 className="font-h3 text-h3 font-bold">Alertes Système</h4>
            </div>
            <ul className="space-y-md">
              <li className="flex flex-col gap-1 border-b border-border-default pb-md last:border-0 last:pb-0">
                <span className="font-secondary text-label font-bold text-on-surface">Zones Saturées</span>
                <p className="font-secondary text-secondary text-micro">
                  Fidjrossè Calvaire - Forte demande, peu de livreurs disponibles.
                </p>
                <span className="mt-1 text-error text-micro font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-error animate-pulse" /> Urgent
                </span>
              </li>
              <li className="flex flex-col gap-1 border-b border-border-default pb-md last:border-0 last:pb-0">
                <span className="font-secondary text-label font-bold text-on-surface">Stocks Faibles</span>
                <p className="font-secondary text-secondary text-micro">
                  Gari Sohoui (Vendeur #042) - Plus que 3 sacs disponibles.
                </p>
                <button type="button" className="mt-2 text-primary font-bold text-micro text-left hover:underline cursor-pointer">
                  Notifier le vendeur
                </button>
              </li>
              <li className="flex flex-col gap-1 border-b border-border-default pb-md last:border-0 last:pb-0">
                <span className="font-secondary text-label font-bold text-on-surface">Délai Livraison</span>
                <p className="font-secondary text-secondary text-micro">
                  Augmentation de 15% du temps moyen à Akpakpa (Travaux routiers).
                </p>
              </li>
            </ul>
          </div>

          {/* Support card */}
          <div className="bg-primary text-white p-lg rounded-lg shadow-md relative overflow-hidden">
            <div className="relative z-10">
              <h4 className="font-h3 text-h3 font-bold mb-xs">Besoin d'aide ?</h4>
              <p className="text-micro opacity-80 mb-md font-secondary">
                Contactez le support technique 24/7 dédié aux administrateurs TOKPa.
              </p>
              <button
                type="button"
                className="bg-white text-primary px-4 py-2 rounded-lg font-bold text-label transition-transform active:scale-95 cursor-pointer"
              >
                Support Direct
              </button>
            </div>
            <MIcon
              name="support_agent"
              className="absolute -bottom-4 -right-4 text-[120px] opacity-10 rotate-12 pointer-events-none"
            />
          </div>
        </div>
      </div>

      {/* MODALE DÉTAIL ACTIVITÉ — copie conforme du design */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl border border-border-default w-full max-w-[600px] max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* En-tête */}
            <div className="px-6 py-4 border-b border-border-default flex items-center justify-between bg-surface-container-low shrink-0">
              <div className="flex items-center gap-2">
                <MIcon name="receipt_long" className="text-primary text-xl" />
                <div>
                  <h3 className="font-h2 text-h3 font-bold text-on-surface">
                    {selected.action} — {selected.id}
                  </h3>
                  <p className="font-secondary text-micro text-text-secondary">
                    Supervision &amp; Traitement administratif TOKPa
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Fermer le modal"
                onClick={() => setSelected(null)}
                className="p-1.5 text-text-secondary hover:text-on-surface hover:bg-black/5 rounded-full transition-colors cursor-pointer"
              >
                <MIcon name="close" className="text-xl" />
              </button>
            </div>

            {/* Corps */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="flex items-start justify-between gap-4 pb-3 border-b border-border-default">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono font-bold text-label text-primary bg-primary-light/40 px-2 py-0.5 rounded">
                      #{selected.id}
                    </span>
                    <span className="text-micro text-text-secondary font-medium">
                      {selected.date} à {selected.time}
                    </span>
                  </div>
                  <h4 className="text-h2 font-bold text-on-surface">{selected.action}</h4>
                </div>
                <span className={`px-3 py-1 font-bold rounded-full text-micro ${selected.statusColor}`}>
                  {selected.status}
                </span>
              </div>

              {/* Profil de l'acteur */}
              <div className="bg-bg-secondary p-3.5 rounded-lg border border-border-default space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-micro uppercase tracking-wider text-text-tertiary font-bold flex items-center gap-1">
                    <MIcon name="person" className="text-sm" />
                    Profil de l'Acteur
                  </span>
                  <span className="text-micro font-bold text-primary bg-white px-2 py-0.5 rounded border border-border-default">
                    {selected.userRole}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-label pt-1">
                  <div className="flex items-center gap-2">
                    <MIcon name="badge" className="text-text-tertiary text-base" />
                    <span className="font-bold text-on-surface">{selected.userName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MIcon name="call" className="text-text-tertiary text-base" />
                    <span className="font-mono text-text-secondary">{selected.userPhone}</span>
                  </div>
                  <div className="flex items-center gap-2 md:col-span-2">
                    <MIcon name="location_on" className="text-text-tertiary text-base" />
                    <span className="text-text-secondary">{selected.userZone}</span>
                  </div>
                </div>
              </div>

              {/* Montant / Frais */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-surface-container-low p-3 rounded-lg border border-border-default">
                  <span className="text-micro uppercase tracking-wider text-text-tertiary font-bold block mb-1">
                    Montant &amp; Paiement
                  </span>
                  <p className="font-price text-h3 text-primary font-bold">{selected.amount}</p>
                  <p className="text-micro text-text-secondary mt-0.5">{selected.payment}</p>
                </div>
                <div className="bg-bg-app p-3 rounded-lg border border-border-default">
                  <span className="text-micro uppercase tracking-wider text-text-tertiary font-bold block mb-1">
                    Frais &amp; Livraison
                  </span>
                  <p className="text-label font-semibold text-on-surface">Commission TOKPa: {selected.fee}</p>
                  <p className="text-micro text-text-secondary mt-0.5">Livraison: {selected.deliveryFee}</p>
                </div>
              </div>

              {/* Articles */}
              <div className="space-y-1.5">
                <span className="text-micro uppercase tracking-wider text-text-tertiary font-bold flex items-center gap-1">
                  <MIcon name="shopping_bag" className="text-sm" />
                  Articles / Objet de l'opération
                </span>
                <div className="bg-white p-3 rounded-lg border border-border-default">
                  <p className="text-label text-on-surface font-medium leading-relaxed">{selected.items}</p>
                  <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-border-default text-micro text-text-secondary">
                    <MIcon name="storefront" className="text-sm text-secondary" />
                    <span className="font-bold text-on-surface">Vendeur Dantokpa :</span>
                    <span>{selected.vendor}</span>
                  </div>
                </div>
              </div>

              {/* Documents livreur (dossier d'adhésion) */}
              {selected.isDriver && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-micro uppercase tracking-wider text-text-tertiary font-bold flex items-center gap-1">
                      <MIcon name="folder_shared" className="text-sm" />
                      Documents fournis par le livreur (Dossier d'adhésion)
                    </span>
                    <span className="text-micro font-bold text-success bg-success-light px-2 py-0.5 rounded border border-success/20 flex items-center gap-1">
                      <MIcon name="verified" className="text-sm" />
                      3/4 Validés
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-label">
                    {DRIVER_DOCS.map((d) => (
                      <div
                        key={d.title}
                        className="p-2.5 rounded-lg border border-border-default bg-bg-secondary flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <MIcon
                            name={d.icon}
                            className={`${d.ok ? 'text-primary bg-primary-light/30' : 'text-secondary bg-amber-light'} p-1.5 rounded`}
                          />
                          <div className="truncate">
                            <p className="text-label font-bold text-on-surface truncate">{d.title}</p>
                            <p className="text-micro text-text-secondary truncate">{d.sub}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className={`px-2 py-0.5 font-bold rounded-full text-micro ${
                              d.ok ? 'bg-success-light text-success' : 'bg-amber-light text-amber-text'
                            }`}
                          >
                            {d.status}
                          </span>
                          <button
                            type="button"
                            className="p-1 text-text-secondary hover:text-primary hover:bg-white rounded transition-colors cursor-pointer"
                            title="Voir le document"
                          >
                            <MIcon name="visibility" className="text-base" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Journal d'audit */}
              <div className="space-y-1 pt-1">
                <span className="text-micro uppercase tracking-wider text-text-tertiary font-bold flex items-center gap-1">
                  <MIcon name="verified" className="text-sm" />
                  Journal d'Audit Système
                </span>
                <p className="text-micro font-mono text-text-secondary bg-bg-app p-2.5 rounded border border-border-default">
                  {selected.audit}
                </p>
              </div>
            </div>

            {/* Pied de modale */}
            <div className="px-6 py-4 bg-bg-secondary border-t border-border-default flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                className="px-3 py-2 text-label font-medium text-text-secondary hover:bg-border-default/40 rounded-lg transition-colors flex items-center gap-1.5 border border-border-default bg-white cursor-pointer"
              >
                <MIcon name="download" className="text-base" />
                <span>Télécharger reçu</span>
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="px-4 py-2 text-label font-medium text-text-secondary hover:bg-border-default/40 rounded-lg transition-colors cursor-pointer"
                >
                  Fermer
                </button>
                <button
                  type="button"
                  className="px-4 py-2 text-label font-bold text-white bg-primary-container hover:bg-primary-hover rounded-lg transition-transform active:scale-95 flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <MIcon name="open_in_new" className="text-base" />
                  <span>{selected.cta}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
