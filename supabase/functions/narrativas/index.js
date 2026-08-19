// =============================================================
// Edge Function: Guerra de Narrativas por Tema
// Busca artículos del tema y genera análisis con LLM
// =============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { invocarLLM, validarJSON } from '../shared/llm.js';

const SYSTEM_PROMPT_NARRATIVAS = `
Eres un analista de comunicación política y narrativas en Argentina.
Tu tarea es generar una "Guerra de Narrativas" para un tema de actualidad dado.

REGLAS:
- Respondé en español rioplatense.
- Analizá el tema desde dos ángulos: oficialismo y oposición.
- Usá los datos del monitoreo para fundamentar cada encuadre.
- Identificá el eje discursivo central, la tesis, los TICs, activos y pasivos de cada bando.
- Agregá lecturas neutrales cuando las haya.
- Incluí las fuentes principales.
- Devolvé ÚNICAMENTE JSON válido con este esquema:
{
  "tema": "nombre del tema",
  "encuadre_oficialista": {
    "eje": "eje discursivo central entre comillas",
    "tesis": "desarrollo de la tesis (2-3 oraciones)",
    "tics": ["término 1", "término 2", "término 3", "término 4"],
    "activos": ["ventaja 1", "ventaja 2"],
    "pasivos": ["debilidad 1", "debilidad 2"]
  },
  "encuadre_opositor": {
    "eje": "eje discursivo central entre comillas",
    "tesis": "desarrollo de la tesis (2-3 oraciones)",
    "tics": ["término 1", "término 2", "término 3", "término 4"],
    "activos": ["ventaja 1", "ventaja 2"],
    "pasivos": ["debilidad 1", "debilidad 2"]
  },
  "neutrales": ["lectura neutral 1", "lectura neutral 2"],
  "fuentes_principales": [{ "medio": "nombre", "tipo": "AM|FM|TV|Digital", "menciones": 0 }],
  "sentimiento_general": "positivo|neutral|negativo",
  "score_confianza": 0.0 a 1.0
}
- No agregues texto fuera del JSON.`;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const { tema, perfil = 'Oficialista', jurisdiccion = 'nacion' } = await req.json();

    if (!tema || typeof tema !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Falta el campo "tema"' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_KEY')
    );

    // 1. Buscar artículos del tema
    const { data: articulos } = await supabase
      .rpc('buscar_articulos', {
        query_text: tema,
        limite: 15
      });

    // 2. Obtener contexto del dashboard
    const { data: dashboardData } = await supabase
      .rpc('resumen_dashboard', {
        jurisdiccion_param: jurisdiccion,
        horas_atras: 168
      });

    // 3. Obtener sentimiento de personajes mencionados
    const { data: personajes } = await supabase
      .from('personajes')
      .select('nombre, sentimiento, tono_positivo, tono_negativo, menciones')
      .gte('menciones', 5)
      .order('menciones', { ascending: false })
      .limit(8);

    // 4. Construir contexto rico
    let contextoArticulos = '';
    if (articulos && articulos.length > 0) {
      contextoArticulos = `\n\nARTÍCULOS ENCONTRADOS (${articulos.length}):\n` +
        articulos.map((a) =>
          `- [${a.fuente}] ${a.titulo}\n  Tono: ${a.tono} | Sentimiento: ${a.sentimiento}\n  Personajes: ${a.personajes?.join(', ') || 'ninguno'}\n  Temas: ${a.temas?.join(', ') || 'ninguno'}`
        ).join('\n\n');
    }

    let contextoPersonajes = '';
    if (personajes && personajes.length > 0) {
      contextoPersonajes = `\n\nSENTIMIENTO DE PERSONAJES:\n` +
        personajes.map((p) =>
          `- ${p.nombre}: sentimiento ${p.sentimiento}/100 (+${p.tono_positivo}% / -${p.tono_negativo}%) | ${p.menciones} menciones`
        ).join('\n');
    }

    let contextoDashboard = '';
    if (dashboardData) {
      contextoDashboard = `\n\nCONTEXTO NACIONAL:\n${JSON.stringify(dashboardData, null, 2)}`;
    }

    const prompt = [
      SYSTEM_PROMPT_NARRATIVAS,
      `PERFIL DEL USUARIO: ${perfil}`,
      `JURISDICCIÓN: ${jurisdiccion}`,
      contextoDashboard,
      contextoPersonajes,
      contextoArticulos,
      `TEMA A ANALIZAR: "${tema}"`,
      'Generá la guerra de narrativas para este tema específico basándote en los datos del monitoreo.'
    ].join('\n\n');

    // 5. Llamar al LLM
    const provider = Deno.env.get('LLM_PROVIDER') || 'groq';
    const texto = await invocarLLM(prompt, provider);
    const datos = validarJSON(texto, {
      required: ['tema', 'encuadre_oficialista', 'encuadre_opositor', 'neutrales', 'sentimiento_general', 'score_confianza']
    });

    // 6. Guardar narrativa generada
    await supabase.from('narrativas').insert({
      tema,
      encuadre_oficialista: datos.encuadre_oficialista,
      encuadre_opositor: datos.encuadre_opositor,
      neutrales: datos.neutrales,
      fuentes_principales: datos.fuentes_principales || [],
      sentimiento_general: datos.sentimiento_general,
      score_confianza: datos.score_confianza,
      articulos_relacionados: articulos?.map((a) => a.id) || []
    });

    return new Response(
      JSON.stringify({ ...datos, articulos_analizados: articulos?.length || 0 }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Error en narrativas:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }
});
