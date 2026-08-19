export const JURISDICCIONES = [
  { id: 'nacion', nombre: 'Nación' },
  { id: 'bsas', nombre: 'Provincia de Buenos Aires' },
  { id: 'caba', nombre: 'CABA' },
  { id: 'cordoba', nombre: 'Provincia de Córdoba' },
  { id: 'santa_fe', nombre: 'Provincia de Santa Fe' },
  { id: 'mendoza', nombre: 'Provincia de Mendoza' },
  { id: 'rosario', nombre: 'Municipio de Rosario' }
];

export const RIESGO = {
  bajo: { nivel: 'Bajo', color: 'riesgo.bajo', valor: 1 },
  medio: { nivel: 'Medio', color: 'riesgo.medio', valor: 2 },
  alto: { nivel: 'Alto', color: 'riesgo.alto', valor: 3 },
  critico: { nivel: 'Crítico', color: 'riesgo.critico', valor: 4 }
};

export const PERIODOS = [
  { id: '24h', label: '24 h', dias: 1, peso: 'Actualidad pura' },
  { id: '72h', label: '72 h', dias: 3, peso: 'Fin de semana' },
  { id: '7d', label: '7 días', dias: 7, peso: 'Semana política' },
  { id: '14d', label: '14 días', dias: 14, peso: 'Quincena' },
  { id: '30d', label: '30 días', dias: 30, peso: 'Mes completo' }
];

const OFFSET_JURISDICCION = {
  nacion: 0,
  bsas: -6,
  caba: 4,
  cordoba: -9,
  santa_fe: -5,
  mendoza: -8,
  rosario: -4
};

const TEXTO_PERIODO = {
  '24h': 'En las últimas horas la agenda se concentró en el Presupuesto y la convocatoria sindical para el jueves.',
  '72h': 'El fin de semana confirmó el malestar: cortes de ruta en Córdoba y Mendoza y endurecimiento del discurso opositor.',
  '7d': 'La semana cierra con retroceso del humor social por el debate del Presupuesto y la movilización de CGT/CTA.',
  '14d': 'En la quincena, la caída sostenida del clima social responde al tratamiento del Presupuesto y los tarifazos.',
  '30d': 'En el mes, el humor social osciló entre 55 y 42: la discusión presupuestaria marcó la caída de las últimas dos semanas.'
};

function clamp(n, min = 5, max = 95) {
  return Math.max(min, Math.min(max, n));
}

function generarSerie(dias = 30) {
  const serie = [];
  const inicio = 55;
  const fin = 42;
  const ruido = [0, -2, 2, -1, 1, -3, 0, 2, -1, 1];
  for (let i = dias - 1; i >= 0; i--) {
    const t = (dias - 1 - i) / (dias - 1);
    const v = inicio + (fin - inicio) * t;
    const d = new Date(2026, 7, 12 - i);
    const n = ruido[i % ruido.length] + (i % 5 === 0 ? -1 : 0);
    serie.push({
      fecha: d.toISOString(),
      dia: d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }).replace('.', ''),
      indice: clamp(Math.round(v + n))
    });
  }
  return serie;
}

export const SERIE_CLIMA = generarSerie(30);

export function indicePonderado(serie, dias, decaimiento = 0.35) {
  const ventana = serie.slice(-dias);
  if (ventana.length === 0) return 0;
  if (ventana.length === 1) return ventana[0].indice;
  let num = 0;
  let den = 0;
  ventana.forEach((p, i) => {
    const w = Math.exp(decaimiento * (i - (ventana.length - 1)));
    num += p.indice * w;
    den += w;
  });
  return Math.round(num / den);
}

function nivelRiesgo(indice) {
  if (indice >= 70) return 'bajo';
  if (indice >= 55) return 'medio';
  if (indice >= 35) return 'alto';
  return 'critico';
}

