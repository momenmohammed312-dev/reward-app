import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import '@fontsource-variable/geist';
import App from './App.tsx';
import './index.css';

// Force clear all service worker caches on every page load during development only
if (import.meta.env.DEV) {
  (async () => {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(r => r.unregister()));
    }
  })();
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
