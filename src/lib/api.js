import { validarJSON, construirPromptChat, construirPromptNarrativas, LLM_SCHEMAS } from './llm';
import { buscarContexto, getSupabase } from './supabase';
import { MOCK_RAG_ANSWER, PERSONAJES } from '../data/mockData';

// =============================================================
// CONFIGURACIÓN
// =============================================================
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

const PROVEEDOR = import.meta.env.VITE_LLM_PROVIDER || 'groq';
const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY || '';
const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const MODO_MOCK = import.meta.env.VITE_LLM_MODE === 'mock';
const EDGE_FUNCTION_URL = import.meta.env.VITE_EDGE_FUNCTION_URL || '';

const TIMEOUT_MS = 30000;
const intentos = { actual: 0, maximo: 2 };

// =============================================================
// UTILIDADES
// =============================================================
async function fetchConTimeout(url, opciones, ms = TIMEOUT_MS) {
  const controlador = new AbortController();
  const timer = setTimeout(() => controlador.abort(), ms);
  try {
    const res = await fetch(url, { ...opciones, signal: controlador.signal });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

function simularLatencia(ms = 900) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// =============================================================
// MODO PRODUCCIÓN: Edge Functions (keys seguras server-side)
// =============================================================
async function llamarEdgeFunction(nombre, body) {
  if (!EDGE_FUNCTION_URL) {
    throw new Error('EDGE_FUNCTION_URL no configurada. Usá modo mock o configurá la Edge Function.');
  }

  const supabase = getSupabase();
  const url = `${EDGE_FUNCTION_URL}/functions/v1/${nombre}`;

  const headers = { 'Content-Type': 'application/json' };
  if (supabase) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
  }

  const res = await fetchConTimeout(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const texto = await res.text().catch(() => '');
    throw new Error(`Edge Function ${nombre} falló (${res.status}): ${texto.slice(0, 300)}`);
  }

  return res.json();
}

// =============================================================
// MODO DESARROLLO: LLM directo (keys en cliente)
// =============================================================
async function llamarGroq(prompt) {
  const res = await fetchConTimeout(
    GROQ_URL,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_KEY}`
      },
      body: JSON.stringify({
        model: import.meta.env.VITE_GROQ_MODEL || 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: 'Respondé según las reglas.' }
        ],
        temperature: 0.3,
        max_tokens: 1500,
        response_format: { type: 'json_object' }
      })
    },
    TIMEOUT_MS
  );

  if (!res.ok) {
    const cuerpo = await res.text().catch(() => '');
    throw new Error(`Groq HTTP ${res.status}: ${cuerpo.slice(0, 300)}`);
  }

  const json = await res.json();
  const contenido = json?.choices?.[0]?.message?.content;
  if (!contenido) throw new Error('Groq no devolvió contenido.');
  return contenido;
}

async function llamarGemini(prompt) {
  const res = await fetchConTimeout(
    `${GEMINI_URL}?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1500,
          responseMimeType: 'application/json'
        }
      })
    },
    TIMEOUT_MS
  );

  if (!res.ok) {
    const cuerpo = await res.text().catch(() => '');
    throw new Error(`Gemini HTTP ${res.status}: ${cuerpo.slice(0, 300)}`);
  }

  const json = await res.json();
  const texto = json?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
  if (!texto) throw new Error('Gemini no devolvió contenido.');
  return texto;
}

async function invocarLLMDirecto(prompt) {
  const provedorReal = PROVEEDOR.toLowerCase() === 'gemini' ? 'gemini' : 'groq';
  if (provedorReal === 'groq') return llamarGroq(prompt);
  return llamarGemini(prompt);
}

