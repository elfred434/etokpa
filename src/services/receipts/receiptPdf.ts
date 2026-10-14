/**
 * Reçu de paiement — rendu PDF (jsPDF).
 *
 * A4 portrait construit ligne à ligne (texte vectoriel : net à l'impression,
 * quelques kilo-octets). Mise en page sur deux colonnes :
 *   gauche  = paiement + client · droite = commande + livraison + livreur.
 * Les libellés viennent de `receiptLabels()` : le reçu suit la langue de l'app.
 */
import { jsPDF } from 'jspdf';
import type { ReceiptData } from './receiptData';
import { nomFichierRecu } from './receiptData';

export type ReceiptLabels = {
  title: string;
  receiptNo: string;
  generatedAt: string;
  paidAt: string;
  notPaid: string;
  status: string;
  method: string;
  reference: string;
  paymentSection: string;
  client: string;
  livreur: string;
  order: string;
  delivery: string;
  phone: string;
  items: string;
  colName: string;
  colQty: string;
  colUnit: string;
  colTotal: string;
  noDetail: string;
  subtotal: string;
  deliveryFee: string;
  total: string;
  footer: string;
  statusLabels: Record<string, string>;
};

const M = 16;               // marge (mm)
const PAGE_W = 210;
const PAGE_H = 297;
const RIGHT = PAGE_W - M;   // 194
const COL_G = M;            // colonne gauche
const COL_D = M + 87;       // colonne droite (109)
const LARG = 87;            // largeur d'une colonne

const COLOR_PRIMARY: [number, number, number] = [249, 115, 22];
const COLOR_TEXT: [number, number, number] = [33, 33, 33];
const COLOR_MUTED: [number, number, number] = [110, 110, 110];
const COLOR_LINE: [number, number, number] = [222, 222, 222];
const COLOR_OK_BG: [number, number, number] = [220, 252, 231];
const COLOR_OK_TX: [number, number, number] = [22, 101, 52];
const COLOR_KO_BG: [number, number, number] = [254, 226, 226];
const COLOR_KO_TX: [number, number, number] = [153, 27, 27];

export function fmtMontant(n: number | null | undefined, locale = 'fr-FR'): string {
  return `${Number(n ?? 0).toLocaleString(locale)} FCFA`;
}

