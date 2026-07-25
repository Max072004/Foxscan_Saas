import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Text, Pressable, View, ScrollView, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { Screen, Title, Card, Button } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import type { Project } from "@/lib/types";
import { Ionicons } from "@expo/vector-icons";
import { useProjectStore } from "@/stores/project";

const DEFAULT_TEMPLATE_LABELS = ["Substrate Prep", "Coating Uniformity", "Housekeeping", "Evidence Logged"];

const slugify = (label: string) =>
  label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "item";

export default function Projects() {
  const { data = [], error, refetch } = useQuery({
    queryKey: ["projects"],
    queryFn: () => api<Project[]>("/api/projects"),
  });
  const router = useRouter();
  const queryClient = useQueryClient();
  const { role } = useAuthStore();
  const { selectedProjectId, setSelectedProjectId } = useProjectStore();

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [scope, setScope] = useState("");
  const [buildings, setBuildings] = useState("1");
  const [areaSqft, setAreaSqft] = useState("");
  const [contractValue, setContractValue] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [checklistLabels, setChecklistLabels] = useState<string[]>(DEFAULT_TEMPLATE_LABELS);
  const [newItemLabel, setNewItemLabel] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const canCreate = role === "CONTRACTOR" || role === "ADMIN";

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return { bg: "bg-emerald-50 border border-emerald-100", text: "text-successGreen", label: "Active Workspace" };
      case "COMPLETED":
        return { bg: "bg-blue-50 border border-blue-100", text: "text-blue-700", label: "Completed" };
      case "ON_HOLD":
        return { bg: "bg-amber-50 border border-amber-100", text: "text-amber-700", label: "On Hold" };
      default:
        return { bg: "bg-slate-50 border border-slate-100", text: "text-slate-600", label: status };
    }
  };

  const resetForm = () => {
    setName(""); setAddress(""); setScope(""); setBuildings("1"); setAreaSqft("");
    setContractValue(""); setStartDate(""); setEndDate(""); setChecklistLabels(DEFAULT_TEMPLATE_LABELS);
    setNewItemLabel(""); setCreateError("");
  };

  const createProject = async () => {
    setCreateError("");
    if (!name.trim() || !address.trim() || !startDate.trim() || !endDate.trim()) {
      setCreateError("Name, address, start date, and end date are required.");
      return;
    }
    setCreating(true);
    try {
      const checklistTemplate = checklistLabels.map((label) => ({ key: slugify(label), label }));
      const created = await api<Project>("/api/projects", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          address: address.trim(),
          scope: scope.trim(),
          buildings: Number(buildings) || 1,
          areaSqft: Number(areaSqft) || 0,
          contractValue: Number(contractValue) || 0,
          startDate: startDate.trim(),
          endDate: endDate.trim(),
          status: "ACTIVE",
          checklistTemplate,
        }),
      });
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      await queryClient.invalidateQueries({ queryKey: ["data"] });
      setSelectedProjectId(created.id);
      setShowCreate(false);
      resetForm();
      refetch();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setCreating(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-offWhite" contentContainerStyle={{ flexGrow: 1 }}>
      <Screen>
        <Title icon="business-outline" eyebrow="Your Workspace" subtitle="All societies and sites you're assigned to">
          Projects
        </Title>
        {error ? (
          <View className="mb-4 p-4 bg-red-50 border border-red-200 rounded-2xl">
            <Text className="text-alertRed font-bold text-sm">{error.message}</Text>
          </View>
        ) : null}

        {canCreate && !showCreate && (
          <View className="mb-4">
            <Button label="+ New Project" onPress={() => setShowCreate(true)} />
          </View>
        )}

        {showCreate && (
          <Card>
            <Text className="font-extrabold text-brandCharcoal text-base mb-3">Create a New Project</Text>
            <TextInput value={name} onChangeText={setName} placeholder="Project name" placeholderTextColor="#94A3B8" className="border border-slate-200 rounded-xl px-3 h-11 text-sm font-semibold text-brandCharcoal mb-2.5" />
            <TextInput value={address} onChangeText={setAddress} placeholder="Address" placeholderTextColor="#94A3B8" className="border border-slate-200 rounded-xl px-3 h-11 text-sm font-semibold text-brandCharcoal mb-2.5" />
            <TextInput value={scope} onChangeText={setScope} placeholder="Scope of work" placeholderTextColor="#94A3B8" className="border border-slate-200 rounded-xl px-3 h-11 text-sm font-semibold text-brandCharcoal mb-2.5" />
            <View className="flex-row" style={{ gap: 8 }}>
              <TextInput value={buildings} onChangeText={setBuildings} placeholder="Buildings" placeholderTextColor="#94A3B8" keyboardType="number-pad" className="flex-1 border border-slate-200 rounded-xl px-3 h-11 text-sm font-semibold text-brandCharcoal mb-2.5" />
              <TextInput value={areaSqft} onChangeText={setAreaSqft} placeholder="Area (sq.ft)" placeholderTextColor="#94A3B8" keyboardType="number-pad" className="flex-1 border border-slate-200 rounded-xl px-3 h-11 text-sm font-semibold text-brandCharcoal mb-2.5" />
            </View>
            <TextInput value={contractValue} onChangeText={setContractValue} placeholder="Contract value (₹)" placeholderTextColor="#94A3B8" keyboardType="number-pad" className="border border-slate-200 rounded-xl px-3 h-11 text-sm font-semibold text-brandCharcoal mb-2.5" />
            <View className="flex-row" style={{ gap: 8 }}>
              <TextInput value={startDate} onChangeText={setStartDate} placeholder="Start (YYYY-MM-DD)" placeholderTextColor="#94A3B8" className="flex-1 border border-slate-200 rounded-xl px-3 h-11 text-sm font-semibold text-brandCharcoal mb-3" />
              <TextInput value={endDate} onChangeText={setEndDate} placeholder="End (YYYY-MM-DD)" placeholderTextColor="#94A3B8" className="flex-1 border border-slate-200 rounded-xl px-3 h-11 text-sm font-semibold text-brandCharcoal mb-3" />
            </View>

            <Text className="text-slate-500 text-[11px] font-bold uppercase tracking-wider mb-2">
              QA Checklist Template
            </Text>
            <Text className="text-slate-400 text-[11px] font-medium mb-2 leading-relaxed">
              These are the quality checks a contractor must confirm before raising any stage on this project.
            </Text>
            {checklistLabels.map((label, i) => (
              <View key={i} className="flex-row items-center mb-2" style={{ gap: 8 }}>
                <TextInput
                  value={label}
                  onChangeText={(v) => setChecklistLabels((prev) => prev.map((l, idx) => (idx === i ? v : l)))}
                  className="flex-1 border border-slate-200 rounded-xl px-3 h-10 text-sm font-semibold text-brandCharcoal"
                />
                <Pressable onPress={() => setChecklistLabels((prev) => prev.filter((_, idx) => idx !== i))}>
                  <Ionicons name="close-circle" size={20} color="#D9383A" />
                </Pressable>
              </View>
            ))}
            <View className="flex-row items-center mb-3" style={{ gap: 8 }}>
              <TextInput
                value={newItemLabel}
                onChangeText={setNewItemLabel}
                placeholder="Add a checklist item…"
                placeholderTextColor="#94A3B8"
                className="flex-1 border border-slate-200 rounded-xl px-3 h-10 text-sm font-semibold text-brandCharcoal"
              />
              <Pressable
                onPress={() => {
                  if (!newItemLabel.trim()) return;
                  setChecklistLabels((prev) => [...prev, newItemLabel.trim()]);
                  setNewItemLabel("");
                }}
              >
                <Ionicons name="add-circle" size={22} color="#EAAC1F" />
              </Pressable>
            </View>

            {createError ? <Text className="text-alertRed text-xs font-semibold mb-2">{createError}</Text> : null}
            <View className="flex-row" style={{ gap: 8 }}>
              <View className="flex-1">
                <Button label="Cancel" variant="secondary" onPress={() => { setShowCreate(false); resetForm(); }} />
              </View>
              <View className="flex-1">
                <Button label={creating ? "Creating…" : "Create Project"} onPress={createProject} disabled={creating} />
              </View>
            </View>
          </Card>
        )}

        <View className="space-y-4 gap-2">
          {data.map((project) => {
            const status = getStatusStyle(project.status);
            const activeId = selectedProjectId || data[0]?.id;
            const isActive = project.id === activeId;
            return (
              <Card key={project.id}>
                <View className="flex-col justify-between">
                  <View className="flex-row justify-between items-start mb-2">
                    <Text className="font-extrabold text-brandCharcoal text-lg flex-1 pr-2">
                      {project.name}
                    </Text>
                    <View className={`${status.bg} px-2.5 py-1 rounded-full`}>
                      <Text className={`text-[11px] font-extrabold uppercase ${status.text}`}>
                        {status.label}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row items-center space-x-1 mb-3">
                    <Ionicons name="location-outline" size={14} color="#64748B" />
                    <Text className="text-slate-500 text-sm font-semibold ml-1">
                      {project.address}
                    </Text>
                  </View>

                  <View className="border-t border-slate-100 pt-3 flex-row justify-between items-center">
                    {isActive ? (
                      <View className="flex-row items-center" style={{ gap: 4 }}>
                        <Ionicons name="checkmark-circle" size={14} color="#1B8755" />
                        <Text className="text-successGreen text-sm font-extrabold">Active workspace</Text>
                      </View>
                    ) : (
                      <Pressable onPress={() => setSelectedProjectId(project.id)}>
                        <Text className="text-brandAmber text-sm font-extrabold">Make active</Text>
                      </Pressable>
                    )}
                    <Pressable
                      onPress={() => router.push(`/project/${project.id}`)}
                      className="flex-row items-center"
                    >
                      <Text className="text-brandAmber text-sm font-extrabold mr-1">
                        View details
                      </Text>
                      <Ionicons name="arrow-forward" size={14} color="#EAAC1F" />
                    </Pressable>
                  </View>
                </View>
              </Card>
            );
          })}
        </View>
      </Screen>
    </ScrollView>
  );
}
