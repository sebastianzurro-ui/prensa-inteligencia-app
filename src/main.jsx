import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { registrarServiceWorker } from './lib/registerSW';

registrarServiceWorker();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
