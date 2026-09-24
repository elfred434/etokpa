import { useMemo, useState } from 'react';
import ManagerLayout from '../../components/layout/manager/ManagerLayout';
import MIcon from '../../components/shared/MIcon';

type Cmd = {
  id: string; heure: string; detail: string;
  client: string; initC: string; tel: string;
  marchand: string; etal: string;
  livreur: string | null; initL: string; vehicule: string;
  repere: string;
  montant: string; paiement: string;
  statut: string; action?: string;
};

const COMMANDES: Cmd[] = [
  { id: '#TOK-2847', heure: '14:15', detail: '3 articles • Négocié', client: 'Kossi Ouédraogo', initC: 'KO', tel: '+229 97 12 45 80', marchand: 'Afi Mensah', etal: 'Dantokpa Hangar B-14', livreur: 'Jean Kouassi', initL: 'JK', vehicule: 'Moto #7492-BJ', repere: 'Face Pharmacie Akpakpa Centre', montant: '3 980 FCFA', paiement: 'MTN MoMo (Payé)', statut: 'En livraison' },
  { id: '#TOK-2850', heure: '14:45', detail: '2 articles • Standard', client: 'Awa Mensah', initC: 'AM', tel: '+229 96 34 89 12', marchand: 'Blandine Gbaguidi', etal: 'Épices & Piments #C-2', livreur: null, initL: '', vehicule: '', repere: 'Carrefour Le Bélier, derrière le collège', montant: '5 100 FCFA', paiement: 'Moov Money (Payé)', statut: 'En attente', action: 'Assigner' },
  { id: '#TOK-2845', heure: '14:02', detail: '4 articles • Pack Famille', client: 'Pascal Zinsou', initC: 'PZ', tel: '+229 61 78 90 23', marchand: 'Maman Chantal', etal: 'Ignames & Manioc Dantokpa', livreur: 'Boris Agossou', initL: 'BA', vehicule: 'Moto #4829-RB', repere: 'Hôpital de Zone Akpakpa, porte principale', montant: '12 400 FCFA', paiement: 'FedaPay CB (Payé)', statut: 'En préparation' },
  { id: '#TOK-2839', heure: '13:10', detail: '1 article • Poissons frais', client: 'Fatima Salifou', initC: 'FS', tel: '+229 95 01 23 45', marchand: 'Pêcherie Cotonou Est', etal: 'Quai Dantokpa Pont', livreur: 'Salifou D.', initL: 'SD', vehicule: 'Moto #9120-BJ', repere: 'Immeuble NSIA Assurances, Akpakpa Cité Vie', montant: '7 800 FCFA', paiement: 'MTN MoMo (Livré 13:42)', statut: 'Livré' },
  { id: '#TOK-2834', heure: '12:35', detail: '5 articles • Céréales', client: 'Marie Koné', initC: 'MK', tel: '+229 97 88 11 00', marchand: 'Dossou Grains & Farines', etal: 'Dantokpa Allée G', livreur: 'Jean Kouassi', initL: 'JK', vehicule: 'Moto #7492-BJ', repere: 'Pharmacie Saint-Charbel, face église catholique', montant: '6 250 FCFA', paiement: 'FedaPay (Payé)', statut: 'En livraison' },
  { id: '#TOK-2828', heure: '11:15', detail: 'Rupture stock vendeur', client: 'Idriss Diallo', initC: 'ID', tel: '+229 66 54 32 10', marchand: 'Kouassi Légumes Bio', etal: 'Box #12 Dantokpa', livreur: null, initL: '', vehicule: '', repere: 'Carrefour Le Matin, Akpakpa Dodomè', montant: '4 500 FCFA', paiement: 'Remboursé MoMo', statut: 'Annulé' },
  { id: '#TOK-2822', heure: '10:45', detail: '2 articles • Fruits locaux', client: 'Safi Alabi', initC: 'SA', tel: '+229 97 65 43 21', marchand: 'Verger du Sud', etal: 'Marché de fruits Akpakpa', livreur: 'Moussa Diallo', initL: 'MD', vehicule: 'Tricycle #8812-BJ', repere: 'Pharmacie Saint-Jean, Carrefour PK4', montant: '3 200 FCFA', paiement: 'MTN MoMo (Payé)', statut: 'En préparation' },
];

const ONGLETS = [
  { label: 'Toutes', n: 24, statut: null },
  { label: 'En attente', n: 3, statut: 'En attente' },
  { label: 'En préparation', n: 5, statut: 'En préparation' },
  { label: 'En livraison', n: 8, statut: 'En livraison' },
  { label: 'Livrées', n: 6, statut: 'Livré' },
  { label: 'Annulées', n: 2, statut: 'Annulé' },
];

const SECTEURS = ['Tous les sous-secteurs', 'Pont Dantokpa / Céréales', 'Akpakpa Dodomè', 'Akpakpa Cotonou Centre', 'Quartier Sèkandji'];

