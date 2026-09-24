import { useMemo, useState } from 'react';
import ManagerLayout from '../../components/layout/manager/ManagerLayout';
import MIcon from '../../components/shared/MIcon';

type Livreur = {
  nom: string; init: string; zone: string; statut: 'En ligne' | 'En course' | 'Hors ligne';
  courses: number; note: string; succes: string; badge?: string;
};

const LIVREURS: Livreur[] = [
  { nom: 'Kofi B.', init: 'KB', zone: 'Marché', statut: 'En course', courses: 6, note: '4.8', succes: '96% succès' },
  { nom: 'Yao A.', init: 'YA', zone: 'Akpakpa', statut: 'En ligne', courses: 12, note: '5.0', succes: '100% succès' },
  { nom: 'Djidjo M.', init: 'DM', zone: 'Cadjehoun', statut: 'Hors ligne', courses: 0, note: '4.0', succes: '88% succès', badge: 'Nouveau Livreur' },
];

const STATUSES = ['Tous les statuts', 'En ligne', 'En course', 'Hors ligne'];
const ZONES = ['Toutes les zones', 'Akpakpa', 'Cadjehoun', 'Marché'];

const STATUT_CLASS: Record<string, string> = {
  'En ligne': 'bg-success-container text-on-surface',
  'En course': 'bg-tertiary-container/20 text-tertiary',
  'Hors ligne': 'bg-bg-secondary text-text-secondary',
};

