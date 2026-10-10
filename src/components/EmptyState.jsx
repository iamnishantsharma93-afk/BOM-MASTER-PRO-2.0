import Icon from "./Icon.jsx";

// Premium empty-state block used across all views.
// compact = smaller variant for sidebars/panels.
export default function EmptyState({
  icon = "inbox",
  title = "Nothing here yet",
  desc,
  action,
  onAction,
  compact,
}) {
  return (
    <div className={"empty-state" + (compact ? " empty-state-compact" : "")}>
      <span className="empty-state-icon">
        <Icon name={icon} size={compact ? 19 : 26} strokeWidth={1.6} />
      </span>
      <b>{title}</b>
      {desc && <p>{desc}</p>}
      {action && onAction && (
        <button className="primary" onClick={onAction}>
          {action}
        </button>
      )}
    </div>
  );
}