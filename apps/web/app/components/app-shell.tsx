"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { GlobalSearch } from "./global-search";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: "01" },
  { label: "Brand Memory", href: "/brands", icon: "02" },
  { label: "Content Studio", href: "/content", icon: "03" },
  { label: "Trend Engine", href: "/trends", icon: "04" },
  { label: "Content Planner", href: "/planner", icon: "05" },
  { label: "Calendar", href: "/calendar", icon: "06" },
  { label: "Templates", href: "/templates", icon: "06b" },
  { label: "Image Gen", href: "/images", icon: "07" },
  { label: "Video AI", href: "/video", icon: "08" },
  { label: "Music AI", href: "/music", icon: "09" },
  { label: "Ads Engine", href: "/ads", icon: "10" },
  { label: "Campaigns", href: "/campaigns", icon: "10b" },
  { label: "Agent Swarm", href: "/swarm", icon: "11" },
  { label: "Autopilot", href: "/autopilot", icon: "12" },
  { label: "Learning Loop", href: "/learning", icon: "13" },
  { label: "Fine Tuning", href: "/finetune", icon: "14" },
  { label: "MLOps", href: "/mlops", icon: "15" },
  { label: "Enterprise", href: "/enterprise", icon: "16" },
  { label: "Face Swap", href: "/face-swap", icon: "19" },
  { label: "Face Enhancement", href: "/face-enhancement", icon: "19b" },
  { label: "Video Projects", href: "/video-projects", icon: "20" },
  { label: "Video Face Swap", href: "/video-face-swap", icon: "21" },
  { label: "Video Render", href: "/video-render", icon: "21b" },
  { label: "Media Library", href: "/media", icon: "18" },
  { label: "News Scraper", href: "/news", icon: "22" },
  { label: "Integrations", href: "/integrations", icon: "23" },
  { label: "Webhooks", href: "/webhooks", icon: "23a" },
  { label: "LLM Models", href: "/models", icon: "23b" },
  { label: "AI Chat", href: "/chat", icon: "23c" },
  { label: "Voiceover", href: "/voiceover", icon: "23d" },
  { label: "Hashtag Research", href: "/hashtag-research", icon: "23e" },
  { label: "Generate Hashtags", href: "/generate-hashtags", icon: "23ee" },
  { label: "Engagement", href: "/engagement", icon: "23ea" },
  { label: "Batch Content", href: "/batch-content", icon: "23eb" },
  { label: "Brand Audit", href: "/audit", icon: "23f" },
  { label: "Documents", href: "/documents", icon: "23ff" },
  { label: "Subtitles", href: "/subtitles", icon: "23g" },
  { label: "Analytics", href: "/analytics", icon: "24" },
  { label: "Settings", href: "/settings", icon: "25" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <h1>AISMOS</h1>
        </div>
        <nav aria-label="Primary navigation" className="sidebar-nav" id="app-sidebar-nav">
          {navItems.map((item) => {
            const isActive = item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);

            return (
              <a
                className={`nav-item ${isActive ? "active" : ""}`}
                href={item.href}
                key={item.href}
                data-href={item.href}
              >
                <span className="icon" aria-hidden="true">{item.icon}</span>
                {item.label}
              </a>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <span>AISMOS v1.0.0</span>
          <span style={{ fontSize: "10px", opacity: 0.5, marginTop: "4px" }}>Cmd+K Search</span>
        </div>
      </aside>
      <main className="main">
        <GlobalSearch />
        {children}
      </main>
    </div>
  );
}
