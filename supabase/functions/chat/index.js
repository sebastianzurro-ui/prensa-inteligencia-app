// =============================================================
// Edge Function: Chat con RAG
// Busca artículos relevantes y genera respuesta con LLM
// =============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { invocarLLM, validarJSON } from '../shared/llm.js';

const SYSTEM_PROMPT = `
Eres un agente de prensa e inteligencia política en Argentina (especialista en comunicación).
Respondes consultas de un equipo de prensa con datos reales de monitoreo de medios.

REGLAS:
- Respondé en español rioplatense, breve, en viñetas (máx 6 líneas).
- Usá los datos del contexto de monitoreo para fundamentar tu respuesta.
- Si no tenés información suficiente, decilo explícitamente.
- Nunca inventes datos que no estén en el contexto.
- Devolvé ÚNICAMENTE JSON válido con este esquema exacto:
{
  "respuesta": "texto en viñetas",
  "fuentes": [{ "medio": "nombre", "tipo": "AM|FM|TV|Digital", "menciones": 0 }],
  "sentimiento": "positivo|neutral|negativo",
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
    const { consulta, perfil = 'Oficialista', jurisdiccion = 'nacion' } = await req.json();

    if (!consulta || typeof consulta !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Falta el campo "consulta"' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // Cliente Supabase con service_role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_KEY')
    );

    // 1. Buscar artículos relevantes (full-text search)
    const { data: articulos } = await supabase
      .rpc('buscar_articulos', {
        query_text: consulta,
        limite: 8,
        jurisdiccion_filtro: jurisdiccion !== 'nacion' ? jurisdiccion : null
      });

    // 2. Obtener datos del dashboard para contexto
    const { data: dashboardData } = await supabase
      .rpc('resumen_dashboard', {
        jurisdiccion_param: jurisdiccion,
        horas_atras: 168
      });

    // 3. Construir prompt con contexto
    let contextoRag = '';
    if (articulos && articulos.length > 0) {
      contextoRag = `\n\nCONTEXTO DEL MONITOREO (${articulos.length} artículos relevantes):\n` +
        articulos.map((a) =>
          `- [${a.fuente}] ${a.titulo} (${a.fecha_emision?.split('T')[0]}) - tono: ${a.tono}`
        ).join('\n');
    }

    let contextoDashboard = '';
    if (dashboardData) {
      contextoDashboard = `\n\nDASHBOARD ACTUAL:\n${JSON.stringify(dashboardData, null, 2)}`;
    }

    const prompt = [
      SYSTEM_PROMPT,
      `PERFIL DEL USUARIO: ${perfil}`,
      `JURISDICCIÓN: ${jurisdiccion}`,
      contextoDashboard,
      contextoRag,
      `CONSULTA: ${consulta}`
    ].join('\n\n');

    // 4. Llamar al LLM
    const provider = Deno.env.get('LLM_PROVIDER') || 'groq';
    const texto = await invocarLLM(prompt, provider);
    const datos = validarJSON(texto, {
      required: ['respuesta', 'sentimiento', 'score_confianza']
    });

    // 5. Registrar consulta (audit log)
    await supabase.from('consultas_chat').insert({
      consulta,
      respuesta: datos,
      perfil,
      jurisdiccion,
      modelo: provider
    });

    return new Response(
      JSON.stringify({ ...datos, articulos_encontrados: articulos?.length || 0 }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Error en chat:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }
});
