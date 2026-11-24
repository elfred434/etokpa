// Composant image affichant automatiquement un repli visuel en cas d’erreur de chargement.
import { useState, type ReactNode } from "react";

type ImageWithFallbackProps = {
  src?: string | null;
  alt: string;
  className?: string;
  fallback?: ReactNode;
  loading?: "eager" | "lazy";
};

// Composant React ImageWithFallback : prépare l’état et affiche son interface.
export default function ImageWithFallback({
  src,
  alt,
  className,
  fallback = null,
  loading = "lazy",
}: ImageWithFallbackProps) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const source = src?.trim() || null;

  if (!source || failedSource === source) return fallback;

  // Retourne le rendu JSX du composant.
  return (
    <img
      src={source}
      alt={alt}
      className={className}
      loading={loading}
      decoding="async"
      onError={() => setFailedSource(source)}
    />
  );
}
