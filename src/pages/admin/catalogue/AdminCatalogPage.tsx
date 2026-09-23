import { useState } from 'react';
import toast from 'react-hot-toast';
import AdminSidebar from '../../../components/layout/admin/AdminSidebar';
import MIcon from '../../../components/shared/MIcon';

interface ProductItem {
  id: string;
  nom: string;
  categorie: string;
  prix: number;
  prixMinimum: number;
  stock: number;
  unite: string;
  statut: 'disponible' | 'stock_bas' | 'rupture';
  image?: string;
  description: string;
}

const INITIAL_PRODUCTS: ProductItem[] = [
  {
    id: '1',
    nom: 'Tomates Fraîches du jour',
    categorie: 'Légumes',
    prix: 1500,
    prixMinimum: 1200,
    stock: 85,
    unite: 'kg',
    statut: 'disponible',
    description: 'Tomates fraîches récoltées localement au marché Dantokpa, idéales pour vos sauces.',
  },
  {
    id: '2',
    nom: 'Sac de Riz Parboiled 50kg',
    categorie: 'Céréales',
    prix: 24500,
    prixMinimum: 21000,
    stock: 12,
    unite: 'Sac',
    statut: 'stock_bas',
    description: 'Riz étuvé de qualité supérieure, conservation longue durée.',
  },
  {
    id: '3',
    nom: 'Huile d’Arachide Pure 5L',
    categorie: 'Épicerie',
    prix: 8000,
    prixMinimum: 7200,
    stock: 0,
    unite: 'Bidon',
    statut: 'rupture',
    description: 'Huile végétale raffinée de fabrication locale Sodeco-Bénin.',
  },
  {
    id: '4',
    nom: 'Ananas Pain de Sucre (Lot de 10)',
    categorie: 'Fruits',
    prix: 4500,
    prixMinimum: 3800,
    stock: 45,
    unite: 'Lot',
    statut: 'disponible',
    description: 'Ananas ultra doux et sucrés provenant des vergers d’Allada.',
  },
  {
    id: '5',
    nom: 'Piment Rouge Séché 1kg',
    categorie: 'Épices',
    prix: 3200,
    prixMinimum: 2800,
    stock: 28,
    unite: 'kg',
    statut: 'disponible',
    description: 'Piment très piquant moulu ou entier, séché au soleil.',
  },
];

/**
 * AdminCatalogPage — Reproduction 100% conforme à `gestion_du_catalogue_admin_tokpa/code.html`
 */
