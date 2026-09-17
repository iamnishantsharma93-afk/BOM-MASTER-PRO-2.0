export default function Settings({
  darkMode,
  setDarkMode,
  autoSizeColumns,
  setAutoSizeColumns,
  freezeHeader,
  setFreezeHeader,
  resetSettings,
  onResetDashboard,
  aiDataDir,
  aiStorageMode,
  onChooseAiFolder,
  onChangeAiStorageMode,
  onReindexBom,
  reindexMessage,
  isAdmin,
}) {
  return (
    <div className="settings-page">
      <div className="card">
        <h2>⚙️ Settings</h2>
        <p className="hint">
          Manage BOM MASTER PRO application preferences.
        </p>
      </div>

      {/* GENERAL */}
      <div className="card settings-section">
        <h2>GENERAL</h2>

        <label className="settings-option">
          <input
            type="checkbox"
            checked={darkMode}
            onChange={(e) => setDarkMode(e.target.checked)}
          />
          <span>Dark Mode</span>
        </label>
      </div>

      {/* EXPORT */}
      <div className="card settings-section">
        <h2>EXPORT</h2>

        <label className="settings-option">
          <input
            type="checkbox"
            checked={autoSizeColumns}
            onChange={(e) =>
              setAutoSizeColumns(e.target.checked)
            }
          />
          <span>Auto-size columns</span>
        </label>

        <label className="settings-option">
          <input
            type="checkbox"
            checked={freezeHeader}
            onChange={(e) =>
              setFreezeHeader(e.target.checked)
            }
          />
          <span>Freeze header row</span>
        </label>
      </div>
      {/* AI DATABASE */}
      <div className="card settings-section">
        <h2>DATABASE</h2>

        <div className="settings-option">
          <span>Storage mode:</span>
          <label style={{ marginLeft: 10 }}>
            <input
              type="radio"
              name="aiStorageMode"
              checked={aiStorageMode === "local"}
              onChange={() => onChangeAiStorageMode("local")}
            />
            Local Folder
          </label>
          <label style={{ marginLeft: 10 }}>
            <input
              type="radio"
              name="aiStorageMode"
              checked={aiStorageMode === "drive"}
              onChange={() => onChangeAiStorageMode("drive")}
            />
            Google Drive
          </label>
        </div>

        <div className="settings-option" style={{ display: "block" }}>
          <span>Current folder:</span>
          <div style={{ fontSize: 12, wordBreak: "break-all", margin: "4px 0" }}>
            {aiDataDir || "(default)"}
          </div>
          {isAdmin && (
            <button className="secondary" onClick={onChooseAiFolder}>
              Choose Folder
            </button>
          )}
        </div>

        <div className="settings-actions" style={{ marginTop: 14 }}>
          <button className="secondary" onClick={onReindexBom}>
            Re-index BOM Data
          </button>
        </div>

        {reindexMessage && (
          <p className="hint" style={{ marginTop: 8 }}>
            {reindexMessage}
          </p>
        )}
      </div>

      {/* DATA */}
      <div className="card settings-section">
        <h2>DATA</h2>

        <div className="settings-actions">
            <button
            className="clear"
            onClick={resetSettings}
          >
            Reset Settings
          </button>

          <button
            className="clear"
            onClick={onResetDashboard}
          >
            Reset Dashboard Activity
          </button>
        </div>
      </div>

      {/* ABOUT */}
      <div className="card settings-section">
        <h2>ABOUT</h2>

        <div className="about-box">
          <strong>BOM MASTER PRO V2.0</strong>
          <span>Designed &amp; Developed by Anonymous</span>
        </div>
      </div>
    </div>
  );
}
