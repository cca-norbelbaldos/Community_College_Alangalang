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
const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];

// Faculty records are synced from the shared Users table (role = "faculty").
// Normalize whichever key casing/shape the API returns so the table always
// has consistent fields to render, regardless of whether the record came
// fresh off a user creation or from the dedicated faculty endpoint.
const normalizeFaculty = (u) => ({
  id:          u.id          ?? u.user_id    ?? u.userId,
  lastName:    u.lastName    ?? u.last_name  ?? u.lastname  ?? "",
  firstName:   u.firstName   ?? u.first_name ?? u.firstname ?? "",
  middleName:  u.middleName  ?? u.middle_name ?? u.middlename ?? "",
  email:       u.email       ?? "",
  username:    u.username    ?? u.user_name  ?? "",
  roles:       u.roles       ?? (u.role ? [u.role] : []),
  idNo:        u.idNo        ?? u.id_no      ?? u.id_number ?? u.idNumber ?? "",
  designation: u.designation ?? u.position   ?? u.department ?? "",
  status:      u.status      ?? "Active",
});

export default function Faculty() {
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [openMenuId, setOpenMenuId]   = useState(null);
  const [menuPosition, setMenuPosition] = useState(null);

  // Assigned Subject modal state
  const [showAssignModal, setShowAssignModal]   = useState(false);
  const [assignTarget, setAssignTarget]         = useState(null);   // the faculty member we're assigning subjects to
  const [allSubjects, setAllSubjects]           = useState([]);
  const [allAssignments, setAllAssignments]     = useState([]);     // every faculty's current subject loads
  const [assignLoading, setAssignLoading]       = useState(false);
  const [assignFilter, setAssignFilter]         = useState({ year_level: "", semester: "" });
  const [assignBusyId, setAssignBusyId]         = useState(null);   // subject id currently being (un)assigned
  const [assignError, setAssignError]           = useState("");

  // Class Schedule modal state — set days + free-text time per subject
  // already assigned to this faculty member.
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleTarget, setScheduleTarget]       = useState(null);  // faculty member
  const [scheduleAssignments, setScheduleAssignments] = useState([]); // this faculty's assignments (with subject info)
  const [scheduleLoading, setScheduleLoading]     = useState(false);
  const [scheduleDraft, setScheduleDraft]         = useState({});    // { [assignmentId]: { days: [], time: "" } }
  const [scheduleSavingId, setScheduleSavingId]   = useState(null);
  const [scheduleError, setScheduleError]         = useState("");
  const [scheduleToast, setScheduleToast]         = useState("");
  const [scheduleStudents, setScheduleStudents]   = useState([]);  // for deriving real section options per subject's course/year

  useEffect(() => {
    fetchInstructors();
  }, []);

  useEffect(() => {
    const closeMenu = () => { setOpenMenuId(null); setMenuPosition(null); };
    if (openMenuId !== null) {
      document.addEventListener("click", closeMenu);
      window.addEventListener("scroll", closeMenu, true);
      return () => {
        document.removeEventListener("click", closeMenu);
        window.removeEventListener("scroll", closeMenu, true);
      };
    }
  }, [openMenuId]);

  const fetchInstructors = async () => {
    setLoading(true);
    try {
      const [facultyRes, usersRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/api/erd/faculty`),
        fetch(`${import.meta.env.VITE_API_URL}/api/erd/users`)
      ]);

      const facultyData = facultyRes.ok ? await facultyRes.json() : [];
      const usersData = usersRes.ok ? await usersRes.json() : [];

      const usersById = new Map(
        (Array.isArray(usersData) ? usersData : []).map(u => [String(u.id ?? u.user_id ?? u.userId), u])
      );

      const normalized = (Array.isArray(facultyData) ? facultyData : []).map(f => {
        const match = usersById.get(String(f.id ?? f.user_id ?? f.userId));
        if (!match) return normalizeFaculty(f);

        // Faculty record is the base; for each key, fall back to the
        // matching Users record's value whenever the faculty endpoint's
        // value is missing/blank, so details like email, username,
        // middle name, ID No., and designation always show up even if
        // the dedicated faculty endpoint returns a sparse object.
        const merged = { ...f };
        for (const key of Object.keys(match)) {
          if (merged[key] === undefined || merged[key] === null || merged[key] === "") {
            merged[key] = match[key];
          }
        }
        return normalizeFaculty(merged);
      });

      // Defensive filter: keep only entries actually tagged "faculty" so a
      // user added with a different role never leaks into this hub.
      const facultyOnly = normalized.filter(u =>
        u.roles.length === 0 || u.roles.includes("faculty")
      );
      setInstructors(facultyOnly);
    } catch (err) {
      console.error("Failed to fetch instructor cluster:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFaculty = (id) => {
    showConfirm({
      message: "Remove this instructor from the register? This cannot be undone.",
      confirmLabel: "Remove",
      icon: "🗑️",
      onConfirm: async () => {
        try {
          const res = await fetch(`${import.meta.env.VITE_API_URL}/api/erd/faculty/${id}`, { method: "DELETE" });
          if (res.ok) { showToast("Instructor removed.", "info"); fetchInstructors(); }
          else showToast("Failed to remove instructor.", "error");
        } catch { showToast("Network error.", "error"); }
      },
    });
  };

  const handleAssignedSubject = async (faculty) => {
    setOpenMenuId(null);
    setAssignTarget(faculty);
    setAssignFilter({ year_level: "", semester: "" });
    setAssignError("");
    setShowAssignModal(true);
    setAssignLoading(true);
    try {
      const [subjectsRes, assignmentsRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/api/erd/subjects`),
        fetch(`${import.meta.env.VITE_API_URL}/api/erd/faculty/assignments`)
      ]);
      setAllSubjects(subjectsRes.ok ? await subjectsRes.json() : []);
      setAllAssignments(assignmentsRes.ok ? await assignmentsRes.json() : []);
    } catch (err) {
      console.error("Failed to load subject catalog / assignments:", err);
    } finally {
      setAssignLoading(false);
    }
  };

  const refreshAssignments = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/erd/faculty/assignments`);
      if (res.ok) setAllAssignments(await res.json());
    } catch (err) {
      console.error("Failed to refresh assignments:", err);
    }
  };

  const handleAssignSubject = async (subject) => {
    if (!assignTarget) return;
    setAssignBusyId(subject.id);
    setAssignError("");
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/erd/faculty/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          faculty_id: assignTarget.id,
          subject_id: subject.id,
          year_level: subject.year_level || null
        })
      });
      if (res.ok) {
        await refreshAssignments();
      } else {
        const data = await res.json().catch(() => ({}));
        setAssignError(data.message || "Could not assign this subject. It may already be taken.");
      }
    } catch (err) {
      console.error(err);
      setAssignError("Network error while assigning subject.");
    } finally {
      setAssignBusyId(null);
    }
  };

  const handleUnassignSubject = async (assignmentId) => {
    setAssignBusyId(assignmentId);
    setAssignError("");
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/erd/faculty/assignments/${assignmentId}`, { method: "DELETE" });
      if (res.ok) {
        await refreshAssignments();
      } else {
        setAssignError("Could not remove this assignment.");
      }
    } catch (err) {
      console.error(err);
      setAssignError("Network error while removing assignment.");
    } finally {
      setAssignBusyId(null);
    }
  };

  // For each subject, find whether it's currently assigned to anyone
  const getAssignmentForSubject = (subjectId) =>
    allAssignments.find(a => a.subject_id === subjectId);

  const filteredAssignSubjects = allSubjects.filter(sub => {
    if (assignFilter.year_level && sub.year_level !== assignFilter.year_level) return false;
    if (assignFilter.semester && String(sub.semester) !== assignFilter.semester) return false;
    return true;
  });

  // ── Class Schedule ──────────────────────────────────────────────────────
  // "sched" is stored as a single free-text string, e.g. "MONDAY, WEDNESDAY — 9:00 - 10:30 AM".
  // Parse it back into { days, time } for editing, and re-serialize on save.
  const parseSched = (sched) => {
    if (!sched) return { days: [], time: "", room: "", section: "" };
    const [dayPart, ...rest] = sched.split("—");
    const days = dayPart
      ? dayPart.split(",").map(d => d.trim().toUpperCase()).filter(d => DAYS.includes(d))
      : [];
    return { days, time: rest.join("—").trim(), room: "" };
  };

  const serializeSched = (days, time) => {
    const dayStr = days.join(", ");
    if (dayStr && time) return `${dayStr} — ${time}`;
    if (dayStr) return dayStr;
    return time || "";
  };

  const handleOpenClassSchedule = async (faculty) => {
    setOpenMenuId(null);
    setScheduleTarget(faculty);
    setScheduleError("");
    setScheduleToast("");
    setShowScheduleModal(true);
    setScheduleLoading(true);
    try {
      const [assignRes, subjectsRes, studentsRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/api/erd/faculty/assignments/${faculty.id}`),
        fetch(`${import.meta.env.VITE_API_URL}/api/erd/subjects`),
        fetch(`${import.meta.env.VITE_API_URL}/api/erd/students`)
      ]);
      const data = assignRes.ok ? await assignRes.json() : [];
      setScheduleAssignments(Array.isArray(data) ? data : []);
      setAllSubjects(subjectsRes.ok ? await subjectsRes.json() : []);
      setScheduleStudents(studentsRes.ok ? await studentsRes.json() : []);
      // Seed the draft state from each assignment's existing sched + room + section value
      const draft = {};
      (Array.isArray(data) ? data : []).forEach(a => {
        draft[a.id] = { ...parseSched(a.sched), room: a.room || "", section: a.section || "" };
      });
      setScheduleDraft(draft);
    } catch (err) {
      console.error("Failed to load class schedule:", err);
      setScheduleAssignments([]);
    } finally {
      setScheduleLoading(false);
    }
  };

  const toggleScheduleDay = (assignmentId, day) => {
    setScheduleDraft(prev => {
      const current = prev[assignmentId] || { days: [], time: "", room: "", section: "" };
      const days = current.days.includes(day)
        ? current.days.filter(d => d !== day)
        : [...current.days, day];
      return { ...prev, [assignmentId]: { ...current, days } };
    });
  };

  const setScheduleTime = (assignmentId, time) => {
    setScheduleDraft(prev => {
      const current = prev[assignmentId] || { days: [], time: "", room: "", section: "" };
      return { ...prev, [assignmentId]: { ...current, time } };
    });
  };

  const setScheduleRoom = (assignmentId, room) => {
    setScheduleDraft(prev => {
      const current = prev[assignmentId] || { days: [], time: "", room: "", section: "" };
      return { ...prev, [assignmentId]: { ...current, room } };
    });
  };

  const setScheduleSection = (assignmentId, section) => {
    setScheduleDraft(prev => {
      const current = prev[assignmentId] || { days: [], time: "", room: "", section: "" };
      return { ...prev, [assignmentId]: { ...current, section } };
    });
  };

  // Sections aren't stored on the subject/assignment itself — they live on
  // enrolled student records. Resolve the assignment's subject to a course,
  // then collect the distinct sections of students in that course + year level
  // so the dropdown only ever offers sections that actually exist.
  const getSectionOptionsForAssignment = (assignment) => {
    const subject = allSubjects.find(s => s.id === assignment.subject_id);
    const course = subject?.course;
    const yearLevel = assignment.year_level || subject?.year_level;
    if (!course || !yearLevel) return [];
    const sections = scheduleStudents
      .filter(s => s.course === course && s.year_level === yearLevel && s.section)
      .map(s => s.section);
    return [...new Set(sections)].sort();
  };

  const handleSaveSchedule = async (assignmentId) => {
    const draft = scheduleDraft[assignmentId] || { days: [], time: "", room: "", section: "" };
    setScheduleSavingId(assignmentId);
    setScheduleError("");
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/erd/faculty/assignments/${assignmentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sched: serializeSched(draft.days, draft.time), room: draft.room || "", section: draft.section || "" })
      });
      if (res.ok) {
        setScheduleAssignments(prev => prev.map(a =>
          a.id === assignmentId ? { ...a, sched: serializeSched(draft.days, draft.time), room: draft.room || "", section: draft.section || "" } : a
        ));
        setScheduleToast("✓ Schedule saved");
        setTimeout(() => {
          setShowScheduleModal(false);
          setScheduleTarget(null);
          setScheduleToast("");
        }, 900);
      } else {
        const data = await res.json().catch(() => ({}));
        setScheduleError(data.message || "Could not save this schedule.");
      }
    } catch (err) {
      console.error(err);
      setScheduleError("Network error while saving schedule.");
    } finally {
      setScheduleSavingId(null);
    }
  };

  const filteredInstructors = instructors.filter(i =>
    `${i.lastName} ${i.firstName} ${i.middleName} ${i.email} ${i.username} ${i.designation}`.toLowerCase().includes(search.toLowerCase())
  );

  const thStyle = {
    padding: "16px 20px",
    fontSize: "11px",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.4px",
    color: GRAY,
    whiteSpace: "nowrap"
  };

  const tdStyle = {
    padding: "14px 20px",
    fontSize: "13px",
    color: "#111827",
    borderTop: `1px solid ${BORDER}`,
    whiteSpace: "nowrap"
  };

  return (
    <div style={{ fontFamily: "system-ui, sans-serif" }}>

      {/* SEARCH BAR */}
      <div style={{ marginBottom: "16px" }}>
        <input
          type="text"
          placeholder="🔍 Search instructors..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: "100%", maxWidth: "320px", padding: "8px 12px", border: `1px solid ${BORDER}`, borderRadius: "6px", fontSize: "13px", boxSizing: "border-box", outline: "none" }}
        />
      </div>

      {/* FACULTY TABLE */}
      <div style={{ background: WHITE, borderRadius: "12px", border: `1px solid ${BORDER}`, boxShadow: "0 1px 3px rgba(0,0,0,0.02)", overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ background: LIGHT_GRAY }}>
                <th style={thStyle}>Last Name</th>
                <th style={thStyle}>First Name</th>
                <th style={thStyle}>Middle Name</th>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>Username</th>
                <th style={thStyle}>Role</th>
                <th style={thStyle}>ID No.</th>
                <th style={thStyle}>Designation</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ ...tdStyle, textAlign: "center", color: GRAY, padding: "32px" }}>Loading directory index...</td>
                </tr>
              ) : filteredInstructors.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ ...tdStyle, textAlign: "center", color: GRAY, padding: "32px" }}>No profiles active.</td>
                </tr>
              ) : (
                filteredInstructors.map(i => {
                  const isMenuOpen = openMenuId === i.id;
                  return (
                    <tr key={i.id}>
                      <td style={tdStyle}>{i.lastName || "—"}</td>
                      <td style={tdStyle}>{i.firstName || "—"}</td>
                      <td style={tdStyle}>{i.middleName || "—"}</td>
                      <td style={tdStyle}>{i.email || "—"}</td>
                      <td style={tdStyle}>{i.username || "—"}</td>
                      <td style={tdStyle}>Faculty</td>
                      <td style={tdStyle}>{i.idNo || "—"}</td>
                      <td style={tdStyle}>{i.designation || "—"}</td>
                      <td style={{ ...tdStyle, textAlign: "right", position: "relative" }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isMenuOpen) {
                              setOpenMenuId(null);
                              setMenuPosition(null);
                            } else {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setMenuPosition({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
                              setOpenMenuId(i.id);
                            }
                          }}
                          style={{ background: "none", border: "none", cursor: "pointer", fontSize: "16px", padding: "4px 8px", borderRadius: "6px", color: GRAY, lineHeight: 1 }}
                          title="Actions"
                        >⋮</button>

                        {isMenuOpen && menuPosition && createPortal(
                          <div
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              position: "fixed", top: menuPosition.top, right: menuPosition.right, zIndex: 2147483647,
                              background: WHITE, border: `1px solid ${BORDER}`, borderRadius: "8px",
                              boxShadow: "0 8px 16px rgba(0,0,0,0.1)", minWidth: "180px", overflow: "hidden",
                              textAlign: "left"
                            }}
                          >
                            <button
                              onClick={() => { setMenuPosition(null); handleOpenClassSchedule(i); }}
                              style={{ width: "100%", padding: "10px 14px", background: "none", border: "none", cursor: "pointer", fontSize: "13px", color: "#111827", display: "flex", alignItems: "center", gap: "8px" }}
                            >📅 Class Schedule</button>
                            <button
                              onClick={() => { setMenuPosition(null); handleAssignedSubject(i); }}
                              style={{ width: "100%", padding: "10px 14px", background: "none", border: "none", cursor: "pointer", fontSize: "13px", color: "#111827", display: "flex", alignItems: "center", gap: "8px", borderTop: `1px solid ${BORDER}` }}
                            >📚 Assigned Subject</button>
                            <button
                              onClick={() => { setOpenMenuId(null); setMenuPosition(null); handleDeleteFaculty(i.id); }}
                              style={{ width: "100%", padding: "10px 14px", background: "none", border: "none", cursor: "pointer", fontSize: "13px", color: RED, display: "flex", alignItems: "center", gap: "8px", borderTop: `1px solid ${BORDER}` }}
                            >🗑️ Delete</button>
                          </div>,
                          document.body
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: ASSIGNED SUBJECT */}
      {showAssignModal && assignTarget && createPortal(
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1300, padding: "16px" }}>
          <div style={{ background: WHITE, borderRadius: "12px", width: "95vw", maxWidth: "1100px", maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.15)", overflow: "hidden" }}>
            {/* Header */}
            <div style={{ background: `linear-gradient(135deg, ${DARK_GREEN}, ${GREEN})`, padding: "16px 24px", color: WHITE, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 800, textTransform: "uppercase", color: WHITE, display: "flex", alignItems: "center", gap: "8px" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={WHITE} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 3 14 8 19 8" />
                    <line x1="8" y1="13" x2="16" y2="13" />
                    <line x1="8" y1="17" x2="16" y2="17" />
                  </svg>
                  Assigned Subject
                </h3>
                <p style={{ margin: "4px 0 0", fontSize: "12px", opacity: 0.9 }}>
                  Assign subject for {assignTarget.firstName} {assignTarget.lastName}
                </p>
              </div>
              <button
                onClick={() => { setShowAssignModal(false); setAssignTarget(null); }}
                style={{ background: "rgba(255,255,255,0.2)", border: "none", color: WHITE, width: "28px", height: "28px", borderRadius: "6px", cursor: "pointer", fontSize: "14px" }}
              >✕</button>
            </div>

            {/* Filters */}
            <div style={{ padding: "14px 24px", borderBottom: `1px solid ${BORDER}`, display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center", background: LIGHT_GRAY }}>
              <select value={assignFilter.year_level} onChange={e => setAssignFilter(f => ({ ...f, year_level: e.target.value }))}
                style={{ padding: "6px 10px", border: `1px solid ${BORDER}`, borderRadius: "6px", fontSize: "12px", background: WHITE, color: "#111827", cursor: "pointer" }}>
                <option value="">All Years</option>
                {YEAR_LEVELS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <select value={assignFilter.semester} onChange={e => setAssignFilter(f => ({ ...f, semester: e.target.value }))}
                style={{ padding: "6px 10px", border: `1px solid ${BORDER}`, borderRadius: "6px", fontSize: "12px", background: WHITE, color: "#111827", cursor: "pointer" }}>
                <option value="">All Semesters</option>
                <option value="1">1st Semester</option>
                <option value="2">2nd Semester</option>
              </select>
              {(assignFilter.year_level || assignFilter.semester) && (
                <button type="button" onClick={() => setAssignFilter({ year_level: "", semester: "" })}
                  style={{ padding: "6px 10px", border: `1px solid ${BORDER}`, borderRadius: "6px", fontSize: "12px", background: WHITE, cursor: "pointer", color: GRAY }}>
                  ✕ Clear
                </button>
              )}
              <span style={{ fontSize: "12px", color: GRAY, marginLeft: "auto" }}>
                {assignFilter.year_level ? `${filteredAssignSubjects.length} subject${filteredAssignSubjects.length !== 1 ? "s" : ""}` : "Select a year level to view subjects"}
              </span>
            </div>

            {assignError && (
              <div style={{ padding: "10px 24px", background: "#FEF2F2", color: RED, fontSize: "12px", fontWeight: 600, borderBottom: `1px solid ${BORDER}` }}>
                ⚠️ {assignError}
              </div>
            )}

            {/* Subject list */}
            <div style={{ overflowY: "auto", overflowX: "hidden", flex: 1 }}>
              {!assignFilter.year_level ? (
                <div style={{ padding: "60px 40px", textAlign: "center" }}>
                  <div style={{ fontSize: "30px", marginBottom: "12px" }}>📋</div>
                  <div style={{ fontWeight: 700, color: DARK_GREEN, fontSize: "14px", marginBottom: "6px" }}>Select a Year Level</div>
                  <div style={{ color: GRAY, fontSize: "12px" }}>Choose a year level from the filter above to see available subjects.</div>
                </div>
              ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", tableLayout: "fixed" }}>
                <colgroup>
                  <col style={{ width: "150px" }} />
                  <col />
                  <col style={{ width: "90px" }} />
                  <col style={{ width: "80px" }} />
                  <col style={{ width: "150px" }} />
                  <col style={{ width: "110px" }} />
                </colgroup>
                <thead>
                  <tr style={{ background: LIGHT_GRAY, position: "sticky", top: 0 }}>
                    {[["Code","left"],["Title","left"],["Year","left"],["Sem","left"],["Status","left"],["Action","right"]].map(([h, align]) => (
                      <th key={h} style={{ padding: "9px 12px", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.4px", color: GRAY, textAlign: align, borderBottom: `2px solid ${BORDER}`, whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {assignLoading ? (
                    <tr><td colSpan={6} style={{ padding: "32px", textAlign: "center", color: GRAY }}>Loading subject catalog...</td></tr>
                  ) : filteredAssignSubjects.length === 0 ? (
                    <tr><td colSpan={6} style={{ padding: "32px", textAlign: "center", color: GRAY }}>No subjects match the selected filters.</td></tr>
                  ) : (
                    filteredAssignSubjects.map(sub => {
                      const assignment = getAssignmentForSubject(sub.id);
                      const isMine = assignment && String(assignment.faculty_id) === String(assignTarget.id);
                      const isTakenByOther = assignment && !isMine;
                      const isBusy = assignBusyId === sub.id || assignBusyId === assignment?.id;
                      return (
                        <tr key={sub.id}>
                          <td style={{ padding: "10px 12px", fontSize: "12px", borderBottom: `1px solid ${BORDER}` }}><span style={{ fontWeight: 700, color: BLUE }}>{sub.subject_code || "—"}</span></td>
                          <td style={{ padding: "10px 12px", fontSize: "12px", color: "#111827", borderBottom: `1px solid ${BORDER}`, wordBreak: "break-word" }}>{sub.subject_title}</td>
                          <td style={{ padding: "10px 12px", fontSize: "12px", color: "#374151", borderBottom: `1px solid ${BORDER}` }}>{sub.year_level || "—"}</td>
                          <td style={{ padding: "10px 12px", fontSize: "12px", color: "#374151", borderBottom: `1px solid ${BORDER}` }}>{sub.semester == 1 ? "1st Sem" : sub.semester == 2 ? "2nd Sem" : "—"}</td>
                          <td style={{ padding: "10px 12px", fontSize: "12px", borderBottom: `1px solid ${BORDER}` }}>
                            {isMine ? (
                              <span style={{ padding: "2px 8px", background: "#E8F5E9", color: DARK_GREEN, borderRadius: "999px", fontSize: "11px", fontWeight: 700 }}>Assigned to you</span>
                            ) : isTakenByOther ? (
                              <span style={{ padding: "2px 8px", background: "#FEF3C7", color: "#92400E", borderRadius: "999px", fontSize: "11px", fontWeight: 700, wordBreak: "break-word" }}>
                                {assignment.first_name} {assignment.last_name}
                              </span>
                            ) : (
                              <span style={{ padding: "2px 8px", background: LIGHT_GRAY, color: GRAY, borderRadius: "999px", fontSize: "11px", fontWeight: 700 }}>Open</span>
                            )}
                          </td>
                          <td style={{ padding: "10px 12px", fontSize: "12px", borderBottom: `1px solid ${BORDER}`, textAlign: "right" }}>
                            {isMine ? (
                              <button
                                onClick={() => handleUnassignSubject(assignment.id)}
                                disabled={isBusy}
                                style={{ padding: "5px 12px", border: `1px solid ${BORDER}`, borderRadius: "6px", fontSize: "12px", color: RED, background: WHITE, cursor: isBusy ? "not-allowed" : "pointer", fontWeight: 700, opacity: isBusy ? 0.6 : 1 }}
                              >{isBusy ? "..." : "Unassign"}</button>
                            ) : (
                              <button
                                onClick={() => handleAssignSubject(sub)}
                                disabled={isTakenByOther || isBusy}
                                style={{ padding: "5px 12px", border: "none", borderRadius: "6px", fontSize: "12px", color: WHITE, background: isTakenByOther ? GRAY : DARK_GREEN, cursor: (isTakenByOther || isBusy) ? "not-allowed" : "pointer", fontWeight: 700, opacity: isBusy ? 0.6 : 1 }}
                              >{isBusy ? "..." : "Assign"}</button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: "12px 24px", borderTop: `1px solid ${BORDER}`, background: LIGHT_GRAY, display: "flex", justifyContent: "flex-end" }}>
              <button type="button" onClick={() => { setShowAssignModal(false); setAssignTarget(null); }} style={{ padding: "6px 14px", border: `1px solid ${BORDER}`, borderRadius: "6px", fontSize: "12px", color: GRAY, background: WHITE, cursor: "pointer" }}>Close</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL: CLASS SCHEDULE */}
      {showScheduleModal && scheduleTarget && createPortal(
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1300, padding: "16px" }}>
          <div style={{ background: WHITE, borderRadius: "12px", width: "100%", maxWidth: "640px", maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.15)", overflow: "hidden" }}>
            {/* Header */}
            <div style={{ background: `linear-gradient(135deg, ${DARK_GREEN}, ${GREEN})`, padding: "16px 24px", color: WHITE, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 800, textTransform: "uppercase" }}>📅 Class Schedule</h3>
                <p style={{ margin: "4px 0 0", fontSize: "12px", opacity: 0.9 }}>
                  {scheduleTarget.firstName} {scheduleTarget.lastName} — set days &amp; time for each assigned subject
                </p>
              </div>
              <button
                onClick={() => { setShowScheduleModal(false); setScheduleTarget(null); setScheduleToast(""); }}
                style={{ background: "rgba(255,255,255,0.2)", border: "none", color: WHITE, width: "28px", height: "28px", borderRadius: "6px", cursor: "pointer", fontSize: "14px" }}
              >✕</button>
            </div>

            {scheduleError && (
              <div style={{ padding: "10px 24px", background: "#FEF2F2", color: RED, fontSize: "12px", fontWeight: 600, borderBottom: `1px solid ${BORDER}` }}>
                ⚠️ {scheduleError}
              </div>
            )}

            {scheduleToast && (
              <div style={{ padding: "10px 24px", background: "#E8F5E9", color: DARK_GREEN, fontSize: "12px", fontWeight: 700, borderBottom: `1px solid ${BORDER}` }}>
                {scheduleToast}
              </div>
            )}

            {/* Subject schedule list */}
            <div style={{ overflowY: "auto", flex: 1, padding: "16px 24px", display: "flex", flexDirection: "column", gap: "14px" }}>
              {scheduleLoading ? (
                <div style={{ textAlign: "center", color: GRAY, padding: "32px", fontSize: "13px" }}>Loading assigned subjects...</div>
              ) : scheduleAssignments.length === 0 ? (
                <div style={{ textAlign: "center", color: GRAY, padding: "32px", fontSize: "13px" }}>
                  No subjects assigned yet. Use "Assigned Subject" first to give {scheduleTarget.firstName} a teaching load.
                </div>
              ) : (
                scheduleAssignments.map(a => {
                  const draft = scheduleDraft[a.id] || { days: [], time: "", room: "", section: "" };
                  const isSaving = scheduleSavingId === a.id;
                  const sectionOptions = getSectionOptionsForAssignment(a);
                  return (
                    <div key={a.id} style={{ border: `1px solid ${BORDER}`, borderRadius: "10px", padding: "14px 16px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "10px" }}>
                        <div>
                          <div style={{ fontSize: "13px", fontWeight: 700, color: "#111827" }}>{a.subject_title}</div>
                          <div style={{ fontSize: "11px", color: GRAY }}>{a.year_level || "—"}{draft.section ? ` · ${draft.section}` : ""}</div>
                        </div>
                      </div>

                      {/* Section select — sourced from Registrar's enrolled students for this subject's course/year */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginBottom: "10px" }}>
                        <label style={{ fontSize: "11px", fontWeight: 700, color: GRAY }}>Section</label>
                        <select
                          value={draft.section}
                          onChange={e => setScheduleSection(a.id, e.target.value)}
                          style={{ padding: "8px 10px", border: `1px solid ${BORDER}`, borderRadius: "6px", fontSize: "12px", background: WHITE, color: "#111827", cursor: "pointer" }}
                        >
                          <option value="">No section</option>
                          {sectionOptions.map(sec => <option key={sec} value={sec}>{sec}</option>)}
                          {draft.section && !sectionOptions.includes(draft.section) && (
                            <option value={draft.section}>{draft.section} (no longer enrolled)</option>
                          )}
                        </select>
                        {sectionOptions.length === 0 && (
                          <span style={{ fontSize: "11px", color: GRAY }}>No enrolled sections found yet for this course/year in Registrar.</span>
                        )}
                      </div>

                      {/* Day multi-select */}
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "10px" }}>
                        {DAYS.map(day => {
                          const selected = draft.days.includes(day);
                          return (
                            <button
                              key={day}
                              type="button"
                              onClick={() => toggleScheduleDay(a.id, day)}
                              style={{
                                padding: "6px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: 700,
                                border: `1px solid ${selected ? DARK_GREEN : BORDER}`,
                                background: selected ? DARK_GREEN : WHITE,
                                color: selected ? WHITE : "#111827",
                                cursor: "pointer"
                              }}
                            >{day.slice(0, 3)}</button>
                          );
                        })}
                      </div>

                      {/* Time + Room inputs */}
                      <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                        <input
                          type="text"
                          placeholder="e.g. 9:00 - 10:30 AM"
                          value={draft.time}
                          onChange={e => setScheduleTime(a.id, e.target.value)}
                          style={{ flex: 1, padding: "8px 10px", border: `1px solid ${BORDER}`, borderRadius: "6px", fontSize: "12px" }}
                        />
                        <input
                          type="text"
                          placeholder="Room e.g. Room 204"
                          value={draft.room}
                          onChange={e => setScheduleRoom(a.id, e.target.value)}
                          style={{ flex: 1, padding: "8px 10px", border: `1px solid ${BORDER}`, borderRadius: "6px", fontSize: "12px" }}
                        />
                      </div>

                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <button
                          type="button"
                          onClick={() => handleSaveSchedule(a.id)}
                          disabled={isSaving}
                          style={{ padding: "8px 16px", border: "none", borderRadius: "6px", fontSize: "12px", color: WHITE, background: DARK_GREEN, fontWeight: 700, cursor: isSaving ? "not-allowed" : "pointer", opacity: isSaving ? 0.6 : 1 }}
                        >{isSaving ? "Saving..." : "Save"}</button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: "12px 24px", borderTop: `1px solid ${BORDER}`, background: LIGHT_GRAY, display: "flex", justifyContent: "flex-end" }}>
              <button type="button" onClick={() => { setShowScheduleModal(false); setScheduleTarget(null); setScheduleToast(""); }} style={{ padding: "6px 14px", border: `1px solid ${BORDER}`, borderRadius: "6px", fontSize: "12px", color: GRAY, background: WHITE, cursor: "pointer" }}>Close</button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}