import { createContext, useCallback, useContext, useState } from "react";

const ToastContext = createContext(null);

let toastId = 0;

// App-wide toast + confirm dialog provider.
// Usage inside any component:
//   const { toast, confirmDialog } = useToast();
//   toast.success("Saved"); toast.error("Failed"); toast.info("Heads up");
//   const ok = await confirmDialog("Delete?", { title: "Confirm", danger: true });
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (type, message, opts = {}) => {
      const id = ++toastId;

      setToasts((prev) => [...prev, { id, type, message }]);

      if (opts.duration !== 0) {
        setTimeout(() => dismiss(id), opts.duration || 3500);
      }
    },
    [dismiss]
  );

  const toast = {
    success: (m, o) => push("success", m, o),
    error: (m, o) => push("error", m, o),
    info: (m, o) => push("info", m, o),
  };

  const confirmDialog = useCallback((message, opts = {}) => {
    return new Promise((resolve) => {
      setConfirmState({
        message,
        title: opts.title || "Please Confirm",
        confirmLabel: opts.confirmLabel || "Confirm",
        cancelLabel: opts.cancelLabel || "Cancel",
        danger: !!opts.danger,
        resolve,
      });
    });
  }, []);

  const closeConfirm = useCallback(
    (result) => {
      confirmState?.resolve?.(result);
      setConfirmState(null);
    },
    [confirmState]
  );

  return (
    <ToastContext.Provider value={{ toast, confirmDialog }}>
      {children}

      {confirmState && (
        <div
          className="master-bom-modal-overlay"
          onClick={() => closeConfirm(false)}
        >
          <div
            className="master-bom-modal"
            style={{ maxWidth: 380 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0 }}>{confirmState.title}</h3>

            <p style={{ marginTop: 0 }}>{confirmState.message}</p>

            <div className="actions" style={{ margin: 0 }}>
              <button
                className={confirmState.danger ? "clear" : "primary"}
                onClick={() => closeConfirm(true)}
              >
                {confirmState.confirmLabel}
              </button>

              <button
                className="clear"
                onClick={() => closeConfirm(false)}
              >
                {confirmState.cancelLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="toast-viewport">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast toast-${t.type}`}
            onClick={() => dismiss(t.id)}
          >
            <span className="toast-icon">
              {t.type === "success" ? "✔" : t.type === "error" ? "✖" : "ℹ"}
            </span>

            <span className="toast-msg">{t.message}</span>

            <button
              className="toast-close"
              onClick={(e) => {
                e.stopPropagation();
                dismiss(t.id);
              }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}