import { useEffect, useState } from "react";
import { apiHealth } from "../utils/api.js";
import Icon from "./Icon.jsx";

const LINKS = [
  ["home", "dashboard", "Dashboard"],
  ["item", "search", "Item Master"],
  ["master", "layers", "BOM Master"],
  ["compare", "compare", "Compare BOM"],
  ["sap", "download", "SAP BOM Generator"],
  ["assistant", "sparkles", "AI Assistant"],
  ["reports", "barchart", "Reports"],
  ["settings", "settings", "Settings"],
];

export default function Sidebar({ view, setView }) {
  const [backendOnline, setBackendOnline] = useState(null);

  useEffect(() => {
    const check = () => {
      apiHealth().then(setBackendOnline);
    };

    check();
    const interval = setInterval(check, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <aside className="sidebar">
      <div className="sidebar-brand"><span className="mini-mark"><Icon name="bolt" size={14} /></span> BOM MASTER PRO</div>
      <div className="sidebar-label">WORKSPACE</div>
      <nav>
        {LINKS.map(([id, icon, label]) => (
          <button key={id} className={`sidebar-link ${view === id ? "active" : ""}`} onClick={() => setView(id)}>
            <span className="nav-icon"><Icon name={icon} size={17} /></span><span>{label}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar-spacer" />
      <div className="storage-card">
        <div className="storage-title"><span><Icon name="cloud" size={13} /></span> Storage Status</div>
        <div className="storage-row"><span>Local Workspace</span><b>{backendOnline ? "Ready" : "Unavailable"}</b></div>
        <div className="storage-bar"><span style={{ background: backendOnline ? undefined : "#dc2626" }} /></div>
        <button onClick={() => setView("settings")}>Manage Storage <Icon name="arrowRight" size={11} /></button>
      </div>
      <div className="sidebar-footer">
        <span className="dot pulse-dot" style={{ background: backendOnline ? "#22c55e" : "#dc2626" }} />
        {backendOnline === null ? "Checking..." : backendOnline ? "Online" : "Offline"}
        <small>v2.0.0</small>
      </div>
    </aside>
  );
}