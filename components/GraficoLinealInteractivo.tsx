import { useState } from "react";
import { View, Text, Dimensions } from "react-native";
import Svg, { Path, Circle, Text as SvgText, Defs, LinearGradient, Stop, Line, G, Rect } from "react-native-svg";

type Punto = { label: string; labelKey: string; ing: number; gas: number };

const SCREEN_W = Dimensions.get("window").width;

export default function GraficoLinealInteractivo({ data }: { data: Punto[] }) {
  const [pressedIdx, setPressedIdx] = useState<number | null>(null);

  // Responsive: card padding 20*2 + scrollView padding 24*2 = 88
  const W = Math.min(SCREEN_W - 88, 340);
  const H = 220;
  const PAD_T = 25;
  const PAD_B = 32;
  const PAD_L = 44;
  const PAD_R = 12;
  const cW = W - PAD_L - PAD_R;
  const cH = H - PAD_T - PAD_B;

  const safeData = data.length === 1 ? [data[0], data[0]] : data;
  const n = safeData.length;

  const allV = safeData.flatMap(d => [d.ing, d.gas]);
  const mx = Math.max(...allV, 1) * 1.15;

  const gX = (i: number) => PAD_L + (n <= 1 ? cW / 2 : (i / (n - 1)) * cW);
  const gY = (v: number) => PAD_T + cH - (v / mx) * cH;

  const mkPath = (vals: number[]) => {
    const pts = vals.map((v, i) => ({ x: gX(i), y: gY(v) }));
    if (pts.length < 2) return "";
    let d = `M ${pts[0].x},${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i], p1 = pts[i + 1];
      d += ` C ${p0.x + (p1.x - p0.x) * 0.35},${p0.y} ${p1.x - (p1.x - p0.x) * 0.35},${p1.y} ${p1.x},${p1.y}`;
    }
    return d;
  };

  const iVals = safeData.map(d => d.ing);
  const gVals = safeData.map(d => d.gas);
  const pI = mkPath(iVals);
  const pG = mkPath(gVals);

  const mkFill = (p: string) => `${p} L ${gX(n - 1)},${PAD_T + cH} L ${gX(0)},${PAD_T + cH} Z`;

  const grd = [0, 0.25, 0.5, 0.75, 1].map(p => p * mx);
  const fmt = (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : Math.round(v).toString();

  const p = pressedIdx !== null ? safeData[pressedIdx] : null;
  const diff = p ? p.ing - p.gas : 0;
  const pctA = p && p.ing > 0 ? ((diff / p.ing) * 100).toFixed(1) : "0";

  const onSvgPress = (evt: any) => {
    const lx = evt.nativeEvent.locationX;
    const rel = lx - PAD_L;
    if (rel < -5 || rel > cW + 5) { setPressedIdx(null); return; }
    const idx = Math.round((rel / cW) * (n - 1));
    const c = Math.max(0, Math.min(idx, n - 1));
    setPressedIdx(pressedIdx === c ? null : c);
  };

  if (data.length === 0) {
    return (
      <View>
        <Text style={{ fontSize: 14, fontWeight: "900", color: "#1e293b", marginBottom: 4 }}>Tendencia Ingresos vs Gastos</Text>
        <Text style={{ color: "#94a3b8", fontSize: 13, textAlign: "center", paddingVertical: 20 }}>Sin datos disponibles</Text>
      </View>
    );
  }

  return (
    <View>
      <Text style={{ fontSize: 14, fontWeight: "900", color: "#1e293b", marginBottom: 4 }}>Tendencia Ingresos vs Gastos</Text>
      <Text style={{ fontSize: 11, color: "#94a3b8", marginBottom: 12, fontWeight: "600" }}>Toca un punto para ver detalles</Text>

      <View onStartShouldSetResponder={() => true} onResponderRelease={(e) => onSvgPress(e)} style={{ alignItems: "center" }}>
        <Svg width={W} height={H}>
          <Defs>
            <LinearGradient id="fIng" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#22c55e" stopOpacity="0.35" />
              <Stop offset="100%" stopColor="#22c55e" stopOpacity="0.03" />
            </LinearGradient>
            <LinearGradient id="fGas" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" />
              <Stop offset="100%" stopColor="#ef4444" stopOpacity="0.03" />
            </LinearGradient>
          </Defs>

          {grd.map((gv, i) => (
            <G key={i}>
              <Line x1={PAD_L} y1={gY(gv)} x2={W - PAD_R} y2={gY(gv)} stroke="#f1f5f9" strokeWidth="1" />
              <SvgText x={PAD_L - 6} y={gY(gv) + 3} fontSize="9" fontWeight="bold" fill="#b0b8c4" textAnchor="end">{fmt(gv)}</SvgText>
            </G>
          ))}

          <Line x1={PAD_L} y1={PAD_T + cH} x2={W - PAD_R} y2={PAD_T + cH} stroke="#e2e8f0" strokeWidth="1" />

          {pressedIdx !== null && (
            <Line x1={gX(pressedIdx)} y1={PAD_T} x2={gX(pressedIdx)} y2={PAD_T + cH} stroke="#cbd5e1" strokeWidth="1" strokeDasharray="4,3" />
          )}

          <Path d={mkFill(pI)} fill="url(#fIng)" />
          <Path d={mkFill(pG)} fill="url(#fGas)" />

          <Path d={pI} fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <Path d={pG} fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {iVals.map((v, i) => {
            const cx = gX(i), cy = gY(v), act = pressedIdx === i;
            return (
              <G key={`i${i}`}>
                {act && <Circle cx={cx} cy={cy} r="12" fill="#22c55e" opacity="0.12" />}
                <Circle cx={cx} cy={cy} r={act ? "6" : "3.5"} fill="#fff" stroke="#22c55e" strokeWidth={act ? "2.5" : "2"} />
                <Circle cx={cx} cy={cy} r={act ? "3" : "1.5"} fill="#22c55e" />
              </G>
            );
          })}

          {gVals.map((v, i) => {
            const cx = gX(i), cy = gY(v), act = pressedIdx === i;
            return (
              <G key={`g${i}`}>
                {act && <Circle cx={cx} cy={cy} r="12" fill="#ef4444" opacity="0.12" />}
                <Circle cx={cx} cy={cy} r={act ? "6" : "3.5"} fill="#fff" stroke="#ef4444" strokeWidth={act ? "2.5" : "2"} />
                <Circle cx={cx} cy={cy} r={act ? "3" : "1.5"} fill="#ef4444" />
              </G>
            );
          })}

          {pressedIdx !== null && iVals[pressedIdx] !== undefined && (
            <G>
              <Rect x={gX(pressedIdx) - 36} y={gY(iVals[pressedIdx]) - 28} width="72" height="20" rx="10" fill="#16a34a" />
              <SvgText x={gX(pressedIdx)} y={gY(iVals[pressedIdx]) - 14} fontSize="10" fontWeight="800" fill="#fff" textAnchor="middle">
                S/ {iVals[pressedIdx].toFixed(0)}
              </SvgText>
            </G>
          )}
          {pressedIdx !== null && gVals[pressedIdx] !== undefined && (
            <G>
              <Rect x={gX(pressedIdx) - 36} y={gY(gVals[pressedIdx]) + 8} width="72" height="20" rx="10" fill="#dc2626" />
              <SvgText x={gX(pressedIdx)} y={gY(gVals[pressedIdx]) + 22} fontSize="10" fontWeight="800" fill="#fff" textAnchor="middle">
                S/ {gVals[pressedIdx].toFixed(0)}
              </SvgText>
            </G>
          )}

          {safeData.map((d, i) => {
            const show = n <= 6 || i === 0 || i === n - 1 || i % Math.ceil(n / 6) === 0 || pressedIdx === i;
            if (!show) return null;
            return (
              <SvgText key={i} x={gX(i)} y={H - 6} fontSize={pressedIdx === i ? "10" : "9"}
                fontWeight={pressedIdx === i ? "800" : "bold"} fill={pressedIdx === i ? "#1e293b" : "#94a3b8"} textAnchor="middle">
                {d.label}
              </SvgText>
            );
          })}
        </Svg>
      </View>

      <View style={{ flexDirection: "row", justifyContent: "center", gap: 24, marginTop: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <View style={{ width: 18, height: 4, borderRadius: 2, backgroundColor: "#22c55e" }} />
          <Text style={{ fontSize: 12, fontWeight: "700", color: "#64748b" }}>Ingresos</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <View style={{ width: 18, height: 4, borderRadius: 2, backgroundColor: "#ef4444" }} />
          <Text style={{ fontSize: 12, fontWeight: "700", color: "#64748b" }}>Gastos</Text>
        </View>
      </View>

      {p && (
        <View style={{ marginTop: 12, backgroundColor: "#f8fafc", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#e2e8f0" }}>
          <Text style={{ fontSize: 13, fontWeight: "800", color: "#1e293b", marginBottom: 10 }}>{p.label}</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={{ flex: 1, backgroundColor: "#f0fdf4", borderRadius: 10, padding: 10, alignItems: "center" }}>
              <Text style={{ fontSize: 9, fontWeight: "700", color: "#16a34a", letterSpacing: 0.5 }}>INGRESOS</Text>
              <Text style={{ fontSize: 16, fontWeight: "900", color: "#16a34a", marginTop: 4 }}>S/ {p.ing.toFixed(2)}</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: "#fef2f2", borderRadius: 10, padding: 10, alignItems: "center" }}>
              <Text style={{ fontSize: 9, fontWeight: "700", color: "#dc2626", letterSpacing: 0.5 }}>GASTOS</Text>
              <Text style={{ fontSize: 16, fontWeight: "900", color: "#dc2626", marginTop: 4 }}>S/ {p.gas.toFixed(2)}</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: diff >= 0 ? "#eff6ff" : "#fefce8", borderRadius: 10, padding: 10, alignItems: "center" }}>
              <Text style={{ fontSize: 9, fontWeight: "700", color: diff >= 0 ? "#6366f1" : "#ca8a04", letterSpacing: 0.5 }}>AHORRO</Text>
              <Text style={{ fontSize: 16, fontWeight: "900", color: diff >= 0 ? "#6366f1" : "#ca8a04", marginTop: 4 }}>
                {diff < 0 ? "-" : ""}S/ {Math.abs(diff).toFixed(2)}
              </Text>
            </View>
          </View>
          <View style={{ marginTop: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontSize: 11, color: "#64748b", fontWeight: "600" }}>
              {diff >= 0 ? `Ahorro del ${pctA}%` : `Déficit del ${Math.abs(Number(pctA))}%`}
            </Text>
            <View style={{ backgroundColor: diff >= 0 ? "#dcfce7" : "#fef2f2", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
              <Text style={{ fontSize: 10, fontWeight: "800", color: diff >= 0 ? "#16a34a" : "#dc2626" }}>
                {diff >= 0 ? "▲ Superávit" : "▼ Déficit"}
              </Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
