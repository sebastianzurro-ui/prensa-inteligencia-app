// =============================================================
// Edge Function: Dashboard con datos reales
// Devuelve datos agregados del monitoreo
// =============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const url = new URL(req.url);
    const jurisdiccion = url.searchParams.get('jurisdiccion') || 'nacion';
    const horas = parseInt(url.searchParams.get('horas') || '168'); // 7 días

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_KEY')
    );

    // 1. Resumen general
    const { data: resumen } = await supabase
      .rpc('resumen_dashboard', {
        jurisdiccion_param: jurisdiccion,
        horas_atras: horas
      });

    // 2. Último índice de clima
    const { data: clima } = await supabase
      .from('clima_serie')
      .select('fecha, indice')
      .order('fecha', { ascending: false })
      .limit(30);

    // 3. Jurisdicciones con riesgo
    const { data: jurisdicciones } = await supabase
      .from('jurisdicciones')
      .select('nombre, tipo, provincia, indice_clima, riesgo, foco')
      .order('riesgo', { ascending: false });

    // 4. Personajes con sentimiento
    const { data: personajes } = await supabase
      .from('personajes')
      .select('nombre, cargo, partido, bloque, sentimiento, tono_positivo, tono_neutral, tono_negativo, menciones, temas')
      .gte('menciones', 3)
      .order('menciones', { ascending: false })
      .limit(10);

    // 5. Últimas narrativas guardadas
    const { data: ultimasNarrativas } = await supabase
      .from('narrativas')
      .select('*')
      .order('creado_en', { ascending: false })
      .limit(3);

    // 6. Tendencia de clima (últimos 7 días)
    const tendencia = (clima || []).reverse().map((c) => ({
      fecha: c.fecha,
      indice: c.indice
    }));

    // 7. Calcular tendencia
    const direccion = tendencia.length >= 2
      ? tendencia[tendencia.length - 1].indice - tendencia[tendencia.length - 2].indice
      : 0;

    const resultado = {
      jurisdiccion,
      indice_clima_social: resumen?.indice_clima || 50,
      riesgo_protesta: resumen?.riesgo_protesta || 'medio',
      total_articulos: resumen?.total_articulos || 0,
      distribucion_tonos: {
        positivos: resumen?.positivos || 0,
        negativos: resumen?.negativos || 0,
        neutros: resumen?.neutros || 0
      },
      tendencia_clima: tendencia,
      direccion_tendencia: direccion,
      jurisdicciones: jurisdicciones || [],
      personajes: personajes || [],
      ultimas_narrativas: ultimasNarrativas || [],
      periodo: {
        horas,
        label: horas <= 24 ? '24 h' : horas <= 72 ? '72 h' : horas <= 168 ? '7 días' : horas <= 336 ? '14 días' : '30 días'
      }
    };

    return new Response(
      JSON.stringify(resultado),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Error en dashboard:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }
});
