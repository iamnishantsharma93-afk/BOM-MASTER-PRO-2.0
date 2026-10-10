import { validateQuantity } from "./validator.js";

export const DEFAULT_CONFIG = {
  plant: "",
  usage: "",
  alternativeBom: "",
  itemCategory: "L",
  itemNumberIncrement: 10,
  uppercaseMaterial: false,
  preserveLeadingZeros: true,
  processOrder: "",
  mergeDuplicates: false,
};

const BULK_MATERIAL_BY_PROCESS = {
  AI: "1011",
  SMT: "1012",
  MI: "1013",
  ASSY: "1014",
};

export function cleanMaterialCode(rawValue, config = DEFAULT_CONFIG) {
  let value = String(rawValue ?? "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!config.preserveLeadingZeros && /^0+\d+$/.test(value)) {
    value = value.replace(/^0+/, "");
  }

  return config.uppercaseMaterial ? value.toUpperCase() : value;
}

export function formatItemNumber(sequenceIndex, increment = 10) {
  const number = (sequenceIndex + 1) * increment;
  return String(number).padStart(4, "0");
}

export function formatItemId(sequenceIndex) {
  return `A${String(sequenceIndex + 1).padStart(7, "0")}`;
}

export function formatAlternativeGroup(groupIndex) {
  if (groupIndex < 0 || groupIndex >= 260) {
    throw new Error("Alternative Item: Group limit exceeded. Maximum supported group is Z9.");
  }

  const letter = String.fromCharCode(65 + Math.floor(groupIndex / 10));
  const digit = groupIndex % 10;
  return `${letter}${digit}`;
}

export function splitLocation(rawValue, maxLen = 40) {
  const text = String(rawValue ?? "").trim();
  if (!text) return ["", "", ""];

  const tokens = text
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean);

  if (!tokens.length) return ["", "", ""];

  const cols = ["", "", ""];
  let col = 0;
  let current = "";

  const commit = (value) => {
    if (col >= 2) {
      cols[2] = cols[2] ? `${cols[2]},${value}` : value;
      return;
    }
    cols[col] = value;
    col += 1;
  };

  tokens.forEach((token) => {
    const candidate = current ? `${current},${token}` : token;

    if (current && col < 2 && candidate.length > maxLen) {
      commit(current);
      current = token;
    } else {
      current = candidate;
    }
  });

  if (current) commit(current);

  return [cols[0], cols[1], cols[2]];
}

export function groupRowsByFinishedGood(rows, finishedGoodColumn) {
  const groups = new Map();

  rows.forEach((row, index) => {
    const rawKey = finishedGoodColumn ? row[finishedGoodColumn] : "";
    const key = String(rawKey ?? "").trim() || "UNASSIGNED";

    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ row, sourceRow: index + 1 });
  });

  return groups;
}

function getMainAltType(row, columnMap) {
  if (!columnMap.mainAlt) return "";
  return String(row[columnMap.mainAlt] ?? "").trim().toLowerCase();
}

function buildAlternativeGroups(entries, columnMap, startIndex) {
  let groupIndex = startIndex;
  const result = [];
  let currentMain = null;
  let pendingAlts = [];

  const flushGroup = () => {
    if (!currentMain) return;

    const hasAlternates = pendingAlts.length > 0;
    let group = "";
    let rank = "";
    let strategy = "";

    if (hasAlternates) {
      group = formatAlternativeGroup(groupIndex);
      groupIndex += 1;
      rank = "1";
      strategy = "1";
    }

    result.push({
      ...currentMain,
      alternativeGroup: group,
      alternativeType: "main",
      alternativeRank: rank,
      alternativeStrategy: strategy,
      usageProbability: hasAlternates ? "100" : "",
    });

    pendingAlts.forEach((altEntry) => {
      result.push({
        ...altEntry,
        alternativeGroup: group,
        alternativeType: "alt",
        alternativeRank: rank,
        alternativeStrategy: strategy,
        usageProbability: hasAlternates ? "0" : "",
      });
    });

    currentMain = null;
    pendingAlts = [];
  };

  entries.forEach((entry) => {
    const type = getMainAltType(entry.row, columnMap);

    if (type.startsWith("main")) {
      flushGroup();
      currentMain = entry;
    } else if (type.startsWith("alt")) {
      if (currentMain) {
        pendingAlts.push(entry);
      } else {
        result.push({
          ...entry,
          alternativeGroup: "",
          alternativeType: "alt",
          alternativeRank: "",
          alternativeStrategy: "",
          usageProbability: "",
        });
      }
    } else {
      result.push({
        ...entry,
        alternativeGroup: "",
        alternativeType: "",
        alternativeRank: "",
        alternativeStrategy: "",
        usageProbability: "",
      });
    }
  });

  flushGroup();

  return { entries: result, nextGroupIndex: groupIndex };
}

