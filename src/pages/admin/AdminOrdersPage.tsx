import { useState } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import toast from 'react-hot-toast';
import AdminLayout from '../../components/layout/admin/AdminLayout';
import PlatformOrdersPanel, { type PlatformOrder } from '../../components/orders/PlatformOrdersPanel';
import { SkeletonBlock } from '../../components/shared/Skeleton';
import { adminApi, type AdminOrderStatus } from '../../services/api';
import { listOf } from '../../services/api/unwrap';
import { adminDialogs } from '../../components/shared/AdminActionDialogs';
import {
  DIALOG_CANCEL_BTN_CLASS,
  DIALOG_PRIMARY_BTN_CLASS,
  DialogFrame,
} from '../../components/shared/DialogFrame';
import { extractApiError, formatApiError } from '../../utils/apiError';
import { filterLivreursDisponiblesDansZone, isLivreurDisponible } from '../../utils/managerAssignment';
import { useLanguage } from '../../context/LanguageContext';
import { tr, tx } from '../../i18n/tx';

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Toutes les commandes de la plateforme — GET /admin/orders, sans filtre de zone par défaut. */
const ACTIONS_PAR_STATUT: Record<string, Array<{ statut: AdminOrderStatus; label: string }>> = {
  en_attente: [
    { statut: 'en_preparation', label: 'Démarrer la préparation' },
    { statut: 'annule', label: 'Annuler la commande' },
  ],
  en_preparation: [
    { statut: 'en_livraison', label: 'Passer en livraison' },
    { statut: 'annule', label: 'Annuler la commande' },
  ],
  en_livraison: [{ statut: 'livre', label: 'Marquer comme livrée' }],
};

