import { IconMapPin, IconMap } from '@tabler/icons-react';
import { ZONES } from '../../../constants/mockData';
import { formatFCFA } from '../../../utils/format';

interface LandmarkPickerProps {
  landmark: string;
  onLandmarkChange: (value: string) => void;
  zoneId: string;
  onZoneChange: (zoneId: string) => void;
  deliveryFee: number;
  error?: boolean;
}

/**
 * « Lieu de livraison » de la maquette panier :
 * input point de repère (requis) + select zone + encart frais de livraison.
 */
export default function LandmarkPicker({
  landmark,
  onLandmarkChange,
  zoneId,
  onZoneChange,
  deliveryFee,
  error,
}: LandmarkPickerProps) {
  return (
    <div className="space-y-md">
      <div>
        <label htmlFor="landmark" className="label">
          Point de repère (requis)
        </label>
        <div className="relative">
          <IconMapPin
            size={20}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3"
          />
          <input
            id="landmark"
            type="text"
            value={landmark}
            onChange={(e) => onLandmarkChange(e.target.value)}
            placeholder="Face au carrefour Cadjehoun, en face de la pharmacie Sainte-Marie"
            className={`input py-3 pl-10 ${error ? 'border-error' : ''}`}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 items-end gap-md md:grid-cols-2">
        <div>
          <label htmlFor="zone" className="label">
            Zone de livraison
          </label>
          <div className="relative">
            <IconMap size={20} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
            <select
              id="zone"
              value={zoneId}
              onChange={(e) => onZoneChange(e.target.value)}
              className="input appearance-none py-3 pl-10"
            >
              {ZONES.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.nom}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-primary-light bg-primary-lighter p-lg">
          <span className="text-body font-medium text-primary-darker">Frais de livraison</span>
          <span className="price">{formatFCFA(deliveryFee)}</span>
        </div>
      </div>
    </div>
  );
}
