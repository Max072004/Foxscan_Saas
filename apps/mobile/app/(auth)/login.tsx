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
import { useRouter } from "expo-router";
import { Screen, Title, Card, Button, InputField, useTheme } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";

export default function Login() {
  const t = useTheme();
  const { token } = useAuthStore();
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (token) {
      router.replace("/(tabs)/dashboard");
    }
  }, [token, router]);

  const request = async () => {
    if (!identifier.trim()) {
      setErrorMsg("Please enter your registered email or mobile number.");
      return;
    }
    setErrorMsg("");
    setMessage("");
    setLoading(true);

    try {
      const result = await api<{ deliveredTo?: string }>("/api/auth/otp", {
        method: "POST",
        body: JSON.stringify({ action: "request", identifier: identifier.trim() }),
      });
      setMessage(result.deliveredTo ? `Code sent to ${result.deliveredTo}` : "Code sent.");
      router.push({
        pathname: "/(auth)/verify",
        params: { identifier: identifier.trim() },
      });
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Unable to request verification code.");
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
                  Field Intelligence
                </Text>
              </View>

              <Title subtitle="Enter your registered credentials to access your workspace.">
                Sign In
              </Title>

              <Card>
                <InputField
                  label="Registered Email or Mobile"
                  icon="mail-outline"
                  value={identifier}
                  onChangeText={(val) => {
                    setIdentifier(val);
                    if (errorMsg) setErrorMsg("");
                  }}
                  onClear={() => setIdentifier("")}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  placeholder="name@company.com or phone number"
                  editable={!loading}
                  error={errorMsg}
                />

                <Button
                  label="Send OTP Code"
                  onPress={request}
                  loading={loading}
                  disabled={loading || !identifier.trim()}
                  icon="paper-plane-outline"
                />

                {message ? (
                  <View style={{ marginTop: 16, padding: 16, backgroundColor: "rgba(34,197,94,0.1)", borderWidth: 1, borderColor: "rgba(34,197,94,0.3)", borderRadius: 16 }}>
                    <Text style={{ textAlign: "center", fontSize: 14, fontWeight: "700", color: "#22C55E" }}>
                      {message}
                    </Text>
                  </View>
                ) : null}
              </Card>
            </View>
          </Screen>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}
