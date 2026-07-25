"use client";

import { useState } from "react";
import type { AppData } from "@/lib/domain";
import { MessageSquare, Send } from "lucide-react";

interface DiscussionProps {
  data: AppData;
  activities: any[];
  actorId: string;
  reload: () => Promise<void>;
}

export default function Discussion({ data, activities, actorId, reload }: DiscussionProps) {
  const [selectedActivityId, setSelectedActivityId] = useState(activities[0]?.id || "");
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const project = data.projects[0];
  const comments = data.activityComments
    .filter((c) => c.activityId === selectedActivityId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const getUserName = (userId: string) => data.users.find((u) => u.id === userId)?.name || "Unknown";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !selectedActivityId) return;
    setSubmitting(true);
    try {
      await fetch("/api/activity-comments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          activityId: selectedActivityId,
          authorId: actorId,
          text,
        }),
      });
      setText("");
      await reload();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-fade">
      <h2 className="page-title">Discussion</h2>
      <p className="page-description">Per-activity comment thread — keep project decisions off WhatsApp and on record. Use @Name to mention a teammate.</p>

      <div className="grid two" style={{ gridTemplateColumns: "1fr 2fr", alignItems: "flex-start" }}>
        {/* Activity picker */}
        <div className="card">
          <h3>Activities</h3>
          <div className="list">
            {activities.map((a) => (
              <button
                key={a.id}
                onClick={() => setSelectedActivityId(a.id)}
                className="item"
                style={{
                  width: "100%",
                  textAlign: "left",
                  cursor: "pointer",
                  background: selectedActivityId === a.id ? "var(--brand-yellow-tint, rgba(245,184,31,0.1))" : undefined,
                  border: selectedActivityId === a.id ? "1px solid var(--brand-yellow)" : undefined,
                }}
              >
                <b style={{ fontSize: "var(--text-sm)" }}>{a.name}</b>
                <div className="muted" style={{ fontSize: "var(--text-xs)" }}>
                  {(() => {
                    const n = data.activityComments.filter((c) => c.activityId === a.id).length;
                    return `${n} comment${n === 1 ? "" : "s"}`;
                  })()}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Thread */}
        <div className="card">
          <h3>
            <span style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
              <MessageSquare size={16} />
              {activities.find((a) => a.id === selectedActivityId)?.name || "Select an activity"}
            </span>
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)", marginBottom: "var(--sp-4)", maxHeight: "420px", overflowY: "auto" }}>
            {comments.length === 0 ? (
              <div className="empty-state" style={{ padding: "30px 0" }}>
                <MessageSquare size={28} style={{ opacity: 0.4 }} />
                <p className="muted" style={{ fontSize: "var(--text-sm)", marginTop: "var(--sp-2)" }}>No comments yet on this activity.</p>
              </div>
            ) : (
              comments.map((c) => (
                <div key={c.id} style={{ padding: "10px 12px", background: "var(--bg)", border: "1px solid var(--line-light)", borderRadius: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span style={{ fontWeight: 700, fontSize: "var(--text-xs)" }}>{getUserName(c.authorId)}</span>
                    <span className="muted" style={{ fontSize: "10px" }}>{new Date(c.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <p style={{ fontSize: "var(--text-sm)", margin: 0, whiteSpace: "pre-wrap" }}>{c.text}</p>
                  {c.mentions.length > 0 && (
                    <div style={{ marginTop: "6px", display: "flex", gap: "4px", flexWrap: "wrap" }}>
                      {c.mentions.map((uid) => (
                        <span key={uid} className="badge" style={{ fontSize: "9px" }}>@{getUserName(uid)}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <form onSubmit={submit} style={{ display: "flex", gap: "var(--sp-2)" }}>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Add a comment… use @Name to mention someone"
              disabled={!selectedActivityId}
              style={{ flex: 1 }}
            />
            <button className="btn-primary" type="submit" disabled={!text.trim() || !selectedActivityId || submitting}>
              <Send size={14} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
