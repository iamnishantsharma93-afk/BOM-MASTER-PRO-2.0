import { useState } from "react";

// Wraps any upload area so files can also be
// dragged & dropped on it. Applies the "drag-over"
// class while a file is hovering for visual feedback.
export default function DropZone({
  onFiles,
  className = "",
  onClick,
  children,
}) {
  const [dragging, setDragging] = useState(false);

  const prevent = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div
      className={`${className}${dragging ? " drag-over" : ""}`}
      onClick={onClick}
      onDragEnter={(e) => {
        prevent(e);
        setDragging(true);
      }}
      onDragOver={prevent}
      onDragLeave={(e) => {
        prevent(e);
        setDragging(false);
      }}
      onDrop={(e) => {
        prevent(e);
        setDragging(false);

        const files = Array.from(e.dataTransfer?.files || []);

        if (files.length) onFiles?.(files);
      }}
    >
      {children}
    </div>
  );
}