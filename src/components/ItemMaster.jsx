import { useEffect, useState } from "react";
import { exportWorkbook } from "../utils/excelReader.js";

function FieldWithSuggestions({ label, value, setValue, options, onEnter }) {
  const [open, setOpen] = useState(false);

  const matches = value.trim()
    ? options.filter((o) => o.toLowerCase().includes(value.trim().toLowerCase())).slice(0, 8)
    : [];

  return (
    <div className="masterrow" style={{ position: "relative" }}>
      <label>{label}</label>
      <div style={{ position: "relative" }}>
        <input
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setOpen(true);
          }}
          onFocus={() => value.trim() && setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              setOpen(false);
              onEnter();
            }
          }}
          placeholder="Contains..."
        />

        {open && matches.length > 0 && (
          <div className="bom-search-dropdown">
            {matches.map((m) => (
              <div
                key={m}
                className="bom-search-option"
                onClick={() => {
                  setValue(m);
                  setOpen(false);
                }}
              >
                {m}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ItemMaster() {
  const [fields, setFields] = useState({ obu: [], process: [], maker: [] });

  const [itemCode, setItemCode] = useState("");
  const [partName, setPartName] = useState("");
  const [spec, setSpec] = useState("");
  const [obu, setObu] = useState("");
  const [process, setProcess] = useState("");
  const [maker, setMaker] = useState("");

  const [itemSuggestions, setItemSuggestions] = useState([]);
  const [showItemSuggestions, setShowItemSuggestions] = useState(false);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // =========================
  // ADD ALTERNATE ITEM TOOL
  // =========================
  const [showAltTool, setShowAltTool] = useState(false);
  const [altMainCode, setAltMainCode] = useState("");
  const [altMainSuggestions, setAltMainSuggestions] = useState([]);
  const [altMainModels, setAltMainModels] = useState([]);
  const [altSelectedModels, setAltSelectedModels] = useState([]);
  const [altNewCode, setAltNewCode] = useState("");
  const [altNewName, setAltNewName] = useState("");
  const [altNewSpec, setAltNewSpec] = useState("");
  const [altNewMaker, setAltNewMaker] = useState("");
  const [altSubmitting, setAltSubmitting] = useState(false);
  const [altResultMsg, setAltResultMsg] = useState("");

  useEffect(() => {
    fetch("http://localhost:3000/api/item/fields")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setFields({ obu: data.obu, process: data.process, maker: data.maker });
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!itemCode.trim()) {
      setItemSuggestions([]);
      return;
    }

    const timer = setTimeout(() => {
      fetch(
        "http://localhost:3000/api/item/suggestions?q=" +
          encodeURIComponent(itemCode)
      )
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setItemSuggestions(data.suggestions);
            setShowItemSuggestions(true);
          }
        })
        .catch(() => setItemSuggestions([]));
    }, 300);

    return () => clearTimeout(timer);
  }, [itemCode]);

  const runSearch = async () => {
    setLoading(true);
    setSearched(true);

    try {
      const params = new URLSearchParams();
      if (itemCode.trim()) params.set("itemCode", itemCode.trim());
      if (partName.trim()) params.set("partName", partName.trim());
      if (spec.trim()) params.set("spec", spec.trim());
      if (obu.trim()) params.set("obu", obu.trim());
      if (process.trim()) params.set("process", process.trim());
      if (maker.trim()) params.set("maker", maker.trim());

      const res = await fetch(
        "http://localhost:3000/api/item/filter?" + params.toString()
      );

      const data = await res.json();

      if (data.success) {
        setRows(data.rows);
      }
    } catch (error) {
      console.error("Item filter error:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetAll = () => {
    setItemCode("");
    setPartName("");
    setSpec("");
    setObu("");
    setProcess("");
    setMaker("");
    setRows([]);
    setSearched(false);
  };

  const exportResults = () => {
    if (!rows.length) return;

    const data = rows.map((r) => ({
      "Model": r["Model No."],
      "Item Code": r["Item Code"],
      "Part Name": r["Part Name"],
      "Part Spec": r["Part Description"],
      "Main/Alt": r["Alternate"],
      "QPS": r["QPS"],
      "UOM": r["UOM"],
      "Location": r["LOCATION"],
      "Maker": r["Maker"],
      "OBU": r["OBU"],
      "Process": r["Process"],
    }));

    exportWorkbook({ "Item Master Results": data }, "Item_Master_Results.xlsx");
  };

  // =========================
  // ALT TOOL LOGIC
  // =========================
  useEffect(() => {
    if (!altMainCode.trim()) {
      setAltMainSuggestions([]);
      return;
    }

    const timer = setTimeout(() => {
      fetch(
        "http://localhost:3000/api/item/suggestions?q=" +
          encodeURIComponent(altMainCode)
      )
        .then((res) => res.json())
        .then((data) => {
          if (data.success) setAltMainSuggestions(data.suggestions);
        })
        .catch(() => setAltMainSuggestions([]));
    }, 300);

    return () => clearTimeout(timer);
  }, [altMainCode]);

  const pickAltMain = async (code) => {
    setAltMainCode(code);
    setAltMainSuggestions([]);
    setAltSelectedModels([]);
    setAltResultMsg("");

    try {
      const res = await fetch(
        "http://localhost:3000/api/item/occurrences?q=" + encodeURIComponent(code)
      );
      const data = await res.json();

      if (data.success) {
        const models = [...new Set(
          data.rows
            .filter((r) => r["Item Code"] === code)
            .map((r) => r["Model No."])
        )].sort();

        setAltMainModels(models);
      }
    } catch (error) {
      console.error("Alt main lookup error:", error);
    }
  };

  const toggleAltModel = (model) => {
    setAltSelectedModels((prev) =>
      prev.includes(model) ? prev.filter((m) => m !== model) : [...prev, model]
    );
  };

  const submitAltItem = async () => {
    if (!altMainCode || !altSelectedModels.length || !altNewCode.trim()) {
      setAltResultMsg("Select the main item, at least one model, and enter the new item code.");
      return;
    }

    setAltSubmitting(true);
    setAltResultMsg("");

    try {
      const res = await fetch("http://localhost:3000/api/item/add-alternate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mainItemCode: altMainCode,
          models: altSelectedModels,
          newItem: {
            itemCode: altNewCode.trim(),
            partName: altNewName,
            spec: altNewSpec,
            maker: altNewMaker,
          },
        }),
      });

      const data = await res.json();

      if (data.success) {
        const okCount = data.results.filter((r) => r.ok).length;
        const failCount = data.results.length - okCount;

        setAltResultMsg(
          `Done: ${okCount} model(s) updated${failCount ? `, ${failCount} failed` : ""}.`
        );
      } else {
        setAltResultMsg("Failed: " + data.error);
      }
    } catch (error) {
      console.error("Add alternate error:", error);
      setAltResultMsg("Unable to reach the database.");
    } finally {
      setAltSubmitting(false);
    }
  };

  return (
    <div className="master-bom-page">
      <div className="master-bom-header">
        <div>
          <h2>Item Master</h2>
          <p className="hint">
            Search by Item Code, Part Name, Specification, OBU, Process, or Maker
          </p>
        </div>

        <button className="primary" onClick={() => setShowAltTool((s) => !s)}>
          {showAltTool ? "Close Add Alternate" : "+ Add Alternate Item"}
        </button>
      </div>

      {showAltTool && (
        <div className="card" style={{ marginBottom: 18 }}>
          <h3>Add Alternate Item</h3>
          <p className="hint" style={{ marginBottom: 14 }}>
            Make a new item an Alternate of an existing item, in selected models only.
          </p>

          <div className="masterrow" style={{ position: "relative", marginBottom: 10 }}>
            <label>Main Item Code</label>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                value={altMainCode}
                onChange={(e) => setAltMainCode(e.target.value)}
                placeholder="Search item code..."
              />

              {altMainSuggestions.length > 0 && (
                <div className="bom-search-dropdown">
                  {altMainSuggestions.map((s, i) => (
                    <div
                      key={i}
                      className="bom-search-option"
                      onClick={() => pickAltMain(s.itemCode)}
                    >
                      <b>{s.itemCode}</b> — {s.partName}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {altMainModels.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 6 }}>
                Apply to which models? ({altMainModels.length} found)
              </label>

              <div className="master-bom-list" style={{ maxHeight: 180 }}>
                {altMainModels.map((m) => (
                  <label key={m} className="check" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input
                      type="checkbox"
                      checked={altSelectedModels.includes(m)}
                      onChange={() => toggleAltModel(m)}
                    />
                    {m}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="item-master-filters" style={{ marginBottom: 10 }}>
            <div className="masterrow">
              <label>New Item Code</label>
              <input type="text" value={altNewCode} onChange={(e) => setAltNewCode(e.target.value)} />
            </div>
            <div className="masterrow">
              <label>Part Name</label>
              <input type="text" value={altNewName} onChange={(e) => setAltNewName(e.target.value)} />
            </div>
            <div className="masterrow">
              <label>Specification</label>
              <input type="text" value={altNewSpec} onChange={(e) => setAltNewSpec(e.target.value)} />
            </div>
            <div className="masterrow">
              <label>Maker</label>
              <input type="text" value={altNewMaker} onChange={(e) => setAltNewMaker(e.target.value)} />
            </div>
          </div>

          <div className="actions">
            <button className="primary" onClick={submitAltItem} disabled={altSubmitting}>
              {altSubmitting ? "Saving..." : "Add Alternate"}
            </button>
          </div>

          {altResultMsg && (
            <p className="hint" style={{ marginTop: 10 }}>{altResultMsg}</p>
          )}
        </div>
      )}

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="item-master-filters">
          <div className="masterrow" style={{ position: "relative" }}>
            <label>Item Code</label>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                value={itemCode}
                onChange={(e) => setItemCode(e.target.value)}
                onFocus={() => itemSuggestions.length && setShowItemSuggestions(true)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setShowItemSuggestions(false);
                    runSearch();
                  }
                }}
                placeholder="Contains..."
              />

              {showItemSuggestions && itemSuggestions.length > 0 && (
                <div className="bom-search-dropdown">
                  {itemSuggestions.map((s, i) => (
                    <div
                      key={i}
                      className="bom-search-option"
                      onClick={() => {
                        setItemCode(s.itemCode);
                        setShowItemSuggestions(false);
                      }}
                    >
                      <b>{s.itemCode}</b> — {s.partName}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="masterrow">
            <label>Part Name</label>
            <input
              type="text"
              value={partName}
              onChange={(e) => setPartName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runSearch()}
              placeholder="e.g. Resistor"
            />
          </div>

          <div className="masterrow">
            <label>Specification</label>
            <input
              type="text"
              value={spec}
              onChange={(e) => setSpec(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runSearch()}
              placeholder="Contains..."
            />
          </div>

          <FieldWithSuggestions label="OBU" value={obu} setValue={setObu} options={fields.obu} onEnter={runSearch} />
          <FieldWithSuggestions label="Process" value={process} setValue={setProcess} options={fields.process} onEnter={runSearch} />
          <FieldWithSuggestions label="Maker" value={maker} setValue={setMaker} options={fields.maker} onEnter={runSearch} />
        </div>

        <div className="actions">
          <button className="primary" onClick={runSearch}>Search</button>
          <button className="clear" onClick={resetAll}>Reset</button>
        </div>
      </div>

      {loading && <p className="hint">Searching...</p>}

      {!loading && searched && rows.length > 0 && (
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3 style={{ marginBottom: 4 }}>
                {rows.length} result{rows.length > 1 ? "s" : ""} found
              </h3>
              <p className="hint">
                Across {new Set(rows.map((r) => r["Model No."])).size} BOM(s)
              </p>
            </div>

            <button className="primary" onClick={exportResults}>Export Results</button>
          </div>

          <div className="tablewrap">
            <table>
              <thead>
                <tr>
                  <th>Model</th>
                  <th>Item Code</th>
                  <th>Part Name</th>
                  <th>Part Spec</th>
                  <th>Main/Alt</th>
                  <th>QPS</th>
                  <th>UOM</th>
                  <th className="location-cell">Location</th>
                  <th>Maker</th>
                  <th>OBU</th>
                  <th>Process</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td><b>{r["Model No."]}</b></td>
                    <td>{r["Item Code"]}</td>
                    <td>{r["Part Name"]}</td>
                    <td>{r["Part Description"]}</td>
                    <td>{r["Alternate"]}</td>
                    <td>{r["QPS"]}</td>
                    <td>{r["UOM"]}</td>
                    <td className="location-cell">{r["LOCATION"]}</td>
                    <td>{r["Maker"]}</td>
                    <td>{r["OBU"]}</td>
                    <td>{r["Process"]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && searched && rows.length === 0 && (
        <p className="hint">No matches found.</p>
      )}
    </div>
  );
}
