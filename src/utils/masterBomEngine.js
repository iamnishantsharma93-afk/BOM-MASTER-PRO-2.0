// =========================================================
// SHARED HELPERS
// =========================================================
export const norm = (value) =>
  String(value ?? "")
    .trim()
    .toUpperCase();

export function findCol(columns, aliases) {
  const clean = (s) => String(s).trim().toLowerCase();

  for (const alias of aliases) {
    const found = columns.find(
      (c) => clean(c) === clean(alias)
    );

    if (found) return found;
  }

  return null;
}

// =========================================================
// PARSE ONE UPLOADED FILE (fixed BOM format,
// columns auto-detected)
// =========================================================
export function parseBomRows(rawRows, fallbackName) {
  if (!rawRows.length) {
    throw new Error("This file has no data rows.");
  }

  const columns = Object.keys(rawRows[0]);

  const colPartNo = findCol(columns, [
    "Part No",
    "Part Number",
    "PartNo",
  ]);

  if (!colPartNo) {
    throw new Error(
      'This file does not have a "Part No" column. Please check the file format and try again.'
    );
  }

  const colItemName = findCol(columns, [
    "Item Name",
    "Part Name",
  ]);

  const colItemSpec = findCol(columns, [
    "Item Spec",
    "Spec",
    "Specification",
  ]);

  const colQps = findCol(columns, ["QPS"]);
  const colUom = findCol(columns, ["UOM", "Unit"]);
  const colLocation = findCol(columns, ["Location"]);
  const colMaker = findCol(columns, ["Maker", "Make"]);
  const colModel = findCol(columns, ["Model"]);

  const colMainAlt = findCol(columns, [
    "Main/Alt",
    "Main / Alt",
    "MainAlt",
  ]);

  const modelValue =
    colModel && rawRows[0][colModel]
      ? String(rawRows[0][colModel]).trim()
      : fallbackName;

  const rows = rawRows
    .map((row) => ({
      partNo: norm(row[colPartNo]),
      itemName: colItemName ? row[colItemName] : "",
      itemSpec: colItemSpec ? row[colItemSpec] : "",
      qps: colQps ? row[colQps] : "",
      uom: colUom ? row[colUom] : "",
      location: colLocation ? row[colLocation] : "",
      maker: colMaker ? row[colMaker] : "",
      mainAlt: colMainAlt ? row[colMainAlt] : "",
    }))
    .filter((r) => r.partNo);

  return { model: modelValue, rows };
}

