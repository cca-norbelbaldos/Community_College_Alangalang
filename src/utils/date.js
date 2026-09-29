// Date helpers for the YYYY-MM-DD strings used by the API and by form state.
// Kept out of the picker component so that file exports only a component and
// React Fast Refresh keeps working.

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const pad = (n) => String(n).padStart(2, "0");

export const toYmd = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;

export const todayYmd = () => {
  const t = new Date();
  return toYmd(t.getFullYear(), t.getMonth() + 1, t.getDate());
};

// Build a YYYY-MM-DD string, but only for a date that actually exists.
// Rejects Feb 30, month 13, day 0 and similar, which Date() would silently
// roll over into the following month instead of reporting as invalid.
const build = (y, m, d) => {
  if (!(y >= 1000 && y <= 9999) || !(m >= 1 && m <= 12) || !(d >= 1 && d <= 31)) return null;
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
  return toYmd(y, m, d);
};

// "99" -> 1999, "05" -> 2005. Two-digit years at or below the current year's
// last two digits read as this century, everything above as the last one.
const expandYear = (n, digits) => {
  if (digits >= 3) return n;
  const cc = new Date().getFullYear() % 100;
  return n <= cc ? 2000 + n : 1900 + n;
};

const monthFromWord = (w) => {
  const s = String(w || "").toLowerCase().replace(/\.$/, "");
  if (s.length < 3) return 0;
  const i = MONTHS.findIndex(m => m.toLowerCase().startsWith(s));
  return i < 0 ? 0 : i + 1;
};

/**
 * Parse a date a person typed.
 * Accepts 1999-07-14, 7/14/1999, 07-14-99, "Jul 14, 1999", "14 July 1999".
 * Slash/dash numeric form is read US-style (month first), matching the
 * en-US formatting used everywhere else in this app.
 *
 * Returns a YYYY-MM-DD string, "" for empty input, or null when unparseable --
 * so callers can tell "cleared on purpose" apart from "typo, keep what we had".
 */
export const parseDateInput = (raw) => {
  const s = String(raw || "").trim();
  if (!s) return "";

  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);          // ISO
  if (m) return build(+m[1], +m[2], +m[3]);

  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);            // US M/D/Y
  if (m) return build(expandYear(+m[3], m[3].length), +m[1], +m[2]);

  const parts = s.replace(/,/g, " ").replace(/\s+/g, " ").trim().split(" ");
  if (parts.length === 3) {
    const [a, b, c] = parts;
    const mo = monthFromWord(a);                                      // Jul 14 1999
    if (mo && /^\d{1,2}$/.test(b) && /^\d{2,4}$/.test(c)) return build(expandYear(+c, c.length), mo, +b);
    const mo2 = monthFromWord(b);                                     // 14 July 1999
    if (mo2 && /^\d{1,2}$/.test(a) && /^\d{2,4}$/.test(c)) return build(expandYear(+c, c.length), mo2, +a);
  }
  return null;
};

/** "1999-07-14" -> "Jul 14, 1999" */
export const formatDate = (ymd) => {
  if (!ymd) return "";
  const [y, m, d] = String(ymd).split("-").map(Number);
  if (!y || !m || !d) return "";
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

/** Whole years from the given date to today, or null if that isn't a sane age. */
export const ageOn = (ymd) => {
  if (!ymd) return null;
  const [y, m, d] = String(ymd).split("-").map(Number);
  if (!y || !m || !d) return null;
  const t = new Date();
  let a = t.getFullYear() - y;
  if (t.getMonth() + 1 < m || (t.getMonth() + 1 === m && t.getDate() < d)) a--;
  return a >= 0 && a < 150 ? a : null;
};
