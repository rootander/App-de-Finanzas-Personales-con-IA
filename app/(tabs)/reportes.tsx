import { supabase } from "@/lib/supabase";
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState, useRef, useEffect } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View, Modal, TextInput, Platform, Alert, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

function genUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}
import Svg, { Path, Circle, Text as SvgText, Defs, LinearGradient as SvgLinearGradient, Stop, Line, G } from 'react-native-svg';
import { Paths, File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import GraficoResumen from "@/components/GraficoResumen";
import GraficoLinealInteractivo from "@/components/GraficoLinealInteractivo";
import { Analytics } from "@/lib/analytics";
import { useScreenTracking } from "@/hooks/useScreenTracking";

type Mov = { id: string; categoria_id: string | null; tipo: string | null; monto: number; fecha: string; descripcion: string | null; medio_pago?: string; categoria?: { id: string; nombre: string; icono: string | null } | null; };

function GraficoIngresosMensuales({ evolMensual }: { evolMensual: { label: string; labelKey: string; ing: number; gas: number; ahorro: number }[] }) {
  if (evolMensual.length === 0) {
    return (
      <View style={{ backgroundColor: "#fff", borderRadius: 28, padding: 20, marginHorizontal: 24, marginTop: 16, alignItems: "center" }}>
        <Text style={{ fontSize: 14, fontWeight: "900", color: "#1e293b", marginBottom: 10, alignSelf: "flex-start" }}>Ingresos Mensuales</Text>
        <Text style={{ color: "#94a3b8", fontSize: 13 }}>Sin datos de ingresos aún</Text>
      </View>
    );
  }

  const data = evolMensual.map(e => e.ing);
  const labels = evolMensual.map(e => {
    const [y, m] = e.labelKey.split("-");
    const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Set", "Oct", "Nov", "Dic"];
    return `${meses[+m - 1]} ${y.slice(2)}`;
  });

  const maxVal = Math.max(...data, 1);
  const minVal = 0;

  const width = 310;
  const height = 180;
  const topPadding = 20;
  const bottomPadding = 30;
  const leftPadding = 45;
  const rightPadding = 15;

  const chartWidth = width - leftPadding - rightPadding;
  const chartHeight = height - topPadding - bottomPadding;

  const points = data.map((val, idx) => {
    const x = leftPadding + (data.length === 1 ? chartWidth / 2 : (idx / (data.length - 1)) * chartWidth);
    const y = topPadding + chartHeight - ((val - minVal) / (maxVal - minVal)) * chartHeight;
    return { x, y, val, label: labels[idx] };
  });

  let d = `M ${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const cpX1 = p0.x + (p1.x - p0.x) * 0.35;
    const cpY1 = p0.y;
    const cpX2 = p1.x - (p1.x - p0.x) * 0.35;
    const cpY2 = p1.y;
    d += ` C ${cpX1},${cpY1} ${cpX2},${cpY2} ${p1.x},${p1.y}`;
  }

  const dFill = `${d} L ${points[points.length - 1].x},${topPadding + chartHeight} L ${points[0].x},${topPadding + chartHeight} Z`;

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map(pct => minVal + (maxVal - minVal) * pct);

  return (
    <View style={{ backgroundColor: "#fff", borderRadius: 28, padding: 20, marginHorizontal: 24, marginTop: 16, alignItems: "center" }}>
      <Text style={{ fontSize: 14, fontWeight: "900", color: "#1e293b", marginBottom: 15, alignSelf: "flex-start" }}>Ingresos Mensuales</Text>

      <Svg width={width} height={height}>
        <Defs>
          <SvgLinearGradient id="gradIngresos" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#22c55e" stopOpacity="0.35" />
            <Stop offset="100%" stopColor="#22c55e" stopOpacity="0.0" />
          </SvgLinearGradient>
        </Defs>

        {gridLines.map((gridVal) => {
          const y = topPadding + chartHeight - ((gridVal - minVal) / (maxVal - minVal)) * chartHeight;
          return (
            <G key={gridVal}>
              <Line x1={leftPadding} y1={y} x2={width - rightPadding} y2={y} stroke="#f1f5f9" strokeWidth="1" />
              <SvgText x={leftPadding - 8} y={y + 4} fontSize="9" fontWeight="bold" fill="#94a3b8" textAnchor="end">
                {gridVal >= 1000 ? `${(gridVal / 1000).toFixed(0)}k` : Math.round(gridVal).toString()}
              </SvgText>
            </G>
          );
        })}

        <Path d={dFill} fill="url(#gradIngresos)" />
        <Path d={d} fill="none" stroke="#22c55e" strokeWidth="3" />

        {points.map((pt, idx) => (
          <G key={idx}>
            <Circle cx={pt.x} cy={pt.y} r="5.5" fill="#fff" stroke="#22c55e" strokeWidth="2" />
            <Circle cx={pt.x} cy={pt.y} r="2.5" fill="#22c55e" />
            <SvgText x={pt.x} y={pt.y - 10} fontSize="9" fontWeight="900" fill="#16a34a" textAnchor="middle">
              {pt.val >= 1000 ? `${(pt.val / 1000).toFixed(1)}k` : Math.round(pt.val).toString()}
            </SvgText>
            <SvgText x={pt.x} y={height - 8} fontSize="9" fontWeight="bold" fill="#94a3b8" textAnchor="middle">
              {pt.label}
            </SvgText>
          </G>
        ))}
      </Svg>
    </View>
  );
}

const COLORS = ["#6366f1", "#0ea5e9", "#22c55e", "#f59e0b", "#ef4444", "#ec4899", "#14b8a6", "#8b5cf6"];

function money(v: number) { return `S/ ${Math.abs(v).toLocaleString("es-PE", { minimumFractionDigits: 2 })}`; }
function mabs(v: number | string) { return Math.abs(Number(v) || 0); }
function mkey(f?: string | null) { 
  if (!f) return "";
  try {
    // Intentamos parsear la fecha para asegurar formato YYYY-MM constante
    const d = new Date(f.includes('T') ? f : f + "T12:00:00");
    if (isNaN(d.getTime())) return String(f).trim().slice(0, 7);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  } catch (e) {
    return String(f).trim().slice(0, 7);
  }
}
function mlabel(k: string) {
  if (!k) return "—";
  const [y, m] = k.split("-");
  // Show full month name and full year for clarity
  return new Date(+y, +m - 1, 1).toLocaleDateString("es-PE", { month: "long", year: "numeric" });
}
function mlabelMini(k: string) {
  if (!k) return "—";
  const [y, m] = k.split("-");
  const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Set", "Oct", "Nov", "Dic"];
  return `${meses[+m - 1]} ${y.slice(2)}`;
}
function bar(v: number, max: number): any {
  return `${Math.max(3, Math.min(100, max > 0 ? (Math.abs(v) / max) * 100 : 0))}%`;
}

// NLP: Normalización avanzada para entender errores ortográficos
function clean(t: string) {
  return t.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Quita tildes
    .replace(/[^a-z0-9 ]/g, "") // Quita signos
    .replace(/\s+/g, " ") // Quita espacios extra
    .trim();
}

// Simple matcher used by intent logic
function matches(message: string, terms: string[]) {
  const cleaned = clean(message);
  return terms.some(term => cleaned.includes(term));
}

export default function Reportes() {
  const [movs, setMovs] = useState<Mov[]>([]);
  const [loading, setLoading] = useState(true);

  useScreenTracking("reportes");
  const [mes, setMes] = useState(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  });
  
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMsg, setChatMsg] = useState("");
  const [chatHistory, setChatHistory] = useState<{role: 'user'|'ia', msg: string}[]>([
    { role: 'ia', msg: 'Hola! Soy tu Asesor Finanzas IA. Pregúntame sobre tus gastos, ingresos, ahorro, o pide consejos y recomendaciones. Puedo responder sobre cualquier aspecto de tus finanzas.' }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [chatSesionId, setChatSesionId] = useState<string | null>(null);
  const [rangoFiltro, setRangoFiltro] = useState<"dia" | "mes" | "semana" | "trimestre" | "todo">("mes");
  const toLocalDateStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const [diaSeleccionado, setDiaSeleccionado] = useState(() => toLocalDateStr(new Date()));
  const [exportando, setExportando] = useState(false);
  const [pressedEvol, setPressedEvol] = useState<number | null>(null);
  const [pressedWeek, setPressedWeek] = useState<number | null>(null);
  const [pressedPay, setPressedPay] = useState<number | null>(null);
  const [pressedTrend, setPressedTrend] = useState<number | null>(null);
  const mainScrollViewRef = useRef<ScrollView>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (chatOpen) {
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 200);
    }
  }, [chatHistory, isTyping, chatOpen]);

  const cambiarMesReporte = (delta: number) => {
    const [y, m] = mes.split("-");
    const date = new Date(Number(y), Number(m) - 1 + delta, 1);
    const nY = date.getFullYear();
    const nM = String(date.getMonth() + 1).padStart(2, "0");
    setMes(`${nY}-${nM}`);
  };

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) { setMovs([]); return; }
      const { data: raw } = await supabase.from("movimiento")
        .select("id, categoria_id, tipo, monto, fecha, descripcion, medio_pago")
        .eq("usuario_id", user.id).order("fecha", { ascending: false });

      const ids = [...new Set((raw || []).map(m => m.categoria_id).filter(Boolean))] as string[];
      let catMap: Record<string, any> = {};
      if (ids.length) {
        const { data: cats } = await supabase.from("categoria").select("id, nombre, icono").in("id", ids);
        catMap = Object.fromEntries((cats || []).map(c => [c.id, c]));
      }

      const movsList = ((raw || []) as Mov[]).map(m => ({
        ...m,
        monto: mabs(m.monto),
        categoria: m.categoria_id ? catMap[m.categoria_id] : null
      }));

      // Auto-fallback to latest month if current month has no data
      const nowMes = toLocalDateStr(new Date()).slice(0, 7);
      const hasCurrentMonth = movsList.some(m => mkey(m.fecha) === nowMes);
      if (!hasCurrentMonth && movsList.length > 0) {
        const sortedKeys = [...new Set(movsList.map(m => mkey(m.fecha)))].filter(k => k && k.length >= 7).sort((a, b) => b.localeCompare(a));
        if (sortedKeys.length > 0) {
          setMes(sortedKeys[0]);
        }
      }

      setMovs(movsList);
    } catch (e) { console.log(e); } finally { setLoading(false); }
  }, []);

  useFocusEffect(
    useCallback(() => {
      mainScrollViewRef.current?.scrollTo({ y: 0, animated: false });
      cargar();
    }, [cargar])
  );

  const df = useMemo(() => {
    // Filtrar por rango de fechas
    let movsFiltrados = movs;
    if (rangoFiltro === "dia") {
      movsFiltrados = movs.filter(m => m.fecha === diaSeleccionado);
    } else if (rangoFiltro === "mes") {
      movsFiltrados = movs.filter(m => mkey(m.fecha) === mes);
    } else if (rangoFiltro === "semana") {
      const now = new Date();
      const semanaAtras = new Date(now.getTime() - 7 * 86400000);
      const inicioSemana = toLocalDateStr(semanaAtras);
      movsFiltrados = movs.filter(m => m.fecha && m.fecha >= inicioSemana);
    } else if (rangoFiltro === "trimestre") {
      const [y, m] = mes.split("-");
      const mesNum = Number(m);
      const mesesTrimestre = [mes, `${y}-${String(mesNum - 1 > 0 ? mesNum - 1 : 12).padStart(2, "0")}`, `${y}-${String(mesNum - 2 > 0 ? mesNum - 2 : 12).padStart(2, "0")}`];
      movsFiltrados = movs.filter(m => mesesTrimestre.includes(mkey(m.fecha)));
    }
    // "todo" usa todos los movimientos

    const ingL = movsFiltrados.filter(m => (m.tipo || '').toLowerCase() === 'ingreso');
    const gasL = movsFiltrados.filter(m => (m.tipo || '').toLowerCase() === 'gasto');
    const tI = ingL.reduce((s, m) => s + Number(m.monto || 0), 0);
    const tG = gasL.reduce((s, m) => s + Number(m.monto || 0), 0);
    const aTotal = movs.filter(m => String(m.tipo || "").trim().toLowerCase() === "ingreso").reduce((s, m) => s + Number(m.monto || 0), 0) -
                   movs.filter(m => String(m.tipo || "").trim().toLowerCase() === "gasto").reduce((s, m) => s + Number(m.monto || 0), 0);

    const iMayor = ingL.length > 0 ? [...ingL].sort((a,b) => Number(b.monto) - Number(a.monto))[0] : null;
    const iMenor = ingL.length > 0 ? [...ingL].sort((a,b) => Number(a.monto) - Number(b.monto))[0] : null;
    const gMayor = gasL.length > 0 ? [...gasL].sort((a,b) => Number(b.monto) - Number(a.monto))[0] : null;
    const gMenor = gasL.length > 0 ? [...gasL].sort((a,b) => Number(a.monto) - Number(b.monto))[0] : null;

    const cats: Record<string, any> = {};
    gasL.forEach(m => {
      const k = m.categoria_id || "sin";
      if (!cats[k]) cats[k] = { nombre: m.categoria?.nombre || "Varios", total: 0 };
      cats[k].total += Number(m.monto || 0);
    });

    const medios: Record<string, number> = {};
    gasL.forEach(m => {
      const med = m.medio_pago || "Efectivo";
      medios[med] = (medios[med] || 0) + Number(m.monto || 0);
    });

    const heat = Array.from({ length: 31 }, (_, i) => {
      const day = i + 1;
      const tot = gasL.filter(m => {
        if (!m.fecha) return false;
        const parts = m.fecha.split("-");
        return Number(parts[2]) === day;
      }).reduce((s, m) => s + Number(m.monto || 0), 0);
      return { day, total: tot };
    });

    const gSemana = Array(7).fill(0);
    gasL.forEach(m => {
      try {
        const d = new Date(m.fecha + "T12:00:00").getDay();
        gSemana[d] += Number(m.monto || 0);
      } catch (e) {}
    });

    // Meses disponibles (keys) sorted descending
    const ks = [...new Set(movs.map(m => mkey(m.fecha)))].filter(k => k && k.length >= 7).sort((a, b) => b.localeCompare(a));
    const evol = ks.slice(0, 6).reverse().map(k => {
      const ms = movs.filter(m => mkey(m.fecha) === k);
      const i = ms.filter(m => String(m.tipo || "").trim().toLowerCase() === "ingreso").reduce((s, m) => s + Number(m.monto || 0), 0);
      const g = ms.filter(m => String(m.tipo || "").trim().toLowerCase() === "gasto").reduce((s, m) => s + Number(m.monto || 0), 0);
      return { label: mlabel(k), labelKey: k, ing: i, gas: g, ahorro: i - g };
    });

    // Día de más gasto en el mes actual
    const maxDiaGasto = heat.length > 0 ? [...heat].sort((a, b) => b.total - a.total)[0] : null;

    // Mes de más gasto en el histórico
    const mesMaxGasto = ks.length > 0 ? ks.map(k => {
      const ms = movs.filter(m => mkey(m.fecha) === k && String(m.tipo).toLowerCase() === "gasto");
      return { k, total: ms.reduce((s, m) => s + Number(m.monto || 0), 0) };
    }).sort((a, b) => b.total - a.total)[0] : null;

    // Año de más gasto en el histórico
    const years = [...new Set(movs.map(m => m.fecha ? m.fecha.slice(0, 4) : ""))].filter(Boolean);
    const yearMaxGasto = years.length > 0 ? years.map(y => {
      const ms = movs.filter(m => m.fecha && m.fecha.startsWith(y) && String(m.tipo).toLowerCase() === "gasto");
      return { y, total: ms.reduce((s, m) => s + Number(m.monto || 0), 0) };
    }).sort((a, b) => b.total - a.total)[0] : null;

    const recs = [];

    // Déficit Operativo Mensual
    if (tG > tI) {
      const deficit = tG - tI;
      const pctDeficit = tI > 0 ? ((deficit / tI) * 100).toFixed(0) : "∞";
      recs.push({
        t: "Déficit Operativo",
        d: `Gastas S/ ${deficit.toFixed(2)} más de lo que ingresas (${pctDeficit}% sobre ingresos). Para corregir: identifica los 3 gastos no esenciales más altos y elimínalos o reducirlos.`,
        i: "warning", c: "#ef4444"
      });
    }

    // Distribución de Gastos por Categoría (Regla 50/30/20)
    const topC = Object.values(cats).sort((a:any,b:any) => b.total - a.total)[0] as any;
    if (topC && tG > 0) {
      const pct = ((topC.total / tG) * 100).toFixed(0);
      const nombreCat = (topC.nombre || "").toLowerCase();
      let estrategia = "";
      if (nombreCat.includes("comida") || nombreCat.includes("aliment") || nombreCat.includes("restaur") || nombreCat.includes("delivery")) {
        estrategia = "Planifica menús semanales, lleva almuerzo al trabajo y limita delivery a 1 vez por semana. Ahorro potencial: S/ " + (topC.total * 0.35).toFixed(0) + "/mes.";
      } else if (nombreCat.includes("transporte") || nombreCat.includes("uber") || nombreCat.includes("taxi")) {
        estrategia = "USA transporte público o apps de carpooling. En trayectos cortos, caminar o bicicleta. Ahorro potencial: S/ " + (topC.total * 0.4).toFixed(0) + "/mes.";
      } else if (nombreCat.includes("entretenimiento") || nombreCat.includes("salida") || nombreCat.includes("ocio")) {
        estrategia = "Establece un presupuesto fijo de ocio (máx. 5% del ingreso). Busca alternativas gratuitas: parques, eventos comunitarios, bibliotecas.";
      } else if (nombreCat.includes("ropa") || nombreCat.includes("compra")) {
        estrategia = "Aplica la regla de 48h: espera 2 días antes de compras no esenciales. Usa lista de deseos y compra solo en ofertas reales (no por impulso).";
      } else if (nombreCat.includes("salud")) {
        estrategia = "Mantén tu salud (es prioridad), pero compara precios en farmacias y usa seguros/suscripciones si disponibles.";
      } else {
        estrategia = "Revisa si este gasto es realmente prioritario. Establece un límite mensual del 30% para esta categoría.";
      }
      recs.push({
        t: `Análisis: ${topC.nombre}`,
        d: `Representa el ${pct}% de tus gastos (S/ ${topC.total.toFixed(2)}). ${estrategia}`,
        i: "pie-chart", c: "#f59e0b"
      });
    }

    // Meta de Ahorro - Regla 20/50/30
    if (tI > 0) {
      const ahorroObjetivo = tI * 0.2;
      const ahorroActual = tI - tG;
      const pctAhorro = ((ahorroActual / tI) * 100).toFixed(0);
      if (ahorroActual < ahorroObjetivo) {
        const faltante = ahorroObjetivo - ahorroActual;
        recs.push({
          t: "Meta de Ahorro (20%)",
          d: `Deberías ahorrar S/ ${ahorroObjetivo.toFixed(2)}/mes. Te faltan S/ ${faltante.toFixed(2)} (${(100 - Number(pctAhorro))}% menos de lo ideal). Automatiza: configura transferencia automática del 20% el día de pago.`,
          i: "leaf", c: "#22c55e"
        });
      } else {
        recs.push({
          t: "Excelente Ahorro",
          d: `Ahorraste S/ ${ahorroActual.toFixed(2)} (${pctAhorro}% de ingresos). Invierte el excedente: fondo de emergencia (3-6 meses gastos) o instrumentos de renta fija.`,
          i: "leaf", c: "#22c55e"
        });
      }
    }

    // Patrón de Gasto por Día de Semana
    const maxSemana = Math.max(...gSemana);
    const minSemana = Math.min(...gSemana.filter(v => v > 0), Infinity);
    const dP = maxSemana > 0 ? ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"][gSemana.indexOf(maxSemana)] : "N/A";
    if (maxSemana > 0 && maxSemana !== minSemana) {
      const ahorroPotencial = maxSemana - minSemana;
      recs.push({
        t: "Patrón de Gasto Semanal",
        d: `Los ${dP} gastas S/ ${maxSemana.toFixed(2)} (pico semanal). Redirige S/ ${ahorroPotencial.toFixed(2)} de ese día a días de menor gasto para equilibrar tu flujo.`,
        i: "calendar", c: "#8b5cf6"
      });
    }

    // Fondo de Emergencia
    const fondoIdeal = tG * 3;
    const mesesCobertura = tG > 0 ? (aTotal / tG).toFixed(1) : "0";
    if (aTotal >= fondoIdeal) {
      recs.push({
        t: "Fondo Sólido",
        d: `Tienes S/ ${aTotal.toFixed(2)} (cubre ${mesesCobertura}× gastos mensuales). Siguiente paso: diversificar en instrumentos de bajo riesgo (CDT, bonos soberanos).`,
        i: "shield", c: "#14b8a6"
      });
    } else {
      const faltante = fondoIdeal - aTotal;
      recs.push({
        t: "Construye tu Fondo",
        d: `Necesitas S/ ${fondoIdeal.toFixed(2)} (3× gastos). Faltan S/ ${faltante.toFixed(2)}. Ahorra S/ ${(faltante / 6).toFixed(0)}/mes durante 6 meses para alcanzarlo.`,
        i: "shield", c: "#14b8a6"
      });
    }

    // Eficiencia de Medio de Pago
    const topMedio = Object.entries(medios).sort((a, b) => b[1] - a[1])[0];
    if (topMedio && topMedio[0] !== "Efectivo") {
      const pctMedio = tG > 0 ? ((topMedio[1] / tG) * 100).toFixed(0) : 0;
      recs.push({
        t: "Medio de Pago",
        d: `${pctMedio}% de gastos con "${topMedio[0]}" (S/ ${topMedio[1].toFixed(2)}). Verifica: ¿acumulas millas/puntos? ¿Tienes beneficios por uso? Aprovecha el medio que mejor retorno te dé.`,
        i: "card", c: "#0ea5e9"
      });
    }

    // Eficiencia de Gasto Diario
    if (tG > 0) {
      const diasEnMes = new Date(Number(mes.split("-")[0]), Number(mes.split("-")[1]), 0).getDate();
      const gastoDiario = tG / diasEnMes;
      const gastoDiarioObjetivo = (tI * 0.5) / diasEnMes; // 50% del ingreso en gastos
      const diffDiaria = gastoDiario - gastoDiarioObjetivo;
      if (diffDiaria > 0) {
        recs.push({
          t: "Control Diario",
          d: `Gastas S/ ${gastoDiario.toFixed(2)}/día (objetivo: S/ ${gastoDiarioObjetivo.toFixed(2)}). Reduce S/ ${diffDiaria.toFixed(2)}/día = ahorras S/ ${(diffDiaria * diasEnMes).toFixed(0)}/mes.`,
          i: "trending-down", c: "#6366f1"
        });
      } else {
        recs.push({
          t: "Gasto Controlado",
          d: `Promedias S/ ${gastoDiario.toFixed(2)}/día. Estás dentro del rango óptimo. Mantén este ritmo y redirige el excedente a ahorro.`,
          i: "trending-down", c: "#6366f1"
        });
      }
    }

    // Recomendación de Diversificación (si ahorro es alto)
    if (aTotal > tG * 2 && tI > 0) {
      recs.push({
        t: "Diversificación",
        d: `Con S/ ${aTotal.toFixed(2)} ahorrados, considera: 1) Fondo de emergencia líquido, 2) Inversión en renta fija, 3) Diversificación en acciones/ETFs a largo plazo.`,
        i: "analytics", c: "#0ea5e9"
      });
    }

    return {
      totIng: tI, totGas: tG, ahorroTotal: aTotal,
      catGastos: Object.values(cats).sort((a:any,b:any) => b.total - a.total) || [],
      mediosPago: Object.entries(medios).map(([nombre, total]) => ({ nombre, total })),
      top10: [...gasL].sort((a,b) => Number(b.monto) - Number(a.monto)).slice(0, 10),
      heatMap: heat,
      diaSemana: ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((l, i) => ({ label: l, total: gSemana[i] })),
      evolMensual: evol,
      ingMayor: iMayor, ingMenor: iMenor, gasMayor: gMayor, gasMenor: gMenor,
      mesLabel: mlabel(mes), meses: ks, recomendaciones: recs,
      maxDiaGasto,
      mesMaxGasto,
      yearMaxGasto
    };
  }, [movs, mes, rangoFiltro, diaSeleccionado]);

  const handleChat = async () => {
    if (!chatMsg.trim() || isTyping) return;
    const originalMsg = chatMsg;
    const startTime = Date.now();
    setChatHistory(p => [...p, { role: 'user', msg: chatMsg }]);
    setChatMsg("");
    setIsTyping(true);

    try {
      const hoy = toLocalDateStr(new Date());
      const ayerDate = new Date(); ayerDate.setDate(ayerDate.getDate() - 1);
      const ayer = toLocalDateStr(ayerDate);

      // Datos de hoy
      const movsHoy = movs.filter(m => m.fecha === hoy);
      const ingHoy = movsHoy.filter(m => (m.tipo || '').toLowerCase() === 'ingreso').reduce((s, m) => s + Number(m.monto || 0), 0);
      const gasHoy = movsHoy.filter(m => (m.tipo || '').toLowerCase() === 'gasto').reduce((s, m) => s + Number(m.monto || 0), 0);

      // Datos de ayer
      const movsAyer = movs.filter(m => m.fecha === ayer);
      const ingAyer = movsAyer.filter(m => (m.tipo || '').toLowerCase() === 'ingreso').reduce((s, m) => s + Number(m.monto || 0), 0);
      const gasAyer = movsAyer.filter(m => (m.tipo || '').toLowerCase() === 'gasto').reduce((s, m) => s + Number(m.monto || 0), 0);

      // Totales históricos
      const totalIngresosHist = movs.filter(m => (m.tipo || '').toLowerCase() === 'ingreso').reduce((s, m) => s + Number(m.monto || 0), 0);
      const totalGastosHist = movs.filter(m => (m.tipo || '').toLowerCase() === 'gasto').reduce((s, m) => s + Number(m.monto || 0), 0);
      const ahorroHist = totalIngresosHist - totalGastosHist;

      // Gastos por categoría (histórico)
      const gastosPorCat: Record<string, number> = {};
      movs.filter(m => (m.tipo || '').toLowerCase() === 'gasto').forEach(m => {
        const cat = m.categoria?.nombre || 'Sin categoría';
        gastosPorCat[cat] = (gastosPorCat[cat] || 0) + Number(m.monto || 0);
      });
      const topCatsHist = Object.entries(gastosPorCat).sort((a, b) => b[1] - a[1]).slice(0, 5);

      // Ingresos por categoría (histórico)
      const ingresosPorCat: Record<string, number> = {};
      movs.filter(m => (m.tipo || '').toLowerCase() === 'ingreso').forEach(m => {
        const cat = m.categoria?.nombre || 'Sin categoría';
        ingresosPorCat[cat] = (ingresosPorCat[cat] || 0) + Number(m.monto || 0);
      });
      const topIngCats = Object.entries(ingresosPorCat).sort((a, b) => b[1] - a[1]).slice(0, 5);

      // Gastos por medio de pago
      const gastosPorMedio: Record<string, number> = {};
      movs.filter(m => (m.tipo || '').toLowerCase() === 'gasto').forEach(m => {
        const med = m.medio_pago || 'Efectivo';
        gastosPorMedio[med] = (gastosPorMedio[med] || 0) + Number(m.monto || 0);
      });

      // Gastos por día de semana
      const gastosPorDia = Array(7).fill(0);
      movs.filter(m => (m.tipo || '').toLowerCase() === 'gasto').forEach(m => {
        try { const d = new Date(m.fecha + 'T12:00:00').getDay(); gastosPorDia[d] += Number(m.monto || 0); } catch {}
      });
      const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      const diaMaxGasto = gastosPorDia.indexOf(Math.max(...gastosPorDia));

      // Últimos 5 movimientos
      const ultimos5 = movs.slice(0, 5).map(m => `${m.descripcion || m.categoria?.nombre || 'N/A'} S/ ${Number(m.monto).toFixed(2)} (${m.tipo}) ${m.fecha}`);

      const systemPrompt = `Eres "Finanzas IA", un asistente financiero profesional y directo.

