import { MapPin, User, Search, Sparkles } from 'lucide-react';
import { LOCALIDADES, PERSONAJES } from '../data/mockData';

const SUGERIDOS = [
  { l: 'Córdoba capital', p: 'Milei' },
  { l: 'Gran Buenos Aires', p: 'Cristina' },
  { l: 'Mendoza capital', p: 'Bullrich' },
  { l: 'Rosario', p: 'Kicillof' }
];

export default function BuscadorForm({ localidad, persona, onLocalidad, onPersona, onSubmit, destacado = false }) {
  return (
    <form onSubmit={onSubmit} className={`card space-y-2 ${destacado ? 'p-4' : 'p-3'}`}>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr,1fr,auto]">
        <div className="relative">
          <MapPin size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            list="listado-localidades"
            value={localidad}
            onChange={(e) => onLocalidad(e.target.value)}
            placeholder="Localidad, ciudad o provincia…"
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
          <datalist id="listado-localidades">
            {LOCALIDADES.map((l) => (
              <option key={l.id} value={l.nombre}>
                {l.tipo} · {l.provincia}
              </option>
            ))}
          </datalist>
        </div>

        <div className="relative">
          <User size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            list="listado-personajes"
            value={persona}
            onChange={(e) => onPersona(e.target.value)}
            placeholder="Personaje (Milei, Cristina, Kicillof)…"
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
          <datalist id="listado-personajes">
            {PERSONAJES.map((p) => (
              <option key={p.id} value={p.nombre}>
                {p.cargo} · {p.partido}
              </option>
            ))}
          </datalist>
        </div>

        <button
          type="submit"
          className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-500"
        >
          <Search size={16} /> Buscar
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {SUGERIDOS.map((s, i) => (
          <button
            key={i}
            type="button"
            onClick={() => {
              onLocalidad(s.l);
              onPersona(s.p);
              onSubmit();
            }}
            className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-blue-50 hover:text-blue-700"
          >
            <Sparkles size={10} className="mr-0.5 inline" />
            {s.p} en {s.l}
          </button>
        ))}
      </div>
    </form>
  );
}
