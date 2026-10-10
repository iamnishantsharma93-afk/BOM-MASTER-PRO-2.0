import { useEffect, useMemo, useState } from "react";
import {
  norm,
  parseBomRows,
  buildMasterBom,
  buildSummarySheet,
  buildFullUsageSheet,
  buildPartDetailSheet,
  mapAiRowToMasterRow,
} from "./utils/masterBomEngine.js";
import {
  readExcelFile,
  exportWorkbook,
  hasNativePicker,
  pickExcelFilesNative,
  parseExcelBase64,
} from "./utils/excelReader.js";
import {
  normLoc,
  locCompare,
  mapRows,
} from "./utils/compareEngine.js";
import { PARAMS, blankMap } from "./utils/helpers.js";
import { apiGet, apiPost, apiDelete, apiHealth } from "./utils/api.js";
import * as XLSX from "xlsx/dist/xlsx.full.min.js";
import Header from "./components/Header.jsx";
import Footer from "./components/Footer.jsx";
import Sidebar from "./components/Sidebar.jsx";
import Dashboard from "./components/Dashboard.jsx";
import UploadPanel from "./components/UploadPanel.jsx";
import ComparePanel from "./components/ComparePanel.jsx";
import ResultTable from "./components/ResultTable.jsx";
import MasterBom from "./components/MasterBom.jsx";
import ItemMaster from "./components/ItemMaster.jsx";
import ComingSoon from "./components/ComingSoon.jsx";
import Reports from "./components/Reports.jsx";
import SapBomGenerator from "./components/SapBomGenerator.jsx";
import Settings from "./components/Settings.jsx";
import Assistant from "./components/Assistant.jsx";
import BomSearchSelect from "./components/BomSearchSelect.jsx";
import { useToast } from "./components/Toast.jsx";
import {
  addActivity,
  clearActivity,
  incrementCounter,
  resetCounters,
  setLastMasterBom,
  setLastComparison,
} from "./utils/activityLog.js";

