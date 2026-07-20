import { useQuery } from "@tanstack/react-query";
import { Text, View, ScrollView, Pressable } from "react-native";
import { Screen, Title, Card } from "@/components/ui";
import { api } from "@/lib/api";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

export default function Dashboard() {
  const router = useRouter();
  const { data, error } = useQuery({
    queryKey: ["reports"],
    queryFn: () => api<any>("/api/reports"),
  });

  const progress = data ? Math.round(data.portfolio.progress) : 0;
  const overdueCount = data?.tat?.overdue || 0;

  return (
    <ScrollView className="flex-grow bg-offWhite" contentContainerStyle={{ flexGrow: 1 }}>
      {/* Industrial Safety Accent Bar */}
      <View className="h-2 w-full flex-row overflow-hidden bg-brandAmber">
        {Array.from({ length: 15 }).map((_, i) => (
          <View
            key={i}
            className="w-6 h-6 bg-brandCharcoal mr-4"
            style={{ transform: [{ rotate: "45deg" }], marginTop: -6 }}
          />
        ))}
      </View>

      <Screen>
        {/* Brand Header */}
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-row items-center">
            <View className="w-8 h-8 rounded-full bg-brandAmber items-center justify-center mr-2 border border-brandCharcoal/10">
              <Text className="text-brandCharcoal font-extrabold text-[10px] tracking-tighter">
                FS
              </Text>
            </View>
            <Text className="text-brandCharcoal font-extrabold text-lg tracking-tight">
              FOXSCAN
            </Text>
          </View>
        </View>

        <Title>Workspace Status</Title>

        {error ? (
          <View className="mb-4 p-4 bg-red-50 border border-red-200 rounded-2xl">
            <Text className="text-alertRed font-bold text-sm">{error.message}</Text>
          </View>
        ) : null}

        {data ? (
          <View className="space-y-4 gap-4">
            {/* HERO CARD: Overall Project Progress */}
            <Card>
              <View className="flex-row items-center justify-between">
                <View className="flex-1 pr-4">
                  <Text className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
                    Overall Project Health
                  </Text>
                  <Text className="text-xl font-extrabold text-brandCharcoal leading-tight">
                    Greenview External Repainting
                  </Text>
                  <Text className="text-slate-500 text-xs font-semibold mt-1">
                    Scaffolding and coatings active
                  </Text>
                </View>

                {/* Progress Ring using pure CSS overlay borders */}
                <View className="w-20 h-20 items-center justify-center relative">
                  {/* Background Track Circle */}
                  <View className="absolute w-20 h-20 rounded-full border-[6px] border-slate-100" />
                  
                  {/* Visual Progress Indicator Slices */}
                  <View
                    className="absolute w-20 h-20 rounded-full border-[6px] border-brandAmber border-t-transparent border-l-transparent"
                    style={{ transform: [{ rotate: "45deg" }] }}
                  />
                  {progress > 50 && (
                    <View
                      className="absolute w-20 h-20 rounded-full border-[6px] border-brandAmber border-b-transparent border-r-transparent"
                      style={{ transform: [{ rotate: "45deg" }] }}
                    />
                  )}
                  
                  {/* Percent Label */}
                  <Text className="text-base font-extrabold text-brandCharcoal">
                    {progress}%
                  </Text>
                </View>
              </View>
            </Card>

            {/* ASYMMETRIC GRID */}
            <View className="flex-row justify-between">
              {/* Large Disbursements Tile */}
              <View className="w-[58%]">
                <Card>
                  <View className="min-h-[110px] justify-between flex-col">
                    <View className="flex-row justify-between items-center">
                      <View className="w-8 h-8 rounded-xl bg-emerald-50 items-center justify-center border border-emerald-100">
                        <Ionicons name="cash-outline" size={18} color="#1B8755" />
                      </View>
                      <Text className="text-successGreen text-[10px] font-bold uppercase">
                        Cleared
                      </Text>
                    </View>
                    <View className="mt-4">
                      <Text className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
                        Disbursed
                      </Text>
                      <Text className="text-2xl font-extrabold text-successGreen leading-none">
                        ₹{(data.payments.paid / 100000).toFixed(1)}L
                      </Text>
                    </View>
                  </View>
                </Card>
              </View>

              {/* Smaller High-Density Tiles stack */}
              <View className="w-[38%] justify-between gap-1 flex-col">
                <Card>
                  <View className="min-h-[46px] justify-between flex-row items-center">
                    <View className="flex-1">
                      <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-0.5">
                        Overdue
                      </Text>
                      <Text className={`text-base font-extrabold ${overdueCount > 0 ? "text-alertRed" : "text-brandCharcoal"}`}>
                        {overdueCount}
                      </Text>
                    </View>
                    <View className={`w-6 h-6 rounded-lg ${overdueCount > 0 ? "bg-red-50" : "bg-slate-100"} items-center justify-center`}>
                      <Ionicons name="alert-circle-outline" size={14} color={overdueCount > 0 ? "#D9383A" : "#64748B"} />
                    </View>
                  </View>
                </Card>

                <Card>
                  <View className="min-h-[46px] justify-between flex-row items-center">
                    <View className="flex-1">
                      <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-0.5">
                        Projects
                      </Text>
                      <Text className="text-base font-extrabold text-brandCharcoal">
                        {data.portfolio.projects}
                      </Text>
                    </View>
                    <View className="w-6 h-6 rounded-lg bg-slate-100 items-center justify-center">
                      <Ionicons name="business-outline" size={14} color="#1A1D24" />
                    </View>
                  </View>
                </Card>
              </View>
            </View>

            {/* ACTION CENTER */}
            <View className="mt-2">
              <Text className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">
                Action Center
              </Text>
              
              <Pressable
                onPress={() => router.push("/approvals")}
                style={({ pressed }) => pressed ? { transform: [{ scale: 0.98 }], opacity: 0.9 } : {}}
              >
                <Card>
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center flex-1">
                      <View className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 items-center justify-center mr-3">
                        <Ionicons name="checkbox-outline" size={20} color="#EAAC1F" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-brandCharcoal font-extrabold text-sm">
                          Review Stage Approvals
                        </Text>
                        <Text className="text-slate-400 text-xs font-semibold mt-0.5">
                          Pending workflow stages requiring clearance
                        </Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#64748B" />
                  </View>
                </Card>
              </Pressable>

              <Pressable
                onPress={() => router.push("/site-updates")}
                style={({ pressed }) => pressed ? { transform: [{ scale: 0.98 }], opacity: 0.9 } : {}}
                className="mt-1"
              >
                <Card>
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center flex-1">
                      <View className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 items-center justify-center mr-3">
                        <Ionicons name="camera-outline" size={20} color="#0284C7" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-brandCharcoal font-extrabold text-sm">
                          Submit Daily Site Log
                        </Text>
                        <Text className="text-slate-400 text-xs font-semibold mt-0.5">
                          Record geotagged photos and audio logs
                        </Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#64748B" />
                  </View>
                </Card>
              </Pressable>
            </View>
          </View>
        ) : (
          <View className="flex-1 items-center justify-center py-20">
            <Text className="text-slate-400 font-semibold">Loading Command Center...</Text>
          </View>
        )}
      </Screen>
    </ScrollView>
  );
}
