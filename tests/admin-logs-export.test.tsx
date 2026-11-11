// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAuditLogs: vi.fn(),
  exportAuditLogsPdf: vi.fn(),
}));

vi.mock("../src/services/api", () => ({
  adminApi: {
    getAuditLogs: (...args: unknown[]) => mocks.getAuditLogs(...args),
  },
}));
vi.mock("../src/utils/auditPdf", () => ({
  exportAuditLogsPdf: (...args: unknown[]) => mocks.exportAuditLogsPdf(...args),
}));
vi.mock("../src/components/layout/admin/AdminLayout", () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock("../src/context/LanguageContext", () => ({ useLanguage: vi.fn() }));
vi.mock("../src/i18n/tx", () => ({
  tx: (value: string) => value,
  tr: (fr: string) => fr,
  uiLang: () => "fr",
}));
vi.mock("../src/hooks/useRefresh", () => ({
  silentRefreshActive: () => false,
  useGlobalRefreshTick: () => 0,
}));
vi.mock("react-hot-toast", () => ({
  default: { error: vi.fn(), success: vi.fn() },
}));

import AdminLogsPage from "../src/pages/admin/AdminLogsPage";

const logPageOne = {
  data: [
    {
      id: 1,
      action: "GET api/orders",
      created_at: "2026-10-12T09:30:00.000Z",
      details: { status: 200 },
    },
  ],
  current_page: 1,
  last_page: 2,
  total: 2,
};
const logPageTwo = {
  data: [
    {
      id: 2,
      action: "POST api/admin/users/14",
      created_at: "2026-10-11T09:30:00.000Z",
      details: { status: 201 },
    },
  ],
  current_page: 2,
  last_page: 2,
  total: 2,
};

beforeEach(() => {
  mocks.getAuditLogs.mockImplementation(async (params?: { page?: number }) =>
    params?.page === 2 ? logPageTwo : logPageOne,
  );
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("AdminLogsPage export PDF", () => {
  it("loads every filtered audit page and calls the local PDF generator", async () => {
    render(<AdminLogsPage />);
    await waitFor(() =>
      expect(mocks.getAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1 }),
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: "Exporter PDF" }));

    await waitFor(() =>
      expect(mocks.exportAuditLogsPdf).toHaveBeenCalledTimes(1),
    );
    const [rows, filename] = mocks.exportAuditLogsPdf.mock.calls[0] as [
      Array<{ id: number }>,
      string,
    ];
    expect(rows.map((row) => row.id)).toEqual([1, 2]);
    expect(filename).toMatch(/^journal-audit-tokpa-.*\.pdf$/);
    expect(mocks.getAuditLogs).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2 }),
    );
  });
});
