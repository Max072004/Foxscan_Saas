import { useQuery } from "@tanstack/react-query";
import { Text, View, ScrollView, Pressable, TextInput, Image, Modal } from "react-native";
import { Screen, Title, Card, Button, useTheme, ProjectSwitcher } from "@/components/ui";
import { CameraCapture } from "@/components/camera-capture";
import { api, baseUrl } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { useProjectStore } from "@/stores/project";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { useAudioPlayer } from "expo-audio";
import { useRouter } from "expo-router";
import { tatStatus } from "@/lib/scheduling";

const TAT_TIER_STYLE: Record<string, { bg: string; text: string }> = {
  WARNING: { bg: "bg-amber-950/50 border border-amber-700/50", text: "text-amber-400" },
  OVERDUE: { bg: "bg-rose-950/50 border border-rose-700/50", text: "text-rose-400" },
  ESCALATED: { bg: "bg-rose-900/60 border border-rose-600/60", text: "text-rose-300" },
};

function TatBadge({ stage }: { stage: any }) {
  const tat = tatStatus(stage);
  const style = TAT_TIER_STYLE[tat.tier];
  if (!style) return null;
  return (
    <View className={`px-2.5 py-1 rounded-full self-start mt-1.5 ${style.bg}`}>
      <Text className={`text-xs font-black ${style.text}`}>
        {tat.tier === "ESCALATED" ? "ESCALATED" : tat.tier === "OVERDUE" ? "OVERDUE" : "TAT 50%+"} · {tat.pct}%
      </Text>
    </View>
  );
}

const CHECKLIST_LABELS: Record<string, string> = {
  prep: "Substrate Prep",
  coating: "Coating Uniformity",
  cleanup: "Housekeeping",
  evidence: "Evidence Logged",
};

