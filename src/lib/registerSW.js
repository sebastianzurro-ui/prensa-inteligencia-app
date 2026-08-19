export function registrarServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;

  const esProduccion = import.meta.env.PROD;

  if (esProduccion) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('Registro SW falló:', err);
      });
    });
  }

  return esProduccion;
}

export function estaInstalable() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

export function soportaInstalacion() {
  return (
    'onbeforeinstallprompt' in window &&
    !estaInstalable()
  );
}
