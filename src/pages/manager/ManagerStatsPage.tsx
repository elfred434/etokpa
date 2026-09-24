import { useState } from 'react';
import ManagerLayout from '../../components/layout/manager/ManagerLayout';
import MIcon from '../../components/shared/MIcon';

const PERIODES = ['Aujourd’hui', '7 derniers jours', 'Ce Mois', 'Année'];

const KPIS = [
  { icon: 'trending_up', label: "Volume d'Affaires", value: '2 450 000', unit: 'FCFA', delta: '+12%' },
  { icon: 'shopping_basket', label: 'Commandes Total', value: '856', unit: '', delta: '+5%' },
  { icon: 'task_alt', label: 'Taux de Livraison', value: '98.2%', unit: '', delta: 'Succès' },
  { icon: 'delivery_dining', label: 'Livreurs Actifs', value: '24', unit: '/ 30', delta: '' },
];

const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const HAUTEURS = [52, 68, 45, 80, 95, 72, 60];

const MARCHES = [
  { icon: 'storefront', nom: 'Dantokpa', sous: 'Grand Marché International', montant: '1 250 000 FCFA', part: '51%' },
  { icon: 'shopping_bag', nom: 'Akpakpa Centre', sous: 'Zone Résidentielle & Commerces', montant: '820 000 FCFA', part: '33%' },
  { icon: 'local_mall', nom: 'Sègbèya', sous: 'Marché de quartier', montant: '380 000 FCFA', part: '16%' },
];

const TOP5 = [
  { nom: 'Koffi A.', courses: 142 },
  { nom: 'Sena J.', courses: 138 },
  { nom: 'Modeste T.', courses: 125 },
  { nom: 'Jean B.', courses: 118 },
  { nom: 'Aimé D.', courses: 98 },
];

export default function ManagerStatsPage() {
  const [periode, setPeriode] = useState(PERIODES[0]);

  return (
    <ManagerLayout currentPath="/manager/statistiques">
      <div className="space-y-6">
        {/* En-tête */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-h2 font-h2 font-bold">Statistiques de la Zone - Akpakpa</h1>
            <p className="text-text-secondary">Bienvenue sur votre tableau de bord de performance localisée.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {PERIODES.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriode(p)}
                className={`flex items-center gap-1 rounded-full border px-3 py-1.5 text-label font-semibold transition ${
                  periode === p
                    ? 'border-primary bg-primary text-white'
                    : 'border-border-default bg-white text-text-secondary hover:border-primary hover:text-primary'
                }`}
              >
                {p === PERIODES[0] && <MIcon name="calendar_today" className="text-[16px]" />}
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {KPIS.map((k) => (
            <div key={k.label} className="rounded-lg border border-border-default bg-white p-lg shadow-sm">
              <div className="flex items-center gap-2">
                <MIcon name={k.icon} className="text-primary text-[20px]" />
                <p className="text-label text-text-secondary">{k.label}</p>
              </div>
              <p className="mt-2 text-h1 font-h1 font-bold">
                {k.value} {k.unit && <span className="text-label text-text-secondary">{k.unit}</span>}
              </p>
              {k.delta && (
                <p className="mt-1 text-label font-semibold text-success">
                  <MIcon name="trending_up" className="align-middle text-[16px]" /> {k.delta}
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          {/* Graphe */}
          <div className="rounded-lg border border-border-default bg-white p-lg shadow-sm xl:col-span-2">
            <h2 className="text-h3 font-h3 font-bold">Évolution des ventes (7 derniers jours)</h2>
            <p className="text-label text-text-secondary">Volume (FCFA)</p>
            <div className="mt-6 flex h-[240px] items-end justify-between gap-3">
              {JOURS.map((j, i) => (
                <div key={j} className="flex flex-1 flex-col items-center gap-2">
                  <div
                    className="w-full max-w-[48px] rounded-t-lg bg-primary"
                    style={{ height: `${HAUTEURS[i]}%` }}
                  />
                  <p className="text-label text-text-secondary">{j}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Top marchés */}
          <div className="rounded-lg border border-border-default bg-white p-lg shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-h3 font-h3 font-bold">Top Marchés de la Zone</h2>
              <button type="button" className="text-label font-semibold text-primary hover:underline">
                Voir tout
              </button>
            </div>
            <div className="mt-2">
              {MARCHES.map((m) => (
                <div key={m.nom} className="flex items-center gap-3 border-t border-border-default py-3 first:border-t-0">
                  <MIcon name={m.icon} className="text-primary text-[20px]" />
                  <div className="flex-1">
                    <p className="text-label font-semibold">{m.nom}</p>
                    <p className="text-label text-text-secondary">{m.sous}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-label font-semibold">{m.montant}</p>
                    <p className="text-label text-text-secondary">{m.part}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Performance livreurs */}
        <div className="rounded-lg border border-border-default bg-white p-lg shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-h3 font-h3 font-bold">Performance Livreurs</h2>
            <span className="rounded-full bg-bg-secondary px-2.5 py-1 text-overline font-semibold">Top 5</span>
          </div>
          <div className="mt-2">
            {TOP5.map((l, i) => (
              <div key={l.nom} className="flex items-center gap-3 border-t border-border-default py-3 first:border-t-0">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-tint text-label font-bold text-primary">
                  {i + 1}
                </span>
                <p className="flex-1 text-label font-semibold">{l.nom}</p>
                <p className="text-label text-text-secondary">{l.courses} courses</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ManagerLayout>
  );
}
