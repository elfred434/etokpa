import type { AppNotification, CartItem, Category, LandMark, Market, Product, Zone } from '../types/models';

/**
 * Fixtures Sprint 1 (backend absent) — reprises des maquettes Stitch.
 * À remplacer par TanStack Query au branchement backend.
 */

export const CATEGORIES: Category[] = [
  { id: 'vegetable', nom: 'Légumes & Fruits' },
  { id: 'fish', nom: 'Poissons & Viandes' },
  { id: 'grain', nom: 'Céréales & Graines' },
  { id: 'spice', nom: 'Épices & Condiments' },
  { id: 'pack', nom: 'Packs & Bundles' },
];

/** Zones de marché (filtres catalogue, maquette catalogue). */
export const MARKETS: Market[] = [
  { id: 'm1', nom: 'Marché Dantokpa' },
  { id: 'm2', nom: 'Marché Ganhi' },
  { id: 'm3', nom: 'Marché Missèbo' },
  { id: 'm4', nom: 'Marché Gbégamey' },
];

export const PRODUCTS: Product[] = [
  { id: 'p1', nom: 'Tomates fraîches du jour', origine: 'Marché Dantokpa', quantite: '500g', prix: 450, prixMinimum: 350, categorie: 'vegetable', stock: 'available', badges: [], image: '/images/brand/photo-tomates.png' },
  { id: 'p2', nom: 'Oignons violets', origine: 'Marché Ganhi', quantite: '2kg', prix: 800, prixMinimum: 700, categorie: 'vegetable', stock: 'available', badges: ['promo'] },
  { id: 'p3', nom: 'Poivrons verts', origine: 'Marché Missèbo', quantite: '500g', prix: 600, prixMinimum: 520, categorie: 'vegetable', stock: 'low', badges: [] },
  { id: 'p4', nom: 'Carottes bio', origine: 'Marché Gbégamey', quantite: '1kg', prix: 350, prixMinimum: 300, categorie: 'vegetable', stock: 'available', badges: [] },
  { id: 'p5', nom: 'Pommes de terre', origine: 'Marché Dantokpa', quantite: 'Filet 2kg', prix: 1200, prixMinimum: 1050, categorie: 'vegetable', stock: 'available', badges: [] },
  { id: 'p6', nom: 'Chou vert blanc', origine: 'Marché Ganhi', quantite: 'Pièce', prix: 400, prixMinimum: 350, categorie: 'vegetable', stock: 'available', badges: [] },
  { id: 'p7', nom: 'Concombres frais', origine: 'Marché Dantokpa', quantite: 'Lot de 3', prix: 300, prixMinimum: 260, categorie: 'vegetable', stock: 'available', badges: [] },
  { id: 'p8', nom: 'Gombo frais', origine: 'Marché Missèbo', quantite: '500g', prix: 250, prixMinimum: 220, categorie: 'vegetable', stock: 'out', badges: [] },
  { id: 'p9', nom: 'Ail violet local', origine: 'Marché Dantokpa', quantite: '250g', prix: 500, prixMinimum: 430, categorie: 'spice', stock: 'available', badges: ['new'] },
  { id: 'p10', nom: 'Pack Soupe du week-end', origine: 'Marché Dantokpa', quantite: 'Tomates + oignons + piment', prix: 1500, prixMinimum: 1300, categorie: 'pack', stock: 'available', badges: ['pack'] },
  { id: 'p11', nom: 'Poisson fumé', origine: 'Marché Ganhi', quantite: 'Entier', prix: 800, prixMinimum: 700, categorie: 'fish', stock: 'available', badges: [] },
  { id: 'p12', nom: 'Pack légumes', origine: 'Marché Missèbo', quantite: 'Panier 5 variétés', prix: 380, prixMinimum: 350, categorie: 'pack', stock: 'available', badges: ['pack'], negotiated: { oldPrice: 500 } },
];