export default function App() {
  const { toast, confirmDialog } = useToast();
  // =========================
  // PAGE / VIEW NAVIGATION
  // =========================
  // "home" | "master" | "compare"
  const [view, setView] = useState("home");
  // =========================
// APPLICATION SETTINGS
// =========================
const [darkMode, setDarkMode] = useState(() => localStorage.getItem("bmp_darkMode") === "true");
const [autoSizeColumns, setAutoSizeColumns] = useState(true);
const [freezeHeader, setFreezeHeader] = useState(true);
useEffect(() => {
  localStorage.setItem("bmp_darkMode", darkMode ? "true" : "false");
}, [darkMode]);
const [aiDataDir, setAiDataDir] = useState("");
const [aiStorageMode, setAiStorageMode] = useState("local");
const [bomSearchResetKey, setBomSearchResetKey] = useState(0);

useEffect(() => {
  apiGet("/api/settings")
    .then((data) => {
      if (data.success) {
        setAiDataDir(data.dataDir);
        setAiStorageMode(data.storageMode);
      }
    })
    .catch((error) => console.error("Settings load error:", error));
}, []);

const saveAiSettings = async (newDataDir, newStorageMode) => {
  try {
    const data = await apiPost("/api/settings", {
      dataDir: newDataDir,
      storageMode: newStorageMode,
    });

    if (data.success) {
      setAiDataDir(data.dataDir);
      setAiStorageMode(data.storageMode);
    }
  } catch (error) {
    console.error("Settings save error:", error);
    toast.error("Could not connect to the AI backend. Make sure the backend is running.");
  }
};

const chooseAiFolder = async () => {
  if (!hasNativePicker()) return;

  const folder = await window.electronAPI.selectAiDatabaseFolder();

  if (folder) {
    saveAiSettings(folder, aiStorageMode);
  }
};

const changeAiStorageMode = (mode) => {
  saveAiSettings(aiDataDir, mode);
};
  // =========================
  // FILE STATES
  // =========================
  const [file1, setFile1] = useState(null);
  const [file2, setFile2] = useState(null);

  const [data1, setData1] = useState([]);
  const [data2, setData2] = useState([]);

  const [columns1, setColumns1] = useState([]);
  const [columns2, setColumns2] = useState([]);

  // =========================
  // COMPARISON PARAMETERS
  // =========================
  const [partNumber1, setPartNumber1] = useState("");
  const [partNumber2, setPartNumber2] = useState("");

  const [qps1, setQps1] = useState("");
  const [qps2, setQps2] = useState("");

  const [location1, setLocation1] = useState("");
  const [location2, setLocation2] = useState("");

  const [maps, setMaps] = useState(blankMap);

  const [showAdditional, setShowAdditional] = useState(false);
  const [selectedAdditional, setSelectedAdditional] = useState([]);

  // =========================
  // COMPARISON RESULTS
  // =========================
  const [results, setResults] = useState([]);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");

  const [busy, setBusy] = useState(false);
  const [compareWarning, setCompareWarning] = useState("");
  const [reindexMessage, setReindexMessage] = useState("");

  
  // =========================
  // MASTER BOM LIBRARY (folder-based — every .xlsx/.xls
  // file that lives directly inside the configured Master
  // BOM folder is automatically part of the library,
  // whether it was added via the app or copied in manually)
  // =========================
  // Fixed BOM format columns:
  // SN, Main/Alt, Model, Part No,
  // Item Name, Item Spec, QPS,
  // UOM, Location, Maker
  //
  // bomLibrary: array of
  // { id, name, model, rows }
  // where rows = [{ partNo, itemName,
  //   itemSpec, qps, uom, location,
  //   maker, mainAlt }]
  const [bomLibrary, setBomLibrary] = useState([]);
  const [libraryFilterMode, setLibraryFilterMode] = useState("contains");
  const [libraryContainsQuery, setLibraryContainsQuery] = useState("");
  const [libraryIsOneOfSelected, setLibraryIsOneOfSelected] = useState([]);

  // Snapshot of whichever library entries were used
  // in the CURRENT Master BOM build (drives the
  // per-BOM columns in the dashboard/export).
  const [builtFiles, setBuiltFiles] = useState([]);
  const [masterBOM, setMasterBOM] = useState([]);
  const [masterSearch, setMasterSearch] = useState("");
  const [selectedPart, setSelectedPart] = useState(null);

  // Loads the Master BOM library from the AI database
  // (one entry per Model No., grouped from bomData.json).
  const refreshLibrary = async () => {
    try {
      const data = await apiGet("/api/bom/library", { cache: "no-store" });

      if (data.success) {
        const sorted = data.library
          .map((item) => ({
            id: item.model,
            name: item.sourceFile,
            model: item.model,
            count: item.count,
          }))
          .sort((a, b) => a.model.localeCompare(b.model));

        setBomLibrary(sorted);
      }
    } catch (error) {
      console.error("Failed to load BOM library:", error);
    }
  };

  useEffect(() => {
    refreshLibrary();
  }, []);

  // =========================================================
  // ADD FILE(S) — uploaded into the AI database's
  // documents/bom folder, then the backend reindexes.
  // =========================================================
  const addMasterFile = async () => {
    if (!hasNativePicker()) return;

    try {
      const files = await window.electronAPI.selectExcelFiles(true);

      if (!files || !files.length) return;

      const data = await apiPost("/api/bom/upload", {
        files: files.map((f) => ({ name: f.name, base64: f.base64 })),
      });

      if (data.success) {
        setReindexMessage(`${data.count} file(s) added successfully.`);
        await refreshLibrary();
      } else {
        setReindexMessage("Failed to add file(s): " + data.error);
      }
    } catch (error) {
      console.error("Upload error:", error);
      setReindexMessage("Unable to upload file(s) to the AI database.");
    }
  };

  // Fallback for non-Electron (plain browser) environments.
  const addMasterFileFallback = (event) => {
    const selected = Array.from(event.target.files || []);

    if (!selected.length) return;

    Promise.all(
      selected.map(
        (file) =>
          new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = () => {
              resolve({
                name: file.name,
                base64: reader.result.split(",")[1],
              });
            };

            reader.onerror = reject;
            reader.readAsDataURL(file);
          })
      )
    )
      .then((files) => apiPost("/api/bom/upload", { files }))
      .then((data) => {
        if (data.success) {
          toast.success(`${data.count} file(s) added successfully.`);
          refreshLibrary();
        } else {
          toast.error("Failed to add file(s): " + data.error);
        }
      })
      .catch((error) => {
        console.error("Upload error:", error);
        toast.error("Unable to upload file(s) to the AI database.");
      });

    event.target.value = "";
  };

  // Deletes one model from the AI database.
  const removeFromLibrary = async (model) => {
    const ok = await confirmDialog(
      `Delete model "${model}" from the database?`,
      { title: "Delete Model", danger: true }
    );

    if (!ok) return;

    try {
      const data = await apiDelete(
        "/api/bom/model?model=" + encodeURIComponent(model)
      );

      if (!data.success) {
        setReindexMessage("Failed to delete: " + (data.error || "unknown error"));
      }

      addActivity("🗑", "Model deleted", model);
      await refreshLibrary();
    } catch (error) {
      console.error("Delete error:", error);
      setReindexMessage("Unable to delete the model.");
    }
  };

  // Deletes every source file currently in the library.
  const clearWholeLibrary = async () => {
    const ok = await confirmDialog(
      "This permanently deletes EVERY BOM file in the AI database. Continue?",
      { title: "Clear Entire Library", danger: true }
    );

    if (!ok) return;

    const uniqueFiles = [...new Set(bomLibrary.map((b) => b.name))];

    try {
      for (const fileName of uniqueFiles) {
        await apiDelete(
          "/api/bom/file?fileName=" + encodeURIComponent(fileName)
        );
      }

      await refreshLibrary();
    } catch (error) {
      console.error("Clear error:", error);
    }

    setBuiltFiles([]);
    setMasterBOM([]);
    setMasterSearch("");
    setSelectedPart(null);
  };

  const clearMasterBom = async () => {
    const ok = await confirmDialog(
      "Clear the current Master BOM? The BOM Library will not be deleted.",
      { title: "Clear Master BOM", danger: true }
    );

    if (!ok) return;

    setMasterBOM([]);
    setBuiltFiles([]);
    setMasterSearch("");
    setSelectedPart(null);
  };

  const resetSettings = async () => {
    const ok = await confirmDialog(
      "Reset all application settings to default?"
    );

    if (!ok) return;

    setDarkMode(false);
    setAutoSizeColumns(true);
    setFreezeHeader(true);
  };
