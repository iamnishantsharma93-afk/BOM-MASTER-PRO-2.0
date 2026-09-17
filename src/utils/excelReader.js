import * as XLSX from "xlsx/dist/xlsx.full.min.js";

// Parses a base64-encoded Excel file (used by the
// fast native Electron picker) into raw row objects
// from the first sheet, with the same multi-attempt
// fallback as readExcelFile.
function parseBase64Excel(base64) {
  let workbook = null;
  let lastErr = null;

  const attempts = [
    () => XLSX.read(base64, { type: "base64" }),
    () =>
      XLSX.read(base64, {
        type: "base64",
        codepage: 936,
      }),
  ];

  for (const attempt of attempts) {
    try {
      workbook = attempt();
      if (workbook && workbook.SheetNames.length) {
        break;
      }
    } catch (err) {
      lastErr = err;
      workbook = null;
    }
  }

  if (!workbook) {
    throw lastErr || new Error("Unknown read error");
  }

  const worksheet =
    workbook.Sheets[workbook.SheetNames[0]];

  return XLSX.utils.sheet_to_json(worksheet, {
    defval: "",
  });
}

// True when running inside the Electron shell with
// the native file-picker bridge available.
export function hasNativePicker() {
  return (
    typeof window !== "undefined" &&
    window.electronAPI &&
    window.electronAPI.isElectron
  );
}

// Opens the FAST native OS file dialog (via the
// Electron main process) instead of the slow HTML
// <input type="file"> dialog, and returns the raw
// rows for every selected file.
// Resolves to [] if the user cancels.
export async function pickExcelFilesNative(multi) {
  const files = await window.electronAPI.selectExcelFiles(
    multi
  );

  return files.map((f) => ({
    name: f.name,
    rawRows: parseBase64Excel(f.base64),
  }));
}

// Parses a base64 string into raw row objects
// (used for files read from the Master BOM
// library folder via Electron).
export function parseExcelBase64(base64) {
  return parseBase64Excel(base64);
}

// Reads an Excel file (xlsx or legacy xls, any
// codepage) and resolves with the raw row objects
// from the first sheet. Tries several strategies
// because legacy .xls files (old CJK codepages
// etc.) sometimes fail the default parse.
export function readExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const buf = e.target.result;
        let workbook = null;
        let lastErr = null;

        const attempts = [
          () => XLSX.read(buf, { type: "array" }),
          () =>
            XLSX.read(buf, {
              type: "array",
              codepage: 936,
            }),
          () =>
            XLSX.read(buf, {
              type: "array",
              raw: true,
            }),
          () => {
            const bytes = new Uint8Array(buf);
            let binary = "";
            for (let i = 0; i < bytes.length; i++) {
              binary += String.fromCharCode(bytes[i]);
            }
            return XLSX.read(binary, {
              type: "binary",
            });
          },
        ];

        for (const attempt of attempts) {
          try {
            workbook = attempt();
            if (workbook && workbook.SheetNames.length) {
              break;
            }
          } catch (err) {
            lastErr = err;
            workbook = null;
          }
        }

        if (!workbook) {
          throw lastErr || new Error("Unknown read error");
        }

        const worksheet =
          workbook.Sheets[workbook.SheetNames[0]];

        const rawRows = XLSX.utils.sheet_to_json(
          worksheet,
          { defval: "" }
        );

        resolve(rawRows);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () =>
      reject(
        new Error("Failed to read the file.")
      );

    reader.readAsArrayBuffer(file);
  });
}

// Exports one or more sheets to a single .xlsx
// file. `sheets` is an object of
// { "Sheet Name": [{col: val, ...}, ...] }.
export function exportWorkbook(sheets, filename) {
  const workbook = XLSX.utils.book_new();

  Object.entries(sheets).forEach(
    ([sheetName, rows]) => {
      const worksheet =
        XLSX.utils.json_to_sheet(rows);

      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        sheetName.slice(0, 31)
      );
    }
  );

  XLSX.writeFile(workbook, filename);
}
