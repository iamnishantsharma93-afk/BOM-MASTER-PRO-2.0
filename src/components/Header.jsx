import { useState } from "react";

export default function Header({ userName, isAdmin, onAdminToggle }) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [password, setPassword] = useState("");
  const [needsSetup, setNeedsSetup] = useState(false);
  const [mode, setMode] = useState("verify");
  const [errorMsg, setErrorMsg] = useState("");

  const openPrompt = async () => {
    if (isAdmin) {
      onAdminToggle(false);
      return;
    }

    const hasPassword = await window.electronAPI.adminHasPassword();
    setNeedsSetup(!hasPassword);
    setMode(hasPassword ? "verify" : "setup");
    setPassword("");
    setErrorMsg("");
    setShowPrompt(true);
  };

  const submitPassword = async () => {
    if (!password.trim()) return;

    if (mode === "setup") {
      await window.electronAPI.adminSetPassword(password);
      onAdminToggle(true);
      setShowPrompt(false);
      return;
    }

    if (mode === "verify") {
      const result = await window.electronAPI.adminVerifyPassword(password);

      if (result.ok) {
        onAdminToggle(true);
        setShowPrompt(false);
      } else {
        setErrorMsg("Incorrect password.");
      }
      return;
    }

    if (mode === "reset") {
      const result = await window.electronAPI.adminVerifyPassword(password);

      if (result.ok) {
        setMode("setup");
        setPassword("");
        setErrorMsg("");
      } else {
        setErrorMsg("Incorrect master password.");
      }
    }
  };

  const titles = {
    verify: "Enter Admin Password",
    setup: "Set Admin Password",
    reset: "Enter Master Password to Reset",
  };

  return (
    <header className="topbar">
      <div className="brand-block">
        <div className="brand-mark" aria-hidden="true">◆</div>
        <div>
          <div className="brand">BOM MASTER <span>PRO</span></div>
          <div className="tag">Professional BOM Management <i>•</i> AI Powered <i>•</i> Smarter <i>•</i> Faster <i>•</i> Better</div>
        </div>
      </div>
      <div className="topbar-right">
        <div className="top-icon">⌁</div>
        <div
          className="profile"
          onClick={openPrompt}
          style={{ cursor: "pointer" }}
        >
          <b>{userName ? userName.slice(0,2).toUpperCase() : "?"}</b>
          <span>{userName || "User"}{isAdmin ? " (Admin)" : ""}</span>
          <small>⌄</small>
        </div>
      </div>

      {showPrompt && (
        <div
          className="master-bom-modal-overlay"
          onClick={() => setShowPrompt(false)}
        >
          <div
            className="master-bom-modal"
            style={{ maxWidth: 340 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0 }}>{titles[mode]}</h3>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitPassword()}
              placeholder={mode === "reset" ? "Master Admin Password" : "Password"}
              autoFocus
              style={{ width: "100%", padding: 10, marginBottom: 8 }}
            />

            {errorMsg && (
              <p style={{ color: "#dc2626", fontSize: 12, margin: "0 0 10px" }}>
                {errorMsg}
              </p>
            )}

            <div className="actions" style={{ margin: 0 }}>
              <button className="primary" onClick={submitPassword}>
                {mode === "setup" ? "Set & Unlock" : mode === "reset" ? "Verify" : "Unlock"}
              </button>
              <button className="clear" onClick={() => setShowPrompt(false)}>
                Cancel
              </button>
            </div>

            {mode === "verify" && (
              <p
                style={{ fontSize: 11, color: "#1267d7", cursor: "pointer", marginTop: 12 }}
                onClick={() => {
                  setMode("reset");
                  setPassword("");
                  setErrorMsg("");
                }}
              >
                Forgot Password?
              </p>
            )}
          </div>
        </div>
      )}
    </header>
  );
}