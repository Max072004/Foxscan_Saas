import { useQuery } from "@tanstack/react-query";
import { Text, View, ScrollView, Pressable, useColorScheme } from "react-native";
import { Screen, Title, Card, Skeleton, useTheme, ProjectSwitcher } from "@/components/ui";
import { api } from "@/lib/api";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/stores/auth";
import { useProjectStore } from "@/stores/project";
import { calculateProjectSlippage } from "@/lib/scheduling";

export default function Dashboard() {
  const t = useTheme();
  const router = useRouter();
  const { role, userId } = useAuthStore();
  const { selectedProjectId } = useProjectStore();
  const { data, error, isLoading } = useQuery({
    queryKey: ["reports"],
    queryFn: () => api<any>("/api/reports"),
  });

  const { data: globalData } = useQuery({
    queryKey: ["data"],
    queryFn: () => api<any>("/api/data"),
  });

  const progress = data ? Math.round(data.portfolio.progress) : 0;

  const isAdmin = role === "ADMIN";
  const isContractor = role === "CONTRACTOR";
  const isManufacturer = role === "MANUFACTURER";
  const isConsultant = role === "CONSULTANT";
  const isClient = role === "CLIENT";
  const showFinancial = isAdmin || isClient || isConsultant;

  const activeProject = globalData?.projects?.find((p: any) => p.id === selectedProjectId) ?? globalData?.projects?.[0];
  const activeProjActs = activeProject ? (globalData?.activities?.filter((a: any) => a.projectId === activeProject.id) || []) : [];
  const activeProjStages = activeProject ? (globalData?.stages?.filter((s: any) => activeProjActs.some((a: any) => a.id === s.activityId)) || []) : [];
  const activeSlippage = activeProject ? calculateProjectSlippage(activeProject, activeProjActs, activeProjStages) : null;

  const pendingStages = (activeProjStages || []).filter((s: any) => {
    if (s.state === "PAID") return false;
    if (isAdmin || isConsultant) return true;
    if (isContractor) return s.state === "REWORK" || s.submittedBy === userId;
    if (isManufacturer) return s.state === "MANUFACTURER";
    if (isClient) return s.state === "CLIENT";
    return true;
  });
  const overdueCount = pendingStages.filter((s: any) => new Date(s.dueAt) < new Date()).length;

  const tileBg = t.isDark ? "#181B22" : "#F8FAFC";
  const tileBorder = t.isDark ? "#272C38" : "#E2E8F0";

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ flexGrow: 1 }}>
      {/* Industrial Safety Accent Bar */}
      <View style={{ height: 6, width: "100%", backgroundColor: "#F5B81F" }} />

      <Screen scroll>
        <Title icon="speedometer-outline" eyebrow="Workspace Overview" subtitle="Live project health, disbursements, and stage compliance">
          Dashboard
        </Title>
        <ProjectSwitcher />
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20, gap: 8 }}>
          <View style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.cardBorder, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}>
            <Text style={{ color: "#F5B81F", fontSize: 11, fontWeight: "900", textTransform: "uppercase", letterSpacing: 1 }}>
              Viewing as {role || "Member"}
            </Text>
          </View>
        </View>

        {error ? (
          <View style={{ marginBottom: 20, padding: 16, backgroundColor: "rgba(239,68,68,0.08)", borderWidth: 1, borderColor: "rgba(239,68,68,0.2)", borderRadius: 16 }}>
            <Text style={{ color: "#EF4444", fontWeight: "800", fontSize: 14 }}>{error.message}</Text>
          </View>
        ) : null}

        {isLoading ? (
          <View style={{ gap: 12 }}>
            <Skeleton height={140} />
            <Skeleton height={100} />
            <Skeleton height={120} />
          </View>
        ) : data ? (
          <View style={{ gap: 16 }}>
            {/* HERO CARD: Overall Project Progress */}
            <Card>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <View style={{ flex: 1, paddingRight: 16 }}>
                  <Text style={{ color: t.textSecondary, fontSize: 11, fontWeight: "900", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
                    Active Workspace Health
                  </Text>
                  <Text style={{ fontSize: 22, fontWeight: "900", color: t.text, lineHeight: 28 }}>
                    {activeProject?.name || "No project assigned"}
                  </Text>
                  {activeSlippage ? (
                    <Text style={{ fontSize: 15, fontWeight: "900", marginTop: 8, color: activeSlippage.status === "BEHIND" ? "#EF4444" : activeSlippage.status === "AHEAD" ? "#22C55E" : t.textSecondary }}>
                      {activeSlippage.status === "BEHIND"
                        ? `⚠️ ${activeSlippage.slippageDays}d behind schedule`
                        : activeSlippage.status === "AHEAD"
                        ? `🚀 ${Math.abs(activeSlippage.slippageDays)}d ahead of schedule`
                        : "✓ On track (no slippage)"}
                    </Text>
                  ) : (
                    <Text style={{ color: t.textSecondary, fontSize: 14, fontWeight: "600", marginTop: 4 }}>
                      Scaffolding & coatings active
                    </Text>
                  )}
                </View>

                {/* Progress Circle Ring */}
                <View style={{ width: 80, height: 80, alignItems: "center", justifyContent: "center" }}>
                  <View style={{ position: "absolute", width: 80, height: 80, borderRadius: 40, borderWidth: 6, borderColor: t.isDark ? "#272C38" : "#E2E8F0" }} />
                  <View
                    style={{ position: "absolute", width: 80, height: 80, borderRadius: 40, borderWidth: 6, borderColor: "#F5B81F", borderTopColor: "transparent", borderLeftColor: "transparent", transform: [{ rotate: "45deg" }] }}
                  />
                  {progress > 50 && (
                    <View
                      style={{ position: "absolute", width: 80, height: 80, borderRadius: 40, borderWidth: 6, borderColor: "#F5B81F", borderBottomColor: "transparent", borderRightColor: "transparent", transform: [{ rotate: "45deg" }] }}
                    />
                  )}
                  <Text style={{ fontSize: 18, fontWeight: "900", color: t.text }}>
                    {progress}%
                  </Text>
                </View>
              </View>
            </Card>

            {/* ASYMMETRIC GRID */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
              <View style={{ width: "56%" }}>
                <Card>
                  <View style={{ minHeight: 110, justifyContent: "space-between", flexDirection: "column" }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <View style={{ width: 36, height: 36, borderRadius: 16, alignItems: "center", justifyContent: "center", borderWidth: 1, backgroundColor: showFinancial ? "rgba(34,197,94,0.08)" : "rgba(14,165,233,0.08)", borderColor: showFinancial ? "rgba(34,197,94,0.2)" : "rgba(14,165,233,0.2)" }}>
                        <Ionicons name={showFinancial ? "cash-outline" : "layers-outline"} size={20} color={showFinancial ? "#22C55E" : "#0EA5E9"} />
                      </View>
                      <Text style={{ fontSize: 11, fontWeight: "900", textTransform: "uppercase", color: showFinancial ? "#22C55E" : "#0EA5E9" }}>
                        {showFinancial ? "Cleared" : "In Pipeline"}
                      </Text>
                    </View>
                    {showFinancial ? (
                      <View style={{ marginTop: 16 }}>
                        <Text style={{ color: t.textSecondary, fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
                          Disbursed
                        </Text>
                        <Text style={{ fontSize: 22, fontWeight: "900", color: "#22C55E" }}>
                          ₹{(data.payments.paid / 100000).toFixed(1)}L
                        </Text>
                      </View>
                    ) : (
                      <View style={{ marginTop: 16 }}>
                        <Text style={{ color: t.textSecondary, fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
                          Active Stages
                        </Text>
                        <Text style={{ fontSize: 22, fontWeight: "900", color: "#0EA5E9" }}>
                          {pendingStages.length}
                        </Text>
                      </View>
                    )}
                  </View>
                </Card>
              </View>

              <View style={{ width: "41%", justifyContent: "space-between", gap: 4, flexDirection: "column" }}>
                <Card>
                  <View style={{ minHeight: 46, justifyContent: "space-between", flexDirection: "row", alignItems: "center" }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: t.textSecondary, fontSize: 10, fontWeight: "900", textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>
                        Overdue
                      </Text>
                      <Text style={{ fontSize: 18, fontWeight: "900", color: overdueCount > 0 ? "#EF4444" : t.text }}>
                        {overdueCount}
                      </Text>
                    </View>
                    <View style={{ width: 28, height: 28, borderRadius: 12, backgroundColor: overdueCount > 0 ? "rgba(239,68,68,0.08)" : (t.isDark ? "#222733" : "#F1F5F9"), alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: overdueCount > 0 ? "rgba(239,68,68,0.2)" : t.cardBorder }}>
                      <Ionicons name="alert-circle-outline" size={16} color={overdueCount > 0 ? "#EF4444" : "#94A3B8"} />
                    </View>
                  </View>
                </Card>

                <Card>
                  <View style={{ minHeight: 46, justifyContent: "space-between", flexDirection: "row", alignItems: "center" }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: t.textSecondary, fontSize: 10, fontWeight: "900", textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>
                        Projects
                      </Text>
                      <Text style={{ fontSize: 18, fontWeight: "900", color: t.text }}>
                        {data.portfolio.projects}
                      </Text>
                    </View>
                    <View style={{ width: 28, height: 28, borderRadius: 12, backgroundColor: t.isDark ? "#222733" : "#F1F5F9", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: t.cardBorder }}>
                      <Ionicons name="business-outline" size={16} color="#94A3B8" />
                    </View>
                  </View>
                </Card>
              </View>
            </View>

            {/* QUICK ACCESSIBILITY LAUNCHER LIST */}
            <Card>
              <Text style={{ color: t.textSecondary, fontSize: 11, fontWeight: "900", textTransform: "uppercase", letterSpacing: 1, marginBottom: 16 }}>
                Quick Command Hub
              </Text>
              <View style={{ flexDirection: "column" }}>
                {[
                  { label: "Timeline", desc: "View sequenced work & progress", route: "/activities", icon: "calendar-outline", color: "#F5B81F" },
                  { label: "Vault", desc: "Access project documents & drawings", route: "/documents", icon: "folder-outline", color: "#3B82F6" },
                  { label: "Payments", desc: "Track GST, retentions & billing", route: "/payments", icon: "receipt-outline", color: "#22C55E" },
                  { label: "Delays", desc: "Report & review project bottlenecks", route: "/delays", icon: "warning-outline", color: "#EF4444" },
                  { label: "Discussions", desc: "Chat with client, contractor & admin", route: "/discussion", icon: "chatbubbles-outline", color: "#8B5CF6" },
                  { label: "Quotes", desc: "Manage budget & estimate sheets", route: "/quotations", icon: "pricetags-outline", color: "#EC4899" },
                  { label: "Assurance", desc: "View check sheets & quality logs", route: "/assurance", icon: "shield-checkmark-outline", color: "#0EA5E9" },
                  { label: "Reports", desc: "Generate overall site reports", route: "/reports", icon: "bar-chart-outline", color: "#F59E0B" },
                ].map((item, index, arr) => (
                  <Pressable
                    key={item.label}
                    onPress={() => router.push(item.route as any)}
                    style={({ pressed }) => ({
                      flexDirection: "row",
                      alignItems: "center",
                      paddingVertical: 14,
                      borderBottomWidth: index === arr.length - 1 ? 0 : 1,
                      borderBottomColor: t.cardBorder,
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: `${item.color}15`, alignItems: "center", justifyContent: "center", marginRight: 14, borderWidth: 1, borderColor: `${item.color}25` }}>
                      <Ionicons name={item.icon as any} size={20} color={item.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 16, fontWeight: "700", color: t.text }}>{item.label}</Text>
                      <Text style={{ fontSize: 13, color: t.textSecondary, marginTop: 2 }}>{item.desc}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={t.textMuted} />
                  </Pressable>
                ))}
              </View>
            </Card>
          </View>
        ) : null}
      </Screen>
    </ScrollView>
  );
}
