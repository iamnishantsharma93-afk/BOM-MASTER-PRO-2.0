import * as XLSX from "xlsx/dist/xlsx.full.min.js";

export const SAP_FIELDS = [
  { key: "Material", header: "Material" },
  { key: "Plant", header: "Plant" },
  { key: "Usage", header: "Usage" },
  { key: "Alternative BOM", header: "Alternative BOM" },
  { key: "Item ID", header: "Item ID" },
  { key: "Indicator", header: "Indicator" },
  { key: "Item Number", header: "Item Number" },
  { key: "Item Category", header: "Item Category" },
  { key: "Component", header: "Component" },
  { key: "Blank 01", header: "" },
  { key: "Blank 02", header: "" },
  { key: "Component Quantity", header: "Component Quantity" },
  { key: "UOM", header: "UOM" },
  { key: "Blank 03", header: "" },
  { key: "Blank 04", header: "" },
  { key: "Blank 05", header: "" },
  { key: "Blank 06", header: "" },
  { key: "Blank 07", header: "" },
  { key: "Blank 08", header: "" },
  { key: "Blank 09", header: "" },
  { key: "Blank 10", header: "" },
  { key: "Alternative Item: Group", header: "Alternative Item: Group" },
  { key: "Blank 11", header: "" },
  { key: "Blank 12", header: "" },
  { key: "Alternative Item: Usage Probability", header: "Alternative Item: Usage Probability" },
  { key: "Blank 13", header: "" },
  { key: "Blank 14", header: "" },
  { key: "Blank 15", header: "" },
  { key: "Blank 16", header: "" },
  { key: "Blank 17", header: "" },
  { key: "LOCATION", header: "LOCATION" },
  { key: "Blank 19", header: "" },
  { key: "Blank 20", header: "" },
  { key: "Blank 21", header: "" },
  { key: "Blank 22", header: "" },
  { key: "Blank 23", header: "" },
  { key: "Blank 24", header: "" },
  { key: "Blank 25", header: "" },
  { key: "Blank 26", header: "" },
  { key: "Blank 27", header: "" },
  { key: "Indicator: Bulk Material", header: "Indicator: Bulk Material" },
];

export const SAP_COLUMNS = SAP_FIELDS.map((field) => field.header);

export function toExportMatrix(sapRows) {
  return [
    SAP_FIELDS.map((field) => field.header),
    ...sapRows.map((row) => SAP_FIELDS.map((field) => row[field.key] ?? "")),
  ];
}

export function toExportRows(sapRows) {
  return sapRows.map((row) =>
    Object.fromEntries(
      SAP_FIELDS.map((field) => [field.key, row[field.key] ?? ""])
    )
  );
}

export function exportSapWorkbook(sapRows, filename) {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(toExportMatrix(sapRows));

  worksheet["!autofilter"] = {
    ref: XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: Math.max(sapRows.length, 1), c: SAP_FIELDS.length - 1 },
    }),
  };

  worksheet["!freeze"] = { xSplit: 0, ySplit: 1 };
  worksheet["!cols"] = SAP_FIELDS.map((field) => ({
    wch: field.header ? Math.max(field.header.length + 2, 12) : 4,
  }));

  XLSX.utils.book_append_sheet(workbook, worksheet, "SAP BOM");
  XLSX.writeFile(workbook, filename);
}
