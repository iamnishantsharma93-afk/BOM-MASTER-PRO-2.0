import { getActivity, formatTimeAgo, getCounter } from "../utils/activityLog.js";

export default function Dashboard({ setView, userName, backendOnline, totalBomFiles }) {
  const actions = [
    ["item", "◉", "Item Master", "Search item details across all BOMs", "Go to Item Master"],
    ["master", "▦", "BOM Master", "Create & manage master BOM files", "Go to BOM Master"],
    ["compare", "⌘", "Compare BOM", "Compare different BOM versions", "Go to Compare BOM"],
    ["sap", "▣", "SAP BOM Generator", "Generate SAP-ready BOMs", "Go to SAP Generator"],
    ["assistant", "✦", "AI Assistant", "Ask, search, analyze BOMs with AI", "Open AI Assistant"],
  ];

  const activity = getActivity();

  return (
    <div className="dashboard-page">
      <div className="welcome-card">
        <div>
          <div className="eyebrow">BOM MANAGEMENT WORKSPACE</div>
          <h1>Welcome Back, {userName || "User"}! <span>👋</span></h1>
          <p>Your BOM management assistant is ready. Choose a workflow to get started.</p>
        </div>
        <div className="welcome-ai"><span>✦</span><div><b>AI Assistant</b><small><i style={{background: backendOnline ? "#22c55e" : "#dc2626"}} /> {backendOnline === null ? "Checking..." : backendOnline ? "Online" : "Offline"}</small></div></div>
      </div>

      <div className="section-title"><div><h2>Quick Actions</h2><p>Everything you need for your daily BOM workflow.</p></div><span>5 tools</span></div>
      <div className="action-grid">
        {actions.map(([view, icon, title, desc, cta]) => (
          <button key={view} className={`action-card action-${view}`} onClick={() => setView(view)}>
            <span className="action-icon">{icon}</span><span className="action-title">{title}</span><span className="action-desc">{desc}</span><span className="action-cta">{cta} →</span>
          </button>
        ))}
      </div>

      <div className="dashboard-grid">
        <section className="panel activity-panel">
          <div className="panel-head"><div><h2>Recent Activity</h2><p>Your latest BOM operations</p></div></div>
          <div className="activity-list">
            {activity.length === 0 ? (
              <p className="hint">No activity yet.</p>
            ) : (
              activity.map((a, i) => (
                <div className="activity-row" key={i}>
                  <span className="activity-icon">{a.icon}</span>
                  <div><b>{a.title}</b><small>{a.detail}</small></div>
                  <time>{formatTimeAgo(a.time)}</time>
                </div>
              ))
            )}
          </div>
        </section>
        <section className="panel stats-panel">
          <div className="panel-head"><div><h2>Quick Stats</h2><p>Workspace overview</p></div></div>
          <div className="metric-grid">
            <div><small>Total BOM Files</small><strong>{totalBomFiles ?? 0}</strong><span>↗ Active library</span></div>
            <div><small>Comparisons Done</small><strong>{getCounter("bmp_counter_comparisons")}</strong><span>↗ This workspace</span></div>
            <div><small>SAP Exports</small><strong>8</strong><span>Ready to export</span></div>
            <div><small>AI Queries</small><strong>{getCounter("bmp_counter_ai_queries")}</strong><span>Assistant usage</span></div>
          </div>
        </section>
      </div>

    </div>
  );
}