export default function ManagerEquipePage() {
  const [statut, setStatut] = useState(STATUSES[0]);
  const [zone, setZone] = useState(ZONES[0]);
  const [ajout, setAjout] = useState(false);
  const [etape, setEtape] = useState(1);

  const livs = useMemo(
    () =>
      LIVREURS.filter(
        (l) =>
          (statut === STATUSES[0] || l.statut === statut) &&
          (zone === ZONES[0] || l.zone === zone),
      ),
    [statut, zone],
  );

  const ouvrirAjout = () => {
    setEtape(1);
    setAjout(true);
  };

  return (
    <ManagerLayout currentPath="/manager/equipe">
      <div className="space-y-6">
        {/* En-tête */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-h2 font-h2 font-bold">Mon équipe — Zone Akpakpa</h1>
            <div className="mt-2 flex flex-wrap gap-2 text-label">
              <span className="rounded-full bg-bg-secondary px-2.5 py-1 font-semibold">12 livreurs</span>
              <span className="rounded-full bg-success-container px-2.5 py-1 font-semibold">8 actifs</span>
              <span className="rounded-full bg-bg-secondary px-2.5 py-1 font-semibold">4 hors ligne</span>
            </div>
          </div>
          <button type="button" className="btn btn-primary gap-2" onClick={ouvrirAjout}>
            <MIcon name="person_add" className="text-[18px]" />
            Ajouter un livreur
          </button>
        </div>

        {/* Filtres */}
        <div className="flex flex-wrap gap-2">
          <select
            value={statut}
            onChange={(e) => setStatut(e.target.value)}
            className="rounded-lg border border-border-default bg-white px-3 py-2 text-label"
          >
            {STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select
            value={zone}
            onChange={(e) => setZone(e.target.value)}
            className="rounded-lg border border-border-default bg-white px-3 py-2 text-label"
          >
            {ZONES.map((z) => (
              <option key={z}>{z}</option>
            ))}
          </select>
        </div>

        {/* Cartes livreurs */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {livs.map((l) => (
            <div key={l.nom} className="rounded-lg border border-border-default bg-white p-lg shadow-sm">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-tint text-h3 font-bold text-primary">
                  {l.init}
                </span>
                <div className="flex-1">
                  <p className="text-h3 font-h3 font-bold">{l.nom}</p>
                  <p className="text-label text-text-secondary">Zone {l.zone}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-overline font-semibold ${STATUT_CLASS[l.statut]}`}>
                  {l.statut}
                </span>
              </div>
              {l.badge && (
                <p className="mt-3 rounded-lg bg-primary-tint px-3 py-1.5 text-label font-semibold text-primary">{l.badge}</p>
              )}
              <div className="mt-4 flex items-center justify-between text-label">
                <div>
                  <p className="text-text-secondary">Courses aujourd’hui</p>
                  <p className="font-semibold">{l.courses} courses</p>
                </div>
                <div className="text-right">
                  <p className="flex items-center gap-1 font-semibold">
                    <MIcon name="star" className="text-[16px] text-primary" />
                    {l.note}
                  </p>
                  <p className="text-text-secondary">{l.succes}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 border-t border-border-default pt-3">
                <button type="button" className="flex-1 rounded-lg bg-primary-tint px-3 py-2 text-label font-semibold text-primary">
                  Voir les courses
                </button>
                <button type="button" className="rounded-lg border border-border-default p-2 text-text-secondary hover:text-primary">
                  <MIcon name="edit" className="text-[18px]" />
                </button>
                <a
                  href="tel:+22997000000"
                  className="rounded-lg border border-border-default p-2 text-text-secondary hover:text-primary"
                >
                  <MIcon name="call" className="text-[18px]" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modale « Nouveau Livreur » (2 étapes) */}
      {ajout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setAjout(false)}>
          <div
            className="w-full max-w-[600px] max-h-[85vh] flex flex-col rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border-default p-4">
              <div>
                <h3 className="text-h3 font-h3 font-bold">Nouveau Livreur</h3>
                <p className="text-label text-text-secondary">Enregistrement et vérification de la flotte</p>
              </div>
              <button type="button" onClick={() => setAjout(false)} className="p-1 text-text-secondary hover:text-on-surface">
                <MIcon name="close" className="text-[20px]" />
              </button>
            </div>
            {/* Étapes */}
            <div className="flex gap-4 border-b border-border-default p-4 text-label">
              {[
                { n: 1, t: 'Informations générales', s: 'Profil & contact' },
                { n: 2, t: 'Documents & Véhicule', s: 'CIP, permis & plaque' },
              ].map((e) => (
                <div key={e.n} className={`flex flex-1 items-center gap-2 ${etape === e.n ? 'text-primary' : 'text-text-tertiary'}`}>
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full font-bold ${
                      etape >= e.n ? 'bg-primary text-white' : 'bg-bg-secondary'
                    }`}
                  >
                    {e.n}
                  </span>
                  <div>
                    <p className="font-semibold">{e.t}</p>
                    <p className="text-text-secondary">{e.s}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {etape === 1 ? (
                <>
                  <div className="space-y-1">
                    <label className="text-label text-text-secondary">Nom complet</label>
                    <input type="text" className="w-full rounded-lg border border-border-default px-3 py-2 text-label" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-label text-text-secondary">Téléphone (Bénin)</label>
                    <div className="flex items-center gap-2">
                      <span className="rounded-lg bg-bg-secondary px-3 py-2 text-label">+229</span>
                      <input type="text" className="flex-1 rounded-lg border border-border-default px-3 py-2 text-label" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-label text-text-secondary">Email (Optionnel)</label>
                    <input type="text" className="w-full rounded-lg border border-border-default px-3 py-2 text-label" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-label text-text-secondary">Zone assignée</label>
                    <select className="w-full rounded-lg border border-border-default bg-white px-3 py-2 text-label">
                      <option>Zone Akpakpa</option>
                      <option>Zone Cadjehoun</option>
                      <option>Zone Marché Dantokpa</option>
                    </select>
                  </div>
                </>
              ) : (
                <>
                  {['CIP (pièce d’identité professionnelle)', 'Permis de conduire', 'Plaque du véhicule', 'Carte grise / attestation'].map(
                    (f) => (
                      <div key={f} className="space-y-1">
                        <label className="text-label text-text-secondary">{f}</label>
                        <input type="text" className="w-full rounded-lg border border-border-default px-3 py-2 text-label" />
                      </div>
                    ),
                  )}
                </>
              )}
            </div>
            <div className="flex justify-between gap-2 border-t border-border-default p-4">
              <button type="button" className="btn btn-ghost" onClick={() => setAjout(false)}>
                Annuler
              </button>
              {etape === 1 ? (
                <button type="button" className="btn btn-primary" onClick={() => setEtape(2)}>
                  Étape suivante
                </button>
              ) : (
                <div className="flex gap-2">
                  <button type="button" className="btn btn-ghost" onClick={() => setEtape(1)}>
                    Retour
                  </button>
                  <button type="button" className="btn btn-primary" onClick={() => setAjout(false)}>
                    Enregistrer le livreur
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </ManagerLayout>
  );
}