export function getDashboard(periodoId = '7d', jurisdiccion = 'nacion') {
  const per = PERIODOS.find((p) => p.id === periodoId) || PERIODOS[2];
  const offset = OFFSET_JURISDICCION[jurisdiccion] ?? 0;
  const base = SERIE_CLIMA.map((p) => ({ ...p, indice: clamp(p.indice + offset) }));

  const indice = indicePonderado(base, Math.max(1, per.dias));

  const previos = base.slice(0, Math.max(0, base.length - per.dias));
  const prevDias = Math.min(per.dias, previos.length);
  const indicePrev = prevDias >= 1 ? indicePonderado(previos, prevDias) : null;
  const variacion = indicePrev === null ? null : indice - indicePrev;

  const puntos = Math.min(30, Math.max(4, per.dias * 2));
  const tendencia = base.slice(-puntos);

  return {
    ...MOCK_DASHBOARD,
    jurisdiccion,
    periodo: per,
    fecha_analisis: new Date().toISOString(),
    indice_clima_social: indice,
    riesgo_protesta: nivelRiesgo(indice),
    variacion,
    tendencia_clima: tendencia,
    resumen_ejecutivo: {
      ...MOCK_DASHBOARD.resumen_ejecutivo,
      texto: TEXTO_PERIODO[per.id]
    }
  };
}

export const MOCK_DASHBOARD = {
  jurisdiccion: 'nacion',
  indice_clima_social: 42,
  riesgo_protesta: 'alto',
  resumen_ejecutivo: {
    titulo: 'Día de tensión por el debate del Presupuesto 2026',
    texto:
      'El oficialismo acelera el tratamiento del Presupuesto con riesgo de veto en la Cámara baja. Las centrales sindicales CGT y CTA convocan a una movilización para el jueves frente al Congreso. En Córdoba y Mendoza crecen los cortes de ruta por parte de transportistas.',
    alertas: [
      'Movilización sindical convocada para el jueves',
      'Cortes de ruta activos en Córdoba (Ruta 9) y Mendoza (RN 7)',
      'Tratamiento del Presupuesto sin acuerdos en Diputados'
    ]
  },
  guerra_de_narrativas: {
    encuadre_oficialista: {
      titulo: 'Encuadre Oficialista',
      eje: '“Orden fiscal que sostiene el superávit y baja la inflación”',
      tesis:
        'El Presupuesto consolida el equilibrio fiscal sin tocar el superávit; las protestas son aisladas y responden a sectores corporativos.',
      tics: [
        'El gobierno destaca que la inflación mensual perforó el 2% por primera vez en años.',
        'Califica la movilización de “sectorial y minoritaria”, con encuadre en medios de línea oficial.',
        'Recuerda el ajuste al gasto político provincial como logro de transparencia.',
        'Sin presencia de gobernadores aliados en la foto de la marcha.'
      ],
      activos: [
        'Dato de inflación a la baja y superávit primario acumulado',
        'Cobertura favorable en cadenas oficiales y radios de alcance nacional'
      ],
      pasivos: [
        'Riesgo de tacho en Diputados si no se cierra el acuerdo de redistribución',
        'Queja creciente de intendentes del PRO y UCR por coparticipación'
      ]
    },
    encuadre_opositor: {
      titulo: 'Encuadre Opositor',
      eje: '“El ajuste se paga con trabajo y las provincias quedan abandonadas”',
      tesis:
        'El Presupuesto recorta la coparticipación y profundiza el ajuste; las movilizaciones reflejan un malestar social transversal que ya no es solo sindical.',
      tics: [
        'La oposición (Unión por la Patria, bloques provinciales y UCR) plantea el “federalismo vacío”.',
        'Difunde cifras de caída del poder adquisitivo y tarifazos en medios provinciales.',
        'Reclama recomposición de jubilados y programas sociales en la pauta de Diputados.',
        'Marca los cortes de ruta como “reclamo legítimo contra el ahogo provincial”.'
      ],
      activos: [
        'Respaldo de gobernadores peronistas en la foto del rechazo',
        'Viralización de cortes de ruta en redes sociales'
      ],
      pasivos: [
        'Falta de un plan económico alternativo claro',
        'División interna sobre cuán lejos llevar la protesta'
      ]
    },
    neutrales: [
      'Periodistas de economía en radio señalan que “el debate real es si el ajuste es orden o recesión”.',
      'Encuestas internas provinciales muestran caída de imagen en intendentes de ambos espacios.'
    ]
  },
  accion_recomendada: {
    oficialista: {
      perfil: 'Oficialista',
      objetivo: 'Cerrar la aprobación del Presupuesto minimizando el costo político de la movilización.',
      viñetas_tacticas: [
        'Sugerir tratamiento en sesión exprés antes del jueves para no dar foto conjunta con la marcha.',
        'Acotar la narrativa a “orden y estabilidad”: evitar polemizar con la CGT en cadena nacional.',
        'Activar red de voceros provinciales para desmentir la tesis del “ahogo federal”.',
        'Ofrecer a UCR/provinciales un guiño en coparticipación a cambio de apoyo en comisión.'
      ],
      frase_eje:
        '“El Presupuesto es la herramienta que consolida el superávit y baja la inflación: el país ordena las cuentas para crecer.”'
    },
    opositor: {
      perfil: 'Opositor',
      objetivo: 'Capitalizar el malestar social y unificar el rechazo al ajuste antes del tratamiento.',
      viñetas_tacticas: [
        'Liderar la movilización con agenda federal: buses de gobernadores y dirigentes provinciales.',
        'Instalar el eje “el ajuste no se paga con laburo: se paga con el futuro”.',
        'Exigir audiencia pública y sesión especial para difundir los recortes provinciales.',
        'Publicar infografía con el impacto del Presupuesto en jubilados y trabajadores.'
      ],
      frase_eje:
        '“No es orden fiscal, es ajuste: con este Presupuesto el interior paga la fiesta de la Casa Rosada.”'
    }
  },
  acciones_urgentes: [
    { tiempo: 'HOY 14:00', item: 'Mesa política: definir postura sobre sesión exprés del Presupuesto.', area: 'Prensa' },
    { tiempo: 'HOY 18:00', item: 'Nota de tapa: agenda del congreso vs. movilización del jueves.', area: 'Editorial' },
    { tiempo: 'MAÑANA 09:00', item: 'Briefing a voceros con argumentario anti-“ahogo federal”.', area: 'Vocería' },
    { tiempo: 'JUEVES 11:00', item: 'Acompañamiento y cobertura de la movilización de CGT/CTA.', area: 'Operativo' }
  ],
  ultima_actualizacion: 'Hace 42 min'
};

