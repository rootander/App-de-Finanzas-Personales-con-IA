import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState, useRef } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { supabase } from "../../lib/supabase";
import { Analytics } from "../../lib/analytics";
import { useScreenTracking } from "../../hooks/useScreenTracking";

function normalizarTipo(tipo?: string | null) {
  return String(tipo || "").trim().toLowerCase();
}
function normalizarBusqueda(texto?: string | null) {
  return String(texto || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}
function montoAbsoluto(monto: number | string) {
  return Math.abs(Number(monto) || 0);
}
function money(v: number) { return `S/ ${v.toFixed(2)}`; }

const FILTROS = [
  { key: "todos", label: "Todos", icon: "list-outline" },
  { key: "ingreso", label: "Ingresos", icon: "arrow-up-circle-outline" },
  { key: "gasto", label: "Gastos", icon: "arrow-down-circle-outline" },
] as const;

export default function Movimientos() {
  const scrollViewRef = useRef<ScrollView>(null);
  const [movimientos, setMovimientos] = useState<any[]>([]);
  const [filtro, setFiltro] = useState<"todos" | "ingreso" | "gasto">("todos");
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(true);

  useScreenTracking("movimientos");

  const cargarMovimientos = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    let query = supabase
      .from("movimiento")
      .select("id, categoria_id, tipo, tipo_registro, monto, fecha, descripcion, medio_pago, created_at")
      .eq("usuario_id", user.id)
      .order("created_at", { ascending: false });

    if (filtro !== "todos") query = query.eq("tipo", filtro);

    const { data, error } = await query;
    if (error) { console.log("Error:", error.message); setLoading(false); return; }

    const lista = data || [];
    const catIds = [...new Set(lista.map(m => m.categoria_id).filter(Boolean))];
    let catMap: Record<string, any> = {};
    if (catIds.length > 0) {
      const { data: cats } = await supabase.from("categoria").select("id, nombre, icono").in("id", catIds);
      catMap = Object.fromEntries((cats || []).map(c => [c.id, c]));
    }

    setMovimientos(lista.map(m => ({ ...m, categoria: catMap[m.categoria_id] || null })));
    setLoading(false);
  }, [filtro]);

  useFocusEffect(
    useCallback(() => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });
      cargarMovimientos();
    }, [cargarMovimientos])
  );

  async function handleEliminar(id: string) {
    Alert.alert("Eliminar", "¿Seguro que quieres eliminar este movimiento?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar", style: "destructive",
        onPress: async () => {
          const mov = movimientos.find(m => m.id === id);
          const { error } = await supabase.from("movimiento").delete().eq("id", id);
          if (!error) {
            Analytics.movimientoEliminado(id, mov?.monto, mov?.tipo);
            cargarMovimientos();
          }
        }
      }
    ]);
  }

  const movimientosFiltrados = useMemo(() => {
    const q = normalizarBusqueda(busqueda);
    if (!q) return movimientos;
    return movimientos.filter(m => {
      const texto = [
        m.descripcion,
        m.categoria?.nombre,
        m.medio_pago,
        m.tipo,
      ].map(normalizarBusqueda).join(" ");
      return texto.includes(q);
    });
  }, [movimientos, busqueda]);

  const totalIngresos = movimientosFiltrados
    .filter(m => normalizarTipo(m.tipo) === "ingreso")
    .reduce((s, m) => s + montoAbsoluto(m.monto), 0);
  const totalGastos = movimientosFiltrados
    .filter(m => normalizarTipo(m.tipo) === "gasto")
    .reduce((s, m) => s + montoAbsoluto(m.monto), 0);
  const balance = totalIngresos - totalGastos;
  const totalMostrado = filtro === "gasto" ? totalGastos : filtro === "ingreso" ? totalIngresos : balance;
  const esNegativo = filtro === "gasto" || (filtro === "todos" && balance < 0);

  // Agrupar por fecha
  const agrupados: Record<string, any[]> = {};
  movimientosFiltrados.forEach(m => {
    const key = m.fecha || "Sin fecha";
    if (!agrupados[key]) agrupados[key] = [];
    agrupados[key].push(m);
  });
  const fechas = Object.keys(agrupados).sort((a, b) => b.localeCompare(a));

  const toLocalDateStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  function formatFecha(fecha: string) {
    if (!fecha || fecha === "Sin fecha") return "Sin fecha";
    const hoy = toLocalDateStr(new Date());
    const ayerDate = new Date(); ayerDate.setDate(ayerDate.getDate() - 1);
    const ayer = toLocalDateStr(ayerDate);
    if (fecha === hoy) return "Hoy";
    if (fecha === ayer) return "Ayer";
    const d = new Date(fecha + "T12:00:00");
    return d.toLocaleDateString("es-PE", { weekday: "short", day: "numeric", month: "short" });
  }

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.titulo}>Movimientos</Text>
        <Text style={s.subtitulo}>{movimientosFiltrados.length} registros</Text>
      </View>

      {/* Buscador */}
      <View style={s.buscadorWrap}>
        <Ionicons name="search" size={18} color="#94a3b8" />
        <TextInput
          style={s.buscadorInput}
          value={busqueda}
          onChangeText={setBusqueda}
          placeholder="Buscar por descripción, categoría o medio de pago"
          placeholderTextColor="#94a3b8"
          returnKeyType="search"
        />
        {busqueda.length > 0 && (
          <TouchableOpacity onPress={() => setBusqueda("")} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filtros */}
      <View style={s.filtrosWrap}>
        {FILTROS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[s.filtroBtn, filtro === f.key && s.filtroBtnActive]}
            onPress={() => { setFiltro(f.key); Analytics.filtroAplicado(f.key); }}
          >
            <Ionicons
              name={f.icon as any}
              size={15}
              color={filtro === f.key ? "#fff" : "#6b7280"}
            />
            <Text style={[s.filtroTexto, filtro === f.key && s.filtroTextoActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Resumen */}
      <View style={[s.resumen, { borderLeftColor: esNegativo ? "#ef4444" : "#22c55e" }]}>
        <Text style={s.resumenLabel}>
          {filtro === "todos" ? "Balance total" : filtro === "ingreso" ? "Total ingresos" : "Total gastos"}
        </Text>
        <Text style={[s.resumenMonto, { color: esNegativo ? "#ef4444" : "#22c55e" }]}>
          {esNegativo && filtro !== "gasto" ? "-" : filtro === "gasto" ? "-" : ""}{money(Math.abs(totalMostrado))}
        </Text>
        {filtro === "todos" && (
          <View style={s.resumenDetalle}>
            <Text style={s.resumenSub}>↑ {money(totalIngresos)}</Text>
            <Text style={[s.resumenSub, { color: "#ef4444" }]}>↓ {money(totalGastos)}</Text>
          </View>
        )}
      </View>

      {/* Lista agrupada */}
      <ScrollView ref={scrollViewRef} showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100 }}>
        {loading ? (
          <View style={s.center}>
            <Text style={s.loadingTxt}>Cargando...</Text>
          </View>
        ) : movimientosFiltrados.length === 0 ? (
          <View style={s.vacio}>
            <Text style={{ fontSize: 48 }}>{movimientos.length === 0 ? "📭" : "🔎"}</Text>
            <Text style={s.vacioTxt}>{movimientos.length === 0 ? "Sin movimientos" : "Sin resultados"}</Text>
            <Text style={s.vacioSub}>
              {movimientos.length === 0 ? "Agrega tu primer registro" : "Prueba con otra búsqueda o filtro"}
            </Text>
          </View>
        ) : (
          fechas.map(fecha => (
            <View key={fecha}>
              <View style={s.fechaHeader}>
                <Text style={s.fechaLabel}>{formatFecha(fecha)}</Text>
                <Text style={s.fechaMonto}>
                  {money(agrupados[fecha]
                    .filter(m => normalizarTipo(m.tipo) === "ingreso")
                    .reduce((s, m) => s + montoAbsoluto(m.monto), 0) -
                    agrupados[fecha]
                      .filter(m => normalizarTipo(m.tipo) === "gasto")
                      .reduce((s, m) => s + montoAbsoluto(m.monto), 0)
                  )}
                </Text>
              </View>
              {agrupados[fecha].map(mov => (
                <TouchableOpacity
                  key={mov.id}
                  style={s.movCard}
                  onLongPress={() => handleEliminar(mov.id)}
                  delayLongPress={500}
                >
                  <View style={[s.movIcono, {
                    backgroundColor: normalizarTipo(mov.tipo) === "ingreso" ? "#dcfce7" : "#fee2e2"
                  }]}>
                    <Text style={{ fontSize: 20 }}>
                      {mov.categoria?.icono || (normalizarTipo(mov.tipo) === "ingreso" ? "💰" : "💸")}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.movDesc} numberOfLines={1}>
                      {mov.descripcion || mov.categoria?.nombre || "Sin descripción"}
                    </Text>
                    <View style={s.movMetaRow}>
                      <Text style={s.movMeta}>{mov.categoria?.nombre || "Sin categoría"}</Text>
                      {mov.medio_pago && (
                        <View style={s.medioBadge}>
                          <Text style={s.medioTxt}>{mov.medio_pago}</Text>
                        </View>
                      )}
                      {mov.tipo_registro === "ia" && (
                        <View style={s.iaBadge}>
                          <Text style={s.iaTxt}>✨IA</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <Text style={[s.movMonto, { color: normalizarTipo(mov.tipo) === "ingreso" ? "#22c55e" : "#ef4444" }]}>
                    {normalizarTipo(mov.tipo) === "ingreso" ? "+" : "-"}{money(montoAbsoluto(mov.monto))}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ))
        )}
        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1, borderBottomColor: "#f3f4f6",
  },
  titulo: { fontSize: 26, fontWeight: "800", color: "#111827" },
  subtitulo: { fontSize: 13, color: "#6b7280", marginTop: 2 },
  buscadorWrap: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginHorizontal: 16, marginTop: 12, paddingHorizontal: 14,
    backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#e5e7eb",
  },
  buscadorInput: { flex: 1, paddingVertical: 11, fontSize: 13, color: "#111827" },
  filtrosWrap: {
    flexDirection: "row", gap: 8, paddingHorizontal: 16,
    paddingVertical: 12, backgroundColor: "#fff",
  },
  filtroBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 5, paddingVertical: 8, borderRadius: 10,
    backgroundColor: "#f3f4f6", borderWidth: 1, borderColor: "#e5e7eb",
  },
  filtroBtnActive: { backgroundColor: "#6C63FF", borderColor: "#6C63FF" },
  filtroTexto: { fontSize: 12, fontWeight: "600", color: "#6b7280" },
  filtroTextoActive: { color: "#fff" },
  resumen: {
    marginHorizontal: 16, marginVertical: 12, backgroundColor: "#fff",
    borderRadius: 14, padding: 16, borderLeftWidth: 4,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  resumenLabel: { fontSize: 12, color: "#6b7280", fontWeight: "600" },
  resumenMonto: { fontSize: 30, fontWeight: "900", marginTop: 4 },
  resumenDetalle: { flexDirection: "row", gap: 16, marginTop: 8 },
  resumenSub: { fontSize: 13, fontWeight: "600", color: "#22c55e" },
  center: { alignItems: "center", paddingTop: 40 },
  loadingTxt: { color: "#9ca3af", fontSize: 14 },
  vacio: { alignItems: "center", paddingTop: 60, gap: 8 },
  vacioTxt: { fontSize: 18, fontWeight: "700", color: "#374151" },
  vacioSub: { fontSize: 13, color: "#9ca3af" },
  fechaHeader: {
    flexDirection: "row", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 8,
  },
  fechaLabel: { fontSize: 12, fontWeight: "700", color: "#6b7280", textTransform: "uppercase" },
  fechaMonto: { fontSize: 12, fontWeight: "700", color: "#374151" },
  movCard: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#fff",
    marginHorizontal: 16, marginBottom: 6, borderRadius: 14, padding: 14,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  movIcono: { width: 44, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center", marginRight: 12 },
  movDesc: { fontSize: 14, fontWeight: "600", color: "#111827" },
  movMetaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4, flexWrap: "wrap" },
  movMeta: { fontSize: 11, color: "#9ca3af" },
  medioBadge: { backgroundColor: "#f0f9ff", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  medioTxt: { fontSize: 10, color: "#0ea5e9", fontWeight: "600" },
  iaBadge: { backgroundColor: "#faf5ff", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  iaTxt: { fontSize: 10, color: "#7c3aed", fontWeight: "700" },
  movMonto: { fontSize: 15, fontWeight: "800" },
});
