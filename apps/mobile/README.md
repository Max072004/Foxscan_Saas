# FOXSCAN Mobile

Expo SDK 57 / TypeScript / Expo Router / NativeWind / React Query / Zustand mobile client.

## Native capabilities

- Camera capture, JPEG compression and foreground GPS: `components/camera-capture.tsx`
- Voice notes: `components/voice-note.tsx`
- SQLite-backed offline mutation queue and last-write-wins conflict helper: `lib/offline.ts`
- Background queue flushing: `lib/background-sync.ts`
- Expo push registration and foreground/tap handlers: `lib/notifications.ts`
- Secure session persistence and biometric unlock: `stores/auth.ts`, `lib/biometrics.ts`

Set `EXPO_PUBLIC_API_URL` to a reachable FOXSCAN backend. Android emulator defaults require `http://10.0.2.2:3000`; physical devices require a LAN or deployed HTTPS endpoint.