REGLAS DE COMPORTAMIENTO:
- Si el usuario saluda, responde con un saludo breve y pregunta en que puedes ayudar. NO des recomendaciones de gastos a menos que te pidan.
- Solo muestra categorias que tengan monto mayor a 0.00. NUNCA menciones categorias con S/ 0.00.
- Responde SOBRE TEMAS FINANCIEROS.
- Si la pregunta no es financiera, redirige amablemente.
- NUNCA dejes frases incompletas. SIEMPRE termina cada oración y cada respuesta completa. No cortes respuestas a la mitad.
- SIEMPRE termina con una recomendación concreta y práctica que el usuario pueda realizar.

ICONOS QUE DEBES USAR (copia y pega estos iconos exactamente):
Ingresos: 💰
Gastos: 💸
Ahorro: 🐷
Balance: 📊
Restaurante/Comida: 🍔
Transporte: 🚕
Supermercado: 🛒
Salud: ❤️
Entretenimiento: 🎬
Ropa: 👔
Servicios: 🏠
Educacion: 📚
Deudas: ⚠️
Otros: 📌
Meta/Objetivo: 🎯
Tendencia positiva: 📈
Tendencia negativa: 📉

REGLAS DE FORMATO:
- NUNCA uses asteriscos, guiones, ni markdown
- Usa estos iconos: 💰 📊 🐷 🍔 🚕 🛒 ❤️ 🎬 👔 🏠 📚 ⚠️ 📌 🎯 📈 📉
- Respuestas cortas pero COMPLETAS: maximo 5 oraciones, SIEMPRE termina cada oración
- Usa formato: S/ 123.45
- SIEMPRE incluye porcentajes cuando hables de gastos
- SIEMPRE agrega una recomendacion completa al final (nunca la dejes a medias)
- SIEMPRE muestra la FECHA EXACTA de cada movimiento segun la base de datos
- Cuando pregunten por totales, muestra ingresos totales y gastos totales historicos
- NUNCA filtres datos. Muestra todo lo que esta en la base de datos.

