import { useRef, useState } from "react";
import { Text, View, Alert } from "react-native";
import { Button } from "@/components/ui";

// Safely require native modules to prevent bundle-time crashes if native modules are missing.
let CameraView: any = null;
let useCameraPermissions: any = () => [null, () => {}];
try {
  const expoCamera = require("expo-camera");
  CameraView = expoCamera.CameraView;
  useCameraPermissions = expoCamera.useCameraPermissions;
} catch (e) {
  console.warn("expo-camera failed to load:", e);
}

let ImageManipulator: any = null;
try {
  ImageManipulator = require("expo-image-manipulator");
} catch (e) {
  console.warn("expo-image-manipulator failed to load:", e);
}

let Location: any = null;
try {
  Location = require("expo-location");
} catch (e) {
  console.warn("expo-location failed to load:", e);
}

let ImagePicker: any = null;
try {
  ImagePicker = require("expo-image-picker");
} catch (e) {
  console.warn("expo-image-picker failed to load:", e);
}

export function CameraCapture({
  onCapture,
}: {
  onCapture: (capture: { uri: string; latitude?: number; longitude?: number }) => void;
}) {
  const camera = useRef<any>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [showCamera, setShowCamera] = useState(false);

  const capture = async () => {
    if (!CameraView || !camera.current) {
      Alert.alert("Camera Error", "Camera is not available on this device.");
      return;
    }
    try {
      const photo = await camera.current.takePictureAsync({ quality: 0.7 });
      if (!photo) return;
      
      let compressedUri = photo.uri;
      if (ImageManipulator) {
        try {
          const compressed = await ImageManipulator.manipulateAsync(
            photo.uri,
            [],
            { compress: 0.65, format: ImageManipulator.SaveFormat.JPEG }
          );
          compressedUri = compressed.uri;
        } catch (err) {
          console.warn("Failed to compress photo:", err);
        }
      }
      
      let latitude: number | undefined;
      let longitude: number | undefined;
      if (Location) {
        try {
          const locationPermission = await Location.requestForegroundPermissionsAsync();
          if (locationPermission.status === "granted") {
            const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            latitude = location?.coords.latitude;
            longitude = location?.coords.longitude;
          }
        } catch (err) {
          console.warn("Failed to get photo location:", err);
        }
      }
      
      onCapture({
        uri: compressedUri,
        latitude,
        longitude,
      });
      setShowCamera(false);
    } catch (err) {
      Alert.alert("Capture Error", err instanceof Error ? err.message : "Failed to capture photo");
    }
  };

  const pickFromGallery = async () => {
    if (!ImagePicker) {
      Alert.alert("Gallery Error", "Photo gallery is not available on this device.");
      return;
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions?.Images ?? "images",
        allowsEditing: true,
        quality: 0.7,
      });

      if (!result.canceled && result.assets?.[0]) {
        const selectedUri = result.assets[0].uri;
        let compressedUri = selectedUri;
        if (ImageManipulator) {
          try {
            const compressed = await ImageManipulator.manipulateAsync(
              selectedUri,
              [],
              { compress: 0.65, format: ImageManipulator.SaveFormat.JPEG }
            );
            compressedUri = compressed.uri;
          } catch (err) {
            console.warn("Failed to compress gallery image:", err);
          }
        }
        
        let latitude: number | undefined;
        let longitude: number | undefined;
        if (Location) {
          try {
            const locationPermission = await Location.requestForegroundPermissionsAsync();
            if (locationPermission.status === "granted") {
              const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
              latitude = location?.coords.latitude;
              longitude = location?.coords.longitude;
            }
          } catch (err) {
            console.warn("Failed to get gallery image location:", err);
          }
        }

        onCapture({
          uri: compressedUri,
          latitude,
          longitude,
        });
      }
    } catch (err) {
      Alert.alert("Gallery Error", err instanceof Error ? err.message : "Failed to open gallery");
    }
  };

  return (
    <View style={{ gap: 8 }}>
      {showCamera ? (
        permission?.granted ? (
          <View style={{ gap: 8 }}>
            {CameraView ? (
              <CameraView
                ref={camera}
                style={{ height: 180, borderRadius: 16, overflow: "hidden" }}
                facing="back"
              />
            ) : (
              <View style={{ height: 180, borderRadius: 16, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: "#64748B" }}>Camera preview not available</Text>
              </View>
            )}
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Button label="Take Photo" onPress={capture} />
              </View>
              <View style={{ flex: 1 }}>
                <Button label="Cancel" variant="secondary" onPress={() => setShowCamera(false)} />
              </View>
            </View>
          </View>
        ) : (
          <View style={{ padding: 12, borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 16, alignItems: "center", gap: 8 }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#64748B", textAlign: "center" }}>
              Camera permission is required to take photos.
            </Text>
            <View style={{ flexDirection: "row", gap: 10, width: "100%" }}>
              <View style={{ flex: 1 }}>
                <Button label="Grant Camera" onPress={() => requestPermission()} />
              </View>
              <View style={{ flex: 1 }}>
                <Button label="Go Back" variant="secondary" onPress={() => setShowCamera(false)} />
              </View>
            </View>
          </View>
        )
      ) : (
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Button label="Capture Photo" icon="camera-outline" onPress={() => setShowCamera(true)} />
          </View>
          <View style={{ flex: 1 }}>
            <Button label="Upload Photo" variant="secondary" icon="image-outline" onPress={pickFromGallery} />
          </View>
        </View>
      )}
    </View>
  );
}
