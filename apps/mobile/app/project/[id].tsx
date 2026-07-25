import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Text, View, ScrollView, Pressable, TextInput } from "react-native";
import { Screen, Card, Skeleton, useTheme } from "@/components/ui";
import { api } from "@/lib/api";
import type { Project } from "@/lib/types";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/stores/auth";
import { SafeAreaView } from "react-native-safe-area-context";
import { calculateProjectSlippage } from "@/lib/scheduling";

const STATUS_META: Record<string, { bg: string; text: string; label: string }> = {
  NOT_STARTED: { bg: "#F1F5F9", text: "#64748B", label: "Not Started" },
  IN_PROGRESS: { bg: "#E0F2FE", text: "#0369A1", label: "In Progress" },
  SUBMITTED: { bg: "#FEF3C7", text: "#B45309", label: "Submitted" },
  APPROVED: { bg: "#CCFBF1", text: "#0F766E", label: "Approved" },
  PAID: { bg: "#DCFCE7", text: "#15803D", label: "Paid" },
  ON_HOLD: { bg: "#FEE2E2", text: "#B91C1C", label: "On Hold" },
};

const DOC_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  CONTRACT: "document-text-outline",
  BOQ: "calculator-outline",
  INVOICE: "cash-outline",
  PHOTO: "image-outline",
  VIDEO: "image-outline",
};