// =============================================================
// CHAT CON RAG
// =============================================================
export async function generarRespuestaChat(consulta, contexto) {
  // Modo producción: usar Edge Function
  if (EDGE_FUNCTION_URL && !MODO_MOCK) {
    try {
      const resultado = await llamarEdgeFunction('chat', {
        consulta,
        perfil: contexto?.perfil || 'Oficialista',
        jurisdiccion: contexto?.jurisdiccion || 'nacion'
      });
      return { ...resultado, mock: false };
    } catch (err) {
      console.warn('Edge Function falló, intentando modo directo:', err.message);
      // Fallback a modo directo si hay keys
      if (!GROQ_KEY && !GEMINI_KEY) {
        await simularLatencia();
        return generarMock(consulta);
      }
    }
  }

  // Modo mock
  if (MODO_MOCK || (!GROQ_KEY && !GEMINI_KEY)) {
    await simularLatencia();
    return generarMock(consulta);
  }

  // Modo directo: LLM en cliente
  let prompt = construirPromptChat(consulta, contexto);

  try {
    const docs = await buscarContexto(consulta, 6);
    if (docs && docs.length > 0) {
      prompt += `\n\nCONTEXTO RECUPERADO (RAG - fuentes del monitoreo):\n${docs
        .map((d) => `- [${d?.fuente || 'fuente'}] ${d?.contenido || ''} (score ${d?.similarity ?? 'n/a'})`)
        .join('\n')}`;
    }
  } catch (err) {
    console.warn('RAG deshabilitado:', err.message);
  }

  while (intentos.actual < intentos.maximo) {
    try {
      const texto = await invocarLLMDirecto(prompt);
      const datos = validarJSON(texto, LLM_SCHEMAS.chat);
      intentos.actual = 0;
      return { ...datos, mock: false };
    } catch (err) {
      intentos.actual += 1;
      if (intentos.actual >= intentos.maximo) {
        intentos.actual = 0;
        throw new Error(`El LLM falló tras ${intentos.maximo} intentos: ${err.message}`);
      }
    }
  }

  intentos.actual = 0;
  throw new Error('Proveedor LLM no disponible.');
}

// =============================================================
// GUERRA DE NARRATIVAS
// =============================================================
export async function generarGuerraNarrativas(tema, contexto) {
  // Modo producción: usar Edge Function
  if (EDGE_FUNCTION_URL && !MODO_MOCK) {
    try {
      const resultado = await llamarEdgeFunction('narrativas', {
        tema,
        perfil: contexto?.perfil || 'Oficialista',
        jurisdiccion: contexto?.jurisdiccion || 'nacion'
      });
      return { ...resultado, mock: false };
    } catch (err) {
      console.warn('Edge Function falló, intentando modo directo:', err.message);
      if (!GROQ_KEY && !GEMINI_KEY) {
        await simularLatencia(1200);
        return mockGuerraNarrativas(tema);
      }
    }
  }

  // Modo mock
  if (MODO_MOCK || (!GROQ_KEY && !GEMINI_KEY)) {
    await simularLatencia(1200);
    return mockGuerraNarrativas(tema);
  }

  // Modo directo
  let prompt = construirPromptNarrativas(tema, contexto);

  try {
    const docs = await buscarContexto(tema, 10);
    if (docs && docs.length > 0) {
      prompt += `\n\nCONTEXTO RECUPERADO (RAG - fuentes del monitoreo):\n${docs
        .map((d) => `- [${d?.fuente || 'fuente'}] ${d?.contenido || ''} (score ${d?.similarity ?? 'n/a'})`)
        .join('\n')}`;
    }
  } catch (err) {
    console.warn('RAG deshabilitado para narrativas:', err.message);
  }

  let intentosLlm = 0;
  const maxIntentos = 2;

  while (intentosLlm < maxIntentos) {
    try {
      const texto = await invocarLLMDirecto(prompt);
      const datos = validarJSON(texto, LLM_SCHEMAS.guerraNarrativas);
      return { ...datos, mock: false };
    } catch (err) {
      intentosLlm += 1;
      if (intentosLlm >= maxIntentos) {
        throw new Error(`El LLM falló tras ${maxIntentos} intentos: ${err.message}`);
      }
    }
  }

  throw new Error('Proveedor LLM no disponible.');
}

