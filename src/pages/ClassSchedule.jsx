import { useEffect, useState, useCallback } from "react";
import { showToast, showConfirm } from "../components/Toast";

const DARK_GREEN = "#3d6e01";
const WHITE      = "#FFFFFF";
const GRAY       = "#6B7280";
const BORDER     = "#E5E7EB";
const LIGHT_GRAY = "#F9FAFB";
const RED        = "#DC2626";

const DAYS        = ["MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY"];
const YEAR_LEVELS = ["1st Year","2nd Year","3rd Year","4th Year"];
const SEMESTERS   = [{ value: "1", label: "1st Semester" }, { value: "2", label: "2nd Semester" }];

const DAY_OPTIONS = [
  { abbr: "M",   full: "MONDAY"    },
  { abbr: "T",   full: "TUESDAY"   },
  { abbr: "W",   full: "WEDNESDAY" },
  { abbr: "TH",  full: "THURSDAY"  },
  { abbr: "F",   full: "FRIDAY"    },
  { abbr: "SAT", full: "SATURDAY"  },
  { abbr: "SUN", full: "SUNDAY"    },
];

// Toggle a day abbreviation in/out of a comma-separated string e.g. "M,W,F"
function toggleDay(current, abbr) {
  const set = new Set((current || "").split(",").map(s => s.trim()).filter(Boolean));
  set.has(abbr) ? set.delete(abbr) : set.add(abbr);
  return [...set].join(",");
}

// Render day chips (read-only or toggleable)
function DayChips({ value, onChange }) {
  const selected = new Set((value || "").split(",").map(s => s.trim()).filter(Boolean));
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "3px", justifyContent: "center" }}>
      {DAY_OPTIONS.map(({ abbr }) => {
        const active = selected.has(abbr);
        return (
          <button
            key={abbr}
            type="button"
            onClick={() => onChange && onChange(toggleDay(value, abbr))}
            style={{
              padding: "2px 5px",
              fontSize: "10px",
              fontWeight: 700,
              borderRadius: "4px",
              border: `1px solid ${active ? DARK_GREEN : BORDER}`,
              background: active ? DARK_GREEN : WHITE,
              color: active ? WHITE : GRAY,
              cursor: onChange ? "pointer" : "default",
              minWidth: "24px",
            }}
          >{abbr}</button>
        );
      })}
    </div>
  );
}

const API = import.meta.env.VITE_API_URL;

