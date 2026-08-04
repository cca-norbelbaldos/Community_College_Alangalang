import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL;
const GREEN = "#3d6e01";
const DARK_GREEN = "#2c4a1e";
const BORDER = "#E5E7EB";
const GRAY = "#6B7280";

const inputStyle = { width: "100%", padding: "9px 11px", border: `1.5px solid ${BORDER}`, borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box" };
const btnStyle = (saving) => ({ padding: "10px 18px", background: `linear-gradient(135deg, ${DARK_GREEN}, ${GREEN})`, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: saving ? "default" : "pointer", opacity: saving ? 0.7 : 1, whiteSpace: "nowrap" });

export default function DatesToRemember() {
  return (
    <div style={{ fontFamily: "system-ui,-apple-system,sans-serif" }}>
      <style>{`
        .dtr-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; align-items: start; }
        @media (max-width: 900px) { .dtr-grid { grid-template-columns: 1fr; } }
      `}</style>
      <div className="dtr-grid">
        <AnnouncementsManager />
        <DatesManager />
      </div>
    </div>
  );
}

/* ─────────────── Announcements (left) ─────────────── */
function AnnouncementsManager() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/erd/student-announcements?t=${Date.now()}`, { cache: "no-store" });
      setRows(res.ok ? await res.json() : []);
    } catch { setRows([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!title.trim()) { setErr("Please enter a title."); return; }
    setSaving(true); setErr("");
    try {
      const res = await fetch(`${API}/api/erd/student-announcements`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), body: body.trim() }),
      });
      if (!res.ok) throw new Error();
      setTitle(""); setBody("");
      await load();
    } catch { setErr("Failed to post. Is the backend running?"); }
    finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this announcement?")) return;
    try { await fetch(`${API}/api/erd/student-announcements/${id}`, { method: "DELETE" }); await load(); } catch {}
  };

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: DARK_GREEN }}>Announcements</h2>
        <p style={{ margin: "4px 0 0", fontSize: 12, color: GRAY }}>Posts here appear on every student's dashboard under “Announcements.”</p>
      </div>

      <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 12, padding: 14, marginBottom: 14, minHeight: 236, boxSizing: "border-box" }}>
        <label style={{ fontSize: 11, fontWeight: 700, color: GRAY, textTransform: "uppercase", letterSpacing: 0.4 }}>Title</label>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Enrollment now open" style={{ ...inputStyle, marginTop: 4 }} />
        <label style={{ display: "block", marginTop: 10, fontSize: 11, fontWeight: 700, color: GRAY, textTransform: "uppercase", letterSpacing: 0.4 }}>Message (optional)</label>
        <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Details…" rows={3} style={{ ...inputStyle, marginTop: 4, resize: "vertical", fontFamily: "inherit" }} />
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
          <button onClick={add} disabled={saving} style={btnStyle(saving)}>{saving ? "Posting…" : "+ Post"}</button>
        </div>
        {err && <div style={{ marginTop: 8, fontSize: 12, color: "#DC2626" }}>{err}</div>}
      </div>

      <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "10px 14px", borderBottom: `1px solid ${BORDER}`, fontSize: 12, fontWeight: 700, color: DARK_GREEN, background: "#F9FAFB" }}>Posted ({rows.length})</div>
        {loading ? (
          <div style={{ padding: 24, textAlign: "center", color: GRAY, fontSize: 13 }}>Loading…</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: GRAY, fontSize: 13 }}>No announcements yet.</div>
        ) : rows.map(row => (
          <div key={row.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "11px 14px", borderBottom: `1px solid ${BORDER}` }}>
            <span style={{ width: 30, height: 30, borderRadius: 8, background: "#FEF2F2", color: "#DC2626", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 15 }}>📢</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1f2937" }}>{row.title}</div>
              {row.body && <div style={{ fontSize: 11.5, color: GRAY, marginTop: 2, lineHeight: 1.4 }}>{row.body}</div>}
              {row.posted_date && <div style={{ fontSize: 10.5, color: "#9CA3AF", marginTop: 3 }}>{row.posted_date}</div>}
            </div>
            <button onClick={() => remove(row.id)} style={{ border: `1px solid ${BORDER}`, background: "#fff", color: "#DC2626", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────── Dates to Remember (right) ─────────────── */
function DatesManager() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [dateText, setDateText] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

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
        method: "POST", headers: { "Content-Type": "application/json" },
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
    try { await fetch(`${API}/api/erd/dates-to-remember/${id}`, { method: "DELETE" }); await load(); } catch {}
  };

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: DARK_GREEN }}>Dates to Remember</h2>
        <p style={{ margin: "4px 0 0", fontSize: 12, color: GRAY }}>Shows on every student's dashboard under “Dates to Remember.”</p>
      </div>

      <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 12, padding: 14, marginBottom: 14, minHeight: 236, boxSizing: "border-box", display: "flex", flexDirection: "column" }}>
        <label style={{ fontSize: 11, fontWeight: 700, color: GRAY, textTransform: "uppercase", letterSpacing: 0.4 }}>Title</label>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. On-Site Enrollment Start" style={{ ...inputStyle, marginTop: 4 }} />
        <label style={{ display: "block", marginTop: 10, fontSize: 11, fontWeight: 700, color: GRAY, textTransform: "uppercase", letterSpacing: 0.4 }}>Date / Note</label>
        <input value={dateText} onChange={e => setDateText(e.target.value)} placeholder="e.g. August 3, 2026" style={{ ...inputStyle, marginTop: 4 }} />
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
          <button onClick={add} disabled={saving} style={btnStyle(saving)}>{saving ? "Saving…" : "+ Add"}</button>
        </div>
        {err && <div style={{ marginTop: 8, fontSize: 12, color: "#DC2626" }}>{err}</div>}
      </div>

      <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "10px 14px", borderBottom: `1px solid ${BORDER}`, fontSize: 12, fontWeight: 700, color: DARK_GREEN, background: "#F9FAFB" }}>Current Entries ({rows.length})</div>
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
            <button onClick={() => remove(row.id)} style={{ border: `1px solid ${BORDER}`, background: "#fff", color: "#DC2626", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}
