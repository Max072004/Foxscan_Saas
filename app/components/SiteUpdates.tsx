"use client";

import { useState } from "react";
import type { AppData } from "@/lib/domain";
import { Send, Cloud, Users, Paperclip, Star } from "lucide-react";

interface SiteUpdatesProps {
  projectId: string;
  actorId: string;
  data: AppData;
  reload: () => Promise<void>;
}

export default function SiteUpdates({ projectId, actorId, data, reload }: SiteUpdatesProps) {
  const [workDone, setWorkDone] = useState("");
  const [selectedActivityId, setSelectedActivityId] = useState("");
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workDone) return;
    setIsUploading(true);

    try {
      let attachmentUrls: string[] = [];

      for (const file of photoFiles) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("projectId", projectId);
        formData.append("activityId", selectedActivityId || "general");
        formData.append("filename", file.name);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        if (!response.ok) throw new Error(`Photo ${file.name} upload failed`);
        const resJson = await response.json();
        if (resJson.url) {
          attachmentUrls.push(resJson.url);
        }
      }

      await fetch("/api/site-updates", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          projectId,
          authorId: actorId,
          workDone,
          activityId: selectedActivityId || undefined,
          weather: "Clear",
          manpower: 0,
          equipment: "",
          important: false,
          attachments: attachmentUrls,
          voiceNote: undefined,
        }),
      });

      setWorkDone("");
      setSelectedActivityId("");
      setPhotoFiles([]);
      reload();
    } catch (err: any) {
      alert("Upload failed: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const updates = data.siteUpdates.filter((s) => s.projectId === projectId);
  const users = data.users;

  return (
    <div className="animate-fade">
      <h2 className="page-title">Site Updates</h2>
      <p className="page-description">Daily site logs, progress notes, and field observations</p>

      <div className="grid two">
        {/* Post Form */}
        <form className="card" onSubmit={submit}>
          <h3>New Site Log</h3>
          <div style={{ marginBottom: "var(--sp-3)" }}>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--muted)", marginBottom: "var(--sp-1)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Link to Activity (Optional)
            </label>
            <select
              value={selectedActivityId}
              onChange={(e) => setSelectedActivityId(e.target.value)}
              style={{
                width: "100%",
                padding: "var(--sp-2)",
                borderRadius: "var(--radius)",
                border: "1px solid var(--line)",
                background: "var(--bg)",
                fontSize: "var(--text-sm)",
                fontFamily: "var(--font)",
                color: "var(--ink)",
                outline: "none"
              }}
            >
              <option value="">General Log / None</option>
              {data.activities.filter(a => a.projectId === projectId).sort((a, b) => a.sequence - b.sequence).map((a) => (
                <option key={a.id} value={a.id}>
                  Stage {a.sequence}: {a.name} ({a.status.replace("_", " ")})
                </option>
              ))}
            </select>
          </div>
          <textarea
            value={workDone}
            onChange={(e) => setWorkDone(e.target.value)}
            placeholder="What work was completed today? Include observations, issues, and progress notes..."
            style={{
              border: "1px solid var(--line)",
              borderRadius: "var(--radius)",
              padding: "var(--sp-3)",
              minHeight: 120,
              resize: "vertical",
              width: "100%",
              fontSize: "var(--text-sm)",
              fontFamily: "var(--font)",
              background: "var(--bg)",
              transition: "border-color var(--transition-fast)",
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "var(--brand-yellow)"; e.currentTarget.style.boxShadow = "0 0 0 3px var(--brand-yellow-light)"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "var(--line)"; e.currentTarget.style.boxShadow = "none"; }}
          />
          
          {/* File input selectors */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "10px" }}>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--muted)", cursor: "pointer", padding: "6px 12px", border: "1px dashed var(--line)", borderRadius: "6px", background: "var(--bg)" }}>
                <Paperclip size={14} />
                <span>{photoFiles.length > 0 ? `${photoFiles.length} Photos Selected` : "Attach Photo(s)"}</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    if (e.target.files) {
                      setPhotoFiles(Array.from(e.target.files));
                    }
                  }}
                  style={{ display: "none" }}
                />
              </label>
              {photoFiles.length > 0 && (
                <button type="button" onClick={() => setPhotoFiles([])} style={{ fontSize: "11px", color: "var(--error)", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>
                  Clear All
                </button>
              )}
            </div>

            {photoFiles.length > 0 && (
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", width: "100%" }}>
                {photoFiles.map((file, idx) => (
                  <div key={idx} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "var(--ink)", background: "var(--bg)", border: "1px solid var(--line)", padding: "4px 8px", borderRadius: "4px" }}>
                    <span>{file.name} ({Math.round(file.size / 1024)} KB)</span>
                    <button type="button" onClick={() => setPhotoFiles(prev => prev.filter((_, i) => i !== idx))} style={{ border: "none", background: "none", color: "var(--error)", cursor: "pointer", fontWeight: "bold", fontSize: "12px", padding: 0 }}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="row" style={{ justifyContent: "space-between", marginTop: "15px" }}>
            <div style={{ display: "flex", gap: "var(--sp-2)" }}>
              <button type="button" className="btn-ghost" style={{ color: "var(--muted)" }} title="Weather">
                <Cloud size={16} />
              </button>
              <button type="button" className="btn-ghost" style={{ color: "var(--muted)" }} title="Mark important">
                <Star size={16} />
              </button>
            </div>
            <button className="btn-primary" type="submit" disabled={isUploading || !workDone.trim()}>
              <Send size={14} />
              {isUploading ? "Uploading & Posting..." : "Post Update"}
            </button>
          </div>
          <small className="muted">
            Camera, geolocation and voice-note fields are fully supported and uploaded to Supabase Storage.
          </small>
        </form>

        {/* Feed */}
        <section>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--sp-3)" }}>
            <h3 style={{ margin: 0 }}>Recent Updates</h3>
            <span className="badge">{updates.length} entries</span>
          </div>
          {updates.length > 0 ? (
            <div className="list">
              {updates.slice().reverse().map((s) => {
                const author = users.find((u) => u.id === s.authorId);
                return (
                  <div className="feed-card" key={s.id}>
                    <div className="feed-header">
                      <div className="feed-avatar">
                        {(author?.name || "U").charAt(0)}
                      </div>
                      <div className="feed-meta">
                        <div className="feed-name">{author?.name || "User"}</div>
                        <div className="feed-time">
                          {new Date(s.date).toLocaleDateString("en-IN", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                      {s.important && (
                        <Star size={14} style={{ color: "var(--brand-yellow)", fill: "var(--brand-yellow)" }} />
                      )}
                    </div>
                    <div className="feed-body">{s.workDone}</div>
                    <div className="feed-tags">
                      {s.activityId && (
                        <span className="feed-tag" style={{ background: "rgba(234, 172, 31, 0.08)", color: "#c68d0e", fontWeight: 700 }}>
                          {data.activities.find(a => a.id === s.activityId)?.name || "Linked Activity"}
                        </span>
                      )}
                      {s.weather && s.weather !== "Clear" && (
                        <span className="feed-tag">
                          <Cloud size={10} style={{ marginRight: 4 }} />
                          {s.weather}
                        </span>
                      )}
                      {s.manpower > 0 && (
                        <span className="feed-tag">
                          <Users size={10} style={{ marginRight: 4 }} />
                          {s.manpower} workers
                        </span>
                      )}
                      {s.attachments && s.attachments.length > 0 && (
                        <span className="feed-tag">
                          <Paperclip size={10} style={{ marginRight: 4 }} />
                          {s.attachments.length} files
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="card">
              <div className="empty-state">
                <Send />
                <p>No site updates posted yet. Use the form to log your first daily report.</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
