import { beforeEach, describe, expect, it, vi } from "vitest";

const pdfCalls = vi.hoisted(() => ({
  addPage: vi.fn(),
  line: vi.fn(),
  save: vi.fn(),
  setFont: vi.fn(),
  setFontSize: vi.fn(),
  setProperties: vi.fn(),
  text: vi.fn(),
}));

vi.mock("jspdf", () => ({
  jsPDF: class {
    internal = { pageSize: { getWidth: () => 210, getHeight: () => 297 } };
    addPage() {
      pdfCalls.addPage();
    }
    line(...args: number[]) {
      pdfCalls.line(...args);
    }
    save(filename: string) {
      pdfCalls.save(filename);
    }
    setFont(...args: string[]) {
      pdfCalls.setFont(...args);
    }
    setFontSize(size: number) {
      pdfCalls.setFontSize(size);
    }
    setProperties(properties: Record<string, string>) {
      pdfCalls.setProperties(properties);
    }
    splitTextToSize(text: string) {
      return [text];
    }
    text(text: string | string[]) {
      pdfCalls.text(text);
    }
    setDrawColor() {}
  },
}));

import { exportAuditLogsPdf } from "../src/utils/auditPdf";

beforeEach(() => vi.clearAllMocks());

describe("exportAuditLogsPdf", () => {
  it("exports the selected audit entries and saves a PDF", () => {
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
    const text = pdfCalls.text.mock.calls.flat().join(" ");
    expect(text).toContain("Logs & Audit TOKPa");
    expect(text).toContain("Création");
    expect(text).toContain("Admin TOKPa");
    expect(text).toContain("192.0.2.20");
    expect(text).toContain("HTTP 201");
  });

  it("starts new pages rather than drawing through the bottom margin", () => {
    const logs = Array.from({ length: 30 }, (_, index) => ({
      action: `GET api/orders/${index + 1}`,
      created_at: "2026-10-12T09:30:00.000Z",
      details: { status: 200 },
      user: { nom_complet: "Admin TOKPa" },
    }));

    exportAuditLogsPdf(logs, "many-audit-entries.pdf");

    expect(pdfCalls.addPage.mock.calls.length).toBeGreaterThan(0);
    expect(pdfCalls.save).toHaveBeenCalledWith("many-audit-entries.pdf");
  });
});
