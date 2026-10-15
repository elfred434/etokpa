import type { ReactNode } from 'react';
import MIcon from './MIcon';
import { tx } from '../../i18n/tx';

/**
 * Gabarit unique des modales de détail — repris **au caractère près** de la
 * modale de paiement (`PaymentsPanel`), qui sert de référence :
 *
 *   en-tête   : fond surface basse, icône orange, titre + sous-titre, fermer rond
 *   corps     : bandeau d'identité (pastille #id, date, montant, statut),
 *               puis des cartes `bg-bg-secondary` à étiquette majuscule
 *   pied      : fond `bg-bg-secondary`, filet haut, actions à droite
 *
 * Les modales de commande (client et administration/manager) l'utilisent ; la
 * modale de paiement reste la référence écrite à la main, elle sera migrée si
 * besoin sans changer son rendu.
 */

type ModalShellProps = {
  /** Titre de l'en-tête (ex. « Commande #42 », « Paiement #16 »). */
  titre: ReactNode;
  /** Sous-titre explicatif sous le titre. */
  sousTitre?: ReactNode;
  /** Icône Material Symbols de l'en-tête. */
  icone: string;
  onFermer: () => void;
  /** Contenu du corps (bandeau + cartes). */
  children: ReactNode;
  /** Contenu du pied de modale (actions). */
  pied?: ReactNode;
  /** Largeur maximale du panneau ; 620px comme la modale de paiement. */
  maxWidth?: number;
  /** Au-dessus des barres collantes (z-70 comme la modale de paiement). */
  zIndex?: number;
  /** Identifiant de test du panneau. */
  testId?: string;
};

export function ModalShell({
  titre,
  sousTitre,
  icone,
  onFermer,
  children,
  pied,
  maxWidth = 620,
  zIndex = 70,
  testId,
}: ModalShellProps) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      style={{ zIndex }}
      role="dialog"
      aria-modal="true"
      onClick={onFermer}
    >
      <div
        data-testid={testId}
        className="bg-bg-card rounded-xl shadow-2xl border border-border-default w-full max-h-[90vh] flex flex-col overflow-hidden"
        style={{ maxWidth: `${maxWidth}px` }}
        onClick={(event) => event.stopPropagation()}
      >
        {/* En-tête */}
        <div className="px-6 py-4 border-b border-border-default flex items-center justify-between bg-surface-container-low shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <MIcon name={icone} className="text-primary text-xl" />
            <div className="min-w-0">
              <h3 className="font-h2 text-h3 font-bold text-on-surface break-words">{titre}</h3>
              {sousTitre && (
                <p className="font-secondary text-micro text-text-secondary">{sousTitre}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            aria-label={tx('Fermer le modal')}
            onClick={onFermer}
            className="p-1.5 text-text-secondary hover:text-on-surface hover:bg-black/5 rounded-full transition-colors cursor-pointer"
          >
            <MIcon name="close" className="text-xl" />
          </button>
        </div>

        {/* Corps */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">{children}</div>

        {/* Pied de modale */}
        {pied && (
          <div className="px-6 py-4 bg-bg-secondary border-t border-border-default flex flex-wrap items-center justify-between gap-3 shrink-0">
            {pied}
          </div>
        )}
      </div>
    </div>
  );
}

/** Bandeau d'identité : pastille #id, date, montant, statut — comme les paiements. */
export function BandeauFiche({
  id,
  date,
  montant,
  statut,
}: {
  id: number | string;
  date?: ReactNode;
  montant?: ReactNode;
  statut?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 pb-3 border-b border-border-default">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="font-mono font-bold text-label text-primary bg-primary-light/40 px-2 py-0.5 rounded">
            #{id}
          </span>
          {date && <span className="text-micro text-text-secondary font-medium">{date}</span>}
        </div>
        {montant && <h4 className="text-h2 font-bold text-on-surface">{montant}</h4>}
      </div>
      {statut}
    </div>
  );
}

/**
 * Carte de section : fond `bg-bg-secondary`, filet, étiquette majuscule avec
 * icône, puis contenu en grille à deux colonnes (une colonne sur mobile).
 */
export function FicheCard({
  icone,
  titre,
  children,
  colonnes = 2,
}: {
  icone: string;
  titre: string;
  children: ReactNode;
  colonnes?: 1 | 2;
}) {
  return (
    <div className="bg-bg-secondary p-3.5 rounded-lg border border-border-default space-y-2">
      <span className="text-micro uppercase tracking-wider text-text-tertiary font-bold flex items-center gap-1">
        <MIcon name={icone} className="text-sm" />
        {titre}
      </span>
      <div className={`grid grid-cols-1 ${colonnes === 2 ? 'md:grid-cols-2' : ''} gap-2 text-label pt-1`}>
        {children}
      </div>
    </div>
  );
}

/** Ligne étiquetée d'une carte : icône, libellé discret, valeur en gras. */
export function LigneFiche({
  icone,
  etiquette,
  children,
  large = false,
}: {
  icone: string;
  etiquette: string;
  children: ReactNode;
  /** Occupe toute la largeur (adresses, références longues). */
  large?: boolean;
}) {
  return (
    <div className={`flex ${large ? 'items-start' : 'items-center'} gap-2 ${large ? 'md:col-span-2' : ''}`}>
      <MIcon name={icone} className="text-text-tertiary text-base" />
      <span className="text-text-secondary">{etiquette} :</span>
      <span className="font-bold text-on-surface break-words min-w-0">{children}</span>
    </div>
  );
}

/** Bouton secondaire du pied de modale (« Fermer »). */
export function BoutonFermer({ onClick, children }: { onClick: () => void; children?: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-4 py-2 text-label font-medium text-text-secondary hover:bg-border-default/40 rounded-lg transition-colors cursor-pointer"
    >
      {children ?? tx('Fermer')}
    </button>
  );
}

/** Bouton principal du pied de modale (action recommandée). */
export function BoutonPrincipal({
  onClick,
  icone,
  children,
  disabled = false,
}: {
  onClick: () => void;
  icone?: string;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="px-4 py-2 text-label font-bold text-white bg-primary-container hover:bg-primary-hover rounded-lg transition-transform active:scale-95 flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-60"
    >
      {icone && <MIcon name={icone} className="text-base" />}
      <span>{children}</span>
    </button>
  );
}
