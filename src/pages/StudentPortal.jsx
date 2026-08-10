import { useState, useEffect, useMemo, useRef } from "react";

const GREEN      = "#3d6e01";
const DARK_GREEN = "#2c4a1e";
const GOLD       = "#F5A800";
const WHITE      = "#FFFFFF";
const GRAY       = "#6B7280";
const LIGHT_GRAY = "#F9FAFB";
const BORDER     = "#E5E7EB";
const RED        = "#C62828";

const API = import.meta.env.VITE_API_URL;

const DAY_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function StudentPortal({ user, section, onNavigate }) {
  const isAdmin = String(user?.role || "").toLowerCase() === "administrator";
  if (isAdmin) return <LinkConfig />;
  if (section === "grades") return <StudentGradesPage user={user} />;
  if (section === "schedule") return <StudentSchedulePage user={user} />;
  if (section) return <StudentProfilePage user={user} section={section} onNavigate={onNavigate} />;
  return <StudentView user={user} onNavigate={onNavigate} />;
}

const SEM_NAME = { 1: "First Semester", 2: "Second Semester", 3: "Summer" };

/* ═══════════════════════════════════════════════════════════════
   STUDENT GRADES PAGE — grades grouped by school year + semester
   ═══════════════════════════════════════════════════════════════ */
