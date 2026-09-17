export default function ResultTable({
  results,
  counts,
  filter,
  setFilter,
  search,
  setSearch,
  filtered,
  changed,
  exportRows,
  PARAMS,
  selectedAdditional,
}) {
  const cell = (
    value,
    changed,
    extraClass = ""
  ) => (
    <td
      className={`${changed ? "changed-cell" : ""} ${extraClass}`}
    >
      {value}
    </td>
  );

  return (
    <>
        {results.length >
          0 && (
          <>
            <section className="card">
              <h2>
                03. Difference
                Summary Dashboard
              </h2>

              <div className="stats">
                {Object.entries(
                  counts
                ).map(
                  ([k, v]) => (
                    <button
                      key={k}
                      className={
                        filter ===
                        k
                          ? "stat active"
                          : "stat"
                      }
                      onClick={() =>
                        setFilter(
                          k
                        )
                      }
                    >
                      <span>
                        {k}
                      </span>

                      <strong>
                        {v}
                      </strong>
                    </button>
                  )
                )}
              </div>
            </section>

            {/* =====================================
                COMPARISON RESULTS
            ====================================== */}
            <section className="card">
              <div className="toolbar">
                <div>
                  <h2>
                    04. Comparison
                    Results
                  </h2>

                  <p>
                    {
                      filtered.length
                    }{" "}
                    of{" "}
                    {
                      results.length
                    }{" "}
                    records shown
                  </p>
                </div>

                <input
                  className="search"
                  placeholder="Search Part Number, Location, QPS, MPN…"
                  value={
                    search
                  }
                  onChange={(e) =>
                    setSearch(
                      e.target
                        .value
                    )
                  }
                />

                <div className="exports">
                  <button
                    onClick={() =>
                      exportRows(
                        results,
                        "BOM_Master_Pro_Full.xlsx"
                      )
                    }
                  >
                    Export Full
                  </button>

                  <button
                    onClick={() =>
                      exportRows(
                        filtered,
                        "BOM_Master_Pro_Filtered.xlsx"
                      )
                    }
                  >
                    Export Filtered
                  </button>

                  <button
                    className="primary"
                    onClick={() =>
                      exportRows(
                        changed,
                        "BOM_Master_Pro_Changes_Only.xlsx"
                      )
                    }
                  >
                    Export Changes
                    Only
                  </button>
                </div>
              </div>

              <div className="tablewrap">
                <table>
                  <thead>
                    <tr>
                      <th>
                        Part Number
                      </th>

                      <th>
                        QPS File 1
                      </th>

                      <th>
                        QPS File 2
                      </th>

                      <th>
                        Location File 1
                      </th>

                      <th>
                        Location File 2
                      </th>

                      {selectedAdditional.map(
                        (k) => (
                          <th
                            key={k}
                          >
                            {
                              PARAMS.find(
                                (
                                  p
                                ) =>
                                  p[0] ===
                                  k
                              )?.[1]
                            }{" "}
                            1 / 2
                          </th>
                        )
                      )}

                      <th>
                        Status
                      </th>

                      <th>
                        Remark
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filtered.map(
                      (r) => (
                        <tr
                          key={
                            r.id
                          }
                        >
                          {cell(
                            r.partNumber,
                            false
                          )}

                          {cell(
                            r.qpsFile1,
                            r
                              .changes
                              .qps
                          )}

                          {cell(
                            r.qpsFile2,
                            r
                              .changes
                              .qps
                          )}

                          {cell(
                            r.locationFile1,
                            r
                              .changes
                              .location,
                            "location-cell"
                          )}

                          {cell(
                            r.locationFile2,
                            r
                              .changes
                              .location,
                            "location-cell"
                          )}

                          {selectedAdditional.map(
                            (k) => (
                              <td
                                key={
                                  k
                                }
                                className={
                                  r
                                    .changes[
                                    k
                                  ]
                                    ? "changed-cell"
                                    : ""
                                }
                              >
                                <div>
                                  {
                                    r
                                      .extra?.[
                                      k +
                                        "File1"
                                    ]
                                  }
                                </div>

                                <hr />

                                <div>
                                  {
                                    r
                                      .extra?.[
                                      k +
                                        "File2"
                                    ]
                                  }
                                </div>
                              </td>
                            )
                          )}

                          <td>
                            <span
                              className={
                                "status " +
                                (r.status ===
                                "Same"
                                  ? "same"
                                  : r.status.startsWith(
                                      "Only"
                                    )
                                  ? "missing"
                                  : "changed")
                              }
                            >
                              {
                                r.status
                              }
                            </span>
                          </td>

                          <td className="remark">
                            {r.remarks.join(
                              " | "
                            )}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
    </>
  );
}
