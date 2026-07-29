import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL;
const GREEN = "#3d6e01";
const DARK_GREEN = "#2c4a1e";
const GOLD = "#F5A800";
const BORDER = "#E5E7EB";
const GRAY = "#6B7280";

export default function DatesToRemember() {
  const [rows, setRows]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle]   = useState("");
  const [dateText, setDateText] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/erd/dates-to-remember?t=${Date.now()}`, { cache: "no-store" });
      setRows(res.ok ? await res.json() : []);
    } catch { setRows([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!title.trim()) { setErr("Please enter a title."); return; }
    setSaving(true); setErr("");
    try {
      const res = await fetch(`${API}/api/erd/dates-to-remember`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), date_text: dateText.trim(), sort_order: rows.length }),
      });
      if (!res.ok) throw new Error();
      setTitle(""); setDateText("");
      await load();
    } catch { setErr("Failed to save. Is the backend running?"); }
    finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this date?")) return;
    try {
      await fetch(`${API}/api/erd/dates-to-remember/${id}`, { method: "DELETE" });
      await load();
    } catch { /* ignore */ }
  };

  const inputStyle = { width: "100%", padding: "9px 11px", border: `1.5px solid ${BORDER}`, borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box" };

  return (
    <div style={{ fontFamily: "system-ui,-apple-system,sans-serif", maxWidth: 720 }}>
      <div style={{ marginBottom: 14 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: DARK_GREEN }}>Dates to Remember</h2>
        <p style={{ margin: "4px 0 0", fontSize: 12.5, color: GRAY }}>
          Anything you add here shows up on every student's dashboard under “Dates to Remember.”
        </p>
      </div>

      {/* Add form */}
      <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 12, padding: 14, marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr auto", gap: 10, alignItems: "end" }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: GRAY, textTransform: "uppercase", letterSpacing: 0.4 }}>Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. On-Site Enrollment Start" style={{ ...inputStyle, marginTop: 4 }} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: GRAY, textTransform: "uppercase", letterSpacing: 0.4 }}>Date / Note</label>
            <input value={dateText} onChange={e => setDateText(e.target.value)} placeholder="e.g. August 3, 2026" style={{ ...inputStyle, marginTop: 4 }} />
          </div>
          <button
            onClick={add}
            disabled={saving}
            style={{ padding: "10px 18px", background: `linear-gradient(135deg, ${DARK_GREEN}, ${GREEN})`, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: saving ? "default" : "pointer", opacity: saving ? 0.7 : 1, whiteSpace: "nowrap" }}
          >
            {saving ? "Saving…" : "+ Add"}
          </button>
        </div>
        {err && <div style={{ marginTop: 8, fontSize: 12, color: "#DC2626" }}>{err}</div>}
      </div>

      {/* List */}
      <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "10px 14px", borderBottom: `1px solid ${BORDER}`, fontSize: 12, fontWeight: 700, color: DARK_GREEN, background: "#F9FAFB" }}>
          Current Entries ({rows.length})
        </div>
        {loading ? (
          <div style={{ padding: 24, textAlign: "center", color: GRAY, fontSize: 13 }}>Loading…</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: GRAY, fontSize: 13 }}>No dates yet. Add one above.</div>
        ) : rows.map(row => (
          <div key={row.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderBottom: `1px solid ${BORDER}` }}>
            <span style={{ width: 30, height: 30, borderRadius: 8, background: "#EFF6FF", color: "#2563EB", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 15 }}>📅</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1f2937" }}>{row.title}</div>
              <div style={{ fontSize: 11.5, color: GRAY }}>{row.date_text || "—"}</div>
            </div>
            <button
              onClick={() => remove(row.id)}
              style={{ border: `1px solid ${BORDER}`, background: "#fff", color: "#DC2626", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
