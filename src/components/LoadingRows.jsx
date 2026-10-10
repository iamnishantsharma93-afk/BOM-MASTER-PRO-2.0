// Simple shimmer skeleton used while data is loading.
export default function LoadingRows({ rows = 5 }) {
  return (
    <div className="skeleton-list">
      {Array.from({ length: rows }).map((_, i) => (
        <div className="skeleton-row" key={i}>
          <span style={{ width: "26%" }} />
          <span style={{ width: "38%" }} />
          <span style={{ width: "18%" }} />
          <span style={{ width: "22%" }} />
        </div>
      ))}
    </div>
  );
}