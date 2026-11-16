import {
  Children,
  Fragment,
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import MIcon from './MIcon';
import { invokeDesign } from '../../utils/designRuntime';
import { tr } from '../../i18n/tx';

type Props = {
  children: ReactNode;
  /** Alignement du groupe dans la cellule (`right` par défaut pour les colonnes Actions). */
  align?: 'left' | 'right';
  /** Seuil au-delà duquel les boutons excédentaires passent dans le menu « Plus d'actions ». */
  maxInline?: number;
  className?: string;
};

type AnyElement = ReactElement<Record<string, unknown>>;

function flattenElements(node: ReactNode, out: AnyElement[] = []): AnyElement[] {
  Children.forEach(node, (child) => {
    if (child == null || typeof child === 'boolean') return;
    if (Array.isArray(child)) {
      flattenElements(child, out);
      return;
    }
    if (!isValidElement(child)) return;
    if (child.type === Fragment) {
      flattenElements((child.props as { children?: ReactNode }).children, out);
      return;
    }
    out.push(child as AnyElement);
  });
  return out;
}

function extractText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node).trim();
  if (Array.isArray(node)) return node.map(extractText).filter(Boolean).join(' ').trim();
  if (isValidElement(node)) {
    const props = node.props as { children?: ReactNode };
    return extractText(props.children);
  }
  return '';
}

function isIconOnlyChild(node: ReactNode): boolean {
  if (node == null || typeof node === 'boolean') return false;
  if (typeof node === 'string' || typeof node === 'number') return String(node).trim().length === 0;
  if (Array.isArray(node)) return node.every(isIconOnlyChild);
  if (isValidElement(node)) {
    if (node.type === MIcon || node.type === 'i' || node.type === 'svg') return true;
    const props = node.props as { children?: ReactNode };
    return isIconOnlyChild(props.children);
  }
  return false;
}

function findIconNode(node: ReactNode): ReactNode {
  if (!isValidElement(node)) return null;
  if (node.type === MIcon || node.type === 'i') return node;
  const props = node.props as { children?: ReactNode };
  if (Array.isArray(props.children)) {
    for (const c of props.children) {
      const found = findIconNode(c);
      if (found) return found;
    }
  } else if (props.children) {
    return findIconNode(props.children);
  }
  return null;
}

/**
 * Colonne `Actions` des tableaux :
 * - jusqu'à `maxInline` (2) actions : boutons affichés directement côte à côte ;
 * - au-delà de 2 actions : garde l'action principale visible et regroupe le reste
 *   dans un menu déroulant « Plus d'actions » (`⋮`) rendu en portail pour ne jamais
 *   être rogné par `overflow-hidden` / `overflow-x-auto`.
 */
export default function TableRowActions({
  children,
  align = 'right',
  maxInline = 2,
  className = '',
}: Props) {
  const items = flattenElements(children);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left?: number; right?: number }>({ top: 0, right: 0 });
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      const btn = triggerRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUpward = spaceBelow < 180 && rect.top > 180;
      const vertical = openUpward
        ? { bottom: Math.max(8, window.innerHeight - rect.top + 6) }
        : { top: rect.bottom + 6 };
      const horizontal =
        align === 'left'
          ? { left: Math.max(8, Math.min(rect.left, window.innerWidth - 210)) }
          : { right: Math.max(8, window.innerWidth - rect.right) };
      setPos({ ...vertical, ...horizontal });
    };
    updatePosition();

    const onMouseDown = (ev: MouseEvent) => {
      const target = ev.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') setOpen(false);
    };
    const onScrollOrResize = () => setOpen(false);

    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [open]);

  if (items.length === 0) return null;

  const justify = align === 'left' ? 'justify-start' : 'justify-end';

  if (items.length <= maxInline) {
    return (
      <div
        className={`inline-flex items-center ${justify} gap-1.5 whitespace-nowrap ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {items}
      </div>
    );
  }

  const primary = items[0];
  const overflow = items.slice(1);

  const renderOverflowItem = (el: AnyElement, idx: number) => {
    const props = el.props ?? {};
    const labelText =
      extractText(props.children as ReactNode) ||
      (typeof props['aria-label'] === 'string' ? props['aria-label'] : '') ||
      (typeof props.title === 'string' ? props.title : '') ||
      `Action ${idx + 2}`;
    const icon = isIconOnlyChild(props.children as ReactNode) ? findIconNode(el) : findIconNode(props.children as ReactNode);
    const disabled = Boolean(props.disabled);
    const origClass = typeof props.className === 'string' ? props.className : '';
    const isDanger = /\btext-error\b|\btext-red-/.test(origClass);
    const dataOnclick = typeof props['data-onclick'] === 'string' ? props['data-onclick'] : null;

    // Si c'est un <Link> ou un lien sans onClick, on clone l'élément en style menuitem
    if (el.type !== 'button' && !props.onClick && !dataOnclick) {
      return cloneElement(el, {
        key: el.key ?? idx,
        role: 'menuitem',
        className: `flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-label font-medium text-text-main hover:bg-bg-secondary transition-colors whitespace-nowrap ${isDanger ? 'text-error' : ''}`,
        onClick: (e: ReactMouseEvent<HTMLElement>) => {
          e.stopPropagation();
          setOpen(false);
        },
      });
    }

    return (
      <button
        key={el.key ?? idx}
        type="button"
        role="menuitem"
        disabled={disabled}
        aria-label={typeof props['aria-label'] === 'string' ? props['aria-label'] : labelText}
        title={typeof props.title === 'string' ? props.title : undefined}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(false);
          const origOnClick = props.onClick as ((ev: ReactMouseEvent<HTMLButtonElement>) => void) | undefined;
          if (origOnClick) origOnClick(e);
          if (dataOnclick) invokeDesign(dataOnclick, e.currentTarget, e.nativeEvent);
        }}
        className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-label font-medium transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
          isDanger
            ? 'text-error hover:bg-error-light'
            : 'text-text-main hover:bg-bg-secondary'
        }`}
      >
        {icon ? <span className="inline-flex shrink-0 items-center">{icon}</span> : null}
        <span>{labelText}</span>
      </button>
    );
  };

  return (
    <div
      className={`inline-flex items-center ${justify} gap-1.5 whitespace-nowrap ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {primary}
      <button
        ref={triggerRef}
        type="button"
        aria-label={tr("Plus d'actions", 'More actions')}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        title={tr("Plus d'actions", 'More actions')}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border-default bg-bg-card text-text-secondary hover:bg-bg-secondary hover:text-text-main transition-colors cursor-pointer"
      >
        <MIcon name="more_vert" className="text-[18px]" />
      </button>
      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            style={pos}
            className="fixed z-[90] min-w-[190px] rounded-xl border border-border-default bg-bg-card p-1.5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {overflow.map(renderOverflowItem)}
          </div>,
          document.body,
        )}
    </div>
  );
}
