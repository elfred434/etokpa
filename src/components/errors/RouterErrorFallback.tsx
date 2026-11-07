import { useEffect, useState } from 'react';
import { captureFrontendError } from '../../services/errors/frontendErrorReporter';
import UnexpectedErrorView from './UnexpectedErrorView';

interface RouterErrorFallbackProps {
  error: unknown;
  reset: () => void;
}

/** Safe TanStack Router fallback for loader and route-component errors. */
export default function RouterErrorFallback({ error, reset }: RouterErrorFallbackProps) {
  const [reference, setReference] = useState<string>();

  useEffect(() => {
    setReference(captureFrontendError(error, { source: 'router' }).reference);
  }, [error]);

  return <UnexpectedErrorView reference={reference} onRetry={reset} />;
}
