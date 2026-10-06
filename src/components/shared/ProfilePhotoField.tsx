import { useRef } from 'react';
import toast from 'react-hot-toast';
import MIcon from './MIcon';
import UserAvatar from './UserAvatar';
import { tx } from '../../i18n/tx';
import { fileToPhoto } from '../../utils/profilePhoto';

type Props = {
  name: string;
  photo: string | null;
  onChange: (dataUrl: string) => void;
  onClear: () => void;
};

export default function ProfilePhotoField({ name, photo, onChange, onClear }: Props) {
  const input = useRef<HTMLInputElement>(null);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    try {
      onChange(await fileToPhoto(file));
    } catch (e) {
      const code = e instanceof Error ? e.message : '';
      toast.error(code === 'size' ? tx('Cette photo dépasse 4 Mo.') : tx('Choisissez une image (JPG ou PNG).'));
    }
  };

  return (
    <div className="flex items-center gap-md">
      <UserAvatar name={name} photo={photo} fallback="TK" className="h-16 w-16 border border-primary-light bg-primary-tint text-xl text-primary-dark" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-label font-medium text-text-secondary">{tx('Photo de profil')}</span>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="inline-flex items-center gap-1 rounded-lg border border-border-default px-3 py-2 text-label font-semibold hover:bg-bg-secondary"
          >
            <MIcon name="photo_camera" className="text-[18px]" />
            {tx('Choisir une photo')}
          </button>
          {photo && (
            <button type="button" onClick={onClear} className="rounded-lg px-3 py-2 text-label font-semibold text-error hover:bg-error-light">
              {tx('Retirer la photo')}
            </button>
          )}
        </div>
        <p className="text-micro text-text-tertiary">{tx('JPG ou PNG, 4 Mo maximum.')}</p>
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            void pick(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </div>
    </div>
  );
}
