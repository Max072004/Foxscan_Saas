"use client";

import { useState } from "react";
import type { AppData } from "@/lib/domain";
import { Search, FileText, FileImage, FileSpreadsheet, File, Eye, Tag, History, Grid, List } from "lucide-react";

interface DocumentsProps {
  data: AppData;
  token: string;
  projectId: string;
}

const DOC_ICONS: Record<string, { icon: React.ElementType; cssClass: string; color: string; bg: string }> = {
  CONTRACT: { icon: FileText, cssClass: "contract", color: "#3B82F6", bg: "rgba(59, 130, 246, 0.08)" },
  BOQ: { icon: FileSpreadsheet, cssClass: "contract", color: "#8B5CF6", bg: "rgba(139, 92, 246, 0.08)" },
  INVOICE: { icon: FileSpreadsheet, cssClass: "invoice", color: "#10B981", bg: "rgba(16, 185, 129, 0.08)" },
  PHOTO: { icon: FileImage, cssClass: "photo", color: "#F59E0B", bg: "rgba(245, 158, 11, 0.08)" },
  VIDEO: { icon: FileImage, cssClass: "photo", color: "#EC4899", bg: "rgba(236, 72, 153, 0.08)" },
  DRAWING: { icon: FileText, cssClass: "contract", color: "#6366F1", bg: "rgba(99, 102, 241, 0.08)" },
  REPORT: { icon: FileText, cssClass: "report", color: "#EF4444", bg: "rgba(239, 68, 68, 0.08)" },
  OTHER: { icon: File, cssClass: "other", color: "#64748B", bg: "rgba(100, 116, 139, 0.08)" },
};

