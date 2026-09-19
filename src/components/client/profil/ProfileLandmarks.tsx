import { useState } from 'react';
import toast from 'react-hot-toast';
import MIcon from '../../shared/MIcon';

export interface LandmarkItem {
  id: string;
  nom: string;
  description: string;
  zone: string;
  icon: string;
  isDefault?: boolean;
}

const INITIAL_LANDMARKS: LandmarkItem[] = [
  {
    id: 'l1',
    nom: 'Carrefour Cadjehoun',
    description: 'Face à la pharmacie Sainte-Marie, côté pair',
    zone: 'Zone Cadjehoun',
    icon: 'location_on',
    isDefault: true,
  },
  {
    id: 'l2',
    nom: 'Bureau TOKPa Hub',
    description: 'Immeuble en verre, 2ème étage, Bureau 204',
    zone: 'Zone Haie Vive',
    icon: 'work',
    isDefault: false,
  },
  {
    id: 'l3',
    nom: 'Maison Maman',
    description: "Près de l'église, portail bleu avec bougainvilliers",
    zone: 'Zone Akpakpa',
    icon: 'home',
    isDefault: false,
  },
];

/**
 * ProfileLandmarks — Gestion des points de repère enregistrés du client (affichage, ajout, suppression, par défaut).
 */
export default function ProfileLandmarks() {
  const [landmarks, setLandmarks] = useState<LandmarkItem[]>(INITIAL_LANDMARKS);
  const [addOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<LandmarkItem | null>(null);

  const [form, setForm] = useState({
    nom: '',
    description: '',
    zone: 'Zone Cadjehoun',
    icon: 'location_on',
    isDefault: false,
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editItem) {
      setLandmarks((list) =>
        list.map((item) =>
          item.id === editItem.id
            ? { ...item, ...form }
            : form.isDefault
              ? { ...item, isDefault: false }
              : item,
        ),
      );
      toast.success('Point de repère modifié');
    } else {
      const newItem: LandmarkItem = {
        id: `l_${Date.now()}`,
        ...form,
      };
      setLandmarks((list) => (form.isDefault ? list.map((l) => ({ ...l, isDefault: false })) : list).concat(newItem));
      toast.success('Nouveau point de repère ajouté');
    }
    setEditOpen(false);
    setEditItem(null);
  };

  const handleDelete = (id: string) => {
    setLandmarks((list) => list.filter((item) => item.id !== id));
    toast.success('Point de repère supprimé');
  };

  const openAdd = () => {
    setForm({ nom: '', description: '', zone: 'Zone Cadjehoun', icon: 'location_on', isDefault: false });
    setEditItem(null);
    setEditOpen(true);
  };

  const openEdit = (item: LandmarkItem) => {
    setForm({
      nom: item.nom,
      description: item.description,
      zone: item.zone,
      icon: item.icon,
      isDefault: Boolean(item.isDefault),
    });
    setEditItem(item);
    setEditOpen(true);
  };

  return (
    <section className="mb-md">
      <div className="mb-sm flex items-center justify-between">
        <h3 className="font-h3 text-h3 text-ink">Mes points de repère</h3>
        <button
          type="button"
          onClick={openAdd}
          className="scale-interaction flex items-center gap-1 font-label text-xs font-bold text-primary hover:underline sm:text-sm"
        >
          <MIcon name="add_location_alt" className="text-sm" />
          Ajouter un repère
        </button>
      </div>

      <div className="space-y-sm">
        {landmarks.map((l) => (
          <div
            key={l.id}
            className="group flex flex-col justify-between gap-3 rounded-[10px] border border-line bg-white p-md transition-colors hover:border-primary-light sm:flex-row sm:items-center"
          >
            <div className="flex items-start gap-md sm:items-center">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-lighter text-primary-dark">
                <MIcon name={l.icon} className="text-[20px]" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-body font-semibold text-ink">{l.nom}</span>
                  {l.isDefault && (
                    <span className="rounded-full bg-success-light px-2 py-0.5 text-[10px] font-bold uppercase tracking-tighter text-success-dark">
                      Par défaut
                    </span>
                  )}
                </div>
                <p className="text-xs text-ink-2 sm:text-secondary">{l.description}</p>
                <span className="mt-1 inline-block rounded-md bg-page px-2 py-0.5 text-micro text-ink-3">
                  {l.zone}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 self-end sm:self-auto">
              <button
                type="button"
                aria-label="Modifier le repère"
                onClick={() => openEdit(l)}
                className="scale-interaction rounded-lg p-2 text-primary hover:bg-primary-lighter"
              >
                <MIcon name="edit" className="text-sm" />
              </button>
              <button
                type="button"
                aria-label="Supprimer le repère"
                onClick={() => handleDelete(l.id)}
                className="scale-interaction rounded-lg p-2 text-error hover:bg-error-light"
              >
                <MIcon name="delete" className="text-sm" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Ajout/Édition de repère */}
      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-[480px] rounded-2xl bg-white p-lg shadow-xl">
            <div className="mb-md flex items-center justify-between border-b border-line pb-sm">
              <h3 className="font-h2 text-h2 text-ink">
                {editItem ? 'Modifier le repère' : 'Ajouter un point de repère'}
              </h3>
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="rounded-full p-2 text-ink-2 hover:bg-page"
              >
                <MIcon name="close" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="label">Nom du lieu</label>
                <input
                  type="text"
                  placeholder="Ex: Maison, Bureau, Carrefour Cadjehoun"
                  value={form.nom}
                  onChange={(e) => setForm({ ...form, nom: e.target.value })}
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="label">Description / Précisions</label>
                <textarea
                  rows={2}
                  placeholder="Ex: Portail bleu face à la pharmacie..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="label">Zone de livraison</label>
                <select
                  value={form.zone}
                  onChange={(e) => setForm({ ...form, zone: e.target.value })}
                  className="input"
                >
                  <option value="Zone Cadjehoun">Zone Cadjehoun</option>
                  <option value="Zone Haie Vive">Zone Haie Vive</option>
                  <option value="Zone Akpakpa">Zone Akpakpa</option>
                  <option value="Zone Ganhi">Zone Ganhi</option>
                  <option value="Zone Calavi">Zone Abomey-Calavi</option>
                </select>
              </div>

              <div>
                <label className="label">Icône</label>
                <select
                  value={form.icon}
                  onChange={(e) => setForm({ ...form, icon: e.target.value })}
                  className="input"
                >
                  <option value="location_on">📍 Repère général</option>
                  <option value="home">🏠 Domicile</option>
                  <option value="work">💼 Bureau</option>
                  <option value="storefront">🏪 Magasin</option>
                </select>
              </div>

              <label className="flex cursor-pointer items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  checked={form.isDefault}
                  onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                  className="h-4 w-4 rounded border-line accent-primary"
                />
                <span className="text-xs font-medium text-ink">Définir comme point de repère par défaut</span>
              </label>

              <div className="mt-lg flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="w-1/2 rounded-lg border border-line py-2.5 text-xs font-bold text-ink-2"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="w-1/2 rounded-lg bg-primary py-2.5 text-xs font-bold text-white shadow-sm"
                >
                  {editItem ? 'Mettre à jour' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
