import { useEffect, useState, useCallback } from "react";

// ─── Design Tokens ────────────────────────────────────────────────────────────
const C = {
  gold:       "#F5A800",
  green:      "#2E7D32",
  darkGreen:  "#1B5E20",
  white:      "#FFFFFF",
  gray:       "#6B7280",
  border:     "#E5E7EB",
  lightGray:  "#F9FAFB",
  red:        "#DC2626",
  blue:       "#1E88E5",
  ink:        "#111827",
  muted:      "#4B5563",
};

const REMARKS_OPTIONS = ["", "Passed", "Failed", "Incomplete", "Dropped"];

const remarksColor = (r) => {
  if (r === "Passed")     return { color: C.green,  bg: "#E8F5E9" };
  if (r === "Failed")     return { color: C.red,    bg: "#FFEBEE" };
  if (r === "Incomplete") return { color: C.gold,   bg: "#FFF8E1" };
  if (r === "Dropped")    return { color: C.gray,   bg: "#F3F4F6" };
  return { color: C.gray, bg: C.lightGray };
};

const autoRemarks = (grade) => {
  const g = parseFloat(grade);
  if (isNaN(g) || grade === "" || grade === null) return "";
  return g <= 3.0 ? "Passed" : "Failed";
};

const formatCode = (id) => `CCA-SUB-${String(id).padStart(4, "0")}`;

