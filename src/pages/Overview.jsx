import { useEffect, useState, useRef } from "react";
import * as XLSX from "xlsx";
import { showToast, showConfirm } from "../components/Toast";

const GOLD       = "#F5A800";
const GREEN      = "#3d6e01";
const DARK_GREEN = "#3d6e01";
const WHITE      = "#FFFFFF";
const GRAY       = "#6B7280";
const BORDER     = "#E5E7EB";
const LIGHT_GRAY = "#F9FAFB";
const RED        = "#DC2626";
const PURPLE     = "#6366F1";
const LIGHT_PURPLE = "#EEF2FF";

const DAYS   = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June",
                 "July","August","September","October","November","December"];

const YEAR_LEVELS_ORDER = ["1st Year", "2nd Year", "3rd Year", "4th Year"];

function isScheduledToday(sched) {
  if (!sched) return false;
  const s   = sched.toLowerCase();
  const day = new Date().getDay();
  const patterns = {
    0: ["sun", "sunday"],
    1: ["mwf", "mw ", "mw,", "mon", "monday"],
    2: ["tth", "t-th", "t,th", "tt", "tue", "tuesday"],
    3: ["mwf", "mw ", "mw,", "wed", "wednesday"],
    4: ["tth", "t-th", "t,th", "tt", "thu", "thursday"],
    5: ["mwf", "fri", "friday"],
    6: ["sat", "saturday"],
  };
  return (patterns[day] || []).some(k => s.includes(k));
}

function extractTime(sched) {
  if (!sched) return null;
  const match = sched.match(/(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?)\s*[-–]\s*(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?)/i);
  if (match) return `${match[1].trim()} – ${match[2].trim()}`;
  const fallback = sched.replace(/^[A-Za-z/,\-\s]+/, "").trim();
  return fallback || null;
}

// ── Mini Calendar ─────────────────────────────────────────────────────────────
const calendarCSS = `
  @keyframes calFadeIn   { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  @keyframes calSlideIn  { from{opacity:0;transform:translateX(18px)} to{opacity:1;transform:translateX(0)} }
  @keyframes calSlideInL { from{opacity:0;transform:translateX(-18px)} to{opacity:1;transform:translateX(0)} }
  @keyframes calPickerIn { from{opacity:0;transform:translateY(-6px) scale(0.97)} to{opacity:1;transform:translateY(0) scale(1)} }
  @keyframes todayPulse  { 0%,100%{box-shadow:0 0 0 0 rgba(27,94,32,0.45)} 60%{box-shadow:0 0 0 6px rgba(27,94,32,0)} }
  .cal-card  { animation: calFadeIn 0.45s cubic-bezier(0.22,1,0.36,1) both; }
  .cal-grid  { animation: calSlideIn 0.32s cubic-bezier(0.22,1,0.36,1) both; }
  .cal-gridL { animation: calSlideInL 0.32s cubic-bezier(0.22,1,0.36,1) both; }
  .cal-picker { animation: calPickerIn 0.2s cubic-bezier(0.22,1,0.36,1) both; }
  .cal-day:hover { background: #eaf2d9 !important; transform: scale(1.15); transition: all 0.15s ease; }
  .cal-today { animation: todayPulse 2s ease-in-out infinite; }
  .cal-nav:hover { background: #f2f9e8 !important; color: #3d6e01 !important; transform: scale(1.2); transition: all 0.15s ease; }
  .cal-pick-item:hover { background: #f2f9e8 !important; color: #3d6e01 !important; }
  .cal-pick-active { background: #3d6e01 !important; color: #fff !important; font-weight: 800; }
  .cal-month-btn:hover { color: #3d6e01 !important; text-decoration: underline; }
  .cal-year-btn:hover  { color: #3d6e01 !important; text-decoration: underline; }
`;

