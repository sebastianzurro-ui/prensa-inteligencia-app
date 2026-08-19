import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function ClimateTrend({ datos, periodoLabel = '' }) {
  if (!datos) return null;
  return (
    <div>
      <p className="mb-2 text-xs text-slate-500">
        {periodoLabel ? `Ventana ponderada: ${periodoLabel}` : 'Tendencia del clima social'}
      </p>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={datos} margin={{ top: 4, right: 4, bottom: 0, left: -22 }}>
            <defs>
              <linearGradient id="gradClima" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#2563eb" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="dia" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
            <Tooltip
              formatter={(v) => [`${v} / 100`, 'Índice']}
              contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
            />
            <Area type="monotone" dataKey="indice" stroke="#2563eb" strokeWidth={2} fill="url(#gradClima)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