// ─── Main Component ───────────────────────────────────────────────────────────
export default function GradeSubmission({ facultyId }) {
  const API = import.meta.env.VITE_API_URL;

  const [students,    setStudents]    = useState([]);
  const [subjects,    setSubjects]    = useState([]);
  const [selectedId,  setSelectedId]  = useState("");
  const [gradeRows,   setGradeRows]   = useState([]);
  const [semester,    setSemester]    = useState("1");
  const [yearStart,   setYearStart]   = useState(new Date().getFullYear().toString());
  const [yearEnd,     setYearEnd]     = useState((new Date().getFullYear() + 1).toString());
  const [loading,     setLoading]     = useState(false);
  const [submitting,  setSubmitting]  = useState(false);
  const [toast,       setToast]       = useState(null);

  // ── Fetch helpers ──────────────────────────────────────────────────────────
  const fetchStudents = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/erd/students`);
      if (res.ok) setStudents(await res.json());
    } catch (err) { console.error("students fetch:", err); }
  }, [API]);

  const fetchSubjects = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/erd/subjects`);
      if (res.ok) setSubjects(await res.json());
    } catch (err) { console.error("subjects fetch:", err); }
  }, [API]);

  const fetchExistingGrades = useCallback(async (studentId) => {
    if (!studentId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/erd/grades/${studentId}`);
      const existing = res.ok ? await res.json() : [];

      setGradeRows(subjects.map((sub) => {
        const found = existing.find((g) => g.subject_id === sub.id);
        return {
          subject_id:   sub.id,
          subject_code: sub.subject_code || formatCode(sub.id),
          subject_title: sub.subject_title,
          units:        sub.units,
          grade:        found ? (found.grade != null ? String(found.grade) : "") : "",
          remarks:      found?.remarks || "",
          semester:     found?.semester ? String(found.semester) : "1",
          year_start:   found?.year_start ? String(found.year_start) : yearStart,
          year_end:     found?.year_end  ? String(found.year_end)  : yearEnd,
        };
      }));
    } catch (err) {
      console.error("grades fetch:", err);
    } finally {
      setLoading(false);
    }
  }, [API, subjects, yearStart, yearEnd]);

  useEffect(() => {
    fetchStudents();
    fetchSubjects();
  }, [fetchStudents, fetchSubjects]);

  useEffect(() => {
    if (selectedId) fetchExistingGrades(selectedId);
    else setGradeRows([]);
  }, [selectedId, fetchExistingGrades]);

  // ── Row update helpers ─────────────────────────────────────────────────────
  const updateRow = (idx, field, value) => {
    setGradeRows((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };

      // Auto-suggest remarks only if it hasn't been manually set
      if (field === "grade") {
        const suggested = autoRemarks(value);
        if (!next[idx].remarks || REMARKS_OPTIONS.includes(next[idx].remarks)) {
          next[idx].remarks = suggested;
        }
      }
      return next;
    });
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!selectedId) {
      showToast("Please select a student first.", "error");
      return;
    }

    const payload = gradeRows
      .filter((r) => r.grade !== "" || r.remarks !== "")
      .map((r) => ({
        subject_id: r.subject_id,
        grade:      r.grade !== "" ? r.grade : null,
        remarks:    r.remarks || null,
        semester:   semester,
        year_start: yearStart,
        year_end:   yearEnd,
      }));

    if (!payload.length) {
      showToast("No grades to submit. Fill in at least one row.", "error");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/erd/grades/bulk`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ student_id: Number(selectedId), grades: payload }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || "Grades saved successfully.", "success");
        fetchExistingGrades(selectedId);
      } else {
        showToast(data.message || "Failed to save grades.", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Network error reaching the server.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const showToast = (msg, type) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const selectedStudent = students.find((s) => String(s.id) === String(selectedId));
  const filledCount = gradeRows.filter((r) => r.grade !== "").length;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", color: C.ink }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 9999,
          padding: "12px 20px", borderRadius: 10, fontWeight: 700, fontSize: 13,
          background: toast.type === "success" ? C.green : C.red,
          color: C.white, boxShadow: "0 4px 12px rgba(0,0,0,0.18)",
          animation: "fadeIn 0.2s ease",
        }}>
          {toast.type === "success" ? "✅" : "❌"} {toast.msg}
        </div>
      )}

      {/* Page Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: C.darkGreen }}>
          📋 Grade Submission
        </h2>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: C.gray }}>
          Submit or update grades for your assigned students.
        </p>
      </div>

      {/* Controls Row */}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end",
        background: C.white, border: `1px solid ${C.border}`, borderRadius: 12,
        padding: "16px 20px", marginBottom: 20,
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}>
        {/* Student selector */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: "2 1 220px" }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: C.gray, textTransform: "uppercase" }}>
            Student *
          </label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            style={{ padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: 7, fontSize: 13, background: C.white, color: C.ink }}
          >
            <option value="">— Select a student —</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {[s.last_name, s.first_name].filter(Boolean).join(", ")}
              </option>
            ))}
          </select>
        </div>

        {/* Semester */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: "1 1 120px" }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: C.gray, textTransform: "uppercase" }}>Semester</label>
          <select
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
            style={{ padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: 7, fontSize: 13, background: C.white }}
          >
            <option value="1">1st Semester</option>
            <option value="2">2nd Semester</option>
            <option value="3">Summer</option>
          </select>
        </div>

        {/* School Year */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: "1 1 160px" }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: C.gray, textTransform: "uppercase" }}>School Year</label>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input
              type="number" value={yearStart}
              onChange={(e) => setYearStart(e.target.value)}
              style={{ width: 72, padding: "8px 6px", border: `1px solid ${C.border}`, borderRadius: 7, fontSize: 13, textAlign: "center" }}
            />
            <span style={{ color: C.gray, fontSize: 13 }}>–</span>
            <input
              type="number" value={yearEnd}
              onChange={(e) => setYearEnd(e.target.value)}
              style={{ width: 72, padding: "8px 6px", border: `1px solid ${C.border}`, borderRadius: 7, fontSize: 13, textAlign: "center" }}
            />
          </div>
        </div>

        {/* Submit button */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || !selectedId}
          style={{
            padding: "9px 22px", border: "none", borderRadius: 8,
            background: submitting || !selectedId ? "#9CA3AF" : C.darkGreen,
            color: C.white, fontWeight: 700, fontSize: 13,
            cursor: submitting || !selectedId ? "not-allowed" : "pointer",
            alignSelf: "flex-end",
            boxShadow: "0 2px 4px rgba(0,0,0,0.08)",
          }}
        >
          {submitting ? "⚡ Saving..." : "💾 Save Grades"}
        </button>
      </div>

      {/* Student Info Badge */}
      {selectedStudent && (
        <div style={{
          display: "flex", alignItems: "center", gap: 14,
          background: "#E8F5E9", border: `1px solid #A5D6A7`,
          borderRadius: 10, padding: "10px 18px", marginBottom: 16,
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: "50%",
            background: C.green, color: C.white,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 800, fontSize: 16, flexShrink: 0,
          }}>
            {selectedStudent.first_name?.charAt(0).toUpperCase() || "S"}
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: C.darkGreen }}>
              {[selectedStudent.first_name, selectedStudent.middle_name, selectedStudent.last_name].filter(Boolean).join(" ")}
            </div>
            <div style={{ fontSize: 12, color: C.muted }}>
              {selectedStudent.course || "No course"} &nbsp;·&nbsp; {filledCount} of {gradeRows.length} subjects graded
            </div>
          </div>
          <div style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, color: C.green }}>
            SY {yearStart}–{yearEnd} · Sem {semester}
          </div>
        </div>
      )}

      {/* Grade Table */}
      <div style={{
        background: C.white, border: `1px solid ${C.border}`,
        borderRadius: 12, overflow: "hidden",
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
      }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: C.lightGray, borderBottom: `2px solid ${C.border}` }}>
              {[
                "Curriculum Reference Code",
                "Subject / Course Description Title",
                "Weight Units",
                "Numeric Evaluation Scale Grade (1.00 – 5.00)",
                "Evaluation Output Remarks",
              ].map((h) => (
                <th key={h} style={{
                  padding: "12px 16px", fontSize: 10, fontWeight: 800,
                  color: C.gray, textTransform: "uppercase", letterSpacing: "0.5px",
                  textAlign: "left", whiteSpace: "nowrap",
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!selectedId ? (
              <tr>
                <td colSpan={5} style={{ padding: 48, textAlign: "center", color: C.gray, fontSize: 13 }}>
                  👆 Select a student above to load subjects.
                </td>
              </tr>
            ) : loading ? (
              <tr>
                <td colSpan={5} style={{ padding: 48, textAlign: "center", color: C.gray, fontSize: 13 }}>
                  ⏳ Loading grade matrix...
                </td>
              </tr>
            ) : gradeRows.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: 48, textAlign: "center", color: C.gray, fontSize: 13 }}>
                  ❌ No subjects found in the curriculum registry.
                </td>
              </tr>
            ) : (
              gradeRows.map((row, idx) => {
                const rc = remarksColor(row.remarks);
                const gradeNum = parseFloat(row.grade);
                const gradeInvalid = row.grade !== "" && (isNaN(gradeNum) || gradeNum < 1.0 || gradeNum > 5.0);
                return (
                  <tr key={row.subject_id} style={{
                    borderBottom: `1px solid ${C.border}`,
                    background: idx % 2 === 0 ? C.white : C.lightGray,
                  }}>
                    {/* Reference Code */}
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{
                        fontFamily: "monospace", fontSize: 12, fontWeight: 700,
                        color: C.blue, background: "#E3F2FD",
                        padding: "3px 8px", borderRadius: 5,
                      }}>
                        {row.subject_code || formatCode(row.subject_id)}
                      </span>
                    </td>

                    {/* Subject Title */}
                    <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 600, color: C.ink }}>
                      {row.subject_title}
                    </td>

                    {/* Units */}
                    <td style={{ padding: "12px 16px", fontSize: 12, color: C.muted, whiteSpace: "nowrap" }}>
                      {row.units} {row.units === 1 ? "Unit" : "Units"}
                    </td>

                    {/* Grade input */}
                    <td style={{ padding: "10px 16px" }}>
                      <input
                        type="number"
                        min="1.00" max="5.00" step="0.25"
                        value={row.grade}
                        onChange={(e) => updateRow(idx, "grade", e.target.value)}
                        placeholder="—"
                        style={{
                          width: 90, padding: "7px 10px",
                          border: `1.5px solid ${gradeInvalid ? C.red : C.border}`,
                          borderRadius: 7, fontSize: 13, textAlign: "center",
                          fontWeight: 700, color: C.ink,
                          outline: "none",
                          background: row.grade !== "" ? "#FFFDE7" : C.white,
                        }}
                      />
                      {gradeInvalid && (
                        <div style={{ fontSize: 10, color: C.red, marginTop: 2 }}>Must be 1.00–5.00</div>
                      )}
                    </td>

                    {/* Remarks dropdown */}
                    <td style={{ padding: "10px 16px" }}>
                      <select
                        value={row.remarks}
                        onChange={(e) => updateRow(idx, "remarks", e.target.value)}
                        style={{
                          padding: "7px 10px",
                          border: `1.5px solid ${C.border}`,
                          borderRadius: 7, fontSize: 12, fontWeight: 700,
                          background: rc.bg, color: rc.color,
                          cursor: "pointer",
                        }}
                      >
                        {REMARKS_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt || "— Select —"}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Footer summary */}
        {gradeRows.length > 0 && (
          <div style={{
            padding: "12px 20px", background: C.lightGray,
            borderTop: `1px solid ${C.border}`,
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span style={{ fontSize: 12, color: C.gray }}>
              {filledCount} / {gradeRows.length} subjects graded
            </span>
            <div style={{ display: "flex", gap: 16, fontSize: 12 }}>
              {["Passed", "Failed", "Incomplete", "Dropped"].map((r) => {
                const count = gradeRows.filter((row) => row.remarks === r).length;
                const rc = remarksColor(r);
                return (
                  <span key={r} style={{
                    padding: "2px 10px", borderRadius: 20,
                    background: rc.bg, color: rc.color, fontWeight: 700,
                  }}>
                    {r}: {count}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}