import { jsPDF } from "jspdf";
import { acteur, categorie, detail, titre } from "./auditLog";
import { tr, tx, uiLang } from "../i18n/tx";

type AuditLogRecord = {
  action?: string;
  created_at?: string | null;
  details?: {
    event?: string;
    status?: number;
    payload?: Record<string, unknown>;
  };
  ip_address?: string | null;
  user_id?: number;
  user?: {
    nom_complet?: string;
    prenom?: string;
    nom?: string;
    email?: string;
    role?: string | { nom?: string } | null;
  } | null;
};

type RGB = [number, number, number];
type PreparedAuditRecord = {
  log: AuditLogRecord;
  category: string;
  color: RGB;
  titleLines: string[];
  actionLines: string[];
  actorLines: string[];
  ipLines: string[];
  detailLines: string[];
  height: number;
};

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 16;
const RIGHT = PAGE_W - MARGIN;
const CONTENT_W = PAGE_W - 2 * MARGIN;
const CARD_INSET = 5;
const BODY_W = CONTENT_W - CARD_INSET * 2;
const LABEL_GAP = 2;
const ACTION_LABEL_W = 26;
const ACTOR_LABEL_W = 25;
const ACTOR_VALUE_W = 78;
const COLUMNS_GAP = 4;
const IP_LABEL_W = 10;
const IP_VALUE_W = BODY_W - ACTOR_LABEL_W - LABEL_GAP - ACTOR_VALUE_W - COLUMNS_GAP - IP_LABEL_W - LABEL_GAP;
const DETAIL_LABEL_W = 26;

const COLOR_PRIMARY: RGB = [249, 115, 22];
const COLOR_TEXT: RGB = [33, 33, 33];
const COLOR_MUTED: RGB = [110, 110, 110];
const COLOR_LINE: RGB = [222, 222, 222];
const COLOR_PANEL: RGB = [250, 250, 250];
const CATEGORY_COLORS: Record<string, RGB> = {
  CATALOGUE: [249, 115, 22],
  CONFIG: [249, 115, 22],
  COMMANDE: [16, 185, 129],
  VALIDATION: [16, 185, 129],
  AUTH: [59, 130, 246],
  PAYMENT: [59, 130, 246],
  UTILISATEUR: [239, 68, 68],
  SYSTEM: [239, 68, 68],
};

function plainText(value: unknown, maxLength = 500): string {
  return String(value ?? "—")
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength) || "—";
}

function localeAudit(): string {
  switch (uiLang()) {
    case "en": return "en-GB";
    case "es": return "es-ES";
    case "de": return "de-DE";
    case "pt": return "pt-PT";
    default: return "fr-FR";
  }
}

function dateComplete(value: string | null | undefined, locale: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" });
}

function lightColor(color: RGB): RGB {
  return color.map((channel) => Math.round(channel * 0.14 + 255 * 0.86)) as RGB;
}

function wrap(doc: jsPDF, value: unknown, width: number, size: number, bold = false): string[] {
  doc.setFont("helvetica", bold ? "bold" : "normal");
  doc.setFontSize(size);
  const lines = doc.splitTextToSize(plainText(value), width) as string[];
  return lines.length ? lines : ["—"];
}

function lineHeight(size: number): number {
  return Math.max(3.4, size * 0.44);
}