CUANDO EL USUARIO PREGUNTE POR INGRESOS:
Muestra SOLO ingresos. NUNCA mezcles gastos o ahorro.
Ejemplo:
💰 INGRESOS TOTALES: S/ 5000.00
💰 Sueldo: S/ 2000.00 — 01/06/2026
💰 Venta: S/ 40.00 — 15/06/2026
💰 Freelance: S/ 300.00 — 20/06/2026
📈 Mayor ingreso: S/ 2000.00 — Sueldo — 01/06/2026
📉 Menor ingreso: S/ 40.00 — Venta — 15/06/2026

CUANDO EL USUARIO PREGUNTE POR GASTOS:
Muestra SOLO gastos. NUNCA mezcles ingresos o ahorro.
Ejemplo:
💸 GASTOS TOTALES: S/ 2500.00
🍔 Restaurante: S/ 85.00 — 25/06/2026
🚕 Transporte: S/ 45.00 — 28/06/2026
🛒 Supermercado: S/ 60.00 — 27/06/2026
📉 Mayor gasto: S/ 85.00 — Restaurante — 25/06/2026
📈 Menor gasto: S/ 5.00 — Transporte — 20/06/2026

CUANDO EL USUARIO PREGUNTE POR AHORRO O BALANCE:
Muestra SOLO ahorro y balance, SIEMPRE con recomendación completa.
Ejemplo:
🐷 AHORRO TOTAL: S/ 2500.00
💰 Ingresos: S/ 5000.00
💸 Gastos: S/ 2500.00
📊 Balance: S/ 2500.00 (50% de tus ingresos)
📌 Recomendación: Tu ahorro es excelente. Destina el 20% (S/ 500) a un fondo de emergencia y el resto a inversiones de bajo riesgo.

CUANDO EL USUARIO PREGUNTE POR TOTALES:
Muestra resumen general con los 3: ingresos, gastos, ahorro.
Ejemplo:
💰 INGRESOS: S/ 5000.00
💸 GASTOS: S/ 2500.00
🐷 AHORRO: S/ 2500.00 (50%)

CUANDO EL USUARIO PREGUNTE POR MENOR O MAYOR INGRESO/GASTO:
Muestra el monto, categoria, fecha exacta Y una recomendacion breve.
Ejemplo:
💰 Menor ingreso: S/ 40.00 — Venta — 15/06/2026
📌 Recomendacion: Busca fuentes de ingreso extra. Meta: S/ 100/mes adicionales.

💰 Mayor ingreso: S/ 2000.00 — Sueldo — 01/06/2026
📈 Recomendacion: Destina el 20% (S/ 400) a ahorro automatico.

💸 Menor gasto: S/ 5.00 — Transporte — 20/06/2026
📌 Recomendacion: Gasto bajo, manténlo. Camina para ahorrar mas.

💸 Mayor gasto: S/ 85.00 — Restaurante — 25/06/2026
📉 Recomendacion: Cocina en casa 3x/semana. Ahorro: S/ 60/mes.

CUANDO EL USUARIO PIDA RECOMENDACIONES O CONSEJOS:
Da analisis detallado con porcentajes y montos. SIEMPRE completa cada recomendación.
Ejemplo:
📊 ANALISIS DE GASTOS
🍔 Restaurante: S/ 85.00 (34%)
🚕 Transporte: S/ 45.00 (18%)
🛒 Supermercado: S/ 60.00 (24%)

🎯 RECOMENDACIONES (SIEMPRE completas)
1. 🍔 Cocinar 3x/semana en casa: ahorro estimado S/ 60/mes (24% de tu gasto en comida)
2. 🚕 Usa transporte público en vez de taxi: ahorro S/ 30/mes (12%)
3. 🎯 Meta de ahorro 20%: transfiere S/ 40 al fondo de emergencia cada mes

Hoy es ${new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}.

═══════════════════════════════════════
DATOS FINANCIEROS DEL USUARIO:
═══════════════════════════════════════

HOY (${hoy}):
Ingresos: S/ ${ingHoy.toFixed(2)} | Gastos: S/ ${gasHoy.toFixed(2)} | Balance: S/ ${(ingHoy - gasHoy).toFixed(2)}
${movsHoy.length > 0 ? movsHoy.map(m => `${m.tipo === 'ingreso' ? 'Ingreso' : 'Gasto'}: ${m.descripcion || 'Sin descripcion'} | Categoria: ${m.categoria?.nombre || 'Sin categoria'} | Monto: S/ ${Number(m.monto).toFixed(2)}`).join('\n') : 'Sin movimientos hoy'}

AYER (${ayer}):
Ingresos: S/ ${ingAyer.toFixed(2)} | Gastos: S/ ${gasAyer.toFixed(2)} | Balance: S/ ${(ingAyer - gasAyer).toFixed(2)}
${movsAyer.length > 0 ? movsAyer.map(m => `${m.tipo === 'ingreso' ? 'Ingreso' : 'Gasto'}: ${m.descripcion || 'Sin descripcion'} | Categoria: ${m.categoria?.nombre || 'Sin categoria'} | Monto: S/ ${Number(m.monto).toFixed(2)}`).join('\n') : 'Sin movimientos ayer'}

MES ACTUAL (${df.mesLabel}):
Ingresos: S/ ${df.totIng.toFixed(2)} | Gastos: S/ ${df.totGas.toFixed(2)} | Balance: S/ ${(df.totIng - df.totGas).toFixed(2)}
Gastos por categoria: ${(df.catGastos as any[]).slice(0, 5).map(c => `${c.nombre}: S/ ${c.total.toFixed(2)} (${df.totGas > 0 ? ((c.total / df.totGas) * 100).toFixed(0) : 0}%)`).join(', ')}
Ingresos por categoria: ${topIngCats.map(([n, t]) => `${n}: S/ ${t.toFixed(2)}`).join(', ')}
Mayor ingreso: ${df.ingMayor ? `S/ ${Number(df.ingMayor.monto).toFixed(2)} — ${df.ingMayor.categoria?.nombre || 'Sin categoria'} — ${df.ingMayor.fecha}` : 'N/A'}
Menor ingreso: ${df.ingMenor ? `S/ ${Number(df.ingMenor.monto).toFixed(2)} — ${df.ingMenor.categoria?.nombre || 'Sin categoria'} — ${df.ingMenor.fecha}` : 'N/A'}
Mayor gasto: ${df.gasMayor ? `S/ ${Number(df.gasMayor.monto).toFixed(2)} — ${df.gasMayor.categoria?.nombre || 'Sin categoria'} — ${df.gasMayor.fecha}` : 'N/A'}
Menor gasto: ${df.gasMenor ? `S/ ${Number(df.gasMenor.monto).toFixed(2)} — ${df.gasMenor.categoria?.nombre || 'Sin categoria'} — ${df.gasMenor.fecha}` : 'N/A'}

HISTORICO COMPLETO:
Ingresos totales: S/ ${totalIngresosHist.toFixed(2)}
Gastos totales: S/ ${totalGastosHist.toFixed(2)}
Ahorro acumulado: S/ ${ahorroHist.toFixed(2)} (${totalIngresosHist > 0 ? ((ahorroHist / totalIngresosHist) * 100).toFixed(0) : 0}% de ingresos)
Total movimientos: ${movs.length}
Top gastos: ${topCatsHist.map(([n, t]) => `${n}: S/ ${t.toFixed(2)}`).join(', ')}
Medios de pago: ${Object.entries(gastosPorMedio).map(([n, t]) => `${n}: S/ ${t.toFixed(2)}`).join(', ')}
Gastos por dia: ${diasSemana.map((d, i) => `${d}: S/ ${gastosPorDia[i].toFixed(2)}`).join(', ')}
Ultimos 10 movimientos (con fecha exacta):
${movs.slice(0, 10).map(m => `${m.tipo === 'ingreso' ? '💰' : '💸'} ${m.descripcion || m.categoria?.nombre || 'N/A'} — S/ ${Number(m.monto).toFixed(2)} — ${m.fecha} — ${m.categoria?.nombre || 'Sin categoria'}`).join('\n')}

MAPA DE RECOMENDACIONES (personalizar SEGUN los datos reales del usuario):
NUNCA des recomendaciones genericas. SIEMPRE usa los montos y categorias REALES del usuario.

EJEMPLO de como responder:
Si el usuario gasta S/ 85 en Restaurante, di:
"🍔 Restaurante: S/ 85.00 (34% de tus gastos). Cocina en casa 3 veces por semana y ahorraras S/ 60/mes. Lleva tu almuerzo al trabajo para ahorrar S/ 40 mas."

Si el usuario gasta S/ 45 en Transporte, di:
"🚕 Transporte: S/ 45.00 (18% de tus gastos). Usa transporte publico en vez de taxi y ahorraras S/ 30/mes."

RECOMENDACIONES SEGUN CATEGORIA (adapta el monto al gasto real del usuario, SIEMPRE completa cada recomendación):
🍔 Comida: Cocinar en casa, llevar almuerzo, reducir delivery. Ahorro: 30-40% de esa categoria. Ejemplo: "Si reduces de S/ 85 a S/ 50, ahorrarás S/ 35/mes."
🚕 Transporte: Transporte publico, caminar, compartir carro. Ahorro: 30-50% de esa categoria. Ejemplo: "Usando bus en vez de taxi, ahorras S/ 30/mes."
🛒 Supermercado: Hacer lista, comprar ofertas, apps de descuento. Ahorro: 15-25% de esa categoria. Ejemplo: "Con lista de compras, reduces S/ 15/mes."
🎬 Entretenimiento: Cancelar suscripciones innecesarias, buscar opciones gratis. Ahorro: 40-60% de esa categoria. Ejemplo: "Cancelando 1 streaming, ahorras S/ 25/mes."
👔 Ropa: Comprar en rebajas, priorizar calidad. Ahorro: 20-30% de esa categoria.
🏠 Servicios: Revisar si usas todo lo que pagas. Ahorro: 10-20% de esa categoria.
📚 Educacion: Cursos gratuitos en linea. Ahorro: 100% de esa categoria.
⚠️ Deudas: Pagar mas del minimo, priorizar la de mayor tasa de interes. Ejemplo: "Paga primero la deuda con 20% de interés."

