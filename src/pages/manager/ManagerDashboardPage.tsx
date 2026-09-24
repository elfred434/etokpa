import { Link } from '@tanstack/react-router';
import ManagerLayout from '../../components/layout/manager/ManagerLayout';
import MIcon from '../../components/shared/MIcon';

const KPIS = [
  { icon: 'shopping_cart', label: "Commandes aujourd'hui", value: '47', delta: '+12% vs hier', up: true, hint: '' },
  { icon: 'payments', label: "Chiffre d'affaires", value: '84 200', unit: 'FCFA', delta: '+8%', up: true, hint: '' },
  { icon: 'two_wheeler', label: 'Livreurs actifs', value: '8 / 12', delta: '', up: true, hint: '67% de l’équipe opérationnelle' },
  { icon: 'task_alt', label: 'Taux de succès livraison', value: '94%', delta: '', up: true, hint: 'Objectif zone : 95%' },
];

const ROWS = [
  { id: '#TKP-0842', client: 'Moussa Ibrahim', articles: '3 articles', statut: 'En préparation', livreur: 'Koffi B.', init: 'KB' },
  { id: '#TKP-0843', client: 'Awa Diop', articles: '1 article', statut: 'En livraison', livreur: 'Yao A.', init: 'YA' },
  { id: '#TKP-0844', client: 'Jean Sognon', articles: '5 articles', statut: 'En attente', livreur: null, init: '' },
  { id: '#TKP-0845', client: 'Clara Dossou', articles: '2 articles', statut: 'En préparation', livreur: 'Pierre S.', init: 'PS' },
  { id: '#TKP-0846', client: 'Ramatou L.', articles: '6 articles', statut: 'En attente', livreur: null, init: '' },
  { id: '#TKP-0847', client: 'Ousmane G.', articles: '1 article', statut: 'En livraison', livreur: 'Koffi B.', init: 'KB' },
];

const STATUT_CLASS: Record<string, string> = {
  'En préparation': 'bg-primary-tint text-primary',
  'En livraison': 'bg-tertiary-container/20 text-tertiary',
  'En attente': 'bg-bg-secondary text-text-secondary',
};

export default function ManagerDashboardPage() {
  return (
    <ManagerLayout currentPath="/manager">
      <div className="space-y-6">
        {/* En-tête */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-h2 font-h2 font-bold">Tableau de bord — Zone Akpakpa</h1>
            <p className="text-text-secondary">Jeudi 12 juin · Cotonou</p>
          </div>
          <button type="button" className="btn btn-ghost gap-2">
            <MIcon name="download" className="text-[18px]" />
            Exporter le rapport
          </button>
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
              {k.hint && <p className="mt-1 text-label text-text-secondary">{k.hint}</p>}
            </div>
          ))}
        </div>

        {/* Commandes actives */}
        <div className="overflow-hidden rounded-lg border border-border-default bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-border-default px-lg py-4">
            <h2 className="text-h3 font-h3 font-bold">Commandes Actives</h2>
            <Link to="/manager/commandes" className="text-label font-semibold text-primary hover:underline">
              Voir tout
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-label">
              <thead>
                <tr className="bg-bg-secondary text-left text-text-secondary">
                  <th className="px-lg py-3 font-semibold"># Commande</th>
                  <th className="px-lg py-3 font-semibold">Client</th>
                  <th className="px-lg py-3 font-semibold">Statut</th>
                  <th className="px-lg py-3 font-semibold">Livreur</th>
                  <th className="px-lg py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((r) => (
                  <tr key={r.id} className="border-t border-border-default">
                    <td className="px-lg py-3 font-semibold">{r.id}</td>
                    <td className="px-lg py-3">
                      <p className="font-semibold">{r.client}</p>
                      <p className="text-text-secondary">{r.articles}</p>
                    </td>
                    <td className="px-lg py-3">
                      <span className={`rounded-full px-2.5 py-1 text-overline font-semibold ${STATUT_CLASS[r.statut]}`}>
                        {r.statut}
                      </span>
                    </td>
                    <td className="px-lg py-3">
                      {r.livreur ? (
                        <div className="flex items-center gap-2">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-tint text-overline font-bold text-primary">
                            {r.init}
                          </span>
                          {r.livreur}
                        </div>
                      ) : (
                        <button type="button" className="flex items-center gap-1 font-semibold text-primary">
                          Assigner
                          <MIcon name="expand_more" className="text-[16px]" />
                        </button>
                      )}
                    </td>
                    <td className="px-lg py-3">
                      <button type="button" className="flex items-center gap-1 font-semibold text-tertiary hover:underline">
                        <MIcon name="visibility" className="text-[16px]" />
                        Gérer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ManagerLayout>
  );
}
