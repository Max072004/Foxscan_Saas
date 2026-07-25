import "../global.css";
import { useEffect } from "react";
import { Platform } from "react-native";
import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useAuthStore } from "@/stores/auth";
import { registerBackgroundSync } from "@/lib/background-sync";
import { registerPushToken } from "@/lib/notifications";
import { api } from "@/lib/api";

const client = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 10000,
    },
  },
});

export default function RootLayout() {
  useEffect(() => {
    useAuthStore
      .getState()
      .hydrate()
      .then(() => {
        const token = useAuthStore.getState().token;
        if (token) {
          registerPushToken()
            .then((expoPushToken) => {
              if (expoPushToken) {
                return api("/api/mobile/devices", {
                  method: "POST",
                  body: JSON.stringify({ expoPushToken, platform: Platform.OS }),
                }).catch(() => undefined);
              }
            })
            .catch(() => undefined);
        }
      })
      .catch(() => undefined);

    registerBackgroundSync().catch(() => undefined);
  }, []);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={client}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="project/[id]" />
          <Stack.Screen name="project/setup" />
        </Stack>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
