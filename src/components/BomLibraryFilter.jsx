import { useState } from "react";

export default function BomLibraryFilter({
  label,
  models,
  mode,
  setMode,
  containsQuery,
  setContainsQuery,
  isOneOfSelected,
  setIsOneOfSelected,
}) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");

  const suggestions = typed.trim()
    ? models.filter(
        (m) =>
          m.toLowerCase().includes(typed.trim().toLowerCase()) &&
          !isOneOfSelected.includes(m)
      )
    : [];

  const addModel = (model) => {
    if (!model || isOneOfSelected.includes(model)) return;
    setIsOneOfSelected([...isOneOfSelected, model]);
  };

  const removeModel = (model) => {
    setIsOneOfSelected(isOneOfSelected.filter((m) => m !== model));
  };

  const handlePaste = (e) => {
    const text = e.clipboardData.getData("text");

    if (!text.includes("\n") && !text.includes("\t") && !text.includes(",")) {
      return;
    }

    e.preventDefault();

    const pieces = text
      .split(/[\n\t,]+/)
      .map((p) => p.trim())
      .filter(Boolean);

    const resolved = pieces
      .map((p) => models.find((m) => m.toLowerCase() === p.toLowerCase()))
      .filter(Boolean);

    setIsOneOfSelected([...new Set([...isOneOfSelected, ...resolved])]);
    setTyped("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && typed.trim()) {
      const match = models.find(
        (m) => m.toLowerCase() === typed.trim().toLowerCase()
      );

      if (match) {
        addModel(match);
        setTyped("");
      }
    }
  };

  const clearFilter = () => {
    setIsOneOfSelected([]);
    setContainsQuery("");
    setTyped("");
  };

  return (
    <div className="bom-lib-filter">
      <button
        className="bom-lib-filter-trigger"
        onClick={() => setOpen((o) => !o)}
      >
        {label} <span>{open ? "▲" : "▾"}</span>
      </button>

      {open && (
        <div className="bom-lib-filter-dropdown">
          <div className="bom-lib-filter-modes">
            <button
              className={mode === "contains" ? "active" : ""}
              onClick={() => setMode("contains")}
            >
              Contains
            </button>
            <button
              className={mode === "isOneOf" ? "active" : ""}
              onClick={() => setMode("isOneOf")}
            >
              Is one of
            </button>
          </div>

          {mode === "contains" && (
            <>
              <input
                type="text"
                value={containsQuery}
                onChange={(e) => setContainsQuery(e.target.value)}
                placeholder="Type to filter..."
                autoFocus
              />

              {containsQuery.trim() && (
                <div className="bom-lib-filter-list">
                  {models
                    .filter((m) =>
                      m.toLowerCase().includes(containsQuery.trim().toLowerCase())
                    )
                    .slice(0, 50)
                    .map((m) => (
                      <div
                        key={m}
                        className="bom-lib-filter-option"
                        onClick={() => setContainsQuery(m)}
                      >
                        {m}
                      </div>
                    ))}
                </div>
              )}
            </>
          )}

          {mode === "isOneOf" && (
            <>
              {isOneOfSelected.length > 0 && (
                <div className="bom-lib-chips">
                  {isOneOfSelected.map((m) => (
                    <span className="bom-lib-chip" key={m}>
                      {m}
                      <button onClick={() => removeModel(m)}>✕</button>
                    </span>
                  ))}
                </div>
              )}

              <input
                type="text"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                onPaste={handlePaste}
                onKeyDown={handleKeyDown}
                placeholder="Type or paste model numbers..."
              />

              {suggestions.length > 0 && (
                <div className="bom-lib-filter-list">
                  {suggestions.slice(0, 50).map((m) => (
                    <div
                      key={m}
                      className="bom-lib-filter-option"
                      onClick={() => {
                        addModel(m);
                        setTyped("");
                      }}
                    >
                      {m}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          <div className="bom-lib-filter-actions">
            <button className="primary" onClick={() => setOpen(false)}>
              Apply
            </button>
            <button className="clear" onClick={clearFilter}>
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}