import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ChromeApp } from './app/ChromeApp';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ChromeApp />
  </StrictMode>,
);
