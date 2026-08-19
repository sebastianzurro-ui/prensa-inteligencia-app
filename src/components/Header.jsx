import { useState } from 'react';
import { MapPin, ChevronDown, RefreshCw } from 'lucide-react';
import { JURISDICCIONES } from '../data/mockData';

export default function Header({ jurisdiccion, onChangeJurisdiccion }) {
  const [abierto, setAbierto] = useState(false);

  const actual = JURISDICCIONES.find((j) => j.id === jurisdiccion) || JURISDICCIONES[0];

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="relative">
        <button
          onClick={() => setAbierto((v) => !v)}
          className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-semibold shadow-card ring-1 ring-slate-200"
        >
          <MapPin size={16} className="text-blue-600" />
          {actual.nombre}
          <ChevronDown size={16} className="text-slate-400" />
        </button>

        {abierto && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setAbierto(false)} />
            <div className="absolute left-0 z-20 mt-1 max-h-72 w-64 overflow-auto rounded-xl bg-white py-1 shadow-xl ring-1 ring-slate-200">
              {JURISDICCIONES.map((j) => (
                <button
                  key={j.id}
                  onClick={() => {
                    onChangeJurisdiccion(j.id);
                    setAbierto(false);
                  }}
                  className={`block w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 ${
                    j.id === jurisdiccion ? 'font-bold text-blue-600' : 'text-slate-700'
                  }`}
                >
                  {j.nombre}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <button
        onClick={() => window.location.reload()}
        className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-card ring-1 ring-slate-200"
      >
        <RefreshCw size={14} />
        Actualizar
      </button>
    </div>
  );
}
