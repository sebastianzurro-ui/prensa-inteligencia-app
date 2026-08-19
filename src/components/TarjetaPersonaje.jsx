import { Radio, Hash } from 'lucide-react';
import { LineChart, Line, XAxis, ResponsiveContainer, Tooltip } from 'recharts';
import SentimentGauge, { colorScore, rotuloScore } from './SentimentGauge';

const TONO_DOT = {
  pos: { color: '#16a34a', label: 'Positiva' },
  neu: { color: '#94a3b8', label: 'Neutral' },
  neg: { color: '#dc2626', label: 'Negativa' }
};

export function TonoBars({ tono }) {
  return (
    <div>
      <div className="flex h-1.5 w-full overflow-hidden rounded-full">
        <div style={{ width: `${tono.pos}%`, backgroundColor: '#16a34a' }} title="Positivo" />
        <div style={{ width: `${tono.neu}%`, backgroundColor: '#94a3b8' }} title="Neutral" />
        <div style={{ width: `${tono.neg}%`, backgroundColor: '#dc2626' }} title="Negativo" />
      </div>
      <div className="mt-1.5 flex gap-2 text-[10px] font-semibold">
        <span className="flex items-center gap-1 text-emerald-700">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" /> {tono.pos}% pos
        </span>
        <span className="flex items-center gap-1 text-slate-500">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-400" /> {tono.neu}% neu
        </span>
        <span className="flex items-center gap-1 text-red-700">
          <span className="h-1.5 w-1.5 rounded-full bg-red-600" /> {tono.neg}% neg
        </span>
      </div>
    </div>
  );
}

export default function TarjetaPersonaje({ p, lapso }) {
  return (
    <article className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base font-extrabold text-white ${
              p.bloque === 'oficialista' ? 'bg-blue-600' : 'bg-red-600'
            }`}
          >
            {p.nombre.split(' ').slice(0, 2).map((n) => n[0]).join('')}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold">{p.nombre}</p>
            <p className="truncate text-xs text-slate-500">{p.cargo}</p>
            <p className="mt-0.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
              <span className={`h-1.5 w-1.5 rounded-full ${p.bloque === 'oficialista' ? 'bg-blue-500' : 'bg-red-500'}`} />
              {p.partido}
            </p>
          </div>
        </div>
        <SentimentGauge score={p.sentimiento} compact />
      </div>

      <div className="mt-3 grid grid-cols-2 items-center gap-4">
        <TonoBars tono={p.tono} />
        <div className="flex flex-col items-end gap-1">
          <span className="flex items-center gap-1 text-xs font-bold text-slate-700">
            <Radio size={12} className="text-slate-400" /> {p.menciones.toLocaleString('es-AR')} menciones
          </span>
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
            style={{ backgroundColor: colorScore(p.sentimiento) }}
          >
            {rotuloScore(p.sentimiento)}
          </span>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          {p.temas.map((t) => (
            <span key={t} className="flex items-center gap-0.5 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
              <Hash size={9} /> {t}
            </span>
          ))}
        </div>
        <span className="whitespace-nowrap text-[10px] font-semibold text-slate-400">humor en {lapso}</span>
      </div>

      <div className="mt-2 h-12">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={p.tendencia_sentimiento} margin={{ top: 2, right: 2, bottom: 0, left: 2 }}>
            <XAxis dataKey="dia" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <Tooltip
              formatter={(v) => [`${v} / 100`, 'Humor']}
              contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 11, padding: 4 }}
            />
            <Line type="monotone" dataKey="score" stroke={colorScore(p.sentimiento)} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 rounded-xl bg-slate-50 p-3">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Últimas menciones</p>
        <ul className="mt-1.5 space-y-1.5">
          {p.ultimas.map((m, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-slate-700">
              <span
                className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: TONO_DOT[m.tono].color }}
                title={TONO_DOT[m.tono].label}
              />
              <span className="flex-1">{m.titulo}</span>
              <span className="whitespace-nowrap font-semibold text-slate-400">{m.hora}</span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}
