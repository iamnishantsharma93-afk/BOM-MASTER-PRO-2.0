import { validateQuantity } from "./validator.js";

export const DEFAULT_CONFIG = {
  plant: "",
  usage: "",
  alternativeBom: "",
  itemCategory: "L",
  itemNumberIncrement: 10,
  uppercaseMaterial: false,
  preserveLeadingZeros: true,
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
  let currentGroup = "";
  let groupIndex = startIndex;
  let hasMain = false;

  const result = entries.map((entry) => {
    const type = getMainAltType(entry.row, columnMap);

    if (type.startsWith("main")) {
      currentGroup = formatAlternativeGroup(groupIndex);
      groupIndex += 1;
      hasMain = true;
    } else if (type.startsWith("alt") && !hasMain) {
      currentGroup = "";
    }

    return {
      ...entry,
      alternativeGroup: currentGroup,
      alternativeType: type.startsWith("alt")
        ? "alt"
        : type.startsWith("main")
          ? "main"
          : "",
    };
  });

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
  const usageProbability =
    entry.alternativeType === "main"
      ? 100
      : entry.alternativeType === "alt"
        ? 0
        : "";

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
    "Blank 11": "",
    "Blank 12": "",
    "Alternative Item: Usage Probability": usageProbability,
    "Blank 13": "",
    "Blank 14": "",
    "Blank 15": "",
    "Blank 16": "",
    "Blank 17": "",
    "LOCATION": String(locationRaw ?? "").trim(),
    "Blank 19": "",
    "Blank 20": "",
    "Blank 21": "",
    "Blank 22": "",
    "Blank 23": "",
    "Blank 24": "",
    "Blank 25": "",
    "Blank 26": "",
    "Blank 27": "",
    "Indicator: Bulk Material": getBulkMaterialIndicator(process),
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

export function generateSapRows(customerRows, columnMap, configOverrides = {}) {
  const config = { ...DEFAULT_CONFIG, ...configOverrides };
  const groups = groupRowsByFinishedGood(customerRows, columnMap.finishedGood);

  let rows = [];
  let globalItemIndex = 0;
  let alternativeGroupIndex = 0;

  groups.forEach((entries, finishedGood) => {
    const grouped = buildAlternativeGroups(entries, columnMap, alternativeGroupIndex);
    alternativeGroupIndex = grouped.nextGroupIndex;

    grouped.entries.forEach((entry, index) => {
      rows.push(
        buildSapRow(
          finishedGood,
          entry,
          columnMap,
          formatItemNumber(index, config.itemNumberIncrement),
          formatItemId(globalItemIndex),
          config
        )
      );
      globalItemIndex += 1;
    });
  });

  if (config.mergeDuplicates) {
    rows = mergeDuplicateComponents(rows).map((row, index) => ({
      ...row,
      "Item ID": formatItemId(index),
    }));
  }

  return { rows };
}
