import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from 'recharts';

export function colorScore(score) {
  if (score >= 70) return '#16a34a';
  if (score >= 45) return '#ca8a04';
  return '#dc2626';
}

export function rotuloScore(score) {
  if (score >= 70) return 'Favorable';
  if (score >= 45) return 'Neutral';
  return 'Desfavorable';
}

export default function SentimentGauge({ score = 50, etiqueta = 'Humor de la información', compact = true }) {
  const color = colorScore(score);
  return (
    <div className={`relative w-full ${compact ? 'h-24 max-w-[110px]' : 'h-44 max-w-[220px]'}`}>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          data={[{ name: 'humor', value: score, fill: color }]}
          innerRadius="70%"
          outerRadius="95%"
          startAngle={210}
          endAngle={-30}
          cx="50%"
          cy="50%"
        >
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} axisLine={false} />
          <RadialBar dataKey="value" background={{ fill: '#e2e8f0' }} cornerRadius={10} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className={`font-extrabold tabular-nums ${compact ? 'text-xl' : 'text-4xl'}`} style={{ color }}>
          {score}
        </span>
        {!compact && (
          <span className="text-xs font-bold uppercase tracking-wide" style={{ color }}>
            {etiqueta}
          </span>
        )}
      </div>
    </div>
  );
}
