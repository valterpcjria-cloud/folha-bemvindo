
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { CONFIG } from './config';

const rootEl = document.getElementById('root');
if (rootEl) {
  document.title = `Folha Bem Vindo v${CONFIG.VERSION}`;
  const root = ReactDOM.createRoot(rootEl);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );

  // Ocultar loader de inicialização do HTML
  setTimeout(() => {
    const loader = document.getElementById('initial-loader');
    if (loader) {
      loader.style.opacity = '0';
      setTimeout(() => {
        if (loader) loader.style.display = 'none';
      }, 500);
    }
  }, 300);
}