export default function Documents({ data, token, projectId }: DocumentsProps) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[]>(data.documents);
  const [view, setView] = useState<"grid" | "table">("grid");

  const search = async () => {
    const r = await fetch(
      `/api/documents?projectId=${projectId}&q=${encodeURIComponent(q)}`,
      { headers: { authorization: `Bearer ${token}` } }
    );
    if (r.ok) setResults(await r.json());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") search();
  };

  // Group by type
  const grouped = results.reduce((acc, d) => {
    if (!acc[d.type]) acc[d.type] = [];
    acc[d.type].push(d);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="animate-fade" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div>
        <h2 className="page-title">Workspace Directory</h2>
        <p className="page-description" style={{ marginBottom: 0 }}>Secure file vaults, contracts, technical specifications, and historical records</p>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: "14px" }}>
        <div style={{ display: "flex", gap: "12px", width: "100%", flexWrap: "wrap", alignItems: "center" }}>
          <div style={{
            flex: 1,
            minWidth: "240px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            background: "var(--bg)",
            border: "1px solid var(--line)",
            borderRadius: "6px",
            padding: "0 12px",
            height: "38px"
          }}>
            <Search size={15} style={{ color: "var(--muted)", flexShrink: 0 }} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Filter vault files by title, format, tag..."
              style={{
                border: "none",
                background: "none",
                outline: "none",
                width: "100%",
                fontSize: "13px",
                color: "var(--ink)",
              }}
            />
          </div>
          <button className="btn-primary" onClick={search} disabled={!token} style={{ height: "38px", padding: "0 16px" }}>
            Query Server
          </button>
          
          {/* View Toggles */}
          <div style={{ display: "flex", border: "1px solid var(--line)", borderRadius: "6px", overflow: "hidden", height: "38px" }}>
            <button
              onClick={() => setView("grid")}
              style={{
                borderRadius: 0,
                padding: "0 12px",
                border: "none",
                background: view === "grid" ? "var(--brand-yellow)" : "transparent",
                color: view === "grid" ? "var(--brand-charcoal)" : "var(--muted)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.15s ease"
              }}
              title="Grid Layout"
            >
              <Grid size={15} />
            </button>
            <button
              onClick={() => setView("table")}
              style={{
                borderRadius: 0,
                padding: "0 12px",
                border: "none",
                background: view === "table" ? "var(--brand-yellow)" : "transparent",
                color: view === "table" ? "var(--brand-charcoal)" : "var(--muted)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.15s ease"
              }}
              title="List Layout"
            >
              <List size={15} />
            </button>
          </div>
        </div>
      </div>

      {results.length > 0 ? (
        view === "grid" ? (
          /* Premium grid layout */
          Object.entries(grouped).map(([type, docs]) => (
            <div key={type} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div className="row" style={{ paddingBottom: "4px", borderBottom: "1px solid var(--line-light)" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "var(--muted)" }}>
                  {type} CATEGORY
                </span>
                <span className="badge" style={{ padding: "2px 8px", fontSize: "10px" }}>{(docs as any[]).length} Files</span>
              </div>
              
              <div className="doc-grid">
                {(docs as any[]).map((d: any) => {
                  const config = DOC_ICONS[d.type] || DOC_ICONS.OTHER;
                  const DocIcon = config.icon;
                  return (
                    <div className="doc-card" key={d.id} style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                      padding: "16px",
                      borderRadius: "8px",
                      border: "1px solid var(--line)",
                      background: "var(--bg-card)",
                      transition: "all 0.2s ease"
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "6px",
                          background: config.bg,
                          color: config.color,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center"
                        }}>
                          <DocIcon size={18} />
                        </div>
                        <span className="badge" style={{ fontSize: "10px", padding: "1px 6px" }}>v{d.version}</span>
                      </div>
                      
                      <div style={{ flex: 1 }}>
                        <div className="doc-name" style={{
                          fontSize: "13px",
                          fontWeight: 600,
                          lineHeight: "1.4",
                          marginBottom: "4px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap"
                        }}>
                          {d.name}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", color: "var(--muted)" }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "3px" }}>
                            <History size={10} />
                            Revision
                          </span>
                          <span>•</span>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "3px" }}>
                            <Eye size={10} />
                            {d.visibility.join(", ")}
                          </span>
                        </div>
                      </div>
                      
                      {d.tags && d.tags.length > 0 && (
                        <div className="doc-tags" style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "4px" }}>
                          {d.tags.map((t: string) => (
                            <span className="doc-tag" key={t} style={{
                              fontSize: "9px",
                              padding: "1px 6px",
                              borderRadius: "4px",
                              background: "var(--bg)",
                              color: "var(--muted)",
                              border: "1px solid var(--line-light)"
                            }}>{t}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        ) : (
          /* Table View */
          <div className="card" style={{ overflow: "hidden", padding: 0 }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ minWidth: "600px" }}>
                <thead>
                  <tr>
                    <th>Document Name</th>
                    <th>Category</th>
                    <th>Latest Version</th>
                    <th>Tags</th>
                    <th>Visibility Scope</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((d) => {
                    const config = DOC_ICONS[d.type] || DOC_ICONS.OTHER;
                    const DocIcon = config.icon;
                    return (
                      <tr key={d.id}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <div style={{
                              width: "28px",
                              height: "28px",
                              borderRadius: "4px",
                              background: config.bg,
                              color: config.color,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0
                            }}>
                              <DocIcon size={14} />
                            </div>
                            <span style={{ fontWeight: 600, fontSize: "13px" }}>{d.name}</span>
                          </div>
                        </td>
                        <td><span className="badge" style={{ fontSize: "10px", padding: "1px 6px" }}>{d.type}</span></td>
                        <td style={{ fontWeight: 600, fontSize: "13px" }}>v{d.version}</td>
                        <td>
                          <div className="doc-tags" style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                            {d.tags?.map((t: string) => (
                              <span className="doc-tag" key={t} style={{
                                fontSize: "9px",
                                padding: "1px 6px",
                                borderRadius: "4px",
                                background: "var(--bg)",
                                color: "var(--muted)",
                                border: "1px solid var(--line-light)"
                              }}>{t}</span>
                            ))}
                          </div>
                        </td>
                        <td className="muted" style={{ fontSize: "12px" }}>{d.visibility.join(", ")}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        <div className="card" style={{ padding: "40px 0" }}>
          <div className="empty-state">
            <FileText size={36} style={{ color: "var(--muted)", opacity: 0.5 }} />
            <p style={{ fontSize: "12px", marginTop: "8px" }}>No document vault files matched your query.</p>
          </div>
        </div>
      )}
    </div>
  );
}
