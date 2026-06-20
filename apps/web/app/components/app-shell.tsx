"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: "01" },
  { label: "Brand Memory", href: "/brands", icon: "02" },
  { label: "Content Studio", href: "/content", icon: "03" },
  { label: "Trend Engine", href: "/trends", icon: "04" },
  { label: "Content Planner", href: "/planner", icon: "05" },
  { label: "Calendar", href: "/calendar", icon: "06" },
  { label: "Image Gen", href: "/images", icon: "07" },
  { label: "Video AI", href: "/video", icon: "08" },
  { label: "Music AI", href: "/music", icon: "09" },
  { label: "Ads Engine", href: "/ads", icon: "10" },
  { label: "Agent Swarm", href: "/swarm", icon: "11" },
  { label: "Autopilot", href: "/autopilot", icon: "12" },
  { label: "Learning Loop", href: "/learning", icon: "13" },
  { label: "Fine Tuning", href: "/finetune", icon: "14" },
  { label: "MLOps", href: "/mlops", icon: "15" },
  { label: "Enterprise", href: "/enterprise", icon: "16" },
  { label: "Integrations", href: "/integrations", icon: "17" },
  { label: "Analytics", href: "/analytics", icon: "18" }
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
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