function StudentGradesPage({ user }) {
  const [grades,  setGrades]  = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [search,  setSearch]  = useState("");
  const [semSel,  setSemSel]  = useState("all");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError("");
      try {
        const id = user?.student_id;
        if (!id) { setError("No student profile is linked to this account."); setLoading(false); return; }
        const [pRes, gRes] = await Promise.all([
          fetch(`${API}/api/erd/student/profile/${id}`, { cache: "no-store" }),
          fetch(`${API}/api/erd/grades/${id}?t=${Date.now()}`, { cache: "no-store" }),
        ]);
        if (cancelled) return;
        setProfile(pRes.ok ? await pRes.json() : null);
        setGrades(gRes.ok ? await gRes.json() : []);
      } catch { if (!cancelled) setError("Unable to reach the server."); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [user?.student_id]);

  // dedupe + group by year_start + semester
  const groups = useMemo(() => {
    const uniq = Array.from(new Map(grades.map(g => [`${g.subject_id}-${g.year_start}-${g.semester}`, g])).values());
    const map = new Map();
    uniq.forEach(g => {
      const key = `${g.year_start || 0}-${g.semester || 1}`;
      if (!map.has(key)) map.set(key, { year: g.year_start, sem: Number(g.semester) || 1, rows: [] });
      map.get(key).rows.push(g);
    });
    return [...map.values()].sort((a, b) => (b.year - a.year) || (b.sem - a.sem));
  }, [grades]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return groups
      .filter(g => semSel === "all" || String(g.sem) === semSel)
      .map(g => ({ ...g, rows: g.rows.filter(r =>
        !q || `${r.subject_code || ""} ${r.subject_title || ""}`.toLowerCase().includes(q)) }))
      .filter(g => g.rows.length);
  }, [groups, search, semSel]);

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: GRAY }}>Loading…</div>;
  if (error)   return <div style={{ padding: 30, textAlign: "center", color: RED, background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 10 }}>{error}</div>;

  // Weighted GWA = Σ(grade × units) ÷ Σ(units) over graded subjects.
  const gwaOf = (rows) => {
    const graded = rows.filter(r => { const n = parseFloat(r.grade); return !isNaN(n) && n > 0; });
    const units = graded.reduce((a, r) => a + (parseFloat(r.units) || 0), 0);
    if (!units) return "0.00";
    const wsum = graded.reduce((a, r) => a + parseFloat(r.grade) * (parseFloat(r.units) || 0), 0);
    return (wsum / units).toFixed(2);
  };

  return (
    <div style={{ fontFamily: "system-ui,-apple-system,sans-serif" }}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: "#1f2937" }}>My Grades</div>
        <div style={{ fontSize: 13, color: GRAY, marginTop: 2 }}>View your academic performance, grades, and term averages.</div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search course code or title…"
          style={{ width: 240, padding: "6px 10px", border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 12, outline: "none", boxSizing: "border-box" }} />
        <select value={semSel} onChange={e => setSemSel(e.target.value)}
          style={{ width: 160, padding: "6px 10px", border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 12, background: WHITE, outline: "none" }}>
          <option value="all">All Semesters</option>
          <option value="1">First Semester</option>
          <option value="2">Second Semester</option>
          <option value="3">Summer</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div style={{ padding: 30, textAlign: "center", color: GRAY, background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 12 }}>No grades to show yet.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(440px, 1fr))", gap: 16, alignItems: "start" }}>
          {filtered.map(g => (
            <div key={`${g.year}-${g.sem}`} style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: "hidden" }}>
              <div style={{ padding: "10px 12px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#1f2937" }}>S.Y. {g.year || "—"}-{g.year ? g.year + 1 : "—"} · {SEM_NAME[g.sem] || "Semester"}</div>
                  <div style={{ fontSize: 10, color: GRAY, marginTop: 1 }}>{profile?.course || "—"}</div>
                </div>
                <span style={{ fontSize: 9.5, fontWeight: 800, color: DARK_GREEN, background: "#ECFDF5", padding: "3px 8px", borderRadius: 20, whiteSpace: "nowrap" }}>SEM GWA: {gwaOf(g.rows)}</span>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                <thead>
                  <tr style={{ background: LIGHT_GRAY }}>
                    <th style={gTh}>Course Code</th>
                    <th style={gTh}>Descriptive Title</th>
                    <th style={{ ...gTh, textAlign: "center" }}>Units</th>
                    <th style={{ ...gTh, textAlign: "center" }}>Final Rating</th>
                    <th style={gTh}>Instructor</th>
                  </tr>
                </thead>
                <tbody>
                  {g.rows.map((r, i) => {
                    const has = r.grade != null && r.grade !== "" && parseFloat(r.grade) > 0;
                    return (
                      <tr key={r.id || i} style={{ borderBottom: `1px solid ${BORDER}` }}>
                        <td style={{ ...gTd, fontWeight: 700, color: DARK_GREEN }}>{r.subject_code || "—"}</td>
                        <td style={gTd}>{r.subject_title || "—"}</td>
                        <td style={{ ...gTd, textAlign: "center" }}>{r.units != null ? Number(r.units).toFixed(2) : "—"}</td>
                        <td style={{ ...gTd, textAlign: "center" }}>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 8px", borderRadius: 20, color: has ? "#166534" : GRAY, background: has ? "#DCFCE7" : "#F3F4F6" }}>
                            {has ? parseFloat(r.grade).toFixed(1) : "N/A"}
                          </span>
                        </td>
                        <td style={{ ...gTd, color: GRAY }}>{r.instructor || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
const gTh = { padding: "6px 10px", textAlign: "left", fontSize: 8.5, fontWeight: 700, letterSpacing: 0.3, textTransform: "uppercase", color: GRAY, borderBottom: `1px solid ${BORDER}` };
const gTd = { padding: "6px 10px", color: "#1f2937" };

// Maps a dashboard section key to the sidebar page label.
const SECTION_TO_PAGE = { personal: "Personal Information", education: "Educational Background", family: "Family Background" };

/* ═══════════════════════════════════════════════════════════════
   STUDENT PROFILE PAGE — Personal / Educational / Family (full page)
   ═══════════════════════════════════════════════════════════════ */
function StudentProfilePage({ user, section, onNavigate }) {
  const [s, setS] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const onPhotoChange = (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (!/^image\//.test(file.type)) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result;
      setUploading(true);
      try {
        const res = await fetch(`${API}/api/erd/student/${user.student_id}/photo`, {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profile_picture: dataUrl }),
        });
        if (res.ok) setS(prev => ({ ...prev, profile_picture: dataUrl }));
      } catch { /* ignore */ }
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError("");
      try {
        const id = user?.student_id;
        if (!id) { setError("No student profile is linked to this account."); setLoading(false); return; }
        const res = await fetch(`${API}/api/erd/student/profile/${id}`);
        if (!res.ok) { setError("Unable to load your profile."); setLoading(false); return; }
        if (!cancelled) setS(await res.json());
      } catch { if (!cancelled) setError("Unable to reach the server."); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [user?.student_id]);

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: GRAY }}>Loading…</div>;
  if (error)   return <div style={{ padding: 30, textAlign: "center", color: RED, background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 10 }}>{error}</div>;
  if (!s) return null;

  const name = (a, b, c) => [a, b, c].filter(Boolean).join(" ") || "—";
  const title = section === "personal" ? "Personal Information"
    : section === "education" ? "Educational Background" : "Family Background";
  const subtitle = section === "personal" ? "Your personal information on file with the Registrar."
    : section === "education" ? "Your educational background records." : "Your family background records.";

  return (
    <div style={{ fontFamily: "system-ui,-apple-system,sans-serif" }}>
      <style>{`
        .pp-two  { display:grid; grid-template-columns: 260px 1fr; gap:16px; align-items:start; }
        .pp-grid { display:grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap:8px 12px; }
        @media (max-width: 900px) { .pp-grid { grid-template-columns: repeat(2, minmax(0,1fr)); } }
        @media (max-width: 680px) {
          .pp-two  { grid-template-columns: 1fr; }
          .pp-grid { grid-template-columns: 1fr; }
        }
      `}</style>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: "#1f2937" }}>{title}</div>
        <div style={{ fontSize: 13, color: GRAY, marginTop: 2 }}>{subtitle}</div>
      </div>

      {section === "personal" && (
        <div className="pp-two">
          {/* photo card */}
          <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "22px 20px", textAlign: "center" }}>
            <div style={{ width: 120, height: 120, borderRadius: "50%", margin: "0 auto", overflow: "hidden", border: `3px solid ${GOLD}`, background: LIGHT_GRAY, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {s.profile_picture
                ? <img src={s.profile_picture} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <span style={{ fontSize: 38, fontWeight: 800, color: GREEN }}>{(s.first_name || "?").charAt(0)}{(s.last_name || "").charAt(0)}</span>}
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#1f2937", marginTop: 12 }}>{name(s.first_name, s.middle_name, s.last_name)}</div>
            <div style={{ fontSize: 12, color: GRAY, marginTop: 3, lineHeight: 1.3 }}>{s.course || "—"}</div>
            <div style={{ display: "inline-block", marginTop: 8, fontSize: 12, fontWeight: 700, color: DARK_GREEN, background: "#ECFDF5", padding: "3px 12px", borderRadius: 20 }}>{s.student_number || "—"}</div>

            <div style={{ borderTop: `1px solid ${BORDER}`, margin: "18px 0 0", paddingTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
              <input ref={fileRef} type="file" accept="image/*" onChange={onPhotoChange} style={{ display: "none" }} />
              <button onClick={() => fileRef.current && fileRef.current.click()} disabled={uploading} style={{ ...simBtn, cursor: uploading ? "default" : "pointer" }}>{uploading ? "Uploading…" : "⤴ Change Picture"}</button>
              <button onClick={() => onNavigate && onNavigate("Account Settings")} style={{ ...simBtn, cursor: "pointer" }}>◎ Change Account Password</button>
            </div>
          </div>
          {/* fields card */}
          <ProfileCard>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#1f2937", marginBottom: 2 }}>Personal Information</div>
            <PSection title="Basic Student Information" />
            <PGrid>
              <PField label="Student Number" value={s.student_number} />
              <PField label="Email Address" value={s.email} />
              <PField label="First Name" value={s.first_name} />
              <PField label="Middle Name" value={s.middle_name} />
              <PField label="Last Name" value={s.last_name} />
              <PField label="Birthday" value={s.birthdate} />
              <PField label="Gender" value={s.gender} />
              <PField label="Civil Status" value={s.status} />
              <PField label="Contact Number" value={s.mobile} />
              <PField label="Citizenship" value={s.citizenship} />
              <PField label="Religion" value={s.religion} />
              <PField label="Place of Birth" value={s.place_of_birth} />
            </PGrid>
            <PSection title="Address Details" />
            <PGrid>
              <PField label="Province" value={s.province} />
              <PField label="City / Municipality" value={s.municipality} />
              <PField label="Barangay" value={s.barangay} />
              <PField label="Zip Code" value={s.zip_code} />
            </PGrid>
          </ProfileCard>
        </div>
      )}

      {section === "education" && (
        <ProfileCard>
          <PSection title="Elementary" />
          <PGrid>
            <PField label="School" value={s.elem_school} />
            <PField label="Address" value={s.elem_address} />
            <PField label="Year Graduated" value={s.elem_year} />
            <PField label="Honors Received" value={s.elem_honors} />
          </PGrid>
          <PSection title="High School" />
          <PGrid>
            <PField label="School" value={s.hs_school} />
            <PField label="Address" value={s.hs_address} />
            <PField label="Year Graduated" value={s.hs_year} />
            <PField label="Honors Received" value={s.hs_honors} />
          </PGrid>
          <PSection title="College" />
          <PGrid>
            <PField label="School" value={s.col_school} />
            <PField label="Address" value={s.col_address} />
            <PField label="Year Graduated" value={s.col_year} />
            <PField label="Honors Received" value={s.col_honors} />
          </PGrid>
        </ProfileCard>
      )}

      {section === "family" && (
        <ProfileCard>
          <PSection title="Father" />
          <PGrid>
            <PField label="Name" value={name(s.father_first, s.father_middle, s.father_last)} />
            <PField label="Occupation" value={s.father_occupation} />
          </PGrid>
          <PSection title="Mother" />
          <PGrid>
            <PField label="Name" value={name(s.mother_first, s.mother_middle, s.mother_last)} />
            <PField label="Occupation" value={s.mother_occupation} />
            <PField label="Parents' Address" value={s.parents_address} />
            <PField label="Parents' Mobile" value={s.parents_mobile} />
          </PGrid>
          <PSection title="Guardian" />
          <PGrid>
            <PField label="Name" value={s.guardian_name} />
            <PField label="Relationship" value={s.guardian_relationship} />
            <PField label="Address" value={s.guardian_address} />
            <PField label="Mobile" value={s.guardian_mobile} />
          </PGrid>
          <PSection title="Spouse" />
          <PGrid>
            <PField label="Name" value={s.spouse_name} />
            <PField label="Occupation" value={s.spouse_occupation} />
          </PGrid>
        </ProfileCard>
      )}
    </div>
  );
}

function ProfileCard({ children }) {
  return <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "18px 20px" }}>{children}</div>;
}
function PSection({ title }) {
  return <div style={{ fontSize: 12, fontWeight: 800, color: GREEN, marginTop: 8, marginBottom: 4 }}>{title}</div>;
}
function PGrid({ children }) {
  return <div className="pp-grid">{children}</div>;
}
const simBtn = {
  width: "100%", padding: "9px 12px", borderRadius: 8, border: "none",
  background: "#ECFDF5", color: GREEN, fontSize: 12, fontWeight: 700,
  cursor: "not-allowed", fontFamily: "inherit",
};
function PField({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 9.5, fontWeight: 600, color: "#6B7280", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 11, color: "#1f2937", padding: "4px 8px", border: `1px solid ${BORDER}`, borderRadius: 6, background: WHITE, lineHeight: 1.25 }}>{value || "—"}</div>
    </div>
  );
}

