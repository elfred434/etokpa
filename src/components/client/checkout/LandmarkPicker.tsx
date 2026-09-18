import { useId } from 'react';
import SelectField from '../../ui/SelectField';
import { LANDMARKS, ZONES } from '../../../constants/mockData';

interface LandmarkPickerProps {
  zoneId: string;
  onZoneChange: (zoneId: string) => void;
  landmarkId: string;
  onLandmarkChange: (landmarkId: string) => void;
  description: string;
  onDescriptionChange: (description: string) => void;
  errors?: { landmark?: string; description?: string };
}

/**
 * Adresse de livraison TOKPa (CDC §4.2 / F-25) :
 * zone → point de repère + description courte du lieu exact.
 */
export default function LandmarkPicker({
  zoneId,
  onZoneChange,
  landmarkId,
  onLandmarkChange,
  description,
  onDescriptionChange,
  errors,
}: LandmarkPickerProps) {
  const descId = useId();
  const landmarks = LANDMARKS.filter((l) => l.zoneId === zoneId);

  return (
    <div className="space-y-5">
      <SelectField label="Zone de livraison" value={zoneId} onChange={(e) => onZoneChange(e.target.value)}>
        {ZONES.map((z) => (
          <option key={z.id} value={z.id}>
            {z.nom}
          </option>
        ))}
      </SelectField>

      <SelectField
        label="Point de repère"
        value={landmarkId}
        onChange={(e) => onLandmarkChange(e.target.value)}
        error={Boolean(errors?.landmark)}
      >
        <option value="">Choisir un point de repère</option>
        {landmarks.map((l) => (
          <option key={l.id} value={l.id}>
            {l.nom}
          </option>
        ))}
      </SelectField>
      {errors?.landmark && <p className="-mt-3 text-[13px] font-medium text-error-dark">{errors.landmark}</p>}

      <div>
        <label htmlFor={descId} className="label">
          Description courte du lieu exact
        </label>
        <textarea
          id={descId}
          rows={2}
          placeholder="Ex : maison bleue juste après le carrefour, portail vert…"
          className="input resize-none"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
        />
        {errors?.description && (
          <p className="mt-xs text-[13px] font-medium text-error-dark">{errors.description}</p>
        )}
      </div>
    </div>
  );
}
