import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export default function CollapsibleCard({ titulo, icon: Icon, badge, defaultOpen = false, children }) {
  const [abierto, setAbierto] = useState(defaultOpen);
  return (
    <section className="card overflow-hidden">
      <button
        onClick={() => setAbierto((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3"
        aria-expanded={abierto}
      >
        <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
          {Icon && <Icon size={16} className="text-blue-600" />}
          {titulo}
          {badge}
        </span>
        <ChevronDown
          size={18}
          className={`shrink-0 text-slate-400 transition-transform ${abierto ? 'rotate-180' : ''}`}
        />
      </button>
      {abierto && <div className="border-t border-slate-100 p-4 pt-3">{children}</div>}
    </section>
  );
}
