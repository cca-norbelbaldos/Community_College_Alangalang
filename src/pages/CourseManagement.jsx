import { useEffect, useState } from "react";
import { showToast, showConfirm } from "../components/Toast";

const DARK_GREEN = "#3d6e01";
const WHITE      = "#FFFFFF";
const GRAY       = "#6B7280";
const LIGHT_GRAY = "#F9FAFB";
const BORDER     = "#E5E7EB";
const RED        = "#DC2626";
const API        = import.meta.env.VITE_API_URL;

// ── Shared simple list panel ─────────────────────────────────────────────────
function ManagePanel({ title, items, itemKey, addPlaceholder, onAdd, onEdit, onDelete, adding }) {
  const [newVal, setNewVal]   = useState("");
  const [editId, setEditId]   = useState(null);
  const [editVal, setEditVal] = useState("");

  const submit = (e) => {
    e.preventDefault();
    if (!newVal.trim()) return;
    onAdd(newVal.trim(), () => setNewVal(""));
  };

  return (
    <div>
      <h4 style={{ margin: "0 0 12px", fontSize: "13px", fontWeight: 800, color: DARK_GREEN }}>{title}</h4>

      {/* Add row */}
      <form onSubmit={submit} style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
        <input
          value={newVal}
          onChange={e => setNewVal(e.target.value)}
          placeholder={addPlaceholder}
          style={{
            flex: 1, padding: "8px 12px",
            border: `1px solid ${BORDER}`, borderRadius: "6px",
            fontSize: "13px", outline: "none", boxSizing: "border-box",
          }}
        />
        <button
          type="submit"
          disabled={adding || !newVal.trim()}
          style={{
            padding: "8px 16px", background: DARK_GREEN, color: WHITE,
            border: "none", borderRadius: "6px", fontSize: "13px",
            fontWeight: 700, cursor: (adding || !newVal.trim()) ? "not-allowed" : "pointer",
            opacity: (adding || !newVal.trim()) ? 0.65 : 1, whiteSpace: "nowrap",
          }}
        >{adding ? "Adding…" : "Add"}</button>
      </form>

      {/* List */}
      {items.length === 0 ? (
        <p style={{ margin: 0, fontSize: "13px", color: GRAY, padding: "12px 0" }}>No entries yet.</p>
      ) : (
        <div style={{ border: `1px solid ${BORDER}`, borderRadius: "8px", overflow: "hidden" }}>
          {items.map((item, i) => (
            <div
              key={item.id}
              style={{
                display: "flex", alignItems: "center", gap: "10px",
                padding: "9px 14px",
                background: i % 2 === 0 ? WHITE : LIGHT_GRAY,
                borderTop: i > 0 ? `1px solid ${BORDER}` : "none",
              }}
            >
              {editId === item.id ? (
                <>
                  <input
                    autoFocus
                    value={editVal}
                    onChange={e => setEditVal(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter") { onEdit(item.id, editVal, () => { setEditId(null); setEditVal(""); }); }
                      if (e.key === "Escape") { setEditId(null); setEditVal(""); }
                    }}
                    style={{
                      flex: 1, padding: "5px 10px",
                      border: `1.5px solid ${DARK_GREEN}`, borderRadius: "5px",
                      fontSize: "13px", outline: "none",
                    }}
                  />
                  <button
                    onClick={() => onEdit(item.id, editVal, () => { setEditId(null); setEditVal(""); })}
                    style={{ padding: "5px 12px", background: DARK_GREEN, color: WHITE, border: "none", borderRadius: "5px", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}
                  >Save</button>
                  <button
                    onClick={() => { setEditId(null); setEditVal(""); }}
                    style={{ padding: "5px 10px", background: "none", border: `1px solid ${BORDER}`, borderRadius: "5px", fontSize: "12px", color: GRAY, cursor: "pointer" }}
                  >Cancel</button>
                </>
              ) : (
                <>
                  <span style={{ flex: 1, fontSize: "13px", color: "#111827" }}>{item[itemKey]}</span>
                  <button
                    onClick={() => { setEditId(item.id); setEditVal(item[itemKey]); }}
                    style={{ padding: "4px 10px", background: "none", border: `1px solid ${BORDER}`, borderRadius: "5px", fontSize: "12px", color: "#374151", cursor: "pointer" }}
                  >Edit</button>
                  <button
                    onClick={() => onDelete(item.id, item[itemKey])}
                    style={{ padding: "4px 10px", background: "none", border: `1px solid ${BORDER}`, borderRadius: "5px", fontSize: "12px", color: RED, cursor: "pointer" }}
                  >Delete</button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
      <p style={{ margin: "6px 0 0", fontSize: "11px", color: GRAY }}>{items.length} {title.toLowerCase().replace("manage ", "").replace(" management", "")} registered</p>
    </div>
  );
}

// ── Section panel (with max students per term) ───────────────────────────────
function SectionPanel({ sections, onAdd, onEdit, onDelete, onSetMax, adding }) {
  const [newVal, setNewVal] = useState("");
  const [editId, setEditId] = useState(null);
  const [editVal, setEditVal] = useState("");
  const [editMax, setEditMax] = useState("");

  const submit = (e) => {
    e.preventDefault();
    if (!newVal.trim()) return;
    onAdd(newVal.trim(), () => setNewVal(""));
  };

  return (
    <div>
      <h4 style={{ margin: "0 0 4px", fontSize: "13px", fontWeight: 800, color: DARK_GREEN }}>Block Section Management</h4>
      <p style={{ margin: "0 0 10px", fontSize: "12px", color: GRAY }}>
        Set a <strong>maximum enrollment per term</strong> — the system will block new enrollments once the limit is reached.
      </p>

      {/* Add row */}
      <form onSubmit={submit} style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
        <input
          value={newVal}
          onChange={e => setNewVal(e.target.value)}
          placeholder="e.g. CCA 201"
          style={{ flex: 1, padding: "8px 12px", border: `1px solid ${BORDER}`, borderRadius: "6px", fontSize: "13px", outline: "none", boxSizing: "border-box" }}
        />
        <button type="submit" disabled={adding || !newVal.trim()}
          style={{ padding: "8px 16px", background: DARK_GREEN, color: WHITE, border: "none", borderRadius: "6px", fontSize: "13px", fontWeight: 700, cursor: (adding || !newVal.trim()) ? "not-allowed" : "pointer", opacity: (adding || !newVal.trim()) ? 0.65 : 1, whiteSpace: "nowrap" }}>
          {adding ? "Adding…" : "Add"}
        </button>
      </form>

      {sections.length === 0 ? (
        <p style={{ margin: 0, fontSize: "13px", color: GRAY, padding: "12px 0" }}>No sections yet.</p>
      ) : (
        <div style={{ border: `1px solid ${BORDER}`, borderRadius: "8px", overflow: "hidden" }}>
          {/* Header */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 140px 180px", background: "#F3F4F6", borderBottom: `1px solid ${BORDER}`, padding: "6px 14px" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: GRAY, textTransform: "uppercase", letterSpacing: "0.04em" }}>Section</span>
            <span style={{ fontSize: "11px", fontWeight: 700, color: GRAY, textTransform: "uppercase", letterSpacing: "0.04em", textAlign: "center" }}>Max Students/Term</span>
            <span style={{ fontSize: "11px", fontWeight: 700, color: GRAY, textTransform: "uppercase", letterSpacing: "0.04em", textAlign: "right" }}>Actions</span>
          </div>
          {sections.map((item, i) => (
            <div key={item.id} style={{ display: "grid", gridTemplateColumns: "1fr 140px 180px", alignItems: "center", padding: "9px 14px", background: i % 2 === 0 ? WHITE : LIGHT_GRAY, borderTop: i > 0 ? `1px solid ${BORDER}` : "none" }}>
              {editId === item.id ? (
                <>
                  <input autoFocus value={editVal} onChange={e => setEditVal(e.target.value)}
                    onKeyDown={e => { if (e.key === "Escape") { setEditId(null); } }}
                    style={{ padding: "5px 10px", border: `1.5px solid ${DARK_GREEN}`, borderRadius: "5px", fontSize: "13px", outline: "none" }} />
                  <div style={{ display: "flex", alignItems: "center", gap: "4px", justifyContent: "center" }}>
                    <input
                      type="number" min="1" max="999"
                      value={editMax}
                      onChange={e => setEditMax(e.target.value)}
                      placeholder="No limit"
                      style={{ width: "80px", padding: "5px 8px", border: `1.5px solid ${DARK_GREEN}`, borderRadius: "5px", fontSize: "13px", outline: "none", textAlign: "center" }}
                    />
                  </div>
                  <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                    <button onClick={() => { onEdit(item.id, editVal, editMax === "" ? null : parseInt(editMax, 10), () => { setEditId(null); }); }}
                      style={{ padding: "5px 12px", background: DARK_GREEN, color: WHITE, border: "none", borderRadius: "5px", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>Save</button>
                    <button onClick={() => setEditId(null)}
                      style={{ padding: "5px 10px", background: "none", border: `1px solid ${BORDER}`, borderRadius: "5px", fontSize: "12px", color: GRAY, cursor: "pointer" }}>Cancel</button>
                  </div>
                </>
              ) : (
                <>
                  <span style={{ fontSize: "13px", color: "#111827" }}>{item.name}</span>
                  <div style={{ textAlign: "center" }}>
                    {item.max_students != null ? (
                      <span style={{ fontSize: "13px", fontWeight: 700, color: DARK_GREEN }}>{item.max_students}</span>
                    ) : (
                      <span style={{ fontSize: "12px", color: GRAY, fontStyle: "italic" }}>No limit</span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                    <button onClick={() => { setEditId(item.id); setEditVal(item.name); setEditMax(item.max_students != null ? String(item.max_students) : ""); }}
                      style={{ padding: "4px 10px", background: "none", border: `1px solid ${BORDER}`, borderRadius: "5px", fontSize: "12px", color: "#374151", cursor: "pointer" }}>Edit</button>
                    <button onClick={() => onDelete(item.id, item.name)}
                      style={{ padding: "4px 10px", background: "none", border: `1px solid ${BORDER}`, borderRadius: "5px", fontSize: "12px", color: RED, cursor: "pointer" }}>Delete</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
      <p style={{ margin: "6px 0 0", fontSize: "11px", color: GRAY }}>{sections.length} section{sections.length !== 1 ? "s" : ""} registered</p>
    </div>
  );
}

// ── School Year panel ─────────────────────────────────────────────────────────
function SchoolYearPanel({ schoolYears, onAdd, onActivate, onDeactivate, onDelete, adding }) {
  const [newVal, setNewVal] = useState("");

  const submit = (e) => {
    e.preventDefault();
    if (!newVal.trim()) return;
    onAdd(newVal.trim(), () => setNewVal(""));
  };

  const active = schoolYears.find(sy => sy.is_active);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
        <h4 style={{ margin: 0, fontSize: "13px", fontWeight: 800, color: DARK_GREEN }}>School Year Management</h4>
        {active && (
          <span style={{ background: "#eaf2d9", color: DARK_GREEN, fontSize: "11px", fontWeight: 800, padding: "2px 10px", borderRadius: "20px", border: `1px solid #a3c46d` }}>
            ✓ Active: {active.school_year}
          </span>
        )}
      </div>
      <p style={{ margin: "0 0 10px", fontSize: "12px", color: GRAY }}>
        Set one school year as <strong>Active</strong> — all enrollment forms will automatically use it.
      </p>

      {/* Add row */}
      <form onSubmit={submit} style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
        <input
          value={newVal}
          onChange={e => setNewVal(e.target.value)}
          placeholder="e.g. 2026-2027"
          style={{ flex: 1, padding: "8px 12px", border: `1px solid ${BORDER}`, borderRadius: "6px", fontSize: "13px", outline: "none", boxSizing: "border-box" }}
        />
        <button type="submit" disabled={adding || !newVal.trim()}
          style={{ padding: "8px 16px", background: DARK_GREEN, color: WHITE, border: "none", borderRadius: "6px", fontSize: "13px", fontWeight: 700, cursor: (adding || !newVal.trim()) ? "not-allowed" : "pointer", opacity: (adding || !newVal.trim()) ? 0.65 : 1, whiteSpace: "nowrap" }}>
          {adding ? "Adding…" : "Add"}
        </button>
      </form>

      {/* List */}
      {schoolYears.length === 0 ? (
        <p style={{ margin: 0, fontSize: "13px", color: GRAY, padding: "12px 0" }}>No school years yet.</p>
      ) : (
        <div style={{ border: `1px solid ${BORDER}`, borderRadius: "8px", overflow: "hidden" }}>
          {schoolYears.map((sy, i) => (
            <div key={sy.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", borderBottom: i < schoolYears.length - 1 ? `1px solid ${BORDER}` : "none", background: sy.is_active ? "#f2f9e8" : WHITE }}>
              <span style={{ flex: 1, fontSize: "13px", fontWeight: sy.is_active ? 800 : 500, color: sy.is_active ? DARK_GREEN : "#111827" }}>
                {sy.school_year}
              </span>
              {sy.is_active ? (
                <>
                  <span style={{ fontSize: "11px", fontWeight: 800, color: DARK_GREEN, background: "#eaf2d9", padding: "2px 10px", borderRadius: "12px", border: `1px solid #a3c46d` }}>✓ ACTIVE</span>
                  <button type="button" onClick={() => onDeactivate(sy.id)}
                    style={{ fontSize: "11px", fontWeight: 700, color: "#92400E", background: "#FEF3C7", border: `1px solid #FDE68A`, borderRadius: "6px", padding: "3px 10px", cursor: "pointer" }}>
                    Deactivate
                  </button>
                </>
              ) : (
                <button type="button" onClick={() => onActivate(sy.id)}
                  style={{ fontSize: "11px", fontWeight: 700, color: DARK_GREEN, background: WHITE, border: `1px solid ${DARK_GREEN}`, borderRadius: "6px", padding: "3px 10px", cursor: "pointer" }}>
                  Set Active
                </button>
              )}
              <button type="button" onClick={() => onDelete(sy.id, sy.school_year)}
                style={{ fontSize: "12px", fontWeight: 700, color: RED, background: "none", border: "none", cursor: "pointer", padding: "2px 6px" }}>
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
      <p style={{ margin: "6px 0 0", fontSize: "11px", color: GRAY }}>{schoolYears.length} school year{schoolYears.length !== 1 ? "s" : ""} registered</p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function CourseManagement() {
  const [courses,     setCourses]     = useState([]);
  const [sections,    setSections]    = useState([]);
  const [rooms,       setRooms]       = useState([]);
  const [schoolYears, setSchoolYears] = useState([]);
  const [addingC,  setAddingC]  = useState(false);
  const [addingS,  setAddingS]  = useState(false);
  const [addingR,  setAddingR]  = useState(false);
  const [addingSY, setAddingSY] = useState(false);

  const fetchCourses     = async () => { const r = await fetch(`${API}/api/erd/courses`);      if (r.ok) setCourses(await r.json()); };
  const fetchSections    = async () => { const r = await fetch(`${API}/api/erd/sections`);     if (r.ok) setSections(await r.json()); };
  const fetchRooms       = async () => { const r = await fetch(`${API}/api/erd/rooms`);        if (r.ok) setRooms(await r.json()); };
  const fetchSchoolYears = async () => { const r = await fetch(`${API}/api/erd/school-years`); if (r.ok) setSchoolYears(await r.json()); };

  useEffect(() => { fetchCourses(); fetchSections(); fetchRooms(); fetchSchoolYears(); }, []);

  // Courses CRUD
  const addCourse = async (val, reset) => {
    setAddingC(true);
    const res = await fetch(`${API}/api/erd/courses`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ course: val }) });
    const data = await res.json().catch(() => ({}));
    if (res.ok) { showToast("Course added!", "success"); reset(); fetchCourses(); }
    else showToast(data.message || "Failed to add course.", "error");
    setAddingC(false);
  };
  const editCourse = async (id, val, done) => {
    const res = await fetch(`${API}/api/erd/courses/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ course: val.trim() }) });
    if (res.ok) { showToast("Course updated!", "success"); done(); fetchCourses(); }
    else showToast("Failed to update course.", "error");
  };
  const deleteCourse = (id, name) => showConfirm({
    message: `Delete course "${name}"?`, confirmLabel: "Delete", icon: "🗑️",
    onConfirm: async () => {
      const res = await fetch(`${API}/api/erd/courses/${id}`, { method: "DELETE" });
      if (res.ok) { showToast("Course deleted.", "info"); fetchCourses(); }
      else showToast("Failed to delete.", "error");
    },
  });

  // Sections CRUD
  const addSection = async (val, reset) => {
    setAddingS(true);
    const res = await fetch(`${API}/api/erd/sections`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: val }) });
    const data = await res.json().catch(() => ({}));
    if (res.ok) { showToast("Section added!", "success"); reset(); fetchSections(); }
    else showToast(data.message || "Failed to add section.", "error");
    setAddingS(false);
  };
  const editSection = async (id, val, maxStudents, done) => {
    const res = await fetch(`${API}/api/erd/sections/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: val.trim(), max_students: maxStudents }) });
    if (res.ok) { showToast("Section updated!", "success"); done(); fetchSections(); }
    else showToast("Failed to update section.", "error");
  };
  const deleteSection = (id, name) => showConfirm({
    message: `Delete section "${name}"?`, confirmLabel: "Delete", icon: "🗑️",
    onConfirm: async () => {
      const res = await fetch(`${API}/api/erd/sections/${id}`, { method: "DELETE" });
      if (res.ok) { showToast("Section deleted.", "info"); fetchSections(); }
      else showToast("Failed to delete.", "error");
    },
  });

  // Rooms CRUD
  const addRoom = async (val, reset) => {
    setAddingR(true);
    const res = await fetch(`${API}/api/erd/rooms`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: val }) });
    const data = await res.json().catch(() => ({}));
    if (res.ok) { showToast("Room added!", "success"); reset(); fetchRooms(); }
    else showToast(data.message || "Failed to add room.", "error");
    setAddingR(false);
  };
  const editRoom = async (id, val, done) => {
    const res = await fetch(`${API}/api/erd/rooms/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: val.trim() }) });
    if (res.ok) { showToast("Room updated!", "success"); done(); fetchRooms(); }
    else showToast("Failed to update room.", "error");
  };
  const deleteRoom = (id, name) => showConfirm({
    message: `Delete room "${name}"?`, confirmLabel: "Delete", icon: "🗑️",
    onConfirm: async () => {
      const res = await fetch(`${API}/api/erd/rooms/${id}`, { method: "DELETE" });
      if (res.ok) { showToast("Room deleted.", "info"); fetchRooms(); }
      else showToast("Failed to delete.", "error");
    },
  });

  // School Years CRUD
  const addSchoolYear = async (val, reset) => {
    setAddingSY(true);
    const res = await fetch(`${API}/api/erd/school-years`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ school_year: val }) });
    const data = await res.json().catch(() => ({}));
    if (res.ok) { showToast("School year added!", "success"); reset(); fetchSchoolYears(); }
    else showToast(data.message || "Failed to add school year.", "error");
    setAddingSY(false);
  };
  const activateSchoolYear = async (id) => {
    const res = await fetch(`${API}/api/erd/school-years/${id}/activate`, { method: "PUT" });
    if (res.ok) { showToast("Active school year set!", "success"); fetchSchoolYears(); }
    else showToast("Failed to activate school year.", "error");
  };
  const deactivateSchoolYear = async (id) => {
    const res = await fetch(`${API}/api/erd/school-years/${id}/deactivate`, { method: "PUT" });
    if (res.ok) { showToast("School year deactivated.", "info"); fetchSchoolYears(); }
    else showToast("Failed to deactivate school year.", "error");
  };
  const deleteSchoolYear = (id, name) => showConfirm({
    message: `Delete school year "${name}"?`, confirmLabel: "Delete", icon: "🗑️",
    onConfirm: async () => {
      const res = await fetch(`${API}/api/erd/school-years/${id}`, { method: "DELETE" });
      if (res.ok) { showToast("School year deleted.", "info"); fetchSchoolYears(); }
      else showToast("Failed to delete.", "error");
    },
  });

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", display: "flex", flexDirection: "column", gap: "32px" }}>
      {/* School Year — shown first */}
      <SchoolYearPanel
        schoolYears={schoolYears}
        adding={addingSY}
        onAdd={addSchoolYear}
        onActivate={activateSchoolYear}
        onDeactivate={deactivateSchoolYear}
        onDelete={deleteSchoolYear}
      />
      <div style={{ borderTop: `1px solid ${BORDER}` }} />
      <ManagePanel
        title="Course Management"
        items={courses}
        itemKey="course"
        addPlaceholder="e.g. Bachelor of Science in Criminology"
        adding={addingC}
        onAdd={addCourse}
        onEdit={editCourse}
        onDelete={deleteCourse}
      />
      <div style={{ borderTop: `1px solid ${BORDER}` }} />
      <SectionPanel
        sections={sections}
        adding={addingS}
        onAdd={addSection}
        onEdit={editSection}
        onDelete={deleteSection}
      />
      <div style={{ borderTop: `1px solid ${BORDER}` }} />
      <ManagePanel
        title="Room Management"
        items={rooms}
        itemKey="name"
        addPlaceholder="e.g. Room 101"
        adding={addingR}
        onAdd={addRoom}
        onEdit={editRoom}
        onDelete={deleteRoom}
      />
    </div>
  );
}
