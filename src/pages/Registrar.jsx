import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { showToast, showConfirm } from "../components/Toast";

const GOLD       = "#F5A800";
const GREEN      = "#2E7D32";
const DARK_GREEN = "#1B5E20";
const WHITE      = "#FFFFFF";
const GRAY       = "#6B7280";
const LIGHT_GRAY = "#F9FAFB";
const BORDER     = "#E5E7EB";
const RED        = "#DC2626";
const BLUE       = "#1E88E5";
const LIGHT_BLUE = "#E3F2FD";

const YEAR_LEVELS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];

// Renders a QR code as an <img> via a free public QR image service — no extra
// npm dependency required. `data` is whatever plain-text payload should be
// embedded (here: a compact, pipe-delimited student identity string).
const qrImageUrl = (data, size = 180) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;

const ENROLLMENT_PERIODS = [
  { year: "1st Year", sem: "1st Semester" },
  { year: "1st Year", sem: "2nd Semester" },
  { year: "2nd Year", sem: "1st Semester" },
  { year: "2nd Year", sem: "2nd Semester" },
  { year: "3rd Year", sem: "1st Semester" },
  { year: "3rd Year", sem: "2nd Semester" },
  { year: "4th Year", sem: "1st Semester" },
  { year: "4th Year", sem: "2nd Semester" },
];

