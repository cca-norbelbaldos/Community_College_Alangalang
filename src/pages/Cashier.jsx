import { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import ccaLogoT from "../assets/cca_logo_t.png";
import phCoatOfArms from "../assets/ph_coat_of_arms_t.png";
import leyteSeal from "../assets/leyte_seal.jpg";
import leyteWatermark from "../assets/leyte_watermark4.png";
import ccaLogo from "../assets/cca_logo.jpg";
import alangalangLogo from "../assets/Alangalang.png";

const API = import.meta.env.VITE_API_URL;
const GREEN = "#3d6e01";
const DARK_GREEN = "#2c4a1e";
const GRAY = "#6B7280";
const BORDER = "#E5E7EB";
const WHITE = "#ffffff";

const emptyItem = () => ({ nature: "", nature_id: "", charge: "", fee: "", discount: "", amount: "" });

const toNum = (v) => parseFloat(String(v == null ? "" : v).replace(/[^0-9.]/g, "")) || 0;
const pesoFmt = (n) => "₱" + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Friendly date picker: Month + Day + Year dropdowns (no native calendar popup).
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
function FriendlyDate({ value, onChange }) {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
  const y = parts ? +parts[1] : "";
  const m = parts ? +parts[2] : "";
  const d = parts ? +parts[3] : "";
  const nowY = new Date().getFullYear();
  const years = Array.from({ length: 9 }, (_, i) => nowY - 5 + i);
  const daysInMonth = (yy, mm) => (yy && mm) ? new Date(yy, mm, 0).getDate() : 31;
  const days = Array.from({ length: daysInMonth(y || nowY, m || 1) }, (_, i) => i + 1);
  const emit = (ny, nm, nd) => {
    if (!ny || !nm || !nd) { onChange(""); return; }
    const dim = daysInMonth(ny, nm);
    if (nd > dim) nd = dim;
    onChange(`${ny}-${String(nm).padStart(2, "0")}-${String(nd).padStart(2, "0")}`);
  };
  const sel = { padding: "6px 8px", border: `1.5px solid ${BORDER}`, borderRadius: 7, fontSize: 12.5, outline: "none", background: WHITE, boxSizing: "border-box" };
  return (
    <div style={{ display: "flex", gap: 6 }}>
      <select value={m || ""} onChange={e => emit(y || nowY, +e.target.value, d || 1)} style={{ ...sel, flex: 2 }}>
        <option value="">Month</option>
        {MONTH_NAMES.map((mn, i) => <option key={mn} value={i + 1}>{mn}</option>)}
      </select>
      <select value={d || ""} onChange={e => emit(y || nowY, m || 1, +e.target.value)} style={{ ...sel, flex: 1 }}>
        <option value="">Day</option>
        {days.map(dd => <option key={dd} value={dd}>{dd}</option>)}
      </select>
      <select value={y || ""} onChange={e => emit(+e.target.value, m || 1, d || 1)} style={{ ...sel, flex: 1.3 }}>
        <option value="">Year</option>
        {years.map(yy => <option key={yy} value={yy}>{yy}</option>)}
      </select>
    </div>
  );
}

// Custom clickable calendar (no native year-scroll popup).
function CalendarPicker({ value, onChange, placeholder = "Select date…" }) {
  const [open, setOpen] = useState(false);
  const parsed = value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(value + "T00:00:00") : null;
  const [view, setView] = useState(() => parsed || new Date());
  const MN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const nowY = new Date().getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => nowY - 6 + i);
  const y = view.getFullYear(), m = view.getMonth();
  const firstDow = new Date(y, m, 1).getDay();
  const days = new Date(y, m + 1, 0).getDate();
  const fmt = (yy, mm, dd) => `${yy}-${String(mm + 1).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
  const pick = (dd) => { onChange(fmt(y, m, dd)); setOpen(false); };
  const label = parsed ? parsed.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "";
  const cell = { width: 30, height: 28, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, borderRadius: 6, cursor: "pointer" };
  const inp = { padding: "8px 11px", border: `1.5px solid ${BORDER}`, borderRadius: 7, fontSize: 12.5, outline: "none", background: WHITE, cursor: "pointer", minWidth: 150, textAlign: "left" };
  return (
    <div style={{ position: "relative" }}>
      <button type="button" onClick={() => setOpen(o => !o)} style={{ ...inp, display: "flex", alignItems: "center", gap: 8, color: label ? "#1f2937" : GRAY }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        {label || placeholder}
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
          <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 41, background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 10, boxShadow: "0 10px 30px rgba(0,0,0,.16)", padding: 10, width: 244 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <button type="button" onClick={() => setView(new Date(y, m - 1, 1))} style={{ padding: 4, border: `1px solid ${BORDER}`, background: WHITE, borderRadius: 6, cursor: "pointer" }}>‹</button>
              <select value={m} onChange={e => setView(new Date(y, +e.target.value, 1))} style={{ flex: 1, padding: "5px 6px", border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 12, cursor: "pointer" }}>
                {MN.map((mn, i) => <option key={mn} value={i}>{mn}</option>)}
              </select>
              <select value={y} onChange={e => setView(new Date(+e.target.value, m, 1))} style={{ width: 74, padding: "5px 6px", border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 12, cursor: "pointer" }}>
                {years.map(yy => <option key={yy} value={yy}>{yy}</option>)}
              </select>
              <button type="button" onClick={() => setView(new Date(y, m + 1, 1))} style={{ padding: 4, border: `1px solid ${BORDER}`, background: WHITE, borderRadius: 6, cursor: "pointer" }}>›</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
              {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <div key={i} style={{ ...cell, fontWeight: 800, color: GRAY, cursor: "default" }}>{d}</div>)}
              {Array.from({ length: firstDow }).map((_, i) => <div key={`e${i}`} style={cell} />)}
              {Array.from({ length: days }, (_, i) => i + 1).map(dd => {
                const sel = parsed && parsed.getFullYear() === y && parsed.getMonth() === m && parsed.getDate() === dd;
                return <div key={dd} onClick={() => pick(dd)} style={{ ...cell, background: sel ? GREEN : "transparent", color: sel ? WHITE : "#1f2937", fontWeight: sel ? 800 : 500 }}
                  onMouseEnter={e => { if (!sel) e.currentTarget.style.background = "#EAF3DC"; }}
                  onMouseLeave={e => { if (!sel) e.currentTarget.style.background = "transparent"; }}>{dd}</div>;
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const CASH_YEARS = [{ y: 1, label: "1st Year" }, { y: 2, label: "2nd Year" }, { y: 3, label: "3rd Year" }, { y: 4, label: "4th Year" }];
// Current year for payment tracking: driven by the ACTUAL enrollment record.
// A student with no enrollment yet is treated as an incoming 1st year (so the
// cashier can take their 1st-year payment before the registrar enrolls them).
const yearNum = (s) => { const raw = s && s.enrolled_year_level; if (!raw) return 1; const m = String(raw).match(/(\d+)/); return m ? parseInt(m[1], 10) : 1; };
// A year/sem cell unlocks once the student has reached that year (2nd sem of the
// current year unlocks only when they've enrolled for the 2nd semester).
// Only the student's CURRENT enrolled year unlocks (2nd sem only once they've
// enrolled for the 2nd semester). Past/future years stay locked, but any saved
// payment for them is preserved in the database.
const cellUnlocked = (s, y, sem) => { const yl = yearNum(s); if (!yl || y !== yl) return false; return sem === 1 ? true : !!s.enrolled_2nd_sem; };
// Payment status helpers. paidMap key = `${studentId}-${year}-${sem}` -> {box1, box2}.
const cellVal = (paidMap, sid, y, sem) => paidMap[`${sid}-${y}-${sem}`] || { box1: false, box2: false };
const semStatus = (v) => (v.box1 && v.box2) ? "full" : (v.box1 || v.box2) ? "partial" : "none";
const yearFullyPaid = (paidMap, sid, y) => { const a = cellVal(paidMap, sid, y, 1), b = cellVal(paidMap, sid, y, 2); return a.box1 && a.box2 && b.box1 && b.box2; };

// ─── CASHIER DASHBOARD ───────────────────────────────────────────────────────
export function CashierDashboard() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [paid, setPaid] = useState({});
  const [lessItems, setLessItems] = useState([]);
  const [fCourse, setFCourse] = useState("");
  const [fYear, setFYear] = useState("");
  const [fSection, setFSection] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const load = () => {
      fetch(`${API}/api/erd/cashier/collections?t=${Date.now()}`, { cache: "no-store" })
        .then(r => r.ok ? r.json() : []).then(d => setRows(Array.isArray(d) ? d : []))
        .catch(() => setRows([])).finally(() => setLoading(false));
      fetch(`${API}/api/erd/cashier/payments?t=${Date.now()}`, { cache: "no-store" })
        .then(r => r.ok ? r.json() : []).then(d => {
          const m = {}; (Array.isArray(d) ? d : []).forEach(p => { m[`${p.student_id}-${p.year_level}-${p.semester}`] = { box1: !!p.box1, box2: !!p.box2 }; });
          setPaid(m);
        }).catch(() => {});
    };
    load();
    fetch(`${API}/api/erd/students?t=${Date.now()}`, { cache: "no-store" })
      .then(r => r.ok ? r.json() : []).then(d => setStudents(Array.isArray(d) ? d : [])).catch(() => {});
    fetch(`${API}/api/erd/cashier/less?t=${Date.now()}`, { cache: "no-store" })
      .then(r => r.ok ? r.json() : []).then(d => setLessItems(Array.isArray(d) ? d : [])).catch(() => {});
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, []);

  const parseItems = (it) => { try { return typeof it === "string" ? JSON.parse(it || "[]") : (Array.isArray(it) ? it : []); } catch { return []; } };
  // A recorded Form 51 receipt means that term is at least Partially Paid, even
  // if no box was ticked in Payment Tracking. Match receipts to a student by name.
  const _nrm = (s) => String(s || "").replace(/\s+/g, " ").trim().toLowerCase();
  const _dig = (v) => { const m = String(v || "").match(/(\d)/); return m ? +m[1] : 0; };
  const _nameMatch = (payer, s) => {
    const pt = _nrm(payer).split(" ").filter(Boolean);
    if (!pt.length) return false;
    const f = _nrm(s.first_name), l = _nrm(s.last_name);
    return (!f || pt.includes(f)) && (!l || pt.includes(l)) && (f || l);
  };
  const hasReceiptFor = (s, y, sem) => rows.some(r => _nameMatch(r.payer_name, s) && (_dig(r.pay_year) || _dig(r.year_level)) === y && (_dig(r.pay_sem) || 1) === sem);
  const todayStr = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; })();
  const thisMonth = todayStr.slice(0, 7);
  const dateOf = (r) => String(r.or_date || r.date_posted || (r.created_at ? String(r.created_at).slice(0, 10) : "")).slice(0, 10);

  const totalCollected = rows.reduce((s, r) => s + toNum(r.total), 0);
  const receiptCount = rows.length;
  const todayTotal = rows.filter(r => dateOf(r) === todayStr).reduce((s, r) => s + toNum(r.total), 0);
  const monthTotal = rows.filter(r => dateOf(r).slice(0, 7) === thisMonth).reduce((s, r) => s + toNum(r.total), 0);
  // Per-deduction (Less) usage: how many DISTINCT students availed each one.
  const _nrmL = (s) => String(s || "").replace(/\s+/g, " ").trim().toLowerCase();
  const parseLess = (l) => { try { return typeof l === "string" ? JSON.parse(l || "[]") : (Array.isArray(l) ? l : []); } catch { return []; } };
  const availCount = (lessName) => {
    const set = new Set();
    rows.forEach(r => { if (parseLess(r.less).some(x => _nrmL(x.name) === _nrmL(lessName))) set.add(_nrmL(r.payer_name)); });
    return set.size;
  };

  // Aggregate by nature of collection (from line items).
  const byNature = (() => {
    const m = new Map();
    rows.forEach(r => parseItems(r.items).forEach(it => {
      const key = (it.nature || "Unspecified").trim() || "Unspecified";
      m.set(key, (m.get(key) || 0) + toNum(it.amount));
    }));
    return [...m.entries()].map(([nature, amount]) => ({ nature, amount })).sort((a, b) => b.amount - a.amount);
  })();
  const natureMax = Math.max(1, ...byNature.map(n => n.amount));

  // Aggregate by collector.
  const byCollector = (() => {
    const m = new Map();
    rows.forEach(r => { const k = (r.collector || "—").trim() || "—"; m.set(k, (m.get(k) || 0) + toNum(r.total)); });
    return [...m.entries()].map(([collector, amount]) => ({ collector, amount })).sort((a, b) => b.amount - a.amount).slice(0, 6);
  })();

  const recent = rows.slice(0, 8);

  // Payment-tracking filter options + filtered rows.
  const uniq = (vals) => [...new Set(vals.filter(Boolean).map(v => String(v).trim()))].sort();
  const courseOpts = uniq(students.map(s => s.course));
  const yearOpts = uniq(students.map(s => s.year_level));
  const sectionOpts = uniq(students.map(s => s.section));
  const filteredStudents = students.filter(s => {
    if (fCourse && String(s.course || "").trim() !== fCourse) return false;
    if (fYear && String(s.year_level || "").trim() !== fYear) return false;
    if (fSection && String(s.section || "").trim() !== fSection) return false;
    if (search.trim()) {
      const name = [s.first_name, s.middle_name, s.last_name].filter(Boolean).join(" ");
      const hay = `${s.student_number || ""} ${name}`.toLowerCase();
      if (!hay.includes(search.trim().toLowerCase())) return false;
    }
    return true;
  });

  const card = { background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 18 };
  const fInp = { padding: "6px 9px", border: `1.5px solid ${BORDER}`, borderRadius: 7, fontSize: 12, outline: "none", background: WHITE };
  const dashMatHead = { padding: "6px 8px", fontSize: 10.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.3, textAlign: "center", border: `1px solid ${BORDER}` };
  const dashMatCell = { padding: "6px 8px", textAlign: "center", border: `1px solid ${BORDER}`, color: "#374151" };
  const metricCards = [
    { label: "Total Collected", value: pesoFmt(totalCollected), accent: GREEN },
    { label: "Receipts Issued", value: receiptCount.toLocaleString(), accent: "#2563EB" },
    { label: "Collected Today", value: pesoFmt(todayTotal), accent: "#D97706" },
    { label: "This Month", value: pesoFmt(monthTotal), accent: "#7C3AED" },
    // One box per Less deduction — number of students who availed it.
    ...lessItems.map(l => {
      const n = availCount(l.name);
      return {
        label: `${l.name} (max ${pesoFmt(l.amount)}${l.municipality ? ` · ${l.municipality}` : ""})`,
        value: `${n} student${n === 1 ? "" : "s"}`,
        accent: "#B45309",
      };
    }),
  ];

  return (
    <div style={{ fontFamily: "system-ui,-apple-system,sans-serif" }}>
      <div style={{ background: GREEN, color: WHITE, padding: "16px", borderRadius: 10, fontSize: 22, fontWeight: 900, letterSpacing: 0.8, marginBottom: 16, textAlign: "center" }}>
        CASHIER DASHBOARD
      </div>

      {/* Metric cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 16 }}>
        {metricCards.map(m => (
          <div key={m.label} style={{ ...card, borderLeft: `5px solid ${m.accent}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: GRAY, textTransform: "uppercase", letterSpacing: 0.4 }}>{m.label}</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: DARK_GREEN, marginTop: 6 }}>{loading ? "…" : m.value}</div>
          </div>
        ))}
      </div>

      {/* Payment Tracking — view-only status (Pending / Paid); locked until enrolled */}
      <div style={{ ...card, marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: DARK_GREEN }}>Payment Tracking</h3>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <select value={fCourse} onChange={e => setFCourse(e.target.value)} style={fInp}>
              <option value="">All Courses</option>
              {courseOpts.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={fYear} onChange={e => setFYear(e.target.value)} style={fInp}>
              <option value="">All Years</option>
              {yearOpts.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select value={fSection} onChange={e => setFSection(e.target.value)} style={fInp}>
              <option value="">All Sections</option>
              {sectionOpts.map(sec => <option key={sec} value={sec}>{sec}</option>)}
            </select>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search ID or name…" style={{ ...fInp, minWidth: 180 }} />
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 780 }}>
            <thead>
              <tr style={{ background: "#F3F7EE", color: DARK_GREEN }}>
                <th rowSpan={2} style={{ ...dashMatHead, minWidth: 110 }}>Student ID #</th>
                <th rowSpan={2} style={{ ...dashMatHead, minWidth: 190 }}>Full Name</th>
                <th rowSpan={2} style={{ ...dashMatHead, minWidth: 110 }}>Block/Section</th>
                {CASH_YEARS.map(yr => <th key={yr.y} colSpan={2} style={dashMatHead}>{yr.label}</th>)}
              </tr>
              <tr style={{ background: "#F3F7EE", color: DARK_GREEN }}>
                {CASH_YEARS.map(yr => [
                  <th key={`${yr.y}-1`} style={{ ...dashMatHead, minWidth: 60 }}>1st</th>,
                  <th key={`${yr.y}-2`} style={{ ...dashMatHead, minWidth: 60 }}>2nd</th>,
                ])}
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr><td colSpan={11} style={{ padding: 14, color: GRAY }}>No students found.</td></tr>
              ) : filteredStudents.map(s => {
                const name = [s.first_name, s.middle_name, s.last_name].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
                return (
                  <tr key={s.id} style={{ borderTop: `1px solid ${BORDER}` }}>
                    <td style={{ ...dashMatCell, fontWeight: 700 }}>{s.student_number || "—"}</td>
                    <td style={{ ...dashMatCell, textAlign: "left" }}>{name || "—"}</td>
                    <td style={dashMatCell}>{s.section || "—"}</td>
                    {CASH_YEARS.map(yr => [1, 2].map(sem => {
                      const unlocked = cellUnlocked(s, yr.y, sem);
                      const bx = cellVal(paid, s.id, yr.y, sem);
                      // Merge the box map with actual receipts: a receipt ⇒ at least Partially Paid.
                      const st = semStatus({ box1: bx.box1 || hasReceiptFor(s, yr.y, sem), box2: bx.box2 });
                      const label = !unlocked ? "—" : st === "full" ? "Fully Paid" : st === "partial" ? "Partially Paid" : "Unpaid";
                      const col = !unlocked ? "#C4C4C4" : st === "full" ? "#15803D" : st === "partial" ? "#B45309" : "#DC2626";
                      const bg = !unlocked ? "transparent" : st === "full" ? "#DCFCE7" : st === "partial" ? "#FEF3C7" : "#FEE2E2";
                      return (
                        <td key={`${yr.y}-${sem}`} style={dashMatCell}>
                          <span style={{ display: "inline-block", padding: unlocked ? "2px 8px" : 0, borderRadius: 20, fontSize: 10, fontWeight: 800, color: col, background: bg, whiteSpace: "nowrap" }}>{label}</span>
                        </td>
                      );
                    }))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Reusable "manage a simple named list" card for Cashier Settings.
function SettingsListCard({ title, subtitle, endpoint, placeholder, deleteLabel, dual = false, perms = {} }) {
  const { canEdit = true, canDelete = true } = perms;
  const [itemsList, setItemsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const load = () => {
    setLoading(true);
    fetch(`${API}/api/erd/cashier/${endpoint}?t=${Date.now()}`, { cache: "no-store" })
      .then(r => r.ok ? r.json() : [])
      .then(d => setItemsList(Array.isArray(d) ? d : []))
      .catch(() => setItemsList([]))
      .finally(() => setLoading(false));
  };
  useEffect(load, [endpoint]);

  const add = async () => {
    const value = dual ? [code.trim(), name.trim()].filter(Boolean).join(" — ") : name.trim();
    if (!name.trim()) return;
    setSaving(true); setMsg(null);
    try {
      const res = await fetch(`${API}/api/erd/cashier/${endpoint}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: value }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message || ""); }
      setCode(""); setName(""); load();
    } catch (e) { setMsg(e.message || "Failed to add. Is the backend running?"); }
    finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!window.confirm(`Delete this ${deleteLabel || "item"}?`)) return;
    try {
      const res = await fetch(`${API}/api/erd/cashier/${endpoint}/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setItemsList(xs => xs.filter(x => x.id !== id));
    } catch { alert("Failed to delete. Is the backend running?"); }
  };

  const inputStyle = { width: "100%", padding: "9px 11px", border: `1.5px solid ${BORDER}`, borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box" };

  return (
    <div style={{ flex: "1 1 380px", minWidth: 300, maxWidth: 560 }}>
      <div style={{ marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: DARK_GREEN }}>{title}</h2>
        <p style={{ margin: "4px 0 0", fontSize: 12, color: GRAY }}>{subtitle}</p>
      </div>
      <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 18 }}>
        {canEdit && (
        <div style={{ display: "flex", gap: 10 }}>
          {dual && <input value={code} onChange={e => setCode(e.target.value)} onKeyDown={e => { if (e.key === "Enter") add(); }} placeholder="Code" style={{ ...inputStyle, maxWidth: 90, flexShrink: 0 }} />}
          <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") add(); }} placeholder={dual ? "Name" : placeholder} style={inputStyle} />
          <button onClick={add} disabled={saving} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 18px", background: `linear-gradient(135deg, ${DARK_GREEN}, ${GREEN})`, color: WHITE, border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: saving ? "default" : "pointer", whiteSpace: "nowrap", opacity: saving ? 0.7 : 1 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Add
          </button>
        </div>
        )}
        {msg && <div style={{ marginTop: 10, fontSize: 12.5, fontWeight: 600, color: "#DC2626" }}>{msg}</div>}
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
          {loading ? (
            <div style={{ fontSize: 12.5, color: GRAY }}>Loading…</div>
          ) : itemsList.length === 0 ? (
            <div style={{ fontSize: 12.5, color: GRAY }}>Nothing yet. Add one above.</div>
          ) : itemsList.map(it => (
            <div key={it.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 12px", border: `1px solid ${BORDER}`, borderRadius: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#1f2937" }}>{it.name}</span>
              {canDelete && (
              <button onClick={() => remove(it.id)} title="Delete" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: 6, background: "#FEE2E2", color: "#B91C1C", border: "1px solid #FCA5A5", borderRadius: 6, cursor: "pointer" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
              </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Sub-items that belong to a specific Charge.
function SubChargeList({ chargeId, perms = {} }) {
  const { canEdit = true, canDelete = true } = perms;
  const [subs, setSubs] = useState([]);
  const [name, setName] = useState("");
  const load = () => { fetch(`${API}/api/erd/cashier/charges/${chargeId}/subitems?t=${Date.now()}`, { cache: "no-store" })
    .then(r => r.ok ? r.json() : []).then(d => setSubs(Array.isArray(d) ? d : [])).catch(() => setSubs([])); };
  useEffect(() => { load(); }, [chargeId]);
  const add = async () => {
    if (!name.trim()) return;
    try { const res = await fetch(`${API}/api/erd/cashier/charges/${chargeId}/subitems`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim() }) }); if (res.ok) { setName(""); load(); } } catch {}
  };
  const remove = async (id) => {
    try { const res = await fetch(`${API}/api/erd/cashier/subitems/${id}`, { method: "DELETE" }); if (res.ok) setSubs(s => s.filter(x => x.id !== id)); } catch {}
  };
  const inp = { flex: 1, padding: "6px 9px", border: `1.5px solid ${BORDER}`, borderRadius: 6, fontSize: 12, outline: "none", boxSizing: "border-box" };
  return (
    <div style={{ margin: "6px 0 2px 14px", padding: "8px 10px", borderLeft: `3px solid #9bbf5a`, background: "#FBFEF5", borderRadius: "0 6px 6px 0" }}>
      {canEdit && (
      <div style={{ display: "flex", gap: 6 }}>
        <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") add(); }} placeholder="Add sub-item…" style={inp} />
        <button onClick={add} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 4, padding: "6px 10px", background: `linear-gradient(135deg, ${DARK_GREEN}, ${GREEN})`, color: WHITE, border: "none", borderRadius: 6, fontSize: 11.5, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Add
        </button>
      </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 6 }}>
        {subs.length === 0 ? (
          <div style={{ fontSize: 11.5, color: GRAY }}>No sub-items yet.</div>
        ) : subs.map(s => (
          <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 9px", background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 5 }}>
            <span style={{ fontSize: 12, color: "#374151" }}>{s.name}</span>
            {canDelete && (
            <button onClick={() => remove(s.id)} title="Delete" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: 4, background: "#FEE2E2", color: "#B91C1C", border: "1px solid #FCA5A5", borderRadius: 5, cursor: "pointer" }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /></svg>
            </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const peso2 = (n) => "₱" + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Charges under a specific Nature + Year + Semester term.
function TermCharges({ natureId, term, perms = {} }) {
  const { canEdit = true, canDelete = true } = perms;
  const [charges, setCharges] = useState([]);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [editId, setEditId] = useState(null);
  const [editAmt, setEditAmt] = useState("");
  const load = () => fetch(`${API}/api/erd/cashier/natures/${natureId}/charges?year_level=${encodeURIComponent(term.year_level)}&semester=${encodeURIComponent(term.semester)}&t=${Date.now()}`, { cache: "no-store" })
    .then(r => r.ok ? r.json() : []).then(d => setCharges(Array.isArray(d) ? d : [])).catch(() => setCharges([]));
  useEffect(() => { load(); }, [natureId, term.id]);
  const saveEdit = async (id) => {
    try { const res = await fetch(`${API}/api/erd/cashier/charges/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount: editAmt.trim() }) }); if (res.ok) { setEditId(null); load(); } } catch {}
  };
  const add = async () => {
    if (!name.trim()) return;
    try { const res = await fetch(`${API}/api/erd/cashier/natures/${natureId}/charges`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim(), amount: amount.trim(), year_level: term.year_level, semester: term.semester }) }); if (res.ok) { setName(""); setAmount(""); load(); } } catch {}
  };
  const remove = async (id) => {
    try { const res = await fetch(`${API}/api/erd/cashier/charges/${id}`, { method: "DELETE" }); if (res.ok) setCharges(c => c.filter(x => x.id !== id)); } catch {}
  };
  const inp = { flex: 1, padding: "6px 9px", border: `1.5px solid ${BORDER}`, borderRadius: 6, fontSize: 12, outline: "none", boxSizing: "border-box" };
  return (
    <div style={{ margin: "6px 0 2px 14px", padding: "8px 10px", borderLeft: `3px solid #9bbf5a`, background: "#FBFEF5", borderRadius: "0 6px 6px 0" }}>
      {canEdit && (
        <div style={{ display: "flex", gap: 6 }}>
          <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") add(); }} placeholder="Charge name…" style={inp} />
          <input value={amount} onChange={e => setAmount(e.target.value)} onKeyDown={e => { if (e.key === "Enter") add(); }} placeholder="Amount" inputMode="decimal" style={{ ...inp, flex: "0 0 100px", textAlign: "right" }} />
          <button onClick={add} style={{ padding: "6px 12px", background: `linear-gradient(135deg, ${DARK_GREEN}, ${GREEN})`, color: WHITE, border: "none", borderRadius: 6, fontSize: 11.5, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>Add</button>
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 6 }}>
        {charges.length === 0 ? (
          <div style={{ fontSize: 11.5, color: GRAY }}>No charges yet.</div>
        ) : charges.map(c => (
          <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 9px", background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 5 }}>
            <span style={{ fontSize: 12, color: "#374151", flex: 1 }}>{c.name}</span>
            {editId === c.id ? (
              <>
                <input value={editAmt} onChange={e => setEditAmt(e.target.value)} onKeyDown={e => { if (e.key === "Enter") saveEdit(c.id); }} inputMode="decimal" style={{ width: 90, padding: "4px 7px", border: `1.5px solid ${GREEN}`, borderRadius: 5, fontSize: 12, textAlign: "right", outline: "none" }} autoFocus />
                <button onClick={() => saveEdit(c.id)} title="Save" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: 4, background: DARK_GREEN, color: WHITE, border: "none", borderRadius: 5, cursor: "pointer" }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                </button>
                <button onClick={() => setEditId(null)} title="Cancel" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: 4, background: WHITE, color: GRAY, border: `1px solid ${BORDER}`, borderRadius: 5, cursor: "pointer" }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              </>
            ) : (
              <>
                <span style={{ fontSize: 12, fontWeight: 700, color: DARK_GREEN, whiteSpace: "nowrap" }}>{c.amount != null && c.amount !== "" ? peso2(c.amount) : "—"}</span>
                {canEdit && (
                <button onClick={() => { setEditId(c.id); setEditAmt(c.amount != null && c.amount !== "" ? String(c.amount) : ""); }} title="Edit amount" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: 4, background: "#EAF3DC", color: DARK_GREEN, border: "1px solid #B8D68A", borderRadius: 5, cursor: "pointer" }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z" /></svg>
                </button>
                )}
                {canDelete && (
                <button onClick={() => remove(c.id)} title="Delete" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: 4, background: "#FEE2E2", color: "#B91C1C", border: "1px solid #FCA5A5", borderRadius: 5, cursor: "pointer" }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /></svg>
                </button>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Year/Semester terms under a Nature; each term expands to its charges.
function ChargeList({ natureId, perms = {} }) {
  const { canEdit = true, canDelete = true } = perms;
  const [terms, setTerms] = useState([]);
  const [yl, setYl] = useState("");
  const [sem, setSem] = useState("");
  const [openId, setOpenId] = useState(null);
  const load = () => fetch(`${API}/api/erd/cashier/natures/${natureId}/terms?t=${Date.now()}`, { cache: "no-store" })
    .then(r => r.ok ? r.json() : []).then(d => setTerms(Array.isArray(d) ? d : [])).catch(() => setTerms([]));
  useEffect(() => { load(); }, [natureId]);
  const add = async () => {
    if (!yl || !sem) return;
    try { const res = await fetch(`${API}/api/erd/cashier/natures/${natureId}/terms`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ year_level: yl, semester: sem }) }); if (res.ok) { setYl(""); setSem(""); load(); } } catch {}
  };
  const remove = async (id) => {
    if (!window.confirm("Delete this year & semester (and its charges stay listed under the nature)?")) return;
    try { const res = await fetch(`${API}/api/erd/cashier/terms/${id}`, { method: "DELETE" }); if (res.ok) setTerms(t => t.filter(x => x.id !== id)); } catch {}
  };
  const sel = { padding: "7px 10px", border: `1.5px solid ${BORDER}`, borderRadius: 7, fontSize: 12.5, outline: "none", background: WHITE };
  return (
    <div style={{ marginTop: 8, marginLeft: 6, padding: "10px 12px", borderLeft: `3px solid ${GREEN}`, background: "#F9FBF4", borderRadius: "0 8px 8px 0" }}>
      <div style={{ fontSize: 10.5, fontWeight: 800, color: DARK_GREEN, textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 8 }}>Year & Semester</div>
      {canEdit && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <select value={yl} onChange={e => setYl(e.target.value)} style={{ ...sel, flex: 1 }}>
            <option value="">Year…</option>
            {["1st Year", "2nd Year", "3rd Year", "4th Year"].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={sem} onChange={e => setSem(e.target.value)} style={{ ...sel, flex: 1 }}>
            <option value="">Semester…</option>
            {["1st Semester", "2nd Semester"].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={add} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 12px", background: `linear-gradient(135deg, ${DARK_GREEN}, ${GREEN})`, color: WHITE, border: "none", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Add
          </button>
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
        {terms.length === 0 ? (
          <div style={{ fontSize: 12, color: GRAY }}>No year/semester yet. Add one above.</div>
        ) : terms.map(t => {
          const open = openId === t.id;
          return (
            <div key={t.id}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px", background: open ? "#F3F7EE" : WHITE, border: `1px solid ${BORDER}`, borderRadius: 6 }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: "#1f2937" }}>{t.year_level} — {t.semester}</span>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => setOpenId(open ? null : t.id)} title="View / add charges" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: 5, background: open ? DARK_GREEN : "#e9f0dd", color: open ? WHITE : DARK_GREEN, border: `1px solid ${GREEN}`, borderRadius: 5, cursor: "pointer" }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }}><polyline points="6 9 12 15 18 9" /></svg>
                  </button>
                  {canDelete && (
                  <button onClick={() => remove(t.id)} title="Delete" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: 5, background: "#FEE2E2", color: "#B91C1C", border: "1px solid #FCA5A5", borderRadius: 5, cursor: "pointer" }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /></svg>
                  </button>
                  )}
                </div>
              </div>
              {open && <TermCharges natureId={natureId} term={t} perms={perms} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Nature-of-Collection card — each nature can expand to manage its charges.
function NatureCard({ perms = {} }) {
  const { canEdit = true, canDelete = true } = perms;
  const [natures, setNatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [msg, setMsg] = useState(null);

  const load = () => {
    setLoading(true);
    fetch(`${API}/api/erd/cashier/natures?t=${Date.now()}`, { cache: "no-store" })
      .then(r => r.ok ? r.json() : []).then(d => setNatures(Array.isArray(d) ? d : []))
      .catch(() => setNatures([])).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const add = async () => {
    if (!name.trim()) return;
    setMsg(null);
    try {
      const res = await fetch(`${API}/api/erd/cashier/natures`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim() }) });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message || ""); }
      setName(""); load();
    } catch (e) { setMsg(e.message || "Failed to add."); }
  };
  const remove = async (id) => {
    if (!window.confirm("Delete this nature of collection?")) return;
    try { const res = await fetch(`${API}/api/erd/cashier/natures/${id}`, { method: "DELETE" }); if (res.ok) setNatures(xs => xs.filter(x => x.id !== id)); } catch {}
  };
  const inputStyle = { width: "100%", padding: "9px 11px", border: `1.5px solid ${BORDER}`, borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box" };

  return (
    <div style={{ flex: "1 1 380px", minWidth: 300, maxWidth: 560 }}>
      <div style={{ marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: DARK_GREEN }}>Nature of Collection</h2>
        <p style={{ margin: "4px 0 0", fontSize: 12, color: GRAY }}>Click the dropdown on a nature to add the charges under it.</p>
      </div>
      <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 18 }}>
        {canEdit && (
        <div style={{ display: "flex", gap: 10 }}>
          <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") add(); }} placeholder="Add a nature (e.g. School Fees)…" style={inputStyle} />
          <button onClick={add} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 18px", background: `linear-gradient(135deg, ${DARK_GREEN}, ${GREEN})`, color: WHITE, border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Add
          </button>
        </div>
        )}
        {msg && <div style={{ marginTop: 10, fontSize: 12.5, fontWeight: 600, color: "#DC2626" }}>{msg}</div>}
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
          {loading ? (
            <div style={{ fontSize: 12.5, color: GRAY }}>Loading…</div>
          ) : natures.length === 0 ? (
            <div style={{ fontSize: 12.5, color: GRAY }}>Nothing yet. Add one above.</div>
          ) : natures.map(it => {
            const open = expandedId === it.id;
            return (
              <div key={it.id}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 12px", border: `1px solid ${BORDER}`, borderRadius: 8, background: open ? "#F3F7EE" : WHITE }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#1f2937" }}>{it.name}</span>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => setExpandedId(open ? null : it.id)} title="View / add charges" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: 6, background: open ? DARK_GREEN : "#e9f0dd", color: open ? WHITE : DARK_GREEN, border: `1px solid ${GREEN}`, borderRadius: 6, cursor: "pointer" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }}><polyline points="6 9 12 15 18 9" /></svg>
                    </button>
                    {canDelete && (
                    <button onClick={() => remove(it.id)} title="Delete" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: 6, background: "#FEE2E2", color: "#B91C1C", border: "1px solid #FCA5A5", borderRadius: 6, cursor: "pointer" }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
                    </button>
                    )}
                  </div>
                </div>
                {open && <ChargeList natureId={it.id} perms={perms} />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// "Less" — deductions/discounts (name, amount, municipality).
function LessCard({ perms = {} }) {
  const { canEdit = true, canDelete = true } = perms;
  const [items, setItems] = useState([]);
  const [munis, setMunis] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [municipality, setMunicipality] = useState("");
  const [scope, setScope] = useState("resident"); // "resident" | "all"
  const [editId, setEditId] = useState(null); // id being edited, or null when adding
  const load = () => fetch(`${API}/api/erd/cashier/less?t=${Date.now()}`, { cache: "no-store" })
    .then(r => r.ok ? r.json() : []).then(d => setItems(Array.isArray(d) ? d : [])).catch(() => setItems([]));
  useEffect(() => {
    load();
    fetch(`${API}/api/erd/students?t=${Date.now()}`, { cache: "no-store" })
      .then(r => r.ok ? r.json() : []).then(d => {
        // Dedupe case-insensitively; display as Title Case.
        const map = new Map();
        (Array.isArray(d) ? d : []).forEach(s => {
          const raw = String(s.municipality || "").trim();
          if (!raw) return;
          const key = raw.toLowerCase();
          if (!map.has(key)) map.set(key, raw.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()));
        });
        setMunis([...map.values()].sort());
      }).catch(() => {});
  }, []);
  const resetForm = () => { setName(""); setAmount(""); setMunicipality(""); setScope("resident"); setEditId(null); setShowForm(false); };
  const startEdit = (it) => {
    setEditId(it.id);
    setName(it.name || "");
    setAmount(it.amount != null ? String(it.amount) : "");
    setMunicipality(it.municipality || "");
    setScope(it.scope === "all" ? "all" : "resident");
    setShowForm(true);
  };
  const add = async () => {
    if (!name.trim()) return;
    const url = editId ? `${API}/api/erd/cashier/less/${editId}` : `${API}/api/erd/cashier/less`;
    const method = editId ? "PUT" : "POST";
    try {
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim(), amount: String(amount).trim(), municipality, scope }) });
      if (res.ok) { resetForm(); load(); }
    } catch {}
  };
  const remove = async (id) => {
    if (!window.confirm("Delete this item?")) return;
    try { const res = await fetch(`${API}/api/erd/cashier/less/${id}`, { method: "DELETE" }); if (res.ok) setItems(xs => xs.filter(x => x.id !== id)); } catch {}
  };
  const peso = (n) => "₱" + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const inputStyle = { width: "100%", padding: "9px 11px", border: `1.5px solid ${BORDER}`, borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box" };

  return (
    <div style={{ flex: "1 1 380px", minWidth: 300, maxWidth: 560 }}>
      <div style={{ marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: DARK_GREEN }}>Less</h2>
        <p style={{ margin: "4px 0 0", fontSize: 12, color: GRAY }}>Deductions/discounts by municipality.</p>
      </div>
      <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 18 }}>
        {canEdit && !showForm && (
          <button onClick={() => setShowForm(true)} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 18px", background: `linear-gradient(135deg, ${DARK_GREEN}, ${GREEN})`, color: WHITE, border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Add
          </button>
        )}
        {canEdit && showForm && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 12, border: `1px solid ${BORDER}`, borderRadius: 10, background: "#F9FBF4" }}>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Name" style={inputStyle} />
            <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount" inputMode="decimal" style={inputStyle} />
            <select value={municipality} onChange={e => setMunicipality(e.target.value)} style={inputStyle}>
              <option value="">Select municipality…</option>
              {munis.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <select value={scope} onChange={e => setScope(e.target.value)} style={inputStyle}>
              <option value="resident">Only students from this municipality</option>
              <option value="all">Available to all students</option>
            </select>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={add} style={{ flex: 1, padding: "9px", background: `linear-gradient(135deg, ${DARK_GREEN}, ${GREEN})`, color: WHITE, border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{editId ? "Save Changes" : "Add"}</button>
              <button onClick={resetForm} style={{ padding: "9px 16px", background: WHITE, color: GRAY, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        )}
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
          {items.length === 0 ? (
            <div style={{ fontSize: 12.5, color: GRAY }}>Nothing yet.</div>
          ) : items.map(it => (
            <div key={it.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 12px", border: `1px solid ${BORDER}`, borderRadius: 8 }}>
              <span style={{ fontSize: 13 }}>
                <span style={{ fontWeight: 700, color: "#1f2937" }}>{it.name}</span>
                {it.amount != null && it.amount !== "" ? <span style={{ marginLeft: 8, fontWeight: 700, color: DARK_GREEN }}>{peso(it.amount)}</span> : null}
                {it.municipality ? <span style={{ marginLeft: 8, color: GRAY }}>· {it.municipality}</span> : null}
                <span style={{ marginLeft: 8, fontSize: 10.5, fontWeight: 700, color: it.scope === "all" ? "#166534" : "#B45309", background: it.scope === "all" ? "#DCFCE7" : "#FEF3C7", padding: "1px 7px", borderRadius: 20 }}>{it.scope === "all" ? "All students" : "Residents only"}</span>
              </span>
              <div style={{ display: "flex", gap: 6 }}>
                {canEdit && (
                <button onClick={() => startEdit(it)} title="Edit" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: 6, background: "#EFF6FF", color: "#1D4ED8", border: "1px solid #BFDBFE", borderRadius: 6, cursor: "pointer" }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                </button>
                )}
                {canDelete && (
                <button onClick={() => remove(it.id)} title="Delete" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: 6, background: "#FEE2E2", color: "#B91C1C", border: "1px solid #FCA5A5", borderRadius: 6, cursor: "pointer" }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function CashierSettings({ perms = {} }) {
  return (
    <div style={{ fontFamily: "system-ui,-apple-system,sans-serif", display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
      <SettingsListCard title="Collector" subtitle="Manage the collector options shown in the collection form."
        endpoint="collectors" placeholder="Collector name" deleteLabel="collector" dual perms={perms} />
      <NatureCard perms={perms} />
      <LessCard perms={perms} />
    </div>
  );
}

export function GeneralCollection({ perms = {}, user = {} }) {
  const { canInput = true, canDelete = true } = perms;
  const currentUserName = [user.first_name, user.middle_name, user.last_name].filter(Boolean).join(" ").replace(/\s+/g, " ").trim() || user.username || "";
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

  const [form, setForm] = useState({
    or_number: "", acct_no: "", acct_left: "", acct_right: "", pay_year: "", pay_sem: "", pay_period: "", payment_mode: "", date_posted: today(), or_date: today(),
    collector: "", payer_name: "", address: "",
  });
  const [items, setItems] = useState([emptyItem()]);
  const [image, setImage] = useState(""); // attached picture (base64)

  const onPickImage = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result);
    reader.readAsDataURL(file);
  };

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const setItem = (i, k) => (e) => setItems(list => list.map((it, idx) => idx === i ? { ...it, [k]: e.target.value } : it));
  const addItem = () => setItems(list => {
    // Inherit the nature from the last row so the new row keeps its charge dropdown.
    const last = list[list.length - 1];
    const seed = last && last.nature_id
      ? { nature: last.nature, nature_id: last.nature_id, charge: "", fee: "", discount: "", amount: "" }
      : emptyItem();
    return [...list, seed];
  });

  // Charges per nature (loaded lazily when a nature is selected in a row).
  const [chargesByNature, setChargesByNature] = useState({});
  const loadCharges = (natureId) => {
    if (!natureId || chargesByNature[natureId]) return;
    fetch(`${API}/api/erd/cashier/natures/${natureId}/charges?t=${Date.now()}`, { cache: "no-store" })
      .then(r => r.ok ? r.json() : []).then(d => setChargesByNature(m => ({ ...m, [natureId]: Array.isArray(d) ? d : [] }))).catch(() => {});
  };
  const setNature = (i) => (e) => {
    const name = e.target.value;
    const nat = natures.find(n => n.name === name);
    const nid = nat ? nat.id : "";
    setItems(list => list.map((it, idx) => idx === i ? { ...it, nature: name, nature_id: nid, charge: "" } : it));
    loadCharges(nid);
  };

  const removeItem = (i) => setItems(list => list.length > 1 ? list.filter((_, idx) => idx !== i) : list);
  const peso = (n) => "₱" + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const load = () => {
    setLoading(true);
    fetch(`${API}/api/erd/cashier/collections?t=${Date.now()}`, { cache: "no-store" })
      .then(r => r.ok ? r.json() : [])
      .then(d => setRows(Array.isArray(d) ? d : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  // Options managed in Cashier Settings.
  const [collectors, setCollectors] = useState([]);
  const [natures, setNatures] = useState([]);
  const [students, setStudents] = useState([]);
  const [studentId, setStudentId] = useState("");
  const [lookupMsg, setLookupMsg] = useState(null);
  const [lessItems, setLessItems] = useState([]);
  const [lessSelected, setLessSelected] = useState({}); // id -> true
  const [lessDiscount, setLessDiscount] = useState({}); // id -> typed discount
  const [stuMuni, setStuMuni] = useState("");
  const num = (v) => parseFloat(String(v).replace(/[^0-9.]/g, "")) || 0;
  const _nrm = (s) => String(s || "").replace(/\s+/g, " ").trim().toLowerCase();
  // Deductions already availed by this student for the SAME term (year + semester).
  // Each Less can be availed once per semester, so hide it until a new term.
  const availedLess = new Set();
  rows.forEach(r => {
    if (!form.payer_name || _nrm(r.payer_name) !== _nrm(form.payer_name)) return;
    if (String(r.pay_year || "") !== String(form.pay_year || "") || String(r.pay_sem || "") !== String(form.pay_sem || "")) return;
    let ls = []; try { ls = JSON.parse(r.less || "[]"); } catch { ls = []; }
    (Array.isArray(ls) ? ls : []).forEach(x => availedLess.add(_nrm(x.name)));
  });
  // Less items shown =
  //   scope "all"      → every student;
  //   scope "resident" → only students whose municipality matches the item's;
  //   AND not already availed for this term.
  const visibleLess = lessItems.filter(l => {
    const scopeOk = (l.scope === "all") ? true : (!stuMuni ? true : _nrm(l.municipality) === _nrm(stuMuni));
    if (!scopeOk) return false;
    if (availedLess.has(_nrm(l.name))) return false;
    return true;
  });
  const discountEnabled = visibleLess.some(l => lessSelected[l.id]);
  const lessBudget = visibleLess.filter(l => lessSelected[l.id]).reduce((s, l) => s + num(l.amount), 0);
  // Total discount typed across all rows — must not exceed the combined Less budget.
  const discountSum = discountEnabled ? items.reduce((s, it) => s + num(it.discount), 0) : 0;
  const overBudget = discountEnabled && discountSum > lessBudget;
  // TOTAL = what's actually collected (sum of Amount Paid).
  const total = items.reduce((s, it) => s + num(it.amount), 0);
  // Payment periods already paid for this student's current term — hide them in the dropdown.
  const _n = (s) => String(s || "").replace(/\s+/g, " ").trim().toLowerCase();
  const paidPeriods = new Set();
  rows.forEach(r => { if (_n(r.payer_name) === _n(form.payer_name) && String(r.pay_year || "") === form.pay_year && String(r.pay_sem || "") === form.pay_sem && r.pay_period) paidPeriods.add(r.pay_period); });
  const availablePeriods = ["Enrollment", "Midterm", "Finals"].filter(p => !paidPeriods.has(p));
  useEffect(() => {
    fetch(`${API}/api/erd/cashier/collectors?t=${Date.now()}`, { cache: "no-store" }).then(r => r.ok ? r.json() : []).then(d => setCollectors(Array.isArray(d) ? d : [])).catch(() => {});
    fetch(`${API}/api/erd/cashier/natures?t=${Date.now()}`, { cache: "no-store" }).then(r => r.ok ? r.json() : []).then(d => setNatures(Array.isArray(d) ? d : [])).catch(() => {});
    fetch(`${API}/api/erd/students?t=${Date.now()}`, { cache: "no-store" }).then(r => r.ok ? r.json() : []).then(d => setStudents(Array.isArray(d) ? d : [])).catch(() => {});
    fetch(`${API}/api/erd/cashier/less?t=${Date.now()}`, { cache: "no-store" }).then(r => r.ok ? r.json() : []).then(d => setLessItems(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  // Header nature picker: selecting a nature auto-generates one line-item row for EACH
  // charge configured under that nature in Cashier Settings (ready to enter amounts).
  const [headerNature, setHeaderNature] = useState("");
  const pickNatureFromHeader = async (e) => {
    const name = e.target.value;
    setHeaderNature(name);
    if (!name) return;
    if (!form.pay_year || !form.pay_sem) {
      setHeaderNature("");
      setLookupMsg({ type: "error", text: "Search a student first — fees load for their enrolled year & semester." });
      return;
    }
    const nat = natures.find(n => n.name === name);
    const nid = nat ? nat.id : "";
    if (!nid) return;
    // Fetch the charges for the student's CURRENT enrolled term (year + semester).
    let charges = [];
    try {
      const q = [];
      if (form.pay_year) q.push(`year_level=${encodeURIComponent(form.pay_year)}`);
      if (form.pay_sem) q.push(`semester=${encodeURIComponent(form.pay_sem)}`);
      const res = await fetch(`${API}/api/erd/cashier/natures/${nid}/charges?${q.join("&")}&t=${Date.now()}`, { cache: "no-store" });
      charges = res.ok ? await res.json() : [];
      charges = Array.isArray(charges) ? charges : [];
      setChargesByNature(m => ({ ...m, [nid]: charges }));
    } catch { charges = []; }
    // How much this student already paid per charge for this term (skip fully-paid fees).
    const nrm = (s) => String(s || "").replace(/\s+/g, " ").trim().toLowerCase();
    const myName = nrm(form.payer_name);
    const paidByCharge = {};
    const discByCharge = {};
    rows.forEach(r => {
      if (nrm(r.payer_name) !== myName) return;
      if (String(r.pay_year || "") !== form.pay_year || String(r.pay_sem || "") !== form.pay_sem) return;
      let its = []; try { its = JSON.parse(r.items || "[]"); } catch { its = []; }
      its.forEach(it => {
        const k = nrm(it.charge || it.nature);
        paidByCharge[k] = (paidByCharge[k] || 0) + (parseFloat(String(it.amount).replace(/[^0-9.]/g, "")) || 0);
        discByCharge[k] = (discByCharge[k] || 0) + (parseFloat(String(it.discount).replace(/[^0-9.]/g, "")) || 0);
      });
    });
    // Settled amount for a charge = amount paid + discount already applied.
    const settledOf = (nm) => (paidByCharge[nm] || 0) + (discByCharge[nm] || 0);
    const remaining = charges.filter(c => {
      const fee = parseFloat(String(c.amount).replace(/[^0-9.]/g, "")) || 0;
      if (fee <= 0) return true;                    // no set fee → always show
      return settledOf(nrm(c.name)) < fee - 0.001;  // still has a balance
    });
    // Auto-populate a row for every charge that still has a balance.
    // The FEE column shows the REMAINING balance (full fee − paid − discount).
    const newRows = remaining.length
      ? remaining.map(c => {
          const feeNum = parseFloat(String(c.amount).replace(/[^0-9.]/g, "")) || 0;
          const bal = Math.max(0, feeNum - settledOf(nrm(c.name)));
          return { nature: name, nature_id: nid, charge: c.name, fee: feeNum > 0 ? bal.toFixed(2) : "", discount: "", amount: "" };
        })
      : [{ nature: name, nature_id: nid, charge: "", fee: "", discount: "", amount: "" }];
    setItems(list => {
      // Keep rows already filled in for OTHER natures; drop empties.
      const kept = list.filter(it => String(it.amount).trim() !== "" && it.nature !== name);
      return [...kept, ...newRows];
    });
  };

  const [stuInfo, setStuInfo] = useState({ course: "", year: "", section: "" });
  const [noEnroll, setNoEnroll] = useState(false); // student has no enrollment yet — allow paying first, choose term manually
  const [rCourse, setRCourse] = useState("");
  const [rYear, setRYear] = useState("");
  const [rSection, setRSection] = useState("");
  const lookupStudent = async () => {
    const key = studentId.trim().toLowerCase();
    if (!key) return;
    const s = students.find(x => String(x.student_number || "").toLowerCase() === key);
    if (!s) { setLookupMsg({ type: "error", text: "No student found with that ID." }); setStuInfo({ course: "", year: "", section: "" }); setStuMuni(""); setNoEnroll(false); return; }
    const name = [s.first_name, s.middle_name, s.last_name].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
    const addr = [s.barangay, s.municipality, s.province].filter(Boolean).join(", ");
    // Year/semester must come from the student's ACTUAL enrollment record, not the profile.
    let enrs = [];
    try { const r = await fetch(`${API}/api/erd/enrollments/${s.id}?t=${Date.now()}`, { cache: "no-store" }); enrs = r.ok ? await r.json() : []; } catch { enrs = []; }
    if (!Array.isArray(enrs) || enrs.length === 0) {
      // No enrollment yet — payment can still be collected first. Let the cashier pick the term.
      setNoEnroll(true);
      setForm(f => ({ ...f, payer_name: name, address: addr, pay_year: "", pay_sem: "" }));
      setStuInfo({ course: s.course || "", year: "", section: s.section || "" });
      setStuMuni(s.municipality || "");
      setLookupMsg({ type: "warn", text: `${name} has no enrollment record yet — select the Year & Semester this payment is for (payment before enrollment).` });
      return;
    }
    const dg = (v) => { const m = String(v || "").match(/(\d)/); return m ? +m[1] : 0; };
    const semN = (v) => (/2nd/i.test(v) ? 2 : 1);
    // Most recent enrolled term.
    const latest = [...enrs].sort((a, b) =>
      (Number(a.year_enrolled) || 0) - (Number(b.year_enrolled) || 0) || dg(a.year_level) - dg(b.year_level) || semN(a.semester) - semN(b.semester)
    ).pop();
    const curSem = semN(latest.semester) === 2 ? "2nd Semester" : "1st Semester";
    const curYear = latest.year_level || "";
    setNoEnroll(false);
    setForm(f => ({ ...f, payer_name: name, address: addr, pay_year: curYear, pay_sem: curSem }));
    setStuInfo({ course: s.course || "", year: curYear, section: latest.section || s.section || "" });
    setStuMuni(s.municipality || "");
    setLookupMsg({ type: "success", text: `Loaded: ${name} · ${curYear} ${curSem}` });
  };

  const save = async () => {
    if (!form.payer_name.trim()) { setMsg({ type: "error", text: "Payer name is required." }); return; }
    setSaving(true); setMsg(null);
    try {
      const res = await fetch(`${API}/api/erd/cashier/collections`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, items: items.filter(it => it.nature || it.amount), total: total.toFixed(2), image, course: stuInfo.course, year_level: stuInfo.year, section: stuInfo.section, created_by: currentUserName, less: visibleLess.filter(l => lessSelected[l.id]).map(l => ({ name: l.name, amount: l.amount, municipality: l.municipality })), discount_total: discountSum.toFixed(2) }),
      });
      if (!res.ok) throw new Error();
      setForm({ or_number: "", acct_no: "", acct_left: "", acct_right: "", pay_year: "", pay_sem: "", pay_period: "", payment_mode: "", date_posted: today(), or_date: today(), collector: "", payer_name: "", address: "" });
      setItems([emptyItem()]);
      setHeaderNature("");
      setStuInfo({ course: "", year: "", section: "" });
      setNoEnroll(false);
      setLessSelected({}); setLessDiscount({}); setStuMuni("");
      setStudentId("");
      setImage("");
      setMsg({ type: "success", text: "Cash receipt saved." });
      load();
    } catch { setMsg({ type: "error", text: "Failed to save. Is the backend running?" }); }
    finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this cash receipt entry?")) return;
    try {
      const res = await fetch(`${API}/api/erd/cashier/collections/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setRows(rs => rs.filter(r => r.id !== id));
    } catch { alert("Failed to delete. Is the backend running?"); }
  };

  const inp = { width: "100%", padding: "6px 9px", border: `1.5px solid ${BORDER}`, borderRadius: 7, fontSize: 12.5, outline: "none", boxSizing: "border-box" };
  const lbl = { fontSize: 10, fontWeight: 700, color: GRAY, textTransform: "uppercase", letterSpacing: 0.3, display: "block", marginBottom: 3 };

  return (
    <div style={{ fontFamily: "system-ui,-apple-system,sans-serif" }}>
      {/* Standalone title bar (separate from the form box) */}
      <div style={{ background: GREEN, color: WHITE, padding: "16px 16px", borderRadius: 10, fontSize: 22, fontWeight: 900, letterSpacing: 0.8, marginBottom: 12, textAlign: "center" }}>
        CASH RECEIPT ENTRY (OTHER COLLECTION)
      </div>

      {/* Row: OR / Collector details (left) + attached picture (right) */}
      <div style={{ display: "flex", gap: 16, alignItems: "stretch", flexWrap: "wrap", marginBottom: 16 }}>
       <div style={{ flex: "1 1 460px", minWidth: 300, display: "flex" }}>
        <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 12, width: "100%", padding: "14px 16px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "10px 14px" }}>
            <div><label style={lbl}>OR Number</label>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ ...inp, width: 40, flexShrink: 0, background: "#e9f0dd", color: DARK_GREEN, fontWeight: 800, textAlign: "center", padding: "6px 4px" }}>51</span>
                <input value={form.acct_left} onChange={set("acct_left")} placeholder="PL" style={{ ...inp, width: 40, flexShrink: 0, textAlign: "center", padding: "6px 4px" }} />
                <input value={form.or_number} onChange={set("or_number")} placeholder="Serial No." style={{ ...inp, flex: 1 }} />
                <input value={form.acct_right} onChange={set("acct_right")} placeholder="C" style={{ ...inp, width: 40, flexShrink: 0, textAlign: "center", padding: "6px 4px" }} />
              </div>
            </div>
            <div><label style={lbl}>Acct #</label><input value={form.acct_no} onChange={set("acct_no")} placeholder="0000-0000-00" style={inp} /></div>
            <div><label style={lbl}>Date Posted</label><FriendlyDate value={form.date_posted} onChange={v => setForm(f => ({ ...f, date_posted: v }))} /></div>
            <div><label style={lbl}>OR Date</label><FriendlyDate value={form.or_date} onChange={v => setForm(f => ({ ...f, or_date: v }))} /></div>
            <div style={{ gridColumn: "1 / -1" }}><label style={lbl}>Collector</label>
              <select value={form.collector} onChange={set("collector")} style={inp}>
                <option value="">Select collector…</option>
                {collectors.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
          </div>
        </div>
       </div>

       {/* RIGHT: attached picture */}
       <div style={{ flex: "1 1 320px", minWidth: 280, display: "flex", flexDirection: "column" }}>
         <label style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200, background: WHITE, cursor: "pointer", overflow: "hidden", padding: image ? 0 : 8 }}>
           {image ? (
             <img src={image} alt="Attachment" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
           ) : (
             <img src={ccaLogoT} alt="CCA" style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain" }} />
           )}
           <input type="file" accept="image/*" onChange={onPickImage} style={{ display: "none" }} />
         </label>
         {image && (
           <button type="button" onClick={() => setImage("")} style={{ marginTop: 8, padding: "7px 14px", background: "#FEE2E2", color: "#B91C1C", border: "1px solid #FCA5A5", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Remove picture</button>
         )}
       </div>
      </div>{/* end top row */}

      {/* Separate full-width card: Payer info + collection items */}
      <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16, marginBottom: 20 }}>
        <div style={{ marginBottom: 12 }}>
          <label style={lbl}>Search Student ID / No.</label>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <input type="text" value={studentId} onChange={e => { setStudentId(e.target.value); setLookupMsg(null); }} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); lookupStudent(); } }} placeholder="Enter student number…" style={{ ...inp, flex: "1 1 240px", maxWidth: 320 }} />
            <button type="button" onClick={lookupStudent} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 16px", background: `linear-gradient(135deg, ${DARK_GREEN}, ${GREEN})`, color: WHITE, border: "none", borderRadius: 7, fontSize: 12.5, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              Search
            </button>
            {lookupMsg && <span style={{ fontSize: 12, fontWeight: 600, color: lookupMsg.type === "error" ? "#DC2626" : lookupMsg.type === "warn" ? "#B45309" : GREEN }}>{lookupMsg.text}</span>}
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={lbl}>Payment Mode</label>
          <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
            {["Cash", "Check", "Money Order"].map(mode => (
              <label key={mode} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                <input type="checkbox" checked={form.payment_mode === mode} onChange={() => setForm(f => ({ ...f, payment_mode: f.payment_mode === mode ? "" : mode }))} style={{ width: 15, height: 15, accentColor: GREEN, cursor: "pointer" }} />
                {mode}
              </label>
            ))}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px 16px", marginBottom: 12 }}>
          <div><label style={lbl}>Payment For — Year</label>
            {noEnroll ? (
              <select value={form.pay_year} onChange={set("pay_year")} style={inp}>
                <option value="">Select year…</option>
                {["1st Year", "2nd Year", "3rd Year", "4th Year"].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            ) : (
              <input value={form.pay_year} readOnly placeholder="— (search a student)" style={{ ...inp, background: "#F9FAF6" }} />
            )}
          </div>
          <div><label style={lbl}>Semester</label>
            {noEnroll ? (
              <select value={form.pay_sem} onChange={set("pay_sem")} style={inp}>
                <option value="">Select semester…</option>
                {["1st Semester", "2nd Semester"].map(sm => <option key={sm} value={sm}>{sm}</option>)}
              </select>
            ) : (
              <input value={form.pay_sem} readOnly placeholder="— (search a student)" style={{ ...inp, background: "#F9FAF6" }} />
            )}
          </div>
          <div><label style={lbl}>Payment Period</label>
            <select value={form.pay_period} onChange={set("pay_period")} style={inp}>
              <option value="">Select period…</option>
              {availablePeriods.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px 16px", marginBottom: 12 }}>
          <div><label style={lbl}>Course</label><input value={stuInfo.course} readOnly placeholder="—" style={{ ...inp, background: "#F9FAF6" }} /></div>
          <div><label style={lbl}>Year</label><input value={stuInfo.year} readOnly placeholder="—" style={{ ...inp, background: "#F9FAF6" }} /></div>
          <div><label style={lbl}>Block/Section</label><input value={stuInfo.section} readOnly placeholder="—" style={{ ...inp, background: "#F9FAF6" }} /></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px" }}>
          <div><label style={lbl}>Name</label><input value={form.payer_name} readOnly placeholder="— (search a student)" style={{ ...inp, background: "#F9FAF6" }} /></div>
          <div><label style={lbl}>Address</label><input value={form.address} readOnly placeholder="— (search a student)" style={{ ...inp, background: "#F9FAF6" }} /></div>
        </div>

        <datalist id="cashier-natures">{natures.map(n => <option key={n.id} value={n.name} />)}</datalist>
        {/* Collection line items */}
        <div style={{ marginTop: 16, border: `1px solid ${BORDER}`, borderRadius: 8, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: discountEnabled ? "1fr 96px 96px 96px 96px 44px" : "1fr 130px 130px 44px", gap: 8, background: "#F3F7EE", padding: "7px 10px", fontSize: 10.5, fontWeight: 800, color: DARK_GREEN, textTransform: "uppercase", letterSpacing: 0.3 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span>Nature of Collection</span>
              <select value={headerNature} onChange={pickNatureFromHeader} style={{ ...inp, flex: 1, maxWidth: 300, textTransform: "none", fontWeight: 400, letterSpacing: 0 }}>
                <option value="">Select nature of collection…</option>
                {natures.map(n => <option key={n.id} value={n.name}>{n.name}</option>)}
              </select>
            </div><div style={{ textAlign: "center" }}>Fee</div>{discountEnabled && <div style={{ textAlign: "center" }}>Discount</div>}{discountEnabled && <div style={{ textAlign: "center" }}>Net</div>}<div style={{ textAlign: "right" }}>Amount Paid</div><div />
          </div>
          {items.map((it, i) => {
            const feeN = num(it.fee); const discN = num(it.discount); const netN = Math.max(0, feeN - discN);
            return (
            <div key={i} style={{ display: "grid", gridTemplateColumns: discountEnabled ? "1fr 96px 96px 96px 96px 44px" : "1fr 130px 130px 44px", gap: 8, padding: "6px 10px", alignItems: "center", borderTop: `1px solid ${BORDER}` }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {it.charge ? (
                  <span style={{ ...inp, flex: 1, background: "#F9FAF6", fontWeight: 600, color: "#1f2937", display: "flex", alignItems: "center" }}>{it.charge}</span>
                ) : (chargesByNature[it.nature_id] || []).length > 0 ? (
                  <select value={it.charge} onChange={setItem(i, "charge")} style={{ ...inp, flex: 1 }}>
                    <option value="">Select charge…</option>
                    {(chargesByNature[it.nature_id] || []).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                ) : (
                  <input value={it.charge} onChange={setItem(i, "charge")} placeholder="Charge" style={{ ...inp, flex: 1 }} />
                )}
              </div>
              <input value={it.fee} readOnly placeholder="—" style={{ ...inp, textAlign: "center", background: "#F9FAF6", color: GRAY }} />
              {discountEnabled && <input value={it.discount} onChange={setItem(i, "discount")} placeholder="0.00" inputMode="decimal" style={{ ...inp, textAlign: "center", border: `1.5px solid ${overBudget ? "#DC2626" : BORDER}`, color: overBudget ? "#DC2626" : "#111" }} />}
              {discountEnabled && <input value={feeN ? netN.toFixed(2) : ""} readOnly placeholder="—" style={{ ...inp, textAlign: "center", background: "#F9FAF6", fontWeight: 700, color: DARK_GREEN }} />}
              <input value={it.amount} onChange={setItem(i, "amount")} placeholder="0.00" inputMode="decimal" style={{ ...inp, textAlign: "center" }} />
              <button type="button" onClick={() => removeItem(i)} title="Remove row" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: 6, background: "#FEE2E2", color: "#B91C1C", border: "1px solid #FCA5A5", borderRadius: 6, cursor: "pointer" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /></svg>
              </button>
            </div>
            ); })}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "8px 10px", borderTop: `1px solid ${BORDER}`, background: "#FAFAF7", flexWrap: "wrap", gap: 12 }}>
            <div>
              <button type="button" onClick={addItem} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", background: WHITE, color: DARK_GREEN, border: `1.5px solid ${GREEN}`, borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                Add Row
              </button>
              {visibleLess.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: GRAY, textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 4 }}>Less (Deductions)</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {visibleLess.map(l => (
                      <label key={l.id} style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12.5, cursor: "pointer" }}>
                        <input type="checkbox" checked={!!lessSelected[l.id]} onChange={() => setLessSelected(m => ({ ...m, [l.id]: !m[l.id] }))} style={{ width: 15, height: 15, accentColor: GREEN, cursor: "pointer" }} />
                        <span style={{ fontWeight: 600, color: "#374151" }}>{l.name}</span>
                        <span style={{ color: GRAY, fontSize: 11 }}>(max {peso(l.amount)}{l.municipality ? ` · ${l.municipality}` : ""})</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div style={{ textAlign: "right" }}>
              {discountEnabled && <div style={{ fontSize: 12.5, fontWeight: 700, color: overBudget ? "#DC2626" : "#B45309" }}>Total Discount: {peso(discountSum)} / {peso(lessBudget)}{overBudget && <span> — exceeds allowed discount!</span>}</div>}
              <div style={{ fontSize: 15, fontWeight: 900, color: DARK_GREEN, marginTop: 2 }}>TOTAL: {peso(total)}</div>
            </div>
          </div>
        </div>

        {msg && <div style={{ marginTop: 12, fontSize: 12.5, fontWeight: 600, color: msg.type === "success" ? "#166534" : "#DC2626" }}>{msg.text}</div>}
        {canInput && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
          <button onClick={save} disabled={saving} style={{ padding: "10px 26px", background: `linear-gradient(135deg, ${DARK_GREEN}, ${GREEN})`, color: WHITE, border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: saving ? "default" : "pointer", opacity: saving ? 0.7 : 1 }}>
            {saving ? "Saving…" : "💾 Save Receipt"}
          </button>
        </div>
        )}
      </div>{/* end payer + items card */}

      {/* Saved receipts — filters */}
      {(() => {
        const uq = (vals) => [...new Set(vals.filter(Boolean).map(v => String(v).trim()))].sort();
        const rCourseOpts = uq(rows.map(r => r.course));
        const rYearOpts = uq(rows.map(r => r.year_level));
        const rSectionOpts = uq(rows.map(r => r.section));
        const fInp = { padding: "6px 9px", border: `1.5px solid ${BORDER}`, borderRadius: 7, fontSize: 12, outline: "none", background: WHITE };
        return (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end", alignItems: "center", marginBottom: 10 }}>
            <select value={rCourse} onChange={e => setRCourse(e.target.value)} style={fInp}>
              <option value="">All Courses</option>{rCourseOpts.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={rYear} onChange={e => setRYear(e.target.value)} style={fInp}>
              <option value="">All Years</option>{rYearOpts.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select value={rSection} onChange={e => setRSection(e.target.value)} style={fInp}>
              <option value="">All Sections</option>{rSectionOpts.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        );
      })()}
      {/* Saved receipts */}
      <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", tableLayout: "fixed", minWidth: 900 }}>
          <colgroup>{[110, 120, 110, 220, 220, 120, 70].map((w, i) => <col key={i} style={{ width: w }} />)}</colgroup>
          <thead>
            <tr>
              {["OR No.", "OR Date", "Acct #", "Name", "Nature", "Total", "Action"].map(h => (
                <th key={h} style={{ padding: "8px 8px", textAlign: "center", fontSize: 10.5, fontWeight: 700, color: WHITE, background: GREEN, border: "1px solid #6b8f3a" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(() => {
              const filtered = rows.filter(r =>
                (!rCourse || String(r.course || "").trim() === rCourse) &&
                (!rYear || String(r.year_level || "").trim() === rYear) &&
                (!rSection || String(r.section || "").trim() === rSection));
              return loading ? (
              <tr><td colSpan={7} style={{ padding: 24, textAlign: "center", color: GRAY, fontSize: 12.5, border: `1px solid ${BORDER}` }}>Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 24, textAlign: "center", color: GRAY, fontSize: 12.5, border: `1px solid ${BORDER}` }}>No collections yet.</td></tr>
            ) : filtered.map(r => {
              let natures = "";
              try { const it = JSON.parse(r.items || "[]"); natures = it.map(x => x.nature).filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(", "); } catch { natures = ""; }
              const cell = { padding: "6px 8px", fontSize: 11, color: "#1f2937", border: `1px solid ${BORDER}`, textAlign: "center", wordBreak: "break-word" };
              return (
                <tr key={r.id}>
                  <td style={cell}>{r.or_number ? `51-${r.or_number}` : "—"}</td>
                  <td style={cell}>{r.or_date || "—"}</td>
                  <td style={cell}>{r.acct_no || "—"}</td>
                  <td style={cell}>{r.payer_name || "—"}</td>
                  <td style={cell}>{natures || "—"}</td>
                  <td style={{ ...cell, fontWeight: 700 }}>{peso(r.total)}</td>
                  <td style={cell}>
                    {canDelete ? (
                    <button onClick={() => remove(r.id)} title="Delete" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: 6, background: "#FEE2E2", color: "#B91C1C", border: "1px solid #FCA5A5", borderRadius: 6, cursor: "pointer" }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
                    </button>
                    ) : <span style={{ color: "#C4C4C4" }}>—</span>}
                  </td>
                </tr>
              );
            });
            })()}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Convert a peso amount into words for the "AMOUNT IN WORDS" line.
function amountInWords(n) {
  const num = Math.floor(Math.abs(Number(n) || 0));
  const cents = Math.round((Math.abs(Number(n) || 0) - num) * 100);
  const ones = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
  const tens = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
  const three = (x) => {
    let s = "";
    if (x >= 100) { s += ones[Math.floor(x / 100)] + " hundred"; x %= 100; if (x) s += " "; }
    if (x >= 20) { s += tens[Math.floor(x / 10)]; x %= 10; if (x) s += "-" + ones[x]; }
    else if (x > 0) s += ones[x];
    return s;
  };
  if (num === 0 && cents === 0) return "Zero pesos";
  const scales = ["", " thousand", " million", " billion"];
  let words = "", i = 0, x = num;
  const parts = [];
  while (x > 0) { const c = x % 1000; if (c) parts.unshift(three(c) + scales[i]); x = Math.floor(x / 1000); i++; }
  words = parts.join(" ").trim() || "zero";
  let out = words.charAt(0).toUpperCase() + words.slice(1) + (num === 1 ? " peso" : " pesos");
  if (cents > 0) out += " and " + String(cents).padStart(2, "0") + "/100";
  return out;
}

// A generic circular seal (not a copy of any official coat of arms).
function ReceiptSeal({ id, size = 58 }) {
  const rid = `seal-ring-${id}`;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ flexShrink: 0 }}>
      <defs><path id={rid} d="M50,50 m-40,0 a40,40 0 1,1 80,0 a40,40 0 1,1 -80,0" /></defs>
      <circle cx="50" cy="50" r="48" fill="none" stroke="#111" strokeWidth="2" />
      <circle cx="50" cy="50" r="33" fill="none" stroke="#111" strokeWidth="1" />
      <text fill="#111" fontSize="9" fontWeight="700" letterSpacing="0.5" fontFamily="'Times New Roman',serif">
        <textPath href={`#${rid}`} startOffset="2%">PROVINCE OF LEYTE ★ OFFICIAL SEAL ★</textPath>
      </text>
      <text x="50" y="60" textAnchor="middle" fontSize="26" fill="#111">⚖</text>
    </svg>
  );
}

// A faithful replica of the municipal Official Receipt (Accountable Form No. 51).
function OfficialReceipt({ rec, officerName = "", signature = "" }) {
  let items = [];
  try { items = typeof rec.items === "string" ? JSON.parse(rec.items || "[]") : (Array.isArray(rec.items) ? rec.items : []); } catch { items = []; }
  const peso = (v) => Number(toNum(v)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const bd = "1.5px solid #111";
  const bdT = "1.5px solid #111";
  const lbl = { fontSize: 8, color: "#111" };
  const pad = { padding: "3px 6px" };
  const dataRows = items.filter(it => it.nature || it.charge || it.amount);
  const blanks = Math.max(0, 9 - dataRows.length);
  const rows = [...dataRows, ...Array.from({ length: blanks }, () => ({}))];

  return (
    <div style={{ width: 380, maxWidth: "100%", margin: "0 auto", border: bd, backgroundColor: WHITE, backgroundImage: `url(${leyteWatermark})`, backgroundRepeat: "no-repeat", backgroundPosition: "center", backgroundSize: "contain", color: "#111", fontFamily: "'Times New Roman', Georgia, serif", fontSize: 11, boxShadow: "0 2px 10px rgba(0,0,0,.12)" }}>
      {/* Header: seals + titles */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 10px 6px" }}>
        <img src={phCoatOfArms} alt="Republic of the Philippines" style={{ width: 58, height: 58, objectFit: "contain", flexShrink: 0 }} />
        <div style={{ flex: 1, textAlign: "center", lineHeight: 1.15 }}>
          <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: 1 }}>OFFICIAL RECEIPT</div>
          <div style={{ fontSize: 9 }}>Republic of the Philippines</div>
          <div style={{ fontSize: 11, fontWeight: 700 }}>OFFICE OF THE TREASURER</div>
          <div style={{ fontSize: 9 }}>Province of Leyte</div>
        </div>
        <img src={leyteSeal} alt="Province of Leyte Official Seal" style={{ width: 58, height: 58, objectFit: "contain", flexShrink: 0 }} />
      </div>

      {/* Accountable form / ORIGINAL */}
      <div style={{ display: "flex", borderTop: bdT }}>
        <div style={{ flex: 1.4, ...pad, borderRight: bd, fontSize: 8, lineHeight: 1.3 }}>
          Accountable Form No. 51<br />Revised January 1992<br />Per SP Res. no. 03-327
        </div>
        <div style={{ flex: 1, ...pad, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, letterSpacing: 1 }}>ORIGINAL</div>
      </div>

      {/* Date / No. */}
      <div style={{ display: "flex", borderTop: bdT, alignItems: "flex-end" }}>
        <div style={{ flex: 1.4, ...pad, borderRight: bd }}><span style={lbl}>Date</span> <span style={{ borderBottom: "1px solid #111", display: "inline-block", minWidth: 90 }}>{rec.or_date || rec.date_posted || ""}</span></div>
        <div style={{ flex: 1, ...pad, display: "flex", alignItems: "baseline", gap: 0 }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: "#111", position: "relative", top: -5 }}>No.{rec.acct_left || "PL"}</span>
          <span style={{ color: "#c0392b", fontWeight: 800, fontSize: 19, letterSpacing: 0.5 }}>{rec.or_number || ""}</span>
          <span style={{ fontSize: 9, fontWeight: 700, color: "#111", marginLeft: "auto", position: "relative", top: -10 }}>{rec.acct_right || "C"}</span>
        </div>
      </div>

      {/* Payor / Fund */}
      <div style={{ display: "flex", borderTop: bdT }}>
        <div style={{ flex: 1.4, padding: "2px 6px 3px", borderRight: bd }}>
          <div style={{ ...lbl, lineHeight: 1 }}>Payor</div>
          <div style={{ fontWeight: 700, lineHeight: 1.05, fontSize: 10.5, marginTop: 5 }}>{rec.payer_name || ""}</div>
          <div style={{ marginTop: 7 }}>
            <div style={{ fontWeight: 600, fontSize: 9.5, lineHeight: 1.1 }}>{rec.address || ""}</div>
            <div style={{ fontSize: 7, color: "#555", fontStyle: "italic", lineHeight: 1, marginTop: 3 }}>(Municipality)</div>
          </div>
        </div>
        <div style={{ flex: "0 0 82px", width: 82, ...pad, textAlign: "center" }}><div style={{ fontSize: 8.5, fontWeight: 700, color: "#111", marginTop: 4 }}>FUND</div><div style={{ marginTop: 3, marginLeft: -6, marginRight: -6, borderBottom: bd }} /><div style={{ minHeight: 12 }} /></div>
      </div>

      {/* Nature / Account Code / Amount */}
      <table style={{ width: "100%", borderCollapse: "collapse", borderTop: bdT }}>
        <thead>
          <tr>
            <th style={{ ...pad, borderRight: bd, textAlign: "center", fontSize: 8.5, fontWeight: 700 }}>NATURE OF COLLECTION</th>
            <th style={{ ...pad, borderRight: bd, textAlign: "center", fontSize: 8.5, fontWeight: 700, width: 70 }}>ACCOUNT<br />CODE</th>
            <th style={{ ...pad, textAlign: "center", fontSize: 8.5, fontWeight: 700, width: 82 }}>AMOUNT</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((it, i) => (
            <tr key={i} style={{ borderTop: bd }}>
              <td style={{ ...pad, borderRight: bd, height: 15 }}>{it.charge || it.nature || ""}</td>
              <td style={{ ...pad, borderRight: bd }}>&nbsp;</td>
              <td style={{ ...pad, textAlign: "right" }}>{it.amount != null && it.amount !== "" ? peso(it.amount) : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Total */}
      <div style={{ display: "flex", borderTop: bdT, fontWeight: 800 }}>
        <div style={{ flex: 1, ...pad, borderRight: bd }}>TOTAL</div>
        <div style={{ width: 82, ...pad, textAlign: "right" }}>{rec.total ? peso(rec.total) : ""}</div>
      </div>

      {/* Amount in words */}
      <div style={{ ...pad, borderTop: bdT }}>
        <div style={{ fontSize: 11, fontWeight: 400, color: "#111", marginTop: -1, lineHeight: 1 }}>AMOUNT IN WORDS</div>
        <div style={{ fontStyle: "italic", fontWeight: 700, minHeight: 26, fontSize: 20, lineHeight: 1.1, marginTop: 4, marginLeft: -6, marginRight: -6, paddingLeft: 41, paddingRight: 6, borderBottom: bd }}>{rec.total ? (amountInWords(toNum(rec.total)).replace(/\b([a-z])/g, (m, c) => c.toUpperCase()) + " Only") : ""}</div>
      </div>

      {/* Payment mode + drawee bank */}
      <table style={{ width: "100%", borderCollapse: "collapse", borderTop: bdT }}>
        <tbody>
          <tr>
            <td rowSpan={2} style={{ ...pad, borderRight: bd, fontSize: 9, lineHeight: 1.9, verticalAlign: "top", width: "34%" }}>
              <div>{rec.payment_mode === "Cash" ? "☑" : "☐"} Cash</div><div>{rec.payment_mode === "Check" ? "☑" : "☐"} Check</div><div>{rec.payment_mode === "Money Order" ? "☑" : "☐"} Money Order</div>
            </td>
            <th style={{ ...pad, borderRight: bd, borderBottom: bd, fontSize: 8, fontWeight: 700, textAlign: "center" }}>DRAWEE<br />BANK</th>
            <th style={{ ...pad, borderRight: bd, borderBottom: bd, fontSize: 8, fontWeight: 700, textAlign: "center" }}>NUMBER</th>
            <th style={{ ...pad, borderBottom: bd, fontSize: 8, fontWeight: 700, textAlign: "center" }}>DATE</th>
          </tr>
          <tr>
            <td style={{ borderRight: bd, height: 30 }} />
            <td style={{ borderRight: bd, height: 30 }} />
            <td style={{ height: 30 }} />
          </tr>
        </tbody>
      </table>

      {/* Received / By / Collecting Officer */}
      <div style={{ ...pad, borderTop: bdT, fontSize: 9 }}>Received the amount stated above.</div>
      <div style={{ padding: "18px 10px 6px", paddingLeft: 25, textAlign: "center" }}>
        <div style={{ fontSize: 9, marginBottom: 2, position: "relative" }}>By: <span style={{ borderBottom: "1px solid #111", display: "inline-block", minWidth: 150, fontWeight: 700, textTransform: "uppercase", position: "relative" }}>
          {signature ? <img src={signature} alt="signature" style={{ position: "absolute", bottom: 1, left: "50%", transform: "translateX(-50%)", maxHeight: 60, maxWidth: 200, objectFit: "contain" }} /> : null}
          {rec.created_by || officerName ||" "}</span></div>
        <div style={{ fontSize: 8, fontWeight: 700, marginTop: 2 }}>COLLECTING OFFICER</div>
      </div>

      {/* Footer note */}
      <div style={{ ...pad, borderTop: bdT, fontSize: 7.5, fontStyle: "italic" }}>
        NOTE: Write the number and date of this receipt on the back of check or money order received.
      </div>
    </div>
  );
}

// ─── SCHOOL FEES panel — one student's payment status per year & semester ────
// Rendered inline (full-width) in the student detail view, styled like the
// Enrollment Records list.
export function SchoolFeesPanel({ student }) {
  const [paid, setPaid] = useState({});
  const [loading, setLoading] = useState(true);
  const [openKey, setOpenKey] = useState(null);
  const [collections, setCollections] = useState([]);
  const [fees, setFees] = useState([]); // all configured charges: { name, amount, year_level, semester }
  const [officerName, setOfficerName] = useState("");
  const [sigByName, setSigByName] = useState({});
  useEffect(() => {
    if (!student) return;
    fetch(`${API}/api/erd/cashier/payments?t=${Date.now()}`, { cache: "no-store" })
      .then(r => r.ok ? r.json() : []).then(d => {
        const m = {};
        (Array.isArray(d) ? d : []).forEach(p => { if (p.student_id === student.id) m[`${p.year_level}-${p.semester}`] = { box1: !!p.box1, box2: !!p.box2 }; });
        setPaid(m);
      }).catch(() => {}).finally(() => setLoading(false));
    fetch(`${API}/api/erd/cashier/collections?t=${Date.now()}`, { cache: "no-store" })
      .then(r => r.ok ? r.json() : []).then(d => setCollections(Array.isArray(d) ? d : [])).catch(() => {});
    fetch(`${API}/api/erd/cashier/natures?t=${Date.now()}`, { cache: "no-store" })
      .then(r => r.ok ? r.json() : []).then(async nats => {
        const arr = Array.isArray(nats) ? nats : [];
        const lists = await Promise.all(arr.map(n =>
          fetch(`${API}/api/erd/cashier/natures/${n.id}/charges?t=${Date.now()}`, { cache: "no-store" })
            .then(r => r.ok ? r.json() : []).then(d => (Array.isArray(d) ? d : []).map(c => ({ name: c.name, amount: c.amount, year_level: c.year_level, semester: c.semester }))).catch(() => [])
        ));
        setFees(lists.flat());
      }).catch(() => {});
    fetch(`${API}/api/erd/users?t=${Date.now()}`, { cache: "no-store" })
      .then(r => r.ok ? r.json() : []).then(list => {
        const arr = Array.isArray(list) ? list : [];
        const n = (v) => String(v || "").toLowerCase().replace(/_/g, " ");
        const co = arr.find(u => n(u.designation).includes("collecting officer") || (Array.isArray(u.roles) && u.roles.some(r => n(r).includes("collecting officer") || n(r).includes("mto collecting"))));
        if (co) setOfficerName([co.first_name, co.middle_name, co.last_name].filter(Boolean).join(" ").replace(/\s+/g, " ").trim());
        // Map each user's full name -> signature image (to stamp on the receipt).
        const sm = {};
        arr.forEach(u => { const nm = [u.first_name, u.middle_name, u.last_name].filter(Boolean).join(" ").replace(/\s+/g, " ").trim().toLowerCase(); if (nm && u.signature) sm[nm] = u.signature; });
        setSigByName(sm);
      }).catch(() => {});
  }, [student]);
  if (!student) return null;

  const norm = (s) => String(s || "").replace(/\s+/g, " ").trim().toLowerCase();
  const studentName = norm([student.first_name, student.middle_name, student.last_name].filter(Boolean).join(" "));
  const studentNameAlt = norm([student.last_name, student.first_name, student.middle_name].filter(Boolean).join(" "));
  const digit = (s) => { const m = String(s || "").match(/(\d)/); return m ? parseInt(m[1], 10) : 0; };
  // Receipts recorded for THIS student, routed to the term (year + semester)
  // chosen in the "Payment For" dropdowns. Legacy receipts fall back to their
  // course year and 1st semester.
  const receiptsFor = (termYear, termSem) => collections.filter(c => {
    const nm = norm(c.payer_name);
    if (!nm || (nm !== studentName && nm !== studentNameAlt)) return false;
    const ry = digit(c.pay_year) || digit(c.year_level);
    const rs = digit(c.pay_sem) || 1;
    return ry === termYear && rs === termSem;
  });
  const val = (y, sem) => paid[`${y}-${sem}`] || { box1: false, box2: false };
  const money = (n) => "₱" + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  // Remaining balance for a term = Σ over that term's fees of (fee − discount − paid), floored at 0.
  const remainingForTerm = (y, sem) => {
    const feesT = fees.filter(f => digit(f.year_level) === y && digit(f.semester) === sem);
    const paidByChg = {}, discByChg = {};
    receiptsFor(y, sem).forEach(r => {
      let its = []; try { its = JSON.parse(r.items || "[]"); } catch { its = []; }
      its.forEach(it => {
        const k = norm(it.charge || it.nature); if (!k) return;
        paidByChg[k] = (paidByChg[k] || 0) + toNum(it.amount);
        discByChg[k] = (discByChg[k] || 0) + toNum(it.discount);
      });
    });
    return feesT.reduce((s, f) => {
      const k = norm(f.name);
      return s + Math.max(0, toNum(f.amount) - (discByChg[k] || 0) - (paidByChg[k] || 0));
    }, 0);
  };
  const ordinal = (n) => ["", "1st", "2nd", "3rd", "4th"][n] || `${n}th`;
  const baseYear = parseInt(student.year_enrolled, 10) || new Date().getFullYear();
  const pill = (st) => st === "full" ? { label: "✓ Fully Paid", col: "#15803D", bg: "#DCFCE7" }
    : st === "partial" ? { label: "◐ Partially Paid", col: "#B45309", bg: "#FEF3C7" }
    : { label: "✕ Unpaid", col: "#DC2626", bg: "#FEE2E2" };

  const terms = [];
  CASH_YEARS.forEach(yr => [1, 2].forEach(sem => { if (cellUnlocked(student, yr.y, sem)) terms.push({ y: yr.y, sem, label: yr.label }); }));
  // Only show a term card when the student actually has a cashier record for it
  // (a Form 51 receipt, or a ticked box in Payment Tracking). No record → hidden.
  // Show a term only if the student has an ACTUAL Form 51 receipt for it.
  // (Stale Payment-Tracking box rows alone do NOT count as a cashier record.)
  const visibleTerms = terms.filter(t => receiptsFor(t.y, t.sem).length > 0);

  return (
    <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8, fontFamily: "system-ui,-apple-system,sans-serif" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: GRAY, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>School Fees</div>
      {loading ? (
        <div style={{ padding: 32, textAlign: "center", color: GRAY, fontSize: 14, background: "#F8FAF5", borderRadius: 10, border: `1px dashed ${BORDER}` }}>Loading…</div>
      ) : visibleTerms.length === 0 ? (
        <div style={{ padding: 32, textAlign: "center", color: GRAY, fontSize: 14, background: "#F8FAF5", borderRadius: 10, border: `1px dashed ${BORDER}` }}>No cashier records yet for this student.</div>
      ) : visibleTerms.map(t => {
        const key = `${t.y}-${t.sem}`;
        const v = val(t.y, t.sem);
        // A recorded receipt means the term is at least Partially Paid, even if the
        // box flags weren't ticked in Payment Tracking.
        let st = semStatus(v);
        if (st !== "full" && receiptsFor(t.y, t.sem).length > 0) st = "partial";
        const p = pill(st);
        const open = openKey === key;
        const sy = baseYear + (t.y - 1);
        return (
          <div key={key} style={{ border: `1px solid ${BORDER}`, borderRadius: 10, overflow: "hidden", background: WHITE }}>
            <div onClick={() => setOpenKey(open ? null : key)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", cursor: "pointer" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ display: "inline-block", transform: open ? "rotate(90deg)" : "none", transition: "transform .15s", color: GRAY }}>▶</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#1f2937" }}>{t.label} — {ordinal(t.sem)} Semester</div>
                  <div style={{ fontSize: 12, color: GRAY, marginTop: 2 }}>S.Y. {sy}–{sy + 1}</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {(() => { const bal = remainingForTerm(t.y, t.sem); return (
                  <span style={{ fontSize: 12, fontWeight: 700, color: bal > 0 ? "#B45309" : "#15803D", whiteSpace: "nowrap" }}>
                    Balance: {money(bal)}
                  </span>
                ); })()}
                <span style={{ padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 800, color: p.col, background: p.bg, whiteSpace: "nowrap" }}>{p.label}</span>
              </div>
            </div>
            {open && (() => {
              const recs = receiptsFor(t.y, t.sem);
              return (
                <div style={{ borderTop: `1px solid ${BORDER}`, padding: "14px 16px", background: "#F4F6F0", display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "center", alignItems: "flex-start" }}>
                  {recs.length === 0 ? (
                    <div style={{ textAlign: "center", color: GRAY, fontSize: 12.5, width: "100%" }}>No official receipt recorded for this term yet.</div>
                  ) : recs.map(r => <OfficialReceipt key={r.id} rec={r} officerName={officerName} signature={sigByName[String(r.created_by || "").trim().toLowerCase()] || ""} />)}
                </div>
              );
            })()}
          </div>
        );
      })}
    </div>
  );
}

// ─── CASHIER — ASSESSMENT ────────────────────────────────────────────────────
export function Assessment() {
  const [students, setStudents] = useState([]);
  const [studentId, setStudentId] = useState("");
  const [student, setStudent] = useState(null);
  const [msg, setMsg] = useState(null);
  const [openTerm, setOpenTerm] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [collections, setCollections] = useState([]);
  const [fees, setFees] = useState([]); // all charges from Cashier Settings: { name, amount, year_level, semester }
  useEffect(() => {
    fetch(`${API}/api/erd/students?t=${Date.now()}`, { cache: "no-store" })
      .then(r => r.ok ? r.json() : []).then(d => setStudents(Array.isArray(d) ? d : [])).catch(() => {});
    fetch(`${API}/api/erd/cashier/collections?t=${Date.now()}`, { cache: "no-store" })
      .then(r => r.ok ? r.json() : []).then(d => setCollections(Array.isArray(d) ? d : [])).catch(() => {});
    // Load every charge (school fee) across all natures.
    fetch(`${API}/api/erd/cashier/natures?t=${Date.now()}`, { cache: "no-store" })
      .then(r => r.ok ? r.json() : []).then(async nats => {
        const arr = Array.isArray(nats) ? nats : [];
        const lists = await Promise.all(arr.map(n =>
          fetch(`${API}/api/erd/cashier/natures/${n.id}/charges?t=${Date.now()}`, { cache: "no-store" })
            .then(r => r.ok ? r.json() : []).then(d => (Array.isArray(d) ? d : []).map(c => ({ name: c.name, amount: c.amount, year_level: c.year_level, semester: c.semester }))).catch(() => [])
        ));
        setFees(lists.flat());
      }).catch(() => {});
  }, []);
  const search = () => {
    const key = studentId.trim().toLowerCase();
    if (!key) return;
    const s = students.find(x => String(x.student_number || "").toLowerCase() === key);
    if (!s) { setStudent(null); setMsg("No student found with that ID."); setEnrollments([]); return; }
    setStudent(s); setMsg(null); setOpenTerm(null);
    fetch(`${API}/api/erd/enrollments/${s.id}?t=${Date.now()}`, { cache: "no-store" })
      .then(r => r.ok ? r.json() : []).then(d => setEnrollments(Array.isArray(d) ? d : [])).catch(() => setEnrollments([]));
  };
  const name = student ? [student.first_name, student.middle_name, student.last_name].filter(Boolean).join(" ").replace(/\s+/g, " ").trim() : "";
  const address = student ? [student.barangay, student.municipality, student.province].filter(Boolean).join(", ") : "";

  // Student's payments per charge & period (matched by charge/nature name).
  const norm = (s) => String(s || "").replace(/\s+/g, " ").trim().toLowerCase();
  const myReceipts = student ? collections.filter(c => {
    const nm = norm(c.payer_name);
    return nm && (nm === norm(name) || nm === norm([student.last_name, student.first_name, student.middle_name].filter(Boolean).join(" ")));
  }) : [];
  const digit = (v) => { const m = String(v || "").match(/(\d)/); return m ? +m[1] : 0; };
  // Assessment rows for ONE term (year + semester): fees configured for that term,
  // with the student's payments for that term split by period.
  const rowsForTerm = (yN, sN) => {
    const feesT = fees.filter(f => digit(f.year_level) === yN && digit(f.semester) === sN);
    const pm = new Map();   // amount paid, split by period
    const dm = new Map();   // discount applied (Less), by charge
    myReceipts.filter(r => (digit(r.pay_year) || digit(r.year_level)) === yN && (digit(r.pay_sem) || 1) === sN).forEach(r => {
      const period = ["Enrollment", "Midterm", "Finals"].includes(r.pay_period) ? r.pay_period : "Enrollment";
      let items = []; try { items = JSON.parse(r.items || "[]"); } catch { items = []; }
      items.forEach(it => {
        const k = norm(it.charge || it.nature); if (!k) return;
        if (!pm.has(k)) pm.set(k, { Enrollment: 0, Midterm: 0, Finals: 0 });
        pm.get(k)[period] += toNum(it.amount);
        dm.set(k, (dm.get(k) || 0) + toNum(it.discount));
      });
    });
    return feesT.map(f => {
      const key = norm(f.name);
      const p = pm.get(key) || { Enrollment: 0, Midterm: 0, Finals: 0 };
      const total = p.Enrollment + p.Midterm + p.Finals;   // amount actually paid
      const discount = dm.get(key) || 0;
      // Remaining balance = fee − discount − amount paid (never below 0).
      const balance = Math.max(0, toNum(f.amount) - discount - total);
      return { nature: f.name, amount: toNum(f.amount), Enrollment: p.Enrollment, Midterm: p.Midterm, Finals: p.Finals, discount, total, balance };
    });
  };
  const peso = (n) => "₱" + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  // Distinct enrolled terms (year + semester), most recent last.
  const enrolledTerms = [...new Map(enrollments.map(e => {
    const yN = digit(e.year_level); const sN = /2nd/i.test(e.semester) ? 2 : 1;
    return [`${yN}-${sN}`, { yN, sN, year_level: e.year_level, semester: e.semester, year_enrolled: e.year_enrolled }];
  })).values()].sort((a, b) => a.yN - b.yN || a.sN - b.sN);

  const inp = { padding: "8px 11px", border: `1.5px solid ${BORDER}`, borderRadius: 7, fontSize: 12.5, outline: "none" };
  const rowLbl = { fontSize: 11, fontWeight: 800, color: GRAY, letterSpacing: 0.3, width: 120, flexShrink: 0 };
  const rowVal = { fontSize: 14, fontWeight: 700, color: "#1f2937" };

  return (
    <div style={{ fontFamily: "system-ui,-apple-system,sans-serif" }}>
      <div style={{ background: GREEN, color: WHITE, padding: "16px", borderRadius: 10, fontSize: 22, fontWeight: 900, letterSpacing: 0.6, marginBottom: 16, textAlign: "center" }}>
        ASSESSMENT
      </div>
      <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 18 }}>
        {/* Search — upper right */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 18 }}>
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: GRAY, textTransform: "uppercase", letterSpacing: 0.3, display: "block", marginBottom: 3, textAlign: "right" }}>Search Student ID / No.</label>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input value={studentId} onChange={e => { setStudentId(e.target.value); setMsg(null); }} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); search(); } }} placeholder="Enter student number…" style={{ ...inp, width: 240 }} />
              <button type="button" onClick={search} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", background: `linear-gradient(135deg, ${DARK_GREEN}, ${GREEN})`, color: WHITE, border: "none", borderRadius: 7, fontSize: 12.5, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                Search
              </button>
            </div>
            {msg && <div style={{ fontSize: 12, fontWeight: 600, color: "#DC2626", marginTop: 6, textAlign: "right" }}>{msg}</div>}
          </div>
        </div>

        {/* Student info — left side */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 560 }}>
          <div style={{ display: "flex", alignItems: "center" }}><span style={rowLbl}>NAME:</span><span style={rowVal}>{name || "—"}</span></div>
          <div style={{ display: "flex", alignItems: "center" }}><span style={rowLbl}>ADDRESS:</span><span style={rowVal}>{address || "—"}</span></div>
          <div style={{ display: "flex", alignItems: "center" }}><span style={rowLbl}>YEAR:</span><span style={rowVal}>{(student && student.year_level) || "—"}</span></div>
          <div style={{ display: "flex", alignItems: "center" }}><span style={rowLbl}>BLOCK/SECTION:</span><span style={rowVal}>{(student && student.section) || "—"}</span></div>
        </div>

        {/* One card per enrolled term; expand to see that term's assessment. */}
        {student && enrolledTerms.length === 0 && (
          <div style={{ marginTop: 20, padding: 20, textAlign: "center", color: GRAY, fontSize: 13, border: `1px dashed ${BORDER}`, borderRadius: 10 }}>No enrollment records for this student yet.</div>
        )}
        {student && enrolledTerms.map(t => {
          const key = `${t.yN}-${t.sN}`;
          const open = openTerm === key;
          const baseY = parseInt(t.year_enrolled, 10) || parseInt(student.year_enrolled, 10) || new Date().getFullYear();
          const rows = rowsForTerm(t.yN, t.sN);
          const gAmt = rows.reduce((s, r) => s + r.amount, 0);
          const gTot = rows.reduce((s, r) => s + r.total, 0);
          const cT = (k) => rows.reduce((s, r) => s + r[k], 0);
          return (
            <div key={key} style={{ marginTop: 14 }}>
              <div onClick={() => setOpenTerm(open ? null : key)} style={{ border: `1px solid ${BORDER}`, borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", background: WHITE, cursor: "pointer" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ color: GRAY, display: "inline-block", transform: open ? "rotate(90deg)" : "none", transition: "transform .15s" }}>▶</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#1f2937" }}>{t.year_level} — {t.semester}</div>
                    <div style={{ fontSize: 12, color: GRAY, marginTop: 2 }}>S.Y. {baseY}–{baseY + 1}</div>
                  </div>
                </div>
                <span style={{ padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 800, color: "#15803D", background: "#DCFCE7", whiteSpace: "nowrap" }}>✓ Enrolled</span>
              </div>
              {open && (
              <div style={{ marginTop: 8, overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, minWidth: 720 }}>
                  <thead>
                    <tr style={{ background: "#F3F7EE", color: DARK_GREEN }}>
                      {["School Fees", "Amount", "Enrollment", "Midterm", "Finals", "Balance", "Total"].map(h => (
                        <th key={h} style={{ padding: "8px 10px", fontSize: 10.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.3, textAlign: "center", border: `1px solid ${BORDER}` }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 ? (
                      <tr><td colSpan={7} style={{ padding: 18, textAlign: "center", color: GRAY, border: `1px solid ${BORDER}` }}>No fees configured for this year &amp; semester in Cashier Settings.</td></tr>
                    ) : rows.map(r => (
                      <tr key={r.nature} style={{ borderTop: `1px solid ${BORDER}` }}>
                        <td style={{ padding: "7px 10px", fontWeight: 700, border: `1px solid ${BORDER}` }}>{r.nature}</td>
                        <td style={{ padding: "7px 10px", textAlign: "center", border: `1px solid ${BORDER}` }}>{r.amount ? peso(r.amount) : "—"}</td>
                        <td style={{ padding: "7px 10px", textAlign: "right", border: `1px solid ${BORDER}` }}>{r.Enrollment ? peso(r.Enrollment) : "—"}</td>
                        <td style={{ padding: "7px 10px", textAlign: "right", border: `1px solid ${BORDER}` }}>{r.Midterm ? peso(r.Midterm) : "—"}</td>
                        <td style={{ padding: "7px 10px", textAlign: "right", border: `1px solid ${BORDER}` }}>{r.Finals ? peso(r.Finals) : "—"}</td>
                        <td style={{ padding: "7px 10px", textAlign: "right", border: `1px solid ${BORDER}`, fontWeight: 700, color: r.balance > 0 ? "#DC2626" : "#15803D" }}>{peso(r.balance)}</td>
                        <td style={{ padding: "7px 10px", textAlign: "right", fontWeight: 800, border: `1px solid ${BORDER}` }}>{peso(r.total)}</td>
                      </tr>
                    ))}
                    {rows.length > 0 && (
                      <tr style={{ background: "#FAFAF7", fontWeight: 800 }}>
                        <td style={{ padding: "8px 10px", border: `1px solid ${BORDER}` }}>TOTAL</td>
                        <td style={{ padding: "8px 10px", textAlign: "center", border: `1px solid ${BORDER}` }}>{peso(gAmt)}</td>
                        <td style={{ padding: "8px 10px", textAlign: "right", border: `1px solid ${BORDER}` }}>{peso(cT("Enrollment"))}</td>
                        <td style={{ padding: "8px 10px", textAlign: "right", border: `1px solid ${BORDER}` }}>{peso(cT("Midterm"))}</td>
                        <td style={{ padding: "8px 10px", textAlign: "right", border: `1px solid ${BORDER}` }}>{peso(cT("Finals"))}</td>
                        <td style={{ padding: "8px 10px", textAlign: "right", border: `1px solid ${BORDER}`, color: (gAmt - gTot) > 0 ? "#DC2626" : "#15803D" }}>{peso(gAmt - gTot)}</td>
                        <td style={{ padding: "8px 10px", textAlign: "right", color: DARK_GREEN, border: `1px solid ${BORDER}` }}>{peso(gTot)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── CASHIER — PAYMENT TRACKING (per-student, per year & semester) ───────────
export function PaymentTracking({ perms = {}, isAdmin = false }) {
  // Boxes auto-fill from real payments; only an administrator may manually override.
  const canEdit = !!isAdmin;
  const [students, setStudents] = useState([]);
  const [paid, setPaid] = useState({}); // { `${studentId}-${year}-${sem}`: {box1,box2} } — saved in DB
  const [collections, setCollections] = useState([]);
  const [fees, setFees] = useState([]); // all configured charges: { name, amount, year_level, semester }
  const [fCourse, setFCourse] = useState("");
  const [fYear, setFYear] = useState("");
  const [fSection, setFSection] = useState("");
  const [search, setSearch] = useState("");
  const syncedRef = useRef(false);

  useEffect(() => {
    fetch(`${API}/api/erd/students?t=${Date.now()}`, { cache: "no-store" })
      .then(r => r.ok ? r.json() : []).then(d => setStudents(Array.isArray(d) ? d : [])).catch(() => {});
    fetch(`${API}/api/erd/cashier/payments?t=${Date.now()}`, { cache: "no-store" })
      .then(r => r.ok ? r.json() : []).then(d => {
        const m = {};
        (Array.isArray(d) ? d : []).forEach(p => { m[`${p.student_id}-${p.year_level}-${p.semester}`] = { box1: !!p.box1, box2: !!p.box2 }; });
        setPaid(m);
      }).catch(() => {});
    fetch(`${API}/api/erd/cashier/collections?t=${Date.now()}`, { cache: "no-store" })
      .then(r => r.ok ? r.json() : []).then(d => setCollections(Array.isArray(d) ? d : [])).catch(() => {});
    fetch(`${API}/api/erd/cashier/natures?t=${Date.now()}`, { cache: "no-store" })
      .then(r => r.ok ? r.json() : []).then(async nats => {
        const arr = Array.isArray(nats) ? nats : [];
        const lists = await Promise.all(arr.map(n =>
          fetch(`${API}/api/erd/cashier/natures/${n.id}/charges?t=${Date.now()}`, { cache: "no-store" })
            .then(r => r.ok ? r.json() : []).then(d => (Array.isArray(d) ? d : []).map(c => ({ name: c.name, amount: c.amount, year_level: c.year_level, semester: c.semester }))).catch(() => [])
        ));
        setFees(lists.flat());
      }).catch(() => {});
  }, []);

  // Auto-derive checkboxes from real payment data:
  //   box1 = the student has any collection record for that year/semester
  //   box2 = fully paid (total paid ≥ total configured fees for that term, no balance)
  const digit = (v) => { const m = String(v || "").match(/(\d)/); return m ? +m[1] : 0; };
  const norm = (s) => String(s || "").replace(/\s+/g, " ").trim().toLowerCase();
  const tokens = (s) => norm(s).split(" ").filter(Boolean);
  // A receipt belongs to a student if the student's first AND last name both
  // appear among the payer-name tokens (order/middle-name insensitive).
  const nameMatches = (payer, s) => {
    const pt = tokens(payer);
    if (!pt.length) return false;
    const first = norm(s.first_name), last = norm(s.last_name);
    return (!first || pt.includes(first)) && (!last || pt.includes(last)) && (first || last);
  };
  const derived = useMemo(() => {
    // Total configured fees per term `${y}-${sem}`.
    const feeTotal = {};
    fees.forEach(f => { const k = `${digit(f.year_level)}-${digit(f.semester)}`; feeTotal[k] = (feeTotal[k] || 0) + toNum(f.amount); });
    const out = {};
    students.forEach(s => {
      const hasRecord = {}; // `${y}-${sem}` -> true if any receipt exists
      const settledByTerm = {}; // `${y}-${sem}` -> total settled (amount paid + discount)
      collections.forEach(c => {
        if (!nameMatches(c.payer_name, s)) return;
        const y = digit(c.pay_year) || digit(c.year_level); const sem = digit(c.pay_sem) || 1;
        const k = `${y}-${sem}`;
        hasRecord[k] = true;
        let items = []; try { items = JSON.parse(c.items || "[]"); } catch { items = []; }
        const paidSum = items.reduce((a, it) => a + toNum(it.amount), 0) || toNum(c.total);
        const discSum = items.reduce((a, it) => a + toNum(it.discount), 0);
        settledByTerm[k] = (settledByTerm[k] || 0) + paidSum + discSum;
      });
      Object.keys(hasRecord).forEach(k => {
        const [y, sem] = k.split("-");
        const total = feeTotal[k] || 0;
        const box1 = true;                                              // has a payment record → partially paid
        const box2 = total > 0 && settledByTerm[k] >= total - 0.001;    // fully paid (paid + discount ≥ fees) → no balance
        out[`${s.id}-${y}-${sem}`] = { box1, box2 };
      });
    });
    return out;
  }, [students, collections, fees]);

  // NOTE: derived values are DISPLAY-ONLY. We never auto-write payment rows to the
  // DB — a record is created only when the cashier ticks a box or a real receipt exists.

  const toggle = async (sid, y, sem, which) => {
    const k = `${sid}-${y}-${sem}`;
    const cur = paid[k] || { box1: false, box2: false };
    const next = { ...cur, [which]: !cur[which] };
    setPaid(p => ({ ...p, [k]: next }));
    try {
      await fetch(`${API}/api/erd/cashier/payments`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_id: sid, year_level: y, semester: sem, box1: next.box1, box2: next.box2 }),
      });
    } catch { setPaid(p => ({ ...p, [k]: cur })); }
  };

  const matHead = { padding: "6px 8px", fontSize: 10.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.3, textAlign: "center", border: `1px solid ${BORDER}` };
  const matCell = { padding: "6px 8px", textAlign: "center", border: `1px solid ${BORDER}`, color: "#374151" };
  const fInp = { padding: "6px 9px", border: `1.5px solid ${BORDER}`, borderRadius: 7, fontSize: 12, outline: "none", background: WHITE };

  const uniq = (vals) => [...new Set(vals.filter(Boolean).map(v => String(v).trim()))].sort();
  const courseOpts = uniq(students.map(s => s.course));
  const yearOpts = uniq(students.map(s => s.year_level));
  const sectionOpts = uniq(students.map(s => s.section));
  const filteredStudents = students.filter(s => {
    if (fCourse && String(s.course || "").trim() !== fCourse) return false;
    if (fYear && String(s.year_level || "").trim() !== fYear) return false;
    if (fSection && String(s.section || "").trim() !== fSection) return false;
    if (search.trim()) {
      const name = [s.first_name, s.middle_name, s.last_name].filter(Boolean).join(" ");
      if (!`${s.student_number || ""} ${name}`.toLowerCase().includes(search.trim().toLowerCase())) return false;
    }
    return true;
  });

  return (
    <div style={{ fontFamily: "system-ui,-apple-system,sans-serif" }}>
      <div style={{ background: GREEN, color: WHITE, padding: "16px", borderRadius: 10, fontSize: 22, fontWeight: 900, letterSpacing: 0.8, marginBottom: 16, textAlign: "center" }}>
        PAYMENT TRACKING
      </div>
      <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
          <p style={{ margin: 0, fontSize: 12, color: GRAY }}>Only enrolled year/semester columns can be checked. A check marks that term <b>Paid</b>.</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <select value={fCourse} onChange={e => setFCourse(e.target.value)} style={fInp}>
              <option value="">All Courses</option>
              {courseOpts.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={fYear} onChange={e => setFYear(e.target.value)} style={fInp}>
              <option value="">All Years</option>
              {yearOpts.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select value={fSection} onChange={e => setFSection(e.target.value)} style={fInp}>
              <option value="">All Sections</option>
              {sectionOpts.map(sec => <option key={sec} value={sec}>{sec}</option>)}
            </select>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search ID or name…" style={{ ...fInp, minWidth: 180 }} />
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 760 }}>
            <thead>
              <tr style={{ background: "#F3F7EE", color: DARK_GREEN }}>
                <th rowSpan={2} style={{ ...matHead, minWidth: 110 }}>Student ID #</th>
                <th rowSpan={2} style={{ ...matHead, minWidth: 200 }}>Full Name</th>
                <th rowSpan={2} style={{ ...matHead, minWidth: 120 }}>Block/Section</th>
                {CASH_YEARS.map(yr => <th key={yr.y} colSpan={2} style={matHead}>{yr.label}</th>)}
              </tr>
              <tr style={{ background: "#F3F7EE", color: DARK_GREEN }}>
                {CASH_YEARS.map(yr => [
                  <th key={`${yr.y}-1`} style={{ ...matHead, minWidth: 42 }}>1st</th>,
                  <th key={`${yr.y}-2`} style={{ ...matHead, minWidth: 42 }}>2nd</th>,
                ])}
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr><td colSpan={11} style={{ padding: 14, color: GRAY }}>No students found.</td></tr>
              ) : filteredStudents.map(s => {
                const name = [s.first_name, s.middle_name, s.last_name].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
                return (
                  <tr key={s.id} style={{ borderTop: `1px solid ${BORDER}` }}>
                    <td style={{ ...matCell, fontWeight: 700 }}>{s.student_number || "—"}</td>
                    <td style={{ ...matCell, textAlign: "left" }}>{name || "—"}</td>
                    <td style={matCell}>{s.section || "—"}</td>
                    {CASH_YEARS.map(yr => [1, 2].map(sem => {
                      const unlocked = cellUnlocked(s, yr.y, sem);
                      const sv = cellVal(paid, s.id, yr.y, sem);
                      const dv = derived[`${s.id}-${yr.y}-${sem}`] || { box1: false, box2: false };
                      const v = { box1: sv.box1 || dv.box1, box2: sv.box2 || dv.box2 };
                      return (
                        <td key={`${yr.y}-${sem}`} style={{ ...matCell, background: unlocked ? WHITE : "#F5F5F4" }}>
                          {unlocked ? (
                            <span style={{ display: "inline-flex", gap: 6, justifyContent: "center" }}>
                              <input type="checkbox" title="1st payment" checked={v.box1} disabled={!canEdit} onChange={() => canEdit && toggle(s.id, yr.y, sem, "box1")} style={{ width: 15, height: 15, accentColor: GREEN, cursor: canEdit ? "pointer" : "not-allowed" }} />
                              <input type="checkbox" title="2nd payment" checked={v.box2} disabled={!canEdit} onChange={() => canEdit && toggle(s.id, yr.y, sem, "box2")} style={{ width: 15, height: 15, accentColor: GREEN, cursor: canEdit ? "pointer" : "not-allowed" }} />
                            </span>
                          ) : <span style={{ color: "#C4C4C4" }}>—</span>}
                        </td>
                      );
                    }))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── RECORD OF COLLECTION AND DEPOSIT (Collector) — printable, date-ranged ────
export function CollectorRecord() {
  const [rows, setRows] = useState([]);
  const now = new Date();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [treasurer, setTreasurer] = useState(null);
  const [collector, setCollector] = useState(null);
  useEffect(() => {
    fetch(`${API}/api/erd/cashier/collections?t=${Date.now()}`, { cache: "no-store" })
      .then(r => r.ok ? r.json() : []).then(d => setRows(Array.isArray(d) ? d : [])).catch(() => {});
    fetch(`${API}/api/erd/users?t=${Date.now()}`, { cache: "no-store" })
      .then(r => r.ok ? r.json() : []).then(list => {
        const arr = Array.isArray(list) ? list : [];
        const matches = (u, kw) => { const n = (v) => String(v || "").toLowerCase().replace(/_/g, " "); return n(u.designation).includes(kw) || (Array.isArray(u.roles) && u.roles.some(r => n(r).includes(kw))); };
        const t = arr.find(u => matches(u, "municipal treasurer"));
        if (t) setTreasurer(t);
        const c = arr.find(u => matches(u, "collecting officer") || matches(u, "mto collecting"));
        if (c) setCollector(c);
      }).catch(() => {});
  }, []);

  const dateOf = (r) => String(r.or_date || r.date_posted || (r.created_at ? String(r.created_at).slice(0, 10) : "")).slice(0, 10);
  const inRange = (d) => { if (!d) return false; if (from && d < from) return false; if (to && d > to) return false; return true; };
  const filtered = rows.filter(r => inRange(dateOf(r))).sort((a, b) => dateOf(a).localeCompare(dateOf(b)));
  const peso = (n) => "₱" + Number(toNum(n)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const total = filtered.reduce((s, r) => s + toNum(r.total), 0);
  const fmt = (d) => d ? new Date(d + "T00:00:00").toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }) : "__________";
  const natureOf = (r) => { try { const it = JSON.parse(r.items || "[]"); return it.map(x => x.nature).filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(", "); } catch { return ""; } };

  const treasurerName = treasurer ? [treasurer.first_name, treasurer.middle_name, treasurer.last_name].filter(Boolean).join(" ").replace(/\s+/g, " ").trim() : "";
  const treasurerDesig = treasurer ? (treasurer.designation || "Municipal Treasurer") : "";
  const collectorName = collector ? [collector.first_name, collector.middle_name, collector.last_name].filter(Boolean).join(" ").replace(/\s+/g, " ").trim() : "";

  const doPrint = () => {
    const win = window.open("", "_blank", "width=900,height=1100");
    if (!win) return;
    const rowsHtml = filtered.length ? filtered.map((r, i) => `
      <tr>
        <td style="text-align:center">${i + 1}</td>
        <td style="text-align:center">${dateOf(r) || "—"}</td>
        <td style="text-align:center">${(r.acct_left || "PL")} ${r.or_number || ""} ${(r.acct_right || "C")}</td>
        <td>${r.payer_name || "—"}</td>
        <td>${natureOf(r) || "—"}</td>
        <td style="text-align:right">${peso(r.total)}</td>
      </tr>`).join("") : `<tr><td colspan="6" style="text-align:center;padding:20px;color:#666">No collections in this period.</td></tr>`;
    win.document.write(`<!doctype html><html><head><title>Record of Collection and Deposit</title>
      <style>
        *{font-family:'Times New Roman',Times,serif;color:#000}
        table{border-collapse:collapse;width:100%}
        .rec th,.rec td{border:1px solid #000;padding:5px 7px;font-size:11pt}
        .rec th{background:#eee}
      </style></head><body style="padding:28px 40px">
      <table style="width:100%;margin-bottom:4px"><tr>
        <td style="width:100px;text-align:center"><img src="${alangalangLogo}" style="width:80px;height:80px;object-fit:contain"/></td>
        <td style="text-align:center">
          <div style="font-size:12.5pt">Republic of the Philippines</div>
          <div style="font-size:16pt;font-weight:900;text-transform:uppercase">Community College of Alangalang</div>
          <div style="font-size:12.5pt">Alangalang, Leyte</div>
        </td>
        <td style="width:100px;text-align:center"><img src="${ccaLogo}" style="width:80px;height:80px;object-fit:contain"/></td>
      </tr></table>
      <div style="text-align:center;font-size:15pt;font-weight:900;letter-spacing:2px;text-transform:uppercase;margin:6px 0 2px">Record of Collection and Deposit</div>
      <div style="border-top:2.5px solid #000;border-bottom:1px solid #000;height:3px;margin:2px 0 8px"></div>
      <div style="font-size:11pt;margin-bottom:10px">Period — <b>From:</b> ${fmt(from)} &nbsp;&nbsp; <b>To:</b> ${fmt(to)}</div>
      <table class="rec">
        <thead><tr><th style="width:34px">#</th><th style="width:90px">Date</th><th style="width:120px">OR No.</th><th>Payor</th><th>Nature of Collection</th><th style="width:100px">Amount</th></tr></thead>
        <tbody>${rowsHtml}
          <tr><td colspan="5" style="text-align:right;font-weight:800">TOTAL</td><td style="text-align:right;font-weight:800">${peso(total)}</td></tr>
        </tbody>
      </table>
      <div style="margin-top:60px;display:flex;justify-content:space-between;font-size:11pt">
        <div style="text-align:center">
          <div style="display:inline-block;width:250px;text-align:center">
            <div style="font-weight:800;text-transform:uppercase;margin-top:40px">${collectorName || "&nbsp;"}</div>
            <div style="border-top:1px solid #000;width:100%;margin:2px 0 0"></div>
            <div style="font-size:10pt">Collecting Officer</div>
          </div>
        </div>
        <div style="text-align:center;margin-top:50px">
          <div style="display:inline-block;width:250px;text-align:center">
            <div style="text-align:left;margin-bottom:40px">Verified by:</div>
            <div style="font-weight:800;text-transform:uppercase">${treasurerName || "&nbsp;"}</div>
            <div style="border-top:1px solid #000;width:100%;margin:2px 0 0"></div>
            <div style="font-size:10pt">${treasurerDesig || "Municipal Treasurer"}</div>
          </div>
        </div>
      </div>
      </body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  };

  const inp = { padding: "7px 10px", border: `1.5px solid ${BORDER}`, borderRadius: 7, fontSize: 12.5, outline: "none" };
  const lbl = { fontSize: 10, fontWeight: 700, color: GRAY, textTransform: "uppercase", letterSpacing: 0.3, display: "block", marginBottom: 3 };

  return (
    <div style={{ fontFamily: "system-ui,-apple-system,sans-serif" }}>
      <div style={{ background: GREEN, color: WHITE, padding: "16px", borderRadius: 10, fontSize: 20, fontWeight: 900, letterSpacing: 0.6, marginBottom: 16, textAlign: "center" }}>
        RECORD OF COLLECTION AND DEPOSIT (COLLECTOR)
      </div>
      <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 18 }}>
        <div style={{ display: "flex", gap: 14, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 16 }}>
          <div><label style={lbl}>From (date)</label>
            <CalendarPicker value={from} onChange={setFrom} placeholder="Pick a date…" />
          </div>
          <div><label style={lbl}>To (date)</label>
            <CalendarPicker value={to} onChange={setTo} placeholder="Pick a date…" />
          </div>
          <div style={{ marginLeft: "auto", fontSize: 13, fontWeight: 700, color: DARK_GREEN }}>Total: {peso(total)}</div>
          <button type="button" onClick={doPrint} disabled={filtered.length === 0} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 18px", background: filtered.length ? `linear-gradient(135deg, ${DARK_GREEN}, ${GREEN})` : "#9CA3AF", color: WHITE, border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: filtered.length ? "pointer" : "default" }}>
            🖨 Print
          </button>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: "#F3F7EE", color: DARK_GREEN }}>
                {["#", "Date", "OR No.", "Payor", "Nature", "Amount"].map(h => (
                  <th key={h} style={{ padding: "8px 10px", fontSize: 10.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.3, textAlign: h === "Amount" ? "right" : "left", border: `1px solid ${BORDER}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 20, textAlign: "center", color: GRAY, border: `1px solid ${BORDER}` }}>No collections in this period. Pick a From/To range.</td></tr>
              ) : filtered.map((r, i) => (
                <tr key={r.id} style={{ borderTop: `1px solid ${BORDER}` }}>
                  <td style={{ padding: "6px 10px", textAlign: "center", border: `1px solid ${BORDER}` }}>{i + 1}</td>
                  <td style={{ padding: "6px 10px", border: `1px solid ${BORDER}` }}>{dateOf(r) || "—"}</td>
                  <td style={{ padding: "6px 10px", border: `1px solid ${BORDER}` }}>{`${r.acct_left || "PL"} ${r.or_number || ""} ${r.acct_right || "C"}`}</td>
                  <td style={{ padding: "6px 10px", border: `1px solid ${BORDER}` }}>{r.payer_name || "—"}</td>
                  <td style={{ padding: "6px 10px", border: `1px solid ${BORDER}` }}>{natureOf(r) || "—"}</td>
                  <td style={{ padding: "6px 10px", textAlign: "right", fontWeight: 700, border: `1px solid ${BORDER}` }}>{peso(r.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
