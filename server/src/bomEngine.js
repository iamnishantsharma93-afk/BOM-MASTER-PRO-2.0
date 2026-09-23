const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

const { getDataDir } = require("./config");

function getBomDir() {
  return path.join(getDataDir(), "documents", "bom");
}
function getBomDataPath() {
  return path.join(getDataDir(), "bomData.json");
}

// =====================================================
// IN-MEMORY CACHE — avoids re-reading + re-parsing the
// whole bomData.json (and re-deriving the model list)
// on every single search keystroke.
// =====================================================
let cachedRows = null;
let cachedMtimeMs = 0;
let cachedModels = null;

function getRows() {
  const filePath = getBomDataPath();

  if (!fs.existsSync(filePath)) {
    cachedRows = [];
    cachedModels = [];
    return cachedRows;
  }

  const mtimeMs = fs.statSync(filePath).mtimeMs;

  if (cachedRows && mtimeMs === cachedMtimeMs) {
    return cachedRows;
  }

  cachedRows = JSON.parse(fs.readFileSync(filePath, "utf8"));
  cachedMtimeMs = mtimeMs;
  cachedModels = null; // invalidate derived model list

  return cachedRows;
}

function getModelList() {
  if (cachedModels) return cachedModels;

  const rows = getRows();
  cachedModels = [...new Set(rows.map((r) => r["Model No."]).filter(Boolean))];

  return cachedModels;
}

function loadBomFiles() {
  if (!fs.existsSync(getBomDir())) {
    fs.mkdirSync(getBomDir(), { recursive: true });
  }

  const files = fs.readdirSync(getBomDir()).filter((f) => f.endsWith(".xlsx") || f.endsWith(".xls"));
  let allRows = [];

  for (const file of files) {
    const workbook = XLSX.readFile(path.join(getBomDir(), file));
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    rows.forEach((row) => {
      row.__sourceFile = file;
    });

    allRows = allRows.concat(rows);
  }

  fs.writeFileSync(getBomDataPath(), JSON.stringify(allRows, null, 2));
  console.log(`BOM data loaded: ${allRows.length} rows from ${files.length} file(s).`);

  // Refresh cache immediately so the next search doesn't
  // even need to hit the disk.
  cachedRows = allRows;
  cachedMtimeMs = fs.statSync(getBomDataPath()).mtimeMs;
  cachedModels = null;

  return allRows;
}

function searchBom(query, topN = 5) {
  const rows = getRows();

  if (!rows.length) return [];

  const stopWords = new Set([
    "item", "code", "model", "no", "number", "mai", "se", "lag", "rha", "rahi", "hai",
    "hain", "kitne", "kitni", "kya", "ka", "ki", "ke", "ko", "mein", "kaise", "batao", "bata",
  ]);

  const keywords = query
    .toLowerCase()
    .replace(/[,.?!]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !stopWords.has(w));

  const searchableFields = [
    "Model No.",
    "Item Code(CPN)",
    "Item Code",
    "Part Name",
    "Part Description",
  ];

  const scored = rows.map((row) => {
    const text = searchableFields
      .map((f) => String(row[f] || "").toLowerCase())
      .join(" ");

    let matchCount = keywords.filter((kw) => text.includes(kw)).length;

    const itemCode = String(row["Item Code(CPN)"] || row["Item Code"] || "").toLowerCase();

    keywords.forEach((kw) => {
      if (kw.length > 4 && itemCode === kw) {
        matchCount += 10;
      }
    });

    return { row, matchCount };
  });

  return scored
    .filter((s) => s.matchCount > 0)
    .sort((a, b) => b.matchCount - a.matchCount)
    .slice(0, topN)
    .map((s) => s.row);
}

function searchBomList(query, limit = 15) {
  const rows = getRows();
  const q = (query || "").toLowerCase().trim();

  const filtered = q
    ? rows.filter((row) => {
        const text = [
          row["Model No."],
          row["Item Code(CPN)"],
          row["Item Code"],
          row["Part Name"],
        ]
          .map((v) => String(v || "").toLowerCase())
          .join(" ");

        return text.includes(q);
      })
    : rows;

  return filtered.slice(0, limit);
}

