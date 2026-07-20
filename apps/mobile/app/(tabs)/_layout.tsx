import { Tabs, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export default function TabsLayout() {
  const router = useRouter();
  const { data } = useQuery({
    queryKey: ["data"],
    queryFn: () => api<any>("/api/data"),
    staleTime: 30000,
  });
  
  const unreadCount = data?.notifications?.filter((n: any) => !n.readAt).length || 0;

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerStyle: {
          backgroundColor: "#1A1D24",
          borderBottomWidth: 1,
          borderBottomColor: "#2A2E39",
          shadowOpacity: 0,
          elevation: 0,
        },
        headerTitleStyle: {
          fontWeight: "900",
          fontSize: 18,
          letterSpacing: -0.5,
          color: "#FFFFFF",
        },
        headerTintColor: "#FFFFFF",
        headerRight: () => (
          <Pressable
            onPress={() => router.push("/notifications")}
            className="mr-4 w-10 h-10 items-center justify-center rounded-xl bg-slate-800/60 active:scale-95 transition-all"
            style={({ pressed }) => pressed ? { transform: [{ scale: 0.95 }], opacity: 0.85 } : {}}
          >
            <Ionicons name="notifications-outline" size={20} color="#FFFFFF" />
            {unreadCount > 0 && (
              <View className="absolute top-2 right-2 w-3 h-3 bg-alertRed rounded-full border-2 border-brandCharcoal" />
            )}
          </Pressable>
        ),
        tabBarActiveTintColor: "#EAAC1F",
        tabBarInactiveTintColor: "#64748B",
        tabBarStyle: {
          backgroundColor: "#1A1D24",
          borderTopColor: "#2A2E39",
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "700",
          marginTop: 2,
        },
        tabBarIcon: ({ color, focused }) => {
          let iconName: keyof typeof Ionicons.glyphMap = "square-outline";

          if (route.name === "dashboard") {
            iconName = focused ? "grid" : "grid-outline";
          } else if (route.name === "projects") {
            iconName = focused ? "business" : "business-outline";
          } else if (route.name === "approvals") {
            iconName = focused ? "checkmark-circle" : "checkmark-circle-outline";
          } else if (route.name === "site-updates") {
            iconName = focused ? "camera" : "camera-outline";
          } else if (route.name === "profile") {
            iconName = focused ? "person" : "person-outline";
          }

          return <Ionicons name={iconName} size={20} color={color} />;
        },
      })}
    >
      <Tabs.Screen name="dashboard" options={{ title: "Dashboard" }} />
      <Tabs.Screen name="projects" options={{ title: "Projects" }} />
      <Tabs.Screen name="approvals" options={{ title: "Approvals" }} />
      <Tabs.Screen name="site-updates" options={{ title: "Updates" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />

      {/* Hidden Routes (registered but not displayed on bottom tab bar) */}
      <Tabs.Screen name="activities" options={{ href: null }} />
      <Tabs.Screen name="documents" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
    </Tabs>
  );
}
