import { Newspaper, Database, RefreshCw, Layers, Radio, Globe, Tv, Share2, Landmark, Rss } from 'lucide-react';
import { FUENTES, TOTAL_FUENTES } from '../data/mockData';

const ICONOS = {
  radios: Radio,
  portales: Globe,
  tv: Tv,
  redes: Share2,
  agencias: Landmark,
  provinciales: Rss
};

const INGESTION = [
  {
    icono: Rss,
    titulo: 'RSS / JSON Feed y scraping',
    detalle: 'Portales y radios emiten feeds; el resto se captura con scraping ligero de titulares y notas.'
  },
  {
    icono: Share2,
    titulo: 'APIs de redes sociales',
    detalle: 'X, Facebook, Instagram, TikTok y YouTube para cuentas oficiales, militancia y trending topics.'
  },
  {
    icono: Landmark,
    titulo: 'Fuentes oficiales',
    detalle: 'Boletín Oficial, INDEC, BCRA, senado y diputados vía endpoints públicos o publicación diaria.'
  },
  {
    icono: Database,
    titulo: 'Almacenamiento',
    detalle: 'Supabase (PostgreSQL + pgvector): cada nota se guarda con embeddings para búsqueda RAG.'
  },
  {
    icono: Layers,
    titulo: 'Análisis',
    detalle: 'Clasificación de tono, detección de personajes y temas, y agregación por jurisdicción y lapso.'
  }
];

export default function FuentesPanel() {
  return (
    <div className="space-y-3">
      <div className="card p-4">
        <div className="flex items-center gap-2 text-slate-500">
          <Newspaper size={16} className="text-blue-600" />
          <h2 className="text-xs font-bold uppercase tracking-wider">Fuentes de datos del monitoreo</h2>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-slate-900 p-3 text-white">
            <p className="text-2xl font-extrabold">{TOTAL_FUENTES}</p>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Fuentes totales</p>
          </div>
          <div className="rounded-xl bg-slate-100 p-3">
            <p className="text-2xl font-extrabold text-slate-800">{FUENTES.length}</p>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Categorías</p>
          </div>
          <div className="rounded-xl bg-slate-100 p-3">
            <p className="text-2xl font-extrabold text-slate-800">15 min</p>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Actualización</p>
          </div>
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500">
          <RefreshCw size={12} /> Cobertura: 24 provincias + CABA · redes en streaming 24/7
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {FUENTES.map((c) => {
          const Icon = ICONOS[c.id] || Globe;
          return (
            <section key={c.id} className="card p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600">
                  <Icon size={16} className="text-blue-600" /> {c.nombre}
                </p>
                <span className="chip bg-slate-900 text-white">{c.total}</span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">{c.descripcion}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                  {c.cobertura}
                </span>
                <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                  {c.periodicidad}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {c.fuentes.map((f) => (
                  <span key={f} className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                    {f}
                  </span>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <section className="card p-4">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
          <Database size={16} className="text-blue-600" /> Cómo se nutre la app
        </p>
        <ul className="mt-3 space-y-3">
          {INGESTION.map((s, i) => (
            <li key={i} className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                <s.icono size={15} className="text-slate-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">{s.titulo}</p>
                <p className="text-xs text-slate-600">{s.detalle}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <p className="rounded-xl bg-yellow-50 p-3 text-center text-xs text-yellow-800 ring-1 ring-yellow-200">
        Los datos que ves hoy son de <b>ejemplo (mock)</b>. Este panel documenta las fuentes reales que se
        conectarán vía ingestión (RSS, scraping, APIs) hacia Supabase.
      </p>
    </div>
  );
}
