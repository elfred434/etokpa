import { jsPDF } from "jspdf";
import { acteur, categorie, detail, quand, titre } from "./auditLog";
import { tr, tx } from "../i18n/tx";

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

type TextOptions = {
  size?: number;
  bold?: boolean;
  indent?: number;
  gap?: number;
};

function plainText(value: unknown, maxLength = 500): string {
  return String(value ?? "—")
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

/** Génère localement un PDF paginé à partir des journaux déjà renvoyés par l'API. */
export function exportAuditLogsPdf(
  logs: readonly AuditLogRecord[],
  filename: string,
): void {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 14;
  const bottomMargin = 14;
  let y = 18;

  const addText = (text: string, options: TextOptions = {}) => {
    const size = options.size ?? 10;
    const indent = options.indent ?? 0;
    const lineHeight = size * 0.48;
    const lines = pdf.splitTextToSize(
      plainText(text),
      pageWidth - margin * 2 - indent,
    );
    const blockHeight = Math.max(1, lines.length) * lineHeight;
    if (y + blockHeight > pageHeight - bottomMargin) {
      pdf.addPage();
      y = 18;
    }
    pdf.setFont("helvetica", options.bold ? "bold" : "normal");
    pdf.setFontSize(size);
    pdf.text(lines, margin + indent, y);
    y += blockHeight + (options.gap ?? 1.5);
  };

  pdf.setProperties({
    title: tx("Logs & Audit TOKPa"),
    subject: tx("Export des journaux d’audit"),
    creator: "TOKPa",
  });
  addText(tx("Logs & Audit TOKPa"), { size: 16, bold: true, gap: 2 });
  addText(
    tr(
      `Exporté le ${new Date().toLocaleString("fr-FR")}`,
      `Exported ${new Date().toLocaleString("en-GB")}`,
    ),
    { size: 9, gap: 2 },
  );
  addText(
    tr(
      `${logs.length} événement${logs.length > 1 ? "s" : ""}`,
      `${logs.length} event${logs.length > 1 ? "s" : ""}`,
    ),
    { size: 9, gap: 5 },
  );

  if (logs.length === 0) {
    addText(tx("Aucun événement à exporter."), { size: 10 });
  }

  logs.forEach((log, index) => {
    if (y + 20 > pageHeight - bottomMargin) {
      pdf.addPage();
      y = 18;
    }
    if (index > 0) {
      y += 1;
      pdf.setDrawColor(220, 220, 220);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 4;
    }
    const who = acteur(log);
    addText(`${quand(log.created_at)} · ${categorie(log)} — ${titre(log)}`, {
      size: 11,
      bold: true,
      gap: 1,
    });
    addText(`${tx("Action brute")} : ${plainText(log.action)}`, {
      size: 9,
      indent: 2,
      gap: 1,
    });
    addText(`${tx("Utilisateur")} : ${plainText(who.nom)}`, {
      size: 9,
      indent: 2,
      gap: 1,
    });
    addText(`${tx("IP")} : ${plainText(log.ip_address)}`, {
      size: 9,
      indent: 2,
      gap: 1,
    });
    addText(`${tx("Détail")} : ${plainText(detail(log))}`, {
      size: 9,
      indent: 2,
      gap: 3,
    });
  });

  pdf.save(filename);
}
