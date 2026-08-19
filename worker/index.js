// =============================================================
// PrensaAR - Worker de ingestión de datos
// Recopila noticias de RSS, analiza sentimiento, almacena en Supabase
// =============================================================

import { createClient } from '@supabase/supabase-js';
import RssParser from 'rss-parser';
import * as cheerio from 'cheerio';
import feedsData from './feeds.json' assert { type: 'json' };

// =============================================================
// CONFIGURACIÓN
// =============================================================
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY; // service_role key
const FETCH_TIMEOUT = 15000; // 15 segundos por feed
const MAX_ARTICLES_PER_FEED = 20;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('ERROR: Definí SUPABASE_URL y SUPABASE_SERVICE_KEY en las variables de entorno');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const parser = new RssParser({
  timeout: FETCH_TIMEOUT,
  headers: {
    'User-Agent': 'PrensaAR/1.0 (monitoreo de medios)',
    'Accept': 'application/rss+xml, application/xml, text/xml'
  }
});

// =============================================================
// ANÁLISIS DE SENTIMIENTO (keyword-based, gratis)
// =============================================================
const PALABRAS_POSITIVAS = [
  'crecimiento', 'avance', 'progreso', 'mejora', 'éxito', 'logro', 'acuerdo',
  'estabilidad', 'inversión', 'empleo', 'baja', 'superávit', 'récord',
  'positivo', 'favorable', 'apoyo', 'aprobación', 'confianza', 'recuperación',
  'desarrollo', 'inversión', 'oportunidad', 'solución', 'avanzar', 'mejorar',
  'consolidar', 'fortalecer', 'impulsar', 'crecer', 'producir', 'exportar'
];

const PALABRAS_NEGATIVAS = [
  'crisis', 'caída', 'recesión', 'inflación', 'ajuste', 'tarifazo', 'paro',
  'protesta', 'corte', 'conflicto', 'denuncia', 'rechazo', 'violencia',
  'negativo', 'desfavorable', 'pobreza', 'hambre', 'desempleo', 'deuda',
  'corrupción', 'escándalo', 'dimisión', 'renuncia', 'represión', 'golpe',
  'emergencia', 'catástrofe', 'desastre', 'fracaso', 'veto', 'decreto',
  'recorte', 'burning', 'quema', 'bloqueo', 'interrupción', 'colapso'
];

const PALABRAS_NEUTRALES = [
  'análisis', 'encuesta', 'dato', ' cifras ', 'estadística', 'informe',
  'debate', 'discusión', 'congreso', 'comisión', 'sesión', 'votación',
  'elección', 'candidato', 'partido', 'bloque', 'diálogo', 'negociación'
];

function analizarSentimiento(texto) {
  const t = texto.toLowerCase();
  let positivas = 0;
  let negativas = 0;
  let neutras = 0;

  for (const p of PALABRAS_POSITIVAS) {
    if (t.includes(p)) positivas++;
  }
  for (const p of PALABRAS_NEGATIVAS) {
    if (t.includes(p)) negativas++;
  }
  for (const p of PALABRAS_NEUTRALES) {
    if (t.includes(p)) neutras++;
  }

  const total = positivas + negativas + neutras || 1;
  const score = (positivas - negativas) / total; // -1 a 1

  let tono = 'neutral';
  if (score > 0.15) tono = 'positivo';
  else if (score < -0.15) tono = 'negativo';

  return { sentimiento: Math.max(-1, Math.min(1, score)), tono };
}

// =============================================================
// DETECCIÓN DE PERSONAJES
// =============================================================
function detectarPersonajes(texto) {
  const t = texto.toLowerCase();
  const encontrados = [];

  for (const [nombre, keywords] of Object.entries(feedsData.personajes_keywords)) {
    for (const kw of keywords) {
      if (t.includes(kw)) {
        encontrados.push(nombre);
        break;
      }
    }
  }

  return encontrados;
}

// =============================================================
// DETECCIÓN DE TEMAS
// =============================================================
function detectarTemas(texto) {
  const t = texto.toLowerCase();
  const encontrados = [];

  for (const tema of feedsData.temas_politicos) {
    if (t.includes(tema)) {
      encontrados.push(tema);
    }
  }

  return encontrados.slice(0, 5); // max 5 temas por artículo
}

