/**
 * FinanzasIA - Analytics & Metrics Library v2
 * Registra eventos de usuario en `app_event` y métricas de IA en `metrica_ia`
 * Sin bloquear el hilo principal (fire-and-forget)
 */
import { supabase } from "./supabase";

// ⏱ Timestamp real desde que se carga el bundle de analíticas (building 0 de la app)
export const APP_START_TS = Date.now();
let appOpenLogged = false;

// 🛡️ Deduplicación de SCREEN_VIEWED
let lastScreen = "";
let lastScreenTs = 0;
const SCREEN_DEDUP_MS = 2000; // 2 segundos mínimo entre eventos de la misma pantalla


// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────

export type AppEventName =
  | "APP_OPEN"
  | "APP_BACKGROUND"
  | "LOGIN"
  | "LOGOUT"
  | "REGISTER"
  | "SCREEN_VIEWED"
  | "MOVEMENT_CREATED"
  | "MOVEMENT_UPDATED"
  | "MOVEMENT_DELETED"
  | "OCR_STARTED"
  | "OCR_SUCCESS"
  | "OCR_ERROR"
  | "OCR_CONFIRMED"
  | "OCR_CANCELLED"
  | "CATEGORY_SELECTED"
  | "CATEGORY_AUTO_IA"
  | "CATEGORY_CHANGED"
  | "CHAT_OPENED"
  | "CHAT_MESSAGE_SENT"
  | "CHAT_INTENT_MATCHED"
  | "CHAT_INTENT_UNKNOWN"
  | "FILTER_APPLIED"
  | "MONTH_CHANGED"
  | "PROFILE_NAME_UPDATED"
  | "EXPORT_PDF"
  | "EXPORT_EXCEL";

export type IAProcess = "ocr" | "clasificacion" | "chat";

// ─────────────────────────────────────────────
// CORE: Insert con usuario_id explícito
// Soporta tanto usuario autenticado como pasado directamente
// ─────────────────────────────────────────────

async function _insert(
  tabla: "app_event" | "metrica_ia",
  payload: Record<string, any>,
  userId?: string | null,
): Promise<void> {
  try {
    // Si no viene userId externo, intentamos obtenerlo de la sesión
    let uid = userId;
    if (!uid) {
      const { data: { user } } = await supabase.auth.getUser();
      uid = user?.id ?? null;
    }
    if (!uid) return; // sin uid no hay nada que hacer
    await supabase.from(tabla).insert({ usuario_id: uid, ...payload });
  } catch {
    // Silencioso — no debe afectar la UX
  }
}

// ─────────────────────────────────────────────
// FUNCIONES PÚBLICAS
// ─────────────────────────────────────────────

/**
 * Registra un evento de usuario en `app_event`.
 * @param userId  Opcional — pasar cuando el usuario aún no está en sesión (ej. justo después del login).
 * @param duracion_ms Opcional — tiempo que tardó la acción asociada al evento.
 */
export function track(
  evento: AppEventName,
  metadata?: Record<string, any>,
  userId?: string,
  duracion_ms?: number,
): void {
  _insert("app_event", { evento, metadata: metadata ?? null, duracion_ms: duracion_ms ?? 0 }, userId);
}

/**
 * Registra métricas de IA en `metrica_ia`.
 */
export function trackIA(opts: {
  proceso: IAProcess;
  modelo?: string;
  duracion_ms?: number;
  tokens_input?: number;
  tokens_output?: number;
  exito?: boolean;
  error?: string;
  userId?: string;
}): void {
  _insert("metrica_ia", {
    proceso: opts.proceso,
    modelo: opts.modelo ?? "desconocido",
    duracion_ms: opts.duracion_ms ?? null,
    tokens_input: opts.tokens_input ?? null,
    tokens_output: opts.tokens_output ?? null,
    exito: opts.exito ?? true,
    error: opts.error ?? null,
  }, opts.userId);
}

// ─────────────────────────────────────────────
// Analytics — API semántica de alto nivel
// ─────────────────────────────────────────────

