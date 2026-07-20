import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Text, View, ScrollView, Pressable, TextInput, Alert } from "react-native";
import { Screen, Title, Card, Button } from "@/components/ui";
import { api } from "@/lib/api";
import type { Project, Activity } from "@/lib/types";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/stores/auth";

export default function MobileProjectSetup() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { token, role } = useAuthStore();

  const [name, setName] = useState("");
  const [durationDays, setDurationDays] = useState("14");
  const [paymentPct, setPaymentPct] = useState("10");
  const [gstPct, setGstPct] = useState("18");
  const [retentionPct, setRetentionPct] = useState("5");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch projects list
  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => api<Project[]>("/api/projects"),
  });
  const project = projects.find((p) => p.id === id);

  // Fetch global workspace data to extract activities
  const { data: globalData, refetch } = useQuery({
    queryKey: ["data"],
    queryFn: () => api<any>("/api/data"),
  });
  const projectActivities = (globalData?.activities || [])
    .filter((a: any) => a.projectId === id)
    .sort((a: any, b: any) => a.sequence - b.sequence);

  // Process activities to compute sequential offsets & percentages
  let currentOffset = 0;
  const processedActivities = projectActivities.map((a: any) => {
    let duration = a.durationDays;
    if (!duration) {
      const start = new Date(a.plannedStart);
      const end = new Date(a.plannedEnd);
      duration = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    }
    const pct = project && project.contractValue > 0 ? (a.paymentValue / project.contractValue) * 100 : 0;
    const startOffset = currentOffset;
    currentOffset += duration;

    return {
      ...a,
      durationDays: duration,
      startOffset,
      paymentPct: pct,
    };
  });

  const totalDuration = processedActivities.reduce((sum, a) => sum + a.durationDays, 0);
  const totalPercentage = processedActivities.reduce((sum, a) => sum + a.paymentPct, 0);

  const addDays = (dateStr: string, days: number): string => {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return d.toISOString().split("T")[0];
  };

  const submitActivity = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Please enter an activity name.");
      return;
    }
    const dur = parseInt(durationDays);
    const pct = parseFloat(paymentPct);
    const gst = parseFloat(gstPct);
    const ret = parseFloat(retentionPct);

    if (isNaN(dur) || dur <= 0) {
      Alert.alert("Error", "Duration must be at least 1 day.");
      return;
    }
    if (isNaN(pct) || pct < 0 || pct > 100) {
      Alert.alert("Error", "Payment percentage must be between 0% and 100%.");
      return;
    }

    setIsSubmitting(true);

    if (!project) {
      Alert.alert("Error", "Project details not loaded.");
      setIsSubmitting(false);
      return;
    }

    // Calculate sequential start and end dates
    const calculatedStart = addDays(project.startDate, totalDuration);
    const calculatedEnd = addDays(calculatedStart, dur - 1);
    const computedPaymentValue = (pct / 100) * project.contractValue;

    try {
      await api("/api/activities", {
        method: "POST",
        body: JSON.stringify({
          projectId: id,
          name,
          sequence: projectActivities.length + 1,
          plannedStart: calculatedStart,
          plannedEnd: calculatedEnd,
          durationDays: dur,
          paymentMode: "PERCENTAGE",
          paymentValue: parseFloat(computedPaymentValue.toFixed(2)),
          gstPct: gst,
          retentionPct: ret,
        }),
      });

      setName("");
      setDurationDays("14");
      setPaymentPct("10");
      
      // Invalidate queries to refresh listing
      await queryClient.invalidateQueries({ queryKey: ["data"] });
      await refetch();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to create activity.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteActivity = async (activityId: string) => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this activity?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await api(`/api/activities?id=${activityId}`, {
                method: "DELETE",
              });
              await queryClient.invalidateQueries({ queryKey: ["data"] });
              await refetch();
            } catch (err: any) {
              Alert.alert("Error", err.message || "Failed to delete activity.");
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView className="flex-1 bg-offWhite" contentContainerStyle={{ flexGrow: 1 }}>
      <Screen>
        {/* Back Link Header */}
        <Pressable
          onPress={() => router.back()}
          className="flex-row items-center mb-4 active:opacity-75"
        >
          <Ionicons name="arrow-back" size={16} color="#EAAC1F" />
          <Text className="text-brandAmber text-xs font-bold ml-1.5">Back to Project</Text>
        </Pressable>

        <Title>Project Setup</Title>
        <Text className="text-slate-400 text-xs font-semibold mb-4">
          Configure milestones and timeline planning for {project?.name}
        </Text>

        {/* Validation Warning Alert */}
        {processedActivities.length > 0 && (
          <View className="mb-4">
            {Math.abs(totalPercentage - 100) > 0.01 ? (
              <Card>
                <View className="flex-row items-center border-l-4 border-amber-500 pl-3">
                  <Ionicons name="warning-outline" size={20} color="#EAAC1F" />
                  <View className="ml-3 flex-1">
                    <Text className="text-brandCharcoal font-extrabold text-xs">
                      Budget Warning: Incremental Allocation
                    </Text>
                    <Text className="text-slate-400 text-[10px] font-semibold mt-0.5 leading-relaxed">
                      Allocated: {totalPercentage.toFixed(1)}% of ₹{project?.contractValue.toLocaleString("en-IN")}. Must add up to 100%.
                    </Text>
                  </View>
                </View>
              </Card>
            ) : (
              <Card>
                <View className="flex-row items-center border-l-4 border-emerald-500 pl-3">
                  <Ionicons name="checkmark-circle-outline" size={20} color="#1B8755" />
                  <View className="ml-3 flex-1">
                    <Text className="text-brandCharcoal font-extrabold text-xs">
                      Budget Verified
                    </Text>
                    <Text className="text-slate-400 text-[10px] font-semibold mt-0.5">
                      Timeline activities allocate exactly 100% of the contract value.
                    </Text>
                  </View>
                </View>
              </Card>
            )}
          </View>
        )}

        {/* Add Activity Section */}
        <View className="mb-4">
          <Card>
            <Text className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-3">
              Add New Activity
            </Text>
            
            <View className="mb-3">
              <Text className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">
                Activity Name
              </Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g. Surface preparation — Wing A"
                placeholderTextColor="#94A3B8"
                className="h-11 border border-slate-200 bg-white rounded-xl px-3 text-brandCharcoal text-xs font-semibold"
              />
            </View>

            <View className="flex-row space-x-3 gap-3 mb-3">
              <View className="flex-1">
                <Text className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">
                  Duration (Days)
                </Text>
                <TextInput
                  value={durationDays}
                  onChangeText={setDurationDays}
                  keyboardType="numeric"
                  placeholder="14"
                  placeholderTextColor="#94A3B8"
                  className="h-11 border border-slate-200 bg-white rounded-xl px-3 text-brandCharcoal text-xs font-semibold"
                />
              </View>
              <View className="flex-1">
                <Text className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">
                  Payment (%)
                </Text>
                <TextInput
                  value={paymentPct}
                  onChangeText={setPaymentPct}
                  keyboardType="numeric"
                  placeholder="10"
                  placeholderTextColor="#94A3B8"
                  className="h-11 border border-slate-200 bg-white rounded-xl px-3 text-brandCharcoal text-xs font-semibold"
                />
              </View>
            </View>

            <View className="flex-row space-x-3 gap-3 mb-4">
              <View className="flex-1">
                <Text className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">
                  GST %
                </Text>
                <TextInput
                  value={gstPct}
                  onChangeText={setGstPct}
                  keyboardType="numeric"
                  placeholder="18"
                  placeholderTextColor="#94A3B8"
                  className="h-11 border border-slate-200 bg-white rounded-xl px-3 text-brandCharcoal text-xs font-semibold"
                />
              </View>
              <View className="flex-1">
                <Text className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">
                  Retention %
                </Text>
                <TextInput
                  value={retentionPct}
                  onChangeText={setRetentionPct}
                  keyboardType="numeric"
                  placeholder="5"
                  placeholderTextColor="#94A3B8"
                  className="h-11 border border-slate-200 bg-white rounded-xl px-3 text-brandCharcoal text-xs font-semibold"
                />
              </View>
            </View>

            <Button
              label="Add Scheduled Activity"
              onPress={submitActivity}
              disabled={isSubmitting}
            />
          </Card>
        </View>

        {/* Current Plan Listing */}
        <View className="mb-4">
          <Text className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">
            Planned Activities Plan
          </Text>

          {processedActivities.length > 0 ? (
            processedActivities.map((a: any, index: number) => (
              <View className="mb-2" key={a.id}>
                <Card>
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1 pr-3">
                      <Text className="font-extrabold text-brandCharcoal text-sm leading-tight">
                        {index + 1}. {a.name}
                      </Text>
                      <Text className="text-slate-400 text-[10px] font-semibold mt-1">
                        Duration: {a.durationDays} days · Offset: +{a.startOffset}d
                      </Text>
                      <Text className="text-slate-500 text-[10px] font-bold mt-0.5">
                        Allocation: {a.paymentPct.toFixed(1)}% (₹{a.paymentValue?.toLocaleString("en-IN")})
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => deleteActivity(a.id)}
                      className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 items-center justify-center active:scale-95"
                      style={({ pressed }) => pressed ? { transform: [{ scale: 0.95 }], opacity: 0.85 } : {}}
                    >
                      <Ionicons name="trash-outline" size={16} color="#D9383A" />
                    </Pressable>
                  </View>
                </Card>
              </View>
            ))
          ) : (
            <Card>
              <View className="items-center py-6">
                <Ionicons name="calendar-outline" size={32} color="#64748B" />
                <Text className="text-slate-500 font-bold mt-2">
                  No activities planned. Use form above to add activities.
                </Text>
              </View>
            </Card>
          )}
        </View>
      </Screen>
    </ScrollView>
  );
}
