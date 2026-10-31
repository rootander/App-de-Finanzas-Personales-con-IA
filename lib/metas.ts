import { supabase } from "./supabase";

export type MetaAhorro = {
  id: string;
  usuario_id?: string;
  nombre: string;
  monto_objetivo: number;
  monto_actual: number;
  fecha_objetivo: string | null;
  created_at?: string;
  updated_at?: string;
};

export type MetaAhorroInput = {
  nombre: string;
  monto_objetivo: number;
  monto_actual: number;
  fecha_objetivo: string | null;
};

export function progresoMeta(meta: MetaAhorro) {
  const objetivo = Number(meta.monto_objetivo) || 0;
  const actual = Number(meta.monto_actual) || 0;
  return objetivo > 0 ? Math.min(Math.max((actual / objetivo) * 100, 0), 100) : 0;
}

export async function listarMetas(): Promise<MetaAhorro[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("meta_ahorro")
    .select("*")
    .eq("usuario_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.log("Error al cargar metas:", error.message);
    return [];
  }

  return (data || []) as MetaAhorro[];
}

export async function crearMeta(input: MetaAhorroInput): Promise<MetaAhorro> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sesión expirada");

  const { data, error } = await supabase
    .from("meta_ahorro")
    .insert({ ...input, usuario_id: user.id })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as MetaAhorro;
}

export async function actualizarMeta(id: string, input: MetaAhorroInput): Promise<MetaAhorro> {
  const { data, error } = await supabase
    .from("meta_ahorro")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as MetaAhorro;
}

export async function eliminarMeta(id: string): Promise<void> {
  const { error } = await supabase.from("meta_ahorro").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
