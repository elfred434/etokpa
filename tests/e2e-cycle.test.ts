// @vitest-environment jsdom
/**
 * E2E « tout le cycle » piloté par le frontend : chaque étape passe par les
 * services API et le vrai client axios, contre une API Laravel locale de test.
 * Aucun mock HTTP.
 *
 * Garde-fous : le test ne contacte rien sans opt-in explicite, base jetable,
 * paiement local DEV et hôtes loopback. Les OTP sont lus depuis une instance
 * Mailpit temporaire (SMTP + API v1), uniquement en mémoire; jamais depuis les logs.
 * Aucun achat ni paiement fournisseur réel n'est effectué.
 *
 * Variables requises : TOKPA_E2E_ENABLED=1, TOKPA_E2E_DISPOSABLE_DB=1,
 * TOKPA_E2E_PAYMENT_MODE=DEV, TOKPA_E2E_PASSWORD (environnement uniquement),
 * VITE_API_BASE_URL=http://127.0.0.1:8000/api, MAILPIT_API_URL=http://127.0.0.1:8025.
 * Le serveur Laravel doit utiliser SMTP
 * vers Mailpit, jamais MAIL_MAILER=log. Lancer avec Vitest sur cette suite seule.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import axios from 'axios';
import { apiClient } from '../src/services/api/client';
import { authApi } from '../src/services/api/auth';
import { catalogApi } from '../src/services/api/catalog';
import { cartApi } from '../src/services/api/cart';
import { ordersApi } from '../src/services/api/orders';
import { paymentsApi } from '../src/services/api/payments';
import { managerApi } from '../src/services/api/manager';
import { livreurApi } from '../src/services/api/livreur';

const API = process.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api';
const MAILPIT_API = (process.env.MAILPIT_API_URL || 'http://127.0.0.1:8025').replace(/\/+$/, '');
const TIMEOUT = 60_000;
const E2E_PASSWORD = process.env.TOKPA_E2E_PASSWORD ?? '';
const OTP_TIMEOUT = 30_000;
const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '[::1]']);

function isCredentialFreeLoopback(value: string): boolean {
  try {
    const url = new URL(value);
    return !url.username && !url.password && LOOPBACK_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

const e2eOptIn =
  E2E_PASSWORD.length >= 8 &&
  process.env.TOKPA_E2E_ENABLED === '1' &&
  process.env.TOKPA_E2E_DISPOSABLE_DB === '1' &&
  process.env.TOKPA_E2E_PAYMENT_MODE === 'DEV' &&
  isCredentialFreeLoopback(API) &&
  isCredentialFreeLoopback(MAILPIT_API);

/** Ne sonde jamais le backend de l'utilisateur sans opt-in et base jetable. */
let apiUp = false;
let mailpitUp = false;
if (e2eOptIn) {
  try {
    const probe = await axios.get(`${API.replace(/\/+$/, '')}/products`, { timeout: 3000, adapter: 'http' });
    apiUp = probe.status === 200;
  } catch {
    apiUp = false;
  }
  try {
    const probe = await axios.get(`${MAILPIT_API}/api/v1/info`, { timeout: 3000, adapter: 'http' });
    mailpitUp = probe.status === 200;
  } catch {
    mailpitUp = false;
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */

const state: {
  email?: string;
  orderId?: number;
  paymentId?: number;
  fedapayRef?: string;
  landmarkId?: number;
  productId?: number;
  livreurId?: number;
  livreurZoneId?: number;
  refuseOrderId?: number;
} = {};

function otpFromMailBody(value: unknown): string | null {
  const text = String(value ?? '').replace(/<[^>]*>/g, ' ');
  return text.match(/(?:code|otp)[^\d]{0,80}(\d{6})/i)?.[1] ?? null;
}

/** Lit le message ciblé depuis l'API locale Mailpit; aucun OTP n'est journalisé ou conservé. */
async function otpFromMailpit(email: string, requestedAt: number): Promise<string> {
  const deadline = Date.now() + OTP_TIMEOUT;
  while (Date.now() < deadline) {
    try {
      const search = await axios.get(`${MAILPIT_API}/api/v1/search`, {
        params: { query: `to:"${email}"`, limit: 10 },
        timeout: 3000,
        adapter: 'http',
      });
      const messages: any[] = Array.isArray(search.data?.messages) ? search.data.messages : [];
      for (const summary of messages) {
        const id = String(summary?.ID ?? '');
        if (!id) continue;
        const receivedAt = Date.parse(String(summary?.Created ?? ''));
        if (Number.isFinite(receivedAt) && receivedAt < requestedAt - 5000) continue;
        const recipients = Array.isArray(summary?.To) ? summary.To : [];
        const recipientMatches = recipients.length === 0 || recipients.some((recipient: any) =>
          String(recipient?.Address ?? recipient).toLowerCase() === email.toLowerCase(),
        );
        if (!recipientMatches) continue;
        const detail = await axios.get(`${MAILPIT_API}/api/v1/message/${encodeURIComponent(id)}`, {
          timeout: 3000,
          adapter: 'http',
        });
        const code = otpFromMailBody(`${detail.data?.Text ?? ''}\n${detail.data?.HTML ?? ''}`);
        if (code) return code;
      }
    } catch {
      // L'email peut être encore en file; ne jamais inclure le contenu du message dans l'erreur.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('Le code 2FA n’a pas été reçu dans Mailpit dans le délai prévu.');
}

/** Connexion + 2FA via les services frontend ; la session (token) est posée par authApi. */
async function connect(email: string, password = E2E_PASSWORD) {
  const requestedAt = Date.now();
  const login: any = await authApi.login({ email, password });
  expect(login.requires_2fa ?? login.data?.requires_2fa).toBeTruthy();
  await authApi.verify2fa({ email, code: await otpFromMailpit(email, requestedAt) });
  expect(localStorage.getItem('tokpa_token')).toBeTruthy();
}

function userProfile(payload: any) {
  return payload?.data ?? payload;
}

/** Lignes de liste : chaque élément peut être enveloppé par une JsonResource { data }. */
function rows(payload: any): any[] {
  const list = payload?.data ?? payload ?? [];
  return (Array.isArray(list) ? list : []).map((x: any) => x?.data ?? x);
}

beforeAll(() => {
  localStorage.clear();
  // En jsdom, axios prendrait l'adaptateur XHR (CORS jsdom) : on garde l'adaptateur
  // http de Node, le client frontend (intercepteurs, base URL) restant réel.
  apiClient.defaults.adapter = 'http';
  axios.defaults.adapter = 'http';
});

afterAll(() => {
  localStorage.clear();
});

describe('lecture OTP Mailpit en mémoire', () => {
  it('extrait le code du corps texte ou HTML sans écrire le contenu', () => {
    expect(otpFromMailBody('Votre code de vérification est : 123456')).toBe('123456');
    expect(otpFromMailBody('<p>OTP: <strong>654321</strong></p>')).toBe('654321');
    expect(otpFromMailBody('Référence de commande 123456')).toBeNull();
  });
});

describe.skipIf(!e2eOptIn || !apiUp || !mailpitUp)('cycle complet via le frontend', () => {
  it('inscrit un client, valide la 2FA et ouvre la session', async () => {
    state.email = `cycle.${Date.now()}@tokpa.bj`;
    const requestedAt = Date.now();
    const reg: any = await authApi.register({
      nom: 'Cycle',
      prenom: 'E2E',
      email: state.email,
      telephone: `+229${String(Date.now()).slice(-8)}`,
      password: E2E_PASSWORD,
      password_confirmation: E2E_PASSWORD,
      accept_cgu: true,
      opt_in_sms: true,
      ville: 'Cotonou',
      role: 'client',
      quartier: 'Cadjehoun',
    });
    expect(reg.success).toBe(true);
    expect(/2FA/i.test(String(reg.message ?? ''))).toBe(true);

    await authApi.verify2fa({ email: state.email, code: await otpFromMailpit(state.email, requestedAt) });
    expect(localStorage.getItem('tokpa_token')).toBeTruthy();
  }, TIMEOUT);

  it('lit le catalogue public (sans rien devoir au rôle)', async () => {
    const products: any = await catalogApi.getProducts();
    const list = products?.data ?? products ?? [];
    expect(list.length).toBeGreaterThan(0);
    state.productId = Number(list[0].id);
  }, TIMEOUT);

  it('repère la zone du livreur seedé et y choisit un point de repère', async () => {
    await connect('livreur@tokpa.bj');
    const profile: any = userProfile(await authApi.getProfile());
    state.livreurId = Number(profile.id);
    state.livreurZoneId = Number(
      profile.profil?.zone?.id ?? profile.profil?.zone_id ?? profile.livreur?.zone?.id ?? profile.zone_id,
    );
    expect(state.livreurId).toBeGreaterThan(0);
    expect(state.livreurZoneId).toBeGreaterThan(0);

    const zones: any = await catalogApi.getZones();
    const zone = (zones?.data ?? zones ?? []).find((z: any) => Number(z.id) === state.livreurZoneId);
    expect(zone).toBeTruthy();
    const repere = (zone.points_repere ?? zone.landmarks ?? [])[0];
    expect(repere).toBeTruthy();
    state.landmarkId = Number(repere.id);
  }, TIMEOUT);

  it('remplit le panier du compte connecté', async () => {
    await connect(state.email!);
    await cartApi.addToCart(state.productId!, 2);
    const cart: any = await cartApi.getCart();
    const lines = cart?.data ?? cart ?? [];
    const line = lines.find((l: any) => Number(l.product_id) === state.productId);
    expect(line).toBeTruthy();
    expect(Number(line.quantite)).toBe(2);
  }, TIMEOUT);

  it('passe la commande, puis ouvre le paiement FedaPay simulé (SDK absent)', async () => {
    const created: any = await ordersApi.createOrder(
      {
        items: [{ product_id: state.productId!, quantite: 2 }],
        landmark_id: state.landmarkId!,
        payment_method: 'fedapay',
      },
      `e2e-${Date.now()}`,
    );
    const body = created?.data ?? created;
    const orderRaw = body?.order ?? body;
    const order = orderRaw?.data ?? orderRaw;
    state.orderId = Number(order?.id);
    expect(state.orderId).toBeGreaterThan(0);

    let paymentRaw = body?.payment;
    if (!paymentRaw) {
      const initiated: any = await paymentsApi.initPayment({ order_id: state.orderId }, `e2e-pay-${Date.now()}`);
      paymentRaw = initiated?.data ?? initiated;
    }
    let payment = paymentRaw?.data ?? paymentRaw;
    payment = payment?.payment ?? payment;
    state.paymentId = Number(payment?.id);
    state.fedapayRef = String(payment?.fedapay_ref ?? '');
    expect(state.paymentId).toBeGreaterThan(0);
    expect(state.fedapayRef.startsWith('DEV-')).toBe(true);
  }, TIMEOUT);

  it('reçoit le webhook FedaPay (acteur externe) : paiement réussi, commande en préparation', async () => {
    const res = await axios.get(`${API}/webhooks/fedapay`, {
      params: { entity: { id: state.fedapayRef, status: 'approved' } },
      maxRedirects: 0,
      validateStatus: (s) => s >= 200 && s < 400,
    });
    expect(res.status).toBeLessThan(400);

    const payment: any = await paymentsApi.getPayment(state.paymentId!);
    expect(payment?.statut ?? payment?.data?.statut).toBe('reussi');

    const order: any = await ordersApi.getOrder(state.orderId!);
    expect(order?.statut ?? order?.data?.statut).toBe('en_preparation');
  }, TIMEOUT);

  it('le manager assigne le livreur de la zone', async () => {
    await connect('manager@tokpa.bj');
    const assigned: any = await managerApi.assignLivreur(state.orderId!, state.livreurId!);
    expect(assigned).toBeTruthy();
  }, TIMEOUT);

  it('le livreur accepte la course puis la mène à « livré »', async () => {
    await connect('livreur@tokpa.bj');
    const list = rows(await livreurApi.getDeliveries());
    expect(list.some((d: any) => Number(d.id) === state.orderId)).toBe(true);

    await livreurApi.acceptDelivery(state.orderId!);
    await livreurApi.updateStatus(state.orderId!, 'en_livraison');
    await livreurApi.updateStatus(state.orderId!, 'livre');

    const hist = rows(await livreurApi.getHistory(1));
    expect(hist.some((h: any) => Number(h.id) === state.orderId)).toBe(true);
  }, TIMEOUT);

  it('le client retrouve sa commande livrée', async () => {
    await connect(state.email!);
    const order: any = await ordersApi.getOrder(state.orderId!);
    expect(order?.statut ?? order?.data?.statut).toBe('livre');
  }, TIMEOUT);

  it('seconde commande : le livreur REFUSE la course, elle retourne en file', async () => {
    const created: any = await ordersApi.createOrder(
      {
        items: [{ product_id: state.productId!, quantite: 1 }],
        landmark_id: state.landmarkId!,
        payment_method: 'cash',
      },
      `e2e-refus-${Date.now()}`,
    );
    const body = created?.data ?? created;
    const orderRaw = body?.order ?? body;
    state.refuseOrderId = Number((orderRaw?.data ?? orderRaw)?.id);
    expect(state.refuseOrderId).toBeGreaterThan(0);

    await connect('manager@tokpa.bj');
    await managerApi.assignLivreur(state.refuseOrderId!, state.livreurId!);

    await connect('livreur@tokpa.bj');
    expect(rows(await livreurApi.getDeliveries()).some((d: any) => Number(d.id) === state.refuseOrderId)).toBe(true);

    await livreurApi.refuseDelivery(state.refuseOrderId!);

    expect(rows(await livreurApi.getDeliveries()).some((d: any) => Number(d.id) === state.refuseOrderId)).toBe(false);
  }, TIMEOUT);
});
