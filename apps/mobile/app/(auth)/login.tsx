import { useState } from "react";
import { TextInput, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Screen, Title, Card, Button } from "@/components/ui";
import { api } from "@/lib/api";

export default function Login() {
  const [identifier, setIdentifier] = useState("admin@foxscan.local");
  const [message, setMessage] = useState("");
  const router = useRouter();

  const request = async () => {
    try {
      const result = await api<{ developmentCode?: string }>("/api/auth/otp", {
        method: "POST",
        body: JSON.stringify({ action: "request", identifier }),
      });
      setMessage(
        result.developmentCode
          ? `Local OTP: ${result.developmentCode}`
          : "Code sent."
      );
      router.push({
        pathname: "/(auth)/verify",
        params: { identifier },
      });
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Unable to request OTP");
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
            FIELD INTELLIGENCE
          </Text>
        </View>

        <Title>Welcome back</Title>

        <Card>
          <Text className="text-slate-600 text-sm font-semibold mb-4">
            Sign in using your registered phone number or email.
          </Text>
          <TextInput
            value={identifier}
            onChangeText={setIdentifier}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="Email or phone"
            placeholderTextColor="#94A3B8"
            className="h-12 border border-slate-300 rounded-xl px-4 mb-4 text-brandCharcoal text-sm font-medium focus:border-brandAmber"
          />
          <Button label="Send OTP" onPress={request} />
          {message ? (
            <View className="mt-4 p-3 bg-slate-50 border border-slate-100 rounded-xl">
              <Text className="text-center text-sm font-semibold text-slate-500">
                {message}
              </Text>
            </View>
          ) : null}
        </Card>
      </View>
    </Screen>
  );
}
