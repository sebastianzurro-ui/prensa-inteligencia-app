import { useState, useEffect } from 'react';
import { Crosshair } from 'lucide-react';
import TarjetaPersonaje from './TarjetaPersonaje';
import TarjetaLocalidad from './TarjetaLocalidad';
import SentimentGauge, { colorScore, rotuloScore } from './SentimentGauge';
import PeriodSelector from './PeriodSelector';
import BuscadorForm from './BuscadorForm';
import { PERSONAJES, buscarLocalidad, humorCombinado, PERIODOS } from '../data/mockData';

const SUGERIDOS = [
  { l: 'Córdoba capital', p: 'Milei' },
  { l: 'Gran Buenos Aires', p: 'Cristina' },
  { l: 'Mendoza capital', p: 'Bullrich' },
  { l: 'Rosario', p: 'Kicillof' }
];

export default function Buscador({ periodo, onCambiarPeriodo, iniciales }) {
  const [textLocalidad, setTextLocalidad] = useState(iniciales?.loc || '');
  const [textPersona, setTextPersona] = useState(iniciales?.per || '');
  const [resultado, setResultado] = useState(null);

  const lapso = PERIODOS.find((p) => p.id === periodo) || PERIODOS[2];

  const buscar = (loc = textLocalidad, per = textPersona) => {
    const localidad = buscarLocalidad(loc);
    const t = per.trim().toLowerCase();
    const persona = t
      ? PERSONAJES.find((p) => p.nombre.toLowerCase().split(' ').some((w) => t.includes(w))) || null
      : null;
    setResultado({ localidad, persona, localidadTexto: loc, personaTexto: per });
  };

  useEffect(() => {
    if (iniciales?.ts) {
      setTextLocalidad(iniciales.loc || '');
      setTextPersona(iniciales.per || '');
      buscar(iniciales.loc, iniciales.per);
    }
  }, [iniciales?.ts]);

  const onSubmit = (e) => {
    e.preventDefault();
    buscar();
  };

  const combinado = resultado?.localidad && resultado?.persona;
  const scoreCombinado = combinado ? humorCombinado(resultado.persona, resultado.localidad) : null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-extrabold">Buscador de Localidad + Personaje</h2>
          <p className="text-[11px] text-slate-500">
            Elegí dónde y a quién: obtenés clima de la localidad, humor del personaje y su cruce.
          </p>
        </div>
        <PeriodSelector periodo={periodo} onChange={onCambiarPeriodo} compact />
      </div>

      <BuscadorForm
        localidad={textLocalidad}
        persona={textPersona}
        onLocalidad={setTextLocalidad}
        onPersona={setTextPersona}
        onSubmit={onSubmit}
      />

      {!resultado && (
        <div className="card p-5 text-center text-sm text-slate-500">
          <Crosshair size={20} className="mx-auto mb-2 text-slate-300" />
          Sin búsqueda todavía. Escribí una localidad, un personaje, o ambos, y tocá Buscar.
        </div>
      )}

      {resultado && !resultado.localidad && !resultado.persona && (
        <div className="card p-5 text-center text-sm text-slate-500">
          No encontramos “{resultado.localidadTexto}” ni “{resultado.personaTexto}”. Elegí del listado sugerido
          al escribir.
        </div>
      )}

      {resultado?.localidad && !resultado.persona && (
        <TarjetaLocalidad l={resultado.localidad} />
      )}

      {resultado?.persona && !resultado.localidad && (
        <TarjetaPersonaje p={resultado.persona} lapso={lapso.label} />
      )}

      {resultado?.persona && resultado?.localidad && (
        <div className="space-y-3">
          <div className="card flex items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Humor combinado</p>
              <p className="text-sm font-extrabold leading-tight">
                {resultado.persona.nombre}
                <span className="mx-1 font-normal text-slate-400">en</span>
                {resultado.localidad.nombre}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Menciones sobre este personaje en los medios locales de la localidad ({lapso.label}).
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {resultado.localidad.medios.map((m) => (
                  <span key={m} className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                    {m}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex flex-col items-center">
              <SentimentGauge score={scoreCombinado} compact />
              <span
                className="-mt-1 rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                style={{ backgroundColor: colorScore(scoreCombinado) }}
              >
                {rotuloScore(scoreCombinado)}
              </span>
            </div>
          </div>

          <TarjetaLocalidad l={resultado.localidad} />
          <TarjetaPersonaje p={resultado.persona} lapso={lapso.label} />
        </div>
      )}
    </div>
  );
}
