import { Text, View, ScrollView } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Screen, Title, Card, SectionLabel, EmptyState, useTheme } from "@/components/ui";
import { api } from "@/lib/api";
import { Ionicons } from "@expo/vector-icons";

const EVENT_META: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  STAGE_RAISED: { icon: "arrow-up-circle-outline", color: "#3B82F6" },
  STAGE_APPROVED: { icon: "checkmark-circle-outline", color: "#22C55E" },
  STAGE_RETURNED: { icon: "alert-circle-outline", color: "#EF4444" },
  PAYMENT_PROOF_UPLOADED: { icon: "receipt-outline", color: "#F5B81F" },
  PAYMENT_RELEASED: { icon: "cash-outline", color: "#22C55E" },
  ACTIVITY_MENTION: { icon: "at-outline", color: "#8B5CF6" },
};
const DEFAULT_META = { icon: "notifications-outline" as const, color: "#64748B" };

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function Notifications() {
  const t = useTheme();
  const { data } = useQuery({
    queryKey: ["data"],
    queryFn: () => api<any>("/api/data"),
  });

  const notifications = [...(data?.notifications ?? [])].sort(
    (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const unreadCount = notifications.filter((n: any) => !n.readAt).length;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ flexGrow: 1 }}>
      <Screen scroll>
        <Title icon="notifications-outline" eyebrow="Activity Feed" subtitle="Approvals, returns, mentions, and payment updates">
          Notifications
        </Title>

        {notifications.length > 0 && (
          <SectionLabel>
            {unreadCount > 0 ? `${unreadCount} unread · ${notifications.length} total` : `${notifications.length} total`}
          </SectionLabel>
        )}

        {notifications.length === 0 ? (
          <EmptyState
            icon="notifications-off-outline"
            title="No notifications yet"
            subtitle="Stage approvals, returns, mentions, and payment updates will show up here as they happen."
          />
        ) : (
          notifications.map((n: any) => {
            const meta = EVENT_META[n.event] || DEFAULT_META;
            const unread = !n.readAt;
            return (
              <Card key={n.id}>
                <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
                  <View style={{ width: 44, height: 44, borderRadius: 14, borderWidth: 1, borderColor: `${meta.color}30`, backgroundColor: `${meta.color}12`, alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name={meta.icon} size={20} color={meta.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 4 }}>
                      <Text style={{ fontSize: 14, flex: 1, paddingRight: 8, fontWeight: unread ? "800" : "600", color: unread ? t.text : t.textSecondary }}>
                        {n.title}
                      </Text>
                      {unread ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#F5B81F", marginTop: 6 }} /> : null}
                    </View>
                    <Text style={{ color: t.textSecondary, fontSize: 14, fontWeight: "500", lineHeight: 20, marginBottom: 8 }}>
                      {n.body}
                    </Text>
                    <Text style={{ color: t.textMuted, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 }}>
                      {timeAgo(n.createdAt)}
                    </Text>
                  </View>
                </View>
              </Card>
            );
          })
        )}
      </Screen>
    </ScrollView>
  );
}
