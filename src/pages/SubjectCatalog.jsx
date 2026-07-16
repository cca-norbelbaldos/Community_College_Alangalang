import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { showToast, showConfirm } from "../components/Toast";

const GOLD       = "#F5A800";
const GREEN      = "#3d6e01";
const DARK_GREEN = "#3d6e01";
const WHITE      = "#FFFFFF";
const GRAY       = "#6B7280";
const LIGHT_GRAY = "#F9FAFB";
const BORDER     = "#E5E7EB";
const RED        = "#DC2626";
const BLUE       = "#1E88E5";

const YEAR_LEVELS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
const DESCRIPTION_OPTIONS = [
  { code: "Ia",  label: "General Courses" },
  { code: "Ib",  label: "Elective Courses" },
  { code: "Ic",  label: "Mandated Courses" },
  { code: "II",  label: "Additional GE Courses" },
  { code: "III", label: "Physical Education" },
  { code: "IV",  label: "ROTC" },
  { code: "Va",  label: "Professional Courses - Core Courses" },
  { code: "Vb",  label: "Professional Courses - Major Courses" },
  { code: "CMO",  label: "CMO #39 S. 2021" },
];

export default function SubjectCatalog() {
  const [subjects, setSubjects]       = useState([]);
  const [courses, setCourses]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [subjectFilter, setSubjectFilter] = useState({ course: "", year_level: "", semester: "" });
  const [expandedSections, setExpandedSections] = useState({});
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [editingSubjectId, setEditingSubjectId] = useState(null);
  const [subjectForm, setSubjectForm] = useState({
    subject_code: "", subject_title: "", units: "3",
    lec_hours: "3", lab_hours: "0", pre_requisite: "None", description: "",
    course: "", year_level: "1st Year", semester: "1"
  });

  const toggleSection = (key) => setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));

  const fetchData = async () => {
    setLoading(true);
    try {
      const [subRes, cRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/api/erd/subjects`),
        fetch(`${import.meta.env.VITE_API_URL}/api/erd/courses`),
      ]);
      if (subRes.ok) setSubjects(await subRes.json());
      if (cRes.ok) {
        const courseData = await cRes.json();
        setCourses(courseData.map(c => c.course));
      }
    } catch (err) {
      console.error("Subject catalog fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filteredSubjects = subjects.filter(sub => {
    if (subjectFilter.course    && sub.course    !== subjectFilter.course)    return false;
    if (subjectFilter.year_level && sub.year_level !== subjectFilter.year_level) return false;
    if (subjectFilter.semester  && String(sub.semester) !== subjectFilter.semester) return false;
    return true;
  });

  const handleSubjectSubmit = async (e) => {
    e.preventDefault();
    const url = editingSubjectId
      ? `${import.meta.env.VITE_API_URL}/api/erd/subjects/${editingSubjectId}`
      : `${import.meta.env.VITE_API_URL}/api/erd/subjects`;
    try {
      const res = await fetch(url, {
        method: editingSubjectId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subjectForm),
      });
      if (res.ok) { setShowSubjectModal(false); fetchData(); showToast("Subject saved.", "success"); }
      else showToast("Failed to save subject.", "error");
    } catch { showToast("Network error.", "error"); }
  };

  const triggerSubjectDeletion = (id) => {
    showConfirm({
      message: "Delete this subject? This cannot be undone.",
      confirmLabel: "Delete",
      icon: "🗑️",
      onConfirm: async () => {
        try {
          const res = await fetch(`${import.meta.env.VITE_API_URL}/api/erd/subjects/${id}`, { method: "DELETE" });
          if (res.ok) { showToast("Subject deleted.", "info"); fetchData(); }
          else showToast("Failed to delete subject.", "error");
        } catch { showToast("Network error.", "error"); }
      },
    });
  };

  const yearLabel = (y) => ({ "1st Year": "FIRST YEAR", "2nd Year": "SECOND YEAR", "3rd Year": "THIRD YEAR", "4th Year": "FOURTH YEAR" }[y] || y?.toUpperCase() || "UNASSIGNED");
  const semLabel  = (s) => ({ "1": "FIRST SEMESTER", "2": "SECOND SEMESTER", 1: "FIRST SEMESTER", 2: "SECOND SEMESTER" }[s] || "UNASSIGNED");

  const ORDER = [
    ["1st Year","1"],["1st Year","2"],
    ["2nd Year","1"],["2nd Year","2"],
    ["3rd Year","1"],["3rd Year","2"],
    ["4th Year","1"],["4th Year","2"],
  ];

  const grouped = {};
  filteredSubjects.forEach(sub => {
    const key = `${sub.year_level || ""}|||${String(sub.semester ?? "")}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(sub);
  });
  const orderedKeys = ORDER.map(([y,s]) => `${y}|||${s}`);
  const extraKeys   = Object.keys(grouped).filter(k => !orderedKeys.includes(k));
  const allKeys     = [...orderedKeys, ...extraKeys].filter(k => grouped[k]?.length > 0);

  return (
    <div style={{ fontFamily: "system-ui, sans-serif" }}>
      <div style={{ background: WHITE, borderRadius: "10px", border: `1px solid ${BORDER}`, overflow: "hidden" }}>

        {/* ── Header ── */}
        <div style={{ padding: "14px 20px", background: LIGHT_GRAY, borderBottom: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
          <h3 style={{ margin: 0, fontSize: "14px", color: DARK_GREEN, fontWeight: 800 }}>Subject Catalog</h3>
          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            <select value={subjectFilter.course} onChange={e => setSubjectFilter(f => ({ ...f, course: e.target.value }))}
              style={{ padding: "6px 10px", border: `1px solid ${BORDER}`, borderRadius: "6px", fontSize: "12px", background: WHITE, color: "#111827", cursor: "pointer" }}>
              <option value="">All Courses</option>
              {courses.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={subjectFilter.year_level} onChange={e => setSubjectFilter(f => ({ ...f, year_level: e.target.value }))}
              style={{ padding: "6px 10px", border: `1px solid ${BORDER}`, borderRadius: "6px", fontSize: "12px", background: WHITE, color: "#111827", cursor: "pointer" }}>
              <option value="">All Year Levels</option>
              {YEAR_LEVELS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select value={subjectFilter.semester} onChange={e => setSubjectFilter(f => ({ ...f, semester: e.target.value }))}
              style={{ padding: "6px 10px", border: `1px solid ${BORDER}`, borderRadius: "6px", fontSize: "12px", background: WHITE, color: "#111827", cursor: "pointer" }}>
              <option value="">All Semesters</option>
              <option value="1">1st Semester</option>
              <option value="2">2nd Semester</option>
            </select>
            {(subjectFilter.course || subjectFilter.year_level || subjectFilter.semester) && (
              <button type="button" onClick={() => setSubjectFilter({ course: "", year_level: "", semester: "" })}
                style={{ padding: "6px 10px", border: `1px solid ${BORDER}`, borderRadius: "6px", fontSize: "12px", background: WHITE, cursor: "pointer", color: GRAY }}>
                ✕ Clear
              </button>
            )}
            <button type="button"
              onClick={() => {
                setSubjectForm({ subject_code: "", subject_title: "", units: "3", lec_hours: "3", lab_hours: "0", pre_requisite: "None", description: "", course: subjectFilter.course || courses[0] || "", year_level: subjectFilter.year_level || "1st Year", semester: subjectFilter.semester || "1" });
                setEditingSubjectId(null);
                setShowSubjectModal(true);
              }}
              style={{ padding: "8px 14px", background: DARK_GREEN, color: WHITE, border: "none", borderRadius: "6px", fontWeight: 700, cursor: "pointer" }}>
              ➕ Add Subject
            </button>
          </div>
        </div>

        {/* Filter summary */}
        {subjectFilter.course && (
          <div style={{ padding: "8px 20px", background: "#eaf2d9", borderBottom: `1px solid ${BORDER}`, fontSize: "12px", color: DARK_GREEN, fontWeight: 600 }}>
            Showing: {subjectFilter.course} — {subjectFilter.year_level || "All Years"} — {subjectFilter.semester === "1" ? "1st Semester" : subjectFilter.semester === "2" ? "2nd Semester" : "All Semesters"}
            <span style={{ color: GRAY, fontWeight: 400, marginLeft: "8px" }}>({filteredSubjects.length} subject{filteredSubjects.length !== 1 ? "s" : ""})</span>
          </div>
        )}

        {/* ── Body ── */}
        {loading ? (
          <div style={{ padding: "52px", textAlign: "center", color: GRAY }}>⏳ Loading subjects...</div>
        ) : !subjectFilter.course ? (
          <div style={{ padding: "52px 40px", textAlign: "center", color: GRAY, fontSize: "13px" }}>
            <div style={{ fontSize: "32px", marginBottom: "12px" }}>📚</div>
            <div style={{ fontWeight: 700, color: DARK_GREEN, fontSize: "14px", marginBottom: "6px" }}>Select a Course to View Subjects</div>
            <div style={{ color: GRAY, fontSize: "12px" }}>Use the <strong>course dropdown</strong> above to choose a program.</div>
          </div>
        ) : allKeys.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: GRAY, fontSize: "13px" }}>No subjects match the selected filters.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {allKeys.map((key, idx) => {
              const [yearRaw, semRaw] = key.split("|||");
              const subs   = grouped[key];
              const isLast = idx === allKeys.length - 1;
              const isOpen = !!expandedSections[key];

              return (
                <div key={key} style={{ borderBottom: isLast ? "none" : `1px solid ${BORDER}` }}>
                  {/* Section header */}
                  <div onClick={() => toggleSection(key)} style={{ padding: "10px 20px", background: isOpen ? `${DARK_GREEN}18` : `${DARK_GREEN}10`, borderBottom: isOpen ? `2px solid ${DARK_GREEN}22` : "none", display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", userSelect: "none" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "20px", height: "20px", borderRadius: "4px", background: isOpen ? DARK_GREEN : `${DARK_GREEN}22`, color: isOpen ? WHITE : DARK_GREEN, fontSize: "10px", fontWeight: 900, flexShrink: 0, transition: "all 0.15s" }}>
                      {isOpen ? "▾" : "▸"}
                    </span>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: "12px", fontWeight: 800, color: DARK_GREEN, letterSpacing: "0.08em" }}>{yearLabel(yearRaw)}</span>
                      <span style={{ fontSize: "12px", color: GRAY, fontWeight: 600, margin: "0 8px" }}>—</span>
                      <span style={{ fontSize: "12px", fontWeight: 700, color: GREEN, letterSpacing: "0.06em" }}>{semLabel(semRaw)}</span>
                    </div>
                    <span style={{ fontSize: "11px", color: GRAY, fontWeight: 500 }}>{subs.length} subject{subs.length !== 1 ? "s" : ""}</span>
                  </div>

                  {isOpen && (
                    <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                      <thead>
                        <tr style={{ background: LIGHT_GRAY, fontSize: "10px", color: GRAY, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          <th rowSpan={2} style={{ padding: "8px 12px", border: `1px solid ${BORDER}`, whiteSpace: "nowrap", width: "1%", verticalAlign: "middle" }}>Course Code</th>
                          <th rowSpan={2} style={{ padding: "8px 12px", border: `1px solid ${BORDER}`, verticalAlign: "middle", textAlign: "center" }}>Course Title</th>
                          <th colSpan={2} style={{ padding: "6px 12px", border: `1px solid ${BORDER}`, textAlign: "center", whiteSpace: "nowrap" }}>No. of Hours per week</th>
                          <th rowSpan={2} style={{ padding: "8px 12px", border: `1px solid ${BORDER}`, textAlign: "center", whiteSpace: "nowrap", width: "1%", verticalAlign: "middle" }}>Credit Units</th>
                          <th rowSpan={2} style={{ padding: "8px 12px", border: `1px solid ${BORDER}`, whiteSpace: "nowrap", width: "10%", verticalAlign: "middle", textAlign: "center" }}>Pre-Requisite</th>
                          <th rowSpan={2} style={{ padding: "8px 12px", border: `1px solid ${BORDER}`, whiteSpace: "nowrap", width: "1%", verticalAlign: "middle", textAlign: "center" }}>Description</th>
                          <th rowSpan={2} style={{ padding: "8px 12px", textAlign: "center", border: `1px solid ${BORDER}`, whiteSpace: "nowrap", width: "1%", verticalAlign: "middle" }}>Actions</th>
                        </tr>
                        <tr style={{ background: LIGHT_GRAY, fontSize: "10px", color: GRAY, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          <th style={{ padding: "5px 12px", border: `1px solid ${BORDER}`, textAlign: "center", width: "1%", whiteSpace: "nowrap" }}>LEC</th>
                          <th style={{ padding: "5px 12px", border: `1px solid ${BORDER}`, textAlign: "center", width: "1%", whiteSpace: "nowrap" }}>LAB</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subs.map(sub => (
                          <tr key={sub.id} style={{ borderBottom: `1px solid ${BORDER}` }}
                            onMouseEnter={e => e.currentTarget.style.background = LIGHT_GRAY}
                            onMouseLeave={e => e.currentTarget.style.background = WHITE}>
                            <td style={{ padding: "10px 12px", fontSize: "12px", fontWeight: 700, color: BLUE, whiteSpace: "nowrap" }}>{sub.subject_code || "—"}</td>
                            <td style={{ padding: "10px 12px", fontSize: "13px", fontWeight: 600, color: "#111827", textAlign: "center" }}>{sub.subject_title}</td>
                            <td style={{ padding: "10px 12px", fontSize: "12px", color: "#374151", textAlign: "center" }}>{sub.lec_hours ?? 0}</td>
                            <td style={{ padding: "10px 12px", fontSize: "12px", color: "#374151", textAlign: "center" }}>{sub.lab_hours ?? 0}</td>
                            <td style={{ padding: "10px 12px", fontSize: "12px", textAlign: "center", fontWeight: 700, color: DARK_GREEN }}>{sub.units}</td>
                            <td style={{ padding: "10px 12px", fontSize: "12px", color: "#374151", textAlign: "center" }}>{sub.pre_requisite || "None"}</td>
                            <td style={{ padding: "10px 12px", fontSize: "12px", fontWeight: 700, color: DARK_GREEN, textAlign: "center", whiteSpace: "nowrap" }}>{sub.description || "—"}</td>
                            <td style={{ padding: "10px 12px", textAlign: "center", whiteSpace: "nowrap" }}>
                              <div style={{ display: "flex", justifyContent: "center", gap: "6px" }}>
                                <button type="button"
                                  onClick={(e) => { e.stopPropagation(); setSubjectForm({ subject_code: sub.subject_code || "", subject_title: sub.subject_title || "", units: String(sub.units ?? "3"), lec_hours: String(sub.lec_hours ?? "3"), lab_hours: String(sub.lab_hours ?? "0"), pre_requisite: sub.pre_requisite || "None", description: sub.description || "", course: sub.course || courses[0] || "", year_level: sub.year_level || "1st Year", semester: sub.semester != null ? String(sub.semester) : "1" }); setEditingSubjectId(sub.id); setShowSubjectModal(true); }}
                                  style={{ padding: "4px 10px", background: LIGHT_GRAY, border: `1px solid ${BORDER}`, borderRadius: "4px", fontSize: "11px", cursor: "pointer", fontWeight: 600 }}>
                                  Modify
                                </button>
                                <button type="button"
                                  onClick={(e) => { e.stopPropagation(); triggerSubjectDeletion(sub.id); }}
                                  style={{ padding: "4px 10px", background: WHITE, border: `1px solid ${BORDER}`, borderRadius: "4px", fontSize: "11px", color: RED, cursor: "pointer", fontWeight: 600 }}>
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{ background: LIGHT_GRAY, borderTop: `2px solid ${BORDER}` }}>
                          <td colSpan={2} style={{ padding: "9px 12px", fontSize: "12px", fontWeight: 800, color: DARK_GREEN, textAlign: "right", textTransform: "uppercase", letterSpacing: "0.05em" }}>TOTAL:</td>
                          <td style={{ padding: "9px 12px", fontSize: "13px", fontWeight: 800, color: DARK_GREEN, textAlign: "center" }}>{subs.reduce((s,sub) => s+(parseInt(sub.lec_hours,10)||0),0)}</td>
                          <td style={{ padding: "9px 12px", fontSize: "13px", fontWeight: 800, color: DARK_GREEN, textAlign: "center" }}>{subs.reduce((s,sub) => s+(parseInt(sub.lab_hours,10)||0),0)}</td>
                          <td style={{ padding: "9px 12px", fontSize: "13px", fontWeight: 800, color: DARK_GREEN, textAlign: "center" }}>{subs.reduce((s,sub) => s+(parseInt(sub.units,10)||0),0)}</td>
                          <td colSpan={3} />
                        </tr>
                      </tfoot>
                    </table>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Subject modal ── */}
      {showSubjectModal && createPortal(
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2147483647 }}>
          <form onSubmit={handleSubjectSubmit} style={{ background: WHITE, borderRadius: "10px", width: "100%", maxWidth: "420px", padding: "20px", display: "flex", flexDirection: "column", gap: "12px", boxSizing: "border-box" }}>
            <h3 style={{ margin: 0, color: DARK_GREEN, fontSize: "15px", fontWeight: 800 }}>{editingSubjectId ? "✏️ Edit Subject" : "➕ Add Subject"}</h3>
            {[["Subject Code *","subject_code","e.g. CR121"],["Subject Title *","subject_title","e.g. Criminal Law"]].map(([lbl,key,ph]) => (
              <div key={key} style={{ display:"flex",flexDirection:"column",gap:"4px" }}>
                <label style={{ fontSize:"11px",fontWeight:700,color:GRAY }}>{lbl}</label>
                <input type="text" value={subjectForm[key]} onChange={e=>setSubjectForm({...subjectForm,[key]:e.target.value})} required placeholder={ph} style={{ padding:"8px",border:`1px solid ${BORDER}`,borderRadius:"6px" }} />
              </div>
            ))}
            <div style={{ display:"flex",gap:"10px" }}>
              {[["LEC Hours","lec_hours"],["LAB Hours","lab_hours"],["Credit Units *","units"]].map(([lbl,key]) => (
                <div key={key} style={{ display:"flex",flexDirection:"column",gap:"4px",flex:1,minWidth:0 }}>
                  <label style={{ fontSize:"11px",fontWeight:700,color:GRAY }}>{lbl}</label>
                  <input type="number" min="0" value={subjectForm[key]} onChange={e=>setSubjectForm({...subjectForm,[key]:e.target.value})} required={key==="units"} style={{ padding:"8px",border:`1px solid ${BORDER}`,borderRadius:"6px",width:"100%",boxSizing:"border-box" }} />
                </div>
              ))}
            </div>
            <div style={{ display:"flex",flexDirection:"column",gap:"4px" }}>
              <label style={{ fontSize:"11px",fontWeight:700,color:GRAY }}>Pre-Requisite</label>
              <input type="text" value={subjectForm.pre_requisite} onChange={e=>setSubjectForm({...subjectForm,pre_requisite:e.target.value})} placeholder="None or subject code" style={{ padding:"8px",border:`1px solid ${BORDER}`,borderRadius:"6px" }} />
            </div>
            <div style={{ display:"flex",flexDirection:"column",gap:"4px" }}>
              <label style={{ fontSize:"11px",fontWeight:700,color:GRAY }}>Description</label>
              <select value={subjectForm.description} onChange={e=>setSubjectForm({...subjectForm,description:e.target.value})} style={{ padding:"8px",border:`1px solid ${BORDER}`,borderRadius:"6px",background:WHITE }}>
                <option value="">Select category...</option>
                {DESCRIPTION_OPTIONS.map(opt => <option key={opt.code} value={opt.code}>{opt.code} — {opt.label}</option>)}
              </select>
            </div>
            <div style={{ display:"flex",flexDirection:"column",gap:"4px" }}>
              <label style={{ fontSize:"11px",fontWeight:700,color:GRAY }}>Course *</label>
              <select value={subjectForm.course} onChange={e=>setSubjectForm({...subjectForm,course:e.target.value})} style={{ padding:"8px",border:`1px solid ${BORDER}`,borderRadius:"6px",background:WHITE }}>
                {courses.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ display:"flex",gap:"10px" }}>
              <div style={{ display:"flex",flexDirection:"column",gap:"4px",flex:1 }}>
                <label style={{ fontSize:"11px",fontWeight:700,color:GRAY }}>Year Level *</label>
                <select value={subjectForm.year_level} onChange={e=>setSubjectForm({...subjectForm,year_level:e.target.value})} style={{ padding:"8px",border:`1px solid ${BORDER}`,borderRadius:"6px",background:WHITE }}>
                  {YEAR_LEVELS.map(y=><option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div style={{ display:"flex",flexDirection:"column",gap:"4px",flex:1 }}>
                <label style={{ fontSize:"11px",fontWeight:700,color:GRAY }}>Semester *</label>
                <select value={subjectForm.semester} onChange={e=>setSubjectForm({...subjectForm,semester:e.target.value})} style={{ padding:"8px",border:`1px solid ${BORDER}`,borderRadius:"6px",background:WHITE }}>
                  <option value="1">1st Semester</option>
                  <option value="2">2nd Semester</option>
                </select>
              </div>
            </div>
            <div style={{ display:"flex",justifyContent:"flex-end",gap:"8px",marginTop:"10px" }}>
              <button type="button" onClick={()=>setShowSubjectModal(false)} style={{ padding:"6px 14px",border:`1px solid ${BORDER}`,borderRadius:"6px",background:WHITE,cursor:"pointer" }}>Cancel</button>
              <button type="submit" style={{ padding:"6px 16px",background:DARK_GREEN,color:WHITE,border:"none",borderRadius:"6px",fontWeight:700,cursor:"pointer" }}>Save</button>
            </div>
     
          </form>
        </div>,
        document.body
      )}
    </div>
  );
}