export const PERFILES_CHAT = ['Oficialista', 'Opositor'];

export const MOCK_RAG_ANSWER = {
  respuesta:
    'Según el monitoreo de 38 radios de Córdoba (AM y FM) entre las 6 y 12 h:\n\n• Presupuesto: 62% de las notas de apertura lo vinculan a “ajuste a la provincia”.\n• CTA Córdoba y la Intersindical marcan “paro con movilización” para el jueves.\n• El dato de coparticipación domina el segmento político de Cadena 3 y La Voz Radio.\n• Sin voceros oficiales en agenda en la mañana (vacancia comunicacional).',
  fuentes: [
    { medio: 'Cadena 3', tipo: 'AM', menciones: 9 },
    { medio: 'La Voz Radio', tipo: 'FM', menciones: 7 },
    { medio: 'Radio Universidad', tipo: 'FM', menciones: 5 },
    { medio: 'Mitre Córdoba', tipo: 'AM', menciones: 4 }
  ],
  sentimiento: 'negativo',
  score_confianza: 0.87
};

export const SUGERENCIAS_CHAT = [
  '¿Qué se dice en las radios de Córdoba sobre el presupuesto?',
  '¿Cuál es el riesgo de protesta en Mendoza esta semana?',
  'Resumí la guerra de narrativas de hoy en 3 viñetas',
  '¿Qué eje discursivo me recomienda para el oficialismo?',
  '¿Cómo está el humor de la información sobre Milei?'
];

export const MAPA_RIESGO_PROVINCIAS = [
  { provincia: 'Buenos Aires', riesgo: 'medio', foco: 'Jubilados en rutas y gremios docentes' },
  { provincia: 'CABA', riesgo: 'bajo', foco: 'Marchas por el Presupuesto frente al Congreso' },
  { provincia: 'Córdoba', riesgo: 'alto', foco: 'Corte Ruta 9 y paro de la Intersindical' },
  { provincia: 'Santa Fe', riesgo: 'medio', foco: 'Puerto de Rosario con amagos de bloqueo' },
  { provincia: 'Mendoza', riesgo: 'alto', foco: 'Corte RN 7 por transportistas' },
  { provincia: 'Chubut', riesgo: 'medio', foco: 'Reclamos por coparticipación minera' },
  { provincia: 'Neuquén', riesgo: 'bajo', foco: 'Agenda Vaca Muerta sin conflicto activo' }
];

