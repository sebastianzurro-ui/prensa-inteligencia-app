import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

let cliente = null;

export function getSupabase() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  if (!cliente) {
    cliente = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true }
    });
  }
  return cliente;
}

export async function buscarContexto(consulta, limite = 6) {
  const db = getSupabase();
  if (!db) {
    throw new Error('Supabase no configurado. Definí VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.');
  }

  const { data, error } = await db.rpc('buscar_contexto', {
    query_consulta: consulta,
    limite_resultados: limite
  });

  if (error) throw new Error(`Búsqueda vectorial falló: ${error.message}`);
  return data || [];
}
