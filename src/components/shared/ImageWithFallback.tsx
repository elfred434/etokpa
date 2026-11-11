import { useState, type ReactNode } from "react";

type ImageWithFallbackProps = {
  src?: string | null;
  alt: string;
  className?: string;
  fallback?: ReactNode;
  loading?: "eager" | "lazy";
};

/** Image de catalogue tolérante aux URL absentes ou en échec, avec rendu de repli fourni par l'appelant. */
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
