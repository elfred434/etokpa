import MIcon from '../../shared/MIcon';

/**
 * ProfileStats — Cartes de statistiques utilisateur (Commandes, Repères, Négociations).
 */
export default function ProfileStats() {
  const stats = [
    {
      icon: 'shopping_bag',
      label: 'Commandes',
      value: '12',
      sub: 'effectuées',
      iconBg: 'bg-primary-lighter text-primary-dark',
    },
    {
      icon: 'location_on',
      label: 'Points de repère',
      value: '3',
      sub: 'enregistrés',
      iconBg: 'bg-success-light text-success-dark',
    },
    {
      icon: 'handshake',
      label: 'Négociations',
      value: '14 500 F',
      sub: 'économies réalisées',
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
