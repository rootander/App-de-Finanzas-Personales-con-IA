-- ============================================================
-- HU-02: Preferencias editables del usuario
-- HU-12: Metas de ahorro con CRUD y progreso
-- Ejecutar en el SQL Editor de Supabase o con supabase db push
-- ============================================================

ALTER TABLE public.perfil
    ADD COLUMN IF NOT EXISTS preferencias JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.perfil.preferencias IS 'Preferencias del usuario: moneda, meta_ahorro_pct, notificaciones, idioma';

CREATE TABLE IF NOT EXISTS public.meta_ahorro (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    usuario_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    nombre TEXT NOT NULL,
    monto_objetivo DECIMAL(12,2) NOT NULL CHECK (monto_objetivo > 0),
    monto_actual DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (monto_actual >= 0),
    fecha_objetivo DATE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.meta_ahorro IS 'Metas de ahorro personales con monto objetivo y fecha';
COMMENT ON COLUMN public.meta_ahorro.monto_actual IS 'Monto ahorrado acumulado para esta meta';

ALTER TABLE public.meta_ahorro ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ver propias metas" ON public.meta_ahorro;
CREATE POLICY "Ver propias metas" ON public.meta_ahorro
    FOR SELECT USING (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Insertar propias metas" ON public.meta_ahorro;
CREATE POLICY "Insertar propias metas" ON public.meta_ahorro
    FOR INSERT WITH CHECK (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Actualizar propias metas" ON public.meta_ahorro;
CREATE POLICY "Actualizar propias metas" ON public.meta_ahorro
    FOR UPDATE USING (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Eliminar propias metas" ON public.meta_ahorro;
CREATE POLICY "Eliminar propias metas" ON public.meta_ahorro
    FOR DELETE USING (auth.uid() = usuario_id);

CREATE INDEX IF NOT EXISTS idx_meta_ahorro_usuario_id
    ON public.meta_ahorro(usuario_id);
CREATE INDEX IF NOT EXISTS idx_meta_ahorro_usuario_fecha
    ON public.meta_ahorro(usuario_id, fecha_objetivo);

CREATE OR REPLACE FUNCTION public.actualizar_meta_ahorro_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_meta_ahorro_updated_at ON public.meta_ahorro;
CREATE TRIGGER trg_meta_ahorro_updated_at
    BEFORE UPDATE ON public.meta_ahorro
    FOR EACH ROW EXECUTE FUNCTION public.actualizar_meta_ahorro_updated_at();

REVOKE ALL ON public.meta_ahorro FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meta_ahorro TO authenticated;
