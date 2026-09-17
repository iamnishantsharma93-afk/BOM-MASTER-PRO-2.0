const KEY = "bmp_recent_activity";
const MAX_ITEMS = 5;

export function addActivity(icon, title, detail) {
  try {
    const existing = JSON.parse(localStorage.getItem(KEY) || "[]");

    const entry = {
      icon,
      title,
      detail,
      time: Date.now(),
    };

    const updated = [entry, ...existing].slice(0, MAX_ITEMS);

    localStorage.setItem(KEY, JSON.stringify(updated));
  } catch (error) {
    console.error("Activity log error:", error);
  }
}

export function getActivity() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch (error) {
    return [];
  }
}
export function clearActivity() {
  localStorage.removeItem(KEY);
}

export function incrementCounter(key) {
  const n = parseInt(localStorage.getItem(key) || "0", 10) + 1;
  localStorage.setItem(key, String(n));
  return n;
}

export function getCounter(key) {
  return parseInt(localStorage.getItem(key) || "0", 10);
}

export function resetCounters() {
  localStorage.removeItem("bmp_counter_comparisons");
  localStorage.removeItem("bmp_counter_ai_queries");
}

export function formatTimeAgo(timestamp) {
  const diffMs = Date.now() - timestamp;
  const mins = Math.floor(diffMs / 60000);

  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min${mins > 1 ? "s" : ""} ago`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;

  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}