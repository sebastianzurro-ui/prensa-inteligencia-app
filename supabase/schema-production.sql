-- =============================================================
-- Supabase SQL: Schema completo para PrensaAR en producción
-- Ejecutar en: Supabase > SQL Editor > New query
-- =============================================================

-- Extensiones
create extension if not exists vector;
create extension if not exists pg_trgm;  -- búsqueda fuzzy

-- =============================================================
-- 1. ARTÍCULOS DEL MONITOREO
-- =============================================================
create table if not exists public.articulos (
  id bigint generated always as identity primary key,
  titulo text not null,
  contenido text not null,
  resumen text,
  fuente text not null,              -- "Cadena 3", "La Nación", "X/Twitter"
  tipo_fuente text default 'digital', -- radio, tv, digital, red_social, agencia
  url text,
  jurisdiccion text default 'nacion', -- nacion, bsas, caba, cordoba, etc.
  fecha_emision timestamptz default now(),
  fecha_ingreso timestamptz default now(),
  sentimiento real default 0,         -- -1.0 a 1.0
  tono text default 'neutral',       -- positivo, neutral, negativo
  personajes text[] default '{}',    -- ['Milei', 'CGT', 'Bullrich']
  temas text[] default '{}',         -- ['presupuesto', 'inflacion', 'paro']
  embedding vector(384),             -- modelo pequeño (gte-small), opcional
  search_vector tsvector             -- para full-text search en español
);

-- Índices para rendimiento
create index if not exists articulos_fecha_idx on public.articulos (fecha_emision desc);
create index if not exists articulos_fuente_idx on public.articulos (fuente);
create index if not exists articulos_jurisdiccion_idx on public.articulos (jurisdiccion);
create index if not exists articulos_tono_idx on public.articulos (tono);
create index if not exists articulos_temas_idx on public.articulos using gin (temas);
create index if not exists articulos_personajes_idx on public.articulos using gin (personajes);
create index if not exists articulos_search_idx on public.articulos using gin (search_vector);

-- Índice para búsqueda fuzzy por título
create index if not exists articulos_titulo_trgm_idx on public.articulos using gin (titulo gin_trgm_ops);

-- =============================================================
-- 2. PERSONAJES POLÍTICOS
-- =============================================================
create table if not exists public.personajes (
  id bigint generated always as identity primary key,
  nombre text not null unique,
  cargo text,
  partido text,
  bloque text default 'indefinido',  -- oficialista, opositor, independiente
  jurisdiccion text default 'nacion',
  sentimiento real default 50,       -- 0 a 100
  tono_positivo real default 33,
  tono_neutral real default 34,
  tono_negativo real default 33,
  menciones integer default 0,
  temas text[] default '{}',
  actualizado_en timestamptz default now()
);

-- =============================================================
-- 3. JURISDICCIONES
-- =============================================================
create table if not exists public.jurisdicciones (
  id bigint generated always as identity primary key,
  nombre text not null unique,
  tipo text default 'ciudad',        -- nacion, provincia, ciudad
  provincia text,
  indice_clima integer default 50,   -- 0 a 100
  riesgo text default 'medio',       -- bajo, medio, alto, critico
  foco text,
  medios text[] default '{}',
  actualizado_en timestamptz default now()
);

-- =============================================================
-- 4. SERIES DE CLIMA SOCIAL
-- =============================================================
create table if not exists public.clima_serie (
  id bigint generated always as identity primary key,
  jurisdiccion_id bigint references public.jurisdicciones(id),
  fecha date not null,
  indice integer not null,           -- 0 a 100
  created_at timestamptz default now(),
  unique(jurisdiccion_id, fecha)
);

create index if not exists clima_serie_fecha_idx on public.clima_serie (fecha desc);

-- =============================================================
-- 5. NARRATIVAS GENERADAS
-- =============================================================
create table if not exists public.narrativas (
  id bigint generated always as identity primary key,
  tema text not null,
  encuadre_oficialista jsonb not null,
  encuadre_opositor jsonb not null,
  neutrales text[] default '{}',
  fuentes_principales jsonb default '[]',
  sentimiento_general text default 'neutral',
  score_confianza real default 0.5,
  articulos_relacionados bigint[] default '{}',
  creado_en timestamptz default now()
);

create index if not exists narrativas_tema_idx on public.narrativas (tema);
create index if not exists narrativas_creado_idx on public.narrativas (creado_en desc);

-- =============================================================
-- 6. CONSULTAS DEL CHAT (auditoría)
-- =============================================================
create table if not exists public.consultas_chat (
  id bigint generated always as identity primary key,
  consulta text not null,
  respuesta jsonb,
  perfil text,
  jurisdiccion text,
  modelo text,
  creado_en timestamptz default now()
);

-- =============================================================
-- 7. ÍNDICE DE BÚSQUEDA FULL-TEXT (ESPAÑOL)
-- =============================================================

