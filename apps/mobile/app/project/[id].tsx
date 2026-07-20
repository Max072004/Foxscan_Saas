import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Text, View, ScrollView, Pressable, TextInput } from "react-native";
import { Screen, Title, Card, Button } from "@/components/ui";
import { api } from "@/lib/api";
import type { Project } from "@/lib/types";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/stores/auth";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProjectDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { role } = useAuthStore();
  const [activeSubTab, setActiveSubTab] = useState<"timeline" | "docs">("timeline");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => api<Project[]>("/api/projects"),
  });
  const project = projects.find((p) => p.id === id);

  const { data: globalData } = useQuery({
    queryKey: ["data"],
    queryFn: () => api<any>("/api/data"),
  });
  const activities = globalData?.activities?.filter((a: any) => a.projectId === id) || [];

  const { data: documents = [], refetch: refetchDocs } = useQuery({
    queryKey: ["project-documents", id, searchQuery],
    queryFn: () => api<any[]>(`/api/documents?q=${encodeURIComponent(searchQuery)}`),
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
        return { bg: "bg-teal-50 border border-teal-100", text: "text-teal-700", label: "Approved" };
      case "PAID":
        return { bg: "bg-green-50 border border-green-100", text: "text-successGreen", label: "Paid" };
      case "ON_HOLD":
        return { bg: "bg-red-50 border border-red-100", text: "text-alertRed", label: "On Hold" };
      default:
        return { bg: "bg-slate-50 border border-slate-200", text: "text-slate-600", label: status };
    }
  };

  const getDocIcon = (type: string) => {
    switch (type) {
      case "CONTRACT":
        return "document-text-outline";
      case "BOQ":
        return "calculator-outline";
      case "INVOICE":
        return "cash-outline";
      case "PHOTO":
      case "VIDEO":
        return "image-outline";
      default:
        return "document-outline";
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-offWhite" edges={["top"]}>
      <ScrollView className="flex-1" contentContainerStyle={{ flexGrow: 1 }}>
        <Screen>
        {/* Project Header Info Card */}
        <View className="mb-4">
          <View className="flex-row items-center justify-between mb-1.5 px-0.5">
            <Text className="text-slate-400 text-xs font-bold uppercase tracking-wider">
              Project Overview
            </Text>
            {role && role !== "MANUFACTURER" && (
              <Pressable
                onPress={() => router.push({ pathname: "/project/setup", params: { id } })}
                className="flex-row items-center active:opacity-75"
                style={({ pressed }) => pressed ? { transform: [{ scale: 0.96 }] } : {}}
              >
                <Ionicons name="settings-outline" size={14} color="#EAAC1F" />
                <Text className="text-brandAmber text-xs font-bold ml-1">Setup</Text>
              </Pressable>
            )}
          </View>
          <Card>
            <View className="border-l-4 border-brandAmber pl-3">
              <Text className="text-xl font-extrabold text-brandCharcoal leading-tight mb-1">
                {project?.name || "Project Details"}
              </Text>
              <Text className="text-slate-500 text-xs font-semibold mb-3">
                {project?.address}
              </Text>
            </View>

            <View className="flex-row justify-between items-center border-t border-slate-100 pt-3 mt-1">
              <View>
                <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-0.5">
                  Contract Value
                </Text>
                <Text className="text-sm font-extrabold text-brandCharcoal">
                  ₹{project?.contractValue?.toLocaleString("en-IN") || "0"}
                </Text>
              </View>
              <View>
                <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-0.5">
                  Planned Schedule
                </Text>
                <Text className="text-xs font-extrabold text-slate-500">
                  {project?.startDate} — {project?.endDate}
                </Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Project Sub-Tab Switcher */}
        <View className="flex-row bg-slate-200/50 p-1.5 rounded-2xl mb-4 gap-2">
          <Pressable
            onPress={() => setActiveSubTab("timeline")}
            className={`flex-1 py-3 rounded-xl ${activeSubTab === "timeline" ? "bg-white shadow-[0_2px_4px_rgba(26,29,36,0.06)]" : ""}`}
            style={({ pressed }) => pressed ? { transform: [{ scale: 0.98 }] } : {}}
          >
            <View className="flex-row items-center justify-center space-x-1.5">
              <Ionicons name="trail-sign-outline" size={16} color={activeSubTab === "timeline" ? "#EAAC1F" : "#64748B"} />
              <Text className={`text-xs font-bold ml-1.5 ${activeSubTab === "timeline" ? "text-brandCharcoal font-extrabold" : "text-slate-500"}`}>
                Timeline
              </Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => setActiveSubTab("docs")}
            className={`flex-1 py-3 rounded-xl ${activeSubTab === "docs" ? "bg-white shadow-[0_2px_4px_rgba(26,29,36,0.06)]" : ""}`}
            style={({ pressed }) => pressed ? { transform: [{ scale: 0.98 }] } : {}}
          >
            <View className="flex-row items-center justify-center space-x-1.5">
              <Ionicons name="document-attach-outline" size={16} color={activeSubTab === "docs" ? "#EAAC1F" : "#64748B"} />
              <Text className={`text-xs font-bold ml-1.5 ${activeSubTab === "docs" ? "text-brandCharcoal font-extrabold" : "text-slate-500"}`}>
                Documents
              </Text>
            </View>
          </Pressable>
        </View>

        {/* Tab Content Rendering */}
        {activeSubTab === "timeline" ? (
          <View className="space-y-3 gap-2">
            {activities.length > 0 ? (
              activities.map((a: any) => {
                const badge = getStatusBadge(a.status);
                return (
                  <Card key={a.id}>
                    <View className="flex-row justify-between items-start mb-2">
                      <Text className="font-extrabold text-brandCharcoal text-sm flex-1 pr-2">
                        {a.name}
                      </Text>
                      <View className={`${badge.bg} px-2 py-0.5 rounded-full`}>
                        <Text className={`text-[9px] font-bold uppercase ${badge.text}`}>
                          {badge.label}
                        </Text>
                      </View>
                    </View>

                    <View className="flex-row items-center space-x-1.5 mb-2">
                      <Ionicons name="calendar-outline" size={12} color="#64748B" />
                      <Text className="text-slate-400 text-[10px] font-semibold ml-1">
                        {a.plannedStart} — {a.plannedEnd}
                      </Text>
                    </View>

                    <View className="flex-row items-center justify-between mb-3 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <View className="flex-row items-center">
                        <Ionicons name="time-outline" size={12} color="#64748B" />
                        <Text className="text-slate-500 text-[10px] font-bold ml-1">
                          Duration: {a.durationDays || Math.max(1, Math.round((new Date(a.plannedEnd).getTime() - new Date(a.plannedStart).getTime()) / (1000 * 60 * 60 * 24)) + 1)} days
                        </Text>
                      </View>
                      {project && project.contractValue > 0 && (
                        <View className="flex-row items-center">
                          <Ionicons name="pie-chart-outline" size={12} color="#EAAC1F" />
                          <Text className="text-slate-500 text-[10px] font-bold ml-1">
                            Allocation: {(((a.paymentValue || 0) / project.contractValue) * 100).toFixed(1)}%
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Completion progress bar */}
                    <View className="space-y-1">
                      <View className="flex-row justify-between items-center mb-0.5">
                        <Text className="text-slate-400 text-[9px] font-bold uppercase tracking-wider">
                          Progress
                        </Text>
                        <Text className="text-brandCharcoal font-extrabold text-[10px]">
                          {a.progress}%
                        </Text>
                      </View>
                      <View className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
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
              <Card>
                <View className="items-center py-6">
                  <Ionicons name="calendar-clear-outline" size={32} color="#64748B" />
                  <Text className="text-slate-500 font-bold mt-2">
                    No timeline activities found.
                  </Text>
                </View>
              </Card>
            )}
          </View>
        ) : (
          <View>
            {/* Search inputs */}
            <View className="flex-row space-x-2 gap-2 mb-3 items-center">
              <View className="flex-1 relative">
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search files (e.g. Contract, BOQ)..."
                  placeholderTextColor="#94A3B8"
                  className="h-12 border border-slate-200 bg-white rounded-xl px-4 text-brandCharcoal text-xs font-semibold focus:border-brandAmber"
                />
              </View>
              <Pressable
                onPress={() => refetchDocs()}
                className="h-12 w-12 rounded-xl bg-brandCharcoal items-center justify-center active:scale-95"
                style={({ pressed }) => pressed ? { transform: [{ scale: 0.95 }], opacity: 0.85 } : {}}
              >
                <Ionicons name="search" size={18} color="#FFFFFF" />
              </Pressable>
            </View>

            {/* Documents List */}
            <View className="space-y-3 gap-2">
              {documents.length > 0 ? (
                documents.map((doc: any) => (
                  <Card key={doc.id}>
                    <View className="flex-row items-center py-1">
                      <View className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 items-center justify-center mr-3">
                        <Ionicons name={getDocIcon(doc.type)} size={18} color="#EAAC1F" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-brandCharcoal font-bold text-sm">
                          {doc.name}
                        </Text>
                        <Text className="text-slate-400 text-xs font-semibold mt-0.5">
                          {doc.type} · Version {doc.version}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                    </View>
                  </Card>
                ))
              ) : (
                <Card>
                  <View className="items-center py-6">
                    <Ionicons name="document-text-outline" size={32} color="#64748B" />
                    <Text className="text-slate-500 font-bold mt-2">
                      No documents found.
                    </Text>
                  </View>
                </Card>
              )}
            </View>
          </View>
        )}
        </Screen>
      </ScrollView>
    </SafeAreaView>
  );
}
