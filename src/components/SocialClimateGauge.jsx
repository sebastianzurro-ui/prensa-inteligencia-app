import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { colorScore, rotuloScore } from './SentimentGauge';

export default function SocialClimateGauge({ indice = 42, compact = false }) {
  const color = colorScore(indice);

  return (
    <div className={`relative w-full ${compact ? 'h-32' : 'h-56'}`}>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          data={[{ name: 'clima', value: indice, fill: color }]}
          innerRadius="72%"
          outerRadius="100%"
          startAngle={210}
          endAngle={-30}
          cx="50%"
          cy="50%"
        >
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} axisLine={false} />
          <RadialBar dataKey="value" background={{ fill: '#e2e8f0' }} cornerRadius={14} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pt-4">
        <span className={`font-extrabold tabular-nums ${compact ? 'text-4xl' : 'text-5xl'}`} style={{ color }}>
          {indice}
        </span>
        {!compact && (
          <span className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-500">de 100</span>
        )}
        <span
          className={`rounded-full font-bold text-white ${compact ? 'mt-1 px-2.5 py-0.5 text-[10px]' : 'mt-1 px-3 py-0.5 text-xs'}`}
          style={{ backgroundColor: color }}
        >
          Clima {rotuloScore(indice)}
        </span>
      </div>
    </div>
  );
}
