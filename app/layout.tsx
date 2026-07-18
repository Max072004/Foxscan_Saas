import type { Metadata } from "next"; import "./globals.css";
export const metadata: Metadata = { title:"FOXSCAN", description:"Workflow-first project management for residential societies" };
export default function Layout({children}:{children:React.ReactNode}) { return <html lang="en"><body>{children}</body></html>; }
