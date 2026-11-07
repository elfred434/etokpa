import { useEffect, useState } from 'react';
import { captureFrontendError } from '../../services/errors/frontendErrorReporter';
import { getDevelopmentErrorMessage } from '../../utils/developmentErrorMessage';
import UnexpectedErrorView from './UnexpectedErrorView';

interface RouterErrorFallbackProps {
  error: unknown;
  reset: () => void;
}

/** Safe TanStack Router fallback for loader and route-component errors. */
export default function RouterErrorFallback({ error, reset }: RouterErrorFallbackProps) {
  const [diagnostics, setDiagnostics] = useState<{ reference?: string; developmentMessage?: string }>({});

  useEffect(() => {
    const report = captureFrontendError(error, { source: 'router' });
    setDiagnostics({
      reference: report.reference,
      developmentMessage: getDevelopmentErrorMessage(error),
    });
  }, [error]);

  return (
    <UnexpectedErrorView
      reference={diagnostics.reference}
      developmentMessage={diagnostics.developmentMessage}
      onRetry={reset}
    />
  );
}
