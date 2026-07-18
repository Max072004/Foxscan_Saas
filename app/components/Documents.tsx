"use client";

import { useState } from "react";
import type { AppData } from "@/lib/domain";
import { Search, FileText, FileImage, FileSpreadsheet, File, Eye, Tag, History } from "lucide-react";

interface DocumentsProps {
  data: AppData;
  token: string;
  projectId: string;
}

const DOC_ICONS: Record<string, { icon: React.ElementType; cssClass: string }> = {
  CONTRACT: { icon: FileText, cssClass: "contract" },
  BOQ: { icon: FileSpreadsheet, cssClass: "contract" },
  INVOICE: { icon: FileSpreadsheet, cssClass: "invoice" },
  PHOTO: { icon: FileImage, cssClass: "photo" },
  VIDEO: { icon: FileImage, cssClass: "photo" },
  DRAWING: { icon: FileText, cssClass: "contract" },
  REPORT: { icon: FileText, cssClass: "report" },
  OTHER: { icon: File, cssClass: "other" },
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
    <div className="animate-fade">
      <h2 className="page-title">Documents</h2>
      <p className="page-description">Project files, contracts, drawings, and document versions</p>

      {/* Search Bar */}
      <div className="card" style={{ marginBottom: "var(--sp-4)" }}>
        <div className="row">
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "var(--sp-2)", background: "var(--bg)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "var(--sp-2) var(--sp-3)" }}>
            <Search size={16} style={{ color: "var(--muted)", flexShrink: 0 }} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search files by name, type, or tags..."
              style={{ border: "none", background: "none", outline: "none", flex: 1, fontSize: "var(--text-sm)" }}
            />
          </div>
          <button className="btn-primary" onClick={search} disabled={!token}>
            Search
          </button>
          <div style={{ display: "flex", border: "1px solid var(--line)", borderRadius: "var(--radius)", overflow: "hidden" }}>
            <button
              className={view === "grid" ? "btn-primary" : "btn-ghost"}
              onClick={() => setView("grid")}
              style={{ borderRadius: 0, padding: "var(--sp-2)" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
              </svg>
            </button>
            <button
              className={view === "table" ? "btn-primary" : "btn-ghost"}
              onClick={() => setView("table")}
              style={{ borderRadius: 0, padding: "var(--sp-2)" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {results.length > 0 ? (
        view === "grid" ? (
          /* Card Grid View */
          Object.entries(grouped).map(([type, docs]) => (
            <div key={type} style={{ marginBottom: "var(--sp-6)" }}>
              <div className="row" style={{ marginBottom: "var(--sp-3)" }}>
                <h3 style={{ margin: 0, fontSize: "var(--text-sm)", textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--muted)" }}>
                  {type}
                </h3>
                <span className="badge">{(docs as any[]).length}</span>
              </div>
              <div className="doc-grid">
                {(docs as any[]).map((d: any) => {
                  const config = DOC_ICONS[d.type] || DOC_ICONS.OTHER;
                  const DocIcon = config.icon;
                  return (
                    <div className="doc-card" key={d.id}>
                      <div className={`doc-icon ${config.cssClass}`}>
                        <DocIcon />
                      </div>
                      <div className="doc-name">{d.name}</div>
                      <div className="doc-meta">
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <History size={11} />
                          v{d.version}
                        </span>
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <Eye size={11} />
                          {d.visibility.join(", ")}
                        </span>
                      </div>
                      {d.tags && d.tags.length > 0 && (
                        <div className="doc-tags">
                          {d.tags.map((t: string) => (
                            <span className="doc-tag" key={t}>{t}</span>
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
          <div className="card">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Version</th>
                  <th>Tags</th>
                  <th>Access</th>
                </tr>
              </thead>
              <tbody>
                {results.map((d) => {
                  const config = DOC_ICONS[d.type] || DOC_ICONS.OTHER;
                  const DocIcon = config.icon;
                  return (
                    <tr key={d.id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
                          <DocIcon size={16} style={{ color: "var(--muted)" }} />
                          {d.name}
                        </div>
                      </td>
                      <td><span className="badge">{d.type}</span></td>
                      <td>v{d.version}</td>
                      <td>
                        <div className="doc-tags">
                          {d.tags?.map((t: string) => (
                            <span className="doc-tag" key={t}>{t}</span>
                          ))}
                        </div>
                      </td>
                      <td className="muted">{d.visibility.join(", ")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <div className="card">
          <div className="empty-state">
            <FileText />
            <p>No accessible documents found. Upload documents through the API to see them here.</p>
          </div>
        </div>
      )}
    </div>
  );
}
