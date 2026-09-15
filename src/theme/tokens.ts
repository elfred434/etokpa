/**
 * TOKPa — Tokens du design system (miroir TS de theme.css / design.md v2).
 * À utiliser dans le JS : Recharts, Leaflet, styles dynamiques, tests…
 * Source de vérité : design.md — ne modifier qu'ici ET theme.css ensemble.
 */

export const colors = {
  primary: {
    DEFAULT: '#F97316',
    hover: '#EA580C',
    dark: '#C2410C',
    darker: '#7C2D12',
    light: '#FED7AA',
    lighter: '#FFF7ED',
  },
  amber: {
    DEFAULT: '#F59E0B',
    hover: '#D97706',
    light: '#FEF3C7',
    text: '#92400E',
  },
  success: {
    DEFAULT: '#10B981',
    dark: '#059669',
    light: '#ECFDF5',
    border: '#6EE7B7',
  },
  error: {
    DEFAULT: '#EF4444',
    dark: '#991B1B',
    light: '#FEF2F2',
    border: '#FCA5A5',
  },
  info: {
    DEFAULT: '#3B82F6',
    dark: '#1D4ED8',
    light: '#EFF6FF',
  },
  warning: '#F59E0B',
  neutral: {
    ink: '#111827',
    ink2: '#6B7280',
    ink3: '#9CA3AF',
    page: '#F3F4F6',
    card: '#FFFFFF',
    surface: '#F9FAFB',
    line: '#E5E7EB',
    disabledBg: '#D1D5DB',
  },
} as const;

export const typography = {
  fontFamily: "'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  h1: { size: '28px', weight: 700 },
  h2: { size: '20px', weight: 600 },
  h3: { size: '16px', weight: 500 },
  body: { size: '15px', weight: 400 },
  secondary: { size: '13px', weight: 400 },
  label: { size: '13px', weight: 500 },
  micro: { size: '11px', weight: 500, letterSpacing: '0.06em', uppercase: true },
  price: { size: '18px', weight: 700, color: colors.primary.DEFAULT },
} as const;

export const radius = {
  btn: '10px',
  input: '10px',
  card: '14px',
  badge: '20px',
  status: '10px',
  pill: '12px',
} as const;

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '40px',
} as const;

export const breakpoints = {
  mobile: { max: '639px' },
  tablet: { min: '640px', max: '1024px' },
  desktop: { min: '1025px' },
  sm: '640px',
  lg: '1024px',
} as const;

export const shadows = {
  focus: '0 0 0 3px rgb(249 115 22 / 0.15)',
  focusA11y: '0 0 0 3px rgb(249 115 22 / 0.3)',
} as const;

export const transitions = {
  base: '0.15s ease',
  click: 'scale(0.97)',
} as const;

export const layout = {
  navbarHeight: '52px',
  contentMaxWidth: '1200px',
  pagePaddingDesktop: '24px',
  pagePaddingMobile: '16px',
  touchTargetMin: '44px',
  btnDeliveryMinHeight: '52px',
  gridGapCatalogDesktop: '16px',
  gridGapCatalogMobile: '10px',
  gridGapStats: '12px',
} as const;

export const components = {
  card: { padding: '16px 20px', border: '0.5px solid ' + colors.neutral.line },
  badge: { padding: '3px 10px', fontSize: '12px', dotSize: '7px' },
  status: { padding: '10px 14px', fontSize: '13px', dotSize: '8px' },
  input: { padding: '10px 14px', fontSize: '14px', border: '1.5px solid ' + colors.neutral.line },
  button: { padding: '10px 20px', paddingSm: '6px 14px', iconGap: '7px' },
  bubble: { maxWidth: '78%', padding: '9px 13px', fontSize: '13px' },
  progress: { height: '6px', track: colors.neutral.page, fill: colors.primary.DEFAULT },
  placeholder: { heightCard: '110px', heightDetail: '200px' },
  avatar: { normal: '38px', navbar: '32px', profile: '44px' },
} as const;

/** Dégradés des placeholders produit par catégorie (design.md §8). */
export const productPlaceholders = {
  vegetable: { gradient: 'linear-gradient(135deg, #FFF7ED, #FED7AA)', icon: 'plant-2', color: '#EA580C' },
  fish: { gradient: 'linear-gradient(135deg, #ECFDF5, #D1FAE5)', icon: 'fish', color: '#059669' },
  pack: { gradient: 'linear-gradient(135deg, #EFF6FF, #DBEAFE)', icon: 'basket', color: '#3B82F6' },
  spice: { gradient: 'linear-gradient(135deg, #FEF3C7, #FDE68A)', icon: 'salt', color: '#D97706' },
  grain: { gradient: 'linear-gradient(135deg, #F9FAFB, #F3F4F6)', icon: 'grain', color: '#6B7280' },
} as const;

/** Statuts de commande du flux unique (CDC §4.3). */
export const orderStatus = {
  pending: { label: 'En attente', bg: '#FFFBEB', border: '#FDE68A', text: '#92400E', dot: '#F59E0B' },
  preparing: { label: 'En préparation', bg: '#EFF6FF', border: '#BFDBFE', text: '#1E40AF', dot: '#3B82F6' },
  shipping: { label: 'En livraison', bg: '#FFF7ED', border: '#FED7AA', text: '#9A3412', dot: '#F97316' },
  delivered: { label: 'Livré', bg: '#ECFDF5', border: '#6EE7B7', text: '#065F46', dot: '#10B981' },
  cancelled: { label: 'Annulé', bg: '#FEF2F2', border: '#FCA5A5', text: '#991B1B', dot: '#EF4444' },
} as const;

export type OrderStatusKey = keyof typeof orderStatus;
export type ProductPlaceholderKey = keyof typeof productPlaceholders;
