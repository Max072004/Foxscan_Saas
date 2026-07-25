import { useQuery } from "@tanstack/react-query";
import { Text, View, ScrollView } from "react-native";
import { Screen, Title, Card, useTheme } from "@/components/ui";
import { api } from "@/lib/api";
import type { Activity } from "@/lib/types";
import { Ionicons } from "@expo/vector-icons";

export default function Activities() {
  const t = useTheme();
  const { data } = useQuery({
    queryKey: ["data"],
    queryFn: () => api<{ activities: Activity[] }>("/api/data"),
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "NOT_STARTED":
        return { bg: t.isDark ? "#222733" : "#F1F5F9", border: t.cardBorder, textColor: t.textSecondary, label: "Not Started" };
      case "IN_PROGRESS":
        return { bg: "rgba(14,165,233,0.08)", border: "rgba(14,165,233,0.2)", textColor: "#0EA5E9", label: "In Progress" };
      case "SUBMITTED":
        return { bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.2)", textColor: "#F59E0B", label: "Submitted" };
      case "APPROVED":
        return { bg: "rgba(99,102,241,0.08)", border: "rgba(99,102,241,0.2)", textColor: "#6366F1", label: "Approved" };
      case "PAID":
        return { bg: "rgba(34,197,94,0.08)", border: "rgba(34,197,94,0.2)", textColor: "#22C55E", label: "Paid" };
      case "ON_HOLD":
        return { bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.2)", textColor: "#EF4444", label: "On Hold" };
      default:
        return { bg: t.isDark ? "#222733" : "#F1F5F9", border: t.cardBorder, textColor: t.textSecondary, label: status };
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ flexGrow: 1 }}>
      <Screen scroll>
        <Title icon="calendar-outline" eyebrow="Project Timeline" subtitle="Sequenced work with planned dates and live progress">
          Activities
        </Title>

        {data?.activities?.length ? (
          data.activities.map((a) => {
            const badge = getStatusBadge(a.status);
            return (
              <Card key={a.id}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <Text style={{ fontWeight: "900", color: t.text, fontSize: 18, flex: 1, paddingRight: 8 }}>
                    {a.name}
                  </Text>
                  <View style={{ backgroundColor: badge.bg, borderWidth: 1, borderColor: badge.border, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                    <Text style={{ fontSize: 11, fontWeight: "700", textTransform: "uppercase", color: badge.textColor }}>
                      {badge.label}
                    </Text>
                  </View>
                </View>

                {/* Timeline info row */}
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
                  <Ionicons name="calendar-outline" size={14} color={t.textMuted} />
                  <Text style={{ color: t.textSecondary, fontSize: 14, fontWeight: "600", marginLeft: 4 }}>
                    {a.plannedStart} — {a.plannedEnd}
                  </Text>
                </View>

                {/* Progress bar container */}
                <View style={{ marginTop: 4 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <Text style={{ color: t.textSecondary, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1 }}>
                      Completion Progress
                    </Text>
                    <Text style={{ color: t.text, fontWeight: "800", fontSize: 14 }}>
                      {a.progress}%
                    </Text>
                  </View>
                  <View style={{ height: 8, width: "100%", backgroundColor: t.isDark ? "#222733" : "#E2E8F0", borderRadius: 8, overflow: "hidden" }}>
                    <View
                      style={{ height: "100%", backgroundColor: "#F5B81F", borderRadius: 8, width: `${a.progress}%` }}
                    />
                  </View>
                </View>
              </Card>
            );
          })
        ) : (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 48 }}>
            <Text style={{ color: t.textSecondary, fontWeight: "600" }}>No activities configured.</Text>
          </View>
        )}
      </Screen>
    </ScrollView>
  );
}
