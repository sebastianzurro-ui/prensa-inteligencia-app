import { useState } from 'react';
import { ListChecks, Quote, Landmark, Flag } from 'lucide-react';

export default function RecommendedAction({ accion }) {
  const [perfil, setPerfil] = useState('oficialista');

  if (!accion) return null;
  const actual = accion[perfil];

  return (
    <div>
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
        <button
          onClick={() => setPerfil('oficialista')}
          className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-bold transition ${
            perfil === 'oficialista' ? 'bg-blue-600 text-white shadow' : 'text-slate-600'
          }`}
        >
          <Landmark size={15} /> Oficialista
        </button>
        <button
          onClick={() => setPerfil('opositor')}
          className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-bold transition ${
            perfil === 'opositor' ? 'bg-red-600 text-white shadow' : 'text-slate-600'
          }`}
        >
          <Flag size={15} /> Opositor
        </button>
      </div>

      <p className="mt-3 text-sm font-semibold text-slate-800">
        Objetivo {actual.perfil.toLowerCase()}: <span className="font-normal">{actual.objetivo}</span>
      </p>

      <p className="mt-4 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
        <ListChecks size={14} /> Viñetas tácticas
      </p>
      <ul className="mt-2 space-y-1.5">
        {actual.viñetas_tacticas.map((v, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-slate-100 text-[11px] font-bold text-slate-500">
              {i + 1}
            </span>
            <span>{v}</span>
          </li>
        ))}
      </ul>

      <p className="mt-4 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
        <Quote size={14} /> Frase / eje de discurso
      </p>
      <blockquote
        className={`mt-2 rounded-xl border-l-4 p-3 text-sm font-semibold italic ${
          perfil === 'oficialista'
            ? 'border-blue-500 bg-blue-50 text-blue-900'
            : 'border-red-500 bg-red-50 text-red-900'
        }`}
      >
        “{actual.frase_eje}”
      </blockquote>
    </div>
  );
}
