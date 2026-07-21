import { useRef } from "react";
import { Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImageManipulator from "expo-image-manipulator";
import * as Location from "expo-location";
import { Button } from "@/components/ui";

export function CameraCapture({
  onCapture,
}: {
  onCapture: (capture: { uri: string; latitude?: number; longitude?: number }) => void;
}) {
  const camera = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();

  if (!permission?.granted) {
    return (
      <View>
        <Text className="mb-2 text-slate-500 text-sm font-semibold">
          Camera access is required for photo evidence.
        </Text>
        <Button label="Allow camera" onPress={() => requestPermission()} />
      </View>
    );
  }

  const capture = async () => {
    const photo = await camera.current?.takePictureAsync({ quality: 0.7 });
    if (!photo) return;
    const compressed = await ImageManipulator.manipulateAsync(
      photo.uri,
      [],
      { compress: 0.65, format: ImageManipulator.SaveFormat.JPEG }
    );
    const locationPermission = await Location.requestForegroundPermissionsAsync();
    const location =
      locationPermission.status === "granted"
        ? await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
        : undefined;
    onCapture({
      uri: compressed.uri,
      latitude: location?.coords.latitude,
      longitude: location?.coords.longitude,
    });
  };

  return (
    <View>
      <CameraView
        ref={camera}
        style={{ height: 160, borderRadius: 12, overflow: "hidden" }}
        facing="back"
      />
      <View className="mt-2">
        <Button label="Capture photo" onPress={capture} />
      </View>
    </View>
  );
}
