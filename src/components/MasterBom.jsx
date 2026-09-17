import { useState } from "react";
import BomLibraryFilter from "./BomLibraryFilter.jsx";

export default function MasterBom({
  hasNativePicker,
  addMasterFile,
  addMasterFileFallback,
  bomLibrary,
  libraryModels,
  libraryFilterMode,
  setLibraryFilterMode,
  libraryContainsQuery,
  setLibraryContainsQuery,
  libraryIsOneOfSelected,
  setLibraryIsOneOfSelected,
  filteredLibrary,
  removeFromLibrary,
  isAdmin,
  buildMasterBOM,
  exportMasterBOM,
  clearMasterBom,
  builtFiles,
  masterBOM,
  masterSearch,
  setMasterSearch,
  selectedPart,
  setSelectedPart,
  searchMatches,
  exportPartDetails,
}) {
  const [showModal, setShowModal] = useState(false);

  const totalPartsInLibrary = bomLibrary.reduce(
    (sum, b) => sum + (b.count || 0),
    0
  );

  const handleBuild = async () => {
    if (!filteredLibrary.length) {
      buildMasterBOM();
      return;
    }

    await buildMasterBOM();
    setShowModal(true);
  };

  return (
    <div className="master-bom-page">
      <div className="master-bom-layout">
        <aside className="card master-bom-side">
          <BomLibraryFilter
            label={`📚 BOM Library (${bomLibrary.length})`}
            models={libraryModels}
            mode={libraryFilterMode}
            setMode={setLibraryFilterMode}
            containsQuery={libraryContainsQuery}
            setContainsQuery={setLibraryContainsQuery}
            isOneOfSelected={libraryIsOneOfSelected}
            setIsOneOfSelected={setLibraryIsOneOfSelected}
          />

          <div className="master-bom-list">
            {filteredLibrary.length === 0 ? (
              <p className="hint">
                No BOM files match. Add a file or clear the filter.
              </p>
            ) : (
              filteredLibrary.map((b) => (
                <div className="master-bom-list-item" key={b.id}>
                  <div>
                    <b>{b.model}</b>
                    <span>{b.count} parts</span>
                  </div>

                  {isAdmin && (
                    <button
                      className="clear"
                      onClick={() => removeFromLibrary(b.model)}
                    >
                      Delete
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </aside>

        <div className="master-bom-main">
          <div className="master-bom-stats">
            <div className="stat">
              <span>Filtered Models</span>
              <strong>{filteredLibrary.length}</strong>
            </div>

            <div className="stat">
              <span>Parts in Library</span>
              <strong>{totalPartsInLibrary}</strong>
            </div>

            <div className="stat">
              <span>Master BOM Parts</span>
              <strong>{masterBOM.length}</strong>
            </div>
          </div>

          <div className="actions">
            <button className="primary" onClick={handleBuild}>
              ⚙️ Build Master BOM
            </button>

            {masterBOM.length > 0 && (
              <button onClick={() => setShowModal(true)}>
                View Last Master BOM
              </button>
            )}

            <div
              className="master-bom-add-btn"
              onClick={
                hasNativePicker()
                  ? addMasterFile
                  : undefined
              }
            >
              <strong>+ Add BOM File(s)</strong>

              {!hasNativePicker() && (
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  multiple
                  onChange={addMasterFileFallback}
                />
              )}
            </div>
          </div>


          <p className="hint" style={{ marginTop: 14 }}>
            Filter the library on the left and click "Build Master BOM" — the result opens in a window with an export option.
          </p>
        </div>
      </div>

      {showModal && masterBOM.length > 0 && (
        <div
          className="master-bom-modal-overlay"
          onClick={() => setShowModal(false)}
        >
          <div
            className="master-bom-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="master-bom-modal-head">
              <div>
                <h2 style={{ margin: 0 }}>BOM Master</h2>
                <p className="hint" style={{ margin: "4px 0 0" }}>
                  {masterBOM.length} unique Part Numbers from{" "}
                  {builtFiles.length} BOM
                  {builtFiles.length > 1 ? "s" : ""}
                </p>
              </div>

              <div className="actions" style={{ margin: 0 }}>
                <button className="primary" onClick={exportMasterBOM}>
                  Export Full Master BOM
                </button>

                {isAdmin && (
                  <button
                    className="clear"
                    onClick={() => {
                      clearMasterBom();
                      setShowModal(false);
                    }}
                  >
                    Clear Master BOM
                  </button>
                )}

                <button
                  className="clear"
                  onClick={() => setShowModal(false)}
                >
                  Close
                </button>
              </div>
            </div>

            <div className="toolbar">
              <div>
                <h3>🔍 Search a Part</h3>

                <p>
                  Search by Part Number or Item Name to see full BOM-wise details
                </p>
              </div>

              <input
                className="search"
                placeholder="Enter Part Number or Item Name..."
                value={masterSearch}
                onChange={(e) => {
                  setMasterSearch(e.target.value);
                  setSelectedPart(null);
                }}
              />
            </div>

            {masterSearch.trim() !== "" && !selectedPart && (
              <div className="search-results">
                {searchMatches.length === 0 ? (
                  <p className="hint">
                    No part found matching "{masterSearch}".
                  </p>
                ) : (
                  searchMatches.map((item) => (
                    <div
                      className="search-result-row"
                      key={item.id}
                      onClick={() => setSelectedPart(item)}
                    >
                      <b>{item.partNo}</b>
                      <span>{item.itemName}</span>
                      <span className="badge-small">
                        {item.relatedLabel}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}

            {selectedPart && (
              <div className="part-detail-card">
                <div className="part-detail-head">
                  <div>
                    <h3>{selectedPart.partNo}</h3>
                    <p>{selectedPart.itemName}</p>
                    <p>
                      Used in{" "}
                      {
                        new Set(
                          selectedPart.usage.map((u) => u.fileId)
                        ).size
                      }{" "}
                      BOM
                      {new Set(selectedPart.usage.map((u) => u.fileId)).size > 1
                        ? "s"
                        : ""}
                    </p>
                  </div>

                  <div className="part-detail-actions">
                    <button onClick={() => exportPartDetails(selectedPart)}>
                      Download Details
                    </button>

                    <button
                      className="clear"
                      onClick={() => {
                        setSelectedPart(null);
                        setMasterSearch("");
                      }}
                    >
                      Close
                    </button>
                  </div>
                </div>

                <div className="tablewrap">
                  <table>
                    <thead>
                      <tr>
                        <th>BOM / Model</th>
                        <th>QPS</th>
                        <th>UOM</th>
                        <th className="location-cell">Location</th>
                        <th>Main/Alt</th>
                        <th>Alt Parts / Main Part</th>
                      </tr>
                    </thead>

                    <tbody>
                      {selectedPart.usage.map((u, i) => (
                        <tr key={i}>
                          <td>{u.bomName}</td>
                          <td>{u.qps}</td>
                          <td>{u.uom}</td>
                          <td className="location-cell">{u.location}</td>
                          <td>{u.mainAlt}</td>
                          <td>
                            {u.rowAltParts.length > 0
                              ? `Alt: ${u.rowAltParts.join(", ")}`
                              : u.rowMainPart
                              ? `Main: ${u.rowMainPart}`
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <hr />

            <div className="tablewrap">
              <table>
                <thead>
                  <tr>
                    <th>Part Number</th>
                    <th>Item Name</th>
                    <th>Maker</th>
                    <th>Main/Alt Relation</th>

                    {builtFiles.map((mf) => (
                      <th key={mf.id}>QPS {mf.model}</th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {masterBOM.map((item) => (
                    <tr
                      key={item.id}
                      className="clickable-row"
                      onClick={() => {
                        setSelectedPart(item);
                        setMasterSearch(item.partNo);
                      }}
                    >
                      <td>
                        <b>{item.partNo}</b>
                      </td>
                      <td>{item.itemName}</td>
                      <td>{item.maker}</td>
                      <td>{item.relatedLabel}</td>

                      {builtFiles.map((mf) => {
                        const usageRow = item.usage.find(
                          (u) => u.fileId === mf.id
                        );

                        return (
                          <td key={mf.id}>
                            {usageRow ? usageRow.qps : "0"}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
