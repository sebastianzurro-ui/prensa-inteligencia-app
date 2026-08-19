# =============================================================
# GUÍA DE INSTALACIÓN - PrensaAR
# Para personas sin experiencia en programación
# =============================================================

## RESUMEN RÁPIDO (5 pasos)

1. Crear cuenta en Supabase (gratis)
2. Crear cuenta en Groq (gratis)
3. Crear cuenta en Vercel (gratis)
4. Crear cuenta en GitHub (gratis)
5. Conectar todo y listo

---

## PASO 1: Crear cuenta en Supabase (base de datos)

1. Andá a **https://supabase.com**
2. Hacé clic en **"Start your project"** (esquina superior derecha)
3. Creá cuenta con GitHub (es lo más fácil)
4. Una vez adentro, hacé clic en **"New project"**
5. Completá:
   - **Organization**: creá una nueva (o usá una existente)
   - **Project name**: `prensaar`
   - **Database Password**: poné una contraseña que recuerdes
   - **Region**: seleccioná **US East** (más rápido)
6. Esperá a que se cree el proyecto (2-3 minutos)
7. Una vez listo, andá a **"Settings"** (icono de engranaje) > **"API"**
8. Copiá estos dos valores:
   - **Project URL** (empieza con `https://xxxxx.supabase.co`)
   - **anon public** (empieza con `eyJ...`)
9. Guardalos en un archivo de texto, los vas a necesitar

### Cargar el schema de la base de datos

1. En Supabase, andá a **"SQL Editor"** (en el menú izquierdo)
2. Hacé clic en **"New query"**
3. Copiá TODO el contenido del archivo `supabase/schema-production.sql`
4. Pegalo en el editor
5. Hacé clic en **"Run"** (botón abajo a la derecha)
6. Deberías ver "Success. No rows returned"

### Obtener la Service Role Key

1. Andá a **"Settings"** > **"API"**
2. En **"Service role key"**, hacé clic en **"Reveal"**
3. Copiá esa clave (empieza con `eyJ...`)
4. **GUARDALA EN UN LUGAR SEGURO** - esta clave tiene acceso total a tu base de datos

---

## PASO 2: Crear cuenta en Groq (LLM gratis)

1. Andá a **https://console.groq.com**
2. Hacé clic en **"Sign Up"**
3. Creá cuenta con Google o GitHub
4. Una vez adentro, andá a **"API Keys"** (menú izquierdo)
5. Hacé clic en **"Create API Key"**
6. Poné un nombre como `prensaar`
7. Copiá la clave generada
8. **Guardala en tu archivo de texto**

### Verificar que funciona

- Groq te da **30 requests por minuto** gratis
- El modelo `llama-3.3-70b-versatile` es el que usa la app
- No necesitás poner tarjeta de crédito

---

## PASO 3: Crear cuenta en Vercel (hosting gratis)

1. Andá a **https://vercel.com**
2. Hacé clic en **"Sign Up"**
3. Creá cuenta con GitHub (es lo más fácil)
4. Una vez adentro, no hacés nada más acá por ahora

---

## PASO 4: Crear cuenta en GitHub (para el worker automático)

1. Andá a **https://github.com**
2. Si ya tenés cuenta, usala. Si no, creá una nueva
3. Hacé clic en **"+"** (esquina superior derecha) > **"New repository"**
4. Completá:
   - **Repository name**: `prensa-inteligencia-app`
   - **Visibility**: podés poner **Public** (es gratis)
5. Hacé clic en **"Create repository"**
6. Seguí las instrucciones que te dan para subir tu código

---

## PASO 5: Subir tu código a GitHub

En tu computadora, abrí una terminal (PowerShell o CMD) y ejecutá estos comandos uno por uno:

```powershell
# Ir a la carpeta del proyecto
cd C:\Users\Administrador\prensa-inteligencia-app

# Inicializar git
git init
git add .
git commit -m "Initial commit - PrensaAR"

# Conectar con tu repositorio (reemplazá TU_USUARIO con tu usuario de GitHub)
git remote add origin https://github.com/TU_USUARIO/prensa-inteligencia-app.git
git branch -M main
git push -u origin main
```

---

## PASO 6: Configurar variables de entorno

### En tu computadora (para desarrollo)

1. Creá un archivo llamado `.env.local` en la carpeta del proyecto
2. Copiá el contenido de `.env.example` y completá con tus claves:

