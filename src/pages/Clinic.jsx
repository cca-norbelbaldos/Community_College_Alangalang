import { useState, useEffect } from "react";

const API = import.meta.env.VITE_API_URL;
const GREEN = "#3d6e01";
const DARK_GREEN = "#2c4a1e";
const GRAY = "#6B7280";
const BORDER = "#E5E7EB";
const WHITE = "#ffffff";

const CELL = { padding: "6px 8px", fontSize: 11, color: "#1f2937", border: `1px solid ${BORDER}`, textAlign: "center", verticalAlign: "middle", whiteSpace: "normal", wordBreak: "break-word", lineHeight: 1.35 };

const DENTAL_FIELDS = [
  { key: "log_date", label: "Date", type: "date" },
  { key: "student", label: "Student", options: ["Yes", "No"] },
  { key: "client_name", label: "Client Name", required: true },
  { key: "age", label: "Age" },
  { key: "sex", label: "Sex", options: ["Male", "Female"] },
  { key: "course_section", label: "Course/Year & Section" },
  { key: "chief_complaint", label: "Chief Complaint", area: true },
  { key: "oral_findings", label: "Oral Examination Findings", area: true },
  { key: "dental_treatment", label: "Dental Treatment", area: true },
  { key: "recommendation", label: "Dentist's Recommendation", area: true },
  { key: "next_followup", label: "Next Follow-up Date", type: "date" },
  { key: "dentist_signature", label: "Dentist Signature" },
];

// Columns shown in the table (No. is derived, Actions appended).
const COLS = ["log_date", "student", "client_name", "age", "sex", "course_section", "chief_complaint", "oral_findings", "dental_treatment", "recommendation", "next_followup", "dentist_signature"];
const HEADERS = ["No.", "Date", "Student", "Client Name", "Age", "Sex", "Course/Year & Section", "Chief Complaint", "Oral Examination Findings", "Dental Treatment", "Dentist's Recommendation", "Next Follow-up Date", "Dentist Signature", "Actions"];
const WIDTHS = [45, 95, 65, 170, 45, 55, 140, 170, 180, 170, 180, 100, 130, 70];

