import { useQuery } from "@tanstack/react-query";
import { Text, View, ScrollView } from "react-native";
import { Screen, Title, Card, useTheme, ProjectSwitcher } from "@/components/ui";
import { api } from "@/lib/api";
import { Ionicons } from "@expo/vector-icons";
import { useProjectStore } from "@/stores/project";

export default function Payments() {
  const t = useTheme();
  const { data } = useQuery({
    queryKey: ["data"],
    queryFn: () => api<any>("/api/data"),
  });

  const { selectedProjectId } = useProjectStore();
  const project = data?.projects?.find((p: any) => p.id === selectedProjectId) ?? data?.projects?.[0];
  const activities = (data?.activities ?? []).filter((a: any) => a.projectId === project?.id);
  const contractValue = project?.contractValue || 0;

  const netDue = (a: any) => Math.max(0, a.paymentValue + (a.paymentValue * a.gstPct) / 100 - (a.paymentValue * a.retentionPct) / 100);

  const totalRetention = activities.reduce((s: number, a: any) => s + (a.paymentValue * a.retentionPct) / 100, 0);
  const totalNet = activities.reduce((s: number, a: any) => s + netDue(a), 0);
  const paidActivities = activities.filter((a: any) => a.status === "PAID");
  const paidAmount = paidActivities.reduce((s: number, a: any) => s + netDue(a), 0);
  const pendingAmount = totalNet - paidAmount;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ flexGrow: 1 }}>
      <Screen scroll>
        <Title icon="cash-outline" eyebrow="Financial Overview" subtitle="GST, retention, and payment tracking per activity">
          Payments
        </Title>
        <ProjectSwitcher />

        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8, gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Card>
              <Text style={{ color: t.textSecondary, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Contract Value</Text>
              <Text style={{ fontSize: 18, fontWeight: "800", color: t.text }}>₹{(contractValue / 100000).toFixed(1)}L</Text>
            </Card>
          </View>
          <View style={{ flex: 1 }}>
            <Card>
              <Text style={{ color: t.textSecondary, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Paid</Text>
              <Text style={{ fontSize: 18, fontWeight: "800", color: "#22C55E" }}>₹{(paidAmount / 100000).toFixed(1)}L</Text>
            </Card>
          </View>
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 16, gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Card>
              <Text style={{ color: t.textSecondary, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Pending</Text>
              <Text style={{ fontSize: 18, fontWeight: "800", color: "#F5B81F" }}>₹{(pendingAmount / 100000).toFixed(1)}L</Text>
            </Card>
          </View>
          <View style={{ flex: 1 }}>
            <Card>
              <Text style={{ color: t.textSecondary, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Retention Held</Text>
              <Text style={{ fontSize: 18, fontWeight: "800", color: "#0EA5E9" }}>₹{(totalRetention / 100000).toFixed(1)}L</Text>
            </Card>
          </View>
        </View>

        <Text style={{ fontSize: 13, fontWeight: "700", color: t.textSecondary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
          Payment Breakdown
        </Text>
        {activities.length === 0 ? (
          <Card>
            <View style={{ alignItems: "center", paddingVertical: 24 }}>
              <Ionicons name="cash-outline" size={32} color={t.textMuted} />
              <Text style={{ color: t.textSecondary, fontWeight: "700", textAlign: "center", marginTop: 12 }}>No activities yet</Text>
            </View>
          </Card>
        ) : (
          activities.map((a: any) => {
            const net = netDue(a);
            const isPaid = a.status === "PAID";
            return (
              <Card key={a.id}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <Text style={{ fontWeight: "700", color: t.text, fontSize: 14, flex: 1, paddingRight: 8 }}>{a.name}</Text>
                  <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, backgroundColor: isPaid ? "rgba(34,197,94,0.08)" : (t.isDark ? "#222733" : "#F1F5F9"), borderWidth: 1, borderColor: isPaid ? "rgba(34,197,94,0.2)" : t.cardBorder }}>
                    <Text style={{ fontSize: 11, fontWeight: "700", textTransform: "uppercase", color: isPaid ? "#22C55E" : t.textSecondary }}>
                      {a.status.replace("_", " ")}
                    </Text>
                  </View>
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                  <Text style={{ fontSize: 14, color: t.textSecondary }}>Base value</Text>
                  <Text style={{ fontSize: 14, color: t.text, fontWeight: "600" }}>₹{a.paymentValue.toLocaleString("en-IN")}</Text>
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                  <Text style={{ fontSize: 14, color: t.textSecondary }}>GST ({a.gstPct}%)</Text>
                  <Text style={{ fontSize: 14, color: t.text, fontWeight: "600" }}>+ ₹{Math.round((a.paymentValue * a.gstPct) / 100).toLocaleString("en-IN")}</Text>
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                  <Text style={{ fontSize: 14, color: t.textSecondary }}>Retention ({a.retentionPct}%)</Text>
                  <Text style={{ fontSize: 14, color: "#EF4444", fontWeight: "600" }}>− ₹{Math.round((a.paymentValue * a.retentionPct) / 100).toLocaleString("en-IN")}</Text>
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between", paddingTop: 6, marginTop: 4, borderTopWidth: 1, borderTopColor: t.cardBorder }}>
                  <Text style={{ fontSize: 14, fontWeight: "800", color: t.text }}>Net due</Text>
                  <Text style={{ fontSize: 14, fontWeight: "800", color: t.text }}>₹{Math.round(net).toLocaleString("en-IN")}</Text>
                </View>
              </Card>
            );
          })
        )}

        <Text style={{ fontSize: 11, color: t.textSecondary, fontWeight: "500", marginTop: 4, marginBottom: 24, lineHeight: 16 }}>
          Payments are settled outside the app (bank transfer, cheque, or cash). The client submits proof of payment on the Approvals screen, and the contractor confirms receipt before a stage closes.
        </Text>
      </Screen>
    </ScrollView>
  );
}