function normalizeProcess(rawValue) {
  return String(rawValue ?? "").trim().toUpperCase();
}

function getModelNumber(finishedGood, process, config) {
  const model = cleanMaterialCode(finishedGood, config);
  const normalizedProcess = normalizeProcess(process);

  if (normalizedProcess === "ASSY") return model;

  const suffix = normalizedProcess.slice(0, 2);
  return suffix ? `${model}${suffix}` : model;
}

function getBulkMaterialIndicator(process) {
  const normalizedProcess = normalizeProcess(process);
  return BULK_MATERIAL_BY_PROCESS[normalizedProcess] || "";
}

function buildSapRow(
  finishedGood,
  entry,
  columnMap,
  itemNumber,
  itemId,
  config
) {
  const row = entry.row;
  const process = columnMap.process ? row[columnMap.process] : "";
  const componentRaw = columnMap.component ? row[columnMap.component] : "";
  const quantityRaw = columnMap.quantity ? row[columnMap.quantity] : "";
  const uomRaw = columnMap.uom ? row[columnMap.uom] : "";
  const locationRaw = columnMap.location ? row[columnMap.location] : "";
  const quantityResult = validateQuantity(quantityRaw);
  const [loc1, loc2, loc3] = splitLocation(locationRaw);

  return {
    Material: getModelNumber(finishedGood, process, config),
    Plant: config.plant,
    Usage: config.usage,
    "Alternative BOM": config.alternativeBom,
    "Item ID": itemId,
    Indicator: "",
    "Item Number": itemNumber,
    "Item Category": config.itemCategory,
    Component: cleanMaterialCode(componentRaw, config),
    "Blank 01": "",
    "Blank 02": "",
    "Component Quantity": quantityResult.valid ? quantityResult.value : quantityRaw,
    UOM: String(uomRaw ?? "").trim(),
    "Blank 03": "",
    "Blank 04": "",
    "Blank 05": "",
    "Blank 06": "",
    "Blank 07": "",
    "Blank 08": "",
    "Blank 09": "",
    "Blank 10": "",
    "Alternative Item: Group": entry.alternativeGroup,
    "Alternative Item: Ranking Order": entry.alternativeRank ?? "",
    "Alternative Item: Strategy": entry.alternativeStrategy ?? "",
    "Alternative Item: Usage Probability": entry.usageProbability ?? "",
    "Blank 13": "",
    "Blank 14": "",
    "Blank 15": "",
    "Blank 16": "",
    "Blank 17": "",
    "LOCATION": loc1,
    "Location 2": loc2,
    "Location 3": loc3,
    "Blank 21": "",
    "Blank 22": "",
    "Blank 23": "",
    "Blank 24": "",
    "Blank 25": "",
    "Blank 26": "",
    "Blank 27": "",
    "Indicator: Bulk Material": getBulkMaterialIndicator(process),
    "Source Row": entry.sourceRow,
  };
}

export function mergeDuplicateComponents(rows) {
  const merged = new Map();
  const order = [];

  rows.forEach((row) => {
    const key = `${row.Material}__${row.Component}__${row["Alternative Item: Group"]}__${row["Alternative Item: Usage Probability"]}`;

    if (!merged.has(key)) {
      merged.set(key, { ...row });
      order.push(key);
      return;
    }

    const existing = merged.get(key);
    const existingQty = Number(existing["Component Quantity"]);
    const addedQty = Number(row["Component Quantity"]);

    if (!Number.isNaN(existingQty) && !Number.isNaN(addedQty)) {
      existing["Component Quantity"] = existingQty + addedQty;
    }
  });

  return order.map((key) => merged.get(key));
}

// Default SAP BOM header Base Quantity. Every material's item quantities
// are scaled relative to this value; if an EA item still has a decimal
// quantity at 1000, the base is escalated to the next power of ten that
// makes every EA quantity a whole number.
const DEFAULT_BASE_QUANTITY = 1000;

// Counts the decimal places of a numeric value, e.g. 0.05 -> 2, 0.025 -> 3.
function countDecimalPlaces(value) {
  const str = String(value);
  const dot = str.indexOf(".");

  return dot < 0 ? 0 : str.length - dot - 1;
}

