const COLORES = {
  bajo: 'bg-emerald-100 text-emerald-700',
  medio: 'bg-yellow-100 text-yellow-700',
  alto: 'bg-orange-100 text-orange-700',
  critico: 'bg-red-100 text-red-700'
};

export default function ProvinceRiskMap({ provincias }) {
  if (!provincias) return null;
  return (
    <div>
      <ul className="space-y-2">
        {provincias.map((p) => (
          <li key={p.provincia} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
            <div>
              <p className="text-sm font-bold text-slate-800">{p.provincia}</p>
              <p className="text-xs text-slate-500">{p.foco}</p>
            </div>
            <span className={`chip ${COLORES[p.riesgo] || COLORES.medio} capitalize`}>{p.riesgo}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
