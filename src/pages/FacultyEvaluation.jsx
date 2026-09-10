import { useState, useEffect, useMemo } from "react";

const GREEN      = "#3d6e01";
const DARK_GREEN = "#2c4a1e";
const WHITE      = "#FFFFFF";
const GRAY       = "#6B7280";
const LIGHT_GRAY = "#F9FAFB";
const BORDER     = "#E5E7EB";
const API = import.meta.env.VITE_API_URL;

// Weighted areas — must match the student evaluation form.
const AREAS = [
  { code: "A", weight: 35, count: 5, title: "Mastery of Subject Matter" },
  { code: "B", weight: 30, count: 6, title: "Delivery of Instruction" },
  { code: "C", weight: 20, count: 5, title: "Presentation & Management" },
  { code: "D", weight: 15, count: 4, title: "Professional Behavior" },
];

export default function FacultyEvaluationReport() {
  const [evals, setEvals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [subjectSel, setSubjectSel] = useState({}); // { instructor: subject_code | "all" }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError("");
      try {
        const res = await fetch(`${API}/api/erd/faculty-evaluation?t=${Date.now()}`, { cache: "no-store" });
        if (cancelled) return;
        setEvals(res.ok ? await res.json() : []);
      } catch { if (!cancelled) setError("Unable to reach the server."); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  // Compute weighted stats for a set of evaluation records.
  const statsFor = (list) => {
    const areaAvg = {};
    AREAS.forEach(a => {
      const vals = [];
      list.forEach(e => {
        for (let i = 1; i <= a.count; i++) {
          const v = Number(e.ratings?.[`${a.code}${i}`]);
          if (v >= 1 && v <= 5) vals.push(v);
        }
      });
      areaAvg[a.code] = vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
    });
    const weighted = AREAS.reduce((s, a) => s + (areaAvg[a.code] / 5) * a.weight, 0);
    const overall = AREAS.reduce((s, a) => s + areaAvg[a.code], 0) / AREAS.length; // 1-5
    const comments = list.map(e => e.comments).filter(c => (c || "").trim());
    return { areaAvg, weighted, overall, comments, count: list.length };
  };

  // Group by instructor; each row reflects the selected subject (default: all).
  const ranked = useMemo(() => {
    const byInstr = new Map();
    evals.forEach(e => {
      const key = (e.instructor || "Unknown").trim() || "Unknown";
      if (!byInstr.has(key)) byInstr.set(key, []);
      byInstr.get(key).push(e);
    });
    const rows = [...byInstr.entries()].map(([instructor, list]) => {
      // Unique subjects assigned to this instructor.
      const subjMap = new Map();
      list.forEach(e => { if (e.subject_code) subjMap.set(e.subject_code, [e.subject_code, e.subject_title].filter(Boolean).join(" — ")); });
      const subjects = [...subjMap.entries()].map(([code, label]) => ({ code, label }));
      const sel = subjectSel[instructor] || "all";
      const shown = sel === "all" ? list : list.filter(e => e.subject_code === sel);
      return { instructor, subjects, sel, ...statsFor(shown) };
    });
    return rows.sort((a, b) => b.weighted - a.weighted);
  }, [evals, subjectSel]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? ranked.filter(r => r.instructor.toLowerCase().includes(q)) : ranked;
  }, [ranked, search]);

  const medal = (i) => (i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`);
  const scoreColor = (w) => (w >= 85 ? "#166534" : w >= 70 ? "#B45309" : "#B91C1C");

  return (
    <div style={{ fontFamily: "system-ui,-apple-system,sans-serif" }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: DARK_GREEN }}>Faculty Evaluation</div>
        <div style={{ fontSize: 13, color: GRAY, marginTop: 2 }}>Summary of student evaluations, ranked from highest to lowest weighted score.</div>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "10px 16px", minWidth: 120 }}>
          <div style={{ fontSize: 10, color: GRAY, fontWeight: 700, textTransform: "uppercase" }}>Instructors</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: DARK_GREEN }}>{ranked.length}</div>
        </div>
        <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "10px 16px", minWidth: 120 }}>
          <div style={{ fontSize: 10, color: GRAY, fontWeight: 700, textTransform: "uppercase" }}>Total Evaluations</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: DARK_GREEN }}>{evals.length}</div>
        </div>
        <div style={{ marginLeft: "auto", position: "relative", width: 240 }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search instructor…"
            style={{ width: "100%", padding: "8px 12px", border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 12.5, outline: "none", boxSizing: "border-box" }} />
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: GRAY }}>Loading…</div>
      ) : error ? (
        <div style={{ padding: 30, textAlign: "center", color: "#B91C1C", background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 10 }}>{error}</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 30, textAlign: "center", color: GRAY, background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 12 }}>No evaluations submitted yet.</div>
      ) : (
        <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: GREEN }}>
                <th style={{ ...th, width: 60 }}>Rank</th>
                <th style={{ ...th, textAlign: "left" }}>Instructor</th>
                <th style={th}>Evals</th>
                <th style={th}>A · 35%</th>
                <th style={th}>B · 30%</th>
                <th style={th}>C · 20%</th>
                <th style={th}>D · 15%</th>
                <th style={th}>Overall (5)</th>
                <th style={th}>Weighted Score</th>
                <th style={{ ...th, width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <FragmentRow key={r.instructor} r={r} i={i} medal={medal} scoreColor={scoreColor}
                  onSubject={(code) => setSubjectSel(m => ({ ...m, [r.instructor]: code }))}
                  expanded={expanded === r.instructor} onToggle={() => setExpanded(expanded === r.instructor ? null : r.instructor)} />
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div style={{ fontSize: 11, color: GRAY, marginTop: 10 }}>
        Weighted Score = Σ (area average ÷ 5) × area weight. Areas: Mastery 35%, Delivery 30%, Presentation 20%, Professional 15%.
      </div>
    </div>
  );
}

function FragmentRow({ r, i, medal, scoreColor, expanded, onToggle, onSubject }) {
  return (
    <>
      <tr onClick={onToggle} style={{ borderTop: `1px solid ${BORDER}`, cursor: "pointer", background: i < 3 ? "#FCFDF9" : WHITE }}>
        <td style={{ ...td, textAlign: "center", fontWeight: 800, fontSize: 14 }}>{medal(i)}</td>
        <td style={{ ...td }}>
          <div style={{ fontWeight: 700, color: "#1f2937" }}>{r.instructor}</div>
          {r.subjects.length > 1 ? (
            <select value={r.sel} onClick={e => e.stopPropagation()} onChange={e => onSubject(e.target.value)}
              style={{ marginTop: 3, padding: "3px 6px", border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 11, color: GRAY, background: WHITE, outline: "none", maxWidth: 260, cursor: "pointer" }}>
              <option value="all">All Subjects ({r.subjects.length})</option>
              {r.subjects.map(s => <option key={s.code} value={s.code}>{s.label}</option>)}
            </select>
          ) : r.subjects.length === 1 ? (
            <div style={{ fontSize: 10.5, color: GRAY, marginTop: 1 }}>{r.subjects[0].label}</div>
          ) : null}
        </td>
        <td style={{ ...td, textAlign: "center" }}>{r.count}</td>
        {["A", "B", "C", "D"].map(c => <td key={c} style={{ ...td, textAlign: "center" }}>{r.areaAvg[c] ? r.areaAvg[c].toFixed(2) : "—"}</td>)}
        <td style={{ ...td, textAlign: "center", fontWeight: 700 }}>{r.overall ? r.overall.toFixed(2) : "—"}</td>
        <td style={{ ...td, textAlign: "center" }}>
          <span style={{ fontWeight: 800, fontSize: 13, color: scoreColor(r.weighted) }}>{r.weighted.toFixed(1)}%</span>
        </td>
        <td style={{ ...td, textAlign: "center", color: GRAY }}>{expanded ? "▲" : "▼"}</td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={10} style={{ padding: "12px 18px", background: LIGHT_GRAY, borderTop: `1px solid ${BORDER}` }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: r.comments.length ? 12 : 0 }}>
              {AREAS.map(a => (
                <div key={a.code} style={{ minWidth: 160 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: DARK_GREEN }}>{a.code}. {a.title} ({a.weight}%)</div>
                  <div style={{ fontSize: 12, color: GRAY }}>Average: <b style={{ color: "#1f2937" }}>{r.areaAvg[a.code] ? r.areaAvg[a.code].toFixed(2) : "—"}</b> / 5</div>
                  <div style={{ height: 6, background: "#E5E7EB", borderRadius: 4, marginTop: 4, overflow: "hidden" }}>
                    <div style={{ width: `${(r.areaAvg[a.code] / 5) * 100}%`, height: "100%", background: GREEN }} />
                  </div>
                </div>
              ))}
            </div>
            {r.comments.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: DARK_GREEN, marginBottom: 4 }}>Comments / Suggestions ({r.comments.length})</div>
                {r.comments.map((c, k) => (
                  <div key={k} style={{ fontSize: 12, color: "#374151", padding: "4px 0", borderTop: k ? `1px dashed ${BORDER}` : "none" }}>“{c}”</div>
                ))}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

const th = { padding: "10px 8px", textAlign: "center", fontSize: 10, fontWeight: 700, color: WHITE, textTransform: "uppercase", letterSpacing: 0.3, whiteSpace: "nowrap" };
const td = { padding: "9px 8px", color: "#1f2937", verticalAlign: "middle" };
