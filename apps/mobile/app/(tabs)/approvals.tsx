import { useQuery } from "@tanstack/react-query";
import { Text, View } from "react-native";
import { Screen, Title, Card, Button } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";

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
      <Screen>
        <Title>Approvals</Title>

        {raisableActivities.length > 0 && (
          <View>
            <Text className="text-lg font-bold mb-2">
              Ready to Raise
            </Text>
            {raisableActivities.map((activity: any) => (
              <Card key={activity.id}>
                <Text className="font-bold">{activity.name}</Text>
                <Text className="mb-3 text-slate-500">
                  {activity.status}
                </Text>
                <Button
                  label="Raise Stage"
                  onPress={() => raiseStage(activity.id)}
                />
              </Card>
            ))}
          </View>
        )}

        {reworkStages.length > 0 && (
          <View>
            <Text className="text-lg font-bold mb-2 mt-4">
              Returned for Rework
            </Text>
            {reworkStages.map((stage: any) => {
              const returnComment = stage.comments?.find(
                (c: any) => c.kind === "RETURN_REASON"
              );
              return (
                <Card key={stage.id}>
                  <Text className="font-bold">Rework Required</Text>
                  {returnComment && (
                    <Text className="text-red-600 mb-1">
                      {returnComment.text}
                    </Text>
                  )}
                  <Text className="mb-3 text-slate-500">
                    Due {new Date(stage.dueAt).toLocaleString()}
                  </Text>
                  <Button
                    label="Re-submit"
                    onPress={() => raiseStage(stage.activityId)}
                  />
                </Card>
              );
            })}
          </View>
        )}

        {submittedStages.length > 0 && (
          <View>
            <Text className="text-lg font-bold mb-2 mt-4">
              Awaiting Review
            </Text>
            {submittedStages.map((stage: any) => (
              <Card key={stage.id}>
                <Text className="font-bold">
                  Awaiting {stage.state}
                </Text>
                <Text className="text-slate-500">
                  Due {new Date(stage.dueAt).toLocaleString()}
                </Text>
              </Card>
            ))}
          </View>
        )}

        {raisableActivities.length === 0 &&
          reworkStages.length === 0 &&
          submittedStages.length === 0 && (
            <Card>
              <Text className="text-slate-500">No pending items</Text>
            </Card>
          )}
      </Screen>
    );
  }

  // Client: see stages awaiting their payment release
  if (role === "CLIENT") {
    const awaitingPayment = stages.filter(
      (s: any) => s.state === "CLIENT"
    );

    return (
      <Screen>
        <Title>Approvals</Title>
        <Text className="text-lg font-bold mb-2">
          Awaiting Payment Release
        </Text>
        {awaitingPayment.length === 0 ? (
          <Card>
            <Text className="text-slate-500">
              No stages awaiting payment
            </Text>
          </Card>
        ) : (
          awaitingPayment.map((stage: any) => (
            <Card key={stage.id}>
              <Text className="font-bold">
                ₹{stage.amountDue?.toLocaleString("en-IN") ?? "0"}
              </Text>
              <Text className="mb-3 text-slate-500">
                Due {new Date(stage.dueAt).toLocaleString()}
              </Text>
              <Button
                label="Release Payment"
                onPress={() => act(stage.id, "APPROVE")}
              />
            </Card>
          ))
        )}
      </Screen>
    );
  }

  // Manufacturer / Consultant / Admin: see stages awaiting their review
  const awaitingRole =
    role === "ADMIN"
      ? stages.filter((s: any) => s.state !== "PAID" && s.state !== "REWORK")
      : stages.filter((s: any) => s.state === role);

  return (
    <Screen>
      <Title>Approvals</Title>
      {awaitingRole.length === 0 ? (
        <Card>
          <Text className="text-slate-500">
            No stages awaiting your review
          </Text>
        </Card>
      ) : (
        awaitingRole.map((stage: any) => (
          <Card key={stage.id}>
            <Text className="font-bold">
              Awaiting {stage.state} review
            </Text>
            <Text className="mb-3 text-slate-500">
              Due {new Date(stage.dueAt).toLocaleString()}
            </Text>
            <View className="flex-row gap-2">
              <Button
                label="Approve"
                onPress={() => act(stage.id, "APPROVE")}
              />
              <Button
                label="Return"
                onPress={() => act(stage.id, "RETURN")}
              />
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}