-- Función para actualizar search_vector automáticamente
create or replace function public.actualizar_search_vector()
returns trigger as $$
begin
  new.search_vector :=
    setweight(to_tsvector('spanish', coalesce(new.titulo, '')), 'A') ||
    setweight(to_tsvector('spanish', coalesce(new.contenido, '')), 'B') ||
    setweight(to_tsvector('spanish', coalesce(new.resumen, '')), 'C');
  return new;
end;
$$ language plpgsql;

-- Trigger para mantener search_vector actualizado
drop trigger if exists articulos_search_trigger on public.articulos;
create trigger articulos_search_trigger
  before insert or update on public.articulos
  for each row execute function public.actualizar_search_vector();

-- =============================================================
-- 8. FUNCIÓN DE BÚSQUEDA FULL-TEXT
-- =============================================================
create or replace function public.buscar_articulos(
  query_text text,
  limite int default 10,
  fuente_filtro text default null,
  jurisdiccion_filtro text default null
)
returns table (
  id bigint,
  titulo text,
  contenido text,
  resumen text,
  fuente text,
  tipo_fuente text,
  jurisdiccion text,
  fecha_emision timestamptz,
  sentimiento real,
  tono text,
  personajes text[],
  temas text[],
  rank real
)
language plpgsql
security definer
as $$
begin
  return query
  select
    a.id, a.titulo, a.contenido, a.resumen, a.fuente, a.tipo_fuente,
    a.jurisdiccion, a.fecha_emision, a.sentimiento, a.tono,
    a.personajes, a.temas,
    ts_rank_cd(a.search_vector, plainto_tsquery('spanish', query_text))::real as rank
  from public.articulos a
  where
    a.search_vector @@ plainto_tsquery('spanish', query_text)
    and (fuente_filtro is null or a.fuente = fuente_filtro)
    and (jurisdiccion_filtro is null or a.jurisdiccion = jurisdiccion_filtro)
  order by rank desc, a.fecha_emision desc
  limit limite;
end;
$$;

-- =============================================================
-- 9. FUNCIÓN DE BÚSQUEDA VECTORIAL (opcional, con embeddings)
-- =============================================================
create or replace function public.buscar_contexto(
  query_consulta text,
  limite_resultados int default 6
)
returns table (
  id bigint,
  contenido text,
  fuente text,
  jurisdiccion text,
  fecha_emision timestamptz,
  similarity real
)
language plpgsql
security definer
as $$
begin
  return query
  select
    a.id,
    a.contenido,
    a.fuente,
    a.jurisdiccion,
    a.fecha_emision,
    1 - (a.embedding <=> (select embedding from public.articulos where contenido ilike '%' || query_consulta || '%' limit 1)) as similarity
  from public.articulos a
  where a.embedding is not null
  order by a.embedding <=> (select embedding from public.articulos where contenido ilike '%' || query_consulta || '%' limit 1)
  limit limite_resultados;
end;
$$;

-- =============================================================
-- 10. FUNCIÓN PARA RESUMEN DEL DASHBOARD
-- =============================================================
create or replace function public.resumen_dashboard(
  jurisdiccion_param text default 'nacion',
  horas_atras int default 168  -- 7 días por defecto
)
returns jsonb
language plpgsql
security definer
as $$
declare
  resultado jsonb;
  total_articulos int;
  positivos int;
  negativos int;
  neutros int;
  ultimo_indice int;
  riesgo_actual text;
begin
  -- Contar artículos por tono
  select
    count(*),
    count(*) filter (where tono = 'positivo'),
    count(*) filter (where tono = 'negativo'),
    count(*) filter (where tono = 'neutral')
  into total_articulos, positivos, negativos, neutros
  from public.articulos
  where fecha_emision > now() - (horas_atras || ' hours')::interval
    and (jurisdiccion_param = 'nacion' or jurisdiccion = jurisdiccion_param);

  -- Último índice de clima
  select indice, case
    when indice >= 70 then 'bajo'
    when indice >= 55 then 'medio'
    when indice >= 35 then 'alto'
    else 'critico'
  end into ultimo_indice, riesgo_actual
  from public.clima_serie cs
  join public.jurisdicciones j on j.id = cs.jurisdiccion_id
  where j.nombre = jurisdiccion_param
  order by cs.fecha desc limit 1;

  resultado := jsonb_build_object(
    'total_articulos', coalesce(total_articulos, 0),
    'positivos', coalesce(positivos, 0),
    'negativos', coalesce(negativos, 0),
    'neutros', coalesce(neutros, 0),
    'indice_clima', coalesce(ultimo_indice, 50),
    'riesgo_protesta', coalesce(riesgo_actual, 'medio')
  );

  return resultado;
end;
$$;

