import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import AdminApp from './AdminApp';
import { ToastProvider } from './contexts/ToastContext';
import './admin.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <AdminApp />
    </ToastProvider>
  </StrictMode>
);
