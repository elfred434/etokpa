import { useState } from 'react';
import AdminLayout from '../../components/layout/admin/AdminLayout';
import PaymentsPanel from '../../components/payments/PaymentsPanel';
import { useLanguage } from '../../context/LanguageContext';
import { tx } from '../../i18n/tx';

/** Tous les paiements, et ceux du compte admin connecté. */
export default function AdminPaymentsPage() {
  useLanguage();
  const [vue, setVue] = useState<'all' | 'own-admin'>('all');
  return (
    <AdminLayout currentPath="/admin/paiements">
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setVue('all')}
          className={`rounded-full border px-3 py-1.5 text-label font-semibold ${
            vue === 'all' ? 'border-primary bg-primary text-white' : 'border-border-default bg-white text-text-secondary'
          }`}
        >
          {tx("Tous les paiements")}
        </button>
        <button
          type="button"
          onClick={() => setVue('own-admin')}
          className={`rounded-full border px-3 py-1.5 text-label font-semibold ${
            vue === 'own-admin' ? 'border-primary bg-primary text-white' : 'border-border-default bg-white text-text-secondary'
          }`}
        >
          {tx("Mes paiements")}
        </button>
      </div>
      <PaymentsPanel source={vue} title={vue === 'all' ? tx("Tous les paiements") : tx("Mes paiements")} />
    </AdminLayout>
  );
}
