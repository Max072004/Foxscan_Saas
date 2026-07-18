import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FOXSCAN — Project Management Platform",
  description: "Workflow-first project management for residential societies. Enterprise-grade inspection, approval tracking, and payment management.",
  keywords: ["project management", "construction", "inspection", "painting", "waterproofing", "SaaS"],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
