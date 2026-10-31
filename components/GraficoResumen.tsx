import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface Props {
  ingresos: number;
  gastos: number;
  ahorro: number;
}

export default function GraficoResumen({ ingresos, gastos, ahorro }: Props) {
  const [pressedBar, setPressedBar] = useState<string | null>(null);
  const total = ingresos + gastos + Math.abs(ahorro);
  const getWidth = (val: number): any => {
    if (total === 0) return "0%";
    return `${Math.max(10, (val / total) * 100)}%`;
  };

  const money = (v: number) =>
    `S/ ${v.toLocaleString("es-PE", { minimumFractionDigits: 2 })}`;

  const pct = (val: number) =>
    total > 0 ? ((val / total) * 100).toFixed(1) : "0";

  const bars = [
    { key: "ingreso", label: "Ingresos", value: ingresos, color: "#22c55e" },
    { key: "gasto", label: "Gastos", value: gastos, color: "#ef4444" },
    { key: "ahorro", label: "Ahorro Neto", value: ahorro, color: "#6366f1" },
  ];

  return (
    <View style={s.card}>
      <Text style={s.title}>Comparativa Global</Text>

      <View style={s.chartContainer}>
        {bars.map((b) => (
          <Pressable
            key={b.key}
            onPress={() => setPressedBar(pressedBar === b.key ? null : b.key)}
            style={({ pressed }) => [s.barWrapper, pressed && s.barPressed]}
          >
            <View style={s.labelRow}>
              <Text style={s.barLabel}>{b.label}</Text>
              <Text style={[s.barValue, { color: b.color }]}>
                {money(b.value)}
              </Text>
            </View>
            <View style={s.track}>
              <View
                style={[
                  s.fill,
                  { width: getWidth(Math.max(0, b.value)), backgroundColor: b.color },
                ]}
              />
            </View>
            {pressedBar === b.key && (
              <View style={[s.tooltip, { borderColor: b.color }]}>
                <Text style={[s.tooltipTxt, { color: b.color }]}>
                  {pct(b.value)}% del total
                </Text>
                <Text style={s.tooltipVal}>{money(b.value)}</Text>
              </View>
            )}
          </Pressable>
        ))}
      </View>

      <View style={s.footer}>
        <Text style={s.footerTxt}>
          {ahorro >= 0
            ? `Eficiencia de ahorro: ${((ahorro / ingresos) * 100 || 0).toFixed(1)}%`
            : "Estás en déficit financiero este mes."}
        </Text>
        <Text style={s.hint}>Toca una barra para ver el porcentaje</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 28,
    padding: 24,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 3,
  },
  title: {
    fontSize: 17,
    fontWeight: "900",
    color: "#1e293b",
    marginBottom: 20,
    textAlign: "center",
  },
  chartContainer: { gap: 20 },
  barWrapper: { gap: 8, paddingVertical: 4, borderRadius: 12 },
  barPressed: { backgroundColor: "#f8fafc" },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  barLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
  },
  barValue: { fontSize: 14, fontWeight: "900" },
  track: {
    height: 12,
    backgroundColor: "#f1f5f9",
    borderRadius: 6,
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: 6 },
  tooltip: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    marginTop: 4,
  },
  tooltipTxt: { fontSize: 13, fontWeight: "800" },
  tooltipVal: { fontSize: 13, fontWeight: "700", color: "#1e293b" },
  footer: {
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    alignItems: "center",
  },
  footerTxt: {
    fontSize: 13,
    color: "#94a3b8",
    fontWeight: "600",
    fontStyle: "italic",
  },
  hint: {
    fontSize: 11,
    color: "#cbd5e1",
    marginTop: 4,
  },
});
