// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ navigate: vi.fn() }));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mocks.navigate,
}));
vi.mock("../src/components/layout/admin/AdminSidebar", () => ({
  default: () => null,
}));
vi.mock("../src/components/shared/MobileTableBridge", () => ({
  default: () => null,
}));
vi.mock("../src/components/shared/MIcon", () => ({
  default: () => <span aria-hidden="true" />,
}));
vi.mock("../src/components/layout/admin/AdminNotificationBell", () => ({
  default: () => null,
}));
vi.mock("../src/components/shared/RefreshButton", () => ({
  default: () => null,
}));
vi.mock("../src/components/shared/SettingsLink", () => ({
  default: () => null,
}));
vi.mock("../src/components/shared/LogoutButton", () => ({
  default: () => null,
}));
vi.mock("../src/context/LanguageContext", () => ({ useLanguage: vi.fn() }));
vi.mock("../src/i18n/tx", () => ({
  tx: (value: string) => value,
  tr: (fr: string) => fr,
}));

import AdminLayout from "../src/components/layout/admin/AdminLayout";

afterEach(() => {
  vi.clearAllMocks();
});

describe("AdminLayout global search", () => {
  it("routes a query to the users screen when that scope is selected", () => {
    render(
      <AdminLayout currentPath="/admin">
        <span>Contenu</span>
      </AdminLayout>,
    );
    const input = screen.getByRole("textbox", {
      name: "Rechercher une commande ou un utilisateur",
    });
    fireEvent.change(input, { target: { value: "  Aïcha Dossou  " } });

    fireEvent.click(
      screen.getByRole("button", { name: "Rechercher dans les utilisateurs" }),
    );

    expect(mocks.navigate).toHaveBeenCalledWith({
      to: "/admin/utilisateurs",
      search: { q: "Aïcha Dossou" },
    });
  });

  it("uses orders as the Enter-key default and ignores an empty query", () => {
    render(
      <AdminLayout currentPath="/admin">
        <span>Contenu</span>
      </AdminLayout>,
    );
    const input = screen.getByRole("textbox", {
      name: "Rechercher une commande ou un utilisateur",
    });
    fireEvent.submit(input.closest("form")!);
    expect(mocks.navigate).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: "  #482  " } });
    fireEvent.submit(input.closest("form")!);

    expect(mocks.navigate).toHaveBeenCalledWith({
      to: "/admin/commandes",
      search: { q: "#482" },
    });
  });
});