// =============================================================
// SCRAPING LIGERO DE CONTENIDO
// =============================================================
async function scrappearContenido(url) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'PrensaAR/1.0 (monitoreo de medios)',
        'Accept': 'text/html'
      }
    });
    clearTimeout(timer);

    if (!res.ok) return null;

    const html = await res.text();
    const $ = cheerio.load(html);

    // Intentar extraer contenido del artículo
    const selectores = [
      'article',
      '.article-body',
      '.nota-body',
      '.content-body',
      '.story-body',
      'main p'
    ];

    let contenido = '';
    for (const sel of selectores) {
      const elementos = $(sel);
      if (elementos.length > 0) {
        contenido = elementos
          .map((_, el) => $(el).text().trim())
          .get()
          .join('\n\n')
          .slice(0, 3000); // max 3000 chars
        break;
      }
    }

    // Fallback: todos los párrafos
    if (!contenido) {
      contenido = $('p')
        .map((_, el) => $(el).text().trim())
        .get()
        .filter((t) => t.length > 50)
        .join('\n\n')
        .slice(0, 3000);
    }

    return contenido || null;
  } catch {
    return null;
  }
}

// =============================================================
// PROCESAMIENTO DE UN FEED
// =============================================================
async function procesarFeed(feed) {
  console.log(`  📡 Procesando: ${feed.nombre} (${feed.url})`);

  try {
    const data = await parser.parseURL(feed.url);
    const items = (data.items || []).slice(0, MAX_ARTICLES_PER_FEED);
    let insertados = 0;

    for (const item of items) {
      const titulo = item.title?.trim();
      const resumen = item.contentSnippet?.trim() || item.content?.trim()?.slice(0, 500);
      const url = item.link;

      if (!titulo) continue;

      // Verificar si ya existe (por URL o título)
      if (url) {
        const { data: existente } = await supabase
          .from('articulos')
          .select('id')
          .eq('url', url)
          .limit(1);

        if (existente && existente.length > 0) continue;
      }

      // Scrappear contenido completo
      let contenido = resumen || titulo;
      if (url && (!resumen || resumen.length < 200)) {
        const contenidoScrapeado = await scrappearContenido(url);
        if (contenidoScrapeado) contenido = contenidoScrapeado;
      }

      // Analizar sentimiento
      const { sentimiento, tono } = analizarSentimiento(`${titulo} ${contenido}`);

      // Detectar personajes y temas
      const personajes = detectarPersonajes(`${titulo} ${contenido}`);
      const temas = detectarTemas(`${titulo} ${contenido}`);

      // Fecha de emisión
      const fechaEmision = item.pubDate ? new Date(item.pubDate) : new Date();

      // Insertar en Supabase
      const { error } = await supabase.from('articulos').insert({
        titulo,
        contenido,
        resumen: resumen || null,
        fuente: feed.nombre,
        tipo_fuente: feed.tipo,
        url: url || null,
        jurisdiccion: feed.jurisdiccion,
        fecha_emision: fechaEmision.toISOString(),
        sentimiento,
        tono,
        personajes,
        temas
      });

      if (error) {
        console.error(`    ❌ Error insertando "${titulo.slice(0, 50)}":`, error.message);
      } else {
        insertados++;
      }
    }

    console.log(`  ✅ ${feed.nombre}: ${insertados} artículos insertados`);
    return insertados;
  } catch (err) {
    console.error(`  ❌ Error en ${feed.nombre}:`, err.message);
    return 0;
  }
}

