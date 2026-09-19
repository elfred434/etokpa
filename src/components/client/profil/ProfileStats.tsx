import MIcon from '../../shared/MIcon';
import { useLanguage } from '../../../context/LanguageContext';

/**
 * ProfileStats — Cartes de statistiques utilisateur (Commandes, Repères, Négociations).
 */
export default function ProfileStats() {
  const { t, isFr } = useLanguage();

  const stats = [
    {
      icon: 'shopping_bag',
      label: t('profile.ordersCount'),
      value: '12',
      sub: isFr ? 'effectuées' : 'completed',
      iconBg: 'bg-primary-lighter text-primary-dark',
    },
    {
      icon: 'location_on',
      label: t('profile.landmarksCount'),
      value: '3',
      sub: isFr ? 'enregistrés' : 'saved',
      iconBg: 'bg-success-light text-success-dark',
    },
    {
      icon: 'handshake',
      label: t('profile.negotiations'),
      value: '14 500 F',
      sub: isFr ? 'économies réalisées' : 'savings made',
      iconBg: 'bg-amber-light text-amber-text',
    },
  ];

  return (
    <div className="mb-md grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-md">
      {stats.map((s) => (
        <div key={s.label} className="flex items-center gap-md rounded-[14px] border border-line bg-white p-4 shadow-sm">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${s.iconBg}`}>
            <MIcon name={s.icon} className="text-[24px]" />
          </div>
          <div>
            <p className="text-micro uppercase tracking-wider text-ink-3">{s.label}</p>
            <p className="text-lg font-bold text-ink sm:text-xl">{s.value}</p>
            <span className="text-[11px] text-ink-2">{s.sub}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
