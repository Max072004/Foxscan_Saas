import { useState } from "react";
import { TextInput, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Screen, Title, Card, Button } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";

export default function Verify() {
  const { identifier } = useLocalSearchParams<{ identifier: string }>();
  const [code, setCode] = useState("123456");
  const [message, setMessage] = useState("");
  const signIn = useAuthStore((s) => s.signIn);
  const router = useRouter();

  const verify = async () => {
    try {
      const result = await api<{
        token: string;
        user: { id: string; role: any; name: string };
      }>("/api/auth/otp", {
        method: "POST",
        body: JSON.stringify({ action: "verify", identifier, code }),
      });
      await signIn(result.token, result.user);
      router.replace("/(tabs)/dashboard");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Invalid OTP");
    }
  };

  return (
    <Screen>
      <View className="flex-1 justify-center py-6">
        {/* Brand Logo Header */}
        <View className="items-center justify-center mb-8">
          <View className="w-24 h-24 rounded-full bg-brandAmber items-center justify-center shadow-lg border border-brandCharcoal/10">
            <Text className="text-brandCharcoal font-extrabold text-lg tracking-tighter">
              FOXSCAN
            </Text>
          </View>
          <Text className="text-sm font-bold text-brandAmber mt-3 tracking-[2px]">
            SECURE VERIFICATION
          </Text>
        </View>

        <Title>Verify OTP</Title>

        <Card>
          <Text className="text-slate-600 text-sm font-semibold mb-4">
            Enter the code sent to {identifier}.
          </Text>
          <TextInput
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="6-digit code"
            placeholderTextColor="#94A3B8"
            className="h-12 border border-slate-300 rounded-xl px-4 mb-4 text-brandCharcoal text-sm font-medium tracking-[8px] text-center focus:border-brandAmber"
          />
          <Button label="Verify and continue" onPress={verify} />
          {message ? (
            <View className="mt-4 p-3 bg-red-50 border border-red-100 rounded-xl">
              <Text className="text-center text-sm font-semibold text-alertRed">
                {message}
              </Text>
            </View>
          ) : null}
        </Card>
      </View>
    </Screen>
  );
}
