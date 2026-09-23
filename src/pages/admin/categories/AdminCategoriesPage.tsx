import { useState } from 'react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import AdminSidebar from '../../../components/layout/admin/AdminSidebar';
import MIcon from '../../../components/shared/MIcon';

interface CategoryItem {
  id: string;
  nom: string;
  sousTitre?: string;
  description: string;
  nbProduits: number;
  icone: string;
  active: boolean;
  couleur?: string;
}

const INITIAL_CATEGORIES: CategoryItem[] = [
  {
    id: 'cat_1',
    nom: 'Légumes',
    sousTitre: 'Frais & Locaux',
    description: 'Tous types de légumes frais du marché : tomates, oignons, piments, légumes feuilles et racines.',
    nbProduits: 128,
    icone: 'nutrition',
    active: true,
    couleur: '#9d4300',
  },
  {
    id: 'cat_2',
    nom: 'Poissonnerie & Viandes',
    sousTitre: 'Frais du jour',
    description: 'Poissons d’eau douce et de mer, crevettes, crabes, poulet bicyclette et viande de bœuf.',
    nbProduits: 84,
    icone: 'set_meal',
    active: true,
    couleur: '#10B981',
  },
  {
    id: 'cat_3',
    nom: 'Épicerie & Huiles',
    sousTitre: 'Produits de base',
    description: 'Huiles végétales, concentré de tomate, condiments, sucre et produits emballés.',
    nbProduits: 62,
    icone: 'local_drink',
    active: true,
    couleur: '#F59E0B',
  },
  {
    id: 'cat_4',
    nom: 'Boissons',
    sousTitre: 'Temporaire',
    description: 'Sodas, jus locaux (ananas, bissap) et eaux minérales.',
    nbProduits: 45,
    icone: 'liquor',
    active: false,
    couleur: '#3B82F6',
  },
];

const AVAILABLE_ICONS = [
  'nutrition',
  'set_meal',
  'liquor',
  'restaurant',
  'bakery_dining',
  'local_drink',
  'egg',
  'icecream',
];

/**
 * AdminCategoriesPage — Reproduction 100% fidèle de `gestion_des_cat_gories_admin_tokpa/code.html`
 */
