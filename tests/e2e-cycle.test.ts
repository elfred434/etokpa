// @vitest-environment jsdom
/**
 * E2E « tout le cycle » piloté UNIQUEMENT par le frontend : chaque étape passe par
 * les services API du frontend (src/services/api/*) et le vrai client axios, contre
 * l'API Laravel démarrée localement. Aucun mock HTTP.
 *
 * Cycle : inscription client → 2FA → catalogue public → zone du livreur → panier →
 * commande → paiement FedaPay simulé (SDK absent) → webhook FedaPay (acteur externe)
 * → paiement réussi → commande en préparation → assignation manager → acceptation
 * livreur → en_livraison → livré → historique ; puis 2ᵉ commande pour le REFUS livreur.
 *
 * Lancement : VITE_API_BASE_URL=http://127.0.0.1:8000/api npx vitest run tests/e2e-cycle.test.ts
 */
import { existsSync, readFileSync } from 'node:fs';
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
/** Journal Laravel (MAIL_MAILER=log) : sandbox, puis machine Windows de l'utilisateur. */
const LARAVEL_LOG =
  process.env.LARAVEL_LOG ||
  [
    '/opt/etokpa_back/storage/logs/laravel.log',
    'C:\\xampp\\htdocs\\etokpa_back\\storage\\logs\\laravel.log',
  ].find((p) => existsSync(p)) ||
  '';
const TIMEOUT = 60_000;

/** Ce fichier teste contre une VRAIE API locale : sans elle, on saute tout. */
let apiUp = false;
try {
  const probe = await axios.get(`${API}/products`, { timeout: 3000, adapter: 'http' });
  apiUp = probe.status === 200;
} catch {
  apiUp = false;
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

/** Le code 2FA est envoyé par mail ; MAIL_MAILER=log l'écrit dans laravel.log. */
function lastOtpFromLog(): string {
  const log = readFileSync(LARAVEL_LOG, 'utf-8');
  const codes = log.match(/\b\d{6}\b/g) ?? [];
  const code = codes[codes.length - 1];
  if (!code) throw new Error('Aucun code 2FA trouvé dans laravel.log');
  return code;
}

/** Connexion + 2FA via les services frontend ; la session (token) est posée par authApi. */
async function connect(email: string, password = 'Tokpa2026!') {
  const login: any = await authApi.login({ email, password });
  expect(login.requires_2fa ?? login.data?.requires_2fa).toBeTruthy();
  await authApi.verify2fa({ email, code: lastOtpFromLog() });
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

describe.skipIf(!apiUp || !LARAVEL_LOG)('cycle complet via le frontend', () => {
  it('inscrit un client, valide la 2FA et ouvre la session', async () => {
    state.email = `cycle.${Date.now()}@tokpa.bj`;
    const reg: any = await authApi.register({
      nom: 'Cycle',
      prenom: 'E2E',
      email: state.email,
      telephone: `229${String(Date.now()).slice(-8)}`,
      password: 'Tokpa2026!',
      role: 'client',
      quartier: 'Cotonou',
    });
    expect(reg.success).toBe(true);
    expect(/2FA/i.test(String(reg.message ?? ''))).toBe(true);

    await authApi.verify2fa({ email: state.email, code: lastOtpFromLog() });
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
