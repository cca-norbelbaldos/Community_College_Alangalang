import { useEffect, useState, useRef } from "react";
import * as XLSX from "xlsx";

const GOLD       = "#F5A800";
const GREEN      = "#2E7D32";
const DARK_GREEN = "#1B5E20";
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

// ── Check if an assignment's sched string covers today ──────────────────────
// Handles: MWF, TTh, TT, Mon, Tue, Monday, Tuesday, full names, etc.
function isScheduledToday(sched) {
  if (!sched) return false;
  const s   = sched.toLowerCase();
  const day = new Date().getDay(); // 0=Sun,1=Mon,2=Tue,3=Wed,4=Thu,5=Fri,6=Sat

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

// Extract time portion from sched string (everything after the day abbreviation)
function extractTime(sched) {
  if (!sched) return null;
  const match = sched.match(/(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?)\s*[-–]\s*(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?)/i);
  if (match) return `${match[1].trim()} – ${match[2].trim()}`;
  // fallback: grab anything after the day part
  const fallback = sched.replace(/^[A-Za-z/,\-\s]+/, "").trim();
  return fallback || null;
}

// ── Mini Calendar ────────────────────────────────────────────────────────────
function MiniCalendar() {
  const today = new Date();
  const [current, setCurrent] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [eventDates, setEventDates] = useState(new Set()); // "YYYY-MM-DD" strings

  // Fetch announcements and collect event_date values — polls every 30s so
  // newly posted events appear on the calendar without a page refresh.
  useEffect(() => {
    const fetchEvents = () => {
      fetch(`${import.meta.env.VITE_API_URL}/api/erd/announcements`)
        .then(r => r.ok ? r.json() : [])
        .then(data => {
          const dates = new Set();
          if (Array.isArray(data)) {
            data.forEach(a => {
              if (!a.event_date) return;
              // Server sends DATE_FORMAT(event_date,'%Y-%m-%d') so it's always
              // a plain "YYYY-MM-DD" string — no Date parsing, no timezone shift.
              const raw = String(a.event_date).substring(0, 10);
              if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) dates.add(raw);
            });
          }
          setEventDates(dates);
        })
        .catch(() => {});
    };
    fetchEvents();
    const iv = setInterval(fetchEvents, 30000); // re-check every 30 s
    return () => clearInterval(iv);
  }, []);

  const firstDay    = new Date(current.year, current.month, 1).getDay();
  const daysInMonth = new Date(current.year, current.month + 1, 0).getDate();

  const prevMonth = () => setCurrent(c => ({
    year:  c.month === 0 ? c.year - 1 : c.year,
    month: c.month === 0 ? 11 : c.month - 1,
  }));
  const nextMonth = () => setCurrent(c => ({
    year:  c.month === 11 ? c.year + 1 : c.year,
    month: c.month === 11 ? 0 : c.month + 1,
  }));

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const isToday = (d) =>
    d === today.getDate() &&
    current.month === today.getMonth() &&
    current.year  === today.getFullYear();

  const isEventDay = (d) => {
    if (!d) return false;
    const mm = String(current.month + 1).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    return eventDates.has(`${current.year}-${mm}-${dd}`);
  };

  return (
    <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: "12px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
      {/* Card header */}
      <div style={{ padding: "12px 16px", borderBottom: `1px solid ${BORDER}`, background: LIGHT_GRAY, display: "flex", alignItems: "center", justifyContent: "space-between", height: "48px", minHeight: "48px", maxHeight: "48px", boxSizing: "border-box" }}>
        <div style={{ minWidth: 0, overflow: "hidden" }}>
          <div style={{ fontSize: "13px", fontWeight: 800, color: DARK_GREEN, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>📅 School Calendar</div>
          <div style={{ fontSize: "10px", color: GRAY, marginTop: "1px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{MONTHS[today.getMonth()]} {today.getFullYear()}</div>
        </div>
      </div>
      <div style={{ padding: "14px", height: "350px", minHeight: "350px", maxHeight: "350px", boxSizing: "border-box", overflowY: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
        <button onClick={prevMonth} style={{ border: "none", background: "none", cursor: "pointer", fontSize: "15px", color: GRAY, padding: "2px 5px" }}>‹</button>
        <span style={{ fontWeight: 800, fontSize: "13px", color: DARK_GREEN }}>{MONTHS[current.month]} {current.year}</span>
        <button onClick={nextMonth} style={{ border: "none", background: "none", cursor: "pointer", fontSize: "15px", color: GRAY, padding: "2px 5px" }}>›</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: "1px", marginBottom: "3px" }}>
        {DAYS.map(d => (
          <div key={d} style={{ textAlign: "center", fontSize: "9px", fontWeight: 700, color: GRAY, padding: "2px 0" }}>{d}</div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: "1px" }}>
        {cells.map((d, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "center", padding: "2px 0" }}>
            <span
              title={isEventDay(d) ? "Event scheduled" : undefined}
              style={{
                width: "26px", height: "26px", flexShrink: 0, boxSizing: "border-box",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "11px", borderRadius: "50%",
                background: isToday(d) ? DARK_GREEN : isEventDay(d) ? "#1E88E5" : "transparent",
                color: isToday(d) ? WHITE : isEventDay(d) ? WHITE : d ? "#111827" : "transparent",
                fontWeight: (isToday(d) || isEventDay(d)) ? 800 : 400,
                cursor: isEventDay(d) ? "pointer" : "default",
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
      </div>{/* end padding wrapper */}
    </div>
  );
}

// ── Teaching Lessons panel ───────────────────────────────────────────────────
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
    { bg: "#EEF2FF", color: "#4F46E5" },
    { bg: "#FFF7ED", color: "#C2410C" },
    { bg: "#F0FDF4", color: "#166534" },
    { bg: "#FFF1F2", color: "#BE123C" },
    { bg: "#F0F9FF", color: "#0369A1" },
  ];

  return (
    <div style={{ background: WHITE, borderTop: `1px solid ${BORDER}`, borderRight: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`, borderLeft: `4px solid ${GREEN}`, borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", overflow: "hidden" }}>
      {/* Card header */}
      <div style={{ padding: "12px 16px", borderBottom: `1px solid ${BORDER}`, background: LIGHT_GRAY, display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", height: "48px", minHeight: "48px", maxHeight: "48px", boxSizing: "border-box" }}>
        <div style={{ minWidth: 0, overflow: "hidden" }}>
          <div style={{ fontSize: "13px", fontWeight: 800, color: DARK_GREEN, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>📖 Teaching Lessons</div>
          <div style={{ fontSize: "10px", color: GRAY, marginTop: "1px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{dayName}'s Teaching Load</div>
        </div>
        <span style={{ fontSize: "10px", fontWeight: 700, background: DARK_GREEN, color: WHITE, borderRadius: "20px", padding: "2px 8px", flexShrink: 0, whiteSpace: "nowrap" }}>
          {todayList.length} class{todayList.length !== 1 ? "es" : ""}
        </span>
      </div>

      {/* Body */}
      <div style={{ height: "350px", minHeight: "350px", maxHeight: "350px", overflowY: "auto", boxSizing: "border-box" }}>
        {loading ? (
          <div style={{ padding: "30px", textAlign: "center", color: GRAY, fontSize: "12px" }}>Loading schedule...</div>
        ) : (
          <>
            {/* Class rows */}
            {todayList.length === 0 ? (
              <div style={{ padding: "30px", textAlign: "center", color: GRAY, fontSize: "12px" }}>
                <div style={{ fontSize: "28px", marginBottom: "8px" }}>🎉</div>
                No classes scheduled for today.
              </div>
            ) : (
              todayList.map((a, i) => {
                const sc   = subjectColors[i % subjectColors.length];
                const time = extractTime(a.sched);
                return (
                  <div key={a.id || i} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 16px 10px 28px", borderBottom: `1px solid ${BORDER}` }}
                    onMouseEnter={e => e.currentTarget.style.background = LIGHT_GRAY}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    {/* Icon */}
                    <div style={{ width: 32, height: 32, borderRadius: "8px", flexShrink: 0, background: sc.bg, color: sc.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px" }}>📘</div>

                    {/* Time */}
                    <div style={{ flexShrink: 0, minWidth: "72px" }}>
                      <div style={{ fontSize: "9px", color: GRAY, fontWeight: 600 }}>Start from</div>
                      <div style={{ fontSize: "11px", fontWeight: 700, color: "#111827" }}>{time || "—"}</div>
                    </div>

                    {/* Subject */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "12px", fontWeight: 800, color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.subject_title || "—"}</div>
                      <div style={{ display: "flex", gap: "6px", marginTop: "2px" }}>
                        {a.section && <span style={{ fontSize: "10px", color: GRAY }}>📋 {a.section}</span>}
                        {a.room    && <span style={{ fontSize: "10px", color: GRAY }}>🚪 {a.room}</span>}
                        {a.units   && <span style={{ fontSize: "10px", color: GRAY }}>⏱ {a.units} units</span>}
                      </div>
                    </div>

                    {/* Year level */}
                    {a.year_level && (
                      <span style={{ flexShrink: 0, fontSize: "10px", fontWeight: 700, background: sc.bg, color: sc.color, padding: "2px 8px", borderRadius: "20px", whiteSpace: "nowrap" }}>
                        {a.year_level}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── All Faculty Schedule panel (admin view) ──────────────────────────────────
function AllFacultySchedule() {
  const [rows, setRows]       = useState([]); // [{ faculty, todayClasses }]
  const [loading, setLoading] = useState(true);

  const today   = new Date();
  const dayName = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][today.getDay()];

  useEffect(() => {
    const BASE = import.meta.env.VITE_API_URL;
    fetch(`${BASE}/api/erd/users`)
      .then(r => r.ok ? r.json() : [])
      .then(async (users) => {
        const faculty = (Array.isArray(users) ? users : []).filter(u => {
          const roleArr = Array.isArray(u.roles)
            ? u.roles.map(r => (r || "").toLowerCase())
            : [(u.role || "").toLowerCase()];
          return roleArr.some(r => r === "faculty");
        });

        const results = await Promise.all(
          faculty.map(f =>
            fetch(`${BASE}/api/erd/faculty/assignments/${f.id}`)
              .then(r => r.ok ? r.json() : [])
              .then(data => ({
                faculty: f,
                todayClasses: (Array.isArray(data) ? data : []).filter(a => isScheduledToday(a.sched)),
              }))
              .catch(() => ({ faculty: f, todayClasses: [] }))
          )
        );
        setRows(results);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const subjectColors = [
    { bg: "#EEF2FF", color: "#4F46E5" },
    { bg: "#FFF7ED", color: "#C2410C" },
    { bg: "#F0FDF4", color: "#166534" },
    { bg: "#FFF1F2", color: "#BE123C" },
    { bg: "#F0F9FF", color: "#0369A1" },
  ];

  const getInitial = (f) =>
    ((f.first_name || f.firstName || f.username || "?").charAt(0)).toUpperCase();

  const getName = (f) => {
    const fn = f.first_name || f.firstName || "";
    const ln = f.last_name  || f.lastName  || "";
    return [fn, ln].filter(Boolean).join(" ").toUpperCase() || f.username || "Unknown";
  };

  const totalClasses = rows.reduce((s, r) => s + r.todayClasses.length, 0);

  return (
    <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "12px 16px", borderBottom: `1px solid ${BORDER}`, background: LIGHT_GRAY, display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", height: "48px", minHeight: "48px", maxHeight: "48px", boxSizing: "border-box" }}>
        <div style={{ minWidth: 0, overflow: "hidden" }}>
          <div style={{ fontSize: "13px", fontWeight: 800, color: DARK_GREEN, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>👩‍🏫 Faculty Schedule</div>
          <div style={{ fontSize: "10px", color: GRAY, marginTop: "1px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{dayName}'s Teaching Load</div>
        </div>
        <span style={{ fontSize: "10px", fontWeight: 700, background: DARK_GREEN, color: WHITE, borderRadius: "20px", padding: "2px 8px", flexShrink: 0, whiteSpace: "nowrap" }}>
          {totalClasses} class{totalClasses !== 1 ? "es" : ""}
        </span>
      </div>

      {/* Body */}
      <div style={{ height: "350px", minHeight: "350px", maxHeight: "350px", overflowY: "auto", boxSizing: "border-box" }}>
        {loading ? (
          <div style={{ padding: "30px", textAlign: "center", color: GRAY, fontSize: "12px" }}>Loading faculty schedule...</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: "30px", textAlign: "center", color: GRAY, fontSize: "12px" }}>No faculty found.</div>
        ) : (
          rows.map(({ faculty: f, todayClasses }, fi) => (
            <div key={f.id || fi} style={{ borderBottom: `1px solid ${BORDER}` }}>
              {/* Teacher name row */}
              <div style={{
                display: "flex", alignItems: "center", gap: "10px",
                padding: "10px 16px", background: "#FAFAFA",
              }}>
                {/* Avatar */}
                {(f.profile_picture || f.profilePicture) ? (
                  <img src={f.profile_picture || f.profilePicture} alt={getName(f)}
                    style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", border: `2px solid ${BORDER}`, flexShrink: 0 }} />
                ) : (
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                    background: "#E8F5E9", color: DARK_GREEN,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "13px", fontWeight: 800, border: `2px solid #A5D6A7`
                  }}>{getInitial(f)}</div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "12px", fontWeight: 800, color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {getName(f)}
                  </div>
                  <div style={{ fontSize: "10px", color: GRAY }}>
                    {todayClasses.length > 0
                      ? `${todayClasses.length} class${todayClasses.length !== 1 ? "es" : ""} today`
                      : "No classes today"}
                  </div>
                </div>
                {todayClasses.length > 0 && (
                  <span style={{ fontSize: "10px", fontWeight: 700, background: "#DCFCE7", color: GREEN, padding: "2px 7px", borderRadius: "20px" }}>
                    Active
                  </span>
                )}
              </div>

              {/* That teacher's classes today */}
              {todayClasses.map((a, i) => {
                const sc   = subjectColors[i % subjectColors.length];
                const time = extractTime(a.sched);
                return (
                  <div key={a.id || i} style={{
                    display: "flex", alignItems: "center", gap: "10px",
                    padding: "8px 16px 8px 28px",
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = LIGHT_GRAY}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    {/* Icon */}
                    <div style={{
                      width: 28, height: 28, borderRadius: "8px", flexShrink: 0,
                      background: sc.bg, color: sc.color,
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px"
                    }}>📘</div>

                    {/* Time */}
                    <div style={{ flexShrink: 0, minWidth: "65px" }}>
                      <div style={{ fontSize: "9px", color: GRAY, fontWeight: 600 }}>Start from</div>
                      <div style={{ fontSize: "10px", fontWeight: 700, color: "#111827" }}>{time || "—"}</div>
                    </div>

                    {/* Subject */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "11px", fontWeight: 700, color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {a.subject_title || "—"}
                      </div>
                      <div style={{ display: "flex", gap: "5px", marginTop: "2px" }}>
                        {a.section && <span style={{ fontSize: "9px", color: GRAY }}>📋 {a.section}</span>}
                        {a.room    && <span style={{ fontSize: "9px", color: GRAY }}>🚪 {a.room}</span>}
                      </div>
                    </div>

                    {/* Year level */}
                    {a.year_level && (
                      <span style={{ flexShrink: 0, fontSize: "9px", fontWeight: 700, background: sc.bg, color: sc.color, padding: "2px 6px", borderRadius: "20px", whiteSpace: "nowrap" }}>
                        {a.year_level}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}


// ── Enrollment Statistics panel — top summary numbers (Total / Male /
// Female), a grouped bar chart of Male vs Female counts per Year Level, and
// a donut chart showing the overall Male/Female split with a legend.
function LineChart({ data, max, maleColor, femaleColor, unspecColor }) {
  const [tooltip, setTooltip] = useState(null);
  const svgRef = useRef(null);
  const W = 560, H = 68, PAD = { top: 8, right: 12, bottom: 18, left: 6 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const n = data.length;
  if (n === 0) return null;

  const yMax  = max > 0 ? max : 1;
  const yTicks = 2;
  const step  = Math.ceil(yMax / yTicks) || 1;
  const yTop  = step * yTicks;

  const xPos = i => PAD.left + (n > 1 ? (i / (n - 1)) * innerW : innerW / 2);
  const yPos = v => PAD.top  + innerH - Math.min(v / yTop, 1) * innerH;
  const base  = PAD.top + innerH;

  const areaPoly = (key) => {
    const pts = data.map((d, i) => `${xPos(i)},${yPos(d[key] || 0)}`);
    return [...pts, `${xPos(n-1)},${base}`, `${xPos(0)},${base}`].join(" ");
  };

  const mPts = data.map((d, i) => `${xPos(i)},${yPos(d.male)}`).join(" ");
  const fPts = data.map((d, i) => `${xPos(i)},${yPos(d.female)}`).join(" ");
  const uPts = data.map((d, i) => `${xPos(i)},${yPos(d.unspecified || 0)}`).join(" ");


  return (
    <div style={{ position: "relative" }}>
      <svg ref={svgRef} width="100%" viewBox={`0 0 ${W} ${H}`}
        style={{ overflow: "visible", display: "block", maxHeight: "72px" }}
        onMouseLeave={() => setTooltip(null)}>

        {/* grid lines */}
        {Array.from({ length: yTicks + 1 }, (_, i) => (
          <line key={i} x1={PAD.left} y1={yPos(i * step)} x2={W - PAD.right} y2={yPos(i * step)}
            stroke="#E5E7EB" strokeWidth="1" strokeDasharray={i === 0 ? "0" : "3 3"} />
        ))}

        {/* Unspecified area + line */}
        <polygon points={areaPoly("unspecified")} fill={unspecColor} opacity="0.08" />
        <polyline points={uPts} fill="none" stroke={unspecColor} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />

        {/* Female area + line */}
        <polygon points={areaPoly("female")} fill={femaleColor} opacity="0.10" />
        <polyline points={fPts} fill="none" stroke={femaleColor} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />

        {/* Male area + line */}
        <polygon points={areaPoly("male")} fill={maleColor} opacity="0.12" />
        <polyline points={mPts} fill="none" stroke={maleColor} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />

        {/* Wide transparent hit strips + circles per data point */}
        {data.map((d, i) => {
          const stripW = n > 1 ? innerW / (n - 1) : innerW;
          const stripX = i === 0 ? xPos(0) : xPos(i) - stripW / 2;
          return (
            <g key={i} onMouseEnter={() => setTooltip({ i, d })} style={{ cursor: "crosshair" }}>
              <rect x={stripX} y={PAD.top} width={i === 0 || i === n-1 ? stripW / 2 : stripW}
                height={innerH} fill="transparent" style={{ pointerEvents: "all" }} />
              <circle cx={xPos(i)} cy={yPos(d.male)} r="4" fill={maleColor} stroke="#fff" strokeWidth="1.5" />
              <circle cx={xPos(i)} cy={yPos(d.female)} r="4" fill={femaleColor} stroke="#fff" strokeWidth="1.5" />
              <circle cx={xPos(i)} cy={yPos(d.unspecified||0)} r="4" fill={unspecColor} stroke="#fff" strokeWidth="1.5" />
            </g>
          );
        })}

        {/* X labels */}
        {data.map((d, i) => (
          <text key={i} x={xPos(i)} y={H - 3} textAnchor="middle" fontSize="8" fontWeight="700" fill="#9CA3AF">{d.label}</text>
        ))}
        <line x1={PAD.left} y1={base} x2={W - PAD.right} y2={base} stroke="#E5E7EB" strokeWidth="1" />
      </svg>

      {/* Tooltip — clamped so it never overflows left or right edge */}
      {tooltip && (() => {
        const pct = n > 1 ? (tooltip.i / (n - 1)) * 100 : 50;
        // anchor left edge so tooltip stays inside container
        const anchorStyle = pct < 25
          ? { left: "4px", transform: "none" }
          : pct > 75
          ? { right: "4px", left: "auto", transform: "none" }
          : { left: `${pct}%`, transform: "translateX(-50%)" };
        return (
          <div style={{
            position: "absolute", bottom: "20px",
            ...anchorStyle,
            background: "#1F2937", borderRadius: "6px", padding: "4px 8px",
            fontSize: "9px", lineHeight: "1.7", whiteSpace: "nowrap", color: "#F9FAFB",
            pointerEvents: "none", zIndex: 10,
            boxShadow: "0 2px 8px rgba(0,0,0,0.18)"
          }}>
            <div style={{ fontWeight: 700, color: "#E5E7EB", marginBottom: "1px" }}>{tooltip.d.label}</div>
            <div>
              <span style={{ color: maleColor }}>●</span> {tooltip.d.male}&nbsp;&nbsp;
              <span style={{ color: femaleColor }}>●</span> {tooltip.d.female}&nbsp;&nbsp;
              <span style={{ color: unspecColor }}>●</span> {tooltip.d.unspecified||0}
            </div>
          </div>
        );
      })()}
    </div>
  );
}


function DonutChart({ total, male, female, maleColor, femaleColor }) {
  const size = 120, stroke = 14, r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const maleLen   = total > 0 ? (male / total) * c : 0;
  const femaleLen = total > 0 ? (female / total) * c : 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F3F4F6" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={maleColor} strokeWidth={stroke}
        strokeDasharray={`${maleLen} ${c}`} strokeDashoffset={0} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: "stroke-dasharray 0.5s ease" }} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={femaleColor} strokeWidth={stroke}
        strokeDasharray={`${femaleLen} ${c}`} strokeDashoffset={-maleLen} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: "stroke-dasharray 0.5s ease" }} />
      <text x="50%" y="46%" textAnchor="middle" fontSize="10" fontWeight="700" fill={GRAY} letterSpacing="0.5">TOTAL</text>
      <text x="50%" y="64%" textAnchor="middle" fontSize="24" fontWeight="900" fill="#111827">{total}</text>
    </svg>
  );
}

const YEAR_LEVELS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
const SEMESTERS   = ["1st Semester", "2nd Semester"];

function EnrollmentStats({ user }) {
  const isAdmin = user?.role === "administrator";
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [schoolYearFilter, setSchoolYearFilter] = useState("");
  const [yearLevelFilter,  setYearLevelFilter]  = useState("");
  const [semesterFilter,   setSemesterFilter]   = useState("");

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/erd/enrollments`)
      .then(r => r.ok ? r.json() : [])
      .then(data => { setEnrollments(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Distinct school years, newest first
  const availableYears = Array.from(new Set(enrollments.map(e => String(e.year_enrolled)).filter(Boolean))).sort((a,b) => b-a);

  // Apply filters
  const scoped = enrollments.filter(e => {
    if (schoolYearFilter && String(e.year_enrolled) !== schoolYearFilter) return false;
    if (yearLevelFilter  && e.year_level !== yearLevelFilter)             return false;
    if (semesterFilter   && e.semester   !== semesterFilter)              return false;
    return true;
  });

  const total  = scoped.length;
  const isMale   = e => (e.gender || "").toLowerCase() === "male";
  const isFemale = e => (e.gender || "").toLowerCase() === "female";
  const maleCount        = scoped.filter(isMale).length;
  const femaleCount      = scoped.filter(isFemale).length;
  const unspecifiedCount = total - maleCount - femaleCount;

  const MALE_COLOR   = "#3B82F6";
  const FEMALE_COLOR = "#EC4899";
  const UNSPEC_COLOR = "#EF4444";

  // Chart: group by year level (always), showing counts per level
  const byYearLevel = YEAR_LEVELS.map(lvl => {
    const rows = scoped.filter(e => e.year_level === lvl);
    return {
      label: lvl.replace(" Year", ""),  // "1st", "2nd", etc. to keep labels short
      male:        rows.filter(isMale).length,
      female:      rows.filter(isFemale).length,
      unspecified: rows.filter(e => !isMale(e) && !isFemale(e)).length,
    };
  });
  const maxGroupCount = Math.max(1, ...byYearLevel.map(r => r.male + r.female + r.unspecified));

  // Per-semester breakdown for the selected school year + year level
  const semBreakdown = SEMESTERS.map(sem => {
    const rows = scoped.filter(e => e.semester === sem);
    return { sem, count: rows.length, male: rows.filter(isMale).length, female: rows.filter(isFemale).length };
  });

  const downloadXlsxReport = () => {
    const filterDesc = [
      schoolYearFilter ? `School Year: ${schoolYearFilter}` : "All School Years",
      yearLevelFilter  ? `Year Level: ${yearLevelFilter}`   : "All Year Levels",
      semesterFilter   ? `Semester: ${semesterFilter}`      : "All Semesters",
    ].join(" | ");

    const rows = [
      ["CCA Enrollment Statistics Report"],
      ["Generated At", new Date().toLocaleString()],
      ["Filter", filterDesc],
      [],
      ["SUMMARY"],
      ["Total Enrolled", total],
      ["Male", maleCount],
      ["Female", femaleCount],
      ["Unspecified", unspecifiedCount],
      [],
      ["BY YEAR LEVEL"],
      ["Year Level", "Total", "Male", "Female"],
      ...byYearLevel.map(r => [r.label + " Year", r.male + r.female + r.unspecified, r.male, r.female]),
      [],
      ["BY SEMESTER"],
      ["Semester", "Total", "Male", "Female"],
      ...semBreakdown.map(r => [r.sem, r.count, r.male, r.female]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [{ wch: 22 }, { wch: 12 }, { wch: 10 }, { wch: 10 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Enrollment Stats");
    XLSX.writeFile(wb, `enrollment-stats.xlsx`);
  };

  const selectStyle = { padding: "5px 8px", border: `1px solid ${BORDER}`, borderRadius: "6px", fontSize: "11px", background: WHITE, color: "#111827", cursor: "pointer" };

  return (
    <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "10px 14px", borderBottom: `1px solid ${BORDER}`, background: LIGHT_GRAY, display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", flexWrap: "wrap", flexShrink: 0 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: "13px", fontWeight: 800, color: DARK_GREEN }}>📊 Enrollment Statistics</div>
          <div style={{ fontSize: "10px", color: GRAY, marginTop: "1px" }}>Students by year level and semester</div>
        </div>
        {isAdmin && (
          <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap", flexShrink: 0 }}>
            <select value={schoolYearFilter} onChange={e => setSchoolYearFilter(e.target.value)} style={selectStyle}>
              <option value="">All School Years</option>
              {availableYears.map(y => <option key={y} value={y}>{y}–{parseInt(y)+1}</option>)}
            </select>
            <select value={yearLevelFilter} onChange={e => setYearLevelFilter(e.target.value)} style={selectStyle}>
              <option value="">All Year Levels</option>
              {YEAR_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <select value={semesterFilter} onChange={e => setSemesterFilter(e.target.value)} style={selectStyle}>
              <option value="">All Semesters</option>
              {SEMESTERS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button type="button" onClick={downloadXlsxReport}
              style={{ padding: "5px 10px", border: "none", borderRadius: "6px", fontSize: "11px", fontWeight: 700, background: DARK_GREEN, color: WHITE, cursor: "pointer", whiteSpace: "nowrap" }}>
              📊 Generate XLSX
            </button>
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: "10px 14px", boxSizing: "border-box", flex: 1, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "20px", textAlign: "center", color: GRAY, fontSize: "12px" }}>Loading enrollment data...</div>
        ) : total === 0 ? (
          <div style={{ padding: "20px", textAlign: "center", color: GRAY, fontSize: "12px" }}>No enrollment records match the selected filters.</div>
        ) : (
          <>
            {/* Summary row */}
            <div style={{ display: "flex", gap: "16px", marginBottom: "8px", flexWrap: "wrap" }}>
              {[["Total", total, "#111827"], ["Male", maleCount, MALE_COLOR], ["Female", femaleCount, FEMALE_COLOR], ["Unspecified", unspecifiedCount, UNSPEC_COLOR]].map(([lbl, val, col]) => (
                <div key={lbl}>
                  <div style={{ fontSize: "8px", color: GRAY, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>{lbl}</div>
                  <div style={{ fontSize: "15px", fontWeight: 900, color: col }}>{val}</div>
                </div>
              ))}
              {/* Semester pill breakdown */}
              <div style={{ marginLeft: "auto", display: "flex", gap: "6px", alignItems: "center" }}>
                {semBreakdown.map(r => (
                  <div key={r.sem} style={{ padding: "3px 10px", borderRadius: "10px", background: LIGHT_GRAY, border: `1px solid ${BORDER}`, fontSize: "10px", fontWeight: 700, color: DARK_GREEN, whiteSpace: "nowrap" }}>
                    {r.sem}: <span style={{ color: "#111827" }}>{r.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Chart + Donut */}
            <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: "16px", alignItems: "center" }}>
              <div>
                {/* Line chart by year level */}
                <LineChart
                  data={byYearLevel}
                  max={maxGroupCount}
                  maleColor={MALE_COLOR}
                  femaleColor={FEMALE_COLOR}
                  unspecColor={UNSPEC_COLOR}
                />
                <div style={{ display: "flex", gap: "10px", marginTop: "6px", fontSize: "9px", color: "#374151", flexWrap: "wrap" }}>
                  <span><span style={{ display: "inline-block", width: 9, height: 9, borderRadius: "50%", background: MALE_COLOR, marginRight: 4 }} />Male</span>
                  <span><span style={{ display: "inline-block", width: 9, height: 9, borderRadius: "50%", background: FEMALE_COLOR, marginRight: 4 }} />Female</span>
                  <span><span style={{ display: "inline-block", width: 9, height: 9, borderRadius: "50%", background: UNSPEC_COLOR, marginRight: 4 }} />Unspecified</span>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                <DonutChart total={total} male={maleCount} female={femaleCount} maleColor={MALE_COLOR} femaleColor={FEMALE_COLOR} />
                <div style={{ display: "flex", gap: "8px", fontSize: "9px", color: "#374151" }}>
                  <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: MALE_COLOR, marginRight: 4 }} />Male ({maleCount})</span>
                  <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: FEMALE_COLOR, marginRight: 4 }} />Female ({femaleCount})</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main Overview ────────────────────────────────────────────────────────────
export default function Overview({ user }) {
  const [loading, setLoading]             = useState(true);
  const [announcements, setAnnouncements] = useState([]);
  const [deletingId, setDeletingId]       = useState(null);

  const isAdmin = user?.role === "administrator";

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/erd/announcements`)
      .then(r => r.ok ? r.json() : [])
      .then(data => { setAnnouncements(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleDeleteNotice = async (id) => {
    if (!window.confirm("Delete this announcement permanently?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/erd/announcements/${id}`, { method: "DELETE" });
      if (res.ok) { setAnnouncements(prev => prev.filter(item => item.id !== id)); window.dispatchEvent(new CustomEvent('announcement-deleted')); }
      else alert("Failed to delete announcement.");
    } catch (err) { console.error(err); }
    finally { setDeletingId(null); }
  };

  const isFaculty = user?.role === "faculty";

  return (
    <div style={{ fontFamily: "system-ui", minWidth: 0 }}>
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gap: "16px",
        alignItems: "start",
      }}>

        {/* ── BULLETIN ── */}
        <div>
          {/* Card wrapper */}
          <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", overflow: "hidden" }}>
          {/* Card header — inside the card */}
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${BORDER}`, background: LIGHT_GRAY, display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", height: "48px", minHeight: "48px", maxHeight: "48px", boxSizing: "border-box" }}>
            <div style={{ minWidth: 0, overflow: "hidden" }}>
              <div style={{ fontSize: "13px", fontWeight: 800, color: DARK_GREEN, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>📢 Campus Bulletin</div>
              <div style={{ fontSize: "10px", color: GRAY, marginTop: "1px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Latest Announcements</div>
            </div>
            {announcements.length > 0 && (
              <span style={{ fontSize: "10px", fontWeight: 700, background: DARK_GREEN, color: WHITE, borderRadius: "20px", padding: "2px 8px", flexShrink: 0, whiteSpace: "nowrap" }}>
                {announcements.length}
              </span>
            )}
          </div>
          <div style={{ height: "350px", minHeight: "350px", maxHeight: "350px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px", padding: "10px", boxSizing: "border-box" }}>
            {loading ? (
              <div style={{ color: GRAY, textAlign: "center", padding: "30px 0", fontSize: "12px" }}>Loading bulletins...</div>
            ) : announcements.length === 0 ? (
              <div style={{ color: GRAY, padding: "24px", border: `1px dashed ${BORDER}`, borderRadius: "10px", textAlign: "center", fontSize: "12px" }}>
                No announcements yet.
              </div>
            ) : (
              announcements.map((note) => {
                const isDeleting = deletingId === note.id;
                const dateStr    = note.posted_date ? note.posted_date.substring(0, 10) : "";
                return (
                  <div key={note.id} style={{
                    background: WHITE, border: `1px solid ${BORDER}`, borderRadius: "10px",
                    overflow: "hidden", boxShadow: "0 1px 2px rgba(0,0,0,0.04)", flexShrink: 0
                  }}>
                    {/* Department + date */}
                    <div style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      gap: "8px", padding: "6px 12px", background: "#F0FDF4",
                      borderBottom: `1px solid ${BORDER}`, flexWrap: "nowrap"
                    }}>
                      <span style={{
                        fontSize: "10px", fontWeight: 800, color: GREEN,
                        background: "#DCFCE7", padding: "2px 8px", borderRadius: "20px",
                        textTransform: "uppercase", letterSpacing: "0.3px",
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "65%"
                      }}>🏫 {note.department || "General"}</span>
                      <span style={{ fontSize: "10px", color: GRAY, whiteSpace: "nowrap", flexShrink: 0 }}>📅 {dateStr}</span>
                    </div>

                    {/* Title */}
                    <div style={{ padding: "8px 12px 0 12px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "6px" }}>
                      <h4 style={{ margin: 0, fontSize: "12px", fontWeight: 800, color: "#111827", lineHeight: 1.3 }}>{note.title}</h4>
                      {isAdmin && (
                        <button disabled={isDeleting} onClick={() => handleDeleteNotice(note.id)}
                          style={{ flexShrink: 0, padding: "2px 6px", background: "none", border: "none", cursor: isDeleting ? "not-allowed" : "pointer", color: "#DC2626", fontSize: "14px", lineHeight: 1, borderRadius: "4px", opacity: isDeleting ? 0.4 : 1 }}
                          title="Delete announcement"
                        >🗑</button>
                      )}
                    </div>

                    {/* Body preview */}
                    {note.body && (
                      <div style={{ padding: "6px 12px", fontSize: "11px", color: GRAY, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {note.body}
                      </div>
                    )}

                    {/* Image */}
                    {note.image && (
                      <div style={{ padding: "6px 12px 10px" }}>
                        <img src={note.image} alt="Announcement" style={{ width: "100%", maxHeight: "180px", objectFit: "contain", borderRadius: "6px", border: `1px solid ${BORDER}`, background: "#F9FAFB" }} />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        </div>{/* end bulletin column */}

        {/* ── FACULTY SCHEDULE ── */}
        <AllFacultySchedule />

        {/* ── CALENDAR ── */}
        <div>
          <MiniCalendar />
        </div>
      </div>{/* end 3-col grid */}

      {/* ── Enrollment Statistics (full width, below) ── */}
      <div style={{ marginTop: "16px" }}>
        <EnrollmentStats user={user} />
      </div>
    </div>
  );
}