export default function ProjectDetails() {
  const t = useTheme();
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
  const projectStages = globalData?.stages?.filter((s: any) => activities.some((a: any) => a.id === s.activityId)) || [];
  const slippageInfo = project ? calculateProjectSlippage(project, activities, projectStages) : null;

  const { data: documents = [], isLoading: docsLoading, refetch: refetchDocs } = useQuery({
    queryKey: ["project-documents", id, searchQuery],
    queryFn: () => api<any[]>(`/api/documents?projectId=${id}&q=${encodeURIComponent(searchQuery)}`),
    enabled: activeSubTab === "docs",
  });

  const today = new Date();
  const escalated = projectStages.filter((s: any) => s.state !== "PAID" && s.state !== "REWORK" && new Date(s.dueAt) < today);

  const inputStyle = {
    borderWidth: 2,
    borderColor: t.inputBorder,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 15,
    fontWeight: "600" as const,
    color: t.text,
    backgroundColor: t.inputBg,
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={["top"]}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }}>
        <Screen scroll>
          {/* Header row */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <Text style={{ color: t.textSecondary, fontSize: 12, fontWeight: "900", textTransform: "uppercase", letterSpacing: 1.5 }}>
              Project Overview
            </Text>
            {role && role !== "MANUFACTURER" && (
              <Pressable
                onPress={() => router.push({ pathname: "/project/setup", params: { id } })}
                style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", opacity: pressed ? 0.7 : 1 })}
              >
                <Ionicons name="settings-outline" size={14} color="#F5B81F" />
                <Text style={{ color: "#F5B81F", fontSize: 14, fontWeight: "700", marginLeft: 4 }}>Setup</Text>
              </Pressable>
            )}
          </View>

          <Card>
            <View style={{ borderLeftWidth: 4, borderLeftColor: "#F5B81F", paddingLeft: 12 }}>
              <Text style={{ fontSize: 20, fontWeight: "900", color: t.text, lineHeight: 26, marginBottom: 4 }}>
                {project?.name || "Project Details"}
              </Text>
              <Text style={{ color: t.textSecondary, fontSize: 14, fontWeight: "600", marginBottom: 12 }}>
                {project?.address}
              </Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: t.cardBorder, paddingTop: 12, marginTop: 4 }}>
              <View>
                <Text style={{ color: t.textMuted, fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>
                  Contract Value
                </Text>
                <Text style={{ fontSize: 14, fontWeight: "900", color: t.text }}>
                  ₹{project?.contractValue?.toLocaleString("en-IN") || "0"}
                </Text>
              </View>
              <View>
                <Text style={{ color: t.textMuted, fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>
                  Planned Schedule
                </Text>
                <Text style={{ fontSize: 14, fontWeight: "900", color: t.textSecondary }}>
                  {project?.startDate} — {project?.endDate}
                </Text>
              </View>
            </View>
          </Card>

          {project && slippageInfo && (
            <Card>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Ionicons
                    name={slippageInfo.status === "BEHIND" ? "alert-circle" : slippageInfo.status === "AHEAD" ? "sparkles" : "checkmark-circle"}
                    size={20}
                    color={slippageInfo.status === "BEHIND" ? "#EF4444" : slippageInfo.status === "AHEAD" ? "#22C55E" : t.textSecondary}
                  />
                  <Text style={{ fontSize: 14, fontWeight: "900", color: t.text, marginLeft: 8 }}>Schedule Status</Text>
                </View>
                <View style={{ backgroundColor: slippageInfo.status === "BEHIND" ? "#FEE2E2" : slippageInfo.status === "AHEAD" ? "#DCFCE7" : t.inputBg, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 }}>
                  <Text style={{ fontSize: 11, fontWeight: "800", textTransform: "uppercase", color: slippageInfo.status === "BEHIND" ? "#B91C1C" : slippageInfo.status === "AHEAD" ? "#15803D" : t.textSecondary }}>
                    {slippageInfo.status.replace("_", " ")}
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
                <View>
                  <Text style={{ color: t.textMuted, fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>Slippage Metric</Text>
                  <Text style={{ fontSize: 14, fontWeight: "900", color: slippageInfo.status === "BEHIND" ? "#EF4444" : slippageInfo.status === "AHEAD" ? "#22C55E" : t.textSecondary }}>
                    {slippageInfo.status === "BEHIND" ? `${slippageInfo.slippageDays} days behind` : slippageInfo.status === "AHEAD" ? `${Math.abs(slippageInfo.slippageDays)} days ahead` : "On track"}
                  </Text>
                </View>
                <View>
                  <Text style={{ color: t.textMuted, fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>Projected Completion</Text>
                  <Text style={{ fontSize: 14, fontWeight: "900", color: t.text }}>{slippageInfo.projectedEndDate || project.endDate}</Text>
                </View>
              </View>

              {escalated.length > 0 && (
                <View style={{ marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: t.cardBorder }}>
                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                    <Ionicons name="warning-outline" size={14} color="#EF4444" />
                    <Text style={{ color: "#EF4444", fontSize: 12, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.5, marginLeft: 4 }}>
                      Escalated Delays (Overdue)
                    </Text>
                  </View>
                  {escalated.map((s: any) => {
                    const act = activities.find((a: any) => a.id === s.activityId);
                    const overdueHours = Math.max(0, Math.floor((today.getTime() - new Date(s.dueAt).getTime()) / 3600000));
                    const overdueDays = Math.floor(overdueHours / 24);
                    const displayOverdue = overdueDays > 0 ? `${overdueDays}d ${overdueHours % 24}h` : `${overdueHours}h`;
                    return (
                      <View key={s.id} style={{ backgroundColor: "rgba(239,68,68,0.06)", borderWidth: 1, borderColor: "rgba(239,68,68,0.15)", borderRadius: 14, padding: 10, marginBottom: 6 }}>
                        <Text style={{ fontSize: 14, fontWeight: "800", color: t.text }}>{act?.name || "Unknown Activity"}</Text>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                          <Text style={{ fontSize: 11, fontWeight: "700", color: t.textSecondary }}>
                            Stuck with: <Text style={{ fontWeight: "900", color: t.text }}>{s.state}</Text>
                          </Text>
                          <Text style={{ fontSize: 11, fontWeight: "800", color: "#EF4444", backgroundColor: "rgba(239,68,68,0.12)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                            Overdue by {displayOverdue}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </Card>
          )}

          {/* Sub-tab switcher */}
          <View style={{ flexDirection: "row", backgroundColor: t.inputBg, padding: 6, borderRadius: 18, marginBottom: 16, gap: 8 }}>
            <Pressable
              onPress={() => setActiveSubTab("timeline")}
              style={{ flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: "center", backgroundColor: activeSubTab === "timeline" ? t.card : "transparent" }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Ionicons name="trail-sign-outline" size={16} color={activeSubTab === "timeline" ? "#F5B81F" : t.textSecondary} />
                <Text style={{ fontSize: 14, fontWeight: "800", color: activeSubTab === "timeline" ? t.text : t.textSecondary }}>Timeline</Text>
              </View>
            </Pressable>
            <Pressable
              onPress={() => setActiveSubTab("docs")}
              style={{ flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: "center", backgroundColor: activeSubTab === "docs" ? t.card : "transparent" }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Ionicons name="document-attach-outline" size={16} color={activeSubTab === "docs" ? "#F5B81F" : t.textSecondary} />
                <Text style={{ fontSize: 14, fontWeight: "800", color: activeSubTab === "docs" ? t.text : t.textSecondary }}>Documents</Text>
              </View>
            </Pressable>
          </View>

          {activeSubTab === "timeline" ? (
            activities.length > 0 ? (
              activities.map((a: any) => {
                const meta = STATUS_META[a.status] || STATUS_META.NOT_STARTED;
                const duration = a.durationDays || Math.max(1, Math.round((new Date(a.plannedEnd).getTime() - new Date(a.plannedStart).getTime()) / 86400000) + 1);
                return (
                  <Card key={a.id}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <Text style={{ fontWeight: "900", color: t.text, fontSize: 14, flex: 1, paddingRight: 8 }}>{a.name}</Text>
                      <View style={{ backgroundColor: meta.bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 }}>
                        <Text style={{ fontSize: 10, fontWeight: "800", textTransform: "uppercase", color: meta.text }}>{meta.label}</Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8, gap: 4 }}>
                      <Ionicons name="calendar-outline" size={12} color={t.textMuted} />
                      <Text style={{ color: t.textMuted, fontSize: 11, fontWeight: "700" }}>{a.plannedStart} — {a.plannedEnd}</Text>
                    </View>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: t.inputBg, padding: 8, borderRadius: 10, marginBottom: 10 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <Ionicons name="time-outline" size={12} color={t.textMuted} />
                        <Text style={{ color: t.textSecondary, fontSize: 11, fontWeight: "800" }}>Duration: {duration} days</Text>
                      </View>
                      {project && project.contractValue > 0 && (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                          <Ionicons name="pie-chart-outline" size={12} color="#F5B81F" />
                          <Text style={{ color: t.textSecondary, fontSize: 11, fontWeight: "800" }}>
                            Allocation: {(((a.paymentValue || 0) / project.contractValue) * 100).toFixed(1)}%
                          </Text>
                        </View>
                      )}
                    </View>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                      <Text style={{ color: t.textMuted, fontSize: 10, fontWeight: "800", textTransform: "uppercase" }}>Progress</Text>
                      <Text style={{ color: t.text, fontSize: 11, fontWeight: "900" }}>{a.progress}%</Text>
                    </View>
                    <View style={{ height: 6, width: "100%", backgroundColor: t.inputBg, borderRadius: 3, overflow: "hidden" }}>
                      <View style={{ height: "100%", width: `${a.progress}%`, backgroundColor: "#F5B81F", borderRadius: 3 }} />
                    </View>
                  </Card>
                );
              })
            ) : (
              <Card>
                <View style={{ alignItems: "center", paddingVertical: 24 }}>
                  <Ionicons name="calendar-clear-outline" size={32} color={t.textMuted} />
                  <Text style={{ color: t.textSecondary, fontWeight: "700", marginTop: 8 }}>No timeline activities found.</Text>
                </View>
              </Card>
            )
          ) : (
            <View>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14, gap: 8 }}>
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search files (e.g. Contract, BOQ)..."
                  placeholderTextColor={t.textMuted}
                  style={[inputStyle, { flex: 1 }]}
                />
                <Pressable
                  onPress={() => refetchDocs()}
                  style={{ height: 48, width: 48, borderRadius: 14, backgroundColor: t.isDark ? "#222733" : "#0F172A", alignItems: "center", justifyContent: "center" }}
                >
                  <Ionicons name="search" size={18} color="#FFFFFF" />
                </Pressable>
              </View>

              {docsLoading ? (
                <View style={{ gap: 10 }}>
                  <Skeleton height={70} />
                  <Skeleton height={70} />
                </View>
              ) : documents.length > 0 ? (
                documents.map((doc: any) => (
                  <Card key={doc.id}>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: t.inputBg, borderWidth: 1, borderColor: t.cardBorder, alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                        <Ionicons name={DOC_ICON[doc.type] || "document-outline"} size={18} color="#F5B81F" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: t.text, fontWeight: "800", fontSize: 14 }}>{doc.name}</Text>
                        <Text style={{ color: t.textMuted, fontSize: 12, fontWeight: "600", marginTop: 2 }}>{doc.type} · Version {doc.version}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={t.textMuted} />
                    </View>
                  </Card>
                ))
              ) : (
                <Card>
                  <View style={{ alignItems: "center", paddingVertical: 24 }}>
                    <Ionicons name="document-text-outline" size={32} color={t.textMuted} />
                    <Text style={{ color: t.textSecondary, fontWeight: "700", marginTop: 8 }}>No documents found.</Text>
                  </View>
                </Card>
              )}
            </View>
          )}
        </Screen>
      </ScrollView>
    </SafeAreaView>
  );
}
