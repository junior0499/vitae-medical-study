/* eslint-disable @next/next/no-html-link-for-pages */

import { MasteryMeter } from "@/components/mastery-meter";

type VitaeFrameProps = {
  active: "overview" | "learn" | "path" | "coverage" | "review" | "alignment" | "library" | "assessment" | "mistakes";
  title: string;
  subtitle: string;
  children: React.ReactNode;
};

const navItems: Array<{ id: string; href: string; icon: string; label: string; badge?: string }> = [
  { id: "overview", href: "/", icon: "⌂", label: "Overview" },
  { id: "learn", href: "/learn", icon: "◎", label: "Learn" },
  { id: "path", href: "/learning-graph", icon: "⌘", label: "Study path" },
  { id: "coverage", href: "/coverage", icon: "◫", label: "Coverage" },
  { id: "alignment", href: "/alignment", icon: "⌁", label: "Source map" },
  { id: "review", href: "/review", icon: "↻", label: "Review" },
  { id: "assessment", href: "/assessment", icon: "◇", label: "Assessment" },
  { id: "mistakes", href: "/mistakes", icon: "✎", label: "Mistakes" },
  { id: "planner", href: "/#schedule", icon: "□", label: "Planner" },
  { id: "library", href: "/library", icon: "▤", label: "Library" },
];

export function VitaeFrame({ active, title, subtitle, children }: VitaeFrameProps) {
  return (
    <div className="site-shell">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <aside className="sidebar" aria-label="Primary navigation">
        <a className="brand" href="/" aria-label="Poh-tah-toh home">
          <span className="brand-mark" aria-hidden="true" />
          <span><strong>Poh-tah-toh</strong><small>medical study</small></span>
        </a>
        <nav className="side-nav">
          {navItems.map((item) => (
            <a className={active === item.id ? "active" : ""} href={item.href} key={item.id}>
              <span aria-hidden="true">{item.icon}</span>{item.label}{item.badge ? <b>{item.badge}</b> : null}
            </a>
          ))}
        </nav>
        <MasteryMeter />
        <div className="sidebar-footer">
          <span className="avatar">AK</span>
          <span><strong>Aanya Kapoor</strong><small>Medical student</small></span>
          <a href="/" aria-label="Return to dashboard">←</a>
        </div>
      </aside>
      <main id="main-content" className="main" tabIndex={-1}>
        <header className="topbar">
          <div className="mobile-brand"><span className="brand-mark" aria-hidden="true" /><strong>Poh-tah-toh</strong></div>
          <div className="topbar-copy"><span>{subtitle}</span><strong>{title}</strong></div>
          <div className="topbar-actions">
            <a className="frame-action" href="/library"><span aria-hidden="true">＋</span>Add a source</a>
            <a className="frame-avatar" href="/" aria-label="Open study dashboard">AK</a>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
