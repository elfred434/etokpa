// Liste globale des transactions et paiements de la plateforme.
import { useState } from 'react';
import AdminLayout from '../../components/layout/admin/AdminLayout';
import PaymentsPanel from '../../components/payments/PaymentsPanel';
import { useLanguage } from '../../context/LanguageContext';
import { tx } from '../../i18n/tx';

// Composant de la page AdminPayments : gère le chargement des données et le rendu.
export default function AdminPaymentsPage() {
  useLanguage();
  const [vue, setVue] = useState<'all' | 'own-admin'>('all');
  // Retourne le rendu JSX du composant.
  return (
    <AdminLayout currentPath="/admin/paiements">
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setVue('all')}
          className={`rounded-full border px-3 py-1.5 text-label font-semibold ${
            vue === 'all' ? 'border-primary bg-primary text-white' : 'border-border-default bg-bg-card text-text-secondary'
          }`}
        >
          {tx("Tous les paiements")}
        </button>
        <button
          type="button"
          onClick={() => setVue('own-admin')}
          className={`rounded-full border px-3 py-1.5 text-label font-semibold ${
            vue === 'own-admin' ? 'border-primary bg-primary text-white' : 'border-border-default bg-bg-card text-text-secondary'
          }`}
        >
          {tx("Mes paiements")}
        </button>
      </div>
      <PaymentsPanel source={vue} title={vue === 'all' ? tx("Tous les paiements") : tx("Mes paiements")} />
    </AdminLayout>
  );
}
