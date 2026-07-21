import { useQuery } from "@tanstack/react-query";
import { Text, View, ScrollView } from "react-native";
import { Screen, Title, Card } from "@/components/ui";
import { api } from "@/lib/api";
import type { Activity } from "@/lib/types";
import { Ionicons } from "@expo/vector-icons";

export default function Activities() {
  const { data } = useQuery({
    queryKey: ["data"],
    queryFn: () => api<{ activities: Activity[] }>("/api/data"),
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "NOT_STARTED":
        return { bg: "bg-slate-100 border border-slate-200", text: "text-slate-600", label: "Not Started" };
      case "IN_PROGRESS":
        return { bg: "bg-sky-50 border border-sky-100", text: "text-sky-700", label: "In Progress" };
      case "SUBMITTED":
        return { bg: "bg-amber-50 border border-amber-100", text: "text-amber-700", label: "Submitted" };
      case "APPROVED":
        return { bg: "bg-indigo-50 border border-indigo-100", text: "text-indigo-700", label: "Approved" };
      case "PAID":
        return { bg: "bg-green-50 border border-green-100", text: "text-successGreen", label: "Paid" };
      case "ON_HOLD":
        return { bg: "bg-red-50 border border-red-100", text: "text-alertRed", label: "On Hold" };
      default:
        return { bg: "bg-slate-50 border border-slate-200", text: "text-slate-600", label: status };
    }
  };

  return (
    <ScrollView className="flex-1 bg-offWhite" contentContainerStyle={{ flexGrow: 1 }}>
      <Screen>
        <Title icon="calendar-outline" eyebrow="Project Timeline" subtitle="Sequenced work with planned dates and live progress">
          Activities
        </Title>

        {data?.activities?.length ? (
          data.activities.map((a) => {
            const badge = getStatusBadge(a.status);
            return (
              <Card key={a.id}>
                <View className="flex-row justify-between items-start mb-3">
                  <Text className="font-extrabold text-brandCharcoal text-base flex-1 pr-2">
                    {a.name}
                  </Text>
                  <View className={`${badge.bg} px-2.5 py-1 rounded-full`}>
                    <Text className={`text-[11px] font-bold uppercase ${badge.text}`}>
                      {badge.label}
                    </Text>
                  </View>
                </View>

                {/* Timeline info row */}
                <View className="flex-row items-center space-x-1.5 mb-4">
                  <Ionicons name="calendar-outline" size={14} color="#64748B" />
                  <Text className="text-slate-500 text-sm font-semibold ml-1">
                    {a.plannedStart} — {a.plannedEnd}
                  </Text>
                </View>

                {/* Progress bar container */}
                <View className="space-y-1 mt-1">
                  <View className="flex-row justify-between items-center mb-1">
                    <Text className="text-slate-400 text-[12px] font-bold uppercase tracking-wider">
                      Completion Progress
                    </Text>
                    <Text className="text-brandCharcoal font-extrabold text-sm">
                      {a.progress}%
                    </Text>
                  </View>
                  <View className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <View
                      className="h-full bg-brandAmber rounded-full"
                      style={{ width: `${a.progress}%` }}
                    />
                  </View>
                </View>
              </Card>
            );
          })
        ) : (
          <View className="flex-1 items-center justify-center py-12">
            <Text className="text-slate-400 font-semibold">No activities configured.</Text>
          </View>
        )}
      </Screen>
    </ScrollView>
  );
}