export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<CategoryItem[]>(INITIAL_CATEGORIES);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryItem | null>(INITIAL_CATEGORIES[0]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Form State
  const [formData, setFormData] = useState<Partial<CategoryItem>>({
    nom: '',
    description: '',
    icone: 'nutrition',
    active: true,
  });

  const handleSelectCategory = (cat: CategoryItem) => {
    setSelectedCategory(cat);
    setFormData({ ...cat });
    setIsSidebarOpen(true);
  };

  const handleCreateNew = () => {
    setSelectedCategory(null);
    setFormData({
      nom: '',
      description: '',
      icone: 'nutrition',
      active: true,
      nbProduits: 0,
    });
    setIsSidebarOpen(true);
  };

  const handleDeleteCategory = (id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
    if (selectedCategory?.id === id) {
      setSelectedCategory(null);
    }
    toast.success('Catégorie supprimée');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nom) {
      toast.error('Le nom de la catégorie est obligatoire');
      return;
    }

    if (selectedCategory) {
      // Edit
      setCategories((prev) =>
        prev.map((c) => (c.id === selectedCategory.id ? ({ ...c, ...formData } as CategoryItem) : c)),
      );
      toast.success('Catégorie mise à jour avec succès !');
    } else {
      // Create
      const newCat: CategoryItem = {
        id: `cat_${Date.now()}`,
        nom: formData.nom || 'Nouvelle Catégorie',
        sousTitre: 'Marché',
        description: formData.description || '',
        nbProduits: 0,
        icone: formData.icone || 'nutrition',
        active: formData.active ?? true,
      };
      setCategories((prev) => [newCat, ...prev]);
      toast.success('Nouvelle catégorie créée !');
    }
  };

  const filteredCategories = categories.filter((c) =>
    c.nom.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="bg-bg-app text-on-surface flex min-h-screen font-body overflow-hidden">
      {/* Sidebar Admin */}
      <AdminSidebar currentPath="/admin/categories" />

      {/* Main Content */}
      <main className="ml-64 flex-1 flex min-h-screen relative overflow-hidden">
        <div className="flex-1 flex flex-col overflow-y-auto">
          {/* TopAppBar */}
          <header className="h-16 flex justify-between items-center px-lg bg-white sticky top-0 z-40 border-b border-border-default">
            <div className="flex items-center gap-4">
              <span className="font-h2 text-h2 font-bold text-primary">Gestion des Catégories (F-07)</span>
            </div>

            <div className="flex items-center gap-6">
              <div className="relative hidden lg:block w-72">
                <MIcon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Chercher une catégorie..."
                  className="w-full pl-10 pr-4 py-2 bg-bg-app border-none rounded-full text-body focus:ring-2 focus:ring-primary-light outline-none"
                />
              </div>

              <button
                type="button"
                onClick={handleCreateNew}
                className="px-md py-2 bg-primary-container text-white font-bold rounded-button hover:bg-primary-hover transition-all active:scale-95 flex items-center gap-2 shadow-md cursor-pointer"
              >
                <MIcon name="add" />
                <span>Nouvelle Catégorie</span>
              </button>
            </div>
          </header>

          {/* Categories Table Section */}
          <section className="p-lg flex-1">
            <div className="bg-bg-card rounded-card border border-border-default shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-bg-secondary border-b border-border-default text-text-secondary font-label text-label">
                    <th className="px-lg py-3">Catégorie</th>
                    <th className="px-lg py-3">Description</th>
                    <th className="px-lg py-3 text-center">Produits</th>
                    <th className="px-lg py-3">Statut</th>
                    <th className="px-lg py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y border-border-default">
                  {filteredCategories.map((cat) => (
                    <tr
                      key={cat.id}
                      className={clsx(
                        'hover:bg-primary-tint/30 transition-colors group cursor-pointer',
                        !cat.active && 'opacity-75',
                        selectedCategory?.id === cat.id && 'bg-primary-tint/50 font-medium',
                      )}
                      onClick={() => handleSelectCategory(cat)}
                    >
                      <td className="px-lg py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-surface-container-high flex items-center justify-center text-primary shrink-0">
                            <MIcon name={cat.icone} className="text-[24px]" />
                          </div>
                          <div>
                            <p className="font-h3 text-h3 text-on-surface font-bold">{cat.nom}</p>
                            <p className="text-micro text-text-tertiary font-bold">{cat.sousTitre || 'Catalogue'}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-lg py-4">
                        <p className="text-secondary text-text-secondary max-w-xs line-clamp-2">{cat.description}</p>
                      </td>

                      <td className="px-lg py-4 text-center font-price text-on-surface">{cat.nbProduits}</td>

                      <td className="px-lg py-4">
                        {cat.active ? (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-success-light text-success-dark font-label text-micro">
                            <span className="w-1.5 h-1.5 rounded-full bg-success inline-block" />
                            Active
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container text-text-tertiary font-label text-micro border border-border-default">
                            <span className="w-1.5 h-1.5 rounded-full bg-text-tertiary inline-block" />
                            Inactive
                          </div>
                        )}
                      </td>

                      <td className="px-lg py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectCategory(cat);
                            }}
                            className="p-2 text-text-secondary hover:text-primary hover:bg-primary-tint rounded-lg transition-all cursor-pointer"
                          >
                            <MIcon name="edit" className="text-[20px]" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCategory(cat.id);
                            }}
                            className="p-2 text-text-secondary hover:text-error hover:bg-error-light rounded-lg transition-all cursor-pointer"
                          >
                            <MIcon name="delete" className="text-[20px]" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Table Footer */}
              <div className="px-lg py-4 bg-bg-secondary flex justify-between items-center border-t border-border-default">
                <p className="text-secondary text-text-secondary">
                  Affichage de 1-{filteredCategories.length} sur {categories.length} catégories
                </p>
                <div className="flex gap-2">
                  <button type="button" className="w-8 h-8 flex items-center justify-center rounded bg-primary-container text-white font-bold text-micro">
                    1
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Quick Edit Sidebar Panel */}
        {isSidebarOpen && (
          <aside className="w-96 bg-white/95 backdrop-blur-md border-l border-border-default overflow-y-auto p-lg flex flex-col z-40 shrink-0">
            <div className="flex items-center justify-between mb-lg">
              <h3 className="font-h2 text-h2 text-on-surface font-bold">
                {selectedCategory ? 'Éditer Catégorie' : 'Nouvelle Catégorie'}
              </h3>
              <button
                type="button"
                onClick={() => setIsSidebarOpen(false)}
                className="p-2 text-text-tertiary hover:text-on-surface transition-colors cursor-pointer"
              >
                <MIcon name="close" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-md flex-1">
              <div className="space-y-xs">
                <label className="font-label text-label text-text-secondary block">Nom de la catégorie</label>
                <input
                  type="text"
                  value={formData.nom || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, nom: e.target.value }))}
                  required
                  className="w-full px-4 py-2.5 bg-white border border-border-default rounded-[10px] focus:border-primary-container outline-none"
                />
              </div>

              <div className="space-y-xs">
                <label className="font-label text-label text-text-secondary block">Description</label>
                <textarea
                  rows={4}
                  value={formData.description || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-white border border-border-default rounded-[10px] focus:border-primary-container outline-none resize-none"
                />
              </div>

              {/* Icon Selector Grid */}
              <div className="space-y-xs">
                <label className="font-label text-label text-text-secondary block">Icône de catégorie</label>
                <div className="grid grid-cols-4 gap-2 p-2 bg-bg-app rounded-xl">
                  {AVAILABLE_ICONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, icone: icon }))}
                      className={clsx(
                        'aspect-square flex items-center justify-center rounded-lg transition-all cursor-pointer',
                        formData.icone === icon
                          ? 'bg-primary-container text-white shadow-sm ring-2 ring-primary-container ring-offset-2'
                          : 'bg-white border border-border-default text-text-tertiary hover:border-primary-container hover:text-primary',
                      )}
                    >
                      <MIcon name={icon} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggle Switch */}
              <div className="flex items-center justify-between p-3 bg-primary-tint/50 rounded-xl border border-primary/10">
                <div>
                  <p className="font-label text-label text-on-surface font-bold">Catégorie active</p>
                  <p className="text-micro text-text-secondary">Afficher sur l’accueil et le catalogue</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.active ?? true}
                    onChange={(e) => setFormData((prev) => ({ ...prev, active: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-border-default peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-container" />
                </label>
              </div>

              <div className="mt-lg pt-lg border-t border-border-default space-y-3">
                <button
                  type="submit"
                  className="w-full py-3 bg-primary-container text-white font-bold rounded-[10px] hover:bg-primary-hover active:scale-[0.97] transition-all shadow-md cursor-pointer"
                >
                  Enregistrer les modifications
                </button>
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen(false)}
                  className="w-full py-3 bg-transparent border border-primary text-primary font-bold rounded-[10px] hover:bg-primary-tint active:scale-[0.97] transition-all cursor-pointer"
                >
                  Annuler
                </button>
              </div>
            </form>
          </aside>
        )}
      </main>
    </div>
  );
}