const resetDashboard = () => {
  clearActivity();
  resetCounters();
  setReindexMessage("Dashboard activity cleared.");
};

  const filteredLibrary = useMemo(() => {
    if (libraryFilterMode === "isOneOf") {
      if (!libraryIsOneOfSelected.length) return bomLibrary;

      return bomLibrary.filter((b) =>
        libraryIsOneOfSelected.includes(b.model)
      );
    }

    const q = libraryContainsQuery.trim().toLowerCase();

    if (!q) return bomLibrary;

    return bomLibrary.filter(
      (b) =>
        b.model.toLowerCase().includes(q) ||
        b.name.toLowerCase().includes(q)
    );
  }, [
    bomLibrary,
    libraryFilterMode,
    libraryContainsQuery,
    libraryIsOneOfSelected,
  ]);


  // =========================================================
  // BUILD MASTER BOM FROM SELECTED LIBRARY ENTRIES
  // =========================================================

  const buildMasterBOM = async () => {
    if (!filteredLibrary.length) {
      toast.info("No BOM matches the current filter. Adjust the filter first.");

      return;
    }

    try {
      const filesToBuild = [];

      for (const b of filteredLibrary) {
        const data = await apiGet(
          "/api/bom/rows?model=" + encodeURIComponent(b.model)
        );

        if (!data.success) continue;

        const rows = data.rows
          .map(mapAiRowToMasterRow)
          .filter((r) => r.partNo);

        filesToBuild.push({
          id: b.model,
          name: b.name,
          model: b.model,
          rows,
        });
      }

      const finalMaster = buildMasterBom(filesToBuild);

      setBuiltFiles(filesToBuild);
      setMasterBOM(finalMaster);
      addActivity("▦", "Master BOM created", `${filesToBuild.length} BOM(s), ${finalMaster.length} parts`);
      setLastMasterBom({
        parts: finalMaster.length,
        boms: filesToBuild.length,
        models: filesToBuild.map((f) => f.model),
        time: Date.now(),
      });
      toast.success(`Master BOM built: ${finalMaster.length} parts from ${filesToBuild.length} BOM(s).`);
      setSelectedPart(null);
      setMasterSearch("");
    } catch (error) {

      console.error("Build error:", error);
      toast.error("Failed to build Master BOM.");
    }
  };

  // =========================
  // MASTER BOM SEARCH
  // =========================
  const searchMatches = useMemo(() => {
    const q = masterSearch
      .trim()
      .toLowerCase();

    if (!q) return [];

    return masterBOM.filter(
      (item) =>
        item.partNo
          .toLowerCase()
          .includes(q) ||
        (item.itemName &&
          item.itemName
            .toLowerCase()
            .includes(q))
    );
  }, [masterBOM, masterSearch]);

  // =========================
  // EXPORT - SEARCHED PART DETAILS
  // =========================
  const exportPartDetails = (item) => {
    if (!item) return;

    exportWorkbook(
      {
        "Part Details":
          buildPartDetailSheet(item),
      },
      `Part_${item.partNo}_Details.xlsx`
    );
  };

  // =========================
  // EXPORT - FULL MASTER BOM
  // (2 sheets: Summary + Full Usage)
  // =========================
  const exportMasterBOM = () => {
    if (!masterBOM.length) {
      toast.info("Master BOM is empty.");

      return;
    }

    exportWorkbook(
      {
        Summary: buildSummarySheet(
          masterBOM,
          builtFiles
        ),
        "Full Usage": buildFullUsageSheet(
          masterBOM
        ),
      },
      "BOM_Master_Pro_Master_BOM.xlsx"
    );
  };


  // =========================
  // READ EXCEL FILE (compare feature)
  // =========================
  const readFile = (
    file,
    setData,
    setCols
  ) => {
    readExcelFile(file)
      .then((rows) => {
        setData(rows);

        setCols(
          rows.length
            ? Object.keys(rows[0])
            : []
        );
      })
      .catch((error) => {
        console.error(
          "Excel read error:",
          error
        );

        toast.error(
          `Unable to read "${file.name}".\n\nError: ${error.message}`
        );
      });
  };

  // =========================
  // UPLOAD FILE (compare feature)
  // =========================
  const upload = async (number) => {
    try {
      const files = hasNativePicker()
        ? await pickExcelFilesNative(false)
        : null;

      if (!files || !files.length) return;

      const { name, rawRows } = files[0];

      const cols = rawRows.length
        ? Object.keys(rawRows[0])
        : [];

      if (number === 1) {
        setFile1({ name });
        setData1(rawRows);
        setColumns1(cols);
        setResults([]);
      } else {
        setFile2({ name });
        setData2(rawRows);
        setColumns2(cols);
        setResults([]);
      }
    } catch (error) {
      console.error(
        "File picker error:",
        error
      );

      toast.error(
        "Unable to open the file picker."
      );
    }
  };

