import { useEffect, useState } from "react";
import { showToast } from "../components/Toast";

const API = import.meta.env.VITE_API_URL;
const DARK_GREEN = "#2c4a1e";
const GRAY = "#6B7280";
const BORDER = "#E5E7EB";
const WHITE = "#ffffff";

export default function MaintenanceMode() {
  const [on, setOn] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/erd/maintenance`)
      .then(r => r.ok ? r.json() : { on: 0 })
      .then(d => setOn(!!d.on))
      .catch(() => {});
  }, []);

  const toggle = async () => {
    const next = !on;
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/erd/maintenance`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ on: next ? 1 : 0 }),
      });
      if (res.ok) { setOn(next); showToast(next ? "Maintenance mode ON — non-admins are locked out." : "Maintenance mode OFF.", next ? "warning" : "success"); }
      else showToast("Failed to update maintenance mode.", "error");
    } catch { showToast("Network error.", "error"); }
    setSaving(false);
  };

  return (
    <div style={{ fontFamily: "system-ui,-apple-system,sans-serif", maxWidth: 720 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", background: on ? "#FEF3C7" : WHITE, border: `1px solid ${on ? "#FCD34D" : BORDER}`, borderRadius: "12px", padding: "14px 18px" }}>
        <div>
          <div style={{ fontSize: "14px", fontWeight: 800, color: on ? "#92400E" : DARK_GREEN }}>🛠 Maintenance Mode</div>
          <div style={{ fontSize: "12px", color: GRAY, marginTop: "3px" }}>
            {on ? "System is locked for everyone except administrators." : "Turn on to lock out all non-administrator users."}
          </div>
        </div>
        {/* Small toggle button */}
        <button onClick={toggle} disabled={saving} title="Toggle maintenance mode"
          style={{ position: "relative", width: "54px", height: "24px", borderRadius: "12px", border: "none", cursor: saving ? "default" : "pointer", background: on ? "#DC2626" : "#9CA3AF", transition: "background 0.2s", flexShrink: 0 }}>
          <span style={{ position: "absolute", top: 0, bottom: 0, display: "flex", alignItems: "center", fontSize: "8px", fontWeight: 800, color: WHITE, left: on ? "8px" : "auto", right: on ? "auto" : "7px" }}>{on ? "ON" : "OFF"}</span>
          <span style={{ position: "absolute", top: "3px", left: on ? "calc(100% - 21px)" : "3px", width: "18px", height: "18px", borderRadius: "50%", background: WHITE, transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
        </button>
      </div>
    </div>
  );
}
