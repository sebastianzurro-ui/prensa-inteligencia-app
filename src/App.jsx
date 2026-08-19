import { useEffect, useState } from 'react';
import { Map, Search, MessageSquare, Newspaper, WifiOff, Wifi, Download } from 'lucide-react';
import Dashboard from './components/Dashboard';
import ChatPanel from './components/ChatPanel';
import Buscador from './components/Buscador';
import FuentesPanel from './components/FuentesPanel';
import { estaInstalable, soportaInstalacion } from './lib/registerSW';

const TABS_VALIDAS = ['dashboard', 'buscar', 'fuentes', 'chat'];

export default function App() {
  const [pestaña, setPestaña] = useState(() => {
    const tab = new URLSearchParams(window.location.search).get('tab');
    return TABS_VALIDAS.includes(tab) ? tab : 'dashboard';
  });
  const [periodo, setPeriodo] = useState('7d');
  const [busqueda, setBusqueda] = useState(null);
  const [online, setOnline] = useState(navigator.onLine);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  const irABuscar = (loc, per) => {
    setBusqueda({ loc, per, ts: Date.now() });
    setPestaña('buscar');
  };

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);

    const manejarInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', manejarInstall);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
      window.removeEventListener('beforeinstallprompt', manejarInstall);
    };
  }, []);

  const instalar = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Map },
    { id: 'buscar', label: 'Buscar', icon: Search },
    { id: 'fuentes', label: 'Fuentes', icon: Newspaper },
    { id: 'chat', label: 'Agente', icon: MessageSquare }
  ];

  return (
    <div className="min-h-screen pb-16 md:pb-0">
      <div className="sticky top-0 z-40 bg-slate-900 text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-extrabold">
              AR
            </div>
            <div>
              <h1 className="text-sm font-bold leading-tight">PrensaAR</h1>
              <p className="text-[11px] text-slate-400">Inteligencia Política</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!online && (
              <span className="chip bg-red-500/20 text-red-300">
                <WifiOff size={12} /> Sin conexión
              </span>
            )}
            {online && <Wifi size={16} className="text-emerald-400" aria-label="En línea" />}
            {deferredPrompt && soportaInstalacion() && !estaInstalable() && (
              <button
                onClick={instalar}
                className="flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-semibold hover:bg-blue-500"
              >
                <Download size={14} /> Instalar
              </button>
            )}
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-4 py-4">
        {pestaña === 'dashboard' && (
          <Dashboard periodo={periodo} onCambiarPeriodo={setPeriodo} onBuscar={irABuscar} />
        )}
        {pestaña === 'buscar' && (
          <Buscador periodo={periodo} onCambiarPeriodo={setPeriodo} iniciales={busqueda} />
        )}
        {pestaña === 'fuentes' && <FuentesPanel />}
        {pestaña === 'chat' && <ChatPanel />}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-4">
          {tabs.map((t) => {
            const Icon = t.icon;
            const activo = pestaña === t.id;
            return (
              <button
                key={t.id}
                onClick={() => {
                  setPestaña(t.id);
                  window.history.replaceState(null, '', `/?tab=${t.id}`);
                }}
                className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold ${
                  activo ? 'text-blue-600' : 'text-slate-500'
                }`}
              >
                <Icon size={20} />
                {t.label}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
