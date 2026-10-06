import { initialsOf, useAuthRevision } from '../../routes/authGuard';
import { absImageUrl } from '../../utils/imageUrl';
import { sessionPhoto } from '../../utils/profilePhoto';

type Props = {
  name?: string | null;
  /** `undefined` = photo de session. `null` ou `''` = pas de photo. */
  photo?: string | null;
  fallback?: string;
  className?: string;
};

export default function UserAvatar({ name, photo, fallback = '?', className = 'h-10 w-10 text-label' }: Props) {
  useAuthRevision();
  const raw = photo === undefined ? sessionPhoto() : photo || null;
  const src = raw ? absImageUrl(raw) : null;
  if (src) {
    return <img src={src} alt="" className={`rounded-full object-cover ${className}`} />;
  }
  return (
    <span className={`inline-flex items-center justify-center rounded-full font-bold ${className}`}>
      {initialsOf(name ?? null, fallback)}
    </span>
  );
}
