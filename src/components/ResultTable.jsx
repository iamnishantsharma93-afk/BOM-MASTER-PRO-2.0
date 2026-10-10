import PagedTable from "./PagedTable.jsx";

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
  const columns = [
    {
      key: "partNumber",
      label: "Part Number",
      render: (r) => r.partNumber,
    },
    {
      key: "qps1",
      label: "QPS File 1",
      className: (r) => (r.changes.qps ? "changed-cell" : ""),
      render: (r) => r.qpsFile1,
    },
    {
      key: "qps2",
      label: "QPS File 2",
      className: (r) => (r.changes.qps ? "changed-cell" : ""),
      render: (r) => r.qpsFile2,
    },
    {
      key: "loc1",
      label: "Location File 1",
      className: (r) =>
        `location-cell${r.changes.location ? " changed-cell" : ""}`,
      render: (r) => r.locationFile1,
    },
    {
      key: "loc2",
      label: "Location File 2",
      className: (r) =>
        `location-cell${r.changes.location ? " changed-cell" : ""}`,
      render: (r) => r.locationFile2,
    },
    ...selectedAdditional.map((k) => ({
      key: k,
      label: `${PARAMS.find((p) => p[0] === k)?.[1] || k} 1 / 2`,
      className: (r) => (r.changes[k] ? "changed-cell" : ""),
      render: (r) => (
        <>
          <div>{r.extra?.[k + "File1"]}</div>
          <hr />
          <div>{r.extra?.[k + "File2"]}</div>
        </>
      ),
    })),
    {
      key: "status",
      label: "Status",
      render: (r) => (
        <span
          className={
            "status " +
            (r.status === "Same"
              ? "same"
              : r.status.startsWith("Only")
              ? "missing"
              : "changed")
          }
        >
          {r.status}
        </span>
      ),
    },
    {
      key: "remark",
      label: "Remark",
      className: "remark",
      render: (r) => r.remarks.join(" | "),
    },
  ];

  if (results.length === 0) {
    return null;
  }

  return (
    <>
      <section className="card">
        <h2>03. Difference Summary Dashboard</h2>

        <div className="stats">
          {Object.entries(counts).map(([k, v]) => (
            <button
              key={k}
              className={filter === k ? "stat active" : "stat"}
              onClick={() => setFilter(k)}
            >
              <span>{k}</span>
              <strong>{v}</strong>
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="toolbar">
          <div>
            <h2>04. Comparison Results</h2>
            <p>
              {filtered.length} of {results.length} records shown
            </p>
          </div>

          <input
            className="search"
            placeholder="Search Part Number, Location, QPS, MPN…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div className="exports">
            <button onClick={() => exportRows(results, "BOM_Master_Pro_Full.xlsx")}>
              Export Full
            </button>

            <button onClick={() => exportRows(filtered, "BOM_Master_Pro_Filtered.xlsx")}>
              Export Filtered
            </button>

            <button
              className="primary"
              onClick={() => exportRows(changed, "BOM_Master_Pro_Changes_Only.xlsx")}
            >
              Export Changes Only
            </button>
          </div>
        </div>

        <PagedTable
          columns={columns}
          rows={filtered}
          rowKey={(r) => r.id}
          pageSize={50}
        />
      </section>
    </>
  );
}