export function fmtDate(iso: string | null | undefined, locale = 'fr-FR'): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.toLocaleDateString(locale)} ${d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}`;
}

/** Titre de section souligné, propre à une colonne. */
function titreSection(doc: jsPDF, texte: string, y: number, x = COL_G, largeur = LARG): number {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...COLOR_PRIMARY);
  doc.text(texte.toUpperCase(), x, y);
  doc.setDrawColor(...COLOR_LINE);
  doc.line(x, y + 1.6, x + largeur, y + 1.6);
  return y + 6.5;
}

/** « Élibellé : valeur » — la valeur se replie dans la largeur de la colonne. */
function ligneChamp(
  doc: jsPDF,
  etiquette: string,
  valeur: string,
  y: number,
  x = COL_G,
  largeur = LARG,
): number {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.6);
  // Largeur du libellé mesurée dans la police : évite tout chevauchement
  // avec la valeur (« Référence de transaction » est le plus long).
  const libelle = `${etiquette} :`;
  const labW = Math.min(doc.getTextWidth(libelle) + 1.6, largeur * 0.62);
  doc.setTextColor(...COLOR_MUTED);
  doc.text(libelle, x, y);
  doc.setTextColor(...COLOR_TEXT);
  const lignes = doc.splitTextToSize(valeur || '—', largeur - labW) as string[];
  doc.text(lignes, x + labW, y);
  return y + 4.3 * Math.max(lignes.length, 1) + 1.4;
}

/** Construit le document (sans le sauvegarder) — pratique pour les tests. */
export function buildReceiptPdf(
  data: ReceiptData,
  labels: ReceiptLabels,
  locale = 'fr-FR',
): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  // ---------- En-tête ----------
  doc.setFillColor(...COLOR_PRIMARY);
  doc.rect(0, 0, PAGE_W, 4, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(...COLOR_PRIMARY);
  doc.text('TOKPA', M, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...COLOR_MUTED);
  doc.text('Marché de proximité — Cotonou (Bénin) · tokpa.bj', M, 25.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...COLOR_TEXT);
  doc.text(labels.title.toUpperCase(), RIGHT, 19, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...COLOR_MUTED);
  doc.text(`${labels.receiptNo} : ${data.receiptNumber}`, RIGHT, 24.5, { align: 'right' });
  doc.text(`${labels.generatedAt} : ${fmtDate(data.emisLe, locale)}`, RIGHT, 29, { align: 'right' });

  doc.setDrawColor(...COLOR_LINE);
  doc.line(M, 33, RIGHT, 33);

  // ---------- Bandeau de statut ----------
  const paye = data.paye;
  doc.setFillColor(...(paye ? COLOR_OK_BG : COLOR_KO_BG));
  doc.roundedRect(M, 37, PAGE_W - 2 * M, 12, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...(paye ? COLOR_OK_TX : COLOR_KO_TX));
  const statutTexte = labels.statusLabels[data.statut] ?? data.statut;
  doc.text(
    paye ? `${statutTexte} — ${labels.paidAt} ${fmtDate(data.paidAt, locale)}` : `${labels.notPaid} — ${statutTexte}`,
    M + 4,
    44.5,
  );

  // ---------- Colonne gauche : paiement, puis client ----------
  let g = titreSection(doc, labels.paymentSection, 58);
  g = ligneChamp(doc, labels.method, data.methode ?? '—', g);
  g = ligneChamp(doc, labels.reference, data.reference ?? '—', g);
  g = ligneChamp(doc, labels.status, statutTexte, g);
  g = ligneChamp(doc, labels.total, fmtMontant(data.total, locale), g);

  g += 3;
  g = titreSection(doc, labels.client, g);
  g = ligneChamp(doc, 'Nom', data.client.nom ?? '—', g);
  g = ligneChamp(doc, labels.phone, data.client.telephone ?? '—', g);

  // ---------- Colonne droite : commande, livraison, livreur ----------
  let d = titreSection(doc, labels.order, 58, COL_D);
  d = ligneChamp(doc, labels.order, data.orderId ? `#${data.orderId}` : '—', d, COL_D);
  d = ligneChamp(doc, labels.delivery, data.zoneLivraison ?? '—', d, COL_D);

  d += 3;
  d = titreSection(doc, labels.livreur, d, COL_D);
  d = ligneChamp(doc, 'Nom', data.livreur.nom ?? '—', d, COL_D);
  d = ligneChamp(doc, labels.phone, data.livreur.telephone ?? '—', d, COL_D);

  // ---------- Détail des articles ----------
  let bas = Math.max(g, d) + 6;
  bas = titreSection(doc, labels.items, bas, M, PAGE_W - 2 * M);

  const colQty = 130;
  const colUnit = 160;
  const colTotal = RIGHT;

  const enteteTableau = () => {
    doc.setFillColor(243, 244, 246);
    doc.rect(M, bas, PAGE_W - 2 * M, 7.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...COLOR_TEXT);
    doc.text(labels.colName, M + 2, bas + 5);
    doc.text(labels.colQty, colQty, bas + 5, { align: 'right' });
    doc.text(labels.colUnit, colUnit, bas + 5, { align: 'right' });
    doc.text(labels.colTotal, colTotal, bas + 5, { align: 'right' });
    bas += 9.5;
  };

  if (!data.detailDisponible) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(...COLOR_MUTED);
    doc.text(labels.noDetail, M, bas + 2);
    bas += 8;
  } else {
    enteteTableau();
    doc.setFontSize(8.8);
    for (const ligne of data.lignes) {
      const nom = doc.splitTextToSize(ligne.nom, 92) as string[];
      const hauteur = Math.max(6.5, nom.length * 4.4 + 2);
      if (bas + hauteur > PAGE_H - 42) {
        doc.addPage();
        bas = 24;
        enteteTableau();
      }
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLOR_TEXT);
      doc.text(nom, M + 2, bas + 3.4);
      doc.text(String(ligne.quantite), colQty, bas + 3.4, { align: 'right' });
      doc.text(fmtMontant(ligne.prixUnitaire, locale), colUnit, bas + 3.4, { align: 'right' });
      doc.text(fmtMontant(ligne.total, locale), colTotal, bas + 3.4, { align: 'right' });
      doc.setDrawColor(...COLOR_LINE);
      doc.line(M, bas + hauteur - 1.4, RIGHT, bas + hauteur - 1.4);
      bas += hauteur;
    }
  }

  // ---------- Totaux (bloc aligné à droite) ----------
  const lignesTotaux: Array<[string, string, boolean]> = [];
  if (data.sousTotal != null) lignesTotaux.push([labels.subtotal, fmtMontant(data.sousTotal, locale), false]);
  if (data.fraisLivraison != null) lignesTotaux.push([labels.deliveryFee, fmtMontant(data.fraisLivraison, locale), false]);
  lignesTotaux.push([labels.total, fmtMontant(data.total, locale), true]);

  let yTotal = bas + 8;
  if (yTotal + lignesTotaux.length * 8 > PAGE_H - 26) {
    doc.addPage();
    yTotal = 30;
  }
  for (const [etiquette, valeur, gras] of lignesTotaux) {
    if (gras) {
      doc.setDrawColor(...COLOR_PRIMARY);
      doc.line(128, yTotal - 4.6, RIGHT, yTotal - 4.6);
    }
    doc.setFont('helvetica', gras ? 'bold' : 'normal');
    doc.setFontSize(gras ? 11 : 9.2);
    doc.setTextColor(...(gras ? COLOR_TEXT : COLOR_MUTED));
    doc.text(etiquette, 130, yTotal);
    doc.setTextColor(...(gras ? COLOR_PRIMARY : COLOR_TEXT));
    doc.text(valeur, RIGHT, yTotal, { align: 'right' });
    yTotal += gras ? 8 : 6;
  }

  // ---------- Pied de page (dernière page) ----------
  const derniere = (doc as unknown as { internal: { getNumberOfPages(): number } }).internal.getNumberOfPages();
  doc.setPage(derniere);
  doc.setDrawColor(...COLOR_LINE);
  doc.line(M, PAGE_H - 18, RIGHT, PAGE_H - 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.6);
  doc.setTextColor(...COLOR_MUTED);
  doc.text(labels.footer, M, PAGE_H - 13);
  doc.text(data.receiptNumber, RIGHT, PAGE_H - 13, { align: 'right' });

  return doc;
}

/** Génère le reçu et déclenche le téléchargement. Renvoie le nom du fichier. */
export function downloadReceiptPdf(
  data: ReceiptData,
  labels: ReceiptLabels,
  locale = 'fr-FR',
): string {
  const doc = buildReceiptPdf(data, labels, locale);
  const nom = nomFichierRecu(data);
  doc.save(nom);
  return nom;
}