/** Panier initial de démo = articles de la maquette panier/caisse. */
export const INITIAL_CART: CartItem[] = [
  { product: PRODUCTS[0], quantite: 2 },
  { product: PRODUCTS[10], quantite: 1 },
  { product: PRODUCTS[11], quantite: 1 },
];

/** Zones de livraison (maquette panier) + points de repère (CDC §4.2). */
export const ZONES: Zone[] = [
  { id: 'z1', nom: 'Zone Cadjehoun' },
  { id: 'z2', nom: 'Zone Akpakpa' },
  { id: 'z3', nom: 'Zone Fidjrossè' },
  { id: 'z4', nom: 'Zone Calavi' },
];

export const LANDMARKS: LandMark[] = [
  { id: 'l1', zoneId: 'z1', nom: 'Carrefour Cadjehoun' },
  { id: 'l2', zoneId: 'z1', nom: 'Pharmacie Sainte-Marie' },
  { id: 'l3', zoneId: 'z2', nom: 'Marché Dantokpa Nord' },
  { id: 'l4', zoneId: 'z2', nom: 'Pont Akpakpa' },
  { id: 'l5', zoneId: 'z3', nom: 'Carrefour Fidjrossè' },
  { id: 'l6', zoneId: 'z4', nom: 'Place Maro Abomey-Calavi' },
];

/** Frais de livraison par zone (F-19 — calcul réel backend plus tard). */
export const DELIVERY_FEES: Record<string, number> = {
  z1: 500,
  z2: 700,
  z3: 600,
  z4: 1000,
};

export const NOTIFICATIONS: AppNotification[] = [
  { id: 'n1', type: 'order', title: 'Commande livrée !', message: 'Votre commande #TOK-2847 a été remise à Kossi.', time: 'Il y a 10 min.', unread: true },
  { id: 'n2', type: 'promo', title: 'Promotion exclusive', message: "Profitez de -20% sur les ignames du marché Dantokpa ce weekend. Ne ratez pas l'occasion !", time: 'Il y a 2h.', unread: true },
  { id: 'n3', type: 'security', title: 'Nouvelle connexion', message: "Une connexion a été détectée depuis un nouvel appareil à Cotonou, Benin. Si ce n'est pas vous, changez votre mot de passe.", time: 'Ce matin', unread: true },
  { id: 'n4', type: 'order', title: 'Commande confirmée', message: 'Votre offre pour le pack de tomates a été acceptée. La livraison est en préparation.', time: 'Hier', unread: false },
  { id: 'n5', type: 'info', title: 'Mise à jour TOKPa', message: 'Découvrez les nouveaux points de repère dans la zone Akpakpa pour faciliter vos livraisons.', time: '2 jours', unread: false },
];

/** Origine certifiée (maquette fiche produit). */
export const MARKET_SOURCE = { nom: 'Marché Dantokpa', initiales: 'DK', verified: true };

/** Détails longs (maquette fiche produit) — fallback générique sinon. */
export const PRODUCT_DETAILS: Record<string, { paras: string[]; origine: string; fraicheur: string; poids: string; conservation: string }> = {
  p1: {
    paras: [
      "Ces tomates fraîches proviennent directement du cœur du marché Dantokpa à Cotonou. Cultivées localement avec soin, elles sont récoltées à maturité pour garantir une saveur intense et une texture ferme idéale pour vos sauces, salades et plats traditionnels béninois.",
      "Afi Mensah, notre vendeuse partenaire certifiée, s'approvisionne quotidiennement auprès des producteurs locaux de la zone de Ouidah pour vous offrir le meilleur de la terre. Nos tomates sont triées à la main pour éviter tout produit abîmé.",
    ],
    origine: 'Dantokpa / Ouidah',
    fraicheur: 'Récolte du jour',
    poids: '~80g par pièce',
    conservation: '5-7 jours au frais',
  },
};
