import { useMemo, useState } from 'react';
import ManagerLayout from '../../components/layout/manager/ManagerLayout';
import MIcon from '../../components/shared/MIcon';

type Litige = {
  id: string; cde: string; motif: string; icon: string; categorie: string;
  urgent: boolean; temps: string; trajet?: string;
  partieA: string; partieB: string; montantLabel: string; montant: string;
  resolu?: boolean; telA: string; telB: string; telC: string;
};

const LITIGES: Litige[] = [
  { id: '#LIT-1042', cde: '#TOK-2847', motif: 'Produit non conforme / abîmé', icon: 'broken_image', categorie: 'Qualité Produit', urgent: true, temps: 'Il y a 25 min', trajet: 'Marché Dantokpa Box #B-14 → Akpakpa Centre', partieA: 'Client Kossi Ouédraogo', partieB: 'Vendeuse Afi Mensah', montantLabel: 'Montant en jeu', montant: '3 500', telA: '+229 95 33 22 00', telB: '+229 96 44 88 00', telC: '+229 97 12 34 00' },
  { id: '#LIT-1039', cde: '#TOK-2841', motif: 'Désaccord sur le prix négocié', icon: 'price_change', categorie: 'Tarif & Négociation', urgent: false, temps: 'Il y a 1h 10min', partieA: 'Livreur Boris Agossou', partieB: 'Client Marceline Dossou', montantLabel: 'Montant en jeu', montant: '800', telA: '+229 95 33 22 00', telB: '+229 96 44 88 00', telC: '+229 97 12 34 00' },
  { id: '#LIT-1035', cde: '#TOK-2819', motif: 'Retard de livraison', icon: 'alarm_off', categorie: 'Retard / Livraison', urgent: false, temps: "Aujourd'hui 11:20", partieA: 'Client Patrice Hounnou', partieB: 'Livreur Salifou D.', montantLabel: 'Montant initial', montant: '4 200', resolu: true, telA: '+229 95 33 22 00', telB: '+229 96 44 88 00', telC: '+229 97 12 34 00' },
  { id: '#LIT-1031', cde: '#TOK-2804', motif: 'Produit manquant / incomplet', icon: 'inventory_2', categorie: 'Qualité Produit', urgent: false, temps: 'Hier 18:40', partieA: 'Cliente Viviane A.', partieB: 'Vendeuse Blandine G.', montantLabel: 'Montant remboursé', montant: '1 200', resolu: true, telA: '+229 95 33 22 00', telB: '+229 96 44 88 00', telC: '+229 97 12 34 00' },
];

const ONGLETS = [
  { label: 'Tous', n: 6, f: null },
  { label: 'Urgents / Haute priorité', n: 2, f: 'urgents' },
  { label: 'Qualité Produit', n: 2, f: 'Qualité Produit' },
  { label: 'Retard / Livraison', n: 1, f: 'Retard / Livraison' },
  { label: 'Tarif & Négociation', n: 1, f: 'Tarif & Négociation' },
  { label: 'Résolus', n: 2, f: 'resolus' },
] as const;

