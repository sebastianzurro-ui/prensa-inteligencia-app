import { Building2, AlertTriangle, RadioTower } from 'lucide-react';
import { LineChart, Line, XAxis, ResponsiveContainer, Tooltip } from 'recharts';
import SocialClimateGauge from './SocialClimateGauge';
import RiskBadge from './RiskBadge';
import { serieLocalidad } from '../data/mockData';

export default function TarjetaLocalidad({ l }) {
  const serie = serieLocalidad(l);
  return (
    <article className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-800 text-base font-extrabold text-white">
            <Building2 size={18} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold">{l.nombre}</p>
            <p className="truncate text-xs text-slate-500">
              {l.tipo} · {l.provincia}
            </p>
          </div>
        </div>
        <RiskBadge nivel={l.riesgo} />
      </div>

      <div className="mt-2 flex items-center gap-4">
        <SocialClimateGauge indice={l.indice} compact />
        <div className="flex-1">
          <p className="flex items-start gap-1.5 text-xs text-slate-700">
            <AlertTriangle size={13} className="mt-0.5 shrink-0 text-orange-500" />
            <span>{l.foco}</span>
          </p>
          <div className="mt-2 h-14">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={serie} margin={{ top: 2, right: 2, bottom: 0, left: 2 }}>
                <XAxis dataKey="dia" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <Tooltip
                  formatter={(v) => [`${v} / 100`, 'Clima']}
                  contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 11, padding: 4 }}
                />
                <Line type="monotone" dataKey="indice" stroke="#2563eb" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <RadioTower size={12} className="text-slate-400" />
        {l.medios.map((m) => (
          <span key={m} className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
            {m}
          </span>
        ))}
      </div>
    </article>
  );
}
