import { useQuery } from "@tanstack/react-query";
import { Text, Pressable, View, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Screen, Title, Card } from "@/components/ui";
import { api } from "@/lib/api";
import type { Project } from "@/lib/types";
import { Ionicons } from "@expo/vector-icons";

export default function Projects() {
  const { data = [], error } = useQuery({
    queryKey: ["projects"],
    queryFn: () => api<Project[]>("/api/projects"),
  });
  const router = useRouter();

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return { bg: "bg-emerald-50 border border-emerald-100", text: "text-successGreen", label: "Active Workspace" };
      case "COMPLETED":
        return { bg: "bg-blue-50 border border-blue-100", text: "text-blue-700", label: "Completed" };
      case "ON_HOLD":
        return { bg: "bg-amber-50 border border-amber-100", text: "text-amber-700", label: "On Hold" };
      default:
        return { bg: "bg-slate-50 border border-slate-100", text: "text-slate-600", label: status };
    }
  };

  return (
    <ScrollView className="flex-1 bg-offWhite" contentContainerStyle={{ flexGrow: 1 }}>
      <Screen>
        <Title icon="business-outline" eyebrow="Your Workspace" subtitle="All societies and sites you're assigned to">
          Projects
        </Title>
        {error ? (
          <View className="mb-4 p-4 bg-red-50 border border-red-200 rounded-2xl">
            <Text className="text-alertRed font-bold text-sm">{error.message}</Text>
          </View>
        ) : null}

        <View className="space-y-4 gap-2">
          {data.map((project) => {
            const status = getStatusStyle(project.status);
            return (
              <Pressable
                key={project.id}
                onPress={() => router.push(`/project/${project.id}`)}
                style={({ pressed }) => pressed ? { transform: [{ scale: 0.98 }], opacity: 0.9 } : {}}
              >
                <Card>
                  <View className="flex-col justify-between">
                    <View className="flex-row justify-between items-start mb-2">
                      <Text className="font-extrabold text-brandCharcoal text-lg flex-1 pr-2">
                        {project.name}
                      </Text>
                      <View className={`${status.bg} px-2.5 py-1 rounded-full`}>
                        <Text className={`text-[11px] font-extrabold uppercase ${status.text}`}>
                          {status.label}
                        </Text>
                      </View>
                    </View>

                    <View className="flex-row items-center space-x-1 mb-3">
                      <Ionicons name="location-outline" size={14} color="#64748B" />
                      <Text className="text-slate-500 text-sm font-semibold ml-1">
                        {project.address}
                      </Text>
                    </View>

                    <View className="border-t border-slate-100 pt-3 flex-row justify-between items-center">
                      <Text className="text-slate-400 text-sm font-bold uppercase tracking-wider">
                        Contract Details
                      </Text>
                      <View className="flex-row items-center">
                        <Text className="text-brandAmber text-sm font-extrabold mr-1">
                          View details
                        </Text>
                        <Ionicons name="arrow-forward" size={14} color="#EAAC1F" />
                      </View>
                    </View>
                  </View>
                </Card>
              </Pressable>
            );
          })}
        </View>
      </Screen>
    </ScrollView>
  );
}
