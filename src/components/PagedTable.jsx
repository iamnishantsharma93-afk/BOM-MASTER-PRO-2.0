import { useMemo, useState } from "react";

const DEFAULT_PAGE_SIZE = 50;

// Generic data table with pagination and an optional
// sticky first column. Column shape:
//   { key, label, className?, render?(row) }
// className may be a string or a function (row) => string.
export default function PagedTable({
  columns,
  rows,
  pageSize = DEFAULT_PAGE_SIZE,
  rowKey = (row, i) => i,
  stickyFirst = true,
  className = "",
  onRowClick,
  rowClassNameFn,
}) {
  const [page, setPage] = useState(1);

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, pageCount);

  const pageRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, safePage, pageSize]);

  if (!rows.length) return null;

  return (
    <>
      <div className={`tablewrap paged-table ${className}`}>
        <table className={stickyFirst ? "sticky-first" : ""}>
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key}>{c.label}</th>
              ))}
            </tr>
          </thead>

          <tbody>
            {pageRows.map((row, i) => (
              <tr
                key={rowKey(row, i)}
                className={rowClassNameFn ? rowClassNameFn(row) : ""}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={
                      typeof c.className === "function"
                        ? c.className(row)
                        : c.className || ""
                    }
                  >
                    {c.render ? c.render(row) : row[c.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length > pageSize && (
        <div className="pager">
          <button
            className="secondary"
            disabled={safePage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            ← Prev
          </button>

          <span>
            Page {safePage} of {pageCount} · {rows.length} rows
          </span>

          <button
            className="secondary"
            disabled={safePage >= pageCount}
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
          >
            Next →
          </button>
        </div>
      )}
    </>
  );
}