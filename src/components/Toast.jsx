import { useState, useEffect } from "react";

// ── Toast types ───────────────────────────────────────────────────────────────
const TYPES = {
  success: { bg: "#ECFDF5", border: "#10B981", text: "#065F46", bar: "#10B981", icon: "✅" },
  error:   { bg: "#FEF2F2", border: "#EF4444", text: "#991B1B", bar: "#EF4444", icon: "❌" },
  info:    { bg: "#EFF6FF", border: "#3B82F6", text: "#1E40AF", bar: "#3B82F6", icon: "ℹ️"  },
  warning: { bg: "#FFFBEB", border: "#F59E0B", text: "#92400E", bar: "#F59E0B", icon: "⚠️" },
};

const DURATION = 3800;
let _addToast   = null;
let _toastId    = 0;
let _showConfirm = null;

/**
 * Show a toast notification from anywhere:
 *   import { showToast } from "./Toast";
 *   showToast("Saved!", "success");
 */
export function showToast(message, type = "success") {
  if (_addToast) _addToast(message, type);
}

/**
 * Show a confirmation dialog from anywhere (replaces window.confirm):
 *   import { showConfirm } from "./Toast";
 *   showConfirm("Delete this item?", () => doDelete(), "Delete", "warning");
 */
export function showConfirm({ message, onConfirm, onCancel, confirmLabel = "Confirm", icon = "⚠️" }) {
  if (_showConfirm) _showConfirm({ message, onConfirm, onCancel, confirmLabel, icon });
}

// ── Single toast item ─────────────────────────────────────────────────────────
function Toast({ id, message, type, onRemove }) {
  const [leaving, setLeaving] = useState(false);
  const c = TYPES[type] || TYPES.success;

  const dismiss = () => {
    setLeaving(true);
    setTimeout(() => onRemove(id), 280);
  };

  useEffect(() => {
    const t = setTimeout(dismiss, DURATION);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      onClick={dismiss}
      style={{
        position: "relative",
        display: "flex",
        alignItems: "flex-start",
        gap: "10px",
        padding: "13px 16px 13px 14px",
        background: c.bg,
        border: `1px solid ${c.border}`,
        borderLeft: `4px solid ${c.bar}`,
        borderRadius: "10px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.13)",
        fontSize: "13px",
        fontWeight: 600,
        color: c.text,
        minWidth: "260px",
        maxWidth: "370px",
        cursor: "pointer",
        userSelect: "none",
        animation: leaving
          ? "toastOut 0.28s ease forwards"
          : "toastIn 0.28s cubic-bezier(0.34,1.56,0.64,1) forwards",
        overflow: "hidden",
      }}
    >
      <span style={{ fontSize: "15px", flexShrink: 0, marginTop: "1px" }}>{c.icon}</span>
      <span style={{ flex: 1, lineHeight: 1.45 }}>{message}</span>
      <span style={{ fontSize: "14px", opacity: 0.45, flexShrink: 0, marginLeft: "4px" }}>✕</span>
      <span style={{
        position: "absolute", bottom: 0, left: 0,
        height: "3px", background: c.bar, borderRadius: "0 0 0 6px", opacity: 0.5,
        animation: `toastProgress ${DURATION}ms linear forwards`,
      }} />
    </div>
  );
}

// ── Global Confirm Dialog ─────────────────────────────────────────────────────
function ConfirmPortal({ data, onDone }) {
  if (!data) return null;
  const { message, onConfirm, onCancel, confirmLabel, icon } = data;

  const handleConfirm = () => { onDone(); if (onConfirm) onConfirm(); };
  const handleCancel  = () => { onDone(); if (onCancel)  onCancel();  };

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(0,0,0,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 2147483647, padding: 16,
    }}
      onClick={(e) => { if (e.target === e.currentTarget) handleCancel(); }}
    >
      <div style={{
        background: "#FFFFFF", borderRadius: 14, width: "100%", maxWidth: 380,
        boxShadow: "0 20px 40px rgba(0,0,0,0.18)",
        animation: "confirmIn 0.22s cubic-bezier(0.34,1.56,0.64,1) forwards",
      }}>
        <div style={{ padding: "24px 24px 0 24px", textAlign: "center" }}>
          <div style={{
            width: 52, height: 52, borderRadius: "50%",
            background: "#FEF2F2", margin: "0 auto 14px",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 24,
          }}>{icon}</div>
          <div style={{ fontSize: 15, color: "#374151", lineHeight: 1.55, padding: "0 8px" }}>
            {message}
          </div>
        </div>
        <div style={{ padding: "20px 24px 24px", display: "flex", gap: 10 }}>
          <button
            onClick={handleCancel}
            style={{
              flex: 1, padding: "10px", border: "1px solid #E5E7EB",
              borderRadius: 8, background: "#F9FAFB", color: "#374151",
              fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            }}
          >Cancel</button>
          <button
            onClick={handleConfirm}
            style={{
              flex: 1, padding: "10px", border: "none",
              borderRadius: 8, background: "#DC2626", color: "#FFFFFF",
              fontSize: 13, fontWeight: 700, cursor: "pointer",
              boxShadow: "0 2px 8px rgba(220,38,38,0.25)", fontFamily: "inherit",
            }}
          >{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

// ── Manager — mount once at app root ─────────────────────────────────────────
export default function ToastManager() {
  const [toasts,      setToasts]      = useState([]);
  const [confirmData, setConfirmData] = useState(null);

  useEffect(() => {
    _addToast = (message, type) => {
      const id = ++_toastId;
      setToasts(prev => [...prev, { id, message, type }]);
    };
    _showConfirm = (data) => setConfirmData(data);
    return () => { _addToast = null; _showConfirm = null; };
  }, []);

  const remove = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  return (
    <>
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(40px) scale(0.96); }
          to   { opacity: 1; transform: translateX(0)    scale(1);    }
        }
        @keyframes toastOut {
          from { opacity: 1; transform: translateX(0)    scale(1);    }
          to   { opacity: 0; transform: translateX(40px) scale(0.94); }
        }
        @keyframes toastProgress {
          from { width: 100%; }
          to   { width: 0%;   }
        }
        @keyframes confirmIn {
          from { opacity: 0; transform: scale(0.92); }
          to   { opacity: 1; transform: scale(1);    }
        }
      `}</style>

      {/* Toast stack */}
      <div style={{
        position: "fixed", bottom: "24px", right: "24px",
        zIndex: 2147483646,
        display: "flex", flexDirection: "column", gap: "10px",
        alignItems: "flex-end", pointerEvents: "none",
      }}>
        {toasts.map(t => (
          <div key={t.id} style={{ pointerEvents: "auto" }}>
            <Toast {...t} onRemove={remove} />
          </div>
        ))}
      </div>

      {/* Global confirm dialog */}
      <ConfirmPortal data={confirmData} onDone={() => setConfirmData(null)} />
    </>
  );
}
