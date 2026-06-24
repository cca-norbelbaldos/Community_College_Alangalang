import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import QRCode from "qrcode";
import { showToast, showConfirm } from "../components/Toast";

const GREEN      = "#2E7D32";
const DARK_GREEN = "#1B5E20";
const WHITE      = "#FFFFFF";
const GRAY       = "#6B7280";
const BORDER     = "#E5E7EB";
const LIGHT_GRAY = "#F9FAFB";
const BLUE       = "#1E88E5";
const RED        = "#DC2626";

const YEAR_LEVELS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];

const formatSchoolId = (id) => `CCA-2026-${String(id).padStart(4, "0")}`;

// Offline-capable QR code rendered onto a <canvas> using the "qrcode" package.
// Usage: <QRCanvas data="..." size={200} />
function QRCanvas({ data, size = 200 }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (!canvasRef.current || !data) return;
    QRCode.toCanvas(canvasRef.current, data, {
      width: size,
      margin: 2,
      color: { dark: "#000000", light: "#ffffff" },
    }).catch(console.error);
  }, [data, size]);
  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      style={{ borderRadius: "8px", border: "1px solid #E5E7EB", display: "block", margin: "0 auto" }}
    />
  );
}

// Helper: generate a QR data URL (for print windows) — fully offline
async function qrDataUrl(data, size = 240) {
  return QRCode.toDataURL(data, { width: size, margin: 2 });
}