export function buildContexto(perfil) {
  return {
    dashboard: MOCK_DASHBOARD,
    perfil,
    fecha: new Date().toISOString()
  };
}

export const PERSONAJES = [
  {
    id: 'milei',
    nombre: 'Javier Milei',
    cargo: 'Presidente de la Nación',
    partido: 'La Libertad Avanza',
    bloque: 'oficialista',
    sentimiento: 68,
    tono: { pos: 55, neu: 30, neg: 15 },
    menciones: 4200,
    temas: ['Presupuesto', 'Inflación', 'Dólar'],
    tendencia_sentimiento: [
      { dia: '06 ago', score: 60 },
      { dia: '07 ago', score: 63 },
      { dia: '08 ago', score: 61 },
      { dia: '09 ago', score: 66 },
      { dia: '10 ago', score: 64 },
      { dia: '11 ago', score: 69 },
      { dia: '12 ago', score: 68 }
    ],
    ultimas: [
      { titulo: 'Milei defiende el Presupuesto y reclama "coherencia fiscal"', medio: 'Cadena 3', tono: 'pos', hora: '08:12' },
      { titulo: 'El Presidente cruzó a la CGT por la movilización del jueves', medio: 'La Nación', tono: 'neu', hora: '07:45' },
      { titulo: 'Críticas por el ajuste a jubilados en la cobertura de la tarde', medio: 'Radio 10', tono: 'neg', hora: '07:10' }
    ]
  },
  {
    id: 'villarruel',
    nombre: 'Victoria Villarruel',
    cargo: 'Vicepresidenta de la Nación',
    partido: 'La Libertad Avanza',
    bloque: 'oficialista',
    sentimiento: 52,
    tono: { pos: 40, neu: 34, neg: 26 },
    menciones: 850,
    temas: ['Rol institucional', 'Senado'],
    tendencia_sentimiento: [
      { dia: '06 ago', score: 55 },
      { dia: '07 ago', score: 54 },
      { dia: '08 ago', score: 52 },
      { dia: '09 ago', score: 51 },
      { dia: '10 ago', score: 53 },
      { dia: '11 ago', score: 52 },
      { dia: '12 ago', score: 52 }
    ],
    ultimas: [
      { titulo: 'Villarruel preside la sesión clave por el Presupuesto', medio: 'TN', tono: 'neu', hora: '08:00' },
      { titulo: 'Sin definiciones: el rol de la Vice en la interna oficialista', medio: 'Perfil', tono: 'pos', hora: '06:55' }
    ]
  },
  {
    id: 'karina',
    nombre: 'Karina Milei',
    cargo: 'Secretaria General de la Presidencia',
    partido: 'La Libertad Avanza',
    bloque: 'oficialista',
    sentimiento: 44,
    tono: { pos: 28, neu: 40, neg: 32 },
    menciones: 640,
    temas: ['Conducción política', 'Interna'],
    tendencia_sentimiento: [
      { dia: '06 ago', score: 47 },
      { dia: '07 ago', score: 46 },
      { dia: '08 ago', score: 45 },
      { dia: '09 ago', score: 44 },
      { dia: '10 ago', score: 45 },
      { dia: '11 ago', score: 44 },
      { dia: '12 ago', score: 44 }
    ],
    ultimas: [
      { titulo: 'Karina Milei toma el control de la estrategia electoral', medio: 'Ámbito', tono: 'neu', hora: '07:30' },
      { titulo: 'Cuestionamientos por el rol de la hermana del Presidente', medio: 'Clarín', tono: 'neg', hora: '06:40' }
    ]
  },
  {
    id: 'cristina',
    nombre: 'Cristina Fernández de Kirchner',
    cargo: 'Ex presidenta / Senadora',
    partido: 'Unión por la Patria',
    bloque: 'opositor',
    sentimiento: 38,
    tono: { pos: 22, neu: 32, neg: 46 },
    menciones: 3100,
    temas: ['Presupuesto', 'Causas judiciales', 'CGT'],
    tendencia_sentimiento: [
      { dia: '06 ago', score: 41 },
      { dia: '07 ago', score: 40 },
      { dia: '08 ago', score: 39 },
      { dia: '09 ago', score: 38 },
      { dia: '10 ago', score: 37 },
      { dia: '11 ago', score: 39 },
      { dia: '12 ago', score: 38 }
    ],
    ultimas: [
      { titulo: 'CFK convoca a la unidad opositora frente al Presupuesto', medio: 'Página 12', tono: 'pos', hora: '08:05' },
      { titulo: 'El kirchnerismo vuelve a cargar contra el "ajuste"', medio: 'TN', tono: 'neu', hora: '07:20' },
      { titulo: 'Repudios en redes tras sus dichos sobre la movilización', medio: 'X', tono: 'neg', hora: '06:50' }
    ]
  },
  {
    id: 'kicillof',
    nombre: 'Axel Kicillof',
    cargo: 'Gobernador de Buenos Aires',
    partido: 'Unión por la Patria',
    bloque: 'opositor',
    sentimiento: 41,
    tono: { pos: 25, neu: 35, neg: 40 },
    menciones: 1750,
    temas: ['Coparticipación', 'Presupuesto', 'Educación'],
    tendencia_sentimiento: [
      { dia: '06 ago', score: 44 },
      { dia: '07 ago', score: 43 },
      { dia: '08 ago', score: 42 },
      { dia: '09 ago', score: 41 },
      { dia: '10 ago', score: 40 },
      { dia: '11 ago', score: 41 },
      { dia: '12 ago', score: 41 }
    ],
    ultimas: [
      { titulo: 'Kicillof advierte que la provincia "no sobrevive" sin coparticipación', medio: 'Infobae', tono: 'pos', hora: '07:55' },
      { titulo: 'El Gobernador se reunió con gremios docentes', medio: 'El Día', tono: 'neu', hora: '07:15' }
    ]
  },
  {
    id: 'larreta',
    nombre: 'Horacio Rodríguez Larreta',
    cargo: 'Ex jefe de Gobierno de CABA',
    partido: 'Juntos por el Cambio',
    bloque: 'opositor',
    sentimiento: 55,
    tono: { pos: 42, neu: 33, neg: 25 },
    menciones: 520,
    temas: ['Reconstrucción', 'Elecciones 2027'],
    tendencia_sentimiento: [
      { dia: '06 ago', score: 54 },
      { dia: '07 ago', score: 55 },
      { dia: '08 ago', score: 56 },
      { dia: '09 ago', score: 54 },
      { dia: '10 ago', score: 55 },
      { dia: '11 ago', score: 56 },
      { dia: '12 ago', score: 55 }
    ],
    ultimas: [
      { titulo: 'Larreta busca rearmar el espacio opositor de centro', medio: 'La Nación', tono: 'pos', hora: '07:40' },
      { titulo: 'El ex jefe de Gobierno evita definirse sobre la marcha', medio: 'Clarín', tono: 'neu', hora: '06:30' }
    ]
  },
  {
    id: 'lousteau',
    nombre: 'Martín Lousteau',
    cargo: 'Senador nacional',
    partido: 'UCR',
    bloque: 'opositor',
    sentimiento: 57,
    tono: { pos: 45, neu: 31, neg: 24 },
    menciones: 610,
    temas: ['Presupuesto', 'Coparticipación'],
    tendencia_sentimiento: [
      { dia: '06 ago', score: 55 },
      { dia: '07 ago', score: 56 },
      { dia: '08 ago', score: 57 },
      { dia: '09 ago', score: 58 },
      { dia: '10 ago', score: 56 },
      { dia: '11 ago', score: 57 },
      { dia: '12 ago', score: 57 }
    ],
    ultimas: [
      { titulo: 'Lousteau: "el Presupuesto es un ajuste disfrazado de orden"', medio: 'Radio Mitre', tono: 'pos', hora: '08:10' },
      { titulo: 'El radicalismo negocia cambios en coparticipación', medio: 'Ambito', tono: 'neu', hora: '07:05' }
    ]
  },
  {
    id: 'bullrich',
    nombre: 'Patricia Bullrich',
    cargo: 'Ministra de Seguridad',
    partido: 'PRO',
    bloque: 'oficialista',
    sentimiento: 47,
    tono: { pos: 32, neu: 36, neg: 32 },
    menciones: 890,
    temas: ['Seguridad', 'Cortes de ruta'],
    tendencia_sentimiento: [
      { dia: '06 ago', score: 49 },
      { dia: '07 ago', score: 48 },
      { dia: '08 ago', score: 47 },
      { dia: '09 ago', score: 46 },
      { dia: '10 ago', score: 47 },
      { dia: '11 ago', score: 47 },
      { dia: '12 ago', score: 47 }
    ],
    ultimas: [
      { titulo: 'Bullrich ratifica el protocolo antipiquetes ante los cortes', medio: 'TN', tono: 'pos', hora: '07:35' },
      { titulo: 'Críticas por el operativo en la Ruta 9 de Córdoba', medio: 'La Voz', tono: 'neg', hora: '06:45' }
    ]
  },
  {
    id: 'santoro',
    nombre: 'Leandro Santoro',
    cargo: 'Diputado nacional',
    partido: 'Unión por la Patria',
    bloque: 'opositor',
    sentimiento: 45,
    tono: { pos: 30, neu: 34, neg: 36 },
    menciones: 480,
    temas: ['CABA', 'Presupuesto'],
    tendencia_sentimiento: [
      { dia: '06 ago', score: 46 },
      { dia: '07 ago', score: 45 },
      { dia: '08 ago', score: 44 },
      { dia: '09 ago', score: 45 },
      { dia: '10 ago', score: 44 },
      { dia: '11 ago', score: 45 },
      { dia: '12 ago', score: 45 }
    ],
    ultimas: [
      { titulo: 'Santoro pidió frenar el Presupuesto en la comisión', medio: 'Página 12', tono: 'pos', hora: '07:50' },
      { titulo: 'El diputado apuntó contra el ajuste en CABA', medio: 'Perfil', tono: 'neu', hora: '07:00' }
    ]
  }
];