function searchModels(query, limit = 50) {
  const models = [...getModelList()].sort();
  const q = (query || "").toLowerCase().trim();

  const filtered = q
    ? models.filter((m) => m.toLowerCase().includes(q))
    : models;

  return filtered.slice(0, limit);
}

function getRowsByModel(model) {
  const rows = getRows();

  return rows.filter((r) => r["Model No."] === model);
}

function getLibrarySummary() {
  const rows = getRows();
  const map = new Map();

  rows.forEach((r) => {
    const model = r["Model No."];
    if (!model) return;

    if (!map.has(model)) {
      map.set(model, { model, count: 0, sourceFile: r.__sourceFile || "" });
    }

    map.get(model).count += 1;
  });

  return [...map.values()];
}

function deleteModel(model) {
  const rows = getRows();
  const target = rows.find((r) => r["Model No."] === model);

  if (!target || !target.__sourceFile) {
    return { ok: false, error: "Model not found." };
  }

  const filePath = path.join(getBomDir(), target.__sourceFile);

  if (!fs.existsSync(filePath)) {
    return { ok: false, error: "Source file not found." };
  }

  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const allRows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  const remaining = allRows.filter((r) => r["Model No."] !== model);

  if (remaining.length === 0) {
    fs.unlinkSync(filePath);
  } else {
    const newSheet = XLSX.utils.json_to_sheet(remaining);
    const newWorkbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(newWorkbook, newSheet, sheetName);
    XLSX.writeFile(newWorkbook, filePath);
  }

  loadBomFiles();

  return { ok: true, remainingInFile: remaining.length };
}

function addAlternateItem({ mainItemCode, models, newItem }) {
  const results = [];

  for (const model of models) {
    try {
      const rows = getRows().filter((r) => r["Model No."] === model);
      const mainRow = rows.find((r) => r["Item Code"] === mainItemCode);

      if (!mainRow || !mainRow.__sourceFile) {
        results.push({ model, ok: false, error: "Main item not found in this model." });
        continue;
      }

      const filePath = path.join(getBomDir(), mainRow.__sourceFile);
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const allRows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      const mainIndex = allRows.findIndex(
        (r) => r["Model No."] === model && r["Item Code"] === mainItemCode
      );

      if (mainIndex === -1) {
        results.push({ model, ok: false, error: "Main item row not found." });
        continue;
      }

      const newRow = {
        ...allRows[mainIndex],
        "Item Code": newItem.itemCode,
        "Part Name": newItem.partName,
        "Part Description": newItem.spec,
        "Maker": newItem.maker,
        "Alternate": "Alt",
      };

      allRows.splice(mainIndex + 1, 0, newRow);

      const newSheet = XLSX.utils.json_to_sheet(allRows);
      const newWorkbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(newWorkbook, newSheet, sheetName);
      XLSX.writeFile(newWorkbook, filePath);

      results.push({ model, ok: true });
    } catch (error) {
      results.push({ model, ok: false, error: error.message });
    }
  }

  loadBomFiles();

  return results;
}

function getAlternateReport() {
  const rows = getRows();
  const results = [];

  const byModel = new Map();
  rows.forEach((r) => {
    const model = r["Model No."];
    if (!byModel.has(model)) byModel.set(model, []);
    byModel.get(model).push(r);
  });

  byModel.forEach((modelRows, model) => {
    let currentMain = null;

    modelRows.forEach((r) => {
      const type = String(r["Alternate"] || "").trim().toLowerCase();

      if (type.startsWith("main")) {
        currentMain = r;
      } else if (type.startsWith("alt") && currentMain) {
        results.push({
          model,
          mainItemCode: currentMain["Item Code"],
          mainPartName: currentMain["Part Name"],
          altItemCode: r["Item Code"],
          altPartName: r["Part Name"],
          process: r["Process"],
        });
      }
    });
  });

  return results;
}

