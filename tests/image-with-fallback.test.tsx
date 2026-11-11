// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import ImageWithFallback from "../src/components/shared/ImageWithFallback";

describe("ImageWithFallback", () => {
  it("shows the supplied placeholder when the URL is missing or fails", () => {
    const { rerender } = render(
      <ImageWithFallback
        src={null}
        alt="Tomate"
        fallback={<span>Photo indisponible</span>}
      />,
    );
    expect(screen.getByText("Photo indisponible")).toBeTruthy();

    rerender(
      <ImageWithFallback
        src="https://cdn.example/tomate.webp"
        alt="Tomate"
        fallback={<span>Photo indisponible</span>}
      />,
    );
    fireEvent.error(screen.getByRole("img", { name: "Tomate" }));
    expect(screen.queryByRole("img", { name: "Tomate" })).toBeNull();
    expect(screen.getByText("Photo indisponible")).toBeTruthy();
  });

  it("retries a new source after the previous source failed", () => {
    const { rerender } = render(
      <ImageWithFallback
        src="https://cdn.example/broken.webp"
        alt="Produit"
        fallback={<span>Image de remplacement</span>}
      />,
    );
    fireEvent.error(screen.getByRole("img", { name: "Produit" }));
    expect(screen.getByText("Image de remplacement")).toBeTruthy();

    rerender(
      <ImageWithFallback
        src="https://cdn.example/replaced.webp"
        alt="Produit"
        fallback={<span>Image de remplacement</span>}
      />,
    );
    expect(
      screen.getByRole("img", { name: "Produit" }).getAttribute("src"),
    ).toBe("https://cdn.example/replaced.webp");
  });
});