export function buscarPersonajes(consulta = '') {
  const q = consulta.trim().toLowerCase();
  if (!q) return PERSONAJES;
  return PERSONAJES.filter((p) => {
    const blanco = `${p.nombre} ${p.cargo} ${p.partido} ${p.temas.join(' ')}`.toLowerCase();
    return blanco.includes(q);
  });
}

export const LOCALIDADES = [
  { id: 'nacion', nombre: 'Nación', tipo: 'Nación', provincia: 'Argentina', indice: 42, offset: 0, riesgo: 'alto', foco: 'Debate del Presupuesto en el Congreso', medios: ['Cadena 3', 'La Nación', 'TN'] },
  { id: 'caba', nombre: 'CABA', tipo: 'Ciudad autónoma', provincia: 'Buenos Aires', indice: 46, offset: 3, riesgo: 'alto', foco: 'Marchas frente al Congreso', medios: ['TN', 'Radio Mitre', 'Clarín'] },
  { id: 'granbsas', nombre: 'Gran Buenos Aires', tipo: 'Zona', provincia: 'Buenos Aires', indice: 36, offset: -6, riesgo: 'alto', foco: 'Paro de colectivos y docentes', medios: ['El Día', 'Radio 10', 'Provincia FM'] },
  { id: 'laplata', nombre: 'La Plata', tipo: 'Ciudad', provincia: 'Buenos Aires', indice: 39, offset: -4, riesgo: 'medio', foco: 'Reclamo gremial en el Palacio de Gobernación', medios: ['El Día', 'Radio Provincia'] },
  { id: 'mdq', nombre: 'Mar del Plata', tipo: 'Ciudad', provincia: 'Buenos Aires', indice: 48, offset: 2, riesgo: 'medio', foco: 'Conflicto hotelero estacional', medios: ['La Capital MDP', 'Cable 24'] },
  { id: 'cordoba', nombre: 'Córdoba capital', tipo: 'Ciudad', provincia: 'Córdoba', indice: 33, offset: -9, riesgo: 'critico', foco: 'Corte Ruta 9 y paro de la Intersindical', medios: ['Cadena 3', 'La Voz del Interior'] },
  { id: 'rosario', nombre: 'Rosario', tipo: 'Ciudad', provincia: 'Santa Fe', indice: 38, offset: -4, riesgo: 'alto', foco: 'Amagos de bloqueo al puerto', medios: ['La Capital', 'Radio 2', 'LT8'] },
  { id: 'santafe', nombre: 'Santa Fe capital', tipo: 'Ciudad', provincia: 'Santa Fe', indice: 44, offset: 0, riesgo: 'medio', foco: 'Conflictos docentes provinciales', medios: ['Uno Santa Fe', 'LT10'] },
  { id: 'mendoza', nombre: 'Mendoza capital', tipo: 'Ciudad', provincia: 'Mendoza', indice: 34, offset: -8, riesgo: 'critico', foco: 'Corte RN 7 por transportistas', medios: ['Los Andes', 'MDZ', 'Radio Nihuil'] },
  { id: 'neuquen', nombre: 'Neuquén', tipo: 'Ciudad', provincia: 'Neuquén', indice: 52, offset: 4, riesgo: 'medio', foco: 'Agenda Vaca Muerta sin conflicto activo', medios: ['Río Negro', 'LM Neuquén'] },
  { id: 'salta', nombre: 'Salta', tipo: 'Ciudad', provincia: 'Salta', indice: 40, offset: -2, riesgo: 'medio', foco: 'Reclamos de la CTA norte', medios: ['El Tribuno', 'FM Profesional'] },
  { id: 'tucuman', nombre: 'San Miguel de Tucumán', tipo: 'Ciudad', provincia: 'Tucumán', indice: 41, offset: -1, riesgo: 'medio', foco: 'Paro docente del norte', medios: ['La Gaceta', 'LV12'] },
  { id: 'resistencia', nombre: 'Resistencia', tipo: 'Ciudad', provincia: 'Chaco', indice: 35, offset: -5, riesgo: 'alto', foco: 'Cortes por coparticipación', medios: ['Diario Norte', 'Radio Libertad'] },
  { id: 'sanjuan', nombre: 'San Juan', tipo: 'Ciudad', provincia: 'San Juan', indice: 45, offset: 1, riesgo: 'medio', foco: 'Conflicto minero', medios: ['Diario de Cuyo', 'Radio Colón'] }
];