-- =============================================================
-- 11. RLS (Row Level Security)
-- =============================================================
alter table public.articulos enable row level security;
alter table public.personajes enable row level security;
alter table public.jurisdicciones enable row level security;
alter table public.clima_serie enable row level security;
alter table public.narrativas enable row level security;
alter table public.consultas_chat enable row level security;

-- Políticas de lectura pública
create policy "lectura_publica" on public.articulos for select using (true);
create policy "lectura_publica" on public.personajes for select using (true);
create policy "lectura_publica" on public.jurisdicciones for select using (true);
create policy "lectura_publica" on public.clima_serie for select using (true);
create policy "lectura_publica" on public.narrativas for select using (true);
create policy "lectura_publica" on public.consultas_chat for select using (true);

-- Política de inserción solo con service_role (las Edge Functions usan service_role)
create policy "insert_service_role" on public.articulos for insert with check (true);
create policy "insert_service_role" on public.personajes for insert with check (true);
create policy "insert_service_role" on public.jurisdicciones for insert with check (true);
create policy "insert_service_role" on public.clima_serie for insert with check (true);
create policy "insert_service_role" on public.narrativas for insert with check (true);
create policy "insert_service_role" on public.consultas_chat for insert with check (true);

-- =============================================================
-- 12. DATOS INICIALES (jurisdicciones)
-- =============================================================
insert into public.jurisdicciones (nombre, tipo, provincia, indice_clima, riesgo, foco, medios)
values
  ('Nación', 'nacion', 'Argentina', 42, 'alto', 'Agenda nacional', '{}'),
  ('CABA', 'ciudad', 'Buenos Aires', 46, 'alto', 'Marchas frente al Congreso', '{}'),
  ('Gran Buenos Aires', 'zona', 'Buenos Aires', 36, 'alto', 'Paro de colectivos y docentes', '{}'),
  ('Córdoba capital', 'ciudad', 'Córdoba', 33, 'critico', 'Corte Ruta 9 y paro de la Intersindical', '{}'),
  ('Rosario', 'ciudad', 'Santa Fe', 38, 'alto', 'Amagos de bloqueo al puerto', '{}'),
  ('Mendoza capital', 'ciudad', 'Mendoza', 34, 'critico', 'Corte RN 7 por transportistas', '{}'),
  ('Santa Fe capital', 'ciudad', 'Santa Fe', 44, 'medio', 'Conflictos docentes provinciales', '{}'),
  ('La Plata', 'ciudad', 'Buenos Aires', 39, 'medio', 'Reclamo gremial en el Palacio de Gobernación', '{}'),
  ('Neuquén', 'ciudad', 'Neuquén', 52, 'medio', 'Agenda Vaca Muerta sin conflicto activo', '{}'),
  ('Salta', 'ciudad', 'Salta', 40, 'medio', 'Reclamos de la CTA norte', '{}'),
  ('San Miguel de Tucumán', 'ciudad', 'Tucumán', 41, 'medio', 'Paro docente del norte', '{}'),
  ('Resistencia', 'ciudad', 'Chaco', 35, 'alto', 'Cortes por coparticipación', '{}'),
  ('San Juan', 'ciudad', 'San Juan', 45, 'medio', 'Conflicto minero', '{}')
on conflict (nombre) do nothing;

-- =============================================================
-- 13. DATOS INICIALES (personajes)
-- =============================================================
insert into public.personajes (nombre, cargo, partido, bloque, jurisdiccion, temas)
values
  ('Javier Milei', 'Presidente de la Nación', 'La Libertad Avanza', 'oficialista', 'nacion', '{"presupuesto", "inflacion", "dolar"}'),
  ('Victoria Villarruel', 'Vicepresidenta de la Nación', 'La Libertad Avanza', 'oficialista', 'nacion', '{"rol institucional", "senado"}'),
  ('Patricia Bullrich', 'Ministra de Seguridad', 'PRO', 'oficialista', 'nacion', '{"seguridad", "cortes de ruta"}'),
  ('Cristina Fernández de Kirchner', 'Ex presidenta / Senadora', 'Unión por la Patria', 'opositor', 'nacion', '{"presupuesto", "causas judiciales", "cgt"}'),
  ('Axel Kicillof', 'Gobernador de Buenos Aires', 'Unión por la Patria', 'opositor', 'bsas', '{"coparticipacion", "presupuesto", "educacion"}'),
  ('Horacio Rodríguez Larreta', 'Ex jefe de Gobierno de CABA', 'Juntos por el Cambio', 'opositor', 'caba', '{"reconstruccion", "elecciones 2027"}'),
  ('Martín Lousteau', 'Senador nacional', 'UCR', 'opositor', 'nacion', '{"presupuesto", "coparticipacion"}'),
  ('Leandro Santoro', 'Diputado nacional', 'Unión por la Patria', 'opositor', 'caba', '{"caba", "presupuesto"}')
on conflict (nombre) do nothing;
