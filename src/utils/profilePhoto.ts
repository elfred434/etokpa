import { currentUserId } from '../routes/authGuard';
import { absImageUrl } from './imageUrl';

const PREFIX = 'tokpa_local_photo_';

function key(): string | null {
  const id = currentUserId();
  return id ? `${PREFIX}${id}` : null;
}

/** Photo choisie sur cet appareil, quand le serveur ne peut pas la stocker. */
export function readLocalPhoto(): string | null {
  const k = key();
  if (!k) return null;
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
}

export function writeLocalPhoto(dataUrl: string | null) {
  const k = key();
  if (!k) return;
  try {
    if (dataUrl) localStorage.setItem(k, dataUrl);
    else localStorage.removeItem(k);
  } catch {
    /* quota : la prévisualisation reste dans le formulaire */
  }
  window.dispatchEvent(new Event('tokpa:auth-changed'));
}

export function clearLocalPhotos() {
  try {
    const names: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const name = localStorage.key(i);
      if (name?.startsWith(PREFIX)) names.push(name);
    }
    names.forEach((name) => localStorage.removeItem(name));
  } catch {
    /* storage indisponible */
  }
}

/** Photo à afficher : choix local, sinon lien renvoyé par GET /profile. */
export function displayPhoto(server?: string | null): string | null {
  return readLocalPhoto() || absImageUrl(server);
}

/** Photo de la session : choix local, sinon `image_profil` enregistré. */
export function sessionPhoto(): string | null {
  if (readLocalPhoto()) return readLocalPhoto();
  try {
    const raw = localStorage.getItem('tokpa_user');
    const photo = raw ? (JSON.parse(raw) as { image_profil?: string | null }).image_profil : null;
    return absImageUrl(photo);
  } catch {
    return null;
  }
}

/** Réduit une image choisie pour l'afficher tout de suite, sans l'envoyer en base64 au serveur. */
export function fileToPhoto(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) return Promise.reject(new Error('type'));
  if (file.size > 4 * 1024 * 1024) return Promise.reject(new Error('size'));
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read'));
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 320;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('canvas'));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.72));
      };
      img.onerror = () => reject(new Error('image'));
      img.src = String(reader.result ?? '');
    };
    reader.readAsDataURL(file);
  });
}
