import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState, useRef } from "react";
import {
  ActivityIndicator, Alert, ScrollView, StyleSheet, Switch, Text,
  TouchableOpacity, View, Modal, TextInput
} from "react-native";
import { supabase } from "../../lib/supabase";
import { Analytics } from "../../lib/analytics";
import { useScreenTracking } from "../../hooks/useScreenTracking";
import { LinearGradient } from "expo-linear-gradient";
import {
  actualizarMeta,
  crearMeta,
  eliminarMeta,
  listarMetas,
  progresoMeta,
  type MetaAhorro,
} from "../../lib/metas";

export default function Perfil() {
  const router = useRouter();
  useScreenTracking("perfil");
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [cerrando, setCerrando] = useState(false);
  const [stats, setStats] = useState({ movimientos: 0, ingresos: 0, gastos: 0, balance: 0 });
  const [miembro, setMiembro] = useState("");
  const [diasActivo, setDiasActivo] = useState(0);

  const scrollViewRef = useRef<ScrollView>(null);
  const [editModal, setEditModal] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [guardando, setGuardando] = useState(false);

  const [preferencias, setPreferencias] = useState({
    moneda: "PEN",
    meta_ahorro_pct: 20,
    notificaciones: true,
  });
  const [prefsModal, setPrefsModal] = useState(false);
  const [guardandoPrefs, setGuardandoPrefs] = useState(false);
  const [monedaPref, setMonedaPref] = useState("PEN");
  const [metaPctPref, setMetaPctPref] = useState(20);
  const [notifPref, setNotifPref] = useState(true);

  const [metas, setMetas] = useState<MetaAhorro[]>([]);
  const [metaModal, setMetaModal] = useState(false);
  const [metaEditando, setMetaEditando] = useState<MetaAhorro | null>(null);
  const [metaNombre, setMetaNombre] = useState("");
  const [metaObjetivo, setMetaObjetivo] = useState("");
  const [metaActual, setMetaActual] = useState("");
  const [metaFecha, setMetaFecha] = useState("");
  const [guardandoMeta, setGuardandoMeta] = useState(false);
  const [eliminandoMetaId, setEliminandoMetaId] = useState<string | null>(null);

  async function cargarPerfil() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    setEmail(user.email || "");

    const fechaCreacion = new Date(user.created_at);
    const meses = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
    setMiembro(`Miembro desde ${meses[fechaCreacion.getMonth()]} ${fechaCreacion.getFullYear()}`);
    
    const diasDiff = Math.floor((Date.now() - fechaCreacion.getTime()) / 86400000);
    setDiasActivo(diasDiff);

    const { data } = await supabase.from("perfil").select("*").eq("id", user.id).single();
    if (data?.nombre) {
      setNombre(data.nombre);
      setNuevoNombre(data.nombre);
    } else {
      setNombre("Usuario");
      setNuevoNombre("Usuario");
    }

    const prefsGuardadas = data?.preferencias && typeof data.preferencias === "object"
      ? data.preferencias
      : {};
    const prefs = {
      moneda: prefsGuardadas.moneda || data?.moneda || "PEN",
      meta_ahorro_pct: Number(prefsGuardadas.meta_ahorro_pct) || 20,
      notificaciones: prefsGuardadas.notificaciones !== false,
    };
    setPreferencias(prefs);
    setMonedaPref(prefs.moneda);
    setMetaPctPref(prefs.meta_ahorro_pct);
    setNotifPref(prefs.notificaciones);

    setMetas(await listarMetas());

    const { data: movs } = await supabase.from("movimiento").select("tipo, monto").eq("usuario_id", user.id);
    if (movs) {
      const ing = movs.filter(m => String(m.tipo).toLowerCase() === "ingreso").reduce((s, m) => s + Math.abs(Number(m.monto)), 0);
      const gas = movs.filter(m => String(m.tipo).toLowerCase() === "gasto").reduce((s, m) => s + Math.abs(Number(m.monto)), 0);
      setStats({ movimientos: movs.length, ingresos: ing, gastos: gas, balance: ing - gas });
    }
    setLoading(false);
  }

  useFocusEffect(
    useCallback(() => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });
      cargarPerfil();
    }, [])
  );

  async function guardarNombre() {
    if (!nuevoNombre.trim()) return;
    setGuardando(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("perfil").update({ nombre: nuevoNombre.trim() }).eq("id", user.id);
    if (error) Alert.alert("Error", error.message);
    else {
      setNombre(nuevoNombre.trim());
      setEditModal(false);
      Analytics.nombreActualizado(nuevoNombre.trim());
      Alert.alert("¡Éxito!", "Nombre actualizado correctamente");
    }
    setGuardando(false);
  }

  function abrirPreferencias() {
    setMonedaPref(preferencias.moneda);
    setMetaPctPref(preferencias.meta_ahorro_pct);
    setNotifPref(preferencias.notificaciones);
    setPrefsModal(true);
  }

  async function guardarPreferencias() {
    setGuardandoPrefs(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sesión expirada");

      const nuevas = {
        moneda: monedaPref,
        meta_ahorro_pct: metaPctPref,
        notificaciones: notifPref,
      };

      const { error } = await supabase
        .from("perfil")
        .update({ preferencias: nuevas, moneda: monedaPref })
        .eq("id", user.id);

      if (error) throw new Error(error.message);

      setPreferencias(nuevas);
      setPrefsModal(false);
      Alert.alert("Preferencias guardadas", "Tus preferencias se actualizaron correctamente.");
    } catch (e: any) {
      Alert.alert("Error", e.message || "No se pudieron guardar las preferencias");
    } finally {
      setGuardandoPrefs(false);
    }
  }

  function abrirNuevaMeta() {
    setMetaEditando(null);
    setMetaNombre("");
    setMetaObjetivo("");
    setMetaActual("");
    setMetaFecha("");
    setMetaModal(true);
  }

  function abrirEditarMeta(meta: MetaAhorro) {
    setMetaEditando(meta);
    setMetaNombre(meta.nombre);
    setMetaObjetivo(String(meta.monto_objetivo));
    setMetaActual(String(meta.monto_actual ?? 0));
    setMetaFecha(meta.fecha_objetivo || "");
    setMetaModal(true);
  }

  async function guardarMeta() {
    const objetivo = Number(String(metaObjetivo).replace(",", "."));
    const actual = Number(String(metaActual || "0").replace(",", "."));

    if (!metaNombre.trim()) {
      Alert.alert("Falta el nombre", "Escribe un nombre para tu meta de ahorro.");
      return;
    }
    if (!Number.isFinite(objetivo) || objetivo <= 0) {
      Alert.alert("Monto inválido", "El monto objetivo debe ser mayor que cero.");
      return;
    }
    if (!Number.isFinite(actual) || actual < 0) {
      Alert.alert("Monto inválido", "El monto ahorrado no puede ser negativo.");
      return;
    }
    if (metaFecha && !/^\d{4}-\d{2}-\d{2}$/.test(metaFecha.trim())) {
      Alert.alert("Fecha inválida", "Usa el formato YYYY-MM-DD para la fecha objetivo.");
      return;
    }

    const input = {
      nombre: metaNombre.trim(),
      monto_objetivo: objetivo,
      monto_actual: actual,
      fecha_objetivo: metaFecha.trim() || null,
    };

    setGuardandoMeta(true);
    try {
      if (metaEditando) {
        const actualizada = await actualizarMeta(metaEditando.id, input);
        setMetas(prev => prev.map(m => m.id === actualizada.id ? actualizada : m));
      } else {
        const creada = await crearMeta(input);
        setMetas(prev => [creada, ...prev]);
      }
      setMetaModal(false);
      Alert.alert("¡Listo!", metaEditando ? "Meta actualizada correctamente." : "Meta creada correctamente.");
    } catch (e: any) {
      Alert.alert("Error", e.message || "No se pudo guardar la meta");
    } finally {
      setGuardandoMeta(false);
    }
  }

  function confirmarEliminarMeta(meta: MetaAhorro) {
    Alert.alert(
      "Eliminar meta",
      `¿Seguro que quieres eliminar "${meta.nombre}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            setEliminandoMetaId(meta.id);
            try {
              await eliminarMeta(meta.id);
              setMetas(prev => prev.filter(m => m.id !== meta.id));
            } catch (e: any) {
              Alert.alert("Error", e.message || "No se pudo eliminar la meta");
            } finally {
              setEliminandoMetaId(null);
            }
          },
        },
      ]
    );
  }

  async function cerrarSesion() {
    Alert.alert("Cerrar sesión", "¿Estás seguro?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Salir", style: "destructive", onPress: async () => {
        setCerrando(true);
        Analytics.logout();
        await supabase.auth.signOut();
        router.replace("/(auth)/login");
      }}
    ]);
  }

  const iniciales = nombre
    ? nombre.split(" ").slice(0, 2).map(p => p[0]).join("").toUpperCase()
    : "U";

  const monedaSimbolo = preferencias.moneda === "USD" ? "$" : "S/";
  const fmt = (n: number) => `${monedaSimbolo} ${n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const metaAhorroPct = preferencias.meta_ahorro_pct || 20;
  const ahorroPct = stats.ingresos > 0 ? ((stats.balance / stats.ingresos) * 100) : 0;
  const nivelFinanciero = ahorroPct >= metaAhorroPct ? "Saludable" : ahorroPct >= metaAhorroPct / 2 ? "Estable" : ahorroPct >= 0 ? "Regular" : "En riesgo";
  const nivelColor = ahorroPct >= metaAhorroPct ? "#22c55e" : ahorroPct >= metaAhorroPct / 2 ? "#f59e0b" : ahorroPct >= 0 ? "#0ea5e9" : "#ef4444";
  const nivelIcon = ahorroPct >= metaAhorroPct ? "checkmark-circle" : ahorroPct >= metaAhorroPct / 2 ? "alert-circle" : ahorroPct >= 0 ? "information-circle" : "warning";

  if (loading) return <View style={s.center}><ActivityIndicator color="#6366f1" size="large" /></View>;

  return (
    <ScrollView ref={scrollViewRef} style={s.container} showsVerticalScrollIndicator={false}>
      {/* Header con gradiente y avatar */}
      <LinearGradient
        colors={["#4338ca", "#6366f1", "#8b5cf6", "#a78bfa"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.headerGradient}
      >
        <View style={s.headerContent}>
          <View style={s.avatarSection}>
            <View style={s.avatarGlow}>
              <View style={s.avatar}>
                <Text style={s.avatarTxt}>{iniciales}</Text>
              </View>
            </View>
            <View style={s.verifiedBadge}>
              <Ionicons name="checkmark" size={12} color="#fff" />
            </View>
          </View>

          <Text style={s.nombre}>{nombre || "Usuario"}</Text>
          <Text style={s.emailTxt}>{email}</Text>
          
          <View style={s.badgeRow}>
            <View style={s.badge}>
              <Ionicons name="star" size={10} color="#fbbf24" />
              <Text style={s.badgeTxt}>Premium</Text>
            </View>
            <View style={s.badge}>
              <Ionicons name="flame" size={10} color="#f97316" />
              <Text style={s.badgeTxt}>{diasActivo} días</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Nivel Financiero */}
      <View style={[s.nivelCard, { borderLeftColor: nivelColor }]}>
        <View style={[s.nivelIconWrap, { backgroundColor: nivelColor + "20" }]}>
          <Ionicons name={nivelIcon as any} size={22} color={nivelColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.nivelTitle}>Nivel Financiero</Text>
          <Text style={[s.nivelValue, { color: nivelColor }]}>{nivelFinanciero}</Text>
        </View>
        <Text style={[s.nivelPct, { color: nivelColor }]}>{ahorroPct.toFixed(0)}%</Text>
      </View>

      {/* Stats financieras con colores */}
      <View style={s.statsGrid}>
        <LinearGradient colors={["#22c55e", "#16a34a"]} style={s.statCardColor}>
          <Ionicons name="trending-up" size={20} color="rgba(255,255,255,0.8)" />
          <Text style={s.statValWhite}>{fmt(stats.ingresos)}</Text>
          <Text style={s.statLabWhite}>Ingresos</Text>
        </LinearGradient>
        <LinearGradient colors={["#ef4444", "#dc2626"]} style={s.statCardColor}>
          <Ionicons name="trending-down" size={20} color="rgba(255,255,255,0.8)" />
          <Text style={s.statValWhite}>{fmt(stats.gastos)}</Text>
          <Text style={s.statLabWhite}>Gastos</Text>
        </LinearGradient>
      </View>

      <View style={s.statsGrid}>
        <View style={s.statCardLight}>
          <View style={[s.statDot, { backgroundColor: "#6366f1" }]} />
          <Text style={s.statValDark}>{stats.movimientos}</Text>
          <Text style={s.statLabDark}>Movimientos</Text>
        </View>
        <View style={[s.statCardLight, { borderColor: stats.balance >= 0 ? "#22c55e40" : "#ef444440" }]}>
          <View style={[s.statDot, { backgroundColor: stats.balance >= 0 ? "#22c55e" : "#ef4444" }]} />
          <Text style={[s.statValDark, { color: stats.balance >= 0 ? "#16a34a" : "#dc2626" }]}>
            {stats.balance < 0 ? "-" : "+"}{fmt(Math.abs(stats.balance))}
          </Text>
          <Text style={s.statLabDark}>Balance</Text>
        </View>
      </View>

      {/* Metas de Ahorro */}
      <View style={s.section}>
        <View style={s.metasHeader}>
          <Text style={s.sectionTitle}>METAS DE AHORRO</Text>
          <TouchableOpacity style={s.nuevaMetaBtn} onPress={abrirNuevaMeta}>
            <Ionicons name="add" size={15} color="#6366f1" />
            <Text style={s.nuevaMetaTxt}>Nueva meta</Text>
          </TouchableOpacity>
        </View>

        {metas.length === 0 ? (
          <View style={s.metaEmpty}>
            <Text style={s.metaEmptyIcon}>🎯</Text>
            <Text style={s.metaEmptyTitle}>Aún no tienes metas</Text>
            <Text style={s.metaEmptySub}>Crea una meta con monto y fecha para seguir tu progreso.</Text>
            <TouchableOpacity style={s.metaEmptyBtn} onPress={abrirNuevaMeta}>
              <Text style={s.metaEmptyBtnTxt}>Crear mi primera meta</Text>
            </TouchableOpacity>
          </View>
        ) : metas.map(meta => {
          const pct = progresoMeta(meta);
          return (
            <View key={meta.id} style={s.metaCard}>
              <View style={s.metaHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={s.metaLabel}>{meta.nombre}</Text>
                  <Text style={s.metaFecha}>
                    {meta.fecha_objetivo ? `Fecha objetivo: ${meta.fecha_objetivo}` : "Sin fecha límite"}
                  </Text>
                </View>
                <View style={s.metaActions}>
                  <TouchableOpacity style={s.metaActionBtn} onPress={() => abrirEditarMeta(meta)}>
                    <Ionicons name="pencil" size={15} color="#6366f1" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={s.metaActionBtn}
                    onPress={() => confirmarEliminarMeta(meta)}
                    disabled={eliminandoMetaId === meta.id}
                  >
                    {eliminandoMetaId === meta.id
                      ? <ActivityIndicator size="small" color="#ef4444" />
                      : <Ionicons name="trash" size={15} color="#ef4444" />}
                  </TouchableOpacity>
                </View>
              </View>
              <View style={s.metaTrack}>
                <LinearGradient
                  colors={pct >= 100 ? ["#22c55e", "#16a34a"] : pct >= 50 ? ["#6366f1", "#8b5cf6"] : ["#f59e0b", "#d97706"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[s.metaFill, { width: `${pct}%` }]}
                />
              </View>
              <View style={s.metaFooter}>
                <Text style={s.metaHint}>
                  {fmt(Number(meta.monto_actual))} de {fmt(Number(meta.monto_objetivo))}
                </Text>
                <Text style={[s.metaPct, { color: pct >= 100 ? "#22c55e" : "#f59e0b" }]}>
                  {pct.toFixed(0)}%
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* Info de cuenta con iconos coloridos */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>CUENTA</Text>
        <View style={s.card}>
          <TouchableOpacity style={s.menuItem} onPress={() => setEditModal(true)}>
            <View style={[s.menuIcon, { backgroundColor: "#ede9fe" }]}>
              <Ionicons name="person" size={18} color="#7c3aed" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.menuLabel}>Nombre</Text>
              <Text style={s.menuSub}>{nombre || "Sin nombre"}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
          </TouchableOpacity>
          <View style={s.divider} />
          <TouchableOpacity style={s.menuItem} onPress={abrirPreferencias}>
            <View style={[s.menuIcon, { backgroundColor: "#fef3c7" }]}>
              <Ionicons name="options" size={18} color="#d97706" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.menuLabel}>Preferencias</Text>
              <Text style={s.menuSub}>
                {preferencias.moneda === "USD" ? "Dólares (USD)" : "Soles (PEN)"} · Meta {preferencias.meta_ahorro_pct}% · {preferencias.notificaciones ? "Notificaciones activas" : "Sin notificaciones"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
          </TouchableOpacity>
          <View style={s.divider} />
          <View style={s.menuItem}>
            <View style={[s.menuIcon, { backgroundColor: "#dbeafe" }]}>
              <Ionicons name="mail" size={18} color="#3b82f6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.menuLabel}>Correo electrónico</Text>
              <Text style={s.menuSub}>{email}</Text>
            </View>
          </View>
          <View style={s.divider} />
          <View style={s.menuItem}>
            <View style={[s.menuIcon, { backgroundColor: "#fce7f3" }]}>
              <Ionicons name="calendar" size={18} color="#ec4899" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.menuLabel}>Miembro desde</Text>
              <Text style={s.menuSub}>{miembro}</Text>
            </View>
          </View>
          <View style={s.divider} />
          <View style={s.menuItem}>
            <View style={[s.menuIcon, { backgroundColor: "#d1fae5" }]}>
              <Ionicons name="finger-print" size={18} color="#10b981" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.menuLabel}>Movimientos registrados</Text>
              <Text style={s.menuSub}>{stats.movimientos} registros</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Tecnología IA con diseño mejorado */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>TECNOLOGÍA IA</Text>
        <View style={s.card}>
          <View style={s.menuItem}>
            <View style={[s.menuIcon, { backgroundColor: "#fef3c7" }]}>
              <Ionicons name="scan" size={18} color="#f59e0b" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.menuLabel}>OCR de comprobantes</Text>
              <Text style={s.menuSub}>Qwen 3.8 27B · Groq Cloud</Text>
            </View>
            <View style={s.iaBadge}>
              <Text style={s.iaBadgeTxt}>Activo</Text>
            </View>
          </View>
          <View style={s.divider} />
          <View style={s.menuItem}>
            <View style={[s.menuIcon, { backgroundColor: "#ede9fe" }]}>
              <Ionicons name="chatbubble-ellipses" size={18} color="#8b5cf6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.menuLabel}>Asesor financiero IA</Text>
              <Text style={s.menuSub}>GPT-OSS 120B · Groq Cloud</Text>
            </View>
            <View style={s.iaBadge}>
              <Text style={s.iaBadgeTxt}>Activo</Text>
            </View>
          </View>
          <View style={s.divider} />
          <View style={s.menuItem}>
            <View style={[s.menuIcon, { backgroundColor: "#dbeafe" }]}>
              <Ionicons name="sparkles" size={18} color="#3b82f6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.menuLabel}>Análisis inteligente</Text>
              <Text style={s.menuSub}>Recomendaciones personalizadas</Text>
            </View>
            <View style={[s.iaBadge, { backgroundColor: "#dbeafe" }]}>
              <Text style={[s.iaBadgeTxt, { color: "#3b82f6" }]}>IA</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Logros */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>LOGROS</Text>
        <View style={s.logrosRow}>
          <View style={[s.logroCard, stats.movimientos >= 1 && s.logroActive]}>
            <Text style={s.logroIcon}>📝</Text>
            <Text style={[s.logroTxt, stats.movimientos >= 1 && s.logroTxtActive]}>Primer registro</Text>
          </View>
          <View style={[s.logroCard, stats.movimientos >= 10 && s.logroActive]}>
            <Text style={s.logroIcon}>🔟</Text>
            <Text style={[s.logroTxt, stats.movimientos >= 10 && s.logroTxtActive]}>10 movimientos</Text>
          </View>
          <View style={[s.logroCard, stats.movimientos >= 50 && s.logroActive]}>
            <Text style={s.logroIcon}>🏅</Text>
            <Text style={[s.logroTxt, stats.movimientos >= 50 && s.logroTxtActive]}>50 registros</Text>
          </View>
        </View>
        <View style={s.logrosRow}>
          <View style={[s.logroCard, stats.balance >= 0 && s.logroActive]}>
            <Text style={s.logroIcon}>💰</Text>
            <Text style={[s.logroTxt, stats.balance >= 0 && s.logroTxtActive]}>Balance +</Text>
          </View>
          <View style={[s.logroCard, ahorroPct >= metaAhorroPct && s.logroActive]}>
            <Text style={s.logroIcon}>🎯</Text>
            <Text style={[s.logroTxt, ahorroPct >= metaAhorroPct && s.logroTxtActive]}>Meta {metaAhorroPct}%</Text>
          </View>
          <View style={[s.logroCard, diasActivo >= 30 && s.logroActive]}>
            <Text style={s.logroIcon}>🔥</Text>
            <Text style={[s.logroTxt, diasActivo >= 30 && s.logroTxtActive]}>30 días</Text>
          </View>
        </View>
      </View>

      {/* Cerrar sesión */}
      <TouchableOpacity style={s.logoutBtn} onPress={cerrarSesion} disabled={cerrando}>
        <Ionicons name="log-out-outline" size={18} color="#ef4444" />
        <Text style={s.logoutTxt}>{cerrando ? "Saliendo..." : "Cerrar Sesión"}</Text>
      </TouchableOpacity>

      <Text style={s.version}>FinanzasIA v1.0 · Potenciado por IA</Text>

      {/* Modal Preferencias */}
      <Modal visible={prefsModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Preferencias</Text>
              <TouchableOpacity onPress={() => setPrefsModal(false)}>
                <Ionicons name="close-circle" size={28} color="#d1d5db" />
              </TouchableOpacity>
            </View>
            <Text style={s.modalDesc}>Personaliza cómo FinanzasIA muestra tu información.</Text>

            <Text style={s.prefLabel}>Moneda</Text>
            <View style={s.prefRow}>
              {[
                { valor: "PEN", etiqueta: "Soles (S/)" },
                { valor: "USD", etiqueta: "Dólares ($)" },
              ].map(opcion => (
                <TouchableOpacity
                  key={opcion.valor}
                  style={[s.prefOption, monedaPref === opcion.valor && s.prefOptionActive]}
                  onPress={() => setMonedaPref(opcion.valor)}
                >
                  <Text style={[s.prefOptionTxt, monedaPref === opcion.valor && s.prefOptionTxtActive]}>
                    {opcion.etiqueta}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.prefLabel}>Meta de ahorro mensual</Text>
            <View style={s.prefRow}>
              {[10, 20, 30].map(pct => (
                <TouchableOpacity
                  key={pct}
                  style={[s.prefOption, metaPctPref === pct && s.prefOptionActive]}
                  onPress={() => setMetaPctPref(pct)}
                >
                  <Text style={[s.prefOptionTxt, metaPctPref === pct && s.prefOptionTxtActive]}>
                    {pct}%
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={s.prefSwitchRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.prefLabel}>Notificaciones</Text>
                <Text style={s.prefHint}>Recordatorios de metas y gastos</Text>
              </View>
              <Switch
                value={notifPref}
                onValueChange={setNotifPref}
                trackColor={{ false: "#e2e8f0", true: "#c7d2fe" }}
                thumbColor={notifPref ? "#6366f1" : "#f8fafc"}
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
              <TouchableOpacity style={[s.modalBtn, { backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' }]} onPress={() => setPrefsModal(false)}>
                <Text style={{ color: '#64748b', fontWeight: '700' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.modalBtn, { backgroundColor: '#6366f1' }]} onPress={guardarPreferencias} disabled={guardandoPrefs}>
                {guardandoPrefs
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={s.modalBtnTxt}>Guardar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Meta de Ahorro */}
      <Modal visible={metaModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={[s.modalCard, { maxHeight: "92%" }]}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>{metaEditando ? "Editar meta" : "Nueva meta"}</Text>
                <TouchableOpacity onPress={() => setMetaModal(false)}>
                  <Ionicons name="close-circle" size={28} color="#d1d5db" />
                </TouchableOpacity>
              </View>
              <Text style={s.modalDesc}>Define cuánto quieres ahorrar y para cuándo.</Text>

              <Text style={s.prefLabel}>Nombre de la meta</Text>
              <TextInput
                style={s.input}
                value={metaNombre}
                onChangeText={setMetaNombre}
                placeholder="Ej: Fondo de emergencia"
                placeholderTextColor="#94a3b8"
                maxLength={50}
              />

              <Text style={s.prefLabel}>Monto objetivo</Text>
              <TextInput
                style={s.input}
                value={metaObjetivo}
                onChangeText={setMetaObjetivo}
                placeholder="0.00"
                placeholderTextColor="#94a3b8"
                keyboardType="decimal-pad"
              />

              <Text style={s.prefLabel}>Ahorrado hasta ahora</Text>
              <TextInput
                style={s.input}
                value={metaActual}
                onChangeText={setMetaActual}
                placeholder="0.00"
                placeholderTextColor="#94a3b8"
                keyboardType="decimal-pad"
              />

              <Text style={s.prefLabel}>Fecha objetivo (YYYY-MM-DD)</Text>
              <TextInput
                style={s.input}
                value={metaFecha}
                onChangeText={setMetaFecha}
                placeholder="2026-12-31"
                placeholderTextColor="#94a3b8"
                maxLength={10}
              />

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                <TouchableOpacity style={[s.modalBtn, { backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' }]} onPress={() => setMetaModal(false)}>
                  <Text style={{ color: '#64748b', fontWeight: '700' }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.modalBtn, { backgroundColor: '#6366f1' }]} onPress={guardarMeta} disabled={guardandoMeta}>
                  {guardandoMeta
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={s.modalBtnTxt}>{metaEditando ? "Actualizar" : "Crear meta"}</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal Editar Nombre */}
      <Modal visible={editModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Editar nombre</Text>
              <TouchableOpacity onPress={() => setEditModal(false)}>
                <Ionicons name="close-circle" size={28} color="#d1d5db" />
              </TouchableOpacity>
            </View>
            <Text style={s.modalDesc}>Este nombre se mostrará en tu perfil</Text>
            <TextInput
              style={s.input}
              value={nuevoNombre}
              onChangeText={setNuevoNombre}
              placeholder="Tu nombre"
              autoFocus
              maxLength={40}
              placeholderTextColor="#94a3b8"
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={[s.modalBtn, { backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' }]} onPress={() => setEditModal(false)}>
                <Text style={{ color: '#64748b', fontWeight: '700' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.modalBtn, { backgroundColor: '#6366f1' }]} onPress={guardarNombre} disabled={guardando}>
                {guardando
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={s.modalBtnTxt}>Guardar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  headerGradient: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerContent: { alignItems: "center" },
  avatarSection: { position: "relative", marginBottom: 16 },
  avatarGlow: {
    width: 90,
    height: 90,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarTxt: { fontSize: 28, fontWeight: "900", color: "#fff" },
  verifiedBadge: {
    position: "absolute",
    bottom: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#22c55e",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#4338ca",
  },
  nombre: { fontSize: 22, fontWeight: "900", color: "#fff", letterSpacing: -0.5 },
  emailTxt: { fontSize: 13, color: "rgba(255, 255, 255, 0.7)", marginTop: 4 },
  badgeRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  badgeTxt: { fontSize: 11, color: "rgba(255, 255, 255, 0.8)", fontWeight: "700" },
  nivelCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginTop: -16,
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    gap: 12,
  },
  nivelIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  nivelTitle: { fontSize: 11, fontWeight: "600", color: "#94a3b8", marginBottom: 2 },
  nivelValue: { fontSize: 16, fontWeight: "800" },
  nivelPct: { fontSize: 20, fontWeight: "900" },
  statsGrid: { flexDirection: "row", gap: 10, marginHorizontal: 20, marginTop: 16 },
  statCardColor: {
    flex: 1,
    borderRadius: 18,
    padding: 16,
    gap: 6,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  statValWhite: { fontSize: 18, fontWeight: "900", color: "#fff" },
  statLabWhite: { fontSize: 11, color: "rgba(255,255,255,0.8)", fontWeight: "600" },
  statCardLight: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  statDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 8 },
  statValDark: { fontSize: 16, fontWeight: "800", color: "#1e293b" },
  statLabDark: { fontSize: 11, color: "#94a3b8", fontWeight: "600", marginTop: 2 },
  section: { paddingHorizontal: 20, marginTop: 28 },
  sectionTitle: { fontSize: 11, fontWeight: "800", color: "#94a3b8", marginBottom: 12, letterSpacing: 1.5 },
  metasHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  nuevaMetaBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#eef2ff", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  nuevaMetaTxt: { fontSize: 11, fontWeight: "800", color: "#6366f1" },
  metaCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  metaHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10, gap: 8 },
  metaLabel: { fontSize: 13, fontWeight: "700", color: "#1e293b" },
  metaFecha: { fontSize: 11, color: "#94a3b8", marginTop: 2, fontWeight: "600" },
  metaPct: { fontSize: 14, fontWeight: "900" },
  metaTrack: { height: 10, backgroundColor: "#f1f5f9", borderRadius: 5, overflow: "hidden" },
  metaFill: { height: "100%", borderRadius: 5 },
  metaHint: { fontSize: 11, color: "#94a3b8", marginTop: 8, fontWeight: "600" },
  metaFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 2 },
  metaActions: { flexDirection: "row", gap: 6 },
  metaActionBtn: { padding: 6, borderRadius: 8, backgroundColor: "#f8fafc" },
  metaEmpty: { backgroundColor: "#fff", borderRadius: 16, padding: 20, alignItems: "center", borderWidth: 1, borderColor: "#e2e8f0" },
  metaEmptyIcon: { fontSize: 32, marginBottom: 8 },
  metaEmptyTitle: { fontSize: 14, fontWeight: "800", color: "#1e293b" },
  metaEmptySub: { fontSize: 12, color: "#94a3b8", textAlign: "center", marginTop: 4, marginBottom: 12 },
  metaEmptyBtn: { backgroundColor: "#6366f1", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  metaEmptyBtnTxt: { color: "#fff", fontWeight: "700", fontSize: 12 },
  prefLabel: { fontSize: 12, fontWeight: "800", color: "#475569", marginBottom: 8, marginTop: 4 },
  prefRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  prefOption: { flex: 1, paddingVertical: 12, alignItems: "center", borderRadius: 12, backgroundColor: "#f8fafc", borderWidth: 1, borderColor: "#e2e8f0" },
  prefOptionActive: { backgroundColor: "#eef2ff", borderColor: "#6366f1" },
  prefOptionTxt: { fontSize: 12, fontWeight: "700", color: "#64748b" },
  prefOptionTxtActive: { color: "#6366f1" },
  prefSwitchRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#f8fafc", borderRadius: 14, padding: 14, marginBottom: 20 },
  prefHint: { fontSize: 11, color: "#94a3b8", marginTop: 2 },
  card: {
    backgroundColor: "#fff", borderRadius: 18, overflow: "hidden",
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 10, elevation: 2,
  },
  menuItem: { flexDirection: "row", alignItems: "center", padding: 16, gap: 14 },
  menuIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  menuLabel: { fontSize: 14, fontWeight: "700", color: "#1e293b" },
  menuSub: { fontSize: 12, color: "#94a3b8", marginTop: 2 },
  divider: { height: 1, backgroundColor: "#f8fafc", marginHorizontal: 16 },
  iaBadge: {
    backgroundColor: "#dcfce7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  iaBadgeTxt: { fontSize: 10, fontWeight: "800", color: "#16a34a" },
  logrosRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  logroCard: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    opacity: 0.5,
  },
  logroActive: {
    backgroundColor: "#eff6ff",
    borderColor: "#6366f1",
    opacity: 1,
  },
  logroIcon: { fontSize: 20, marginBottom: 4 },
  logroTxt: { fontSize: 9, fontWeight: "700", color: "#94a3b8", textAlign: "center" },
  logroTxtActive: { color: "#6366f1" },
  logoutBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    marginHorizontal: 20, marginTop: 28,
    backgroundColor: "#fef2f2", borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: "#fecaca",
  },
  logoutTxt: { fontSize: 14, fontWeight: "700", color: "#ef4444" },
  version: { fontSize: 11, color: "#cbd5e1", textAlign: "center", marginTop: 16, fontWeight: "600" },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 28, paddingBottom: 48,
  },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
  modalDesc: { fontSize: 13, color: '#94a3b8', marginBottom: 20 },
  input: {
    backgroundColor: '#f8fafc', borderRadius: 14, padding: 16,
    fontSize: 16, marginBottom: 20, color: '#1e293b',
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  modalBtn: { flex: 1, borderRadius: 14, padding: 16, alignItems: 'center' },
  modalBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
