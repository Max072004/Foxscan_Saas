import { useQuery } from "@tanstack/react-query";
import { Text, View, ScrollView, TextInput, Pressable } from "react-native";
import { Screen, Title, Card, Button } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { useProjectStore } from "@/stores/project";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";

const DELAY_REASONS = [
  { value: "WEATHER", label: "Weather" },
  { value: "MATERIAL_SHORTAGE", label: "Material Shortage" },
  { value: "MANPOWER", label: "Manpower" },
  { value: "SOCIETY_ACCESS", label: "Society Access" },
  { value: "SCOPE_CHANGE", label: "Change of Scope" },
  { value: "OTHER", label: "Other" },
] as const;

export default function Delays() {
  const { token } = useAuthStore();
  const { data, refetch } = useQuery({
    queryKey: ["data"],
    queryFn: () => api<any>("/api/data"),
  });

  const [activityId, setActivityId] = useState("");
  const [reason, setReason] = useState<(typeof DELAY_REASONS)[number]["value"]>("WEATHER");
  const [impactDays, setImpactDays] = useState("1");
  const [mitigationPlan, setMitigationPlan] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const { selectedProjectId } = useProjectStore();
  const project = data?.projects?.find((p: any) => p.id === selectedProjectId) ?? data?.projects?.[0];
  const activities = (data?.activities ?? []).filter((a: any) => a.projectId === project?.id);
  const delays = (data?.delays ?? []).filter((d: any) => activities.some((a: any) => a.id === d.activityId));
  const openDelays = delays.filter((d: any) => !d.resolvedAt);
  const resolvedDelays = delays.filter((d: any) => d.resolvedAt);
  const totalImpactDays = openDelays.reduce((s: number, d: any) => s + d.impactDays, 0);

  const getActivityName = (id: string) => activities.find((a: any) => a.id === id)?.name || "Unknown";
  const getReasonLabel = (r: string) => DELAY_REASONS.find((dr) => dr.value === r)?.label || r;

  const submit = async () => {
    setError("");
    if (!activityId) { setError("Select an activity first."); return; }
    setSubmitting(true);
    try {
      await api("/api/delays", {
        method: "POST",
        body: JSON.stringify({
          activityId,
          reason,
          impactDays: Number(impactDays) || 1,
          mitigationPlan,
          targetClose: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        }),
      });
      setActivityId(""); setReason("WEATHER"); setImpactDays("1"); setMitigationPlan("");
      refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to log delay");
    } finally {
      setSubmitting(false);
    }
  };

  const resolve = async (delayId: string) => {
    await api("/api/delays", { method: "PATCH", body: JSON.stringify({ delayId, action: "resolve" }) });
    refetch();
  };

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }}>
      <Screen scroll>
        <Title icon="alert-circle-outline" eyebrow="Schedule Risk" subtitle="Causes, impact days, and mitigation plans">
          Delays
        </Title>

        <View className="flex-row justify-between mb-5" style={{ gap: 8 }}>
          <View className="flex-1">
            <Card>
              <Text className="text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-1">Open</Text>
              <Text className={`text-lg font-extrabold ${openDelays.length > 0 ? "text-[#EF4444]" : "text-[#22C55E]"}`}>{openDelays.length}</Text>
            </Card>
          </View>
          <View className="flex-1">
            <Card>
              <Text className="text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-1">Impact</Text>
              <Text className="text-lg font-extrabold text-[#F5B81F]">{totalImpactDays}d</Text>
            </Card>
          </View>
          <View className="flex-1">
            <Card>
              <Text className="text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-1">Resolved</Text>
              <Text className="text-lg font-extrabold text-[#22C55E]">{resolvedDelays.length}</Text>
            </Card>
          </View>
        </View>

        <Text className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Log New Delay</Text>
        <Card>
          <Text className="text-[11px] font-bold text-slate-400 uppercase mb-1.5">Activity</Text>
          <View className="flex-row flex-wrap mb-3" style={{ gap: 6 }}>
            {activities.map((a: any) => (
              <Pressable
                key={a.id}
                onPress={() => setActivityId(a.id)}
                className={`px-3 py-1.5 rounded-full border ${activityId === a.id ? "bg-brandAmber border-brandAmber" : "bg-slate-50 border-slate-200"}`}
              >
                <Text className={`text-[12px] font-bold ${activityId === a.id ? "text-slate-800 dark:text-white" : "text-slate-600"}`}>{a.name}</Text>
              </Pressable>
            ))}
          </View>

          <Text className="text-[11px] font-bold text-slate-400 uppercase mb-1.5">Reason</Text>
          <View className="flex-row flex-wrap mb-3" style={{ gap: 6 }}>
            {DELAY_REASONS.map((r) => (
              <Pressable
                key={r.value}
                onPress={() => setReason(r.value)}
                className={`px-3 py-1.5 rounded-full border ${reason === r.value ? "bg-brandCharcoal border-brandCharcoal" : "bg-slate-50 border-slate-200"}`}
              >
                <Text className={`text-[12px] font-bold ${reason === r.value ? "text-white" : "text-slate-600"}`}>{r.label}</Text>
              </Pressable>
            ))}
          </View>

          <Text className="text-[11px] font-bold text-slate-400 uppercase mb-1.5">Impact (days)</Text>
          <TextInput
            value={impactDays}
            onChangeText={setImpactDays}
            keyboardType="number-pad"
            className="h-11 border border-slate-200 bg-white rounded-xl px-4 text-slate-800 dark:text-white text-sm font-semibold mb-3"
          />

          <Text className="text-[11px] font-bold text-slate-400 uppercase mb-1.5">Mitigation Plan</Text>
          <TextInput
            value={mitigationPlan}
            onChangeText={setMitigationPlan}
            placeholder="Describe the mitigation strategy…"
            placeholderTextColor="#94A3B8"
            multiline
            className="border border-slate-200 rounded-xl p-3 mb-3 min-h-[70px] text-slate-800 dark:text-white text-sm font-medium"
            style={{ textAlignVertical: "top" }}
          />

          {error ? <Text className="text-[#EF4444] text-sm font-semibold mb-2">{error}</Text> : null}
          {!token && <Text className="text-slate-400 text-[11px] font-semibold mb-2">Sign in to log delays.</Text>}

          <Button label={submitting ? "Logging…" : "Log Delay"} onPress={submit} disabled={!token || submitting} />
        </Card>

        <Text className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 mt-2">
          Open Delays ({openDelays.length})
        </Text>
        {openDelays.length === 0 ? (
          <Card>
            <View className="items-center py-6">
              <Ionicons name="checkmark-circle-outline" size={32} color="#1B8755" />
              <Text className="text-slate-500 font-bold text-center mt-3">No open delays — on track!</Text>
            </View>
          </Card>
        ) : (
          openDelays.map((d: any) => {
            const isOverdue = new Date(d.targetClose) < new Date();
            return (
              <Card key={d.id}>
                <View className="flex-row justify-between items-center mb-1.5">
                  <Text className="font-bold text-slate-800 dark:text-white text-sm flex-1 pr-2">{getActivityName(d.activityId)}</Text>
                  <View className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200">
                    <Text className="text-[11px] font-bold text-slate-600 uppercase">{getReasonLabel(d.reason)}</Text>
                  </View>
                </View>
                <Text className="text-sm text-slate-500 font-semibold mb-2">
                  Impact: <Text className="text-[#EF4444] font-extrabold">{d.impactDays} days</Text> · Target: {new Date(d.targetClose).toLocaleDateString("en-IN")}
                  {isOverdue ? <Text className="text-[#EF4444] font-extrabold"> · OVERDUE</Text> : null}
                </Text>
                {d.mitigationPlan ? (
                  <Text className="text-sm text-slate-600 mb-2">{d.mitigationPlan}</Text>
                ) : null}
                <Button label="Mark Resolved" variant="secondary" onPress={() => resolve(d.id)} disabled={!token} />
              </Card>
            );
          })
        )}

        {resolvedDelays.length > 0 && (
          <>
            <Text className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 mt-2">
              Resolved ({resolvedDelays.length})
            </Text>
            {resolvedDelays.map((d: any) => (
              <Card key={d.id}>
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center flex-1" style={{ gap: 8 }}>
                    <Ionicons name="checkmark-circle" size={16} color="#1B8755" />
                    <Text className="text-sm font-bold text-slate-700">{getActivityName(d.activityId)}</Text>
                  </View>
                  <Text className="text-[11px] text-slate-400 font-semibold">{d.impactDays}d · {getReasonLabel(d.reason)}</Text>
                </View>
              </Card>
            ))}
          </>
        )}
      </Screen>
    </ScrollView>
  );
}