const removeFile = (number) => {
  if (number === 1) {
    setFile1(null);
    setData1([]);
    setColumns1([]);
  } else {
    setFile2(null);
    setData2([]);
    setColumns2([]);
  }

  setResults([]);
};

const selectFromDatabase = async (number, model) => {
  try {
    const data = await apiGet(
      "/api/bom/rows?model=" + encodeURIComponent(model)
    );

    if (!data.success || !data.rows.length) {
      toast.info("No data found for this model.");
      return;
    }

    const cols = Object.keys(data.rows[0]);

    if (number === 1) {
      setFile1({ name: model + " (AI Database)" });
      setData1(data.rows);
      setColumns1(cols);
      setResults([]);
    } else {
      setFile2({ name: model + " (AI Database)" });
      setData2(data.rows);
      setColumns2(cols);
      setResults([]);
    }
  } catch (error) {
    console.error("Database fetch error:", error);
    toast.error("Could not connect to the AI database.");
  }
};

const reindexBomData = async () => {
  try {
    const data = await apiPost("/api/bom/reindex", {});

    if (data.success) {
      setReindexMessage(`Re-index complete. ${data.count} rows loaded.`);addActivity("⚙", "Database re-indexed", `${data.count} rows loaded`);
      await refreshLibrary();
    } else {
      setReindexMessage("Re-index failed: " + data.error);
    }
  } catch (error) {
    console.error("Reindex error:", error);
    setReindexMessage("Could not connect to the AI backend.");
  }
};

