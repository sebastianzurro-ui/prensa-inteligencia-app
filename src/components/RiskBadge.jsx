import { AlertTriangle, ShieldAlert, Info, Flame } from 'lucide-react';

const CONFIG = {
  bajo: { color: '#16a34a', bg: 'bg-emerald-100 text-emerald-800', Icon: Info, label: 'Riesgo de protesta: Bajo' },
  medio: { color: '#ca8a04', bg: 'bg-yellow-100 text-yellow-800', Icon: ShieldAlert, label: 'Riesgo de protesta: Medio' },
  alto: { color: '#ea580c', bg: 'bg-orange-100 text-orange-800', Icon: AlertTriangle, label: 'Riesgo de protesta: Alto' },
  critico: { color: '#dc2626', bg: 'bg-red-100 text-red-800', Icon: Flame, label: 'Riesgo de protesta: Crítico' }
};

export default function RiskBadge({ nivel = 'alto' }) {
  const cfg = CONFIG[nivel] || CONFIG.alto;
  const Icon = cfg.Icon;
  return (
    <span className={`chip ${cfg.bg} animate-pulse-slow`} title={cfg.label}>
      <Icon size={14} />
      {cfg.label}
    </span>
  );
}
