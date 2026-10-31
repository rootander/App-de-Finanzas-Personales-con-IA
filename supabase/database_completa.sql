-- ============================================================
-- FINANZAS IA - BASE DE DATOS COMPLETA
-- Ejecuta TODO este bloque en el SQL Editor de Supabase
-- ============================================================
-- Incluye:
--   1. Extensiones
--   2. Tabla perfil
--   3. Tabla categoria
--   4. Tabla movimiento
--   5. Tabla metrica_ia
--   6. Tabla app_event
--   7. Tabla ocr_historial (NUEVA)
--   8. Tabla chat_historial (NUEVA)
--   9. Tabla meta_ahorro (NUEVA)
--  10. Políticas RLS
--  11. Funciones y Triggers
--  12. Índices
--  13. Categorías por defecto
--  14. Permisos seguros
-- ============================================================

-- ============================================================
-- 1. EXTENSIONES
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 2. TABLA PERFIL
-- ============================================================
DROP TABLE IF EXISTS public.meta_ahorro CASCADE;
DROP TABLE IF EXISTS public.chat_historial CASCADE;
DROP TABLE IF EXISTS public.ocr_historial CASCADE;
DROP TABLE IF EXISTS public.movimiento CASCADE;
DROP TABLE IF EXISTS public.categoria CASCADE;
DROP TABLE IF EXISTS public.metrica_ia CASCADE;
DROP TABLE IF EXISTS public.app_event CASCADE;
DROP TABLE IF EXISTS public.perfil CASCADE;

