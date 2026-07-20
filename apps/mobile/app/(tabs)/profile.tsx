import { Text, View, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Screen, Title, Card, Button } from "@/components/ui";
import { useAuthStore } from "@/stores/auth";
import { authenticateWithBiometrics } from "@/lib/biometrics";
import { Ionicons } from "@expo/vector-icons";

export default function Profile() {
  const { name, role, signOut } = useAuthStore();
  const router = useRouter();

  const biometric = async () => {
    const ok = await authenticateWithBiometrics();
    if (ok) router.replace("/(tabs)/dashboard");
  };

  const getInitials = (userName: string | null) => {
    if (!userName) return "U";
    return userName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <ScrollView className="flex-1 bg-offWhite" contentContainerStyle={{ flexGrow: 1 }}>
      <Screen>
        <Title>Profile</Title>

        {/* User Card with Initial Avatar */}
        <Card>
          <View className="flex-row items-center py-2">
            <View className="w-16 h-16 rounded-full bg-brandAmber items-center justify-center border border-brandCharcoal/10 shadow-sm">
              <Text className="text-brandCharcoal font-extrabold text-xl">
                {getInitials(name)}
              </Text>
            </View>
            <View className="ml-4 flex-1">
              <Text className="text-xl font-extrabold text-brandCharcoal">
                {name || "FOXSCAN User"}
              </Text>
              <View className="flex-row mt-1">
                <View className="bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200/50">
                  <Text className="text-[10px] font-bold text-slate-600 uppercase">
                    {role || "No Role"}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </Card>

        {/* Settings options */}
        <View className="mb-6">
          <Text className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">
            Security Settings
          </Text>
          
          <Card>
            <View className="flex-row items-center justify-between py-1">
              <View className="flex-row items-center flex-1">
                <Ionicons name="finger-print-outline" size={20} color="#EAAC1F" />
                <View className="ml-3">
                  <Text className="text-brandCharcoal font-bold text-sm">
                    Biometric Authentication
                  </Text>
                  <Text className="text-slate-400 text-xs font-semibold mt-0.5">
                    Unlock application using fingerprint/face ID
                  </Text>
                </View>
              </View>
            </View>
            <View className="mt-4">
              <Button
                label="Unlock with biometrics"
                onPress={biometric}
                variant="outline"
              />
            </View>
          </Card>
        </View>

        {/* Account actions */}
        <View className="mt-2">
          <Button
            label="Sign Out"
            variant="danger"
            onPress={async () => {
              await signOut();
              router.replace("/(auth)/login");
            }}
          />
        </View>
      </Screen>
    </ScrollView>
  );
}
