import { Tabs, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, View, useColorScheme } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export default function TabsLayout() {
  const isDark = useColorScheme() === "dark";
  const router = useRouter();
  const { data } = useQuery({
    queryKey: ["data"],
    queryFn: () => api<any>("/api/data"),
    staleTime: 30000,
  });
  
  const unreadCount = data?.notifications?.filter((n: any) => !n.readAt).length || 0;

  const headerBg = isDark ? "#101218" : "#FFFFFF";
  const tabBarBg = isDark ? "#101218" : "#FFFFFF";
  const borderColor = isDark ? "#272C38" : "#E2E8F0";
  const titleColor = isDark ? "#FFFFFF" : "#0F172A";
  const bellColor = isDark ? "#FFFFFF" : "#0F172A";
  const bellBg = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)";

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerStyle: {
          backgroundColor: headerBg,
          borderBottomWidth: 1,
          borderBottomColor: borderColor,
          shadowOpacity: 0,
          elevation: 0,
        },
        headerTitleStyle: {
          fontWeight: "900",
          fontSize: 19,
          letterSpacing: -0.5,
          color: titleColor,
        },
        headerTintColor: titleColor,
        headerRight: () => (
          <Pressable
            onPress={() => router.push("/notifications")}
            style={({ pressed }) => ({
              marginRight: 16,
              width: 44,
              height: 44,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 16,
              backgroundColor: bellBg,
              borderWidth: 1,
              borderColor: borderColor,
              transform: [{ scale: pressed ? 0.95 : 1 }],
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Ionicons name="notifications-outline" size={21} color={bellColor} />
            {unreadCount > 0 && (
              <View style={{ position: "absolute", top: 8, right: 8, width: 10, height: 10, backgroundColor: "#EF4444", borderRadius: 5, borderWidth: 2, borderColor: headerBg }} />
            )}
          </Pressable>
        ),
        tabBarActiveTintColor: "#F5B81F",
        tabBarInactiveTintColor: isDark ? "#64748B" : "#94A3B8",
        tabBarStyle: {
          backgroundColor: tabBarBg,
          borderTopColor: borderColor,
          borderTopWidth: 1,
          height: 66,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "800",
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

          return <Ionicons name={iconName} size={22} color={color} />;
        },
      })}
    >
      <Tabs.Screen name="dashboard" options={{ title: "Dashboard" }} />
      <Tabs.Screen name="projects" options={{ title: "Projects" }} />
      <Tabs.Screen name="approvals" options={{ title: "Approvals" }} />
      <Tabs.Screen name="site-updates" options={{ title: "Updates" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />

      {/* Hidden Routes */}
      <Tabs.Screen name="activities" options={{ href: null, title: "Timeline" }} />
      <Tabs.Screen name="documents" options={{ href: null, title: "Documents" }} />
      <Tabs.Screen name="notifications" options={{ href: null, title: "Notifications" }} />
      <Tabs.Screen name="payments" options={{ href: null, title: "Payments" }} />
      <Tabs.Screen name="delays" options={{ href: null, title: "Delays" }} />
      <Tabs.Screen name="assurance" options={{ href: null, title: "Assurance" }} />
      <Tabs.Screen name="discussion" options={{ href: null, title: "Discussion" }} />
      <Tabs.Screen name="reports" options={{ href: null, title: "Reports" }} />
      <Tabs.Screen name="quotations" options={{ href: null, title: "Quotations" }} />
    </Tabs>
  );
}
