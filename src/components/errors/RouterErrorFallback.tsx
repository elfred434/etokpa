// Écran de secours affiché lorsqu’une route TanStack Router lève une erreur.
import { useEffect, useState } from 'react';
import { captureFrontendError } from '../../services/errors/frontendErrorReporter';
import { getDevelopmentErrorMessage } from '../../utils/developmentErrorMessage';
import UnexpectedErrorView from './UnexpectedErrorView';

interface RouterErrorFallbackProps {
  error: unknown;
  reset: () => void;
}

// Composant React RouterErrorFallback : prépare l’état et affiche son interface.
export default function RouterErrorFallback({ error, reset }: RouterErrorFallbackProps) {
  const [diagnostics, setDiagnostics] = useState<{ reference?: string; developmentMessage?: string }>({});

  // Exécute l’effet de bord React lors du montage ou de la mise à jour des dépendances.
  useEffect(() => {
    const report = captureFrontendError(error, { source: 'router' });
    setDiagnostics({
      reference: report.reference,
      developmentMessage: getDevelopmentErrorMessage(error),
    });
  }, [error]);

  // Retourne le rendu JSX du composant.
  return (
    <UnexpectedErrorView
      reference={diagnostics.reference}
      developmentMessage={diagnostics.developmentMessage}
      onRetry={reset}
    />
  );
}
