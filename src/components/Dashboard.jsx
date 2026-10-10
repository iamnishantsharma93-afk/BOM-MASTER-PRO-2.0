import {
  getActivity,
  formatTimeAgo,
  getCounter,
  getLastMasterBom,
  getLastComparison,
} from "../utils/activityLog.js";
import Icon from "./Icon.jsx";
import EmptyState from "./EmptyState.jsx";

// Maps activity-log glyphs (stored historically) to SVG icons.
const ACTIVITY_ICONS = {
  "▦": "layers",
  "⌘": "compare",
  "⚙": "settings",
  "🗑": "trash",
};

export default function Dashboard({ setView, userName, backendOnline, totalBomFiles }) {
  const actions = [
    ["item", "search", "Item Master", "Search item details across all BOMs", "Go to Item Master"],
    ["master", "layers", "BOM Master", "Create & manage master BOM files", "Go to BOM Master"],
    ["compare", "compare", "Compare BOM", "Compare different BOM versions", "Go to Compare BOM"],
    ["sap", "download", "SAP BOM Generator", "Generate SAP-ready BOMs", "Go to SAP Generator"],
    ["assistant", "sparkles", "AI Assistant", "Ask, search, analyze BOMs with AI", "Open AI Assistant"],
  ];

  const activity = getActivity();
  const lastMasterBom = getLastMasterBom();
  const lastComparison = getLastComparison();
  const sapExports = getCounter("bmp_counter_sap_exports");

  return (
    <div className="dashboard-page">
      <div className="welcome-card">
        <div>
          <div className="eyebrow">BOM MANAGEMENT WORKSPACE</div>
          <h1>Welcome Back, {userName || "User"}! <span>👋</span></h1>
          <p>Your BOM management assistant is ready. Choose a workflow to get started.</p>
        </div>
        <div className="welcome-ai"><span><Icon name="sparkles" size={25} /></span><div><b>AI Assistant</b><small><i className="pulse-dot" style={{ background: backendOnline ? "#22c55e" : "#dc2626" }} /> {backendOnline === null ? "Checking..." : backendOnline ? "Online" : "Offline"}</small></div></div>
      </div>

      <div className="section-title"><div><h2>Quick Actions</h2><p>Everything you need for your daily BOM workflow.</p></div><span>5 tools</span></div>
      <div className="action-grid">
        {actions.map(([view, icon, title, desc, cta]) => (
          <button key={view} className={`action-card action-${view}`} onClick={() => setView(view)}>
            <span className="action-icon"><Icon name={icon} size={19} /></span><span className="action-title">{title}</span><span className="action-desc">{desc}</span><span className="action-cta">{cta} <Icon name="arrowRight" size={11} /></span>
          </button>
        ))}
      </div>

      {(lastMasterBom || lastComparison) && (
        <div className="recent-strip">
          {lastMasterBom && (
            <button className="recent-card" onClick={() => setView("master")}>
              <small>LAST MASTER BOM</small>
              <b>{lastMasterBom.parts} parts · {lastMasterBom.boms} BOMs</b>
              <span>Built {formatTimeAgo(lastMasterBom.time)}</span>
            </button>
          )}

          {lastComparison && (
            <button className="recent-card" onClick={() => setView("compare")}>
              <small>LAST COMPARISON</small>
              <b>{lastComparison.total} parts · {lastComparison.changed} changed</b>
              <span>Done {formatTimeAgo(lastComparison.time)}</span>
            </button>
          )}
        </div>
      )}

      <div className="dashboard-grid">
        <section className="panel activity-panel">
          <div className="panel-head"><div><h2>Recent Activity</h2><p>Your latest BOM operations</p></div></div>
          <div className="activity-list">
            {activity.length === 0 ? (
              <EmptyState compact icon="inbox" title="No activity yet" desc="Your BOM operations will show up here." />
            ) : (
              activity.map((a, i) => (
                <div className="activity-row" key={i}>
                  <span className="activity-icon"><Icon name={ACTIVITY_ICONS[a.icon] || "activity"} size={15} /></span>
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
            <div><small>SAP Exports</small><strong>{sapExports}</strong><span>↗ This workspace</span></div>
            <div><small>AI Queries</small><strong>{getCounter("bmp_counter_ai_queries")}</strong><span>Assistant usage</span></div>
          </div>
        </section>
      </div>

    </div>
  );
}