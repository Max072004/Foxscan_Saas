import { useQuery } from "@tanstack/react-query";
import { Text, View, ScrollView } from "react-native";
import { Screen, Title, Card } from "@/components/ui";
import { api } from "@/lib/api";
import { Ionicons } from "@expo/vector-icons";

export default function Dashboard() {
  const { data, error } = useQuery({
    queryKey: ["reports"],
    queryFn: () => api<any>("/api/reports"),
  });

  const kpis = data
    ? [
        {
          label: "Projects",
          value: data.portfolio.projects,
          icon: "business-outline" as const,
          color: "#1A1D24",
          bgClass: "bg-slate-100",
        },
        {
          label: "Progress",
          value: `${Math.round(data.portfolio.progress)}%`,
          icon: "trending-up-outline" as const,
          color: "#EAAC1F",
          bgClass: "bg-amber-50",
        },
        {
          label: "Overdue",
          value: data.tat.overdue,
          icon: "alert-circle-outline" as const,
          color: "#D9383A",
          bgClass: "bg-red-50",
        },
        {
          label: "Paid",
          value: `₹${(data.payments.paid / 100000).toFixed(1)}L`,
          icon: "cash-outline" as const,
          color: "#1B8755",
          bgClass: "bg-green-50",
        },
      ]
    : [];

  return (
    <ScrollView className="flex-grow bg-offWhite" contentContainerStyle={{ flexGrow: 1 }}>
      <Screen>
        <Title>Dashboard</Title>

        {error ? (
          <View className="mb-4 p-4 bg-red-50 border border-red-200 rounded-2xl">
            <Text className="text-alertRed font-bold text-sm">{error.message}</Text>
          </View>
        ) : null}

        {data ? (
          <View className="flex-row flex-wrap justify-between">
            {kpis.map((kpi) => (
              <View key={kpi.label} className="w-[48%]">
                <Card>
                  <View className="flex-col justify-between min-h-[96px]">
                    <View className="flex-row justify-between items-center">
                      <View className={`w-8 h-8 rounded-xl ${kpi.bgClass} items-center justify-center`}>
                        <Ionicons name={kpi.icon} size={18} color={kpi.color} />
                      </View>
                    </View>
                    <View className="mt-3">
                      <Text className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
                        {kpi.label}
                      </Text>
                      <Text className="text-xl font-extrabold text-brandCharcoal">
                        {kpi.value}
                      </Text>
                    </View>
                  </View>
                </Card>
              </View>
            ))}
          </View>
        ) : (
          <View className="flex-1 items-center justify-center py-12">
            <Text className="text-slate-400 font-semibold">Loading data...</Text>
          </View>
        )}
      </Screen>
    </ScrollView>
  );
}
