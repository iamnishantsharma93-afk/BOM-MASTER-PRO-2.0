import { useState } from "react";
import {
  readExcelFile,
  hasNativePicker,
  pickExcelFilesNative,
} from "../utils/excelReader.js";
import { apiGet } from "../utils/api.js";
import { incrementCounter } from "../utils/activityLog.js";
import { useToast } from "./Toast.jsx";
import Icon from "./Icon.jsx";
import DropZone from "./DropZone.jsx";
import BomSearchSelect from "./BomSearchSelect.jsx";
import {
  detectColumns,
  DEFAULT_FIELD_ALIASES,
} from "../utils/sap/mapper.js";
import {
  generateSapRows,
  DEFAULT_CONFIG,
} from "../utils/sap/generator.js";
import { validateSapRows } from "../utils/sap/validator.js";
import {
  exportSapWorkbook,
  SAP_FIELDS,
} from "../utils/sap/exporter.js";

export default function SapBomGenerator() {
  const { toast } = useToast();
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState([]);
  const [customerRows, setCustomerRows] = useState([]);
  const [columnMap, setColumnMap] = useState({});
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [sapRows, setSapRows] = useState([]);
  const [errors, setErrors] = useState([]);

  const loadRows = (rawRows, name) => {
    if (!rawRows.length) {
      toast.error(`"${name}" has no data rows.`);
      return;
    }

    const detectedHeaders = Object.keys(rawRows[0]);

    setFileName(name);
    setHeaders(detectedHeaders);
    setCustomerRows(rawRows);
    setColumnMap(
      detectColumns(
        detectedHeaders,
        DEFAULT_FIELD_ALIASES
      )
    );
    setSapRows([]);
    setErrors([]);
  };

  const handlePick = async () => {
    if (!hasNativePicker()) return;

    const files = await pickExcelFilesNative(false);
    if (!files.length) return;

    loadRows(files[0].rawRows, files[0].name);
  };

  const handlePickFallback = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const rawRows = await readExcelFile(file);
    loadRows(rawRows, file.name);
    event.target.value = "";
  };

  const loadFromDatabase = async (model) => {
    try {
      const data = await apiGet(
      "/api/bom/rows?model=" + encodeURIComponent(model)
    );

    if (!data.success || !data.rows.length) {
      toast.info("No data found for this model.");
      return;
    }

      loadRows(data.rows, model + " (AI Database)");
    } catch (error) {
      console.error("Database fetch error:", error);
      toast.error("Could not connect to the AI database.");
    }
  };

  const updateColumnMap = (field, value) => {
    setColumnMap((prev) => ({ ...prev, [field]: value }));
  };

  const updateConfig = (field, value) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const handleGenerate = () => {
    if (!customerRows.length) {
      toast.info("Please upload a customer BOM file first.");
      return;
    }

    try {
      const { rows } = generateSapRows(
        customerRows,
        columnMap,
        config
      );

      setSapRows(rows);
      setErrors(validateSapRows(rows));
    } catch (error) {
      setSapRows([]);
      setErrors([]);
      toast.error(error.message);
    }
  };

  const handleReset = () => {
    setFileName("");
    setHeaders([]);
    setCustomerRows([]);
    setColumnMap({});
    setConfig(DEFAULT_CONFIG);
    setSapRows([]);
    setErrors([]);
  };

  const handleExport = () => {
    if (!sapRows.length) {
      toast.info("Nothing to export. Generate the SAP BOM first.");
      return;
    }

    exportSapWorkbook(sapRows, "SAP_BOM_Export.xlsx");
    incrementCounter("bmp_counter_sap_exports");
    toast.success(`${sapRows.length} SAP rows exported.`);
  };

  return (
    <section className="card">
      <h2 className="card-title-icon"><Icon name="star" size={16} /> SAP BOM Generator</h2>

      <p className="hint">
        Upload a customer BOM (any column names) and
        convert it into an SAP-ready BOM.
      </p>

      <DropZone
        className="upload"
        onClick={hasNativePicker() ? handlePick : undefined}
        onFiles={(files) =>
          handlePickFallback({ target: { files, value: "" } })
        }
      >
        <span className="upload-icon"><Icon name="upload" size={18} /></span>
        <strong>Upload Customer BOM</strong>
        <span>{fileName || "Choose an Excel file"}</span>
        {!hasNativePicker() && (
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handlePickFallback}
          />
        )}
      </DropZone>

      <p className="hint" style={{ margin: "8px 0 4px" }}>
        Or search from AI database:
      </p>

      <BomSearchSelect onSelectModel={loadFromDatabase} />

      {headers.length > 0 && (
        <>
          <div className="masterfile-card">
            <div className="masterfile-head">
              <b>Detected Columns (override if needed)</b>
            </div>

            <div className="masterrow-grid">
              {Object.keys(DEFAULT_FIELD_ALIASES).map(
                (field) => (
                  <div className="masterrow" key={field}>
                    <b>{field}</b>
                    <select
                      value={columnMap[field] || ""}
                      onChange={(e) =>
                        updateColumnMap(
                          field,
                          e.target.value
                        )
                      }
                    >
                      <option value="">Not mapped</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                )
              )}
            </div>
          </div>

          <div className="masterfile-card">
            <div className="masterfile-head">
              <b>Configuration</b>
            </div>

            <div className="masterrow-grid">
              <div className="masterrow">
                <b>Plant</b>
                <input
                  value={config.plant}
                  onChange={(e) =>
                    updateConfig("plant", e.target.value)
                  }
                  placeholder="e.g. 1000"
                />
              </div>

              <div className="masterrow">
                <b>Usage</b>
                <input
                  value={config.usage}
                  onChange={(e) =>
                    updateConfig("usage", e.target.value)
                  }
                  placeholder="e.g. 1"
                />
              </div>

              <div className="masterrow">
                <b>Alternative BOM</b>
                <input
                  value={config.alternativeBom}
                  onChange={(e) =>
                    updateConfig(
                      "alternativeBom",
                      e.target.value
                    )
                  }
                  placeholder="e.g. 01"
                />
              </div>

              <div className="masterrow">
                <b>Item Category</b>
                <input
                  value={config.itemCategory}
                  onChange={(e) =>
                    updateConfig(
                      "itemCategory",
                      e.target.value
                    )
                  }
                />
              </div>

              <div className="masterrow">
                <b>Item No. Increment</b>
                <input
                  type="number"
                  value={config.itemNumberIncrement}
                  onChange={(e) =>
                    updateConfig(
                      "itemNumberIncrement",
                      Number(e.target.value) || 10
                    )
                  }
                />
              </div>

              <div className="masterrow">
                <b>BOM Order (Process Priority)</b>
                <input
                  value={config.processOrder}
                  onChange={(e) =>
                    updateConfig("processOrder", e.target.value)
                  }
                  placeholder="e.g. AI,SM,MI (empty = file order)"
                />
              </div>
            </div>

            <label className="check">
              <input
                type="checkbox"
                checked={config.uppercaseMaterial}
                onChange={(e) =>
                  updateConfig(
                    "uppercaseMaterial",
                    e.target.checked
                  )
                }
              />
              Uppercase Material
            </label>

            <label className="check">
              <input
                type="checkbox"
                checked={config.mergeDuplicates}
                onChange={(e) =>
                  updateConfig(
                    "mergeDuplicates",
                    e.target.checked
                  )
                }
              />
              Merge Duplicate Components
            </label>
          </div>

          <div className="actions">
            <button className="primary" onClick={handleGenerate}>
              <Icon name="settings" size={14} /> Generate SAP BOM
            </button>

            <button onClick={handleExport}>
              Export to Excel
            </button>

            <button className="clear" onClick={handleReset}>
              Reset
            </button>
          </div>
        </>
      )}

      {errors.length > 0 && (
        <div className="masterfile-card">
          <div className="masterfile-head">
            <b>{errors.length} row(s) have issues</b>
          </div>

          {errors.slice(0, 20).map((e) => (
            <p key={e.rowIndex} className="hint">
              Source Row {e.sourceRow}: {e.errors.join("; ")}
            </p>
          ))}
        </div>
      )}

      {sapRows.length > 0 && (
        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                {SAP_FIELDS.map((field) => (
                  <th key={field.key}>{field.header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sapRows.slice(0, 100).map((row, i) => (
                <tr key={i}>
                  {SAP_FIELDS.map((field) => (
                    <td key={field.key}>{row[field.key]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