export default function AdminCatalogPage() {
  const [products, setProducts] = useState<ProductItem[]>(INITIAL_PRODUCTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<ProductItem>>({
    nom: '',
    categorie: 'Légumes',
    prix: 1000,
    prixMinimum: 800,
    stock: 50,
    unite: 'kg',
    description: '',
    statut: 'disponible',
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredProducts.map((p) => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((item) => item !== id));
    }
  };

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setFormData({
      nom: '',
      categorie: 'Légumes',
      prix: 1000,
      prixMinimum: 800,
      stock: 50,
      unite: 'kg',
      description: '',
      statut: 'disponible',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (product: ProductItem) => {
    setEditingProduct(product);
    setFormData({ ...product });
    setIsModalOpen(true);
  };

  const handleDeleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    toast.success('Produit supprimé du catalogue');
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nom) {
      toast.error('Le nom du produit est obligatoire');
      return;
    }

    if (editingProduct) {
      // Update
      setProducts((prev) =>
        prev.map((p) => (p.id === editingProduct.id ? ({ ...p, ...formData } as ProductItem) : p)),
      );
      toast.success('Produit mis à jour avec succès !');
    } else {
      // Create
      const newProduct: ProductItem = {
        id: `p_${Date.now()}`,
        nom: formData.nom || 'Nouveau Produit',
        categorie: formData.categorie || 'Légumes',
        prix: Number(formData.prix) || 1000,
        prixMinimum: Number(formData.prixMinimum) || 800,
        stock: Number(formData.stock) || 50,
        unite: formData.unite || 'kg',
        statut: (formData.stock || 0) === 0 ? 'rupture' : (formData.stock || 0) < 15 ? 'stock_bas' : 'disponible',
        description: formData.description || '',
      };
      setProducts((prev) => [newProduct, ...prev]);
      toast.success('Nouveau produit ajouté au catalogue !');
    }
    setIsModalOpen(false);
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.nom.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'all' || p.categorie.toLowerCase() === selectedCategory.toLowerCase();
    return matchesSearch && matchesCat;
  });

  return (
    <div className="bg-bg-app text-on-surface flex min-h-screen font-body">
      {/* Sidebar Admin */}
      <AdminSidebar currentPath="/admin/catalogue" />

      {/* Main Content */}
      <main className="ml-64 flex-1 flex flex-col min-h-screen relative">
        {/* TopAppBar */}
        <header className="h-16 flex justify-between items-center px-lg bg-white sticky top-0 z-40 border-b border-border-default">
          <div className="flex items-center gap-4">
            <span className="font-h2 text-h2 font-bold text-primary">Gestion du catalogue (F-06 / F-07)</span>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative hidden lg:block w-72">
              <MIcon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un produit..."
                className="w-full pl-10 pr-4 py-2 bg-bg-app border-none rounded-full text-body focus:ring-2 focus:ring-primary-light outline-none"
              />
            </div>

            <button
              type="button"
              onClick={handleOpenAddModal}
              className="px-md py-2 bg-primary-container text-white font-bold rounded-button hover:bg-primary-hover transition-all active:scale-95 flex items-center gap-2 shadow-md cursor-pointer"
            >
              <MIcon name="add" />
              <span>Nouveau produit</span>
            </button>
          </div>
        </header>

        {/* Content Body */}
        <div className="p-lg space-y-lg flex-1">
          {/* Header Stats / Filters */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-md bg-white p-md rounded-card border border-border-default shadow-sm">
            <div className="flex items-center gap-md">
              <span className="text-body font-bold text-on-surface">Filtres :</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-md py-2 rounded-lg border border-border-default bg-bg-app text-body font-medium outline-none"
              >
                <option value="all">Toutes les catégories</option>
                <option value="Légumes">Légumes</option>
                <option value="Céréales">Céréales</option>
                <option value="Fruits">Fruits</option>
                <option value="Épicerie">Épicerie</option>
                <option value="Épices">Épices</option>
              </select>
            </div>

            <div className="text-secondary text-text-secondary">
              Total : <span className="font-bold text-on-surface">{products.length} produits</span> enregistrés
            </div>
          </div>

          {/* Table Card */}
          <div className="bg-bg-card rounded-card border border-border-default shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-bg-secondary/60 border-b border-border-default text-text-secondary font-label text-label">
                    <th className="py-3 px-md w-12 text-center">
                      <input
                        type="checkbox"
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        checked={selectedIds.length === filteredProducts.length && filteredProducts.length > 0}
                        className="rounded border-border-default text-primary focus:ring-primary"
                      />
                    </th>
                    <th className="py-3 px-md">Produit</th>
                    <th className="py-3 px-md">Catégorie</th>
                    <th className="py-3 px-md">Prix public</th>
                    <th className="py-3 px-md">Prix plancher</th>
                    <th className="py-3 px-md">Stock</th>
                    <th className="py-3 px-md">Statut</th>
                    <th className="py-3 px-md text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y border-border-default">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-text-tertiary">
                        Aucun produit trouvé.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((prod) => (
                      <tr key={prod.id} className="hover:bg-primary-tint/20 transition-colors group">
                        <td className="py-4 px-md text-center">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(prod.id)}
                            onChange={(e) => handleSelectRow(prod.id, e.target.checked)}
                            className="rounded border-border-default text-primary focus:ring-primary"
                          />
                        </td>
                        <td className="py-4 px-md">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-surface-container-low flex items-center justify-center shrink-0 border border-border-default overflow-hidden">
                              {prod.image ? (
                                <img src={prod.image} alt={prod.nom} className="h-full w-full object-cover" />
                              ) : (
                                <MIcon name="inventory_2" className="text-primary text-xl" />
                              )}
                            </div>
                            <div>
                              <p className="font-body font-bold text-on-surface">{prod.nom}</p>
                              <p className="text-micro text-text-tertiary">{prod.unite}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-md text-text-secondary font-medium">{prod.categorie}</td>
                        <td className="py-4 px-md font-price text-primary">
                          {prod.prix.toLocaleString('fr-FR')} <span className="text-xs">FCFA</span>
                        </td>
                        <td className="py-4 px-md font-secondary text-amber-text font-bold">
                          {prod.prixMinimum.toLocaleString('fr-FR')} FCFA
                        </td>
                        <td className="py-4 px-md font-body font-semibold text-on-surface">{prod.stock}</td>
                        <td className="py-4 px-md">
                          {prod.statut === 'disponible' && (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-success-light text-success-dark inline-flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-success inline-block" />
                              Disponible
                            </span>
                          )}
                          {prod.statut === 'stock_bas' && (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-light text-amber-text inline-flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-text inline-block" />
                              Stock bas
                            </span>
                          )}
                          {prod.statut === 'rupture' && (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-error-light text-error-dark inline-flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-error inline-block" />
                              Rupture
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-md text-right space-x-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(prod)}
                            className="p-1.5 hover:bg-primary-tint rounded-md text-primary transition-colors cursor-pointer"
                            title="Modifier"
                          >
                            <MIcon name="edit" className="text-[20px]" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(prod.id)}
                            className="p-1.5 hover:bg-error-light rounded-md text-error transition-colors cursor-pointer"
                            title="Supprimer"
                          >
                            <MIcon name="delete" className="text-[20px]" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="py-md px-lg flex items-center justify-between border-t border-border-default bg-bg-secondary/30">
              <span className="text-label text-text-secondary">
                Affichage de 1 à {filteredProducts.length} sur {products.length} produits
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="w-8 h-8 flex items-center justify-center rounded border border-border-default bg-white text-text-tertiary hover:bg-bg-secondary"
                >
                  <MIcon name="chevron_left" className="text-sm" />
                </button>
                <button type="button" className="w-8 h-8 flex items-center justify-center rounded border border-primary bg-primary-tint text-primary font-bold">
                  1
                </button>
                <button
                  type="button"
                  className="w-8 h-8 flex items-center justify-center rounded border border-border-default bg-white text-text-tertiary hover:bg-bg-secondary"
                >
                  <MIcon name="chevron_right" className="text-sm" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Batch Selection Action Bar */}
        {selectedIds.length > 0 && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#111827] text-white px-lg py-3 rounded-full shadow-2xl flex items-center gap-6 z-[60] border border-white/10 animate-fade-in">
            <span className="text-label font-bold border-r border-white/20 pr-6">
              {selectedIds.length} sélectionné(s)
            </span>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => {
                  setProducts((prev) =>
                    prev.map((p) => (selectedIds.includes(p.id) ? { ...p, statut: 'rupture' } : p)),
                  );
                  toast.success('Produits désactivés');
                }}
                className="flex items-center gap-2 hover:text-amber-text transition-colors font-medium cursor-pointer"
              >
                <MIcon name="block" className="text-[20px]" />
                Désactiver
              </button>
              <button
                type="button"
                onClick={() => {
                  setProducts((prev) => prev.filter((p) => !selectedIds.includes(p.id)));
                  setSelectedIds([]);
                  toast.success('Produits supprimés');
                }}
                className="flex items-center gap-2 hover:text-error transition-colors font-medium cursor-pointer"
              >
                <MIcon name="delete" className="text-[20px]" />
                Supprimer
              </button>
            </div>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="ml-2 w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer"
            >
              <MIcon name="close" className="text-[16px]" />
            </button>
          </div>
        )}

        {/* Modal Add / Edit Product */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-on-surface/60 backdrop-blur-sm z-[100] flex items-center justify-center px-4 animate-fade-in">
            <div className="bg-white w-full max-w-[560px] rounded-xl shadow-2xl overflow-hidden">
              <div className="p-lg border-b border-border-default flex justify-between items-center bg-bg-secondary/30">
                <h3 className="font-h2 text-h2 font-bold">
                  {editingProduct ? 'Modifier le produit' : 'Ajouter un nouveau produit'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <MIcon name="close" />
                </button>
              </div>

              <form onSubmit={handleSaveProduct} className="p-lg space-y-md max-h-[75vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-md">
                  <div className="col-span-2">
                    <label className="block text-label mb-2 text-text-secondary font-medium">Nom du produit</label>
                    <input
                      type="text"
                      value={formData.nom || ''}
                      onChange={(e) => setFormData((prev) => ({ ...prev, nom: e.target.value }))}
                      required
                      className="w-full px-md py-2.5 rounded-lg border border-border-default focus:border-primary outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-label mb-2 text-text-secondary font-medium">Catégorie</label>
                    <select
                      value={formData.categorie || 'Légumes'}
                      onChange={(e) => setFormData((prev) => ({ ...prev, categorie: e.target.value }))}
                      className="w-full px-md py-2.5 rounded-lg border border-border-default focus:border-primary outline-none"
                    >
                      <option value="Légumes">Légumes</option>
                      <option value="Céréales">Céréales</option>
                      <option value="Fruits">Fruits</option>
                      <option value="Épicerie">Épicerie</option>
                      <option value="Épices">Épices</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-label mb-2 text-text-secondary font-medium">Prix Public (FCFA)</label>
                    <input
                      type="number"
                      value={formData.prix || ''}
                      onChange={(e) => setFormData((prev) => ({ ...prev, prix: Number(e.target.value) }))}
                      required
                      className="w-full px-md py-2.5 rounded-lg border border-border-default focus:border-primary outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-label mb-2 text-text-secondary font-medium">Prix Plancher (Négociation)</label>
                    <input
                      type="number"
                      value={formData.prixMinimum || ''}
                      onChange={(e) => setFormData((prev) => ({ ...prev, prixMinimum: Number(e.target.value) }))}
                      required
                      className="w-full px-md py-2.5 rounded-lg border border-border-default focus:border-primary outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-label mb-2 text-text-secondary font-medium">Stock Actuel</label>
                    <input
                      type="number"
                      value={formData.stock || 0}
                      onChange={(e) => setFormData((prev) => ({ ...prev, stock: Number(e.target.value) }))}
                      required
                      className="w-full px-md py-2.5 rounded-lg border border-border-default focus:border-primary outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-label mb-2 text-text-secondary font-medium">Unité de vente</label>
                    <input
                      type="text"
                      value={formData.unite || ''}
                      onChange={(e) => setFormData((prev) => ({ ...prev, unite: e.target.value }))}
                      placeholder="kg, sac, bidon..."
                      className="w-full px-md py-2.5 rounded-lg border border-border-default focus:border-primary outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-label mb-2 text-text-secondary font-medium">Description</label>
                  <textarea
                    rows={3}
                    value={formData.description || ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                    className="w-full px-md py-2.5 rounded-lg border border-border-default focus:border-primary outline-none resize-none"
                  />
                </div>

                <div className="p-lg border-t border-border-default flex items-center justify-end gap-md bg-white">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-md py-2.5 rounded-lg border border-border-default text-on-surface font-medium hover:bg-gray-50 transition-all cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-lg py-2.5 rounded-lg bg-primary-container hover:bg-primary-hover text-white font-bold transition-all transform active:scale-95 shadow-lg shadow-primary/20 cursor-pointer"
                  >
                    Enregistrer
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
