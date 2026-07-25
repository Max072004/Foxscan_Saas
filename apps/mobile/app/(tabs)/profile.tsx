import { useState } from "react";
import { Text, View, ScrollView, TextInput, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Screen, Title, Card, Button } from "@/components/ui";
import { useAuthStore } from "@/stores/auth";
import { authenticateWithBiometrics } from "@/lib/biometrics";
import { api } from "@/lib/api";
import { Ionicons } from "@expo/vector-icons";
import type { Role } from "@/lib/types";

const INVITE_PERMISSIONS: Record<string, Role[]> = {
  ADMIN: ["ADMIN", "CONTRACTOR", "MANUFACTURER", "CONSULTANT", "CLIENT"],
  CONTRACTOR: ["CONSULTANT", "CLIENT", "MANUFACTURER"],
  CONSULTANT: ["CONTRACTOR", "CLIENT"],
};

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Admin",
  CONTRACTOR: "Contractor",
  MANUFACTURER: "Manufacturer",
  CONSULTANT: "Consultant",
  CLIENT: "Client",
};

export default function Profile() {
  const { name, role, signOut } = useAuthStore();
  const router = useRouter();

  const invitableRoles = role ? INVITE_PERMISSIONS[role] ?? [] : [];
  const canInvite = invitableRoles.length > 0;

  const { data: myProjects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => api<any[]>("/api/projects"),
    enabled: canInvite,
  });

  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role | "">("");
  const [inviteProjectId, setInviteProjectId] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");
  const [inviting, setInviting] = useState(false);

  const sendInvite = async () => {
    setInviteError("");
    setInviteSuccess("");
    if (!inviteName.trim() || !inviteEmail.trim() || !inviteRole) {
      setInviteError("Name, email, and role are required.");
      return;
    }
    if (role !== "ADMIN" && !inviteProjectId) {
      setInviteError("Select which project this person is being added to.");
      return;
    }
    setInviting(true);
    try {
      const res = await api<{ user: { name: string; role: string; email: string } }>("/api/invitations", {
        method: "POST",
        body: JSON.stringify({
          name: inviteName.trim(),
          email: inviteEmail.trim(),
          role: inviteRole,
          projectId: inviteProjectId || undefined,
        }),
      });
      setInviteSuccess(`${res.user.name} added as ${res.user.role}. They can sign in with ${res.user.email} now.`);
      setInviteName(""); setInviteEmail(""); setInviteRole(""); setInviteProjectId("");
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Failed to add user");
    } finally {
      setInviting(false);
    }
  };

  const biometric = async () => {
    const ok = await authenticateWithBiometrics();
    if (ok) router.replace("/(tabs)/dashboard");
  };

  const getInitials = (userName: string | null) => {
    if (!userName) return "U";
    return userName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <ScrollView className="flex-1 bg-offWhite" contentContainerStyle={{ flexGrow: 1 }}>
      <Screen>
        <Title icon="person-outline" eyebrow="Account">Profile</Title>

        {/* User Card with Initial Avatar */}
        <Card>
          <View className="flex-row items-center py-2">
            <View className="w-16 h-16 rounded-full bg-brandAmber items-center justify-center border border-brandCharcoal/10 shadow-sm">
              <Text className="text-brandCharcoal font-extrabold text-xl">
                {getInitials(name)}
              </Text>
            </View>
            <View className="ml-4 flex-1">
              <Text className="text-xl font-extrabold text-brandCharcoal">
                {name || "FOXSCAN User"}
              </Text>
              <View className="flex-row mt-1">
                <View className="bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200/50">
                  <Text className="text-[11px] font-bold text-slate-600 uppercase">
                    {role || "No Role"}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </Card>

        {/* Invite Users */}
        {canInvite && (
          <View className="mb-6">
            <Text className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">
              Invite Users
            </Text>
            <Card>
              <TextInput
                value={inviteName}
                onChangeText={setInviteName}
                placeholder="Full name"
                placeholderTextColor="#94A3B8"
                className="border border-slate-200 rounded-xl px-3 h-11 text-sm font-semibold text-brandCharcoal mb-2.5"
              />
              <TextInput
                value={inviteEmail}
                onChangeText={setInviteEmail}
                placeholder="Email address"
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
                keyboardType="email-address"
                className="border border-slate-200 rounded-xl px-3 h-11 text-sm font-semibold text-brandCharcoal mb-2.5"
              />

              <Text className="text-slate-500 text-[11px] font-bold uppercase tracking-wider mb-1.5">Role</Text>
              <View className="flex-row flex-wrap mb-2.5" style={{ gap: 6 }}>
                {invitableRoles.map((r) => (
                  <Pressable
                    key={r}
                    onPress={() => setInviteRole(r)}
                    className={`px-3 py-2 rounded-full border ${inviteRole === r ? "bg-brandAmber border-brandAmber" : "bg-white border-slate-200"}`}
                  >
                    <Text className={`text-sm font-bold ${inviteRole === r ? "text-brandCharcoal" : "text-slate-500"}`}>
                      {ROLE_LABELS[r]}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {(role === "ADMIN" || myProjects.length > 0) && (
                <>
                  <Text className="text-slate-500 text-[11px] font-bold uppercase tracking-wider mb-1.5">
                    Project {role !== "ADMIN" ? "(required)" : "(optional)"}
                  </Text>
                  <View className="flex-row flex-wrap mb-3" style={{ gap: 6 }}>
                    {role === "ADMIN" && (
                      <Pressable
                        onPress={() => setInviteProjectId("")}
                        className={`px-3 py-2 rounded-full border ${inviteProjectId === "" ? "bg-brandAmber border-brandAmber" : "bg-white border-slate-200"}`}
                      >
                        <Text className={`text-sm font-bold ${inviteProjectId === "" ? "text-brandCharcoal" : "text-slate-500"}`}>
                          No specific project
                        </Text>
                      </Pressable>
                    )}
                    {myProjects.map((p: any) => (
                      <Pressable
                        key={p.id}
                        onPress={() => setInviteProjectId(p.id)}
                        className={`px-3 py-2 rounded-full border ${inviteProjectId === p.id ? "bg-brandAmber border-brandAmber" : "bg-white border-slate-200"}`}
                      >
                        <Text className={`text-sm font-bold ${inviteProjectId === p.id ? "text-brandCharcoal" : "text-slate-500"}`}>
                          {p.name}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              )}

              {inviteError ? <Text className="text-alertRed text-xs font-semibold mb-2">{inviteError}</Text> : null}
              {inviteSuccess ? <Text className="text-successGreen text-xs font-semibold mb-2">{inviteSuccess}</Text> : null}

              <Button label={inviting ? "Adding…" : "Add User"} onPress={sendInvite} disabled={inviting} />
            </Card>
          </View>
        )}

        {/* Settings options */}
        <View className="mb-6">
          <Text className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">
            Security Settings
          </Text>
          
          <Card>
            <View className="flex-row items-center justify-between py-1">
              <View className="flex-row items-center flex-1">
                <Ionicons name="finger-print-outline" size={20} color="#EAAC1F" />
                <View className="ml-3">
                  <Text className="text-brandCharcoal font-bold text-sm">
                    Biometric Authentication
                  </Text>
                  <Text className="text-slate-400 text-sm font-semibold mt-0.5">
                    Unlock application using fingerprint/face ID
                  </Text>
                </View>
              </View>
            </View>
            <View className="mt-4">
              <Button
                label="Unlock with biometrics"
                onPress={biometric}
                variant="outline"
              />
            </View>
          </Card>
        </View>

        {/* Account actions */}
        <View className="mt-2">
          <Button
            label="Sign Out"
            variant="danger"
            onPress={async () => {
              await signOut();
              router.replace("/(auth)/login");
            }}
          />
        </View>
      </Screen>
    </ScrollView>
  );
}