export const Analytics = {

  // ── Auth ── (pasan userId explícito porque aún no hay sesión estable)

  /** Llamar en _layout.tsx al detectar session válida */
  appOpen: (userId?: string) => {
    if (appOpenLogged) return;
    appOpenLogged = true;
    const duracion_ms = Date.now() - APP_START_TS;
    track("APP_OPEN", { ts: new Date().toISOString() }, userId, duracion_ms);
  },

  /** Llamar justo después de signInWithPassword exitoso */
  login: (userId: string, email: string) =>
    track("LOGIN", { email }, userId),

  /** Llamar justo después de signUp exitoso */
  register: (userId: string, nombre: string) =>
    track("REGISTER", { nombre }, userId),

  /** Llamar antes de signOut */
  logout: () =>
    track("LOGOUT"),

  // ── Pantallas ── (llamar en useFocusEffect de cada tab)

  screenView: (pantalla: string, duracion_ms?: number) => {
    const now = Date.now();
    // Solo registrar si es pantalla diferente O si pasó suficiente tiempo
    if (pantalla === lastScreen && (now - lastScreenTs) < SCREEN_DEDUP_MS) {
      return; // Evitar duplicado
    }
    lastScreen = pantalla;
    lastScreenTs = now;
    track("SCREEN_VIEWED", { pantalla }, undefined, duracion_ms ?? 0);
  },

  // ── Movimientos ──

  movimientoCreado: (opts: {
    tipo: string;
    monto: number;
    categoria: string;
    via_ia: boolean;
    medio_pago?: string;
  }) => track("MOVEMENT_CREATED", opts),

  movimientoEliminado: (id: string, monto?: number, tipo?: string) =>
    track("MOVEMENT_DELETED", { id, monto, tipo }),

  movimientoEditado: (id: string, campo: string, valorAnterior?: string, valorNuevo?: string) =>
    track("MOVEMENT_UPDATED", { id, campo, valorAnterior, valorNuevo }),

  // ── Categoría ──

  categoriaSeleccionada: (nombre: string, via: "manual" | "ia") =>
    track(via === "ia" ? "CATEGORY_AUTO_IA" : "CATEGORY_SELECTED", { nombre }),

  categoriaCambiada: (anterior: string, nueva: string) =>
    track("CATEGORY_CHANGED", { anterior, nueva }),

  // ── OCR ──

  ocrIniciado: () =>   track("OCR_STARTED"),
  ocrExitoso:  (monto?: number, categoria_sugerida?: string, duracion_ms?: number) =>
    track("OCR_SUCCESS", { monto, categoria_sugerida, modelo: "Llama 4 Scout" }, undefined, duracion_ms),
  ocrError:    (mensaje: string, duracion_ms?: number) => track("OCR_ERROR",     { mensaje, modelo: "Llama 4 Scout" }, undefined, duracion_ms),
  ocrConfirmado: (monto?: number, categoria?: string) =>
    track("OCR_CONFIRMED", { monto, categoria }),
  ocrCancelado: () => track("OCR_CANCELLED"),

  // ── Chat NLP ──

  chatAbierto: () => track("CHAT_OPENED"),

  chatMensaje: (texto: string, duracion_ms?: number) =>
    track("CHAT_MESSAGE_SENT", { texto: texto.slice(0, 120) }, undefined, duracion_ms),

  chatIntentMatch: (modelo: string, duracion_ms: number, tokens_input: number, tokens_output: number) => {
    track("CHAT_INTENT_MATCHED", { modelo: "Llama 3.3 70B" }, undefined, duracion_ms);
    trackIA({ proceso: "chat", modelo: "Llama 3.3 70B", duracion_ms, tokens_input, tokens_output, exito: true });
  },

  chatIntentDesconocido: (texto: string, duracion_ms: number) => {
    track("CHAT_INTENT_UNKNOWN", { texto: texto.slice(0, 120), modelo: "Llama 3.3 70B" }, undefined, duracion_ms);
    trackIA({ proceso: "chat", modelo: "Llama 3.3 70B", duracion_ms, exito: false, error: "error_servidor" });
  },

  // ── Reportes ──

  mesCambiado:   (mes_nuevo: string, direccion: "anterior" | "siguiente") =>
    track("MONTH_CHANGED", { mes_nuevo, direccion }),
  filtroAplicado: (tipo: string) => track("FILTER_APPLIED", { tipo }),

  // ── Perfil ──

  nombreActualizado: (nuevoNombre: string) => track("PROFILE_NAME_UPDATED", { nuevoNombre }),

  exportPDF: (mes: string, movimientos: number, duracion_ms?: number) =>
    track("EXPORT_PDF", { mes, movimientos }, undefined, duracion_ms),
  exportExcel: (mes: string, movimientos: number, duracion_ms?: number) =>
    track("EXPORT_EXCEL", { mes, movimientos }, undefined, duracion_ms),

  // ── OCR Métrica IA ──

  metricaOCR: (opts: {
    duracion_ms: number;
    exito: boolean;
    tokens_input?: number;
    tokens_output?: number;
    modelo?: string;
    error?: string;
  }) =>
    trackIA({
      proceso: "ocr",
      modelo: opts.modelo ?? "gemini-vision",
      duracion_ms: opts.duracion_ms,
      tokens_input: opts.tokens_input,
      tokens_output: opts.tokens_output,
      exito: opts.exito,
      error: opts.error,
    }),
};
