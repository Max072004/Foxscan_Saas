import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Text, Pressable, View, ScrollView, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { Screen, Title, Card, Button, useTheme } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import type { Project } from "@/lib/types";
import { Ionicons } from "@expo/vector-icons";
import { useProjectStore } from "@/stores/project";

const DEFAULT_TEMPLATE_LABELS = ["Substrate Prep", "Coating Uniformity", "Housekeeping", "Evidence Logged"];

const slugify = (label: string) =>
  label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "item";

export default function Projects() {
  const t = useTheme();
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
        return { bg: t.isDark ? "rgba(34,197,94,0.08)" : "rgba(34,197,94,0.08)", border: t.isDark ? "rgba(34,197,94,0.2)" : "rgba(34,197,94,0.2)", textColor: "#22C55E", label: "Active" };
      case "COMPLETED":
        return { bg: "rgba(59,130,246,0.08)", border: "rgba(59,130,246,0.2)", textColor: "#3B82F6", label: "Completed" };
      case "ON_HOLD":
        return { bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.2)", textColor: "#F59E0B", label: "On Hold" };
      default:
        return { bg: t.isDark ? "#222733" : "#F1F5F9", border: t.cardBorder, textColor: t.textSecondary, label: status };
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

  const inputStyle = {
    borderWidth: 2,
    borderColor: t.inputBorder,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
    fontSize: 16,
    fontWeight: "600" as const,
    color: t.text,
    marginBottom: 12,
    backgroundColor: t.inputBg,
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: t.bg }}
    >
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <Screen scroll>
          <Title icon="business-outline" eyebrow="Your Workspace" subtitle="All societies and construction sites you are assigned to">
            Projects
          </Title>
          {error ? (
            <View style={{ marginBottom: 16, padding: 16, backgroundColor: "rgba(239,68,68,0.08)", borderWidth: 1, borderColor: "rgba(239,68,68,0.2)", borderRadius: 16 }}>
              <Text style={{ color: "#EF4444", fontWeight: "800", fontSize: 14 }}>{error.message}</Text>
            </View>
          ) : null}

          {canCreate && !showCreate && (
            <View style={{ marginBottom: 20 }}>
              <Button label="+ New Project" onPress={() => setShowCreate(true)} />
            </View>
          )}

          {showCreate && (
            <Card>
              <Text style={{ fontWeight: "900", color: t.text, fontSize: 18, marginBottom: 16 }}>Create a New Project</Text>
              <TextInput value={name} onChangeText={setName} placeholder="Project name" placeholderTextColor={t.textMuted} style={inputStyle} />
              <TextInput value={address} onChangeText={setAddress} placeholder="Address" placeholderTextColor={t.textMuted} style={inputStyle} />
              <TextInput value={scope} onChangeText={setScope} placeholder="Scope of work" placeholderTextColor={t.textMuted} style={inputStyle} />
              <View style={{ flexDirection: "row", gap: 10 }}>
                <TextInput value={buildings} onChangeText={setBuildings} placeholder="Buildings" placeholderTextColor={t.textMuted} keyboardType="number-pad" style={[inputStyle, { flex: 1 }]} />
                <TextInput value={areaSqft} onChangeText={setAreaSqft} placeholder="Area (sq.ft)" placeholderTextColor={t.textMuted} keyboardType="number-pad" style={[inputStyle, { flex: 1 }]} />
              </View>
              <TextInput value={contractValue} onChangeText={setContractValue} placeholder="Contract value (₹)" placeholderTextColor={t.textMuted} keyboardType="number-pad" style={inputStyle} />
              <View style={{ flexDirection: "row", gap: 10 }}>
                <TextInput value={startDate} onChangeText={setStartDate} placeholder="Start (YYYY-MM-DD)" placeholderTextColor={t.textMuted} style={[inputStyle, { flex: 1 }]} />
                <TextInput value={endDate} onChangeText={setEndDate} placeholder="End (YYYY-MM-DD)" placeholderTextColor={t.textMuted} style={[inputStyle, { flex: 1 }]} />
              </View>

              <Text style={{ color: t.textSecondary, fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                QA Checklist Template
              </Text>
              <Text style={{ color: t.textSecondary, fontSize: 14, fontWeight: "600", marginBottom: 12, lineHeight: 20 }}>
                These quality checks must be confirmed before raising any stage on this project.
              </Text>
              {checklistLabels.map((label, i) => (
                <View key={i} style={{ flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 10 }}>
                  <TextInput
                    value={label}
                    onChangeText={(v) => setChecklistLabels((prev) => prev.map((l, idx) => (idx === i ? v : l)))}
                    style={[inputStyle, { flex: 1, marginBottom: 0 }]}
                  />
                  <Pressable onPress={() => setChecklistLabels((prev) => prev.filter((_, idx) => idx !== i))}>
                    <Ionicons name="close-circle" size={24} color="#EF4444" />
                  </Pressable>
                </View>
              ))}
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16, gap: 10 }}>
                <TextInput
                  value={newItemLabel}
                  onChangeText={setNewItemLabel}
                  placeholder="Add a custom check item…"
                  placeholderTextColor={t.textMuted}
                  style={[inputStyle, { flex: 1, marginBottom: 0 }]}
                />
                <Pressable
                  onPress={() => {
                    if (!newItemLabel.trim()) return;
                    setChecklistLabels((prev) => [...prev, newItemLabel.trim()]);
                    setNewItemLabel("");
                  }}
                >
                  <Ionicons name="add-circle" size={28} color="#F5B81F" />
                </Pressable>
              </View>

              {createError ? <Text style={{ color: "#EF4444", fontSize: 14, fontWeight: "800", marginBottom: 12 }}>{createError}</Text> : null}
              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Button label="Cancel" variant="secondary" onPress={() => { setShowCreate(false); resetForm(); }} disabled={creating} />
                </View>
                <View style={{ flex: 1 }}>
                  <Button label="Create Project" onPress={createProject} loading={creating} disabled={creating} />
                </View>
              </View>
            </Card>
          )}

          <View style={{ gap: 12 }}>
            {data.map((project) => {
              const status = getStatusStyle(project.status);
              const activeId = selectedProjectId || data[0]?.id;
              const isActive = project.id === activeId;
              return (
                <Card key={project.id}>
                  <View style={{ flexDirection: "column", justifyContent: "space-between" }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <Text style={{ fontWeight: "900", color: t.text, fontSize: 20, flex: 1, paddingRight: 8 }}>
                        {project.name}
                      </Text>
                      <View style={{ backgroundColor: status.bg, borderWidth: 1, borderColor: status.border, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 }}>
                        <Text style={{ fontSize: 11, fontWeight: "800", textTransform: "uppercase", color: status.textColor }}>
                          {status.label}
                        </Text>
                      </View>
                    </View>

                    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
                      <Ionicons name="location-outline" size={16} color={t.textSecondary} />
                      <Text style={{ color: t.textSecondary, fontSize: 15, fontWeight: "600", marginLeft: 4 }}>
                        {project.address}
                      </Text>
                    </View>

                    <View style={{ borderTopWidth: 1, borderTopColor: t.cardBorder, paddingTop: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      {isActive ? (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
                          <Text style={{ color: "#22C55E", fontSize: 15, fontWeight: "900" }}>Active workspace</Text>
                        </View>
                      ) : (
                        <Pressable onPress={() => setSelectedProjectId(project.id)}>
                          <Text style={{ color: "#F5B81F", fontSize: 15, fontWeight: "900" }}>Make active</Text>
                        </Pressable>
                      )}
                      <Pressable
                        onPress={() => router.push(`/project/${project.id}`)}
                        style={{ flexDirection: "row", alignItems: "center" }}
                      >
                        <Text style={{ color: "#F5B81F", fontSize: 15, fontWeight: "900", marginRight: 4 }}>
                          View details
                        </Text>
                        <Ionicons name="arrow-forward" size={16} color="#F5B81F" />
                      </Pressable>
                    </View>
                  </View>
                </Card>
              );
            })}
          </View>
        </Screen>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