export function DentalCheckup({ canDelete = true }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const empty = Object.fromEntries(DENTAL_FIELDS.map(f => [f.key, ""]));
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

  const load = () => {
    setLoading(true);
    fetch(`${API}/api/erd/clinic/dental?t=${Date.now()}`, { cache: "no-store" })
      .then(r => r.ok ? r.json() : [])
      .then(d => setRows(Array.isArray(d) ? d : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const openAdd = () => { setMsg(null); setForm({ ...empty, log_date: today() }); setOpen(true); };

  const save = async () => {
    if (!form.client_name.trim()) { setMsg({ type: "error", text: "Client name is required." }); return; }
    setSaving(true); setMsg(null);
    try {
      const res = await fetch(`${API}/api/erd/clinic/dental`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      setForm(empty); setOpen(false); load();
    } catch { setMsg({ type: "error", text: "Failed to save. Is the backend running?" }); }
    finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this dental record?")) return;
    try {
      const res = await fetch(`${API}/api/erd/clinic/dental/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setRows(rs => rs.filter(r => r.id !== id));
    } catch { alert("Failed to delete. Is the backend running?"); }
  };

  const inputStyle = { width: "100%", padding: "8px 10px", border: `1.5px solid ${BORDER}`, borderRadius: 8, fontSize: 12.5, outline: "none", boxSizing: "border-box" };

  return (
    <div style={{ fontFamily: "system-ui,-apple-system,sans-serif", display: "flex", flexDirection: "column", minHeight: "calc(100vh - 130px)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: DARK_GREEN }}>Dental CheckUp</h2>
          <p style={{ margin: "4px 0 0", fontSize: 12.5, color: GRAY }}>Dental examination records.</p>
        </div>
        <button onClick={openAdd}
          style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 18px", background: `linear-gradient(135deg, ${DARK_GREEN}, ${GREEN})`, color: WHITE, border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Add
        </button>
      </div>

      <div style={{ flex: 1, background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", tableLayout: "fixed", minWidth: 1750 }}>
          <colgroup>{WIDTHS.map((w, i) => <col key={i} style={{ width: w }} />)}</colgroup>
          <thead>
            <tr>
              {HEADERS.map(h => (
                <th key={h} style={{ padding: "8px 8px", textAlign: "center", verticalAlign: "middle", fontSize: 10, fontWeight: 700, color: WHITE, background: GREEN, border: "1px solid #6b8f3a", whiteSpace: "normal", wordBreak: "break-word" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={HEADERS.length} style={{ padding: 24, textAlign: "center", color: GRAY, fontSize: 12.5, border: `1px solid ${BORDER}` }}>Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={HEADERS.length} style={{ padding: 24, textAlign: "center", color: GRAY, fontSize: 12.5, border: `1px solid ${BORDER}` }}>No dental records yet.</td></tr>
            ) : rows.map((r, i) => (
              <tr key={r.id}>
                <td style={CELL}>{rows.length - i}</td>
                {COLS.map(c => <td key={c} style={CELL}>{r[c] != null && r[c] !== "" ? r[c] : "—"}</td>)}
                <td style={CELL}>
                  {canDelete ? (
                    <button onClick={() => remove(r.id)} title="Delete"
                      style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: 6, background: "#FEE2E2", color: "#B91C1C", border: "1px solid #FCA5A5", borderRadius: 6, cursor: "pointer" }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
                    </button>
                  ) : <span style={{ color: "#D1D5DB" }}>—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: WHITE, borderRadius: 14, width: "100%", maxWidth: 640, maxHeight: "90vh", overflow: "auto", boxShadow: "0 20px 50px rgba(0,0,0,0.3)" }}>
            <div style={{ padding: "14px 18px", background: GREEN, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: WHITE }}>Add Dental Record</div>
              <button onClick={() => setOpen(false)} style={{ background: "transparent", border: "none", color: WHITE, fontSize: 20, cursor: "pointer", lineHeight: 1 }}>×</button>
            </div>
            <div style={{ padding: 18 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "12px 16px" }}>
                {DENTAL_FIELDS.map(f => (
                  <div key={f.key} style={f.area ? { gridColumn: "1 / -1" } : undefined}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: GRAY, textTransform: "uppercase", letterSpacing: 0.3 }}>
                      {f.label} {f.required && <span style={{ color: "#DC2626" }}>*</span>}
                    </label>
                    {f.options ? (
                      <select value={form[f.key]} onChange={set(f.key)} style={{ ...inputStyle, marginTop: 4, background: WHITE }}>
                        <option value="">— Select —</option>
                        {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : f.area ? (
                      <textarea value={form[f.key]} onChange={set(f.key)} placeholder={f.label} rows={2} style={{ ...inputStyle, marginTop: 4, resize: "vertical" }} />
                    ) : (
                      <input type={f.type || "text"} value={form[f.key]} onChange={set(f.key)} placeholder={f.type === "date" ? "" : f.label} style={{ ...inputStyle, marginTop: 4 }} />
                    )}
                  </div>
                ))}
              </div>
              {msg && <div style={{ marginTop: 12, fontSize: 12.5, fontWeight: 600, color: "#DC2626" }}>{msg.text}</div>}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
                <button onClick={() => setOpen(false)} style={{ padding: "10px 20px", background: "#F3F4F6", color: "#374151", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
                <button onClick={save} disabled={saving} style={{ padding: "10px 24px", background: `linear-gradient(135deg, ${DARK_GREEN}, ${GREEN})`, color: WHITE, border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: saving ? "default" : "pointer", opacity: saving ? 0.7 : 1 }}>{saving ? "Saving…" : "💾 Save"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
