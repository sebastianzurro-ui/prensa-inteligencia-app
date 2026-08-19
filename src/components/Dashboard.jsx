import { useState, useEffect, useMemo } from 'react';
import { Scale, Megaphone, TrendingUp, Map, CalendarClock, ArrowUpRight, ArrowDownRight, Clock, WifiOff, Wand } from 'lucide-react';
import Header from './Header';
import RiskBadge from './RiskBadge';
import PeriodSelector from './PeriodSelector';
import SocialClimateGauge from './SocialClimateGauge';
import NarrativeWar from './NarrativeWar';
import RecommendedAction from './RecommendedAction';
import ClimateTrend from './ClimateTrend';
import ProvinceRiskMap from './ProvinceRiskMap';
import CollapsibleCard from './CollapsibleCard';
import BuscadorForm from './BuscadorForm';
import GuerraNarrativasLibre from './GuerraNarrativasLibre';
import { getDashboard, MAPA_RIESGO_PROVINCIAS, RIESGO } from '../data/mockData';
import { obtenerDashboard, esModoProduccion } from '../lib/api';

function ChipVariacion({ variacion, lapso }) {
  if (variacion === null || variacion === undefined) return null;
  const sube = variacion >= 0;
  return (
    <span
      className={`chip ${sube ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}
      title="Índice ponderado del lapso vs. lapso anterior equivalente"
    >
      {sube ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
      {sube ? '+' : ''}
      {variacion} pts en {lapso}
    </span>
  );
}

export default function Dashboard({ periodo, onCambiarPeriodo, onBuscar }) {
  const [jurisdiccion, setJurisdiccion] = useState('nacion');
  const [locText, setLocText] = useState('');
  const [perText, setPerText] = useState('');
  const [datosReales, setDatosReales] = useState(null);
  const [cargandoDatos, setCargandoDatos] = useState(false);

  const dashMock = useMemo(() => getDashboard(periodo, jurisdiccion), [periodo, jurisdiccion]);

  // Intentar cargar datos reales de Supabase
  useEffect(() => {
    if (!esModoProduccion()) return;

    let cancelado = false;
    setCargandoDatos(true);

    const horasMap = { '24h': 24, '72h': 72, '7d': 168, '14d': 336, '30d': 720 };
    const horas = horasMap[periodo] || 168;

    obtenerDashboard(jurisdiccion, horas)
      .then((datos) => {
        if (!cancelado && datos) {
          setDatosReales(datos);
        }
      })
      .catch((err) => {
        console.warn('No se pudieron cargar datos reales:', err.message);
      })
      .finally(() => {
        if (!cancelado) setCargandoDatos(false);
      });

    return () => { cancelado = true; };
  }, [periodo, jurisdiccion]);

  // Usar datos reales si están disponibles, sino mock
  const dash = datosReales
    ? {
        ...dashMock,
        indice_clima_social: datosReales.indice_clima_social,
        riesgo_protesta: datosReales.riesgo_protesta,
        jurisdiccion: datosReales.jurisdiccion,
        periodo: datosReales.periodo || dashMock.periodo,
        tendencia_clima: datosReales.tendencia_clima?.length > 0
          ? datosReales.tendencia_clima.map((c) => ({
              fecha: c.fecha,
              dia: new Date(c.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }).replace('.', ''),
              indice: c.indice
            }))
          : dashMock.tendencia_clima,
        resumen_ejecutivo: {
          ...dashMock.resumen_ejecutivo,
          titulo: datosReales.total_articulos > 0
            ? `${datosReales.total_articulos} artículos monitoreados · ${datosReales.jurisdiccion}`
            : dashMock.resumen_ejecutivo.titulo,
          texto: datosReales.total_articulos > 0
            ? `Distribución: ${datosReales.distribucion_tonos?.positivos || 0} positivos, ${datosReales.distribucion_tonos?.negativos || 0} negativos, ${datosReales.distribucion_tonos?.neutros || 0} neutros en las últimas ${(datosReales.periodo?.horas || 168)}h.`
            : dashMock.resumen_ejecutivo.texto
        },
        _esReal: true
      }
    : dashMock;

  const tendencia = dash.tendencia_clima;
  const direccion =
    tendencia.length >= 2
      ? tendencia[tendencia.length - 1].indice - tendencia[tendencia.length - 2].indice
      : 0;

  return (
    <div className="space-y-3">
      <BuscadorForm
        localidad={locText}
        persona={perText}
        onLocalidad={setLocText}
        onPersona={setPerText}
        onSubmit={(e) => {
          if (e) e.preventDefault();
          onBuscar(locText, perText);
        }}
        destacado
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Header jurisdiccion={jurisdiccion} onChangeJurisdiccion={setJurisdiccion} />
        <div className="flex items-center gap-2">
          {dash._esReal && (
            <span className="chip bg-emerald-100 text-emerald-800">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Datos en vivo
            </span>
          )}
          {cargandoDatos && (
            <span className="chip bg-blue-100 text-blue-800">
              Actualizando...
            </span>
          )}
          <span className="hidden text-[10px] font-bold uppercase tracking-wider text-slate-400 sm:inline">
            Ponderar lapso
          </span>
          <PeriodSelector periodo={periodo} onChange={onCambiarPeriodo} compact />
        </div>
      </div>

      <section className="card overflow-hidden">
        <div className="grid grid-cols-1 gap-2 p-4 md:grid-cols-[170px,1fr] md:gap-4">
          <div className="flex items-center gap-4 md:block">
            <SocialClimateGauge indice={dash.indice_clima_social} compact />
            <div className="md:hidden">
              <RiskBadge nivel={dash.riesgo_protesta} />
            </div>
          </div>

          <div>
            <div className="hidden md:block">
              <RiskBadge nivel={dash.riesgo_protesta} />
            </div>
            <h2 className="mt-1 text-lg font-extrabold leading-tight">{dash.resumen_ejecutivo.titulo}</h2>
            <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-slate-600">
              {dash.resumen_ejecutivo.texto}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <ChipVariacion variacion={dash.variacion} lapso={dash.periodo.label} />
              <span className={`chip ${direccion >= 0 ? 'bg-slate-100 text-slate-700' : 'bg-slate-100 text-slate-700'}`}>
                <TrendingUp size={13} className={direccion >= 0 ? 'text-emerald-600' : 'text-red-600'} />
                Último día: {direccion >= 0 ? '+' : ''}
                {direccion} pts
              </span>
              <span className="chip bg-slate-100 text-slate-500">
                <Clock size={13} /> {dash.ultima_actualizacion || 'Ahora'}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {dash.resumen_ejecutivo.alertas?.map((a, i) => (
                <span key={i} className="rounded-lg bg-slate-900 px-2 py-1 text-[11px] font-semibold text-white">
                  {a}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <CollapsibleCard titulo="Guerra de Narrativas" icon={Scale} defaultOpen>
        <NarrativeWar narrativa={dash.guerra_de_narrativas} />
      </CollapsibleCard>

      <CollapsibleCard titulo="Guerra de Narrativas por Tema" icon={Wand}>
        <GuerraNarrativasLibre />
      </CollapsibleCard>

      <CollapsibleCard titulo="Acción Recomendada" icon={Megaphone}>
        <RecommendedAction accion={dash.accion_recomendada} />
      </CollapsibleCard>

      <CollapsibleCard titulo="Tendencias y Mapa de Riesgo" icon={Map}>
        <ClimateTrend datos={dash.tendencia_clima} periodoLabel={dash.periodo.label} />
        <div className="mt-4">
          <ProvinceRiskMap provincias={MAPA_RIESGO_PROVINCIAS} />
        </div>
      </CollapsibleCard>

      <CollapsibleCard titulo="Agenda y Acciones Urgentes" icon={CalendarClock}>
        <ul className="space-y-2">
          {dash.acciones_urgentes?.map((a, i) => (
            <li key={i} className="flex items-start gap-3 rounded-xl bg-slate-50 px-3 py-2">
              <span className="mt-0.5 flex shrink-0 items-center gap-1 rounded-md bg-slate-900 px-2 py-1 text-[10px] font-bold text-white">
                <Clock size={10} /> {a.tiempo}
              </span>
              <div>
                <p className="text-sm text-slate-800">{a.item}</p>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{a.area}</p>
              </div>
            </li>
          ))}
        </ul>
      </CollapsibleCard>

      <p className="text-center text-xs text-slate-400">
        {dash._esReal ? (
          <>Monitoreo en vivo · {dash.total_articulos || 0} artículos · Datos actualizados automáticamente</>
        ) : (
          <>Modo demo · Datos de ejemplo · Configurá Supabase + Edge Functions para datos reales</>
        )}
      </p>
    </div>
  );
}