// =============================================================
// DASHBOARD (datos reales de Supabase)
// =============================================================
export async function obtenerDashboard(jurisdiccion = 'nacion', horas = 168) {
  // Modo producción: usar Edge Function
  if (EDGE_FUNCTION_URL && !MODO_MOCK) {
    try {
      const res = await fetchConTimeout(
        `${EDGE_FUNCTION_URL}/functions/v1/dashboard?jurisdiccion=${jurisdiccion}&horas=${horas}`,
        { method: 'GET', headers: { 'Content-Type': 'application/json' } }
      );
      if (res.ok) return res.json();
    } catch (err) {
      console.warn('Dashboard Edge Function falló:', err.message);
    }
  }

  // Modo directo: query a Supabase
  const db = getSupabase();
  if (db) {
    try {
      const { data: resumen } = await db.rpc('resumen_dashboard', {
        jurisdiccion_param: jurisdiccion,
        horas_atras: horas
      });

      const { data: jurisdicciones } = await db
        .from('jurisdicciones')
        .select('*')
        .order('riesgo', { ascending: false });

      const { data: personajes } = await db
        .from('personajes')
        .select('*')
        .gte('menciones', 3)
        .order('menciones', { ascending: false })
        .limit(10);

      const { data: clima } = await db
        .from('clima_serie')
        .select('fecha, indice')
        .order('fecha', { ascending: false })
        .limit(30);

      if (resumen) {
        return {
          jurisdiccion,
          indice_clima_social: resumen.indice_clima || 50,
          riesgo_protesta: resumen.riesgo_protesta || 'medio',
          total_articulos: resumen.total_articulos || 0,
          jurisdicciones: jurisdicciones || [],
          personajes: personajes || [],
          tendencia_clima: (clima || []).reverse(),
          periodo: { horas, label: horas <= 24 ? '24h' : horas <= 168 ? '7d' : '30d' }
        };
      }
    } catch (err) {
      console.warn('Supabase query falló:', err.message);
    }
  }

  return null;
}

// =============================================================
// UTILIDADES PÚBLICAS
// =============================================================
export function disponibleLLM() {
  return !MODO_MOCK && (Boolean(GROQ_KEY) || Boolean(GEMINI_KEY) || Boolean(EDGE_FUNCTION_URL));
}

export function esModoProduccion() {
  return Boolean(EDGE_FUNCTION_URL) && !MODO_MOCK;
}

// =============================================================
// MOCK DATA (para modo demo)
// =============================================================
function generarMock(consulta) {
  const q = consulta.toLowerCase();
  const persona = PERSONAJES.find((p) => p.nombre.toLowerCase().split(' ').some((t) => q.includes(t)));

  if (persona) {
    return {
      respuesta:
        `Humor de la información sobre ${persona.nombre} en las últimas 48 h:\n\n• Índice de sentimiento: ${persona.sentimiento}/100 (${persona.sentimiento >= 70 ? 'favorable' : persona.sentimiento >= 45 ? 'neutral' : 'desfavorable'}).\n• Tono de menciones: ${persona.tono.pos}% positivo, ${persona.tono.neu}% neutral, ${persona.tono.neg}% negativo.\n• ${persona.menciones.toLocaleString('es-AR')} menciones. Temas dominantes: ${persona.temas.join(', ')}.\n• Tesis más repetida: "${persona.ultimas[0].titulo}" (${persona.ultimas[0].medio}).`,
      fuentes: persona.ultimas.map((m) => ({ medio: m.medio, tipo: 'Digital', menciones: Math.ceil(persona.menciones / 100) })),
      sentimiento: persona.sentimiento >= 55 ? 'positivo' : persona.sentimiento >= 45 ? 'neutral' : 'negativo',
      score_confianza: 0.91,
      mock: true
    };
  }

  return {
    ...MOCK_RAG_ANSWER,
    respuesta: MOCK_RAG_ANSWER.respuesta,
    mock: true
  };
}

