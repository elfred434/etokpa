// Gabarit de modale fiche détaillée (bandeau, cartes d’informations et pied d’actions).
import type { ReactNode } from 'react';
import MIcon from './MIcon';
import { tx } from '../../i18n/tx';

type ModalShellProps = {
  titre: ReactNode;
  sousTitre?: ReactNode;
  icone: string;
  onFermer: () => void;
  children: ReactNode;
  pied?: ReactNode;
  maxWidth?: number;
  zIndex?: number;
  testId?: string;
};

// Composant modale ModalShell : gère l’ouverture, les actions et la fermeture.
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
  // Retourne le rendu JSX du composant.
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

        <div className="p-6 space-y-4 overflow-y-auto flex-1">{children}</div>

        {pied && (
          <div className="px-6 py-4 bg-bg-secondary border-t border-border-default flex flex-wrap items-center justify-between gap-3 shrink-0">
            {pied}
          </div>
        )}
      </div>
    </div>
  );
}

// Composant React BandeauFiche : prépare l’état et affiche son interface.
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
  // Retourne le rendu JSX du composant.
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

// Composant React FicheCard : prépare l’état et affiche son interface.
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
  // Retourne le rendu JSX du composant.
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

// Composant React LigneFiche : prépare l’état et affiche son interface.
export function LigneFiche({
  icone,
  etiquette,
  children,
  large = false,
}: {
  icone: string;
  etiquette: string;
  children: ReactNode;
  large?: boolean;
}) {
  // Retourne le rendu JSX du composant.
  return (
    <div className={`flex ${large ? 'items-start' : 'items-center'} gap-2 ${large ? 'md:col-span-2' : ''}`}>
      <MIcon name={icone} className="text-text-tertiary text-base" />
      <span className="text-text-secondary">{etiquette} :</span>
      <span className="font-bold text-on-surface break-words min-w-0">{children}</span>
    </div>
  );
}

// Composant React BoutonFermer : prépare l’état et affiche son interface.
export function BoutonFermer({ onClick, children }: { onClick: () => void; children?: ReactNode }) {
  // Retourne le rendu JSX du composant.
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

// Composant React BoutonPrincipal : prépare l’état et affiche son interface.
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
  // Retourne le rendu JSX du composant.
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