/* ═══════════ STUDENT CLASS SCHEDULE (same subjects as the COR) ═══════════ */
function StudentSchedulePage({ user }) {
  const [rows, setRows] = useState([]);
  const [student, setStudent] = useState(null);
  const [termLabel, setTermLabel] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError("");
      try {
        const id = user?.student_id;
        if (!id) { setError("No student profile is linked to this account."); setLoading(false); return; }
        const pRes = await fetch(`${API}/api/erd/student/profile/${id}`, { cache: "no-store" });
        if (!pRes.ok) { setError("Unable to load your profile."); setLoading(false); return; }
        const s = await pRes.json();
        if (cancelled) return;
        setStudent(s);

        // Which semester is the student currently enrolled in? (latest enrollment record)
        const enrRes = await fetch(`${API}/api/erd/enrollments/${id}?t=${Date.now()}`, { cache: "no-store" });
        const enrs = enrRes.ok ? await enrRes.json() : [];
        if (cancelled) return;
        const semN = (x) => /2nd/i.test(x) ? 2 : /summer/i.test(x) ? 3 : 1;
        const latest = (Array.isArray(enrs) && enrs.length)
          ? [...enrs].sort((a, b) => (Number(b.year_enrolled) - Number(a.year_enrolled)) || (semN(b.semester) - semN(a.semester)))[0]
          : null;
        if (!latest) { setRows([]); setTermLabel("Not enrolled"); setLoading(false); return; }
        const curSem = semN(latest.semester);
        setTermLabel(`${latest.year_level || s.year_level || ""} · ${SEM_NAME[curSem] || "Semester"} · S.Y. ${latest.year_enrolled}-${Number(latest.year_enrolled) + 1}`.trim());

        // Schedule scoped to the CURRENT enrolled semester (matches the COR for that term).
        const params = new URLSearchParams({
          ...(s.course     ? { course: s.course }              : {}),
          ...(latest.year_level || s.year_level ? { year_level: latest.year_level || s.year_level } : {}),
          ...(s.section    ? { section: s.section }             : {}),
          ...(curSem       ? { semester: String(curSem) }       : {}),
        });
        const schRes = await fetch(`${API}/api/erd/class-schedule?${params}`, { cache: "no-store" });
        if (cancelled) return;
        const data = schRes.ok ? await schRes.json() : [];
        const uniq = Array.from(new Map((Array.isArray(data) ? data : []).map(r => [r.subject_id ?? r.subject_title, r])).values());
        setRows(uniq);
      } catch { if (!cancelled) setError("Unable to reach the server."); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [user?.student_id]);

  const th = { padding: "8px 10px", textAlign: "left", fontSize: 10, fontWeight: 700, letterSpacing: 0.3, textTransform: "uppercase", color: WHITE, borderBottom: `1px solid ${DARK_GREEN}`, background: DARK_GREEN };
  const td = { padding: "7px 10px", fontSize: 12, color: "#1f2937", borderBottom: `1px solid ${BORDER}` };

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: GRAY }}>Loading…</div>;
  if (error)   return <div style={{ padding: 30, textAlign: "center", color: RED, background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 10 }}>{error}</div>;

  return (
    <div style={{ fontFamily: "system-ui,-apple-system,sans-serif" }}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: "#1f2937" }}>Class Schedule</div>
        <div style={{ fontSize: 13, color: GRAY, marginTop: 2 }}>
          {student ? `${student.course || "—"}${student.section ? " · " + student.section : ""}` : "Your enrolled subjects"}
          {termLabel ? ` — ${termLabel}` : ""}
        </div>
      </div>

      <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
          <thead>
            <tr>
              <th style={th}>Course Code</th>
              <th style={th}>Descriptive Title</th>
              <th style={{ ...th, textAlign: "center" }}>Units</th>
              <th style={th}>Time</th>
              <th style={th}>Days</th>
              <th style={th}>Instructor</th>
              <th style={th}>Room</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={7} style={{ ...td, textAlign: "center", color: GRAY, padding: 24 }}>No class schedule available yet.</td></tr>
            ) : rows.map((r, i) => (
              <tr key={r.subject_id || i}>
                <td style={{ ...td, fontWeight: 700, color: DARK_GREEN }}>{r.subject_code || "—"}</td>
                <td style={td}>{r.subject_title || "—"}</td>
                <td style={{ ...td, textAlign: "center" }}>{r.units != null ? Number(r.units).toFixed(0) : "—"}</td>
                <td style={td}>{r.time || "—"}</td>
                <td style={td}>{r.day || "—"}</td>
                <td style={td}>{r.faculty_name && r.faculty_name.trim() ? r.faculty_name : "—"}</td>
                <td style={td}>{r.room || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ADMIN VIEW — create + link student login accounts
   Columns: Student No. (auto username) · Password (admin) ·
            Link Acc (pick a student) · Course · Action
   ═══════════════════════════════════════════════════════════════ */
let ROW_SEQ = 1;
function LinkConfig() {
  const [students,     setStudents]     = useState([]);
  const [linkedIds,    setLinkedIds]    = useState(() => new Set()); // student ids that have an erd_student_user account
  const [rows,         setRows]         = useState([]);   // [{ key, studentId, password, saved, saving }]
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [toast,        setToast]        = useState("");

  const load = async () => {
    setLoading(true); setError("");
    try {
      const [sRes, suRes] = await Promise.all([
        fetch(`${API}/api/erd/students`),
        fetch(`${API}/api/erd/student-users`),
      ]);
      if (!sRes.ok || !suRes.ok) throw new Error();
      const list = await sRes.json();
      const accts = await suRes.json();
      const linked = new Set(accts.map(a => String(a.student_id)));
      setStudents(list);
      setLinkedIds(linked);
      // seed rows from students that already have an account
      setRows(list.filter(s => linked.has(String(s.id))).map(s => ({
        key: `s${s.id}`, studentId: String(s.id), password: "", saved: true, saving: false,
      })));
    } catch {
      setError("Unable to load the student list. Check the server connection.");
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const notify = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2800); };
  const studentsById = useMemo(() => Object.fromEntries(students.map(s => [String(s.id), s])), [students]);

  const chosenIds = useMemo(() => new Set(rows.map(r => r.studentId).filter(Boolean)), [rows]);

  const addRow = () => setRows(rs => [...rs, { key: `n${ROW_SEQ++}`, studentId: "", password: "", saved: false, saving: false }]);
  const patchRow = (key, patch) => setRows(rs => rs.map(r => r.key === key ? { ...r, ...patch } : r));
  const removeRow = (key) => setRows(rs => rs.filter(r => r.key !== key));

  const save = async (row) => {
    const student = studentsById[row.studentId];
    if (!student) { notify("Pick a student first."); return; }
    if (!student.student_number) { notify("This student has no Student Number yet."); return; }
    if (!row.password.trim()) { notify("Enter a password."); return; }
    patchRow(row.key, { saving: true });
    try {
      const res = await fetch(`${API}/api/erd/student/${row.studentId}/create-account`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: row.password }),
      });
      const data = await res.json();
      if (!res.ok) { notify(data.message || "Failed to save."); patchRow(row.key, { saving: false }); return; }
      notify(`Account saved — ${data.username} can now log in.`);
      patchRow(row.key, { saving: false, saved: true, password: "" });
      // refresh linked status
      const suRes = await fetch(`${API}/api/erd/student-users`);
      if (suRes.ok) {
        const accts = await suRes.json();
        setLinkedIds(new Set(accts.map(a => String(a.student_id))));
      }
    } catch { notify("Unable to reach the server."); patchRow(row.key, { saving: false }); }
  };

  const unlink = async (row) => {
    const student = studentsById[row.studentId];
    if (!student) { removeRow(row.key); return; }
    if (!window.confirm(`Remove the login account for ${[student.first_name, student.last_name].filter(Boolean).join(" ")}? They will no longer be able to sign in.`)) return;
    patchRow(row.key, { saving: true });
    try {
      const res = await fetch(`${API}/api/erd/student/${row.studentId}/account`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) { notify(data.message || "Failed to unlink."); patchRow(row.key, { saving: false }); return; }
      notify("Account unlinked.");
      removeRow(row.key);
      setLinkedIds(prev => { const n = new Set(prev); n.delete(String(row.studentId)); return n; });
    } catch { notify("Unable to reach the server."); patchRow(row.key, { saving: false }); }
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: GRAY }}>Loading configuration…</div>;
  if (error)   return <div style={{ padding: 24, textAlign: "center", color: RED, background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 10 }}>{error}</div>;

  const linkedCount = rows.filter(r => r.saved).length;

  return (
    <div style={{ fontFamily: "system-ui,-apple-system,sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 900, color: DARK_GREEN }}>Student User Accounts</div>
          <div style={{ fontSize: 13, color: GRAY, marginTop: 2 }}>
            Pick a student, set a password, and save. The username is the student number automatically.
            <span style={{ fontWeight: 700, color: GREEN }}>  {linkedCount} active.</span>
          </div>
        </div>
        <button onClick={addRow} style={{
          padding: "9px 18px", borderRadius: 9, border: "none",
          background: `linear-gradient(135deg,${DARK_GREEN},${GREEN})`, color: WHITE,
          fontSize: 13, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap",
        }}>+ Add User</button>
      </div>

      {toast && (
        <div style={{ marginBottom: 12, padding: "8px 14px", background: "#ECFDF5", border: "1px solid #6EE7B7", color: "#065F46", borderRadius: 9, fontSize: 13, fontWeight: 600 }}>{toast}</div>
      )}

      {/* Table */}
      <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: LIGHT_GRAY }}>
                <th style={th}>Student No. <span style={{ fontWeight: 400, textTransform: "none" }}>(username)</span></th>
                <th style={th}>Password</th>
                <th style={th}>Link Acc</th>
                <th style={th}>Course</th>
                <th style={{ ...th, textAlign: "center" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={5} style={{ padding: 26, textAlign: "center", color: GRAY }}>
                  No accounts yet. Click <b>+ Add User</b> to create one.
                </td></tr>
              )}
              {rows.map(row => {
                const student = studentsById[row.studentId];
                const username = student?.student_number || "";
                const course   = student?.course || "";
                const canSave  = !!row.studentId && row.password.trim() !== "" && !row.saving;
                // options: students without an account + the one this row already picked
                const options = students.filter(s =>
                  !linkedIds.has(String(s.id)) || String(s.id) === row.studentId
                ).filter(s => !chosenIds.has(String(s.id)) || String(s.id) === row.studentId);

                return (
                  <tr key={row.key} style={{ borderBottom: `1px solid ${BORDER}` }}>
                    {/* Student No. (username) */}
                    <td style={{ ...td, fontWeight: 700, color: username ? DARK_GREEN : "#9CA3AF" }}>
                      {username || "—"}
                    </td>

                    {/* Password */}
                    <td style={td}>
                      <input
                        type="text" value={row.password}
                        onChange={e => patchRow(row.key, { password: e.target.value })}
                        placeholder={row.saved ? "•••••• (set — type to change)" : "Set password"}
                        disabled={!row.studentId}
                        style={{ width: 160, padding: "7px 9px", border: `1.5px solid ${row.password ? GOLD : BORDER}`, borderRadius: 8, fontSize: 12.5, outline: "none", background: row.studentId ? WHITE : "#F3F4F6" }}
                      />
                    </td>

                    {/* Link Acc — pick a student */}
                    <td style={td}>
                      <select
                        value={row.studentId}
                        disabled={row.saved}
                        onChange={e => patchRow(row.key, { studentId: e.target.value })}
                        style={{ width: "100%", minWidth: 210, padding: "7px 8px", border: `1.5px solid ${BORDER}`, borderRadius: 8, fontSize: 12.5, background: row.saved ? "#F3F4F6" : WHITE, outline: "none" }}
                      >
                        <option value="">— Select student —</option>
                        {options.map(s => (
                          <option key={s.id} value={s.id}>
                            {[s.last_name, s.first_name].filter(Boolean).join(", ")}{s.student_number ? ` (${s.student_number})` : ""}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Course */}
                    <td style={{ ...td, color: course ? "#1f2937" : "#9CA3AF" }}>{course || "—"}</td>

                    {/* Action */}
                    <td style={{ ...td, textAlign: "center", whiteSpace: "nowrap" }}>
                      {row.saved && !row.password ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 12, fontWeight: 800, color: "#166534", background: "#DCFCE7", padding: "5px 14px", borderRadius: 20 }}>✓ Linked</span>
                          <button onClick={() => unlink(row)} disabled={row.saving}
                            style={{ padding: "6px 14px", borderRadius: 8, border: `1.5px solid ${RED}`, background: WHITE, color: RED, fontSize: 12, fontWeight: 700, cursor: row.saving ? "not-allowed" : "pointer" }}>
                            {row.saving ? "…" : "Unlink"}
                          </button>
                        </span>
                      ) : (
                        <button
                          onClick={() => save(row)}
                          disabled={!canSave}
                          style={{
                            padding: "7px 18px", borderRadius: 8, border: "none",
                            background: canSave ? `linear-gradient(135deg,${DARK_GREEN},${GREEN})` : "#D1D5DB",
                            color: WHITE, fontSize: 12, fontWeight: 700,
                            cursor: canSave ? "pointer" : "not-allowed",
                          }}>
                          {row.saving ? "Saving…" : "Save"}
                        </button>
                      )}
                      {!row.saved && (
                        <button onClick={() => removeRow(row.key)} title="Remove row"
                          style={{ marginLeft: 8, border: "none", background: "none", color: "#9CA3AF", cursor: "pointer", fontSize: 16, lineHeight: 1 }}>×</button>
                      )}
                    </td>
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

/* ═══════════════════════════════════════════════════════════════
   STUDENT VIEW — the logged-in student's own portal
   ═══════════════════════════════════════════════════════════════ */
function StudentView({ user, onNavigate }) {
  const go = (key) => onNavigate && onNavigate(SECTION_TO_PAGE[key] || key);
  const [student,     setStudent]     = useState(null);
  const [grades,      setGrades]      = useState([]);
  const [schedule,    setSchedule]    = useState([]);
  const [curriculum,  setCurriculum]  = useState([]); // full program curriculum (all yrs/sems) for total units
  const [enrollments, setEnrollments] = useState([]);
  const [dates,       setDates]       = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState("");
  const [modal,       setModal]       = useState(null); // "personal" | "education" | "family"

  // Dates to Remember + Announcements — posted by admin, reflected here live.
  useEffect(() => {
    fetch(`${API}/api/erd/dates-to-remember?t=${Date.now()}`, { cache: "no-store" })
      .then(r => r.ok ? r.json() : [])
      .then(d => setDates(Array.isArray(d) ? d : []))
      .catch(() => setDates([]));
    fetch(`${API}/api/erd/student-announcements?t=${Date.now()}`, { cache: "no-store" })
      .then(r => r.ok ? r.json() : [])
      .then(d => setAnnouncements(Array.isArray(d) ? d : []))
      .catch(() => setAnnouncements([]));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError("");
      try {
        const studentId = user?.student_id;
        if (!studentId) {
          setError("No student profile is linked to this account yet. Please contact the Registrar.");
          setLoading(false);
          return;
        }
        const res = await fetch(`${API}/api/erd/student/profile/${studentId}`);
        if (!res.ok) {
          if (cancelled) return;
          setError(res.status === 404
            ? "No student profile is linked to this account yet. Please contact the Registrar."
            : "Unable to load your student profile.");
          setLoading(false);
          return;
        }
        const s = await res.json();
        if (cancelled) return;
        setStudent(s);

        // Grades + enrollments first, so we know which semester the student is in.
        const [gRes, enrRes] = await Promise.all([
          fetch(`${API}/api/erd/grades/${s.id}?t=${Date.now()}`, { cache: "no-store" }),
          fetch(`${API}/api/erd/enrollments/${s.id}?t=${Date.now()}`, { cache: "no-store" }),
        ]);
        if (cancelled) return;
        const enrs = enrRes.ok ? await enrRes.json() : [];
        setGrades(gRes.ok ? await gRes.json() : []);
        setEnrollments(enrs);

        // Current term = latest enrollment (highest year, then semester).
        const semN = (x) => /2nd/i.test(x) ? 2 : /summer/i.test(x) ? 3 : 1;
        const latestEnr = enrs.length
          ? [...enrs].sort((a, b) => (Number(b.year_enrolled) - Number(a.year_enrolled)) || (semN(b.semester) - semN(a.semester)))[0]
          : null;
        const curSem = latestEnr ? semN(latestEnr.semester) : null;

        // Schedule scoped to the CURRENT semester so Advised Subjects/Units match the term.
        const schRes = await fetch(`${API}/api/erd/class-schedule?` + new URLSearchParams({
          ...(s.course      ? { course: s.course }         : {}),
          ...(s.year_level  ? { year_level: s.year_level } : {}),
          ...(s.section     ? { section: s.section }       : {}),
          ...(curSem        ? { semester: String(curSem) } : {}),
        }), { cache: "no-store" });
        if (cancelled) return;
        setSchedule(schRes.ok ? await schRes.json() : []);

        // Full program curriculum (all years & semesters) — for "earned of total" units.
        if (s.course) {
          const curRes = await fetch(`${API}/api/erd/class-schedule?` + new URLSearchParams({ course: s.course }), { cache: "no-store" });
          if (cancelled) return;
          setCurriculum(curRes.ok ? await curRes.json() : []);
        } else {
          setCurriculum([]);
        }
      } catch {
        if (!cancelled) setError("Unable to reach the server. Check your connection.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.student_id]);

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: GRAY }}>Loading your portal…</div>;
  if (error)   return (
    <div style={{ padding: 30, textAlign: "center", color: RED, background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 10 }}>{error}</div>
  );
  if (!student) return null;

  const firstName = (student.first_name || "Student").toUpperCase();
  const fullName = [student.first_name, student.middle_name, student.last_name].filter(Boolean).join(" ");
  // Dedupe grade rows by subject (guards against duplicate erd_grades entries).
  const gradesU = Array.from(new Map(grades.map(g => [g.subject_id ?? g.id, g])).values());
  // GWA = Σ(grade × units) ÷ Σ(units) over graded subjects (weighted average).
  const gradedRows = gradesU.filter(g => { const n = parseFloat(g.grade); return !isNaN(n) && n > 0; });
  const allGraded = gradesU.length > 0 && gradedRows.length === gradesU.length;
  const wUnits = gradedRows.reduce((a, g) => a + (parseFloat(g.units) || 0), 0);
  const wSum   = gradedRows.reduce((a, g) => a + parseFloat(g.grade) * (parseFloat(g.units) || 0), 0);
  const gpa = (allGraded && wUnits > 0) ? (wSum / wUnits).toFixed(2) : null;
  const sortedSchedule = [...schedule].sort((a, b) => {
    const d = DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day);
    return d !== 0 ? d : String(a.time || "").localeCompare(String(b.time || ""));
  });

  // ── derived dashboard stats ──
  const now = new Date();
  const hr = now.getHours();
  const greeting = hr < 12 ? "Morning" : hr < 18 ? "Afternoon" : "Evening";
  const dateStr = now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const yr = now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1;
  const sy = `${yr} - ${yr + 1}`;
  // ── Everything is driven by ENROLLMENT RECORDS (erd_enrollment). ──
  // No enrollment record → not enrolled, and all counts are zero.
  const semNum = (s) => /2nd/i.test(s) ? 2 : /summer/i.test(s) ? 3 : 1;
  const isEnrolled = enrollments.length > 0;
  const totalSems = enrollments.length;
  // Current term = the latest enrollment (highest year, then semester).
  const currentEnr = isEnrolled
    ? [...enrollments].sort((a, b) => (Number(b.year_enrolled) - Number(a.year_enrolled)) || (semNum(b.semester) - semNum(a.semester)))[0]
    : null;
  const currentSem = currentEnr ? semNum(currentEnr.semester) : null;
  const semLabel = (n) => n === 2 ? "Second Semester" : n === 3 ? "Summer" : "First Semester";
  const currentSemLabel = currentSem ? semLabel(currentSem) : "First Semester";
  const currentSyLabel = currentEnr && currentEnr.year_enrolled
    ? `${currentEnr.year_enrolled} - ${Number(currentEnr.year_enrolled) + 1}`
    : sy;
  // Curriculum subjects for the enrolled term (empty when not enrolled).
  const uniqueSubjects = Array.from(new Map(schedule.map(s => [s.subject_id ?? s.subject_title, s])).values());
  const semSubjects = isEnrolled ? uniqueSubjects.filter(s => Number(s.semester) === currentSem) : [];
  const advisedSubjects = semSubjects.length;
  const advisedUnits = semSubjects.reduce((sum, s) => sum + (parseFloat(s.units) || 0), 0);
  // Total units EARNED — only subjects the student already passed (grade 1.00–3.00).
  const totalUnits = gradesU.reduce((sum, g) => {
    const gr = parseFloat(g.grade);
    const passed = g.remarks ? /pass/i.test(g.remarks) : (!isNaN(gr) && gr > 0 && gr <= 3.0);
    return passed ? sum + (parseFloat(g.units) || 0) : sum;
  }, 0);
  // Units for the semesters the student is ENROLLED in (adds up as she enrolls
  // each term). Denominator = 1st-sem units, +2nd-sem units once enrolled, etc.
  const enrolledUnits = (() => {
    if (!isEnrolled) return 0;
    const m = new Map();
    enrollments.forEach(enr => {
      const eSem = semNum(enr.semester);
      curriculum.forEach(sub => {
        if (String(sub.year_level || "") === String(enr.year_level || "") && Number(sub.semester) === eSem) {
          m.set(sub.subject_id ?? sub.subject_title, parseFloat(sub.units) || 0);
        }
      });
    });
    return Array.from(m.values()).reduce((a, u) => a + u, 0);
  })();

  const enrollStatus = isEnrolled ? "Enrolled" : "Not Enrolled";
  const enrollSub = isEnrolled
    ? `S.Y. ${currentEnr.year_enrolled}-${Number(currentEnr.year_enrolled) + 1}`
    : "Not yet enrolled";

  return (
    <div style={{ fontFamily: "system-ui,-apple-system,sans-serif" }}>
      <style>{`
        .sv-main   { display:grid; grid-template-columns: minmax(0,2.1fr) minmax(0,1fr); gap:14px; align-items:start; }
        .sv-stats  { display:grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap:10px; }
        .sv-two    { display:grid; grid-template-columns: 1fr 1fr; gap:14px; align-items:start; }
        @media (max-width: 860px) {
          .sv-main  { grid-template-columns: 1fr; }
          .sv-two   { grid-template-columns: 1fr; }
          .sv-stats { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>
      {/* ── Layout: main column (2fr) + right rail (1fr) ── */}
      <div className="sv-main">

        {/* ═══════════ MAIN COLUMN ═══════════ */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Welcome banner */}
          <div style={{ position: "relative", overflow: "hidden", padding: "16px 22px", background: `linear-gradient(120deg, ${DARK_GREEN} 0%, ${GREEN} 60%, #5a9e12 100%)`, borderRadius: 12, color: WHITE }}>
            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: 0.2 }}>Good {greeting}, {firstName}!</div>
              <div style={{ fontSize: 12.5, opacity: 0.95, marginTop: 4 }}>Today is {dateStr}</div>
              <div style={{ fontSize: 11.5, opacity: 0.85, marginTop: 1 }}>{currentSemLabel}, S.Y. {currentSyLabel}</div>
            </div>
            <div style={{ position: "absolute", right: -40, top: -40, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
            <div style={{ position: "absolute", right: 60, bottom: -50, width: 120, height: 120, borderRadius: "50%", background: "rgba(245,168,0,0.14)" }} />
          </div>

          {/* Stat cards */}
          <div className="sv-stats">
            <StatCard icon={<IconBook />}   tint="#EFF6FF" iconColor="#2563EB" value={`${advisedSubjects} subject/s`} label="Advised Subjects" sub="This semester" />
            <StatCard icon={<IconTarget />} tint="#FFF7ED" iconColor="#EA580C" value={`${advisedUnits} units`} label="Advised Units" sub="This semester" />
            <StatCard icon={<IconCal />}    tint="#ECFDF5" iconColor="#059669" value={String(totalSems)} label="Total Sems Enrolled" sub="Semesters" />
            <StatCard icon={<IconCap />}    tint="#F5F3FF" iconColor="#7C3AED" value={(isEnrolled && enrolledUnits > 0) ? `${totalUnits} / ${enrolledUnits}` : `${totalUnits}`} label="Total Units" sub={(isEnrolled && enrolledUnits > 0) ? "Units earned of enrolled" : "Units earned"} />
          </div>

          {/* Pre-enrollment + Profile status side by side */}
          <div className="sv-two">
            {/* col A */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Card>
                <CardTitle>Current Pre-Enrollment Details</CardTitle>
                <div style={{ padding: "12px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 6 }}>
                    <span style={{ fontSize: 17, fontWeight: 900, color: DARK_GREEN }}>{isEnrolled ? `${student.year_level || "—"} — ${currentSemLabel}` : "Not Enrolled"}</span>
                    <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: 0.5, color: isEnrolled ? GREEN : "#B45309", background: isEnrolled ? "#ECFDF5" : "#FEF3C7", padding: "2px 8px", borderRadius: 20, textTransform: "uppercase" }}>{isEnrolled ? "Enrolled" : "Pending"}</span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1f2937", lineHeight: 1.4 }}>{student.course || "No program assigned"}</div>
                </div>
              </Card>

              {/* Enrollment status + GWA */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div style={{ background: `linear-gradient(135deg, ${DARK_GREEN}, ${GREEN})`, color: WHITE, borderRadius: 12, padding: "14px 12px", textAlign: "center" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", opacity: 0.9 }}>Enrollment Status</div>
                  <div style={{ display: "flex", justifyContent: "center", margin: "8px 0" }}>{isEnrolled ? <IconCheck /> : <IconRefresh />}</div>
                  <div style={{ fontSize: 14, fontWeight: 800 }}>{enrollStatus}</div>
                  <div style={{ fontSize: 9.5, opacity: 0.8, marginTop: 4 }}>{enrollSub}</div>
                </div>
                <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "14px 12px", textAlign: "center", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", color: GRAY }}>Previous Semestral GWA</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: gpa ? DARK_GREEN : "#CBD5E1", margin: "6px 0", letterSpacing: 1 }}>{gpa || "—.——"}</div>
                  <div style={{ fontSize: 10, color: GRAY }}>{gpa ? "Computed from posted grades" : "Grades Incomplete"}</div>
                </div>
              </div>
            </div>

            {/* col B — Profile update status */}
            <Card>
              <CardTitle>Profile Update Status</CardTitle>
              <div style={{ padding: "8px 12px" }}>
                {[
                  { label: "Personal Information", view: "personal",   icon: <IconUser />,  tint: "#EFF6FF", c: "#2563EB" },
                  { label: "Educational Background", view: "education", icon: <IconCap />,  tint: "#EEF2FF", c: "#4F46E5" },
                  { label: "Family Background", view: "family",         icon: <IconUsers />,     tint: "#FFF7ED", c: "#EA580C" },
                ].map(row => (
                  <div key={row.label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 6px", borderBottom: `1px solid ${BORDER}` }}>
                    <span style={{ width: 30, height: 30, borderRadius: 8, background: row.tint, color: row.c, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{row.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11.5, fontWeight: 700, color: "#1f2937" }}>{row.label}</div>
                      <span style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: 0.5, color: "#166534", background: "#DCFCE7", padding: "1px 6px", borderRadius: 20, textTransform: "uppercase" }}>Updated</span>
                    </div>
                    <button onClick={() => go(row.view)} style={{ ...viewMore, border: "none", background: "none", cursor: "pointer" }}>View More →</button>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>

        {/* ═══════════ RIGHT RAIL ═══════════ */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Announcements — driven by admin's "Announcements" manager */}
          <Card>
            <CardTitle>Announcements</CardTitle>
            {announcements.length === 0 ? (
              <div style={{ minHeight: 150, padding: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ display: "inline-block", padding: "10px 16px", background: "#FEF2F2", color: "#991B1B", borderRadius: 10, fontSize: 12.5, fontWeight: 600 }}>ⓘ No announcements yet</div>
              </div>
            ) : (
              <div style={{ padding: "6px 12px 12px" }}>
                {announcements.map(a => (
                  <div key={a.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 4px", borderBottom: `1px solid ${BORDER}` }}>
                    <span style={{ width: 28, height: 28, borderRadius: 8, background: "#FEF2F2", color: "#DC2626", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>📢</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#1f2937" }}>{a.title}</div>
                      {a.body && <div style={{ fontSize: 11, color: GRAY, marginTop: 2, lineHeight: 1.4 }}>{a.body}</div>}
                      {a.posted_date && <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 2 }}>{a.posted_date}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Dates to remember — driven by admin's "Dates to Remember" manager */}
          <Card>
            <CardTitle>Dates to Remember</CardTitle>
            <div style={{ padding: "6px 12px 12px" }}>
              {dates.length === 0 ? (
                <div style={{ padding: "14px 4px", fontSize: 11.5, color: GRAY, textAlign: "center" }}>No dates posted yet.</div>
              ) : dates.map(row => (
                <div key={row.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 4px", borderBottom: `1px solid ${BORDER}` }}>
                  <span style={{ width: 28, height: 28, borderRadius: 8, background: "#EFF6FF", color: "#2563EB", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><IconCal /></span>
                  <div>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: "#1f2937" }}>{row.title}</div>
                    <div style={{ fontSize: 10.5, color: GRAY }}>{row.date_text || "—"}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* ── Detail modal (data from Student List) ── */}
      {modal && <InfoModal type={modal} s={student} onClose={() => setModal(null)} />}
    </div>
  );
}

/* ── Student info modal ── */
function InfoModal({ type, s, onClose }) {
  const title = type === "personal" ? "Personal Information"
    : type === "education" ? "Educational Background" : "Family Background";
  const name = (a, b, c) => [a, b, c].filter(Boolean).join(" ") || "—";

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(17,24,39,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: WHITE, borderRadius: 14, width: "100%", maxWidth: 560, maxHeight: "85vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: `1px solid ${BORDER}`, position: "sticky", top: 0, background: WHITE }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: DARK_GREEN }}>{title}</span>
          <button onClick={onClose} style={{ border: "none", background: "none", fontSize: 20, cursor: "pointer", color: GRAY, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: "8px 18px 18px" }}>
          {type === "personal" && (<>
            <IRow label="Full Name" value={name(s.first_name, s.middle_name, s.last_name)} />
            <IRow label="Student Number" value={s.student_number} />
            <IRow label="Gender" value={s.gender} />
            <IRow label="Birthdate" value={s.birthdate} />
            <IRow label="Place of Birth" value={s.place_of_birth} />
            <IRow label="Civil Status" value={s.status} />
            <IRow label="Religion" value={s.religion} />
            <IRow label="Citizenship" value={s.citizenship} />
            <IRow label="Address" value={[s.barangay, s.municipality, s.province, s.zip_code].filter(Boolean).join(", ")} />
            <IRow label="Email" value={s.email} />
            <IRow label="Mobile" value={s.mobile} />
          </>)}
          {type === "education" && (<>
            <IGroup title="Elementary" />
            <IRow label="School" value={s.elem_school} />
            <IRow label="Address" value={s.elem_address} />
            <IRow label="Year Graduated" value={s.elem_year} />
            <IRow label="Honors" value={s.elem_honors} />
            <IGroup title="High School" />
            <IRow label="School" value={s.hs_school} />
            <IRow label="Address" value={s.hs_address} />
            <IRow label="Year Graduated" value={s.hs_year} />
            <IRow label="Honors" value={s.hs_honors} />
            <IGroup title="College" />
            <IRow label="School" value={s.col_school} />
            <IRow label="Address" value={s.col_address} />
            <IRow label="Year Graduated" value={s.col_year} />
            <IRow label="Honors" value={s.col_honors} />
          </>)}
          {type === "family" && (<>
            <IGroup title="Father" />
            <IRow label="Name" value={name(s.father_first, s.father_middle, s.father_last)} />
            <IRow label="Occupation" value={s.father_occupation} />
            <IGroup title="Mother" />
            <IRow label="Name" value={name(s.mother_first, s.mother_middle, s.mother_last)} />
            <IRow label="Occupation" value={s.mother_occupation} />
            <IRow label="Parents' Address" value={s.parents_address} />
            <IRow label="Parents' Mobile" value={s.parents_mobile} />
            <IGroup title="Guardian" />
            <IRow label="Name" value={s.guardian_name} />
            <IRow label="Relationship" value={s.guardian_relationship} />
            <IRow label="Address" value={s.guardian_address} />
            <IRow label="Mobile" value={s.guardian_mobile} />
            <IGroup title="Spouse" />
            <IRow label="Name" value={s.spouse_name} />
            <IRow label="Occupation" value={s.spouse_occupation} />
          </>)}
        </div>
      </div>
    </div>
  );
}

function IRow({ label, value }) {
  return (
    <div style={{ display: "flex", gap: 12, padding: "8px 0", borderBottom: `1px solid #F3F4F6` }}>
      <div style={{ flex: "0 0 150px", fontSize: 12, fontWeight: 700, color: GRAY }}>{label}</div>
      <div style={{ flex: 1, fontSize: 13, color: "#1f2937" }}>{value || "—"}</div>
    </div>
  );
}
function IGroup({ title }) {
  return <div style={{ fontSize: 11, fontWeight: 800, color: DARK_GREEN, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 14, marginBottom: 2 }}>{title}</div>;
}

function Fact({ label, value }) {
  return (
    <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "12px 14px" }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", color: GRAY }}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: 800, color: DARK_GREEN, marginTop: 3 }}>{value}</div>
    </div>
  );
}

function Section({ title, count, children }) {
  return (
    <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden", marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: LIGHT_GRAY, borderBottom: `1px solid ${BORDER}` }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: DARK_GREEN }}>{title}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: WHITE, background: GREEN, borderRadius: 20, padding: "1px 9px" }}>{count}</span>
      </div>
      <div style={{ padding: count ? 0 : 16, overflowX: "auto" }}>{children}</div>
    </div>
  );
}

function Empty({ text }) {
  return <div style={{ padding: 24, textAlign: "center", color: GRAY, fontSize: 13 }}>{text}</div>;
}

function StatCard({ icon, tint, iconColor, value, label, sub }) {
  return (
    <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "11px 13px", display: "flex", alignItems: "center", gap: 11 }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: tint, color: iconColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: GRAY }}>{label}</div>
        <div style={{ fontSize: 16, fontWeight: 900, color: "#1f2937", lineHeight: 1.2 }}>{value}</div>
        <div style={{ fontSize: 9.5, color: "#9CA3AF" }}>{sub}</div>
      </div>
    </div>
  );
}

function Card({ children }) {
  return <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden" }}>{children}</div>;
}

function CardTitle({ children }) {
  return <div style={{ padding: "11px 14px", borderBottom: `1px solid ${BORDER}`, fontSize: 13, fontWeight: 700, color: "#1f2937" }}>{children}</div>;
}

/* ── Clean line icons ── */
const sv = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };
const IconBook   = () => <svg width="17" height="17" viewBox="0 0 24 24" {...sv}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>;
const IconTarget = () => <svg width="17" height="17" viewBox="0 0 24 24" {...sv}><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></svg>;
const IconCal    = () => <svg width="16" height="16" viewBox="0 0 24 24" {...sv}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const IconCap    = () => <svg width="17" height="17" viewBox="0 0 24 24" {...sv}><path d="M22 10 12 5 2 10l10 5 10-5Z"/><path d="M6 12v5c0 1 2.5 2.5 6 2.5s6-1.5 6-2.5v-5"/></svg>;
const IconUser   = () => <svg width="15" height="15" viewBox="0 0 24 24" {...sv}><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>;
const IconUsers  = () => <svg width="15" height="15" viewBox="0 0 24 24" {...sv}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const IconRefresh= () => <svg width="22" height="22" viewBox="0 0 24 24" {...sv}><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>;
const IconCheck  = () => <svg width="24" height="24" viewBox="0 0 24 24" {...sv}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;

const viewMore = { fontSize: 11.5, fontWeight: 700, color: "#2563EB", whiteSpace: "nowrap", cursor: "default" };
const tableStyle = { width: "100%", borderCollapse: "collapse", fontSize: 13 };
const th = { padding: "10px 14px", textAlign: "left", fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", color: GRAY, borderBottom: `1px solid ${BORDER}` };
const td = { padding: "10px 14px", color: "#1f2937" };
