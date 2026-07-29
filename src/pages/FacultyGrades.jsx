import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { showToast } from "../components/Toast";

const DARK_GREEN = "#3d6e01";
const WHITE      = "#FFFFFF";
const GRAY       = "#6B7280";
const LIGHT_GRAY = "#F9FAFB";
const BORDER     = "#E5E7EB";
const BLUE       = "#1E88E5";
const GREEN      = "#16A34A";
const RED        = "#DC2626";

const API = import.meta.env.VITE_API_URL;

const remarkFor = (grade) => {
  if (grade === "" || grade == null) return "PASSED / FAILED";
  const n = parseFloat(grade);
  if (isNaN(n)) return "PASSED / FAILED";
  return n <= 3.0 ? "PASSED" : "FAILED";
};

export default function FacultyGrades({ user = {} }) {
  const [classes, setClasses]   = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [course, setCourse]     = useState("");
  const [year, setYear]         = useState("");
  const [section, setSection]   = useState("");
  const [gradeStudent, setGradeStudent] = useState(null);
  const [rows, setRows]         = useState([]);
  const [saving, setSaving]     = useState(false);
  const [graded, setGraded]     = useState({}); // studentId -> already has grades for my subjects
  const [locked, setLocked]     = useState(false);
  const [locking, setLocking]   = useState(false);

  const isAdmin = String(user?.role || "").toLowerCase() === "administrator";

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/erd/class-schedule`).then(r => r.ok ? r.json() : []),
      fetch(`${API}/api/erd/students`).then(r => r.ok ? r.json() : []),
    ]).then(([sched, studs]) => {
      const all = (Array.isArray(sched) ? sched : []).filter(r => r.faculty_id);
      // Admin can view/unlock every class; faculty only their own assignments.
      setClasses(isAdmin ? all : all.filter(r => String(r.faculty_id) === String(user.id)));
      setStudents(Array.isArray(studs) ? studs : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user.id]);

  const courses  = [...new Set(classes.map(c => c.course).filter(Boolean))].sort();
  const years    = [...new Set(classes.filter(c => !course || c.course === course).map(c => c.year_level).filter(Boolean))].sort();
  const sections = [...new Set(classes.filter(c => (!course || c.course === course) && (!year || c.year_level === year)).map(c => c.section).filter(Boolean))].sort();

  const roster = useMemo(() => {
    if (!section) return [];
    return students
      .filter(s => (!course || s.course === course) && (!year || (s.year_level || "") === year) && (s.section || "") === section)
      .sort((a, b) => (a.last_name || "").localeCompare(b.last_name || ""));
  }, [students, course, year, section]);

  // The subjects THIS faculty is assigned to teach for the selection.
  const mySubjects = classes.filter(c => (!course || c.course === course) && (!year || c.year_level === year) && (c.section || "") === section);

  // Lock status for the current selection.
  useEffect(() => {
    if (!section) { setLocked(false); return; }
    const p = new URLSearchParams({ course, section, year_level: year });
    fetch(`${API}/api/erd/grade-lock?${p}`).then(r => r.ok ? r.json() : { locked: 0 })
      .then(d => setLocked(!!d.locked)).catch(() => setLocked(false));
  }, [course, year, section]);

  const submitLock = () => {
    if (!window.confirm("Submit and LOCK all grades for this class? You won't be able to edit them afterwards — only an administrator can unlock.")) return;
    setLocking(true);
    fetch(`${API}/api/erd/grade-lock`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ course, section, year_level: year, faculty_id: user.id }) })
      .then(r => { if (r.ok) { setLocked(true); showToast("Grades submitted and locked.", "success"); } else showToast("Failed to submit.", "error"); })
      .catch(() => showToast("Network error.", "error"))
      .finally(() => setLocking(false));
  };
  const unlock = () => {
    setLocking(true);
    fetch(`${API}/api/erd/grade-lock/unlock`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ course, section, year_level: year }) })
      .then(r => { if (r.ok) { setLocked(false); showToast("Grades unlocked.", "success"); } else showToast("Failed to unlock.", "error"); })
      .catch(() => showToast("Network error.", "error"))
      .finally(() => setLocking(false));
  };

  // Mark which students already have grades for the faculty's subjects (→ "Edit Grade").
  useEffect(() => {
    if (!section || roster.length === 0) { setGraded({}); return; }
    const subjIds = new Set(mySubjects.map(c => c.subject_id));
    let cancelled = false;
    (async () => {
      const map = {};
      await Promise.all(roster.map(async s => {
        try {
          const g = await fetch(`${API}/api/erd/grades/${s.id}`).then(r => r.ok ? r.json() : []);
          map[s.id] = (Array.isArray(g) ? g : []).some(x => subjIds.has(x.subject_id) && x.grade != null);
        } catch { map[s.id] = false; }
      }));
      if (!cancelled) setGraded(map);
    })();
    return () => { cancelled = true; };
  }, [course, year, section, students, classes]); // eslint-disable-line

  const openGrade = async (student) => {
    if (isAdmin || locked) return;
    setGradeStudent(student);
    let existing = {};
    try {
      const g = await fetch(`${API}/api/erd/grades/${student.id}`).then(r => r.ok ? r.json() : []);
      (Array.isArray(g) ? g : []).forEach(x => { existing[x.subject_id] = x; });
    } catch (_) {}
    setRows(mySubjects.map(c => ({
      subject_id: c.subject_id, subject_code: c.subject_code, subject_title: c.subject_title,
      units: c.units, semester: c.semester,
      grade: existing[c.subject_id]?.grade != null ? String(existing[c.subject_id].grade) : "",
      year_start: student.year_enrolled || "",
      year_end: student.year_enrolled ? Number(student.year_enrolled) + 1 : "",
    })));
  };

  const setGrade = (subject_id, val) => setRows(prev => prev.map(r => r.subject_id === subject_id ? { ...r, grade: val } : r));

  const save = async () => {
    if (!gradeStudent) return;
    const grades = rows.filter(r => r.grade !== "").map(r => ({
      subject_id: r.subject_id, grade: r.grade, remarks: remarkFor(r.grade),
      semester: r.semester || 1, year_start: r.year_start || null, year_end: r.year_end || null,
    }));
    if (grades.length === 0) { showToast("Enter at least one grade.", "warning"); return; }
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/erd/grades/bulk`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_id: gradeStudent.id, grades }),
      });
      if (res.ok) { showToast("Grades saved.", "success"); setGraded(prev => ({ ...prev, [gradeStudent.id]: true })); setGradeStudent(null); }
      else showToast("Failed to save grades.", "error");
    } catch { showToast("Network error.", "error"); }
    setSaving(false);
  };

  const sel = { padding: "8px 10px", border: `1px solid ${BORDER}`, borderRadius: "6px", fontSize: "13px", background: WHITE, cursor: "pointer" };
  const th  = { padding: "10px 14px", textAlign: "left", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: WHITE, whiteSpace: "nowrap" };
  const td  = { padding: "9px 14px", fontSize: "13px", color: "#111827", borderTop: `1px solid ${BORDER}` };

  return (
    <div style={{ fontFamily: "system-ui, sans-serif" }}>
      <h2 style={{ margin: "0 0 14px", fontSize: "18px", fontWeight: 800, color: DARK_GREEN }}>Grade</h2>

      {/* Filters */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center", marginBottom: "14px" }}>
        {/* Submit (faculty) / Unlock (admin) on the LEFT */}
        {section && (
          isAdmin
            ? (locked && <button type="button" onClick={unlock} disabled={locking}
                style={{ padding: "8px 16px", background: locking ? "#9CA3AF" : "#B45309", color: WHITE, border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: 800, cursor: locking ? "default" : "pointer" }}>
                {locking ? "…" : "🔓 Unlock"}</button>)
            : (!locked && <button type="button" onClick={submitLock} disabled={locking || roster.length === 0}
                style={{ padding: "8px 16px", background: locking ? "#9CA3AF" : DARK_GREEN, color: WHITE, border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: 800, cursor: locking ? "default" : "pointer" }}>
                {locking ? "…" : "Submit"}</button>)
        )}
        <select style={{ ...sel, minWidth: "200px" }} value={course} onChange={e => { setCourse(e.target.value); setYear(""); setSection(""); }}>
          <option value="">Select course</option>
          {courses.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select style={{ ...sel, minWidth: "130px" }} value={year} onChange={e => { setYear(e.target.value); setSection(""); }}>
          <option value="">Select year</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select style={{ ...sel, minWidth: "140px" }} value={section} onChange={e => setSection(e.target.value)}>
          <option value="">Select section</option>
          {sections.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {section && locked && <span style={{ fontSize: "11px", fontWeight: 700, color: "#B45309", background: "#FEF3C7", padding: "4px 10px", borderRadius: "12px" }}>🔒 Locked</span>}
        {section && <span style={{ fontSize: "11px", color: GRAY, marginLeft: "auto" }}>{roster.length} student(s)</span>}
      </div>

      {/* Roster */}
      {loading ? (
        <div style={{ padding: "40px", textAlign: "center", color: GRAY }}>Loading…</div>
      ) : classes.length === 0 ? (
        <div style={{ padding: "40px", textAlign: "center", color: GRAY, border: `1px dashed ${BORDER}`, borderRadius: "10px" }}>
          No classes are assigned to you yet. Ask the Registrar to assign your subjects under Class Assignment.
        </div>
      ) : !section ? (
        <div style={{ padding: "40px", textAlign: "center", color: GRAY, border: `1px dashed ${BORDER}`, borderRadius: "10px" }}>
          Select a course and section to see the students registered in that block.
        </div>
      ) : (
        <div style={{ border: `1px solid ${BORDER}`, borderRadius: "10px", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr style={{ background: DARK_GREEN }}>
              <th style={th}>#</th><th style={th}>ID Number</th><th style={th}>Student</th><th style={{ ...th, textAlign: "right" }}>Action</th>
            </tr></thead>
            <tbody>
              {roster.length === 0 ? (
                <tr><td colSpan={4} style={{ ...td, textAlign: "center", color: GRAY, padding: "24px" }}>No students registered in this section.</td></tr>
              ) : roster.map((s, i) => (
                <tr key={s.id} style={{ background: i % 2 ? LIGHT_GRAY : WHITE }}>
                  <td style={{ ...td, color: GRAY, width: "40px" }}>{i + 1}</td>
                  <td style={{ ...td, fontFamily: "monospace", color: BLUE }}>{s.student_number || "—"}</td>
                  <td style={{ ...td, fontWeight: 600 }}>{[s.last_name, s.first_name, s.middle_name].filter(Boolean).join(", ")}</td>
                  <td style={{ ...td, textAlign: "right" }}>
                    <button type="button" onClick={() => openGrade(s)} disabled={isAdmin || locked}
                      title={locked ? "Grades are locked" : undefined}
                      style={{ padding: "6px 14px", background: (isAdmin || locked) ? "#9CA3AF" : (graded[s.id] ? BLUE : DARK_GREEN), color: WHITE, border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: 700, cursor: (isAdmin || locked) ? "default" : "pointer" }}>
                      {locked ? "🔒 Locked" : graded[s.id] ? "✎ Edit Grade" : "+ Add Grade"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Grade entry modal */}
      {gradeStudent && createPortal(
        <div onClick={() => setGradeStudent(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 2147483647, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: WHITE, borderRadius: "14px", width: "100%", maxWidth: "760px", maxHeight: "88vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.35)" }}>
            {/* Header */}
            <div style={{ padding: "16px 20px", background: "#F5F3EA", borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
              <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: GRAY }}>Add Grade</div>
              <div style={{ fontSize: "17px", fontWeight: 800, color: "#111827" }}>{[gradeStudent.last_name, gradeStudent.first_name, gradeStudent.middle_name].filter(Boolean).join(", ")}</div>
              <div style={{ fontSize: "12px", color: GRAY, marginTop: "2px" }}>{gradeStudent.student_number || "—"} · {course} · {section}</div>
            </div>
            {/* Body — the faculty's assigned subjects for this section */}
            <div style={{ overflowY: "auto", padding: "16px 20px", flex: 1 }}>
              {rows.length === 0 ? (
                <div style={{ padding: "20px", textAlign: "center", color: GRAY }}>You have no subjects assigned for this section.</div>
              ) : (
                <div style={{ border: `1px solid ${BORDER}`, borderRadius: "10px", overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead><tr style={{ background: LIGHT_GRAY }}>
                      <th style={{ ...th, color: GRAY }}>Code</th><th style={{ ...th, color: GRAY }}>Subject</th>
                      <th style={{ ...th, color: GRAY, textAlign: "center" }}>Units</th><th style={{ ...th, color: GRAY }}>Grade (1.00–5.00)</th><th style={{ ...th, color: GRAY }}>Remarks</th>
                    </tr></thead>
                    <tbody>
                      {rows.map((r, i) => {
                        const rem = remarkFor(r.grade);
                        const remColor = rem === "PASSED" ? GREEN : rem === "FAILED" ? RED : GRAY;
                        return (
                          <tr key={r.subject_id} style={{ background: i % 2 ? LIGHT_GRAY : WHITE }}>
                            <td style={{ ...td, fontWeight: 700, color: BLUE }}>{r.subject_code || "—"}</td>
                            <td style={td}>{r.subject_title || "—"}</td>
                            <td style={{ ...td, textAlign: "center" }}>{r.units ?? "—"}</td>
                            <td style={td}>
                              <input value={r.grade} onChange={e => setGrade(r.subject_id, e.target.value)} placeholder="0.00"
                                style={{ width: "90px", padding: "6px 10px", border: `1px solid ${BORDER}`, borderRadius: "6px", fontSize: "13px", outline: "none" }} />
                            </td>
                            <td style={{ ...td }}>
                              <span style={{ display: "inline-block", padding: "5px 12px", border: `1px solid ${BORDER}`, borderRadius: "6px", fontSize: "12px", fontWeight: 700, color: remColor }}>{rem}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            {/* Footer */}
            <div style={{ padding: "12px 20px", borderTop: `1px solid ${BORDER}`, display: "flex", justifyContent: "flex-end", gap: "8px", flexShrink: 0, background: LIGHT_GRAY }}>
              <button type="button" onClick={() => setGradeStudent(null)} style={{ padding: "9px 18px", background: WHITE, color: "#374151", border: `1px solid ${BORDER}`, borderRadius: "8px", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>Cancel</button>
              <button type="button" onClick={save} disabled={saving || rows.length === 0}
                style={{ padding: "9px 20px", background: saving ? "#9CA3AF" : DARK_GREEN, color: WHITE, border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: 800, cursor: saving ? "default" : "pointer" }}>
                {saving ? "Saving…" : "Save Grades"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
