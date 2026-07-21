"use client";

import { useEffect, useState } from "react";
import type { AppData, Role } from "@/lib/domain";

import Sidebar from "./components/Sidebar";
import type { Tab } from "./components/Sidebar";
import Header from "./components/Header";
import BottomNav from "./components/BottomNav";
import Dashboard from "./components/Dashboard";
import Workflow from "./components/Workflow";
import Timeline from "./components/Timeline";
import Payments from "./components/Payments";
import SiteUpdates from "./components/SiteUpdates";
import Setup from "./components/Setup";
import Documents from "./components/Documents";
import Reports from "./components/Reports";
import Admin from "./components/Admin";
import Delays from "./components/Delays";
import Assurance from "./components/Assurance";
import Discussion from "./components/Discussion";
import Quotations from "./components/Quotations";
import { FoxscanLogo } from "./components/Sidebar";

export default function Home() {
  const [data, setData] = useState<AppData | null>(null);
  const [tab, setTab] = useState<Tab>("Overview");
  const [role, setRole] = useState<Role>("ADMIN");
  const [token, setToken] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const reload = async () => setData(await (await fetch("/api/data")).json());

  useEffect(() => {
    fetch("/api/data")
      .then((r) => r.json())
      .then((d) =>
        d.projects.length
          ? setData(d)
          : fetch("/api/bootstrap", { method: "POST" })
            .then((r) => r.json())
            .then(setData)
      );
  }, []);

  if (!data) {
    return (
      <div className="app-layout">
        <div className="app-main" style={{ marginLeft: 0 }}>
          <div className="app-content">
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: "var(--sp-4)" }}>
              <FoxscanLogo size={56} />
              <div style={{ fontWeight: 700, fontSize: "var(--text-lg)" }}>Loading FOXSCAN…</div>
              <div className="muted">Initializing project data</div>
              <div style={{ display: "flex", gap: "var(--sp-2)", marginTop: "var(--sp-2)" }}>
                {[0, 1, 2].map((i) => (
                  <div key={i} style={{
                    width: 8, height: 8, borderRadius: "var(--radius-full)", background: "var(--brand-yellow)",
                    animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                  }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const project = data.projects[0];
  const activities = data.activities.filter((a) => a.projectId === project.id);
  const stages = data.stages;
  const me = data.users.find((u) => u.role === role)!;
  const pendingCount = stages.filter((s) => !["PAID", "REWORK"].includes(s.state)).length;

  return (
    <div className="app-layout shell">
      <Sidebar
        activeTab={tab}
        onTabChange={setTab}
        projectName={project.name}
        projectStatus={project.status}
        userName={me.name}
        userRole={role}
        pendingCount={pendingCount}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <div className={`app-main${sidebarCollapsed ? " sidebar-collapsed" : ""}`}>
        <Header
          projectName={project.name}
          projectAddress={project.address}
          projectStatus={project.status}
          role={role}
          onRoleChange={setRole}
          token={token}
          onTokenChange={setToken}
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          notificationCount={data.notifications.filter((n) => !n.readAt).length}
          userName={me.name}
        />

        <div className="app-content">
          {tab === "Overview" && (
            <Dashboard data={data} activities={activities} stages={stages} role={role} />
          )}
          {tab === "Workflow" && (
            <Workflow
              data={data}
              activities={activities}
              stages={stages}
              role={role}
              actorId={me.id}
              reload={reload}
            />
          )}
          {tab === "Timeline" && (
            <Timeline activities={activities} token={token} projectId={project.id} reload={reload} />
          )}
          {tab === "Payments" && (
            <Payments data={data} activities={activities} />
          )}
          {tab === "Site updates" && (
            <SiteUpdates
              projectId={project.id}
              actorId={me.id}
              data={data}
              reload={reload}
            />
          )}
          {tab === "Setup" && (
            <Setup project={project} activities={activities} token={token} reload={reload} />
          )}
          {tab === "Documents" && (
            <Documents data={data} token={token} projectId={project.id} />
          )}
          {tab === "Reports" && <Reports token={token} />}
          {tab === "Delays" && (
            <Delays data={data} token={token} projectId={project.id} reload={reload} />
          )}
          {tab === "Assurance" && (
            <Assurance data={data} token={token} projectId={project.id} contractorId={project.contractorId} reload={reload} />
          )}
          {tab === "Discussion" && (
            <Discussion data={data} activities={activities} actorId={me.id} reload={reload} />
          )}
          {tab === "Quotations" && (
            <Quotations data={data} token={token} projectId={project.id} reload={reload} />
          )}
          {tab === "Admin" && <Admin data={data} token={token} />}
        </div>
      </div>

      <BottomNav activeTab={tab} onTabChange={setTab} />
    </div>
  );
}
