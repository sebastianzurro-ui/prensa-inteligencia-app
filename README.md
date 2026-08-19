# PrensaAR — PWA de Prensa e Inteligencia Política (Argentina)

Dashboard móvil-first para agentes de prensa: **índice de clima social**, **riesgo de protesta**,
**guerra de narrativas** (oficialismo vs. oposición), **acción recomendada por perfil** y un
**chat RAG** para consultas en lenguaje natural. Stack de costo $0.

## 1. Estructura del proyecto

```
prensa-inteligencia-app/
├── index.html                  # Entry PWA (meta + apple-touch + manifest)
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── .env.example                # Claves (Groq/Gemini/Supabase)
├── supabase/schema.sql         # PostgreSQL + pgvector (RAG)
├── public/
│   ├── manifest.webmanifest    # PWA: add to home screen
│   ├── sw.js                   # Service Worker (cache offline)
│   └── icons/                  # icon-192.png / icon-512.png
└── src/
    ├── main.jsx                # Bootstrap + registro SW
    ├── App.jsx                 # Shell, navegación, botón "Instalar"
    ├── index.css               # Tailwind + utilidades (.card, .chip)
    ├── data/mockData.js        # Esquema JSON del agente político
    ├── lib/
    │   ├── llm.js              # Prompts + validación de JSON del LLM
    │   ├── api.js              # Llamadas Groq/Gemini + retry + RAG
    │   ├── supabase.js         # Cliente + búsqueda pgvector
    │   └── registerSW.js       # Registro de Service Worker
    └── components/
        ├── Dashboard.jsx       # Pantalla principal compacta (hero + módulos)
        ├── Header.jsx          # Selector de jurisdicción
        ├── PeriodSelector.jsx  # Ponderación de lapso (24h/72h/7d/14d/30d)
        ├── RiskBadge.jsx       # Badge de riesgo de protesta
        ├── SocialClimateGauge.jsx   # Gauge Recharts 0-100 (compacto)
        ├── SentimentGauge.jsx       # Gauge reutilizable de humor/sentimiento
        ├── CollapsibleCard.jsx      # Módulos colapsables (menos scroll)
        ├── NarrativeWar.jsx         # Tabs oficialista vs opositor
        ├── RecommendedAction.jsx    # Toggle perfil + viñetas + frase
        ├── ClimateTrend.jsx         # Área chart según lapso ponderado
        ├── ProvinceRiskMap.jsx      # Mapa de riesgo provincial
        ├── TarjetaPersonaje.jsx     # Tarjeta de dirigente con humor + tono
        ├── TarjetaLocalidad.jsx     # Tarjeta de localidad con clima + foco
        ├── Buscador.jsx             # Búsqueda combinada localidad + personaje
        ├── FuentesPanel.jsx         # Catálogo de fuentes del monitoreo
        └── ChatPanel.jsx            # Chat tipo WhatsApp/Telegram
```

## 2. Instalación y ejecución

```bash
cd prensa-inteligencia-app
npm install
cp .env.example .env.local    # configurá las claves (o dejá VITE_LLM_MODE=mock)
npm run dev                   # http://localhost:5173
```

### Modo producción (PWA real)

```bash
npm run build        # genera dist/ (SW + manifest copiados a public/)
npm run preview      # serví dist/ para probar el Service Worker
```

> El SW solo se registra en producción (`import.meta.env.PROD`). En `dev` no interviene.

### Conectar el LLM (Groq, gratis)

1. Creá una API key en https://console.groq.com (plan free).
2. En `.env.local`:
   ```env
   VITE_LLM_MODE=real
   VITE_GROQ_API_KEY=tuyakey
   ```
3. El flujo en `src/lib/api.js`: construye el prompt con contexto del día → llama a
   Groq/Gemini con `response_format: json_object` → **valida el JSON** contra el esquema
   de `src/lib/llm.js` (con re-intento automático ×2) → devuelve la respuesta tipada.

### Conectar Supabase (RAG vectorial)

1. Creá un proyecto en https://supabase.com (free tier).
2. Ejecutá `supabase/schema.sql` en SQL Editor (activa pgvector, crea la tabla
   `fuentes_monitoreo`, el índice HNSW y la RPC `buscar_contexto`).
