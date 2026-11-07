import { Component, type ErrorInfo, type ReactNode } from 'react';
import { captureFrontendError } from '../../services/errors/frontendErrorReporter';
import { getDevelopmentErrorMessage } from '../../utils/developmentErrorMessage';
import UnexpectedErrorView from './UnexpectedErrorView';

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
  reference?: string;
  developmentMessage?: string;
}

/** Catches render/lifecycle failures and replaces them with a safe recovery page. */
export default class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, _info: ErrorInfo): void {
    const report = captureFrontendError(error, { source: 'react-boundary' });
    this.setState({
      reference: report.reference,
      developmentMessage: getDevelopmentErrorMessage(error),
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <UnexpectedErrorView
          reference={this.state.reference}
          developmentMessage={this.state.developmentMessage}
        />
      );
    }
    return this.props.children;
  }
}