function MiniCalendar() {
  const today = new Date();
  const [current, setCurrent] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [eventDates, setEventDates] = useState(new Set());
  const [slideDir, setSlideDir] = useState("right");
  const [gridKey, setGridKey] = useState(0);
  const [picker, setPicker] = useState(null);
  const pickerRef = useRef(null);
  const activeYearRef = useRef(null);

  useEffect(() => {
    if (!picker) return;
    const handler = (e) => { if (pickerRef.current && !pickerRef.current.contains(e.target)) setPicker(null); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [picker]);

  useEffect(() => {
    if (picker === "year" && activeYearRef.current) {
      activeYearRef.current.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [picker]);

  const yearRange = Array.from({ length: today.getFullYear() - 1990 + 15 }, (_, i) => 1990 + i);

  useEffect(() => {
    const fetchEvents = () => {
      fetch(`${import.meta.env.VITE_API_URL}/api/erd/announcements`)
        .then(r => r.ok ? r.json() : [])
        .then(data => {
          const dates = new Set();
          if (Array.isArray(data)) {
            data.forEach(a => {
              if (!a.event_date) return;
              const raw = String(a.event_date).substring(0, 10);
              if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) dates.add(raw);
            });
          }
          setEventDates(dates);
        })
        .catch(() => {});
    };
    fetchEvents();
    const iv = setInterval(fetchEvents, 30000);
    return () => clearInterval(iv);
  }, []);

  const firstDay    = new Date(current.year, current.month, 1).getDay();
  const daysInMonth = new Date(current.year, current.month + 1, 0).getDate();

  const prevMonth = () => {
    setSlideDir("left"); setGridKey(k => k + 1);
    setCurrent(c => ({ year: c.month === 0 ? c.year - 1 : c.year, month: c.month === 0 ? 11 : c.month - 1 }));
  };
  const nextMonth = () => {
    setSlideDir("right"); setGridKey(k => k + 1);
    setCurrent(c => ({ year: c.month === 11 ? c.year + 1 : c.year, month: c.month === 11 ? 0 : c.month + 1 }));
  };

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const isToday = (d) => d === today.getDate() && current.month === today.getMonth() && current.year === today.getFullYear();
  const isEventDay = (d) => {
    if (!d) return false;
    const mm = String(current.month + 1).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    return eventDates.has(`${current.year}-${mm}-${dd}`);
  };

  return (
    <>
    <style>{calendarCSS}</style>
    <div className="cal-card" style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: "12px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
      <div style={{ padding: "12px 16px", borderBottom: `1px solid ${BORDER}`, background: LIGHT_GRAY, display: "flex", alignItems: "center", justifyContent: "space-between", height: "48px", minHeight: "48px", maxHeight: "48px", boxSizing: "border-box" }}>
        <div style={{ minWidth: 0, overflow: "hidden" }}>
          <div style={{ fontSize: "13px", fontWeight: 800, color: DARK_GREEN, whiteSpace: "nowrap" }}>School Calendar</div>
          <div style={{ fontSize: "10px", color: GRAY, marginTop: "1px", whiteSpace: "nowrap" }}>{MONTHS[today.getMonth()]} {today.getFullYear()}</div>
        </div>
      </div>
      <div style={{ padding: "14px", height: "350px", minHeight: "350px", maxHeight: "350px", boxSizing: "border-box", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
          <button className="cal-nav" onClick={prevMonth} style={{ border: "none", background: "none", cursor: "pointer", fontSize: "15px", color: GRAY, padding: "2px 5px", borderRadius: "50%", lineHeight: 1, transition: "all 0.15s" }}>‹</button>
          <div ref={pickerRef} style={{ position: "relative", display: "flex", alignItems: "center", gap: "4px" }}>
            <button className="cal-month-btn" onClick={() => setPicker(p => p === "month" ? null : "month")}
              style={{ border: "none", background: "none", cursor: "pointer", fontWeight: 800, fontSize: "13px", color: DARK_GREEN, padding: "2px 4px", borderRadius: "4px", transition: "color 0.15s" }}>
              {MONTHS[current.month]}
            </button>
            <button className="cal-year-btn" onClick={() => setPicker(p => p === "year" ? null : "year")}
              style={{ border: "none", background: "none", cursor: "pointer", fontWeight: 800, fontSize: "13px", color: DARK_GREEN, padding: "2px 4px", borderRadius: "4px", transition: "color 0.15s" }}>
              {current.year}
            </button>
            {picker === "month" && (
              <div className="cal-picker" style={{ position: "absolute", top: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)", background: WHITE, border: `1px solid ${BORDER}`, borderRadius: "10px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 100, padding: "8px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "4px", minWidth: "180px" }}>
                {MONTHS.map((m, i) => (
                  <button key={m} className={`cal-pick-item${i === current.month ? " cal-pick-active" : ""}`}
                    onClick={() => { setSlideDir(i > current.month ? "right" : "left"); setGridKey(k=>k+1); setCurrent(c=>({...c, month: i})); setPicker(null); }}
                    style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: "11px", fontWeight: 600, color: "#374151", padding: "5px 4px", borderRadius: "6px", transition: "all 0.12s" }}>
                    {m.slice(0,3)}
                  </button>
                ))}
              </div>
            )}
            {picker === "year" && (
              <div className="cal-picker" style={{ position: "absolute", top: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)", background: WHITE, border: `1px solid ${BORDER}`, borderRadius: "10px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 100, padding: "8px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "4px", minWidth: "180px", maxHeight: "240px", overflowY: "auto" }}>
                {yearRange.map(y => (
                  <button key={y} ref={y === current.year ? activeYearRef : null}
                    className={`cal-pick-item${y === current.year ? " cal-pick-active" : ""}`}
                    onClick={() => { setSlideDir(y > current.year ? "right" : "left"); setGridKey(k=>k+1); setCurrent(c=>({...c, year: y})); setPicker(null); }}
                    style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: "11px", fontWeight: 600, color: "#374151", padding: "5px 4px", borderRadius: "6px", transition: "all 0.12s" }}>
                    {y}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="cal-nav" onClick={nextMonth} style={{ border: "none", background: "none", cursor: "pointer", fontSize: "15px", color: GRAY, padding: "2px 5px", borderRadius: "50%", lineHeight: 1, transition: "all 0.15s" }}>›</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: "1px", marginBottom: "3px" }}>
          {DAYS.map(d => (
            <div key={d} style={{ textAlign: "center", fontSize: "9px", fontWeight: 700, color: GRAY, padding: "2px 0" }}>{d}</div>
          ))}
        </div>
        <div key={gridKey} className={slideDir === "right" ? "cal-grid" : "cal-gridL"} style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: "1px" }}>
          {cells.map((d, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "center", padding: "2px 0" }}>
              <span
                className={d ? (isToday(d) ? "cal-today" : "cal-day") : ""}
                title={isEventDay(d) ? "Event scheduled" : undefined}
                style={{
                  width: "26px", height: "26px", flexShrink: 0, boxSizing: "border-box",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "11px", borderRadius: "50%",
                  background: isToday(d) ? DARK_GREEN : isEventDay(d) ? "#1E88E5" : "transparent",
                  color: isToday(d) ? WHITE : isEventDay(d) ? WHITE : d ? "#111827" : "transparent",
                  fontWeight: (isToday(d) || isEventDay(d)) ? 800 : 400,
                  cursor: isEventDay(d) ? "pointer" : "default",
                  transition: "background 0.15s, color 0.15s",
                }}>{d || ""}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: "10px", paddingTop: "8px", borderTop: `1px solid ${BORDER}`, textAlign: "center", whiteSpace: "nowrap", overflow: "hidden" }}>
          <span style={{ fontSize: "10px", color: GRAY }}>Today — </span>
          <span style={{ fontSize: "10px", fontWeight: 700, color: DARK_GREEN }}>
            {DAYS[today.getDay()]}, {MONTHS[today.getMonth()]} {today.getDate()}, {today.getFullYear()}
          </span>
        </div>
      </div>
    </div>
    </>
  );
}

// ── Teaching Lessons panel ────────────────────────────────────────────────────
function TeachingLessons({ user }) {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    fetch(`${import.meta.env.VITE_API_URL}/api/erd/faculty/assignments/${user.id}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => { setAssignments(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [user?.id]);

  const today     = new Date();
  const dayName   = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][today.getDay()];
  const todayList = assignments.filter(a => isScheduledToday(a.sched));

  const subjectColors = [
    { bg: "#EEF2FF", color: "#4F46E5" }, { bg: "#FFF7ED", color: "#C2410C" },
    { bg: "#f2f9e8", color: "#2d5201" }, { bg: "#FFF1F2", color: "#BE123C" },
    { bg: "#F0F9FF", color: "#0369A1" },
  ];

  return (
    <div style={{ background: WHITE, borderTop: `1px solid ${BORDER}`, borderRight: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`, borderLeft: `4px solid ${GREEN}`, borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", overflow: "hidden" }}>
      <div style={{ padding: "12px 16px", borderBottom: `1px solid ${BORDER}`, background: LIGHT_GRAY, display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", height: "48px", minHeight: "48px", maxHeight: "48px", boxSizing: "border-box" }}>
        <div style={{ minWidth: 0, overflow: "hidden" }}>
          <div style={{ fontSize: "13px", fontWeight: 800, color: DARK_GREEN, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Teaching Lessons</div>
          <div style={{ fontSize: "10px", color: GRAY, marginTop: "1px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{dayName}'s Teaching Load</div>
        </div>
        <span style={{ fontSize: "10px", fontWeight: 700, background: DARK_GREEN, color: WHITE, borderRadius: "20px", padding: "2px 8px", flexShrink: 0, whiteSpace: "nowrap" }}>
          {todayList.length} class{todayList.length !== 1 ? "es" : ""}
        </span>
      </div>
      <div style={{ height: "350px", minHeight: "350px", maxHeight: "350px", overflowY: "auto", boxSizing: "border-box" }}>
        {loading ? (
          <div style={{ padding: "30px", textAlign: "center", color: GRAY, fontSize: "12px" }}>Loading schedule...</div>
        ) : todayList.length === 0 ? (
          <div style={{ padding: "30px", textAlign: "center", color: GRAY, fontSize: "12px" }}>
            <div style={{ fontSize: "28px", marginBottom: "8px" }}>🎉</div>No classes scheduled for today.
          </div>
        ) : (
          todayList.map((a, i) => {
            const sc   = subjectColors[i % subjectColors.length];
            const time = extractTime(a.sched);
            return (
              <div key={a.id || i} className="ov-lesson-row" style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 16px 10px 28px", borderBottom: `1px solid ${BORDER}`, background: "transparent" }}>
                <div style={{ width: 32, height: 32, borderRadius: "8px", flexShrink: 0, background: sc.bg, color: sc.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px" }}>📘</div>
                <div style={{ flexShrink: 0, minWidth: "72px" }}>
                  <div style={{ fontSize: "9px", color: GRAY, fontWeight: 600 }}>Start from</div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#111827" }}>{time || "—"}</div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "12px", fontWeight: 800, color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.subject_title || "—"}</div>
                  <div style={{ display: "flex", gap: "6px", marginTop: "2px" }}>
                    {a.section && <span style={{ fontSize: "10px", color: GRAY }}>📋 {a.section}</span>}
                    {a.room    && <span style={{ fontSize: "10px", color: GRAY }}>🚪 {a.room}</span>}
                    {a.units   && <span style={{ fontSize: "10px", color: GRAY }}>⏱ {a.units} units</span>}
                  </div>
                </div>
                {a.year_level && (
                  <span style={{ flexShrink: 0, fontSize: "10px", fontWeight: 700, background: sc.bg, color: sc.color, padding: "2px 8px", borderRadius: "20px", whiteSpace: "nowrap" }}>
                    {a.year_level}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── Enrollment Statistics ─────────────────────────────────────────────────────
const YEAR_LEVELS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
const SEMESTERS   = ["1st Semester", "2nd Semester"];

function EnrollmentStats({ user }) {
  const isAdmin = user?.role === "administrator";
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [activeSem, setActiveSem]     = useState("1st Semester");
  const [schoolYear, setSchoolYear]   = useState("all"); // will be updated to latest after fetch

  useEffect(() => {
    // Count ALL registered students (matches the "Enrollment by Gender" donut),
    // bucketed by year level / school year. Students have no per-semester record,
    // so a registered student is counted in the selected semester.
    fetch(`${import.meta.env.VITE_API_URL}/api/erd/students`)
      .then(r => r.ok ? r.json() : [])
      .then(data => { setEnrollments(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const isMale   = e => (e.gender || "").toLowerCase() === "male";
  const isFemale = e => (e.gender || "").toLowerCase() === "female";
  const isLgbt   = e => (e.gender || "").toLowerCase() === "lgbtqia+";

  // year_enrolled is a number (e.g. 2025); derive "2025-2026" from it
  const toSY = yr => yr ? `${yr}-${parseInt(yr) + 1}` : null;

  const schoolYears = [...new Set(enrollments.map(e => toSY(e.year_enrolled)).filter(Boolean))].sort().reverse();

  // Auto-select the most recent school year after data loads
  useEffect(() => {
    if (schoolYears.length > 0 && schoolYear === "all") setSchoolYear(schoolYears[0]);
  }, [enrollments.length]);

  const bySchoolYear = schoolYear === "all"
    ? enrollments
    : enrollments.filter(e => toSY(e.year_enrolled) === schoolYear);

  // Students carry no semester, so both semester views reflect all registered students.
  const sem1Count = bySchoolYear.length;
  const sem2Count = bySchoolYear.length;

  const filtered = bySchoolYear;
  const male        = filtered.filter(isMale).length;
  const female      = filtered.filter(isFemale).length;
  const lgbt        = filtered.filter(isLgbt).length;
  const unspecified = filtered.length - male - female - lgbt;

  const byYearLevel = YEAR_LEVELS.map(lvl => {
    const rows = filtered.filter(e => e.year_level === lvl);
    return { label: lvl, total: rows.length, male: rows.filter(isMale).length, female: rows.filter(isFemale).length, lgbt: rows.filter(isLgbt).length };
  });

  const downloadXlsx = () => {
    const rows = [
      ["CCA Enrollment Statistics Report"],
      ["Generated At", new Date().toLocaleString()],
      ["School Year", schoolYear === "all" ? "All School Years" : schoolYear],
      ["Semester", activeSem],
      [],
      ["Year Level", "Total", "Male", "Female", "LGBTQIA+", "Unspecified"],
      ...byYearLevel.map(r => [r.label, r.total, r.male, r.female, r.lgbt, r.total - r.male - r.female - r.lgbt]),
      [],
      ["TOTAL", filtered.length, male, female, lgbt, unspecified],
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [{ wch: 22 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 14 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Enrollment Stats");
    XLSX.writeFile(wb, `enrollment-stats.xlsx`);
  };

  return (
    <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", overflow: "hidden", height: "100%", boxSizing: "border-box" }}>
      {/* Header */}
      <div style={{ padding: "12px 16px", borderBottom: `1px solid ${BORDER}`, background: LIGHT_GRAY, display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
        <div>
          <div style={{ fontSize: "13px", fontWeight: 700, color: DARK_GREEN }}>Enrollment Statistics</div>
          <div style={{ fontSize: "10px", color: GRAY, marginTop: "1px" }}>
            {schoolYear === "all" ? "All school years" : `S.Y. ${schoolYear}`} · {activeSem}
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <select value={schoolYear} onChange={e => setSchoolYear(e.target.value)}
            style={{ fontSize: "11px", padding: "5px 10px", border: `1px solid ${BORDER}`, borderRadius: "6px", background: WHITE, color: "#374151", cursor: "pointer", outline: "none" }}>
            <option value="all">All School Years</option>
            {schoolYears.map(sy => <option key={sy} value={sy}>{sy}</option>)}
          </select>
          {isAdmin && (
            <button type="button" onClick={downloadXlsx}
              style={{ padding: "5px 12px", border: "none", borderRadius: "6px", fontSize: "11px", fontWeight: 600, background: DARK_GREEN, color: WHITE, cursor: "pointer", whiteSpace: "nowrap" }}>
              Export
            </button>
          )}
        </div>
      </div>

      {/* Semester tabs */}
      <div style={{ display: "flex", gap: "8px", padding: "10px 16px", borderBottom: `1px solid ${BORDER}`, background: WHITE }}>
        {SEMESTERS.map(sem => {
          const count = sem === "1st Semester" ? sem1Count : sem2Count;
          const active = activeSem === sem;
          return (
            <button key={sem} onClick={() => setActiveSem(sem)}
              style={{
                padding: "5px 14px", border: `1.5px solid ${active ? DARK_GREEN : BORDER}`,
                borderRadius: "20px", fontSize: "11px", fontWeight: 700,
                background: active ? DARK_GREEN : WHITE, color: active ? WHITE : "#374151",
                cursor: "pointer", transition: "all 0.15s",
              }}>
              {sem} ({count})
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div style={{ padding: "12px 16px" }}>
        {loading ? (
          <div style={{ padding: "20px", textAlign: "center", color: GRAY, fontSize: "12px" }}>Loading...</div>
        ) : (
          <div>
            {/* Legend */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10, fontSize: 12 }}>
              <span style={{ color: GRAY, fontSize: 11 }}>Total: <b style={{ color: DARK_GREEN }}>{filtered.length}</b></span>
            </div>
            {(() => {
              const data = byYearLevel;
              const W = 660, H = 104, padL = 30, padR = 14, padT = 10, padB = 20;
              const maxV = Math.max(1, ...data.map(d => Math.max(d.male, d.female, d.lgbt)));
              const n = data.length;
              const X = (i) => padL + (n <= 1 ? (W - padL - padR) / 2 : (i / (n - 1)) * (W - padL - padR));
              const Y = (v) => padT + (1 - v / maxV) * (H - padT - padB);
              const path = (key) => data.map((d, i) => `${i === 0 ? "M" : "L"}${X(i).toFixed(1)},${Y(d[key]).toFixed(1)}`).join(" ");
              const TICKS = 4;
              return (
                <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "104px", overflow: "visible" }}>
                  <defs>
                    <linearGradient id="enrollRainbow" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#e40303" />
                      <stop offset="20%" stopColor="#ff8c00" />
                      <stop offset="40%" stopColor="#ffed00" />
                      <stop offset="60%" stopColor="#008026" />
                      <stop offset="80%" stopColor="#004dff" />
                      <stop offset="100%" stopColor="#750787" />
                    </linearGradient>
                  </defs>
                  {Array.from({ length: TICKS + 1 }).map((_, t) => {
                    const v = (maxV * (TICKS - t)) / TICKS;
                    const yy = Y(v);
                    return (
                      <g key={t}>
                        <line x1={padL} y1={yy} x2={W - padR} y2={yy} stroke="#eeeeee" />
                        <text x={padL - 6} y={yy + 3} textAnchor="end" fontSize="9" fill={GRAY}>{Math.round(v)}</text>
                      </g>
                    );
                  })}
                  {data.map((d, i) => <text key={"x" + i} x={X(i)} y={H - 8} textAnchor="middle" fontSize="9.5" fill={GRAY}>{d.label}</text>)}
                  <path d={path("male")} fill="none" stroke="#3B82F6" strokeWidth="2.5" strokeLinejoin="round" />
                  <path d={path("female")} fill="none" stroke="#EC4899" strokeWidth="2.5" strokeLinejoin="round" />
                  <path d={path("lgbt")} fill="none" stroke="url(#enrollRainbow)" strokeWidth="2.5" strokeLinejoin="round" />
                  {data.map((d, i) => <circle key={"m" + i} cx={X(i)} cy={Y(d.male)} r="4" fill="#fff" stroke="#3B82F6" strokeWidth="2" />)}
                  {data.map((d, i) => <circle key={"f" + i} cx={X(i)} cy={Y(d.female)} r="4" fill="#fff" stroke="#EC4899" strokeWidth="2" />)}
                  {data.map((d, i) => <circle key={"l" + i} cx={X(i)} cy={Y(d.lgbt)} r="4" fill="#fff" stroke="#750787" strokeWidth="2" />)}
                </svg>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Gender donut (enrollment by sex) ──────────────────────────────────────────
function GenderDonut() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading]   = useState(true);
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/erd/students`)
      .then(r => r.ok ? r.json() : [])
      .then(d => { setStudents(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);
  const male   = students.filter(s => (s.gender || "").toLowerCase() === "male").length;
  const female = students.filter(s => (s.gender || "").toLowerCase() === "female").length;
  const lgbt   = students.filter(s => (s.gender || "").toLowerCase() === "lgbtqia+").length;
  const total  = students.length;
  const other  = total - male - female - lgbt;
  const R = 42, C = 2 * Math.PI * R;
  const seg = (v) => total ? (v / total) * C : 0;
  const mLen = seg(male), fLen = seg(female), lLen = seg(lgbt), uLen = seg(other);
  const pct = (v) => total ? Math.round((v / total) * 100) : 0;
  const RAINBOW = "linear-gradient(90deg,#e40303,#ff8c00,#ffed00,#008026,#004dff,#750787)";
  const dot = (c) => ({ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: c, flexShrink: 0 });
  return (
    <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: "12px", marginTop: "4px" }}>
      <div style={{ fontSize: "10px", fontWeight: 700, color: GRAY, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "8px" }}>Enrollment by Gender</div>
      {loading ? (
        <div style={{ fontSize: "11px", color: GRAY }}>Loading…</div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <svg width="104" height="104" viewBox="0 0 104 104" style={{ flexShrink: 0 }}>
            <defs>
              <linearGradient id="genderRainbow" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#e40303" />
                <stop offset="20%" stopColor="#ff8c00" />
                <stop offset="40%" stopColor="#ffed00" />
                <stop offset="60%" stopColor="#008026" />
                <stop offset="80%" stopColor="#004dff" />
                <stop offset="100%" stopColor="#750787" />
              </linearGradient>
            </defs>
            <g transform="rotate(-90 52 52)">
              <circle cx="52" cy="52" r={R} fill="none" stroke="#eeeeee" strokeWidth="14" />
              {male > 0 && <circle cx="52" cy="52" r={R} fill="none" stroke="#3B82F6" strokeWidth="14" strokeDasharray={`${mLen} ${C}`} strokeDashoffset="0" />}
              {female > 0 && <circle cx="52" cy="52" r={R} fill="none" stroke="#EC4899" strokeWidth="14" strokeDasharray={`${fLen} ${C}`} strokeDashoffset={`-${mLen}`} />}
              {lgbt > 0 && <circle cx="52" cy="52" r={R} fill="none" stroke="url(#genderRainbow)" strokeWidth="14" strokeDasharray={`${lLen} ${C}`} strokeDashoffset={`-${mLen + fLen}`} />}
              {other > 0 && <circle cx="52" cy="52" r={R} fill="none" stroke="#9CA3AF" strokeWidth="14" strokeDasharray={`${uLen} ${C}`} strokeDashoffset={`-${mLen + fLen + lLen}`} />}
            </g>
            <text x="52" y="49" textAnchor="middle" fontSize="18" fontWeight="800" fill={DARK_GREEN}>{total}</text>
            <text x="52" y="63" textAnchor="middle" fontSize="7.5" fill={GRAY}>students</text>
          </svg>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: "11px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={dot("#3B82F6")} /><b style={{ color: "#3B82F6" }}>Male</b>&nbsp;{male} ({pct(male)}%)</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={dot("#EC4899")} /><b style={{ color: "#EC4899" }}>Female</b>&nbsp;{female} ({pct(female)}%)</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={dot(RAINBOW)} /><b style={{ background: RAINBOW, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>LGBTQIA+</b>&nbsp;{lgbt} ({pct(lgbt)}%)</div>
            {other > 0 && <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={dot("#9CA3AF")} /><b style={{ color: "#6B7280" }}>Other</b>&nbsp;{other} ({pct(other)}%)</div>}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Quick Actions ─────────────────────────────────────────────────────────────
function QuickActions({ user }) {
  const actions = [
    { icon: "➕", label: "Add New Student",       desc: "Register a new student record",    color: DARK_GREEN,  bg: "#f2f9e8",  border: "#c6e49b", path: "students"    },
    { icon: "📢", label: "Create Announcement",   desc: "Post a bulletin for the campus",    color: "#1d4ed8",   bg: "#eff6ff",  border: "#bfdbfe", path: "announcements" },
    { icon: "📋", label: "View Registrar Logs",   desc: "Check transcript & registrar data", color: "#6d28d9",   bg: "#f5f3ff",  border: "#ddd6fe", path: "registrar"   },
  ];

  const handleAction = (path) => {
    // Try React Router hash navigation first, then fallback
    const evt = new CustomEvent("cca-navigate", { detail: { path } });
    window.dispatchEvent(evt);
    // Also update hash as fallback
    window.location.hash = path;
  };

  return (
    <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", overflow: "hidden", display: "flex", flexDirection: "column", height: "100%", boxSizing: "border-box" }}>
      <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: "10px", flex: 1 }}>
        {/* Enrollment by gender donut */}
        <GenderDonut />

        {/* Divider + extra info */}
        <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: "12px", marginTop: "4px" }}>
          <div style={{ fontSize: "10px", fontWeight: 700, color: GRAY, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "8px" }}>System Info</div>
          <div style={{ fontSize: "11px", color: "#374151", lineHeight: 1.8 }}>
            <div>🏫 Community College of Alangalang</div>
            <div style={{ color: GRAY }}>Role: <strong style={{ color: DARK_GREEN, textTransform: "capitalize" }}>{user?.role || "Guest"}</strong></div>
            <div style={{ color: GRAY }}>Today: <strong style={{ color: "#111827" }}>{new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</strong></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Overview ─────────────────────────────────────────────────────────────
// ── Faculty / Instructor Teaching Load ───────────────────────────────────────
function FacultyLoad() {
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    // Class Assignment data (Registrar) lives in the class-schedule table.
    fetch(`${import.meta.env.VITE_API_URL}/api/erd/class-schedule`)
      .then(r => r.ok ? r.json() : [])
      .then(d => { setRows(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Keep only rows that actually have an instructor assigned.
  const assigned = rows.filter(r => r.faculty_id && (r.faculty_name || "").trim());
  const byFac = {};
  assigned.forEach(r => {
    const key = r.faculty_id;
    if (!byFac[key]) byFac[key] = { name: (r.faculty_name || "").trim() || "—", rows: [] };
    byFac[key].rows.push(r);
  });
  const facList = Object.values(byFac).sort((x, y) => x.name.localeCompare(y.name));
  const unitsOf = (r) => parseFloat(r.units) || 0;
  const codeOf  = (r) => r.subject_code || "—";

  const thL = { padding: "9px 12px", textAlign: "left", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: WHITE, whiteSpace: "nowrap" };
  const tdL = { padding: "8px 12px", fontSize: "12px", color: "#111827", borderTop: `1px solid ${BORDER}`, verticalAlign: "top" };

  return (
    <div style={{ background: WHITE, borderRadius: "12px", border: `1px solid ${BORDER}`, overflow: "hidden", display: "flex", flexDirection: "column", height: "340px" }}>
      <div style={{ padding: "12px 16px", background: LIGHT_GRAY, borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
        <div style={{ fontSize: "13px", fontWeight: 700, color: DARK_GREEN }}>Faculty Teaching Load</div>
        <div style={{ fontSize: "11px", color: GRAY, marginTop: "2px" }}>Subjects and units assigned to each instructor</div>
      </div>
      <div style={{ overflowX: "auto", overflowY: "auto", flex: 1, minHeight: 0 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr style={{ background: DARK_GREEN, position: "sticky", top: 0, zIndex: 1 }}>
            <th style={thL}>Instructor</th>
            <th style={{ ...thL, textAlign: "center", width: "90px" }}>Subjects</th>
            <th style={{ ...thL, textAlign: "center", width: "80px" }}>Total Units</th>
            <th style={thL}>Assigned Subjects</th>
          </tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} style={{ ...tdL, textAlign: "center", color: GRAY, padding: "24px" }}>Loading…</td></tr>
            ) : facList.length === 0 ? (
              <tr><td colSpan={4} style={{ ...tdL, textAlign: "center", color: GRAY, padding: "24px" }}>No teaching loads assigned yet.</td></tr>
            ) : facList.map((f, i) => {
              const totalUnits = f.rows.reduce((s, a) => s + unitsOf(a), 0);
              return (
                <tr key={i} style={{ background: i % 2 ? LIGHT_GRAY : WHITE }}>
                  <td style={{ ...tdL, fontWeight: 700 }}>{f.name}</td>
                  <td style={{ ...tdL, textAlign: "center" }}>{f.rows.length}</td>
                  <td style={{ ...tdL, textAlign: "center", fontWeight: 700, color: DARK_GREEN }}>{totalUnits}</td>
                  <td style={tdL}>
                    {f.rows.map((a, j) => (
                      <span key={j} style={{ display: "inline-block", fontSize: "10px", fontWeight: 700, background: "#eaf2d9", color: DARK_GREEN, padding: "2px 7px", borderRadius: "10px", margin: "1px 4px 1px 0" }}>
                        {codeOf(a)}{a.section ? ` · ${a.section}` : ""}
                      </span>
                    ))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Student Attendance Statistics (bar graph) ────────────────────────────────
function AttendanceStats() {
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/erd/attendance`)
      .then(r => r.ok ? r.json() : [])
      .then(d => { setRows(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const P = rows.filter(r => r.status === "P").length;
  const L = rows.filter(r => r.status === "L").length;
  const A = rows.filter(r => r.status === "A").length;
  const total = P + L + A;
  const max = Math.max(P, L, A, 1);
  const rate = total ? Math.round((P / total) * 100) : 0;
  const bars = [["Present", P, "#16A34A"], ["Late", L, "#B45309"], ["Absent", A, "#DC2626"]];

  const W = 280, H = 168, padT = 20, padB = 30, bw = 54;
  const gap = (W - bars.length * bw) / (bars.length + 1);
  const chartH = H - padT - padB;

  return (
    <div style={{ background: WHITE, borderRadius: "12px", border: `1px solid ${BORDER}`, height: "100%", boxSizing: "border-box", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "12px 16px", background: LIGHT_GRAY, borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ fontSize: "13px", fontWeight: 700, color: DARK_GREEN }}>Student Attendance Statistics</div>
        <div style={{ fontSize: "11px", color: GRAY, marginTop: "2px" }}>All submitted attendance</div>
      </div>
      <div style={{ flex: 1, padding: "10px 12px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        {loading ? (
          <div style={{ fontSize: "11px", color: GRAY, padding: "20px" }}>Loading…</div>
        ) : total === 0 ? (
          <div style={{ fontSize: "11px", color: GRAY, textAlign: "center", padding: "20px" }}>No attendance submitted yet.</div>
        ) : (
          <>
            <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxWidth: "300px" }}>
              <line x1="0" y1={padT + chartH} x2={W} y2={padT + chartH} stroke={BORDER} />
              {bars.map(([label, val, color], i) => {
                const h = (val / max) * chartH;
                const x = gap + i * (bw + gap);
                const y = padT + chartH - h;
                return (
                  <g key={label}>
                    <rect x={x} y={y} width={bw} height={h} rx="4" fill={color} />
                    <text x={x + bw / 2} y={y - 5} textAnchor="middle" fontSize="12" fontWeight="800" fill={color}>{val}</text>
                    <text x={x + bw / 2} y={padT + chartH + 16} textAnchor="middle" fontSize="10" fill={GRAY}>{label}</text>
                    <text x={x + bw / 2} y={padT + chartH + 27} textAnchor="middle" fontSize="9" fill={GRAY}>{Math.round((val / total) * 100)}%</text>
                  </g>
                );
              })}
            </svg>
            <div style={{ marginTop: "6px", fontSize: "12px", color: GRAY }}>
              Attendance rate: <b style={{ color: DARK_GREEN }}>{rate}%</b> · <b>{total}</b> record(s)
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Maintenance Mode toggle (administrator only) ─────────────────────────────
function MaintenanceToggle() {
  const [on, setOn]       = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/erd/maintenance`)
      .then(r => r.ok ? r.json() : { on: 0 }).then(d => setOn(!!d.on)).catch(() => {});
  }, []);
  const toggle = async () => {
    const next = !on;
    setSaving(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/erd/maintenance`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ on: next ? 1 : 0 }),
      });
      if (res.ok) { setOn(next); showToast(next ? "Maintenance mode ON — non-admins are locked out." : "Maintenance mode OFF.", next ? "warning" : "success"); }
      else showToast("Failed to update maintenance mode.", "error");
    } catch { showToast("Network error.", "error"); }
    setSaving(false);
  };
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", background: on ? "#FEF3C7" : WHITE, border: `1px solid ${on ? "#FCD34D" : BORDER}`, borderRadius: "12px", padding: "12px 16px", marginBottom: "16px" }}>
      <div>
        <div style={{ fontSize: "13px", fontWeight: 800, color: on ? "#92400E" : DARK_GREEN }}>🛠 Maintenance Mode</div>
        <div style={{ fontSize: "11px", color: GRAY, marginTop: "2px" }}>
          {on ? "System is locked for everyone except administrators." : "Turn on to lock out all non-administrator users."}
        </div>
      </div>
      <button onClick={toggle} disabled={saving} title="Toggle maintenance mode"
        style={{ position: "relative", width: "92px", height: "34px", borderRadius: "18px", border: "none", cursor: saving ? "default" : "pointer", background: on ? "#DC2626" : "#9CA3AF", transition: "background 0.2s", flexShrink: 0 }}>
        <span style={{ position: "absolute", top: 0, bottom: 0, display: "flex", alignItems: "center", fontSize: "11px", fontWeight: 800, color: WHITE, left: on ? "14px" : "auto", right: on ? "auto" : "14px" }}>{on ? "ON" : "OFF"}</span>
        <span style={{ position: "absolute", top: "4px", left: on ? "calc(100% - 30px)" : "4px", width: "26px", height: "26px", borderRadius: "50%", background: WHITE, transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
      </button>
    </div>
  );
}

export default function Overview({ user }) {
  const [loading, setLoading]         = useState(true);
  const [announcements, setAnnouncements] = useState([]);
  const [deletingId, setDeletingId]   = useState(null);

  const isAdmin   = user?.role === "administrator";
  const isFaculty = user?.role === "faculty";

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/erd/announcements`)
      .then(r => r.ok ? r.json() : [])
      .then(data => { setAnnouncements(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleDeleteNotice = (id) => {
    showConfirm({
      message: "Delete this announcement permanently?",
      confirmLabel: "Delete",
      icon: "🗑️",
      onConfirm: async () => {
        setDeletingId(id);
        try {
          const res = await fetch(`${import.meta.env.VITE_API_URL}/api/erd/announcements/${id}`, { method: "DELETE" });
          if (res.ok) {
            showToast("Announcement deleted.", "info");
            setAnnouncements(prev => prev.filter(item => item.id !== id));
            window.dispatchEvent(new CustomEvent("announcement-deleted"));
          } else showToast("Failed to delete announcement.", "error");
        } catch { showToast("Network error.", "error"); }
        finally { setDeletingId(null); }
      },
    });
  };

  return (
    <div style={{ fontFamily: "system-ui", minWidth: 0 }}>
      <style>{`
        .ov-note-card { transition: box-shadow 0.15s ease; }
        .ov-note-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.08) !important; }
        .ov-lesson-row { transition: background 0.12s; }
        .ov-lesson-row:hover { background: #f2f9e8 !important; }
      `}</style>

      {/* ── Bulletin + Calendar ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", alignItems: "start" }}>
        <div className="ov-bulletin" style={{ gridColumn: "span 2" }}>
          <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${BORDER}`, background: LIGHT_GRAY, display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", height: "48px", minHeight: "48px", maxHeight: "48px", boxSizing: "border-box" }}>
              <div style={{ minWidth: 0, overflow: "hidden" }}>
                <div style={{ fontSize: "13px", fontWeight: 800, color: DARK_GREEN, whiteSpace: "nowrap" }}>Campus Bulletin</div>
                <div style={{ fontSize: "10px", color: GRAY, marginTop: "1px", whiteSpace: "nowrap" }}>Latest Announcements</div>
              </div>
              {announcements.length > 0 && (
                <span className="ov-badge" style={{ fontSize: "10px", fontWeight: 700, background: DARK_GREEN, color: WHITE, borderRadius: "20px", padding: "2px 8px", flexShrink: 0 }}>
                  {announcements.length}
                </span>
              )}
            </div>
            <div style={{ height: "350px", minHeight: "350px", maxHeight: "350px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px", padding: "10px", boxSizing: "border-box" }}>
              {loading ? (
                <div style={{ color: GRAY, textAlign: "center", padding: "30px 0", fontSize: "12px" }}>Loading bulletins...</div>
              ) : announcements.length === 0 ? (
                <div style={{ color: GRAY, padding: "24px", border: `1px dashed ${BORDER}`, borderRadius: "10px", textAlign: "center", fontSize: "12px" }}>
                  <div style={{ fontSize: "28px", marginBottom: "8px" }}>📌</div>
                  Post a warm welcome message here!
                </div>
              ) : (
                announcements.map((note, ni) => {
                  const isDeleting = deletingId === note.id;
                  const dateStr    = note.posted_date ? note.posted_date.substring(0, 10) : "";
                  return (
                    <div key={note.id} className="ov-note-card" style={{
                      background: WHITE, border: `1px solid ${BORDER}`, borderRadius: "10px",
                      overflow: "hidden", boxShadow: "0 1px 2px rgba(0,0,0,0.04)", flexShrink: 0,
                      display: "flex", flexDirection: "row", height: "150px",
                      
                    }}>
                      {note.image && (
                        <div style={{ width: "45%", flexShrink: 0, background: "#F9FAFB", borderRight: `1px solid ${BORDER}`, overflow: "hidden" }}>
                          <img src={note.image} alt="Announcement" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", padding: "6px 12px", background: "#f2f9e8", borderBottom: `1px solid ${BORDER}`, flexWrap: "nowrap" }}>
                          <span style={{ fontSize: "10px", fontWeight: 700, color: GREEN, textTransform: "uppercase", letterSpacing: "0.3px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "65%" }}>{note.department || "General"}</span>
                          <span style={{ fontSize: "10px", color: GRAY, whiteSpace: "nowrap", flexShrink: 0 }}>📅 {dateStr}</span>
                        </div>
                        <div style={{ padding: "8px 12px 0 12px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "6px" }}>
                          <h4 style={{ margin: 0, fontSize: "12px", fontWeight: 800, color: "#111827", lineHeight: 1.3 }}>{note.title}</h4>
                          {isAdmin && (
                            <button disabled={isDeleting} onClick={() => handleDeleteNotice(note.id)}
                              style={{ flexShrink: 0, padding: "2px 6px", background: "none", border: "none", cursor: isDeleting ? "not-allowed" : "pointer", color: "#DC2626", fontSize: "14px", lineHeight: 1, borderRadius: "4px", opacity: isDeleting ? 0.4 : 1 }}
                              title="Delete announcement">🗑</button>
                          )}
                        </div>
                        {note.body && (
                          <div style={{ padding: "6px 12px 10px", fontSize: "11px", color: GRAY, lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                            {note.body}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* ── Calendar ── */}
        <div className="ov-calendar">
          <MiniCalendar />
        </div>
      </div>

      {/* ── Enrollment Stats + Quick Actions ── */}
      <div className="ov-stats" style={{ marginTop: "16px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", alignItems: "stretch" }}>
        <div style={{ gridColumn: "span 2" }}>
          <EnrollmentStats user={user} />
        </div>
        <div>
          <QuickActions user={user} />
        </div>
      </div>

      {/* ── Faculty Teaching Load + Attendance Statistics — admins, college admin & registrar ── */}
      {["administrator", "college_administrator", "registrar"].includes(String(user?.role || "").toLowerCase()) && (
        <div style={{ marginTop: "16px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", alignItems: "stretch" }}>
          <div style={{ gridColumn: "span 2" }}>
            <FacultyLoad />
          </div>
          <div>
            <AttendanceStats />
          </div>
        </div>
      )}
    </div>
  );
}
