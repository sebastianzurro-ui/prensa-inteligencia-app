import { Clock } from 'lucide-react';
import { PERIODOS } from '../data/mockData';

export default function PeriodSelector({ periodo, onChange, compact = false }) {
  return (
    <div
      className={`flex items-center gap-1 overflow-x-auto rounded-xl bg-white shadow-card ring-1 ring-slate-200 ${
        compact ? 'p-0.5' : 'p-1'
      }`}
    >
      <span className="hidden shrink-0 items-center gap-1 pl-2 pr-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 sm:flex">
        <Clock size={11} /> Lapso
      </span>
      {PERIODOS.map((p) => (
        <button
          key={p.id}
          onClick={() => onChange(p.id)}
          title={`${p.peso} · ponderación con decaimiento exponencial`}
          className={`whitespace-nowrap rounded-lg font-bold transition ${
            compact ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'
          } ${periodo === p.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