function prepareRecord(doc: jsPDF, log: AuditLogRecord): PreparedAuditRecord {
  const category = plainText(categorie(log), 40).toUpperCase();
  const actor = acteur(log);
  const actorText = actor.sous && actor.sous !== "—" ? `${actor.nom} · ${actor.sous}` : actor.nom;
  const titleLines = wrap(doc, titre(log), BODY_W, 10.2, true);
  const actionLines = wrap(doc, log.action, BODY_W - ACTION_LABEL_W - LABEL_GAP, 8.2);
  const actorLines = wrap(doc, actorText, ACTOR_VALUE_W, 8.2);
  const ipLines = wrap(doc, log.ip_address, IP_VALUE_W, 8.2);
  const detailLines = wrap(doc, detail(log), BODY_W - DETAIL_LABEL_W - LABEL_GAP, 8.2);
  const height = 14
    + titleLines.length * lineHeight(10.2) + 2
    + actionLines.length * lineHeight(8.2) + 2.5
    + Math.max(actorLines.length, ipLines.length) * lineHeight(8.2) + 2.5
    + detailLines.length * lineHeight(8.2) + 4;

  return {
    log,
    category,
    color: CATEGORY_COLORS[category] ?? COLOR_PRIMARY,
    titleLines,
    actionLines,
    actorLines,
    ipLines,
    detailLines,
    height,
  };
}

function drawHeader(doc: jsPDF, count: number, locale: string, continuation = false): number {
  doc.setFillColor(...COLOR_PRIMARY);
  doc.rect(0, 0, PAGE_W, 4, "F");

  if (continuation) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...COLOR_PRIMARY);
    doc.text("TOKPA", MARGIN, 18);
    doc.setFontSize(10);
    doc.setTextColor(...COLOR_TEXT);
    doc.text(tr("JOURNAL D’AUDIT · SUITE", "AUDIT LOG · CONTINUED"), RIGHT, 17.5, { align: "right" });
    doc.setDrawColor(...COLOR_LINE);
    doc.line(MARGIN, 24, RIGHT, 24);
    return 34;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.setTextColor(...COLOR_PRIMARY);
  doc.text("TOKPA", MARGIN, 20);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...COLOR_MUTED);
  doc.text("Marché de proximité — Cotonou (Bénin) · tokpa.bj", MARGIN, 25.5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...COLOR_TEXT);
  doc.text(tr("JOURNAL D’AUDIT", "AUDIT LOG"), RIGHT, 19, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...COLOR_MUTED);
  const generatedAt = new Date().toLocaleString(locale);
  doc.text(tr(`Exporté le ${generatedAt}`, `Exported ${generatedAt}`), RIGHT, 24.5, { align: "right" });
  const countLabel = tr(
    `${count.toLocaleString(locale)} événement${count === 1 ? "" : "s"}`,
    `${count.toLocaleString(locale)} event${count === 1 ? "" : "s"}`,
  );
  doc.text(countLabel, RIGHT, 29, { align: "right" });

  doc.setDrawColor(...COLOR_LINE);
  doc.line(MARGIN, 33, RIGHT, 33);
  doc.setFillColor(255, 247, 237);
  doc.roundedRect(MARGIN, 37, CONTENT_W, 12, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...COLOR_PRIMARY);
  doc.text(
    tr(`${countLabel} exporté${count === 1 ? "" : "s"}`, `${countLabel} exported`),
    MARGIN + 4,
    44.5,
  );
  return 58;
}

function drawSectionTitle(doc: jsPDF, y: number): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...COLOR_PRIMARY);
  doc.text(tr("ÉVÉNEMENTS DU JOURNAL", "AUDIT EVENTS"), MARGIN, y);
  doc.setDrawColor(...COLOR_LINE);
  doc.line(MARGIN, y + 1.6, RIGHT, y + 1.6);
  return y + 7;
}

function drawLabel(doc: jsPDF, text: string, x: number, y: number): void {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.1);
  doc.setTextColor(...COLOR_MUTED);
  doc.text(text.toUpperCase(), x, y);
}

function drawValue(doc: jsPDF, lines: string[], x: number, y: number): void {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.2);
  doc.setTextColor(...COLOR_TEXT);
  doc.text(lines, x, y);
}

