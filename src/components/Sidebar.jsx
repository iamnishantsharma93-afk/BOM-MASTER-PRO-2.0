import { useEffect, useState } from "react";

const LINKS = [
  ["home", "⌂", "Dashboard"],
  ["item", "◉", "Item Master"],
  ["master", "▦", "BOM Master"],
  ["compare", "⌘", "Compare BOM"],
  ["sap", "▣", "SAP BOM Generator"],
  ["assistant", "✦", "AI Assistant"],
  ["reports", "◫", "Reports"],
  ["settings", "⚙", "Settings"],
];

export default function Sidebar({ view, setView }) {
  const [backendOnline, setBackendOnline] = useState(null);

  useEffect(() => {
    const check = () => {
      fetch("http://localhost:3000/")
        .then((res) => setBackendOnline(res.ok))
        .catch(() => setBackendOnline(false));
    };

    check();
    const interval = setInterval(check, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <aside className="sidebar">
      <div className="sidebar-brand"><span className="mini-mark">◆</span> BOM MASTER PRO</div>
      <div className="sidebar-label">WORKSPACE</div>
      <nav>
        {LINKS.map(([id, icon, label]) => (
          <button key={id} className={`sidebar-link ${view === id ? "active" : ""}`} onClick={() => setView(id)}>
            <span className="nav-icon">{icon}</span><span>{label}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar-spacer" />
      <div className="storage-card">
        <div className="storage-title"><span>☁</span> Storage Status</div>
        <div className="storage-row"><span>Local Workspace</span><b>{backendOnline ? "Ready" : "Unavailable"}</b></div>
        <div className="storage-bar"><span style={{ background: backendOnline ? undefined : "#dc2626" }} /></div>
        <button onClick={() => setView("settings")}>Manage Storage →</button>
      </div>
      <div className="sidebar-footer">
        <span className="dot" style={{ background: backendOnline ? "#22c55e" : "#dc2626" }} />
        {backendOnline === null ? "Checking..." : backendOnline ? "Online" : "Offline"}
        <small>v2.0.0</small>
      </div>
    </aside>
  );
}