const STATUT_CLASS: Record<string, string> = {
  'En attente': 'bg-bg-secondary text-text-secondary',
  'En préparation': 'bg-primary-tint text-primary',
  'En livraison': 'bg-tertiary-container/20 text-tertiary',
  'Livré': 'bg-success-container text-on-surface',
  'Annulé': 'bg-error-container text-on-error-container',
};

export default function ManagerOrdersPage() {
  const [onglet, setOnglet] = useState<string | null>(null);
  const [secteur, setSecteur] = useState(SECTEURS[0]);
  const [selection, setSelection] = useState<Cmd | null>(null);
  const [creation, setCreation] = useState(false);

  const lignes = useMemo(
    () => COMMANDES.filter((c) => !onglet || c.statut === onglet),
    [onglet],
  );

  return (
    <ManagerLayout currentPath="/manager/commandes">
      <div className="space-y-6">
        {/* En-tête */}
        <div>
          <p className="text-overline uppercase text-primary">Supervision Opérationnelle</p>
          <p className="text-text-secondary">Flux en direct - Marché Dantokpa & Quartiers Akpakpa</p>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-h2 font-h2 font-bold">Supervision & Gestion des Commandes</h1>
            <div className="flex gap-2">
              <button type="button" className="btn btn-ghost gap-2">
                <MIcon name="download" className="text-[18px]" />
                Exporter le rapport
              </button>
              <button type="button" className="btn btn-primary gap-2" onClick={() => setCreation(true)}>
                <MIcon name="add" className="text-[18px]" />
                Créer une commande manuelle
              </button>
            </div>
          </div>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { icon: 'shopping_cart', label: "Total Commandes (Aujourd'hui)", value: '42', sub: '+14% vs hier' },
            { icon: 'two_wheeler', label: 'En cours de livraison', value: '8', sub: '5 motos, 3 tricycles' },
            { icon: 'pending_actions', label: "En attente d'affectation", value: '3', sub: 'Priorité manager' },
            { icon: 'payments', label: 'Volume Financier du Jour', value: '284 500', unit: 'FCFA', sub: '100% sécurisé FedaPay/MoMo' },
          ].map((k) => (
            <div key={k.label} className="rounded-lg border border-border-default bg-white p-lg shadow-sm">
              <div className="flex items-center gap-2">
                <MIcon name={k.icon} className="text-primary text-[20px]" />
                <p className="text-label text-text-secondary">{k.label}</p>
              </div>
              <p className="mt-2 text-h1 font-h1 font-bold">
                {k.value} {k.unit && <span className="text-label text-text-secondary">{k.unit}</span>}
              </p>
              <p className="mt-1 text-label text-text-secondary">{k.sub}</p>
            </div>
          ))}
        </div>

        {/* Filtres */}
        <div className="flex flex-wrap items-center gap-2">
          {ONGLETS.map((o) => (
            <button
              key={o.label}
              type="button"
              onClick={() => setOnglet(o.statut)}
              className={`rounded-full border px-3 py-1.5 text-label font-semibold transition ${
                onglet === o.statut
                  ? 'border-primary bg-primary text-white'
                  : 'border-border-default bg-white text-text-secondary hover:border-primary hover:text-primary'
              }`}
            >
              {o.label} ({o.n})
            </button>
          ))}
          <select
            value={secteur}
            onChange={(e) => setSecteur(e.target.value)}
            className="ml-auto rounded-lg border border-border-default bg-white px-3 py-2 text-label"
          >
            {SECTEURS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Tableau */}
        <div className="overflow-hidden rounded-lg border border-border-default bg-white shadow-sm">
          <div className="border-b border-border-default px-lg py-4">
            <h2 className="text-h3 font-h3 font-bold">Liste des Commandes de la Zone</h2>
            <p className="text-label text-text-secondary">Cliquez sur une ligne pour afficher les détails complets</p>
          </div>
          <p className="px-lg pt-3 text-label text-text-secondary">Affichage de {lignes.length} commandes actives</p>
          <div className="overflow-x-auto">
            <table className="w-full text-label">
              <thead>
                <tr className="bg-bg-secondary text-left text-text-secondary">
                  <th className="px-4 py-3 font-semibold">Commande</th>
                  <th className="px-4 py-3 font-semibold">Client & Téléphone</th>
                  <th className="px-4 py-3 font-semibold">Marchand / Étal</th>
                  <th className="px-4 py-3 font-semibold">Livreur Assigné</th>
                  <th className="px-4 py-3 font-semibold">Point de Repère</th>
                  <th className="px-4 py-3 font-semibold">Montant</th>
                  <th className="px-4 py-3 font-semibold">Statut</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {lignes.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => setSelection(c)}
                    className="cursor-pointer border-t border-border-default hover:bg-primary-tint/50"
                  >
                    <td className="px-4 py-3">
                      <p className="font-semibold">{c.id}</p>
                      <p className="text-text-secondary">{c.heure} · {c.detail}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-bg-secondary text-overline font-bold">
                          {c.initC}
                        </span>
                        <div>
                          <p className="font-semibold">{c.client}</p>
                          <p className="text-text-secondary">{c.tel}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold">{c.marchand}</p>
                      <p className="text-text-secondary">{c.etal}</p>
                    </td>
                    <td className="px-4 py-3">
                      {c.livreur ? (
                        <div className="flex items-center gap-2">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-tint text-overline font-bold text-primary">
                            {c.initL}
                          </span>
                          <div>
                            <p className="font-semibold">{c.livreur}</p>
                            <p className="text-text-secondary">{c.vehicule}</p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-text-tertiary">— Non affecté —</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{c.repere}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold">{c.montant}</p>
                      <p className="text-text-secondary">{c.paiement}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-overline font-semibold ${STATUT_CLASS[c.statut]}`}>
                        {c.statut}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {c.action ? (
                        <button
                          type="button"
                          onClick={(e) => e.stopPropagation()}
                          className="btn btn-primary px-3 py-1.5 text-label"
                        >
                          {c.action}
                        </button>
                      ) : (
                        <button type="button" className="font-semibold text-tertiary hover:underline">
                          Gérer
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modale détails commande */}
      {selection && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelection(null)}
        >
          <div
            className="w-full max-w-[600px] max-h-[85vh] flex flex-col rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border-default p-4">
              <h3 className="text-h3 font-h3 font-bold">{selection.id}</h3>
              <button type="button" onClick={() => setSelection(null)} className="p-1 text-text-secondary hover:text-on-surface">
                <MIcon name="close" className="text-[20px]" />
              </button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              <p className="text-label text-text-secondary">{selection.heure} · {selection.detail}</p>
              <div className="grid grid-cols-2 gap-3 text-label">
                <div>
                  <p className="text-text-secondary">Client</p>
                  <p className="font-semibold">{selection.client} — {selection.tel}</p>
                </div>
                <div>
                  <p className="text-text-secondary">Marchand / Étal</p>
                  <p className="font-semibold">{selection.marchand} — {selection.etal}</p>
                </div>
                <div>
                  <p className="text-text-secondary">Livreur assigné</p>
                  <p className="font-semibold">
                    {selection.livreur ? `${selection.livreur} (${selection.vehicule})` : '— Non affecté —'}
                  </p>
                </div>
                <div>
                  <p className="text-text-secondary">Point de repère</p>
                  <p className="font-semibold">{selection.repere}</p>
                </div>
                <div>
                  <p className="text-text-secondary">Montant</p>
                  <p className="font-semibold">{selection.montant} — {selection.paiement}</p>
                </div>
                <div>
                  <p className="text-text-secondary">Statut</p>
                  <span className={`rounded-full px-2.5 py-1 text-overline font-semibold ${STATUT_CLASS[selection.statut]}`}>
                    {selection.statut}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-border-default p-4">
              <button type="button" className="btn btn-ghost" onClick={() => setSelection(null)}>
                Fermer
              </button>
              {!selection.livreur && (
                <button type="button" className="btn btn-primary" onClick={() => setSelection(null)}>
                  Assigner un livreur
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modale création manuelle */}
      {creation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setCreation(false)}>
          <div
            className="w-full max-w-[600px] max-h-[85vh] flex flex-col rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border-default p-4">
              <h3 className="text-h3 font-h3 font-bold">Créer une commande manuelle</h3>
              <button type="button" onClick={() => setCreation(false)} className="p-1 text-text-secondary hover:text-on-surface">
                <MIcon name="close" className="text-[20px]" />
              </button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {[
                { label: 'Nom du client', ph: 'Nom complet' },
                { label: 'Téléphone (Bénin)', ph: '+229 97 00 00 00' },
                { label: 'Marchand / Étal', ph: 'Nom du vendeur et étal' },
                { label: 'Point de repère', ph: 'Ex : Face Pharmacie Akpakpa Centre' },
                { label: 'Montant (FCFA)', ph: '0' },
              ].map((f) => (
                <div key={f.label} className="space-y-1">
                  <label className="text-label text-text-secondary">{f.label}</label>
                  <input type="text" placeholder={f.ph} className="w-full rounded-lg border border-border-default px-3 py-2 text-label" />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 border-t border-border-default p-4">
              <button type="button" className="btn btn-ghost" onClick={() => setCreation(false)}>
                Annuler
              </button>
              <button type="button" className="btn btn-primary" onClick={() => setCreation(false)}>
                Créer la commande
              </button>
            </div>
          </div>
        </div>
      )}
    </ManagerLayout>
  );
}
