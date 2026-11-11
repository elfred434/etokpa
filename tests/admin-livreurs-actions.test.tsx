// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUsers: vi.fn(),
  getOrders: vi.fn(),
  getZones: vi.fn(),
  deleteUser: vi.fn(),
}));

vi.mock("../src/services/api", () => ({
  adminApi: {
    getUsers: (...args: unknown[]) => mocks.getUsers(...args),
    getOrders: (...args: unknown[]) => mocks.getOrders(...args),
    getZones: (...args: unknown[]) => mocks.getZones(...args),
    deleteUser: (...args: unknown[]) => mocks.deleteUser(...args),
  },
}));
vi.mock("../src/services/api/useLiveRows", () => ({
  zoneNom: () => "Cadjehoun",
  initials: (name: string) => name.slice(0, 2).toUpperCase(),
}));
vi.mock("../src/components/layout/admin/AdminLayout", () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock("../src/components/shared/MIcon", () => ({
  default: () => <span aria-hidden="true" />,
}));
vi.mock("../src/components/shared/AdminActionDialogs", () => ({
  adminDialogs: { confirm: vi.fn() },
}));
vi.mock("../src/context/LanguageContext", () => ({ useLanguage: vi.fn() }));
vi.mock("../src/i18n/tx", () => ({
  tx: (value: string) => value,
  tr: (fr: string) => fr,
}));
vi.mock("../src/hooks/useRefresh", () => ({
  silentRefreshActive: () => false,
  useGlobalRefreshTick: () => 0,
}));
vi.mock("react-hot-toast", () => ({
  default: { error: vi.fn(), success: vi.fn() },
}));

import AdminLivreursPage from "../src/pages/admin/AdminLivreursPage";

beforeEach(() => {
  mocks.getUsers.mockResolvedValue({
    data: [
      {
        id: 11,
        nom_complet: "Luc Actif",
        statut: "actif",
        profil: { disponibilite: true, zone: { nom: "Cadjehoun" } },
      },
      {
        id: 12,
        nom_complet: "Mika Inactif",
        statut: "inactif",
        profil: { disponibilite: false, zone: { nom: "Cadjehoun" } },
      },
    ],
    meta: { last_page: 1 },
  });
  mocks.getOrders.mockResolvedValue({ data: [], meta: { last_page: 1 } });
  mocks.getZones.mockResolvedValue({ data: [] });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("AdminLivreursPage actions", () => {
  it("does not offer a second deactivation for an inactive account", async () => {
    render(<AdminLivreursPage />);

    const table = within(screen.getByRole("table"));
    const activeRow = (await table.findByText("Luc Actif")).closest("tr")!;
    const inactiveRow = (await table.findByText("Mika Inactif")).closest(
      "tr",
    )!;

    expect(
      within(activeRow).getByRole("button", { name: "Désactiver Luc Actif" }),
    ).toBeTruthy();
    expect(
      within(inactiveRow).queryByRole("button", { name: /Désactiver/ }),
    ).toBeNull();
  });
});
