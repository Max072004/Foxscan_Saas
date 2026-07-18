"use client";

import { LayoutDashboard, GitBranch, FileText, BarChart3, MoreHorizontal } from "lucide-react";
import type { Tab } from "./Sidebar";

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const items: { tab: Tab; label: string; icon: React.ElementType }[] = [
  { tab: "Overview", label: "Home", icon: LayoutDashboard },
  { tab: "Workflow", label: "Workflow", icon: GitBranch },
  { tab: "Documents", label: "Docs", icon: FileText },
  { tab: "Reports", label: "Reports", icon: BarChart3 },
  { tab: "Admin", label: "More", icon: MoreHorizontal },
];

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav className="bottom-nav">
      {items.map((item) => (
        <button
          key={item.tab}
          className={`bottom-nav-item${activeTab === item.tab ? " active" : ""}`}
          onClick={() => onTabChange(item.tab)}
        >
          <item.icon />
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
