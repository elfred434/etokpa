import { useState } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import toast from 'react-hot-toast';
import AdminLayout from '../../components/layout/admin/AdminLayout';
import PlatformOrdersPanel, { type PlatformOrder } from '../../components/orders/PlatformOrdersPanel';
import { adminApi, type AdminOrderStatus } from '../../services/api';
import { adminDialogs } from '../../components/shared/AdminActionDialogs';
import { extractApiError, formatApiError } from '../../utils/apiError';
import { useLanguage } from '../../context/LanguageContext';
import { tr, tx } from '../../i18n/tx';

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
    if (actions.length === 0) return <span className="text-text-tertiary">—</span>;
    return actions.map((action) => (
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
    ));
  };

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
    </AdminLayout>
  );
}
