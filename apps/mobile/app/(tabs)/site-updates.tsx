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
  const [capture, setCapture] = useState<any>();
  const [voice, setVoice] = useState<string>();
  const [showSuccess, setShowSuccess] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

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
    let timeoutId: NodeJS.Timeout;
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
    try {
      let attachmentUrls: string[] = [];
      let voiceUrl: string | undefined = undefined;

      if (capture && capture.uri) {
        console.log("[MediaUpload] [Photo] Fetching local photo URI:", capture.uri);
        const fileResponse = await withTimeout(
          fetch(capture.uri),
          15000,
          "Fetching local photo file timed out"
        );
        console.log("[MediaUpload] [Photo] Converting photo to Blob...");
        const blob = await withTimeout(
          fileResponse.blob(),
          15000,
          "Converting photo file to blob timed out"
        );
        console.log("[MediaUpload] [Photo] Blob retrieved. Size:", blob.size);

        const formData = new FormData();
        formData.append("file", blob, "photo.jpg");
        formData.append("projectId", project?.id || "");
        formData.append("activityId", selectedActivityId || "general");
        formData.append("filename", "photo.jpg");

        console.log("[MediaUpload] [Photo] Sending upload request to backend...");
        const response = await withTimeout(
          fetch(`${baseUrl}/api/upload`, {
            method: "POST",
            body: formData,
          }),
          30000,
          "Uploading photo to server timed out"
        );
        console.log("[MediaUpload] [Photo] Backend response status:", response.status);
        if (!response.ok) throw new Error("Photo upload failed");
        const resJson = await response.json();
        console.log("[MediaUpload] [Photo] Upload succeeded. URL:", resJson.url);
        if (resJson.url) {
          attachmentUrls.push(resJson.url);
        }
      }

      if (voice) {
        console.log("[MediaUpload] [Voice] Fetching local voice note URI:", voice);
        const fileResponse = await withTimeout(
          fetch(voice),
          15000,
          "Fetching local voice note file timed out"
        );
        console.log("[MediaUpload] [Voice] Converting voice to Blob...");
        const blob = await withTimeout(
          fileResponse.blob(),
          15000,
          "Converting voice file to blob timed out"
        );
        console.log("[MediaUpload] [Voice] Blob retrieved. Size:", blob.size);

        const formData = new FormData();
        formData.append("file", blob, "voice.m4a");
        formData.append("projectId", project?.id || "");
        formData.append("activityId", selectedActivityId || "general");
        formData.append("filename", "voice.m4a");

        console.log("[MediaUpload] [Voice] Sending upload request to backend...");
        const response = await withTimeout(
          fetch(`${baseUrl}/api/upload`, {
            method: "POST",
            body: formData,
          }),
          30000,
          "Uploading voice note to server timed out"
        );
        console.log("[MediaUpload] [Voice] Backend response status:", response.status);
        if (!response.ok) throw new Error("Voice note upload failed");
        const resJson = await response.json();
        console.log("[MediaUpload] [Voice] Upload succeeded. URL:", resJson.url);
        if (resJson.url) {
          voiceUrl = resJson.url;
        }
      }

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
        voiceNote: voiceUrl,
        latitude: capture?.latitude,
        longitude: capture?.longitude,
      };

      try {
        await api("/api/site-updates", { method: "POST", body: JSON.stringify(body) });
      } catch {
        await enqueue({ method: "POST", path: "/api/site-updates", body });
      }
      await syncQueue();
      setWorkDone("");
      setSelectedActivityId("");
      setCapture(null);
      setVoice(undefined);
      setShowSuccess(true);
    } catch (err: any) {
      console.error("[MediaUpload] UPLOAD FLOW EXCEPTION:", err);
      alert("Error uploading media: " + err.message);
    } finally {
      setIsUploading(false);
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
              <Title>Site Log</Title>

              <Card>
                {/* Activity Selector Pills */}
                {projectActivities.length > 0 && (
                  <View className="mb-4">
                    <Text className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
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
                        <Text className={`text-xs font-bold ${
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
                          <Text className={`text-xs font-bold ${
                            selectedActivityId === a.id ? "text-brandCharcoal font-extrabold" : "text-slate-500"
                          }`}>
                            Stage {a.sequence}: {a.name}
                          </Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}

                <Text className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
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
                  <Text className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                    Evidence Media
                  </Text>
                  
                  <View className="flex-row space-x-3 gap-3 mb-3">
                    <View className="flex-1">
                      <CameraCapture onCapture={setCapture} />
                    </View>
                    <View className="flex-1">
                      <VoiceNote onRecorded={setVoice} />
                    </View>
                  </View>

                  {/* Photo Preview Container */}
                  {capture ? (
                    <View className="flex-row items-center bg-slate-50 border border-slate-200/60 rounded-xl p-2 mb-3">
                      <Image
                        source={{ uri: capture.uri }}
                        className="w-12 h-12 rounded-lg"
                      />
                      <View className="ml-3 flex-1">
                        <Text className="text-brandCharcoal font-bold text-xs">
                          Photo Geotagged
                        </Text>
                        <Text className="text-slate-400 text-[10px] font-semibold mt-0.5">
                          Lat: {capture.latitude?.toFixed(4)}, Lon: {capture.longitude?.toFixed(4)}
                        </Text>
                      </View>
                      <Ionicons name="checkmark-circle" size={20} color="#1B8755" className="mr-1" />
                    </View>
                  ) : (
                    <View className="flex-row items-center bg-slate-50/50 border border-slate-100 rounded-xl p-3 mb-3">
                      <Ionicons name="image-outline" size={18} color="#64748B" />
                      <Text className="text-slate-400 font-semibold text-xs ml-2">
                        No photo captured yet
                      </Text>
                    </View>
                  )}

                  {/* Voice Note Status */}
                  {voice ? (
                    <View className="flex-row items-center bg-slate-50 border border-slate-200/60 rounded-xl p-3 mb-3">
                      <Ionicons name="volume-high" size={18} color="#EAAC1F" />
                      <View className="ml-2 flex-1">
                        <Text className="text-brandCharcoal font-bold text-xs">
                          Voice Note Attached
                        </Text>
                      </View>
                      <Ionicons name="checkmark-circle" size={20} color="#1B8755" />
                    </View>
                  ) : (
                    <View className="flex-row items-center bg-slate-50/50 border border-slate-100 rounded-xl p-3 mb-3">
                      <Ionicons name="mic-outline" size={18} color="#64748B" />
                      <Text className="text-slate-400 font-semibold text-xs ml-2">
                        No voice note recorded yet
                      </Text>
                    </View>
                  )}
                </View>

                <Button
                  label={isUploading ? "Uploading & Saving..." : "Submit Site Update"}
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
            <Text className="text-slate-400 text-xs font-semibold text-center mb-6 leading-relaxed">
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
