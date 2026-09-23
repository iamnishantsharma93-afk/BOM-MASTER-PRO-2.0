import { useState } from "react";
import { exportWorkbook } from "../utils/excelReader.js";

export default function Reports() {
  const [downloading, setDownloading] = useState(false);
  const [count, setCount] = useState(null);

  const exportAll = async () => {
    setDownloading(true);

    try {
      const res = await fetch("http://localhost:3000/api/report/alternates");
      const data = await res.json();

      if (!data.success || !data.rows.length) {
        setCount(0);
        return;
      }

      const sheetData = data.rows.map((r) => ({
        "Model": r.model,
        "Main Item Code": r.mainItemCode,
        "Main Part Name": r.mainPartName,
        "Alt Item Code": r.altItemCode,
        "Alt Part Name": r.altPartName,
        "Process": r.process,
      }));

      exportWorkbook({ "Alternate Report": sheetData }, "Alternate_Report.xlsx");
      setCount(data.rows.length);
    } catch (error) {
      console.error("Export error:", error);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="master-bom-page">
      <div className="master-bom-header">
        <div>
          <h2>📊 Reports</h2>
        </div>
      </div>

      <div className="report-grid">
        <div className="card report-card">
          <div className="report-card-icon">🔄</div>
          <h3>Alternate Report</h3>
          <p className="hint">
            Every item that has an alternate across all BOMs, with the matching main/alt pair and process.
          </p>

          <button className="primary" onClick={exportAll} disabled={downloading}>
            {downloading ? "Preparing..." : "Export Report"}
          </button>

          {count !== null && (
            <p className="hint" style={{ marginTop: 10 }}>
              {count > 0
                ? `Exported ${count} alternate${count > 1 ? "s" : ""}.`
                : "No alternates found in the database."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
