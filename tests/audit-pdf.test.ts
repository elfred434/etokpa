import { beforeEach, describe, expect, it, vi } from "vitest";

const pdfCalls = vi.hoisted(() => ({
  addPage: vi.fn(),
  line: vi.fn(),
  rect: vi.fn(),
  roundedRect: vi.fn(),
  save: vi.fn(),
  setDrawColor: vi.fn(),
  setFillColor: vi.fn(),
  setFont: vi.fn(),
  setFontSize: vi.fn(),
  setPage: vi.fn(),
  setProperties: vi.fn(),
  setTextColor: vi.fn(),
  text: vi.fn(),
}));

vi.mock("jspdf", () => ({
  jsPDF: class {
    pages = 1;
    internal = {
      pageSize: { getWidth: () => 210, getHeight: () => 297 },
      getNumberOfPages: () => this.pages,
    };
    addPage() {
      this.pages += 1;
      pdfCalls.addPage();
    }
    line(...args: number[]) {
      pdfCalls.line(...args);
    }
    rect(...args: (number | string)[]) {
      pdfCalls.rect(...args);
    }
    roundedRect(...args: (number | string)[]) {
      pdfCalls.roundedRect(...args);
    }
    save(filename: string) {
      pdfCalls.save(filename);
    }
    setDrawColor(...args: number[]) {
      pdfCalls.setDrawColor(...args);
    }
    setFillColor(...args: number[]) {
      pdfCalls.setFillColor(...args);
    }
    setFont(...args: string[]) {
      pdfCalls.setFont(...args);
    }
    setFontSize(size: number) {
      pdfCalls.setFontSize(size);
    }
    setPage(page: number) {
      pdfCalls.setPage(page);
    }
    setProperties(properties: Record<string, string>) {
      pdfCalls.setProperties(properties);
    }
    setTextColor(...args: number[]) {
      pdfCalls.setTextColor(...args);
    }
    splitTextToSize(text: string) {
      return [text];
    }
    text(text: string | string[]) {
      pdfCalls.text(text);
    }
  },
}));

import { exportAuditLogsPdf } from "../src/utils/auditPdf";

beforeEach(() => vi.clearAllMocks());

describe("exportAuditLogsPdf", () => {
  it("uses the TOKPa receipt visual system and exports the selected audit entries", () => {
    exportAuditLogsPdf(
      [
        {
          action: "POST api/admin/users/14",
          created_at: "2026-10-12T09:30:00.000Z",
          details: { status: 201, payload: { nom: "Aïcha" } },
          ip_address: "192.0.2.20",
          user: { nom_complet: "Admin TOKPa", role: "admin" },
        },
      ],
      "audit-test.pdf",
    );

    expect(pdfCalls.save).toHaveBeenCalledWith("audit-test.pdf");
    expect(pdfCalls.rect).toHaveBeenCalledWith(0, 0, 210, 4, "F");
    expect(pdfCalls.setFillColor).toHaveBeenCalledWith(249, 115, 22);
    expect(pdfCalls.roundedRect).toHaveBeenCalled();
    const text = pdfCalls.text.mock.calls
      .map(([value]) => Array.isArray(value) ? value.join(" ") : value)
      .join(" ");
    expect(text).toContain("TOKPA");
    expect(text).toContain("JOURNAL D’AUDIT");
    expect(text).toContain("ÉVÉNEMENTS DU JOURNAL");
    expect(text).toContain("Création");
    expect(text).toContain("Admin TOKPa");
    expect(text).toContain("192.0.2.20");
    expect(text).toContain("HTTP 201");
    expect(text).toContain("Page 1 / 1");
  });

  it("adds branded pages and page footers instead of drawing through the bottom margin", () => {
    const logs = Array.from({ length: 30 }, (_, index) => ({
      action: `GET api/orders/${index + 1}`,
      created_at: "2026-10-12T09:30:00.000Z",
      details: { status: 200 },
      user: { nom_complet: "Admin TOKPa" },
    }));

    exportAuditLogsPdf(logs, "many-audit-entries.pdf");

    expect(pdfCalls.addPage.mock.calls.length).toBeGreaterThan(0);
    expect(pdfCalls.setPage.mock.calls.length).toBeGreaterThan(1);
    const text = pdfCalls.text.mock.calls
      .map(([value]) => Array.isArray(value) ? value.join(" ") : value)
      .join(" ");
    expect(text).toContain("JOURNAL D’AUDIT · SUITE");
    expect(text).toContain("Page 2 /");
    expect(pdfCalls.save).toHaveBeenCalledWith("many-audit-entries.pdf");
  });

  it("renders a branded empty state when the export has no events", () => {
    exportAuditLogsPdf([], "empty-audit.pdf");

    const text = pdfCalls.text.mock.calls
      .map(([value]) => Array.isArray(value) ? value.join(" ") : value)
      .join(" ");
    expect(text).toContain("0 événement");
    expect(text).toContain("Aucun événement à exporter.");
    expect(pdfCalls.roundedRect).toHaveBeenCalled();
    expect(pdfCalls.save).toHaveBeenCalledWith("empty-audit.pdf");
  });
});
