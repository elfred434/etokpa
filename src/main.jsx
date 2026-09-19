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

// Point d'entrée React de TOKPa — Redux + TanStack Router + Language Context
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <LanguageProvider>
        <RouterProvider router={router} />
      </LanguageProvider>
    </Provider>
  </StrictMode>,
);