function drawRecordCard(doc: jsPDF, record: PreparedAuditRecord, y: number, locale: string): void {
  const { log, category, color } = record;
  doc.setFillColor(...COLOR_PANEL);
  doc.setDrawColor(...COLOR_LINE);
  doc.roundedRect(MARGIN, y, CONTENT_W, record.height, 2, 2, "FD");
  doc.setFillColor(...color);
  doc.rect(MARGIN, y + 2, 2.2, record.height - 4, "F");

  doc.setFillColor(...lightColor(color));
  doc.roundedRect(MARGIN + CARD_INSET, y + 3, 43, 6.5, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.4);
  doc.setTextColor(...color);
  doc.text(category, MARGIN + 8, y + 7.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...COLOR_MUTED);
  doc.text(dateComplete(log.created_at, locale), RIGHT - 4, y + 7.5, { align: "right" });

  const contentX = MARGIN + CARD_INSET;
  let textY = y + 14;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.2);
  doc.setTextColor(...COLOR_TEXT);
  doc.text(record.titleLines, contentX, textY);
  textY += record.titleLines.length * lineHeight(10.2) + 2;

  drawLabel(doc, tx("Action brute"), contentX, textY);
  drawValue(doc, record.actionLines, contentX + ACTION_LABEL_W + LABEL_GAP, textY);
  textY += record.actionLines.length * lineHeight(8.2) + 2.5;

  const ipLabelX = contentX + ACTOR_LABEL_W + LABEL_GAP + ACTOR_VALUE_W + COLUMNS_GAP;
  drawLabel(doc, tx("Utilisateur"), contentX, textY);
  drawValue(doc, record.actorLines, contentX + ACTOR_LABEL_W + LABEL_GAP, textY);
  drawLabel(doc, tx("IP"), ipLabelX, textY);
  drawValue(doc, record.ipLines, ipLabelX + IP_LABEL_W + LABEL_GAP, textY);
  textY += Math.max(record.actorLines.length, record.ipLines.length) * lineHeight(8.2) + 2.5;

  drawLabel(doc, tx("Détail"), contentX, textY);
  drawValue(doc, record.detailLines, contentX + DETAIL_LABEL_W + LABEL_GAP, textY);
}

function drawEmptyState(doc: jsPDF, y: number): void {
  doc.setFillColor(...COLOR_PANEL);
  doc.setDrawColor(...COLOR_LINE);
  doc.roundedRect(MARGIN, y, CONTENT_W, 25, 2, 2, "FD");
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(...COLOR_MUTED);
  doc.text(tx("Aucun événement à exporter."), PAGE_W / 2, y + 14, { align: "center" });
}

function drawFooters(doc: jsPDF): void {
  const pageCount = (doc.internal as unknown as { getNumberOfPages: () => number }).getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(...COLOR_LINE);
    doc.line(MARGIN, PAGE_H - 18, RIGHT, PAGE_H - 18);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.6);
    doc.setTextColor(...COLOR_MUTED);
    doc.text(tr("Document généré par TOKPa — journal d’audit.", "Generated by TOKPa — audit log."), MARGIN, PAGE_H - 13);
    doc.text(tr(`Page ${page} / ${pageCount}`, `Page ${page} / ${pageCount}`), RIGHT, PAGE_H - 13, { align: "right" });
  }
}

/** Génère un PDF paginé au style des reçus TOKPa à partir des journaux déjà renvoyés par l'API. */
export function exportAuditLogsPdf(
  logs: readonly AuditLogRecord[],
  filename: string,
): void {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const locale = localeAudit();
  pdf.setProperties({
    title: tx("Logs & Audit TOKPa"),
    subject: tx("Export des journaux d’audit"),
    creator: "TOKPa",
  });

  let y = drawHeader(pdf, logs.length, locale);
  y = drawSectionTitle(pdf, y);
  if (logs.length === 0) {
    drawEmptyState(pdf, y);
  } else {
    for (const log of logs) {
      const record = prepareRecord(pdf, log);
      if (y + record.height > PAGE_H - 24) {
        pdf.addPage();
        y = drawHeader(pdf, logs.length, locale, true);
        y = drawSectionTitle(pdf, y);
      }
      drawRecordCard(pdf, record, y, locale);
      y += record.height + 5;
    }
  }

  drawFooters(pdf);
  pdf.save(filename);
}
