// =============================================================
// Edge Function compartida: LLM client para Supabase
// Soporta Groq y Gemini, con reintentos y timeout
// =============================================================

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
const TIMEOUT_MS = 30000;

export async function fetchConTimeout(url, opciones, ms = TIMEOUT_MS) {
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

export async function llamarGroq(prompt, apiKey, model = 'llama-3.3-70b-versatile') {
  const res = await fetchConTimeout(
    GROQ_URL,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
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

export async function llamarGemini(prompt, apiKey) {
  const res = await fetchConTimeout(
    `${GEMINI_URL}?key=${apiKey}`,
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

export async function invocarLLM(prompt, provider = 'groq') {
  const apiKey = provider === 'gemini'
    ? Deno.env.get('GEMINI_API_KEY')
    : Deno.env.get('GROQ_API_KEY');
  const model = Deno.env.get('GROQ_MODEL') || 'llama-3.3-70b-versatile';

  if (!apiKey) throw new Error(`API key de ${provider} no configurada.`);

  if (provider === 'gemini') return llamarGemini(prompt, apiKey);
  return llamarGroq(prompt, apiKey, model);
}

export function validarJSON(texto, schema) {
  let datos;
  try {
    const limpio = texto.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
    datos = JSON.parse(limpio);
  } catch {
    const inicio = texto.indexOf('{');
    const fin = texto.lastIndexOf('}');
    if (inicio === -1 || fin === -1 || fin <= inicio) {
      throw new Error('El LLM no devolvió JSON válido.');
    }
    try {
      datos = JSON.parse(texto.slice(inicio, fin + 1));
    } catch {
      throw new Error('El LLM devolvió JSON corrupto.');
    }
  }

  if (schema?.required) {
    for (const req of schema.required) {
      if (!(req in datos)) throw new Error(`Falta campo "${req}"`);
    }
  }

  return datos;
}
