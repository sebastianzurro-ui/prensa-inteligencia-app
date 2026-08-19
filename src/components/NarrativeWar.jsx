import { useState } from 'react';
import { ThumbsUp, ThumbsDown, Landmark, Flag } from 'lucide-react';

export default function NarrativeWar({ narrativa }) {
  const [pestaña, setPestaña] = useState('oficialista');

  if (!narrativa) return null;
  const encuadres = {
    oficialista: narrativa.encuadre_oficialista,
    opositor: narrativa.encuadre_opositor
  };
  const actual = encuadres[pestaña];

  return (
    <div>
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
        <button
          onClick={() => setPestaña('oficialista')}
          className={`rounded-lg px-3 py-2 text-sm font-bold transition ${
            pestaña === 'oficialista' ? 'bg-blue-600 text-white shadow' : 'text-slate-600'
          }`}
        >
          <span className="inline-flex items-center gap-1.5">
            <Landmark size={14} /> Oficialista
          </span>
        </button>
        <button
          onClick={() => setPestaña('opositor')}
          className={`rounded-lg px-3 py-2 text-sm font-bold transition ${
            pestaña === 'opositor' ? 'bg-red-600 text-white shadow' : 'text-slate-600'
          }`}
        >
          <span className="inline-flex items-center gap-1.5">
            <Flag size={14} /> Opositor
          </span>
        </button>
      </div>

      <blockquote className="mt-3 border-l-4 border-slate-300 bg-slate-50 px-3 py-2 text-sm font-semibold italic text-slate-800">
        “{actual.eje}”
      </blockquote>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{actual.tesis}</p>

      <ul className="mt-3 space-y-1.5">
        {actual.tics.map((t, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
            <span>{t}</span>
          </li>
        ))}
      </ul>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="rounded-xl bg-emerald-50 p-3 ring-1 ring-emerald-100">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-emerald-700">
            <ThumbsUp size={14} /> Activos
          </p>
          <ul className="mt-1.5 space-y-1 text-xs text-emerald-900">
            {actual.activos.map((a, i) => (
              <li key={i}>• {a}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl bg-red-50 p-3 ring-1 ring-red-100">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-red-700">
            <ThumbsDown size={14} /> Pasivos
          </p>
          <ul className="mt-1.5 space-y-1 text-xs text-red-900">
            {actual.pasivos.map((a, i) => (
              <li key={i}>• {a}</li>
            ))}
          </ul>
        </div>
      </div>

      {narrativa.neutrales?.length > 0 && (
        <div className="mt-3 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Lectura neutral del monitoreo</p>
          <ul className="mt-1.5 space-y-1 text-xs text-slate-700">
            {narrativa.neutrales.map((n, i) => (
              <li key={i}>— {n}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