// Per-material Base Quantity: SAP does not accept decimal quantities for
// the EA base unit. Every material defaults to 1000; when any EA item has
// a decimal quantity that is still fractional at the current base, the
// base escalates to 10^(max decimal places) so every EA quantity in that
// material becomes a whole number (e.g. 0.0005 -> base 10000 -> 5).
function computeBaseQuantities(rows) {
  const bases = new Map();

  rows.forEach((row) => {
    const material = row.Material ?? "";
    if (!bases.has(material)) bases.set(material, DEFAULT_BASE_QUANTITY);
  });

  rows.forEach((row) => {
    if (String(row.UOM ?? "").trim().toUpperCase() !== "EA") return;

    const qty = Number(row["Component Quantity"]);

    if (Number.isNaN(qty) || !Number.isFinite(qty) || qty <= 0) return;

    const places = countDecimalPlaces(qty);
    if (places <= 0) return;

    const current = bases.get(row.Material) ?? DEFAULT_BASE_QUANTITY;
    const required = Math.max(current, 10 ** places);

    bases.set(row.Material, required);
  });

  return bases;
}

// Applies the per-material Base Quantity to all items of a material:
// EA items become whole numbers, every other UOM is scaled by the same
// factor (SAP interprets all item quantities relative to the header Base
// Quantity). Rows carry a hidden `_baseQty` for the BOM Header export.
function applyBaseQuantities(rows) {
  const baseByMaterial = computeBaseQuantities(rows);

  return rows.map((row) => {
    const base = baseByMaterial.get(row.Material) ?? 1;
    const qty = row["Component Quantity"];
    let newQty = qty;

    if (base > 1 && typeof qty === "number" && Number.isFinite(qty)) {
      const scaled = qty * base;
      newQty =
        String(row.UOM ?? "").trim().toUpperCase() === "EA"
          ? Math.round(scaled)
          : Number(scaled.toFixed(6));
    }

    return { ...row, "Component Quantity": newQty, _baseQty: base };
  });
}

function parseProcessOrder(raw) {
  if (!raw) return [];
  return String(raw)
    .split(",")
    .map((token) => token.trim().toUpperCase())
    .filter(Boolean);
}

function orderMaterials(byMaterial, processOrderRaw) {
  const orderList = parseProcessOrder(processOrderRaw);
  const buckets = [...byMaterial.entries()].map(([material, info]) => ({
    material,
    ...info,
  }));

  if (!orderList.length) return buckets;

  const rankOf = (bucket) => {
    const process = normalizeProcess(bucket.process);
    const token = process === "ASSY" ? "ASSY" : process.slice(0, 2);
    let rank = orderList.indexOf(token);
    if (rank < 0 && process) rank = orderList.indexOf(process);
    return rank;
  };

  return buckets
    .map((bucket, idx) => ({ bucket, idx, rank: rankOf(bucket) }))
    .sort((a, b) => {
      const ra = a.rank < 0 ? Number.MAX_SAFE_INTEGER : a.rank;
      const rb = b.rank < 0 ? Number.MAX_SAFE_INTEGER : b.rank;
      return ra - rb || a.idx - b.idx;
    })
    .map((item) => item.bucket);
}

export function generateSapRows(customerRows, columnMap, configOverrides = {}) {
  const config = { ...DEFAULT_CONFIG, ...configOverrides };
  const groups = groupRowsByFinishedGood(customerRows, columnMap.finishedGood);

  let rows = [];

  groups.forEach((entries, finishedGood) => {
    const byMaterial = new Map();

    entries.forEach((entry) => {
      const process = columnMap.process ? entry.row[columnMap.process] : "";
      const material = getModelNumber(finishedGood, process, config);

      if (!byMaterial.has(material)) {
        byMaterial.set(material, { process, entries: [] });
      }
      byMaterial.get(material).entries.push(entry);
    });

    orderMaterials(byMaterial, config.processOrder).forEach(
      ({ entries: materialEntries }) => {
        const grouped = buildAlternativeGroups(
          materialEntries,
          columnMap,
          0
        );

        grouped.entries.forEach((entry, index) => {
          rows.push(
            buildSapRow(
              finishedGood,
              entry,
              columnMap,
              formatItemNumber(index, config.itemNumberIncrement),
              formatItemId(index),
              config
            )
          );
        });
      }
    );
  });

  if (config.mergeDuplicates) {
    const mergedRows = mergeDuplicateComponents(rows);
    const renumbered = [];
    const perMaterial = new Map();

    mergedRows.forEach((row) => {
      const index = perMaterial.get(row.Material) ?? 0;
      perMaterial.set(row.Material, index + 1);

      renumbered.push({
        ...row,
        "Item ID": formatItemId(index),
        "Item Number": formatItemNumber(index, config.itemNumberIncrement),
      });
    });

    rows = renumbered;
  }

  // EA decimal -> whole number conversion (per material, see applyBaseQuantities).
  rows = applyBaseQuantities(rows);

  return { rows };
}
