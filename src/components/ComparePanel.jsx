function mappingRow(
  columns1,
  columns2,
  label,
  a,
  setA,
  b,
  setB
) {
  return (
    <div className="maprow" key={label}>
      <b>{label}</b>

      <select
        value={a}
        onChange={(e) => setA(e.target.value)}
      >
        <option value="">Select Column</option>

        {columns1.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      <select
        value={b}
        onChange={(e) => setB(e.target.value)}
      >
        <option value="">Select Column</option>

        {columns2.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function ComparePanel({
  columns1,
  columns2,
  partNumber1,
  setPartNumber1,
  partNumber2,
  setPartNumber2,
  qps1,
  setQps1,
  qps2,
  setQps2,
  location1,
  setLocation1,
  location2,
  setLocation2,
  showAdditional,
  setShowAdditional,
  selectedAdditional,
  setSelectedAdditional,
  maps,
  setMaps,
  PARAMS,
  compare,
  clear,
  busy,
  compareWarning,
}) {
  if (!(columns1.length || columns2.length)) {
    return null;
  }

  return (
    <section className="card">
      <h2>02. Comparison Parameters</h2>

      <p className="hint">
        Part Number, QPS and Location
        are mandatory. Additional
        parameters are optional.
      </p>

      <div className="mapping">
        <div className="maphead">
          <b>Parameter</b>
          <b>File 1 Column</b>
          <b>File 2 Column</b>
        </div>

        {mappingRow(
          columns1,
          columns2,
          "🔑 Part Number",
          partNumber1,
          setPartNumber1,
          partNumber2,
          setPartNumber2
        )}

        {mappingRow(
          columns1,
          columns2,
          "🔢 QPS",
          qps1,
          setQps1,
          qps2,
          setQps2
        )}

        {mappingRow(
          columns1,
          columns2,
          "📍 Location",
          location1,
          setLocation1,
          location2,
          setLocation2
        )}
      </div>

      <button
        className="secondary"
        onClick={() =>
          setShowAdditional(!showAdditional)
        }
      >
        {showAdditional ? "Hide" : "Show"}{" "}
        Additional Comparison Parameters
      </button>

      {showAdditional && (
        <div className="additional">
          <div className="additional-title">
            Select parameters to compare
          </div>

          {PARAMS.map(([k, label]) => (
            <label className="check" key={k}>
              <input
                type="checkbox"
                checked={selectedAdditional.includes(
                  k
                )}
                onChange={(e) =>
                  setSelectedAdditional((v) =>
                    e.target.checked
                      ? [...v, k]
                      : v.filter((x) => x !== k)
                  )
                }
              />
              {label}
            </label>
          ))}

          <div className="mapping">
            {selectedAdditional.map((k) => {
              const p = PARAMS.find(
                (x) => x[0] === k
              );

              return mappingRow(
                columns1,
                columns2,
                p[1],
                maps[k + "1"],
                (value) =>
                  setMaps((m) => ({
                    ...m,
                    [k + "1"]: value,
                  })),
                maps[k + "2"],
                (value) =>
                  setMaps((m) => ({
                    ...m,
                    [k + "2"]: value,
                  }))
              );
            })}
          </div>
        </div>
      )}

      {compareWarning && (
        <p style={{ color: "#dc2626", fontWeight: 600, margin: "10px 0" }}>
          ⚠ {compareWarning}
        </p>
      )}

      <div className="actions">
        <button
          className="primary"
          onClick={compare}
          disabled={busy}
        >
          {busy
            ? "Comparing…"
            : "⚡ Compare BOM Files"}
        </button>

        <button className="clear" onClick={clear}>
          Reset / Clear All
        </button>
      </div>
    </section>
  );
}
