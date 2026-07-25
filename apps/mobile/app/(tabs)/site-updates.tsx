import { useState, useEffect } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  Image,
  View,
  Pressable,
  Modal,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Screen, Title, Card, Button, useTheme } from "@/components/ui";
import { CameraCapture } from "@/components/camera-capture";
import { api, baseUrl } from "@/lib/api";
import { useProjectStore } from "@/stores/project";
import { useAuthStore } from "@/stores/auth";
import { enqueue, syncQueue } from "@/lib/offline";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";

export default function SiteUpdates() {
  const t = useTheme();
  const { role } = useAuthStore();
  const { data } = useQuery({
    queryKey: ["data"],
    queryFn: () => api<any>("/api/data"),
  });

  const [workDone, setWorkDone] = useState("");
  const [selectedActivityId, setSelectedActivityId] = useState("");
  const [captures, setCaptures] = useState<any[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState<string | null>(null);

  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);

  const { activityId } = useLocalSearchParams<{ activityId?: string }>();

  useEffect(() => {
    if (activityId) {
      setSelectedActivityId(activityId);
    }
  }, [activityId]);

  const { selectedProjectId, setSelectedProjectId } = useProjectStore();
  const project = data?.projects?.find((p: any) => p.id === selectedProjectId) ?? data?.projects?.[0];
  const projectActivities = data?.activities?.filter((a: any) => a.projectId === project?.id)
    ?.sort((a: any, b: any) => a.sequence - b.sequence) || [];

  const withTimeout = <T,>(promise: Promise<T>, ms: number, message: string): Promise<T> => {
    let timeoutId: ReturnType<typeof setTimeout>;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`Timeout: ${message}`));
      }, ms);
    });
    return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
  };

  const submit = async () => {
    Keyboard.dismiss();
    setIsUploading(true);
    setUploadProgressText("Preparing uploads...");
    try {
      let attachmentUrls: string[] = [];

      for (let i = 0; i < captures.length; i++) {
        const cap = captures[i];
        setUploadProgressText(`Uploading photo ${i + 1} of ${captures.length}...`);

        const fileResponse = await withTimeout(
          fetch(cap.uri),
          15000,
          `Fetching photo ${i + 1} file timed out`
        );
        const blob = await withTimeout(
          fileResponse.blob(),
          15000,
          `Converting photo ${i + 1} to blob timed out`
        );

        const formData = new FormData();
        formData.append("file", blob, `photo_${i}.jpg`);
        formData.append("projectId", project?.id || "");
        formData.append("activityId", selectedActivityId || "general");
        formData.append("filename", `photo_${i}.jpg`);

        const response = await withTimeout(
          fetch(`${baseUrl}/api/upload`, {
            method: "POST",
            body: formData,
          }),
          30000,
          `Uploading photo ${i + 1} to server timed out`
        );
        if (!response.ok) throw new Error(`Photo ${i + 1} upload failed`);
        const resJson = await response.json();
        if (resJson.url) {
          attachmentUrls.push(resJson.url);
        }
      }

      setUploadProgressText("Saving site update...");
      const firstCapture = captures[0];

      const body = {
        projectId: project?.id,
        authorId: "mobile",
        workDone,
        activityId: selectedActivityId || undefined,
        weather: "Clear",
        manpower: 0,
        equipment: "",
        important: false,
        attachments: attachmentUrls,
        latitude: firstCapture?.latitude,
        longitude: firstCapture?.longitude,
      };

      try {
        await api("/api/site-updates", { method: "POST", body: JSON.stringify(body) });
      } catch {
        await enqueue({ method: "POST", path: "/api/site-updates", body });
      }
      await syncQueue();
      setWorkDone("");
      setSelectedActivityId("");
      setCaptures([]);
      setShowSuccess(true);
    } catch (err: any) {
      alert("Error uploading media: " + err.message);
    } finally {
      setIsUploading(false);
      setUploadProgressText(null);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            <Screen scroll>
              <Title icon="camera-outline" eyebrow="Daily Record" subtitle="Log work done, attach evidence photos, and link to an activity">
                Site Log
              </Title>

              <Card>
                {/* Contractor nested Project Dropdown Selector */}
                {role === "CONTRACTOR" && (
                  <View style={{ marginBottom: 16 }}>
                    <Text style={{ color: t.textSecondary, fontSize: 11, fontWeight: "900", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                      Select Project
                    </Text>
                    <Pressable
                      onPress={() => setShowProjectModal(true)}
                      style={{
                        height: 56,
                        borderWidth: 2,
                        borderColor: t.inputBorder,
                        borderRadius: 16,
                        paddingHorizontal: 16,
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor: t.inputBg,
                      }}
                    >
                      <Ionicons name="business-outline" size={20} color={t.textMuted} style={{ marginRight: 10 }} />
                      <Text style={{ flex: 1, fontSize: 16, fontWeight: "600", color: t.text }}>
                        {project?.name || "Select Project..."}
                      </Text>
                      <Ionicons name="chevron-down" size={18} color={t.textMuted} />
                    </Pressable>
                  </View>
                )}

                {/* Activity Dropdown Selector */}
                <View style={{ marginBottom: 20 }}>
                  <Text style={{ color: t.textSecondary, fontSize: 11, fontWeight: "900", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                    Link to Activity (Optional)
                  </Text>
                  <Pressable
                    onPress={() => setShowActivityModal(true)}
                    style={{
                      height: 56,
                      borderWidth: 2,
                      borderColor: t.inputBorder,
                      borderRadius: 16,
                      paddingHorizontal: 16,
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: t.inputBg,
                    }}
                  >
                    <Ionicons name="list-outline" size={20} color={t.textMuted} style={{ marginRight: 10 }} />
                    <Text style={{ flex: 1, fontSize: 16, fontWeight: "600", color: t.text }}>
                      {selectedActivityId
                        ? projectActivities.find((a: any) => a.id === selectedActivityId)
                          ? `Stage ${projectActivities.find((a: any) => a.id === selectedActivityId).sequence}: ${projectActivities.find((a: any) => a.id === selectedActivityId).name}`
                          : "General Log / None"
                        : "General Log / None"}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color={t.textMuted} />
                  </Pressable>
                </View>

                <Text style={{ color: t.textSecondary, fontSize: 11, fontWeight: "900", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                  Work progress & Observations
                </Text>
                <TextInput
                  value={workDone}
                  onChangeText={setWorkDone}
                  placeholder="Describe work completed, worker count, or list any site observations..."
                  placeholderTextColor={t.textMuted}
                  multiline
                  returnKeyType="done"
                  blurOnSubmit
                  onSubmitEditing={Keyboard.dismiss}
                  style={{
                    borderWidth: 2,
                    borderColor: t.inputBorder,
                    borderRadius: 16,
                    padding: 16,
                    marginBottom: 20,
                    minHeight: 120,
                    color: t.text,
                    fontSize: 16,
                    fontWeight: "600",
                    backgroundColor: t.inputBg,
                    textAlignVertical: "top",
                  }}
                />

                <View style={{ marginBottom: 20 }}>
                  <Text style={{ color: t.textSecondary, fontSize: 13, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
                    Evidence Media
                  </Text>
                  
                  <View style={{ marginBottom: 12 }}>
                    <CameraCapture onCapture={(c) => setCaptures(prev => [...prev, c])} />
                  </View>

                  {/* Photos Preview */}
                  {captures.length > 0 ? (
                    <View style={{ marginBottom: 12 }}>
                      <Text style={{ color: t.textSecondary, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                        Captured Evidence ({captures.length})
                      </Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {captures.map((cap, index) => (
                          <View key={index} style={{ position: "relative", marginRight: 12 }}>
                            <Image
                              source={{ uri: cap.uri }}
                              style={{ width: 96, height: 96, borderRadius: 16, backgroundColor: t.isDark ? "#222733" : "#F1F5F9", borderWidth: 1, borderColor: t.cardBorder }}
                            />
                            <Pressable
                              onPress={() => setCaptures(prev => prev.filter((_, idx) => idx !== index))}
                              style={{ position: "absolute", top: -8, right: -8, backgroundColor: "#EF4444", borderRadius: 12, width: 24, height: 24, alignItems: "center", justifyContent: "center", zIndex: 10 }}
                            >
                              <Ionicons name="close" size={14} color="#FFFFFF" />
                            </Pressable>
                          </View>
                        ))}
                      </ScrollView>
                    </View>
                  ) : (
                    <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: t.isDark ? "#181B22" : "#F8FAFC", borderWidth: 1, borderColor: t.cardBorder, borderRadius: 16, padding: 16, marginBottom: 12 }}>
                      <Ionicons name="image-outline" size={20} color={t.textMuted} />
                      <Text style={{ color: t.textSecondary, fontWeight: "600", fontSize: 14, marginLeft: 12 }}>
                        No photos captured yet
                      </Text>
                    </View>
                  )}
                </View>

                <Button
                  label={isUploading ? (uploadProgressText || "Uploading & Saving...") : "Submit Site Update"}
                  onPress={submit}
                  loading={isUploading}
                  disabled={!workDone.trim() || isUploading}
                />
              </Card>
            </Screen>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      {/* SUCCESS OVERLAY */}
      {showSuccess && (
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.75)", zIndex: 50, alignItems: "center", justifyContent: "center", padding: 24, elevation: 20 }}>
          <View style={{ backgroundColor: t.card, borderRadius: 24, padding: 24, width: "100%", alignItems: "center", borderWidth: 1, borderColor: t.cardBorder }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(34,197,94,0.1)", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <Ionicons name="checkmark-circle" size={42} color="#22C55E" />
            </View>
            <Text style={{ color: t.text, fontWeight: "900", fontSize: 20, textAlign: "center", marginBottom: 8 }}>
              Daily Log Submitted
            </Text>
            <Text style={{ color: t.textSecondary, fontSize: 16, fontWeight: "600", textAlign: "center", marginBottom: 24, lineHeight: 22 }}>
              Your site update and geotagged evidence have been saved successfully.
            </Text>
            <View style={{ width: "100%" }}>
              <Button label="Done" onPress={() => setShowSuccess(false)} />
            </View>
          </View>
        </View>
      )}

      {/* Project Selector Modal */}
      <Modal
        visible={showProjectModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowProjectModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: t.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: "75%" }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <Text style={{ fontSize: 18, fontWeight: "900", color: t.text }}>Select Project</Text>
              <Pressable onPress={() => setShowProjectModal(false)} style={{ padding: 4 }}>
                <Ionicons name="close" size={24} color={t.text} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
              {(data?.projects || []).map((p: any) => (
                <Pressable
                  key={p.id}
                  onPress={() => {
                    setSelectedProjectId(p.id);
                    setSelectedActivityId("");
                    setShowProjectModal(false);
                  }}
                  style={({ pressed }) => ({
                    paddingVertical: 16,
                    borderBottomWidth: 1,
                    borderBottomColor: t.cardBorder,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text style={{ fontSize: 16, fontWeight: "600", color: project?.id === p.id ? "#F5B81F" : t.text }}>{p.name}</Text>
                  {project?.id === p.id && <Ionicons name="checkmark" size={20} color="#F5B81F" />}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Activity Selector Modal */}
      <Modal
        visible={showActivityModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowActivityModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: t.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: "75%" }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <Text style={{ fontSize: 18, fontWeight: "900", color: t.text }}>Select Activity</Text>
              <Pressable onPress={() => setShowActivityModal(false)} style={{ padding: 4 }}>
                <Ionicons name="close" size={24} color={t.text} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
              <Pressable
                onPress={() => {
                  setSelectedActivityId("");
                  setShowActivityModal(false);
                }}
                style={({ pressed }) => ({
                  paddingVertical: 16,
                  borderBottomWidth: 1,
                  borderBottomColor: t.cardBorder,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text style={{ fontSize: 16, fontWeight: "600", color: selectedActivityId === "" ? "#F5B81F" : t.text }}>General Log / None</Text>
                {selectedActivityId === "" && <Ionicons name="checkmark" size={20} color="#F5B81F" />}
              </Pressable>
              {projectActivities.map((a: any) => (
                <Pressable
                  key={a.id}
                  onPress={() => {
                    setSelectedActivityId(a.id);
                    setShowActivityModal(false);
                  }}
                  style={({ pressed }) => ({
                    paddingVertical: 16,
                    borderBottomWidth: 1,
                    borderBottomColor: t.cardBorder,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text style={{ fontSize: 16, fontWeight: "600", color: selectedActivityId === a.id ? "#F5B81F" : t.text }}>
                    Stage {a.sequence}: {a.name}
                  </Text>
                  {selectedActivityId === a.id && <Ionicons name="checkmark" size={20} color="#F5B81F" />}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