3. Cargá tus fuentes con embeddings (usá una función edge o el dashboard).
4. En `.env.local`: `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
5. El chat inyecta los top-k documentos recuperados como contexto RAG antes de llamar al LLM.

## 3. Capacidades PWA

- **Manifest**: `public/manifest.webmanifest` (nombre, íconos, `display: standalone`,
  shortcuts a Dashboard y Chat).
- **Service Worker**: `public/sw.js` — precache del shell, estrategia
  cache-first para assets con versión (hash de build) y network-first para el resto,
  más fallback offline para navegaciones. No cachea APIs de LLM.
- **Registro**: `src/lib/registerSW.js` (solo en producción).
- **Botón "Instalar"**: `App.jsx` escucha `beforeinstallprompt` (Android/Chrome) y usa
  el criterio `standalone` para ocultarse en iOS ya instalado.
- **iOS Safari**: `apple-mobile-web-app-capable`, `apple-touch-icon`, `theme-color`
  ya incluidos en `index.html`.

Probar en el teléfono: subir a Vercel/Render/GitHub Pages (HTTPS obligatorio para SW),
abrir en Chrome → menú → "Instalar app" / iOS → "Agregar a pantalla de inicio".

## 4. Empaquetado nativo (APK / iOS) — pasos futuros

Dos rutas posibles, ambas gratuitas, sobre el **mismo `dist/`**:

### A) Capacitor (recomendado — produce APK y .ipa)

```bash
npm i -D @capacitor/cli @capacitor/core @capacitor/android @capacitor/ios
npx cap init "PrensaAR" "ar.com.prensaar" --web-dir dist
npm run build
npx cap add android
npx cap add ios        # solo en macOS con Xcode
npx cap sync
```

- **Android APK**: abrir `android/` en Android Studio → Build → Build App Bundle(s) /
  APK(s). Instalable directo sin Play Store.
- **iOS**: abrir `ios/App/App.xcworkspace` en Xcode → Signing con tu Apple ID
  (gratis, 7 días de validez para desarrollo) → Run. Para App Store se necesita
  cuenta de desarrollador (USD 99/año).

### B) TWA (Trusted Web Activity) — Android sin frameworks

Publicar la PWA en HTTPS y empaquetar con `bubblewrap`:
```bash
npm i -g @bubblewrap/cli
bubblewrap init --manifest=https://tudominio/manifest.webmanifest
bubblewrap build
```

### C) PWA directa (cero empaquetado)

Con HTTPS + SW correctos, la app ya se instala en Android/iOS desde el navegador
("Añadir a pantalla de inicio"), con ventana propia (standalone) y funcionamiento offline.

## 5. Notas de seguridad

- Las API keys de Groq/Gemini viven en `.env` y **se exponen en el bundle del cliente**.
  Para uso productivo serio, mové la llamada al LLM a una **Edge Function** de Vercel/Render
  o una función Supabase, y usá solo la URL pública en el front.
- `sw.js` está configurado para **no cachear** llamadas a la API del LLM.

## 6. Flujo de datos del LLM (validación JSON)

```
Consulta del usuario
  → contexto del día (dashboard + perfil) + top-k RAG de Supabase
  → prompt con SYSTEM_PROMPT_CHAT (esquema JSON estricto)
  → Groq/Gemini con response_format json_object
  → validarJSON() (strip de ```, parse, chequeo de campos/énums/rangos)
  → si falla → 1 reintento → error controlado en UI
```

## 7. Fuentes de datos del monitoreo

La app se nutre de **220 fuentes** en 6 categorías (panel "Fuentes" dentro de la app):

| Categoría | Cantidad | Ejemplos |
|---|---|---|
| Radios AM/FM | 62 | Cadena 3, Mitre, Continental, Rivadavia, Radio 10, La Red, Nacional, Nihuil, LT10, LV12… |
| Portales y diarios digitales | 48 | La Nación, Clarín, Infobae, Página 12, Perfil, Ámbito, La Voz, La Gaceta, El Tribuno… |
| Televisión | 14 | TN, C5N, A24, Crónica TV, Canal 26, Telefe Noticias, TV Pública, Canal 10 Córdoba… |
| Redes sociales | 5 | X, Facebook, Instagram, TikTok, YouTube |
| Agencias y fuentes oficiales | 12 | Télam, NA, DYN, INDEC, BCRA, Senado, Diputados, Boletín Oficial… |
| Provinciales y comunitarios | 79 | FM locales, portales regionales, periódicos zonales |

**Ingestión:** RSS/JSON Feed + scraping de titulares → clasificación de tono y detección de
personajes/temas → embeddings → Supabase (pgvector) → RAG. Redes en streaming 24/7;
radios 06:00–24:00; portales cada 15 min; fuentes oficiales diarias.

> Hoy los datos que se muestran son **mock**; el catálogo documenta las fuentes reales a conectar.
