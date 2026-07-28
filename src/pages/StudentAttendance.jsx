import { useEffect, useMemo, useState } from "react";
import { showToast } from "../components/Toast";

const DARK_GREEN = "#3d6e01";
const WHITE      = "#FFFFFF";
const GRAY       = "#6B7280";
const LIGHT_GRAY = "#F9FAFB";
const BORDER     = "#E5E7EB";
const GREEN      = "#16A34A";
const RED        = "#DC2626";
const AMBER      = "#B45309";

const API = import.meta.env.VITE_API_URL;
const today = () => new Date().toISOString().slice(0, 10);

// Attendance is stored per class + date in the browser.
const keyFor = (cls, date) => `cca_att_${cls.subject_id}_${cls.section || "NA"}_${date}`;
const loadMarks = (cls, date) => { try { return JSON.parse(localStorage.getItem(keyFor(cls, date)) || "{}"); } catch { return {}; } };
const saveMarks = (cls, date, marks) => { try { localStorage.setItem(keyFor(cls, date), JSON.stringify(marks)); } catch {} };

export default function StudentAttendance({ user = {} }) {
  const [classes, setClasses]   = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [clsIdx, setClsIdx]     = useState("");
  const [date, setDate]         = useState(today());
  const [marks, setMarks]       = useState({});

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/erd/class-schedule`).then(r => r.ok ? r.json() : []),
      fetch(`${API}/api/erd/students`).then(r => r.ok ? r.json() : []),
    ]).then(([sched, studs]) => {
      const mine = (Array.isArray(sched) ? sched : []).filter(r => String(r.faculty_id) === String(user.id));
      setClasses(mine);
      setStudents(Array.isArray(studs) ? studs : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user.id]);

  const cls = clsIdx !== "" ? classes[Number(clsIdx)] : null;

  // Students belonging to the selected class (matched by course + section).
  const roster = useMemo(() => {
    if (!cls) return [];
    return students.filter(s =>
      (!cls.course || s.course === cls.course) &&
      (!cls.section || (s.section || "") === (cls.section || "")) &&
      (!cls.year_level || (s.year_level || "") === (cls.year_level || ""))
    ).sort((a, b) => (a.last_name || "").localeCompare(b.last_name || ""));
  }, [cls, students]);

  // Load saved marks whenever class or date changes.
  useEffect(() => { if (cls) setMarks(loadMarks(cls, date)); }, [clsIdx, date]); // eslint-disable-line

  const setMark = (studentId, code) => {
    setMarks(prev => {
      const next = { ...prev, [studentId]: prev[studentId] === code ? undefined : code };
      if (next[studentId] === undefined) delete next[studentId];
      if (cls) saveMarks(cls, date, next);
      return next;
    });
  };

  const markAll = (code) => {
    const next = {};
    roster.forEach(s => { next[s.id] = code; });
    setMarks(next);
    if (cls) saveMarks(cls, date, next);
    showToast(`All marked ${code === "P" ? "Present" : code === "A" ? "Absent" : "Late"}.`, "info");
  };

  const [submitting, setSubmitting] = useState(false);
  const submit = async () => {
    if (!cls) return;
    const records = roster.filter(s => marks[s.id]).map(s => ({
      student_id: s.id, student_number: s.student_number || "",
      student_name: [s.last_name, s.first_name, s.middle_name].filter(Boolean).join(", "),
      status: marks[s.id],
    }));
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/erd/attendance`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          faculty_id: user.id, date,
          class: { subject_id: cls.subject_id, subject_code: cls.subject_code, subject_title: cls.subject_title, course: cls.course, year_level: cls.year_level, section: cls.section },
          records,
        }),
      });
      if (res.ok) showToast("Attendance submitted.", "success");
      else showToast("Failed to submit attendance.", "error");
    } catch { showToast("Network error.", "error"); }
    setSubmitting(false);
  };

  const counts = roster.reduce((acc, s) => { const m = marks[s.id]; if (m) acc[m] = (acc[m] || 0) + 1; return acc; }, {});
  const present = counts.P || 0, absent = counts.A || 0, late = counts.L || 0;

  const sel = { padding: "8px 10px", border: `1px solid ${BORDER}`, borderRadius: "6px", fontSize: "13px", background: WHITE, cursor: "pointer" };
  const th  = { padding: "10px 14px", textAlign: "left", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: WHITE, whiteSpace: "nowrap" };
  const td  = { padding: "9px 14px", fontSize: "13px", color: "#111827", borderTop: `1px solid ${BORDER}` };

  const markBtn = (studentId, code, label, color) => {
    const active = marks[studentId] === code;
    return (
      <button type="button" onClick={() => setMark(studentId, code)}
        style={{ padding: "5px 12px", borderRadius: "6px", border: `1px solid ${active ? color : BORDER}`, background: active ? color : WHITE, color: active ? WHITE : "#374151", fontSize: "12px", fontWeight: 700, cursor: "pointer", marginRight: "6px" }}>
        {label}
      </button>
    );
  };

  return (
    <div style={{ fontFamily: "system-ui, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
        <span style={{ fontSize: "20px" }}>🕘</span>
        <div>
          <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 900, color: DARK_GREEN }}>Student Attendance</h2>
          <p style={{ margin: "2px 0 0", fontSize: "12px", color: GRAY }}>Mark attendance for your assigned classes.</p>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center", marginBottom: "14px" }}>
        <select style={{ ...sel, minWidth: "260px" }} value={clsIdx} onChange={e => setClsIdx(e.target.value)}>
          <option value="">— Select your class —</option>
          {classes.map((c, i) => (
            <option key={c.id ?? i} value={i}>
              {c.subject_code ? `${c.subject_code} — ` : ""}{c.subject_title || "Subject"}{c.section ? ` (${c.section})` : ""}
            </option>
          ))}
        </select>
        <input type="date" style={sel} value={date} onChange={e => setDate(e.target.value)} />
        {cls && (
          <div style={{ display: "flex", gap: "6px", marginLeft: "auto" }}>
            <button type="button" onClick={() => markAll("P")} style={{ ...sel, color: GREEN, fontWeight: 700 }}>All Present</button>
            <button type="button" onClick={() => markAll("A")} style={{ ...sel, color: RED, fontWeight: 700 }}>All Absent</button>
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ padding: "40px", textAlign: "center", color: GRAY }}>Loading…</div>
      ) : classes.length === 0 ? (
        <div style={{ padding: "40px", textAlign: "center", color: GRAY, border: `1px dashed ${BORDER}`, borderRadius: "10px" }}>
          No classes are assigned to you yet. Ask the Registrar to assign your subjects under Class Assignment.
        </div>
      ) : !cls ? (
        <div style={{ padding: "40px", textAlign: "center", color: GRAY, border: `1px dashed ${BORDER}`, borderRadius: "10px" }}>
          Select one of your classes above to take attendance.
        </div>
      ) : (
        <>
          {/* Summary */}
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "12px" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, background: "#DCFCE7", color: GREEN, padding: "4px 12px", borderRadius: "16px" }}>Present: {present}</span>
            <span style={{ fontSize: "12px", fontWeight: 700, background: "#FEE2E2", color: RED, padding: "4px 12px", borderRadius: "16px" }}>Absent: {absent}</span>
            <span style={{ fontSize: "12px", fontWeight: 700, background: "#FEF3C7", color: AMBER, padding: "4px 12px", borderRadius: "16px" }}>Late: {late}</span>
            <span style={{ fontSize: "12px", fontWeight: 700, background: LIGHT_GRAY, color: GRAY, padding: "4px 12px", borderRadius: "16px" }}>Total: {roster.length}</span>
          </div>

          <div style={{ border: `1px solid ${BORDER}`, borderRadius: "10px", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr style={{ background: DARK_GREEN }}>
                <th style={th}>#</th><th style={th}>ID Number</th><th style={th}>Student</th><th style={{ ...th, textAlign: "right" }}>Attendance</th>
              </tr></thead>
              <tbody>
                {roster.length === 0 ? (
                  <tr><td colSpan={4} style={{ ...td, textAlign: "center", color: GRAY, padding: "24px" }}>No students enrolled in this class.</td></tr>
                ) : roster.map((s, i) => (
                  <tr key={s.id} style={{ background: i % 2 ? LIGHT_GRAY : WHITE }}>
                    <td style={{ ...td, color: GRAY, width: "40px" }}>{i + 1}</td>
                    <td style={{ ...td, fontFamily: "monospace", color: "#1E88E5" }}>{s.student_number || "—"}</td>
                    <td style={{ ...td, fontWeight: 600 }}>{[s.last_name, s.first_name, s.middle_name].filter(Boolean).join(", ")}</td>
                    <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>
                      {markBtn(s.id, "P", "Present", GREEN)}
                      {markBtn(s.id, "L", "Late", AMBER)}
                      {markBtn(s.id, "A", "Absent", RED)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", marginTop: "12px", flexWrap: "wrap" }}>
            <p style={{ margin: 0, fontSize: "11px", color: GRAY }}>Marks save on this device automatically — click Submit to send them to the administrator.</p>
            <button type="button" onClick={submit} disabled={submitting}
              style={{ padding: "9px 22px", background: submitting ? "#9CA3AF" : DARK_GREEN, color: WHITE, border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: 800, cursor: submitting ? "default" : "pointer" }}>
              {submitting ? "Submitting…" : "Submit Attendance"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
