import { useState } from 'react';
import { Zap, Loader2, AlertCircle, Newspaper } from 'lucide-react';
import NarrativeWar from './NarrativeWar';
import { generarGuerraNarrativas, disponibleLLM } from '../lib/api';
import { buildContexto } from '../data/mockData';

const TEMAS_SUGERIDOS = [
  'Presupuesto 2026',
  'Tarifazo energético',
  'Paro general CGT',
  'Crisis energética',
  'Ley de Bases',
  'Corte Suprema y DNU',
  'Vaca Muerta y exportación',
  'Inflación y tarifas'
];

export default function GuerraNarrativasLibre({ perfil = 'Oficialista' }) {
  const [tema, setTema] = useState('');
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState(null);
  const llmActivo = disponibleLLM();

  const analizar = async (texto) => {
    const t = (texto ?? tema).trim();
    if (!t || cargando) return;
    setTema(t);
    setCargando(true);
    setError(null);
    setResultado(null);

    try {
      const res = await generarGuerraNarrativas(t, buildContexto(perfil));
      setResultado(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <p className="text-[11px] text-slate-500">
          Escribí un tema de actualidad y la app busca en todas las fuentes del monitoreo para armar la guerra de narrativas completa.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          analizar();
        }}
        className="flex items-center gap-2"
      >
        <input
          value={tema}
          onChange={(e) => setTema(e.target.value)}
          placeholder="Ej: Paro general de la CGT, tarifazo, Presupuesto..."
          className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          disabled={cargando}
        />
        <button
          type="submit"
          disabled={!tema.trim() || cargando}
          className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow hover:bg-blue-500 disabled:opacity-40"
        >
          {cargando ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
          Analizar
        </button>
      </form>

      {!resultado && !cargando && (
        <div className="flex flex-wrap gap-1.5">
          {TEMAS_SUGERIDOS.map((s) => (
            <button
              key={s}
              onClick={() => {
                setTema(s);
                analizar(s);
              }}
              disabled={cargando}
              className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-200 disabled:opacity-40"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {cargando && (
        <div className="card flex items-center gap-3 p-4">
          <Loader2 size={20} className="animate-spin text-blue-600" />
          <div>
            <p className="text-sm font-bold text-slate-800">Analizando "{tema}"...</p>
            <p className="text-[11px] text-slate-500">Buscando en fuentes del monitoreo y generando encuadres</p>
          </div>
        </div>
      )}

      {resultado && (
        <div className="space-y-3">
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between bg-slate-900 px-4 py-2.5">
              <p className="text-sm font-bold text-white">Guerra de Narrativas: {resultado.tema}</p>
              <div className="flex items-center gap-2">
                {resultado.mock && (
                  <span className="rounded-md bg-yellow-500/20 px-2 py-0.5 text-[10px] font-bold text-yellow-300">
                    DEMO
                  </span>
                )}
                <span
                  className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                    resultado.sentimiento_general === 'positivo'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : resultado.sentimiento_general === 'negativo'
                      ? 'bg-red-500/20 text-red-300'
                      : 'bg-slate-500/20 text-slate-300'
                  }`}
                >
                  {resultado.sentimiento_general}
                </span>
                <span className="rounded-md bg-blue-500/20 px-2 py-0.5 text-[10px] font-bold text-blue-300">
                  {Math.round(resultado.score_confianza * 100)}% confianza
                </span>
              </div>
            </div>
            <div className="p-4">
              <NarrativeWar narrativa={resultado} />
            </div>
          </div>

          {resultado.fuentes_principales?.length > 0 && (
            <div className="card p-4">
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                <Newspaper size={14} className="text-blue-600" /> Fuentes que cubren este tema
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {resultado.fuentes_principales.map((f, i) => (
                  <span
                    key={i}
                    className="flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700"
                  >
                    {f.medio}
                    <span className="text-[10px] text-slate-400">· {f.tipo}</span>
                    <span className="rounded-md bg-blue-100 px-1.5 py-0.5 text-[10px] text-blue-700">
                      {f.menciones}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {!llmActivo && (
            <p className="text-center text-[11px] text-slate-400">
              Datos de demostración · Configurá una API key de Groq o Gemini para análisis reales
            </p>
          )}
        </div>
      )}
    </div>
  );
}
