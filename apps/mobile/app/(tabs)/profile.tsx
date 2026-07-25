import { useState } from "react";
import { Text, View, ScrollView, TextInput, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Screen, Title, Card, Button, useTheme } from "@/components/ui";
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
  const t = useTheme();
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

  const inputStyle = {
    borderWidth: 2,
    borderColor: t.inputBorder,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 14,
    fontWeight: "600" as const,
    color: t.text,
    marginBottom: 10,
    backgroundColor: t.inputBg,
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ flexGrow: 1 }}>
      <Screen scroll>
        <Title icon="person-outline" eyebrow="Account">Profile</Title>

        {/* User Card with Initial Avatar */}
        <Card>
          <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 8 }}>
            <View style={{ width: 64, height: 64, borderRadius: 24, backgroundColor: "#F5B81F", alignItems: "center", justifyContent: "center", marginRight: 16 }}>
              <Text style={{ color: "#0F172A", fontWeight: "900", fontSize: 24, letterSpacing: -1 }}>
                {getInitials(name)}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: "#F5B81F", fontSize: 11, fontWeight: "900", textTransform: "uppercase", letterSpacing: 2, marginBottom: 4 }}>
                {role || "User"}
              </Text>
              <Text style={{ fontSize: 22, fontWeight: "900", color: t.text, lineHeight: 28 }}>
                {name || "Authenticated Member"}
              </Text>
            </View>
          </View>
        </Card>

        {/* Invite Users */}
        {canInvite && (
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: t.textSecondary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
              Invite Users
            </Text>
            <Card>
              <TextInput value={inviteName} onChangeText={setInviteName} placeholder="Full name" placeholderTextColor={t.textMuted} style={inputStyle} />
              <TextInput value={inviteEmail} onChangeText={setInviteEmail} placeholder="Email address" placeholderTextColor={t.textMuted} autoCapitalize="none" keyboardType="email-address" style={inputStyle} />

              <Text style={{ color: t.textSecondary, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Role</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 10, gap: 6 }}>
                {invitableRoles.map((r) => (
                  <Pressable
                    key={r}
                    onPress={() => setInviteRole(r)}
                    style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, backgroundColor: inviteRole === r ? "#F5B81F" : t.card, borderColor: inviteRole === r ? "#F5B81F" : t.cardBorder }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: "700", color: inviteRole === r ? "#0F172A" : t.textSecondary }}>
                      {ROLE_LABELS[r]}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {(role === "ADMIN" || myProjects.length > 0) && (
                <>
                  <Text style={{ color: t.textSecondary, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
                    Project {role !== "ADMIN" ? "(required)" : "(optional)"}
                  </Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 12, gap: 6 }}>
                    {role === "ADMIN" && (
                      <Pressable
                        onPress={() => setInviteProjectId("")}
                        style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, backgroundColor: inviteProjectId === "" ? "#F5B81F" : t.card, borderColor: inviteProjectId === "" ? "#F5B81F" : t.cardBorder }}
                      >
                        <Text style={{ fontSize: 14, fontWeight: "700", color: inviteProjectId === "" ? "#0F172A" : t.textSecondary }}>
                          No specific project
                        </Text>
                      </Pressable>
                    )}
                    {myProjects.map((p: any) => (
                      <Pressable
                        key={p.id}
                        onPress={() => setInviteProjectId(p.id)}
                        style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, backgroundColor: inviteProjectId === p.id ? "#F5B81F" : t.card, borderColor: inviteProjectId === p.id ? "#F5B81F" : t.cardBorder }}
                      >
                        <Text style={{ fontSize: 14, fontWeight: "700", color: inviteProjectId === p.id ? "#0F172A" : t.textSecondary }}>
                          {p.name}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              )}

              {inviteError ? <Text style={{ color: "#EF4444", fontSize: 12, fontWeight: "600", marginBottom: 8 }}>{inviteError}</Text> : null}
              {inviteSuccess ? <Text style={{ color: "#22C55E", fontSize: 12, fontWeight: "600", marginBottom: 8 }}>{inviteSuccess}</Text> : null}

              <Button label={inviting ? "Adding…" : "Add User"} onPress={sendInvite} disabled={inviting} />
            </Card>
          </View>
        )}

        {/* Settings options */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 13, fontWeight: "700", color: t.textSecondary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
            Security Settings
          </Text>
          
          <Card>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 4 }}>
              <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                <Ionicons name="finger-print-outline" size={20} color="#F5B81F" />
                <View style={{ marginLeft: 12 }}>
                  <Text style={{ color: t.text, fontWeight: "700", fontSize: 14 }}>
                    Biometric Authentication
                  </Text>
                  <Text style={{ color: t.textSecondary, fontSize: 13, fontWeight: "600", marginTop: 2 }}>
                    Unlock application using fingerprint/face ID
                  </Text>
                </View>
              </View>
            </View>
            <View style={{ marginTop: 16 }}>
              <Button
                label="Unlock with biometrics"
                onPress={biometric}
                variant="outline"
              />
            </View>
          </Card>
        </View>

        {/* Account actions */}
        <View style={{ marginTop: 8 }}>
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
