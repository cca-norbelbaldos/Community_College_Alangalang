import { useEffect, useMemo, useState } from "react";
import ccaLogo from "../assets/cca_logo.jpg";
import alangalangLogo from "../assets/Alangalang.png";

const DARK_GREEN = "#3d6e01";
const WHITE      = "#FFFFFF";
const GRAY       = "#6B7280";
const LIGHT_GRAY = "#F9FAFB";
const BORDER     = "#E5E7EB";
const GREEN      = "#16A34A";
const RED        = "#DC2626";
const AMBER      = "#B45309";
const BLUE       = "#1E88E5";

const API = import.meta.env.VITE_API_URL;
const STATUS = { P: "Present", L: "Late", A: "Absent" };

export default function AttendanceAdmin() {
  const [rows, setRows]     = useState([]);
  const [loading, setLoad]  = useState(true);
  const [fDate, setFDate]   = useState("");
  const [fFac, setFFac]     = useState("");
  const [open, setOpen]     = useState(null); // expanded group key

  const fetchRows = () => {
    setLoad(true);
    const p = new URLSearchParams();
    if (fDate) p.set("date", fDate);
    fetch(`${API}/api/erd/attendance?${p}`)
      .then(r => r.ok ? r.json() : [])
      .then(d => { setRows(Array.isArray(d) ? d : []); setLoad(false); })
      .catch(() => setLoad(false));
  };
  useEffect(fetchRows, [fDate]);

  const faculties = useMemo(() => [...new Set(rows.map(r => r.faculty_name).filter(Boolean))].sort(), [rows]);

  // Group into class sessions: date + faculty + subject + section.
  const groups = useMemo(() => {
    const g = {};
    rows.filter(r => !fFac || r.faculty_name === fFac).forEach(r => {
      const key = `${r.att_date}||${r.faculty_id}||${r.subject_id}||${r.section || ""}`;
      if (!g[key]) g[key] = {
        key, date: String(r.att_date).slice(0, 10), faculty: r.faculty_name || "—",
        subject_code: r.subject_code, subject_title: r.subject_title, section: r.section,
        P: 0, L: 0, A: 0, students: [],
      };
      g[key][r.status] = (g[key][r.status] || 0) + 1;
      g[key].students.push(r);
    });
    return Object.values(g).sort((a, b) => (b.date.localeCompare(a.date)) || a.faculty.localeCompare(b.faculty));
  }, [rows, fFac]);

  const th = { padding: "10px 14px", textAlign: "left", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: WHITE, whiteSpace: "nowrap" };
  const td = { padding: "9px 14px", fontSize: "12px", color: "#111827", borderTop: `1px solid ${BORDER}`, verticalAlign: "top" };
  const sel = { padding: "8px 10px", border: `1px solid ${BORDER}`, borderRadius: "6px", fontSize: "13px", background: WHITE, cursor: "pointer" };
  const chip = (bg, c, t) => <span style={{ fontSize: "11px", fontWeight: 700, background: bg, color: c, padding: "2px 9px", borderRadius: "12px" }}>{t}</span>;
  const statusChip = (s) => s === "P" ? chip("#DCFCE7", GREEN, "Present") : s === "L" ? chip("#FEF3C7", AMBER, "Late") : chip("#FEE2E2", RED, "Absent");

  const doPrint = () => {
    const area = document.getElementById("att-print-area");
    if (!area) return;
    const mp = document.createElement("div");
    mp.id = "att-mp";
    const c = area.cloneNode(true);
    c.id = "att-mp-page";
    c.style.position = "static";
    c.style.left = "0";
    c.style.top = "0";
    mp.appendChild(c);
    document.body.appendChild(mp);
    const cleanup = () => { if (document.body.contains(mp)) document.body.removeChild(mp); window.removeEventListener("afterprint", cleanup); };
    window.addEventListener("afterprint", cleanup);
    window.print();
  };
  const TNR = '"Times New Roman", Times, serif';
  const RC = { border: "1px solid #333", padding: "3px 7px", fontSize: "8.5pt", fontFamily: TNR, verticalAlign: "middle" };
  const RH = { ...RC, background: "#3d6e01", color: "#fff", fontWeight: 700, textAlign: "center", fontSize: "8pt" };

  return (
    <div style={{ fontFamily: "system-ui, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
        <span style={{ fontSize: "20px" }}>🕘</span>
        <div>
          <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 900, color: DARK_GREEN }}>Student Attendance</h2>
          <p style={{ margin: "2px 0 0", fontSize: "12px", color: GRAY }}>Attendance submitted by faculty across all classes.</p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center", marginBottom: "14px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          <label style={{ fontSize: "9px", fontWeight: 700, color: GRAY, textTransform: "uppercase" }}>Date</label>
          <input type="date" style={sel} value={fDate} onChange={e => setFDate(e.target.value)} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          <label style={{ fontSize: "9px", fontWeight: 700, color: GRAY, textTransform: "uppercase" }}>Faculty</label>
          <select style={sel} value={fFac} onChange={e => setFFac(e.target.value)}>
            <option value="">All Faculty</option>
            {faculties.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        {(fDate || fFac) && (
          <button type="button" onClick={() => { setFDate(""); setFFac(""); }} style={{ ...sel, color: RED, marginTop: "14px" }}>Clear</button>
        )}
        <button type="button" onClick={fetchRows} style={{ ...sel, marginTop: "14px", fontWeight: 700, color: DARK_GREEN }}>Refresh</button>
        <button type="button" onClick={doPrint} disabled={groups.length === 0}
          style={{ marginTop: "14px", padding: "8px 16px", background: groups.length === 0 ? "#9CA3AF" : DARK_GREEN, color: WHITE, border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: 700, cursor: groups.length === 0 ? "default" : "pointer" }}>
          🖨 Print (8.5×13)
        </button>
        <span style={{ fontSize: "11px", color: GRAY, marginLeft: "auto", marginTop: "14px" }}>{groups.length} session(s)</span>
      </div>

      {/* Print styles + hidden printable report */}
      <style>{`
        @media print {
          @page { size: 8.5in 13in landscape; margin: 0.4in; }
          body * { visibility: hidden !important; }
          #att-mp, #att-mp * { visibility: visible !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          #att-mp { position: absolute !important; top: 0 !important; left: 0 !important; width: 100% !important; background: #fff !important; }
          #att-mp-page { position: static !important; left: 0 !important; top: 0 !important; width: 100% !important; }
          #att-mp-page tr { page-break-inside: avoid !important; }
          #att-mp-page thead { display: table-header-group !important; }
        }
      `}</style>
      <div id="att-print-area" style={{ position: "absolute", left: "-99999px", top: 0, width: "1100px", background: WHITE, fontFamily: TNR, color: "#000" }}>
        {/* CCA header — same as other forms */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "4px" }}><tbody><tr>
          <td style={{ width: "130px", textAlign: "center", verticalAlign: "middle" }}>
            <img src={alangalangLogo} alt="" style={{ width: 62, height: 62, objectFit: "contain" }} />
          </td>
          <td style={{ textAlign: "center", verticalAlign: "middle" }}>
            <div style={{ fontSize: "9pt" }}>Republic of the Philippines</div>
            <div style={{ fontSize: "15pt", fontWeight: 900, textTransform: "uppercase", letterSpacing: 1, lineHeight: 1.1 }}>Community College of Alangalang</div>
            <div style={{ fontSize: "9pt" }}>Alangalang, Leyte</div>
            <div style={{ fontSize: "11.5pt", fontWeight: 800, marginTop: 4, letterSpacing: 0.5 }}>STUDENT ATTENDANCE REPORT</div>
          </td>
          <td style={{ width: "130px", textAlign: "center", verticalAlign: "middle" }}>
            <img src={ccaLogo} alt="" style={{ width: 66, height: 66, objectFit: "contain" }} />
          </td>
        </tr></tbody></table>
        <div style={{ borderTop: "2px solid #000", margin: "4px 0 8px" }} />

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9pt", marginBottom: "6px" }}>
          <span>{fDate ? `Date: ${fDate}` : "All dates"}{fFac ? `  ·  Faculty: ${fFac}` : ""}  ·  {groups.length} session(s)</span>
          <span>Printed: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>
            <th style={RH}>Date</th><th style={RH}>Faculty</th><th style={RH}>Subject</th><th style={RH}>Section</th>
            <th style={RH}>Present</th><th style={RH}>Late</th><th style={RH}>Absent</th><th style={RH}>Total</th>
          </tr></thead>
          <tbody>
            {groups.map((g, i) => (
              <tr key={i}>
                <td style={RC}>{g.date}</td>
                <td style={{ ...RC, fontWeight: 700 }}>{g.faculty}</td>
                <td style={RC}>{[g.subject_code, g.subject_title].filter(Boolean).join(" — ")}</td>
                <td style={{ ...RC, textAlign: "center" }}>{g.section || "—"}</td>
                <td style={{ ...RC, textAlign: "center" }}>{g.P}</td>
                <td style={{ ...RC, textAlign: "center" }}>{g.L}</td>
                <td style={{ ...RC, textAlign: "center" }}>{g.A}</td>
                <td style={{ ...RC, textAlign: "center", fontWeight: 700 }}>{g.P + g.L + g.A}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ marginTop: "34px", display: "flex", justifyContent: "flex-end" }}>
          <div style={{ textAlign: "center", minWidth: "240px" }}>
            <div style={{ borderBottom: "1px solid #000", height: "20px" }} />
            <div style={{ fontSize: "8.5pt" }}>Verified by</div>
          </div>
        </div>
      </div>

      {/* Sessions table */}
      <div style={{ border: `1px solid ${BORDER}`, borderRadius: "10px", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr style={{ background: DARK_GREEN }}>
            <th style={th}>Date</th><th style={th}>Faculty</th><th style={th}>Subject</th><th style={th}>Section</th>
            <th style={{ ...th, textAlign: "center" }}>Present</th><th style={{ ...th, textAlign: "center" }}>Late</th>
            <th style={{ ...th, textAlign: "center" }}>Absent</th><th style={{ ...th, textAlign: "center" }}>Total</th><th style={{ ...th, textAlign: "right" }}></th>
          </tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ ...td, textAlign: "center", color: GRAY, padding: "24px" }}>Loading…</td></tr>
            ) : groups.length === 0 ? (
              <tr><td colSpan={9} style={{ ...td, textAlign: "center", color: GRAY, padding: "24px" }}>No attendance submitted yet.</td></tr>
            ) : groups.map((g, i) => {
              const tot = g.P + g.L + g.A;
              const isOpen = open === g.key;
              return (
                <>
                  <tr key={g.key} style={{ background: i % 2 ? LIGHT_GRAY : WHITE }}>
                    <td style={td}>{g.date}</td>
                    <td style={{ ...td, fontWeight: 700 }}>{g.faculty}</td>
                    <td style={td}>{g.subject_code ? <b style={{ color: BLUE }}>{g.subject_code}</b> : ""} {g.subject_title || ""}</td>
                    <td style={td}>{g.section || "—"}</td>
                    <td style={{ ...td, textAlign: "center", fontWeight: 700, color: GREEN }}>{g.P}</td>
                    <td style={{ ...td, textAlign: "center", fontWeight: 700, color: AMBER }}>{g.L}</td>
                    <td style={{ ...td, textAlign: "center", fontWeight: 700, color: RED }}>{g.A}</td>
                    <td style={{ ...td, textAlign: "center", fontWeight: 700 }}>{tot}</td>
                    <td style={{ ...td, textAlign: "right" }}>
                      <button type="button" onClick={() => setOpen(isOpen ? null : g.key)}
                        style={{ padding: "4px 10px", border: `1px solid ${BORDER}`, borderRadius: "5px", background: WHITE, fontSize: "11px", cursor: "pointer", color: DARK_GREEN, fontWeight: 700 }}>
                        {isOpen ? "Hide" : "View"}
                      </button>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr key={g.key + "-d"}>
                      <td colSpan={9} style={{ padding: "0 14px 12px", background: LIGHT_GRAY }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", background: WHITE, border: `1px solid ${BORDER}`, borderRadius: "8px", overflow: "hidden" }}>
                          <thead><tr style={{ background: "#2c4a1e" }}>
                            <th style={{ ...th, padding: "7px 12px" }}>ID Number</th><th style={{ ...th, padding: "7px 12px" }}>Student</th><th style={{ ...th, padding: "7px 12px", textAlign: "right" }}>Status</th>
                          </tr></thead>
                          <tbody>
                            {g.students.sort((a, b) => (a.student_name || "").localeCompare(b.student_name || "")).map((s, j) => (
                              <tr key={j} style={{ background: j % 2 ? LIGHT_GRAY : WHITE }}>
                                <td style={{ ...td, fontFamily: "monospace", color: BLUE }}>{s.student_number || "—"}</td>
                                <td style={{ ...td, fontWeight: 600 }}>{s.student_name || "—"}</td>
                                <td style={{ ...td, textAlign: "right" }}>{statusChip(s.status)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