const [userName, setUserName] = useState("");

useEffect(() => {
  if (!hasNativePicker()) return;

  window.electronAPI
    .getUsername()
    .then((name) => setUserName(name));
}, []);

const [backendOnline, setBackendOnline] = useState(null);

useEffect(() => {
  apiHealth().then(setBackendOnline);
}, []);

const [isAdmin, setIsAdmin] = useState(false);

  // Fallback for non-Electron (plain
  // browser) environments only.
  const uploadFallback = (
    number,
    event
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) return;

    if (number === 1) {
      setFile1(file);
      setData1([]);
      setColumns1([]);
      setResults([]);

      readFile(
        file,
        setData1,
        setColumns1
      );
    } else {
      setFile2(file);
      setData2([]);
      setColumns2([]);
      setResults([]);

      readFile(
        file,
        setData2,
        setColumns2
      );
    }

    // Allow selecting same file again
    event.target.value = "";
  };

  // =========================================================
  // BOM COMPARISON
  // =========================================================
  const compare = () => {
    if (
      !partNumber1 ||
      !partNumber2 ||
      !qps1 ||
      !qps2 ||
      !location1 ||
      !location2
    ) {
      setCompareWarning(
        "Please select mandatory Part Number, QPS and Location columns in both files."
      );

      return;
    }

    setCompareWarning("");

    setBusy(true);

    const m1 =
      mapRows(
        data1,
        partNumber1
      );

    const m2 =
      mapRows(
        data2,
        partNumber2
      );

    const keys = [
      ...new Set([
        ...m1.keys(),
        ...m2.keys(),
      ]),
    ];

    const out = [];

    keys.forEach(
      (part) => {
        const a =
          m1.get(part) || [];

        const b =
          m2.get(part) || [];

        const max =
          Math.max(
            a.length,
            b.length
          );

        for (
          let i = 0;
          i < max;
          i++
        ) {
          const r1 = a[i];
          const r2 = b[i];

          const base = {
            id: out.length,

            partNumber: part,

            qpsFile1:
              r1 ? (r1[qps1] ?? "") : 0,

            qpsFile2:
              r2 ? (r2[qps2] ?? "") : 0,

            locationFile1:
              r1?.[
                location1
              ] ?? "",

            locationFile2:
              r2?.[
                location2
              ] ?? "",

            changes: {},

            remarks: [],
          };

          if (!r1) {
            base.status =
              "Only in File 2";

            base.remarks.push(
              "Part Number not found in File 1"
            );

            out.push(base);

            continue;
          }

          if (!r2) {
            base.status =
              "Only in File 1";

            base.remarks.push(
              "Part Number not found in File 2"
            );

            out.push(base);

            continue;
          }

          const hasDuplicates = a.length > 1 || b.length > 1;

          if (
            a.length > 1
          ) {
            base.remarks.push(
              `Duplicate Part Number found in File 1 (${a.length} rows)`
            );
          }

          if (
            b.length > 1
          ) {
            base.remarks.push(
              `Duplicate Part Number found in File 2 (${b.length} rows)`
            );
          }

          if (hasDuplicates) {
            base.status = "Manual Review Needed";
            base.remarks.push(
              "Duplicate part numbers found — automatic row pairing may be incorrect. Please verify manually."
            );

            out.push(base);

            continue;
          }

          const q =
            norm(
              r1[qps1]
            ) !==
            norm(
              r2[qps2]
            );

          if (q) {
            base.changes.qps =
              true;

            base.remarks.push(
              `QPS changed from ${
                r1[qps1] ??
                ""
              } to ${
                r2[qps2] ??
                ""
              }`
            );
          }

          const lc =
            locCompare(
              r1[location1],
              r2[location2]
            );

          if (
            !lc.same
          ) {
            base.changes.location =
              true;
          }

          if (
            lc.dup1.length
          ) {
            base.remarks.push(
              `Duplicate location found in File 1: ${lc.dup1.join(
                ", "
              )}`
            );
          }

          if (
            lc.dup2.length
          ) {
            base.remarks.push(
              `Duplicate location found in File 2: ${lc.dup2.join(
                ", "
              )}`
            );
          }

          if (
            lc.added.length
          ) {
            base.remarks.push(
              `Location added: ${lc.added.join(
                ", "
              )}`
            );
          }

          if (
            lc.removed.length
          ) {
            base.remarks.push(
              `Location removed: ${lc.removed.join(
                ", "
              )}`
            );
          }

          selectedAdditional.forEach(
            (k) => {
              const c1 =
                maps[
                  k + "1"
                ];

              const c2 =
                maps[
                  k + "2"
                ];

              if (
                !c1 ||
                !c2
              )
                return;

              const same =
                norm(
                  r1[c1]
                ) ===
                norm(
                  r2[c2]
                );

              if (!same) {
                base.changes[
                  k
                ] = true;

                base.remarks.push(
                  `${
                    PARAMS.find(
                      (x) =>
                        x[0] ===
                        k
                    )?.[1] ||
                    k
                  } changed from ${
                    r1[c1] ??
                    ""
                  } to ${
                    r2[c2] ??
                    ""
                  }`
                );
              }
            }
          );

          const ch =
            Object.keys(
              base.changes
            );

          base.status =
            q &&
            base.changes
              .location
              ? "QPS & Location Changed"
              : q
              ? "QPS Changed"
              : base.changes
                  .location
              ? "Location Changed"
              : ch.length
              ? "Additional Parameter Changed"
              : "Same";

          if (
            !base.remarks.length
          ) {
            base.remarks.push(
              "No difference found"
            );
          }

          const extraFile1 =
            Object.fromEntries(
              PARAMS.map(
                ([k]) => [
                  `${k}File1`,
                  r1[
                    maps[
                      `${k}1`
                    ]
                  ] ?? "",
                ]
              )
            );

          const extraFile2 =
            Object.fromEntries(
              PARAMS.map(
                ([k]) => [
                  `${k}File2`,
                  r2[
                    maps[
                      `${k}2`
                    ]
                  ] ?? "",
                ]
              )
            );

          out.push({
            ...base,

            extra: {
              ...extraFile1,
              ...extraFile2,
            },
          });
        }
      }
    );

    setResults(out);

    setLastComparison({
      total: out.length,
      changed: out.filter((r) => r.status !== "Same").length,
      time: Date.now(),
    });

    setFilter("All");

    setSearch("");

    addActivity("⌘", "BOM Comparison", `${out.length} parts compared`);
    incrementCounter("bmp_counter_comparisons");
    toast.success(`Comparison complete: ${out.length} parts compared.`);
    setBusy(false);
  };

  // =========================
  // DASHBOARD COUNTS
  // =========================
  const counts =
    useMemo(() => {
      const c = {
        All: results.length,

        Same: 0,

        "QPS Changed": 0,

        "Location Changed": 0,

        "QPS & Location Changed": 0,

        "Additional Parameter Changed": 0,

        "Only in File 1": 0,

        "Only in File 2": 0,
      };

      results.forEach(
        (r) => {
          c[r.status]++;
        }
      );

      return c;
    }, [results]);

  // =========================
  // FILTER RESULTS
  // =========================
  const filtered =
    useMemo(
      () =>
        results.filter(
          (r) => {
            const f =
              filter ===
                "All" ||
              r.status ===
                filter;

            const s =
              search
                .trim()
                .toUpperCase();

            if (!s)
              return f;

            const text =
              JSON.stringify(
                r
              ).toUpperCase();

            return (
              f &&
              text.includes(s)
            );
          }
        ),
      [
        results,
        filter,
        search,
      ]
    );

  // =========================
  // CLEAR COMPARISON
  // =========================
  const clear = () => {
    setFile1(null);
    setFile2(null);

    setData1([]);
    setData2([]);

    setColumns1([]);
    setColumns2([]);

    setPartNumber1("");
    setPartNumber2("");

    setQps1("");
    setQps2("");

    setLocation1("");
    setLocation2("");

    setMaps(
      blankMap
    );

    setSelectedAdditional(
      []
    );

    setResults([]);

    setSearch("");

    setFilter("All");

    setShowAdditional(
      false
    );

    setBomSearchResetKey((k) => k + 1);
  };

  // =========================
  // EXPORT COMPARISON
  // =========================
  const exportRows = (
    rows,
    name
  ) => {
    if (!rows.length) {
      toast.info("No data available to export.");

      return;
    }

    const data =
      rows.map((r) => {
        const x = {
          "Part Number":
            r.partNumber,

          "QPS File 1":
            r.qpsFile1,

          "QPS File 2":
            r.qpsFile2,

          "Location File 1":
            r.locationFile1,

          "Location File 2":
            r.locationFile2,
        };

        selectedAdditional.forEach(
          (k) => {
            const label =
              PARAMS.find(
                (p) =>
                  p[0] ===
                  k
              )?.[1];

            x[
              `${label} File 1`
            ] =
              r.extra?.[
                k +
                  "File1"
              ] ?? "";

            x[
              `${label} File 2`
            ] =
              r.extra?.[
                k +
                  "File2"
              ] ?? "";
          }
        );

        x.Status =
          r.status;

        x.Remark =
          r.remarks.join(
            " | "
          );

        return x;
      });

    const ws =
      XLSX.utils.json_to_sheet(
        data
      );

    const wb =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      wb,
      ws,
      "Comparison Result"
    );

    XLSX.writeFile(
      wb,
      name
    );
  };

  const changed =
    results.filter(
      (r) =>
        r.status !==
        "Same"
    );

  // =========================
  // UI
  // =========================
  return (
    <div className={"app" + (darkMode ? " dark-mode" : "")}>
      <Header userName={userName} isAdmin={isAdmin} onAdminToggle={setIsAdmin} />

      <div className="app-body">
        <Sidebar
          view={view}
          setView={setView}
        />

        <main>
        <div key={view} className="view-enter">
        {view === "home" && (
          <Dashboard setView={setView} userName={userName} backendOnline={backendOnline} totalBomFiles={bomLibrary.length} />
        )}

        {view === "item" && <ItemMaster />}
        {view === "master" && (
          <MasterBom
            hasNativePicker={hasNativePicker}
            addMasterFile={addMasterFile}
            addMasterFileFallback={
              addMasterFileFallback
            }
            bomLibrary={bomLibrary}
            libraryModels={bomLibrary.map((b) => b.model)}
            libraryFilterMode={libraryFilterMode}
            setLibraryFilterMode={setLibraryFilterMode}
            libraryContainsQuery={libraryContainsQuery}
            setLibraryContainsQuery={setLibraryContainsQuery}
            libraryIsOneOfSelected={libraryIsOneOfSelected}
            setLibraryIsOneOfSelected={setLibraryIsOneOfSelected}
            filteredLibrary={filteredLibrary}
            removeFromLibrary={removeFromLibrary}
            buildMasterBOM={buildMasterBOM}
            exportMasterBOM={exportMasterBOM}
            clearWholeLibrary={clearWholeLibrary}
            builtFiles={builtFiles}
            masterBOM={masterBOM}
            masterSearch={masterSearch}
            setMasterSearch={setMasterSearch}
            selectedPart={selectedPart}
            setSelectedPart={setSelectedPart}
            searchMatches={searchMatches}
            exportPartDetails={exportPartDetails}
            clearMasterBom={clearMasterBom}
            isAdmin={isAdmin}
          />
        )}

        <div style={{ display: view === "assistant" ? "block" : "none" }}>
          <Assistant
            masterBOM={masterBOM}
            builtFiles={builtFiles}
          />
        </div>

        {view === "compare" && (
          <>
            <UploadPanel
              file1={file1}
              file2={file2}
              upload={upload}
              uploadFallback={uploadFallback}
              hasNativePicker={hasNativePicker}
              selectFromDatabase={selectFromDatabase}
              resetKey={bomSearchResetKey}
              removeFile={removeFile}
            />

            <ComparePanel
              columns1={columns1}
              columns2={columns2}
              partNumber1={partNumber1}
              setPartNumber1={setPartNumber1}
              partNumber2={partNumber2}
              setPartNumber2={setPartNumber2}
              qps1={qps1}
              setQps1={setQps1}
              qps2={qps2}
              setQps2={setQps2}
              location1={location1}
              setLocation1={setLocation1}
              location2={location2}
              setLocation2={setLocation2}
              showAdditional={showAdditional}
              setShowAdditional={setShowAdditional}
              selectedAdditional={selectedAdditional}
              setSelectedAdditional={
                setSelectedAdditional
              }
              maps={maps}
              setMaps={setMaps}
              PARAMS={PARAMS}
              compare={compare}
              clear={clear}
              busy={busy}
              compareWarning={compareWarning}
            />

            <ResultTable
              results={results}
              counts={counts}
              filter={filter}
              setFilter={setFilter}
              search={search}
              setSearch={setSearch}
              filtered={filtered}
              changed={changed}
              exportRows={exportRows}
              PARAMS={PARAMS}
              selectedAdditional={selectedAdditional}
            />
          </>
        )}

        {view === "sap" && <SapBomGenerator />}

        {view === "reports" && <Reports />}

        {view === "settings" && (
  <Settings
    darkMode={darkMode}
    setDarkMode={setDarkMode}
    autoSizeColumns={autoSizeColumns}
    setAutoSizeColumns={setAutoSizeColumns}
    freezeHeader={freezeHeader}
    setFreezeHeader={setFreezeHeader}
    resetSettings={resetSettings}
    aiDataDir={aiDataDir}
    aiStorageMode={aiStorageMode}
    onChooseAiFolder={chooseAiFolder}
    onChangeAiStorageMode={changeAiStorageMode}
    onReindexBom={reindexBomData}
    reindexMessage={reindexMessage}
    isAdmin={isAdmin}
    onResetDashboard={resetDashboard}
  />
)}
        </div>
        </main>
      </div>

      <Footer />

    </div>
  );
}
