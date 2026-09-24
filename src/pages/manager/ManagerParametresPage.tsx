import { useState } from 'react';
import ManagerLayout from '../../components/layout/manager/ManagerLayout';
import MIcon from '../../components/shared/MIcon';

const ONGLETS = ['Zone & Tarification', 'Règles d’attribution', 'Alertes & Notifications', 'Compte & Sécurité'];

function Ligne({ label, aide, children }: { label: string; aide?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-default py-3 first:border-t-0">
      <div>
        <p className="text-label font-semibold">{label}</p>
        {aide && <p className="text-label text-text-secondary">{aide}</p>}
      </div>
      <div>{children}</div>
    </div>
  );
}

const inputCls = 'w-44 rounded-lg border border-border-default px-3 py-2 text-label';

export default function ManagerParametresPage() {
  const [onglet, setOnglet] = useState(ONGLETS[0]);
  const [enregistre, setEnregistre] = useState(false);

  const enregistrer = () => {
    setEnregistre(true);
    setTimeout(() => setEnregistre(false), 2500);
  };

  return (
    <ManagerLayout currentPath="/manager/parametres">
      <div className="space-y-6">
        {/* En-tête */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-h2 font-h2 font-bold">Paramètres de la Zone & Préférences</h1>
            <p className="text-label font-semibold text-success">Zone Ouverte & Opérationnelle</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-label font-bold text-white">
              SM
            </span>
            <p className="text-label font-semibold">Serge Migan</p>
          </div>
        </div>

        {/* Onglets */}
        <div className="flex flex-wrap gap-2 border-b border-border-default pb-2">
          {ONGLETS.map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => setOnglet(o)}
              className={`rounded-lg px-3 py-2 text-label font-semibold transition ${
                onglet === o ? 'bg-primary text-white' : 'text-text-secondary hover:bg-bg-secondary'
              }`}
            >
              {o}
            </button>
          ))}
        </div>

        {onglet === ONGLETS[0] && (
          <div className="space-y-6">
            {/* Périmètre */}
            <section className="rounded-lg border border-border-default bg-white p-lg shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-h3 font-h3 font-bold">Périmètre Opérationnel — Zone Akpakpa</h2>
                <span className="rounded-full bg-success-container px-2.5 py-1 text-overline font-semibold">Assignée</span>
              </div>
              <p className="text-label text-text-secondary">
                Définition de la couverture géographique et des marchés couverts
              </p>
              <div className="mt-4">
                <Ligne label="Nom officiel de la zone">
                  <input type="text" defaultValue="Zone Akpakpa" className={inputCls} />
                </Ligne>
                <Ligne label="Marché pivot d’approvisionnement">
                  <div className="space-y-1 text-label">
                    {['Grand Marché Dantokpa (Hall Central)', 'Marché de Sègbèya (Vivriers)', 'Marché Saint-Michel'].map((m) => (
                      <label key={m} className="flex items-center gap-2">
                        <input type="checkbox" defaultChecked className="accent-primary" />
                        {m}
                      </label>
                    ))}
                  </div>
                </Ligne>
                <Ligne label="Rayon de couverture maximal">
                  <select className={inputCls} defaultValue="12 km (Akpakpa)">
                    <option>3 km (local)</option>
                    <option>12 km (Akpakpa)</option>
                    <option>25 km (Grand Cotonou)</option>
                  </select>
                </Ligne>
                <Ligne label="Créneau d’activité quotidienne">
                  <div className="flex items-center gap-2">
                    <input type="time" defaultValue="07:00" className={inputCls} />
                    <span className="text-text-secondary">→</span>
                    <input type="time" defaultValue="21:00" className={inputCls} />
                  </div>
                </Ligne>
                <Ligne
                  label="Ouverture de la zone aux commandes clients"
                  aide="Permet l’enregistrement de commandes et l’assignation de courses aux livreurs"
                >
                  <input type="checkbox" defaultChecked className="h-5 w-5 accent-primary" />
                </Ligne>
              </div>
            </section>

            {/* Tarification */}
            <section className="rounded-lg border border-border-default bg-white p-lg shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-h3 font-h3 font-bold">Barème Tarifaire & Frais de Course</h2>
                <span className="rounded-full bg-primary-tint px-2.5 py-1 text-overline font-semibold text-primary">
                  Tarification Dynamique Active
                </span>
              </div>
              <div className="mt-4">
                <Ligne label="Forfait de base (0 à 3 km)">
                  <div className="flex items-center gap-2">
                    <input type="text" placeholder="0" className={inputCls} />
                    <span className="text-label text-text-secondary">FCFA</span>
                  </div>
                </Ligne>
                <Ligne label="Minimum facturé par course">
                  <div className="flex items-center gap-2">
                    <input type="text" placeholder="0" className={inputCls} />
                    <span className="text-label text-text-secondary">FCFA</span>
                  </div>
                </Ligne>
                <Ligne label="Prix au kilomètre au-delà de 3 km" aide="Par km supplémentaire">
                  <div className="flex items-center gap-2">
                    <input type="text" placeholder="0" className={inputCls} />
                    <span className="text-label text-text-secondary">FCFA</span>
                  </div>
                </Ligne>
                <Ligne label="Majoration heure de pointe (17h-20h)" aide="Heures d’affluence Akpakpa">
                  <input type="text" placeholder="%" className={inputCls} />
                </Ligne>
                <Ligne label="Part garantie reversée au livreur partenaire" aide="(20% plateforme)">
                  <div className="flex items-center gap-2">
                    <input type="text" defaultValue="80 %" className={inputCls} />
                  </div>
                </Ligne>
              </div>
            </section>
          </div>
        )}

        {onglet === ONGLETS[1] && (
          <section className="rounded-lg border border-border-default bg-white p-lg shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-h3 font-h3 font-bold">Attribution & Dispatch des Livreurs</h2>
              <span className="rounded-full bg-bg-secondary px-2.5 py-1 text-overline font-semibold">Algorithme V2.4</span>
            </div>
            <p className="text-label text-text-secondary">
              Algorithme de dispatch des livreurs connectés sur le secteur Akpakpa
            </p>
            <div className="mt-4">
              <Ligne label="Attribution automatique au plus proche (Recommandé)" aide="Actif">
                <input type="radio" name="dispatch" defaultChecked className="h-4 w-4 accent-primary" />
              </Ligne>
              <Ligne label="Diffusion ouverte (Premier arrivé, premier servi)" aide="Secondaire">
                <input type="radio" name="dispatch" className="h-4 w-4 accent-primary" />
              </Ligne>
              <Ligne label="Délai d’acceptation par livreur" aide="Temps accordé avant proposition au livreur suivant">
                <select className={inputCls} defaultValue="45 secondes (conseillé)">
                  <option>30 secondes</option>
                  <option>45 secondes (conseillé)</option>
                  <option>60 secondes</option>
                  <option>90 secondes</option>
                </select>
              </Ligne>
              <Ligne
                label="Délai maximum avant relance critique"
                aide="Déclenche un appel du superviseur ou bascule en diffusion d’urgence"
              >
                <select className={inputCls} defaultValue="5 minutes sans coursier trouvé">
                  <option>3 minutes</option>
                  <option>5 minutes sans coursier trouvé</option>
                  <option>8 minutes</option>
                </select>
              </Ligne>
              <div className="border-t border-border-default py-3">
                <p className="text-label font-semibold">Priorités et règles d’exclusion</p>
                <div className="mt-2 space-y-1 text-label">
                  {[
                    'Prioriser les livreurs notés ≥ 4.5 étoiles',
                    'Limiter à 2 courses simultanées par coursier moto',
                    'Exclure temporairement après 3 refus successifs (15 min)',
                    'Priorité aux courses prépayées Mobile Money (MTN/Moov)',
                  ].map((r) => (
                    <label key={r} className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked className="accent-primary" />
                      {r}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {onglet === ONGLETS[2] && (
          <section className="rounded-lg border border-border-default bg-white p-lg shadow-sm">
            <h2 className="text-h3 font-h3 font-bold">Configuration Détaillée des Alertes & Seuils</h2>
            <p className="text-label text-text-secondary">Alertes Manager & Seuils</p>
            <div className="mt-4">
              <Ligne label="Alerte livreurs insuffisants" aide="Si moins de 5 livreurs sont actifs">
                <input type="checkbox" defaultChecked className="h-5 w-5 accent-primary" />
              </Ligne>
              <Ligne label="Retard critique de course">
                <div className="flex items-center gap-2">
                  <input type="text" defaultValue="40 min" className={inputCls} />
                </div>
              </Ligne>
              <Ligne label="Litiges & réclamations clients" aide="Signalement immédiat par SMS / Push">
                <input type="checkbox" defaultChecked className="h-5 w-5 accent-primary" />
              </Ligne>
            </div>
          </section>
        )}

        {onglet === ONGLETS[3] && (
          <section className="rounded-lg border border-border-default bg-white p-lg shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-h3 font-h3 font-bold">Manager certifié TOKPa</h2>
              <span className="rounded-full bg-success-container px-2.5 py-1 text-overline font-semibold">Compte vérifié</span>
            </div>
            <div className="mt-4">
              <Ligne label="Email professionnel">
                <input type="text" placeholder="manager@tokpa.bj" className={inputCls} />
              </Ligne>
              <Ligne label="Téléphone direct (Bénin)">
                <div className="flex items-center gap-2">
                  <span className="rounded-lg bg-bg-secondary px-3 py-2 text-label">+229</span>
                  <input type="text" className={inputCls} />
                </div>
              </Ligne>
              <Ligne label="Mot de passe de session">
                <button type="button" className="btn btn-ghost">
                  Modifier le mot de passe
                </button>
              </Ligne>
            </div>
          </section>
        )}

        {/* Barre d’enregistrement */}
        <div className="flex items-center justify-end gap-3">
          {enregistre && (
            <p className="flex items-center gap-1 text-label font-semibold text-success">
              <MIcon name="task_alt" className="text-[16px]" />
              Modifications enregistrées avec succès
            </p>
          )}
          <button type="button" className="btn btn-primary" onClick={enregistrer}>
            Enregistrer les modifications
          </button>
        </div>
      </div>
    </ManagerLayout>
  );
}
