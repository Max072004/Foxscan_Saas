import { useState } from "react";
import { Text, TextInput, View, ScrollView, Pressable, Linking } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Screen, Title, Card, SectionLabel, EmptyState, Skeleton, Button, ProjectSwitcher, useTheme } from "@/components/ui";
import { api } from "@/lib/api";
import { useProjectStore } from "@/stores/project";
import { Ionicons } from "@expo/vector-icons";

const TYPE_META: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  CONTRACT: { icon: "document-text-outline", color: "#3B82F6" },
  BOQ: { icon: "list-outline", color: "#8B5CF6" },
  INVOICE: { icon: "receipt-outline", color: "#22C55E" },
  PHOTO: { icon: "image-outline", color: "#F5B81F" },
  VIDEO: { icon: "videocam-outline", color: "#EC4899" },
  DRAWING: { icon: "easel-outline", color: "#0EA5E9" },
  REPORT: { icon: "bar-chart-outline", color: "#64748B" },
  OTHER: { icon: "attach-outline", color: "#64748B" },
};

const DOC_TYPES = Object.keys(TYPE_META);

export default function Documents() {
  const t = useTheme();
  const queryClient = useQueryClient();
  const { selectedProjectId } = useProjectStore();
  const [q, setQ] = useState("");

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => api<any[]>("/api/projects"),
  });
  const activeProject = projects.find((p: any) => p.id === selectedProjectId) ?? projects[0];

  const { data = [], refetch, isLoading, isFetching } = useQuery({
    queryKey: ["documents", activeProject?.id, q],
    queryFn: () => api<any[]>(`/api/documents?projectId=${activeProject.id}&q=${encodeURIComponent(q)}`),
    enabled: !!activeProject,
  });

  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("OTHER");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");

  const inputStyle = {
    borderWidth: 2,
    borderColor: t.inputBorder,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 15,
    fontWeight: "600" as const,
    color: t.text,
    backgroundColor: t.inputBg,
    marginBottom: 12,
  };

  const addDocument = async () => {
    setAddError("");
    if (!newName.trim() || !activeProject) {
      setAddError("Enter a document name.");
      return;
    }
    setAdding(true);
    try {
      await api("/api/documents", {
        method: "POST",
        body: JSON.stringify({ projectId: activeProject.id, name: newName.trim(), type: newType }),
      });
      setNewName("");
      setNewType("OTHER");
      setShowAdd(false);
      await queryClient.invalidateQueries({ queryKey: ["documents"] });
      refetch();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to add document");
    } finally {
      setAdding(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ flexGrow: 1 }}>
      <Screen scroll>
        <Title icon="folder-outline" eyebrow="Project Vault" subtitle="Contracts, drawings, invoices, and site media in one place">
          Documents
        </Title>
        <ProjectSwitcher />

        {!showAdd ? (
          <View style={{ marginBottom: 20 }}>
            <Button label="+ Add Document" onPress={() => setShowAdd(true)} disabled={!activeProject} />
          </View>
        ) : (
          <Card>
            <Text style={{ fontWeight: "900", color: t.text, fontSize: 16, marginBottom: 12 }}>Add a Document</Text>
            <TextInput
              value={newName}
              onChangeText={setNewName}
              placeholder="Document name (e.g. Signed Contract v2)"
              placeholderTextColor={t.textMuted}
              style={inputStyle}
            />
            <Text style={{ color: t.textSecondary, fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Type</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
              {DOC_TYPES.map((type) => (
                <Pressable
                  key={type}
                  onPress={() => setNewType(type)}
                  style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, backgroundColor: newType === type ? "#F5B81F" : t.card, borderColor: newType === type ? "#F5B81F" : t.cardBorder }}
                >
                  <Text style={{ fontSize: 13, fontWeight: "700", color: newType === type ? "#0F172A" : t.textSecondary }}>{type}</Text>
                </Pressable>
              ))}
            </View>
            {addError ? <Text style={{ color: "#EF4444", fontSize: 12, fontWeight: "600", marginBottom: 10 }}>{addError}</Text> : null}
            <View style={{ flexDirection: "row", gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Button label="Cancel" variant="secondary" onPress={() => { setShowAdd(false); setAddError(""); }} />
              </View>
              <View style={{ flex: 1 }}>
                <Button label={adding ? "Adding…" : "Add"} onPress={addDocument} disabled={adding} />
              </View>
            </View>
          </Card>
        )}

        <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: t.card, borderWidth: 2, borderColor: t.inputBorder, borderRadius: 16, paddingHorizontal: 16, height: 56, marginBottom: 24, gap: 10 }}>
          <Ionicons name="search-outline" size={20} color={t.textMuted} />
          <TextInput
            value={q}
            onChangeText={setQ}
            onSubmitEditing={() => refetch()}
            placeholder="Search by document name, type, or tag…"
            placeholderTextColor={t.textMuted}
            returnKeyType="search"
            style={{ flex: 1, color: t.text, fontSize: 16, fontWeight: "600" }}
          />
          {isFetching ? <Ionicons name="reload-outline" size={18} color="#F5B81F" /> : null}
        </View>

        {isLoading ? (
          <View style={{ gap: 12 }}>
            <Skeleton height={80} />
            <Skeleton height={80} />
            <Skeleton height={80} />
          </View>
        ) : (
          <>
            {data.length > 0 && (
              <SectionLabel>{data.length} document{data.length === 1 ? "" : "s"} found</SectionLabel>
            )}

            {data.length === 0 ? (
              <EmptyState
                icon="folder-open-outline"
                title={q ? "No documents match your search" : "No documents uploaded"}
                subtitle={q ? "Try searching for a different keyword or document category." : "Contracts, BOQs, invoices, and photos uploaded to this project will appear here."}
              />
            ) : (
              data.map((doc: any) => {
                const meta = TYPE_META[doc.type] || TYPE_META.OTHER;
                const iconBg = `${meta.color}15`;
                return (
                  <Pressable
                    key={doc.id}
                    onPress={() => doc.url?.startsWith("http") && Linking.openURL(doc.url)}
                    style={({ pressed }) => (pressed ? { transform: [{ scale: 0.98 }], opacity: 0.9 } : {})}
                  >
                    <Card>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                        <View style={{ width: 52, height: 52, borderRadius: 16, borderWidth: 1, borderColor: `${meta.color}30`, backgroundColor: `${meta.color}12`, alignItems: "center", justifyContent: "center" }}>
                          <Ionicons name={meta.icon} size={24} color={meta.color} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                            <Text style={{ fontWeight: "900", color: t.text, fontSize: 16, flex: 1, paddingRight: 8 }} numberOfLines={1}>
                              {doc.name}
                            </Text>
                            <View style={{ backgroundColor: t.isDark ? "#222733" : "#F1F5F9", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: t.cardBorder }}>
                              <Text style={{ fontSize: 11, fontWeight: "800", color: t.textSecondary }}>v{doc.version}</Text>
                            </View>
                          </View>
                          <Text style={{ color: t.textSecondary, fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                            {doc.type.replace("_", " ")}
                          </Text>
                          {doc.tags?.length ? (
                            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                              {doc.tags.map((tag: string) => (
                                <View key={tag} style={{ backgroundColor: t.isDark ? "#222733" : "#F1F5F9", borderWidth: 1, borderColor: t.cardBorder, paddingHorizontal: 10, paddingVertical: 2, borderRadius: 12 }}>
                                  <Text style={{ fontSize: 11, fontWeight: "700", color: t.textSecondary }}>#{tag}</Text>
                                </View>
                              ))}
                            </View>
                          ) : null}
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={t.textMuted} />
                      </View>
                    </Card>
                  </Pressable>
                );
              })
            )}
          </>
        )}
      </Screen>
    </ScrollView>
  );
}
