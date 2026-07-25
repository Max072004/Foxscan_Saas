import { useQuery } from "@tanstack/react-query";
import { Text, View, ScrollView } from "react-native";
import { Screen, Title, Card } from "@/components/ui";
import { api } from "@/lib/api";
import { Ionicons } from "@expo/vector-icons";
import { useProjectStore } from "@/stores/project";

export default function Payments() {
  const { data } = useQuery({
    queryKey: ["data"],
    queryFn: () => api<any>("/api/data"),
  });

  const { selectedProjectId } = useProjectStore();
  const project = data?.projects?.find((p: any) => p.id === selectedProjectId) ?? data?.projects?.[0];
  const activities = (data?.activities ?? []).filter((a: any) => a.projectId === project?.id);
  const contractValue = project?.contractValue || 0;

  const netDue = (a: any) => Math.max(0, a.paymentValue + (a.paymentValue * a.gstPct) / 100 - (a.paymentValue * a.retentionPct) / 100);

  const totalGst = activities.reduce((s: number, a: any) => s + (a.paymentValue * a.gstPct) / 100, 0);
  const totalRetention = activities.reduce((s: number, a: any) => s + (a.paymentValue * a.retentionPct) / 100, 0);
  const totalNet = activities.reduce((s: number, a: any) => s + netDue(a), 0);
  const paidActivities = activities.filter((a: any) => a.status === "PAID");
  const paidAmount = paidActivities.reduce((s: number, a: any) => s + netDue(a), 0);
  const pendingAmount = totalNet - paidAmount;

  return (
    <ScrollView className="flex-1 bg-offWhite" contentContainerStyle={{ flexGrow: 1 }}>
      <Screen>
        <Title icon="cash-outline" eyebrow="Financial Overview" subtitle="GST, retention, and payment tracking per activity">
          Payments
        </Title>

        <View className="flex-row justify-between mb-2" style={{ gap: 8 }}>
          <View className="flex-1">
            <Card>
              <Text className="text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-1">Contract Value</Text>
              <Text className="text-lg font-extrabold text-brandCharcoal">₹{(contractValue / 100000).toFixed(1)}L</Text>
            </Card>
          </View>
          <View className="flex-1">
            <Card>
              <Text className="text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-1">Paid</Text>
              <Text className="text-lg font-extrabold text-successGreen">₹{(paidAmount / 100000).toFixed(1)}L</Text>
            </Card>
          </View>
        </View>
        <View className="flex-row justify-between mb-4" style={{ gap: 8 }}>
          <View className="flex-1">
            <Card>
              <Text className="text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-1">Pending</Text>
              <Text className="text-lg font-extrabold text-brandAmber">₹{(pendingAmount / 100000).toFixed(1)}L</Text>
            </Card>
          </View>
          <View className="flex-1">
            <Card>
              <Text className="text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-1">Retention Held</Text>
              <Text className="text-lg font-extrabold text-sky-600">₹{(totalRetention / 100000).toFixed(1)}L</Text>
            </Card>
          </View>
        </View>

        <Text className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">
          Payment Breakdown
        </Text>
        {activities.length === 0 ? (
          <Card>
            <View className="items-center py-6">
              <Ionicons name="cash-outline" size={32} color="#94A3B8" />
              <Text className="text-slate-500 font-bold text-center mt-3">No activities yet</Text>
            </View>
          </Card>
        ) : (
          activities.map((a: any) => {
            const net = netDue(a);
            return (
              <Card key={a.id}>
                <View className="flex-row justify-between items-start mb-2">
                  <Text className="font-bold text-brandCharcoal text-sm flex-1 pr-2">{a.name}</Text>
                  <View className={`px-2 py-0.5 rounded-full ${a.status === "PAID" ? "bg-emerald-50 border border-emerald-200" : "bg-slate-100 border border-slate-200"}`}>
                    <Text className={`text-[11px] font-bold uppercase ${a.status === "PAID" ? "text-successGreen" : "text-slate-500"}`}>
                      {a.status.replace("_", " ")}
                    </Text>
                  </View>
                </View>
                <View className="flex-row justify-between mb-1">
                  <Text className="text-sm text-slate-500">Base value</Text>
                  <Text className="text-sm text-slate-700 font-semibold">₹{a.paymentValue.toLocaleString("en-IN")}</Text>
                </View>
                <View className="flex-row justify-between mb-1">
                  <Text className="text-sm text-slate-500">GST ({a.gstPct}%)</Text>
                  <Text className="text-sm text-slate-700 font-semibold">+ ₹{Math.round((a.paymentValue * a.gstPct) / 100).toLocaleString("en-IN")}</Text>
                </View>
                <View className="flex-row justify-between mb-1">
                  <Text className="text-sm text-slate-500">Retention ({a.retentionPct}%)</Text>
                  <Text className="text-sm text-alertRed font-semibold">− ₹{Math.round((a.paymentValue * a.retentionPct) / 100).toLocaleString("en-IN")}</Text>
                </View>
                <View className="flex-row justify-between pt-1.5 mt-1 border-t border-slate-200">
                  <Text className="text-sm font-extrabold text-brandCharcoal">Net due</Text>
                  <Text className="text-sm font-extrabold text-brandCharcoal">₹{Math.round(net).toLocaleString("en-IN")}</Text>
                </View>
              </Card>
            );
          })
        )}

        <Text className="text-[11px] text-slate-400 font-medium mt-1 mb-6 leading-relaxed">
          Payments are settled outside the app (bank transfer, cheque, or cash). The client submits proof of payment on the Approvals screen, and the contractor confirms receipt before a stage closes.
        </Text>
      </Screen>
    </ScrollView>
  );
}
