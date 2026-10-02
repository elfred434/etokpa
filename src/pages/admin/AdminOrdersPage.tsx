import AdminLayout from '../../components/layout/admin/AdminLayout';
import PlatformOrdersPanel from '../../components/orders/PlatformOrdersPanel';
import { useLanguage } from '../../context/LanguageContext';
import { tx } from '../../i18n/tx';

/** Toutes les commandes de la plateforme — GET /admin/orders, sans filtre de zone par défaut. */
export default function AdminOrdersPage() {
  useLanguage();
  return (
    <AdminLayout currentPath="/admin/commandes">
      <PlatformOrdersPanel
        source="admin"
        title={tx("Toutes les commandes de la plateforme")}
      />
    </AdminLayout>
  );
}
