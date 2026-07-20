import { useState } from "react";
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
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Screen, Title, Card, Button } from "@/components/ui";
import { CameraCapture } from "@/components/camera-capture";
import { VoiceNote } from "@/components/voice-note";
import { api } from "@/lib/api";
import { enqueue, syncQueue } from "@/lib/offline";
import { Ionicons } from "@expo/vector-icons";

export default function SiteUpdates() {
  const { data } = useQuery({
    queryKey: ["data"],
    queryFn: () => api<any>("/api/data"),
  });

  const [workDone, setWorkDone] = useState("");
  const [capture, setCapture] = useState<any>();
  const [voice, setVoice] = useState<string>();
  const [showSuccess, setShowSuccess] = useState(false);

  const submit = async () => {
    Keyboard.dismiss();
    const body = {
      projectId: data?.projects?.[0]?.id,
      authorId: "mobile",
      workDone,
      weather: "Clear",
      manpower: 0,
      equipment: "",
      important: false,
      attachments: capture ? [capture.uri] : [],
      voiceNote: voice,
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
    setCapture(null);
    setVoice(undefined);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 4000);
  };

  return (
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
          className="bg-offWhite"
        >
          <Screen>
            <Title>Site Log</Title>

            {showSuccess && (
              <View className="mb-4 p-4 bg-green-50 border border-green-200 rounded-2xl flex-row items-center space-x-2">
                <Ionicons name="checkmark-circle" size={24} color="#1B8755" />
                <Text className="text-successGreen font-extrabold text-sm ml-2">
                  Site update submitted successfully!
                </Text>
              </View>
            )}

            <Card>
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
                label="Submit Site Update"
                onPress={submit}
                disabled={!workDone.trim()}
              />
            </Card>
          </Screen>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}
