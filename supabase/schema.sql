-- =============================================================
-- Supabase SQL: PostgreSQL + pgvector para el agente RAG
-- Ejecutar en: Supabase > SQL Editor > New query
-- =============================================================

create extension if not exists vector;

-- Fuentes del monitoreo de medios (radios, diarios, redes)
create table if not exists public.fuentes_monitoreo (
  id bigint generated always as identity primary key,
  contenido text not null,
  fuente text not null,          -- p.ej. "Cadena 3", "La Nación", "Tw"
  jurisdiccion text default 'nacion',
  fecha_emision timestamptz default now(),
  embedding vector(1536)         -- modelo text-embedding-3-small (o 768 si usás otro)
);

create index if not exists fuentes_monitoreo_embedding_idx
  on public.fuentes_monitoreo using hnsw (embedding vector_cosine_ops);

-- RPC de búsqueda vectorial (la llama src/lib/supabase.js -> buscarContexto)
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
  -- La función de embedding se genera en el cliente (Groq llama-3-70b NO embebe).
  -- Recomendado: computar el vector de la consulta en el edge function
  -- y pasar el vector directamente, o guardar embeddings pre-calculados.
  return query
  select
    f.id,
    f.contenido,
    f.fuente,
    f.jurisdiccion,
    f.fecha_emision,
    1 - (f.embedding <=> query_consulta::vector) as similarity
  from public.fuentes_monitoreo f
  order by f.embedding <=> query_consulta::vector
  limit limite_resultados;
end;
$$;

-- Tabla de auditoría de consultas del chat
create table if not exists public.consultas_chat (
  id bigint generated always as identity primary key,
  consulta text not null,
  respuesta jsonb,
  perfil text,
  jurisdiccion text,
  modelo text,
  creado_en timestamptz default now()
);

alter table public.fuentes_monitoreo enable row level security;
alter table public.consultas_chat enable row level security;

create policy "lectura_fuentes_publica" on public.fuentes_monitoreo
  for select using (true);

create policy "lectura_consultas_publica" on public.consultas_chat
  for select using (true);
