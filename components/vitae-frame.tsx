/* eslint-disable @next/next/no-html-link-for-pages */

type VitaeFrameProps = {
  active: "overview" | "learn" | "library";
  title: string;
  subtitle: string;
  children: React.ReactNode;
};

const navItems = [
  { id: "overview", href: "/", icon: "⌂", label: "Overview" },
  { id: "learn", href: "/learn", icon: "◎", label: "Learn" },
  { id: "recall", href: "/learn/cardiovascular/cardiac-cycle#recall", icon: "↻", label: "Recall", badge: "5" },
  { id: "planner", href: "/#schedule", icon: "□", label: "Planner" },
  { id: "library", href: "/library", icon: "▤", label: "Library" },
];

export function VitaeFrame({ active, title, subtitle, children }: VitaeFrameProps) {
  return (
    <div className="site-shell">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <aside className="sidebar" aria-label="Primary navigation">
        <a className="brand" href="/" aria-label="Vitae home">
          <span className="brand-mark" aria-hidden="true"><i /><b>V</b></span>
          <span><strong>vitae</strong><small>medical study</small></span>
        </a>
        <nav className="side-nav">
          {navItems.map((item) => (
            <a className={active === item.id ? "active" : ""} href={item.href} key={item.id}>
              <span aria-hidden="true">{item.icon}</span>{item.label}{item.badge ? <b>{item.badge}</b> : null}
            </a>
          ))}
        </nav>
        <div className="semester-card">
          <span>Current semester</span><strong>Semester 7</strong>
          <div><i style={{ width: "62%" }} /><b>62%</b></div>
          <small>3 clinical blocks mapped</small>
        </div>
        <div className="sidebar-footer">
          <span className="avatar">AK</span>
          <span><strong>Aanya Kapoor</strong><small>Medical student</small></span>
          <a href="/" aria-label="Return to dashboard">←</a>
        </div>
      </aside>
      <main id="main-content" className="main" tabIndex={-1}>
        <header className="topbar">
          <div className="mobile-brand"><span className="brand-mark" aria-hidden="true"><i /><b>V</b></span><strong>vitae</strong></div>
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
