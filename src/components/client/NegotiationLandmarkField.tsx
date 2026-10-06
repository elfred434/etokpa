import { useEffect, useState } from 'react';
import { catalogApi, type ApiZone } from '../../services/api';
import { tx } from '../../i18n/tx';
import type { RememberedLandmark } from '../../utils/negotiationLandmark';

/** Zone + point de repère réel (GET /zones). Le client choisit, pas l'admin. */
export default function NegotiationLandmarkField({
  value,
  onChange,
}: {
  value: RememberedLandmark | null;
  onChange: (next: RememberedLandmark | null) => void;
}) {
  const [zones, setZones] = useState<ApiZone[]>([]);
  const [zoneId, setZoneId] = useState<number | ''>('');
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let alive = true;
    catalogApi
      .getZones()
      .then((res) => {
        const list: ApiZone[] = res?.data ?? (Array.isArray(res) ? res : []);
        if (alive) setZones(list);
      })
      .catch(() => {
        if (alive) setLoadError(tx('Impossible de charger les points de repère.'));
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!value || zones.length === 0) return;
    const found = zones.find((z) => (z.points_repere ?? []).some((p) => Number(p.id) === value.id));
    if (found) setZoneId(found.id);
  }, [value, zones]);

  const zone = zones.find((z) => z.id === zoneId) ?? null;
  const points = zone?.points_repere ?? [];

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-[#92400E]">
        {tx("Vous choisissez le point de livraison. L'administration ne le choisit pas.")}
      </p>
      <label className="block text-xs font-medium text-text-secondary" htmlFor="nego-zone">
        {tx('Zone de livraison')}
      </label>
      <select
        id="nego-zone"
        className="w-full rounded-lg border border-border-default bg-white px-3 py-2 text-sm"
        value={zoneId}
        onChange={(e) => {
          const next = Number(e.target.value);
          setZoneId(Number.isFinite(next) && next > 0 ? next : '');
          onChange(null);
        }}
      >
        <option value="">{tx('— Choisir une zone —')}</option>
        {zones.map((z) => (
          <option key={z.id} value={z.id}>
            {z.nom}
          </option>
        ))}
      </select>
      <label className="block text-xs font-medium text-text-secondary" htmlFor="nego-landmark">
        {tx('Point de repère')} <span className="text-error">*</span>
      </label>
      <select
        id="nego-landmark"
        className="w-full rounded-lg border border-border-default bg-white px-3 py-2 text-sm disabled:opacity-60"
        value={value && points.some((p) => Number(p.id) === value.id) ? value.id : ''}
        disabled={!zone || points.length === 0}
        onChange={(e) => {
          const id = Number(e.target.value);
          const point = points.find((p) => Number(p.id) === id);
          if (!point || !zone) {
            onChange(null);
            return;
          }
          onChange({ id: Number(point.id), nom: point.nom, zoneNom: zone.nom });
        }}
      >
        <option value="">
          {!zone
            ? tx('— Choisir une zone —')
            : points.length === 0
              ? tx('Aucun point de repère disponible')
              : tx('Sélectionner un point de repère…')}
        </option>
        {points.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nom}
          </option>
        ))}
      </select>
      {loadError && <p className="text-xs text-error">{loadError}</p>}
      <p className="text-[11px] leading-snug text-text-secondary">
        {tx("Ce choix reste sur cet appareil : l'API ne le garde pas encore sur la proposition.")}
      </p>
    </div>
  );
}
