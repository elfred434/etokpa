import { useEffect } from 'react';
import { captureFrontendError } from '../services/errors/frontendErrorReporter';
import { tx } from '../i18n/tx';
import { adminDialogs } from '../components/shared/AdminActionDialogs';

/**
 * useDesignScript — exécute les interactions statiques des pages admin Stitch
 * SANS `eval`, SANS `new Function` et SANS `innerHTML` (conforme CSP stricte).
 */
export type DesignPresetId =
  | 'none'
  | 'admin-bdd'
  | 'admin-cles-api'
  | 'admin-parametres'
  | 'admin-securite'
  | 'admin-systeme';

type HandlerFn = (args: unknown[], el: Element, event: Event) => unknown;

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
  if (cssInjected || typeof document === 'undefined') return;
  cssInjected = true;
  const el = document.createElement('style');
  el.id = 'design-modal-css';
  el.textContent = MODAL_CSS;
  document.head.appendChild(el);
}

const WEBHOOK_PAYLOADS: Record<string, string> = {
  payloadAccepted: JSON.stringify(
    {
      event: 'order.negotiation.accepted',
      timestamp: 1698165721,
      data: {
        deal_id: 'neg_cotonou_88194',
        seller_id: 'usr_dantokpa_vendeuse_02',
        buyer_id: 'usr_client_porto_71',
        market_sector: 'Zone Textile & Wax',
        original_price_fcfa: 35000,
        agreed_price_fcfa: 29500,
        currency: 'XOF',
        escrow_hold_required: true,
      },
    },
    null,
    2,
  ),
  payloadPayment: JSON.stringify(
    {
      event: 'payment.fedapay.succeeded',
      timestamp: 1698165708,
      data: {
        transaction_id: 'tx_fed_bj_1092837',
        operator: 'MTN_MOMO_BENIN',
        customer_msisdn: '+22997001122',
        amount_xof: 29500,
        fees_xof: 295,
        net_seller_credit: 29205,
        status: 'APPROVED',
      },
    },
    null,
    2,
  ),
  payloadRider: JSON.stringify(
    {
      event: 'rider.location.updated',
      timestamp: 1698165690,
      data: {
        rider_id: 'rd_cotonou_12',
        latitude: 6.3654,
        longitude: 2.4289,
        heading: 124,
        speed_kmh: 28.4,
        delivery_batch_id: 'btch_dantokpa_exp_09',
      },
    },
    null,
    2,
  ),
  payload502: JSON.stringify(
    {
      error: 'Bad Gateway',
      status: 502,
      attempt: 3,
      target: 'https://partner-erp.dantokpa.org/v1/bills',
      details: 'Connection timed out after 2500ms upstream handshake.',
      next_retry_at: '2023-10-24T16:44:10Z',
    },
    null,
    2,
  ),
  payload404: JSON.stringify(
    {
      error: 'Not Found',
      status: 404,
      attempt: 1,
      target: 'https://audit.tokpa.bj/deprecated/hook',
      details: 'Route has been decommissioned since Migration v2.3.',
    },
    null,
    2,
  ),
};

let currentInspectedId = 'evt_983172';

function setButtonIconAndLabel(btn: Element, iconName: string, labelText: string, iconColorClass = '') {
  btn.textContent = '';
  const icon = document.createElement('span');
  icon.className = `material-symbols-outlined text-[14px] ${iconColorClass}`.trim();
  icon.textContent = iconName;
  const label = document.createElement('span');
  label.textContent = labelText;
  btn.append(icon, label);
}

function showBddToast(title: string, body: string) {
  const toast = document.getElementById('toast-banner');
  const toastTitle = document.getElementById('toast-title');
  const toastBody = document.getElementById('toast-body');
  if (!toast || !toastTitle || !toastBody) return;
  toastTitle.textContent = tx(title);
  toastBody.textContent = tx(body);
  toast.classList.remove('hidden', 'translate-y-4');
  toast.classList.add('flex', 'translate-y-0');
  setTimeout(() => {
    toast.classList.add('translate-y-4');
    setTimeout(() => {
      toast.classList.add('hidden');
      toast.classList.remove('flex');
    }, 300);
  }, 4000);
}

