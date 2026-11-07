import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from '@tanstack/react-router';
import { Provider } from 'react-redux';
import '@fontsource-variable/inter';
import 'material-symbols/outlined.css';
import './theme/theme.css';
import { store } from './store';
import { router } from './routes/router';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import { initEcho } from './services/realtime/echo';
import AppErrorBoundary from './components/errors/AppErrorBoundary';
import { captureFrontendError, installGlobalErrorHandlers } from './services/errors/frontendErrorReporter';

// Runtime faults are captured as safe, session-local references. No raw exception
// message, stack, URL parameters or request credentials are sent or persisted.
installGlobalErrorHandlers();

// Realtime is optional and must never prevent the application from rendering.
try {
  initEcho();
} catch (error) {
  captureFrontendError(error, { source: 'bootstrap' });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppErrorBoundary>
      <Provider store={store}>
        <ThemeProvider>
          <LanguageProvider>
            <RouterProvider router={router} />
          </LanguageProvider>
        </ThemeProvider>
      </Provider>
    </AppErrorBoundary>
  </StrictMode>,
);