CREATE TABLE IF NOT EXISTS public.perfil (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    nombre TEXT,
    avatar_url TEXT,
    moneda TEXT DEFAULT 'PEN',
    preferencias JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON COLUMN public.perfil.preferencias IS 'Preferencias del usuario: moneda, meta_ahorro_pct, notificaciones, idioma';

-- ============================================================
-- 3. TABLA CATEGORÍA
-- ============================================================
CREATE TABLE IF NOT EXISTS public.categoria (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    nombre TEXT NOT NULL,
    icono TEXT,
    tipo TEXT CHECK (tipo IN ('ingreso', 'gasto', 'ambos')),
    usuario_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 4. TABLA MOVIMIENTO
-- ============================================================
CREATE TABLE IF NOT EXISTS public.movimiento (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    usuario_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    categoria_id UUID REFERENCES public.categoria(id) ON DELETE SET NULL,
    tipo TEXT CHECK (tipo IN ('ingreso', 'gasto')),
    tipo_registro TEXT CHECK (tipo_registro IN ('manual', 'ia')),
    monto DECIMAL(12,2) NOT NULL,
    fecha DATE NOT NULL DEFAULT current_date,
    descripcion TEXT,
    descripcion_ia TEXT,
    imagen_url TEXT,
    medio_pago TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 5. TABLA MÉTRICA IA
-- ============================================================
CREATE TABLE IF NOT EXISTS public.metrica_ia (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    usuario_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    proceso TEXT CHECK (proceso IN ('ocr', 'clasificacion', 'chat')),
    modelo TEXT,
    duracion_ms INTEGER,
    tokens_input INTEGER,
    tokens_output INTEGER,
    exito BOOLEAN DEFAULT true,
    error TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 6. TABLA APP EVENT
-- ============================================================
CREATE TABLE IF NOT EXISTS public.app_event (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    usuario_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    evento TEXT NOT NULL,
    metadata JSONB,
    duracion_ms BIGINT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 7. TABLA OCR HISTORIAL (NUEVA)
-- Guarda toda la información extraída por el OCR por usuario
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ocr_historial (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    usuario_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    movimiento_id UUID REFERENCES public.movimiento(id) ON DELETE SET NULL,
    imagen_url TEXT,
    imagen_base64 TEXT,
    monto_detectado DECIMAL(12,2),
    fecha_detectada DATE,
    descripcion_detectada TEXT,
    categoria_sugerida TEXT,
    tipo_detectado TEXT CHECK (tipo_detectado IN ('ingreso', 'gasto')),
    medio_pago_detectado TEXT,
    receptor TEXT,
    emisor TEXT,
    recomendaciones TEXT,
    texto_completo_ocr TEXT,
    modelo_ia TEXT DEFAULT 'llama-4-scout',
    proveedor_ia TEXT DEFAULT 'groq',
    duracion_ms INTEGER,
    exito BOOLEAN DEFAULT true,
    error_mensaje TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.ocr_historial IS 'Historial completo de procesamiento OCR de comprobantes por usuario';
COMMENT ON COLUMN public.ocr_historial.imagen_base64 IS 'Imagen en base64 para referencia (opcional, puede ser null por tamaño)';
COMMENT ON COLUMN public.ocr_historial.texto_completo_ocr IS 'Texto completo extraído por la IA del comprobante';
COMMENT ON COLUMN public.ocr_historial.receptor IS 'Persona o entidad que recibe el pago';
COMMENT ON COLUMN public.ocr_historial.emisor IS 'Persona o entidad que emite el pago';
COMMENT ON COLUMN public.ocr_historial.recomendaciones IS 'Recomendaciones financieras generadas por la IA';
COMMENT ON COLUMN public.ocr_historial.metadata IS 'JSON adicional con datos extras del OCR';

-- ============================================================
-- 8. TABLA CHAT HISTORIAL (NUEVA)
-- Guarda las conversaciones del chatbot por usuario
-- ============================================================
CREATE TABLE IF NOT EXISTS public.chat_historial (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    usuario_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    sesion_id UUID DEFAULT gen_random_uuid(),
    mensaje_usuario TEXT NOT NULL,
    respuesta_ia TEXT NOT NULL,
    modelo_ia TEXT DEFAULT 'llama-3.3-70b-versatile',
    proveedor_ia TEXT DEFAULT 'groq',
    intencion_detectada TEXT,
    tokens_input INTEGER,
    tokens_output INTEGER,
    duracion_ms INTEGER,
    exito BOOLEAN DEFAULT true,
    error_mensaje TEXT,
    contexto_financiero JSONB,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.chat_historial IS 'Historial completo de conversaciones del chatbot financiero por usuario';
COMMENT ON COLUMN public.chat_historial.sesion_id IS 'ID de sesión del chat (agrupa mensajes de una misma conversación)';
COMMENT ON COLUMN public.chat_historial.intencion_detectada IS 'Intención detectada: gasto, ingreso, consulta, resumen, consejo, etc.';
COMMENT ON COLUMN public.chat_historial.contexto_financiero IS 'Snapshot del contexto financiero enviado al chatbot';
COMMENT ON COLUMN public.chat_historial.metadata IS 'JSON adicional con datos extras del chat';

-- ============================================================
-- 9. TABLA META AHORRO (NUEVA)
-- Metas personales con monto objetivo, monto actual y fecha
-- ============================================================
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

-- ============================================================
-- 10. HABILITAR ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE public.perfil ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimiento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metrica_ia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_event ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ocr_historial ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_historial ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_ahorro ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 11. POLÍTICAS RLS
-- ============================================================

-- POLÍTICAS PERFIL
DROP POLICY IF EXISTS "Ver propio perfil" ON public.perfil;
CREATE POLICY "Ver propio perfil" ON public.perfil
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Insertar propio perfil" ON public.perfil;
CREATE POLICY "Insertar propio perfil" ON public.perfil
    FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Actualizar propio perfil" ON public.perfil;
CREATE POLICY "Actualizar propio perfil" ON public.perfil
    FOR UPDATE USING (auth.uid() = id);

-- POLÍTICAS CATEGORÍA
DROP POLICY IF EXISTS "Ver categorias globales o propias" ON public.categoria;
CREATE POLICY "Ver categorias globales o propias" ON public.categoria
    FOR SELECT USING (usuario_id IS NULL OR auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Insertar propias categorias" ON public.categoria;
CREATE POLICY "Insertar propias categorias" ON public.categoria
    FOR INSERT WITH CHECK (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Eliminar propias categorias" ON public.categoria;
CREATE POLICY "Eliminar propias categorias" ON public.categoria
    FOR DELETE USING (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Actualizar propias categorias" ON public.categoria;
CREATE POLICY "Actualizar propias categorias" ON public.categoria
    FOR UPDATE USING (auth.uid() = usuario_id);

-- POLÍTICAS MOVIMIENTO
DROP POLICY IF EXISTS "Ver propios movimientos" ON public.movimiento;
CREATE POLICY "Ver propios movimientos" ON public.movimiento
    FOR SELECT USING (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Insertar propios movimientos" ON public.movimiento;
CREATE POLICY "Insertar propios movimientos" ON public.movimiento
    FOR INSERT WITH CHECK (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Actualizar propios movimientos" ON public.movimiento;
CREATE POLICY "Actualizar propios movimientos" ON public.movimiento
    FOR UPDATE USING (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Borrar propios movimientos" ON public.movimiento;
CREATE POLICY "Borrar propios movimientos" ON public.movimiento
    FOR DELETE USING (auth.uid() = usuario_id);

-- POLÍTICAS MÉTRICA IA
DROP POLICY IF EXISTS "metricas_select" ON public.metrica_ia;
CREATE POLICY "metricas_select" ON public.metrica_ia
    FOR SELECT USING (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "metricas_insert" ON public.metrica_ia;
CREATE POLICY "metricas_insert" ON public.metrica_ia
    FOR INSERT WITH CHECK (auth.uid() = usuario_id);

-- POLÍTICAS APP EVENT
DROP POLICY IF EXISTS "event_select" ON public.app_event;
CREATE POLICY "event_select" ON public.app_event
    FOR SELECT USING (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "event_insert" ON public.app_event;
CREATE POLICY "event_insert" ON public.app_event
    FOR INSERT WITH CHECK (auth.uid() = usuario_id);

-- POLÍTICAS OCR HISTORIAL
DROP POLICY IF EXISTS "ocr_select" ON public.ocr_historial;
CREATE POLICY "ocr_select" ON public.ocr_historial
    FOR SELECT USING (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "ocr_insert" ON public.ocr_historial;
CREATE POLICY "ocr_insert" ON public.ocr_historial
    FOR INSERT WITH CHECK (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "ocr_update" ON public.ocr_historial;
CREATE POLICY "ocr_update" ON public.ocr_historial
    FOR UPDATE USING (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "ocr_delete" ON public.ocr_historial;
CREATE POLICY "ocr_delete" ON public.ocr_historial
    FOR DELETE USING (auth.uid() = usuario_id);

-- POLÍTICAS CHAT HISTORIAL
DROP POLICY IF EXISTS "chat_select" ON public.chat_historial;
CREATE POLICY "chat_select" ON public.chat_historial
    FOR SELECT USING (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "chat_insert" ON public.chat_historial;
CREATE POLICY "chat_insert" ON public.chat_historial
    FOR INSERT WITH CHECK (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "chat_update" ON public.chat_historial;
CREATE POLICY "chat_update" ON public.chat_historial
    FOR UPDATE USING (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "chat_delete" ON public.chat_historial;
CREATE POLICY "chat_delete" ON public.chat_historial
    FOR DELETE USING (auth.uid() = usuario_id);

-- POLÍTICAS META AHORRO
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

-- ============================================================
-- 12. FUNCIONES Y TRIGGERS
-- ============================================================

-- Función: Crear perfil automáticamente al registrarse
CREATE OR REPLACE FUNCTION public.manejar_nuevo_usuario()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.perfil (id, nombre)
  VALUES (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.manejar_nuevo_usuario();

-- Función: Obtener user ID
CREATE OR REPLACE FUNCTION public.get_user_id()
RETURNS UUID AS $$
  SELECT auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Función: Rate limiting de eventos (máx 100 por hora)
CREATE OR REPLACE FUNCTION public.check_event_rate_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT count(*) FROM public.app_event
      WHERE usuario_id = auth.uid()
      AND created_at > now() - interval '1 hour') > 100 THEN
    RAISE EXCEPTION 'Rate limit exceeded: max 100 events per hour';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS rate_limit_events ON public.app_event;
CREATE TRIGGER rate_limit_events
  BEFORE INSERT ON public.app_event
  FOR EACH ROW EXECUTE FUNCTION public.check_event_rate_limit();

-- Función: Limpiar datos antiguos (90 días)
CREATE OR REPLACE FUNCTION public.cleanup_old_events()
RETURNS void AS $$
BEGIN
  DELETE FROM public.app_event
  WHERE created_at < now() - interval '90 days';
  DELETE FROM public.metrica_ia
  WHERE created_at < now() - interval '90 days';
  DELETE FROM public.ocr_historial
  WHERE created_at < now() - interval '90 days';
  DELETE FROM public.chat_historial
  WHERE created_at < now() - interval '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función: Obtener estadísticas de OCR del usuario
CREATE OR REPLACE FUNCTION public.estadisticas_ocr(p_usuario_id UUID)
RETURNS TABLE (
    total_procesados BIGINT,
    exitosos BIGINT,
    fallidos BIGINT,
    monto_total_detectado DECIMAL(12,2),
    ultimo_proceso TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    count(*) AS total_procesados,
    count(*) FILTER (WHERE exito = true) AS exitosos,
    count(*) FILTER (WHERE exito = false) AS fallidos,
    coalesce(sum(monto_detectado), 0) AS monto_total_detectado,
    max(created_at) AS ultimo_proceso
  FROM public.ocr_historial
  WHERE usuario_id = p_usuario_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función: Obtener estadísticas de chat del usuario
CREATE OR REPLACE FUNCTION public.estadisticas_chat(p_usuario_id UUID)
RETURNS TABLE (
    total_mensajes BIGINT,
    sesiones_totales BIGINT,
    exitosos BIGINT,
    fallidos BIGINT,
    ultimo_mensaje TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    count(*) AS total_mensajes,
    count(DISTINCT sesion_id) AS sesiones_totales,
    count(*) FILTER (WHERE exito = true) AS exitosos,
    count(*) FILTER (WHERE exito = false) AS fallidos,
    max(created_at) AS ultimo_mensaje
  FROM public.chat_historial
  WHERE usuario_id = p_usuario_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función: Actualizar timestamp de metas de ahorro
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

-- ============================================================
-- 13. ÍNDICES PARA PERFORMANCE
-- ============================================================

-- Movimiento
CREATE INDEX IF NOT EXISTS idx_movimiento_usuario_id ON public.movimiento(usuario_id);
CREATE INDEX IF NOT EXISTS idx_movimiento_fecha ON public.movimiento(fecha);
CREATE INDEX IF NOT EXISTS idx_movimiento_usuario_fecha ON public.movimiento(usuario_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_movimiento_tipo ON public.movimiento(tipo);

-- Categoría
CREATE INDEX IF NOT EXISTS idx_categoria_usuario_id ON public.categoria(usuario_id);

-- App Event
CREATE INDEX IF NOT EXISTS idx_app_event_usuario_id ON public.app_event(usuario_id);
CREATE INDEX IF NOT EXISTS idx_app_event_created_at ON public.app_event(created_at);
CREATE INDEX IF NOT EXISTS idx_app_event_evento ON public.app_event(evento);

-- Métrica IA
CREATE INDEX IF NOT EXISTS idx_metrica_ia_usuario_id ON public.metrica_ia(usuario_id);
CREATE INDEX IF NOT EXISTS idx_metrica_ia_proceso ON public.metrica_ia(proceso);
CREATE INDEX IF NOT EXISTS idx_metrica_ia_created_at ON public.metrica_ia(created_at);

-- OCR Historial
CREATE INDEX IF NOT EXISTS idx_ocr_historial_usuario_id ON public.ocr_historial(usuario_id);
CREATE INDEX IF NOT EXISTS idx_ocr_historial_created_at ON public.ocr_historial(created_at);
CREATE INDEX IF NOT EXISTS idx_ocr_historial_exito ON public.ocr_historial(exito);
CREATE INDEX IF NOT EXISTS idx_ocr_historial_usuario_fecha ON public.ocr_historial(usuario_id, created_at DESC);

-- Chat Historial
CREATE INDEX IF NOT EXISTS idx_chat_historial_usuario_id ON public.chat_historial(usuario_id);
CREATE INDEX IF NOT EXISTS idx_chat_historial_sesion_id ON public.chat_historial(sesion_id);
CREATE INDEX IF NOT EXISTS idx_chat_historial_created_at ON public.chat_historial(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_historial_usuario_sesion ON public.chat_historial(usuario_id, sesion_id);
CREATE INDEX IF NOT EXISTS idx_chat_historial_usuario_fecha ON public.chat_historial(usuario_id, created_at DESC);

-- Meta Ahorro
CREATE INDEX IF NOT EXISTS idx_meta_ahorro_usuario_id ON public.meta_ahorro(usuario_id);
CREATE INDEX IF NOT EXISTS idx_meta_ahorro_usuario_fecha ON public.meta_ahorro(usuario_id, fecha_objetivo);

-- ============================================================
-- 14. PERMISOS SEGUROS
-- ============================================================
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Revocar permisos de anon
REVOKE ALL ON public.movimiento FROM anon;
REVOKE ALL ON public.categoria FROM anon;
REVOKE ALL ON public.perfil FROM anon;
REVOKE ALL ON public.metrica_ia FROM anon;
REVOKE ALL ON public.app_event FROM anon;
REVOKE ALL ON public.ocr_historial FROM anon;
REVOKE ALL ON public.chat_historial FROM anon;
REVOKE ALL ON public.meta_ahorro FROM anon;

-- Permisos explícitos
GRANT SELECT, INSERT, UPDATE, DELETE ON public.perfil TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categoria TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.movimiento TO authenticated;
GRANT SELECT, INSERT ON public.metrica_ia TO authenticated;
GRANT SELECT, INSERT ON public.app_event TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ocr_historial TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_historial TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meta_ahorro TO authenticated;

-- Permisos para funciones
GRANT EXECUTE ON FUNCTION public.get_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.estadisticas_ocr(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.estadisticas_chat(UUID) TO authenticated;

-- ============================================================
-- 14. CATEGORÍAS POR DEFECTO (50 categorías)
-- ============================================================
INSERT INTO public.categoria (nombre, icono, tipo) VALUES
-- GASTOS - Alimentación y Bebidas
('Restaurantes', '🍽️', 'gasto'),
('Supermercado', '🛒', 'gasto'),
('Comida rápida', '🍔', 'gasto'),
('Cafetería', '☕', 'gasto'),
('Delivery', '🛵', 'gasto'),
-- GASTOS - Transporte
('Transporte público', '🚌', 'gasto'),
('Taxi / Uber', '🚕', 'gasto'),
('Combustible', '⛽', 'gasto'),
('Estacionamiento', '🅿️', 'gasto'),
('Mantenimiento auto', '🔧', 'gasto'),
-- GASTOS - Salud
('Farmacia', '💊', 'gasto'),
('Médico / Clínica', '🏥', 'gasto'),
('Seguro médico', '🩺', 'gasto'),
('Gimnasio', '💪', 'gasto'),
('Salud mental', '🧠', 'gasto'),
-- GASTOS - Educación
('Matrícula / Pensión', '🎓', 'gasto'),
('Libros y útiles', '📚', 'gasto'),
('Cursos online', '💻', 'gasto'),
('Idiomas', '🌐', 'gasto'),
-- GASTOS - Hogar
('Alquiler', '🏠', 'gasto'),
('Electricidad', '💡', 'gasto'),
('Agua', '💧', 'gasto'),
('Internet / Cable', '📡', 'gasto'),
('Celular', '📱', 'gasto'),
('Limpieza', '🧹', 'gasto'),
('Reparaciones', '🔨', 'gasto'),
-- GASTOS - Entretenimiento
('Streaming', '🎬', 'gasto'),
('Videojuegos', '🎮', 'gasto'),
('Salidas / Ocio', '🎉', 'gasto'),
('Viajes', '✈️', 'gasto'),
('Deportes', '⚽', 'gasto'),
-- GASTOS - Ropa y Cuidado personal
('Ropa y calzado', '👗', 'gasto'),
('Peluquería / Belleza', '✂️', 'gasto'),
('Accesorios', '👜', 'gasto'),
-- GASTOS - Finanzas
('Cuotas / Deudas', '💳', 'gasto'),
('Impuestos', '📋', 'gasto'),
('Seguros', '🛡️', 'gasto'),
-- GASTOS - Mascotas y Otros
('Mascotas', '🐾', 'gasto'),
('Regalos', '🎁', 'gasto'),
('Donaciones', '❤️', 'gasto'),
('Otros gastos', '📦', 'gasto'),
-- INGRESOS
('Salario', '💼', 'ingreso'),
('Freelance', '💻', 'ingreso'),
('Negocio propio', '🏪', 'ingreso'),
('Inversiones', '📈', 'ingreso'),
('Alquiler cobrado', '🏠', 'ingreso'),
('Bonos / Comisiones', '🎯', 'ingreso'),
('Otros ingresos', '💰', 'ingreso'),
-- AMBOS
('Transferencias', '↔️', 'ambos'),
('Ahorro', '🏦', 'ambos')
ON CONFLICT DO NOTHING;

-- ============================================================
-- RESUMEN DE TABLAS CREADAS
-- ============================================================
-- 1. perfil            - Perfil de usuario
-- 2. categoria         - Categorías de ingresos/gastos
-- 3. movimiento        - Movimientos financieros
-- 4. metrica_ia        - Métricas de rendimiento IA
-- 5. app_event         - Eventos de analytics
-- 6. ocr_historial     - Historial OCR por usuario (NUEVA)
-- 7. chat_historial    - Historial chatbot por usuario (NUEVA)
-- 8. meta_ahorro       - Metas de ahorro con progreso (NUEVA)
-- ============================================================