// =============================================================
// ACTUALIZACIÓN DE PERSONAJES
// =============================================================
async function actualizarPersonajes() {
  console.log('\n👤 Actualizando sentimiento de personajes...');

  for (const [nombre] of Object.entries(feedsData.personajes_keywords)) {
    // Obtener últimos artículos que mencionan al personaje
    const { data: articulos } = await supabase
      .from('articulos')
      .select('sentimiento, tono')
      .contains('personajes', [nombre])
      .gte('fecha_emision', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('fecha_emision', { ascending: false })
      .limit(50);

    if (!articulos || articulos.length === 0) continue;

    // Calcular promedios
    const total = articulos.length;
    const sentPromedio = articulos.reduce((s, a) => s + (a.sentimiento || 0), 0) / total;
    const posCount = articulos.filter((a) => a.tono === 'positivo').length;
    const negCount = articulos.filter((a) => a.tono === 'negativo').length;
    const neuCount = articulos.filter((a) => a.tono === 'neutral').length;

    // Mapear sentimiento a score 0-100
    const sentScore = Math.round(50 + sentPromedio * 50);

    await supabase
      .from('personajes')
      .update({
        sentimiento: sentScore,
        tono_positivo: Math.round((posCount / total) * 100),
        tono_neutral: Math.round((neuCount / total) * 100),
        tono_negativo: Math.round((negCount / total) * 100),
        menciones: total,
        actualizado_en: new Date().toISOString()
      })
      .eq('nombre', nombre);

    console.log(`  📊 ${nombre}: sentimiento ${sentScore}/100 (${total} menciones)`);
  }
}

// =============================================================
// ACTUALIZACIÓN DE CLIMA SOCIAL POR JURISDICCIÓN
// =============================================================
async function actualizarClimaSocial() {
  console.log('\n🌍 Actualizando clima social por jurisdicción...');

  const { data: jurisdicciones } = await supabase
    .from('jurisdicciones')
    .select('*');

  if (!jurisdicciones) return;

  for (const jur of jurisdicciones) {
    // Obtener últimos artículos de la jurisdicción
    const { data: articulos } = await supabase
      .from('articulos')
      .select('sentimiento')
      .eq('jurisdiccion', jur.nombre)
      .gte('fecha_emision', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    if (!articulos || articulos.length === 0) continue;

    // Calcular índice de clima social (0-100, donde 100 es positivo)
    const promedio = articulos.reduce((s, a) => s + (a.sentimiento || 0), 0) / articulos.length;
    const indice = Math.round(50 + promedio * 50);

    // Determinar riesgo
    let riesgo = 'medio';
    if (indice >= 70) riesgo = 'bajo';
    else if (indice >= 55) riesgo = 'medio';
    else if (indice >= 35) riesgo = 'alto';
    else riesgo = 'critico';

    // Actualizar jurisdicción
    await supabase
      .from('jurisdicciones')
      .update({
        indice_clima: indice,
        riesgo,
        actualizado_en: new Date().toISOString()
      })
      .eq('id', jur.id);

    // Guardar en serie temporal
    const hoy = new Date().toISOString().split('T')[0];
    await supabase
      .from('clima_serie')
      .upsert({
        jurisdiccion_id: jur.id,
        fecha: hoy,
        indice
      }, { onConflict: 'jurisdiccion_id,fecha' });

    console.log(`  🌡️ ${jur.nombre}: índice ${indice} (riesgo ${riesgo})`);
  }
}

// =============================================================
// MAIN
// =============================================================
async function main() {
  const esDryRun = process.argv.includes('--dry-run');
  const inicio = Date.now();

  console.log('🚀 PrensaAR - Ingestor de datos');
  console.log(`📅 ${new Date().toLocaleString('es-AR')}`);
  console.log(`🔧 Modo: ${esDryRun ? 'DRY RUN (sin inserciones)' : 'PRODUCCIÓN'}`);
  console.log(`📡 Feeds a procesar: ${feedsData.feeds.length}`);
  console.log('');

  if (esDryRun) {
    console.log('⚠️  Dry run: solo se lecturan los feeds, no se insertan datos');
    for (const feed of feedsData.feeds.slice(0, 3)) {
      try {
        const data = await parser.parseURL(feed.url);
        console.log(`  ✅ ${feed.nombre}: ${(data.items || []).length} items disponibles`);
      } catch (err) {
        console.log(`  ❌ ${feed.nombre}: ${err.message}`);
      }
    }
    return;
  }

  // 1. Procesar todos los feeds
  let totalInsertados = 0;
  for (const feed of feedsData.feeds) {
    const insertados = await procesarFeed(feed);
    totalInsertados += insertados;
  }

  console.log(`\n📊 Total artículos insertados: ${totalInsertados}`);

  // 2. Actualizar personajes
  await actualizarPersonajes();

  // 3. Actualizar clima social
  await actualizarClimaSocial();

  const duracion = Math.round((Date.now() - inicio) / 1000);
  console.log(`\n✅ Ingestión completada en ${duracion}s`);
  console.log(`📈 Resumen: ${totalInsertados} artículos nuevos`);
}

main().catch((err) => {
  console.error('❌ Error fatal:', err);
  process.exit(1);
});
