import { useQuery } from "@tanstack/react-query";
import { Text, View, ScrollView, Pressable } from "react-native";
import { Screen, Title, Card, Button } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";

export default function Approvals() {
  const { role, userId } = useAuthStore();
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [selectedPaymentStage, setSelectedPaymentStage] = useState<any>(null);
  const [paymentRefText, setPaymentRefText] = useState("");
  const [checklist, setChecklist] = useState({
    prep: false,
    coating: false,
    cleanup: false,
    evidence: false
  });

  const { data, refetch } = useQuery({
    queryKey: ["data"],
    queryFn: () => api<any>("/api/data"),
  });

  const act = async (
    stageId: string,
    action: "APPROVE" | "RETURN"
  ) => {
    await api("/api/stages", {
      method: "PATCH",
      body: JSON.stringify({
        stageId,
        action,
        role,
        actorId: userId || "mobile",
      }),
    });
    refetch();
  };

  const raiseStage = async (activityId: string, checklistObj: any) => {
    await api("/api/stages", {
      method: "POST",
      body: JSON.stringify({
        activityId,
        actorId: userId || "mobile",
        evidence: ["site-photo-capture"],
        checklist: checklistObj,
      }),
    });
    refetch();
  };

  // Filter stages based on the user's role
  const stages = data?.stages ?? [];
  const activities = data?.activities ?? [];

  const getStateBadge = (state: string) => {
    switch (state) {
      case "NOT_STARTED":
        return { bg: "bg-slate-100 border border-slate-200", text: "text-slate-500", label: "Not Started" };
      case "CONTRACTOR":
      case "IN_PROGRESS":
        return { bg: "bg-sky-50 border border-sky-100", text: "text-sky-700", label: "Contractor Stage" };
      case "SUBMITTED":
      case "MANUFACTURER":
      case "CONSULTANT":
        return { bg: "bg-amber-50 border border-amber-200", text: "text-amber-700", label: `Awaiting ${state}` };
      case "APPROVED":
      case "CLIENT":
        return { bg: "bg-teal-50 border border-teal-200", text: "text-teal-700", label: "Approved (Awaiting Release)" };
      case "PAID":
        return { bg: "bg-emerald-50 border border-emerald-200", text: "text-successGreen", label: "Paid & Closed" };
      case "REWORK":
        return { bg: "bg-rose-50 border border-rose-200", text: "text-alertRed", label: "Rework Required" };
      case "OVERDUE":
        return { bg: "bg-red-50 border border-red-200", text: "text-alertRed", label: "Overdue" };
      default:
        return { bg: "bg-slate-50 border border-slate-200", text: "text-slate-600", label: state };
    }
  };

  const getActivityName = (activityId: string) => {
    return activities.find((a: any) => a.id === activityId)?.name || "Activity";
  };

  // Contractor: see activities they can raise + stages returned for rework
  if (role === "CONTRACTOR") {
    const reworkStages = stages.filter((s: any) => s.state === "REWORK");
    const receiptStages = stages.filter((s: any) => s.state === "AWAITING_RECEIPT");
    const submittedStages = stages.filter(
      (s: any) =>
        s.state !== "PAID" &&
        s.state !== "REWORK" &&
        s.submittedBy === userId
    );
    const raisableActivities = activities.filter(
      (a: any) =>
        (a.status === "NOT_STARTED" || a.status === "IN_PROGRESS") &&
        !stages.some(
          (s: any) =>
            s.activityId === a.id && s.state !== "PAID" && s.state !== "REWORK"
        )
    );

    return (
      <View className="flex-1 relative bg-offWhite">
        <ScrollView className="flex-grow" contentContainerStyle={{ flexGrow: 1 }}>
          <Screen>
            <Title>Approvals</Title>

            {raisableActivities.length > 0 && (
              <View className="mb-6">
                <Text className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">
                  Ready to Raise
                </Text>
                {raisableActivities.map((activity: any) => (
                  <Card key={activity.id}>
                    <View className="flex-row items-center justify-between mb-3">
                      <Text className="font-bold text-brandCharcoal text-base flex-1 pr-2">
                        {activity.name}
                      </Text>
                      <View className="bg-slate-100 px-2.5 py-1 rounded-full">
                        <Text className="text-xs font-bold text-slate-600 uppercase">
                          {activity.status}
                        </Text>
                      </View>
                    </View>
                    <Button
                      label="Raise Stage"
                      onPress={() => {
                        setSelectedActivity(activity);
                        setChecklist({ prep: false, coating: false, cleanup: false, evidence: false });
                      }}
                    />
                  </Card>
                ))}
              </View>
            )}

            {reworkStages.length > 0 && (
              <View className="mb-6">
                <Text className="text-sm font-bold text-alertRed uppercase tracking-wider mb-3">
                  Returned for Rework
                </Text>
                {reworkStages.map((stage: any) => {
                  const returnComment = stage.comments?.find(
                    (c: any) => c.kind === "RETURN_REASON"
                  );
                  const activityObj = activities.find((x: any) => x.id === stage.activityId);
                  return (
                    <Card key={stage.id}>
                      <View className="mb-3">
                        <View className="flex-row items-center space-x-2 mb-2">
                          <Ionicons name="alert-circle" size={18} color="#D9383A" />
                          <Text className="font-extrabold text-brandCharcoal text-base ml-1">
                            {getActivityName(stage.activityId)}
                          </Text>
                        </View>
                        {returnComment && (
                          <View className="bg-red-50/70 border border-red-100 p-3 rounded-xl mb-3">
                            <Text className="text-alertRed font-bold text-xs mb-1">
                              REWORK REASON:
                            </Text>
                            <Text className="text-brandCharcoal font-semibold text-xs leading-relaxed">
                              {returnComment.text}
                            </Text>
                          </View>
                        )}
                        <Text className="text-slate-400 text-xs font-semibold">
                          Due: {new Date(stage.dueAt).toLocaleDateString()}
                        </Text>
                      </View>
                      <Button
                        label="Re-submit Stage"
                        onPress={() => {
                          setSelectedActivity(activityObj || { id: stage.activityId, name: getActivityName(stage.activityId) });
                          setChecklist({ prep: false, coating: false, cleanup: false, evidence: false });
                        }}
                      />
                    </Card>
                  );
                })}
              </View>
            )}

            {receiptStages.length > 0 && (
              <View className="mb-6">
                <Text className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">
                  Confirm Payment Receipt
                </Text>
                {receiptStages.map((stage: any) => (
                  <Card key={stage.id}>
                    <View className="mb-3">
                      <Text className="font-extrabold text-brandCharcoal text-base">
                        {getActivityName(stage.activityId)}
                      </Text>
                      <Text className="text-slate-500 text-[10px] font-bold mt-1.5 leading-relaxed">
                        Proof Reference: <Text className="text-brandCharcoal font-extrabold">{stage.evidence?.[0] || "Confirmed by Client"}</Text>
                      </Text>
                    </View>
                    <Button
                      label="Confirm Receipt & Close Stage"
                      onPress={() => act(stage.id, "APPROVE")}
                    />
                  </Card>
                ))}
              </View>
            )}

            {submittedStages.length > 0 && (
              <View className="mb-6">
                <Text className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">
                  Awaiting Review
                </Text>
                {submittedStages.map((stage: any) => {
                  const badge = getStateBadge(stage.state);
                  return (
                    <Card key={stage.id}>
                      <View className="flex-row items-start justify-between mb-3">
                        <View className="flex-1 pr-2">
                          <Text className="font-bold text-brandCharcoal text-base mb-1">
                            {getActivityName(stage.activityId)}
                          </Text>
                          <Text className="text-slate-400 text-xs font-semibold">
                            Due: {new Date(stage.dueAt).toLocaleDateString()}
                          </Text>
                        </View>
                        <View className={`${badge.bg} px-2.5 py-1 rounded-full`}>
                          <Text className={`text-[10px] font-bold uppercase ${badge.text}`}>
                            {badge.label}
                          </Text>
                        </View>
                      </View>
                    </Card>
                  );
                })}
              </View>
            )}

            {raisableActivities.length === 0 &&
              reworkStages.length === 0 &&
              submittedStages.length === 0 && (
                <Card>
                  <View className="items-center py-6">
                    <Ionicons name="checkmark-circle-outline" size={40} color="#1B8755" />
                    <Text className="text-slate-500 font-bold text-center mt-3">
                      No pending items
                    </Text>
                  </View>
                </Card>
              )}
          </Screen>
        </ScrollView>

        {/* MOBILE QA COMPLIANCE CHECKLIST MODAL */}
        {selectedActivity && (
          <View className="absolute inset-0 bg-brandCharcoal/70 z-50 justify-end" style={{ elevation: 15 }}>
            <View className="bg-white rounded-t-3xl p-6 pb-10 border-t border-slate-100 shadow-lg">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-brandCharcoal font-extrabold text-base">
                  QA Compliance Checklist
                </Text>
                <Pressable
                  onPress={() => setSelectedActivity(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center"
                >
                  <Ionicons name="close" size={16} color="#64748B" />
                </Pressable>
              </View>
              
              <Text className="text-slate-400 text-xs font-semibold mb-4 leading-relaxed">
                Verify and confirm all quality checks before raising stage approval for {selectedActivity.name}.
              </Text>

              <View className="space-y-4 gap-3 mb-6">
                <Pressable
                  onPress={() => setChecklist({ ...checklist, prep: !checklist.prep })}
                  className="flex-row items-start"
                >
                  <View className={`w-5 h-5 rounded border border-2 items-center justify-center mr-3 ${checklist.prep ? "bg-brandAmber border-brandAmber" : "border-slate-300"}`}>
                    {checklist.prep && <Ionicons name="checkmark" size={12} color="#1A1D24" />}
                  </View>
                  <View className="flex-1">
                    <Text className="text-brandCharcoal font-extrabold text-xs">Substrate Prep</Text>
                    <Text className="text-slate-400 text-[10px] font-semibold mt-0.5">Surface is clean, dry, and free of dust/loose paint.</Text>
                  </View>
                </Pressable>

                <Pressable
                  onPress={() => setChecklist({ ...checklist, coating: !checklist.coating })}
                  className="flex-row items-start"
                >
                  <View className={`w-5 h-5 rounded border border-2 items-center justify-center mr-3 ${checklist.coating ? "bg-brandAmber border-brandAmber" : "border-slate-300"}`}>
                    {checklist.coating && <Ionicons name="checkmark" size={12} color="#1A1D24" />}
                  </View>
                  <View className="flex-1">
                    <Text className="text-brandCharcoal font-extrabold text-xs">Coating Uniformity</Text>
                    <Text className="text-slate-400 text-[10px] font-semibold mt-0.5">Material is applied evenly without runs or patches.</Text>
                  </View>
                </Pressable>

                <Pressable
                  onPress={() => setChecklist({ ...checklist, cleanup: !checklist.cleanup })}
                  className="flex-row items-start"
                >
                  <View className={`w-5 h-5 rounded border border-2 items-center justify-center mr-3 ${checklist.cleanup ? "bg-brandAmber border-brandAmber" : "border-slate-300"}`}>
                    {checklist.cleanup && <Ionicons name="checkmark" size={12} color="#1A1D24" />}
                  </View>
                  <View className="flex-1">
                    <Text className="text-brandCharcoal font-extrabold text-xs">Housekeeping</Text>
                    <Text className="text-slate-400 text-[10px] font-semibold mt-0.5">Workspace is cleared of scaffolding debris and hazards.</Text>
                  </View>
                </Pressable>

                <Pressable
                  onPress={() => setChecklist({ ...checklist, evidence: !checklist.evidence })}
                  className="flex-row items-start"
                >
                  <View className={`w-5 h-5 rounded border border-2 items-center justify-center mr-3 ${checklist.evidence ? "bg-brandAmber border-brandAmber" : "border-slate-300"}`}>
                    {checklist.evidence && <Ionicons name="checkmark" size={12} color="#1A1D24" />}
                  </View>
                  <View className="flex-1">
                    <Text className="text-brandCharcoal font-extrabold text-xs">Evidence Logged</Text>
                    <Text className="text-slate-400 text-[10px] font-semibold mt-0.5">Photo and/or voice logs have been attached.</Text>
                  </View>
                </Pressable>
              </View>

              <Button
                label="Raise Stage for Approval"
                onPress={async () => {
                  await raiseStage(selectedActivity.id, checklist);
                  setSelectedActivity(null);
                  setChecklist({ prep: false, coating: false, cleanup: false, evidence: false });
                }}
                disabled={!(checklist.prep && checklist.coating && checklist.cleanup && checklist.evidence)}
              />
            </View>
          </View>
        )}
      </View>
    );
  }

  // Client: see stages awaiting their payment release
  if (role === "CLIENT") {
    const awaitingPayment = stages.filter(
      (s: any) => s.state === "CLIENT"
    );

    return (
      <View className="flex-1 relative bg-offWhite">
        <ScrollView className="flex-grow" contentContainerStyle={{ flexGrow: 1 }}>
          <Screen>
            <Title>Approvals</Title>
            <Text className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">
              Awaiting Payment Release
            </Text>
            {awaitingPayment.length === 0 ? (
              <Card>
                <View className="items-center py-6">
                  <Ionicons name="checkmark-circle-outline" size={40} color="#1B8755" />
                  <Text className="text-slate-500 font-bold text-center mt-3">
                    No stages awaiting payment
                  </Text>
                </View>
              </Card>
            ) : (
              awaitingPayment.map((stage: any) => (
                <Card key={stage.id}>
                  <View className="flex-row items-center justify-between mb-4">
                    <View className="flex-1 pr-2">
                      <Text className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
                        {getActivityName(stage.activityId)}
                      </Text>
                      <Text className="font-extrabold text-brandCharcoal text-xs">
                        Due: {new Date(stage.dueAt).toLocaleDateString()}
                      </Text>
                    </View>
                    <View className="ml-2">
                      <Text className="text-xs text-slate-400 font-bold text-right mb-0.5">
                        AMOUNT DUE
                      </Text>
                      <Text className="font-extrabold text-xl text-successGreen text-right">
                        ₹{stage.amountDue?.toLocaleString("en-IN") ?? "0"}
                      </Text>
                    </View>
                  </View>
                  <Button
                    label="Release Payment"
                    onPress={() => {
                      setSelectedPaymentStage(stage);
                      setPaymentRefText("");
                    }}
                  />
                </Card>
              ))
            )}
          </Screen>
        </ScrollView>

        {/* MOBILE CLIENT PAYMENT PROOF UPLOAD MODAL */}
        {selectedPaymentStage && (
          <View className="absolute inset-0 bg-brandCharcoal/70 z-50 justify-end" style={{ elevation: 15 }}>
            <View className="bg-white rounded-t-3xl p-6 pb-10 border-t border-slate-100 shadow-lg">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-brandCharcoal font-extrabold text-base">
                  Upload Payment Proof
                </Text>
                <Pressable
                  onPress={() => setSelectedPaymentStage(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center"
                >
                  <Ionicons name="close" size={16} color="#64748B" />
                </Pressable>
              </View>
              
              <Text className="text-slate-400 text-xs font-semibold mb-4 leading-relaxed">
                Confirm you have paid ₹{selectedPaymentStage.amountDue?.toLocaleString("en-IN")} externally and enter details (e.g. cheque number, transaction ID).
              </Text>

              <View className="mb-6">
                <Text className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1.5">
                  Cheque Number / Transfer Reference
                </Text>
                <TextInput
                  value={paymentRefText}
                  onChangeText={setPaymentRefText}
                  placeholder="e.g. Cheque #482931 or IMPS reference ID"
                  placeholderTextColor="#94A3B8"
                  className="h-12 border border-slate-200 bg-white rounded-xl px-4 text-brandCharcoal text-xs font-semibold"
                />
              </View>

              <Button
                label="Submit Payment Proof"
                onPress={async () => {
                  await api("/api/stages", {
                    method: "PATCH",
                    body: JSON.stringify({
                      stageId: selectedPaymentStage.id,
                      action: "APPROVE",
                      role: "CLIENT",
                      actorId: userId || "mobile",
                      evidence: [paymentRefText],
                      note: `Approved with proof reference: ${paymentRefText}`,
                    }),
                  });
                  refetch();
                  setSelectedPaymentStage(null);
                }}
                disabled={!paymentRefText.trim()}
              />
            </View>
          </View>
        )}
      </View>
    );
  }

  // Manufacturer / Consultant / Admin: see stages awaiting their review
  const awaitingRole =
    role === "ADMIN"
      ? stages.filter((s: any) => s.state !== "PAID" && s.state !== "REWORK")
      : stages.filter((s: any) => s.state === role);

  return (
    <ScrollView className="flex-1 bg-offWhite" contentContainerStyle={{ flexGrow: 1 }}>
      <Screen>
        <Title>Approvals</Title>
        <Text className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">
          Awaiting Your Review
        </Text>
        {awaitingRole.length === 0 ? (
          <Card>
            <View className="items-center py-6">
              <Ionicons name="checkmark-circle-outline" size={40} color="#1B8755" />
              <Text className="text-slate-500 font-bold text-center mt-3">
                No stages awaiting your review
              </Text>
            </View>
          </Card>
        ) : (
          awaitingRole.map((stage: any) => {
            const badge = getStateBadge(stage.state);
            return (
              <Card key={stage.id}>
                <View className="flex-row justify-between items-start mb-4">
                  <View className="flex-1 pr-2">
                    <Text className="font-bold text-brandCharcoal text-base mb-1">
                      {getActivityName(stage.activityId)}
                    </Text>
                    <Text className="text-slate-400 text-xs font-semibold">
                      Due: {new Date(stage.dueAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <View className={`${badge.bg} px-2.5 py-1 rounded-full`}>
                    <Text className={`text-[10px] font-bold uppercase ${badge.text}`}>
                      {badge.label}
                    </Text>
                  </View>
                </View>
                <View className="flex-row space-x-3 gap-3">
                  <View className="flex-1">
                    <Button
                      label="Approve"
                      variant="primary"
                      onPress={() => act(stage.id, "APPROVE")}
                    />
                  </View>
                  <View className="flex-1">
                    <Button
                      label="Return"
                      variant="danger"
                      onPress={() => act(stage.id, "RETURN")}
                    />
                  </View>
                </View>
              </Card>
            );
          })
        )}
      </Screen>
    </ScrollView>
  );
}
