// Point d’entrée de l’application React : monte le routeur, le store Redux et les contextes globaux.
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

installGlobalErrorHandlers();

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
