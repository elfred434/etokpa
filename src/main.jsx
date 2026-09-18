import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from '@tanstack/react-router';
import { Provider } from 'react-redux';
import 'material-symbols/outlined.css';
import './theme/theme.css';
import { store } from './store';
import { router } from './routes/router';

// Point d'entrée React de TOKPa — Redux + TanStack Router
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>
  </StrictMode>,
);
