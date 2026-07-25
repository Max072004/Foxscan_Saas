import { useState } from "react";
import { Text, TextInput, View, ScrollView, Pressable, Linking } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Screen, Title, Card, SectionLabel, EmptyState, Skeleton, useTheme } from "@/components/ui";
import { api } from "@/lib/api";
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

export default function Documents() {
  const t = useTheme();
  const [q, setQ] = useState("");
  const { data = [], refetch, isLoading, isFetching } = useQuery({
    queryKey: ["documents", q],
    queryFn: () => api<any[]>(`/api/documents?q=${encodeURIComponent(q)}`),
  });

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ flexGrow: 1 }}>
      <Screen scroll>
        <Title icon="folder-outline" eyebrow="Project Vault" subtitle="Contracts, drawings, invoices, and site media in one place">
          Documents
        </Title>

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
