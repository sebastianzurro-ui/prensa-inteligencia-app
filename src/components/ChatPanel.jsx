import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { generarRespuestaChat } from '../lib/api';
import { SUGERENCIAS_CHAT, buildContexto } from '../data/mockData';
import { disponibleLLM } from '../lib/api';

function formatearViñetas(texto) {
  const lineas = texto.split('\n').filter((l) => l.trim());
  return lineas.map((linea, i) => {
    const limpia = linea.replace(/^[•\-*\d+.\s]+/, '');
    return (
      <p key={i} className="flex items-start gap-1.5 text-[15px] leading-relaxed">
        <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-current opacity-60" />
        <span>{limpia}</span>
      </p>
    );
  });
}

function Mensaje({ rol, contenido, meta }) {
  const esBot = rol === 'bot';
  return (
    <div className={`flex items-end gap-2 ${esBot ? '' : 'flex-row-reverse'}`}>
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          esBot ? 'bg-slate-900 text-white' : 'bg-blue-600 text-white'
        }`}
      >
        {esBot ? <Bot size={16} /> : <User size={16} />}
      </div>
      <div
        className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 ${
          esBot ? 'rounded-bl-sm bg-white shadow-card ring-1 ring-slate-200' : 'rounded-br-sm bg-blue-600 text-white'
        }`}
      >
        {contenido}
        {meta && (
          <p className={`mt-1.5 text-[10px] ${esBot ? 'text-slate-400' : 'text-blue-200'}`}>{meta}</p>
        )}
      </div>
    </div>
  );
}

export default function ChatPanel() {
  const [mensajes, setMensajes] = useState([]);
  const [input, setInput] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [perfil, setPerfil] = useState('Oficialista');
  const finRef = useRef(null);
  const llmActivo = disponibleLLM();

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes, cargando]);

  const enviar = async (texto) => {
    const consulta = (texto ?? input).trim();
    if (!consulta || cargando) return;
    setInput('');
    setError(null);

    setMensajes((prev) => [...prev, { rol: 'user', contenido: consulta }]);
    setCargando(true);

    try {
      const resp = await generarRespuestaChat(consulta, buildContexto(perfil));
      setMensajes((prev) => [
        ...prev,
        {
          rol: 'bot',
          contenido: (
            <div>
              {formatearViñetas(resp.respuesta)}
              {resp.fuentes?.length > 0 && (
                <div className="mt-3 border-t border-slate-100 pt-2">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Fuentes del monitoreo</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {resp.fuentes.map((f, i) => (
                      <span key={i} className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                        {f.medio} · {f.menciones}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ),
          meta: `${resp.mock ? 'Datos de ejemplo · ' : ''}Confianza ${Math.round(resp.score_confianza * 100)}% · Sentimiento ${resp.sentimiento}`
        }
      ]);
    } catch (err) {
      setError(err.message);
      setMensajes((prev) => [
        ...prev,
        {
          rol: 'bot',
          contenido: <p className="text-sm">No pude generar la respuesta. {err.message}</p>
        }
      ]);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="flex flex-col" style={{ height: 'calc(100dvh - 10.5rem)' }}>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-white">
            <Sparkles size={16} />
          </div>
          <div>
            <h2 className="text-sm font-extrabold">Agente RAG</h2>
            <p className="text-[11px] text-slate-500">
              {llmActivo ? 'LLM conectado · busca en base vectorial' : 'Modo demo (sin API key)'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
          {['Oficialista', 'Opositor'].map((p) => (
            <button
              key={p}
              onClick={() => setPerfil(p)}
              className={`rounded-md px-2.5 py-1 text-[11px] font-bold ${
                perfil === p ? 'bg-white shadow text-slate-900' : 'text-slate-500'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto rounded-2xl bg-slate-200/60 p-3">
        {mensajes.length === 0 && (
          <div className="space-y-2">
            <p className="px-2 pt-2 text-xs text-slate-500">
              Consultá en lenguaje natural, por ejemplo:
            </p>
            {SUGERENCIAS_CHAT.map((s, i) => (
              <button
                key={i}
                onClick={() => enviar(s)}
                disabled={cargando}
                className="block w-full rounded-xl bg-white px-3 py-2.5 text-left text-sm text-slate-700 shadow-card ring-1 ring-slate-200 hover:ring-blue-400 disabled:opacity-50"
              >
                “{s}”
              </button>
            ))}
          </div>
        )}

        {mensajes.map((m, i) => (
          <Mensaje key={i} rol={m.rol} contenido={m.contenido} meta={m.meta} />
        ))}

        {cargando && (
          <div className="flex items-center gap-2 pl-10 text-sm text-slate-500">
            <Loader2 size={16} className="animate-spin" /> Consultando monitoreo y generando respuesta…
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
            <AlertCircle size={15} /> {error}
          </div>
        )}

        <div ref={finRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          enviar();
        }}
        className="mt-3 flex items-center gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ej: ¿Qué se dice en Córdoba sobre el presupuesto?"
          className="flex-1 rounded-full border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
        <button
          type="submit"
          disabled={!input.trim() || cargando}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 text-white shadow disabled:opacity-40"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
