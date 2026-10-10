import BomSearchSelect from "./BomSearchSelect.jsx";
import DropZone from "./DropZone.jsx";
import Icon from "./Icon.jsx";

export default function UploadPanel({
  file1,
  file2,
  upload,
  uploadFallback,
  hasNativePicker,
  selectFromDatabase,
  resetKey,
  removeFile,
}) {
  // Dropped files reuse the same "fallback" reader path
  // (File objects are parsed in the renderer) — works in
  // both Electron and plain-browser environments.
  const handleDropFiles = (number, files) => {
    if (!files.length) return;
    uploadFallback(number, { target: { files, value: "" } });
  };

  return (
    <section className="card">
      <h2>Upload BOM Files</h2>

      <div className="files">
        <div className="upload-column">
          <DropZone
            className="upload"
            onClick={
              hasNativePicker()
                ? () => upload(1)
                : undefined
            }
            onFiles={(files) => handleDropFiles(1, files)}
          >
            <span className="upload-icon"><Icon name="upload" size={18} /></span>
            <strong>File 1</strong>

            <span style={file1 ? { color: "#16a34a", fontWeight: 600 } : undefined}>
              {file1?.name
                ? "✔ " + file1.name + " uploaded"
                : "Choose Previous / Base BOM"}
            </span>

            {file1 && (
              <button
                className="clear"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(1);
                }}
              >
                Remove
              </button>
            )}

            {!hasNativePicker() && (
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) =>
                  uploadFallback(1, e)
                }
              />
            )}
          </DropZone>

          <p className="hint" style={{ margin: "8px 0 4px" }}>
            Or search from AI database:
          </p>

          <BomSearchSelect
            key={"f1-" + resetKey}
            onSelectModel={(model) =>
              selectFromDatabase(1, model)
            }
          />
        </div>

        <div className="upload-column">
          <DropZone
            className="upload"
            onClick={
              hasNativePicker()
                ? () => upload(2)
                : undefined
            }
            onFiles={(files) => handleDropFiles(2, files)}
          >
            <span className="upload-icon"><Icon name="upload" size={18} /></span>
            <strong>File 2</strong>

            <span style={file2 ? { color: "#16a34a", fontWeight: 600 } : undefined}>
              {file2?.name
                ? "✔ " + file2.name + " uploaded"
                : "Choose New / Updated BOM"}
            </span>

            {file2 && (
              <button
                className="clear"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(2);
                }}
              >
                Remove
              </button>
            )}
            {!hasNativePicker() && (
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) =>
                  uploadFallback(2, e)
                }
              />
            )}
          </DropZone>

          <p className="hint" style={{ margin: "8px 0 4px" }}>
            Or search from AI database:
          </p>

          <BomSearchSelect
            key={"f2-" + resetKey}
            onSelectModel={(model) =>
              selectFromDatabase(2, model)
            }
          />
        </div>
      </div>
    </section>
  );
}