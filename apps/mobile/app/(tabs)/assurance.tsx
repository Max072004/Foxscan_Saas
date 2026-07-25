import { useState } from "react";
import { Text, View, ScrollView, TextInput, Pressable } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Screen, Title, Card, SectionLabel, EmptyState, Button } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { useProjectStore } from "@/stores/project";
import { Ionicons } from "@expo/vector-icons";

const DLP_COLOR: Record<string, { bg: string; text: string }> = {
  ACTIVE: { bg: "bg-sky-50 border-sky-100", text: "text-sky-700" },
  INSPECTION_DUE: { bg: "bg-amber-50 border-amber-100", text: "text-amber-700" },
  OVERDUE: { bg: "bg-red-50 border-red-100", text: "text-[#EF4444]" },
  CLOSED: { bg: "bg-emerald-50 border-emerald-100", text: "text-[#22C55E]" },
};
const WARRANTY_COLOR: Record<string, { bg: string; text: string }> = {
  ACTIVE: { bg: "bg-emerald-50 border-emerald-100", text: "text-[#22C55E]" },
  EXPIRING: { bg: "bg-amber-50 border-amber-100", text: "text-amber-700" },
  EXPIRED: { bg: "bg-red-50 border-red-100", text: "text-[#EF4444]" },
};
const DISPUTE_COLOR: Record<string, { bg: string; text: string }> = {
  OPEN: { bg: "bg-red-50 border-red-100", text: "text-[#EF4444]" },
  UNDER_REVIEW: { bg: "bg-amber-50 border-amber-100", text: "text-amber-700" },
  RESOLVED: { bg: "bg-emerald-50 border-emerald-100", text: "text-[#22C55E]" },
  CLOSED: { bg: "bg-slate-100 border-slate-200", text: "text-slate-600" },
};
const DISPUTE_CATEGORIES = ["QUALITY", "PAYMENT", "SCOPE", "DELAY", "SAFETY", "OTHER"] as const;

type SectionKey = "dlp" | "warranty" | "dispute";

