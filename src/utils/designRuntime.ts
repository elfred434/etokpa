import { useEffect } from 'react';

/**
 * useDesignScript — exécute le script JS d'un code.html Stitch à l'affichage
 * (copie conforme du comportement : modales, onglets, filtres, toasts…).
 *
 * - Le convertisseur html2jsx préserve les handlers inline en attributs `data-on*`.
 * - Le script du design (porté tel quel) déclare ses fonctions ; les `data-on*`
 *   sont dispatchés dans SON scope via `eval` (this = l'élément, event fourni).
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

function build(script: string): Runtime {
  // Le script du design + une rampe d'invocation dans SON scope (eval local).
  // eslint-disable-next-line no-new-func
  const factory = new Function(
    `${script}\n;return { invoke: function (code, el, event) { return eval(code); } };`,
  ) as () => Runtime;
  return factory();
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
    return () => {
      offs.forEach((f) => f());
    };
  }, [script]);
}
