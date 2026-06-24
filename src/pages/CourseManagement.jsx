import { useEffect, useState } from "react";
import { showToast, showConfirm } from "../components/Toast";

const GREEN      = "#2E7D32";
const DARK_GREEN = "#1B5E20";
const WHITE      = "#FFFFFF";
const GRAY       = "#6B7280";
const LIGHT_GRAY = "#F9FAFB";
const BORDER     = "#E5E7EB";
const RED        = "#DC2626";

export default function CourseManagement() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newCourse, setNewCourse] = useState("");
  const [adding, setAdding]   = useState(false);
  const [error, setError]     = useState("");

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/erd/courses`);
      if (res.ok) setCourses(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCourses(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newCourse.trim()) return;
    setAdding(true);
    setError("");
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/erd/courses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ course: newCourse.trim() }),
      });
      if (res.ok) {
        showToast("Course added successfully!", "success");
        setNewCourse("");
        fetchCourses();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.message || "Failed to add course.");
      }
    } catch {
      setError("Network error.");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = (id, name) => {
    showConfirm({
      message: `Delete course "${name}"? This cannot be undone.`,
      confirmLabel: "Delete",
      icon: "🗑️",
      onConfirm: async () => {
        try {
          const res = await fetch(`${import.meta.env.VITE_API_URL}/api/erd/courses/${id}`, { method: "DELETE" });
          if (res.ok) { showToast(`Course "${name}" deleted.`, "info"); fetchCourses(); }
          else showToast("Failed to delete course.", "error");
        } catch { showToast("Network error.", "error"); }
      },
    });
  };

  return (
    <div style={{ fontFamily: "system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ marginBottom: "20px" }}>
        <h3 style={{ margin: "0 0 4px", color: DARK_GREEN, fontSize: "15px", fontWeight: 800 }}>🎓 Course Management</h3>
        <p style={{ margin: 0, fontSize: "12px", color: GRAY }}>
          Add or remove academic programs. Changes reflect immediately in the enrollment dropdowns.
        </p>
      </div>

      {/* Add form */}
      <form onSubmit={handleAdd} style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        <input
          type="text"
          value={newCourse}
          onChange={e => setNewCourse(e.target.value)}
          placeholder="e.g. Bachelor of Science in Education"
          style={{ flex: 1, padding: "10px 14px", border: `1px solid ${BORDER}`, borderRadius: "8px", fontSize: "13px", outline: "none", boxSizing: "border-box" }}
        />
        <button
          type="submit"
          disabled={adding || !newCourse.trim()}
          style={{ padding: "10px 18px", background: DARK_GREEN, color: WHITE, border: "none", borderRadius: "8px", fontWeight: 700, fontSize: "13px", cursor: (adding || !newCourse.trim()) ? "not-allowed" : "pointer", opacity: (adding || !newCourse.trim()) ? 0.7 : 1, whiteSpace: "nowrap" }}
        >
          {adding ? "Adding..." : "➕ Add Course"}
        </button>
      </form>

      {error && (
        <div style={{ marginBottom: "12px", padding: "10px 14px", background: "#FEF2F2", color: RED, borderRadius: "6px", fontSize: "12px", fontWeight: 600 }}>
          ⚠️ {error}
        </div>
      )}

      {/* List */}
      <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: "10px", overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: GRAY, fontSize: "13px" }}>⏳ Loading courses...</div>
        ) : courses.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: GRAY, fontSize: "13px" }}>No courses added yet. Use the form above to add one.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: LIGHT_GRAY }}>
                <th style={{ padding: "12px 16px", fontSize: "11px", fontWeight: 700, color: GRAY, textTransform: "uppercase", textAlign: "left" }}>Course Name</th>
                <th style={{ padding: "12px 16px", fontSize: "11px", fontWeight: 700, color: GRAY, textTransform: "uppercase", textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((c, i) => (
                <tr key={c.id} style={{ borderTop: `1px solid ${BORDER}`, background: i % 2 === 0 ? WHITE : LIGHT_GRAY }}>
                  <td style={{ padding: "14px 16px", fontSize: "13px", color: "#111827" }}>
                    <span style={{ padding: "3px 10px", background: "#E8F5E9", color: GREEN, borderRadius: "6px", fontSize: "12px", fontWeight: 700 }}>
                      {c.course}
                    </span>
                  </td>
                  <td style={{ padding: "14px 16px", textAlign: "right" }}>
                    <button
                      type="button"
                      onClick={() => handleDelete(c.id, c.course)}
                      style={{ padding: "5px 12px", background: WHITE, border: `1px solid ${BORDER}`, borderRadius: "6px", fontSize: "12px", color: RED, cursor: "pointer", fontWeight: 600 }}
                    >
                      🗑️ Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ marginTop: "10px", fontSize: "11px", color: GRAY }}>
        {courses.length} course{courses.length !== 1 ? "s" : ""} registered
      </div>
    </div>
  );
}