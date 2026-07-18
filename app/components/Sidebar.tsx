"use client";

import {
  LayoutDashboard,
  FolderKanban,
  GitBranch,
  CalendarRange,
  CreditCard,
  HardHat,
  FileText,
  BarChart3,
  Shield,
  ChevronDown,
  PanelLeftClose,
} from "lucide-react";

export type Tab =
  | "Overview"
  | "Workflow"
  | "Timeline"
  | "Payments"
  | "Site updates"
  | "Setup"
  | "Documents"
  | "Reports"
  | "Admin";

const navItems: { tab: Tab; label: string; icon: React.ElementType; section?: string }[] = [
  { tab: "Overview", label: "Dashboard", icon: LayoutDashboard, section: "Main" },
  { tab: "Setup", label: "Projects", icon: FolderKanban },
  { tab: "Workflow", label: "Workflow", icon: GitBranch, section: "Operations" },
  { tab: "Timeline", label: "Timeline", icon: CalendarRange },
  { tab: "Payments", label: "Payments", icon: CreditCard },
  { tab: "Site updates", label: "Site Updates", icon: HardHat },
  { tab: "Documents", label: "Documents", icon: FileText, section: "Intelligence" },
  { tab: "Reports", label: "Reports", icon: BarChart3 },
  { tab: "Admin", label: "Admin", icon: Shield, section: "System" },
];

/* FOXSCAN premium brand mark (yellow circle, dark charcoal house, integrated yellow typography) */
function FoxscanLogo({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="48" fill="#F5B81F" />
      <path d="M25 48 L50 28 L75 48 V72 H25 Z" fill="#1F232B" />
      <text x="27" y="65" fill="#F5B81F" fontFamily="Inter, sans-serif" fontWeight="900" fontSize="11" letterSpacing="0.3">FOXSCAN</text>
    </svg>
  );
}

interface SidebarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  projectName: string;
  projectStatus: string;
  userName: string;
  userRole: string;
  pendingCount: number;
  isOpen: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export default function Sidebar({
  activeTab,
  onTabChange,
  projectName,
  projectStatus,
  userName,
  userRole,
  pendingCount,
  isOpen,
  onClose,
  collapsed,
  onToggleCollapse,
}: SidebarProps) {
  const handleNav = (tab: Tab) => {
    onTabChange(tab);
    onClose();
  };

  return (
    <>
      <div className={`sidebar-overlay${isOpen ? " visible" : ""}`} onClick={onClose} />
      <aside className={`sidebar${isOpen ? " open" : ""}${collapsed ? " collapsed" : ""}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <FoxscanLogo size={28} />
          </div>
          <span className="sidebar-logo-text">
            FOX<b>SCAN</b>
          </span>
          <button
            className="sidebar-collapse-btn"
            onClick={onToggleCollapse}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand" : "Collapse"}
          >
            <PanelLeftClose />
          </button>
        </div>

        {/* Project Switcher */}
        <div className="sidebar-project-switcher">
          <span
            className="project-dot"
            style={{ background: projectStatus === "ACTIVE" ? "var(--success)" : "var(--warning)" }}
          />
          <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>{projectName}</span>
          <ChevronDown size={12} style={{ opacity: 0.5, flexShrink: 0 }} />
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <div key={item.tab}>
              {item.section && (
                <div className="sidebar-section-label">{item.section}</div>
              )}
              <button
                className={`sidebar-item${activeTab === item.tab ? " active" : ""}`}
                onClick={() => handleNav(item.tab)}
                title={collapsed ? item.label : undefined}
              >
                <item.icon size={16} />
                <span>{item.label}</span>
                {item.tab === "Workflow" && pendingCount > 0 && (
                  <span className="sidebar-item-badge">{pendingCount}</span>
                )}
              </button>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{userName}</div>
              <div className="sidebar-user-role">{userRole}</div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

export { FoxscanLogo };
