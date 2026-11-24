// Redimensionne et compresse une image en format WebP côté navigateur.
const COTE_MAX = 1600;
const QUALITE = 0.82;
const OCTETS_MAX = 4 * 1024 * 1024;
const SOURCE_MAX = 20 * 1024 * 1024;

const TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp']);

// Classe ImageWebpError : gère le comportement et le rendu associés.
export class ImageWebpError extends Error {
  constructor(readonly code: 'format' | 'lourde' | 'lecture' | 'webp' | 'taille') {
    super(code);
  }
}

// Helper blobWebp : réalise le traitement métier associé.
function blobWebp(canvas: HTMLCanvasElement, qualite: number) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/webp', qualite);
  });
}

// Helper fichierEnWebp : réalise le traitement métier associé.
export async function fichierEnWebp(file: File): Promise<File> {
  if (!TYPES.has(file.type)) throw new ImageWebpError('format');
  if (file.size > SOURCE_MAX) throw new ImageWebpError('lourde');

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new ImageWebpError('lecture');
  }

  try {
    const echelle = Math.min(1, COTE_MAX / Math.max(bitmap.width, bitmap.height, 1));
    const largeur = Math.max(1, Math.round(bitmap.width * echelle));
    const hauteur = Math.max(1, Math.round(bitmap.height * echelle));
    const canvas = document.createElement('canvas');
    canvas.width = largeur;
    canvas.height = hauteur;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new ImageWebpError('webp');
    ctx.drawImage(bitmap, 0, 0, largeur, hauteur);

    let qualite = QUALITE;
    let blob = await blobWebp(canvas, qualite);
    if (!blob) throw new ImageWebpError('webp');
    while (blob.size > OCTETS_MAX && qualite > 0.5) {
      qualite = Math.round((qualite - 0.1) * 10) / 10;
      const suivant = await blobWebp(canvas, qualite);
      if (!suivant) break;
      blob = suivant;
    }
    if (blob.size > OCTETS_MAX) throw new ImageWebpError('taille');

    const base = file.name.replace(/\.[^.]+$/, '') || 'produit';
    return new File([blob], `${base}.webp`, { type: 'image/webp', lastModified: Date.now() });
  } finally {
    bitmap.close();
  }
}
