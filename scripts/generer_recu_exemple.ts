/**
 * Générateur de reçus témoins (hors application).
 *
 * Lit des paiements + commandes réels capturés depuis l'API dans
 * `/tmp/recu_reel.json` (voir scripts/README) puis écrit les PDF dans
 * `/home/user/exemples/`. Sert à contrôler la mise en page sans navigateur.
 *
 *   npx esbuild scripts/generer_recu_exemple.ts --bundle --platform=node \
 *     --format=cjs --outfile=/tmp/gen_recu.cjs && node /tmp/gen_recu.cjs
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { buildReceiptData, type ReceiptOrder, type ReceiptPayment } from '../src/services/receipts/receiptData';
import { buildReceiptPdf } from '../src/services/receipts/receiptPdf';
import { localeRecu, receiptLabels } from '../src/services/receipts/receiptLabels';

const SOURCE = '/tmp/recu_reel.json';
const DOSSIER = '/home/user/exemples';

if (!existsSync(SOURCE)) {
  console.error(`Source absente : ${SOURCE} (à produire avec le script de capture API).`);
  process.exit(1);
}

const brut = JSON.parse(readFileSync(SOURCE, 'utf8')) as Record<
  string,
  { payment: ReceiptPayment; order: ReceiptOrder }
>;
mkdirSync(DOSSIER, { recursive: true });

for (const [cle, { payment, order }] of Object.entries(brut)) {
  const data = buildReceiptData(payment, order);
  const doc = buildReceiptPdf(data, receiptLabels(), localeRecu());
  const buffer = Buffer.from(doc.output('arraybuffer'));
  const chemin = `${DOSSIER}/recu_reel_${cle}.pdf`;
  writeFileSync(chemin, buffer);
  console.log(
    `${chemin} — ${buffer.length} octets · paiement #${data.paymentId} (${data.statut}) · ` +
      `${data.lignes.length} article(s) · total ${data.total} FCFA`,
  );
}
