import type { AppNotification, Category, LandMark, Product, Zone } from '../types/models';

/**
 * Fixtures Sprint 1 (backend absent) — produits repris de la maquette catalogue,
 * zones / points de repère conformes CDC §4.2, notifications de la maquette dédiée.
 * À remplacer par les endpoints RTK Query / TanStack Query au branchement backend.
 */

export const CATEGORIES: Category[] = [
  { id: 'vegetable', nom: 'Légumes & Fruits' },
  { id: 'fish', nom: 'Poissons & Viandes' },
  { id: 'grain', nom: 'Céréales & Graines' },
  { id: 'spice', nom: 'Épices & Condiments' },
  { id: 'pack', nom: 'Packs & Bundles' },
];

export const PRODUCTS: Product[] = [
  { id: 'p1', nom: 'Tomates fraîches (Local)', origine: 'Marché Dantokpa', quantite: '1kg', prix: 450, prixMinimum: 380, categorie: 'vegetable', stock: 'available', badges: [] },
  { id: 'p2', nom: 'Oignons violets', origine: 'Marché Ganhi', quantite: '2kg', prix: 800, prixMinimum: 700, categorie: 'vegetable', stock: 'available', badges: ['promo'] },
  { id: 'p3', nom: 'Poivrons verts', origine: 'Marché Missèbo', quantite: '500g', prix: 600, prixMinimum: 520, categorie: 'vegetable', stock: 'low', badges: [] },
  { id: 'p4', nom: 'Carottes bio', origine: 'Marché Gbégamey', quantite: '1kg', prix: 350, prixMinimum: 300, categorie: 'vegetable', stock: 'available', badges: [] },
  { id: 'p5', nom: 'Pommes de terre', origine: 'Marché Dantokpa', quantite: 'Filet 2kg', prix: 1200, prixMinimum: 1050, categorie: 'vegetable', stock: 'available', badges: [] },
  { id: 'p6', nom: 'Chou vert blanc', origine: 'Marché Ganhi', quantite: 'Pièce', prix: 400, prixMinimum: 350, categorie: 'vegetable', stock: 'available', badges: [] },
  { id: 'p7', nom: 'Concombres frais', origine: 'Marché Dantokpa', quantite: 'Lot de 3', prix: 300, prixMinimum: 260, categorie: 'vegetable', stock: 'available', badges: [] },
  { id: 'p8', nom: 'Gombo frais', origine: 'Marché Missèbo', quantite: '500g', prix: 250, prixMinimum: 220, categorie: 'vegetable', stock: 'out', badges: [] },
  { id: 'p9', nom: 'Ail violet local', origine: 'Marché Dantokpa', quantite: '250g', prix: 500, prixMinimum: 430, categorie: 'spice', stock: 'available', badges: ['new'] },
  { id: 'p10', nom: 'Pack Soupe du week-end', origine: 'Marché Dantokpa', quantite: 'Tomates + oignons + piment', prix: 1500, prixMinimum: 1300, categorie: 'pack', stock: 'available', badges: ['pack'] },
];

export const ZONES: Zone[] = [
  { id: 'z1', nom: 'Cadjehoun' },
  { id: 'z2', nom: 'Akpakpa' },
  { id: 'z3', nom: 'Gbégamey' },
  { id: 'z4', nom: 'Calavi' },
];

export const LANDMARKS: LandMark[] = [
  { id: 'l1', zoneId: 'z1', nom: 'Carrefour Cadjehoun' },
  { id: 'l2', zoneId: 'z1', nom: 'Pharmacie Cadjehoun Centre' },
  { id: 'l3', zoneId: 'z2', nom: 'Marché Dantokpa Nord' },
  { id: 'l4', zoneId: 'z2', nom: 'Pont Akpakpa' },
  { id: 'l5', zoneId: 'z3', nom: 'Carrefour Gbégamey' },
  { id: 'l6', zoneId: 'z4', nom: 'Place Maro Abomey-Calavi' },
];

/** Frais de livraison mock par zone (F-19 — calcul réel backend au Sprint 2/3). */
export const DELIVERY_FEES: Record<string, number> = {
  z1: 1000,
  z2: 1200,
  z3: 1500,
  z4: 2000,
};

export const NOTIFICATIONS: AppNotification[] = [
  { id: 'n1', type: 'order', title: 'Commande livrée !', message: 'Votre commande #TOK-2847 a été remise à Kossi.', time: 'Il y a 10 min.', unread: true },
  { id: 'n2', type: 'promo', title: 'Promotion exclusive', message: "Profitez de -20% sur les ignames du marché Dantokpa ce weekend. Ne ratez pas l'occasion !", time: 'Il y a 2h.', unread: true },
  { id: 'n3', type: 'security', title: 'Nouvelle connexion', message: "Une connexion a été détectée depuis un nouvel appareil à Cotonou, Benin. Si ce n'est pas vous, changez votre mot de passe.", time: 'Ce matin', unread: true },
  { id: 'n4', type: 'order', title: 'Commande confirmée', message: 'Le vendeur a accepté votre offre pour le pack de tomates. La livraison est en préparation.', time: 'Hier', unread: false },
  { id: 'n5', type: 'info', title: 'Mise à jour TOKPa', message: 'Découvrez les nouveaux points de repère dans la zone Akpakpa pour faciliter vos livraisons.', time: '2 jours', unread: false },
];
