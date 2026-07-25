import { useState, useEffect } from "react";
import {
  Text,
  View,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Screen, Title, Card, Button, InputField, useTheme } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";

export default function Verify() {
  const t = useTheme();
  const { token } = useAuthStore();
  const { identifier } = useLocalSearchParams<{ identifier: string }>();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const signIn = useAuthStore((s) => s.signIn);
  const router = useRouter();

  useEffect(() => {
    if (token) {
      router.replace("/(tabs)/dashboard");
    }
  }, [token, router]);

  const verify = async () => {
    if (!code || code.trim().length < 6) {
      setErrorMsg("Please enter the complete 6-digit OTP code.");
      return;
    }
    setErrorMsg("");
    setLoading(true);

    try {
      const result = await api<{
        token: string;
        user: { id: string; role: any; name: string };
      }>("/api/auth/otp", {
        method: "POST",
        body: JSON.stringify({ action: "verify", identifier, code: code.trim() }),
      });
      await signIn(result.token, result.user);
      router.replace("/(tabs)/dashboard");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Invalid or expired one-time password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: t.bg }}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
          keyboardShouldPersistTaps="handled"
        >
          <Screen dismissKeyboardOnTap={false} scroll>
            <View style={{ paddingVertical: 16 }}>
              {/* Brand Header */}
              <View style={{ alignItems: "center", justifyContent: "center", marginBottom: 32 }}>
                <View style={{ width: 96, height: 96, borderRadius: 24, backgroundColor: "#F5B81F", alignItems: "center", justifyContent: "center", padding: 8 }}>
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    style={{ color: "#0F172A", fontWeight: "900", fontSize: 20, letterSpacing: -1, textAlign: "center" }}
                  >
                    FOXSCAN
                  </Text>
                </View>
                <Text style={{ fontSize: 11, fontWeight: "900", color: "#F5B81F", marginTop: 12, letterSpacing: 3, textTransform: "uppercase" }}>
                  Secure Verification
                </Text>
              </View>

              <Title subtitle={`Enter the 6-digit code sent to ${identifier || "your account"}.`}>
                Verify OTP
              </Title>

              <Card>
                <InputField
                  label="6-Digit Security Code"
                  icon="key-outline"
                  value={code}
                  onChangeText={(val) => {
                    setCode(val);
                    if (errorMsg) setErrorMsg("");
                  }}
                  onClear={() => setCode("")}
                  keyboardType="number-pad"
                  maxLength={6}
                  editable={!loading}
                  placeholder="Enter code"
                  error={errorMsg}
                />

                <Button
                  label="Verify & Sign In"
                  onPress={verify}
                  loading={loading}
                  disabled={loading || code.trim().length < 6}
                  icon="checkmark-circle-outline"
                />
              </Card>
            </View>
          </Screen>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}
