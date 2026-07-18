import { useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableWithoutFeedback,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Screen, Title, Card, Button } from "@/components/ui";
import { CameraCapture } from "@/components/camera-capture";
import { VoiceNote } from "@/components/voice-note";
import { api } from "@/lib/api";
import { enqueue, syncQueue } from "@/lib/offline";

export default function SiteUpdates() {
  const { data } = useQuery({
    queryKey: ["data"],
    queryFn: () => api<any>("/api/data"),
  });

  const [workDone, setWorkDone] = useState("");
  const [capture, setCapture] = useState<any>();
  const [voice, setVoice] = useState<string>();

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
  };

  return (
    // KeyboardAvoidingView shifts the layout up when the soft keyboard appears.
    // "padding" on iOS adds bottom padding equal to the keyboard height.
    // "height" on Android shrinks the available height instead.
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      // keyboardVerticalOffset accounts for the tab bar height so the
      // layout doesn't over-shoot on iOS.
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
    >
      {/* TouchableWithoutFeedback wraps everything so tapping any empty
          area outside the input dismisses the keyboard. */}
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        {/* ScrollView keeps all content reachable even when the keyboard
            is open. keyboardShouldPersistTaps="handled" means tapping the
            Submit button fires onPress directly without first requiring a
            tap to dismiss the keyboard. */}
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <Screen>
            <Title>Site update</Title>
            <Card>
              <TextInput
                value={workDone}
                onChangeText={setWorkDone}
                placeholder="Work done and issues"
                multiline
                // returnKeyType="done" shows a "Done" key on the iOS keyboard
                // instead of a newline key, making it clear how to close it.
                returnKeyType="done"
                // blurOnSubmit + onSubmitEditing dismiss the keyboard when the
                // user presses the "Done" key on the keyboard toolbar.
                blurOnSubmit
                onSubmitEditing={Keyboard.dismiss}
                className="border border-slate-300 rounded-lg p-3 mb-3 min-h-[80px]"
              />
              <CameraCapture onCapture={setCapture} />
              <Text className="my-3">
                {capture ? "Photo compressed and geotagged." : "No photo captured."}
              </Text>
              <VoiceNote onRecorded={setVoice} />
              <Text className="my-3">
                {voice ? "Voice note attached." : "No voice note."}
              </Text>
              <Button label="Submit site update" onPress={submit} />
            </Card>
          </Screen>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}
