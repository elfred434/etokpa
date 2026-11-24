// Gestion des commandes de la zone du manager et assignation aux livreurs disponibles.
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import ManagerLayout from '../../components/layout/manager/ManagerLayout';
import PlatformOrdersPanel, { type PlatformOrder } from '../../components/orders/PlatformOrdersPanel';
import {
  DIALOG_CANCEL_BTN_CLASS,
  DIALOG_PRIMARY_BTN_CLASS,
  DialogFrame,
} from '../../components/shared/DialogFrame';
import { managerApi } from '../../services/api';
import { listOf } from '../../services/api/unwrap';
import { extractApiError, formatApiError } from '../../utils/apiError';
import { useLanguage } from '../../context/LanguageContext';
import { tr, tx } from '../../i18n/tx';
import { useGlobalRefreshTick } from '../../hooks/useRefresh';
import { filterLivreursDisponiblesDansZone } from '../../utils/managerAssignment';

/* eslint-disable @typescript-eslint/no-explicit-any */

// Helper zoneIdOf : réalise le traitement métier associé.
function zoneIdOf(raw: unknown): number | null {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// Helper livreurZoneId : réalise le traitement métier associé.
function livreurZoneId(l: any): number | null {
  return zoneIdOf(l?.profil?.zone_id ?? l?.profil?.zone?.id ?? l?.zone_id ?? l?.zone?.id);
}

// Composant de la page ManagerOrders : gère le chargement des données et le rendu.
export default function ManagerOrdersPage() {
  useLanguage();
  const [reloadKey, setReloadKey] = useState(0);
  const [livreurs, setLivreurs] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [assignation, setAssignation] = useState<PlatformOrder | null>(null);
  const [livreurChoisi, setLivreurChoisi] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [modalErr, setModalErr] = useState<string | null>(null);
  const refreshTick = useGlobalRefreshTick();

  // Charge ou synchronise les données depuis l’API au montage ou lors d’un changement de dépendance.
  useEffect(() => {
    let alive = true;
    managerApi.getLivreurs()
      .then((r) => alive && setLivreurs(listOf(r)))
      .catch(() => undefined);
    return () => { alive = false; };
  }, [refreshTick]);

  const zoneCommande = assignation ? zoneIdOf(assignation.landmark?.zone_id) : null;
  const livreursZone = filterLivreursDisponiblesDansZone(livreurs, zoneCommande);
  const nomZone = livreurs.find((l) => livreurZoneId(l) === zoneCommande)?.profil?.zone?.nom as string | undefined;

  // Helper openAssignation : réalise le traitement métier associé.
  const openAssignation = (o: PlatformOrder) => {
    const z = zoneIdOf(o.landmark?.zone_id);
    const list = filterLivreursDisponiblesDansZone(livreurs, z);
    setAssignation(o);
    setModalErr(null);
    setLivreurChoisi(list.length === 1 ? String(list[0].id) : '');
  };

  // Valide et transmet l’action confirmerAssignation.
  const confirmerAssignation = async () => {
    if (!assignation || assigning) return;
    if (!livreurChoisi) {
      setModalErr(tr('Veuillez sélectionner un livreur disponible.', 'Please select an available rider.'));
      return;
    }
    setErr(null);
    setModalErr(null);
    setAssigning(true);
    try {
      await managerApi.assignLivreur(assignation.id, Number(livreurChoisi));
      toast.success(tr(
        `Commande #${assignation.id} assignée avec succès.`,
        `Order #${assignation.id} assigned successfully.`,
      ));
      setAssignation(null);
      setLivreurChoisi('');
      setReloadKey((k) => k + 1);
    } catch (e) {
      const msg = formatApiError(extractApiError(e));
      setErr(msg);
      setModalErr(msg);
      toast.error(msg);
    } finally {
      setAssigning(false);
    }
  };

  // Retourne le rendu JSX du composant.
  return (
    <ManagerLayout currentPath="/manager/commandes">
      <div className="space-y-6">
        {err && (
          <div className="rounded-lg border border-error bg-error-container p-4 text-label text-on-error-container" role="alert">
            <p className="font-bold">{tx("Erreur API")}</p>
            <p>{err}</p>
          </div>
        )}
        <PlatformOrdersPanel
          source="zone"
          reloadKey={reloadKey}
          title={tx("Commandes de votre zone")}
          renderActions={(o) => !o.livreur?.id && !['annule', 'livre'].includes(String(o.statut ?? '')) && (
            <button
              type="button"
              className="btn btn-primary px-3 py-1.5 text-label"
              onClick={() => openAssignation(o)}
            >
              {tx("Assigner")}
            </button>
          )}
        />
      </div>

      {assignation && (
        <DialogFrame
          icon="two_wheeler"
          title={`Assigner un livreur — #${assignation.id}`}
          subtitle={nomZone ? `${tx("Zone :")} ${nomZone}` : undefined}
          maxWidth="37.5rem"
          disabled={assigning}
          onClose={() => setAssignation(null)}
          footer={
            <>
              <button type="button" className={DIALOG_CANCEL_BTN_CLASS} disabled={assigning} onClick={() => setAssignation(null)}>
                {tx("Annuler")}
              </button>
              <button
                type="button"
                className={DIALOG_PRIMARY_BTN_CLASS}
                onClick={confirmerAssignation}
                disabled={assigning || livreursZone.length === 0}
              >
                {assigning ? tx("Assignation…") : tx("Assigner")}
              </button>
            </>
          }
        >
          <div className="space-y-3 text-label">
            {modalErr && (
              <div className="rounded-lg border border-error bg-error-container p-3 text-xs font-semibold text-on-error-container" role="alert">
                {modalErr}
              </div>
            )}
            {livreursZone.length === 0 && (
              <p className="text-text-secondary">{tx("Aucun livreur disponible dans la zone.")}</p>
            )}
            {livreursZone.map((l: any) => (
              <label
                key={l.id}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors ${
                  String(l.id) === livreurChoisi
                    ? 'border-primary bg-primary-tint/50'
                    : 'border-border-default hover:bg-bg-secondary'
                }`}
              >
                <input
                  type="radio"
                  name="livreur"
                  value={String(l.id)}
                  checked={String(l.id) === livreurChoisi}
                  onChange={() => {
                    setLivreurChoisi(String(l.id));
                    setModalErr(null);
                  }}
                  className="accent-primary"
                />
                <span className="min-w-0 flex-1 break-words font-semibold">
                  {l.nom_complet ?? `${l.prenom ?? ''} ${l.nom ?? ''}`}
                </span>
                <span className="text-text-secondary">{l.telephone ?? ''}</span>
              </label>
            ))}
          </div>
        </DialogFrame>
      )}
    </ManagerLayout>
  );
}