export default function Assurance() {
  const { token } = useAuthStore();
  const { data, refetch } = useQuery({
    queryKey: ["data"],
    queryFn: () => api<any>("/api/data"),
  });
  const [section, setSection] = useState<SectionKey>("dlp");
  const [error, setError] = useState("");

  const { selectedProjectId } = useProjectStore();
  const project = data?.projects?.find((p: any) => p.id === selectedProjectId) ?? data?.projects?.[0];
  const dlpCases = (data?.dlpCases ?? []).filter((c: any) => c.projectId === project?.id);
  const warranties = (data?.warranties ?? []).filter((w: any) => w.projectId === project?.id);
  const disputes = (data?.disputes ?? []).filter((d: any) => d.projectId === project?.id);

  // DLP form
  const [dlpStartsOn, setDlpStartsOn] = useState("");
  const [dlpEndsOn, setDlpEndsOn] = useState("");
  const [dlpInspectionDue, setDlpInspectionDue] = useState("");
  const [dlpRetention, setDlpRetention] = useState("");
  const [dlpSubmitting, setDlpSubmitting] = useState(false);

  // Warranty form
  const [wProvider, setWProvider] = useState("");
  const [wType, setWType] = useState<"MANUFACTURER" | "WORKMANSHIP">("MANUFACTURER");
  const [wReference, setWReference] = useState("");
  const [wStartsOn, setWStartsOn] = useState("");
  const [wEndsOn, setWEndsOn] = useState("");
  const [wCoverage, setWCoverage] = useState("");
  const [wSubmitting, setWSubmitting] = useState(false);

  // Dispute form
  const [dCategory, setDCategory] = useState<(typeof DISPUTE_CATEGORIES)[number]>("QUALITY");
  const [dTitle, setDTitle] = useState("");
  const [dDescription, setDDescription] = useState("");
  const [dSubmitting, setDSubmitting] = useState(false);

  const submitDlp = async () => {
    setError("");
    if (!project?.contractorId) { setError("This project has no contractor assigned yet."); return; }
    if (!dlpStartsOn || !dlpEndsOn || !dlpInspectionDue || !dlpRetention) { setError("All DLP fields are required."); return; }
    setDlpSubmitting(true);
    try {
      await api("/api/dlp", {
        method: "POST",
        body: JSON.stringify({
          projectId: project.id,
          contractorId: project.contractorId,
          startsOn: dlpStartsOn,
          endsOn: dlpEndsOn,
          inspectionDueOn: dlpInspectionDue,
          retentionAmount: Number(dlpRetention),
        }),
      });
      setDlpStartsOn(""); setDlpEndsOn(""); setDlpInspectionDue(""); setDlpRetention("");
      refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start DLP case");
    } finally {
      setDlpSubmitting(false);
    }
  };

  const closeDlp = async (id: string) => {
    try {
      await api("/api/dlp", { method: "PATCH", body: JSON.stringify({ id, status: "CLOSED" }) });
      refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to close DLP case");
    }
  };

  const submitWarranty = async () => {
    setError("");
    if (!project?.id) { setError("No project selected."); return; }
    if (!wProvider || !wReference || !wStartsOn || !wEndsOn || !wCoverage) { setError("All warranty fields are required."); return; }
    setWSubmitting(true);
    try {
      await api("/api/warranties", {
        method: "POST",
        body: JSON.stringify({
          projectId: project.id,
          provider: wProvider,
          type: wType,
          reference: wReference,
          startsOn: wStartsOn,
          endsOn: wEndsOn,
          coverage: wCoverage,
        }),
      });
      setWProvider(""); setWReference(""); setWStartsOn(""); setWEndsOn(""); setWCoverage("");
      refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to register warranty");
    } finally {
      setWSubmitting(false);
    }
  };

  const submitDispute = async () => {
    setError("");
    if (!project?.id) { setError("No project selected."); return; }
    if (!dTitle || !dDescription) { setError("Title and description are required."); return; }
    setDSubmitting(true);
    try {
      await api("/api/disputes", {
        method: "POST",
        body: JSON.stringify({
          projectId: project.id,
          category: dCategory,
          title: dTitle,
          description: dDescription,
          evidenceIds: [],
        }),
      });
      setDTitle(""); setDDescription("");
      refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to raise dispute");
    } finally {
      setDSubmitting(false);
    }
  };

  const transitionDispute = async (id: string, status: "UNDER_REVIEW" | "RESOLVED" | "CLOSED") => {
    try {
      await api("/api/disputes", { method: "PATCH", body: JSON.stringify({ id, status }) });
      refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update dispute");
    }
  };

  const TABS: { key: SectionKey; label: string; icon: keyof typeof Ionicons.glyphMap; count: number }[] = [
    { key: "dlp", label: "DLP", icon: "time-outline", count: dlpCases.length },
    { key: "warranty", label: "Warranty", icon: "shield-checkmark-outline", count: warranties.length },
    { key: "dispute", label: "Disputes", icon: "hammer-outline", count: disputes.length },
  ];

  return (
    <ScrollView className="flex-1 bg-[#F8FAFC] dark:bg-[#101218]" contentContainerStyle={{ flexGrow: 1 }}>
      <Screen scroll>
        <Title icon="shield-checkmark-outline" eyebrow="Risk & Assurance" subtitle="Defect liability, warranties, and formal disputes">
          Assurance
        </Title>

        <View className="flex-row bg-white border border-slate-200 rounded-2xl p-1 mb-5">
          {TABS.map((t) => {
            const active = section === t.key;
            return (
              <Pressable
                key={t.key}
                onPress={() => setSection(t.key)}
                className={`flex-1 flex-row items-center justify-center py-2.5 rounded-xl ${active ? "bg-brandCharcoal" : ""}`}
                style={{ gap: 6 }}
              >
                <Ionicons name={t.icon} size={14} color={active ? "#EAAC1F" : "#64748B"} />
                <Text className={`text-sm font-extrabold ${active ? "text-white" : "text-slate-500"}`}>
                  {t.label}{t.count > 0 ? ` (${t.count})` : ""}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {!token && (
          <Card>
            <View className="flex-row items-center" style={{ gap: 10 }}>
              <Ionicons name="lock-closed-outline" size={16} color="#94A3B8" />
              <Text className="text-slate-500 text-sm font-semibold flex-1">
                Sign in to create or update DLP cases, warranties, and disputes.
              </Text>
            </View>
          </Card>
        )}

        {error ? (
          <Text className="text-[#EF4444] text-sm font-semibold mb-3">{error}</Text>
        ) : null}

        {/* --- DLP --- */}
        {section === "dlp" && (
          <>
            <SectionLabel>Start DLP Case</SectionLabel>
            <Card>
              <View className="flex-row" style={{ gap: 8 }}>
                <TextInput value={dlpStartsOn} onChangeText={setDlpStartsOn} placeholder="Starts (YYYY-MM-DD)" placeholderTextColor="#94A3B8" className="flex-1 border border-slate-200 rounded-xl px-3 h-11 text-sm font-semibold text-slate-800 dark:text-white" />
                <TextInput value={dlpEndsOn} onChangeText={setDlpEndsOn} placeholder="Ends (YYYY-MM-DD)" placeholderTextColor="#94A3B8" className="flex-1 border border-slate-200 rounded-xl px-3 h-11 text-sm font-semibold text-slate-800 dark:text-white" />
              </View>
              <View className="h-2.5" />
              <TextInput value={dlpInspectionDue} onChangeText={setDlpInspectionDue} placeholder="Inspection due (YYYY-MM-DD)" placeholderTextColor="#94A3B8" className="border border-slate-200 rounded-xl px-3 h-11 text-sm font-semibold text-slate-800 dark:text-white mb-2.5" />
              <TextInput value={dlpRetention} onChangeText={setDlpRetention} placeholder="Retention amount held (₹)" placeholderTextColor="#94A3B8" keyboardType="number-pad" className="border border-slate-200 rounded-xl px-3 h-11 text-sm font-semibold text-slate-800 dark:text-white mb-3" />
              <Button label={dlpSubmitting ? "Starting…" : "Start DLP Case"} onPress={submitDlp} disabled={!token || dlpSubmitting} />
            </Card>

            <SectionLabel>DLP Cases</SectionLabel>
            {dlpCases.length === 0 ? (
              <EmptyState icon="time-outline" title="No DLP cases yet" subtitle="Defect liability tracking starts once a case is opened for this project." />
            ) : (
              dlpCases.map((c: any) => {
                const sc = DLP_COLOR[c.status] || DLP_COLOR.ACTIVE;
                return (
                  <Card key={c.id}>
                    <View className="flex-row justify-between items-center mb-1.5">
                      <Text className="font-extrabold text-slate-800 dark:text-white text-sm">₹{c.retentionAmount.toLocaleString("en-IN")} retention</Text>
                      <View className={`px-2 py-0.5 rounded-full border ${sc.bg}`}>
                        <Text className={`text-[11px] font-extrabold ${sc.text}`}>{c.status.replace("_", " ")}</Text>
                      </View>
                    </View>
                    <Text className="text-slate-400 text-sm font-semibold mb-3">
                      {new Date(c.startsOn).toLocaleDateString("en-IN")} – {new Date(c.endsOn).toLocaleDateString("en-IN")} · Inspection {new Date(c.inspectionDueOn).toLocaleDateString("en-IN")}
                    </Text>
                    {c.status !== "CLOSED" && (
                      <Button label="Close DLP Case" variant="secondary" onPress={() => closeDlp(c.id)} disabled={!token} />
                    )}
                  </Card>
                );
              })
            )}
          </>
        )}

        {/* --- Warranty --- */}
        {section === "warranty" && (
          <>
            <SectionLabel>Register Warranty</SectionLabel>
            <Card>
              <TextInput value={wProvider} onChangeText={setWProvider} placeholder="Provider (e.g. Asian Paints)" placeholderTextColor="#94A3B8" className="border border-slate-200 rounded-xl px-3 h-11 text-sm font-semibold text-slate-800 dark:text-white mb-2.5" />
              <View className="flex-row mb-2.5" style={{ gap: 8 }}>
                <Pressable onPress={() => setWType("MANUFACTURER")} className={`flex-1 h-11 rounded-xl border items-center justify-center ${wType === "MANUFACTURER" ? "bg-brandAmber border-brandAmber" : "bg-white border-slate-200"}`}>
                  <Text className={`text-[12px] font-bold ${wType === "MANUFACTURER" ? "text-slate-800 dark:text-white" : "text-slate-500"}`}>Manufacturer</Text>
                </Pressable>
                <Pressable onPress={() => setWType("WORKMANSHIP")} className={`flex-1 h-11 rounded-xl border items-center justify-center ${wType === "WORKMANSHIP" ? "bg-brandAmber border-brandAmber" : "bg-white border-slate-200"}`}>
                  <Text className={`text-[12px] font-bold ${wType === "WORKMANSHIP" ? "text-slate-800 dark:text-white" : "text-slate-500"}`}>Workmanship</Text>
                </Pressable>
              </View>
              <TextInput value={wReference} onChangeText={setWReference} placeholder="Reference no." placeholderTextColor="#94A3B8" className="border border-slate-200 rounded-xl px-3 h-11 text-sm font-semibold text-slate-800 dark:text-white mb-2.5" />
              <View className="flex-row mb-2.5" style={{ gap: 8 }}>
                <TextInput value={wStartsOn} onChangeText={setWStartsOn} placeholder="Starts (YYYY-MM-DD)" placeholderTextColor="#94A3B8" className="flex-1 border border-slate-200 rounded-xl px-3 h-11 text-sm font-semibold text-slate-800 dark:text-white" />
                <TextInput value={wEndsOn} onChangeText={setWEndsOn} placeholder="Ends (YYYY-MM-DD)" placeholderTextColor="#94A3B8" className="flex-1 border border-slate-200 rounded-xl px-3 h-11 text-sm font-semibold text-slate-800 dark:text-white" />
              </View>
              <TextInput value={wCoverage} onChangeText={setWCoverage} placeholder="Coverage details…" placeholderTextColor="#94A3B8" multiline className="border border-slate-200 rounded-xl px-3 py-3 text-sm font-semibold text-slate-800 dark:text-white mb-3 min-h-[60px]" style={{ textAlignVertical: "top" }} />
              <Button label={wSubmitting ? "Registering…" : "Register Warranty"} onPress={submitWarranty} disabled={!token || wSubmitting} />
            </Card>

            <SectionLabel>Warranties</SectionLabel>
            {warranties.length === 0 ? (
              <EmptyState icon="shield-checkmark-outline" title="No warranties registered" subtitle="Manufacturer and workmanship warranties will show up here." />
            ) : (
              warranties.map((w: any) => {
                const sc = WARRANTY_COLOR[w.status] || WARRANTY_COLOR.ACTIVE;
                return (
                  <Card key={w.id}>
                    <View className="flex-row justify-between items-center mb-1">
                      <Text className="font-extrabold text-slate-800 dark:text-white text-sm">{w.provider}</Text>
                      <View className={`px-2 py-0.5 rounded-full border ${sc.bg}`}>
                        <Text className={`text-[11px] font-extrabold ${sc.text}`}>{w.status}</Text>
                      </View>
                    </View>
                    <Text className="text-slate-400 text-sm font-semibold mb-2">
                      {w.type === "MANUFACTURER" ? "Manufacturer" : "Workmanship"} · Ref {w.reference} · Expires {new Date(w.endsOn).toLocaleDateString("en-IN")}
                    </Text>
                    <Text className="text-slate-600 text-sm leading-relaxed">{w.coverage}</Text>
                  </Card>
                );
              })
            )}
          </>
        )}

        {/* --- Disputes --- */}
        {section === "dispute" && (
          <>
            <SectionLabel>Raise Dispute</SectionLabel>
            <Card>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2.5" contentContainerStyle={{ flexDirection: "row", alignItems: "flex-start" }}>
                {DISPUTE_CATEGORIES.map((c) => (
                  <Pressable key={c} onPress={() => setDCategory(c)} style={{ alignSelf: "flex-start" }} className={`px-3 py-2 rounded-full mr-2 border ${dCategory === c ? "bg-brandCharcoal border-brandCharcoal" : "bg-white border-slate-200"}`}>
                    <Text className={`text-sm font-bold ${dCategory === c ? "text-white" : "text-slate-500"}`}>{c.charAt(0) + c.slice(1).toLowerCase()}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <TextInput value={dTitle} onChangeText={setDTitle} placeholder="Short summary" placeholderTextColor="#94A3B8" className="border border-slate-200 rounded-xl px-3 h-11 text-sm font-semibold text-slate-800 dark:text-white mb-2.5" />
              <TextInput value={dDescription} onChangeText={setDDescription} placeholder="Describe the issue in detail…" placeholderTextColor="#94A3B8" multiline className="border border-slate-200 rounded-xl px-3 py-3 text-sm font-semibold text-slate-800 dark:text-white mb-3 min-h-[70px]" style={{ textAlignVertical: "top" }} />
              <Button label={dSubmitting ? "Raising…" : "Raise Dispute"} variant="danger" onPress={submitDispute} disabled={!token || dSubmitting} />
            </Card>

            <SectionLabel>Disputes</SectionLabel>
            {disputes.length === 0 ? (
              <EmptyState icon="hammer-outline" title="No disputes — clean record" subtitle="Formal disputes raised on this project will appear here." />
            ) : (
              disputes.map((d: any) => {
                const sc = DISPUTE_COLOR[d.status] || DISPUTE_COLOR.OPEN;
                return (
                  <Card key={d.id}>
                    <View className="flex-row justify-between items-center mb-1">
                      <Text className="font-extrabold text-slate-800 dark:text-white text-sm flex-1 pr-2">{d.title}</Text>
                      <View className={`px-2 py-0.5 rounded-full border ${sc.bg}`}>
                        <Text className={`text-[11px] font-extrabold ${sc.text}`}>{d.status.replace("_", " ")}</Text>
                      </View>
                    </View>
                    <Text className="text-slate-400 text-[11px] font-bold uppercase tracking-wide mb-2">{d.category}</Text>
                    <Text className="text-slate-600 text-sm leading-relaxed mb-3">{d.description}</Text>
                    {d.resolution ? (
                      <Text className="text-[#22C55E] text-sm leading-relaxed mb-3">
                        <Text className="font-extrabold">Resolution: </Text>{d.resolution}
                      </Text>
                    ) : null}
                    <View className="flex-row" style={{ gap: 8 }}>
                      {d.status === "OPEN" && (
                        <View className="flex-1">
                          <Button label="Start Review" variant="outline" onPress={() => transitionDispute(d.id, "UNDER_REVIEW")} disabled={!token} />
                        </View>
                      )}
                      {d.status === "UNDER_REVIEW" && (
                        <View className="flex-1">
                          <Button label="Mark Resolved" onPress={() => transitionDispute(d.id, "RESOLVED")} disabled={!token} />
                        </View>
                      )}
                      {d.status !== "CLOSED" && (
                        <View className="flex-1">
                          <Button label="Close" variant="secondary" onPress={() => transitionDispute(d.id, "CLOSED")} disabled={!token} />
                        </View>
                      )}
                    </View>
                  </Card>
                );
              })
            )}
          </>
        )}
      </Screen>
    </ScrollView>
  );
}
