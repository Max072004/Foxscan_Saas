import { useState } from "react";
import { Text, View, ScrollView, TextInput } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Screen, Title, Card, SectionLabel, EmptyState, Button } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { Ionicons } from "@expo/vector-icons";

const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  INVITED: { bg: "bg-slate-100 border border-slate-200", text: "text-slate-600" },
  SUBMITTED: { bg: "bg-sky-50 border border-sky-100", text: "text-sky-700" },
  AWARDED: { bg: "bg-emerald-50 border border-emerald-100", text: "text-successGreen" },
  REJECTED: { bg: "bg-red-50 border border-red-100", text: "text-alertRed" },
};

export default function Quotations() {
  const { token } = useAuthStore();
  const { data, refetch } = useQuery({
    queryKey: ["data"],
    queryFn: () => api<any>("/api/data"),
  });
  const [error, setError] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [vendorContact, setVendorContact] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const project = data?.projects?.[0];
  const quotations = ((data?.quotations ?? []) as any[])
    .filter((q) => q.projectId === project?.id)
    .sort((a, b) => a.amount - b.amount);
  const lowest = quotations.filter((q) => q.status !== "REJECTED").reduce((min, q) => (q.amount < min ? q.amount : min), Infinity);
  const awarded = quotations.find((q) => q.status === "AWARDED");

  const submit = async () => {
    setError("");
    if (!vendorName || !amount) { setError("Vendor name and amount are required."); return; }
    setSubmitting(true);
    try {
      await api("/api/quotations", {
        method: "POST",
        body: JSON.stringify({ projectId: project.id, vendorName, vendorContact: vendorContact || undefined, amount: Number(amount), notes: notes || undefined }),
      });
      setVendorName(""); setVendorContact(""); setAmount(""); setNotes("");
      refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record quotation");
    } finally {
      setSubmitting(false);
    }
  };

  const award = async (qid: string) => {
    try {
      await api("/api/quotations", { method: "PATCH", body: JSON.stringify({ id: qid, status: "AWARDED" }) });
      refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to award");
    }
  };

  const reject = async (qid: string) => {
    try {
      await api("/api/quotations", { method: "PATCH", body: JSON.stringify({ id: qid, status: "REJECTED" }) });
      refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject");
    }
  };

  return (
    <ScrollView className="flex-1 bg-offWhite" contentContainerStyle={{ flexGrow: 1 }}>
      <Screen>
        <Title icon="document-text-outline" eyebrow="Vendor Selection" subtitle="Invite quotes, compare side-by-side, and award the contract">
          Quotations
        </Title>

        {awarded && (
          <Card>
            <View className="flex-row items-center" style={{ gap: 10 }}>
              <Ionicons name="trophy-outline" size={18} color="#1B8755" />
              <Text className="text-xs text-slate-700 flex-1">
                <Text className="font-extrabold">{awarded.vendorName}</Text> awarded at ₹{awarded.amount.toLocaleString("en-IN")}
              </Text>
            </View>
          </Card>
        )}

        <SectionLabel>Record a Quotation</SectionLabel>
        <Card>
          <TextInput value={vendorName} onChangeText={setVendorName} placeholder="Vendor name" placeholderTextColor="#94A3B8" className="border border-slate-200 rounded-xl px-3 h-11 text-sm font-semibold text-brandCharcoal mb-2.5" />
          <TextInput value={vendorContact} onChangeText={setVendorContact} placeholder="Contact (phone/email)" placeholderTextColor="#94A3B8" className="border border-slate-200 rounded-xl px-3 h-11 text-sm font-semibold text-brandCharcoal mb-2.5" />
          <TextInput value={amount} onChangeText={setAmount} placeholder="Quoted amount (₹)" placeholderTextColor="#94A3B8" keyboardType="number-pad" className="border border-slate-200 rounded-xl px-3 h-11 text-sm font-semibold text-brandCharcoal mb-2.5" />
          <TextInput value={notes} onChangeText={setNotes} placeholder="Scope notes, exclusions…" placeholderTextColor="#94A3B8" multiline className="border border-slate-200 rounded-xl px-3 py-3 text-sm font-semibold text-brandCharcoal mb-3 min-h-[60px]" style={{ textAlignVertical: "top" }} />
          {error ? <Text className="text-alertRed text-xs font-semibold mb-2">{error}</Text> : null}
          {!token && <Text className="text-slate-400 text-[11px] font-semibold mb-2">Sign in to record or award quotations.</Text>}
          <Button label={submitting ? "Saving…" : "Add Quotation"} onPress={submit} disabled={!token || submitting} />
        </Card>

        <SectionLabel>Comparison ({quotations.length})</SectionLabel>
        {quotations.length === 0 ? (
          <EmptyState icon="document-text-outline" title="No quotations yet" subtitle="Vendor quotes recorded for this project will appear here for comparison." />
        ) : (
          quotations.map((q: any) => {
            const style = STATUS_STYLE[q.status] || STATUS_STYLE.INVITED;
            const isLowest = q.amount === lowest && q.status !== "REJECTED";
            return (
              <Card key={q.id}>
                <View className="flex-row justify-between items-center mb-1.5">
                  <Text className="font-extrabold text-brandCharcoal text-sm flex-1 pr-2">{q.vendorName}</Text>
                  <View className={`px-2 py-0.5 rounded-full ${style.bg}`}>
                    <Text className={`text-[10px] font-extrabold ${style.text}`}>{q.status}</Text>
                  </View>
                </View>
                <Text className={`text-lg font-extrabold mb-1 ${isLowest ? "text-successGreen" : "text-brandCharcoal"}`}>
                  ₹{q.amount.toLocaleString("en-IN")} {isLowest ? "★ Lowest" : ""}
                </Text>
                {q.vendorContact ? <Text className="text-slate-400 text-xs font-semibold mb-1">{q.vendorContact}</Text> : null}
                {q.notes ? <Text className="text-slate-600 text-xs leading-relaxed mb-3">{q.notes}</Text> : null}
                {q.status !== "AWARDED" && q.status !== "REJECTED" && (
                  <View className="flex-row" style={{ gap: 8 }}>
                    <View className="flex-1">
                      <Button label="Award" onPress={() => award(q.id)} disabled={!token} />
                    </View>
                    <View className="flex-1">
                      <Button label="Reject" variant="danger" onPress={() => reject(q.id)} disabled={!token} />
                    </View>
                  </View>
                )}
              </Card>
            );
          })
        )}
      </Screen>
    </ScrollView>
  );
}
