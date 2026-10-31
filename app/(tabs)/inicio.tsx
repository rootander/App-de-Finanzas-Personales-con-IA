import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState, useRef, useMemo } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, StatusBar, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../../lib/supabase";
import { Analytics } from "../../lib/analytics";
import { useScreenTracking } from "../../hooks/useScreenTracking";
import Recomendaciones from "../../components/Recomendaciones";
import { listarMetas, progresoMeta, type MetaAhorro } from "../../lib/metas";

function normalizarTipo(tipo?: string | null) {
  return String(tipo || "").trim().toLowerCase();
}
function montoAbsoluto(monto: number | string) {
  return Math.abs(Number(monto) || 0);
}
function money(v: number) { return `S/ ${v.toLocaleString("es-PE", { minimumFractionDigits: 2 })}`; }

export default function Inicio() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const [nombre, setNombre] = useState("");
  const [todosMovs, setTodosMovs] = useState<any[]>([]);
  const [metas, setMetas] = useState<MetaAhorro[]>([]);
  const [categoriasMap, setCategoriasMap] = useState<Record<string, any>>({});
  const toLocalDateStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const [mesActualUI, setMesActualUI] = useState(() => toLocalDateStr(new Date()).slice(0, 7));

  const { totalIngresos, totalGastos, ahorroTotal, movimientos } = useMemo(() => {
    const delMes = todosMovs.filter(m => String(m.fecha || "").startsWith(mesActualUI));

    const ing = delMes.filter(m => normalizarTipo(m.tipo) === "ingreso")
      .reduce((s, m) => s + montoAbsoluto(m.monto), 0);
    const gas = delMes.filter(m => normalizarTipo(m.tipo) === "gasto")
      .reduce((s, m) => s + montoAbsoluto(m.monto), 0);
    const ahorro = todosMovs
      .filter(m => normalizarTipo(m.tipo) === "ingreso")
      .reduce((s, m) => s + montoAbsoluto(m.monto), 0)
      - todosMovs
        .filter(m => normalizarTipo(m.tipo) === "gasto")
        .reduce((s, m) => s + montoAbsoluto(m.monto), 0);

    return {
      totalIngresos: ing,
      totalGastos: gas,
      ahorroTotal: ahorro,
      movimientos: delMes.slice(0, 5).map(m => ({ ...m, categoria: categoriasMap[m.categoria_id] || null })),
    };
  }, [mesActualUI, todosMovs, categoriasMap]);

  useScreenTracking("inicio");

  const recomendaciones = useMemo(() => {
    const recs: { t: string; d: string; i: string; c: string }[] = [];
    const ahorro = totalIngresos - totalGastos;

    if (totalIngresos > 0) {
      const pctAhorro = ((ahorro / totalIngresos) * 100);
      if (pctAhorro < 20) {
        recs.push({
          t: "Meta de Ahorro 20%",
          d: `Ahorras ${pctAhorro.toFixed(1)}%. Objetivo: 20% (S/ ${(totalIngresos * 0.2).toFixed(2)}). Automatiza transferencias el día de pago.`,
          i: "wallet",
          c: "#f59e0b"
        });
      } else {
        recs.push({
          t: "Excelente Ahorro",
          d: `Ahorras ${pctAhorro.toFixed(1)}% (meta: 20%). Considera invertir el excedente en fondos de emergencia.`,
          i: "checkmark-circle",
          c: "#22c55e"
        });
      }
    }

    if (totalGastos > totalIngresos) {
      recs.push({
        t: "Déficit Financiero",
        d: `Gastas S/ ${(totalGastos - totalIngresos).toFixed(2)} más de lo que ingresas. Identifica los 3 gastos no esenciales más altos.`,
        i: "warning",
        c: "#ef4444"
      });
    }

    if (ahorroTotal > 0 && totalGastos > 0) {
      const mesesCobertura = (ahorroTotal / totalGastos).toFixed(1);
      if (ahorroTotal < totalGastos * 3) {
        recs.push({
          t: "Fondo de Emergencia",
          d: `Tu fondo cubre ${mesesCobertura} meses. Ideal: 3-6 meses. Faltan S/ ${(totalGastos * 3 - ahorroTotal).toFixed(2)} para la meta.`,
          i: "shield",
          c: "#14b8a6"
        });
      }
    }

    return recs;
  }, [totalIngresos, totalGastos, ahorroTotal]);

  const cargarDatos = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return;

      // Medir la carga real hasta que entra al primer módulo
      Analytics.appOpen(user.id);

      const { data: movs } = await supabase
        .from("movimiento")
        .select("id, categoria_id, tipo, monto, fecha, descripcion, created_at")
        .eq("usuario_id", user.id)
        .order("fecha", { ascending: false });

      const { data: perfil } = await supabase
        .from("perfil").select("nombre").eq("id", user.id).single();
      if (perfil?.nombre) setNombre(perfil.nombre);

      setMetas(await listarMetas());

      const todos = (movs || []);
      setTodosMovs(todos);

      // Cargar categorías usadas
      const catIds = [...new Set(todos.map(m => m.categoria_id).filter(Boolean))];
      let catMap: Record<string, any> = {};
      if (catIds.length > 0) {
        const { data: cats } = await supabase.from("categoria").select("id, nombre, icono").in("id", catIds);
        catMap = Object.fromEntries((cats || []).map(c => [c.id, c]));
      }
      setCategoriasMap(catMap);
      
      // Auto-seleccionar último mes con datos si el actual no tiene
      let mesActual = mesActualUI;
      let delMes = todos.filter(m => String(m.fecha || "").startsWith(mesActual));
      if (delMes.length === 0 && todos.length > 0) {
        const sorted = [...todos].sort((a, b) => b.fecha.localeCompare(a.fecha));
        if (sorted[0].fecha) {
          mesActual = sorted[0].fecha.slice(0, 7);
          setMesActualUI(mesActual);
        }
      }

    } catch (error) {
      console.log("Error al cargar datos en inicio:", error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });
      cargarDatos();
    }, [cargarDatos])
  );

  const cambiarMes = (delta: number) => {
    const [y, m] = mesActualUI.split("-");
    const date = new Date(Number(y), Number(m) - 1 + delta, 1);
    const nY = date.getFullYear();
    const nM = String(date.getMonth() + 1).padStart(2, "0");
    setMesActualUI(`${nY}-${nM}`);
  };

  const saldo = totalIngresos - totalGastos;
  const [year, month] = mesActualUI.split("-");
  const mesNombre = new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("es-PE", { month: "long", year: "numeric" });
  const inicial = nombre ? nombre[0].toUpperCase() : "U";

  // Calculate proper top padding for the header
  const headerTopPadding = Math.max(insets.top, Platform.OS === "android" ? 44 : 20);

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <ScrollView ref={scrollViewRef} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        
        {/* Cabecera Ultra-Limpia */}
        <View style={[s.headerBg, { paddingTop: headerTopPadding + 16 }]}>
          <View style={s.headerTop}>
            <View style={s.userInfo}>
              <Text style={s.saludoLabel}>Hola de nuevo,</Text>
              <Text style={s.saludoName} numberOfLines={1}>{nombre || "Usuario"}</Text>
            </View>
            <TouchableOpacity style={s.avatar} onPress={() => router.push("/(tabs)/perfil")}>
              <Text style={s.avatarTxt}>{inicial}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Balance Principal */}
        <View style={s.balanceCard}>
          <View style={s.rowBet}>
            <TouchableOpacity onPress={() => cambiarMes(-1)} style={{ padding: 4 }}>
              <Ionicons name="chevron-back" size={20} color="#94a3b8" />
            </TouchableOpacity>
            <Text style={s.balanceLabel}>RESUMEN DE {mesNombre.toUpperCase()}</Text>
            <TouchableOpacity onPress={() => cambiarMes(1)} style={{ padding: 4 }}>
              <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>
          <Text style={[s.balanceAmount, { color: saldo >= 0 ? "#1e293b" : "#ef4444" }]}>
            {saldo < 0 ? "-" : ""}{money(Math.abs(saldo))}
          </Text>
          
          <View style={s.rowStats}>
            <View style={s.statBox}>
              <View style={[s.statIcon, { backgroundColor: "#f0fdf4" }]}><Ionicons name="arrow-up" size={12} color="#22c55e" /></View>
              <View>
                <Text style={s.statLab}>Ingresos</Text>
                <Text style={[s.statVal, { color: "#22c55e" }]}>{money(totalIngresos)}</Text>
              </View>
            </View>
            <View style={s.statBox}>
              <View style={[s.statIcon, { backgroundColor: "#fef2f2" }]}><Ionicons name="arrow-down" size={12} color="#ef4444" /></View>
              <View>
                <Text style={s.statLab}>Gastos</Text>
                <Text style={[s.statVal, { color: "#ef4444" }]}>{money(totalGastos)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Tarjeta de Ahorro con Estilo */}
        <View style={s.section}>
          <TouchableOpacity 
            activeOpacity={0.9}
            style={[s.ahorroCard, { backgroundColor: ahorroTotal >= 0 ? "#1e293b" : "#f59e0b" }]}
            onPress={() => router.push("/(tabs)/reportes")}
          >
            <View style={s.ahorroIcon}>
              <Ionicons name="wallet" size={26} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.ahorroLab}>Ahorro histórico total</Text>
              <Text style={s.ahorroVal}>{ahorroTotal < 0 ? "-" : ""}{money(Math.abs(ahorroTotal))}</Text>
            </View>
            <View style={s.ahorroBadge}><Ionicons name="chevron-forward" size={18} color="#fff" /></View>
          </TouchableOpacity>
        </View>

        {/* Metas de ahorro */}
        {metas.length > 0 && (
          <View style={s.section}>
            <View style={s.secHeader}>
              <Text style={s.secTitle}>Metas de ahorro</Text>
              <TouchableOpacity onPress={() => router.push("/(tabs)/perfil")}>
                <Text style={s.secAction}>Gestionar</Text>
              </TouchableOpacity>
            </View>
            {metas.map(meta => {
              const pct = progresoMeta(meta);
              return (
                <TouchableOpacity
                  key={meta.id}
                  style={s.metaCardHome}
                  activeOpacity={0.85}
                  onPress={() => router.push("/(tabs)/perfil")}
                >
                  <View style={s.metaHomeHeader}>
                    <Text style={s.metaHomeName} numberOfLines={1}>{meta.nombre}</Text>
                    <Text style={[s.metaHomePct, { color: pct >= 100 ? "#22c55e" : "#f59e0b" }]}>
                      {pct.toFixed(0)}%
                    </Text>
                  </View>
                  <View style={s.metaHomeTrack}>
                    <View style={[s.metaHomeFill, { width: `${pct}%`, backgroundColor: pct >= 100 ? "#22c55e" : "#6366f1" }]} />
                  </View>
                  <Text style={s.metaHomeSub}>
                    {money(Number(meta.monto_actual))} de {money(Number(meta.monto_objetivo))}
                    {meta.fecha_objetivo ? ` · ${meta.fecha_objetivo}` : ""}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Actividad Reciente */}
        <View style={s.section}>
          <View style={s.secHeader}>
            <Text style={s.secTitle}>Actividad Reciente</Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/movimientos")}>
              <Text style={s.secAction}>Ver historial</Text>
            </TouchableOpacity>
          </View>

          {movimientos.length === 0 ? (
            <View style={s.empty}>
              <Ionicons name="receipt-outline" size={32} color="#cbd5e1" />
              <Text style={s.emptyTxt}>Sin movimientos recientes</Text>
            </View>
          ) : movimientos.map((mov) => (
            <View key={mov.id} style={s.movItem}>
              <View style={s.movIconWrap}><Text style={{ fontSize: 22 }}>{mov.categoria?.icono || "💰"}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={s.movDesc} numberOfLines={1}>{mov.descripcion || mov.categoria?.nombre || "Gasto"}</Text>
                <Text style={s.movSub}>{mov.categoria?.nombre} · {new Date(mov.fecha).toLocaleDateString("es-PE", { day: "2-digit", month: "short" })}</Text>
              </View>
              <Text style={[s.movAmt, { color: normalizarTipo(mov.tipo) === "ingreso" ? "#22c55e" : "#1e293b" }]}>
                {normalizarTipo(mov.tipo) === "ingreso" ? "+" : "-"}{money(montoAbsoluto(mov.monto))}
              </Text>
            </View>
          ))}
        </View>

        {/* Recomendaciones */}
        <View style={s.section}>
          <Recomendaciones recomendaciones={recomendaciones} />
        </View>

      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  headerBg: { backgroundColor: "#6366f1", paddingBottom: 110, borderBottomLeftRadius: 44, borderBottomRightRadius: 44 },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 28 },
  userInfo: { flex: 1 },
  saludoLabel: { fontSize: 13, color: "rgba(255,255,255,0.65)", fontWeight: "700", letterSpacing: 0.5 },
  saludoName: { fontSize: 28, fontWeight: "900", color: "#fff", marginTop: 4, letterSpacing: -0.5 },
  avatar: { width: 56, height: 56, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "rgba(255,255,255,0.25)" },
  avatarTxt: { fontSize: 22, fontWeight: "900", color: "#fff" },
  balanceCard: { backgroundColor: "#fff", borderRadius: 36, padding: 28, marginHorizontal: 24, marginTop: -80, shadowColor: "#6366f1", shadowOpacity: 0.12, shadowRadius: 25, elevation: 12 },
  rowBet: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  balanceLabel: { fontSize: 10, fontWeight: "800", color: "#94a3b8", letterSpacing: 1.2 },
  balanceAmount: { fontSize: 44, fontWeight: "900", letterSpacing: -1.5 },
  rowStats: { flexDirection: "row", marginTop: 28, gap: 14 },
  statBox: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#f8fafc", padding: 14, borderRadius: 20 },
  statIcon: { width: 26, height: 26, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  statLab: { fontSize: 10, color: "#94a3b8", fontWeight: "700", textTransform: "uppercase" },
  statVal: { fontSize: 13, fontWeight: "800", marginTop: 1 },
  section: { marginTop: 32, paddingHorizontal: 24 },
  ahorroCard: { borderRadius: 28, padding: 24, flexDirection: "row", alignItems: "center", gap: 18, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 15, elevation: 4 },
  ahorroIcon: { width: 52, height: 52, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" },
  ahorroLab: { fontSize: 12, color: "rgba(255,255,255,0.7)", fontWeight: "600" },
  ahorroVal: { fontSize: 24, fontWeight: "900", color: "#fff", marginTop: 2 },
  ahorroBadge: { width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" },
  secHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20, paddingHorizontal: 4 },
  secTitle: { fontSize: 20, fontWeight: "900", color: "#1e293b" },
  secAction: { fontSize: 14, color: "#6366f1", fontWeight: "800" },
  movItem: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 24, padding: 16, marginBottom: 12, gap: 14, borderWidth: 1, borderColor: "#f1f5f9" },
  movIconWrap: { width: 48, height: 48, borderRadius: 16, backgroundColor: "#f8fafc", alignItems: "center", justifyContent: "center" },
  movDesc: { fontSize: 16, fontWeight: "700", color: "#1e293b" },
  movSub: { fontSize: 12, color: "#94a3b8", marginTop: 3, fontWeight: "600" },
  movAmt: { fontSize: 16, fontWeight: "900" },
  empty: { alignItems: "center", padding: 40, opacity: 0.5 },
  emptyTxt: { fontSize: 14, color: "#94a3b8", fontWeight: "600", marginTop: 12 },
  metaCardHome: {
    backgroundColor: "#fff", borderRadius: 20, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: "#f1f5f9",
  },
  metaHomeHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 8 },
  metaHomeName: { flex: 1, fontSize: 14, fontWeight: "700", color: "#1e293b" },
  metaHomePct: { fontSize: 12, fontWeight: "900" },
  metaHomeTrack: { height: 8, backgroundColor: "#f1f5f9", borderRadius: 4, overflow: "hidden" },
  metaHomeFill: { height: "100%", borderRadius: 4 },
  metaHomeSub: { fontSize: 11, color: "#94a3b8", marginTop: 6, fontWeight: "600" },
});
