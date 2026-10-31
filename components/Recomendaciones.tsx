import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Rec = {
  t: string;
  d: string;
  i: string;
  c: string;
};

interface Props {
  recomendaciones: Rec[];
}

export default function Recomendaciones({ recomendaciones }: Props) {
  const [expanded, setExpanded] = useState<number | null>(null);

  if (recomendaciones.length === 0) {
    return (
      <View style={s.card}>
        <Text style={s.cardTitle}>Recomendaciones</Text>
        <View style={s.emptyState}>
          <Ionicons name="checkmark-circle" size={48} color="#22c55e" />
          <Text style={s.emptyTxt}>Todo bien!</Text>
          <Text style={s.emptySub}>No hay recomendaciones pendientes</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={s.card}>
      <View style={s.headerRow}>
        <Text style={s.cardTitle}>Recomendaciones</Text>
        <View style={s.badge}>
          <Text style={s.badgeTxt}>{recomendaciones.length}</Text>
        </View>
      </View>

      {recomendaciones.map((r, i) => (
        <Pressable
          key={i}
          style={({ pressed }) => [
            s.recItem,
            expanded === i && s.recItemExpanded,
            pressed && s.recPressed,
          ]}
          onPress={() => setExpanded(expanded === i ? null : i)}
        >
          <View style={[s.recIcon, { backgroundColor: r.c + "15" }]}>
            <Ionicons name={r.i as any} size={22} color={r.c} />
          </View>
          <View style={s.recContent}>
            <Text style={[s.recTitle, { color: r.c }]}>{r.t}</Text>
            {expanded === i && (
              <Text style={s.recDesc}>{r.d}</Text>
            )}
          </View>
          <Ionicons
            name={expanded === i ? "chevron-up" : "chevron-down"}
            size={18}
            color="#94a3b8"
          />
        </Pressable>
      ))}

      <Text style={s.hint}>Toca para ver detalles</Text>
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
    shadowOpacity: 0.03,
    shadowRadius: 15,
    elevation: 3,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#1e293b",
    marginBottom: 16,
  },
  badge: {
    backgroundColor: "#6366f1",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeTxt: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 8,
  },
  emptyTxt: {
    fontSize: 16,
    fontWeight: "700",
    color: "#22c55e",
  },
  emptySub: {
    fontSize: 13,
    color: "#94a3b8",
  },
  recItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
    backgroundColor: "#f8fafc",
  },
  recItemExpanded: {
    backgroundColor: "#f1f5f9",
  },
  recPressed: {
    opacity: 0.7,
  },
  recIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  recContent: {
    flex: 1,
  },
  recTitle: {
    fontSize: 13,
    fontWeight: "800",
  },
  recDesc: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 6,
    lineHeight: 18,
  },
  hint: {
    fontSize: 11,
    color: "#cbd5e1",
    textAlign: "center",
    marginTop: 8,
    fontWeight: "600",
  },
});