export function buscarLocalidad(texto = '') {
  const t = texto.trim().toLowerCase();
  if (!t) return null;
  return (
    LOCALIDADES.find((l) => l.nombre.toLowerCase() === t) ||
    LOCALIDADES.find((l) => l.nombre.toLowerCase().includes(t)) ||
    null
  );
}

function ultimosDias(n) {
  const arr = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(2026, 7, 12 - i);
    arr.push(d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }).replace('.', ''));
  }
  return arr;
}

export function serieLocalidad(localidad) {
  const deltas = [-3, -2, -4, -1, -2, 1, 0];
  const dias = ultimosDias(7);
  return dias.map((dia, i) => ({ dia, indice: clamp(localidad.indice + deltas[i]) }));
}

export function humorCombinado(persona, localidad) {
  return clamp(persona.sentimiento + (localidad?.offset ?? 0));
}

export const FUENTES = [
  {
    id: 'radios',
    nombre: 'Radios AM / FM',
    total: 62,
    cobertura: 'Nacional + 24 provincias',
    periodicidad: 'Monitoreo 06:00–24:00',
    descripcion:
      'Radios de aire y streaming de alcance nacional, provincial y local. Se transcribe el segmento político (titulares, móviles, entrevistas y cortinas) para medir agenda y encuadres.',
    fuentes: [
      'Cadena 3', 'Radio Mitre', 'Radio Continental', 'Radio Rivadavia', 'Radio 10', 'La Red',
      'Radio Nacional', 'Radio Splendid', 'Radio Belgrano', 'CNN Radio', 'Radio con Vos', 'Milenium',
      'Nihuil (MZA)', 'LV10 (MZA)', 'LT10 (SF)', 'LT8 (Rosario)', 'Radio 2 (Rosario)', 'LT9 (SF)',
      'Radio Provincia (LP)', 'Cadena Uno (MDP)', 'LV12 (Tucumán)', 'Radio Libertad (Chaco)',
      'FM Profesional (Salta)', 'Radio Colón (SJ)', 'Río Negro Radio', 'FM Alfa'
    ]
  },
  {
    id: 'portales',
    nombre: 'Portales y diarios digitales',
    total: 48,
    cobertura: 'Nacional + provincial',
    periodicidad: 'Rastreo cada 15 min',
    descripcion:
      'Diarios digitales y portales de noticias. Se indexan notas, titulares, volantas y bajadas para detectar encuadres y medir volumen de cobertura por tema y personaje.',
    fuentes: [
      'La Nación', 'Clarín', 'Infobae', 'Página 12', 'Perfil', 'Ámbito Financiero', 'El Cronista',
      'BAE Negocios', 'iProfesional', 'La Política Online', 'Minuto Uno', 'Urgente24',
      'El Intransigente', 'A24', 'MDZ (MZA)', 'Los Andes (MZA)', 'La Voz del Interior (CBA)',
      'La Capital (Rosario)', 'El Litoral (SF)', 'Uno Santa Fe', 'La Gaceta (Tucumán)',
      'El Tribuno (Salta)', 'Diario Norte (Chaco)', 'El Territorio (Misiones)', 'Río Negro',
      'El Día (LP)', 'La Capital MDP', 'Diario de Cuyo (SJ)', 'El Sol (MZA)', 'La Arena (LPampa)',
      'El Patagónico', '8300 (Neuquén)', 'LM Neuquén', 'Mejor Informado'
    ]
  },
  {
    id: 'tv',
    nombre: 'Televisión',
    total: 14,
    cobertura: 'Canales de aire, cable y TDA',
    periodicidad: 'Noticieros centrales y mediodía',
    descripcion:
      'Se monitorean noticieros centrales y paneles políticos de cable y canales de aire, con enfoque en orden de titulares, invitados y encuadres de movilizaciones.',
    fuentes: [
      'TN', 'C5N', 'A24', 'Crónica TV', 'Canal 26', 'América 24', 'El Trece (Noticiero 13)',
      'Telefe Noticias', 'Canal 9 (Telenoche)', 'Televisión Pública', 'CCN (Cable Ciudad)',
      'Canal 10 Córdoba', 'Canal 10 Tucumán', 'Somos Santa Fe'
    ]
  },
  {
    id: 'redes',
    nombre: 'Redes sociales',
    total: 5,
    cobertura: 'Cuentas oficiales + militancia + trending',
    periodicidad: 'Streaming 24/7',
    descripcion:
      'X (Twitter), Facebook, Instagram, TikTok y YouTube. Se rastrean cuentas de dirigentes, voceros, cuentas oficiales y hashtags en tendencia para medir viralización y sentimiento.',
    fuentes: ['X (Twitter)', 'Facebook', 'Instagram', 'TikTok', 'YouTube']
  },
  {
    id: 'agencias',
    nombre: 'Agencias y fuentes oficiales',
    total: 12,
    cobertura: 'Nacional',
    periodicidad: 'Diaria / en línea',
    descripcion:
      'Agencias de noticias y fuentes oficiales de gobierno, congreso, poder judicial y datos estadísticos. Aportan la línea base factual para contrastar narrativas.',
    fuentes: [
      'Télam', 'Noticias Argentinas (NA)', 'DYN', 'INDEC', 'Banco Central (BCRA)',
      'Ministerio de Economía', 'Presidencia (Casa Rosada)', 'Senado de la Nación',
      'Diputados (HCDN)', 'Boletín Oficial', 'Corte Suprema (CSJN)', 'Gobiernos provinciales'
    ]
  },
  {
    id: 'provinciales',
    nombre: 'Medios provinciales y comunitarios',
    total: 79,
    cobertura: '24 provincias',
    periodicidad: 'Rastreo cada 30 min',
    descripcion:
      'Radios FM comunitarias, periódicos zonales y portales regionales. Capturan el malestar de base (cortes de ruta, asambleas, reclamos) que los medios nacionales no cubren.',
    fuentes: [
      'Radio 3 Rosario', 'FM de la Calle (CBA)', 'Radio Estación Sur', 'La Ribera FM', 'FM Barriletes',
      'La Masa (Plataforma)', 'Diario El Ciudadano', 'Criterio Online', 'El Zonda (SJ)',
      'Radio Nacional Ushuaia', 'Canal 2 Bahía', 'Diario Panorama (SdE)', 'El Periódico Austral'
    ]
  }
];

export const TOTAL_FUENTES = FUENTES.reduce((acc, c) => acc + c.total, 0);