// =========================================================
// BUILD MASTER BOM FROM ALL UPLOADED FILES
// =========================================================
export function buildMasterBom(masterFiles) {
  const masterMap = new Map();

  // Nearest-Main-above relationship, per file
  // (row order defines it), then unioned across
  // all files.
  const mainToAlts = new Map();
  const altToMains = new Map();

  // Same, but scoped per file — used to show the
  // relation as it exists in that specific BOM.
  const fileMainToAlts = new Map();
  const fileAltToMain = new Map();

  masterFiles.forEach((file) => {
    let currentMain = null;

    fileMainToAlts.set(file.id, new Map());
    fileAltToMain.set(file.id, new Map());

    const localMainToAlts = fileMainToAlts.get(
      file.id
    );

    const localAltToMain = fileAltToMain.get(
      file.id
    );

    file.rows.forEach((r) => {
      const type = String(r.mainAlt || "")
        .trim()
        .toLowerCase();

      if (type.startsWith("main")) {
        currentMain = r.partNo;
      } else if (type.startsWith("alt") && currentMain) {
        if (!mainToAlts.has(currentMain)) {
          mainToAlts.set(currentMain, new Set());
        }

        mainToAlts.get(currentMain).add(r.partNo);

        if (!altToMains.has(r.partNo)) {
          altToMains.set(r.partNo, new Set());
        }

        altToMains.get(r.partNo).add(currentMain);

        if (!localMainToAlts.has(currentMain)) {
          localMainToAlts.set(
            currentMain,
            new Set()
          );
        }

        localMainToAlts.get(currentMain).add(r.partNo);
        localAltToMain.set(r.partNo, currentMain);
      }
    });
  });

  masterFiles.forEach((file) => {
    file.rows.forEach((r) => {
      const existing = masterMap.get(r.partNo) || {
        partNo: r.partNo,
        itemName: "",
        itemSpec: "",
        maker: "",
        usage: [],
      };

      if (!existing.itemName && r.itemName) {
        existing.itemName = r.itemName;
      }

      if (!existing.itemSpec && r.itemSpec) {
        existing.itemSpec = r.itemSpec;
      }

      if (!existing.maker && r.maker) {
        existing.maker = r.maker;
      }

      const rowType = String(r.mainAlt || "")
        .trim()
        .toLowerCase();

      let rowAltParts = [];
      let rowMainPart = "";

      if (rowType.startsWith("main")) {
        const s = fileMainToAlts
          .get(file.id)
          .get(r.partNo);

        rowAltParts = s ? [...s] : [];
      } else if (rowType.startsWith("alt")) {
        rowMainPart =
          fileAltToMain.get(file.id).get(r.partNo) ||
          "";
      }

      existing.usage.push({
        fileId: file.id,
        bomName: file.model,
        fileName: file.name,
        qps: r.qps || "0",
        uom: r.uom || "",
        location: r.location || "",
        mainAlt: r.mainAlt || "",
        rowAltParts,
        rowMainPart,
      });

      masterMap.set(r.partNo, existing);
    });
  });

  const finalMaster = [...masterMap.values()].map(
    (item, index) => {
      const alts = mainToAlts.get(item.partNo);
      const mains = altToMains.get(item.partNo);
      const siblingAlts = new Set();

      if (mains && mains.size) {
        mains.forEach((m) => {
          const altsOfMain = mainToAlts.get(m);

          if (altsOfMain) {
            altsOfMain.forEach((a) => {
              if (a !== item.partNo) {
                siblingAlts.add(a);
              }
            });
          }
        });
      }

      const relatedLabel = [];

      if (alts && alts.size) {
        relatedLabel.push(
          `Alt: ${[...alts].join(", ")}`
        );
      }

      if (mains && mains.size) {
        relatedLabel.push(
          `Main: ${[...mains].join(", ")}`
        );
      }

      if (siblingAlts.size) {
        relatedLabel.push(
          `Other Alt: ${[...siblingAlts].join(", ")}`
        );
      }

      return {
        ...item,
        id: index + 1,
        altParts: alts ? [...alts] : [],
        mainParts: mains ? [...mains] : [],
        siblingAlts: [...siblingAlts],
        relatedLabel: relatedLabel.join(" | ") || "—",
      };
    }
  );

  return finalMaster;
}

// =========================================================
// EXPORT SHEETS — standard report layout
// =========================================================

// Sheet 1: one row per PART, one QPS + Location
// column pair per BOM — the "at a glance" view.
export function buildSummarySheet(masterBOM, masterFiles) {
  return masterBOM.map((item) => {
    const row = {
      "Part Number": item.partNo,
      "Item Name": item.itemName,
      "Item Spec": item.itemSpec,
      Maker: item.maker,
      "Alt Parts": item.altParts.join(", "),
      "Main Part": item.mainParts.join(", "),
    };

    masterFiles.forEach((mf) => {
      const usageRow = item.usage.find(
        (u) => u.fileId === mf.id
      );

      row[`QPS ${mf.model}`] = usageRow
        ? usageRow.qps
        : "0";

      row[`Location ${mf.model}`] = usageRow
        ? usageRow.location
        : "";
    });

    return row;
  });
}

// Sheet 2: one row per PART-per-BOM usage — the
// full raw detail, useful for filtering/pivoting.
export function buildFullUsageSheet(masterBOM) {
  const rows = [];

  masterBOM.forEach((item) => {
    item.usage.forEach((u) => {
      rows.push({
        "Part Number": item.partNo,
        "Item Name": item.itemName,
        "Item Spec": item.itemSpec,
        Maker: item.maker,
        "BOM / Model": u.bomName,
        "Source File": u.fileName,
        QPS: u.qps,
        UOM: u.uom,
        Location: u.location,
        "Main/Alt": u.mainAlt,
        "Alt Parts (this BOM)":
          u.rowAltParts.join(", "),
        "Main Part (this BOM)": u.rowMainPart,
      });
    });
  });

  return rows;
}

// Single-part export (from the Search card).
export function buildPartDetailSheet(item) {
  return item.usage.map((u) => ({
    "Part Number": item.partNo,
    "Item Name": item.itemName,
    "Item Spec": item.itemSpec,
    Maker: item.maker,
    "Alt Parts": item.altParts.join(", "),
    "Main Part": item.mainParts.join(", "),
    "BOM / Model": u.bomName,
    QPS: u.qps,
    UOM: u.uom,
    Location: u.location,
    "Main/Alt": u.mainAlt,
    "Alt Parts (this BOM)": u.rowAltParts.join(", "),
    "Main Part (this BOM)": u.rowMainPart,
  }));
}