function showApiToast(message: string, isError = false) {
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toast-msg');
  const toastIcon = document.getElementById('toast-icon');
  if (!toast || !toastMsg || !toastIcon) return;
  toastMsg.textContent = tx(message);
  toastIcon.textContent = isError ? 'error' : 'check_circle';
  toastIcon.className = isError
    ? 'material-symbols-outlined text-[20px] text-error'
    : 'material-symbols-outlined text-[20px] text-success';
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 2800);
}

function closeBddActionModal() {
  const modal = document.getElementById('cli-modal');
  const modalContainer = document.getElementById('modal-container');
  if (!modal) return;
  if (modalContainer) {
    modalContainer.classList.remove('scale-100');
    modalContainer.classList.add('scale-95');
  }
  setTimeout(() => {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }, 150);
}

const HANDLERS: Record<string, HandlerFn> = {
  // AdminParametresPage
  switchTab: ([tabId], el) => {
    const buttons = document.querySelectorAll('.tab-btn');
    const contents = document.querySelectorAll('.tab-content');
    buttons.forEach((b) => {
      b.className =
        'tab-btn flex items-center gap-xs px-md py-sm rounded-lg font-label text-label text-text-secondary hover:text-text-main hover:bg-bg-secondary transition-all active:scale-95';
    });
    el.className =
      'tab-btn flex items-center gap-xs px-md py-sm rounded-lg font-label text-label transition-all bg-surface-container-low text-primary-container font-semibold shadow-sm active:scale-95';
    contents.forEach((c) => {
      if (c.id === String(tabId)) c.classList.remove('hidden');
      else c.classList.add('hidden');
    });
  },

  // AdminSecuritePage
  toggleSecret: ([id, rawVal, maskedVal], el) => {
    const target = document.getElementById(String(id));
    if (!target) return;
    const icon = el.querySelector('.material-symbols-outlined');
    const isMasked = target.textContent === String(maskedVal);
    target.textContent = isMasked ? String(rawVal) : String(maskedVal);
    if (icon) {
      icon.textContent = isMasked ? 'visibility_off' : 'visibility';
      icon.classList.toggle('text-primary', isMasked);
    }
  },

  // AdminBddPage
  showExplainPlan: ([planText]) => {
    const drawer = document.getElementById('explain-drawer');
    const content = document.getElementById('explain-content');
    if (drawer && content) {
      content.textContent = String(planText ?? '');
      drawer.classList.remove('hidden');
      drawer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  },
  closeExplainPlan: () => {
    document.getElementById('explain-drawer')?.classList.add('hidden');
  },
  openActionModal: ([title, cliCommand]) => {
    const modal = document.getElementById('cli-modal');
    const modalContainer = document.getElementById('modal-container');
    const modalTitle = document.getElementById('modal-title');
    const modalCmd = document.getElementById('modal-cli-command');
    const pwdInput = document.getElementById('root-password') as HTMLInputElement | null;
    const errorMsg = document.getElementById('modal-error-msg');
    if (modal && modalTitle && modalCmd) {
      modalTitle.textContent = tx(String(title ?? ''));
      modalCmd.textContent = String(cliCommand ?? '');
      if (pwdInput) pwdInput.value = '';
      errorMsg?.classList.add('hidden');
      modal.classList.remove('hidden');
      modal.classList.add('flex');
      setTimeout(() => {
        if (modalContainer) {
          modalContainer.classList.remove('scale-95');
          modalContainer.classList.add('scale-100');
        }
        pwdInput?.focus();
      }, 50);
    }
  },
  closeActionModal: () => closeBddActionModal(),
  togglePasswordVisibility: () => {
    const pwdInput = document.getElementById('root-password') as HTMLInputElement | null;
    const icon = document.getElementById('pw-toggle-icon');
    if (pwdInput && icon) {
      const hidden = pwdInput.type === 'password';
      pwdInput.type = hidden ? 'text' : 'password';
      icon.textContent = hidden ? 'visibility_off' : 'visibility';
    }
  },
  executeActionSafeguard: (_args, _el, event) => {
    event.preventDefault();
    const pwdInput = document.getElementById('root-password') as HTMLInputElement | null;
    const submitBtn = document.getElementById('btn-submit-action') as HTMLButtonElement | null;
    const errorMsg = document.getElementById('modal-error-msg');
    if (!pwdInput || pwdInput.value.length < 4) {
      errorMsg?.classList.remove('hidden');
      return;
    }
    if (submitBtn) {
      submitBtn.disabled = true;
      setButtonIconAndLabel(submitBtn, 'sync', tx('Exécution en cours...'));
      submitBtn.firstElementChild?.classList.add('animate-spin');
    }
    setTimeout(() => {
      closeBddActionModal();
      if (submitBtn) {
        submitBtn.disabled = false;
        setButtonIconAndLabel(submitBtn, 'lock_open', tx("Confirmer l'Exécution"));
      }
      showBddToast("Succès de l'opération", "La tâche système s'est exécutée et a été auditée (Code 0).");
    }, 1200);
  },
  retryQueueJobs: ([queueName]) => {
    const name = String(queueName ?? '');
    const btn = document.getElementById(`retry-btn-${name}`) as HTMLButtonElement | null;
    if (!btn) return;
    setButtonIconAndLabel(btn, 'sync', tx('Relance...'));
    btn.firstElementChild?.classList.add('animate-spin');
    btn.disabled = true;
    setTimeout(() => {
      setButtonIconAndLabel(btn, 'done', '0 failed', 'text-success');
      btn.classList.remove('bg-error-light', 'text-error-dark');
      btn.classList.add('bg-success-light', 'text-success-dark');
      showBddToast('File réenclenchée', `Les jobs échoués de "${name}" ont été renvoyés aux workers avec backoff.`);
    }, 1000);
  },
  refreshSlowQueries: () => {
    showBddToast('Actualisation pg_stat_statements', 'Analyseurs mis à jour avec les requêtes des 10 dernières minutes.');
  },

  // AdminClesApiPage
  switchEnv: ([env]) => {
    const prodBtn = document.getElementById('env-prod');
    const sandBtn = document.getElementById('env-sandbox');
    if (!prodBtn || !sandBtn) return;
    const activeCls = 'flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-card text-text-main font-label text-label shadow-sm transition-all';
    const idleCls = 'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-text-secondary hover:text-text-main font-label text-label transition-all';
    if (env === 'prod') {
      prodBtn.className = activeCls;
      sandBtn.className = idleCls;
      showApiToast('Basculé en mode PRODUCTION (Données Réelles)');
    } else {
      sandBtn.className = activeCls;
      prodBtn.className = idleCls;
      showApiToast('Basculé en mode SANDBOX (Simulateur Cotonou)');
    }
  },
  copyToken: ([text], el) => {
    navigator.clipboard?.writeText(String(text ?? '')).then(() => {
      showApiToast('Secret copié dans le presse-papier');
      const icon = el.querySelector('.material-symbols-outlined');
      if (icon) {
        icon.textContent = 'check';
        setTimeout(() => {
          icon.textContent = 'content_copy';
        }, 1500);
      }
    }).catch(() => undefined);
  },
  revealToken: ([elementId, fullToken], el) => {
    const elem = document.getElementById(String(elementId ?? ''));
    const icon = el.querySelector('.material-symbols-outlined');
    if (!elem || !icon) return;
    const full = String(fullToken ?? '');
    if ((elem.textContent ?? '').includes('••••')) {
      elem.textContent = full;
      icon.textContent = 'visibility_off';
    } else {
      elem.textContent = `${full.slice(0, 19)}••••••••`;
      icon.textContent = 'visibility';
    }
  },
  rotateKey: ([serviceName]) => {
    const name = String(serviceName ?? '');
    void adminDialogs
      .confirm(
        `Confirmez-vous la régénération du secret API pour "${name}" ? Le jeton précédent sera révoqué dans une heure.`,
        { title: 'Confirmer la régénération', confirmLabel: 'Régénérer', danger: true },
      )
      .then((confirmed) => {
        if (confirmed) showApiToast(`Clé régénérée pour ${name}`);
      });
  },
  editScopes: ([serviceName, currentScopes]) => {
    const name = String(serviceName ?? '');
    void adminDialogs
      .prompt(
        `Modifier les scopes pour ${name} (séparés par virgules):`,
        String(currentScopes ?? ''),
        { title: 'Modifier les scopes', confirmLabel: 'Enregistrer', placeholder: 'Scopes séparés par des virgules', multiline: true },
      )
      .then((newScopes) => {
        if (newScopes !== null) showApiToast(`Scopes mis à jour pour ${name}`);
      });
  },
  revokeKey: ([serviceName]) => {
    const name = String(serviceName ?? '');
    void adminDialogs
      .confirm(
        `ATTENTION : Voulez-vous RÉVOQUER IMMÉDIATEMENT la clé pour "${name}" ? Les requêtes entrantes seront rejetées.`,
        { title: 'Confirmer la révocation', confirmLabel: 'Révoquer', danger: true },
      )
      .then((confirmed) => {
        if (confirmed) showApiToast(`Clé révoquée pour ${name}`, true);
      });
  },
  testGateway: ([gwName]) => {
    const name = String(gwName ?? '');
    showApiToast(`Test de connectivité en cours vers ${name}...`);
    setTimeout(() => showApiToast(`Passerelle ${name} : Handshake 200 OK (Latence <95ms)`), 600);
  },
  inspectWebhook: ([id, evt, status, url, latency, time, payload]) => {
    currentInspectedId = String(id ?? '');
    const setText = (elId: string, val: string) => {
      const node = document.getElementById(elId);
      if (node) node.textContent = val;
    };
    setText('inspected-id', currentInspectedId);
    setText('inspected-event', String(evt ?? ''));
    setText('inspected-url', String(url ?? ''));
    setText('inspected-time', String(time ?? ''));
    setText('inspected-latency', `Latence: ${String(latency ?? '')}`);
    const statusCode = Number(status);
    const statusElem = document.getElementById('inspected-status');
    if (statusElem) {
      statusElem.textContent = `HTTP ${statusCode}${statusCode === 200 ? ' OK' : statusCode === 502 ? ' Bad Gateway' : ' Not Found'}`;
      statusElem.className =
        statusCode === 200
          ? 'px-2 py-0.5 rounded font-mono text-[11px] font-bold bg-[#10B981]/20 text-[#10B981]'
          : statusCode === 502
            ? 'px-2 py-0.5 rounded font-mono text-[11px] font-bold bg-error/20 text-error'
            : 'px-2 py-0.5 rounded font-mono text-[11px] font-bold bg-[#FEF3C7]/20 text-[#D97706]';
    }
    setText('json-viewer', String(payload ?? ''));
  },
  retryWebhook: ([id]) => {
    const evtId = String(id || currentInspectedId);
    showApiToast(`Rejeu du webhook ${evtId} envoyé...`);
    setTimeout(() => showApiToast(`Événement ${evtId} rejoué : Cible 200 OK`), 700);
  },
  copyJsonPayload: () => {
    const code = document.getElementById('json-viewer')?.textContent ?? '';
    navigator.clipboard?.writeText(code).then(() => showApiToast('JSON payload copié')).catch(() => undefined);
  },
  testWebhooksModal: () => {
    showApiToast("Simulation d'un tir d'événement 'test.ping' sur tous les endpoints...");
  },
  refreshWebhookStream: () => {
    showApiToast('Actualisation du flux de télémétrie...');
  },
  openKeyModal: () => {
    document.getElementById('key-modal')?.classList.remove('hidden');
  },
  closeKeyModal: () => {
    document.getElementById('key-modal')?.classList.add('hidden');
  },
  submitNewKey: () => {
    const input = document.getElementById('new-key-name') as HTMLInputElement | null;
    const name = input?.value?.trim() ?? '';
    if (!name) {
      void adminDialogs.alert('Veuillez renseigner un nom de service.', { title: 'Nom manquant' });
      return;
    }
    document.getElementById('key-modal')?.classList.add('hidden');
    showApiToast(`Nouvelle clé générée pour "${name}"`);
    if (input) input.value = '';
  },

  // AdminSystemePage (sans eval / innerHTML)
  toggleCircuitBreaker: ([variant], el) => {
    const knob = el.firstElementChild;
    if (variant === 'maintenance') {
      el.classList.toggle('bg-error');
      knob?.classList.toggle('translate-x-4');
    } else if (variant === 'cdn') {
      el.classList.toggle('bg-secondary-container');
      knob?.classList.toggle('translate-x-4');
    } else {
      el.classList.toggle('bg-error');
      el.classList.toggle('bg-success');
      knob?.classList.toggle('translate-x-1');
      knob?.classList.toggle('translate-x-5');
    }
  },
  clearTerminal: () => {
    const terminal = document.getElementById('terminalContent');
    if (!terminal) return;
    terminal.textContent = '';
    const notice = document.createElement('div');
    notice.className = 'text-micro text-text-secondary';
    notice.textContent = '-- Console nettoyée par opérateur --';
    terminal.appendChild(notice);
  },
  terminalKeyDown: (_args, el, event) => {
    const kb = event as KeyboardEvent;
    if (kb.key !== 'Enter') return;
    const input = el as HTMLInputElement;
    const cmd = input.value.trim();
    if (!cmd) return;
    const terminal = document.getElementById('terminalContent');
    if (terminal) {
      const row = document.createElement('div');
      row.className = 'text-white font-bold';
      row.textContent = `[CMD EXEC] ${cmd}`;
      terminal.appendChild(row);
      terminal.scrollTop = terminal.scrollHeight;
    }
    input.value = '';
  },
  closeKillSwitchModal: () => {
    const modal = document.getElementById('killSwitchModal');
    modal?.classList.add('hidden');
    modal?.classList.remove('flex');
  },
  confirmKillSwitch: () => {
    void adminDialogs
      .alert("Procédure d’interruption déclenchée. Logs envoyés au canal DevOps Slack.", { title: 'Action effectuée' })
      .then(() => {
        const modal = document.getElementById('killSwitchModal');
        modal?.classList.add('hidden');
        modal?.classList.remove('flex');
      });
  },
};

function parseSafeArgs(rawArgs: string, el: Element, event: Event): unknown[] {
  const args: unknown[] = [];
  let i = 0;
  const s = rawArgs.trim();
  while (i < s.length) {
    while (i < s.length && (s[i] === ' ' || s[i] === ',' || s[i] === '\t')) i += 1;
    if (i >= s.length) break;
    const ch = s[i]!;
    if (ch === "'" || ch === '"') {
      const quote = ch;
      i += 1;
      let val = '';
      while (i < s.length && s[i] !== quote) {
        if (s[i] === '\\' && i + 1 < s.length) {
          const next = s[i + 1]!;
          val += next === 'n' ? '\n' : next === 't' ? '\t' : next;
          i += 2;
        } else {
          val += s[i]!;
          i += 1;
        }
      }
      i += 1; // closing quote
      args.push(val);
    } else {
      let token = '';
      while (i < s.length && s[i] !== ',') {
        token += s[i]!;
        i += 1;
      }
      const trimmed = token.trim();
      if (trimmed === 'this') args.push(el);
      else if (trimmed === 'event') args.push(event);
      else if (trimmed === 'currentInspectedId') args.push(currentInspectedId);
      else if (trimmed in WEBHOOK_PAYLOADS) args.push(WEBHOOK_PAYLOADS[trimmed]);
      else if (/^-?\d+(\.\d+)?$/.test(trimmed)) args.push(Number(trimmed));
      else if (trimmed === 'true') args.push(true);
      else if (trimmed === 'false') args.push(false);
      else args.push(trimmed);
    }
  }
  return args;
}

function invokeSafeCall(code: string, el: Element, event: Event): void {
  const trimmed = code.trim();
  if (!trimmed) return;
  if (trimmed === 'event.stopPropagation()') {
    event.stopPropagation();
    return;
  }
  // Supporte `fn(args)` ou `tx('...')` imbriqué dans le premier arg d'openActionModal
  const unwrapped = trimmed.replace(/\btx\((['"])((?:\\.|(?!\1).)*)\1\)/g, '$1$2$1');
  const match = /^([A-Za-z_][A-Za-z0-9_]*)\(([\s\S]*)\)$/.exec(unwrapped);
  if (!match) {
    captureFrontendError(new Error('Disallowed design handler expression'), { source: 'design-runtime' });
    return;
  }
  const fnName = match[1]!;
  const fn = HANDLERS[fnName];
  if (!fn) {
    captureFrontendError(new Error(`Unknown design handler: ${fnName}`), { source: 'design-runtime' });
    return;
  }
  const args = parseSafeArgs(match[2] ?? '', el, event);
  fn(args, el, event);
}

/** Ferme une modale via son attribut de fermeture sûr, sinon masquage direct. */
function closeViaDesign(root: HTMLElement) {
  const candidates = [root, ...Array.from(root.querySelectorAll<HTMLElement>('[data-onclick]'))];
  const closer = candidates.find((el) => /close|toggle|dismiss|hide|ferm/i.test(el.getAttribute('data-onclick') ?? ''));
  if (closer) {
    const code = closer.getAttribute('data-onclick')!;
    try {
      invokeSafeCall(code, closer, new Event('click'));
      return;
    } catch {
      /* bascule sur le masquage direct */
    }
  }
  root.classList.add('hidden');
  root.style.setProperty('display', 'none');
}

function enhanceModals(): Array<() => void> {
  injectModalCss();
  const offs: Array<() => void> = [];
  document.querySelectorAll<HTMLElement>('div.fixed.inset-0').forEach((root) => {
    root.classList.add('design-modal-root');
    const kids = Array.from(root.children) as HTMLElement[];
    const panel = kids.find((k) => !k.classList.contains('absolute')) ?? kids[kids.length - 1] ?? root;
    panel.classList.add('design-modal-scroll');
    if (!/\bmax-h-/.test(panel.className)) panel.style.setProperty('max-height', '90vh');
    panel.style.setProperty('overflow-y', 'auto');
    root.querySelectorAll<HTMLElement>('.scrollbar-hide').forEach((el) => el.classList.remove('scrollbar-hide'));
    const onClick = (e: Event) => {
      if (panel.contains(e.target as Node)) return;
      closeViaDesign(root);
    };
    root.addEventListener('click', onClick);
    offs.push(() => root.removeEventListener('click', onClick));
  });
  return offs;
}

function setupPresetListeners(preset: string): Array<() => void> {
  const offs: Array<() => void> = [];

  if (preset === 'admin-cles-api') {
    const searchInput = document.getElementById('api-search');
    if (searchInput) {
      const onInput = (e: Event) => {
        const query = ((e.target as HTMLInputElement).value ?? '').toLowerCase();
        document.querySelectorAll('tbody tr').forEach((row) => {
          const text = (row.textContent ?? '').toLowerCase();
          (row as HTMLElement).style.display = text.includes(query) ? '' : 'none';
        });
      };
      searchInput.addEventListener('input', onInput);
      offs.push(() => searchInput.removeEventListener('input', onInput));
    }
  }

  if (preset === 'admin-parametres') {
    const saveBtn = document.getElementById('saveChangesBtn');
    const toastEl = document.getElementById('saveToast');
    if (saveBtn && toastEl) {
      const onSave = () => {
        toastEl.classList.remove('translate-y-24', 'opacity-0');
        toastEl.classList.add('translate-y-0', 'opacity-100');
        setTimeout(() => {
          toastEl.classList.remove('translate-y-0', 'opacity-100');
          toastEl.classList.add('translate-y-24', 'opacity-0');
        }, 3500);
      };
      saveBtn.addEventListener('click', onSave);
      offs.push(() => saveBtn.removeEventListener('click', onSave));
    }

    const marketToggle = document.getElementById('marketStatusToggle');
    const badgeText = document.getElementById('marketBadgeText');
    const badgeWrapper = document.getElementById('marketBadgeWrapper');
    if (marketToggle && badgeText && badgeWrapper) {
      const onToggle = (e: Event) => {
        const checked = (e.target as HTMLInputElement).checked;
        if (checked) {
          badgeWrapper.className =
            'inline-flex items-center gap-xs px-md py-xs rounded-full bg-success-light text-success font-label text-label font-semibold';
          badgeText.textContent = tx('Marché Actif • Prise de commande en direct');
        } else {
          badgeWrapper.className =
            'inline-flex items-center gap-xs px-md py-xs rounded-full bg-error-light text-error font-label text-label font-semibold';
          badgeText.textContent = tx('Marché Fermé • Précommandes uniquement');
        }
      };
      marketToggle.addEventListener('change', onToggle);
      offs.push(() => marketToggle.removeEventListener('change', onToggle));
    }
  }

  if (preset === 'admin-systeme') {
    const killBtn = document.getElementById('killSwitchBtn');
    const killModal = document.getElementById('killSwitchModal');
    if (killBtn && killModal) {
      const onKillClick = () => {
        killModal.classList.remove('hidden');
        killModal.classList.add('flex');
      };
      killBtn.addEventListener('click', onKillClick);
      offs.push(() => killBtn.removeEventListener('click', onKillClick));
    }

    const streamPauseBtn = document.getElementById('streamPauseBtn');
    let isPaused = false;
    if (streamPauseBtn) {
      const onPause = () => {
        isPaused = !isPaused;
        setButtonIconAndLabel(streamPauseBtn, isPaused ? 'play_arrow' : 'pause', isPaused ? 'Resume Stream' : 'Pause Stream');
      };
      streamPauseBtn.addEventListener('click', onPause);
      offs.push(() => streamPauseBtn.removeEventListener('click', onPause));
    }

    const terminal = document.getElementById('terminalContent');
    const mockLogs = [
      { level: 'INFO', text: '[order.dispatch] Delivery assigned to rider #RD-249 (Zone: Marché Dantokpa)' },
      { level: 'DEBUG', text: '[db.pool] pgsql_read_pool active connections: 28 / 100' },
      { level: 'INFO', text: '[cache.invalidate] Category cache purged: /category/vivres-frais' },
    ];
    let logIdx = 0;
    const intervalId = setInterval(() => {
      if (isPaused || !terminal) return;
      const item = mockLogs[logIdx % mockLogs.length]!;
      logIdx += 1;
      const now = `${new Date().toTimeString().split(' ')[0]}.${Math.floor(Math.random() * 900 + 100)}`;
      const color = item.level === 'INFO' ? 'text-[#10B981]' : item.level === 'WARN' ? 'text-[#F59E0B]' : 'text-[#38BDF8]';
      const row = document.createElement('div');
      row.className = 'text-[#6B7280]';
      const ts = document.createTextNode(`[${now}] `);
      const lvl = document.createElement('span');
      lvl.className = `${color} font-bold`;
      lvl.textContent = `[${item.level}]`;
      const sp = document.createTextNode(' ');
      const msg = document.createElement('span');
      msg.className = 'text-white';
      msg.textContent = item.text;
      row.append(ts, lvl, sp, msg);
      terminal.insertBefore(row, terminal.lastElementChild);
      terminal.scrollTop = terminal.scrollHeight;
    }, 4500);
    offs.push(() => clearInterval(intervalId));
  }

  return offs;
}

/** Dispatche un handler `data-on*` via l'annuaire déclaratif sûr (sans `eval`). */
export function invokeDesign(code: string, el: Element, event: Event): void {
  try {
    invokeSafeCall(code, el, event);
  } catch (error) {
    captureFrontendError(error, { source: 'design-runtime' });
  }
}

export function useDesignScript(presetOrScript: string) {
  useEffect(() => {
    const trimmed = presetOrScript.trim();
    if (!trimmed) return;
    const offs: Array<() => void> = [];
    for (const [attr, evt] of Object.entries(EVENT_FOR)) {
      document.querySelectorAll<HTMLElement>(`[${attr}]`).forEach((el) => {
        const code = el.getAttribute(attr) ?? '';
        const handler = (e: Event) => invokeDesign(code, el, e);
        el.addEventListener(evt, handler);
        offs.push(() => el.removeEventListener(evt, handler));
      });
    }
    offs.push(...setupPresetListeners(trimmed));
    offs.push(...enhanceModals());
    return () => {
      offs.forEach((f) => f());
    };
  }, [presetOrScript]);
}
