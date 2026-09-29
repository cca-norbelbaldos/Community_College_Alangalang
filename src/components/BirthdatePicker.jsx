import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MONTHS, toYmd, todayYmd, parseDateInput, formatDate, ageOn } from "../utils/date";

const GREEN  = "#3d6e01";
const BORDER = "#E5E7EB";
const GRAY   = "#6B7280";
const RED    = "#DC2626";
const DOW    = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

/**
 * Birthdate field: type it or pick it.
 *
 * Replaces <input type="date">, whose native picker walks one month at a time --
 * reaching 1999 from today is hundreds of clicks. Here year and month are
 * dropdowns, so any birthdate is two picks away, and the field itself stays
 * typeable for anyone who would rather just key it in.
 *
 * value/onChange speak YYYY-MM-DD, the same shape the API and <input type="date">
 * use, so this drops into existing form state unchanged.
 */
export default function BirthdatePicker({
  value = "",
  onChange,
  inputStyle = {},
  placeholder = "Select or type a date...",
  showAge = true,
  allowFuture = false,
  disabled = false,
  id,
}) {
  const [open, setOpen] = useState(false);
  // Non-null only while the field is being edited. The displayed text is
  // otherwise derived straight from `value`, so there is no mirrored state to
  // keep in sync with the prop and no effect that writes state on every render.
  const [draft, setDraft] = useState(null);
  const [bad, setBad] = useState(false);
  const now = new Date();
  const [vY, setVY] = useState(now.getFullYear());
  const [vM, setVM] = useState(now.getMonth());
  const [pos, setPos] = useState(null);

  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const popRef = useRef(null);

  const editing = draft !== null;
  const text = editing ? draft : formatDate(value);
  const max = allowFuture ? null : todayYmd();

  const years = useMemo(() => {
    const cur = new Date().getFullYear();
    const list = [];
    for (let y = cur; y >= cur - 100; y--) list.push(y);
    const selY = value ? +String(value).slice(0, 4) : null;   // keep an out-of-range stored year reachable
    if (selY && !list.includes(selY)) { list.push(selY); list.sort((a, b) => b - a); }
    return list;
  }, [value]);

  const place = () => {
    const r = wrapRef.current?.getBoundingClientRect();
    if (!r) return;
    const H = 330, W = 286;
    const below = window.innerHeight - r.bottom;
    setPos({
      top: below < H && r.top > below ? Math.max(8, r.top - H - 4) : r.bottom + 4,
      left: Math.min(Math.max(8, r.left), Math.max(8, window.innerWidth - W - 8)),
    });
  };

  const openCal = () => {
    if (disabled) return;
    const base = value ? new Date(+String(value).slice(0, 4), +String(value).slice(5, 7) - 1, 1) : new Date();
    setVY(base.getFullYear());
    setVM(base.getMonth());
    place();
    setOpen(true);
  };

  // Follow the surrounding modal as it scrolls; close on outside click or Esc.
  useEffect(() => {
    if (!open) return;
    const reposition = () => place();
    const onKey = (e) => {
      if (e.key === "Escape") { e.stopPropagation(); setOpen(false); inputRef.current?.focus(); }
    };
    const onDown = (e) => {
      if (wrapRef.current?.contains(e.target) || popRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("mousedown", onDown, true);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("mousedown", onDown, true);
    };
  }, [open]);

  // Returns false when the text could not be understood, so the caller can put
  // the last good value back rather than silently wiping the field.
  const commit = (raw) => {
    const parsed = parseDateInput(raw);
    if (parsed === null || (parsed && max && parsed > max)) { setBad(true); return false; }
    setBad(false);
    setDraft(null);
    if (parsed !== value) onChange?.(parsed);
    return true;
  };

  const pick = (ymd) => {
    setDraft(null);
    setBad(false);
    onChange?.(ymd);
    setOpen(false);
  };

  const shift = (n) => {
    const d = new Date(vY, vM + n, 1);
    setVY(d.getFullYear());
    setVM(d.getMonth());
  };

  const age = showAge && !editing ? ageOn(value) : null;

  const navBtn = {
    background: "none", border: "none", cursor: "pointer",
    fontSize: "17px", color: GREEN, lineHeight: 1, padding: "0 6px",
  };
  const selStyle = {
    border: `1px solid ${BORDER}`, borderRadius: "6px", padding: "3px 6px",
    fontSize: "12px", color: "#111", cursor: "pointer", background: "#fff",
  };

  const grid = () => {
    const first = new Date(vY, vM, 1).getDay();
    const days = new Date(vY, vM + 1, 0).getDate();
    const today = todayYmd();
    const cells = [];
    for (let i = 0; i < first; i++) cells.push(<div key={`e${i}`} />);
    for (let d = 1; d <= days; d++) {
      const ymd = toYmd(vY, vM + 1, d);
      const isSel = value === ymd;
      const isToday = ymd === today;
      const off = max && ymd > max;
      cells.push(
        <button
          key={d}
          type="button"
          disabled={off}
          onClick={() => pick(ymd)}
          title={off ? "A birthdate cannot be in the future" : formatDate(ymd)}
          style={{
            textAlign: "center", fontSize: "12px", padding: "6px 0", borderRadius: "50%",
            cursor: off ? "not-allowed" : "pointer",
            background: isSel ? GREEN : "transparent",
            color: off ? "#D1D5DB" : isSel ? "#fff" : isToday ? GREEN : "#111",
            fontWeight: isSel || isToday ? 700 : 400,
            border: isToday && !isSel ? `1px solid ${GREEN}` : "1px solid transparent",
          }}
        >
          {d}
        </button>
      );
    }
    return <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: "2px" }}>{cells}</div>;
  };

  return (
    <div ref={wrapRef} style={{ position: "relative", display: "flex", alignItems: "center", width: "100%" }}>
      <input
        id={id}
        ref={inputRef}
        disabled={disabled}
        value={text}
        placeholder={placeholder}
        aria-invalid={bad || undefined}
        onChange={(e) => { setDraft(e.target.value); setBad(false); }}
        onBlur={(e) => {
          if (popRef.current?.contains(e.relatedTarget)) return;   // clicking the calendar is not leaving
          if (!editing) return;
          if (!commit(draft)) setDraft(null);                      // typo -> restore the last good value
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); if (editing && commit(draft)) setOpen(false); }
          if (e.key === "ArrowDown" && !open) { e.preventDefault(); openCal(); }
        }}
        style={{
          width: "100%", padding: "4px 6px", border: "none", outline: "none",
          fontSize: "12px", boxSizing: "border-box", background: "transparent",
          color: bad ? RED : "#000", minWidth: 0, ...inputStyle,
        }}
      />
      {age !== null && (
        <span style={{ fontSize: "10px", color: GRAY, whiteSpace: "nowrap", padding: "0 4px" }}>age {age}</span>
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openCal())}
        title="Open calendar"
        aria-label="Open calendar"
        style={{
          background: "none", border: "none", cursor: disabled ? "default" : "pointer",
          color: GREEN, padding: "2px 4px", display: "flex", alignItems: "center", flexShrink: 0,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </button>

      {open && pos && createPortal(
        <div
          ref={popRef}
          style={{
            position: "fixed", top: pos.top, left: pos.left, width: "286px",
            background: "#fff", border: `1px solid ${BORDER}`, borderRadius: "10px",
            boxShadow: "0 8px 28px rgba(0,0,0,0.18)", padding: "12px",
            zIndex: 2147483647,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
            <button type="button" onClick={() => shift(-1)} style={navBtn} aria-label="Previous month">‹</button>
            <div style={{ display: "flex", gap: "6px" }}>
              <select value={vM} onChange={(e) => setVM(+e.target.value)} style={selStyle} aria-label="Month">
                {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
              </select>
              <select value={vY} onChange={(e) => setVY(+e.target.value)} style={selStyle} aria-label="Year">
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <button type="button" onClick={() => shift(1)} style={navBtn} aria-label="Next month">›</button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: "2px", marginBottom: "4px" }}>
            {DOW.map(d => <div key={d} style={{ textAlign: "center", fontSize: "10px", fontWeight: 700, color: "#9CA3AF" }}>{d}</div>)}
          </div>
          {grid()}

          <div style={{ marginTop: "10px", paddingTop: "8px", borderTop: "1px solid #F3F4F6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button type="button" onClick={() => pick("")} style={{ fontSize: "11px", color: RED, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>✕ Clear</button>
            <span style={{ fontSize: "10px", color: GRAY }}>or type 7/14/1999</span>
            <button type="button" onClick={() => setOpen(false)} style={{ fontSize: "11px", color: GRAY, background: "none", border: "none", cursor: "pointer" }}>Close</button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
