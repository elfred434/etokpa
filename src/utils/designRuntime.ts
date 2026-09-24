import { useEffect } from 'react';

/**
 * useDesignScript — exécute le script JS d'un code.html Stitch à l'affichage
 * (copie conforme du comportement : modales, onglets, filtres, toasts…).
 *
 * - Le convertisseur html2jsx préserve les handlers inline en attributs `data-on*`.
 * - Le script du design (porté tel quel) déclare ses fonctions ; les `data-on*`
 *   sont dispatchés dans SON scope via `eval` (this = l'élément, event fourni).
 * - enhanceModals : barre de défilement visible sur les panneaux de modale +
 *   clic en dehors = fermeture (via le close du design de préférence).
 */
type Runtime = { invoke: (code: string, el: Element, event: Event) => unknown };

const EVENT_FOR: Record<string, string> = {
  'data-onclick': 'click',
  'data-onchange': 'change',
  'data-oninput': 'input',
  'data-onsubmit': 'submit',
  'data-onkeydown': 'keydown',
  'data-onkeyup': 'keyup',
  'data-onfocus': 'focus',
  'data-onblur': 'blur',
  'data-onmouseover': 'mouseover',
  'data-onmouseenter': 'mouseenter',
};

const MODAL_CSS = `
.design-modal-scroll { scrollbar-width: thin; scrollbar-color: rgba(60,45,38,0.35) transparent; }
.design-modal-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
.design-modal-scroll::-webkit-scrollbar-thumb { background: rgba(60,45,38,0.35); border-radius: 8px; }
.design-modal-scroll::-webkit-scrollbar-track { background: transparent; }
`;

let cssInjected = false;
function injectModalCss() {
  if (cssInjected) return;
  cssInjected = true;
  const el = document.createElement('style');
  el.id = 'design-modal-css';
  el.textContent = MODAL_CSS;
  document.head.appendChild(el);
}

function build(script: string): Runtime {
  // Le script du design + une rampe d'invocation dans SON scope (eval local).
  // eslint-disable-next-line no-new-func
  const factory = new Function(
    `${script}\n;return { invoke: function (code, el, event) { return eval(code); } };`,
  ) as () => Runtime;
  return factory();
}

/** Ferme une modale via le close du design (data-onclick), sinon masquage direct. */
function closeViaDesign(root: HTMLElement, rt: Runtime) {
  const candidates = [root, ...Array.from(root.querySelectorAll<HTMLElement>('[data-onclick]'))];
  const closer = candidates.find((el) => /close|toggle|dismiss|hide|ferm/i.test(el.getAttribute('data-onclick') ?? ''));
  if (closer) {
    const code = closer.getAttribute('data-onclick')!;
    try {
      rt.invoke.call(closer, code.replace(/\bthis\b/g, 'closer'), closer, new Event('click'));
      return;
    } catch {
      /* bascule sur le masquage direct */
    }
  }
  root.classList.add('hidden');
  root.style.setProperty('display', 'none');
}

/** Modales : scroll visible + fermeture au clic en dehors du panneau. */
function enhanceModals(rt: Runtime): Array<() => void> {
  injectModalCss();
  const offs: Array<() => void> = [];
  document.querySelectorAll<HTMLElement>('div.fixed.inset-0').forEach((root) => {
    root.classList.add('design-modal-root');
    const kids = Array.from(root.children) as HTMLElement[];
    const panel = kids.find((k) => !k.classList.contains('absolute')) ?? kids[kids.length - 1] ?? root;
    // barre de défilement : hauteur bornée + scroll auto + barre visible
    panel.classList.add('design-modal-scroll');
    if (!/\bmax-h-/.test(panel.className)) panel.style.setProperty('max-height', '90vh');
    panel.style.setProperty('overflow-y', 'auto');
    // scrollbars volontairement masquées dans les designs → on les réaffiche dans la modale
    root.querySelectorAll<HTMLElement>('.scrollbar-hide').forEach((el) => el.classList.remove('scrollbar-hide'));
    // clic en dehors du panneau = fermeture
    const onClick = (e: Event) => {
      if (panel.contains(e.target as Node)) return;
      closeViaDesign(root, rt);
    };
    root.addEventListener('click', onClick);
    offs.push(() => root.removeEventListener('click', onClick));
  });
  return offs;
}

export function useDesignScript(script: string) {
  useEffect(() => {
    if (!script.trim()) return;
    let rt: Runtime;
    try {
      rt = build(script);
    } catch (err) {
      console.warn('[designScript] erreur à la lecture du script du design :', err);
      return;
    }
    const offs: Array<() => void> = [];
    for (const [attr, evt] of Object.entries(EVENT_FOR)) {
      document.querySelectorAll<HTMLElement>(`[${attr}]`).forEach((el) => {
        const code = el.getAttribute(attr) ?? '';
        const handler = (e: Event) => {
          try {
            rt.invoke.call(el, code.replace(/\bthis\b/g, 'el'), el, e);
          } catch (err) {
            console.warn('[designScript] action', code, err);
          }
        };
        el.addEventListener(evt, handler);
        offs.push(() => el.removeEventListener(evt, handler));
      });
    }
    offs.push(...enhanceModals(rt));
    return () => {
      offs.forEach((f) => f());
    };
  }, [script]);
}
