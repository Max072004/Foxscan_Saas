import { useQuery } from "@tanstack/react-query";
import { Text, View, ScrollView } from "react-native";
import { Screen, Title, Card, SectionLabel, EmptyState } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { Ionicons } from "@expo/vector-icons";

function fmt(value: number) {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)}Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(2)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
  return `₹${value}`;
}

function Bar({ label, value, color = "#EAAC1F" }: { label: string; value: number; color?: string }) {
  return (
    <View className="mb-3">
      <View className="flex-row justify-between mb-1">
        <Text className="text-sm font-semibold text-slate-500">{label}</Text>
        <Text className="text-sm font-extrabold text-slate-800 dark:text-white">{value}%</Text>
      </View>
      <View className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
        <View className="h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, value))}%`, backgroundColor: color }} />
      </View>
    </View>
  );
}

export default function Reports() {
  const { token } = useAuthStore();
  const { data: report } = useQuery({
    queryKey: ["reports"],
    queryFn: () => api<any>("/api/reports"),
    enabled: !!token,
  });

  if (!token) {
    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }}>
        <Screen scroll>
          <Title icon="bar-chart-outline" eyebrow="Executive Intelligence">Reports</Title>
          <EmptyState
            icon="lock-closed-outline"
            title="Reports are locked"
            subtitle="Sign in from your Profile tab to unlock portfolio analytics, financial audits, and SLA compliance."
          />
        </Screen>
      </ScrollView>
    );
  }

  if (!report) {
    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }}>
        <Screen scroll>
          <Title icon="bar-chart-outline" eyebrow="Executive Intelligence">Reports</Title>
          <Card>
            <Text className="text-slate-400 font-semibold text-sm text-center py-6">Loading workspace insights…</Text>
          </Card>
        </Screen>
      </ScrollView>
    );
  }

  const progress = Math.round(report.portfolio.progress);
  const tatOnTime = report.tat.total > 0 ? Math.round((report.tat.onTime / report.tat.total) * 100) : 100;
  const contractVal = report.portfolio.contractValue;
  const paidPct = contractVal > 0 ? Math.round((report.payments.paid / contractVal) * 100) : 0;

  return (
    <ScrollView className="flex-1 bg-[#F8FAFC] dark:bg-[#101218]" contentContainerStyle={{ flexGrow: 1 }}>
      <Screen scroll>
        <Title icon="bar-chart-outline" eyebrow="Executive Intelligence" subtitle="Portfolio progress, financials, and SLA compliance">
          Reports
        </Title>

        <View className="flex-row flex-wrap" style={{ gap: 10, marginBottom: 4 }}>
          {[
            { label: "Active Projects", value: String(report.portfolio.projects), icon: "layers-outline", color: "#3B82F6", bg: "bg-sky-50 border-sky-100" },
            { label: "Portfolio Capital", value: fmt(contractVal), icon: "cash-outline", color: "#1B8755", bg: "bg-emerald-50 border-emerald-100" },
            { label: "Avg Progress", value: `${progress}%`, icon: "trending-up-outline", color: "#EAAC1F", bg: "bg-amber-50 border-amber-100" },
            { label: "SLA Violations", value: String(report.tat.overdue), icon: "alert-circle-outline", color: "#D9383A", bg: "bg-red-50 border-red-100" },
          ].map((k) => (
            <View key={k.label} style={{ width: "47%" }}>
              <Card>
                <View className={`w-9 h-9 rounded-lg border items-center justify-center mb-2 ${k.bg}`}>
                  <Ionicons name={k.icon as any} size={16} color={k.color} />
                </View>
                <Text className="text-slate-400 text-[11px] font-bold uppercase tracking-wide mb-0.5">{k.label}</Text>
                <Text className="text-lg font-extrabold text-slate-800 dark:text-white">{k.value}</Text>
              </Card>
            </View>
          ))}
        </View>

        <SectionLabel>Capital Utilization</SectionLabel>
        <Card>
          <Bar label="Billed Disbursements" value={contractVal > 0 ? Math.round((report.payments.invoiced / contractVal) * 100) : 0} color="#3B82F6" />
          <Bar label="Settled Accounts" value={paidPct} color="#1B8755" />
          <Bar label="Secured Retention" value={contractVal > 0 ? Math.round((report.payments.retention / contractVal) * 100) : 0} color="#F59E0B" />
          <View className="flex-row justify-between pt-2 mt-1 border-t border-slate-100">
            <Text className="text-[12px] text-slate-400 font-semibold">Billed {fmt(report.payments.invoiced)}</Text>
            <Text className="text-[12px] text-slate-400 font-semibold">Settled {fmt(report.payments.paid)}</Text>
            <Text className="text-[12px] text-slate-400 font-semibold">Retained {fmt(report.payments.retention)}</Text>
          </View>
        </Card>

        <SectionLabel>Compliance &amp; Timeline</SectionLabel>
        <Card>
          <Bar label="Construction Delivery" value={progress} color="#EAAC1F" />
          <Bar label="Disbursement Consumption" value={paidPct} color={paidPct > progress ? "#D9383A" : "#1B8755"} />
          <Bar label="SLA Turnaround (TAT)" value={tatOnTime} color={tatOnTime >= 80 ? "#1B8755" : tatOnTime >= 50 ? "#F59E0B" : "#D9383A"} />
          <Text className="text-slate-500 text-sm leading-relaxed mt-1">
            {progress >= 100
              ? "Closeout reached. Handover documentation pending final registry."
              : progress >= 50
              ? `Construction on-track. Approximately ${100 - progress}% remaining.`
              : "Early mobilization stage. High density of structural operations scheduled next."}
          </Text>
        </Card>

        <SectionLabel>Operational Status Matrix</SectionLabel>
        <Card>
          {[
            { label: "Not Mobilized", key: "NOT_STARTED", color: "#94A3B8" },
            { label: "Under Construction", key: "IN_PROGRESS", color: "#EAAC1F" },
            { label: "Submitted for Audit", key: "SUBMITTED", color: "#F59E0B" },
            { label: "Verified & Approved", key: "APPROVED", color: "#3B82F6" },
            { label: "Settled Account", key: "PAID", color: "#1B8755" },
          ].map((row, i, arr) => (
            <View key={row.key} className={`flex-row items-center py-2 ${i < arr.length - 1 ? "border-b border-slate-100" : ""}`} style={{ gap: 10 }}>
              <View className="w-2 h-2 rounded-full" style={{ backgroundColor: row.color }} />
              <Text className="text-sm font-semibold text-slate-600 flex-1">{row.label}</Text>
            </View>
          ))}
        </Card>

        <SectionLabel>Contingency Risks</SectionLabel>
        {report.delays.length === 0 ? (
          <EmptyState icon="checkmark-done-circle-outline" title="Zero critical incidents" subtitle="No active delays, access blocks, or material shortages reported." />
        ) : (
          report.delays.map((d: any) => (
            <Card key={d.id}>
              <View className="flex-row justify-between items-center mb-1.5">
                <View className="flex-row items-center flex-1" style={{ gap: 6 }}>
                  <Ionicons name="alert-circle" size={14} color="#D9383A" />
                  <Text className="font-extrabold text-slate-800 dark:text-white text-sm">{d.reason}</Text>
                </View>
                <View className="bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">
                  <Text className="text-[11px] font-extrabold text-[#EF4444]">{d.impactDays}d delay</Text>
                </View>
              </View>
              <Text className="text-slate-500 text-sm leading-relaxed mb-1.5">{d.mitigationPlan}</Text>
              <Text className="text-slate-300 text-[11px] font-bold uppercase tracking-wide">
                Target: {new Date(d.targetClose).toLocaleDateString("en-IN")}
              </Text>
            </Card>
          ))
        )}
      </Screen>
    </ScrollView>
  );
}
