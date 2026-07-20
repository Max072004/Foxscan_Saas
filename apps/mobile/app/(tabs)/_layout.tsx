import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function TabsLayout() {
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
          fontWeight: "800",
          fontSize: 18,
          letterSpacing: -0.5,
          color: "#FFFFFF",
        },
        headerTintColor: "#FFFFFF",
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
          } else if (route.name === "activities") {
            iconName = focused ? "trail-sign" : "trail-sign-outline";
          } else if (route.name === "approvals") {
            iconName = focused ? "checkmark-circle" : "checkmark-circle-outline";
          } else if (route.name === "site-updates") {
            iconName = focused ? "camera" : "camera-outline";
          } else if (route.name === "documents") {
            iconName = focused ? "document-attach" : "document-attach-outline";
          } else if (route.name === "notifications") {
            iconName = focused ? "notifications" : "notifications-outline";
          } else if (route.name === "profile") {
            iconName = focused ? "person" : "person-outline";
          }

          return <Ionicons name={iconName} size={20} color={color} />;
        },
      })}
    >
      <Tabs.Screen name="dashboard" options={{ title: "Dashboard" }} />
      <Tabs.Screen name="projects" options={{ title: "Projects" }} />
      <Tabs.Screen name="activities" options={{ title: "Timeline" }} />
      <Tabs.Screen name="approvals" options={{ title: "Approvals" }} />
      <Tabs.Screen name="site-updates" options={{ title: "Updates" }} />
      <Tabs.Screen name="documents" options={{ title: "Docs" }} />
      <Tabs.Screen name="notifications" options={{ title: "Alerts" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