// ── Student Info Card (view modal content) ──────────────────────────────────
function StudentInfoCard({ student, enrollments, subjects, assignedSubjectIds = new Set(), user = {}, onSaved, canManageEnrollment = false, onDeleteEnrollment }) {
  const [expandedId, setExpandedId] = useState(null);
  // grades keyed by enrollment uid
  const [gradeMap, setGradeMap]     = useState({});
  const [savingMap, setSavingMap]   = useState({});
  const [loadingMap, setLoadingMap] = useState({});

  const isAdmin = user?.role === "administrator";

  const fullName = `${student.first_name || ""} ${student.middle_name ? student.middle_name.charAt(0) + "." : ""} ${student.last_name || ""}`.replace(/\s+/g, " ").trim();

  const semToNum = (s) => s.includes("2nd") ? 2 : 1;

  const loadGrades = async (uid, studentId, yearLevel, semester) => {
    if (gradeMap[uid]) return; // already loaded
    setLoadingMap(p => ({ ...p, [uid]: true }));
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/erd/grades/${studentId}`);
      if (res.ok) {
        const all = await res.json();
        // filter by semester number matching this enrollment
        const semNum = semToNum(semester);
        const filtered = all.filter(g => parseInt(g.semester) === semNum);
        setGradeMap(p => ({ ...p, [uid]: filtered }));
      }
    } catch (_) {}
    setLoadingMap(p => ({ ...p, [uid]: false }));
  };

  const updateGrade = (uid, subjectId, field, value) => {
    setGradeMap(prev => {
      const list = prev[uid] || [];
      const idx  = list.findIndex(g => g.subject_id === subjectId);
      if (idx !== -1) {
        const next = [...list];
        next[idx] = { ...next[idx], [field]: value };
        return { ...prev, [uid]: next };
      }
      return { ...prev, [uid]: [...list, { subject_id: subjectId, [field]: value, student_id: student.id }] };
    });
  };

  const saveGrades = async (uid, enr) => {
    setSavingMap(p => ({ ...p, [uid]: true }));
    const list = gradeMap[uid] || [];
    const semNum = semToNum(enr.semester);
    const payload = list.map(g => ({
      subject_id: g.subject_id,
      grade:    g.grade !== "" && g.grade !== undefined ? parseFloat(g.grade) : null,
      remarks:  g.remarks || (g.grade ? (parseFloat(g.grade) <= 3.0 ? "PASSED" : "FAILED") : ""),
      semester: semNum,
      year_start: parseInt(enr.year_enrolled),
      year_end:   parseInt(enr.year_enrolled) + 1,
    }));
    let success = false;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/erd/grades/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_id: student.id, grades: payload }),
      });
      success = res.ok;
    } catch (_) {}
    setSavingMap(p => ({ ...p, [uid]: false }));

    if (success) {
      // Lock the rows that were just graded so they go read-only immediately —
      // they'll show as fully "saved" with real ids next time this loads from the server.
      setGradeMap(prev => {
        const prevList = prev[uid] || [];
        const next = prevList.map(g =>
          payload.some(p => p.subject_id === g.subject_id) ? { ...g, _justSaved: true } : g
        );
        return { ...prev, [uid]: next };
      });
      onSaved && onSaved();
    }
  };

  // Admin-only: delete a saved grade record, which unlocks that subject for editing again.
  const deleteGrade = async (uid, g) => {
    if (!g.id) return;
    showConfirm({
      message: "Delete this saved grade? The subject will become editable again.",
      confirmLabel: "Delete",
      icon: "🗑️",
      onConfirm: async () => {
        try {
          await fetch(`${import.meta.env.VITE_API_URL}/api/erd/grades/${g.id}`, { method: "DELETE" });
          showToast("Grade deleted.", "info");
        } catch (_) {}
        setGradeMap(prev => {
          const list = prev[uid] || [];
          const idx  = list.findIndex(gr => gr.subject_id === g.subject_id);
          if (idx === -1) return prev;
          const next = [...list];
          next[idx] = { ...next[idx], id: undefined, grade: "", remarks: "", _justSaved: false };
          return { ...prev, [uid]: next };
        });
      },
    });
  };

  // subjects for this student's course
  const courseSubjects = (subjects || []).filter(s => s.course === student.course);

  const generateIdCard = () => {
    const win = window.open("", "_blank", "width=500,height=720");
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Student ID — ${fullName}</title>
          <style>
            body { font-family: system-ui, sans-serif; display: flex; justify-content: center; padding: 40px; background: #F3F4F6; margin: 0; }
            .card { width: 320px; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 24px rgba(0,0,0,0.18); background: ${WHITE}; }
            .header { background: ${GREEN}; color: ${WHITE}; padding: 14px 18px; text-align: center; }
            .header .school { font-weight: 800; font-size: 13px; letter-spacing: 0.5px; }
            .header .sub { font-size: 10px; opacity: 0.9; margin-top: 2px; }
            .photo-wrap { display: flex; justify-content: center; margin-top: 20px; }
            .photo { width: 110px; height: 110px; border-radius: 50%; background: #CBD5E0; display: flex; align-items: center; justify-content: center; font-size: 48px; border: 4px solid ${GREEN}; overflow: hidden; }
            .name { text-align: center; font-weight: 800; font-size: 16px; color: #111827; margin-top: 14px; padding: 0 16px; }
            .role { text-align: center; font-size: 11px; color: ${GREEN}; font-weight: 700; margin-top: 2px; }
            .details { padding: 16px 24px 24px; font-size: 12px; }
            .row { display: grid; grid-template-columns: 80px 1fr; gap: 4px; padding: 4px 0; }
            .label { color: ${GRAY}; font-weight: 700; }
            .footer { background: ${LIGHT_GRAY}; padding: 10px; text-align: center; font-size: 10px; color: ${GRAY}; border-top: 1px solid ${BORDER}; }
            .print-btn { display: block; margin: 16px auto 0; padding: 10px 20px; background: ${GREEN}; color: ${WHITE}; border: none; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 13px; }
            @media print { .print-btn { display: none; } body { background: ${WHITE}; padding: 0; } }
          </style>
        </head>
        <body>
          <div>
            <div class="card">
              <div class="header">
                <div class="school">CCA PORTAL</div>
                <div class="sub">Official Student Identification Card</div>
              </div>
              <div class="photo-wrap">
                <div class="photo">${student.profile_picture ? `<img src="${student.profile_picture}" style="width:100%;height:100%;object-fit:cover;" />` : "👤"}</div>
              </div>
              <div class="name">${fullName.toUpperCase()}</div>
              <div class="role">STUDENT</div>
              <div class="details">
                <div class="row"><span class="label">Student No.</span><span>${student.student_number || "—"}</span></div>
                <div class="row"><span class="label">Course</span><span>${student.course || "—"}</span></div>
                <div class="row"><span class="label">Year / Sec</span><span>${student.year_level || "—"}${student.section ? " / Section " + student.section : ""}</span></div>
              </div>
              <div class="footer">Valid for SY ${new Date().getFullYear()}–${new Date().getFullYear() + 1}</div>
            </div>
            <button class="print-btn" onclick="window.print()">🖨️ Print ID Card</button>
          </div>
        </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: "10px", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px", padding: "16px 20px", background: LIGHT_GRAY, borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: "#CBD5E0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "28px", overflow: "hidden" }}>
          {student.profile_picture ? <img src={student.profile_picture} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "👤"}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "16px", fontWeight: 800, color: "#111827" }}>
            {(student.last_name || "").toUpperCase()}, {(student.first_name || "").toUpperCase()} {student.middle_name ? student.middle_name.toUpperCase() : ""}
          </div>
          <div style={{ fontSize: "12px", color: GREEN, fontWeight: 700, marginBottom: "6px" }}>STUDENT</div>
          <div style={{ display: "grid", gridTemplateColumns: "90px 1fr", gap: "2px 8px", fontSize: "12px" }}>
            <span style={{ color: GRAY, fontWeight: 700 }}>Student No.</span><span>{student.student_number || "—"}</span>
            <span style={{ color: GRAY, fontWeight: 700 }}>Course</span><span>{student.course || "—"}</span>
            <span style={{ color: GRAY, fontWeight: 700 }}>Year / Sec</span>
            <span>{student.year_level || "—"}{student.section ? ` / Section ${student.section}` : ""}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
          <button type="button" title="Generate Student ID Card"
            onClick={generateIdCard}
            style={{ width: "44px", height: "44px", borderRadius: "8px", background: GREEN, border: "none", cursor: "pointer", fontSize: "18px", display: "flex", alignItems: "center", justifyContent: "center", color: WHITE, boxShadow: "0 1px 4px rgba(0,0,0,0.18)" }}>
            🪪
          </button>
        </div>
      </div>

      {/* Enrollment history */}
      <div style={{ padding: "12px 20px", display: "flex", flexDirection: "column", gap: "8px" }}>
        {enrollments.length === 0 ? (
          <div style={{ padding: "24px", textAlign: "center", color: GRAY, fontSize: "13px" }}>
            No enrollment records yet.
          </div>
        ) : (
          enrollments.map((enr, idx) => {
            const uid = enr.id ?? `idx-${idx}`;
            const isOpen = expandedId === uid;
            const grades = gradeMap[uid] || [];
            const isLoading = loadingMap[uid];
            const isSaving  = savingMap[uid];

            // subjects filtered to this semester
            const semNum = semToNum(enr.semester);
            const semSubjects = courseSubjects.filter(s => parseInt(s.semester) === semNum && (s.year_level === enr.year_level || !s.year_level));

            return (
              <div key={uid} style={{ border: `1px solid ${BORDER}`, borderRadius: "8px", overflow: "hidden" }}>
                {/* Accordion header */}
                <div
                  onClick={() => {
                    const next = isOpen ? null : uid;
                    setExpandedId(next);
                    if (next) loadGrades(uid, student.id, enr.year_level, enr.semester);
                  }}
                  style={{ width: "100%", boxSizing: "border-box", display: "flex", alignItems: "center", gap: "10px", padding: "12px 16px", background: WHITE, border: "none", cursor: "pointer", textAlign: "left" }}>
                  <span style={{ fontSize: "13px", color: GRAY, display: "inline-block", transform: isOpen ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▶</span>
                  <span style={{ fontWeight: 800, fontSize: "13px", color: "#111827" }}>{enr.year_level} — {enr.semester}</span>
                  <span style={{ fontSize: "12px", color: GRAY }}>S.Y. {enr.year_enrolled}–{parseInt(enr.year_enrolled) + 1}</span>
                  <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                    <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "12px", background: "#E8F5E9", color: GREEN, fontWeight: 700, whiteSpace: "nowrap" }}>ENROLLED</span>
                    {canManageEnrollment && (
                      <button type="button"
                        onClick={(e) => { e.stopPropagation(); onDeleteEnrollment && onDeleteEnrollment(enr); }}
                        title="Delete this enrollment record — use if it was enrolled by mistake"
                        style={{ background: "#FEE2E2", border: `1px solid #FCA5A5`, borderRadius: "6px", cursor: "pointer", fontSize: "13px", color: RED, padding: "4px 8px", lineHeight: 1, flexShrink: 0 }}>
                        🗑️
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded: enrollment info + grade sheet */}
                {isOpen && (
                  <div style={{ background: LIGHT_GRAY, borderTop: `1px solid ${BORDER}` }}>
                    {/* Enrollment detail strip */}
                    <div style={{ padding: "10px 16px 10px 42px", display: "grid", gridTemplateColumns: "130px 1fr 130px 1fr", gap: "4px 16px", fontSize: "12px", borderBottom: `1px solid ${BORDER}` }}>
                      <span style={{ color: GRAY, fontWeight: 700 }}>Year Enrolled</span><span>{enr.year_enrolled}</span>
                      <span style={{ color: GRAY, fontWeight: 700 }}>School Year</span><span>S.Y. {enr.year_enrolled}–{parseInt(enr.year_enrolled) + 1}</span>
                      <span style={{ color: GRAY, fontWeight: 700 }}>Year Level</span><span>{enr.year_level}</span>
                      <span style={{ color: GRAY, fontWeight: 700 }}>Semester</span><span>{enr.semester}</span>
                      <span style={{ color: GRAY, fontWeight: 700 }}>Status</span><span style={{ color: GREEN, fontWeight: 700 }}>ENROLLED</span>
                    </div>

                    {/* Grade sheet */}
                    <div style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                        <div>
                          <div style={{ fontSize: "13px", fontWeight: 800, color: DARK_GREEN }}>
                            {student.first_name} {student.last_name}
                          </div>
                          <div style={{ fontSize: "11px", color: GRAY }}>Grade Sheet — {enr.year_level} {enr.semester}</div>
                        </div>
                        <button type="button" onClick={() => saveGrades(uid, enr)} disabled={isSaving}
                          style={{ padding: "7px 16px", background: GREEN, color: WHITE, border: "none", borderRadius: "6px", fontWeight: 700, fontSize: "12px", cursor: "pointer" }}>
                          {isSaving ? "⏳ Saving..." : "💾 Save Grades"}
                        </button>
                      </div>

                      {isLoading ? (
                        <div style={{ padding: "20px", textAlign: "center", color: GRAY, fontSize: "12px" }}>⏳ Loading grades...</div>
                      ) : semSubjects.length === 0 ? (
                        <div style={{ padding: "16px", textAlign: "center", color: GRAY, fontSize: "12px", border: `1px dashed ${BORDER}`, borderRadius: "6px" }}>
                          No subjects found for {enr.year_level} {enr.semester}.
                        </div>
                      ) : (
                        <div style={{ background: WHITE, borderRadius: "8px", border: `1px solid ${BORDER}`, overflow: "hidden" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                            <thead>
                              <tr style={{ background: LIGHT_GRAY, fontSize: "11px", color: GRAY, textTransform: "uppercase" }}>
                                <th style={{ padding: "9px 12px", borderBottom: `1px solid ${BORDER}` }}>Code</th>
                                <th style={{ padding: "9px 12px", borderBottom: `1px solid ${BORDER}` }}>Subject</th>
                                <th style={{ padding: "9px 12px", borderBottom: `1px solid ${BORDER}` }}>Units</th>
                                <th style={{ padding: "9px 12px", borderBottom: `1px solid ${BORDER}` }}>Grade (1.00–5.00)</th>
                                <th style={{ padding: "9px 12px", borderBottom: `1px solid ${BORDER}` }}>Remarks</th>
                              </tr>
                            </thead>
                            <tbody>
                              {semSubjects.map(sub => {
                                const g = grades.find(gr => gr.subject_id === sub.id) || {};
                                const isAssigned = assignedSubjectIds.has(sub.id);
                                const isLocked   = !!g.id || !!g._justSaved;
                                const canEdit    = isAdmin ? !isLocked : (isAssigned && !isLocked);
                                const remarksPlaceholder = isLocked ? "🔒 Saved" : (!isAdmin && !isAssigned) ? "🔒 Not assigned" : "PASSED / FAILED";
                                const lockReason = isLocked
                                  ? "Grade already saved — delete it to edit again"
                                  : (!isAdmin && !isAssigned)
                                    ? "You are not assigned to teach this subject"
                                    : "";
                                return (
                                  <tr key={sub.id} style={{ borderBottom: `1px solid ${BORDER}`, opacity: (isAdmin || isAssigned) ? 1 : 0.6 }}>
                                    <td style={{ padding: "9px 12px", fontSize: "12px", fontWeight: 700, color: BLUE }}>{sub.subject_code || sub.id}</td>
                                    <td style={{ padding: "9px 12px", fontSize: "12px" }}>{sub.subject_title}</td>
                                    <td style={{ padding: "9px 12px", fontSize: "12px" }}>{sub.units}</td>
                                    <td style={{ padding: "9px 12px" }}>
                                      <input type="number" step="0.25" min="1.0" max="5.0" placeholder="0.00"
                                        value={g.grade || ""}
                                        disabled={!canEdit}
                                        title={lockReason}
                                        onChange={e => updateGrade(uid, sub.id, "grade", e.target.value)}
                                        style={{ width: "80px", padding: "4px 8px", fontSize: "12px", border: `1px solid ${BORDER}`, borderRadius: "4px", background: canEdit ? WHITE : LIGHT_GRAY, color: canEdit ? "#111827" : GRAY, cursor: canEdit ? "text" : "not-allowed" }} />
                                    </td>
                                    <td style={{ padding: "9px 12px" }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                        <input type="text" placeholder={remarksPlaceholder}
                                          value={g.remarks || ""}
                                          disabled={!canEdit}
                                          title={lockReason}
                                          onChange={e => updateGrade(uid, sub.id, "remarks", e.target.value)}
                                          style={{ width: "130px", padding: "4px 8px", fontSize: "12px", border: `1px solid ${BORDER}`, borderRadius: "4px", background: canEdit ? WHITE : LIGHT_GRAY, color: canEdit ? "#111827" : GRAY, cursor: canEdit ? "text" : "not-allowed" }} />
                                        {isAdmin && g.id && (
                                          <button type="button" onClick={() => deleteGrade(uid, g)}
                                            title="Delete saved grade (Administrator only)"
                                            style={{ background: "none", border: "none", cursor: "pointer", fontSize: "13px", color: RED, padding: "2px" }}>
                                            🗑️
                                          </button>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function AddStudents({ user = {} }) {
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [userRolesMap, setUserRolesMap] = useState({}); // users_id -> roles[]
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");

  // Subjects the CURRENTLY LOGGED-IN user is assigned to teach (erd_subject_load).
  // Grade inputs in the Student List view are locked unless the subject is in here.
  const [assignedSubjectIds, setAssignedSubjectIds] = useState(new Set());

  // 3-dot dropdown
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });

  // Enroll modal
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [enrollTarget, setEnrollTarget] = useState(null);
  const [enrollForm, setEnrollForm] = useState({ year_enrolled: new Date().getFullYear(), year_level: "1st Year", semester: "1st Semester" });
  const [savingEnroll, setSavingEnroll] = useState(false);
  const [enrollQr, setEnrollQr] = useState(null); // set after a successful enrollment — shows the student's QR code
  const [qrStudent, setQrStudent] = useState(null); // { student } — shows QR modal from student list

  // View student info modal
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewStudent, setViewStudent] = useState(null);
  const [viewEnrollments, setViewEnrollments] = useState([]);
  const [loadingEnrollments, setLoadingEnrollments] = useState(false);

  // local fallback store for enrollment records
  const [localEnrollments, setLocalEnrollments] = useState({});


  // Save confirmation toast, shown right before the View modal auto-closes.
  const [toast, setToast] = useState(null);
  const saveToastTimer = useRef(null);

  const handleGradesSaved = () => {
    setToast({ msg: "✅ Grades saved successfully. The record is now locked — only an administrator can delete a grade to edit it again." });
    if (saveToastTimer.current) clearTimeout(saveToastTimer.current);
    saveToastTimer.current = setTimeout(() => {
      setShowViewModal(false);
      setToast(null);
    }, 1800);
  };

  useEffect(() => { fetchStudentDirectory(); }, []);

  useEffect(() => {
    return () => { if (saveToastTimer.current) clearTimeout(saveToastTimer.current); };
  }, []);

  // Load which subjects the current logged-in user is assigned to teach.
  useEffect(() => {
    if (!user?.id) { setAssignedSubjectIds(new Set()); return; }
    (async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/erd/faculty/assignments/${user.id}`);
        if (res.ok) {
          const rows = await res.json();
          setAssignedSubjectIds(new Set(rows.map(r => r.subject_id)));
        } else {
          setAssignedSubjectIds(new Set());
        }
      } catch (_) {
        setAssignedSubjectIds(new Set());
      }
    })();
  }, [user?.id]);

  useEffect(() => {
    if (openDropdownId === null) return;
    const close = () => setOpenDropdownId(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [openDropdownId]);

  const fetchStudentDirectory = async () => {
    setLoading(true);
    try {
      const [sRes, subRes, usersRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/api/erd/students`),
        fetch(`${import.meta.env.VITE_API_URL}/api/erd/subjects`),
        fetch(`${import.meta.env.VITE_API_URL}/api/erd/users`)
      ]);
      if (sRes.ok) setStudents(await sRes.json());
      if (subRes.ok) setSubjects(await subRes.json());
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        // Build a map of users_id -> roles[] for quick role lookup
        const rolesMap = {};
        usersData.forEach(u => {
          rolesMap[u.id] = Array.isArray(u.roles)
            ? u.roles.map(r => r.toLowerCase())
            : (u.role ? [u.role.toLowerCase()] : []);
        });
        setUserRolesMap(rolesMap);
      }
    } catch (err) {
      console.error("Failed to load student list:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEnrollmentsForStudent = async (studentId) => {
    setLoadingEnrollments(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/erd/enrollments/${studentId}`);
      if (res.ok) {
        setViewEnrollments(await res.json());
        setLoadingEnrollments(false);
        return;
      }
    } catch (_) {}
    setViewEnrollments(localEnrollments[studentId] || []);
    setLoadingEnrollments(false);
  };

  const openViewModal = async (student) => {
    setViewStudent(student);
    setShowViewModal(true);
    await fetchEnrollmentsForStudent(student.id);
  };

  // Delete a single enrollment period record — for fixing a mistaken enrollment.
  // Real (server-persisted) records are deleted via the API; locally queued
  // records (id starting with "local-", used as an offline fallback) are just
  // dropped from client state.
  const deleteEnrollment = (enr) => {
    showConfirm({
      message: `Delete enrollment record — ${enr.year_level} — ${enr.semester}, S.Y. ${enr.year_enrolled}–${parseInt(enr.year_enrolled) + 1}? This cannot be undone.`,
      confirmLabel: "Delete",
      icon: "🗑️",
      onConfirm: async () => {
        if (enr.id && !String(enr.id).startsWith("local-")) {
          try {
            await fetch(`${import.meta.env.VITE_API_URL}/api/erd/enrollments/${enr.id}`, { method: "DELETE" });
            showToast("Enrollment record deleted.", "info");
          } catch (_) {}
        }
        setViewEnrollments(prev => prev.filter(e => e.id !== enr.id));
        const studentId = viewStudent?.id ?? enr.student_id;
        if (studentId != null) {
          setLocalEnrollments(prev => ({
            ...prev,
            [studentId]: (prev[studentId] || []).filter(e => e.id !== enr.id)
          }));
        }
      },
    });
  };

  const openEnrollModal = (student) => {
    setEnrollTarget(student);
    setEnrollForm({ year_enrolled: new Date().getFullYear(), year_level: "1st Year", semester: "1st Semester" });
    setEnrollQr(null);
    setShowEnrollModal(true);
  };

  const closeEnrollModal = () => {
    setShowEnrollModal(false);
    setEnrollQr(null);
  };

  const handleEnrollSubmit = async (e) => {
    e.preventDefault();
    if (savingEnroll || !enrollTarget) return;
    setSavingEnroll(true);

    const newRecord = {
      id: `local-${Date.now()}`,
      student_id: enrollTarget.id,
      year_enrolled: enrollForm.year_enrolled,
      year_level: enrollForm.year_level,
      semester: enrollForm.semester
    };

    let success = false;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/erd/enrollments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRecord)
      });
      if (res.ok) {
        const saved = await res.json().catch(() => newRecord);
        newRecord.id = saved.id || newRecord.id;
        success = true;
      }
    } catch (_) {}

    setLocalEnrollments(prev => ({
      ...prev,
      [enrollTarget.id]: [...(prev[enrollTarget.id] || []), newRecord]
    }));

    if (viewStudent?.id === enrollTarget.id) {
      setViewEnrollments(prev => [...prev, newRecord]);
    }

    setSavingEnroll(false);

    if (success) {
      // Generate this student's enrollment QR code right away instead of
      // closing the modal — gives the registrar something to print/save on
      // the spot to confirm the enrollment just went through.
      const fullName = `${enrollTarget.last_name}, ${enrollTarget.first_name} ${enrollTarget.middle_name || ""}`.replace(/\s+/g, " ").trim();
      const payload = [
        "CCA-ENROLL",
        enrollTarget.student_number || "—",
        fullName,
        enrollForm.year_level,
        enrollForm.semester,
        `SY ${enrollForm.year_enrolled}-${parseInt(enrollForm.year_enrolled) + 1}`,
      ].join("|");
      setEnrollQr({ payload, name: fullName, studentNumber: enrollTarget.student_number, summary: `${enrollForm.year_level} — ${enrollForm.semester}, S.Y. ${enrollForm.year_enrolled}–${parseInt(enrollForm.year_enrolled) + 1}` });
    } else {
      closeEnrollModal();
    }
  };

  // GET /api/erd/students already JOINs erd_student→erd_users,
  // so every row is a genuine student record — no role cross-check needed.
  const studentsWithRole = students;

  // Only Administrator and Registrar may enroll students. Pull the current
  // user's full role list from userRolesMap (built from GET /api/erd/users,
  // which already includes the logged-in user) and fall back to the single
  // `user.role` field if that map hasn't loaded yet.
  const myRoles = userRolesMap[user?.id] && userRolesMap[user.id].length > 0
    ? userRolesMap[user.id]
    : (user?.role ? [user.role.toLowerCase()] : []);
  const canEnroll = myRoles.includes("administrator") || myRoles.includes("registrar");

  const filteredStudents = studentsWithRole.filter(s =>
    `${s.first_name} ${s.last_name} ${s.student_number} ${s.course}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div style={{ fontFamily: "system-ui, sans-serif" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", gap: "16px" }}>
        <div style={{ flex: 1, maxWidth: "420px" }}>
          <input
            type="text"
            placeholder="🔍 Search students by name, ID, or course..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: "100%", padding: "7px 12px", border: `1px solid ${BORDER}`, borderRadius: "6px", fontSize: "12px", outline: "none", boxSizing: "border-box" }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Refresh button */}
          <button
            type="button"
            onClick={fetchStudentDirectory}
            title="Refresh list"
            style={{ padding: "7px 11px", background: WHITE, color: GRAY, border: `1px solid ${BORDER}`, borderRadius: "6px", fontSize: "12px", cursor: "pointer" }}
          >
            🔄
          </button>

          {/* Info badge */}
          <div style={{ padding: "6px 11px", background: LIGHT_GRAY, border: `1px solid ${BORDER}`, borderRadius: "6px", fontSize: "11px", color: GRAY, fontWeight: 600 }}>
            {studentsWithRole.length} student{studentsWithRole.length !== 1 ? "s" : ""} enrolled
          </div>
        </div>
      </div>

      

      {/* Table */}
      <div style={{ background: WHITE, borderRadius: "12px", border: `1px solid ${BORDER}`, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ background: LIGHT_GRAY, borderBottom: `1px solid ${BORDER}` }}>
              {["Identity Profile", "Student Number", "Program", "Year & Section", "Address"].map(h => (
                <th key={h} style={{ padding: "9px 14px", fontSize: "10px", fontWeight: 700, color: GRAY, textTransform: "uppercase", letterSpacing: "0.3px" }}>{h}</th>
              ))}
              <th style={{ padding: "9px 14px", fontSize: "10px", fontWeight: 700, color: GRAY, textTransform: "uppercase", letterSpacing: "0.3px", textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" style={{ padding: "48px", textAlign: "center", color: GRAY, fontSize: "14px" }}>
                  ⏳ Loading student directory...
                </td>
              </tr>
            ) : filteredStudents.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: "48px", textAlign: "center", color: GRAY, fontSize: "14px" }}>
                  {studentsWithRole.length === 0
                    ? "No students with the 'student' role found. Assign the student role via Admin Settings → Users to make them appear here."
                    : "❌ No students matched your search."}
                </td>
              </tr>
            ) : (
              filteredStudents.map((s, idx) => {
                const fullName = [s.first_name, s.middle_name, s.last_name].filter(Boolean).join(" ");
                return (
                  <tr key={s.id} style={{ borderBottom: `1px solid ${BORDER}`, background: idx % 2 === 0 ? WHITE : LIGHT_GRAY }}>

                    {/* Identity */}
                    <td style={{ padding: "9px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        {s.profile_picture ? (
                          <img src={s.profile_picture} alt="Profile" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", border: `1px solid ${BORDER}` }} />
                        ) : (
                          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#E8F5E9", color: GREEN, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "12px", flexShrink: 0 }}>
                            {s.first_name ? s.first_name.charAt(0).toUpperCase() : "S"}
                          </div>
                        )}
                        <div>
                          <div style={{ fontSize: "12px", fontWeight: 700, color: "#111827" }}>{fullName}</div>
                        </div>
                      </div>
                    </td>

                    {/* Student Number */}
                    <td style={{ padding: "9px 14px" }}>
                      <span style={{ fontFamily: "monospace", fontSize: "11px", fontWeight: 700, color: BLUE }}>
                        {s.student_number || formatSchoolId(s.id)}
                      </span>
                    </td>

                    {/* Course */}
                    <td style={{ padding: "9px 14px" }}>
                      <span style={{ padding: "2px 7px", background: "#E8F5E9", color: GREEN, borderRadius: "5px", fontWeight: 700, fontSize: "10px" }}>
                        {s.course || "—"}
                      </span>
                    </td>

                    {/* Year & Section */}
                    <td style={{ padding: "9px 14px", fontSize: "11px", fontWeight: 600, color: "#4B5563" }}>
                      {s.year_level || "—"}{s.section ? ` — Sec ${s.section}` : ""}
                    </td>

                    {/* Address */}
                    <td style={{ padding: "9px 14px", fontSize: "11px", color: GRAY, maxWidth: "200px" }}>
                      <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        📍 {s.address || "No address on record"}
                      </div>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: "9px 14px", textAlign: "right" }}>
                      <div style={{ position: "relative", display: "inline-block" }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (openDropdownId === s.id) { setOpenDropdownId(null); return; }
                            const rect = e.currentTarget.getBoundingClientRect();
                            setDropdownPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
                            setOpenDropdownId(s.id);
                          }}
                          style={{ width: "26px", height: "26px", display: "flex", alignItems: "center", justifyContent: "center", background: WHITE, border: `1px solid ${BORDER}`, borderRadius: "5px", cursor: "pointer", fontSize: "15px", fontWeight: 800, color: GRAY }}
                          title="Actions"
                        >⋮</button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Footer count */}
        {!loading && filteredStudents.length > 0 && (
          <div style={{ padding: "8px 14px", background: LIGHT_GRAY, borderTop: `1px solid ${BORDER}`, fontSize: "11px", color: GRAY }}>
            Showing {filteredStudents.length} of {studentsWithRole.length} students
          </div>
        )}
      </div>

      {/* ── FIXED 3-DOT DROPDOWN ── */}
      {openDropdownId !== null && createPortal((() => {
        const s = students.find(st => st.id === openDropdownId);
        if (!s) return null;
        return (
          <div onClick={() => setOpenDropdownId(null)} style={{ position: "fixed", inset: 0, zIndex: 2147483647 }}>
            <div onClick={e => e.stopPropagation()}
              style={{ position: "fixed", top: dropdownPos.top, right: dropdownPos.right, background: WHITE, border: `1px solid ${BORDER}`, borderRadius: "8px", boxShadow: "0 4px 20px rgba(0,0,0,0.15)", zIndex: 2147483647, minWidth: "210px", overflow: "hidden" }}>

              {/* Enroll — Administrator and Registrar only */}
              {canEnroll && (
                <button type="button"
                  onClick={() => { openEnrollModal(s); setOpenDropdownId(null); }}
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 14px", fontSize: "12px", background: "none", border: "none", cursor: "pointer", color: DARK_GREEN, fontWeight: 700, borderBottom: `1px solid ${BORDER}` }}
                  onMouseEnter={e => e.currentTarget.style.background = LIGHT_GRAY}
                  onMouseLeave={e => e.currentTarget.style.background = "none"}>
                  📋 Enroll
                </button>
              )}

              {/* View */}
              <button type="button"
                onClick={() => { openViewModal(s); setOpenDropdownId(null); }}
                style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 14px", fontSize: "12px", background: "none", border: "none", cursor: "pointer", color: BLUE, fontWeight: 700, borderBottom: `1px solid ${BORDER}` }}
                onMouseEnter={e => e.currentTarget.style.background = LIGHT_GRAY}
                onMouseLeave={e => e.currentTarget.style.background = "none"}>
                👁 View Student Info
              </button>

              {/* View QR — admin & registrar only */}
              {canEnroll && <button type="button"
                onClick={() => { setQrStudent(s); setOpenDropdownId(null); }}
                style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 14px", fontSize: "12px", background: "none", border: "none", cursor: "pointer", color: "#7C3AED", fontWeight: 700 }}
                onMouseEnter={e => e.currentTarget.style.background = LIGHT_GRAY}
                onMouseLeave={e => e.currentTarget.style.background = "none"}>
                📱 View Student QR
              </button>}
            </div>
          </div>
        );
      })(), document.body)}

      {/* ── ENROLLMENT FORM MODAL (form, or QR success view once enrolled) ── */}
      {showEnrollModal && enrollTarget && createPortal(
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2147483647 }}
          onClick={closeEnrollModal}>
          {enrollQr ? (
            /* ── Success: QR code for the enrollment just saved ── */
            <div onClick={e => e.stopPropagation()}
              style={{ background: WHITE, borderRadius: "12px", width: "100%", maxWidth: "360px", padding: "24px", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", textAlign: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
              <div style={{ fontSize: "28px" }}>✅</div>
              <h3 style={{ margin: 0, color: DARK_GREEN, fontSize: "15px", fontWeight: 800 }}>Enrollment Saved</h3>
              <div style={{ fontSize: "12px", color: GRAY }}>{enrollQr.summary}</div>
              <QRCanvas data={enrollQr.payload} size={200} />
              <div style={{ fontSize: "13px", fontWeight: 700, color: "#111827" }}>{enrollQr.name}</div>
              <div style={{ fontSize: "12px", fontFamily: "monospace", color: BLUE }}>{enrollQr.studentNumber || "—"}</div>
              <div style={{ display: "flex", gap: "8px", marginTop: "6px", width: "100%" }}>
                <button type="button" onClick={closeEnrollModal}
                  style={{ flex: 1, padding: "8px 14px", border: `1px solid ${BORDER}`, borderRadius: "6px", background: WHITE, cursor: "pointer", fontWeight: 600 }}>
                  Done
                </button>
                <button type="button"
                  onClick={() => {
                    const win = window.open("", "_blank", "width=360,height=480");
                    if (!win) return;
                    qrDataUrl(enrollQr.payload, 240).then(dataUrl => {
                      win.document.write(`
                        <html><head><title>Enrollment QR — ${enrollQr.name}</title></head>
                        <body style="font-family:system-ui,sans-serif;text-align:center;padding:24px;">
                          <h3>${enrollQr.name}</h3>
                          <div style="color:#6B7280;font-size:12px;margin-bottom:4px;">${enrollQr.studentNumber || ""}</div>
                          <div style="color:#6B7280;font-size:12px;margin-bottom:12px;">${enrollQr.summary}</div>
                          <img src="${dataUrl}" width="240" height="240" />
                          <div style="margin-top:16px;"><button onclick="window.print()" style="padding:8px 18px;background:${DARK_GREEN};color:white;border:none;border-radius:6px;font-weight:700;cursor:pointer;">🖨️ Print</button></div>
                        </body></html>
                      `);
                      win.document.close();
                    });
                  }}
                  style={{ flex: 1, padding: "8px 14px", background: DARK_GREEN, color: WHITE, border: "none", borderRadius: "6px", fontWeight: 700, cursor: "pointer" }}>
                  🖨️ Print
                </button>
              </div>
            </div>
          ) : (
            /* ── Form: capture the enrollment period ── */
            <form onSubmit={handleEnrollSubmit} onClick={e => e.stopPropagation()}
              style={{ background: WHITE, borderRadius: "12px", width: "100%", maxWidth: "430px", padding: "24px", display: "flex", flexDirection: "column", gap: "14px", boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
              <h3 style={{ margin: 0, color: DARK_GREEN, fontSize: "15px", fontWeight: 800 }}>📋 Enrollment Record</h3>

              {/* Student info banner */}
              <div style={{ padding: "12px 14px", background: "#E8F5E9", borderRadius: "8px", borderLeft: `4px solid ${GREEN}` }}>
                <div style={{ fontSize: "14px", fontWeight: 800, color: "#111827" }}>
                  {enrollTarget.last_name}, {enrollTarget.first_name} {enrollTarget.middle_name || ""}
                </div>
                <div style={{ fontSize: "11px", color: GRAY, marginTop: "2px" }}>
                  {enrollTarget.student_number || "No student number"} · {enrollTarget.course}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "11px", fontWeight: 700, color: GRAY }}>Year Enrolled *</label>
                <input type="number" value={enrollForm.year_enrolled} onChange={e => setEnrollForm({ ...enrollForm, year_enrolled: e.target.value })}
                  required min="2000" max="2100" style={{ padding: "8px", border: `1px solid ${BORDER}`, borderRadius: "6px", fontSize: "13px" }} />
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: GRAY }}>Year Level *</label>
                  <select value={enrollForm.year_level} onChange={e => setEnrollForm({ ...enrollForm, year_level: e.target.value })}
                    style={{ padding: "8px", border: `1px solid ${BORDER}`, borderRadius: "6px", background: WHITE, fontSize: "13px" }}>
                    {YEAR_LEVELS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: GRAY }}>Semester *</label>
                  <select value={enrollForm.semester} onChange={e => setEnrollForm({ ...enrollForm, semester: e.target.value })}
                    style={{ padding: "8px", border: `1px solid ${BORDER}`, borderRadius: "6px", background: WHITE, fontSize: "13px" }}>
                    <option value="1st Semester">1st Semester</option>
                    <option value="2nd Semester">2nd Semester</option>
                  </select>
                </div>
              </div>

              {/* Summary preview */}
              <div style={{ padding: "10px 14px", background: LIGHT_GRAY, borderRadius: "6px", fontSize: "12px", color: "#374151", display: "flex", gap: "6px", alignItems: "center" }}>
                <span>📅</span>
                <span><strong>{enrollForm.year_level} — {enrollForm.semester}</strong>, S.Y. {enrollForm.year_enrolled}–{parseInt(enrollForm.year_enrolled) + 1}</span>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "4px" }}>
                <button type="button" onClick={closeEnrollModal} style={{ padding: "8px 16px", border: `1px solid ${BORDER}`, borderRadius: "6px", background: WHITE, cursor: "pointer", fontWeight: 600 }}>Cancel</button>
                <button type="submit" disabled={savingEnroll} style={{ padding: "8px 18px", background: DARK_GREEN, color: WHITE, border: "none", borderRadius: "6px", fontWeight: 700, cursor: "pointer" }}>
                  {savingEnroll ? "⏳ Saving..." : "💾 Save Enrollment"}
                </button>
              </div>
            </form>
          )}
        </div>,
        document.body
      )}

      {/* ── VIEW STUDENT INFO MODAL ── */}
      {showViewModal && viewStudent && createPortal(
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2147483647, padding: "20px" }}
          onClick={() => setShowViewModal(false)}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: "#F3F4F6", borderRadius: "12px", width: "100%", maxWidth: "1100px", maxHeight: "94vh", overflowY: "auto", boxShadow: "0 8px 40px rgba(0,0,0,0.22)" }}>
            {/* Close button */}
            <div style={{ display: "flex", justifyContent: "flex-end", padding: "10px 14px 0" }}>
              <button type="button" onClick={() => setShowViewModal(false)}
                style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: GRAY }}>✕</button>
            </div>

            <div style={{ padding: "0 20px 24px" }}>
              {loadingEnrollments ? (
                <div style={{ padding: "40px", textAlign: "center", color: GRAY }}>⏳ Loading...</div>
              ) : (
                <StudentInfoCard student={viewStudent} enrollments={viewEnrollments} subjects={subjects} assignedSubjectIds={assignedSubjectIds} user={user} onSaved={handleGradesSaved} canManageEnrollment={canEnroll} onDeleteEnrollment={deleteEnrollment} />
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── STUDENT QR MODAL ── */}
      {qrStudent && createPortal(
        <div onClick={() => setQrStudent(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 2147483646, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: WHITE, borderRadius: "14px", padding: "28px 32px", maxWidth: "320px", width: "90%", textAlign: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.22)" }}>
            <div style={{ fontSize: "13px", fontWeight: 800, color: "#111827", marginBottom: "4px" }}>
              {[qrStudent.first_name, qrStudent.middle_name, qrStudent.last_name].filter(Boolean).join(" ")}
            </div>
            <div style={{ fontSize: "11px", fontFamily: "monospace", color: BLUE, marginBottom: "14px" }}>
              {qrStudent.student_number || "—"}
            </div>
            <QRCanvas
              data={`CCA-STUDENT|${qrStudent.student_number || ""}|${[qrStudent.first_name,qrStudent.middle_name,qrStudent.last_name].filter(Boolean).join(" ")}|${qrStudent.course || ""}`}
              size={200}
            />
            <div style={{ marginTop: "16px", display: "flex", gap: "10px", justifyContent: "center" }}>
              <button type="button" onClick={() => setQrStudent(null)}
                style={{ padding: "8px 18px", border: `1px solid ${BORDER}`, borderRadius: "7px", background: WHITE, cursor: "pointer", fontSize: "12px", fontWeight: 600 }}>
                Close
              </button>
              <button type="button"
                onClick={() => {
                  const name = [qrStudent.first_name, qrStudent.middle_name, qrStudent.last_name].filter(Boolean).join(" ");
                  const payload = `CCA-STUDENT|${qrStudent.student_number || ""}|${name}|${qrStudent.course || ""}`;
                  const w = window.open("", "_blank");
                  if (!w) return;
                  qrDataUrl(payload, 240).then(dataUrl => {
                    w.document.write(`<html><head><title>QR — ${name}</title></head><body style="text-align:center;font-family:sans-serif;padding:32px"><h3>${name}</h3><div style="color:#6B7280;font-size:12px;margin-bottom:12px">${qrStudent.student_number || ""}</div><img src="${dataUrl}" width="240" height="240"/><br/><br/><button onclick="window.print()">🖨️ Print</button></body></html>`);
                    w.document.close();
                  });
                }}
                style={{ padding: "8px 18px", border: "none", borderRadius: "7px", background: "#7C3AED", color: WHITE, cursor: "pointer", fontSize: "12px", fontWeight: 700 }}>
                🖨️ Print
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── SAVE CONFIRMATION TOAST ── */}
      {toast && createPortal(
        <div style={{ position: "fixed", top: "24px", right: "24px", zIndex: 2147483647, maxWidth: "360px", padding: "14px 18px", background: DARK_GREEN, color: WHITE, borderRadius: "10px", fontSize: "13px", fontWeight: 600, boxShadow: "0 8px 24px rgba(0,0,0,0.25)", lineHeight: 1.4 }}>
          {toast.msg}
        </div>,
        document.body
      )}

    </div>
  );
}