export default function ManagerLitigesPage() {
  const [filtre, setFiltre] = useState<string | null>(null);
  const [contact, setContact] = useState<Litige | null>(null);

  const cartes = useMemo(
    () =>
      LITIGES.filter((l) => {
        if (!filtre) return true;
        if (filtre === 'urgents') return l.urgent && !l.resolu;
        if (filtre === 'resolus') return !!l.resolu;
        return l.categorie === filtre;
      }),
    [filtre],
  );

  return (
    <ManagerLayout currentPath="/manager/litiges">
      <div className="space-y-6">
        {/* Bandeau médiation */}
        <div className="rounded-lg bg-[rgb(31,19,11)] p-lg text-white">
          <p className="flex items-center gap-2 text-label font-semibold text-primary-tint">
            <MIcon name="shield" className="text-[18px]" />
            TOKPa Manager — Centre de Médiation Actif
          </p>
          <p className="text-text-inverse-secondary">• Littoral Cotonou (Périmètre Akpakpa - Dantokpa Pont)</p>
        </div>

        {/* En-tête */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-h2 font-h2 font-bold">Gestion des Litiges & Réclamations</h1>
          <div className="flex gap-2">
            <button type="button" className="btn btn-ghost gap-2">
              <MIcon name="policy" className="text-[18px]" />
              Guide d’arbitrage
            </button>
            <button type="button" className="btn btn-ghost gap-2">
              <MIcon name="sync" className="text-[18px]" />
              Actualiser le flux
            </button>
          </div>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border border-border-default bg-white p-lg shadow-sm">
            <p className="flex items-center gap-2 text-label text-text-secondary">
              <MIcon name="priority_high" className="text-error text-[18px]" />
              Litiges Ouverts
            </p>
            <p className="mt-2 text-h1 font-h1 font-bold">6</p>
            <p className="mt-1 text-label font-semibold text-error">
              <MIcon name="arrow_downward" className="align-middle text-[16px]" /> -2 dossiers
            </p>
            <p className="mt-1 text-label text-text-secondary">En attente d’arbitrage · En cours de médiation</p>
          </div>
          <div className="rounded-lg border border-border-default bg-white p-lg shadow-sm">
            <p className="flex items-center gap-2 text-label text-text-secondary">
              <MIcon name="forum" className="text-tertiary text-[18px]" />
              En cours de médiation
            </p>
            <p className="mt-2 text-h1 font-h1 font-bold">2 salons actifs</p>
            <p className="mt-1 text-label text-text-secondary">Échanges contradictoires</p>
          </div>
          <div className="rounded-lg border border-border-default bg-white p-lg shadow-sm">
            <p className="flex items-center gap-2 text-label text-text-secondary">
              <MIcon name="task_alt" className="text-success text-[18px]" />
              Résolus cette semaine
            </p>
            <p className="mt-2 text-h1 font-h1 font-bold">28</p>
            <p className="mt-1 text-label font-semibold text-success">
              <MIcon name="trending_up" className="align-middle text-[16px]" /> 93.3% succès
            </p>
            <p className="mt-1 text-label text-text-secondary">Clôture moyenne : 38 min</p>
          </div>
          <div className="rounded-lg border border-border-default bg-white p-lg shadow-sm">
            <p className="flex items-center gap-2 text-label text-text-secondary">
              <MIcon name="lock_clock" className="text-[18px]" />
              Montant sous séquestre
            </p>
            <p className="mt-2 text-h1 font-h1 font-bold">
              148 500 <span className="text-label text-text-secondary">FCFA</span>
            </p>
            <p className="mt-1 flex items-center gap-1 text-label font-semibold">
              <MIcon name="verified_user" className="text-[16px] text-success" />
              Garantie FedaPay
            </p>
            <p className="mt-1 text-label text-text-secondary">Fonds bloqués temporairement</p>
          </div>
        </div>

        {/* Filtres */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <MIcon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary text-[18px]" />
            <input
              type="text"
              placeholder="Rechercher un litige…"
              className="rounded-lg border border-border-default py-2 pl-10 pr-3 text-label"
            />
          </div>
          <select className="rounded-lg border border-border-default bg-white px-3 py-2 text-label">
            <option>Trier par : Priorité / Urgence</option>
            <option>Date la plus récente</option>
            <option>Montant engagé</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          {ONGLETS.map((o) => (
            <button
              key={o.label}
              type="button"
              onClick={() => setFiltre(o.f)}
              className={`rounded-full border px-3 py-1.5 text-label font-semibold transition ${
                filtre === o.f
                  ? 'border-primary bg-primary text-white'
                  : 'border-border-default bg-white text-text-secondary hover:border-primary hover:text-primary'
              }`}
            >
              {o.label} ({o.n})
            </button>
          ))}
        </div>

        {/* Cartes litiges */}
        <div className="space-y-4">
          {cartes.map((l) => (
            <div key={l.id} className="rounded-lg border border-border-default bg-white p-lg shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-label font-bold">
                  {l.id} <span className="text-text-secondary">· Cde {l.cde}</span>
                </p>
                <div className="flex items-center gap-2 text-label">
                  {l.resolu ? (
                    <span className="rounded-full bg-success-container px-2.5 py-1 font-semibold">Résolu</span>
                  ) : l.urgent ? (
                    <span className="rounded-full bg-error-container px-2.5 py-1 font-semibold text-on-error-container">
                      Haute Priorité
                    </span>
                  ) : null}
                  <span className="flex items-center gap-1 text-text-secondary">
                    <MIcon name="schedule" className="text-[16px]" />
                    {l.temps}
                  </span>
                </div>
              </div>
              <p className="mt-2 flex items-center gap-2 text-label font-semibold">
                <MIcon name={l.icon} className="text-[18px] text-primary" />
                {l.motif}
              </p>
              {l.trajet && <p className="mt-1 text-label text-text-secondary">{l.trajet}</p>}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border-default pt-3 text-label">
                <p className="text-text-secondary">
                  Parties : <span className="font-semibold text-on-surface">{l.partieA}</span> vs{' '}
                  <span className="font-semibold text-on-surface">{l.partieB}</span>
                </p>
                <p className="text-text-secondary">
                  {l.montantLabel} :{' '}
                  <span className="font-bold text-on-surface">
                    {l.montant} FCFA
                  </span>
                </p>
                <div className="flex gap-2">
                  <button type="button" className="btn btn-ghost gap-2" onClick={() => setContact(l)}>
                    <MIcon name="call" className="text-[16px]" />
                    Contacter
                  </button>
                  <button type="button" className="btn btn-primary gap-2">
                    <MIcon name="forum" className="text-[16px]" />
                    {l.resolu ? 'Voir le dossier' : 'Ouvrir le salon'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modale contact des parties */}
      {contact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setContact(null)}>
          <div
            className="w-full max-w-[600px] max-h-[85vh] flex flex-col rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border-default p-4">
              <h3 className="text-h3 font-h3 font-bold">Contacter les parties — {contact.id}</h3>
              <button type="button" onClick={() => setContact(null)} className="p-1 text-text-secondary hover:text-on-surface">
                <MIcon name="close" className="text-[20px]" />
              </button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {[
                { nom: contact.partieA, tel: contact.telA },
                { nom: contact.partieB, tel: contact.telB },
                { nom: 'Support TOKPa (médiation)', tel: contact.telC },
              ].map((p) => (
                <div key={p.tel} className="flex items-center justify-between rounded-lg border border-border-default p-3">
                  <div>
                    <p className="text-label font-semibold">{p.nom}</p>
                    <p className="text-label text-text-secondary">{p.tel}</p>
                  </div>
                  <a href={`tel:${p.tel.replace(/\s/g, '')}`} className="btn btn-primary gap-2">
                    <MIcon name="call" className="text-[16px]" />
                    Appeler
                  </a>
                </div>
              ))}
            </div>
            <div className="flex justify-end border-t border-border-default p-4">
              <button type="button" className="btn btn-ghost" onClick={() => setContact(null)}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </ManagerLayout>
  );
}
