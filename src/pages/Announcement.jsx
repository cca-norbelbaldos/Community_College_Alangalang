import { useState, useEffect } from "react";
import { showToast } from "../components/Toast";

const GOLD       = "#F5A800";
const GREEN      = "#2E7D32";
const DARK_GREEN = "#1B5E20";
const WHITE      = "#FFFFFF";
const GRAY       = "#6B7280";
const BORDER     = "#E5E7EB";
const LIGHT_GRAY = "#F9FAFB";
const RED        = "#DC2626";

const FALLBACK_DEPARTMENTS = [
  "Registrar Management", "Academic Affairs", "MIS Department", "Student Affairs",
  "Finance Office", "Human Resources", "Dean's Office", "Library Services", "Guidance & Counseling", "Other"
];

const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };

export default function Announcements({ user, onPosted }) {
  const [departments, setDepartments] = useState(FALLBACK_DEPARTMENTS);
  const [deptLoading, setDeptLoading] = useState(true);
  const [form, setForm] = useState({ title: "", body: "", department: "", posted_date: today(), event_date: "", image: "" });
  const [imagePreview, setImagePreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/erd/departments`)
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setDepartments(data);
          setForm(prev => ({ ...prev, department: data[0] }));
        } else {
          setForm(prev => ({ ...prev, department: FALLBACK_DEPARTMENTS[0] }));
        }
      })
      .catch(() => setForm(prev => ({ ...prev, department: FALLBACK_DEPARTMENTS[0] })))
      .finally(() => setDeptLoading(false));
  }, []);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImagePreview(URL.createObjectURL(file));

    const reader = new FileReader();
    reader.onloadend = () => {
      setForm(prev => ({ ...prev, image: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  // FIXED: ADD ANNOUNCEMENT POST METHOD TO DB TARGET
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) { showToast("Please fill in Title and Body.", "warning"); return; }

    setSubmitting(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/erd/announcements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        showToast("Announcement posted successfully!", "success");
        clearForm();
        if (typeof onPosted === "function") {
          onPosted();
        }
      } else {
        showToast("Failed to save announcement. Please try again.", "error");
      }
    } catch (err) {
      console.error("Network communication error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const clearForm = () => {
    setForm({ title: "", body: "", department: departments[0] || "", posted_date: today(), event_date: "", image: "" });
    setImagePreview(null);
  };

  return (
    <div style={{ maxWidth: "700px", margin: "0 auto", background: WHITE, border: `1px solid ${BORDER}`, borderRadius: "12px", overflow: "hidden", fontFamily: "system-ui" }}>
      <form onSubmit={handleSubmit}>
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${BORDER}`, background: LIGHT_GRAY }}>
          <h3 style={{ margin: 0, color: DARK_GREEN, fontWeight: 800 }}>📢 Compose Campus Announcement</h3>
        </div>

        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ fontSize: "12px", fontWeight: 700, color: GRAY, display: "block", marginBottom: "6px" }}>Issuing Department</label>
            <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} style={{ width: "100%", padding: "10px", borderRadius: "6px", border: `1px solid ${BORDER}` }}>
              {departments.map((d, idx) => <option key={idx} value={d}>{d}</option>)}
            </select>
          </div>

          <div>
            <label style={{ fontSize: "12px", fontWeight: 700, color: GRAY, display: "block", marginBottom: "6px" }}>Bulletin Title</label>
            <input required type="text" placeholder="Enter headline title..." value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={{ width: "100%", padding: "10px", borderRadius: "6px", border: `1px solid ${BORDER}`, boxSizing: "border-box" }} />
          </div>

          <div>
            <label style={{ fontSize: "12px", fontWeight: 700, color: GRAY, display: "block", marginBottom: "6px" }}>Content Body</label>
            <textarea required rows="6" placeholder="Type instructions or general updates details..." value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} style={{ width: "100%", padding: "10px", borderRadius: "6px", border: `1px solid ${BORDER}`, boxSizing: "border-box", resize: "vertical" }} />
          </div>

          <div>
            <label style={{ fontSize: "12px", fontWeight: 700, color: GRAY, display: "block", marginBottom: "6px" }}>
              Date of Event <span style={{ fontWeight: 400, color: "#9CA3AF" }}>(Optional — highlights this date blue on the School Calendar)</span>
            </label>
            <input
              type="date"
              value={form.event_date}
              onChange={(e) => setForm({ ...form, event_date: e.target.value })}
              style={{ padding: "10px", borderRadius: "6px", border: `1px solid ${BORDER}`, fontSize: "13px", width: "220px", boxSizing: "border-box" }}
            />
          </div>

          <div>
            <label style={{ fontSize: "12px", fontWeight: 700, color: GRAY, display: "block", marginBottom: "6px" }}>Attach Visual Graphic Media (Optional)</label>
            <input type="file" accept="image/*" onChange={handleImageUpload} style={{ width: "100%" }} />
            {imagePreview && <img src={imagePreview} alt="Preview" style={{ marginTop: "12px", maxWidth: "100%", maxHeight: "200px", objectFit: "contain", borderRadius: "6px", border: `1px solid ${BORDER}` }} />}
          </div>
        </div>

        <div style={{ padding: "14px 24px", borderTop: `1px solid ${BORDER}`, background: LIGHT_GRAY, display: "flex", justifyContent: "flex-end", gap: "10px", alignItems: "center" }}>
          <span style={{ fontSize: "11px", color: GRAY, marginRight: "auto" }}>After posting, you'll be redirected to Workspace Bulletins.</span>
          <button type="button" onClick={clearForm} style={{ padding: "8px 18px", border: `1px solid ${BORDER}`, borderRadius: "8px", color: GRAY, background: WHITE, cursor: "pointer", fontWeight: 700 }}>Clear</button>
          <button type="submit" disabled={submitting || deptLoading} style={{ padding: "9px 24px", border: "none", borderRadius: "8px", color: WHITE, background: (submitting || deptLoading) ? GRAY : DARK_GREEN, cursor: (submitting || deptLoading) ? "not-allowed" : "pointer", fontWeight: 800 }}>
            {submitting ? "⏳ Posting..." : "📢 Post Announcement"}
          </button>
        </div>
      </form>
    </div>
  );
}