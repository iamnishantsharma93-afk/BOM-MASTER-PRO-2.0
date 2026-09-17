import BomSearchSelect from "./BomSearchSelect.jsx";

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
  return (
    <section className="card">
      <h2>Upload BOM Files</h2>

      <div className="files">
        <div className="upload-column">
          <div
            className="upload"
            onClick={
              hasNativePicker()
                ? () => upload(1)
                : undefined
            }
          >
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
          </div>

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
          <div
            className="upload"
            onClick={
              hasNativePicker()
                ? () => upload(2)
                : undefined
            }
          >
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
          </div>

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