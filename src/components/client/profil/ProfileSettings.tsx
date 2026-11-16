import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import toast from 'react-hot-toast';
import MIcon from '../../shared/MIcon';
import {
  DIALOG_CANCEL_BTN_CLASS,
  DIALOG_PRIMARY_BTN_CLASS,
  DialogFrame,
} from '../../shared/DialogFrame';
import { useLanguage } from '../../../context/LanguageContext';
import { tx } from '../../../i18n/tx';


/**
 * ProfileSettings — Encart Paramètres & Sécurité (mot de passe, notifications, langue, déconnexion).
 */
export default function ProfileSettings() {
  const navigate = useNavigate();
  const { language, toggleLanguage, t } = useLanguage();
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [pwForm, setPwForm] = useState({ oldPw: '', newPw: '', confirmPw: '' });

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.newPw !== pwForm.confirmPw) {
      toast.error(tx("Les mots de passe ne correspondent pas"));
      return;
    }
    setPasswordOpen(false);
    setPwForm({ oldPw: '', newPw: '', confirmPw: '' });
    toast.success(tx("Mot de passe modifié avec succès"));
  };

  const handleLogout = () => {
    toast.success(tx("Déconnexion réussie"));
    navigate({ to: '/connexion' });
  };

  return (
    <>
      <section className="mb-xl">
        <h3 className="mb-sm font-h3 text-h3 text-ink">{t('profile.settingsAndSecurity')}</h3>

        <div className="overflow-hidden rounded-[14px] border border-line bg-bg-card shadow-sm">
          {/* Changer mot de passe */}
          <button
            type="button"
            onClick={() => setPasswordOpen(true)}
            className="scale-interaction flex w-full items-center justify-between p-md text-left transition-colors hover:bg-surface"
          >
            <div className="flex items-center gap-md">
              <MIcon name="lock" className="text-ink-2" />
              <span className="text-body font-medium text-ink">{t('profile.changePassword')}</span>
            </div>
            <MIcon name="chevron_right" className="text-ink-3" />
          </button>

          {/* Notifications */}
          <button
            type="button"
            onClick={() => toast(tx("Paramètres notifications SMS / App enregistrés"))}
            className="scale-interaction flex w-full items-center justify-between border-t border-line p-md text-left transition-colors hover:bg-surface"
          >
            <div className="flex items-center gap-md">
              <MIcon name="notifications_active" className="text-ink-2" />
              <span className="text-body font-medium text-ink">{t('profile.notificationsSms')}</span>
            </div>
            <span className="text-xs font-semibold text-success">{tx("Activées")}</span>
          </button>

          {/* Langue (Interrupteur FR / EN) */}
          <button
            type="button"
            onClick={() => {
              toggleLanguage();
              toast.success(language === 'fr' ? 'Language switched to English' : tx("Langue passée en Français"));
            }}
            className="scale-interaction flex w-full items-center justify-between border-t border-line p-md text-left transition-colors hover:bg-surface"
          >
            <div className="flex items-center gap-md">
              <MIcon name="language" className="text-ink-2" />
              <span className="text-body font-medium text-ink">{t('profile.language')}</span>
            </div>
            <div className="flex items-center gap-1.5 text-primary font-bold">
              <span className="text-xs">{language === 'fr' ? tx("Français (FR)") : 'English (EN)'}</span>
              <MIcon name="sync" className="text-xs" />
            </div>
          </button>

          {/* Déconnexion */}
          <button
            type="button"
            onClick={handleLogout}
            className="scale-interaction flex w-full items-center gap-md border-t border-line p-md font-medium text-error transition-colors hover:bg-error-light"
          >
            <MIcon name="logout" className="text-error" />
            {t('profile.logout')}
          </button>
        </div>
      </section>

      {/* Modal Changement Mot de Passe */}
      {passwordOpen && (
        <DialogFrame
          icon="lock"
          title={tx("Changer le mot de passe")}
          maxWidth="28rem"
          onClose={() => setPasswordOpen(false)}
          footer={
            <>
              <button
                type="button"
                onClick={() => setPasswordOpen(false)}
                className={DIALOG_CANCEL_BTN_CLASS}
              >
                {tx("Annuler")}
              </button>
              <button
                type="submit"
                form="profile-settings-pw-form"
                className={DIALOG_PRIMARY_BTN_CLASS}
              >
                {tx("Valider")}
              </button>
            </>
          }
        >
          <form id="profile-settings-pw-form" onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="label">{tx("Mot de passe actuel")}</label>
              <input
                type="password"
                value={pwForm.oldPw}
                onChange={(e) => setPwForm({ ...pwForm, oldPw: e.target.value })}
                className="input"
                required
              />
            </div>

            <div>
              <label className="label">{tx("Nouveau mot de passe")}</label>
              <input
                type="password"
                value={pwForm.newPw}
                onChange={(e) => setPwForm({ ...pwForm, newPw: e.target.value })}
                className="input"
                required
              />
            </div>

            <div>
              <label className="label">{tx("Confirmer le nouveau mot de passe")}</label>
              <input
                type="password"
                value={pwForm.confirmPw}
                onChange={(e) => setPwForm({ ...pwForm, confirmPw: e.target.value })}
                className="input"
                required
              />
            </div>
          </form>
        </DialogFrame>
      )}
    </>
  );
}
