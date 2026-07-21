import { Text, View, ScrollView } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Screen, Title, Card, SectionLabel, EmptyState } from "@/components/ui";
import { api } from "@/lib/api";
import { Ionicons } from "@expo/vector-icons";

const EVENT_META: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  STAGE_RAISED: { icon: "arrow-up-circle-outline", color: "#3B82F6", bg: "bg-sky-50 border-sky-100" },
  STAGE_APPROVED: { icon: "checkmark-circle-outline", color: "#1B8755", bg: "bg-emerald-50 border-emerald-100" },
  STAGE_RETURNED: { icon: "alert-circle-outline", color: "#D9383A", bg: "bg-red-50 border-red-100" },
  PAYMENT_PROOF_UPLOADED: { icon: "receipt-outline", color: "#EAAC1F", bg: "bg-amber-50 border-amber-100" },
  PAYMENT_RELEASED: { icon: "cash-outline", color: "#1B8755", bg: "bg-emerald-50 border-emerald-100" },
  ACTIVITY_MENTION: { icon: "at-outline", color: "#8B5CF6", bg: "bg-violet-50 border-violet-100" },
};
const DEFAULT_META = { icon: "notifications-outline" as const, color: "#64748B", bg: "bg-slate-100 border-slate-200" };

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
  const { data } = useQuery({
    queryKey: ["data"],
    queryFn: () => api<any>("/api/data"),
  });

  const notifications = [...(data?.notifications ?? [])].sort(
    (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const unreadCount = notifications.filter((n: any) => !n.readAt).length;

  return (
    <ScrollView className="flex-1 bg-offWhite" contentContainerStyle={{ flexGrow: 1 }}>
      <Screen>
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
                <View className="flex-row items-start" style={{ gap: 12 }}>
                  <View className={`w-11 h-11 rounded-xl border items-center justify-center ${meta.bg}`}>
                    <Ionicons name={meta.icon} size={20} color={meta.color} />
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-start justify-between mb-1">
                      <Text className={`text-sm flex-1 pr-2 ${unread ? "font-extrabold text-brandCharcoal" : "font-bold text-slate-500"}`}>
                        {n.title}
                      </Text>
                      {unread ? <View className="w-2 h-2 rounded-full bg-brandAmber mt-1.5" /> : null}
                    </View>
                    <Text className="text-slate-400 text-sm font-medium leading-relaxed mb-2">
                      {n.body}
                    </Text>
                    <Text className="text-slate-300 text-[11px] font-bold uppercase tracking-wide">
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