function searchItemOccurrences(query, limit = 500) {
  const rows = getRows();
  const q = (query || "").toLowerCase().trim();

  if (!q) return [];

  const searchFields = [
    "Item Code(CPN)",
    "Item Code",
    "Part Name",
    "Part Description",
    "Make 1",
    "MPN 1",
  ];

  const matches = rows.filter((row) => {
    const text = searchFields
      .map((f) => String(row[f] || "").toLowerCase())
      .join(" ");

    return text.includes(q);
  });

  return matches.slice(0, limit);
}

function getItemSuggestions(query, limit = 20) {
  const rows = getRows();
  const q = (query || "").toLowerCase().trim();

  if (!q) return [];

  const seen = new Set();
  const results = [];

  for (const row of rows) {
    const itemCode = row["Item Code(CPN)"] || row["Item Code"] || "";
    const partName = row["Part Name"] || "";

    const matchesCode = itemCode.toLowerCase().includes(q);
    const matchesName = partName.toLowerCase().includes(q);

    if (!matchesCode && !matchesName) continue;

    const key = itemCode + "|" + partName;
    if (seen.has(key)) continue;
    seen.add(key);

    results.push({ itemCode, partName });

    if (results.length >= limit) break;
  }

  return results;
}

function getDistinctValues(field) {
  const rows = getRows();
  return [...new Set(rows.map((r) => r[field]).filter(Boolean))].sort();
}

function getAltMainMap() {
  const rows = getRows();
  const byModel = new Map();

  rows.forEach((r) => {
    const model = r["Model No."];
    if (!byModel.has(model)) byModel.set(model, []);
    byModel.get(model).push(r);
  });

  const altOf = new Map();
  const mainOf = new Map();

  byModel.forEach((modelRows) => {
    let currentMain = null;

    modelRows.forEach((r) => {
      const type = String(r["Alternate"] || "").trim().toLowerCase();
      const key = r["Model No."] + "|" + r["Item Code"];

      if (type.startsWith("main")) {
        currentMain = r;
      } else if (type.startsWith("alt") && currentMain) {
        altOf.set(currentMain["Model No."] + "|" + currentMain["Item Code"], r["Item Code"]);
        mainOf.set(key, currentMain["Item Code"]);
      }
    });
  });

  return { altOf, mainOf };
}

function filterItems(filters, limit = 1000) {
  const rows = getRows();
  const { altOf, mainOf } = getAltMainMap();

  const matches = rows.filter((row) => {
    if (filters.obu && !String(row["OBU"] || "").toLowerCase().includes(filters.obu.toLowerCase())) return false;
    if (filters.process && !String(row["Process"] || "").toLowerCase().includes(filters.process.toLowerCase())) return false;
    if (filters.maker && !String(row["Maker"] || "").toLowerCase().includes(filters.maker.toLowerCase())) return false;

    if (filters.partName) {
      const name = String(row["Part Name"] || "").toLowerCase();
      if (!name.includes(filters.partName.toLowerCase())) return false;
    }

    if (filters.itemCode) {
      const code = String(row["Item Code"] || "").toLowerCase();
      if (!code.includes(filters.itemCode.toLowerCase())) return false;
    }

    if (filters.spec) {
      const spec = String(row["Part Description"] || "").toLowerCase();
      if (!spec.includes(filters.spec.toLowerCase())) return false;
    }

    return true;
  });

  const withAlt = matches.map((row) => {
    const key = row["Model No."] + "|" + row["Item Code"];
    const alt = altOf.get(key) || mainOf.get(key) || "";

    return { ...row, __alt: alt };
  });

  return withAlt.slice(0, limit);
}

module.exports = { loadBomFiles, searchBom, searchBomList, searchModels, getRowsByModel, getLibrarySummary, deleteModel, searchItemOccurrences, getItemSuggestions, getDistinctValues, filterItems, addAlternateItem, getAlternateReport, getAltMainMap};