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
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Screen, Title, Card, Button } from "@/components/ui";
import { CameraCapture } from "@/components/camera-capture";
import { VoiceNote } from "@/components/voice-note";
import { File as ExpoFile } from "expo-file-system";
import { api, baseUrl } from "@/lib/api";
import { enqueue, syncQueue } from "@/lib/offline";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";

export default function SiteUpdates() {
  const { data } = useQuery({
    queryKey: ["data"],
    queryFn: () => api<any>("/api/data"),
  });

  const [workDone, setWorkDone] = useState("");
  const [selectedActivityId, setSelectedActivityId] = useState("");
  const [captures, setCaptures] = useState<any[]>([]);
  const [voice, setVoice] = useState<string>();
  const [showSuccess, setShowSuccess] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState<string | null>(null);

  const { activityId } = useLocalSearchParams<{ activityId?: string }>();

  useEffect(() => {
    if (activityId) {
      setSelectedActivityId(activityId);
    }
  }, [activityId]);

  const project = data?.projects?.[0];
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

      let voiceNoteUrl: string | undefined;
      if (voice) {
        setUploadProgressText("Uploading voice note...");
        // NOTE: fetch(uri).blob() hangs indefinitely for audio in this RN environment (confirmed).
        // expo-file-system's File class implements the Blob interface and reads via native FS
        // instead of going through fetch, so it sidesteps that hang entirely.
        const audioFile = new ExpoFile(voice);
        const formData = new FormData();
        formData.append("file", audioFile as unknown as Blob, "voice.m4a");
        formData.append("projectId", project?.id || "");
        formData.append("activityId", selectedActivityId || "general");
        formData.append("filename", "voice.m4a");

        const response = await withTimeout(
          fetch(`${baseUrl}/api/upload`, { method: "POST", body: formData }),
          30000,
          "Uploading voice note timed out"
        );
        if (!response.ok) throw new Error("Voice note upload failed");
        const resJson = await response.json();
        voiceNoteUrl = resJson.url;
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
        voiceNote: voiceNoteUrl,
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
      setVoice(undefined);
      setShowSuccess(true);
    } catch (err: any) {
      alert("Error uploading media: " + err.message);
    } finally {
      setIsUploading(false);
      setUploadProgressText(null);
    }
  };

  return (
    <View className="flex-1 relative bg-offWhite">
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
            <Screen>
              <Title icon="camera-outline" eyebrow="Daily Record" subtitle="Log work done, attach photos, and link to an activity">
                Site Log
              </Title>

              <Card>
                {/* Activity Selector Pills */}
                {projectActivities.length > 0 && (
                  <View className="mb-4">
                    <Text className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-2">
                      Link to Activity (Optional)
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row py-1">
                      <Pressable
                        onPress={() => setSelectedActivityId("")}
                        className={`px-4 py-2 rounded-full mr-2 border ${
                          selectedActivityId === ""
                            ? "bg-brandAmber border-brandAmber"
                            : "bg-white border-slate-200"
                        }`}
                        style={({ pressed }) => pressed ? { transform: [{ scale: 0.96 }] } : {}}
                      >
                        <Text className={`text-sm font-bold ${
                          selectedActivityId === "" ? "text-brandCharcoal font-extrabold" : "text-slate-500"
                        }`}>
                          General Log / None
                        </Text>
                      </Pressable>
                      {projectActivities.map((a: any) => (
                        <Pressable
                          key={a.id}
                          onPress={() => setSelectedActivityId(a.id)}
                          className={`px-4 py-2 rounded-full mr-2 border ${
                            selectedActivityId === a.id
                              ? "bg-brandAmber border-brandAmber"
                              : "bg-white border-slate-200"
                          }`}
                          style={({ pressed }) => pressed ? { transform: [{ scale: 0.96 }] } : {}}
                        >
                          <Text className={`text-sm font-bold ${
                            selectedActivityId === a.id ? "text-brandCharcoal font-extrabold" : "text-slate-500"
                          }`}>
                            Stage {a.sequence}: {a.name}
                          </Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}

                <Text className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-2">
                  Work progress & Observations
                </Text>
                <TextInput
                  value={workDone}
                  onChangeText={setWorkDone}
                  placeholder="Describe work completed, manpower count, weather, or list any site issues..."
                  placeholderTextColor="#94A3B8"
                  multiline
                  returnKeyType="done"
                  blurOnSubmit
                  onSubmitEditing={Keyboard.dismiss}
                  className="border border-slate-200 rounded-xl p-4 mb-4 min-h-[100px] text-brandCharcoal text-sm font-medium focus:border-brandAmber"
                  style={{ textAlignVertical: "top" }}
                />

                <View className="mb-4">
                  <Text className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-2">
                    Evidence Media
                  </Text>
                  
                  <View className="flex-row space-x-3 gap-3 mb-3">
                    <View className="flex-1">
                      <CameraCapture onCapture={(c) => setCaptures(prev => [...prev, c])} />
                    </View>
                    <View className="flex-1">
                      <VoiceNote onRecorded={setVoice} />
                    </View>
                  </View>

                  {voice ? (
                    <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 mb-3" style={{ gap: 8 }}>
                      <Ionicons name="mic" size={16} color="#EAAC1F" />
                      <Text className="text-xs font-semibold text-slate-600 flex-1">Voice note recorded</Text>
                      <Pressable onPress={() => setVoice(undefined)}>
                        <Ionicons name="close-circle" size={18} color="#94A3B8" />
                      </Pressable>
                    </View>
                  ) : null}

                  {/* Multiple Photos Preview Container */}
                  {captures.length > 0 ? (
                    <View className="mb-3">
                      <Text className="text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-2">
                        Captured Evidence ({captures.length})
                      </Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row py-1">
                        {captures.map((cap, index) => (
                          <View key={index} className="relative mr-3">
                            <Image
                              source={{ uri: cap.uri }}
                              className="w-20 h-20 rounded-xl bg-slate-100 border border-slate-200"
                            />
                            <Pressable
                              onPress={() => setCaptures(prev => prev.filter((_, idx) => idx !== index))}
                              className="absolute -top-1.5 -right-1.5 bg-brandCharcoal/80 rounded-full w-5 h-5 items-center justify-center border border-slate-700/50"
                              style={{ zIndex: 10 }}
                            >
                              <Ionicons name="close" size={12} color="#FFFFFF" />
                            </Pressable>
                            {cap.latitude && cap.longitude && (
                              <View className="absolute bottom-1 left-1 bg-black/50 px-1 py-0.5 rounded">
                                <Text className="text-[9px] text-white font-bold">
                                  {cap.latitude.toFixed(2)}, {cap.longitude.toFixed(2)}
                                </Text>
                              </View>
                            )}
                          </View>
                        ))}
                      </ScrollView>
                    </View>
                  ) : (
                    <View className="flex-row items-center bg-slate-50/50 border border-slate-100 rounded-xl p-3 mb-3">
                      <Ionicons name="image-outline" size={18} color="#64748B" />
                      <Text className="text-slate-400 font-semibold text-sm ml-2">
                        No photos captured yet
                      </Text>
                    </View>
                  )}
                </View>

                <Button
                  label={isUploading ? (uploadProgressText || "Uploading & Saving...") : "Submit Site Update"}
                  onPress={submit}
                  disabled={!workDone.trim() || isUploading}
                />
              </Card>
            </Screen>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      {/* FULL-SCREEN OVERLAY SUCCESS STATE */}
      {showSuccess && (
        <View className="absolute inset-0 bg-brandCharcoal/70 z-50 items-center justify-center p-6" style={{ elevation: 20 }}>
          <View className="bg-white rounded-3xl p-6 w-full items-center shadow-lg border border-slate-100">
            <View className="w-16 h-16 rounded-full bg-emerald-50 items-center justify-center mb-4">
              <Ionicons name="checkmark-circle" size={40} color="#1B8755" />
            </View>
            <Text className="text-brandCharcoal font-extrabold text-lg text-center mb-2">
              Daily Log Submitted
            </Text>
            <Text className="text-slate-400 text-sm font-semibold text-center mb-6 leading-relaxed">
              Your site log has been saved and queued for synchronization.
            </Text>
            <View className="w-full">
              <Button label="Done" onPress={() => setShowSuccess(false)} />
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
