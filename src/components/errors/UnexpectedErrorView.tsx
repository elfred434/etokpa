import { tr } from '../../i18n/tx';

interface UnexpectedErrorViewProps {
  reference?: string;
  developmentMessage?: string;
  onRetry?: () => void;
}

/** Production fallback is generic; development may show one bounded, redacted message, never a stack. */
export default function UnexpectedErrorView({ reference, developmentMessage, onRetry }: UnexpectedErrorViewProps) {
  const retry = onRetry ?? (() => window.location.reload());

  return (
    <main
      role="alert"
      aria-labelledby="tokpa-unexpected-error-title"
      className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface px-6 py-12 text-center text-on-surface"
    >
      <div className="w-full rounded-2xl border border-border-default bg-bg-card p-8 shadow-sm" style={{ width: 'min(100%, 34rem)' }}>
        <div aria-hidden="true" className="mb-4 text-5xl">⚠️</div>
        <h1 id="tokpa-unexpected-error-title" className="mb-3 text-2xl font-bold">
          {tr('Une erreur inattendue est survenue.', 'An unexpected error occurred.')}
        </h1>
        <p className="mb-6 text-text-secondary">
          {tr(
            'TOKPa n’a pas pu afficher cette page. Réessayez ou revenez à l’accueil.',
            'TOKPa could not display this page. Try again or return to the home page.',
          )}
        </p>
        {reference && (
          <p className="mb-6 text-sm text-text-secondary">
            {tr('Référence de diagnostic :', 'Diagnostic reference:')} <code>{reference}</code>
          </p>
        )}
        {import.meta.env.DEV && developmentMessage && (
          <div className="mb-6 text-left">
            <p className="mb-2 text-sm font-semibold text-text-secondary">
              {tr('Détail de développement :', 'Development detail:')}
            </p>
            <pre
              className="w-full overflow-auto rounded-lg bg-surface p-3 text-sm text-on-surface"
              style={{ maxHeight: '12rem', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}
            >
              {developmentMessage}
            </pre>
          </div>
        )}
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={retry}
            className="rounded-lg bg-primary-container px-5 py-3 font-bold text-white"
          >
            {tr('Réessayer', 'Try again')}
          </button>
          <a
            href="/"
            className="rounded-lg border border-border-default px-5 py-3 font-bold text-primary"
          >
            {tr('Retour à l’accueil', 'Back to home')}
          </a>
        </div>
      </div>
    </main>
  );
}