function checklistLabel(key: string) {
  return CHECKLIST_LABELS[key] || key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const DEFAULT_CHECKLIST_TEMPLATE: { key: string; label: string; description: string }[] = [
  { key: "prep", label: "Substrate Prep", description: "Surface is clean, dry, and free of dust/loose paint." },
  { key: "coating", label: "Coating Uniformity", description: "Material is applied evenly without runs or patches." },
  { key: "cleanup", label: "Housekeeping", description: "Workspace is cleared of scaffolding debris and hazards." },
  { key: "evidence", label: "Evidence Logged", description: "Photo and/or voice logs have been attached." },
];

export function VoiceNotePlayer({ url, color = "#EAAC1F" }: { url: string; color?: string }) {
  const player = useAudioPlayer(url);
  const isPlaying = player.playing;

  const togglePlay = () => {
    if (isPlaying) {
      player.pause();
    } else {
      player.play();
    }
  };

  return (
    <Pressable
      onPress={togglePlay}
      className="flex-row items-center bg-slate-100 px-3 py-1.5 rounded-lg mt-2 self-start border border-slate-200/50"
      style={{ gap: 6 }}
    >
      <Ionicons name={isPlaying ? "pause" : "play"} size={12} color={color} />
      <Text className="text-[12px] font-bold text-slate-700">
        {isPlaying ? "Pause Voice" : "Play Voice"}
      </Text>
    </Pressable>
  );
}

export default function Approvals() {
  const t = useTheme();
  const { role, userId } = useAuthStore();
  const router = useRouter();

  const renderPaymentProofBlock = (stage: any) => {
    if (!stage.evidence || stage.evidence.length === 0) {
      return (
        <Text style={{ color: t.isDark ? "#94A3B8" : "#64748B", fontSize: 13, fontWeight: "600", marginTop: 6 }}>
          Proof Reference: <Text style={{ color: t.text, fontWeight: "800" }}>Confirmed by Client</Text>
        </Text>
      );
    }

    const urls = stage.evidence.filter((item: string) => item.startsWith("http://") || item.startsWith("https://"));
    const textRefs = stage.evidence.filter((item: string) => !item.startsWith("http://") && !item.startsWith("https://"));

    return (
      <View style={{ marginTop: 6, gap: 8 }}>
        {textRefs.map((ref: string, idx: number) => (
          <Text key={idx} style={{ color: t.isDark ? "#94A3B8" : "#64748B", fontSize: 13, fontWeight: "600" }}>
            Proof Reference: <Text style={{ color: t.text, fontWeight: "800" }}>{ref}</Text>
          </Text>
        ))}
        {urls.map((url: string, idx: number) => (
          <View key={idx} style={{ marginTop: 8 }}>
            <Text style={{ color: t.isDark ? "#94A3B8" : "#64748B", fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
              Payment Proof Attached:
            </Text>
            <Pressable onPress={() => setActiveImageUrl(url)} style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}>
              <Image
                source={{ uri: url }}
                style={{ width: "100%", height: 180, borderRadius: 12, backgroundColor: t.isDark ? "#222733" : "#F1F5F9", borderWidth: 1, borderColor: t.cardBorder }}
                resizeMode="cover"
              />
            </Pressable>
          </View>
        ))}
      </View>
    );
  };
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [selectedPaymentStage, setSelectedPaymentStage] = useState<any>(null);
  const [paymentRefText, setPaymentRefText] = useState("");
  const [paymentProofPhoto, setPaymentProofPhoto] = useState<{ uri: string } | null>(null);
  const [showPaymentCamera, setShowPaymentCamera] = useState(false);
  const [paymentProofError, setPaymentProofError] = useState("");
  const [submittingPaymentProof, setSubmittingPaymentProof] = useState(false);
  const [returningStageId, setReturningStageId] = useState<string | null>(null);
  const [returnComment, setReturnComment] = useState("");
  const [activeImageUrl, setActiveImageUrl] = useState<string | null>(null);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});

  const { data, refetch } = useQuery({
    queryKey: ["data"],
    queryFn: () => api<any>("/api/data"),
  });

  const checklistTemplateFor = (activityId: string) => {
    const activity = (data?.activities ?? []).find((a: any) => a.id === activityId);
    const project = (data?.projects ?? []).find((p: any) => p.id === activity?.projectId);
    return project?.checklistTemplate?.length ? project.checklistTemplate : DEFAULT_CHECKLIST_TEMPLATE;
  };

  const resetChecklist = (activityId: string) => {
    const template = checklistTemplateFor(activityId);
    setChecklist(Object.fromEntries(template.map((item: any) => [item.key, false])));
  };

  const [actionError, setActionError] = useState("");

  const act = async (stageId: string, action: "APPROVE" | "RETURN", comment?: string) => {
    setActionError("");
    try {
      await api("/api/stages", {
        method: "PATCH",
        body: JSON.stringify({
          stageId,
          action,
          role,
          actorId: userId || "mobile",
          note: comment,
        }),
      });
      refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to update stage");
    }
  };

  const raiseStage = async (activityId: string, checklistObj: any) => {
    setActionError("");
    try {
    await api("/api/stages", {
      method: "POST",
      body: JSON.stringify({
        activityId,
        actorId: userId || "mobile",
        evidence: ["site-photo-capture"],
        checklist: checklistObj,
      }),
    });
      refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to raise stage");
    }
  };

  // Scope everything to the currently selected project first, then filter by role
  const { selectedProjectId } = useProjectStore();
  const projects = data?.projects ?? [];
  const activeProject = projects.find((p: any) => p.id === selectedProjectId) ?? projects[0];
  const activities = (data?.activities ?? []).filter((a: any) => !activeProject || a.projectId === activeProject.id);
  const activityIds = new Set(activities.map((a: any) => a.id));
  const stages = (data?.stages ?? []).filter((s: any) => activityIds.has(s.activityId));

  const getStateBadge = (state: string) => {
    switch (state) {
      case "NOT_STARTED":
        return { bg: "bg-[#292E3A] border border-[#373E4F]", text: "text-slate-400", label: "Not Started" };
      case "CONTRACTOR":
      case "IN_PROGRESS":
        return { bg: "bg-sky-950/50 border border-sky-800/40", text: "text-sky-400", label: "Contractor Stage" };
      case "SUBMITTED":
      case "MANUFACTURER":
      case "CONSULTANT":
        return { bg: "bg-amber-950/50 border border-amber-800/40", text: "text-amber-400", label: `Awaiting ${state}` };
      case "APPROVED":
      case "CLIENT":
        return { bg: "bg-teal-950/50 border border-teal-800/40", text: "text-teal-400", label: "Approved (Awaiting Release)" };
      case "PAID":
        return { bg: "bg-emerald-950/50 border border-emerald-800/40", text: "text-emerald-400", label: "Paid & Closed" };
      case "REWORK":
        return { bg: "bg-rose-950/50 border border-rose-800/40", text: "text-rose-400", label: "Rework Required" };
      case "OVERDUE":
        return { bg: "bg-rose-950/50 border border-rose-800/40", text: "text-rose-400", label: "Overdue" };
      default:
        return { bg: "bg-[#292E3A] border border-[#373E4F]", text: "text-slate-300", label: state };
    }
  };

  const getActivityName = (activityId: string) => {
    return activities.find((a: any) => a.id === activityId)?.name || "Activity";
  };
  const renderEvidenceBlock = (stage: any) => {
    const stageUpdates = data?.siteUpdates?.filter((su: any) => su.stageId === stage.id) || [];
    if (stageUpdates.length === 0) return null;

    const returnedDecision = stage.decisions?.find((d: any) => d.decision === "RETURNED");
    const returnTime = returnedDecision ? new Date(returnedDecision.createdAt).getTime() : null;

    const originalUpdates = stageUpdates.filter((su: any) => !returnTime || new Date(su.date).getTime() < returnTime);
    const reworkUpdates = stageUpdates.filter((su: any) => returnTime && new Date(su.date).getTime() >= returnTime);

    return (
      <View className="bg-slate-50 border border-slate-200/50 rounded-xl p-3 mb-4 mt-2">
        <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
          Attached Site Evidence
        </Text>

        {originalUpdates.length > 0 && (
          <View className={reworkUpdates.length > 0 ? "mb-3" : ""}>
            <Text className="text-[11px] font-extrabold text-slate-500 uppercase mb-1">
              Original Submission:
            </Text>
            {originalUpdates.map((su: any) => (
              <View key={su.id} className="bg-white border border-slate-100 rounded-lg p-2.5 mb-1.5">
                <Text className="text-sm font-semibold text-slate-800 leading-normal">
                  {su.workDone}
                </Text>
                
                {su.attachments && su.attachments.length > 0 && (
                  <View className="flex-row gap-2 mt-2 flex-wrap">
                    {su.attachments.map((url: string, idx: number) => (
                      <Pressable key={idx} onPress={() => setActiveImageUrl(url)} className="active:opacity-80">
                        <Image
                          source={{ uri: url }}
                          className="w-12 h-12 rounded bg-slate-100"
                          resizeMode="cover"
                        />
                      </Pressable>
                    ))}
                  </View>
                )}

                {su.voiceNote && (
                  <VoiceNotePlayer url={su.voiceNote} color="#EAAC1F" />
                )}
              </View>
            ))}
          </View>
        )}

        {reworkUpdates.length > 0 && (
          <View>
            <Text className="text-[11px] font-extrabold text-[#EF4444] uppercase mb-1">
              Rework Remedial Evidence:
            </Text>
            {reworkUpdates.map((su: any) => (
              <View key={su.id} className="bg-red-50/30 border border-red-100 rounded-lg p-2.5 mb-1.5">
                <Text className="text-sm font-semibold text-slate-800 leading-normal">
                  {su.workDone}
                </Text>

                {su.attachments && su.attachments.length > 0 && (
                  <View className="flex-row gap-2 mt-2 flex-wrap">
                    {su.attachments.map((url: string, idx: number) => (
                      <Pressable key={idx} onPress={() => setActiveImageUrl(url)} className="active:opacity-80">
                        <Image
                          source={{ uri: url }}
                          className="w-12 h-12 rounded bg-slate-100"
                          resizeMode="cover"
                        />
                      </Pressable>
                    ))}
                  </View>
                )}

                {su.voiceNote && (
                  <VoiceNotePlayer url={su.voiceNote} color="#D9383A" />
                )}
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };
  const renderStageDetailsBlock = (stage: any) => {
    const activity = activities.find((a: any) => a.id === stage.activityId);
    const boqItems = (data?.boqItems || []).filter(
      (b: any) => b.activityId === stage.activityId || (!b.activityId && b.projectId === activity?.projectId)
    );
    return (
      <View className="mb-1">
        {activity && (
          <View className="bg-slate-50 border border-slate-200/50 rounded-xl p-3 mb-2">
            <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Payment Breakdown
            </Text>
            <View className="flex-row justify-between mb-1">
              <Text className="text-sm text-slate-500">Base value</Text>
              <Text className="text-sm text-slate-700 font-semibold">₹{activity.paymentValue.toLocaleString("en-IN")}</Text>
            </View>
            <View className="flex-row justify-between mb-1">
              <Text className="text-sm text-slate-500">GST ({activity.gstPct}%)</Text>
              <Text className="text-sm text-slate-700 font-semibold">+ ₹{Math.round(activity.paymentValue * activity.gstPct / 100).toLocaleString("en-IN")}</Text>
            </View>
            <View className="flex-row justify-between mb-1">
              <Text className="text-sm text-slate-500">Retention held ({activity.retentionPct}%)</Text>
              <Text className="text-sm text-[#EF4444] font-semibold">− ₹{Math.round(activity.paymentValue * activity.retentionPct / 100).toLocaleString("en-IN")}</Text>
            </View>
            <View className="flex-row justify-between pt-1.5 mt-1 border-t border-slate-200">
              <Text className="text-sm font-extrabold text-slate-800 dark:text-white">Net payable now</Text>
              <Text className="text-sm font-extrabold text-slate-800 dark:text-white">₹{stage.amountDue?.toLocaleString("en-IN") ?? "0"}</Text>
            </View>
          </View>
        )}

        {stage.checklist && (
          <View className="bg-slate-50 border border-slate-200/50 rounded-xl p-3 mb-2">
            <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Contractor QA Checklist
            </Text>
            <View className="flex-row flex-wrap" style={{ gap: 6 }}>
              {Object.keys(stage.checklist).length === 0 && (
                <Text className="text-sm text-slate-400 font-medium">No checklist recorded.</Text>
              )}
              {Object.entries(stage.checklist).map(([key, value]) => {
                const ok = !!value;
                return (
                  <View
                    key={key}
                    className={`flex-row items-center px-2 py-1 rounded-full ${ok ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-200"}`}
                    style={{ gap: 4 }}
                  >
                    <Ionicons name={ok ? "checkmark-circle" : "close-circle"} size={11} color={ok ? "#1B8755" : "#D9383A"} />
                    <Text className={`text-[11px] font-bold ${ok ? "text-[#22C55E]" : "text-[#EF4444]"}`}>{checklistLabel(key)}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {boqItems.length > 0 && (
          <View className="bg-slate-50 border border-slate-200/50 rounded-xl p-3 mb-2">
            <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              BOQ / Material Spec Reference
            </Text>
            {boqItems.map((b: any) => (
              <Text key={b.id} className="text-sm text-slate-700 font-medium mb-1">
                <Text className="font-extrabold">{b.code}</Text> — {b.description} · {b.quantity} {b.unit} @ ₹{b.rate}
                {b.manufacturer ? <Text className="text-slate-400"> · Brand: {b.manufacturer}</Text> : null}
              </Text>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderDecisionTimeline = (stage: any) => {
    const decisions = stage.decisions || [];
    if (decisions.length === 0) return null;

    return (
      <View className="mb-4 bg-slate-50/60 border border-slate-200/40 rounded-xl p-3">
        <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
          Approval Timeline
        </Text>
        {decisions.map((d: any) => {
          const isReturned = d.decision === "RETURNED";
          return (
            <View key={d.id} className="flex-row items-start mb-2" style={{ gap: 8 }}>
              <View
                className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                  isReturned ? "bg-alertRed" : "bg-successGreen"
                }`}
              />
              <View className="flex-1">
                <View className="flex-row items-center flex-wrap" style={{ gap: 4 }}>
                  <Text className="text-sm font-bold text-slate-700">{d.role}</Text>
                  <Text className="text-[11px] font-semibold text-slate-400 uppercase">
                    {d.decision.replace("_", " ")}
                  </Text>
                  <Text className="text-[11px] text-slate-400">
                    · {new Date(d.createdAt).toLocaleDateString()} {new Date(d.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                {d.note ? (
                  <View className="mt-1 bg-white border border-slate-100 p-2 rounded-lg">
                    <Text className="text-sm text-slate-600 font-medium italic">
                      "{d.note}"
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>
    );
  };
  // Contractor: see activities they can raise + stages returned for rework
  if (role === "CONTRACTOR") {
    const reworkStages = stages.filter((s: any) => s.state === "REWORK");
    const receiptStages = stages.filter((s: any) => s.state === "AWAITING_RECEIPT");
    const submittedStages = stages.filter(
      (s: any) =>
        s.state !== "PAID" &&
        s.state !== "REWORK" &&
        s.submittedBy === userId
    );
    const raisableActivities = activities.filter(
      (a: any) =>
        (a.status === "NOT_STARTED" || a.status === "IN_PROGRESS") &&
        !stages.some(
          (s: any) =>
            s.activityId === a.id && s.state !== "PAID" && s.state !== "REWORK"
        )
    );

    return (
      <View className="flex-1 relative bg-[#F8FAFC] dark:bg-[#101218]">
        <ScrollView className="flex-grow" contentContainerStyle={{ flexGrow: 1 }}>
          <Screen scroll>
            <Title icon="checkmark-done-outline" eyebrow="Stage Workflow">Approvals</Title>
            <ProjectSwitcher />
            {actionError ? (
              <View className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
                <Text className="text-[#EF4444] font-bold text-sm">{actionError}</Text>
              </View>
            ) : null}

            {raisableActivities.length > 0 && (
              <View className="mb-6">
                <Text className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">
                  Ready to Raise
                </Text>
                {raisableActivities.map((activity: any) => (
                  <Card key={activity.id}>
                    <View className="flex-row items-center justify-between mb-3">
                      <Text className="font-bold text-slate-800 dark:text-white text-base flex-1 pr-2">
                        {activity.name}
                      </Text>
                      <View className="bg-slate-100 px-2.5 py-1 rounded-full">
                        <Text className="text-sm font-bold text-slate-600 uppercase">
                          {activity.status}
                        </Text>
                      </View>
                    </View>
                    <Button
                      label="Raise Stage"
                      onPress={() => {
                        setSelectedActivity(activity);
                        resetChecklist(activity.id);
                      }}
                    />
                  </Card>
                ))}
              </View>
            )}

            {reworkStages.length > 0 && (
              <View className="mb-6">
                <Text className="text-sm font-bold text-[#EF4444] uppercase tracking-wider mb-3">
                  Returned for Rework
                </Text>
                {reworkStages.map((stage: any) => {
                  const returnComment = stage.comments?.find(
                    (c: any) => c.kind === "RETURN_REASON"
                  );
                  const activityObj = activities.find((x: any) => x.id === stage.activityId);
                  return (
                    <Card key={stage.id}>
                      <View className="mb-3">
                        <View className="flex-row items-center space-x-2 mb-2">
                          <Ionicons name="alert-circle" size={18} color="#D9383A" />
                          <Text className="font-extrabold text-slate-800 dark:text-white text-base ml-1">
                            {getActivityName(stage.activityId)}
                          </Text>
                        </View>
                        {returnComment && (
                          <View className="bg-red-50/70 border border-red-100 p-3 rounded-xl mb-3">
                            <Text className="text-[#EF4444] font-bold text-sm mb-1">
                              REWORK REASON:
                            </Text>
                            <Text className="text-slate-800 dark:text-white font-semibold text-sm leading-relaxed">
                              {returnComment.text}
                            </Text>
                          </View>
                        )}
                        <Text className="text-slate-400 text-sm font-semibold">
                          Due: {new Date(stage.dueAt).toLocaleDateString()}
                        </Text>
                      </View>
                      {renderStageDetailsBlock(stage)}
                      {renderDecisionTimeline(stage)}
                      {renderEvidenceBlock(stage)}
                      <View className="mb-2">
                        <Button
                          label="Log new evidence before resubmitting"
                          variant="secondary"
                          onPress={() => {
                            router.push({
                              pathname: "/(tabs)/site-updates",
                              params: { activityId: stage.activityId }
                            });
                          }}
                        />
                      </View>
                      <Button
                        label="Re-submit Stage"
                        onPress={() => {
                          setSelectedActivity(activityObj || { id: stage.activityId, name: getActivityName(stage.activityId) });
                          resetChecklist(stage.activityId);
                        }}
                      />
                    </Card>
                  );
                })}
              </View>
            )}

            {receiptStages.length > 0 && (
              <View className="mb-6">
                <Text className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">
                  Confirm Payment Receipt
                </Text>
                {receiptStages.map((stage: any) => (
                  <Card key={stage.id}>
                    <View className="mb-3">
                      <Text className="font-extrabold text-slate-800 dark:text-white text-base">
                        {getActivityName(stage.activityId)}
                      </Text>
                      {renderPaymentProofBlock(stage)}
                    </View>
                    {renderDecisionTimeline(stage)}
                    <Button
                      label="Confirm Receipt & Close Stage"
                      onPress={() => act(stage.id, "APPROVE")}
                    />
                  </Card>
                ))}
              </View>
            )}

            {submittedStages.length > 0 && (
              <View className="mb-6">
                <Text className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">
                  Awaiting Review
                </Text>
                {submittedStages.map((stage: any) => {
                  const badge = getStateBadge(stage.state);
                  return (
                    <Card key={stage.id}>
                      <View className="flex-row items-start justify-between mb-3">
                        <View className="flex-1 pr-2">
                          <Text className="font-bold text-slate-800 dark:text-white text-base mb-1">
                            {getActivityName(stage.activityId)}
                          </Text>
                          <Text className="text-slate-400 text-sm font-semibold">
                            Due: {new Date(stage.dueAt).toLocaleDateString()}
                          </Text>
                          <TatBadge stage={stage} />
                        </View>
                        <View className={`${badge.bg} px-2.5 py-1 rounded-full`}>
                          <Text className={`text-[11px] font-bold uppercase ${badge.text}`}>
                            {badge.label}
                          </Text>
                        </View>
                      </View>
                      {renderStageDetailsBlock(stage)}
                      {renderDecisionTimeline(stage)}
                      {renderEvidenceBlock(stage)}
                    </Card>
                  );
                })}
              </View>
            )}

            {raisableActivities.length === 0 &&
              reworkStages.length === 0 &&
              submittedStages.length === 0 && (
                <Card>
                  <View className="items-center py-6">
                    <Ionicons name="checkmark-circle-outline" size={40} color="#1B8755" />
                    <Text className="text-slate-500 font-bold text-center mt-3">
                      No pending items
                    </Text>
                  </View>
                </Card>
              )}
          </Screen>
        </ScrollView>

        {/* MOBILE QA COMPLIANCE CHECKLIST MODAL */}
        {selectedActivity && (
          <View className="absolute inset-0 bg-brandCharcoal/70 z-50 justify-end" style={{ elevation: 15 }}>
            <View className="bg-white rounded-t-3xl p-6 pb-10 border-t border-slate-100 shadow-lg">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-slate-800 dark:text-white font-extrabold text-base">
                  QA Compliance Checklist
                </Text>
                <Pressable
                  onPress={() => setSelectedActivity(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center"
                >
                  <Ionicons name="close" size={16} color="#64748B" />
                </Pressable>
              </View>
              
              <Text className="text-slate-400 text-sm font-semibold mb-4 leading-relaxed">
                Verify and confirm all quality checks before raising stage approval for {selectedActivity.name}.
              </Text>

              <View className="space-y-4 gap-3 mb-6">
                {checklistTemplateFor(selectedActivity.id).map((item: any) => (
                  <Pressable
                    key={item.key}
                    onPress={() => setChecklist({ ...checklist, [item.key]: !checklist[item.key] })}
                    className="flex-row items-start"
                  >
                    <View className={`w-5 h-5 rounded border border-2 items-center justify-center mr-3 ${checklist[item.key] ? "bg-brandAmber border-brandAmber" : "border-slate-300"}`}>
                      {checklist[item.key] && <Ionicons name="checkmark" size={12} color="#1A1D24" />}
                    </View>
                    <View className="flex-1">
                      <Text className="text-slate-800 dark:text-white font-extrabold text-sm">{item.label}</Text>
                      {item.description ? (
                        <Text className="text-slate-400 text-[11px] font-semibold mt-0.5">{item.description}</Text>
                      ) : null}
                    </View>
                  </Pressable>
                ))}
              </View>

              <Button
                label="Raise Stage for Approval"
                onPress={async () => {
                  await raiseStage(selectedActivity.id, checklist);
                  setSelectedActivity(null);
                  setChecklist({});
                }}
                disabled={!checklistTemplateFor(selectedActivity.id).every((item: any) => checklist[item.key])}
              />
            </View>
          </View>
        )}
      </View>
    );
  }

  // Client: see stages awaiting their payment release
  if (role === "CLIENT") {
    const awaitingPayment = stages.filter(
      (s: any) => s.state === "CLIENT"
    );

    return (
      <View className="flex-1 relative bg-[#F8FAFC] dark:bg-[#101218]">
        <ScrollView className="flex-grow" contentContainerStyle={{ flexGrow: 1 }}>
          <Screen scroll>
            <Title icon="checkmark-done-outline" eyebrow="Stage Workflow">Approvals</Title>
            <ProjectSwitcher />
            {actionError ? (
              <View className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
                <Text className="text-[#EF4444] font-bold text-sm">{actionError}</Text>
              </View>
            ) : null}
            <Text className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">
              Awaiting Payment Release
            </Text>
            {awaitingPayment.length === 0 ? (
              <Card>
                <View className="items-center py-6">
                  <Ionicons name="checkmark-circle-outline" size={40} color="#1B8755" />
                  <Text className="text-slate-500 font-bold text-center mt-3">
                    No stages awaiting payment
                  </Text>
                </View>
              </Card>
            ) : (
              awaitingPayment.map((stage: any) => (
                <Card key={stage.id}>
                  <View className="flex-row items-center justify-between mb-4">
                    <View className="flex-1 pr-2">
                      <Text className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-1">
                        {getActivityName(stage.activityId)}
                      </Text>
                      <Text className="font-extrabold text-slate-800 dark:text-white text-sm">
                        Due: {new Date(stage.dueAt).toLocaleDateString()}
                      </Text>
                      <TatBadge stage={stage} />
                    </View>
                    <View className="ml-2">
                      <Text className="text-sm text-slate-400 font-bold text-right mb-0.5">
                        AMOUNT DUE
                      </Text>
                      <Text className="font-extrabold text-xl text-[#22C55E] text-right">
                        ₹{stage.amountDue?.toLocaleString("en-IN") ?? "0"}
                      </Text>
                    </View>
                  </View>
                  {renderStageDetailsBlock(stage)}
                  {renderDecisionTimeline(stage)}
                  {renderEvidenceBlock(stage)}
                  <Button
                    label="Release Payment"
                    onPress={() => {
                      setSelectedPaymentStage(stage);
                      setPaymentRefText("");
                    }}
                  />
                </Card>
              ))
            )}
          </Screen>
        </ScrollView>

        {/* MOBILE CLIENT PAYMENT PROOF UPLOAD MODAL */}
        {selectedPaymentStage && (
          <View className="absolute inset-0 bg-brandCharcoal/70 z-50 justify-end" style={{ elevation: 15 }}>
            <View className="bg-white rounded-t-3xl p-6 pb-10 border-t border-slate-100 shadow-lg">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-slate-800 dark:text-white font-extrabold text-base">
                  Upload Payment Proof
                </Text>
                <Pressable
                  onPress={() => {
                    setSelectedPaymentStage(null);
                    setPaymentProofPhoto(null);
                    setShowPaymentCamera(false);
                    setPaymentProofError("");
                  }}
                  className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center"
                >
                  <Ionicons name="close" size={16} color="#64748B" />
                </Pressable>
              </View>

              <Text className="text-slate-400 text-sm font-semibold mb-4 leading-relaxed">
                Confirm you have paid ₹{selectedPaymentStage.amountDue?.toLocaleString("en-IN")} externally (bank transfer, cheque, or cash) and provide a reference number and/or a photo as proof.
              </Text>

              <View className="mb-4">
                <Text className="text-slate-500 text-[11px] font-bold uppercase tracking-wider mb-1.5">
                  Cheque Number / Transfer Reference
                </Text>
                <TextInput
                  value={paymentRefText}
                  onChangeText={setPaymentRefText}
                  placeholder="e.g. Cheque #482931 or IMPS reference ID"
                  placeholderTextColor="#94A3B8"
                  className="h-12 border border-slate-200 bg-white rounded-xl px-4 text-slate-800 dark:text-white text-sm font-semibold"
                />
              </View>

              <View className="mb-6">
                <Text className="text-slate-500 text-[11px] font-bold uppercase tracking-wider mb-1.5">
                  Payment Screenshot / Cheque Photo
                </Text>
                {paymentProofPhoto ? (
                  <View className="flex-row items-center" style={{ gap: 10 }}>
                    <Image source={{ uri: paymentProofPhoto.uri }} className="w-16 h-16 rounded-lg bg-slate-100" resizeMode="cover" />
                    <Pressable onPress={() => setPaymentProofPhoto(null)}>
                      <Text className="text-[#EF4444] text-sm font-bold">Remove</Text>
                    </Pressable>
                  </View>
                ) : (
                  <CameraCapture onCapture={(c) => setPaymentProofPhoto({ uri: c.uri })} />
                )}
              </View>

              {paymentProofError ? (
                <Text className="text-[#EF4444] text-xs font-semibold mb-3">{paymentProofError}</Text>
              ) : null}

              <Button
                label={submittingPaymentProof ? "Submitting…" : "Submit Payment Proof"}
                onPress={async () => {
                  setPaymentProofError("");
                  if (!paymentRefText.trim() && !paymentProofPhoto) {
                    setPaymentProofError("Enter a reference number or attach a photo.");
                    return;
                  }
                  setSubmittingPaymentProof(true);
                  try {
                    let photoUrl: string | undefined;
                    if (paymentProofPhoto) {
                      const fileResponse = await fetch(paymentProofPhoto.uri);
                      const blob = await fileResponse.blob();
                      const formData = new FormData();
                      formData.append("file", blob, "payment_proof.jpg");
                      formData.append("projectId", data?.projects?.find((p: any) => p.id === activities.find((a: any) => a.id === selectedPaymentStage.activityId)?.projectId)?.id || "");
                      formData.append("activityId", "payments");
                      formData.append("filename", "payment_proof.jpg");
                      const uploadRes = await fetch(`${baseUrl}/api/upload`, { method: "POST", body: formData });
                      if (!uploadRes.ok) throw new Error("Photo upload failed");
                      photoUrl = (await uploadRes.json()).url;
                    }
                    const evidence = [paymentRefText.trim(), photoUrl].filter(Boolean) as string[];
                    await api("/api/stages", {
                      method: "PATCH",
                      body: JSON.stringify({
                        stageId: selectedPaymentStage.id,
                        action: "APPROVE",
                        role: "CLIENT",
                        actorId: userId || "mobile",
                        evidence,
                        note: `Payment proof submitted: ${paymentRefText.trim() || "photo attached"}`,
                      }),
                    });
                    refetch();
                    setSelectedPaymentStage(null);
                    setPaymentProofPhoto(null);
                  } catch (err) {
                    setPaymentProofError(err instanceof Error ? err.message : "Failed to submit payment proof");
                  } finally {
                    setSubmittingPaymentProof(false);
                  }
                }}
                disabled={submittingPaymentProof || (!paymentRefText.trim() && !paymentProofPhoto)}
              />
            </View>
          </View>
        )}
      </View>
    );
  }

  // Manufacturer / Consultant: see stages awaiting their review and can act.
  // Admin: sees every open stage for oversight, but the backend never lets ADMIN
  // approve/return a stage directly (only the assigned reviewer role can), so this
  // is read-only here to match what the API will actually allow.
  const isAdminView = role === "ADMIN";
  const awaitingRole = isAdminView
    ? stages.filter((s: any) => s.state !== "PAID" && s.state !== "REWORK")
    : stages.filter((s: any) => s.state === role);

  return (
    <ScrollView className="flex-1 bg-[#F8FAFC] dark:bg-[#101218]" contentContainerStyle={{ flexGrow: 1 }}>
      <Screen scroll>
        <Title icon="checkmark-done-outline" eyebrow="Stage Workflow">Approvals</Title>
        {actionError ? (
          <View className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
            <Text className="text-[#EF4444] font-bold text-sm">{actionError}</Text>
          </View>
        ) : null}
        <Text className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">
          {isAdminView ? "Portfolio Oversight (Read-Only)" : "Awaiting Your Review"}
        </Text>
        {awaitingRole.length === 0 ? (
          <Card>
            <View className="items-center py-6">
              <Ionicons name="checkmark-circle-outline" size={40} color="#1B8755" />
              <Text className="text-slate-500 font-bold text-center mt-3">
                No stages awaiting your review
              </Text>
            </View>
          </Card>
        ) : (
          awaitingRole.map((stage: any) => {
            const badge = getStateBadge(stage.state);
            return (
              <Card key={stage.id}>
                <View className="flex-row justify-between items-start mb-4">
                  <View className="flex-1 pr-2">
                    <Text className="font-bold text-slate-800 dark:text-white text-base mb-1">
                      {getActivityName(stage.activityId)}
                    </Text>
                    <Text className="text-slate-400 text-sm font-semibold">
                      Due: {new Date(stage.dueAt).toLocaleDateString()}
                    </Text>
                    <TatBadge stage={stage} />
                  </View>
                  <View className={`${badge.bg} px-2.5 py-1 rounded-full`}>
                    <Text className={`text-[11px] font-bold uppercase ${badge.text}`}>
                      {badge.label}
                    </Text>
                  </View>
                </View>
                {renderStageDetailsBlock(stage)}
                {renderDecisionTimeline(stage)}
                {renderEvidenceBlock(stage)}
                {isAdminView ? (
                  <View className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                    <Text className="text-slate-500 text-xs font-semibold">
                      Awaiting the {stage.state} role — admins can view but not act on this stage.
                    </Text>
                  </View>
                ) : (
                  <View className="flex-row space-x-3 gap-3">
                    <View className="flex-1">
                      <Button
                        label="Approve"
                        variant="primary"
                        onPress={() => act(stage.id, "APPROVE")}
                      />
                    </View>
                    <View className="flex-1">
                      <Button
                        label="Return"
                        variant="danger"
                        onPress={() => setReturningStageId(stage.id)}
                      />
                    </View>
                  </View>
                )}
              </Card>
            );
          })
        )}
      </Screen>

      {/* Return for Rework Comment Modal */}
      <Modal
        visible={returningStageId !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setReturningStageId(null);
          setReturnComment("");
        }}
      >
        <View className="flex-1 justify-end bg-brandCharcoal/50">
          <View className="bg-white rounded-t-3xl p-6 min-h-[300px]">
            <Text className="text-slate-800 dark:text-white font-extrabold text-lg mb-2">
              Reason for Return
            </Text>
            <Text className="text-slate-500 text-sm font-semibold mb-4 leading-relaxed">
              Please specify the rework required. This comment will be visible to the Contractor.
            </Text>

            <TextInput
              value={returnComment}
              onChangeText={setReturnComment}
              placeholder="Describe what needs to be fixed..."
              placeholderTextColor="#94A3B8"
              multiline
              className="border border-slate-200 rounded-xl p-4 mb-6 min-h-[100px] text-slate-800 dark:text-white text-sm font-medium focus:border-brandAmber"
              style={{ textAlignVertical: "top" }}
            />

            <View className="flex-row space-x-3 gap-3">
              <View className="flex-1">
                <Button
                  label="Submit Return"
                  variant="danger"
                  disabled={!returnComment.trim()}
                  onPress={async () => {
                    if (returningStageId) {
                      await act(returningStageId, "RETURN", returnComment);
                    }
                    setReturningStageId(null);
                    setReturnComment("");
                  }}
                />
              </View>
              <View className="flex-1">
                <Button
                  label="Cancel"
                  variant="secondary"
                  onPress={() => {
                    setReturningStageId(null);
                    setReturnComment("");
                  }}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Full-Screen Image Viewer Modal */}
      <Modal
        visible={activeImageUrl !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setActiveImageUrl(null)}
      >
        <View className="flex-1 bg-black justify-center items-center relative">
          {activeImageUrl && (
            <Image
              source={{ uri: activeImageUrl }}
              className="w-full h-full"
              resizeMode="contain"
            />
          )}
          <Pressable
            onPress={() => setActiveImageUrl(null)}
            className="absolute top-12 right-6 w-10 h-10 bg-brandCharcoal/80 rounded-full items-center justify-center border border-slate-700/50"
            style={{ zIndex: 100 }}
          >
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </Pressable>
        </View>
      </Modal>
    </ScrollView>
  );
}