export default function AdminOrdersPage() {
  useLanguage();
  const navigate = useNavigate();
  const { q } = useSearch({ from: '/admin/commandes' });
  const [reloadKey, setReloadKey] = useState(0);
  const [busyOrderId, setBusyOrderId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [assignation, setAssignation] = useState<PlatformOrder | null>(null);
  const [livreurs, setLivreurs] = useState<any[]>([]);
  const [livreursLoading, setLivreursLoading] = useState(false);
  const [livreurChoisi, setLivreurChoisi] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [assignErr, setAssignErr] = useState<string | null>(null);

  const openAssignModal = async (order: PlatformOrder) => {
    setAssignation(order);
    setLivreurChoisi('');
    setAssignErr(null);
    setLivreursLoading(true);
    try {
      const acc: any[] = [];
      for (let page = 1; page <= 20; page++) {
        const res = await adminApi.getUsers({ role: 'livreur', page });
        acc.push(...listOf(res));
        if (page >= Number(res?.meta?.last_page ?? 1)) break;
      }
      setLivreurs(acc);
      const zoneId = order.landmark?.zone_id;
      const eligibles = zoneId
        ? filterLivreursDisponiblesDansZone(acc, zoneId)
        : acc.filter((l) => isLivreurDisponible(l));
      const actifs = eligibles.filter((l) => String(l?.statut ?? 'actif').toLowerCase() === 'actif');
      if (actifs.length === 1) setLivreurChoisi(String(actifs[0].id));
    } catch (cause) {
      setAssignErr(formatApiError(extractApiError(cause)));
    } finally {
      setLivreursLoading(false);
    }
  };

  const confirmerAssignation = async () => {
    if (!assignation || assigning) return;
    if (!livreurChoisi) {
      setAssignErr(tr('Veuillez sélectionner un livreur disponible.', 'Please select an available rider.'));
      return;
    }
    setAssignErr(null);
    setAssigning(true);
    try {
      await adminApi.assignLivreur(assignation.id, Number(livreurChoisi));
      toast.success(tr(`Commande #${assignation.id} assignée avec succès.`, `Order #${assignation.id} assigned successfully.`));
      setAssignation(null);
      setLivreurChoisi('');
      setReloadKey((key) => key + 1);
    } catch (cause) {
      const msg = formatApiError(extractApiError(cause));
      setAssignErr(msg);
      toast.error(msg);
    } finally {
      setAssigning(false);
    }
  };

  const changerStatut = async (order: PlatformOrder, statut: AdminOrderStatus, label: string) => {
    if (busyOrderId != null) return;
    if (statut === 'annule') {
      const confirme = await adminDialogs.confirm(
        tr(`Annuler définitivement la commande #${order.id} ?`, `Cancel order #${order.id}?`),
        { title: tx('Confirmer l’annulation'), confirmLabel: tx('Annuler la commande'), danger: true },
      );
      if (!confirme) return;
    }

    setError(null);
    setBusyOrderId(order.id);
    try {
      await adminApi.updateOrderStatus(order.id, statut);
      toast.success(tr(`Commande #${order.id} : ${label.toLowerCase()}.`, `Order #${order.id} updated.`));
      setReloadKey((key) => key + 1);
    } catch (cause) {
      const message = formatApiError(extractApiError(cause));
      setError(message);
      toast.error(message);
    } finally {
      setBusyOrderId(null);
    }
  };

  const renderActions = (order: PlatformOrder) => {
    const actions = ACTIONS_PAR_STATUT[order.statut ?? ''] ?? [];
    const canAssign = !order.livreur?.id && !['livre', 'annule'].includes(order.statut ?? '');
    if (actions.length === 0 && !canAssign) return <span className="text-text-tertiary">—</span>;
    return (
      <>
        {canAssign && (
          <button
            type="button"
            className="btn btn-primary px-3 py-1.5 text-label"
            disabled={busyOrderId != null}
            aria-label={`Assigner #${order.id}`}
            onClick={() => void openAssignModal(order)}
          >
            {tx('Assigner')}
          </button>
        )}
        {actions.map((action) => (
          <button
            key={action.statut}
            type="button"
            className={action.statut === 'annule' ? 'btn btn-ghost px-3 py-1.5 text-label text-error' : 'btn btn-primary px-3 py-1.5 text-label'}
            disabled={busyOrderId != null}
            aria-label={`${action.label} #${order.id}`}
            onClick={() => void changerStatut(order, action.statut, action.label)}
          >
            {busyOrderId === order.id ? tx('Mise à jour…') : tx(action.label)}
          </button>
        ))}
      </>
    );
  };

  const zoneCommande = assignation?.landmark?.zone_id ?? null;
  const livreursDisponibles = (
    zoneCommande ? filterLivreursDisponiblesDansZone(livreurs, zoneCommande) : livreurs.filter((l) => isLivreurDisponible(l))
  ).filter((l) => String(l?.statut ?? 'actif').toLowerCase() === 'actif');

  return (
    <AdminLayout currentPath="/admin/commandes">
      {error && (
        <div className="mb-4 rounded-lg border border-error bg-error-container p-4 text-label text-on-error-container" role="alert">
          <p className="font-bold">{tx('Erreur API')}</p>
          <p>{error}</p>
        </div>
      )}
      <PlatformOrdersPanel
        source="admin"
        title={tx('Toutes les commandes de la plateforme')}
        initialSearch={q ?? ''}
        reloadKey={reloadKey}
        renderActions={renderActions}
        onSearchCommit={(query) => {
          void navigate({ to: '/admin/commandes', search: query ? { q: query } : {} });
        }}
      />
      {assignation && (
        <DialogFrame
          icon="two_wheeler"
          title={`Assigner un livreur — #${assignation.id}`}
          subtitle={assignation.landmark?.nom ? `${tx('Repère :')} ${assignation.landmark.nom}` : undefined}
          maxWidth="37.5rem"
          disabled={assigning}
          onClose={() => setAssignation(null)}
          footer={
            <>
              <button type="button" className={DIALOG_CANCEL_BTN_CLASS} disabled={assigning} onClick={() => setAssignation(null)}>
                {tx('Annuler')}
              </button>
              <button
                type="button"
                className={DIALOG_PRIMARY_BTN_CLASS}
                disabled={assigning || livreursLoading || livreursDisponibles.length === 0}
                onClick={() => void confirmerAssignation()}
              >
                {assigning ? tx('Assignation…') : tx('Assigner')}
              </button>
            </>
          }
        >
          <div className="space-y-3 text-label">
            {assignErr && (
              <div className="rounded-lg border border-error bg-error-container p-3 text-xs font-semibold text-on-error-container" role="alert">
                {assignErr}
              </div>
            )}
            {livreursLoading ? (
              <div className="space-y-2" role="status" aria-label={tx('Chargement des livreurs…')}>
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl border border-border-default p-3">
                    <SkeletonBlock className="h-4 w-4 rounded-full shrink-0" />
                    <SkeletonBlock className="h-4 w-40" />
                    <SkeletonBlock className="h-3.5 w-24 ml-auto" />
                  </div>
                ))}
              </div>
            ) : livreursDisponibles.length === 0 ? (
              <p className="text-text-secondary">{tx('Aucun livreur disponible dans la zone.')}</p>
            ) : (
              livreursDisponibles.map((l: any) => (
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
                    name="admin-order-livreur"
                    value={String(l.id)}
                    checked={String(l.id) === livreurChoisi}
                    onChange={() => {
                      setLivreurChoisi(String(l.id));
                      setAssignErr(null);
                    }}
                    className="accent-primary"
                  />
                  <span className="min-w-0 flex-1 break-words font-semibold">
                    {l.nom_complet ?? `${l.prenom ?? ''} ${l.nom ?? ''}`}
                  </span>
                  <span className="text-text-secondary">{l.telephone ?? ''}</span>
                </label>
              ))
            )}
          </div>
        </DialogFrame>
      )}
    </AdminLayout>
  );
}