ESTRATEGIA DE AHORRO PERSONALIZADA:
- Calcular 20% del ingreso del usuario como meta de ahorro
- Identificar las 3 categorias con mayor gasto
- Proponer reduccion concreta en cada una con monto estimado
- Ejemplo: "Con tu ingreso de S/ 2000, tu meta de ahorro es S/ 400/mes. Si reduces Restaurante de S/ 85 a S/ 45 y Transporte de S/ 45 a S/ 25, ahorraras S/ 60/mes extras."`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      let groqResponse: any;

      try {
        groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Authorization': `Bearer ${process.env.EXPO_PUBLIC_GROQ_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'openai/gpt-oss-120b',
            reasoning_effort: 'low',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: originalMsg }
            ],
            max_tokens: 400,
            temperature: 0.5,
            stop: null,
          })
        });
      } finally {
        clearTimeout(timeoutId);
      }

      const duracion_ms = Date.now() - startTime;

      if (!groqResponse.ok) {
        const errBody = await groqResponse.text();
        console.log("Groq error status:", groqResponse.status, "body:", errBody);
        throw new Error(`Groq ${groqResponse.status}: ${errBody.slice(0, 200)}`);
      }

      const groqData = await groqResponse.json();
      const res = groqData.choices?.[0]?.message?.content;
      if (!res) {
        console.log("Groq respuesta sin choices:", JSON.stringify(groqData));
        throw new Error("Respuesta vacía de Groq");
      }
      const tokensInput = groqData.usage?.prompt_tokens || originalMsg.length;
      const tokensOutput = groqData.usage?.completion_tokens || res.length;

      // Registrar métrica de éxito
      Analytics.chatMensaje(originalMsg, duracion_ms);
      Analytics.chatIntentMatch("GPT-OSS 120B", duracion_ms, tokensInput, tokensOutput);

      // Guardar historial del chat en chat_historial (fire-and-forget)
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (!user) return;
        const sesionId = chatSesionId || genUUID();
        if (!chatSesionId) setChatSesionId(sesionId);
        supabase.from("chat_historial").insert({
          usuario_id: user.id,
          sesion_id: sesionId,
          mensaje_usuario: originalMsg,
          respuesta_ia: res,
          modelo_ia: "openai/gpt-oss-120b",
          proveedor_ia: "groq",
          intencion_detectada: "consulta_financiera",
          tokens_input: tokensInput,
          tokens_output: tokensOutput,
          duracion_ms,
          exito: true,
          error_mensaje: null,
          contexto_financiero: {
            movimientos_total: movs.length,
            mes: df.mesLabel,
          },
          metadata: null,
        }).then();
      });

      const limpiarRespuesta = (txt: string) => txt.replace(/\*\*/g, '').replace(/\*/g, '').replace(/#{1,6}\s/g, '').replace(/`{1,3}[^`]*`{1,3}/g, (m) => m.replace(/`/g, '')).replace(/\n{3,}/g, '\n\n').trim();

      setTimeout(() => {
        setChatHistory(p => [...p, { role: 'ia', msg: limpiarRespuesta(res) }]);
        setIsTyping(false);
      }, 300);

    } catch (err: any) {
      console.log("Error en chat-nlp:", err);
      const duracion_ms = Date.now() - startTime;
      Analytics.chatMensaje(originalMsg, duracion_ms);
      Analytics.chatIntentDesconocido(originalMsg, duracion_ms);

      // Guardar intento fallido en chat_historial (fire-and-forget)
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (!user) return;
        const sesionId = chatSesionId || genUUID();
        if (!chatSesionId) setChatSesionId(sesionId);
        supabase.from("chat_historial").insert({
          usuario_id: user.id,
          sesion_id: sesionId,
          mensaje_usuario: originalMsg,
          respuesta_ia: err?.message?.slice(0, 500) || "Error desconocido",
          modelo_ia: "openai/gpt-oss-120b",
          proveedor_ia: "groq",
          intencion_detectada: null,
          tokens_input: null,
          tokens_output: null,
          duracion_ms,
          exito: false,
          error_mensaje: String(err?.message || err),
          contexto_financiero: null,
          metadata: null,
        }).then();
      });

      const msgErr = err?.name === "AbortError"
        ? "⏱️ El asesor tardó más de 8 segundos. Intenta de nuevo con una pregunta más corta."
        : err?.message?.includes("Groq 401")
        ? "❌ API Key inválida. Verifica la clave de Groq."
        : err?.message?.includes("Groq 429")
        ? "⏳ Límite de peticiones alcanzado. Espera unos segundos."
        : `❌ Error: ${err?.message?.slice(0, 80) || "Problema de red"}`;
      setTimeout(() => {
        setChatHistory(p => [...p, { role: 'ia', msg: msgErr }]);
        setIsTyping(false);
      }, 300);
    }
  };

  const exportarCSV = async () => {
    if (exportando) return;
    setExportando(true);
    const startTime = Date.now();
    try {
      const filtrados = movs.filter(m => {
        if (rangoFiltro === "dia") return m.fecha === diaSeleccionado;
        if (rangoFiltro === "mes") return mkey(m.fecha) === mes;
        if (rangoFiltro === "semana") {
          const now = new Date();
          const semanaAtras = new Date(now.getTime() - 7 * 86400000);
          return m.fecha && m.fecha >= toLocalDateStr(semanaAtras);
        }
        if (rangoFiltro === "trimestre") {
          const [y, mm] = mes.split("-");
          const mesNum = Number(mm);
          const mesesT = [mes, `${y}-${String(mesNum - 1 > 0 ? mesNum - 1 : 12).padStart(2, "0")}`, `${y}-${String(mesNum - 2 > 0 ? mesNum - 2 : 12).padStart(2, "0")}`];
          return mesesT.includes(mkey(m.fecha));
        }
        return true;
      });

      const ordenados = [...filtrados].sort((a, b) => {
        if (a.fecha !== b.fecha) return (b.fecha || "").localeCompare(a.fecha || "");
        const tipoA = String(a.tipo).toLowerCase() === "ingreso" ? 0 : 1;
        const tipoB = String(b.tipo).toLowerCase() === "ingreso" ? 0 : 1;
        return tipoA - tipoB;
      });

      const totIng = ordenados.filter(m => String(m.tipo).toLowerCase() === "ingreso").reduce((s, m) => s + Math.abs(Number(m.monto)), 0);
      const totGas = ordenados.filter(m => String(m.tipo).toLowerCase() === "gasto").reduce((s, m) => s + Math.abs(Number(m.monto)), 0);
      const balance = totIng - totGas;
      const tasaAhorro = totIng > 0 ? ((balance / totIng) * 100).toFixed(1) : "0";
      const periodo = rangoFiltro === "dia" ? new Date(diaSeleccionado + "T12:00:00").toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : df.mesLabel;
      const fechaGen = new Date().toLocaleDateString("es-PE");
      const horaGen = new Date().toLocaleTimeString("es-PE");

      const catsGasto: Record<string, number> = {};
      ordenados.filter(m => String(m.tipo).toLowerCase() === "gasto").forEach(m => {
        const cat = m.categoria?.nombre || "Sin categoría";
        catsGasto[cat] = (catsGasto[cat] || 0) + Math.abs(Number(m.monto));
      });
      const catsOrdenadas = Object.entries(catsGasto).sort((a, b) => b[1] - a[1]);

      const medios: Record<string, number> = {};
      ordenados.filter(m => String(m.tipo).toLowerCase() === "gasto").forEach(m => {
        const med = m.medio_pago || "Efectivo";
        medios[med] = (medios[med] || 0) + Math.abs(Number(m.monto));
      });
      const mediosOrdenados = Object.entries(medios).sort((a, b) => b[1] - a[1]);

      const top5 = catsOrdenadas.slice(0, 5);

      const filasMovimientos = ordenados.map((m, i) => {
        const tipo = String(m.tipo).toLowerCase() === "ingreso" ? "Ingreso" : "Gasto";
        const esIng = tipo === "Ingreso";
        const desc = (m.descripcion || "—").replace(/</g, "&lt;");
        const cat = (m.categoria?.nombre || "Sin categoría").replace(/</g, "&lt;");
        const medio = (m.medio_pago || "Efectivo").replace(/</g, "&lt;");
        const monto = Math.abs(Number(m.monto)).toFixed(2);
        const bg = i % 2 === 0 ? "#ffffff" : "#f8fafc";
        const tipoBg = esIng ? "#dcfce7" : "#fee2e2";
        const tipoClr = esIng ? "#15803d" : "#dc2626";
        return `<tr style="background:${bg}">
          <td style="padding:7px 10px;border:1px solid #e2e8f0;text-align:center;font-size:11px;color:#94a3b8;font-weight:700">${i + 1}</td>
          <td style="padding:7px 10px;border:1px solid #e2e8f0;font-size:11px;color:#1e293b;font-weight:600;white-space:nowrap">${m.fecha || "—"}</td>
          <td style="padding:7px 10px;border:1px solid #e2e8f0;text-align:center"><span style="background:${tipoBg};color:${tipoClr};padding:2px 8px;border-radius:10px;font-size:10px;font-weight:800">${tipo}</span></td>
          <td style="padding:7px 10px;border:1px solid #e2e8f0;font-size:11px;color:#334155;font-weight:600">${cat}</td>
          <td style="padding:7px 10px;border:1px solid #e2e8f0;font-size:11px;color:#64748b">${desc}</td>
          <td style="padding:7px 10px;border:1px solid #e2e8f0;text-align:right;font-weight:800;color:${tipoClr};font-size:12px;white-space:nowrap">${esIng ? "+" : "−"}S/ ${monto}</td>
          <td style="padding:7px 10px;border:1px solid #e2e8f0;font-size:10px;color:#64748b;font-weight:600">${medio}</td>
        </tr>`;
      }).join("");

      const filasCats = top5.map(([nombre, total], i) => {
        const pct = totGas > 0 ? ((total / totGas) * 100).toFixed(1) : "0";
        const bg = i % 2 === 0 ? "#ffffff" : "#f8fafc";
        const colores = ["#6366f1","#0ea5e9","#22c55e","#f59e0b","#ef4444"];
        const c = colores[i];
        return `<tr style="background:${bg}">
          <td style="padding:8px 10px;border:1px solid #e2e8f0;font-weight:700;color:#1e293b;font-size:11px">${nombre}</td>
          <td style="padding:8px 10px;border:1px solid #e2e8f0;text-align:right;font-weight:800;color:#1e293b;font-size:11px;white-space:nowrap">S/ ${total.toFixed(2)}</td>
          <td style="padding:8px 10px;border:1px solid #e2e8f0;text-align:center;font-size:11px;color:#64748b;font-weight:700">${pct}%</td>
          <td style="padding:8px 10px;border:1px solid #e2e8f0;width:160px">
            <div style="background:#f1f5f9;border-radius:3px;height:8px;width:100%"><div style="background:${c};border-radius:3px;height:8px;width:${pct}%"></div></div>
          </td>
        </tr>`;
      }).join("");

      const filasMedios = mediosOrdenados.map(([nombre, total], i) => {
        const pct = totGas > 0 ? ((total / totGas) * 100).toFixed(1) : "0";
        const bg = i % 2 === 0 ? "#ffffff" : "#f8fafc";
        const colores = ["#8b5cf6","#6366f1","#0ea5e9","#22c55e","#f59e0b","#ef4444"];
        const c = colores[i % colores.length];
        return `<tr style="background:${bg}">
          <td style="padding:8px 10px;border:1px solid #e2e8f0;font-weight:700;color:#1e293b;font-size:11px">${nombre}</td>
          <td style="padding:8px 10px;border:1px solid #e2e8f0;text-align:right;font-weight:800;color:#1e293b;font-size:11px;white-space:nowrap">S/ ${total.toFixed(2)}</td>
          <td style="padding:8px 10px;border:1px solid #e2e8f0;text-align:center;font-size:11px;color:#64748b;font-weight:700">${pct}%</td>
          <td style="padding:8px 10px;border:1px solid #e2e8f0;width:160px">
            <div style="background:#f1f5f9;border-radius:3px;height:8px;width:100%"><div style="background:${c};border-radius:3px;height:8px;width:${pct}%"></div></div>
          </td>
        </tr>`;
      }).join("");

      const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  @page { size: A4 landscape; margin: 8mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; background: #fff; font-size: 11px; }
  .hdr { background: linear-gradient(135deg, #312e81, #4338ca, #6366f1); padding: 20px 28px; color: #fff; display: flex; justify-content: space-between; align-items: center; border-radius: 10px; margin-bottom: 16px; }
  .hdr h1 { font-size: 18px; font-weight: 800; }
  .hdr .sub { font-size: 10px; color: rgba(255,255,255,0.7); margin-top: 2px; }
  .hdr .right { text-align: right; font-size: 10px; color: rgba(255,255,255,0.7); }
  .hdr .periodo { font-size: 14px; font-weight: 700; color: #fff; }
  .cards { display: flex; gap: 10px; margin-bottom: 16px; }
  .card { flex: 1; border-radius: 8px; padding: 12px 14px; border: 1px solid #e2e8f0; }
  .card .lbl { font-size: 8px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; margin-bottom: 4px; }
  .card .val { font-size: 16px; font-weight: 900; }
  .sec { margin-bottom: 14px; }
  .sec-title { font-size: 11px; font-weight: 800; color: #fff; padding: 5px 10px; border-radius: 4px; margin-bottom: 6px; display: inline-block; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
  th { padding: 6px 10px; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #fff; text-align: left; border: 1px solid; }
  td { font-size: 10px; }
  .ftr { margin-top: 12px; padding-top: 8px; border-top: 2px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 9px; color: #94a3b8; }
  .ftr b { color: #6366f1; }
</style></head><body>

<div class="hdr">
  <div>
    <h1>FinanzasIA</h1>
    <div class="sub">Reporte financiero personal</div>
  </div>
  <div style="text-align:center">
    <div class="periodo">${periodo}</div>
    <div class="sub">${ordenados.length} movimientos</div>
  </div>
  <div class="right">
    <div>Generado: ${fechaGen}</div>
    <div>${horaGen}</div>
  </div>
</div>

<div class="cards">
  <div class="card" style="background:#f0fdf4;border-color:#bbf7d0">
    <div class="lbl" style="color:#16a34a">Ingresos</div>
    <div class="val" style="color:#15803d">S/ ${totIng.toFixed(2)}</div>
  </div>
  <div class="card" style="background:#fef2f2;border-color:#fecaca">
    <div class="lbl" style="color:#dc2626">Gastos</div>
    <div class="val" style="color:#dc2626">S/ ${totGas.toFixed(2)}</div>
  </div>
  <div class="card" style="background:${balance >= 0 ? "#eff6ff" : "#fef2f2"};border-color:${balance >= 0 ? "#bfdbfe" : "#fecaca"}">
    <div class="lbl" style="color:${balance >= 0 ? "#6366f1" : "#ef4444"}">Balance</div>
    <div class="val" style="color:${balance >= 0 ? "#4338ca" : "#dc2626"}">${balance < 0 ? "−" : ""}S/ ${Math.abs(balance).toFixed(2)}</div>
  </div>
  <div class="card" style="background:#f5f3ff;border-color:#ddd6fe">
    <div class="lbl" style="color:#7c3aed">Ahorro</div>
    <div class="val" style="color:#7c3aed">${tasaAhorro}%</div>
  </div>
</div>

<div class="sec">
  <div class="sec-title" style="background:#4338ca">Detalle de Movimientos</div>
  <table border="1" cellpadding="6" cellspacing="0" style="border-color:#e2e8f0;">
    <thead>
      <tr style="background:#1e293b">
        <th style="text-align:center;width:30px;border-color:#334155">#</th>
        <th style="border-color:#334155">Fecha</th>
        <th style="text-align:center;border-color:#334155">Tipo</th>
        <th style="border-color:#334155">Categoría</th>
        <th style="border-color:#334155">Descripción</th>
        <th style="text-align:right;border-color:#334155">Monto</th>
        <th style="border-color:#334155">Medio</th>
      </tr>
    </thead>
    <tbody>${filasMovimientos}</tbody>
  </table>
</div>

${top5.length > 0 ? `
<div class="sec">
  <div class="sec-title" style="background:#0ea5e9">Top 5 Categorías de Gasto</div>
  <table border="1" cellpadding="6" cellspacing="0" style="border-color:#e2e8f0;">
    <thead>
      <tr style="background:#0369a1">
        <th style="border-color:#0c4a6e">Categoría</th>
        <th style="text-align:right;border-color:#0c4a6e">Monto</th>
        <th style="text-align:center;border-color:#0c4a6e">% Total</th>
        <th style="border-color:#0c4a6e">Distribución</th>
      </tr>
    </thead>
    <tbody>${filasCats}</tbody>
  </table>
</div>` : ""}

${mediosOrdenados.length > 0 ? `
<div class="sec">
  <div class="sec-title" style="background:#8b5cf6">Gastos por Medio de Pago</div>
  <table border="1" cellpadding="6" cellspacing="0" style="border-color:#e2e8f0;">
    <thead>
      <tr style="background:#5b21b6">
        <th style="border-color:#6d28d9">Medio</th>
        <th style="text-align:right;border-color:#6d28d9">Monto</th>
        <th style="text-align:center;border-color:#6d28d9">% Total</th>
        <th style="border-color:#6d28d9">Distribución</th>
      </tr>
    </thead>
    <tbody>${filasMedios}</tbody>
  </table>
</div>` : ""}

<div class="ftr">
  <div><b>FinanzasIA</b> — Inteligencia artificial para tus finanzas</div>
  <div>${fechaGen} · ${ordenados.length} registros</div>
</div>

</body></html>`;

      const nombrePeriodo = rangoFiltro === "dia" ? diaSeleccionado : mes;
      const filename = `FinanzasIA_${nombrePeriodo}.xls`;
      const file = new File(Paths.cache, filename);
      await file.write(html);
      await Sharing.shareAsync(file.uri, { mimeType: "application/vnd.ms-excel", dialogTitle: "Exportar reporte financiero" });
      const duracion_ms = Date.now() - startTime;
      Analytics.exportExcel(nombrePeriodo, ordenados.length, duracion_ms);
    } catch (e: any) {
      Alert.alert("Error", "No se pudo exportar: " + e.message);
    }
    setExportando(false);
  };

  const exportarPDF = async () => {
    if (exportando) return;
    setExportando(true);
    const startTime = Date.now();
    try {
      const fechaGen = new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' });
      const horaGen = new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
      const periodo = rangoFiltro === "dia" ? new Date(diaSeleccionado + "T12:00:00").toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : df.mesLabel;

      const topCategoriasHTML = (df.catGastos as any[]).slice(0, 5).map((c, idx) => {
        const pct = df.totGas > 0 ? ((c.total / df.totGas) * 100).toFixed(1) : '0.0';
        const barColor = ['#6366f1', '#0ea5e9', '#22c55e', '#f59e0b', '#ef4444'][idx] || '#6366f1';
        const bg = idx % 2 === 0 ? '#fff' : '#f8fafc';
        return `<tr style="background:${bg}">
          <td style="padding:9px 14px;border:1px solid #e2e8f0;font-weight:600;color:#1e293b;font-size:11px">${c.nombre}</td>
          <td style="padding:9px 14px;border:1px solid #e2e8f0;text-align:right;font-weight:800;color:#1e293b;font-size:11px;white-space:nowrap">S/ ${c.total.toFixed(2)}</td>
          <td style="padding:9px 14px;border:1px solid #e2e8f0;text-align:center;font-size:11px;color:#64748b;font-weight:700">${pct}%</td>
          <td style="padding:9px 14px;border:1px solid #e2e8f0;width:130px">
            <div style="background:#f1f5f9;border-radius:3px;height:6px;width:100%"><div style="background:${barColor};border-radius:3px;height:6px;width:${pct}%"></div></div>
          </td>
        </tr>`;
      }).join('');

      const topGastosHTML = df.top10.map((m, i) => {
        const bg = i % 2 === 0 ? '#fff' : '#f8fafc';
        return `<tr style="background:${bg}">
          <td style="padding:8px 14px;border:1px solid #e2e8f0;text-align:center;color:#94a3b8;font-weight:700;font-size:11px;width:30px">${i + 1}</td>
          <td style="padding:8px 14px;border:1px solid #e2e8f0;font-weight:600;color:#1e293b;font-size:11px">${m.descripcion || m.categoria?.nombre || 'Sin descripcion'}</td>
          <td style="padding:8px 14px;border:1px solid #e2e8f0;color:#64748b;font-size:11px;white-space:nowrap">${m.fecha}</td>
          <td style="padding:8px 14px;border:1px solid #e2e8f0;text-align:right;font-weight:800;color:#dc2626;font-size:11px;white-space:nowrap">S/ ${m.monto.toFixed(2)}</td>
        </tr>`;
      }).join('');

      const recomendacionesHTML = df.recomendaciones.length > 0
        ? df.recomendaciones.map((r, i) => `
          <div style="display:flex;gap:12px;align-items:flex-start;padding:12px 14px;background:#f8fafc;border-radius:8px;margin-bottom:6px;border-left:3px solid ${r.c}">
            <div style="width:24px;height:24px;border-radius:6px;background:${r.c};display:flex;align-items:center;justify-content:center;flex-shrink:0">
              <span style="color:#fff;font-size:11px;font-weight:800">${i + 1}</span>
            </div>
            <div>
              <div style="font-weight:700;color:#1e293b;font-size:11px;margin-bottom:2px">${r.t}</div>
              <div style="color:#64748b;font-size:10px;line-height:1.4">${r.d}</div>
            </div>
          </div>`).join('')
        : '<p style="color:#94a3b8;font-size:11px;text-align:center;padding:16px">No hay recomendaciones</p>';

      const ahorroPct = df.totIng > 0 ? ((df.ahorroTotal / df.totIng) * 100).toFixed(1) : '0.0';

      const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  @page { size: A4; margin: 10mm; }
  body { font-family: Arial, Helvetica, sans-serif; color: #1e293b; background: #fff; font-size: 10px; }
  table { border-collapse: collapse; width: 100%; }
  td, th { padding: 6px 8px; font-size: 10px; }
</style></head><body>

<!-- ENCABEZADO -->
<table style="width:100%; margin-bottom:12px;">
  <tr>
    <td style="background:#4338ca; color:#fff; padding:16px 20px; text-align:left;">
      <span style="font-size:20px; font-weight:900;">FINANZAS IA</span><br>
      <span style="font-size:10px; color:#c7d2fe;">Reporte Financiero Personal</span>
    </td>
    <td style="background:#4338ca; color:#fff; padding:16px 20px; text-align:right;">
      <span style="font-size:13px; font-weight:700;">${periodo}</span><br>
      <span style="font-size:9px; color:#c7d2fe;">${fechaGen} ${horaGen}</span>
    </td>
  </tr>
</table>

<!-- TARJETAS RESUMEN -->
<table style="width:100%; margin-bottom:14px;">
  <tr>
    <td style="background:#dcfce7; padding:10px 12px; border:1px solid #bbf7d0; text-align:center; width:33%;">
      <span style="font-size:8px; color:#16a34a; font-weight:700;">INGRESOS</span><br>
      <span style="font-size:16px; font-weight:900; color:#15803d;">S/ ${df.totIng.toFixed(2)}</span>
    </td>
    <td style="background:#fee2e2; padding:10px 12px; border:1px solid #fecaca; text-align:center; width:34%;">
      <span style="font-size:8px; color:#dc2626; font-weight:700;">GASTOS</span><br>
      <span style="font-size:16px; font-weight:900; color:#dc2626;">S/ ${df.totGas.toFixed(2)}</span>
    </td>
    <td style="background:#dbeafe; padding:10px 12px; border:1px solid #bfdbfe; text-align:center; width:33%;">
      <span style="font-size:8px; color:#2563eb; font-weight:700;">AHORRO ${ahorroPct}%</span><br>
      <span style="font-size:16px; font-weight:900; color:#1d4ed8;">${df.ahorroTotal < 0 ? "-" : ""}S/ ${Math.abs(df.ahorroTotal).toFixed(2)}</span>
    </td>
  </tr>
</table>

<!-- TOP 5 CATEGORIAS -->
<table style="width:100%; margin-bottom:14px;">
  <tr>
    <td style="background:#0369a1; color:#fff; padding:8px 12px; font-size:12px; font-weight:700;" colspan="4">
      TOP 5 CATEGORIAS DE GASTO
    </td>
  </tr>
  <tr>
    <td style="background:#0c4a6e; color:#fff; padding:5px 8px; font-size:8px; font-weight:700; text-transform:uppercase; width:30px; text-align:center;">#</td>
    <td style="background:#0c4a6e; color:#fff; padding:5px 8px; font-size:8px; font-weight:700; text-transform:uppercase;">CATEGORIA</td>
    <td style="background:#0c4a6e; color:#fff; padding:5px 8px; font-size:8px; font-weight:700; text-transform:uppercase; text-align:right; width:90px;">MONTO</td>
    <td style="background:#0c4a6e; color:#fff; padding:5px 8px; font-size:8px; font-weight:700; text-transform:uppercase; text-align:center; width:60px;">% TOTAL</td>
  </tr>
  ${(df.catGastos as any[]).slice(0, 5).map((c, idx) => {
    const pct = df.totGas > 0 ? ((c.total / df.totGas) * 100).toFixed(1) : '0.0';
    const bg = idx % 2 === 0 ? '#ffffff' : '#f0f9ff';
    return `<tr style="background:${bg};">
      <td style="text-align:center;color:#94a3b8;font-weight:700;font-size:9px;border-bottom:1px solid #e2e8f0;">${idx + 1}</td>
      <td style="font-weight:700;color:#1e293b;font-size:10px;border-bottom:1px solid #e2e8f0;">${c.nombre}</td>
      <td style="text-align:right;font-weight:700;color:#1e293b;font-size:10px;border-bottom:1px solid #e2e8f0;white-space:nowrap;">S/ ${c.total.toFixed(2)}</td>
      <td style="text-align:center;font-size:10px;color:#64748b;font-weight:700;border-bottom:1px solid #e2e8f0;">${pct}%</td>
    </tr>`;
  }).join('')}
</table>

<!-- TOP 10 GASTOS MAYORES -->
<table style="width:100%; margin-bottom:14px;">
  <tr>
    <td style="background:#991b1b; color:#fff; padding:8px 12px; font-size:12px; font-weight:700;" colspan="4">
      TOP 10 GASTOS MAYORES
    </td>
  </tr>
  <tr>
    <td style="background:#7f1d1d; color:#fff; padding:5px 8px; font-size:8px; font-weight:700; text-transform:uppercase; width:30px; text-align:center;">#</td>
    <td style="background:#7f1d1d; color:#fff; padding:5px 8px; font-size:8px; font-weight:700; text-transform:uppercase;">DESCRIPCION</td>
    <td style="background:#7f1d1d; color:#fff; padding:5px 8px; font-size:8px; font-weight:700; text-transform:uppercase; width:90px;">FECHA</td>
    <td style="background:#7f1d1d; color:#fff; padding:5px 8px; font-size:8px; font-weight:700; text-transform:uppercase; text-align:right; width:90px;">MONTO</td>
  </tr>
  ${df.top10.map((m, i) => {
    const bg = i % 2 === 0 ? '#ffffff' : '#fef2f2';
    return `<tr style="background:${bg};">
      <td style="text-align:center;color:#94a3b8;font-weight:700;font-size:9px;border-bottom:1px solid #f1f5f9;">${i + 1}</td>
      <td style="font-weight:600;color:#1e293b;font-size:10px;border-bottom:1px solid #f1f5f9;">${m.descripcion || m.categoria?.nombre || 'Sin descripcion'}</td>
      <td style="color:#64748b;font-size:10px;border-bottom:1px solid #f1f5f9;white-space:nowrap;">${m.fecha}</td>
      <td style="text-align:right;font-weight:700;color:#dc2626;font-size:10px;border-bottom:1px solid #f1f5f9;white-space:nowrap;">S/ ${m.monto.toFixed(2)}</td>
    </tr>`;
  }).join('')}
</table>

<!-- RECOMENDACIONES -->
${df.recomendaciones.length > 0 ? `
<table style="width:100%; margin-bottom:14px;">
  <tr>
    <td style="background:#22c55e; color:#fff; padding:8px 12px; font-size:12px; font-weight:700;">
      RECOMENDACIONES IA
    </td>
  </tr>
  <tr>
    <td style="padding:10px 12px; background:#f0fdf4; border:1px solid #bbf7d0;">
      ${df.recomendaciones.map((r, i) => `
        <p style="margin:0 0 6px 0;font-size:10px;color:#1e293b;"><b>${i + 1}.</b> ${r.t} — ${r.d}</p>
      `).join('')}
    </td>
  </tr>
</table>` : ''}

<!-- PIE DE PAGINA -->
<table style="width:100%; margin-top:10px;">
  <tr>
    <td style="background:#f1f5f9; padding:8px 12px; border:1px solid #e2e8f0; text-align:center;">
      <span style="font-size:9px; color:#64748b;"><b style="color:#6366f1;">FINANZAS IA</b> — Inteligencia Artificial para tus Finanzas Personales | ${fechaGen} | ${movs.length} registros</span>
    </td>
  </tr>
</table>

</body></html>`;
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: "Exportar reporte PDF" });
      const duracion_ms = Date.now() - startTime;
      Analytics.exportPDF(mes, movs.length, duracion_ms);
    } catch (e: any) {
      Alert.alert("Error", "No se pudo generar PDF: " + e.message);
    }
    setExportando(false);
  };

  if (loading) return <View style={s.center}><ActivityIndicator color="#6366f1" size="large" /></View>;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView ref={mainScrollViewRef} style={s.wrap} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.headerRow}>
          <Text style={s.title}>Reportes</Text>
        </View>

        <View style={s.actionRow}>
          <View style={s.exportGroup}>
            <TouchableOpacity style={s.exportBtn} onPress={exportarCSV} disabled={exportando}>
              <Ionicons name="document-text-outline" size={14} color="#6366f1" />
              <Text style={s.exportBtnTxt}>Excel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.exportBtn} onPress={exportarPDF} disabled={exportando}>
              <Ionicons name="document-outline" size={14} color="#ef4444" />
              <Text style={[s.exportBtnTxt, { color: "#ef4444" }]}>PDF</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={s.chatBtn} onPress={() => { setChatOpen(true); setChatSesionId(genUUID()); Analytics.chatAbierto(); }}>
            <Ionicons name="sparkles" size={16} color="#fff" />
            <Text style={s.chatBtnTxt}>Asesor IA</Text>
          </TouchableOpacity>
        </View>

        {/* Tarjeta Ahorro Total */}
        <View style={[s.ahorroCard, { backgroundColor: df.ahorroTotal >= 0 ? "#1e293b" : "#ef4444" }]}> 
          <View style={{ flex: 1 }}>
            <Text style={s.ahorroLbl}>AHORRO TOTAL ACUMULADO</Text>
            <Text style={s.ahorroVal}>{df.ahorroTotal < 0 ? '-' : ''}{money(Math.abs(df.ahorroTotal))}</Text>
            <Text style={s.ahorroSub}>Patrimonio consolidado (Histórico)</Text>
          </View>
          <Ionicons name="stats-chart" size={40} color="rgba(255,255,255,0.2)" />
        </View>

        {/* Navegación de Mes */}
        <View style={s.mesNav}>
          <TouchableOpacity onPress={() => cambiarMesReporte(-1)} style={s.mesNavBtn}>
            <Ionicons name="chevron-back" size={24} color="#6366f1" />
          </TouchableOpacity>
          <Text style={s.mesNavTxt}>{mlabel(mes)}</Text>
          <TouchableOpacity onPress={() => cambiarMesReporte(1)} style={s.mesNavBtn}>
            <Ionicons name="chevron-forward" size={24} color="#6366f1" />
          </TouchableOpacity>
        </View>

        {/* Filtros de Rango */}
        <View style={s.filtrosRango}>
          {([
            { key: "dia", label: "Día" },
            { key: "semana", label: "7 días" },
            { key: "mes", label: "Mes" },
            { key: "trimestre", label: "Trimestre" },
            { key: "todo", label: "Todo" },
          ] as const).map(f => (
            <TouchableOpacity
              key={f.key}
              style={[s.filtroRangoBtn, rangoFiltro === f.key && s.filtroRangoBtnAct]}
              onPress={() => { setRangoFiltro(f.key); Analytics.filtroAplicado(f.key); }}
            >
              <Text style={[s.filtroRangoTxt, rangoFiltro === f.key && s.filtroRangoTxtAct]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {rangoFiltro === "dia" && (
          <View style={s.diaPickerRow}>
            <TouchableOpacity style={s.diaBtn} onPress={() => {
              const d = new Date(diaSeleccionado + "T12:00:00");
              d.setDate(d.getDate() - 1);
              setDiaSeleccionado(toLocalDateStr(d));
            }}>
              <Ionicons name="chevron-back" size={20} color="#6366f1" />
            </TouchableOpacity>
            <TouchableOpacity style={s.diaInput} onPress={() => {
              const d = new Date(diaSeleccionado + "T12:00:00");
              d.setDate(d.getDate() + 1);
              setDiaSeleccionado(toLocalDateStr(d));
            }}>
              <Ionicons name="calendar" size={16} color="#6366f1" style={{ marginRight: 8 }} />
              <Text style={s.diaTxt}>{new Date(diaSeleccionado + "T12:00:00").toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.diaBtn} onPress={() => {
              const d = new Date(diaSeleccionado + "T12:00:00");
              d.setDate(d.getDate() + 1);
              setDiaSeleccionado(toLocalDateStr(d));
            }}>
              <Ionicons name="chevron-forward" size={20} color="#6366f1" />
            </TouchableOpacity>
          </View>
        )}

        {/* Gráficos Principales */}
        <GraficoResumen ingresos={df.totIng} gastos={df.totGas} ahorro={df.totIng - df.totGas} />
        <View style={s.interpCard}>
          <Text style={s.interpTxt}>
            {df.totIng > df.totGas
              ? `📈 Superávit: ${money(df.totIng - df.totGas)} (${df.totIng > 0 ? (((df.totIng - df.totGas) / df.totIng) * 100).toFixed(1) : 0}% del ingreso). Ingresos cubren gastos + ahorro.`
              : df.totGas > df.totIng
              ? `⚠️ Déficit: ${money(df.totGas - df.totIng)} (${df.totIng > 0 ? (((df.totGas - df.totIng) / df.totIng) * 100).toFixed(1) : 0}% sobre ingresos). Revisa reducir gastos.`
              : `⚖️ Equilibrado: Ingresos = Gastos. Ahorro: S/ 0. Objetivo: mínimo 20% del ingreso.`
            }
          </Text>
        </View>

        <GraficoIngresosMensuales evolMensual={df.evolMensual} />
        <View style={s.interpCard}>
          <Text style={s.interpTxt}>
            {df.evolMensual.length >= 2
              ? df.evolMensual[df.evolMensual.length - 1].ing > df.evolMensual[df.evolMensual.length - 2].ing
                ? `📈 Tus ingresos crecieron ${(((df.evolMensual[df.evolMensual.length - 1].ing - df.evolMensual[df.evolMensual.length - 2].ing) / Math.max(df.evolMensual[df.evolMensual.length - 2].ing, 1)) * 100).toFixed(0)}% respecto al mes anterior.`
                : `📉 Tus ingresos bajaron ${(((df.evolMensual[df.evolMensual.length - 2].ing - df.evolMensual[df.evolMensual.length - 1].ing) / Math.max(df.evolMensual[df.evolMensual.length - 2].ing, 1)) * 100).toFixed(0)}% respecto al mes anterior.`
              : `📊 Se necesitan al menos 2 meses de datos para ver tendencia.`
            }
          </Text>
        </View>

        {/* Gráfico Lineal Interactivo */}
        <View style={s.card}>
          <GraficoLinealInteractivo data={df.evolMensual} />
          {df.evolMensual.length >= 2 ? (
            <View style={[s.interpCard, { marginTop: 12 }]}>
              <Text style={s.interpTxt}>
                {(() => {
                  const ultimo = df.evolMensual[df.evolMensual.length - 1];
                  const anterior = df.evolMensual[df.evolMensual.length - 2];
                  const diffIng = ultimo.ing - anterior.ing;
                  const diffGas = ultimo.gas - anterior.gas;
                  const diffAhorr = (ultimo.ing - ultimo.gas) - (anterior.ing - anterior.gas);
                  const subidaIng = diffIng > 0;
                  const subidaGas = diffGas > 0;
                  const mejorAhorro = diffAhorr > 0;

                  let texto = "";
                  if (subidaIng && subidaGas) {
                    texto = `📈 Tus ingresos subieron S/ ${diffIng.toFixed(0)} pero tus gastos también subieron S/ ${diffGas.toFixed(0)}. `;
                    texto += mejorAhorro
                      ? `Aun así, tu ahorro mejoró S/ ${diffAhorr.toFixed(0)}. Mantén el ritmo.`
                      : `Tu ahorro bajó S/ ${Math.abs(diffAhorr).toFixed(0)}. Controla los gastos para aprovechar el aumento de ingreso.`;
                  } else if (subidaIng && !subidaGas) {
                    texto = `🎉 Ingresos subieron S/ ${diffIng.toFixed(0)} y gastos bajaron S/ ${Math.abs(diffGas).toFixed(0)}. `;
                    texto += `Excelente combinación: tu ahorro mejoró S/ ${diffAhorr.toFixed(0)}.`;
                  } else if (!subidaIng && subidaGas) {
                    texto = `⚠️ Ingresos bajaron S/ ${Math.abs(diffIng).toFixed(0)} y gastos subieron S/ ${diffGas.toFixed(0)}. `;
                    texto += `Tu ahorro se redujo S/ ${Math.abs(diffAhorr).toFixed(0)}. Revisa gastos no esenciales.`;
                  } else {
                    texto = `📉 Tanto ingresos (−S/ ${Math.abs(diffIng).toFixed(0)}) como gastos (−S/ ${Math.abs(diffGas).toFixed(0)}) bajaron. `;
                    texto += mejorAhorro
                      ? `Aun así, tu ahorro mejoró S/ ${diffAhorr.toFixed(0)}.`
                      : `Tu ahorro bajó S/ ${Math.abs(diffAhorr).toFixed(0)}.`;
                  }
                  return texto;
                })()}
              </Text>
            </View>
          ) : (
            <View style={[s.interpCard, { marginTop: 12 }]}>
              <Text style={s.interpTxt}>📊 Se necesitan al menos 2 meses de datos para ver la tendencia de ingresos vs gastos.</Text>
            </View>
          )}
        </View>

        {/* Coach Financiero IA */}
        <View style={s.card}>
          <Text style={s.cardTitle}>🤖 Coach Financiero IA</Text>
          {df.recomendaciones.map((r, i) => (
            <View key={i} style={[s.recRow, { borderLeftColor: r.c }]}>
              <Ionicons name={r.i as any} size={22} color={r.c} />
              <View style={{ flex: 1 }}>
                <Text style={[s.recTitle, { color: r.c }]}>{r.t}</Text>
                <Text style={s.recDesc}>{r.d}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Distribución por Categorías</Text>
          <View style={s.donutWrap}>
            {df.catGastos.slice(0, 5).map((c:any, i:number) => {
              const size = 160 - i * 28;
              return <View key={i} style={[s.donutRing, { width: size, height: size, borderColor: COLORS[i % COLORS.length], borderTopWidth: 6, borderRightWidth: 6 }]} />;
            })}
            <View style={s.donutCenter}>
              <Text style={s.donutTotal}>{money(df.totGas)}</Text>
              <Text style={s.donutLbl}>Gasto Total</Text>
            </View>
          </View>
          <View style={s.legendWrap}>
            {df.catGastos.slice(0, 5).map((c:any, i:number) => (
              <View key={i} style={s.legItem}>
                <View style={[s.legDot, { backgroundColor: COLORS[i % COLORS.length] }]} />
                <Text style={s.legTxt}>{c.nombre} {((c.total / df.totGas) * 100).toFixed(1)}% · {money(c.total)}</Text>
              </View>
            ))}
          </View>
          {(df.catGastos as any[]).length > 0 && (
            <View style={s.interpCard}>
              <Text style={s.interpTxt}>
                {(() => {
                  const top = (df.catGastos as any[])[0];
                  if (!top) return "";
                  const pct = ((top.total / df.totGas) * 100).toFixed(1);
                  const nombre = (top.nombre || "").toLowerCase();
                  let consejo = "";
                  let ahorroMes = 0;
                  let ahorroAnual = 0;
                  if (nombre.includes("comida") || nombre.includes("aliment") || nombre.includes("restaur") || nombre.includes("delivery")) {
                    ahorroMes = top.total * 0.35;
                    ahorroAnual = ahorroMes * 12;
                    consejo = `Cocinar en casa 3x/semana te ahorraría S/ ${ahorroMes.toFixed(0)}/mes (S/ ${ahorroAnual.toFixed(0)}/año). Limita delivery a 1 vez/semana.`;
                  } else if (nombre.includes("transporte") || nombre.includes("uber")) {
                    ahorroMes = top.total * 0.4;
                    ahorroAnual = ahorroMes * 12;
                    consejo = `Usar transporte público en trayectos largos te ahorraría S/ ${ahorroMes.toFixed(0)}/mes (S/ ${ahorroAnual.toFixed(0)}/año). Caminar en cortos.`;
                  } else if (nombre.includes("entretenimiento") || nombre.includes("salida")) {
                    ahorroMes = top.total * 0.3;
                    ahorroAnual = ahorroMes * 12;
                    consejo = `Reducir entretenimiento a 5% del ingreso ahorraría S/ ${ahorroMes.toFixed(0)}/mes. Busca opciones gratuitas.`;
                  } else {
                    ahorroMes = top.total * 0.25;
                    ahorroAnual = ahorroMes * 12;
                    consejo = `Reducir un 25% ahorraría S/ ${ahorroMes.toFixed(0)}/mes (S/ ${ahorroAnual.toFixed(0)}/año).`;
                  }
                  return `🏷️ "${top.nombre}" = ${pct}% de tus gastos (S/ ${top.total.toFixed(2)}). ${consejo}`;
                })()}
              </Text>
            </View>
          )}
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Intensidad de Gasto por Día</Text>
          <View style={s.heatGrid}>
            {df.heatMap.map((d, i) => {
              const maxH = Math.max(...df.heatMap.map(x=>x.total), 1);
              const intensity = d.total / maxH;
              const bg = d.total === 0 ? "#f1f5f9" : intensity < 0.3 ? "#e0e7ff" : intensity < 0.7 ? "#6366f1" : "#1e1b4b";
              return (
                <View key={i} style={[s.heatCell, { backgroundColor: bg }]}>
                  <Text style={[s.heatDay, { color: intensity > 0.5 ? "#fff" : "#94a3b8" }]}>{d.day}</Text>
                </View>
              );
            })}
          </View>
          {(() => {
            const maxDia = df.heatMap.reduce((max, d) => d.total > max.total ? d : max, { day: 0, total: 0 });
            const diasConGasto = df.heatMap.filter(d => d.total > 0).length;
            const promedioGastoDia = diasConGasto > 0 ? df.totGas / diasConGasto : 0;
            if (maxDia.total > 0) {
              return (
                <View style={s.interpCard}>
                  <Text style={s.interpTxt}>
                    {`📊 Día pico: día ${maxDia.day} con S/ ${maxDia.total.toFixed(2)} (${((maxDia.total / df.totGas) * 100).toFixed(1)}% del total). Promedio diario: S/ ${promedioGastoDia.toFixed(2)}. ${diasConGasto} de 31 días con actividad.`}
                  </Text>
                </View>
              );
            }
            return null;
          })()}
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Gastos por Medio de Pago</Text>
          {df.mediosPago.map((m, i) => {
            const pct = df.totGas > 0 ? ((m.total / df.totGas) * 100).toFixed(1) : 0;
            return (
              <Pressable key={i} style={s.payItem} onPress={() => setPressedPay(pressedPay === i ? null : i)}>
                <View style={s.payLabelRow}>
                  <Text style={s.payName}>{m.nombre}</Text>
                  <Text style={s.payVal}>{money(m.total)} ({pct}%)</Text>
                </View>
                <View style={s.payTrack}>
                  <View style={[s.payFill, { width: bar(m.total, Math.max(...df.mediosPago.map(x=>x.total), 1)), backgroundColor: COLORS[i % COLORS.length] }]} />
                </View>
                {pressedPay === i && (
                  <View style={s.payTooltip}>
                    <Text style={[s.payTooltipTxt, { color: COLORS[i % COLORS.length] }]}>
                      {pct}% del total · S/ {m.total.toFixed(2)}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
          <Text style={s.hintTxt}>Toca un medio de pago para ver porcentaje</Text>
          {df.mediosPago.length > 0 && (
            <View style={s.interpCard}>
              <Text style={s.interpTxt}>
                {(() => {
                  const top = df.mediosPago[0];
                  if (!top) return "";
                  const pct = ((top.total / df.totGas) * 100).toFixed(1);
                  return `💳 Principal: "${top.nombre}" (${pct}% = S/ ${top.total.toFixed(2)}). ${
                    top.nombre !== "Efectivo" 
                      ? "Verifica si acumulas beneficios (millas, puntos, cashback). Usa tarjetas con beneficios para maximizar retorno." 
                      : "Considera usar medios digitales para trazabilidad y beneficios."}`;
                })()}
              </Text>
            </View>
          )}
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Tendencia de Ahorro Neto</Text>
          <View style={s.trendChart}>
            {df.evolMensual.map((e, i) => (
              <Pressable key={i} style={s.trendCol} onPress={() => setPressedTrend(pressedTrend === i ? null : i)}>
                <Text style={[s.trendValMini, { color: e.ahorro >= 0 ? "#22c55e" : "#ef4444" }]}>
                  {e.ahorro >= 0 ? "+" : ""}{Math.round(e.ahorro)}
                </Text>
                <View style={s.trendBarContainer}>
                  <View style={[s.trendBar, { height: bar(Math.abs(e.ahorro), Math.max(...df.evolMensual.map(x=>Math.abs(x.ahorro)), 1)), backgroundColor: e.ahorro >= 0 ? "#22c55e" : "#ef4444" }]} />
                </View>
                <Text style={s.labelMini}>{mlabelMini(e.labelKey)}</Text>
                {pressedTrend === i && (
                  <View style={s.trendTooltip}>
                    <Text style={[s.trendTooltipTxt, { color: e.ahorro >= 0 ? "#22c55e" : "#ef4444" }]}>
                      {e.ahorro >= 0 ? "+" : ""}S/ {e.ahorro.toFixed(0)}
                    </Text>
                    <Text style={s.trendTooltipSub}>
                      {e.ing > 0 ? ((e.ahorro / e.ing) * 100).toFixed(1) : 0}% del ingreso
                    </Text>
                  </View>
                )}
              </Pressable>
            ))}
          </View>
          <Text style={s.hintTxt}>Toca una barra para ver detalles</Text>
          {df.evolMensual.length > 0 && (
            <View style={s.interpCard}>
              <Text style={s.interpTxt}>
                {(() => {
                  const ultimo = df.evolMensual[df.evolMensual.length - 1];
                  const positivos = df.evolMensual.filter(e => e.ahorro >= 0).length;
                  const total = df.evolMensual.length;
                  const ahorroPromedio = df.evolMensual.reduce((s, e) => s + e.ahorro, 0) / total;
                  const pctPositivos = ((positivos / total) * 100).toFixed(0);
                  return ultimo.ahorro >= 0
                    ? `🐷 Ahorro actual: ${money(ultimo.ahorro)} (${((ultimo.ahorro / (ultimo.ing || 1)) * 100).toFixed(1)}% del ingreso). Promedio: ${money(ahorroPromedio)}/mes. ${positivos}/${total} meses positivos (${pctPositivos}%).`
                    : `⚠️ Déficit: ${money(Math.abs(ultimo.ahorro))}. Promedio histórico: ${money(ahorroPromedio)}/mes. Solo ${positivos}/${total} meses positivos (${pctPositivos}%).`;
                })()}
              </Text>
            </View>
          )}
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Hábitos de Gasto Semanal</Text>
          <View style={s.weekChart}>
            {df.diaSemana.map((d, i) => {
              const totalSem = df.diaSemana.reduce((s, x) => s + x.total, 0);
              const pctSem = totalSem > 0 ? ((d.total / totalSem) * 100).toFixed(1) : "0";
              return (
                <Pressable key={i} style={s.weekCol} onPress={() => setPressedWeek(pressedWeek === i ? null : i)}>
                  <View style={s.weekTrack}>
                    <View style={[s.weekFill, { height: bar(d.total, Math.max(...df.diaSemana.map(x=>x.total), 1)) }]} />
                  </View>
                  <Text style={s.labelMini}>{d.label}</Text>
                  {pressedWeek === i && d.total > 0 && (
                    <View style={s.weekTooltip}>
                      <Text style={s.weekTooltipTxt}>{pctSem}%</Text>
                      <Text style={s.weekTooltipVal}>S/ {d.total.toFixed(0)}</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
          <Text style={s.hintTxt}>Toca un día para ver porcentaje</Text>
          {(() => {
            const maxD = df.diaSemana.reduce((max, d) => d.total > max.total ? d : max, { label: '', total: 0 });
            const minD = df.diaSemana.reduce((min, d) => (d.total < min.total && d.total > 0) ? d : min, { label: '', total: Infinity });
            const totalSem = df.diaSemana.reduce((s, d) => s + d.total, 0);
            if (maxD.total > 0) {
              const pctMax = ((maxD.total / totalSem) * 100).toFixed(1);
              return (
                <View style={s.interpCard}>
                  <Text style={s.interpTxt}>
                    {`📅 Pico: ${maxD.label} = S/ ${maxD.total.toFixed(2)} (${pctMax}% semanal). ${
                      minD.total < Infinity 
                        ? `Mínimo: ${minD.label} = S/ ${minD.total.toFixed(2)}. Diferencia: S/ ${(maxD.total - minD.total).toFixed(2)}. ` 
                        : ""
                    }Promedio diario: S/ ${(totalSem / 7).toFixed(2)}. Planifica compras en días de menor gasto.`}
                  </Text>
                </View>
              );
            }
            return null;
          })()}
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Evolución Ingresos vs Gastos</Text>
          <View style={s.evolChart}>
            {df.evolMensual.map((e, i) => {
              const maxVal = Math.max(...df.evolMensual.map(x => Math.max(x.ing, x.gas)), 1);
              const pctIng = df.totIng > 0 ? ((e.ing / df.totIng) * 100).toFixed(1) : "0";
              const pctGas = df.totIng > 0 ? ((e.gas / df.totIng) * 100).toFixed(1) : "0";
              const ratio = e.gas > 0 ? ((e.ing / e.gas) * 100).toFixed(0) : "∞";
              return (
                <Pressable key={i} style={s.evolCol} onPress={() => setPressedEvol(pressedEvol === i ? null : i)}>
                  <View style={s.evolPair}>
                    <View style={s.evolTrack}><View style={[s.evolFill, { height: bar(e.ing, maxVal), backgroundColor: "#22c55e" }]} /></View>
                    <View style={s.evolTrack}><View style={[s.evolFill, { height: bar(e.gas, maxVal), backgroundColor: "#ef4444" }]} /></View>
                  </View>
                  <Text style={s.labelMini}>{e.label}</Text>
                  {pressedEvol === i && (
                    <View style={s.evolTooltip}>
                      <Text style={[s.evolTooltipTxt, { color: "#22c55e" }]}>↑ {pctIng}% · S/ {e.ing.toFixed(0)}</Text>
                      <Text style={[s.evolTooltipTxt, { color: "#ef4444" }]}>↓ {pctGas}% · S/ {e.gas.toFixed(0)}</Text>
                      <Text style={[s.evolTooltipRatio, { color: e.ing >= e.gas ? "#22c55e" : "#ef4444" }]}>
                        Ratio: {ratio}%
                      </Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
          <View style={[s.legendWrap, { marginTop: 12 }]}>
            <View style={s.legItem}><View style={[s.legDot, { backgroundColor: "#22c55e" }]} /><Text style={s.legTxt}>Ingresos</Text></View>
            <View style={s.legItem}><View style={[s.legDot, { backgroundColor: "#ef4444" }]} /><Text style={s.legTxt}>Gastos</Text></View>
          </View>
          <Text style={s.hintTxt}>Toca una columna para ver porcentajes</Text>
          {df.evolMensual.length > 0 && (
            <View style={s.interpCard}>
              <Text style={s.interpTxt}>
                {(() => {
                  const ultimo = df.evolMensual[df.evolMensual.length - 1];
                  const ratio = ultimo.gas > 0 ? ((ultimo.ing / ultimo.gas) * 100).toFixed(0) : "∞";
                  const estado = ultimo.ing > ultimo.gas ? "Superávit" : ultimo.ing < ultimo.gas ? "Déficit" : "Equilibrado";
                  return `⚖️ ${estado}: Ingresos ${ratio}% de gastos. Ratio ideal: >100%. ${
                    ultimo.ing > ultimo.gas 
                      ? `Excedente: S/ ${(ultimo.ing - ultimo.gas).toFixed(2)}/mes para ahorrar/invertir.` 
                      : `Déficit: S/ ${(ultimo.gas - ultimo.ing).toFixed(2)}/mes que debes cubrir.`}`;
                })()}
              </Text>
            </View>
          )}
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Top 10 Gastos Mayores</Text>
          {df.top10.length === 0 ? <Text style={s.empty}>Sin gastos este mes</Text> : df.top10.map((m, i) => (
            <View key={m.id} style={s.topItem}>
              <View style={s.topIdx}><Text style={s.topIdxTxt}>{i + 1}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={s.topDesc} numberOfLines={1}>{m.descripcion || m.categoria?.nombre}</Text>
                <Text style={s.topSub}>{m.fecha} · {m.categoria?.nombre}</Text>
              </View>
              <Text style={s.topAmt}>-{money(m.monto)}</Text>
            </View>
          ))}
        </View>

        {/* Resumen Ejecutivo */}
        <View style={s.card}>
          <Text style={s.cardTitle}>📊 Resumen Ejecutivo</Text>
          <View style={{ gap: 12 }}>
            <View style={[s.execRow, { backgroundColor: "#f0fdf4" }]}>
              <Ionicons name="trending-up" size={20} color="#22c55e" />
              <View style={{ flex: 1 }}>
                <Text style={s.execLabel}>Ingresos</Text>
                <Text style={[s.execVal, { color: "#22c55e" }]}>{money(df.totIng)}</Text>
              </View>
              <Text style={[s.execPct, { color: "#22c55e" }]}>100%</Text>
            </View>
            <View style={[s.execRow, { backgroundColor: "#fef2f2" }]}>
              <Ionicons name="trending-down" size={20} color="#ef4444" />
              <View style={{ flex: 1 }}>
                <Text style={s.execLabel}>Gastos</Text>
                <Text style={[s.execVal, { color: "#ef4444" }]}>{money(df.totGas)}</Text>
              </View>
              <Text style={[s.execPct, { color: "#ef4444" }]}>{df.totIng > 0 ? ((df.totGas / df.totIng) * 100).toFixed(1) : 0}%</Text>
            </View>
            <View style={[s.execRow, { backgroundColor: df.totIng - df.totGas >= 0 ? "#eff6ff" : "#fef3c7" }]}>
              <Ionicons name={df.totIng - df.totGas >= 0 ? "wallet" : "warning"} size={20} color={df.totIng - df.totGas >= 0 ? "#6366f1" : "#f59e0b"} />
              <View style={{ flex: 1 }}>
                <Text style={s.execLabel}>Ahorro Neto</Text>
                <Text style={[s.execVal, { color: df.totIng - df.totGas >= 0 ? "#6366f1" : "#f59e0b" }]}>
                  {df.totIng - df.totGas < 0 ? "-" : ""}{money(Math.abs(df.totIng - df.totGas))}
                </Text>
              </View>
              <Text style={[s.execPct, { color: df.totIng - df.totGas >= 0 ? "#6366f1" : "#f59e0b" }]}>
                {df.totIng > 0 ? (((df.totIng - df.totGas) / df.totIng) * 100).toFixed(1) : 0}%
              </Text>
            </View>
            <View style={[s.execRow, { backgroundColor: "#f5f3ff" }]}>
              <Ionicons name="shield-checkmark" size={20} color="#8b5cf6" />
              <View style={{ flex: 1 }}>
                <Text style={s.execLabel}>Fondo Emergencia</Text>
                <Text style={[s.execVal, { color: "#8b5cf6" }]}>{money(df.ahorroTotal)}</Text>
              </View>
              <Text style={[s.execPct, { color: "#8b5cf6" }]}>
                {df.totGas > 0 ? ((df.ahorroTotal / (df.totGas * 3)) * 100).toFixed(0) : 0}% meta
              </Text>
            </View>
          </View>
          <View style={s.interpCard}>
            <Text style={s.interpTxt}>
              {(() => {
                const ahorroPct = df.totIng > 0 ? ((df.totIng - df.totGas) / df.totIng * 100) : 0;
                const fondoMeses = df.totGas > 0 ? (df.ahorroTotal / df.totGas).toFixed(1) : "0";
                if (ahorroPct >= 20) return `✅ Excelente: Ahorras ${ahorroPct.toFixed(1)}% (meta: 20%). Fondo cubre ${fondoMeses} meses de gastos.`;
                if (ahorroPct >= 10) return `⚡ Bueno: Ahorras ${ahorroPct.toFixed(1)}%. Sube a 20% automatizando transferencias el día de pago.`;
                return `⚠️ Ahorras ${ahorroPct.toFixed(1)}%. Objetivo: 20%. Fondo cubre ${fondoMeses} meses (ideal: 3-6 meses).`;
              })()}
            </Text>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <Modal visible={chatOpen} animationType="slide" transparent>
        <View style={s.chatOverlay}>
          <View style={s.chatContainer}>
            <View style={s.chatHeader}>
              <Text style={s.chatTitle}>Asesor Financiero IA</Text>
              <TouchableOpacity onPress={() => setChatOpen(false)}>
                <Ionicons name="close-circle" size={32} color="#6366f1" />
              </TouchableOpacity>
            </View>
            <ScrollView ref={scrollViewRef} style={s.chatHistory} showsVerticalScrollIndicator={false} onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}>
              {chatHistory.map((h, i) => (
                <View key={i} style={[s.msgBubble, h.role === 'user' ? s.userMsg : s.iaMsg]}>
                  <Text style={[s.msgText, h.role === 'user' ? s.userTxt : s.iaTxt]}>{h.msg}</Text>
                </View>
              ))}
              {isTyping && <View style={[s.msgBubble, s.iaMsg]}><ActivityIndicator size="small" color="#6366f1" /></View>}
            </ScrollView>
            <View style={s.chatInputWrap}>
              <TextInput style={s.chatInput} value={chatMsg} onChangeText={setChatMsg} placeholder="Escribe: recomendaciones, ¿cuánto gasté?" placeholderTextColor="#94a3b8" onSubmitEditing={handleChat} />
              <TouchableOpacity style={s.sendBtn} onPress={handleChat}><Ionicons name="send" size={20} color="#fff" /></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: "#f8fafc" },
  content: { padding: 24, paddingTop: 60 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  title: { fontSize: 28, fontWeight: "900", color: "#1e293b" },
  actionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  exportGroup: { flexDirection: "row", gap: 8 },
  exportBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#f1f5f9", paddingHorizontal: 12, paddingVertical: 10, borderRadius: 16, borderWidth: 1, borderColor: "#e2e8f0" },
  exportBtnTxt: { color: "#6366f1", fontSize: 12, fontWeight: "800" },
  chatBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#1e293b", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16 },
  chatBtnTxt: { color: "#fff", fontSize: 13, fontWeight: "800" },
  filtrosRango: { flexDirection: "row", gap: 6, marginBottom: 12, backgroundColor: "#fff", borderRadius: 16, padding: 4, shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
  diaPickerRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 20, marginHorizontal: 4 },
  diaBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  diaInput: { flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 14, paddingVertical: 12, paddingHorizontal: 16, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  diaTxt: { fontSize: 13, fontWeight: "700", color: "#1e293b", flex: 1 },
  filtroRangoBtn: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 12 },
  filtroRangoBtnAct: { backgroundColor: "#6366f1" },
  filtroRangoTxt: { fontSize: 12, fontWeight: "700", color: "#64748b" },
  filtroRangoTxtAct: { color: "#fff" },
  ahorroCard: { borderRadius: 32, padding: 24, marginBottom: 20, flexDirection: "row", alignItems: "center", shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  ahorroLbl: { fontSize: 10, color: "rgba(255,255,255,0.7)", fontWeight: "800", letterSpacing: 1.5 },
  ahorroVal: { fontSize: 34, fontWeight: "900", color: "#fff", marginVertical: 6 },
  ahorroSub: { fontSize: 11, color: "rgba(255,255,255,0.5)" },
  card: { backgroundColor: "#fff", borderRadius: 32, padding: 24, marginBottom: 20, shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 15, elevation: 3 },
  cardTitle: { fontSize: 16, fontWeight: "800", color: "#1e293b", marginBottom: 20 },
  mesNav: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24, paddingHorizontal: 8 },
  mesNavBtn: { padding: 12, backgroundColor: "#fff", borderRadius: 16, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  mesNavTxt: { fontSize: 16, fontWeight: "800", color: "#1e293b", textTransform: "uppercase", letterSpacing: 1 },
  recRow: { flexDirection: "row", gap: 16, padding: 16, backgroundColor: "#f8fafa", borderRadius: 20, marginBottom: 12, borderLeftWidth: 4 },
  recTitle: { fontSize: 14, fontWeight: "900" },
  recDesc: { fontSize: 13, color: "#64748b", marginTop: 2, lineHeight: 18 },
  donutWrap: { height: 180, alignItems: "center", justifyContent: "center" },
  donutRing: { position: "absolute", borderRadius: 100, borderLeftWidth: 0, borderBottomWidth: 0, transform: [{ rotate: "45deg" }] },
  donutCenter: { alignItems: "center" },
  donutTotal: { fontSize: 20, fontWeight: "900", color: "#1e293b" },
  donutLbl: { fontSize: 12, color: "#94a3b8" },
  legendWrap: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 12, marginTop: 20 },
  legItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legDot: { width: 8, height: 8, borderRadius: 4 },
  legTxt: { fontSize: 11, fontWeight: "700", color: "#64748b" },
  heatGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  heatCell: { width: 34, height: 34, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  heatDay: { fontSize: 10, fontWeight: "700" },
  payItem: { marginBottom: 16 },
  payLabelRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  payName: { fontSize: 13, fontWeight: "700", color: "#64748b" },
  payVal: { fontSize: 13, fontWeight: "800", color: "#1e293b" },
  payTrack: { height: 8, backgroundColor: "#f1f5f9", borderRadius: 4, overflow: "hidden" },
  payFill: { height: "100%", borderRadius: 4 },
  trendChart: { flexDirection: "row", height: 130, gap: 10, alignItems: "flex-end", justifyContent: "space-between" },
  trendCol: { alignItems: "center", flex: 1 },
  trendBarContainer: { height: 70, width: "100%", justifyContent: "flex-end" },
  trendBar: { width: "100%", borderRadius: 4 },
  trendValMini: { fontSize: 9, fontWeight: "900", marginBottom: 4 },
  weekChart: { flexDirection: "row", height: 100, gap: 12, alignItems: "flex-end", justifyContent: "space-between" },
  weekCol: { alignItems: "center" },
  weekTrack: { width: 26, height: 80, backgroundColor: "#f1f5f9", borderRadius: 8, justifyContent: "flex-end", overflow: "hidden" },
  weekFill: { backgroundColor: "#6366f1", borderRadius: 6 },
  labelMini: { fontSize: 9, color: "#94a3b8", marginTop: 8, fontWeight: "700" },
  evolChart: { flexDirection: "row", height: 120, gap: 10, alignItems: "flex-end" },
  evolCol: { flex: 1, alignItems: "center" },
  evolPair: { flexDirection: "row", gap: 3, height: 90, alignItems: "flex-end" },
  evolTrack: { width: 10, height: 90, backgroundColor: "#f1f5f9", borderRadius: 4, overflow: "hidden", justifyContent: "flex-end" },
  evolFill: { width: "100%", borderRadius: 2 },
  topItem: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  topIdx: { width: 28, height: 28, borderRadius: 8, backgroundColor: "#f1f5f9", alignItems: "center", justifyContent: "center" },
  topIdxTxt: { fontSize: 12, fontWeight: "800", color: "#64748b" },
  topDesc: { fontSize: 14, fontWeight: "700", color: "#1e293b" },
  topSub: { fontSize: 11, color: "#94a3b8", marginTop: 2 },
  topAmt: { fontSize: 14, fontWeight: "900", color: "#ef4444" },
  empty: { color: "#94a3b8", fontSize: 14, textAlign: "center", paddingVertical: 20 },
  interpCard: { backgroundColor: "#f0f9ff", borderRadius: 16, padding: 16, marginTop: 12, marginBottom: 24, marginHorizontal: 4, borderWidth: 1, borderColor: "#bae6fd" },
  interpTxt: { fontSize: 13, color: "#0369a1", lineHeight: 20, fontWeight: "600" },
  execRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 16 },
  execLabel: { fontSize: 12, fontWeight: "700", color: "#64748b" },
  execVal: { fontSize: 18, fontWeight: "900", marginTop: 2 },
  execPct: { fontSize: 14, fontWeight: "800" },
  chatOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  chatContainer: { backgroundColor: "#fff", borderTopLeftRadius: 36, borderTopRightRadius: 36, height: "80%", padding: 24 },
  chatHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  chatTitle: { fontSize: 22, fontWeight: "900", color: "#1e293b" },
  chatHistory: { flex: 1, marginBottom: 20 },
  msgBubble: { padding: 16, borderRadius: 24, marginBottom: 12, maxWidth: "85%" },
  userMsg: { alignSelf: "flex-end", backgroundColor: "#6366f1" },
  iaMsg: { alignSelf: "flex-start", backgroundColor: "#f1f5f9" },
  msgText: { fontSize: 15, lineHeight: 22 },
  userTxt: { color: "#fff" },
  iaTxt: { color: "#1e293b" },
  chatInputWrap: { flexDirection: "row", gap: 12, alignItems: "center", borderTopWidth: 1, borderTopColor: "#f1f5f9", paddingTop: 15 },
  chatInput: { flex: 1, backgroundColor: "#f8fafc", borderRadius: 20, padding: 16, fontSize: 15, borderWidth: 1, borderColor: "#e2e8f0" },
  sendBtn: { backgroundColor: "#6366f1", width: 54, height: 54, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  hintTxt: { fontSize: 11, color: "#cbd5e1", textAlign: "center", marginTop: 12, fontWeight: "600" },
  evolTooltip: { backgroundColor: "#f8fafc", borderRadius: 10, padding: 8, marginTop: 6, borderWidth: 1, borderColor: "#e2e8f0" },
  evolTooltipTxt: { fontSize: 11, fontWeight: "800", lineHeight: 16 },
  evolTooltipRatio: { fontSize: 12, fontWeight: "900", marginTop: 4 },
  weekTooltip: { backgroundColor: "#f8fafc", borderRadius: 8, padding: 6, marginTop: 4, alignItems: "center", borderWidth: 1, borderColor: "#e2e8f0" },
  weekTooltipTxt: { fontSize: 11, fontWeight: "900", color: "#6366f1" },
  weekTooltipVal: { fontSize: 10, fontWeight: "700", color: "#64748b" },
  trendTooltip: { backgroundColor: "#f8fafc", borderRadius: 8, padding: 6, marginTop: 4, alignItems: "center", borderWidth: 1, borderColor: "#e2e8f0" },
  trendTooltipTxt: { fontSize: 11, fontWeight: "900" },
  trendTooltipSub: { fontSize: 10, fontWeight: "700", color: "#64748b" },
  payTooltip: { backgroundColor: "#f8fafc", borderRadius: 8, padding: 8, marginTop: 6, borderWidth: 1, borderColor: "#e2e8f0" },
  payTooltipTxt: { fontSize: 12, fontWeight: "800" },
});