// ── Non-admin: personal schedule view ────────────────────────────────────────
function MySchedule({ user }) {
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/erd/class-schedule/by-faculty`)
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        const mine = (Array.isArray(data) ? data : []).filter(
          row => String(row.faculty_id) === String(user?.id)
        );
        setRows(mine);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user?.id]);

  const thSt = {
    padding: "10px 14px", fontSize: "11px", fontWeight: 700,
    textTransform: "uppercase", letterSpacing: "0.5px",
    color: WHITE, background: DARK_GREEN, textAlign: "center",
  };
  const tdSt = {
    padding: "10px 14px", fontSize: "13px", color: "#111827",
    borderBottom: `1px solid ${BORDER}`, verticalAlign: "middle", textAlign: "center",
  };

  const byDay = {};
  DAYS.forEach(d => { byDay[d] = rows.filter(r => r.day === d); });
  const hasAny = rows.length > 0;

  return (
    <div style={{ fontFamily: "system-ui, sans-serif" }}>
      <div style={{ marginBottom: "16px" }}>
        <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 900, color: DARK_GREEN }}>My Class Schedule</h2>
        <p style={{ margin: "3px 0 0", fontSize: "13px", color: GRAY }}>Your assigned subjects for this term</p>
      </div>

      {loading ? (
        <div style={{ padding: "60px", textAlign: "center", color: GRAY, fontSize: "13px",
          border: `1px solid ${BORDER}`, borderRadius: "10px", background: WHITE }}>
          Loading your schedule…
        </div>
      ) : !hasAny ? (
        <div style={{ padding: "60px", textAlign: "center", border: `1px dashed ${BORDER}`,
          borderRadius: "10px", color: GRAY, fontSize: "13px" }}>
          <div style={{ fontSize: "36px", marginBottom: "10px" }}>📋</div>
          No subjects have been assigned to you yet.
        </div>
      ) : (
        <div style={{ border: `1px solid ${BORDER}`, borderRadius: "10px", overflow: "hidden", background: WHITE }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr>
                <th style={{ ...thSt, textAlign: "left", paddingLeft: "16px", width: "110px" }}>Day</th>
                <th style={thSt}>Subject</th>
                <th style={{ ...thSt, width: "160px" }}>Time</th>
                <th style={{ ...thSt, width: "110px" }}>Room</th>
                <th style={{ ...thSt, width: "110px" }}>Section</th>
                <th style={{ ...thSt, width: "120px" }}>Year Level</th>
              </tr>
            </thead>
            <tbody>
              {DAYS.map((day, di) => {
                const dayRows = byDay[day];
                if (dayRows.length === 0) return null;
                return dayRows.map((row, ri) => (
                  <tr key={row.id} style={{ background: ri % 2 === 0 ? WHITE : LIGHT_GRAY }}>
                    {ri === 0 ? (
                      <td rowSpan={dayRows.length} style={{
                        ...tdSt, fontWeight: 800, fontSize: "11px",
                        color: DARK_GREEN, letterSpacing: "0.6px",
                        background: "#f2f9e8", borderRight: `2px solid #bfe08a`,
                        textAlign: "left", paddingLeft: "16px",
                        borderTop: di > 0 ? `2px solid ${BORDER}` : "none",
                      }}>
                        {day}
                      </td>
                    ) : null}
                    <td style={{ ...tdSt, borderTop: ri === 0 && di > 0 ? `2px solid ${BORDER}` : undefined }}>
                      {row.subject_title || "—"}
                    </td>
                    <td style={{ ...tdSt, borderTop: ri === 0 && di > 0 ? `2px solid ${BORDER}` : undefined }}>
                      {row.time || "—"}
                    </td>
                    <td style={{ ...tdSt, borderTop: ri === 0 && di > 0 ? `2px solid ${BORDER}` : undefined }}>
                      {row.room || "—"}
                    </td>
                    <td style={{ ...tdSt, borderTop: ri === 0 && di > 0 ? `2px solid ${BORDER}` : undefined }}>
                      {row.section || "—"}
                    </td>
                    <td style={{ ...tdSt, borderTop: ri === 0 && di > 0 ? `2px solid ${BORDER}` : undefined }}>
                      {row.year_level ? (
                        <span style={{ fontSize: "11px", fontWeight: 700, background: "#EEF2FF", color: "#4F46E5", padding: "2px 8px", borderRadius: "20px" }}>
                          {row.year_level}
                        </span>
                      ) : "—"}
                    </td>
                  </tr>
                ));
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Admin editable view ───────────────────────────────────────────────────────
export default function ClassSchedule({ isAdmin = false, user = null }) {
  if (!isAdmin) return <MySchedule user={user} />;

  // ── filter state ─────────────────────────────────────────────────────────────
  const [filter, setFilter]       = useState({ course: "", year_level: "", section: "", semester: "" });
  const [committed, setCommitted] = useState(false); // true once user clicks "View Schedule"

  // ── data ──────────────────────────────────────────────────────────────────────
  const [schedule,  setSchedule]  = useState([]);
  const [subjects,  setSubjects]  = useState([]);
  const [faculty,   setFaculty]   = useState([]);
  const [courses,   setCourses]   = useState([]);
  const [sections,  setSections]  = useState([]);   // distinct sections from students
  const [rooms,     setRooms]     = useState([]);   // from Admin Settings → Room Management
  const [loading,   setLoading]   = useState(false);
  const [saving,    setSaving]    = useState({});
  const [deleting,  setDeleting]  = useState({});
  const [drafts,    setDrafts]    = useState({});
  const [dirty,     setDirty]     = useState({}); // tracks rows with unsaved changes

  // ── fetch reference data once ─────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const [subRes, facRes, courseRes, sectRes, roomRes] = await Promise.all([
          fetch(`${API}/api/erd/subjects`),
          fetch(`${API}/api/erd/faculty`),
          fetch(`${API}/api/erd/courses`),
          fetch(`${API}/api/erd/sections`),
          fetch(`${API}/api/erd/rooms`),
        ]);
        setSubjects(subRes.ok    ? await subRes.json()    : []);
        setFaculty(facRes.ok     ? await facRes.json()    : []);
        setCourses(courseRes.ok  ? await courseRes.json() : []);
        const sects = sectRes.ok ? await sectRes.json()   : [];
        setSections(Array.isArray(sects) ? sects.map(s => s.name) : []);
        const rms = roomRes.ok ? await roomRes.json() : [];
        setRooms(Array.isArray(rms) ? rms : []);
      } catch (err) { console.error(err); }
    };
    load();
  }, []);

  // ── fetch schedule whenever filter changes ─────────────────────────────────────
  const fetchSchedule = useCallback(async (f) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (f.course)     params.set("course",     f.course);
      if (f.year_level) params.set("year_level", f.year_level);
      if (f.section)    params.set("section",    f.section);
      if (f.semester)   params.set("semester",   f.semester);
      const res = await fetch(`${API}/api/erd/class-schedule?${params}`);
      const data = res.ok ? await res.json() : [];
      setSchedule(Array.isArray(data) ? data : []);
      // seed drafts keyed by subject_id (catalog ID) so catalog rows auto-populate
      const d = {};
      (Array.isArray(data) ? data : []).forEach(row => {
        if (row.subject_id) {
          d[row.subject_id] = {
            scheduleRowId: row.id,
            day:           row.day        ?? "MONDAY",
            time:          row.time       ?? "",
            room:          row.room       ?? "",
            faculty_id:    row.faculty_id ?? "",
          };
        }
      });
      setDrafts(d);
    } catch (err) {
      console.error(err);
      showToast("Failed to load schedule.", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (committed) fetchSchedule(filter);
  }, [committed, filter, fetchSchedule]);

  // ── draft helpers (keyed by catalog subject ID) ───────────────────────────────
  const setField = (subjectId, field, val) => {
    setDrafts(prev => ({ ...prev, [subjectId]: { ...prev[subjectId], [field]: val } }));
    setDirty(prev => ({ ...prev, [subjectId]: true }));
  };

  // ── save: POST if no existing row, PUT if row already exists ──────────────────
  const handleSave = async (sub) => {
    const d = drafts[sub.id] || {};
    setSaving(prev => ({ ...prev, [sub.id]: true }));
    try {
      if (d.scheduleRowId) {
        // Update existing row
        const res = await fetch(`${API}/api/erd/class-schedule/${d.scheduleRowId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            day:           d.day        || null,
            subject_id:    sub.id,
            subject_title: sub.subject_title || null,
            time:          d.time       || null,
            room:          d.room       || null,
            faculty_id:    d.faculty_id || null,
          }),
        });
        if (res.ok) {
          showToast("Saved.", "success");
          setSchedule(prev => prev.map(r => r.id === d.scheduleRowId ? { ...r, day: d.day, time: d.time, room: d.room, faculty_id: d.faculty_id } : r));
          setDirty(prev => { const c = { ...prev }; delete c[sub.id]; return c; });
        } else { showToast("Failed to save.", "error"); }
      } else {
        // Create new row
        const res = await fetch(`${API}/api/erd/class-schedule`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            day:           d.day        || "MONDAY",
            course:        filter.course     || null,
            year_level:    filter.year_level || null,
            section:       filter.section    || null,
            semester:      filter.semester   || null,
            subject_id:    sub.id,
            subject_title: sub.subject_title || null,
            time:          d.time       || null,
            room:          d.room       || null,
            faculty_id:    d.faculty_id || null,
          }),
        });
        if (res.ok) {
          const newRow = await res.json();
          showToast("Saved.", "success");
          setSchedule(prev => [...prev, newRow]);
          setDrafts(prev => ({ ...prev, [sub.id]: { ...prev[sub.id], scheduleRowId: newRow.id } }));
          setDirty(prev => { const c = { ...prev }; delete c[sub.id]; return c; });
        } else { showToast("Failed to save.", "error"); }
      }
    } catch { showToast("Network error.", "error"); }
    finally { setSaving(prev => ({ ...prev, [sub.id]: false })); }
  };

  // ── clear: delete the schedule row for a subject, leaving catalog row intact ──
  const handleClear = (sub) => {
    const d = drafts[sub.id] || {};
    if (!d.scheduleRowId) {
      // Nothing saved yet — just wipe draft
      setDrafts(prev => { const c = { ...prev }; delete c[sub.id]; return c; });
      setDirty(prev => { const c = { ...prev }; delete c[sub.id]; return c; });
      return;
    }
    showConfirm({
      message: `Clear schedule for "${sub.subject_title}"?`,
      confirmLabel: "Clear",
      icon: "🗑️",
      onConfirm: async () => {
        setDeleting(prev => ({ ...prev, [sub.id]: true }));
        try {
          const res = await fetch(`${API}/api/erd/class-schedule/${d.scheduleRowId}`, { method: "DELETE" });
          if (res.ok) {
            setSchedule(prev => prev.filter(r => r.id !== d.scheduleRowId));
            setDrafts(prev => { const c = { ...prev }; delete c[sub.id]; return c; });
            setDirty(prev => { const c = { ...prev }; delete c[sub.id]; return c; });
            showToast("Cleared.", "info");
          } else { showToast("Failed to clear.", "error"); }
        } catch { showToast("Network error.", "error"); }
        finally { setDeleting(prev => ({ ...prev, [sub.id]: false })); }
      },
    });
  };

  const getFacultyName = (id) => {
    if (!id) return "—";
    const f = faculty.find(f => String(f.id) === String(id));
    return f ? `${f.firstName || f.first_name || ""} ${f.lastName || f.last_name || ""}`.trim() : "—";
  };

  // ── filtered subjects: course + year_level + semester ────────────────────────
  const filteredSubjects = subjects.filter(s => {
    if (filter.course     && s.course     !== filter.course)               return false;
    if (filter.year_level && s.year_level !== filter.year_level)           return false;
    if (filter.semester   && String(s.semester) !== String(filter.semester)) return false;
    return true;
  });

  // ── styles ────────────────────────────────────────────────────────────────────
  const thSt = {
    padding: "12px 14px", fontSize: "12px", fontWeight: 700,
    textTransform: "uppercase", letterSpacing: "0.5px",
    color: WHITE, background: DARK_GREEN, textAlign: "center", whiteSpace: "nowrap",
  };
  const tdSt = {
    padding: "10px 12px", fontSize: "13px", color: "#111827",
    borderBottom: `1px solid ${BORDER}`, verticalAlign: "middle", textAlign: "center",
  };
  const inputSt = {
    width: "100%", padding: "7px 10px",
    border: `1px solid ${BORDER}`, borderRadius: "6px",
    fontSize: "12px", fontFamily: "inherit", outline: "none",
    boxSizing: "border-box", background: WHITE,
  };
  const selectSt = { ...inputSt, cursor: "pointer" };
  const filterSelectSt = {
    padding: "8px 12px",
    border: `1px solid ${BORDER}`,
    borderRadius: "8px",
    fontSize: "13px",
    fontFamily: "inherit",
    background: WHITE,
    color: "#111827",
    cursor: "pointer",
    outline: "none",
    minWidth: "180px",
  };

  return (
    <div style={{ fontFamily: "system-ui, sans-serif" }}>

      {/* Page header */}
      <div style={{ marginBottom: "16px" }}>
        <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 900, color: DARK_GREEN }}>Class Schedule</h2>
        <p style={{ margin: "3px 0 0", fontSize: "13px", color: GRAY }}>Manage the weekly class timetable</p>
      </div>

      {/* ── FILTER BAR ── */}
      <div style={{
        background: WHITE, border: `1px solid ${BORDER}`,
        borderRadius: "10px", padding: "16px 20px",
        marginBottom: "16px",
      }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: "12px", flexWrap: "wrap" }}>
          {/* Course */}
          <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: "1 1 180px" }}>
            <label style={{ fontSize: "11px", fontWeight: 700, color: GRAY, textTransform: "uppercase", letterSpacing: "0.4px" }}>Course</label>
            <select
              value={filter.course}
              disabled={committed}
              onChange={e => setFilter(f => ({ ...f, course: e.target.value }))}
              style={{ ...filterSelectSt, background: committed ? LIGHT_GRAY : WHITE, cursor: committed ? "not-allowed" : "pointer" }}
            >
              <option value="">— Select Course —</option>
              {courses.map(c => <option key={c.id ?? c.course} value={c.course}>{c.course}</option>)}
            </select>
          </div>

          {/* Year Level */}
          <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: "1 1 150px" }}>
            <label style={{ fontSize: "11px", fontWeight: 700, color: GRAY, textTransform: "uppercase", letterSpacing: "0.4px" }}>Year Level</label>
            <select
              value={filter.year_level}
              disabled={committed}
              onChange={e => setFilter(f => ({ ...f, year_level: e.target.value }))}
              style={{ ...filterSelectSt, background: committed ? LIGHT_GRAY : WHITE, cursor: committed ? "not-allowed" : "pointer" }}
            >
              <option value="">— Select Year —</option>
              {YEAR_LEVELS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          {/* Section */}
          <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: "1 1 130px" }}>
            <label style={{ fontSize: "11px", fontWeight: 700, color: GRAY, textTransform: "uppercase", letterSpacing: "0.4px" }}>Section</label>
            <select
              value={filter.section}
              disabled={committed}
              onChange={e => setFilter(f => ({ ...f, section: e.target.value }))}
              style={{ ...filterSelectSt, background: committed ? LIGHT_GRAY : WHITE, cursor: committed ? "not-allowed" : "pointer" }}
            >
              <option value="">— Select Section —</option>
              {sections.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Semester */}
          <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: "1 1 140px" }}>
            <label style={{ fontSize: "11px", fontWeight: 700, color: GRAY, textTransform: "uppercase", letterSpacing: "0.4px" }}>Semester</label>
            <select
              value={filter.semester}
              disabled={committed}
              onChange={e => setFilter(f => ({ ...f, semester: e.target.value }))}
              style={{ ...filterSelectSt, background: committed ? LIGHT_GRAY : WHITE, cursor: committed ? "not-allowed" : "pointer" }}
            >
              <option value="">— Select Semester —</option>
              {SEMESTERS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          {/* Button */}
          <div style={{ display: "flex", flexDirection: "column", gap: "4px", flexShrink: 0 }}>
            <label style={{ fontSize: "11px", color: "transparent" }}>_</label>
            {committed ? (
              <button
                onClick={() => { setCommitted(false); setSchedule([]); setDrafts({}); setFilter({ course: "", year_level: "", section: "", semester: "" }); }}
                style={{
                  padding: "9px 16px", background: LIGHT_GRAY,
                  color: GRAY, border: `1px solid ${BORDER}`,
                  borderRadius: "7px", fontSize: "13px", fontWeight: 700,
                  cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
                }}
              >✕ Change</button>
            ) : (
              <button
                onClick={() => {
                  if (!filter.course || !filter.year_level || !filter.section || !filter.semester) {
                    showToast("Please select Course, Year Level, Section, and Semester first.", "error");
                    return;
                  }
                  setCommitted(true);
                }}
                style={{
                  padding: "9px 20px",
                  background: filter.course && filter.year_level && filter.section && filter.semester ? DARK_GREEN : "#D1D5DB",
                  color: WHITE, border: "none", borderRadius: "7px",
                  fontSize: "13px", fontWeight: 700,
                  cursor: filter.course && filter.year_level && filter.section && filter.semester ? "pointer" : "not-allowed",
                  fontFamily: "inherit", whiteSpace: "nowrap",
                }}
              >View Schedule</button>
            )}
          </div>
        </div>

        {/* Committed label */}
        {committed && (
          <div style={{ marginTop: "10px", fontSize: "12px", color: DARK_GREEN, fontWeight: 600 }}>
            Showing: <strong>{filter.course}</strong> · <strong>{filter.year_level}</strong> · <strong>{SEMESTERS.find(s => s.value === filter.semester)?.label}</strong> · Section <strong>{filter.section}</strong>
          </div>
        )}
      </div>

      {/* ── SCHEDULE TABLE (only after committing) ── */}
      {!committed ? (
        <div style={{
          border: `1px dashed ${BORDER}`, borderRadius: "10px",
          padding: "48px", textAlign: "center", color: GRAY, fontSize: "13px",
        }}>
          Select Course, Year Level, and Section above, then click <strong>View Schedule</strong>.
        </div>
      ) : (
      <div style={{ border: `1px solid ${BORDER}`, borderRadius: "10px", overflow: "hidden", background: WHITE }}>
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: GRAY, fontSize: "13px" }}>Loading...</div>
        ) : (
          <>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: DARK_GREEN }}>
                <th style={{ ...thSt, width: "100px" }}>Course Code</th>
                <th style={{ ...thSt, width: "60px" }}>Units</th>
                <th style={thSt}>Descriptive Title</th>
                <th style={{ ...thSt, width: "140px" }}>Time</th>
                <th style={{ ...thSt, width: "120px" }}>Days</th>
                <th style={{ ...thSt, width: "160px" }}>Instructor</th>
                <th style={{ ...thSt, width: "110px" }}>Room</th>
                {isAdmin && <th style={{ ...thSt, width: "100px" }}>Action</th>}
              </tr>
            </thead>
            <tbody>
              {filteredSubjects.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 8 : 7} style={{ padding: "20px 16px", color: GRAY, fontSize: "12px", fontStyle: "italic", textAlign: "center" }}>
                    No subjects found for the selected filters.
                  </td>
                </tr>
              ) : filteredSubjects.map((sub, ri) => {
                const d        = drafts[sub.id] || { day: "", time: "", room: "", faculty_id: "" };
                const isSaving   = !!saving[sub.id];
                const isDeleting = !!deleting[sub.id];
                const isDirty    = !!dirty[sub.id];
                const hasSaved   = !!d.scheduleRowId;
                return (
                  <tr key={sub.id} style={{ background: ri % 2 === 0 ? WHITE : "#FAFAFA", borderBottom: `1px solid ${BORDER}` }}>
                    {/* Course Code */}
                    <td style={{ ...tdSt, fontFamily: "monospace", color: "#1E88E5", fontWeight: 700 }}>
                      {sub.subject_code || "—"}
                    </td>

                    {/* Units */}
                    <td style={{ ...tdSt, textAlign: "center", fontWeight: 700 }}>
                      {sub.units ?? "—"}
                    </td>

                    {/* Descriptive Title */}
                    <td style={{ ...tdSt, textAlign: "left" }}>
                      {sub.subject_title || "—"}
                    </td>

                    {/* Time */}
                    <td style={tdSt}>
                      {isAdmin ? (
                        <input type="text" placeholder="e.g. 9:00-10:30AM" value={d.time || ""} onChange={e => setField(sub.id, "time", e.target.value)} style={inputSt} />
                      ) : <span>{d.time || "—"}</span>}
                    </td>

                    {/* Days */}
                    <td style={tdSt}>
                      {isAdmin ? (
                        <DayChips value={d.day || ""} onChange={val => setField(sub.id, "day", val)} />
                      ) : (
                        <DayChips value={d.day || ""} />
                      )}
                    </td>

                    {/* Instructor */}
                    <td style={tdSt}>
                      {isAdmin ? (
                        <select value={d.faculty_id || ""} onChange={e => setField(sub.id, "faculty_id", e.target.value)} style={selectSt}>
                          <option value="">— Select —</option>
                          {faculty.map(f => {
                            const fn = `${f.firstName || f.first_name || ""} ${f.lastName || f.last_name || ""}`.trim();
                            return <option key={f.id} value={f.id}>{fn}</option>;
                          })}
                        </select>
                      ) : <span>{getFacultyName(d.faculty_id)}</span>}
                    </td>

                    {/* Room */}
                    <td style={tdSt}>
                      {isAdmin ? (
                        <select value={d.room || ""} onChange={e => setField(sub.id, "room", e.target.value)} style={selectSt}>
                          <option value="">— Select —</option>
                          {rooms.map(rm => <option key={rm.id} value={rm.name}>{rm.name}</option>)}
                          {d.room && !rooms.some(rm => rm.name === d.room) && <option value={d.room}>{d.room}</option>}
                        </select>
                      ) : <span>{d.room || "—"}</span>}
                    </td>

                    {/* Actions */}
                    {isAdmin && (
                      <td style={{ ...tdSt, textAlign: "center" }}>
                        <div style={{ display: "flex", gap: "4px", justifyContent: "center" }}>
                          {isDirty && (
                            <button
                              onClick={() => handleSave(sub)} disabled={isSaving}
                              style={{ padding: "4px 10px", background: DARK_GREEN, color: WHITE, border: "none", borderRadius: "5px", fontSize: "11px", fontWeight: 700, cursor: isSaving ? "not-allowed" : "pointer", opacity: isSaving ? 0.6 : 1 }}
                            >{isSaving ? "…" : "Save"}</button>
                          )}
                          {hasSaved && (
                            <button
                              onClick={() => handleClear(sub)} disabled={isDeleting}
                              style={{ padding: "4px 8px", background: "none", color: RED, border: `1px solid #FECACA`, borderRadius: "5px", fontSize: "11px", cursor: isDeleting ? "not-allowed" : "pointer", opacity: isDeleting ? 0.6 : 1 }}
                            >✕</button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
          </>
        )}
      </div>
      )}
    </div>
  );
}
