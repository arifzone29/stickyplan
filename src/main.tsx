import { render } from 'preact';
import { App } from './app';
import './index.css';

const rootElement = document.getElementById('app');
if (rootElement) {
  render(<App />, rootElement);
}

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  });
}
