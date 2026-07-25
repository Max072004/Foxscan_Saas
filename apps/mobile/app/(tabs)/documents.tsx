import { useState } from "react";
import { Text, TextInput, View, ScrollView, Pressable, Linking } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Screen, Title, Card, SectionLabel, EmptyState } from "@/components/ui";
import { api } from "@/lib/api";
import { Ionicons } from "@expo/vector-icons";

const TYPE_META: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  CONTRACT: { icon: "document-text-outline", color: "#3B82F6", bg: "bg-sky-50 border-sky-100" },
  BOQ: { icon: "list-outline", color: "#8B5CF6", bg: "bg-violet-50 border-violet-100" },
  INVOICE: { icon: "receipt-outline", color: "#1B8755", bg: "bg-emerald-50 border-emerald-100" },
  PHOTO: { icon: "image-outline", color: "#EAAC1F", bg: "bg-amber-50 border-amber-100" },
  VIDEO: { icon: "videocam-outline", color: "#EC4899", bg: "bg-pink-50 border-pink-100" },
  DRAWING: { icon: "easel-outline", color: "#0EA5E9", bg: "bg-sky-50 border-sky-100" },
  REPORT: { icon: "bar-chart-outline", color: "#64748B", bg: "bg-slate-100 border-slate-200" },
  OTHER: { icon: "attach-outline", color: "#64748B", bg: "bg-slate-100 border-slate-200" },
};

export default function Documents() {
  const [q, setQ] = useState("");
  const { data = [], refetch, isFetching } = useQuery({
    queryKey: ["documents", q],
    queryFn: () => api<any[]>(`/api/documents?q=${encodeURIComponent(q)}`),
  });

  return (
    <ScrollView className="flex-1 bg-offWhite" contentContainerStyle={{ flexGrow: 1 }}>
      <Screen>
        <Title icon="folder-outline" eyebrow="Project Vault" subtitle="Contracts, drawings, invoices, and site media in one place">
          Documents
        </Title>

        <View className="flex-row items-center bg-white border border-slate-200 rounded-2xl px-4 h-12 mb-5" style={{ gap: 10 }}>
          <Ionicons name="search-outline" size={18} color="#94A3B8" />
          <TextInput
            value={q}
            onChangeText={setQ}
            onSubmitEditing={() => refetch()}
            placeholder="Search by name, type, or tag…"
            placeholderTextColor="#94A3B8"
            returnKeyType="search"
            className="flex-1 text-brandCharcoal text-sm font-medium"
          />
          {isFetching ? <Ionicons name="reload-outline" size={16} color="#94A3B8" /> : null}
        </View>

        {data.length > 0 && <SectionLabel>{data.length} document{data.length === 1 ? "" : "s"}</SectionLabel>}

        {data.length === 0 ? (
          <EmptyState
            icon="folder-open-outline"
            title={q ? "No documents match your search" : "No documents yet"}
            subtitle={q ? "Try a different name, type, or tag." : "Contracts, BOQs, invoices, and photos uploaded to this project will show up here."}
          />
        ) : (
          data.map((doc: any) => {
            const meta = TYPE_META[doc.type] || TYPE_META.OTHER;
            return (
              <Pressable
                key={doc.id}
                onPress={() => doc.url?.startsWith("http") && Linking.openURL(doc.url)}
                style={({ pressed }) => (pressed ? { transform: [{ scale: 0.98 }], opacity: 0.9 } : {})}
              >
                <Card>
                  <View className="flex-row items-start" style={{ gap: 12 }}>
                    <View className={`w-11 h-11 rounded-xl border items-center justify-center ${meta.bg}`}>
                      <Ionicons name={meta.icon} size={20} color={meta.color} />
                    </View>
                    <View className="flex-1">
                      <View className="flex-row items-center justify-between mb-1">
                        <Text className="font-extrabold text-brandCharcoal text-sm flex-1 pr-2" numberOfLines={1}>
                          {doc.name}
                        </Text>
                        <View className="bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                          <Text className="text-[11px] font-extrabold text-slate-600">v{doc.version}</Text>
                        </View>
                      </View>
                      <Text className="text-slate-400 text-[12px] font-bold uppercase tracking-wide mb-2">
                        {doc.type.replace("_", " ")}
                      </Text>
                      {doc.tags?.length ? (
                        <View className="flex-row flex-wrap" style={{ gap: 5 }}>
                          {doc.tags.map((t: string) => (
                            <View key={t} className="bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full">
                              <Text className="text-[11px] font-semibold text-slate-500">#{t}</Text>
                            </View>
                          ))}
                        </View>
                      ) : null}
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
                  </View>
                </Card>
              </Pressable>
            );
          })
        )}
      </Screen>
    </ScrollView>
  );
}
