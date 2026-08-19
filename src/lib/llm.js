export const LLM_SCHEMAS = {
  chat: {
    type: 'object',
    properties: {
      respuesta: { type: 'string', minLength: 10 },
      fuentes: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            medio: { type: 'string' },
            tipo: { type: 'string', enum: ['AM', 'FM', 'TV', 'Digital'] },
            menciones: { type: 'number' }
          },
          required: ['medio', 'menciones']
        }
      },
      sentimiento: { type: 'string', enum: ['positivo', 'neutral', 'negativo'] },
      score_confianza: { type: 'number', minimum: 0, maximum: 1 }
    },
    required: ['respuesta', 'sentimiento', 'score_confianza']
  },
  guerraNarrativas: {
    type: 'object',
    properties: {
      tema: { type: 'string', minLength: 3 },
      encuadre_oficialista: {
        type: 'object',
        properties: {
          eje: { type: 'string' },
          tesis: { type: 'string' },
          tics: { type: 'array', items: { type: 'string' } },
          activos: { type: 'array', items: { type: 'string' } },
          pasivos: { type: 'array', items: { type: 'string' } }
        },
        required: ['eje', 'tesis', 'tics', 'activos', 'pasivos']
      },
      encuadre_opositor: {
        type: 'object',
        properties: {
          eje: { type: 'string' },
          tesis: { type: 'string' },
          tics: { type: 'array', items: { type: 'string' } },
          activos: { type: 'array', items: { type: 'string' } },
          pasivos: { type: 'array', items: { type: 'string' } }
        },
        required: ['eje', 'tesis', 'tics', 'activos', 'pasivos']
      },
      neutrales: { type: 'array', items: { type: 'string' } },
      fuentes_principales: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            medio: { type: 'string' },
            tipo: { type: 'string' },
            menciones: { type: 'number' }
          },
          required: ['medio', 'menciones']
        }
      },
      sentimiento_general: { type: 'string', enum: ['positivo', 'neutral', 'negativo'] },
      score_confianza: { type: 'number', minimum: 0, maximum: 1 }
    },
    required: ['tema', 'encuadre_oficialista', 'encuadre_opositor', 'neutrales', 'sentimiento_general', 'score_confianza']
  },
  dashboard: {
    type: 'object',
    properties: {
      jurisdiccion: { type: 'string' },
      indice_clima_social: { type: 'number', minimum: 0, maximum: 100 },
      riesgo_protesta: { type: 'string', enum: ['bajo', 'medio', 'alto', 'critico'] },
      resumen_ejecutivo: {
        type: 'object',
        properties: {
          titulo: { type: 'string' },
          texto: { type: 'string' },
          alertas: { type: 'array', items: { type: 'string' } }
        },
        required: ['titulo', 'texto']
      }
    },
    required: ['indice_clima_social', 'riesgo_protesta', 'resumen_ejecutivo']
  }
};

export function validarJSON(respuestaTexto, schema) {
  if (typeof respuestaTexto !== 'string') {
    throw new Error('Respuesta del LLM no es texto.');
  }

  let datos;
  try {
    const limpio = respuestaTexto
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/, '')
      .trim();
    datos = JSON.parse(limpio);
  } catch (e) {
    const inicio = respuestaTexto.indexOf('{');
    const fin = respuestaTexto.lastIndexOf('}');
    if (inicio === -1 || fin === -1 || fin <= inicio) {
      throw new Error('El LLM no devolvió JSON válido.');
    }
    try {
      datos = JSON.parse(respuestaTexto.slice(inicio, fin + 1));
    } catch (e2) {
      throw new Error('El LLM devolvió JSON corrupto.');
    }
  }

  const errores = validarEsquema(datos, schema);
  if (errores.length > 0) {
    throw new Error(`JSON inválido: ${errores.join('; ')}`);
  }

  return datos;
}

function validarEsquema(datos, schema) {
  const errores = [];

  if (schema.required) {
    for (const req of schema.required) {
      if (!(req in datos)) errores.push(`falta campo "${req}"`);
    }
  }

  if (schema.properties) {
    for (const [clave, reglas] of Object.entries(schema.properties)) {
      const valor = datos[clave];
      if (valor === undefined || valor === null) continue;

      switch (reglas.type) {
        case 'number':
          if (typeof valor !== 'number' || Number.isNaN(valor)) {
            errores.push(`"${clave}" debe ser número`);
          } else {
            if (reglas.minimum !== undefined && valor < reglas.minimum) errores.push(`"${clave}" < ${reglas.minimum}`);
            if (reglas.maximum !== undefined && valor > reglas.maximum) errores.push(`"${clave}" > ${reglas.maximum}`);
          }
          break;
        case 'string':
          if (typeof valor !== 'string') {
            errores.push(`"${clave}" debe ser texto`);
          } else if (reglas.minLength !== undefined && valor.length < reglas.minLength) {
            errores.push(`"${clave}" muy corto`);
          }
          if (reglas.enum && !reglas.enum.includes(valor)) {
            errores.push(`"${clave}" fuera de rango permitido`);
          }
          break;
        case 'array':
          if (!Array.isArray(valor)) {
            errores.push(`"${clave}" debe ser lista`);
          }
          break;
        default:
          break;
      }
    }
  }

  return errores;
}

