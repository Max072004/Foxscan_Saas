import Constants from "expo-constants";
import { useAuthStore } from "@/stores/auth";

// Priority order (highest to lowest):
// 1. EXPO_PUBLIC_API_URL — set in .env.local, injected by Metro at bundle time.
//    This always reflects the current machine IP without a native rebuild.
// 2. Constants.expoConfig?.extra?.apiUrl — baked into the native binary at
//    `expo prebuild` time. Stale in the bare workflow; only useful as a
//    last-resort fallback when no env var is present.
// 3. Hard-coded Android emulator address (10.0.2.2 routes to host loopback).
export const baseUrl =
  process.env.EXPO_PUBLIC_API_URL ||
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ||
  "http://10.0.2.2:3000";

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = useAuthStore.getState().token;
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok)
    throw new Error(body?.error || `Request failed (${response.status})`);
  return body as T;
}