function mockGuerraNarrativas(tema) {
  const t = tema.toLowerCase();
  const esEconomico = /econom|dólar|inflaci|presupuest|ajuste|superávit|fiscal|tarif|deuda|impuest/.test(t);
  const esSindical = /sindic|gremial|cgta|cta|paro|moviliz|laboral|trabaj/.test(t);
  const esSocial = /protest|cort|social|pobreza|jubilad|salud|educac/.test(t);

  let oficialista, opositor;

  if (esEconomico) {
    oficialista = {
      eje: '"El país crece con estabilidad: las cuentas están ordenadas"',
      tesis: 'El gobierno presenta los datos macro como prueba de que el modelo funciona. La inflación baja, el superávit se sostiene y la inversión llega.',
      tics: ['superávit', 'inflación a la baja', 'estabilidad cambiaria', 'inversión extranjera', 'orden fiscal'],
      activos: ['Datos duros favorables (INDEC, BCRA)', 'Cobertura de medios economy-friendly'],
      pasivos: ['Percepción de recesión en la calle', 'Tarifazos que impactan directo']
    };
    opositor = {
      eje: '"La macro no se come: la gente está peor que hace un año"',
      tesis: 'Los números no se reflejan en el bolsillo. El ajuste cayó sobre jubilados, trabajadores y provincias.',
      tics: ['ajuste', 'recesión', 'tarifazos', 'pobreza', 'caída del consumo'],
      activos: ['Encuestas de percepción negativa', 'Provincias como tableau del ajuste'],
      pasivos: ['Falta de plan económico alternativo', 'División interna sobre estrategia']
    };
  } else if (esSindical) {
    oficialista = {
      eje: '"La movilización es minoritaria y no representa a los trabajadores"',
      tesis: 'El gobierno califica la protesta como gremial, no popular. Destaca el diálogo institucional.',
      tics: ['diálogo social', 'sectorial', 'gremialismo', 'mesa de negociación', 'minoritario'],
      activos: ['Gremios aliados que no participan', 'Fragmentación de la protesta'],
      pasivos: ['Foto de masiva movilización', 'Cobertura mediática del paro']
    };
    opositor = {
      eje: '"Es el grito de un pueblo que no da más"',
      tesis: 'La movilización supera lo gremial: es transversal (jubilados, docentes, provincias).',
      tics: ['movilización popular', 'ajuste', 'trabajo en negro', 'caída del poder adquisitivo', 'unidad gremial'],
      activos: ['FOTO histórica de unidad CGT-CTA', 'Viralización en redes'],
      pasivos: ['Riesgo de desbordes', 'Falta de agenda política concreta']
    };
  } else {
    oficialista = {
      eje: '"Trabajamos con los hechos: resultados, no relato"',
      tesis: 'El gobierno pone sobre la mesa logros concretos: inflación baja, inversiones que entran.',
      tics: ['resultados', 'hechos', 'logros', 'avances', 'progreso'],
      activos: ['Datos objetivos de mejora macro', 'Proyectos de inversión visibles'],
      pasivos: ['Percepción de desconexión de la calle', 'Costo político de medidas impopulares']
    };
    opositor = {
      eje: '"Venden humo mientras la gente sufre las consecuencias"',
      tesis: 'Los números oficiales no reflejan la realidad. La pobreza sube y las provincias están ahogadas.',
      tics: ['pobreza', 'recesión', 'humo', 'costo social', 'provincias abandonadas'],
      activos: ['Encuestas negativas', 'Historias humanas en medios provinciales'],
      pasivos: ['Falta de un plan B creíble', 'Usos internos que debilitan el mensaje']
    };
  }

  return {
    tema,
    encuadre_oficialista: oficialista,
    encuadre_opositor: opositor,
    neutrales: [
      'Periodistas especializados advierten que "la narrativa depende de quién mida".',
      'Encuestas internas muestran que ambos mensajes tienen llegada pero ninguno domina.'
    ],
    fuentes_principales: [
      { medio: 'Cadena 3', tipo: 'AM', menciones: 8 },
      { medio: 'TN', tipo: 'TV', menciones: 6 },
      { medio: 'Infobae', tipo: 'Digital', menciones: 12 },
      { medio: 'Radio Mitre', tipo: 'FM', menciones: 7 },
      { medio: 'Página 12', tipo: 'Digital', menciones: 5 }
    ],
    sentimiento_general: esSocial || esSindical ? 'negativo' : 'neutral',
    score_confianza: 0.78,
    mock: true
  };
}
