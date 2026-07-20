import { useQuery } from "@tanstack/react-query";
import { Text, View, ScrollView } from "react-native";
import { Screen, Title, Card, Button } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { Ionicons } from "@expo/vector-icons";

export default function Approvals() {
  const { role, userId } = useAuthStore();
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

  const raiseStage = async (activityId: string) => {
    await api("/api/stages", {
      method: "POST",
      body: JSON.stringify({
        activityId,
        actorId: userId || "mobile",
        evidence: [],
        checklist: {},
      }),
    });
    refetch();
  };

  // Filter stages based on the user's role
  const stages = data?.stages ?? [];
  const activities = data?.activities ?? [];

  const getStateBadge = (state: string) => {
    switch (state) {
      case "CONTRACTOR":
      case "IN_PROGRESS":
        return { bg: "bg-sky-50 border border-sky-100", text: "text-sky-700", label: "Contractor Stage" };
      case "MANUFACTURER":
        return { bg: "bg-amber-50 border border-amber-100", text: "text-amber-700", label: "Awaiting Manufacturer" };
      case "CONSULTANT":
        return { bg: "bg-purple-50 border border-purple-100", text: "text-purple-700", label: "Awaiting Consultant" };
      case "CLIENT":
        return { bg: "bg-indigo-50 border border-indigo-100", text: "text-indigo-700", label: "Awaiting Client Payment" };
      case "PAID":
        return { bg: "bg-green-50 border border-green-100", text: "text-successGreen", label: "Paid & Closed" };
      case "REWORK":
        return { bg: "bg-red-50 border border-red-100", text: "text-alertRed", label: "Rework Required" };
      default:
        return { bg: "bg-slate-50 border border-slate-150", text: "text-slate-600", label: state };
    }
  };

  const getActivityName = (activityId: string) => {
    return activities.find((a: any) => a.id === activityId)?.name || "Activity";
  };

  // Contractor: see activities they can raise + stages returned for rework
  if (role === "CONTRACTOR") {
    const reworkStages = stages.filter((s: any) => s.state === "REWORK");
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
      <ScrollView className="flex-1 bg-offWhite" contentContainerStyle={{ flexGrow: 1 }}>
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
                    onPress={() => raiseStage(activity.id)}
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
                      onPress={() => raiseStage(stage.activityId)}
                    />
                  </Card>
                );
              })}
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
    );
  }

  // Client: see stages awaiting their payment release
  if (role === "CLIENT") {
    const awaitingPayment = stages.filter(
      (s: any) => s.state === "CLIENT"
    );

    return (
      <ScrollView className="flex-1 bg-offWhite" contentContainerStyle={{ flexGrow: 1 }}>
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
                  <View>
                    <Text className="text-xs text-slate-400 font-bold text-right mb-0.5">
                      AMOUNT DUE
                    </Text>
                    <Text className="font-extrabold text-2xl text-successGreen text-right">
                      ₹{stage.amountDue?.toLocaleString("en-IN") ?? "0"}
                    </Text>
                  </View>
                </View>
                <Button
                  label="Release Payment"
                  onPress={() => act(stage.id, "APPROVE")}
                />
              </Card>
            ))
          )}
        </Screen>
      </ScrollView>
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