export const SYSTEM_PROMPT_CHAT = `
Eres un agente de prensa e inteligencia política en Argentina (especialista en comunicación).
Respondes consultas de un equipo de prensa con datos de monitoreo de medios, redes y agenda legislativa.

REGLAS:
- Respondé en español rioplatense, breve, en viñetas (máx 6 líneas).
- Nunca inventes datos. Si no tenés información, decilo explícitamente.
- Devolvé ÚNICAMENTE JSON válido con este esquema exacto:
{
  "respuesta": "texto en viñetas",
  "fuentes": [{ "medio": "Cadena 3", "tipo": "AM|FM|TV|Digital", "menciones": 0 }],
  "sentimiento": "positivo|neutral|negativo",
  "score_confianza": 0.0 a 1.0
}
- No agregues texto fuera del JSON.`;

export const SYSTEM_PROMPT_NARRATIVAS = `
Eres un analista de comunicación política y narrativas en Argentina.
Tu tarea es generar una "Guerra de Narrativas" para un tema de actualidad dado, analizando cómo lo encuadra cada bando.

REGLAS:
- Respondé en español rioplatense.
- Analizá el tema desde dos ángulos: oficialismo y oposición.
- Identificá el eje discursivo central de cada bando, la tesis, los TICs (términos, imágenes, conceptos), los activos narrativos y los pasivos.
- Agregá lecturas neutrales cuando las haya.
- Incluí las fuentes principales que cubren el tema.
- Devolvé ÚNICAMENTE JSON válido con este esquema exacto:
{
  "tema": "nombre del tema analizado",
  "encuadre_oficialista": {
    "eje": "eje discursivo central entre comillas",
    "tesis": "desarrollo de la tesis oficialista (2-3 oraciones)",
    "tics": ["término 1", "término 2", "término 3", "término 4"],
    "activos": ["ventaja narrativa 1", "ventaja narrativa 2"],
    "pasivos": ["debilidad narrativa 1", "debilidad narrativa 2"]
  },
  "encuadre_opositor": {
    "eje": "eje discursivo central entre comillas",
    "tesis": "desarrollo de la tesis opositora (2-3 oraciones)",
    "tics": ["término 1", "término 2", "término 3", "término 4"],
    "activos": ["ventaja narrativa 1", "ventaja narrativa 2"],
    "pasivos": ["debilidad narrativa 1", "debilidad narrativa 2"]
  },
  "neutrales": ["lectura neutral 1", "lectura neutral 2"],
  "fuentes_principales": [{ "medio": "nombre", "tipo": "AM|FM|TV|Digital|Agencia", "menciones": 0 }],
  "sentimiento_general": "positivo|neutral|negativo",
  "score_confianza": 0.0 a 1.0
}
- No agregues texto fuera del JSON.`;

export function construirPromptNarrativas(tema, contexto) {
  const perfil = contexto?.perfil || 'Oficialista';
  const data = contexto?.dashboard || {};
  return [
    SYSTEM_PROMPT_NARRATIVAS,
    'CONTEXTO DEL MONITOREO:',
    JSON.stringify(
      {
        jurisdiccion: data.jurisdiccion,
        indice_clima_social: data.indice_clima_social,
        riesgo_protesta: data.riesgo_protesta,
        resumen_ejecutivo: data.resumen_ejecutivo,
        guerra_actual: data.guerra_de_narrativas
      },
      null,
      2
    ),
    `PERFIL DEL USUARIO: ${perfil}`,
    `TEMA A ANALIZAR: ${tema}`,
    'Generá la guerra de narrativas para este tema específico basándote en las fuentes del monitoreo.'
  ].join('\n\n');
}

export function construirPromptChat(consulta, contexto) {
  const perfil = contexto?.perfil || 'Oficialista';
  const data = contexto?.dashboard || {};
  return [
    SYSTEM_PROMPT_CHAT,
    'CONTEXTO DEL DÍA:',
    JSON.stringify(
      {
        jurisdiccion: data.jurisdiccion,
        indice_clima_social: data.indice_clima_social,
        riesgo_protesta: data.riesgo_protesta,
        resumen_ejecutivo: data.resumen_ejecutivo,
        encuadres: data.guerra_de_narrativas
      },
      null,
      2
    ),
    `PERFIL DEL USUARIO: ${perfil}`,
    `CONSULTA DEL USUARIO: ${consulta}`
  ].join('\n\n');
}