```
VITE_LLM_MODE=real
VITE_LLM_PROVIDER=groq
VITE_GROQ_API_KEY=aca_tu_clave_de_groq
VITE_GROQ_MODEL=llama-3.3-70b-versatile
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=aca_tu_clave_anon
VITE_EDGE_FUNCTION_URL=https://tu-proyecto.supabase.co
```

### En GitHub Actions (para el worker automático)

1. Andá a tu repositorio en GitHub
2. Hacé clic en **"Settings"** (pestaña superior)
3. En el menú izquierdo, andá a **"Secrets and variables"** > **"Actions"**
4. Hacé clic en **"New repository secret"** y creá estos dos:
   - **Name**: `SUPABASE_URL` | **Value**: `https://tu-proyecto.supabase.co`
   - **Name**: `SUPABASE_SERVICE_KEY` | **Value**: `aca_tu_service_role_key`

---

## PASO 7: Desplegar las Edge Functions

En tu terminal:

```powershell
# Instalar la CLI de Supabase (solo una vez)
npm install -g supabase

# Login
supabase login

# Conectar con tu proyecto (reemplazá tu-project-ref)
supabase link --project-ref tu-project-ref

# Desplegar las funciones
cd supabase
supabase functions deploy chat
supabase functions deploy narrativas
supabase functions deploy dashboard

# Configurar secrets de las Edge Functions
supabase secrets set GROQ_API_KEY=aca_tu_clave_de_groq
supabase secrets set GEMINI_API_KEY=
supabase secrets set LLM_PROVIDER=groq
```

---

## PASO 8: Desplegar el frontend en Vercel

1. Andá a **https://vercel.com**
2. Hacé clic en **"New Project"**
3. Elegí **"Import Git Repository"**
4. Seleccioná tu repositorio `prensa-inteligencia-app`
5. En **"Environment Variables"**, agregá:
   - `VITE_LLM_MODE` = `real`
   - `VITE_LLM_PROVIDER` = `groq`
   - `VITE_GROQ_API_KEY` = tu clave de Groq
   - `VITE_SUPABASE_URL` = tu URL de Supabase
   - `VITE_SUPABASE_ANON_KEY` = tu clave anon de Supabase
   - `VITE_EDGE_FUNCTION_URL` = tu URL de Supabase
6. Hacé clic en **"Deploy"**
7. Esperá 1-2 minutos
8. Tu app estará disponible en `https://tu-proyecto.vercel.app`

---

## PASO 9: Activar el worker automático

El worker se ejecuta cada 30 minutos automáticamente vía GitHub Actions.

1. Andá a tu repositorio en GitHub
2. Hacé clic en **"Actions"** (pestaña superior)
3. Si es la primera vez, hacé clic en **"I understand my workflows, go ahead and enable them"**
4. El workflow **"Ingestar datos de monitoreo"** debería aparecer
5. Hacé clic en **"Run workflow"** para probarlo manualmente

---

## VERIFICAR QUE TODO FUNCIONA

1. Andá a tu app en Vercel
2. Deberías ver el dashboard (al principio con datos mock)
3. Esperá 30 minutos a que el worker cargue artículos reales
4. Recargá la app - deberías ver datos reales aparecer
5. Probá el chat con una pregunta como "¿Qué se dice sobre el presupuesto?"
6. Probá la guerra de narrativas con un tema como "paro general"

---

## SOLUCIÓN DE PROBLEMAS

### "No veo datos reales"
- Verificá que el worker de GitHub Actions esté ejecutandose (pestaña Actions)
- Mirá los logs del último run
- Verificá que las variables SUPABASE_URL y SUPABASE_SERVICE_KEY estén bien

### "El chat no funciona"
- Verificá que la Edge Function esté desplegada: `supabase functions list`
- Mirá los logs: `supabase functions logs chat`

### "La app no carga"
- Verificá las variables de entorno en Vercel
- Mirá los logs en Vercel > Functions > Logs

---

## COSTOS (TODO GRATIS)

| Servicio | Plan Gratis | Límite |
|----------|-------------|--------|
| Supabase | Free | 500MB DB, 500K edge function invocations |
| Groq | Free | 30 RPM, 14K tokens/min |
| Vercel | Free | 100GB bandwidth, 100K function invocations |
| GitHub Actions | Free | 2000 min/mes |

**Total: $0 USD por mes**

---

## SOPORTE

Si tenés problemas, escribí en:
- https://github.com/TU_USUARIO/prensa-inteligencia-app/issues