export default function Registrar({ user = {} }) {
  const isAdmin = user?.role === "administrator";
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentGrades, setStudentGrades]     = useState([]);
  
  const [loading, setLoading]       = useState(true);
  const [courses, setCourses]        = useState([]);
  const [savingGrades, setSavingGrades] = useState(false);
  const [searchStudent, setSearchStudent] = useState("");

  const [activeTab, setActiveTab]       = useState("tor");
  const [torStudentId, setTorStudentId]   = useState("");
  const [torGrades, setTorGrades]         = useState([]);
  const [torEnrollments, setTorEnrollments] = useState([]);
  const [loadingTor, setLoadingTor]       = useState(false);
  const [showTorSuggestions, setShowTorSuggestions] = useState(false);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [editingSubjectId, setEditingSubjectId] = useState(null);
  const [subjectForm, setSubjectForm] = useState({ subject_code: "", subject_title: "", units: "3", course: "", year_level: "1st Year", semester: "1" });
  const [subjectFilter, setSubjectFilter] = useState({ course: "", year_level: "", semester: "" });

  const [showStudentModal, setShowStudentModal] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState(null);
  const [savingStudent, setSavingStudent] = useState(false);
  const [studentForm, setStudentForm] = useState({ first_name: "", middle_name: "", last_name: "", student_number: "", course: "", year_level: "1st Year", section: "", gender: "Male" });
  const [enrollYearFilter, setEnrollYearFilter] = useState("");
  const [enrollYearEnrolledFilter, setEnrollYearEnrolledFilter] = useState("");
  const [studentQr, setStudentQr] = useState(null); // { payload, label } — shown right after enrolling a NEW student

  const fetchBaselineDirectory = async () => {
    setLoading(true);
    try {
      const sRes = await fetch(`${import.meta.env.VITE_API_URL}/api/erd/students`);
      const subRes = await fetch(`${import.meta.env.VITE_API_URL}/api/erd/subjects`);
      const cRes = await fetch(`${import.meta.env.VITE_API_URL}/api/erd/courses`);
      if (sRes.ok && subRes.ok) {
        setStudents(await sRes.json());
        setSubjects(await subRes.json());
      }
      if (cRes.ok) {
        const courseData = await cRes.json();
        setCourses(courseData.map(c => c.course));
      }
    } catch (err) {
      console.error("Registrar catalog alignment fault:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBaselineDirectory(); }, []);

  const selectStudentWorksheet = async (student) => {
    setSelectedStudent(student);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/erd/grades/${student.id}`);
      if (res.ok) setStudentGrades(await res.json());
    } catch (err) { console.error(err); }
  };

  const updateGradeCellState = (subjectId, value, keyField) => {
    setStudentGrades(prev => {
      const matchIndex = prev.findIndex(g => g.subject_id === subjectId);
      if (matchIndex !== -1) {
        const next = [...prev];
        next[matchIndex] = { ...next[matchIndex], [keyField]: value };
        return next;
      } else {
        return [...prev, { subject_id: subjectId, [keyField]: value, student_id: selectedStudent.id, semester: "1", year_start: 2026, year_end: 2027 }];
      }
    });
  };

  const saveWorksheetTranscript = async () => {
    if (!selectedStudent || savingGrades) return;
    if (selectedStudent.graduation_status === "graduated" && !isAdmin) {
      showToast("🎓 This student has graduated. Only an Administrator can edit their grades.", "error");
      return;
    }
    setSavingGrades(true);
    try {
      const validPayload = studentGrades.map(g => ({
        subject_id: g.subject_id,
        grade: g.grade !== "" && g.grade !== undefined ? parseFloat(g.grade) : null,
        remarks: g.remarks || (g.grade ? (parseFloat(g.grade) <= 3.0 ? "PASSED" : "FAILED") : ""),
        semester: g.semester || "1",
        year_start: g.year_start || 2026,
        year_end: g.year_end || 2027
      }));
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/erd/grades/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_id: selectedStudent.id, grades: validPayload })
      });
      if (res.ok) { showToast("Grades saved successfully!", "success"); selectStudentWorksheet(selectedStudent); }
    } catch (err) { console.error(err); } finally { setSavingGrades(false); }
  };

  const handleSubjectSubmit = async (e) => {
    e.preventDefault();
    const url = editingSubjectId
      ? `${import.meta.env.VITE_API_URL}/api/erd/subjects/${editingSubjectId}`
      : `${import.meta.env.VITE_API_URL}/api/erd/subjects`;
    try {
      const res = await fetch(url, { method: editingSubjectId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(subjectForm) });
      if (res.ok) { setShowSubjectModal(false); fetchBaselineDirectory(); }
    } catch (err) { console.error(err); }
  };

  const filteredSubjects = subjects.filter(sub => {
    if (subjectFilter.course && sub.course !== subjectFilter.course) return false;
    if (subjectFilter.year_level && sub.year_level !== subjectFilter.year_level) return false;
    if (subjectFilter.semester && String(sub.semester) !== subjectFilter.semester) return false;
    return true;
  });

  const triggerSubjectDeletion = (id) => {
    showConfirm({
      message: "Delete this subject? This cannot be undone.",
      confirmLabel: "Delete",
      icon: "🗑️",
      onConfirm: async () => {
        try {
          const res = await fetch(`${import.meta.env.VITE_API_URL}/api/erd/subjects/${id}`, { method: "DELETE" });
          if (res.ok) { showToast("Subject deleted.", "info"); fetchBaselineDirectory(); }
          else showToast("Failed to delete subject.", "error");
        } catch { showToast("Network error.", "error"); }
      },
    });
  };

  const handleStudentSubmit = async (e) => {
    e.preventDefault();
    if (savingStudent) return;
    setSavingStudent(true);
    const isNewEnrollment = !editingStudentId;
    const url = editingStudentId
      ? `${import.meta.env.VITE_API_URL}/api/erd/students/${editingStudentId}`
      : `${import.meta.env.VITE_API_URL}/api/erd/students`;
    try {
      const res = await fetch(url, { method: editingStudentId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(studentForm) });
      if (res.ok) {
        setShowStudentModal(false);
        fetchBaselineDirectory();
        // Newly enrolled student — automatically log their FIRST enrollment
        // period (1st Semester of the Year Level / Year Enrolled set above)
        // so it immediately shows up in Student List's enrollment history,
        // instead of requiring a second, separate "Enroll" step over there.
        // The Student List "Enroll" action still exists for adding LATER
        // periods (2nd Semester, promotion to the next year, etc.) — this
        // only covers the initial one created right here at intake.
        if (isNewEnrollment) {
          const newStudent = await res.json().catch(() => null);
          if (newStudent?.id && studentForm.year_enrolled) {
            try {
              await fetch(`${import.meta.env.VITE_API_URL}/api/erd/enrollments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  student_id: newStudent.id,
                  year_enrolled: studentForm.year_enrolled,
                  year_level: studentForm.year_level,
                  semester: "1st Semester",
                }),
              });
            } catch (enrollErr) { console.error("Auto-enrollment period creation failed:", enrollErr); }
          }

          // Generate their QR code right away so the registrar can print/save it on the spot.
          const fullName = `${studentForm.last_name}, ${studentForm.first_name} ${studentForm.middle_name || ""}`.replace(/\s+/g, " ").trim();
          const payload = [
            "CCA-STUDENT",
            studentForm.student_number || "—",
            fullName,
            studentForm.course,
            studentForm.year_level,
            studentForm.section || "—",
          ].join("|");
          setStudentQr({ payload, name: fullName, studentNumber: studentForm.student_number });
        }
      }
      else showToast("Failed to save student. Please try again.", "error");
    } catch (err) { console.error(err); } finally { setSavingStudent(false); }
  };

  const triggerStudentDeletion = (student) => {
    showConfirm({
      message: `Remove ${student.first_name} ${student.last_name} from the register? This cannot be undone.`,
      confirmLabel: "Remove",
      icon: "🗑️",
      onConfirm: async () => {
        try {
          const res = await fetch(`${import.meta.env.VITE_API_URL}/api/erd/students/${student.id}`, { method: "DELETE" });
          if (res.ok) {
            showToast(`${student.first_name} ${student.last_name} removed.`, "info");
            if (selectedStudent?.id === student.id) { setSelectedStudent(null); setStudentGrades([]); }
            fetchBaselineDirectory();
          } else showToast("Failed to remove student.", "error");
        } catch { showToast("Network error.", "error"); }
      },
    });
  };

  const filteredStudents = students.filter(s =>
    `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchStudent.toLowerCase()) ||
    s.course.toLowerCase().includes(searchStudent.toLowerCase()) ||
    (s.student_number || "").toLowerCase().includes(searchStudent.toLowerCase())
  );

  // Distinct enrollment years present in the directory, newest first, for the
  // "Year Enrolled" filter dropdown (fast lookup of a specific intake batch).
  const enrollmentYearOptions = Array.from(
    new Set(students.map(s => s.year_enrolled).filter(Boolean))
  ).sort((a, b) => b - a);

  // Enrollment Directory list: filter by Year Level and/or Year Enrolled, then
  // order 1st Year first, then by year enrolled (earliest enrolled first)
  // within each year level — for fast tracking of a given intake.
  const enrollmentDirectory = students
    .filter(s => !enrollYearFilter || s.year_level === enrollYearFilter)
    .filter(s => !enrollYearEnrolledFilter || String(s.year_enrolled) === enrollYearEnrolledFilter)
    .slice()
    .sort((a, b) => {
      const aIdx = YEAR_LEVELS.indexOf(a.year_level);
      const bIdx = YEAR_LEVELS.indexOf(b.year_level);
      const aRank = aIdx === -1 ? YEAR_LEVELS.length : aIdx;
      const bRank = bIdx === -1 ? YEAR_LEVELS.length : bIdx;
      if (aRank !== bRank) return aRank - bRank;
      const aYear = a.year_enrolled ?? 0;
      const bYear = b.year_enrolled ?? 0;
      return aYear - bYear;
    });

  const loadTorStudent = async (student) => {
    setTorStudentId(student.id);
    setSearchStudent(`${student.last_name}, ${student.first_name} ${student.middle_name || ""} — ${student.student_number || "No ID"}`.replace(/\s+/g, " ").trim());
    setShowTorSuggestions(false);
    setTorGrades([]);
    setTorEnrollments([]);
    setLoadingTor(true);
    try {
      const [gRes, eRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/api/erd/grades/${student.id}`),
        fetch(`${import.meta.env.VITE_API_URL}/api/erd/enrollments/${student.id}`)
      ]);
      if (gRes.ok) setTorGrades(await gRes.json());
      if (eRes.ok) setTorEnrollments(await eRes.json());
    } catch (_) {}
    setLoadingTor(false);
  };

  const clearTorStudent = () => {
    setTorStudentId("");
    setSearchStudent("");
    setTorGrades([]);
    setTorEnrollments([]);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", fontFamily: "system-ui" }}>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: "10px", borderBottom: `2px solid ${BORDER}`, paddingBottom: "10px" }}>
        {[
          { key: "tor",             label: "📄 Generate Transcript of Record" },
          { key: "subjects",        label: "📚 Subject" },
          { key: "manage_students", label: "🎓 Enroll Student" },
        ].map(t => (
          <button key={t.key} type="button" onClick={() => setActiveTab(t.key)}
            style={{ padding: "8px 16px", background: activeTab === t.key ? DARK_GREEN : WHITE, color: activeTab === t.key ? WHITE : GRAY, border: `1px solid ${BORDER}`, borderRadius: "6px", fontWeight: 700, cursor: "pointer" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TRANSCRIPT OF RECORD TAB ── */}
      {activeTab === "tor" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

          {/* Student selector card */}
          <div style={{ background: WHITE, borderRadius: "10px", border: `1px solid ${BORDER}`, padding: "20px", display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
            <div style={{ fontSize: "14px", fontWeight: 800, color: DARK_GREEN, flexShrink: 0 }}>📄 Transcript of Record</div>
            <div style={{ width: "240px", flexShrink: 0, position: "relative" }}>
              <input
                type="text"
                value={searchStudent}
                onChange={(e) => {
                  setSearchStudent(e.target.value);
                  setShowTorSuggestions(true);
                  if (torStudentId) { setTorStudentId(""); setTorGrades([]); setTorEnrollments([]); }
                }}
                onFocus={() => setShowTorSuggestions(true)}
                onBlur={() => setTimeout(() => setShowTorSuggestions(false), 150)}
                placeholder="🔍 Search student by name, or ID"
                style={{ width: "100%", padding: "7px 10px", border: `1px solid ${BORDER}`, borderRadius: "6px", fontSize: "12px", background: WHITE, color: "#111827", boxSizing: "border-box" }}
              />
              {showTorSuggestions && searchStudent && (
                <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: WHITE, border: `1px solid ${BORDER}`, borderRadius: "8px", boxShadow: "0 4px 20px rgba(0,0,0,0.15)", maxHeight: "260px", overflowY: "auto", zIndex: 50 }}>
                  {filteredStudents.length === 0 ? (
                    <div style={{ padding: "12px 14px", fontSize: "12px", color: GRAY }}>No matching students.</div>
                  ) : (
                    filteredStudents.map(s => (
                      <button key={s.id} type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => loadTorStudent(s)}
                        style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 14px", fontSize: "12px", background: "none", border: "none", borderBottom: `1px solid ${BORDER}`, cursor: "pointer", color: "#111827" }}
                        onMouseEnter={e => e.currentTarget.style.background = LIGHT_GRAY}
                        onMouseLeave={e => e.currentTarget.style.background = "none"}>
                        <strong>{s.last_name}, {s.first_name} {s.middle_name || ""}</strong>
                        <span style={{ color: GRAY }}> — {s.student_number || "No ID"} ({s.course})</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            {torStudentId && (
              <>
                <button
                  type="button"
                  onClick={clearTorStudent}
                  style={{ padding: "10px 14px", background: WHITE, color: GRAY, border: `1px solid ${BORDER}`, borderRadius: "8px", fontWeight: 600, cursor: "pointer", flexShrink: 0 }}
                >
                  ✕ Clear
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  style={{ padding: "10px 18px", background: DARK_GREEN, color: WHITE, border: "none", borderRadius: "8px", fontWeight: 700, cursor: "pointer", flexShrink: 0 }}
                >
                  🖨️ Print TOR
                </button>
              </>
            )}
          </div>

          {/* TOR body */}
          {torStudentId && (() => {
            const s = students.find(st => String(st.id) === String(torStudentId));
            if (!s) return null;
            const courseSubjects = subjects.filter(sub => sub.course === s.course);

            const semGroups = [
              { label: "1st Year — 1st Semester", year: "1st Year", sem: 1 },
              { label: "1st Year — 2nd Semester", year: "1st Year", sem: 2 },
              { label: "2nd Year — 1st Semester", year: "2nd Year", sem: 1 },
              { label: "2nd Year — 2nd Semester", year: "2nd Year", sem: 2 },
              { label: "3rd Year — 1st Semester", year: "3rd Year", sem: 1 },
              { label: "3rd Year — 2nd Semester", year: "3rd Year", sem: 2 },
              { label: "4th Year — 1st Semester", year: "4th Year", sem: 1 },
              { label: "4th Year — 2nd Semester", year: "4th Year", sem: 2 },
            ];

            return (
              <div style={{ background: WHITE, borderRadius: "10px", border: `1px solid ${BORDER}`, overflow: "hidden" }}>
                {/* TOR Header */}
                <div style={{ padding: "24px", background: DARK_GREEN, color: WHITE, textAlign: "center" }}>
                  <div style={{ fontSize: "13px", letterSpacing: "2px", marginBottom: "4px", opacity: 0.85 }}>REPUBLIC OF THE PHILIPPINES</div>
                  <div style={{ fontSize: "20px", fontWeight: 900, letterSpacing: "1px" }}>CCA PORTAL</div>
                  <div style={{ fontSize: "12px", opacity: 0.8, marginTop: "2px" }}>Office of the Registrar</div>
                  <div style={{ marginTop: "12px", fontSize: "15px", fontWeight: 800, letterSpacing: "3px", borderTop: "1px solid rgba(255,255,255,0.3)", paddingTop: "10px" }}>
                    TRANSCRIPT OF RECORDS
                  </div>
                </div>

                {/* Student info */}
                <div style={{ padding: "20px 28px", background: LIGHT_GRAY, borderBottom: `1px solid ${BORDER}`, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 32px", fontSize: "13px" }}>
                  <div><span style={{ color: GRAY, fontWeight: 700 }}>Student Name: </span><strong>{s.last_name}, {s.first_name} {s.middle_name || ""}</strong></div>
                  <div><span style={{ color: GRAY, fontWeight: 700 }}>Student No.: </span><strong>{s.student_number || "—"}</strong></div>
                  <div><span style={{ color: GRAY, fontWeight: 700 }}>Course: </span><strong>{s.course}</strong></div>
                  <div><span style={{ color: GRAY, fontWeight: 700 }}>Year Level: </span><strong>{s.year_level}</strong></div>
                  <div><span style={{ color: GRAY, fontWeight: 700 }}>Section: </span><strong>{s.section || "—"}</strong></div>
                  <div><span style={{ color: GRAY, fontWeight: 700 }}>Date Printed: </span><strong>{new Date().toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}</strong></div>
                </div>

                {/* Grades by semester */}
                {loadingTor ? (
                  <div style={{ padding: "40px", textAlign: "center", color: GRAY }}>⏳ Loading transcript...</div>
                ) : (
                  <div style={{ padding: "20px 28px", display: "flex", flexDirection: "column", gap: "24px" }}>
                    {semGroups.map(({ label, year, sem }) => {
                      const semSubs = courseSubjects.filter(sub => parseInt(sub.semester) === sem && (sub.year_level === year || !sub.year_level));
                      const enr = torEnrollments.find(e => e.year_level === year && (e.semester.includes("1st") ? 1 : 2) === sem);
                      if (semSubs.length === 0 && !enr) return null;

                      let totalUnits = 0, totalGradePoints = 0, gradedCount = 0;
                      semSubs.forEach(sub => {
                        const g = torGrades.find(gr => gr.subject_id === sub.id);
                        if (g?.grade) {
                          const u = parseFloat(sub.units) || 0;
                          totalUnits += u;
                          totalGradePoints += parseFloat(g.grade) * u;
                          gradedCount++;
                        }
                      });
                      const gwa = gradedCount > 0 && totalUnits > 0 ? (totalGradePoints / totalUnits).toFixed(2) : null;

                      return (
                        <div key={label}>
                          {/* Semester header */}
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                            <div style={{ fontSize: "13px", fontWeight: 800, color: DARK_GREEN, borderBottom: `2px solid ${DARK_GREEN}`, paddingBottom: "4px" }}>
                              {label}
                              {enr && <span style={{ fontSize: "11px", fontWeight: 400, color: GRAY, marginLeft: "12px" }}>S.Y. {enr.year_enrolled}–{parseInt(enr.year_enrolled) + 1}</span>}
                            </div>
                            {gwa && <div style={{ fontSize: "12px", color: GRAY }}>GWA: <strong style={{ color: DARK_GREEN }}>{gwa}</strong></div>}
                          </div>

                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                            <thead>
                              <tr style={{ background: "#E8F5E9" }}>
                                <th style={{ padding: "8px 12px", textAlign: "left", borderBottom: `1px solid ${BORDER}`, color: DARK_GREEN }}>Code</th>
                                <th style={{ padding: "8px 12px", textAlign: "left", borderBottom: `1px solid ${BORDER}`, color: DARK_GREEN }}>Subject Description</th>
                                <th style={{ padding: "8px 12px", textAlign: "center", borderBottom: `1px solid ${BORDER}`, color: DARK_GREEN }}>Units</th>
                                <th style={{ padding: "8px 12px", textAlign: "center", borderBottom: `1px solid ${BORDER}`, color: DARK_GREEN }}>Final Grade</th>
                                <th style={{ padding: "8px 12px", textAlign: "center", borderBottom: `1px solid ${BORDER}`, color: DARK_GREEN }}>Remarks</th>
                              </tr>
                            </thead>
                            <tbody>
                              {semSubs.length === 0 ? (
                                <tr><td colSpan="5" style={{ padding: "12px", textAlign: "center", color: GRAY, fontStyle: "italic" }}>No subjects on record for this semester.</td></tr>
                              ) : semSubs.map(sub => {
                                const g = torGrades.find(gr => gr.subject_id === sub.id);
                                const passed = g?.grade && parseFloat(g.grade) <= 3.0;
                                return (
                                  <tr key={sub.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                                    <td style={{ padding: "8px 12px", fontWeight: 700, color: BLUE }}>{sub.subject_code || "—"}</td>
                                    <td style={{ padding: "8px 12px" }}>{sub.subject_title}</td>
                                    <td style={{ padding: "8px 12px", textAlign: "center" }}>{sub.units}</td>
                                    <td style={{ padding: "8px 12px", textAlign: "center", fontWeight: 700, color: g?.grade ? (passed ? DARK_GREEN : RED) : GRAY }}>
                                      {g?.grade ? parseFloat(g.grade).toFixed(2) : "—"}
                                    </td>
                                    <td style={{ padding: "8px 12px", textAlign: "center" }}>
                                      {g?.remarks ? (
                                        <span style={{ padding: "2px 8px", borderRadius: "10px", fontSize: "11px", fontWeight: 700,
                                          background: passed ? "#E8F5E9" : "#FEE2E2",
                                          color: passed ? GREEN : RED }}>
                                          {g.remarks}
                                        </span>
                                      ) : <span style={{ color: GRAY }}>—</span>}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      );
                    })}

                    {/* Signature area */}
                    <div style={{ marginTop: "20px", borderTop: `1px solid ${BORDER}`, paddingTop: "24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "40px" }}>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ borderBottom: `1px solid #111827`, marginBottom: "4px", height: "36px" }} />
                        <div style={{ fontSize: "12px", fontWeight: 700, color: "#111827" }}>Registrar</div>
                        <div style={{ fontSize: "11px", color: GRAY }}>Signature over Printed Name</div>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ borderBottom: `1px solid #111827`, marginBottom: "4px", height: "36px" }} />
                        <div style={{ fontSize: "12px", fontWeight: 700, color: "#111827" }}>Date</div>
                        <div style={{ fontSize: "11px", color: GRAY }}>Date Issued</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Empty state */}
          {!torStudentId && (
            <div style={{ background: WHITE, borderRadius: "10px", border: `1px dashed ${BORDER}`, padding: "60px", textAlign: "center", color: GRAY }}>
              <div style={{ fontSize: "40px", marginBottom: "12px" }}>📄</div>
              <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "6px" }}>No student selected</div>
              <div style={{ fontSize: "13px" }}>Select a student from the dropdown above to generate their Transcript of Record.</div>
            </div>
          )}
        </div>
      )}

      {/* ── SUBJECTS TAB ── */}
      {activeTab === "subjects" && (
        <div style={{ background: WHITE, borderRadius: "10px", border: `1px solid ${BORDER}`, overflow: "hidden" }}>
          {/* Header */}
          <div style={{ padding: "14px 20px", background: LIGHT_GRAY, borderBottom: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
            <h3 style={{ margin: 0, fontSize: "14px", color: DARK_GREEN, fontWeight: 800 }}>Subject Catalog</h3>
            <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
              {/* Course filter */}
              <select value={subjectFilter.course} onChange={e => setSubjectFilter(f => ({ ...f, course: e.target.value }))}
                style={{ padding: "6px 10px", border: `1px solid ${BORDER}`, borderRadius: "6px", fontSize: "12px", background: WHITE, color: "#111827", cursor: "pointer" }}>
                <option value="">All Courses</option>
                {courses.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {/* Year Level filter */}
              <select value={subjectFilter.year_level} onChange={e => setSubjectFilter(f => ({ ...f, year_level: e.target.value }))}
                style={{ padding: "6px 10px", border: `1px solid ${BORDER}`, borderRadius: "6px", fontSize: "12px", background: WHITE, color: "#111827", cursor: "pointer" }}>
                <option value="">All Year Levels</option>
                {YEAR_LEVELS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              {/* Semester filter */}
              <select value={subjectFilter.semester} onChange={e => setSubjectFilter(f => ({ ...f, semester: e.target.value }))}
                style={{ padding: "6px 10px", border: `1px solid ${BORDER}`, borderRadius: "6px", fontSize: "12px", background: WHITE, color: "#111827", cursor: "pointer" }}>
                <option value="">All Semesters</option>
                <option value="1">1st Semester</option>
                <option value="2">2nd Semester</option>
              </select>
              {(subjectFilter.course || subjectFilter.year_level || subjectFilter.semester) && (
                <button type="button" onClick={() => setSubjectFilter({ course: "", year_level: "", semester: "" })}
                  style={{ padding: "6px 10px", border: `1px solid ${BORDER}`, borderRadius: "6px", fontSize: "12px", background: WHITE, cursor: "pointer", color: GRAY }}>
                  ✕ Clear
                </button>
              )}
              <button type="button" onClick={() => { setSubjectForm({ subject_code: "", subject_title: "", units: "3", course: courses[0] || "", year_level: "1st Year", semester: "1" }); setEditingSubjectId(null); setShowSubjectModal(true); }}
                style={{ padding: "8px 14px", background: DARK_GREEN, color: WHITE, border: "none", borderRadius: "6px", fontWeight: 700, cursor: "pointer" }}>
                ➕ Add Subject
              </button>
            </div>
          </div>

          {/* Filter summary badge */}
          {(subjectFilter.course || subjectFilter.year_level || subjectFilter.semester) && (
            <div style={{ padding: "8px 20px", background: "#E8F5E9", borderBottom: `1px solid ${BORDER}`, fontSize: "12px", color: DARK_GREEN, fontWeight: 600 }}>
              Showing: {subjectFilter.course || "All Courses"} — {subjectFilter.year_level || "All Years"} — {subjectFilter.semester === "1" ? "1st Semester" : subjectFilter.semester === "2" ? "2nd Semester" : "All Semesters"}
              <span style={{ color: GRAY, fontWeight: 400, marginLeft: "8px" }}>({filteredSubjects.length} subject{filteredSubjects.length !== 1 ? "s" : ""})</span>
            </div>
          )}

          {/* Grouped catalog blocks */}
          {(() => {
            const yearLabel = (y) => ({
              "1st Year": "FIRST YEAR",
              "2nd Year": "SECOND YEAR",
              "3rd Year": "THIRD YEAR",
              "4th Year": "FOURTH YEAR",
            }[y] || y?.toUpperCase() || "UNASSIGNED");

            const semLabel = (s) => ({
              "1": "FIRST SEMESTER",
              "2": "SECOND SEMESTER",
              1:   "FIRST SEMESTER",
              2:   "SECOND SEMESTER",
            }[s] || "UNASSIGNED");

            // Build ordered group keys
            const ORDER = [
              ["1st Year", "1"], ["1st Year", "2"],
              ["2nd Year", "1"], ["2nd Year", "2"],
              ["3rd Year", "1"], ["3rd Year", "2"],
              ["4th Year", "1"], ["4th Year", "2"],
            ];

            // Group filteredSubjects
            const grouped = {};
            filteredSubjects.forEach(sub => {
              const key = `${sub.year_level || ""}|||${String(sub.semester ?? "")}`;
              if (!grouped[key]) grouped[key] = [];
              grouped[key].push(sub);
            });

            // Collect any extra keys not in ORDER (e.g. no year_level)
            const orderedKeys = ORDER.map(([y, s]) => `${y}|||${s}`);
            const extraKeys = Object.keys(grouped).filter(k => !orderedKeys.includes(k));
            const allKeys = [...orderedKeys, ...extraKeys].filter(k => grouped[k]?.length > 0);

            if (allKeys.length === 0) {
              return (
                <div style={{ padding: "40px", textAlign: "center", color: GRAY, fontSize: "13px" }}>
                  No subjects match the selected filters.
                </div>
              );
            }

            return (
              <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
                {allKeys.map((key, idx) => {
                  const [yearRaw, semRaw] = key.split("|||");
                  const subs = grouped[key];
                  const isLast = idx === allKeys.length - 1;

                  return (
                    <div key={key} style={{ borderBottom: isLast ? "none" : `1px solid ${BORDER}` }}>
                      {/* Catalog section header */}
                      <div style={{
                        padding: "10px 20px",
                        background: `${DARK_GREEN}10`,
                        borderBottom: `2px solid ${DARK_GREEN}22`,
                        display: "flex", alignItems: "center", gap: "10px"
                      }}>
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: "12px", fontWeight: 800, color: DARK_GREEN, letterSpacing: "0.08em" }}>
                            {yearLabel(yearRaw)}
                          </span>
                          <span style={{ fontSize: "12px", color: GRAY, fontWeight: 600, margin: "0 8px" }}>—</span>
                          <span style={{ fontSize: "12px", fontWeight: 700, color: GREEN, letterSpacing: "0.06em" }}>
                            {semLabel(semRaw)}
                          </span>
                        </div>
                        <span style={{ fontSize: "11px", color: GRAY, fontWeight: 500 }}>
                          {subs.length} subject{subs.length !== 1 ? "s" : ""}
                        </span>
                      </div>

                      {/* Subjects table */}
                      <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                        <thead>
                          <tr style={{ background: LIGHT_GRAY, fontSize: "10px", color: GRAY, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            <th style={{ padding: "8px 16px", borderBottom: `1px solid ${BORDER}` }}>Code</th>
                            <th style={{ padding: "8px 16px", borderBottom: `1px solid ${BORDER}` }}>Title</th>
                            <th style={{ padding: "8px 16px", borderBottom: `1px solid ${BORDER}` }}>Units</th>
                            <th style={{ padding: "8px 16px", borderBottom: `1px solid ${BORDER}` }}>Course</th>
                            <th style={{ padding: "8px 16px", textAlign: "right", borderBottom: `1px solid ${BORDER}` }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {subs.map(sub => (
                            <tr key={sub.id} style={{ borderBottom: `1px solid ${BORDER}` }}
                              onMouseEnter={e => e.currentTarget.style.background = LIGHT_GRAY}
                              onMouseLeave={e => e.currentTarget.style.background = WHITE}>
                              <td style={{ padding: "11px 16px", fontSize: "12px", fontWeight: 700, color: BLUE }}>{sub.subject_code || "—"}</td>
                              <td style={{ padding: "11px 16px", fontSize: "13px", fontWeight: 600, color: "#111827" }}>{sub.subject_title}</td>
                              <td style={{ padding: "11px 16px", fontSize: "12px", color: "#374151" }}>{sub.units} Units</td>
                              <td style={{ padding: "11px 16px", fontSize: "12px" }}>
                                <span style={{ padding: "2px 8px", background: "#E8F5E9", color: GREEN, borderRadius: "4px", fontWeight: 700, fontSize: "11px" }}>{sub.course}</span>
                              </td>
                              <td style={{ padding: "11px 16px", textAlign: "right" }}>
                                <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px" }}>
                                  <button type="button"
                                    onClick={() => { setSubjectForm({ subject_code: sub.subject_code || "", subject_title: sub.subject_title || "", units: String(sub.units ?? "3"), course: sub.course || courses[0] || "", year_level: sub.year_level || "1st Year", semester: sub.semester != null ? String(sub.semester) : "1" }); setEditingSubjectId(sub.id); setShowSubjectModal(true); }}
                                    style={{ padding: "4px 10px", background: LIGHT_GRAY, border: `1px solid ${BORDER}`, borderRadius: "4px", fontSize: "11px", cursor: "pointer", fontWeight: 600 }}>
                                    Modify
                                  </button>
                                  <button type="button"
                                    onClick={() => triggerSubjectDeletion(sub.id)}
                                    style={{ padding: "4px 10px", background: WHITE, border: `1px solid ${BORDER}`, borderRadius: "4px", fontSize: "11px", color: RED, cursor: "pointer", fontWeight: 600 }}>
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* ── ENROLL STUDENT TAB ── */}
      {activeTab === "manage_students" && (
        <div style={{ background: WHITE, borderRadius: "10px", border: `1px solid ${BORDER}`, overflow: "visible" }}>
          <div style={{ padding: "14px 20px", background: LIGHT_GRAY, borderBottom: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "14px", color: DARK_GREEN, fontWeight: 800 }}>Student Enrollment Directory</h3>
              <span style={{ fontSize: "11px", color: GRAY }}>Enroll, edit, or remove student records — sorted 1st Year first, then by year enrolled</span>
            </div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
              {/* Year Level filter */}
              <select value={enrollYearFilter} onChange={e => setEnrollYearFilter(e.target.value)}
                style={{ padding: "6px 10px", border: `1px solid ${BORDER}`, borderRadius: "6px", fontSize: "12px", background: WHITE, color: "#111827", cursor: "pointer" }}>
                <option value="">All Year Levels</option>
                {YEAR_LEVELS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              {/* Year Enrolled filter — fast lookup of a specific intake batch */}
              <select value={enrollYearEnrolledFilter} onChange={e => setEnrollYearEnrolledFilter(e.target.value)}
                style={{ padding: "6px 10px", border: `1px solid ${BORDER}`, borderRadius: "6px", fontSize: "12px", background: WHITE, color: "#111827", cursor: "pointer" }}>
                <option value="">All Years Enrolled</option>
                {enrollmentYearOptions.map(y => <option key={y} value={String(y)}>{y}</option>)}
              </select>
              {(enrollYearFilter || enrollYearEnrolledFilter) && (
                <button type="button" onClick={() => { setEnrollYearFilter(""); setEnrollYearEnrolledFilter(""); }}
                  style={{ padding: "6px 10px", border: `1px solid ${BORDER}`, borderRadius: "6px", fontSize: "12px", background: WHITE, cursor: "pointer", color: GRAY }}>
                  ✕ Clear
                </button>
              )}
              <button type="button" onClick={() => { setStudentForm({ first_name: "", middle_name: "", last_name: "", student_number: "", course: courses[0] || "", year_level: "1st Year", section: "", year_enrolled: String(new Date().getFullYear()), gender: "Male" }); setEditingStudentId(null); setShowStudentModal(true); }}
                style={{ padding: "8px 14px", background: DARK_GREEN, color: WHITE, border: "none", borderRadius: "6px", fontWeight: 700, cursor: "pointer" }}>
                ➕ Enroll New Student
              </button>
            </div>
          </div>

          {/* Filter summary badge */}
          {(enrollYearFilter || enrollYearEnrolledFilter) && (
            <div style={{ padding: "8px 20px", background: "#E8F5E9", borderBottom: `1px solid ${BORDER}`, fontSize: "12px", color: DARK_GREEN, fontWeight: 600 }}>
              Showing: {enrollYearFilter || "All Year Levels"} — {enrollYearEnrolledFilter ? `Enrolled ${enrollYearEnrolledFilter}` : "All Years Enrolled"}
              <span style={{ color: GRAY, fontWeight: 400, marginLeft: "8px" }}>({enrollmentDirectory.length} student{enrollmentDirectory.length !== 1 ? "s" : ""})</span>
            </div>
          )}

          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ background: LIGHT_GRAY, borderBottom: `1px solid ${BORDER}`, fontSize: "11px", color: GRAY, textTransform: "uppercase" }}>
                <th style={{ padding: "12px 16px" }}>Student ID</th>
                <th style={{ padding: "12px 16px" }}>Full Name</th>
                <th style={{ padding: "12px 16px" }}>Course</th>
                <th style={{ padding: "12px 16px" }}>Year</th>
                <th style={{ padding: "12px 16px" }}>Year Enrolled</th>
                <th style={{ padding: "12px 16px" }}>Section</th>
                <th style={{ padding: "12px 16px", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" style={{ padding: "40px", textAlign: "center", color: GRAY }}>⏳ Loading...</td></tr>
              ) : students.length === 0 ? (
                <tr><td colSpan="7" style={{ padding: "40px", textAlign: "center", color: GRAY }}>No students enrolled yet.</td></tr>
              ) : enrollmentDirectory.length === 0 ? (
                <tr><td colSpan="7" style={{ padding: "40px", textAlign: "center", color: GRAY }}>No students match the selected filters.</td></tr>
              ) : (
                enrollmentDirectory.map(s => (
                  <tr key={s.id}
                    style={{ borderBottom: `1px solid ${BORDER}` }}
                    onMouseEnter={e => e.currentTarget.style.background = LIGHT_GRAY}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <td style={{ padding: "12px 16px", fontSize: "12px", fontFamily: "monospace", color: BLUE }}>{s.student_number || "—"}</td>
                    <td style={{ padding: "12px 16px", fontSize: "13px", fontWeight: 700, color: "#111827" }}>{s.last_name}, {s.first_name} {s.middle_name || ""}</td>
                    <td style={{ padding: "12px 16px", fontSize: "12px" }}>
                      <span style={{ padding: "2px 6px", background: "#E8F5E9", color: GREEN, borderRadius: "4px", fontWeight: 700 }}>{s.course || "—"}</span>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: "12px", color: "#4B5563" }}>{s.year_level || "—"}</td>
                    <td style={{ padding: "12px 16px", fontSize: "12px", color: "#4B5563" }}>{s.year_enrolled || "—"}</td>
                    <td style={{ padding: "12px 16px", fontSize: "12px", color: "#4B5563" }}>{s.section || "—"}</td>
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px" }}>
                        <button type="button"
                          onClick={() => {
                            setStudentForm({
                              first_name: s.first_name || "",
                              middle_name: s.middle_name || "",
                              last_name: s.last_name || "",
                              student_number: s.student_number || "",
                              course: s.course || courses[0] || "",
                              year_level: s.year_level || "1st Year",
                              section: s.section || "",
                              year_enrolled: s.year_enrolled ? String(s.year_enrolled) : String(new Date().getFullYear()),
                              gender: s.sex || "Male"
                            });
                            setEditingStudentId(s.id);
                            setShowStudentModal(true);
                          }}
                          style={{ padding: "4px 10px", background: LIGHT_GRAY, border: `1px solid ${BORDER}`, borderRadius: "4px", fontSize: "11px", cursor: "pointer", fontWeight: 600 }}>
                          Modify
                        </button>
                        <button type="button"
                          onClick={() => triggerStudentDeletion(s)}
                          style={{ padding: "4px 10px", background: WHITE, border: `1px solid ${BORDER}`, borderRadius: "4px", fontSize: "11px", color: RED, cursor: "pointer", fontWeight: 600 }}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── MODALS ── */}

      {/* Subject modal */}
      {showSubjectModal && createPortal(
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2147483647, isolation: "isolate" }}>
          <form onSubmit={handleSubjectSubmit} style={{ background: WHITE, borderRadius: "10px", width: "100%", maxWidth: "420px", padding: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <h3 style={{ margin: 0, color: DARK_GREEN, fontSize: "15px", fontWeight: 800 }}>{editingSubjectId ? "✏️ Edit Subject" : "➕ Add Subject"}</h3>
            {[["Subject Code *","subject_code","text","e.g. CR121"],["Subject Title *","subject_title","text","e.g. Criminal Law"],["Units *","units","number",""]].map(([lbl,key,type,ph])=>(
              <div key={key} style={{ display:"flex",flexDirection:"column",gap:"4px" }}>
                <label style={{ fontSize:"11px",fontWeight:700,color:GRAY }}>{lbl}</label>
                <input type={type} value={subjectForm[key]} onChange={e=>setSubjectForm({...subjectForm,[key]:e.target.value})} required placeholder={ph} style={{ padding:"8px",border:`1px solid ${BORDER}`,borderRadius:"6px" }} />
              </div>
            ))}
            <div style={{ display:"flex",flexDirection:"column",gap:"4px" }}>
              <label style={{ fontSize:"11px",fontWeight:700,color:GRAY }}>Course *</label>
              <select value={subjectForm.course} onChange={e=>setSubjectForm({...subjectForm,course:e.target.value})} style={{ padding:"8px",border:`1px solid ${BORDER}`,borderRadius:"6px",background:WHITE }}>
                {courses.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ display:"flex",gap:"10px" }}>
              <div style={{ display:"flex",flexDirection:"column",gap:"4px",flex:1 }}>
                <label style={{ fontSize:"11px",fontWeight:700,color:GRAY }}>Year Level *</label>
                <select value={subjectForm.year_level} onChange={e=>setSubjectForm({...subjectForm,year_level:e.target.value})} style={{ padding:"8px",border:`1px solid ${BORDER}`,borderRadius:"6px",background:WHITE }}>
                  {YEAR_LEVELS.map(y=><option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div style={{ display:"flex",flexDirection:"column",gap:"4px",flex:1 }}>
                <label style={{ fontSize:"11px",fontWeight:700,color:GRAY }}>Semester *</label>
                <select value={subjectForm.semester} onChange={e=>setSubjectForm({...subjectForm,semester:e.target.value})} style={{ padding:"8px",border:`1px solid ${BORDER}`,borderRadius:"6px",background:WHITE }}>
                  <option value="1">1st Semester</option>
                  <option value="2">2nd Semester</option>
                </select>
              </div>
            </div>
            <div style={{ display:"flex",justifyContent:"flex-end",gap:"8px",marginTop:"10px" }}>
              <button type="button" onClick={()=>setShowSubjectModal(false)} style={{ padding:"6px 14px",border:`1px solid ${BORDER}`,borderRadius:"6px",background:WHITE,cursor:"pointer" }}>Cancel</button>
              <button type="submit" style={{ padding:"6px 16px",background:DARK_GREEN,color:WHITE,border:"none",borderRadius:"6px",fontWeight:700,cursor:"pointer" }}>Save</button>
            </div>
          </form>
        </div>,
        document.body
      )}

      {/* Student add/edit modal */}
      {showStudentModal && createPortal(
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2147483647, isolation: "isolate" }}>
          <form onSubmit={handleStudentSubmit} style={{ background: WHITE, borderRadius: "10px", width: "100%", maxWidth: "400px", padding: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <h3 style={{ margin: 0, color: DARK_GREEN, fontSize: "15px", fontWeight: 800 }}>{editingStudentId ? "✏️ Edit Student" : "➕ Enroll New Student"}</h3>
            {[["First Name *","first_name"],["Middle Name","middle_name"],["Last Name *","last_name"],["Student Number","student_number"]].map(([lbl,key])=>(
              <div key={key} style={{ display:"flex",flexDirection:"column",gap:"4px" }}>
                <label style={{ fontSize:"11px",fontWeight:700,color:GRAY }}>{lbl}</label>
                <input type="text" value={studentForm[key]} onChange={e=>setStudentForm({...studentForm,[key]:e.target.value})} required={lbl.includes("*")} style={{ padding:"8px",border:`1px solid ${BORDER}`,borderRadius:"6px" }} />
              </div>
            ))}
            <div style={{ display:"flex",flexDirection:"column",gap:"4px" }}>
              <label style={{ fontSize:"11px",fontWeight:700,color:GRAY }}>Course *</label>
              <select value={studentForm.course} onChange={e=>setStudentForm({...studentForm,course:e.target.value})} style={{ padding:"8px",border:`1px solid ${BORDER}`,borderRadius:"6px",background:WHITE }}>
                {courses.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ display:"flex",flexDirection:"column",gap:"4px" }}>
              <label style={{ fontSize:"11px",fontWeight:700,color:GRAY }}>Sex *</label>
              <select value={studentForm.gender} onChange={e=>setStudentForm({...studentForm,gender:e.target.value})} style={{ padding:"8px",border:`1px solid ${BORDER}`,borderRadius:"6px",background:WHITE }}>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
            <div style={{ display:"flex",gap:"10px" }}>
              <div style={{ display:"flex",flexDirection:"column",gap:"4px",flex:1,minWidth:0 }}>
                <label style={{ fontSize:"11px",fontWeight:700,color:GRAY }}>Year Level *</label>
                <select value={studentForm.year_level} onChange={e=>setStudentForm({...studentForm,year_level:e.target.value})} style={{ width:"100%",padding:"8px",border:`1px solid ${BORDER}`,borderRadius:"6px",background:WHITE,boxSizing:"border-box" }}>
                  {YEAR_LEVELS.map(y=><option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div style={{ display:"flex",flexDirection:"column",gap:"4px",flex:1,minWidth:0 }}>
                <label style={{ fontSize:"11px",fontWeight:700,color:GRAY }}>Year Enrolled</label>
                <input type="number" value={studentForm.year_enrolled} onChange={e=>setStudentForm({...studentForm,year_enrolled:e.target.value})} placeholder="e.g. 2026" style={{ width:"100%",padding:"8px",border:`1px solid ${BORDER}`,borderRadius:"6px",boxSizing:"border-box" }} />
              </div>
              <div style={{ display:"flex",flexDirection:"column",gap:"4px",flex:1,minWidth:0 }}>
                <label style={{ fontSize:"11px",fontWeight:700,color:GRAY }}>Section</label>
                <input type="text" value={studentForm.section} onChange={e=>setStudentForm({...studentForm,section:e.target.value})} placeholder="e.g. A" style={{ width:"100%",padding:"8px",border:`1px solid ${BORDER}`,borderRadius:"6px",boxSizing:"border-box" }} />
              </div>
            </div>
            <div style={{ display:"flex",justifyContent:"flex-end",gap:"8px",marginTop:"10px" }}>
              <button type="button" onClick={()=>setShowStudentModal(false)} style={{ padding:"6px 14px",border:`1px solid ${BORDER}`,borderRadius:"6px",background:WHITE,cursor:"pointer" }}>Cancel</button>
              <button type="submit" disabled={savingStudent} style={{ padding:"6px 16px",background:DARK_GREEN,color:WHITE,border:"none",borderRadius:"6px",fontWeight:700,cursor:"pointer" }}>
                {savingStudent ? "⏳ Saving..." : "💾 Save Student"}
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}

      {/* Student QR code modal — shown right after enrolling a new student */}
      {studentQr && createPortal(
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2147483647, isolation: "isolate" }}>
          <div style={{ background: WHITE, borderRadius: "12px", width: "100%", maxWidth: "340px", padding: "24px", display: "flex", flexDirection: "column", alignItems: "center", gap: "14px", textAlign: "center" }}>
            <div style={{ fontSize: "28px" }}>✅</div>
            <h3 style={{ margin: 0, color: DARK_GREEN, fontSize: "15px", fontWeight: 800 }}>Student Enrolled</h3>
            <div style={{ fontSize: "12px", color: GRAY }}>Scan or print this QR code for the student's ID.</div>
            <img src={qrImageUrl(studentQr.payload, 200)} alt="Student QR code" width={200} height={200}
              style={{ border: `1px solid ${BORDER}`, borderRadius: "8px" }} />
            <div style={{ fontSize: "13px", fontWeight: 700, color: "#111827" }}>{studentQr.name}</div>
            <div style={{ fontSize: "12px", fontFamily: "monospace", color: BLUE }}>{studentQr.studentNumber || "—"}</div>
            <div style={{ display: "flex", gap: "8px", marginTop: "6px", width: "100%" }}>
              <button type="button" onClick={() => setStudentQr(null)}
                style={{ flex: 1, padding: "8px 14px", border: `1px solid ${BORDER}`, borderRadius: "6px", background: WHITE, cursor: "pointer", fontWeight: 600 }}>
                Close
              </button>
              <button type="button"
                onClick={() => {
                  const win = window.open("", "_blank", "width=360,height=480");
                  if (!win) return;
                  win.document.write(`
                    <html><head><title>Student QR — ${studentQr.name}</title></head>
                    <body style="font-family:system-ui,sans-serif;text-align:center;padding:24px;">
                      <h3>${studentQr.name}</h3>
                      <div style="color:#6B7280;font-size:12px;margin-bottom:12px;">${studentQr.studentNumber || ""}</div>
                      <img src="${qrImageUrl(studentQr.payload, 240)}" width="240" height="240" />
                      <div style="margin-top:16px;"><button onclick="window.print()" style="padding:8px 18px;background:${DARK_GREEN};color:white;border:none;border-radius:6px;font-weight:700;cursor:pointer;">🖨️ Print</button></div>
                    </body></html>
                  `);
                  win.document.close();
                }}
                style={{ flex: 1, padding: "8px 14px", background: DARK_GREEN, color: WHITE, border: "none", borderRadius: "6px", fontWeight: 700, cursor: "pointer" }}>
                🖨️ Print
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}