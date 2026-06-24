import { useEffect, useState } from "react";

const DARK_GREEN = "#1B5E20";
const GREEN      = "#2E7D32";
const GOLD       = "#F5A800";
const GRAY       = "#6B7280";
const BORDER     = "#E5E7EB";
const WHITE      = "#FFFFFF";
const LIGHT_GRAY = "#F9FAFB";

// view prop: "subjects" | "schedule"
export default function AssignedSubject({ user, view = "subjects" }) {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    fetch(`${import.meta.env.VITE_API_URL}/api/erd/faculty/assignments/${user.id}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then(data => { setAssignments(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(err => { console.error(err); setError("Failed to load assignments."); setLoading(false); });
  }, [user?.id]);

  if (loading) return <div style={{ padding: "40px", textAlign: "center", color: GRAY }}>Loading assignments...</div>;
  if (error)   return <div style={{ padding: "40px", textAlign: "center", color: "#DC2626" }}>{error}</div>;

  // ── MY SUBJECTS VIEW ──────────────────────────────────────────────────────
  if (view === "subjects") {
    return (
      <div style={{ fontFamily: "system-ui" }}>
        <h3 style={{ margin: "0 0 4px 0", color: DARK_GREEN, fontWeight: 800, fontSize: "17px" }}>📚 My Assigned Subjects</h3>
        <p style={{ margin: "0 0 20px 0", color: GRAY, fontSize: "13px" }}>Subjects currently assigned to you this term.</p>

        {assignments.length === 0 ? (
          <div style={{ padding: "40px", border: `1px dashed ${BORDER}`, borderRadius: "10px", textAlign: "center", color: GRAY, fontSize: "14px" }}>
            No subjects assigned yet.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
            {assignments.map(a => (
              <div key={a.id} style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: "12px", padding: "18px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                {/* Subject title */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px", marginBottom: "12px" }}>
                  <div>
                    <div style={{ fontSize: "15px", fontWeight: 800, color: "#111827", lineHeight: 1.3 }}>{a.subject_title || "—"}</div>
                    {a.subject_id && (
                      <div style={{ fontSize: "11px", color: GRAY, marginTop: "2px" }}>Subject ID: {a.subject_id}</div>
                    )}
                  </div>
                  <span style={{ flexShrink: 0, fontSize: "11px", fontWeight: 700, background: "#E8F5E9", color: GREEN, borderRadius: "6px", padding: "3px 9px" }}>
                    {a.units ?? "—"} units
                  </span>
                </div>

                {/* Details grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <Detail label="Year Level" value={a.year_level} />
                  <Detail label="Section"    value={a.section} />
                  <Detail label="Room"       value={a.room} />
                  <Detail label="Schedule"   value={a.sched} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── ASSIGNED SCHEDULE VIEW ────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "system-ui" }}>
      <h3 style={{ margin: "0 0 4px 0", color: DARK_GREEN, fontWeight: 800, fontSize: "17px" }}>🗓️ Assigned Schedule</h3>
      <p style={{ margin: "0 0 20px 0", color: GRAY, fontSize: "13px" }}>Your weekly teaching schedule for all assigned subjects.</p>

      {assignments.length === 0 ? (
        <div style={{ padding: "40px", border: `1px dashed ${BORDER}`, borderRadius: "10px", textAlign: "center", color: GRAY, fontSize: "14px" }}>
          No schedule data available.
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: LIGHT_GRAY }}>
                {["Subject", "Year Level", "Section", "Schedule", "Room"].map(h => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, color: DARK_GREEN, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: `2px solid ${BORDER}`, whiteSpace: "nowrap" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {assignments.map((a, i) => (
                <tr key={a.id} style={{ background: i % 2 === 0 ? WHITE : LIGHT_GRAY, transition: "background 0.15s" }}>
                  <td style={{ padding: "12px 14px", fontWeight: 700, color: "#111827", borderBottom: `1px solid ${BORDER}` }}>
                    {a.subject_title || "—"}
                    <div style={{ fontWeight: 400, fontSize: "11px", color: GRAY }}>{a.units ?? "—"} units</div>
                  </td>
                  <td style={{ padding: "12px 14px", color: "#374151", borderBottom: `1px solid ${BORDER}` }}>{a.year_level || "—"}</td>
                  <td style={{ padding: "12px 14px", color: "#374151", borderBottom: `1px solid ${BORDER}` }}>{a.section || "—"}</td>
                  <td style={{ padding: "12px 14px", borderBottom: `1px solid ${BORDER}` }}>
                    {a.sched
                      ? <span style={{ background: "#FFF8E1", color: "#92400E", borderRadius: "6px", padding: "3px 9px", fontWeight: 600, fontSize: "12px" }}>{a.sched}</span>
                      : <span style={{ color: GRAY }}>—</span>
                    }
                  </td>
                  <td style={{ padding: "12px 14px", color: "#374151", borderBottom: `1px solid ${BORDER}` }}>{a.room || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div style={{ background: LIGHT_GRAY, borderRadius: "8px", padding: "8px 10px" }}>
      <div style={{ fontSize: "10px", fontWeight: 700, color: GRAY, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "2px" }}>{label}</div>
      <div style={{ fontSize: "13px", fontWeight: 600, color: value ? "#111827" : GRAY }}>{value || "—"}</div>
    </div>
  );
}