import { useState, useRef } from "react";
import { Text, Alert } from "react-native";
import { useAudioRecorder, AudioModule, RecordingPresets } from "expo-audio";
import { Button } from "@/components/ui";

export function VoiceNote({ onRecorded }: { onRecorded: (uri: string) => void }) {
  const [isRecording, setIsRecording] = useState(false);
  // isStarting guards against double-taps triggering record() a second time
  // while the first async permission/mode setup is still in flight.
  const isStarting = useRef(false);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const start = async () => {
    // Guard: bail out if we're already recording or currently starting up.
    if (isRecording || isStarting.current) return;
    isStarting.current = true;

    try {
      // 1. Request mic permission first — must be fully resolved before anything else.
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert("Microphone Permission", "Microphone access is required to record voice notes.");
        return;
      }

      // 2. Switch the iOS audio session category to .playAndRecord.
      //    `allowsRecording: true` is what actually unlocks recording on iOS —
      //    without it the session stays in playback-only mode and the native
      //    layer throws RecordingDisabledException.
      //    `playsInSilentMode: true` keeps audio alive when the ringer is off.
      //    NOTE: property names changed in expo-audio vs expo-av:
      //      expo-av:    { allowsRecordingIOS, playsInSilentModeIOS }
      //      expo-audio: { allowsRecording, playsInSilentMode }
      await AudioModule.setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      // 3. Start recording. record() is synchronous (returns void) —
      //    no need to await, but we keep it consistent with the stop flow.
      recorder.record();
      setIsRecording(true);
    } catch (err) {
      console.error("Failed to start recorder:", err);
      Alert.alert("Recording Error", err instanceof Error ? err.message : "Failed to start recording voice note.");
    } finally {
      isStarting.current = false;
    }
  };

  const stop = async () => {
    if (!isRecording) return;
    // stop() is async — it flushes and finalises the file before resolving.
    await recorder.stop();

    // Restore the audio session to playback-only mode now that recording is done.
    await AudioModule.setAudioModeAsync({ allowsRecording: false });

    setIsRecording(false);
    if (recorder.uri) {
      onRecorded(recorder.uri);
    }
  };

  return (
    <>
      <Button
        label={isRecording ? "Stop voice note" : "Record voice note"}
        onPress={isRecording ? stop : start}
      />
      {isRecording ? <Text className="mt-2 text-slate-500">Recording…</Text> : null}
    </>
  );
}
