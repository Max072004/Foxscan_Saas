import { useState } from "react";
import { Text, View, ScrollView, TextInput, Pressable } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Screen, Title, Card, SectionLabel, EmptyState, Button } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { Ionicons } from "@expo/vector-icons";

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function Discussion() {
  const { userId } = useAuthStore();
  const { data, refetch } = useQuery({
    queryKey: ["data"],
    queryFn: () => api<any>("/api/data"),
  });

  const project = data?.projects?.[0];
  const activities = (data?.activities ?? []).filter((a: any) => a.projectId === project?.id);
  const [selectedActivityId, setSelectedActivityId] = useState<string>("");
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const activeId = selectedActivityId || activities[0]?.id || "";
  const comments = (data?.activityComments ?? [])
    .filter((c: any) => c.activityId === activeId)
    .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const getUserName = (id: string) => data?.users?.find((u: any) => u.id === id)?.name || "Unknown";
  const commentCount = (id: string) => (data?.activityComments ?? []).filter((c: any) => c.activityId === id).length;

  const submit = async () => {
    if (!text.trim() || !activeId) return;
    setSubmitting(true);
    try {
      await api("/api/activity-comments", {
        method: "POST",
        body: JSON.stringify({
          projectId: project?.id,
          activityId: activeId,
          authorId: userId || "mobile",
          text,
        }),
      });
      setText("");
      refetch();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-offWhite" contentContainerStyle={{ flexGrow: 1 }}>
      <Screen>
        <Title icon="chatbubbles-outline" eyebrow="Keep it on record" subtitle="Per-activity discussion instead of WhatsApp. Use @Name to mention someone.">
          Discussion
        </Title>

        {activities.length === 0 ? (
          <EmptyState icon="chatbubbles-outline" title="No activities yet" subtitle="Add activities to this project to start a discussion thread." />
        ) : (
          <>
            <SectionLabel>Activity</SectionLabel>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mb-4"
              contentContainerStyle={{ flexDirection: "row", alignItems: "flex-start" }}
            >
              {activities.map((a: any) => {
                const active = a.id === activeId;
                return (
                  <Pressable
                    key={a.id}
                    onPress={() => setSelectedActivityId(a.id)}
                    className={`px-4 py-2 rounded-full mr-2 border ${active ? "bg-brandAmber border-brandAmber" : "bg-white border-slate-200"}`}
                    style={{ alignSelf: "flex-start" }}
                  >
                    <Text className={`text-sm font-bold ${active ? "text-brandCharcoal" : "text-slate-500"}`}>
                      {a.name} {commentCount(a.id) > 0 ? `(${commentCount(a.id)})` : ""}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Card>
              {comments.length === 0 ? (
                <View className="items-center py-8">
                  <Ionicons name="chatbubble-ellipses-outline" size={28} color="#CBD5E1" />
                  <Text className="text-slate-400 font-semibold text-sm text-center mt-3">
                    No comments yet on this activity.
                  </Text>
                </View>
              ) : (
                <View style={{ gap: 12 }}>
                  {comments.map((c: any) => (
                    <View key={c.id} className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                      <View className="flex-row justify-between items-center mb-1">
                        <Text className="font-extrabold text-brandCharcoal text-sm">{getUserName(c.authorId)}</Text>
                        <Text className="text-slate-400 text-[11px] font-semibold">{timeAgo(c.createdAt)}</Text>
                      </View>
                      <Text className="text-slate-700 text-sm leading-relaxed">{c.text}</Text>
                      {c.mentions?.length > 0 && (
                        <View className="flex-row flex-wrap mt-2" style={{ gap: 4 }}>
                          {c.mentions.map((uid: string) => (
                            <View key={uid} className="bg-violet-50 border border-violet-100 px-2 py-0.5 rounded-full">
                              <Text className="text-[11px] font-bold text-violet-600">@{getUserName(uid)}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </Card>

            <View className="flex-row items-end mb-6" style={{ gap: 8 }}>
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder="Add a comment… use @Name to mention"
                placeholderTextColor="#94A3B8"
                multiline
                className="flex-1 border border-slate-200 bg-white rounded-xl px-4 py-3 text-brandCharcoal text-sm font-medium min-h-[48px]"
              />
              <Pressable
                onPress={submit}
                disabled={!text.trim() || submitting}
                className={`w-12 h-12 rounded-xl items-center justify-center ${text.trim() ? "bg-brandAmber" : "bg-brandAmber/30"}`}
              >
                <Ionicons name="send" size={18} color="#1A1D24" />
              </Pressable>
            </View>
          </>
        )}
      </Screen>
    </ScrollView>
  );
}
