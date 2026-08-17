import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { showToast, showConfirm } from "../components/Toast";
import ClassSchedule from "./ClassSchedule";
import ccaLogo        from "../assets/cca_logo.jpg";
import alangalangLogo from "../assets/Alangalang.png";

const GOLD       = "#F5A800";
const GREEN      = "#3d6e01";
const DARK_GREEN = "#3d6e01";
const WHITE      = "#FFFFFF";
const GRAY       = "#6B7280";
const LIGHT_GRAY = "#F9FAFB";
const BORDER     = "#E5E7EB";
const RED        = "#DC2626";
const BLUE       = "#1E88E5";
const LIGHT_BLUE = "#E3F2FD";
const TNR        = '"Times New Roman", Times, serif';

const YEAR_LEVELS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];

// Normalize a stored day value (which may be full names like "MONDAY,TUESDAY"
// or already-abbreviated "M,T") into compact abbreviations e.g. "M/T/SAT".
const DAY_LABEL = {
  M: "M", MON: "M", MONDAY: "M",
  T: "T", TU: "T", TUE: "T", TUES: "T", TUESDAY: "T",
  W: "WED", WED: "WED", WEDNESDAY: "WED",
  TH: "THU", THU: "THU", THUR: "THU", THURS: "THU", THURSDAY: "THU",
  F: "F", FRI: "F", FRIDAY: "F",
  SAT: "SAT", SATURDAY: "SAT",
  SUN: "SUN", SUNDAY: "SUN",
};
const DAY_ORDER = ["M", "T", "WED", "THU", "F", "SAT", "SUN"];
function formatDays(raw) {
  if (!raw) return "";
  const labels = String(raw)
    .split(",")
    .map(s => s.trim())
    .filter(Boolean)
    .map(tok => DAY_LABEL[tok.toUpperCase()] || tok);
  const seen = new Set();
  const unique = labels.filter(a => (seen.has(a) ? false : seen.add(a)));
  unique.sort((a, b) => {
    const ia = DAY_ORDER.indexOf(a), ib = DAY_ORDER.indexOf(b);
    if (ia === -1 || ib === -1) return 0;
    return ia - ib;
  });
  return unique.join("/");
}

// Renders a QR code as an <img> via a free public QR image service — no extra
// npm dependency required. `data` is whatever plain-text payload should be
// embedded (here: a compact, pipe-delimited student identity string).
const qrImageUrl = (data, size = 180) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;

const ENROLLMENT_PERIODS = [
  { year: "1st Year", sem: "1st Semester" },
  { year: "1st Year", sem: "2nd Semester" },
  { year: "2nd Year", sem: "1st Semester" },
  { year: "2nd Year", sem: "2nd Semester" },
  { year: "3rd Year", sem: "1st Semester" },
  { year: "3rd Year", sem: "2nd Semester" },
  { year: "4th Year", sem: "1st Semester" },
  { year: "4th Year", sem: "2nd Semester" },
];

// ── Comprehensive Student Information Sheet ─────────────────────────────────
// Colors matching the reference screenshot
const SI_GREEN   = "#3d6e01";
const SI_ORANGE  = "#E65100";
const SI_PURPLE  = "#6A1B9A";
const SI_PINK    = "#AD1457";
const SI_MAGENTA = "#880E4F";

function StudentInfoPanel({ courses, API, onRefresh, activeSchoolYear }) {
  const _now = new Date();
  const _y = _now.getMonth() >= 5 ? _now.getFullYear() : _now.getFullYear() - 1;
  const DEFAULT_SY = activeSchoolYear || `${_y}-${_y + 1}`;

  const EMPTY_SI = {
    school_year: DEFAULT_SY, student_number: "", classification: "",
    last_name: "", first_name: "", middle_name: "", religion: "",
    gender: "Male", status: "", citizenship: "Filipino", acr_no: "",
    barangay: "", municipality: "Alangalang", province: "Leyte", zip_code: "",
    email: "", mobile: "", birthdate: "", place_of_birth: "",
    father_last: "", father_first: "", father_middle: "", father_occupation: "",
    mother_last: "", mother_first: "", mother_middle: "", mother_occupation: "",
    parents_address: "", parents_mobile: "",
    guardian_name: "", guardian_relationship: "",
    guardian_address: "", guardian_mobile: "",
    spouse_name: "", spouse_occupation: "", spouse_address: "", spouse_mobile: "",
    elem_school: "", elem_address: "", elem_year: "", elem_honors: "",
    hs_school:   "", hs_address:   "", hs_year:   "", hs_honors:   "",
    col_school:  "", col_address:  "", col_year:  "", col_honors:  "",
    scholastic_notes: "",
    course: "", year_level: "1st Year", section: "", year_enrolled: "",
  };

  const [form, setForm]   = useState(EMPTY_SI);
  const [saving, setSaving] = useState(false);
  const [showBdCal, setShowBdCal] = useState(false);
  const [calBdYear, setCalBdYear] = useState(new Date().getFullYear());
  const [calBdMonth, setCalBdMonth] = useState(new Date().getMonth());
  // Configurable scholastic-requirements checklist (managed in System).
  const [reqOptions, setReqOptions] = useState([]);
  useEffect(() => {
    fetch(`${API}/api/erd/scholastic-requirements?t=${Date.now()}`, { cache: "no-store" })
      .then(r => r.ok ? r.json() : [])
      .then(d => setReqOptions(Array.isArray(d) ? d.map(x => x.name) : []))
      .catch(() => setReqOptions([]));
  }, []);

  const fetchNextId = async (syear) => {
    const yr = (syear || "").split("-")[0].trim();
    if (yr.length !== 4 || !/^\d{4}$/.test(yr)) return;
    try {
      const r = await fetch(`${API}/api/erd/students/next-id?year=${yr}`);
      if (r.ok) {
        const data = await r.json();
        setForm(prev => ({ ...prev, student_number: data.student_number }));
      }
    } catch {}
  };

  const clearForm = () => {
    setForm(EMPTY_SI);
    fetchNextId(DEFAULT_SY);
  };

  const handleSave = async () => {
    if (saving) return;
    if (!form.last_name.trim() || !form.first_name.trim()) {
      showToast("First name and last name are required.", "error"); return;
    }
    if (!form.course) {
      showToast("Please select a Program Code.", "error"); return;
    }
    setSaving(true);
    try {
      const payload = {
        first_name:     form.first_name,
        middle_name:    form.middle_name,
        last_name:      form.last_name,
        student_number: form.student_number,
        course:         form.course,
        year_level:     form.year_level,
        section:        form.section,
        year_enrolled:  form.year_enrolled,
        gender:         form.gender,
        email:          form.email,
        mobile:         form.mobile,
        birthdate:      form.birthdate,
        place_of_birth: form.place_of_birth,
        barangay:       form.barangay,
        municipality:   form.municipality,
        province:       form.province,
        zip_code:       form.zip_code,
        religion:       form.religion,
        citizenship:    form.citizenship,
        status:         form.status,
        acr_no:         form.acr_no,
        classification: form.classification,
        // Family background
        father_last:   form.father_last,   father_first:  form.father_first,
        father_middle: form.father_middle, father_occupation: form.father_occupation,
        mother_last:   form.mother_last,   mother_first:  form.mother_first,
        mother_middle: form.mother_middle, mother_occupation: form.mother_occupation,
        parents_address: form.parents_address, parents_mobile: form.parents_mobile,
        guardian_name: form.guardian_name, guardian_relationship: form.guardian_relationship,
        guardian_address: form.guardian_address, guardian_mobile: form.guardian_mobile,
        spouse_name:   form.spouse_name,   spouse_occupation: form.spouse_occupation,
        spouse_address: form.spouse_address, spouse_mobile: form.spouse_mobile,
        // Educational background (scholastic record before enrollment)
        elem_school: form.elem_school, elem_address: form.elem_address, elem_year: form.elem_year, elem_honors: form.elem_honors,
        hs_school:   form.hs_school,   hs_address:   form.hs_address,   hs_year:   form.hs_year,   hs_honors:   form.hs_honors,
        col_school:  form.col_school,  col_address:  form.col_address,  col_year:  form.col_year,  col_honors:  form.col_honors,
        scholastic_notes: form.scholastic_notes,
      };
      const res = await fetch(`${API}/api/erd/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        showToast("Student saved and added to Student List.", "success");
        onRefresh();
        setForm(EMPTY_SI);
      } else {
        showToast("Failed to save student.", "error");
      }
    } catch { showToast("Network error.", "error"); }
    finally { setSaving(false); }
  };

  // When active school year loads from server, push it into the form automatically
  useEffect(() => {
    if (activeSchoolYear) {
      setForm(prev => ({ ...prev, school_year: activeSchoolYear }));
    }
  }, [activeSchoolYear]);

  // Auto-fetch next available ID whenever School Year changes
  useEffect(() => {
    fetchNextId(form.school_year);
  }, [form.school_year]);

  const f  = (key) => form[key] ?? "";
  const sf = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  // ── shared micro-helpers (plain / Times New Roman) ──────────────────────
  const TNR = '"Times New Roman", Times, serif';
  const ci = (extra={}) => ({
    width: "100%", padding: "4px 6px", border: "none", outline: "none",
    fontSize: "12px", boxSizing: "border-box", background: "transparent",
    fontFamily: TNR, color: "#000", ...extra,
  });
  // Left-label cell (no color — just black text on white)
  const rlc = (_bg, w="110px") => ({
    background: WHITE, color: "#000", padding: "5px 8px",
    fontSize: "10px", fontWeight: 700, letterSpacing: "0.03em",
    textTransform: "uppercase", width: w, flexShrink: 0,
    display: "flex", alignItems: "center", whiteSpace: "nowrap",
    borderRight: `1px solid ${BORDER}`, fontFamily: TNR,
  });
  // Standard field cell
  const fc = (flex=1) => ({
    flex, minWidth: 0, display: "flex", flexDirection: "column",
    borderRight: `1px solid ${BORDER}`,
  });
  // Simple label band above field (black text, light background)
  const bl = (_color) => ({
    fontSize: "9px", fontWeight: 700, color: "#000", background: "#F3F4F6",
    padding: "2px 6px", letterSpacing: "0.04em", textTransform: "uppercase",
    borderBottom: `1px solid ${BORDER}`, fontFamily: TNR,
  });

  return (
    <div style={{ fontFamily: TNR }}>
      {/* ── Form (always visible) ── */}
      <div style={{ border: `1px solid ${BORDER}`, borderRadius: "10px", overflow: "hidden", background: WHITE }}>

          {/* ── ROW 1: School Year / ID / Program / Classification ── */}
          <div style={{ display: "flex", borderBottom: `1px solid ${BORDER}` }}>
            {/* SCHOOL YEAR */}
            <div style={fc(1.4)}>
              <div style={bl(SI_GREEN)}>School Year</div>
              <input style={ci({ cursor: "default", color: DARK_GREEN, fontWeight: 700 })} readOnly value={f("school_year")} placeholder="e.g. 2026-2027" />
            </div>
            {/* ID NUMBER */}
            <div style={fc(1.2)}>
              <div style={bl(SI_GREEN)}>ID Number</div>
              <input style={ci({ cursor: "default", color: DARK_GREEN, fontWeight: 700, letterSpacing: "0.03em" })} readOnly value={f("student_number")} placeholder="Auto-generated" />
            </div>
            {/* PROGRAM CODE */}
            <div style={fc(2)}>
              <div style={bl(SI_GREEN)}>Program Code</div>
              <select style={ci({ cursor: "pointer" })} value={f("course")} onChange={e => sf("course", e.target.value)}>
                <option value="">— Select Program Code —</option>
                {courses.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {/* BLOCK NUMBER */}
            <div style={fc(1)}>
              <div style={bl(SI_GREEN)}>Block Number</div>
              <input style={ci({ cursor: "default", color: GRAY })} readOnly value={f("section")} placeholder="e.g. Block 1" />
            </div>
            {/* CLASSIFICATION */}
            <div style={{ ...fc(1.5), borderRight: "none" }}>
              <div style={bl(SI_GREEN)}>Classification</div>
              <select style={ci({ cursor: "pointer" })} value={f("classification")} onChange={e => sf("classification", e.target.value)}>
                {["","New","Old","Transferee","Returnee","Cross-Enrollee","Graduate"].map(v => <option key={v} value={v}>{v||"—"}</option>)}
              </select>
            </div>
          </div>

          {/* ── ROW 2: Name / Demographics ── */}
          <div style={{ display: "flex", borderBottom: `1px solid ${BORDER}` }}>
            <div style={fc(1.5)}>
              <div style={bl(SI_GREEN)}>Family Name</div>
              <input style={ci()} value={f("last_name")} onChange={e => sf("last_name", e.target.value)} />
            </div>
            <div style={fc(1.5)}>
              <div style={bl(SI_GREEN)}>First Name</div>
              <input style={ci()} value={f("first_name")} onChange={e => sf("first_name", e.target.value)} />
            </div>
            <div style={fc(1.2)}>
              <div style={bl(SI_GREEN)}>Middle Name</div>
              <input style={ci()} value={f("middle_name")} onChange={e => sf("middle_name", e.target.value)} />
            </div>
            <div style={fc(1)}>
              <div style={bl(SI_GREEN)}>Religion</div>
              <input style={ci()} value={f("religion")} onChange={e => sf("religion", e.target.value)} />
            </div>
            <div style={fc(0.8)}>
              <div style={bl(SI_GREEN)}>Gender</div>
              <select style={ci({ cursor: "pointer" })} value={f("gender")} onChange={e => sf("gender", e.target.value)}>
                <option>Male</option><option>Female</option><option>LGBTQIA+</option>
              </select>
            </div>
            <div style={fc(0.9)}>
              <div style={bl(SI_GREEN)}>Status</div>
              <select style={ci({ cursor: "pointer" })} value={f("status")} onChange={e => sf("status", e.target.value)}>
                {["","Single","Married","Widowed","Separated"].map(v => <option key={v} value={v}>{v||"—"}</option>)}
              </select>
            </div>
            <div style={fc(0.9)}>
              <div style={bl(SI_GREEN)}>Citizenship</div>
              <input style={ci()} value={f("citizenship")} onChange={e => sf("citizenship", e.target.value)} />
            </div>
            <div style={{ ...fc(1.2), borderRight: "none" }}>
              <div style={bl(SI_GREEN)}>ACR No. (if foreign)</div>
              <input style={ci()} value={f("acr_no")} onChange={e => sf("acr_no", e.target.value)} />
            </div>
          </div>

          {/* ── ROW 3: Address / Contact ── */}
          <div style={{ display: "flex", borderBottom: `1px solid ${BORDER}` }}>
            <div style={fc(1.2)}>
              <div style={bl(SI_GREEN)}>Barangay</div>
              <input style={ci()} value={f("barangay")} onChange={e => sf("barangay", e.target.value)} />
            </div>
            <div style={fc(1.2)}>
              <div style={bl(SI_GREEN)}>Municipality</div>
              <input style={ci()} value={f("municipality")} onChange={e => sf("municipality", e.target.value)} />
            </div>
            <div style={fc(1)}>
              <div style={bl(SI_GREEN)}>Province</div>
              <input style={ci()} value={f("province")} onChange={e => sf("province", e.target.value)} />
            </div>
            <div style={fc(0.7)}>
              <div style={bl(SI_GREEN)}>Zip Code</div>
              <input style={ci()} value={f("zip_code")} onChange={e => sf("zip_code", e.target.value)} />
            </div>
            <div style={fc(1.5)}>
              <div style={bl(SI_GREEN)}>E-mail Address</div>
              <input style={ci()} type="email" value={f("email")} onChange={e => sf("email", e.target.value)} />
            </div>
            <div style={fc(1)}>
              <div style={bl(SI_GREEN)}>Mobile #</div>
              <input style={ci()} value={f("mobile")} onChange={e => sf("mobile", e.target.value)} />
            </div>
            <div style={fc(1)}>
              <div style={bl(SI_GREEN)}>Birthdate</div>
              <div style={{ position:"relative" }}>
                <input
                  style={ci({ cursor:"pointer" })}
                  readOnly
                  value={f("birthdate") ? new Date(f("birthdate")+"T00:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) : ""}
                  placeholder="Select birthdate..."
                  onClick={()=>{ const d=f("birthdate")?new Date(f("birthdate")+"T00:00:00"):new Date(); setCalBdYear(d.getFullYear()); setCalBdMonth(d.getMonth()); setShowBdCal(v=>!v); }}
                />
                {showBdCal && (
                  <div style={{ position:"absolute", zIndex:9999, background:"#fff", border:"1px solid #ddd", borderRadius:"10px", boxShadow:"0 6px 20px rgba(0,0,0,0.15)", padding:"14px", top:"110%", left:0, minWidth:"270px" }}>
                    {/* Nav row */}
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"10px" }}>
                      <button type="button" onClick={()=>{ if(calBdMonth===0){setCalBdMonth(11);setCalBdYear(y=>y-1);}else setCalBdMonth(m=>m-1); }} style={{ background:"none", border:"none", cursor:"pointer", fontSize:"18px", color:"#3d6e01", lineHeight:1 }}>‹</button>
                      <div style={{ display:"flex", gap:"6px" }}>
                        <select value={calBdMonth} onChange={e=>setCalBdMonth(+e.target.value)} style={{ border:"1px solid #e5e7eb", borderRadius:"6px", padding:"3px 6px", fontSize:"12px", color:"#111", cursor:"pointer" }}>
                          {["January","February","March","April","May","June","July","August","September","October","November","December"].map((m,i)=><option key={i} value={i}>{m}</option>)}
                        </select>
                        <select value={calBdYear} onChange={e=>setCalBdYear(+e.target.value)} style={{ border:"1px solid #e5e7eb", borderRadius:"6px", padding:"3px 6px", fontSize:"12px", color:"#111", cursor:"pointer" }}>
                          {Array.from({length:80},(_,i)=>new Date().getFullYear()-i).map(y=><option key={y} value={y}>{y}</option>)}
                        </select>
                      </div>
                      <button type="button" onClick={()=>{ if(calBdMonth===11){setCalBdMonth(0);setCalBdYear(y=>y+1);}else setCalBdMonth(m=>m+1); }} style={{ background:"none", border:"none", cursor:"pointer", fontSize:"18px", color:"#3d6e01", lineHeight:1 }}>›</button>
                    </div>
                    {/* Day labels */}
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:"2px", marginBottom:"6px" }}>
                      {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d=><div key={d} style={{ textAlign:"center", fontSize:"10px", fontWeight:700, color:"#9ca3af" }}>{d}</div>)}
                    </div>
                    {/* Day cells */}
                    {(()=>{
                      const firstDay=new Date(calBdYear,calBdMonth,1).getDay();
                      const daysInMonth=new Date(calBdYear,calBdMonth+1,0).getDate();
                      const sel=f("birthdate");
                      const cells=[];
                      for(let i=0;i<firstDay;i++) cells.push(<div key={"e"+i}/>);
                      for(let d=1;d<=daysInMonth;d++){
                        const ds=`${calBdYear}-${String(calBdMonth+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
                        const isSel=sel===ds;
                        const isToday=ds===new Date().toISOString().slice(0,10);
                        cells.push(
                          <div key={d} onClick={()=>{ sf("birthdate",ds); setShowBdCal(false); }}
                            style={{ textAlign:"center", fontSize:"12px", padding:"5px 2px", borderRadius:"50%", cursor:"pointer",
                              background:isSel?"#3d6e01":isToday?"#e8f5e9":"transparent",
                              color:isSel?"#fff":isToday?"#3d6e01":"#111",
                              fontWeight:isSel||isToday?700:400,
                              border:isToday&&!isSel?"1px solid #3d6e01":"1px solid transparent" }}>
                            {d}
                          </div>
                        );
                      }
                      return <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:"2px" }}>{cells}</div>;
                    })()}
                    {/* Footer */}
                    <div style={{ marginTop:"10px", display:"flex", justifyContent:"space-between", paddingTop:"8px", borderTop:"1px solid #f3f4f6" }}>
                      <button type="button" onClick={()=>{ sf("birthdate",""); setShowBdCal(false); }} style={{ fontSize:"11px", color:"#dc2626", background:"none", border:"none", cursor:"pointer", fontWeight:600 }}>✕ Clear</button>
                      <button type="button" onClick={()=>setShowBdCal(false)} style={{ fontSize:"11px", color:"#6b7280", background:"none", border:"none", cursor:"pointer" }}>Close</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div style={{ ...fc(1.2), borderRight: "none" }}>
              <div style={bl(SI_GREEN)}>Place of Birth</div>
              <input style={ci()} value={f("place_of_birth")} onChange={e => sf("place_of_birth", e.target.value)} />
            </div>
          </div>

          {/* ── FATHER ── */}
          <div style={{ display: "flex", borderBottom: `1px solid ${BORDER}` }}>
            <div style={rlc(SI_ORANGE)}>Father's<br />Name</div>
            <div style={fc(1)}>
              <div style={bl(SI_ORANGE)}>Last Name</div>
              <input style={ci()} value={f("father_last")} onChange={e => sf("father_last", e.target.value)} placeholder="Last Name..." />
            </div>
            <div style={fc(1)}>
              <div style={bl(SI_ORANGE)}>First Name</div>
              <input style={ci()} value={f("father_first")} onChange={e => sf("father_first", e.target.value)} placeholder="First Name" />
            </div>
            <div style={fc(1)}>
              <div style={bl(SI_ORANGE)}>Middle Name</div>
              <input style={ci()} value={f("father_middle")} onChange={e => sf("father_middle", e.target.value)} placeholder="Middle Name" />
            </div>
            <div style={{ ...fc(2), borderRight: "none" }}>
              <div style={bl(SI_ORANGE)}>Father's Occupation / Profession</div>
              <input style={ci()} value={f("father_occupation")} onChange={e => sf("father_occupation", e.target.value)} />
            </div>
          </div>

          {/* ── MOTHER ── */}
          <div style={{ display: "flex", borderBottom: `1px solid ${BORDER}` }}>
            <div style={rlc(SI_ORANGE)}>Mother's<br />Name</div>
            <div style={fc(1)}>
              <div style={bl(SI_ORANGE)}>Last Name</div>
              <input style={ci()} value={f("mother_last")} onChange={e => sf("mother_last", e.target.value)} placeholder="Last Name..." />
            </div>
            <div style={fc(1)}>
              <div style={bl(SI_ORANGE)}>First Name</div>
              <input style={ci()} value={f("mother_first")} onChange={e => sf("mother_first", e.target.value)} placeholder="First Name" />
            </div>
            <div style={fc(1)}>
              <div style={bl(SI_ORANGE)}>Middle Name</div>
              <input style={ci()} value={f("mother_middle")} onChange={e => sf("mother_middle", e.target.value)} placeholder="Middle Name" />
            </div>
            <div style={{ ...fc(2), borderRight: "none" }}>
              <div style={bl(SI_ORANGE)}>Mother's Occupation / Profession</div>
              <input style={ci()} value={f("mother_occupation")} onChange={e => sf("mother_occupation", e.target.value)} />
            </div>
          </div>

          {/* ── PARENTS ADDRESS ── */}
          <div style={{ display: "flex", borderBottom: `1px solid ${BORDER}` }}>
            <div style={{ padding: "4px 8px", fontSize: "10px", fontWeight: 700, color: "#000", textTransform: "uppercase", letterSpacing: "0.03em", flexShrink: 0, width: "200px", display: "flex", alignItems: "center", fontFamily: TNR, background: "#F3F4F6", borderRight: `1px solid ${BORDER}` }}>
              Complete Address of Parents
            </div>
            <input style={ci({ flex: 1, borderRight: `1px solid ${BORDER}` })} value={f("parents_address")} onChange={e => sf("parents_address", e.target.value)} />
            <div style={{ padding: "4px 8px", fontSize: "10px", fontWeight: 700, color: "#000", textTransform: "uppercase", letterSpacing: "0.03em", flexShrink: 0, display: "flex", alignItems: "center", fontFamily: TNR, background: "#F3F4F6", borderRight: `1px solid ${BORDER}` }}>Mobile No.</div>
            <input style={ci({ width: "130px", flexShrink: 0 })} value={f("parents_mobile")} onChange={e => sf("parents_mobile", e.target.value)} />
          </div>

          {/* ── GUARDIAN ── */}
          <div style={{ display: "flex", borderBottom: `1px solid ${BORDER}` }}>
            <div style={fc(2)}><div style={bl("")}>Name of Guardian</div><input style={ci()} value={f("guardian_name")} onChange={e => sf("guardian_name", e.target.value)} /></div>
            <div style={{ ...fc(1.5), borderRight: "none" }}><div style={bl("")}>Relationship</div><input style={ci()} value={f("guardian_relationship")} onChange={e => sf("guardian_relationship", e.target.value)} /></div>
          </div>

          {/* ── GUARDIAN ADDRESS ── */}
          <div style={{ display: "flex", borderBottom: `1px solid ${BORDER}` }}>
            <div style={{ padding: "4px 8px", fontSize: "10px", fontWeight: 700, color: "#000", textTransform: "uppercase", letterSpacing: "0.03em", flexShrink: 0, width: "200px", display: "flex", alignItems: "center", fontFamily: TNR, background: "#F3F4F6", borderRight: `1px solid ${BORDER}` }}>Complete Address of Guardian</div>
            <input style={ci({ flex: 1, borderRight: `1px solid ${BORDER}` })} value={f("guardian_address")} onChange={e => sf("guardian_address", e.target.value)} />
            <div style={{ padding: "4px 8px", fontSize: "10px", fontWeight: 700, color: "#000", textTransform: "uppercase", letterSpacing: "0.03em", flexShrink: 0, display: "flex", alignItems: "center", fontFamily: TNR, background: "#F3F4F6", borderRight: `1px solid ${BORDER}` }}>Mobile No.</div>
            <input style={ci({ width: "130px", flexShrink: 0 })} value={f("guardian_mobile")} onChange={e => sf("guardian_mobile", e.target.value)} />
          </div>

          {/* ── SPOUSE ── */}
          <div style={{ display: "flex", borderBottom: `1px solid ${BORDER}` }}>
            <div style={fc(2)}><div style={bl("")}>Name of Spouse</div><input style={ci()} value={f("spouse_name")} onChange={e => sf("spouse_name", e.target.value)} /></div>
            <div style={{ ...fc(3), borderRight: "none" }}><div style={bl("")}>Spouse's Occupation / Profession / Place of Work</div><input style={ci()} value={f("spouse_occupation")} onChange={e => sf("spouse_occupation", e.target.value)} /></div>
          </div>

          {/* ── SPOUSE ADDRESS ── */}
          <div style={{ display: "flex", borderBottom: `1px solid ${BORDER}` }}>
            <div style={{ padding: "4px 8px", fontSize: "10px", fontWeight: 700, color: "#000", textTransform: "uppercase", letterSpacing: "0.03em", flexShrink: 0, width: "200px", display: "flex", alignItems: "center", fontFamily: TNR, background: "#F3F4F6", borderRight: `1px solid ${BORDER}` }}>Complete Address of Spouse</div>
            <input style={ci({ flex: 1, borderRight: `1px solid ${BORDER}` })} value={f("spouse_address")} onChange={e => sf("spouse_address", e.target.value)} />
            <div style={{ padding: "4px 8px", fontSize: "10px", fontWeight: 700, color: "#000", textTransform: "uppercase", letterSpacing: "0.03em", flexShrink: 0, display: "flex", alignItems: "center", fontFamily: TNR, background: "#F3F4F6", borderRight: `1px solid ${BORDER}` }}>Mobile No.</div>
            <input style={ci({ width: "130px", flexShrink: 0 })} value={f("spouse_mobile")} onChange={e => sf("spouse_mobile", e.target.value)} />
          </div>

          {/* ── SCHOLASTIC RECORD ── */}
          <div style={{ background: "#F3F4F6", color: "#000", padding: "5px 12px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", textAlign: "center", borderBottom: `1px solid ${BORDER}`, fontFamily: TNR, letterSpacing: "0.04em" }}>
            Scholastic Record Before Enrollment at Community College of Alangalang
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", fontFamily: TNR }}>
            <thead>
              <tr style={{ background: "#F3F4F6" }}>
                <th style={{ padding: "5px 10px", border: `1px solid ${BORDER}`, fontWeight: 700, color: "#000", width: "110px", textTransform: "uppercase", fontSize: "10px" }}>Level</th>
                <th style={{ padding: "5px 10px", border: `1px solid ${BORDER}`, fontWeight: 700, color: "#000", textTransform: "uppercase", fontSize: "10px" }}>Name of School</th>
                <th style={{ padding: "5px 10px", border: `1px solid ${BORDER}`, fontWeight: 700, color: "#000", textTransform: "uppercase", fontSize: "10px" }}>Address of School</th>
                <th style={{ padding: "5px 10px", border: `1px solid ${BORDER}`, fontWeight: 700, color: "#000", width: "110px", textTransform: "uppercase", fontSize: "10px" }}>Year Graduated</th>
                <th style={{ padding: "5px 10px", border: `1px solid ${BORDER}`, fontWeight: 700, color: "#000", width: "150px", textTransform: "uppercase", fontSize: "10px" }}>Honors Received</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: "ELEMENTARY", sk: "elem_school", ak: "elem_address", yk: "elem_year", hk: "elem_honors" },
                { label: "HIGH SCHOOL", sk: "hs_school",  ak: "hs_address",  yk: "hs_year",  hk: "hs_honors"  },
                { label: "COLLEGE",     sk: "col_school", ak: "col_address", yk: "col_year", hk: "col_honors"  },
              ].map(({ label, sk, ak, yk, hk }) => (
                <tr key={label}>
                  <td style={{ padding: "5px 10px", border: `1px solid ${BORDER}`, fontWeight: 700, color: "#000", background: "#F9FAFB", textTransform: "uppercase", fontSize: "10px" }}>{label}</td>
                  <td style={{ padding: "3px 6px", border: `1px solid ${BORDER}` }}><input style={ci()} value={f(sk)} onChange={e => sf(sk, e.target.value)} /></td>
                  <td style={{ padding: "3px 6px", border: `1px solid ${BORDER}` }}><input style={ci()} value={f(ak)} onChange={e => sf(ak, e.target.value)} /></td>
                  <td style={{ padding: "3px 6px", border: `1px solid ${BORDER}` }}><input style={ci()} value={f(yk)} onChange={e => sf(yk, e.target.value)} placeholder="e.g. 2022" /></td>
                  <td style={{ padding: "3px 6px", border: `1px solid ${BORDER}` }}><input style={ci()} value={f(hk)} onChange={e => sf(hk, e.target.value)} /></td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* ── SCHOLASTIC REQUIREMENTS ── */}
          <div style={{ background: "#F3F4F6", color: "#000", padding: "5px 12px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", textAlign: "center", borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`, fontFamily: TNR, letterSpacing: "0.04em" }}>
            Scholastic Requirements
          </div>
          <div style={{ padding: "10px 12px" }}>
            {reqOptions.length === 0 && (
              <div style={{ fontSize: "11px", color: GRAY, fontFamily: TNR }}>No requirements configured. Add them in Admin Settings → System → Scholastic Requirements.</div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "8px 18px" }}>
              {reqOptions.map(item => {
                const list = (f("scholastic_notes") || "").split(",").map(s => s.trim()).filter(Boolean);
                const checked = list.includes(item);
                return (
                  <label key={item} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: "12px", fontFamily: TNR, color: "#000", cursor: "pointer" }}>
                    <input type="checkbox" checked={checked} onChange={() => {
                      const set = new Set(list);
                      if (checked) set.delete(item); else set.add(item);
                      sf("scholastic_notes", Array.from(set).join(", "));
                    }} style={{ width: 15, height: 15, cursor: "pointer", accentColor: DARK_GREEN }} />
                    {item}
                  </label>
                );
              })}
            </div>
          </div>

          {/* ── Footer ── */}
          <div style={{ padding: "10px 14px", background: "#F3F4F6", borderTop: `1px solid ${BORDER}`, display: "flex", justifyContent: "flex-end", gap: "8px" }}>
            <button type="button" onClick={handleSave} disabled={saving}
              style={{ padding: "6px 24px", background: DARK_GREEN, color: WHITE, border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: 700, cursor: "pointer", fontFamily: TNR, opacity: saving ? 0.7 : 1 }}>
              {saving ? "Saving..." : "💾 Save"}
            </button>
          </div>
        </div>
    </div>
  );
}

export default function Registrar({ user = {} }) {
  const isAdmin = user?.role === "administrator";
  // Signatory name for official records.
  //  · registrar / administrator → the logged-in user's own name
  //  · registrar_staff           → the name of whoever holds the REGISTRAR role
  const _signRole = String(user?.role || "").toLowerCase();
  const _ownSignName = [user.first_name, user.middle_name, user.last_name].filter(Boolean).join(" ").trim() || user.username || "";
  const [registrarRoleName, setRegistrarRoleName] = useState("");
  useEffect(() => {
    if (_signRole !== "registrar_staff") return;
    fetch(`${import.meta.env.VITE_API_URL}/api/erd/users`)
      .then(r => r.ok ? r.json() : [])
      .then(list => {
        const reg = (Array.isArray(list) ? list : []).find(u => {
          const roles = Array.isArray(u.roles) ? u.roles.map(x => String(x).toLowerCase()) : [String(u.role || "").toLowerCase()];
          return roles.includes("registrar");
        });
        if (reg) setRegistrarRoleName([reg.first_name, reg.middle_name, reg.last_name].filter(Boolean).join(" ").trim() || reg.username || "");
      }).catch(() => {});
  }, [_signRole]);
  const registrarSignName =
    (_signRole === "registrar" || _signRole === "administrator" || _signRole === "admin") ? _ownSignName
    : (_signRole === "registrar_staff") ? registrarRoleName
    : "";
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentGrades, setStudentGrades]     = useState([]);
  
  const [loading, setLoading]       = useState(true);
  const [courses, setCourses]        = useState([]);
  const [savingGrades, setSavingGrades] = useState(false);
  const [searchStudent, setSearchStudent] = useState("");

  // Remember the Registrar tab/sub-tab across refreshes (per session).
  const [activeTab, setActiveTab]       = useState(() => { try { return sessionStorage.getItem("cca_reg_tab") || "manage_students"; } catch { return "manage_students"; } });
  const [transactionSubTab, setTransactionSubTab] = useState(() => { try { return sessionStorage.getItem("cca_reg_subtab") || "application_form"; } catch { return "application_form"; } });
  useEffect(() => { try { sessionStorage.setItem("cca_reg_tab", activeTab); } catch {} }, [activeTab]);
  useEffect(() => { try { sessionStorage.setItem("cca_reg_subtab", transactionSubTab); } catch {} }, [transactionSubTab]);
  const [reportsSubTab, setReportsSubTab] = useState("student_record");
  const [studentRecordSubTab, setStudentRecordSubTab] = useState("transcript_of_records"); // always starts at leftmost
  const [slcCourse, setSlcCourse] = useState(""); // Student List by Course — course filter ("" = all)
  const [maintenanceSubTab, setMaintenanceSubTab] = useState("program_curriculum");
  const [torStudentId, setTorStudentId]   = useState("");
  const [torGrades, setTorGrades]         = useState([]);
  const [torEnrollments, setTorEnrollments] = useState([]);
  const [loadingTor, setLoadingTor]       = useState(false);
  const [showTorSuggestions, setShowTorSuggestions] = useState(false);
  const [showTorPrint, setShowTorPrint]     = useState(false);
  const [candFormMode, setCandFormMode]     = useState(false); // legacy flag, unused by the dedicated form
  const [candSearch, setCandSearch]         = useState("");
  const [candFormStudent, setCandFormStudent] = useState(null); // opens the dedicated Records of Candidates for Graduation form
  const [candPreview, setCandPreview]       = useState(null);   // student selected in the left panel (two-panel layout)
  const [candGrades, setCandGrades]         = useState([]);
  const [appFormStudent, setAppFormStudent] = useState(null); // opens the Free Higher Education application form
  const [appSearch, setAppSearch]           = useState("");
  const [corPrintOnly, setCorPrintOnly]     = useState(false);
  const [enrListFilter, setEnrListFilter]   = useState({ school_year: "", sex: "", municipality: "", barangay: "", program: "", section: "" });
  const [enrPrintOpen, setEnrPrintOpen]     = useState(false);
  const [gradPrintOpen, setGradPrintOpen]   = useState(false);
  const [allEnrollments, setAllEnrollments] = useState([]);
  const [enrListLoaded, setEnrListLoaded]   = useState(false);
  const [torPrintStudent, setTorPrintStudent] = useState(null);
  const [torSearch, setTorSearch]           = useState("");
  const [torHonorableDate, setTorHonorableDate] = useState("");
  const [torOrNo,       setTorOrNo]       = useState("");
  const [torDstOrNo,    setTorDstOrNo]    = useState("");
  const [torDateIssued, setTorDateIssued] = useState("");
  const [torCourseDisplay, setTorCourseDisplay] = useState("");
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [editingSubjectId, setEditingSubjectId] = useState(null);
  const [subjectForm, setSubjectForm] = useState({ subject_code: "", subject_title: "", units: "3", lec_hours: "3", lab_hours: "0", pre_requisite: "None", course: "", description: "", year_level: "1st Year", semester: "1" });
  const [subjectFilter, setSubjectFilter] = useState({ course: "", year_level: "", semester: "" });
  const [expandedSections, setExpandedSections] = useState({});
  const toggleSection = (key) => setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));

  const [showStudentModal, setShowStudentModal] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState(null);
  const [savingStudent, setSavingStudent] = useState(false);
  const [studentForm, setStudentForm] = useState({ first_name: "", middle_name: "", last_name: "", student_number: "", course: "", year_level: "1st Year", section: "", gender: "Male", profile_picture: "" });
  const picInputRef = useRef(null);
  const [sections, setSections] = useState([]);
  const [enrollYearFilter, setEnrollYearFilter] = useState("");
  const [enrollYearEnrolledFilter, setEnrollYearEnrolledFilter] = useState("");
  const [studentQr, setStudentQr] = useState(null); // { payload, label } — shown right after enrolling a NEW student
  const [gradViewStudent, setGradViewStudent] = useState(null); // student whose credentials are shown
  const [gradFilter, setGradFilter] = useState({ school_year: "", sex: "", municipality: "", barangay: "", program: "", section: "" });
  const [markingGrad, setMarkingGrad] = useState(null); // student id being marked/unmarked

  // ── Student Registration split-panel state ──────────────────────────────
  const [selectedEnrollStudent, setSelectedEnrollStudent] = useState(null);
  const [enrollMasterFilter, setEnrollMasterFilter] = useState("all");
  const [masterSearch, setMasterSearch] = useState("");
  const [enrollRegForm, setEnrollRegForm] = useState(null);
  const [enrollRegSaving, setEnrollRegSaving] = useState(false);
  const [enrollClassSchedule, setEnrollClassSchedule] = useState([]);
  const [enrollClassLoading, setEnrollClassLoading] = useState(false);
  const [activeSchoolYear, setActiveSchoolYear] = useState(null);
  const [sectionCapacity, setSectionCapacity] = useState({ count: 0, max_students: null }); // enrolled count + max for current block/term

  // Fetch active school year on mount so all enrollment forms use it automatically
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/erd/school-years/active`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.school_year) setActiveSchoolYear(data.school_year); })
      .catch(() => {});
  }, []);

  const selectEnrollStudent = async (s) => {
    setSelectedEnrollStudent(s);
    const _now = new Date();
    const _y = _now.getMonth() >= 5 ? _now.getFullYear() : _now.getFullYear() - 1;
    const _defaultSY = activeSchoolYear || `${_y}-${_y + 1}`;

    // Auto-detect next year level from enrollment history
    const YEAR_LEVELS_LIST = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
    let nextYearLevel = "1st Year";
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/erd/enrollments/${s.id}`);
      if (res.ok) {
        const history = await res.json();
        if (history && history.length > 0) {
          const maxIdx = Math.max(...history.map(e => YEAR_LEVELS_LIST.indexOf(e.year_level)).filter(i => i >= 0));
          if (maxIdx >= 0 && maxIdx + 1 < YEAR_LEVELS_LIST.length) {
            nextYearLevel = YEAR_LEVELS_LIST[maxIdx + 1];
          } else if (maxIdx >= 0) {
            nextYearLevel = YEAR_LEVELS_LIST[maxIdx]; // already at highest
          }
        }
      }
    } catch (_) {}

    setEnrollRegForm({
      school_year: _defaultSY,
      term: "1",
      reg_no: "",
      id_number: s.student_number || "",
      last_name: s.last_name || "",
      first_name: s.first_name || "",
      middle_name: s.middle_name || "",
      gender: s.gender || "Male",
      program: s.course || "",
      year_level: nextYearLevel,
      gpa: "",
      scholarship: "",
      block_number: s.section || "",
      enrolled_count: "",
      maximum: "",
    });
  };

  const saveEnrollRegistration = async () => {
    if (!selectedEnrollStudent || !enrollRegForm) return;
    setEnrollRegSaving(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/erd/students/${selectedEnrollStudent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Preserve ALL existing student fields — only override what the form changed
          ...selectedEnrollStudent,
          first_name: enrollRegForm.first_name,
          middle_name: enrollRegForm.middle_name,
          last_name: enrollRegForm.last_name,
          gender: enrollRegForm.gender,
          student_number: enrollRegForm.id_number,
          course: enrollRegForm.program,
          year_level: enrollRegForm.year_level,
          section: enrollRegForm.block_number,
        }),
      });
      if (!res.ok) throw new Error("Save failed");

      // Create enrollment record only if one doesn't already exist for this term
      if (enrollRegForm.term && enrollRegForm.school_year) {
        const semMap = { "1": "1st Semester", "2": "2nd Semester", "S": "Summer" };
        const semLabel = semMap[String(enrollRegForm.term)] || enrollRegForm.term;
        const yearStart = parseInt((enrollRegForm.school_year || "").split("-")[0]) || new Date().getFullYear();

        // Check for existing enrollment record first
        let alreadyEnrolled = false;
        let existing = [];
        try {
          const checkRes = await fetch(`${import.meta.env.VITE_API_URL}/api/erd/enrollments/${selectedEnrollStudent.id}`);
          if (checkRes.ok) {
            existing = await checkRes.json();
            // Block re-enrolling the SAME year level in a DIFFERENT school year (repeating a year),
            // OR an exact duplicate term. A different semester of the same year level in the same
            // school year is allowed (e.g. 2nd Year 1st Sem then 2nd Year 2nd Sem).
            const sameYearLevelDifferentSY = existing.some(e =>
              e.year_level === enrollRegForm.year_level &&
              String(e.year_enrolled) !== String(yearStart)
            );
            const exactDuplicate = existing.some(e =>
              String(e.year_enrolled) === String(yearStart) &&
              e.year_level === enrollRegForm.year_level &&
              e.semester === semLabel
            );
            alreadyEnrolled = sameYearLevelDifferentSY || exactDuplicate;
          }
        } catch (_) {}

        if (alreadyEnrolled) {
          const dupMsg = existing.some(e => e.year_level === enrollRegForm.year_level && String(e.year_enrolled) !== String(yearStart))
            ? `⚠️ ${enrollRegForm.year_level} already exists in a previous school year. Cannot re-enroll at the same year level.`
            : `⚠️ Already enrolled: ${enrollRegForm.year_level} — ${semLabel}, S.Y. ${enrollRegForm.school_year}.`;
          showToast(dupMsg, "warning");
          await fetchBaselineDirectory();
          const updated = { ...selectedEnrollStudent, year_level: enrollRegForm.year_level, section: enrollRegForm.block_number, course: enrollRegForm.program };
          setSelectedEnrollStudent(updated);
          setTransactionSubTab("student_registration");
          return;
        } else {
          const enrRes = await fetch(`${import.meta.env.VITE_API_URL}/api/erd/enrollments`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              student_id: selectedEnrollStudent.id,
              year_enrolled: yearStart,
              year_level: enrollRegForm.year_level,
              semester: semLabel,
            }),
          }).catch(() => null);
          if (enrRes && enrRes.status === 409) {
            const errData = await enrRes.json().catch(() => ({}));
            showToast(errData.message || "Section is full for this term.", "error");
            setEnrollRegSaving(false);
            return;
          }
          // Update local form with server-assigned classification
          if (enrRes && enrRes.ok) {
            const enrData = await enrRes.json().catch(() => ({}));
            if (enrData.classification) {
              setEnrollRegForm(f => ({ ...f, classification: enrData.classification }));
            }
            // Refresh capacity count
            setSectionCapacity(prev => ({ ...prev, count: (prev.count || 0) + 1 }));
          }
        }
      }

      showToast("Registration saved.", "success");
      await fetchBaselineDirectory();
      const updated = { ...selectedEnrollStudent, year_level: enrollRegForm.year_level, section: enrollRegForm.block_number, course: enrollRegForm.program, classification: enrollRegForm.classification };
      setSelectedEnrollStudent(updated);
      setTransactionSubTab("student_registration");
    } catch (err) {
      showToast("Failed to save registration.", "error");
    } finally {
      setEnrollRegSaving(false);
    }
  };

  const fetchBaselineDirectory = async () => {
    setLoading(true);
    try {
      const [sRes, subRes, cRes, enrRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/api/erd/students`),
        fetch(`${import.meta.env.VITE_API_URL}/api/erd/subjects`),
        fetch(`${import.meta.env.VITE_API_URL}/api/erd/courses`),
        fetch(`${import.meta.env.VITE_API_URL}/api/erd/enrollments`),
      ]);
      if (sRes.ok && subRes.ok) {
        const _YL = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
        let students = await sRes.json();
        // Sync year_level from enrollment history (max year_level per student)
        if (enrRes.ok) {
          const allEnr = await enrRes.json();
          const maxYL = {};
          allEnr.forEach(e => {
            const idx = _YL.indexOf(e.year_level);
            if (idx < 0) return;
            if (maxYL[e.student_id] === undefined || idx > maxYL[e.student_id]) {
              maxYL[e.student_id] = idx;
            }
          });
          students = students.map(s =>
            maxYL[s.id] !== undefined ? { ...s, year_level: _YL[maxYL[s.id]] } : s
          );
        }
        setStudents(students);
        setSubjects(await subRes.json());
      }
      if (cRes.ok) {
        const courseData = await cRes.json();
        setCourses(courseData.map(c => c.course));
      }
    } catch (err) {
      console.error("Registrar catalog alignment fault:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBaselineDirectory(); }, []);

  // Fetch all enrollments when enrollment_list or graduate_students tab is opened
  useEffect(() => {
    const needsEnrollments = activeTab === "reports" && (reportsSubTab === "enrollment_list" || reportsSubTab === "graduate_students");
    if (needsEnrollments && !enrListLoaded) {
      fetch(`${import.meta.env.VITE_API_URL}/api/erd/enrollments`)
        .then(r => r.ok ? r.json() : [])
        .then(data => { setAllEnrollments(data); setEnrListLoaded(true); })
        .catch(() => setEnrListLoaded(true));
    }
  }, [activeTab, reportsSubTab, enrListLoaded]);

  // Fetch sections independently so a failure elsewhere doesn't block the dropdown
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/erd/sections`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setSections(Array.isArray(data) ? data.map(s => s.name) : []))
      .catch(() => {});
  }, []);

  const selectStudentWorksheet = async (student) => {
    setSelectedStudent(student);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/erd/grades/${student.id}`);
      if (res.ok) setStudentGrades(await res.json());
    } catch (err) { console.error(err); }
  };

  const updateGradeCellState = (subjectId, value, keyField) => {
    setStudentGrades(prev => {
      const matchIndex = prev.findIndex(g => g.subject_id === subjectId);
      if (matchIndex !== -1) {
        const next = [...prev];
        next[matchIndex] = { ...next[matchIndex], [keyField]: value };
        return next;
      } else {
        return [...prev, { subject_id: subjectId, [keyField]: value, student_id: selectedStudent.id, semester: "1", year_start: 2026, year_end: 2027 }];
      }
    });
  };

  const saveWorksheetTranscript = async () => {
    if (!selectedStudent || savingGrades) return;
    if (selectedStudent.graduation_status === "graduated" && !isAdmin) {
      showToast("🎓 This student has graduated. Only an Administrator can edit their grades.", "error");
      return;
    }
    setSavingGrades(true);
    try {
      const validPayload = studentGrades.map(g => ({
        subject_id: g.subject_id,
        grade: g.grade !== "" && g.grade !== undefined ? parseFloat(g.grade) : null,
        remarks: g.remarks || (g.grade ? (parseFloat(g.grade) <= 3.0 ? "PASSED" : "FAILED") : ""),
        semester: g.semester || "1",
        year_start: g.year_start || 2026,
        year_end: g.year_end || 2027
      }));
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/erd/grades/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_id: selectedStudent.id, grades: validPayload })
      });
      if (res.ok) { showToast("Grades saved successfully!", "success"); selectStudentWorksheet(selectedStudent); }
    } catch (err) { console.error(err); } finally { setSavingGrades(false); }
  };

  const handleSubjectSubmit = async (e) => {
    e.preventDefault();
    const url = editingSubjectId
      ? `${import.meta.env.VITE_API_URL}/api/erd/subjects/${editingSubjectId}`
      : `${import.meta.env.VITE_API_URL}/api/erd/subjects`;
    try {
      const res = await fetch(url, { method: editingSubjectId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(subjectForm) });
      if (res.ok) { setShowSubjectModal(false); fetchBaselineDirectory(); }
    } catch (err) { console.error(err); }
  };

  const filteredSubjects = subjects.filter(sub => {
    if (subjectFilter.course && sub.course !== subjectFilter.course) return false;
    if (subjectFilter.year_level && sub.year_level !== subjectFilter.year_level) return false;
    if (subjectFilter.semester && String(sub.semester) !== subjectFilter.semester) return false;
    return true;
  });

  const triggerSubjectDeletion = (id) => {
    showConfirm({
      message: "Delete this subject? This cannot be undone.",
      confirmLabel: "Delete",
      icon: "🗑️",
      onConfirm: async () => {
        try {
          const res = await fetch(`${import.meta.env.VITE_API_URL}/api/erd/subjects/${id}`, { method: "DELETE" });
          if (res.ok) { showToast("Subject deleted.", "info"); fetchBaselineDirectory(); }
          else showToast("Failed to delete subject.", "error");
        } catch { showToast("Network error.", "error"); }
      },
    });
  };

  const handleStudentSubmit = async (e) => {
    e.preventDefault();
    if (savingStudent) return;
    setSavingStudent(true);
    const isNewEnrollment = !editingStudentId;
    const url = editingStudentId
      ? `${import.meta.env.VITE_API_URL}/api/erd/students/${editingStudentId}`
      : `${import.meta.env.VITE_API_URL}/api/erd/students`;
    try {
      const res = await fetch(url, { method: editingStudentId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(studentForm) });
      if (res.ok) {
        setShowStudentModal(false);
        fetchBaselineDirectory();
        // Newly enrolled student — automatically log their FIRST enrollment
        // period (1st Semester of the Year Level / Year Enrolled set above)
        // so it immediately shows up in Student List's enrollment history,
        // instead of requiring a second, separate "Enroll" step over there.
        // The Student List "Enroll" action still exists for adding LATER
        // periods (2nd Semester, promotion to the next year, etc.) — this
        // only covers the initial one created right here at intake.
        if (isNewEnrollment) {
          const newStudent = await res.json().catch(() => null);
          if (newStudent?.id && studentForm.year_enrolled) {
            try {
              await fetch(`${import.meta.env.VITE_API_URL}/api/erd/enrollments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  student_id: newStudent.id,
                  year_enrolled: studentForm.year_enrolled,
                  year_level: studentForm.year_level,
                  semester: "1st Semester",
                }),
              });
            } catch (enrollErr) { console.error("Auto-enrollment period creation failed:", enrollErr); }
          }

          // Generate their QR code right away so the registrar can print/save it on the spot.
          // Use the ID the SERVER actually assigned (it may differ if two people enrolled at once).
          const assignedNumber = newStudent?.student_number || studentForm.student_number;
          const fullName = `${studentForm.last_name}, ${studentForm.first_name} ${studentForm.middle_name || ""}`.replace(/\s+/g, " ").trim();
          const payload = [
            "CCA-STUDENT",
            assignedNumber || "—",
            fullName,
            studentForm.course,
            studentForm.year_level,
            studentForm.section || "—",
          ].join("|");
          setStudentQr({ payload, name: fullName, studentNumber: assignedNumber });
        }
      }
      else showToast("Failed to save student. Please try again.", "error");
    } catch (err) { console.error(err); } finally { setSavingStudent(false); }
  };

  const triggerStudentDeletion = (student) => {
    showConfirm({
      message: `Remove ${student.first_name} ${student.last_name} from the register? This cannot be undone.`,
      confirmLabel: "Remove",
      icon: "🗑️",
      onConfirm: async () => {
        try {
          const res = await fetch(`${import.meta.env.VITE_API_URL}/api/erd/students/${student.id}`, { method: "DELETE" });
          if (res.ok) {
            showToast(`${student.first_name} ${student.last_name} removed.`, "info");
            if (selectedStudent?.id === student.id) { setSelectedStudent(null); setStudentGrades([]); }
            fetchBaselineDirectory();
          } else showToast("Failed to remove student.", "error");
        } catch { showToast("Network error.", "error"); }
      },
    });
  };

  const filteredStudents = students.filter(s =>
    `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchStudent.toLowerCase()) ||
    s.course.toLowerCase().includes(searchStudent.toLowerCase()) ||
    (s.student_number || "").toLowerCase().includes(searchStudent.toLowerCase())
  );

  // Distinct enrollment years present in the directory, newest first, for the
  // "Year Enrolled" filter dropdown (fast lookup of a specific intake batch).
  const enrollmentYearOptions = Array.from(
    new Set(students.map(s => s.year_enrolled).filter(Boolean))
  ).sort((a, b) => b - a);

  // Enrollment Directory list: filter by Year Level and/or Year Enrolled, then
  // order 1st Year first, then by year enrolled (earliest enrolled first)
  // within each year level — for fast tracking of a given intake.
  const enrollmentDirectory = students
    .filter(s => !enrollYearFilter || s.year_level === enrollYearFilter)
    .filter(s => !enrollYearEnrolledFilter || String(s.year_enrolled) === enrollYearEnrolledFilter)
    .slice()
    .sort((a, b) => {
      const aIdx = YEAR_LEVELS.indexOf(a.year_level);
      const bIdx = YEAR_LEVELS.indexOf(b.year_level);
      const aRank = aIdx === -1 ? YEAR_LEVELS.length : aIdx;
      const bRank = bIdx === -1 ? YEAR_LEVELS.length : bIdx;
      if (aRank !== bRank) return aRank - bRank;
      const aYear = a.year_enrolled ?? 0;
      const bYear = b.year_enrolled ?? 0;
      return aYear - bYear;
    });

  // Subjects for the selected student in the registration panel —
  // Fetch class schedule rows whenever year_level / term / program / block changes
  useEffect(() => {
    // Block is the final trigger — don't fetch until year, term AND block are all set
    if (!enrollRegForm?.year_level || !enrollRegForm?.term || !enrollRegForm?.program || !enrollRegForm?.block_number) {
      setEnrollClassSchedule([]);
      return;
    }
    setEnrollClassLoading(true);
    const params = new URLSearchParams();
    params.set("course",     enrollRegForm.program);
    params.set("year_level", enrollRegForm.year_level);
    params.set("semester",   enrollRegForm.term);
    params.set("section",    enrollRegForm.block_number);
    params.set("fallback",   "1");
    fetch(`${import.meta.env.VITE_API_URL}/api/erd/class-schedule?${params}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setEnrollClassSchedule(Array.isArray(data) ? data : []))
      .catch(() => setEnrollClassSchedule([]))
      .finally(() => setEnrollClassLoading(false));
  }, [enrollRegForm?.year_level, enrollRegForm?.term, enrollRegForm?.program, enrollRegForm?.block_number]);

  // Fetch enrolled count + max for the current block + term (term-scoped)
  useEffect(() => {
    if (!enrollRegForm?.block_number || !enrollRegForm?.term) {
      setSectionCapacity({ count: 0, max_students: null });
      return;
    }
    const semMap = { "1": "1st Semester", "2": "2nd Semester", "S": "Summer" };
    const semLabel = semMap[String(enrollRegForm.term)] || enrollRegForm.term;
    const yearStart = parseInt((enrollRegForm.school_year || "").split("-")[0]) || new Date().getFullYear();
    const params = new URLSearchParams({ section: enrollRegForm.block_number, semester: enrollRegForm.term, year_enrolled: yearStart });
    if (enrollRegForm.year_level) params.set("year_level", enrollRegForm.year_level);
    fetch(`${import.meta.env.VITE_API_URL}/api/erd/enrollments/count?${params}`)
      .then(r => r.ok ? r.json() : { count: 0, max_students: null })
      .then(data => setSectionCapacity({ count: data.count || 0, max_students: data.max_students ?? null }))
      .catch(() => setSectionCapacity({ count: 0, max_students: null }));
  }, [enrollRegForm?.block_number, enrollRegForm?.term, enrollRegForm?.school_year, enrollRegForm?.year_level]);

  // Keep enrollRegSubjects for backward-compat (unused in table now)
  const enrollRegSubjects = enrollClassSchedule;

  const loadTorStudent = async (student) => {
    setTorStudentId(student.id);
    setSearchStudent(`${student.last_name}, ${student.first_name} ${student.middle_name || ""} — ${student.student_number || "No ID"}`.replace(/\s+/g, " ").trim());
    setShowTorSuggestions(false);
    setTorGrades([]);
    setTorEnrollments([]);
    setLoadingTor(true);
    try {
      const [gRes, eRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/api/erd/grades/${student.id}`),
        fetch(`${import.meta.env.VITE_API_URL}/api/erd/enrollments/${student.id}`)
      ]);
      if (gRes.ok) setTorGrades(await gRes.json());
      if (eRes.ok) setTorEnrollments(await eRes.json());
    } catch (_) {}
    setLoadingTor(false);
  };

  const clearTorStudent = () => {
    setTorStudentId("");
    setSearchStudent("");
    setTorGrades([]);
    setTorEnrollments([]);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", fontFamily: "system-ui" }}>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: "10px", borderBottom: `2px solid ${BORDER}`, paddingBottom: "10px" }}>
        {[
          { key: "manage_students", label: "Transaction", icon: (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" stroke="currentColor">
              <circle cx="12" cy="7" r="4" />
              <path d="M5 21v-2a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v2" />
            </svg>
          )},
          { key: "reports", label: "Reports", icon: (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" stroke="currentColor">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          )},
        ].map(t => (
          <button key={t.key} type="button" onClick={() => setActiveTab(t.key)}
            style={{ padding: "8px 16px", background: activeTab === t.key ? DARK_GREEN : WHITE, color: activeTab === t.key ? WHITE : GRAY, border: `1px solid ${BORDER}`, borderRadius: "6px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "7px" }}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* ── TRANSACTION SUB-NAV ── */}
      {activeTab === "manage_students" && (
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", padding: "10px 0", borderBottom: `1px solid ${BORDER}`, marginTop: "-8px" }}>
          {[
            { key: "application_form",     label: "Enrollment Form" },
            { key: "student_info",         label: "Student Information" },
            { key: "student_registration", label: "Student Registration" },
            { key: "grades",               label: "Grades" },
            { key: "assessment",           label: "Assessment" },
          ].map((sub, i) => (
            <button key={sub.key} type="button" onClick={() => setTransactionSubTab(sub.key)}
              style={{
                padding: "7px 16px",
                background: transactionSubTab === sub.key ? DARK_GREEN : WHITE,
                color: transactionSubTab === sub.key ? WHITE : "#374151",
                border: `1px solid ${transactionSubTab === sub.key ? DARK_GREEN : BORDER}`,
                borderRadius: "6px",
                fontWeight: transactionSubTab === sub.key ? 700 : 500,
                fontSize: "12px",
                cursor: "pointer",
                letterSpacing: "0.3px",
                transition: "all 0.15s ease",
                animation: `slideInSubTab 0.3s ${i * 0.05}s cubic-bezier(0.22,1,0.36,1) both`,
              }}>
              {sub.label}
            </button>
          ))}
          <style>{`
            @keyframes slideInSubTab {
              from { opacity: 0; transform: translateX(-14px); }
              to   { opacity: 1; transform: translateX(0); }
            }
          `}</style>
        </div>
      )}

      {/* ── REPORTS SUB-NAV ── */}
      {activeTab === "reports" && (
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", padding: "10px 0", borderBottom: `1px solid ${BORDER}`, marginTop: "-8px" }}>
          {[
            { key: "student_record",       label: "Student Record" },
            { key: "enrollment_list",      label: "Enrollment List" },
            { key: "graduate_students",    label: "Graduate Students" },
            { key: "candidates_graduation", label: "Candidates for Graduation" },
          ].map((sub, i) => (
            <button key={sub.key} type="button" onClick={() => { setReportsSubTab(sub.key); if (sub.key === "student_record") setStudentRecordSubTab("transcript_of_records"); }}
              style={{
                padding: "7px 16px",
                background: reportsSubTab === sub.key ? DARK_GREEN : WHITE,
                color: reportsSubTab === sub.key ? WHITE : "#374151",
                border: `1px solid ${reportsSubTab === sub.key ? DARK_GREEN : BORDER}`,
                borderRadius: "6px",
                fontWeight: reportsSubTab === sub.key ? 700 : 500,
                fontSize: "12px",
                cursor: "pointer",
                letterSpacing: "0.3px",
                transition: "all 0.15s ease",
                animation: `slideInSubTab 0.3s ${i * 0.05}s cubic-bezier(0.22,1,0.36,1) both`,
              }}>
              {sub.label}
            </button>
          ))}
        </div>
      )}

      {/* ── STUDENT RECORD SUB-SUB-NAV ── */}
      {activeTab === "reports" && reportsSubTab === "student_record" && (
        <>
        <style>{`
          @keyframes srSlideIn { from{opacity:0;transform:translateX(-16px)} to{opacity:1;transform:translateX(0)} }
          @keyframes srUnderline { from{width:0} to{width:100%} }
          .sr-btn { position:relative; overflow:hidden; }
          .sr-btn::after {
            content:''; position:absolute; bottom:0; left:0;
            height:2px; width:0; background:${GOLD};
            transition: width 0.2s ease;
          }
          .sr-btn:hover::after { width:100%; }
          .sr-btn:hover { background:#f2f9e8 !important; color:${DARK_GREEN} !important; transform:translateY(-1px); box-shadow:0 3px 10px rgba(27,94,32,0.12); }
          .sr-btn-active::after { width:100% !important; }
        `}</style>
        <div style={{
          display: "flex", gap: "2px", flexWrap: "nowrap",
          padding: "10px 0 0", marginTop: "-8px",
          borderBottom: `2px solid ${BORDER}`,
          width: "100%",
        }}>
          {[
            { key: "transcript_of_records",     label: "Transcript of Records" },
            { key: "student_evaluation_form",   label: "Student Evaluation Form" },
            { key: "student_list_by_course",   label: "Student List by Course" },
          ].map((sub, i) => {
            const isActive = studentRecordSubTab === sub.key;
            return (
              <button key={sub.key} type="button"
                className={`sr-btn${isActive ? " sr-btn-active" : ""}`}
                onClick={() => setStudentRecordSubTab(sub.key)}
                style={{
                  flex: 1,
                  padding: "7px 4px",
                  background: isActive ? DARK_GREEN : "transparent",
                  color: isActive ? WHITE : "#4B5563",
                  border: "none",
                  borderRadius: "7px 7px 0 0",
                  fontWeight: isActive ? 700 : 500,
                  fontSize: "11px",
                  cursor: "pointer",
                  letterSpacing: "0.2px",
                  whiteSpace: "nowrap",
                  textAlign: "center",
                  transition: "all 0.18s ease",
                  boxShadow: isActive ? "0 -2px 8px rgba(27,94,32,0.15)" : "none",
                  animation: `srSlideIn 0.32s ${i * 0.045}s cubic-bezier(0.22,1,0.36,1) both`,
                }}>
                {sub.label}
              </button>
            );
          })}
        </div>
        </>
      )}

      {/* ── STUDENT EVALUATION FORM content ── */}
      {activeTab === "reports" && reportsSubTab === "student_record" && studentRecordSubTab === "student_evaluation_form" && (
        <StudentEvaluationForm students={students} registrarName={registrarSignName} />
      )}

      {/* ── STUDENT LIST BY COURSE content ── */}
      {activeTab === "reports" && reportsSubTab === "student_record" && studentRecordSubTab === "student_list_by_course" && (() => {
        const courseOptions = [...new Set((students || []).map(s => s.course).filter(Boolean))].sort();
        const rows = (students || []).filter(s => !slcCourse || s.course === slcCourse);
        return (
          <div style={{ marginTop: "12px" }}>
            {/* Filter bar */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginBottom: "12px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "13px", fontWeight: 800, color: DARK_GREEN }}>Student List by Course</span>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <label style={{ fontSize: "10px", fontWeight: 700, color: GRAY, textTransform: "uppercase", letterSpacing: "0.05em" }}>Course</label>
                <select value={slcCourse} onChange={e => setSlcCourse(e.target.value)}
                  style={{ padding: "6px 10px", border: `1px solid ${BORDER}`, borderRadius: "6px", fontSize: "12px", background: WHITE, cursor: "pointer", minWidth: "160px" }}>
                  <option value="">All Courses</option>
                  {courseOptions.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                {slcCourse && (
                  <button type="button" onClick={() => setSlcCourse("")}
                    style={{ padding: "6px 10px", border: `1px solid ${BORDER}`, borderRadius: "6px", fontSize: "11px", background: WHITE, cursor: "pointer", color: "#EF4444" }}>Clear</button>
                )}
              </div>
            </div>

            {/* Table */}
            <div style={{ border: `1px solid ${BORDER}`, borderRadius: "8px", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                <thead>
                  <tr style={{ background: DARK_GREEN, color: WHITE }}>
                    {["#", "Student ID#", "Last Name", "First Name", "Middle Name", "Course", "Year Level", "Section"].map(h => (
                      <th key={h} style={{ padding: "9px 12px", textAlign: "left", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr><td colSpan={8} style={{ padding: "24px", textAlign: "center", color: GRAY }}>No students found.</td></tr>
                  ) : rows.map((s, i) => (
                    <tr key={s.id} style={{ background: i % 2 === 0 ? WHITE : "#f9f9f6", borderBottom: `1px solid ${BORDER}` }}>
                      <td style={{ padding: "7px 12px", color: GRAY }}>{i + 1}</td>
                      <td style={{ padding: "7px 12px", fontFamily: "monospace", color: BLUE, whiteSpace: "nowrap" }}>{s.student_number || "—"}</td>
                      <td style={{ padding: "7px 12px", fontWeight: 600 }}>{s.last_name || "—"}</td>
                      <td style={{ padding: "7px 12px" }}>{s.first_name || "—"}</td>
                      <td style={{ padding: "7px 12px", color: GRAY }}>{s.middle_name || "—"}</td>
                      <td style={{ padding: "7px 12px" }}>{s.course || "—"}</td>
                      <td style={{ padding: "7px 12px" }}>{s.year_level || "—"}</td>
                      <td style={{ padding: "7px 12px" }}>{s.section || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ margin: "8px 0 0", fontSize: "11px", color: GRAY }}>{rows.length} student(s){slcCourse ? ` · ${slcCourse}` : " · all courses"}</p>
          </div>
        );
      })()}

      {/* ── TRANSCRIPT OF RECORDS content ── */}
      {activeTab === "reports" && reportsSubTab === "student_record" && studentRecordSubTab === "transcript_of_records" && (
        <div style={{ marginTop: "12px", display: "flex", gap: "12px", minHeight: "520px" }}>
          {/* Left: student picker */}
          <div style={{ width: "260px", flexShrink: 0, border: `1px solid ${BORDER}`, borderRadius: "10px", overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "8px 12px", background: DARK_GREEN, color: WHITE, fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Select Student
            </div>
            <div style={{ padding: "6px 8px", borderBottom: `1px solid ${BORDER}` }}>
              <input type="text" value={torSearch} onChange={e => setTorSearch(e.target.value)}
                placeholder="🔍 Search name or ID…"
                style={{ width: "100%", padding: "5px 8px", fontSize: "10px", border: `1px solid ${BORDER}`, borderRadius: "5px", outline: "none", boxSizing: "border-box" }} />
            </div>
            <div style={{ flex: 1, overflowY: "auto" }}>
              {(students || []).filter(s => s.graduation_status !== "graduated").filter(s => {
                if (!torSearch.trim()) return true;
                const q = torSearch.toLowerCase();
                return (s.last_name||"").toLowerCase().includes(q) ||
                       (s.first_name||"").toLowerCase().includes(q) ||
                       (s.student_number||"").toLowerCase().includes(q);
              }).map(s => {
                const sel = torPrintStudent?.id === s.id;
                return (
                  <div key={s.id} onClick={async () => {
                    setTorPrintStudent(s);
                    setTorHonorableDate("");
                    setTorCourseDisplay("");
                    setTorOrNo("");
                    setTorDstOrNo("");
                    setTorDateIssued("");
                    setTorGrades([]);
                    setTorEnrollments([]);
                    try {
                      const [gRes, eRes] = await Promise.all([
                        fetch(`${import.meta.env.VITE_API_URL}/api/erd/tor-subjects/${s.id}`),
                        fetch(`${import.meta.env.VITE_API_URL}/api/erd/enrollments?student_id=${s.id}`)
                      ]);
                      if (gRes.ok) setTorGrades(await gRes.json());
                      if (eRes.ok) setTorEnrollments(await eRes.json());
                    } catch(_) {}
                  }}
                    style={{ padding: "7px 10px", borderBottom: `1px solid #F3F4F6`, cursor: "pointer", background: sel ? "#eaf2d9" : "transparent", display: "flex", flexDirection: "column", gap: "1px" }}
                    onMouseEnter={e => { if (!sel) e.currentTarget.style.background = LIGHT_GRAY; }}
                    onMouseLeave={e => { if (!sel) e.currentTarget.style.background = "transparent"; }}>
                    <span style={{ fontSize: "9px", fontWeight:700, color: BLUE, fontFamily:"monospace", letterSpacing:"0.03em" }}>{s.student_number || "—"}</span>
                    <span style={{ fontSize: "11px", fontWeight: sel ? 800 : 500, color: "#111827" }}>{s.last_name}, {s.first_name} {s.middle_name || ""}</span>
                  </div>
                );
              })}
              {(students || []).length === 0 && (
                <div style={{ padding: "20px", textAlign: "center", color: GRAY, fontSize: "11px" }}>No students found.</div>
              )}
            </div>
          </div>

          {/* Right: TOR preview / action */}
          <div style={{ flex: 1, border: `1px solid ${BORDER}`, borderRadius: "10px", overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "8px 14px", background: DARK_GREEN, color: WHITE, fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span>Transcript of Records Preview</span>
              {torPrintStudent && (
                <button type="button" onClick={async () => {
                  if (!torPrintStudent) return;
                  setLoadingTor(true);
                  try {
                    const [gradesRes, enrollRes] = await Promise.all([
                      fetch(`${import.meta.env.VITE_API_URL}/api/erd/tor-subjects/${torPrintStudent.id}`),
                      fetch(`${import.meta.env.VITE_API_URL}/api/erd/enrollments?student_id=${torPrintStudent.id}`),
                    ]);
                    setTorGrades(gradesRes.ok ? await gradesRes.json() : []);
                    setTorEnrollments(enrollRes.ok ? await enrollRes.json() : []);
                  } catch { setTorGrades([]); setTorEnrollments([]); }
                  setLoadingTor(false);
                  setTimeout(() => {
                    const p1 = document.getElementById('tor-print-area');
                    const gradePages = Array.from(document.querySelectorAll('.tor-grade-page'));
                    const mp = document.createElement('div');
                    mp.id = 'tor-mp-container';
                    if (p1) { const c = p1.cloneNode(true); c.id='tor-mp-p1'; mp.appendChild(c); }
                    gradePages.forEach((pg, i) => { const c = pg.cloneNode(true); c.id='tor-mp-gp'+i; mp.appendChild(c); })
                    document.body.appendChild(mp);
                    const cleanup = () => { if(document.body.contains(mp)) document.body.removeChild(mp); window.removeEventListener('afterprint',cleanup); };
                    window.addEventListener('afterprint', cleanup);
                    window.print();
                  }, 350);
                }}
                  style={{ padding: "5px 14px", background: WHITE, color: DARK_GREEN, border: "none", borderRadius: "5px", fontWeight: 800, fontSize: "11px", cursor: "pointer" }}>
                  🖨 Print TOR
                </button>
              )}
            </div>
            {!torPrintStudent ? (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "10px", color: GRAY }}>
                <span style={{ fontSize: "36px" }}>📄</span>
                <span style={{ fontSize: "13px" }}>Select a student to generate TOR</span>
              </div>
            ) : (
              /* ── INLINE TOR DOCUMENT PREVIEW ── */
              <div id="tor-pages-wrapper" style={{ flex: 1, overflowY: "auto", background: "#e5e7eb", padding: "36px 16px 16px" }}>
                <style>{`
                  @media print {
                    @page { size: 8.5in 13in portrait; margin: 0; }
                    body * { visibility: hidden !important; }
                    #tor-mp-container, #tor-mp-container * {
                      visibility: visible !important;
                      -webkit-print-color-adjust: exact !important;
                      print-color-adjust: exact !important;
                      color-adjust: exact !important;
                    }
                    #tor-mp-container {
                      position: absolute !important;
                      top: 0 !important; left: 0 !important;
                      width: 816px !important;
                      background: white !important;
                    }
                    #tor-mp-p1 {
                      position: relative !important;
                      width: 816px !important;
                      box-sizing: border-box !important;
                      box-shadow: none !important;
                      margin: 0 !important;
                      padding: 25px 48px 0 !important;
                      break-after: page !important;
                      page-break-after: always !important;
                      min-height: 12.9in !important;
                    }
                    [id^="tor-mp-gp"] {
                      position: relative !important;
                      width: 816px !important;
                      box-sizing: border-box !important;
                      box-shadow: none !important;
                      margin: 0 !important;
                      padding: 38px 48px !important;
                      break-before: page !important;
                      page-break-before: always !important;
                      min-height: 12.9in !important;
                    }
                    #tor-mp-p1 textarea::placeholder,
                    [id^="tor-mp-gp"] textarea::placeholder,
                    [id^="tor-mp-gp"] input::placeholder { color: transparent !important; }
                  }
                `}</style>
                <div id="tor-print-area" style={{
                  background: WHITE,
                  position: "relative",
                  width: "816px",        /* 8.5in @ 96dpi */
                  minHeight: "1056px",   /* approx 11in */
                  margin: "20px auto 0",
                  padding: "38px 48px",
                  boxSizing: "border-box",
                  fontFamily: '"Times New Roman", Times, serif',
                  fontSize: "9.5pt",
                  color: "#000",
                  boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
                  transformOrigin: "top center",
                }}>
                  {/* ── WATERMARK ── */}
                  <div style={{ position:"absolute", top:0, left:0, right:0, bottom:0, display:"flex", alignItems:"center", justifyContent:"center", pointerEvents:"none", zIndex:0, overflow:"hidden" }}>
                    <img 
                      src={ccaLogo} 
                      alt="" 
                      style={{ width:"1000px", height:"1000px", objectFit:"contain", opacity:0.10 }} 
                      />
                  </div>
                  <style>{`
                    .pvw-td  { border:1px solid #333; padding:1px 5px; vertical-align:top; font-family:"Times New Roman",Times,serif; font-size:8.5pt; }
                    .pvw-th  { border:1px solid #333; padding:1px 5px; font-weight:700; font-size:7.5pt; background:#e8e8e8; text-align:center; font-family:"Times New Roman",Times,serif; }
                    .pvw-hdr { border:1px solid #333; background:#ddd; text-align:center; font-weight:900; font-size:8pt; letter-spacing:.5px; text-transform:uppercase; padding:2px 4px; font-family:"Times New Roman",Times,serif; }
                    .pvw-row { padding:2px 6px; border-bottom:1px solid #ddd; display:flex; gap:4px; font-family:"Times New Roman",Times,serif; }
                    @media print { .tor-valid-for-select { display:none !important; } .tor-valid-for-text { display:block !important; } }
                  `}</style>

                  {/* HEADER */}
                  <table style={{ width:"100%", borderCollapse:"collapse", marginBottom:"2px", tableLayout:"fixed" }}>
                    <tbody><tr>
                      <td style={{ width:"130px", verticalAlign:"middle", textAlign:"center" }}>
                        <img src={alangalangLogo} alt="" style={{ width:75, height:75, objectFit:"contain" }} />
                      </td>
                      <td style={{ textAlign:"center", verticalAlign:"middle", userSelect:"none", pointerEvents:"none" }}>
                        <div style={{ fontSize:"12pt", fontFamily:'"Times New Roman",Times,serif' }}>Republic of the Philippines</div>
                        <div style={{ fontSize:"15pt", fontWeight:900, textTransform:"uppercase", letterSpacing:"0.5px", lineHeight:1.1, fontFamily:'"Times New Roman",Times,serif', whiteSpace:"nowrap" }}>Community College of Alangalang</div>
                        <div style={{ fontSize:"12pt", fontFamily:'"Times New Roman",Times,serif' }}>Alangalang, Leyte</div>
                      </td>
                      <td style={{ width:"130px", verticalAlign:"middle", textAlign:"center" }}>
                        <img src={ccaLogo} alt="" style={{ width:80, height:80, objectFit:"contain" }} />
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={3} style={{ position:"relative", height:"44px", userSelect:"none", pointerEvents:"none" }}>
                        <div style={{ position:"absolute", top:0, left:0, width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden" }}>
                          <div style={{ fontSize: candFormMode ? "33px" : "50px", fontWeight:900, letterSpacing:"-1px", fontFamily:'Algerian, "Times New Roman", Times, serif', whiteSpace:"nowrap", transform:"scaleX(0.68)", transformOrigin:"center center" }}>{candFormMode ? "RECORDS OF CANDIDATES FOR GRADUATION" : "OFFICIAL TRANSCRIPT OF RECORDS"}</div>
                        </div>
                      </td>
                    </tr>
                    </tbody>
                  </table>

                  {/* Thick divider */}
                  <div style={{ borderTop:"2.5px solid #000", borderBottom:"1px solid #000", height:"3px", marginBottom:"3px", marginTop:"0px" }} />

                  {/* NAME ROW */}
                  <table style={{ width:"100%", borderCollapse:"collapse", marginBottom:"4px", userSelect:"none", pointerEvents:"none" }}>
                    <tbody><tr>
                      <td style={{ width:"220px", padding:"2px 6px" }}>
                        <div style={{ fontSize:"16pt", fontWeight:900, letterSpacing:"1px", lineHeight:1.1, fontFamily:'"Times New Roman",Times,serif' }}>{(torPrintStudent.last_name||"").toUpperCase()}</div>
                        <div style={{ fontStyle:"italic", fontSize:"8pt", color:"#555" }}>Last Name</div>
                      </td>
                      <td style={{ width:"22%", padding:"2px 8px 2px 33px" }}>
                        <div style={{ fontSize:"12pt", fontWeight:800, fontFamily:'"Times New Roman",Times,serif' }}>{(torPrintStudent.first_name||"").toUpperCase()}</div>
                        <div style={{ fontStyle:"italic", fontSize:"8pt", color:"#555" }}>First Name</div>
                      </td>
                      <td style={{ width:"22%", padding:"2px 8px 2px 28px" }}>
                        <div style={{ fontSize:"12pt", fontWeight:800, fontFamily:'"Times New Roman",Times,serif' }}>{(torPrintStudent.middle_name||"").toUpperCase()||"—"}</div>
                        <div style={{ fontStyle:"italic", fontSize:"8pt", color:"#555" }}>Middle Name</div>
                      </td>
                      <td style={{ padding:"2px 8px 2px 28px" }}>
                        <div style={{ fontSize:"8.5pt", fontFamily:'"Times New Roman",Times,serif' }}>Student No. <span style={{ fontWeight:900, fontFamily:"monospace", fontSize:"9pt" }}>{torPrintStudent.student_number||"—"}</span></div>
                      </td>
                    </tr></tbody>
                  </table>

                  {/* MAIN TWO-COLUMN */}
                  <table style={{ width:"100%", borderCollapse:"separate", borderSpacing:"5px 0" }}>
                    <tbody><tr style={{ verticalAlign:"top" }}>

                      {/* LEFT: Photo + Personal Data */}
                      <td style={{ width:"200px", border:"1px solid #333", padding:0, userSelect:"none", pointerEvents:"none" }}>
                        <div style={{ width:"100%", height:"185px", borderBottom:"1px solid #333", background:"#f5f5f5", overflow:"hidden", position:"relative", zIndex:1 }}>
                          {torPrintStudent.profile_picture
                            ? <img src={torPrintStudent.profile_picture} alt="Photo" style={{ width:"100%", height:"100%", objectFit:"cover", objectPosition:"center top" }} />
                            : <div style={{ textAlign:"center", color:"#aaa", fontSize:"8pt", fontFamily:'"Times New Roman",Times,serif' }}><div style={{ fontSize:"26pt", lineHeight:1 }}>👤</div><div>2×2 Photo</div></div>
                          }
                        </div>
                        <div className="pvw-hdr" style={{ borderLeft:"none", borderRight:"none" }}>Personal Data</div>
                        {[
                          ["Sex:",          torPrintStudent.gender||"—"],
                          ["Religion:",     torPrintStudent.religion||"—"],
                          ["Citizenship:",  torPrintStudent.citizenship||"Filipino"],
                          ["Date of Birth:", torPrintStudent.birthdate
                            ? new Date(torPrintStudent.birthdate+"T00:00:00").toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})
                            : "—"],
                          ["Place of Birth:", torPrintStudent.place_of_birth||"—"],
                          ["Civil Status:", torPrintStudent.status||"—"],
                          ["Home Address:", [torPrintStudent.barangay,torPrintStudent.municipality,torPrintStudent.province].filter(Boolean).join(", ")||"—"],
                        ].map(([lbl,val])=>(
                          <div key={lbl} className="pvw-row">
                            <span style={{ fontSize:"8pt", fontWeight:700, minWidth:"88px", flexShrink:0 }}>{lbl}</span>
                            <span style={{ fontSize:"8.5pt" }}>{val}</span>
                          </div>
                        ))}
                        <div className="pvw-row" style={{ flexDirection:"column" }}>
                          <span style={{ fontSize:"8pt", fontWeight:700 }}>Parents:</span>
                          <div style={{ marginLeft:"8px" }}>
                            <div style={{ fontSize:"8pt" }}>Father: {[torPrintStudent.father_first,torPrintStudent.father_middle,torPrintStudent.father_last].filter(Boolean).join(" ")||"—"}</div>
                            <div style={{ fontSize:"8pt" }}>Mother: {[torPrintStudent.mother_first,torPrintStudent.mother_middle,torPrintStudent.mother_last].filter(Boolean).join(" ")||"—"}</div>
                          </div>
                        </div>
                        <div className="pvw-row"><span style={{ fontSize:"8pt", fontWeight:700, minWidth:"88px" }}>Parent's Address:</span><span style={{ fontSize:"8pt" }}>{torPrintStudent.parents_address||"—"}</span></div>
                        <div className="pvw-row"><span style={{ fontSize:"8pt", fontWeight:700, minWidth:"88px" }}>Spouse:</span><span style={{ fontSize:"8pt" }}>{torPrintStudent.spouse_name||"—"}</span></div>
                        <div className="pvw-row" style={{ borderBottom:"none" }}><span style={{ fontSize:"8pt", fontWeight:700, minWidth:"88px" }}>Spouse Address:</span><span style={{ fontSize:"8pt" }}>{torPrintStudent.spouse_address||"—"}</span></div>
                      </td>

                      {/* RIGHT: Educational Background — enhanced */}
                      <td style={{ padding:0, verticalAlign:"top", border:"1px solid #333" }}>

                        {/* ── EDUCATIONAL BACKGROUND ── */}
                        <div className="pvw-hdr" style={{ borderLeft:"none", borderRight:"none", borderTop:"none", background:"#2c4a1e", color:"#fff", fontSize:"8pt", letterSpacing:"1.5px" }}>Educational Background</div>
                        <table style={{ width:"100%", borderCollapse:"collapse" }}>
                          <thead>
                            <tr>
                              <th className="pvw-th" style={{ width:"19%" }}>Level</th>
                              <th className="pvw-th">Name of School</th>
                              <th className="pvw-th">Address</th>
                              <th className="pvw-th" style={{ width:"14%" }}>Year</th>
                            </tr>
                          </thead>
                          <tbody>
                            {[
                              ["Elementary", torPrintStudent.elem_school, torPrintStudent.elem_address, torPrintStudent.elem_year],
                              ["Secondary",  torPrintStudent.hs_school,   torPrintStudent.hs_address,   torPrintStudent.hs_year],
                              ["College",    torPrintStudent.col_school,   torPrintStudent.col_address,  torPrintStudent.col_year],
                            ].map(([lvl,school,addr,yr])=>(
                              <tr key={lvl}>
                                <td className="pvw-td" style={{ fontWeight:700, fontSize:"7.5pt", textAlign:"center" }}>{lvl}</td>
                                <td className="pvw-td" style={{ color:"#000", fontWeight:600, fontSize:"8pt" }}>{school||"—"}</td>
                                <td className="pvw-td" style={{ color:"#000", fontSize:"7.5pt" }}>{addr||"—"}</td>
                                <td className="pvw-td" style={{ textAlign:"center", fontSize:"8pt", fontWeight:700, color:"#000" }}>{yr||"—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        {/* ── ENTRANCE CREDENTIALS ── */}
                        <div className="pvw-hdr" style={{ borderLeft:"none", borderRight:"none", background:"#2c4a1e", color:"#fff", fontSize:"8pt", letterSpacing:"1.5px" }}>Entrance Credentials to College</div>
                        <div style={{ padding:"6px 10px", minHeight:"32px", fontSize:"8.5pt", fontFamily:'"Times New Roman",Times,serif', color:"#333", lineHeight:1.6 }}>
                          {torPrintStudent.scholastic_notes||<span style={{ color:"#aaa", fontStyle:"italic" }}>—</span>}
                        </div>

                        {/* ── OTHER UPDATED INFORMATION ── */}
                        <div className="pvw-hdr" style={{ borderLeft:"none", borderRight:"none", borderTop:"none", background:"#2c4a1e", color:"#fff", fontSize:"8pt", letterSpacing:"1.5px" }}>Other Updated Information</div>
                        <textarea placeholder="Type here..." onInput={e=>{ e.target.style.height="auto"; e.target.style.height=e.target.scrollHeight+"px"; }} style={{ width:"100%", padding:"6px 10px", border:"none", outline:"none", resize:"none", overflow:"hidden", fontSize:"8.5pt", fontFamily:'"Times New Roman",Times,serif', color:"#333", boxSizing:"border-box", background:"transparent", minHeight:"90px" }} />

                        {/* ── HONORABLE DISMISSAL ── */}
                        <div className="pvw-hdr" style={{ borderLeft:"none", borderRight:"none", borderTop:"none", background:"#2c4a1e", color:"#fff", fontSize:"8pt", letterSpacing:"1.5px" }}>Granted Honorable Dismissal Effective:</div>
                        <input value={torHonorableDate} onChange={e=>setTorHonorableDate(e.target.value)} placeholder="—" style={{ width:"100%", padding:"6px 10px", border:"none", borderBottom:"1px solid #ddd", outline:"none", fontSize:"8.5pt", fontFamily:'"Times New Roman",Times,serif', boxSizing:"border-box", background:"transparent", color:"#333" }} />

                        {/* ── VALID ONLY FOR ── */}
                        <div className="pvw-hdr" style={{ borderLeft:"none", borderRight:"none", borderTop:"none", background:"#2c4a1e", color:"#fff", fontSize:"8pt", letterSpacing:"1.5px", marginTop:"48px" }}>Valid Only For:</div>
                        <div className="tor-valid-for-select" style={{ padding:"6px 10px", textAlign:"center" }}>
                          <select value={torCourseDisplay} onChange={e=>setTorCourseDisplay(e.target.value)} style={{ border:"1px solid #aaa", outline:"none", fontSize:"8.5pt", fontFamily:'"Times New Roman",Times,serif', fontWeight:800, background:"#fff", color:"#1a3a6e", cursor:"pointer", padding:"2px 8px", borderRadius:"2px", width:"80%" }}>
                            <option value="">—</option>
                            <option value="Employment">Employment</option>
                            <option value="Board Examination">Board Examination</option>
                            <option value="Civil Service">Civil Service</option>
                            <option value="Personal Copy">Personal Copy</option>
                            <option value="Further Studies">Further Studies</option>
                          </select>
                        </div>
                        <div className="tor-valid-for-text" style={{ display:"none", padding:"4px 10px", fontSize:"9pt", fontFamily:'"Times New Roman",Times,serif', fontWeight:800, color:"#1a3a6e", textAlign:"center" }}>{torCourseDisplay||"—"}</div>

                      </td>
                    </tr></tbody>
                  </table>

                  {/* CONTINUATION NOTE */}
                  {torGrades && torGrades.length > 0 && (
                    <div style={{ textAlign:"center", fontSize:"8pt", fontFamily:'"Times New Roman",Times,serif', fontStyle:"italic", marginTop:"16px", borderTop:"1px solid #aaa", paddingTop:"6px", color:"#444", letterSpacing:"1px" }}>
                      —— CONTINUATION ON NEXT PAGE ——
                    </div>
                  )}

                  {/* FOOTER NOTE */}
                  <div style={{ marginTop:"10px", borderTop:"1.5px solid #555", paddingTop:"4px", fontSize:"7.5pt", lineHeight:1.7, fontStyle:"italic", fontFamily:'"Times New Roman",Times,serif' }}>
                    Note: This transcript is considered original when it bears the dry embossed seal of the College and the original signature of the Registrar. Any erasure or alteration made on this copy renders the whole transcript invalid.
                  </div>
                  <div style={{ marginTop:"33px", fontSize:"7.5pt", fontFamily:'"Times New Roman",Times,serif', fontStyle:"italic" }}>College Seal</div>

                  {/* SEAL + SIGNATURE */}
                  <div style={{ textAlign:"right", marginTop:"14px", marginRight:"35px" }}>
                    <div style={{ height:"36px" }} />
                    <div style={{ display:"inline-block", minWidth:"180px", textAlign:"center" }}>
                      <div style={{ borderBottom:"1.5px solid #333", paddingBottom:"2px", minHeight:"13px", fontWeight:800, fontSize:"9pt", textTransform:"uppercase", fontFamily:'"Times New Roman",Times,serif' }}>{registrarSignName}</div><div style={{ fontWeight:900, fontSize:"10pt", textTransform:"uppercase", letterSpacing:"0.5px", fontFamily:'"Times New Roman",Times,serif' }}>REGISTRAR</div>
                    </div>
                  </div>
                  {/* PAGE NUMBER bottom edge */}
                  <div style={{ position:"absolute", bottom:"28px", left:"48px", fontSize:"8pt", fontFamily:'"Times New Roman",Times,serif', fontStyle:"italic" }}>Page <u>1</u> of <u>{torGrades && torGrades.length > 0 ? (() => {
          const ks = new Set();
          torGrades.forEach(g => {
            const sem=String(g.semester||"1").trim();
            const yl=String(g.year_level||"");
            const ylk=yl==="1st Year"?"1":yl==="2nd Year"?"2":yl==="3rd Year"?"3":yl==="4th Year"?"4":"9";
            const sk=(sem==="1"||sem==="1st Semester")?"1":(sem==="2"||sem==="2nd Semester")?"2":"9";
            ks.add(`${ylk}|${g.year_start||""}|${g.year_end||""}|${sk}|${sem}`);
          });
          return 1 + Math.ceil(ks.size / 5);
        })() : 1}</u> pages</div>

                  <TorContactFooter />
                </div>{/* end white page */}

              {/* ── PAGE 2: GRADES ── */}
              {torGrades && torGrades.length > 0 && (() => {
                const GC = { padding:"0 4px", lineHeight:"1.25", fontSize:"11px", fontFamily:'"Times New Roman",Times,serif', verticalAlign:"middle" };
                const GH = { ...GC, fontWeight:700, background:"#2c4a1e", color:"#fff", fontSize:"11px", textAlign:"center" };
                const semAbbr = s => { const v=String(s||'').trim(); return v==='1'||v==='1st Semester'?'1st SEM':v==='2'||v==='2nd Semester'?'2nd SEM':v||'—'; };
                const groups = {};
                torGrades.forEach(g => {
                  const sem = String(g.semester || '1').trim();
                  const ys  = g.year_start || "";
                  const ye  = g.year_end   || "";
                  const yl  = String(g.year_level || "");
                  const ylk = yl==="1st Year"?"1":yl==="2nd Year"?"2":yl==="3rd Year"?"3":yl==="4th Year"?"4":"9";
                  const sk  = (sem==="1"||sem==="1st Semester") ? "1" : (sem==="2"||sem==="2nd Semester") ? "2" : "9";
                  const key = `${ylk}|${ys}|${ye}|${sk}|${sem}`;
                  if(!groups[key]) groups[key] = { sem, ys, ye, yl, rows:[] };
                  groups[key].rows.push(g);
                });
                const sortedKeys = Object.keys(groups).sort();
                const GROUPS_PER_PAGE = 4;
                const chunks = [];
                for (let i = 0; i < sortedKeys.length; i += GROUPS_PER_PAGE)
                  chunks.push(sortedKeys.slice(i, i + GROUPS_PER_PAGE));
                const totalPages = 1 + chunks.length;
                const PageHeader = () => (
                  <>
                    <table style={{ width:"100%", borderCollapse:"collapse", marginBottom:"2px", tableLayout:"fixed" }}>
                      <tbody><tr>
                        <td style={{ width:"130px", verticalAlign:"middle", textAlign:"center" }}>
                          <img src={alangalangLogo} alt="" style={{ width:75, height:75, objectFit:"contain" }} />
                        </td>
                        <td style={{ textAlign:"center", verticalAlign:"middle" }}>
                          <div style={{ fontSize:"12pt", fontFamily:'"Times New Roman",Times,serif' }}>Republic of the Philippines</div>
                          <div style={{ fontSize:"15pt", fontWeight:900, textTransform:"uppercase", letterSpacing:"0.5px", lineHeight:1.1, fontFamily:'"Times New Roman",Times,serif', whiteSpace:"nowrap" }}>Community College of Alangalang</div>
                          <div style={{ fontSize:"12pt", fontFamily:'"Times New Roman",Times,serif' }}>Alangalang, Leyte</div>
                        </td>
                        <td style={{ width:"130px", verticalAlign:"middle", textAlign:"center" }}>
                          <img src={ccaLogo} alt="" style={{ width:80, height:80, objectFit:"contain" }} />
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={3} style={{ position:"relative", height:"44px" }}>
                          <div style={{ position:"absolute", top:0, left:0, width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden" }}>
                            <div style={{ fontSize: candFormMode ? "33px" : "50px", fontWeight:900, letterSpacing:"-1px", fontFamily:'Algerian, "Times New Roman", Times, serif', whiteSpace:"nowrap", transform:"scaleX(0.68)", transformOrigin:"center center" }}>{candFormMode ? "RECORDS OF CANDIDATES FOR GRADUATION" : "OFFICIAL TRANSCRIPT OF RECORDS"}</div>
                          </div>
                        </td>
                      </tr>
                      </tbody>
                    </table>
                    <div style={{ borderTop:"2.5px solid #000", borderBottom:"1px solid #000", height:"3px", marginBottom:"6px" }} />
                  </>
                );
                const renderPageFooter = () => (
                  <>
                    <div style={{ marginTop:"4px", fontSize:"7.5pt", fontFamily:'"Times New Roman",Times,serif', fontStyle:"italic" }}>College Seal</div>
                    <div style={{ marginTop:"2px", display:"flex", flexDirection:"column" }}>
                      {[
                        ["O.R. No.", torOrNo, setTorOrNo],
                        ["DST O.R. No.", torDstOrNo, setTorDstOrNo],
                        ["Date Issued", torDateIssued, setTorDateIssued],
                      ].map(([label, val, setter]) => (
                        <div key={label} style={{ display:"flex", alignItems:"center", fontSize:"7.5pt", fontFamily:'"Times New Roman",Times,serif', lineHeight:"1.2", margin:"0", padding:"0" }}>
                          <span style={{ fontWeight:700, whiteSpace:"nowrap" }}>{label}&nbsp;:&nbsp;</span>
                          <input value={val} onChange={e=>setter(e.target.value)}
                            ref={el => { if (el) el.scrollIntoView = () => {}; }}
                            maxLength={50}
                            style={{ width:"220px", border:"none", outline:"none", fontSize:"7.5pt", fontFamily:'"Times New Roman",Times,serif', background:"transparent", padding:"0 2px" }} />
                        </div>
                      ))}
                    </div>
                  </>
                );
                const renderPageSignature = (pageNum) => (
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", marginTop:"4px", gap:"20px", alignItems:"flex-end" }}>
                    <div style={{ fontSize:"8pt", fontFamily:'"Times New Roman",Times,serif', fontStyle:"italic" }}>
                      Page <u>{pageNum}</u> of <u>{totalPages}</u> pages
                    </div>
                    <div style={{ textAlign:"right", marginRight:"35px" }}>
                      <div style={{ height:"36px" }} />
                      <div style={{ display:"inline-block", minWidth:"180px", textAlign:"center" }}>
                        <div style={{ borderBottom:"1.5px solid #333", paddingBottom:"2px", minHeight:"13px", fontWeight:800, fontSize:"9pt", textTransform:"uppercase", fontFamily:'"Times New Roman",Times,serif' }}>{registrarSignName}</div><div style={{ fontWeight:900, fontSize:"10pt", textTransform:"uppercase", letterSpacing:"0.5px", fontFamily:'"Times New Roman",Times,serif' }}>REGISTRAR</div>
                      </div>
                    </div>
                  </div>
                );
                return chunks.map((chunkKeys, chunkIdx) => (
                  <div key={chunkIdx} className="tor-grade-page" style={{
                    background: "white",
                    position: "relative",
                    width: "816px",
                    minHeight: "1056px",
                    margin: "24px auto 0",
                    padding: "38px 48px",
                    boxSizing: "border-box",
                    fontFamily: '"Times New Roman", Times, serif',
                    fontSize: "11px",
                    color: "#000",
                    boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
                  }}>
                    {/* Watermark */}
                    <div style={{ position:"absolute", top:0, left:0, right:0, bottom:0, display:"flex", alignItems:"center", justifyContent:"center", pointerEvents:"none", zIndex:2, overflow:"hidden" }}>
                      <img src={ccaLogo} alt="" style={{ width:"1000px", height:"1000px", objectFit:"contain", opacity:0.10 }} />
                    </div>
                    <div style={{ position:"relative", zIndex:1 }}>
                      <PageHeader />
                      {/* GRADES for this page */}
                      <div>
                        {chunkKeys.map((key, gIdx) => {
                          const { sem, ys, ye, yl, rows } = groups[key];
                          const syStr = ys && ye ? `${ys}-${ye}` : ys||ye||"";
                          const ylLabel = yl ? yl.toUpperCase() : "";
                          const hdr = `${semAbbr(sem)}${syStr ? " "+syStr : ""}${ylLabel ? " - "+ylLabel : ""} - ${(torPrintStudent.course||"").toUpperCase()}`;
                          return (
                            <div key={key} style={{ marginBottom:"3px" }}>
                              <table style={{ width:"100%", borderCollapse:"collapse", tableLayout:"fixed" }}>
                                <colgroup>
                                  <col style={{ width:"22%" }}/><col/><col style={{ width:"10%" }}/><col style={{ width:"10%" }}/><col style={{ width:"10%" }}/>
                                </colgroup>
                                {gIdx === 0 && <thead>
                                  <tr>
                                    <th style={{ ...GH, textAlign:"left", paddingLeft:"6px" }}>Course Code</th>
                                    <th style={{ ...GH, textAlign:"left", paddingLeft:"81.5px" }}>Descriptive Title</th>
                                    <th style={GH}>Grades</th>
                                    <th style={GH}>Re-Exam</th>
                                    <th style={GH}>Credits</th>
                                  </tr>
                                </thead>}
                                <tbody>
                                  <tr>
                                    <td colSpan={5} style={{ background:"#3d6e01", color:"#fff", padding:"2px 8px", fontWeight:700, fontSize:"11px", fontFamily:'"Times New Roman",Times,serif', letterSpacing:"0.5px" }}>
                                      {hdr}
                                    </td>
                                  </tr>
                                  {rows.map((g,i) => (
                                    <tr key={i} style={{ background:"#fff" }}>
                                      <td style={{ ...GC, textAlign:"left", paddingLeft:"6px" }}>{g.subject_code||"—"}</td>
                                      <td style={{ ...GC, textAlign:"left", paddingLeft:"6px", whiteSpace:"normal", wordBreak:"break-word" }}>{g.subject_title||"—"}</td>
                                      <td style={{ ...GC, textAlign:"center", fontWeight:700, color:parseFloat(g.grade)>3.0?"#C62828":"#000" }}>{g.grade!=null?g.grade:""}</td>
                                      <td style={{ ...GC, textAlign:"center", color:"#999" }}>—</td>
                                      <td style={{ ...GC, textAlign:"center", fontWeight:600 }}>{g.units||"—"}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          );
                        })}
                      </div>
                      {/* Continuation / closed marker */}
                      <div style={{ textAlign:"center", fontSize:"6pt", fontWeight:400, fontFamily:'"Times New Roman",Times,serif', letterSpacing:"0.5px", color:"#555", borderTop:"1px solid #aaa", borderBottom:"1px solid #aaa", padding:"1px 0", margin:"4px 0 1px" }}>
                        {chunkIdx < chunks.length - 1
                          ? "—— CONTINUATION ON NEXT PAGE ——"
                          : "—— TRANSCRIPT CLOSED ——"}
                      </div>
                      {/* Note immediately below marker */}
                      <div style={{ marginTop:"3px", fontSize:"7.5pt", lineHeight:1.7, fontStyle:"italic", fontFamily:'"Times New Roman",Times,serif' }}>
                        Note: This transcript is considered original when it bears the dry embossed seal of the College and the original signature of the Registrar. Any erasure or alteration made on this copy renders the whole transcript invalid.
                      </div>
                      {renderPageFooter()}
                      {/* Grading system block — last page only */}
                      {chunkIdx === chunks.length - 1 && (
                        <div style={{ marginTop:"8px", fontFamily:'"Times New Roman",Times,serif' }}>
                          {/* Green full-width header */}
                          <div style={{ background:"#2c4a1e", color:"#fff", fontWeight:900, fontSize:"8pt", textTransform:"uppercase", textAlign:"center", letterSpacing:"1.5px", padding:"3px 6px", marginBottom:"6px" }}>Grading System</div>
                          <div style={{ fontSize:"7pt", lineHeight:1.7 }}>
                            1.00 Excellent;&nbsp; 1.25 Highly Outstanding;&nbsp; 1.50 Outstanding;&nbsp; 1.75 Very Good;&nbsp; 2.00 Good;&nbsp; 2.25 Very Satisfactory;&nbsp; 2.50 Satisfactory;&nbsp; 2.75 Fair;&nbsp; 3.00 Passing;&nbsp; 5.00 Failure;&nbsp; INC Incomplete;&nbsp; DR Dropped;&nbsp; Audit;&nbsp; US Unsatisfactory;&nbsp; In Progress
                          </div>
                          <div style={{ fontSize:"7pt", marginTop:"3px" }}>
                            <span style={{ fontWeight:700 }}>Credits: </span>1 unit of credit is 1 hour lecture or 3 hours laboratory each week for 1 semester of 18 weeks.
                          </div>
                          <div style={{ display:"flex", gap:"4px", alignItems:"baseline", marginTop:"1px", fontSize:"7pt" }}>
                            <span style={{ fontWeight:700, whiteSpace:"nowrap" }}>Remarks:</span>
                            <input ref={el => { if (el) el.scrollIntoView = () => {}; }}
                              style={{ flex:1, border:"none", borderBottom:"1px solid #555", outline:"none", fontSize:"7pt", fontFamily:'"Times New Roman",Times,serif', background:"transparent", padding:"0 2px" }} />
                          </div>
                          <div style={{ fontSize:"6pt", fontStyle:"italic", marginTop:"1px" }}>
                            Note:This transcript is considered original when it bears the dry embossed seal of the college and the original signature of the Registrar. Any erasure or alteration made on this copy renders the whole transcript invalid.
                          </div>
                        </div>
                      )}
                      {renderPageSignature(chunkIdx + 2)}
                    </div>
                    <TorContactFooter />
                  </div>
                ));
              })()}

              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MAINTENANCE SUB-NAV ── */}
      {activeTab === "maintenance" && (
        <>
        <style>{`
          @keyframes srSlideIn { from{opacity:0;transform:translateX(-16px)} to{opacity:1;transform:translateX(0)} }
          .sr-btn { position:relative; overflow:hidden; }
          .sr-btn::after {
            content:''; position:absolute; bottom:0; left:0;
            height:2px; width:0; background:${GOLD};
            transition: width 0.2s ease;
          }
          .sr-btn:hover::after { width:100%; }
          .sr-btn:hover { background:#f2f9e8 !important; color:${DARK_GREEN} !important; transform:translateY(-1px); box-shadow:0 3px 10px rgba(27,94,32,0.12); }
          .sr-btn-active::after { width:100% !important; }
        `}</style>
        <div style={{
          display: "flex", gap: "2px", flexWrap: "nowrap",
          padding: "10px 0 0", marginTop: "-8px",
          borderBottom: `2px solid ${BORDER}`,
          width: "100%",
        }}>
          {[
            { key: "program_curriculum",    label: "Program Curriculum" },
            { key: "course_assignment",     label: "Course Assignment" },
            { key: "school_fees_charges",   label: "School Fees and Charges" },
            { key: "grades",                label: "Grades" },
            { key: "recompute_assessment",  label: "Recompute Assessment" },
            { key: "school_profile",        label: "School Profile" },
          ].map((sub, i) => {
            const isActive = maintenanceSubTab === sub.key;
            return (
              <button key={sub.key} type="button"
                className={`sr-btn${isActive ? " sr-btn-active" : ""}`}
                onClick={() => setMaintenanceSubTab(sub.key)}
                style={{
                  flex: 1,
                  padding: "7px 4px",
                  background: isActive ? DARK_GREEN : "transparent",
                  color: isActive ? WHITE : "#4B5563",
                  border: "none",
                  borderRadius: "7px 7px 0 0",
                  fontWeight: isActive ? 700 : 500,
                  fontSize: "11px",
                  cursor: "pointer",
                  letterSpacing: "0.2px",
                  whiteSpace: "nowrap",
                  textAlign: "center",
                  transition: "all 0.18s ease",
                  boxShadow: isActive ? "0 -2px 8px rgba(27,94,32,0.15)" : "none",
                  animation: `srSlideIn 0.32s ${i * 0.05}s cubic-bezier(0.22,1,0.36,1) both`,
                }}>
                {sub.label}
              </button>
            );
          })}
        </div>
        </>
      )}

      {/* ── SUBJECTS TAB — moved to Admin Settings > Subjects ── */}
      {false && (
        <div style={{ background: WHITE, borderRadius: "10px", border: `1px solid ${BORDER}`, overflow: "hidden" }}>
          {/* Header */}
          <div style={{ padding: "14px 20px", background: LIGHT_GRAY, borderBottom: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
            <h3 style={{ margin: 0, fontSize: "14px", color: DARK_GREEN, fontWeight: 800 }}>Subject Catalog</h3>
            <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
              {/* Course filter */}
              <select value={subjectFilter.course} onChange={e => setSubjectFilter(f => ({ ...f, course: e.target.value }))}
                style={{ padding: "6px 10px", border: `1px solid ${BORDER}`, borderRadius: "6px", fontSize: "12px", background: WHITE, color: "#111827", cursor: "pointer" }}>
                <option value="">All Courses</option>
                {courses.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {/* Year Level filter */}
              <select value={subjectFilter.year_level} onChange={e => setSubjectFilter(f => ({ ...f, year_level: e.target.value }))}
                style={{ padding: "6px 10px", border: `1px solid ${BORDER}`, borderRadius: "6px", fontSize: "12px", background: WHITE, color: "#111827", cursor: "pointer" }}>
                <option value="">All Year Levels</option>
                {YEAR_LEVELS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              {/* Semester filter */}
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
              <button type="button" onClick={() => { setSubjectForm({ subject_code: "", subject_title: "", units: "3", lec_hours: "3", lab_hours: "0", pre_requisite: "None", course: courses[0] || "", year_level: "1st Year", semester: "1" }); setEditingSubjectId(null); setShowSubjectModal(true); }}
                style={{ padding: "8px 14px", background: DARK_GREEN, color: WHITE, border: "none", borderRadius: "6px", fontWeight: 700, cursor: "pointer" }}>
                ➕ Add Subject
              </button>
            </div>
          </div>

          {/* Filter summary badge */}
          {subjectFilter.course && (
            <div style={{ padding: "8px 20px", background: "#eaf2d9", borderBottom: `1px solid ${BORDER}`, fontSize: "12px", color: DARK_GREEN, fontWeight: 600 }}>
              Showing: {subjectFilter.course} — {subjectFilter.year_level || "All Years"} — {subjectFilter.semester === "1" ? "1st Semester" : subjectFilter.semester === "2" ? "2nd Semester" : "All Semesters"}
              <span style={{ color: GRAY, fontWeight: 400, marginLeft: "8px" }}>({filteredSubjects.length} subject{filteredSubjects.length !== 1 ? "s" : ""})</span>
            </div>
          )}

          {/* Grouped catalog blocks */}
          {!subjectFilter.course ? (
            <div style={{ padding: "52px 40px", textAlign: "center", color: GRAY, fontSize: "13px" }}>
              <div style={{ fontSize: "32px", marginBottom: "12px" }}>📚</div>
              <div style={{ fontWeight: 700, color: DARK_GREEN, fontSize: "14px", marginBottom: "6px" }}>Select a Course to View Subjects</div>
              <div style={{ color: GRAY, fontSize: "12px" }}>Use the <strong>course dropdown</strong> above to choose a program, then click the arrow on each year level to expand its subjects.</div>
            </div>
          ) : (() => {
            const yearLabel = (y) => ({
              "1st Year": "FIRST YEAR",
              "2nd Year": "SECOND YEAR",
              "3rd Year": "THIRD YEAR",
              "4th Year": "FOURTH YEAR",
            }[y] || y?.toUpperCase() || "UNASSIGNED");

            const semLabel = (s) => ({
              "1": "FIRST SEMESTER",
              "2": "SECOND SEMESTER",
              1:   "FIRST SEMESTER",
              2:   "SECOND SEMESTER",
            }[s] || "UNASSIGNED");

            // Build ordered group keys
            const ORDER = [
              ["1st Year", "1"], ["1st Year", "2"],
              ["2nd Year", "1"], ["2nd Year", "2"],
              ["3rd Year", "1"], ["3rd Year", "2"],
              ["4th Year", "1"], ["4th Year", "2"],
            ];

            // Group filteredSubjects
            const grouped = {};
            filteredSubjects.forEach(sub => {
              const key = `${sub.year_level || ""}|||${String(sub.semester ?? "")}`;
              if (!grouped[key]) grouped[key] = [];
              grouped[key].push(sub);
            });

            // Collect any extra keys not in ORDER (e.g. no year_level)
            const orderedKeys = ORDER.map(([y, s]) => `${y}|||${s}`);
            const extraKeys = Object.keys(grouped).filter(k => !orderedKeys.includes(k));
            const allKeys = [...orderedKeys, ...extraKeys].filter(k => grouped[k]?.length > 0);

            if (allKeys.length === 0) {
              return (
                <div style={{ padding: "40px", textAlign: "center", color: GRAY, fontSize: "13px" }}>
                  No subjects match the selected filters.
                </div>
              );
            }

            return (
              <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
                {allKeys.map((key, idx) => {
                  const [yearRaw, semRaw] = key.split("|||");
                  const subs = grouped[key];
                  const isLast = idx === allKeys.length - 1;

                  const isOpen = !!expandedSections[key];

                  return (
                    <div key={key} style={{ borderBottom: isLast ? "none" : `1px solid ${BORDER}` }}>
                      {/* Catalog section header — clickable to expand/collapse */}
                      <div
                        onClick={() => toggleSection(key)}
                        style={{
                          padding: "10px 20px",
                          background: isOpen ? `${DARK_GREEN}18` : `${DARK_GREEN}10`,
                          borderBottom: isOpen ? `2px solid ${DARK_GREEN}22` : "none",
                          display: "flex", alignItems: "center", gap: "10px",
                          cursor: "pointer", userSelect: "none",
                        }}
                      >
                        {/* Expand/collapse arrow */}
                        <span style={{
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                          width: "20px", height: "20px", borderRadius: "4px",
                          background: isOpen ? DARK_GREEN : `${DARK_GREEN}22`,
                          color: isOpen ? WHITE : DARK_GREEN,
                          fontSize: "10px", fontWeight: 900, flexShrink: 0,
                          transition: "all 0.15s",
                        }}>
                          {isOpen ? "▾" : "▸"}
                        </span>
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: "12px", fontWeight: 800, color: DARK_GREEN, letterSpacing: "0.08em" }}>
                            {yearLabel(yearRaw)}
                          </span>
                          <span style={{ fontSize: "12px", color: GRAY, fontWeight: 600, margin: "0 8px" }}>—</span>
                          <span style={{ fontSize: "12px", fontWeight: 700, color: GREEN, letterSpacing: "0.06em" }}>
                            {semLabel(semRaw)}
                          </span>
                        </div>
                        <span style={{ fontSize: "11px", color: GRAY, fontWeight: 500 }}>
                          {subs.length} subject{subs.length !== 1 ? "s" : ""}
                        </span>
                      </div>

                      {/* Subjects table — only shown when expanded */}
                      {isOpen && (
                        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                          <thead>
                            {/* Row 1 — group header */}
                            <tr style={{ background: LIGHT_GRAY, fontSize: "10px", color: GRAY, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                              <th rowSpan={2} style={{ padding: "8px 12px", border: `1px solid ${BORDER}`, whiteSpace: "nowrap", width: "1%", verticalAlign: "middle" }}>Course Code</th>
                              <th rowSpan={2} style={{ padding: "8px 12px", border: `1px solid ${BORDER}`, verticalAlign: "middle", textAlign: "center" }}>Course Title</th>
                              <th colSpan={2} style={{ padding: "6px 12px", border: `1px solid ${BORDER}`, textAlign: "center", whiteSpace: "nowrap" }}>No. of Hours per week</th>
                              <th rowSpan={2} style={{ padding: "8px 12px", border: `1px solid ${BORDER}`, textAlign: "center", whiteSpace: "nowrap", width: "1%", verticalAlign: "middle" }}>Credit Units</th>
                              <th rowSpan={2} style={{ padding: "8px 12px", border: `1px solid ${BORDER}`, whiteSpace: "nowrap", width: "10%", verticalAlign: "middle", textAlign: "center" }}>Pre-Requisite</th>
                              <th rowSpan={2} style={{ padding: "8px 12px", textAlign: "center", border: `1px solid ${BORDER}`, whiteSpace: "nowrap", width: "1%", verticalAlign: "middle" }}>Actions</th>
                            </tr>
                            {/* Row 2 — LEC / LAB sub-headers */}
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
                                <td style={{ padding: "10px 12px", textAlign: "center", whiteSpace: "nowrap" }}>
                                  <div style={{ display: "flex", justifyContent: "center", gap: "6px" }}>
                                    <button type="button"
                                      onClick={(e) => { e.stopPropagation(); setSubjectForm({ subject_code: sub.subject_code || "", subject_title: sub.subject_title || "", units: String(sub.units ?? "3"), lec_hours: String(sub.lec_hours ?? "3"), lab_hours: String(sub.lab_hours ?? "0"), pre_requisite: sub.pre_requisite || "None", course: sub.course || courses[0] || "", year_level: sub.year_level || "1st Year", semester: sub.semester != null ? String(sub.semester) : "1" }); setEditingSubjectId(sub.id); setShowSubjectModal(true); }}
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
                              <td style={{ padding: "9px 12px", fontSize: "13px", fontWeight: 800, color: DARK_GREEN, textAlign: "center" }}>
                                {subs.reduce((s, sub) => s + (parseInt(sub.lec_hours, 10) || 0), 0)}
                              </td>
                              <td style={{ padding: "9px 12px", fontSize: "13px", fontWeight: 800, color: DARK_GREEN, textAlign: "center" }}>
                                {subs.reduce((s, sub) => s + (parseInt(sub.lab_hours, 10) || 0), 0)}
                              </td>
                              <td style={{ padding: "9px 12px", fontSize: "13px", fontWeight: 800, color: DARK_GREEN, textAlign: "center" }}>
                                {subs.reduce((s, sub) => s + (parseInt(sub.units, 10) || 0), 0)}
                              </td>
                              <td colSpan={2} />
                            </tr>
                          </tfoot>
                        </table>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* ── STUDENT INFORMATION FORM ── */}
      {/* ── APPLICATION FORM (Free Higher Education) — inline below the tabs ── */}
      {activeTab === "manage_students" && transactionSubTab === "application_form" && (
        <ApplicationForm student={selectedEnrollStudent || {}} inline />
      )}

      {activeTab === "manage_students" && transactionSubTab === "student_info" && (
        <StudentInfoPanel courses={courses} API={import.meta.env.VITE_API_URL} onRefresh={fetchBaselineDirectory} activeSchoolYear={activeSchoolYear} />
      )}

      {/* ── STUDENT REGISTRATION TAB — split panel ── */}
      {activeTab === "manage_students" && transactionSubTab === "student_registration" && (
        <div style={{ display: "flex", gap: 0, border: `1px solid ${BORDER}`, borderRadius: "10px", overflow: "hidden", background: WHITE, minHeight: "560px" }}>

          {/* ── LEFT: Masterlist of Students ── */}
          <div style={{ width: "284px", flexShrink: 0, borderRight: `1px solid ${BORDER}`, display: "flex", flexDirection: "column" }}>
            {/* Header */}
            <div style={{ padding: "7px 10px", background: DARK_GREEN, color: WHITE, fontSize: "10px", fontWeight: 800, textAlign: "center", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Masterlist of Students
            </div>
            {/* Search bar */}
            <div style={{ padding: "5px 6px", borderBottom: `1px solid ${BORDER}`, background: WHITE }}>
              <input
                type="text"
                value={masterSearch}
                onChange={e => setMasterSearch(e.target.value)}
                placeholder="🔍 Search name, ID, or course…"
                style={{ width: "100%", padding: "4px 7px", fontSize: "9px", border: `1px solid ${BORDER}`, borderRadius: "5px", outline: "none", boxSizing: "border-box", background: "#FAFAFA" }}
              />
            </div>
            {/* Column header row */}
            <div style={{ display: "grid", gridTemplateColumns: "62px 1fr 32px 52px", background: "#ECFDF5", borderBottom: `1px solid ${BORDER}`, padding: "3px 5px" }}>
              {["ID #","Name of Student","Yr.","Program"].map((h, i) => (
                <span key={i} style={{ fontSize: "8px", fontWeight: 800, color: DARK_GREEN, textTransform: "uppercase", letterSpacing: "0.03em", textAlign: i === 2 ? "center" : "left" }}>{h}</span>
              ))}
            </div>
            {/* Student rows */}
            <div style={{ flex: 1, overflowY: "auto" }}>
              {(enrollMasterFilter === "block"
                ? students.filter(s => s.graduation_status !== "graduated" && selectedEnrollStudent && s.section && s.section === selectedEnrollStudent.section)
                : students.filter(s => s.graduation_status !== "graduated")
              ).filter(s => {
                if (!masterSearch.trim()) return true;
                const q = masterSearch.trim().toLowerCase();
                return (
                  (s.last_name  || "").toLowerCase().includes(q) ||
                  (s.first_name || "").toLowerCase().includes(q) ||
                  (s.middle_name|| "").toLowerCase().includes(q) ||
                  (s.student_number || "").toLowerCase().includes(q) ||
                  (s.course || "").toLowerCase().includes(q)
                );
              }).slice().sort((a, b) => {
                const ai = YEAR_LEVELS.indexOf(a.year_level), bi = YEAR_LEVELS.indexOf(b.year_level);
                const ar = ai === -1 ? 99 : ai, br = bi === -1 ? 99 : bi;
                if (ar !== br) return ar - br;
                return (a.last_name || "").localeCompare(b.last_name || "");
              }).map(s => {
                const sel = selectedEnrollStudent?.id === s.id;
                const shortCourse = (s.course || "")
                  .replace(/^(BACHELOR\s+OF\s+(SCIENCE|ARTS)\s+IN\s+|BACHELOR\s+IN\s+)/i, "")
                  .split(" ").slice(0, 2).join(" ");
                return (
                  <div key={s.id} onClick={() => selectEnrollStudent(s)}
                    style={{ display: "grid", gridTemplateColumns: "62px 1fr 32px 52px", padding: "3px 5px", fontSize: "9px", cursor: "pointer", borderBottom: `1px solid #F3F4F6`, background: sel ? "#eaf2d9" : "transparent", alignItems: "center" }}
                    onMouseEnter={e => { if (!sel) e.currentTarget.style.background = "#F3F4F6"; }}
                    onMouseLeave={e => { if (!sel) e.currentTarget.style.background = "transparent"; }}>
                    <span style={{ fontFamily: "monospace", color: BLUE, fontSize: "8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.student_number || "—"}</span>
                    <span style={{ fontWeight: sel ? 700 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.last_name}, {s.first_name}</span>
                    <span style={{ color: GRAY, textAlign: "center", fontSize: "8px" }}>{(s.year_level || "").replace(/(\d+).*/,"$1")}</span>
                    <span style={{ color: GREEN, fontWeight: 600, fontSize: "8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{shortCourse || "—"}</span>
                  </div>
                );
              })}
              {students.length === 0 && (
                <div style={{ padding: "20px 10px", textAlign: "center", color: GRAY, fontSize: "10px" }}>No students found.</div>
              )}
            </div>
          </div>

          {/* ── RIGHT: Student Registration form ── */}
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
            {/* Red header */}
            <div style={{ padding: "8px 14px", background: "#C62828", color: WHITE, fontSize: "12px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Student Registration
            </div>

            {!selectedEnrollStudent || !enrollRegForm ? (
              /* Placeholder when nothing is selected */
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "10px", color: GRAY, fontSize: "13px" }}>
                <span style={{ fontSize: "36px" }}>📋</span>
                <span>Select a student from the masterlist</span>
              </div>
            ) : (
              <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
                {/* ── FORM BODY ── */}
                <div style={{ flex: 1, overflowY: "auto", minWidth: 0 }}>

                  {/* Row 1 — Labels: ID NUMBER | NAME | SCHOOL YEAR | TERM */}
                  <div style={{ display: "grid", gridTemplateColumns: "160px 1fr 140px 80px", background: "#FFF8E1", borderBottom: `1px solid ${BORDER}`, padding: "3px 10px", alignItems: "center" }}>
                    <span style={{ fontSize: "9px", fontWeight: 700, textTransform: "uppercase", color: "#92400E" }}>ID Number</span>
                    <span style={{ fontSize: "9px", fontWeight: 700, textTransform: "uppercase", color: "#92400E" }}>Name (Family Name, First Name, Middle Name)</span>
                    <span style={{ fontSize: "9px", fontWeight: 700, textTransform: "uppercase", color: "#92400E", paddingLeft: "10px" }}>School Year</span>
                    <span style={{ fontSize: "9px", fontWeight: 700, textTransform: "uppercase", color: "#92400E", paddingLeft: "6px" }}>Term</span>
                  </div>

                  {/* Row 2 — Values: ID | Name | School Year | Term select */}
                  <div style={{ display: "grid", gridTemplateColumns: "160px 1fr 140px 80px", borderBottom: `1px solid ${BORDER}`, background: LIGHT_BLUE, alignItems: "center" }}>
                    <div style={{ padding: "5px 10px", borderRight: `1px solid ${BORDER}`, fontFamily: "monospace", fontSize: "12px", fontWeight: 700, color: BLUE }}>{enrollRegForm.id_number || "—"}</div>
                    <div style={{ padding: "5px 10px", borderRight: `1px solid ${BORDER}`, fontSize: "12px", fontWeight: 700, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {[enrollRegForm.last_name, enrollRegForm.first_name, enrollRegForm.middle_name].filter(Boolean).join(", ")}
                    </div>
                    <div style={{ padding: "5px 10px", borderRight: `1px solid ${BORDER}`, fontSize: "12px", fontWeight: 700, color: DARK_GREEN }}>{enrollRegForm.school_year || "—"}</div>
                    <div style={{ padding: "4px 6px" }}>
                      <select value={enrollRegForm.term} onChange={e => setEnrollRegForm(f => ({ ...f, term: e.target.value }))}
                        style={{ width: "100%", border: "none", borderBottom: `1px solid ${BORDER}`, fontSize: "12px", fontWeight: 700, outline: "none", background: "transparent", color: "#111827", cursor: "pointer" }}>
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="S">S</option>
                      </select>
                    </div>
                  </div>

                  {/* Row 3 — Date | Program | Year Level | GPA | Scholarship Status */}
                  <div style={{ display: "grid", gridTemplateColumns: "130px 1fr 120px 80px 140px", borderBottom: `1px solid ${BORDER}` }}>
                    <div style={{ padding: "6px 10px", borderRight: `1px solid ${BORDER}` }}>
                      <div style={{ fontSize: "9px", color: GRAY, fontWeight: 700, textTransform: "uppercase", marginBottom: "2px" }}>Date</div>
                      <div style={{ fontSize: "12px", fontWeight: 600 }}>{new Date().toLocaleDateString("en-PH", { month: "2-digit", day: "2-digit", year: "numeric" })}</div>
                    </div>
                    <div style={{ padding: "6px 10px", borderRight: `1px solid ${BORDER}` }}>
                      <div style={{ fontSize: "9px", color: GRAY, fontWeight: 700, textTransform: "uppercase", marginBottom: "2px" }}>Program</div>
                      <div style={{ fontSize: "12px", fontWeight: 700, color: DARK_GREEN, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{enrollRegForm.program || "—"}</div>
                    </div>
                    <div style={{ padding: "6px 10px", borderRight: `1px solid ${BORDER}` }}>
                      <div style={{ fontSize: "9px", color: GRAY, fontWeight: 700, textTransform: "uppercase", marginBottom: "2px" }}>Year Level</div>
                      <select value={enrollRegForm.year_level} onChange={e => setEnrollRegForm(f => ({ ...f, year_level: e.target.value }))}
                        style={{ border: "none", borderBottom: `1px solid ${BORDER}`, fontSize: "12px", fontWeight: 700, outline: "none", background: "transparent", color: enrollRegForm.year_level ? "#111827" : GRAY, cursor: "pointer", width: "100%" }}>
                        <option value="">— Select Year —</option>
                        {YEAR_LEVELS.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                    <div style={{ padding: "6px 10px", borderRight: `1px solid ${BORDER}` }}>
                      <div style={{ fontSize: "9px", color: GRAY, fontWeight: 700, textTransform: "uppercase", marginBottom: "2px" }}>GPA</div>
                      <input value={enrollRegForm.gpa} onChange={e => setEnrollRegForm(f => ({ ...f, gpa: e.target.value }))}
                        style={{ width: "100%", border: "none", borderBottom: `1px solid ${BORDER}`, fontSize: "12px", fontWeight: 700, outline: "none", background: "transparent", color: "#111827", boxSizing: "border-box" }} placeholder="—" />
                    </div>
                    <div style={{ padding: "6px 10px" }}>
                      <div style={{ fontSize: "9px", color: GRAY, fontWeight: 700, textTransform: "uppercase", marginBottom: "2px" }}>Scholarship Status</div>
                      <input value={enrollRegForm.scholarship} onChange={e => setEnrollRegForm(f => ({ ...f, scholarship: e.target.value }))}
                        style={{ width: "100%", border: "none", borderBottom: `1px solid ${BORDER}`, fontSize: "12px", fontWeight: 700, outline: "none", background: "transparent", color: "#111827", boxSizing: "border-box" }} placeholder="—" />
                    </div>
                  </div>

                  {/* Row 4 — Block Number | Gender | Enrolled Student | Maximum */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 160px 120px", borderBottom: `1px solid ${BORDER}` }}>
                    <div style={{ padding: "6px 10px", borderRight: `1px solid ${BORDER}` }}>
                      <div style={{ fontSize: "9px", color: GRAY, fontWeight: 700, textTransform: "uppercase", marginBottom: "2px" }}>Block Number</div>
                      <select value={enrollRegForm.block_number} onChange={e => setEnrollRegForm(f => ({ ...f, block_number: e.target.value }))}
                        style={{ width: "100%", border: "none", borderBottom: `1px solid ${BORDER}`, fontSize: "12px", fontWeight: 700, outline: "none", background: "transparent", color: "#111827", cursor: "pointer", boxSizing: "border-box" }}>
                        <option value="">— Select Block —</option>
                        {sections.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div style={{ padding: "6px 10px", borderRight: `1px solid ${BORDER}` }}>
                      <div style={{ fontSize: "9px", color: GRAY, fontWeight: 700, textTransform: "uppercase", marginBottom: "2px" }}>Gender</div>
                      <select value={enrollRegForm.gender} onChange={e => setEnrollRegForm(f => ({ ...f, gender: e.target.value }))}
                        style={{ width: "100%", border: "none", borderBottom: `1px solid ${BORDER}`, fontSize: "12px", fontWeight: 700, outline: "none", background: "transparent", color: "#111827", cursor: "pointer", boxSizing: "border-box" }}>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="LGBTQIA+">LGBTQIA+</option>
                      </select>
                    </div>
                    <div style={{ padding: "6px 10px", borderRight: `1px solid ${BORDER}` }}>
                      <div style={{ fontSize: "9px", color: GRAY, fontWeight: 700, textTransform: "uppercase", marginBottom: "2px" }}>Enrolled Student</div>
                      <div style={{
                        fontSize: "12px", fontWeight: 700, padding: "4px 0",
                        color: sectionCapacity.max_students !== null && sectionCapacity.count >= sectionCapacity.max_students ? RED : "#111827",
                      }}>
                        {sectionCapacity.count || "—"}
                      </div>
                    </div>
                    <div style={{ padding: "6px 10px" }}>
                      <div style={{ fontSize: "9px", color: GRAY, fontWeight: 700, textTransform: "uppercase", marginBottom: "2px" }}>Maximum</div>
                      <div style={{ fontSize: "12px", fontWeight: 700, padding: "4px 0", color: "#111827" }}>
                        {sectionCapacity.max_students !== null ? sectionCapacity.max_students : "—"}
                      </div>
                      {sectionCapacity.max_students !== null && sectionCapacity.count >= sectionCapacity.max_students && (
                        <div style={{ fontSize: "9px", color: RED, fontWeight: 700, marginTop: "1px" }}>⚠ LIMIT REACHED</div>
                      )}
                    </div>
                  </div>

                  {/* Subject load table — header */}
                  <div style={{ display: "grid", gridTemplateColumns: "100px 1fr 46px 150px 50px 80px 1fr", background: DARK_GREEN, color: WHITE }}>
                    {["Course Code","Descriptive Title","Unit","Time","Days","Room","Instructor"].map((h, i) => (
                      <div key={i} style={{ padding: "5px 7px", borderRight: i < 6 ? "1px solid rgba(255,255,255,0.2)" : "none", fontSize: "9px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em", textAlign: "center", fontFamily: TNR }}>{h}</div>
                    ))}
                  </div>

                  {/* Subject rows */}
                  {enrollClassLoading ? (
                    <div style={{ padding: "14px", textAlign: "center", color: GRAY, fontSize: "11px", fontFamily: TNR }}>Loading…</div>
                  ) : enrollRegSubjects.length === 0 ? (
                    <div style={{ padding: "14px", textAlign: "center", color: GRAY, fontSize: "11px", borderBottom: `1px solid ${BORDER}`, fontFamily: TNR }}>
                      {!enrollRegForm.block_number
                        ? "Select a Block Number to load the class schedule."
                        : `No schedule found for ${enrollRegForm.year_level} — ${enrollRegForm.term === "1" ? "1st" : "2nd"} Semester — ${enrollRegForm.block_number}`}
                    </div>
                  ) : (
                    enrollRegSubjects.map((row, idx) => (
                      <div key={row.id || idx} style={{ display: "grid", gridTemplateColumns: "100px 1fr 46px 150px 50px 80px 1fr", borderBottom: `1px solid #F3F4F6`, background: idx % 2 === 0 ? WHITE : LIGHT_GRAY, alignItems: "center" }}>
                        <div style={{ padding: "4px 7px", borderRight: `1px solid ${BORDER}`, fontSize: "11px", fontFamily: TNR, color: BLUE, fontWeight: 700, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.subject_code || "—"}</div>
                        <div style={{ padding: "4px 7px", borderRight: `1px solid ${BORDER}`, fontSize: "11px", fontFamily: TNR, color: "#111827", textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.subject_title || "—"}</div>
                        <div style={{ padding: "4px 7px", borderRight: `1px solid ${BORDER}`, fontSize: "11px", fontFamily: TNR, textAlign: "center", fontWeight: 700 }}>{row.units ?? "—"}</div>
                        <div style={{ padding: "4px 7px", borderRight: `1px solid ${BORDER}`, fontSize: "11px", fontFamily: TNR, color: GRAY, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.time || "—"}</div>
                        <div style={{ padding: "4px 7px", borderRight: `1px solid ${BORDER}`, fontSize: "11px", fontFamily: TNR, color: GRAY, textAlign: "center", overflow: "hidden", wordBreak: "break-word" }}>{formatDays(row.day) || "—"}</div>
                        <div style={{ padding: "4px 7px", borderRight: `1px solid ${BORDER}`, fontSize: "11px", fontFamily: TNR, color: GRAY, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.room || "—"}</div>
                        <div style={{ padding: "4px 7px", fontSize: "11px", fontFamily: TNR, color: GRAY, textAlign: "center", wordBreak: "break-word" }}>{row.faculty_name || "—"}</div>
                      </div>
                    ))
                  )}
                </div>

                {/* ── ACTION BUTTONS (right rail) ── */}
                <div style={{ width: "68px", flexShrink: 0, borderLeft: `1px solid ${BORDER}`, display: "flex", flexDirection: "column" }}>
                  {[
                    { label: "SAVE",  bg: "#3d6e01", fn: saveEnrollRegistration, disabled: enrollRegSaving },
                    { label: "PRINT", bg: "#E65100", fn: () => { setCorPrintOnly(true); setTimeout(() => { window.print(); window.addEventListener("afterprint", () => setCorPrintOnly(false), { once: true }); }, 200); }, disabled: false },
                    {
                      label: selectedEnrollStudent?.graduation_status === "graduated" ? "GRADUATED" : "GRADUATE",
                      bg: selectedEnrollStudent?.graduation_status === "graduated" ? "#6B7280" : "#1565C0",
                      disabled: markingGrad === selectedEnrollStudent?.id,
                      fn: async () => {
                        if (!selectedEnrollStudent) return;
                        const alreadyGrad = selectedEnrollStudent.graduation_status === "graduated";
                        if (!alreadyGrad && !window.confirm(`Mark ${selectedEnrollStudent.first_name} ${selectedEnrollStudent.last_name} as graduated?`)) return;
                        setMarkingGrad(selectedEnrollStudent.id);
                        try {
                          const res = await fetch(`${import.meta.env.VITE_API_URL}/api/erd/students/${selectedEnrollStudent.id}/graduate`, {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ graduation_status: alreadyGrad ? null : "graduated" }),
                          });
                          if (res.ok) {
                            await fetchBaselineDirectory();
                          }
                        } catch (_) {}
                        setMarkingGrad(null);
                      }
                    },
                  ].map(btn => (
                    <button key={btn.label} type="button" onClick={btn.fn} disabled={btn.disabled}
                      style={{ padding: "14px 0", border: "none", borderBottom: "1px solid rgba(255,255,255,0.15)", background: btn.disabled ? "#9CA3AF" : btn.bg, color: WHITE, fontSize: "10px", fontWeight: 800, cursor: btn.disabled ? "not-allowed" : "pointer", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      {btn.label === "SAVE" && enrollRegSaving ? "…" : btn.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CLASS ASSIGNMENT TAB ── */}

      {/* ── CERTIFICATE OF REGISTRATION (full-screen portal, same as AddStudents) ── */}
      {activeTab === "manage_students" && corPrintOnly && (() => {
        const s     = selectedEnrollStudent;
        const rf    = enrollRegForm;
        const sched = enrollClassSchedule;
        const today = new Date().toLocaleDateString("en-PH", { month: "2-digit", day: "2-digit", year: "numeric" });

        const BLANK_ROWS = 10;
        const rows = [...(sched || [])];
        while (rows.length < BLANK_ROWS) rows.push(null);

        const C = { border: "1px solid #444", padding: "1px 3px", fontSize: "7pt", fontFamily: TNR, textAlign: "center", verticalAlign: "middle", lineHeight: "1.05" };
        const H = { ...C, fontWeight: 700, background: "#e8e8e8", fontSize: "6.5pt", padding: "1px 3px", WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" };

        const OneCopy = ({ label }) => (
          <div style={{ fontFamily: TNR, padding: "4px 14px 4px 14px", position: "relative" }}>
            {/* Watermark */}
            <img src={ccaLogo} alt="" style={{
              position: "absolute", top: "50%", left: "50%",
              transform: "translate(-50%, -50%)",
              width: "500px", height: "500px", objectFit: "contain",
              opacity: 0.1, pointerEvents: "none", zIndex: 0,
              WebkitPrintColorAdjust: "exact", printColorAdjust: "exact",
            }} />
            {/* School header — logos left, text truly centered via grid */}
            <div style={{ display: "grid", gridTemplateColumns: "160px 1fr 160px", alignItems: "center", marginBottom: "2px" }}>
              <div style={{ display: "flex", alignItems: "center" }}>
                <img src={alangalangLogo} alt="Alangalang" style={{ width: "70px", height: "70px", objectFit: "contain" }} />
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "8pt", fontFamily: TNR }}>Republic of the Philippines</div>
                <div style={{ fontSize: "14pt", fontWeight: 900, fontFamily: TNR, textTransform: "uppercase", letterSpacing: "0.5px", lineHeight: 1.1, whiteSpace: "nowrap" }}>Community College of Alangalang</div>
                <div style={{ fontSize: "8pt", fontFamily: TNR }}>Alangalang, Leyte</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "center" }}>
                <img src={ccaLogo} alt="CCA" style={{ width: "75px", height: "75px", objectFit: "contain" }} />
                <div style={{ fontSize: "6.5pt", color: "#555", fontStyle: "italic", marginTop: "1px" }}>{label}</div>
              </div>
            </div>

            {/* Title bar */}
            <div style={{ background: DARK_GREEN, color: WHITE, textAlign: "center", padding: "3px 0", fontSize: "10pt", fontWeight: 900, fontFamily: TNR, letterSpacing: "2px", marginBottom: "3px", textTransform: "uppercase", WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>
              — Certificate of Registration —
            </div>

            {/* Student info */}
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "2px", tableLayout: "fixed" }}>
              <colgroup>
                <col style={{ width: "13%" }} /><col style={{ width: "14%" }} /><col style={{ width: "14%" }} />
                <col style={{ width: "14%" }} /><col style={{ width: "7%" }} /><col style={{ width: "12%" }} />
                <col style={{ width: "8%" }} /><col style={{ width: "18%" }} />
              </colgroup>
              <thead><tr>
                <th style={H}>STUDENT ID NO</th><th style={H}>LAST NAME</th><th style={H}>FIRST NAME</th>
                <th style={H}>MIDDLE NAME</th><th style={H}>GENDER</th><th style={H}>SCHOOL YEAR</th>
                <th style={H}>TERM</th><th style={H}>YEAR LEVEL</th>
              </tr></thead>
              <tbody><tr>
                <td style={C}>{s?.student_number || "—"}</td><td style={C}>{s?.last_name || "—"}</td>
                <td style={C}>{s?.first_name || "—"}</td><td style={C}>{s?.middle_name || "—"}</td>
                <td style={C}>{s?.gender || "—"}</td><td style={C}>{rf?.school_year || "—"}</td>
                <td style={C}>{rf?.term || "—"}</td><td style={C}>{rf?.year_level || s?.year_level || "—"}</td>
              </tr></tbody>
            </table>

            {/* Date + Program */}
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "2px", tableLayout: "fixed" }}>
              <colgroup><col style={{ width: "18%" }} /><col /></colgroup>
              <thead><tr><th style={H}>DATE OF REGISTRATION</th><th style={H}>PROGRAM</th></tr></thead>
              <tbody><tr><td style={C}>{today}</td><td style={C}>{rf?.program || s?.course || "—"}</td></tr></tbody>
            </table>

            {/* Subject table */}
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "4px", tableLayout: "fixed" }}>
              <colgroup>
                <col style={{ width: "8%" }} /><col style={{ width: "5%" }} /><col />
                <col style={{ width: "13%" }} /><col style={{ width: "6%" }} />
                <col style={{ width: "13%" }} /><col style={{ width: "7%" }} /><col style={{ width: "8%" }} />
              </colgroup>
              <thead><tr>
                <th style={{ ...H, textAlign: "left" }}>Course Code</th><th style={H}>Units</th><th style={H}>Descriptive Title</th>
                <th style={H}>Time</th><th style={H}>Days</th><th style={H}>Instructor</th><th style={H}>Room</th><th style={H}>Remarks</th>
              </tr></thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} style={{ height: "14px" }}>
                    <td style={{ ...C, textAlign: "left", color: row ? "#111" : "transparent", fontWeight: 700, overflow: "hidden" }}>{row?.subject_code || "."}</td>
                    <td style={{ ...C, color: row ? "#111" : "transparent" }}>{row?.units ?? "."}</td>
                    <td style={{ ...C, textAlign: "left", color: row ? "#111" : "transparent", overflow: "hidden" }}>{row?.subject_title || "."}</td>
                    <td style={{ ...C, color: row ? "#111" : "transparent", overflow: "hidden" }}>{row?.time || "."}</td>
                    <td style={{ ...C, color: row ? "#111" : "transparent", overflow: "hidden", wordBreak: "break-word" }}>{row ? (formatDays(row.day) || "") : "."}</td>
                    <td style={{ ...C, color: row ? "#111" : "transparent", overflow: "hidden" }}>{row?.faculty_name || "."}</td>
                    <td style={{ ...C, color: row ? "#111" : "transparent" }}>{row?.room || "."}</td>
                    <td style={{ ...C, color: row ? "#111" : "transparent" }}>{row ? "" : "."}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Registrar Signature */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "4px" }}>
              <div style={{ textAlign: "center", minWidth: "180px" }}>
                <div style={{ borderBottom: "1px solid #333", marginBottom: "2px", height: "32px", display: "flex", alignItems: "flex-end", justifyContent: "center", fontWeight: 800, fontSize: "9pt", fontFamily: TNR, textTransform: "uppercase" }}>{registrarSignName}</div>
                <div style={{ fontSize: "6.5pt", fontFamily: TNR }}>College Registrar's Signature</div>
              </div>
            </div>

            {/* Pledge */}
            <div style={{ marginBottom: "4px" }}>
              <div style={{ fontSize: "7pt", fontWeight: 700, fontFamily: TNR, marginBottom: "1px", color: "#111" }}>Student's Pledge</div>
              <div style={{ fontSize: "6.5pt", fontFamily: TNR, lineHeight: "1.3", textAlign: "justify", color: "#111" }}>
                I hereby acknowledge that I have read and understood the Rules and Regulations of the Community College of Alangalang. I promise to abide by and uphold all the rules, regulations, policies, and guidelines promulgated and enacted by the College.
                I understand that compliance with these rules is essential to maintaining discipline, academic integrity, and a safe and respectful learning environment. I accept full responsibility for my actions and understand that any violation of these rules and regulations may result in appropriate disciplinary action in accordance with the policies of the College.
              </div>
            </div>

            {/* 2 Signature lines */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "60px" }}>
              {["Student's Signature", "Date"].map((lbl, i) => (
                <div key={i} style={{ textAlign: "center" }}>
                  <div style={{ borderBottom: "1px solid #333", marginBottom: "2px", height: "22px" }} />
                  <div style={{ fontSize: "6.5pt", fontFamily: TNR }}>{lbl}</div>
                </div>
              ))}
            </div>
          </div>
        );

        return createPortal(
          <div style={{ position: "fixed", inset: 0, background: corPrintOnly ? "transparent" : WHITE, zIndex: 2147483646, overflow: corPrintOnly ? "hidden" : "auto", visibility: corPrintOnly ? "hidden" : "visible" }}>
            {/* Print CSS — no position:fixed needed; portal is already at body root */}
            <style>{`
              @media print {
                @page { size: 8.5in 13in portrait; margin: 0.3in 0.35in; }
                body * { visibility: hidden !important; }
                #cor-printable, #cor-printable * {
                  visibility: visible !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                  color-adjust: exact !important;
                }
                #cor-printable {
                  min-height: calc(13in - 0.6in);
                  display: block !important;
                }
                .no-print { display: none !important; }
              }
              #cor-printable * {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            `}</style>

            {/* Action bar */}
            <div className="no-print" style={{ display: "flex", gap: "8px", padding: "10px 16px", alignItems: "center", borderBottom: `1px solid ${BORDER}`, background: WHITE }}>
              {s ? (
                <span style={{ fontSize: "12px", color: DARK_GREEN, fontWeight: 700 }}>
                  {s.last_name}, {s.first_name} {s.middle_name || ""} — {rf?.block_number || s.section || "—"}
                </span>
              ) : (
                <span style={{ fontSize: "12px", color: GRAY }}>No student selected.</span>
              )}
              <div style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
                <button type="button" onClick={() => setTransactionSubTab("student_registration")}
                  style={{ padding: "7px 16px", background: WHITE, border: `1px solid ${BORDER}`, borderRadius: "6px", fontSize: "12px", cursor: "pointer" }}>
                  ← Back
                </button>
                <button type="button" onClick={() => window.print()}
                  style={{ padding: "7px 20px", background: DARK_GREEN, color: WHITE, border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>
                  🖨 Print (Folio)
                </button>
              </div>
            </div>

            {/* Certificate — 2 copies, centered vertically + horizontally */}
            <div id="cor-printable" style={{ background: WHITE, minHeight: "calc(100vh - 53px)", display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div>
                <OneCopy label="Student's Copy" />
                <div style={{ borderTop: "2px dashed #999", margin: "16px 14px 16px 14px" }} />
                <OneCopy label="School's Copy" />
              </div>
            </div>
          </div>,
          document.body
        );
      })()}


      {/* ── ENROLLMENT LIST ── */}
      {activeTab === "reports" && reportsSubTab === "enrollment_list" && (() => {
        // Build rows by joining enrollments with student data
        const rows = allEnrollments.map(e => {
          const stu = students.find(s => s.id === e.student_id);
          return { ...e, student: stu };
        });

        // Unique option lists derived from student data
        const schoolYears = [...new Set(allEnrollments.map(e => `${e.year_enrolled}-${parseInt(e.year_enrolled)+1}`))].sort().reverse();
        // Municipalities come from the full student list (not just enrolled students),
        // de-duplicated case-insensitively so "Alangalang" and "ALANGALANG" are one option.
        const _norm = (v) => String(v || "").trim().toLowerCase();
        const municipalities = [...new Map(
          students.map(s => s.municipality).filter(Boolean).map(m => [_norm(m), m.trim()])
        ).values()].sort();
        const barangays = [...new Map(
          rows
            .filter(r => !enrListFilter.municipality || _norm(r.student?.municipality) === _norm(enrListFilter.municipality))
            .map(r => r.student?.barangay)
            .filter(Boolean)
            .map(b => [_norm(b), b.trim()])
        ).values()].sort();
        const programs = [...new Map(rows.map(r => r.student?.course).filter(Boolean).map(c => [_norm(c), c.trim()])).values()].sort();
        const sections = [...new Map(
          rows
            .filter(r => !enrListFilter.program || _norm(r.student?.course) === _norm(enrListFilter.program))
            .map(r => r.student?.section)
            .filter(Boolean)
            .map(sec => [_norm(sec), sec.trim()])
        ).values()].sort();

        // Apply filters
        const filtered = rows.filter(r => {
          const sy = `${r.year_enrolled}-${parseInt(r.year_enrolled)+1}`;
          if (enrListFilter.school_year && sy !== enrListFilter.school_year) return false;
          if (enrListFilter.sex && (r.student?.gender || "").toLowerCase() !== enrListFilter.sex.toLowerCase()) return false;
          if (enrListFilter.municipality && _norm(r.student?.municipality) !== _norm(enrListFilter.municipality)) return false;
          if (enrListFilter.barangay && _norm(r.student?.barangay) !== _norm(enrListFilter.barangay)) return false;
          if (enrListFilter.program && _norm(r.student?.course) !== _norm(enrListFilter.program)) return false;
          if (enrListFilter.section && _norm(r.student?.section) !== _norm(enrListFilter.section)) return false;
          return true;
        });

        const selStyle = { padding: "5px 10px", border: `1px solid ${BORDER}`, borderRadius: "6px", fontSize: "11px", background: WHITE, cursor: "pointer" };

        return (
          <div style={{ marginTop: "12px" }}>
            {/* Filter bar */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "12px", alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontSize: "13px", fontWeight: 800, color: DARK_GREEN, marginRight: "4px" }}>Enrollment List</span>

              {/* School Year */}
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <label style={{ fontSize: "9px", fontWeight: 700, color: GRAY, textTransform: "uppercase", letterSpacing: "0.05em" }}>School Year</label>
                <select value={enrListFilter.school_year} onChange={e => setEnrListFilter(f => ({ ...f, school_year: e.target.value }))} style={selStyle}>
                  <option value="">All</option>
                  {schoolYears.map(sy => <option key={sy} value={sy}>{sy}</option>)}
                </select>
              </div>

              {/* Sex */}
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <label style={{ fontSize: "9px", fontWeight: 700, color: GRAY, textTransform: "uppercase", letterSpacing: "0.05em" }}>Sex</label>
                <select value={enrListFilter.sex} onChange={e => setEnrListFilter(f => ({ ...f, sex: e.target.value }))} style={selStyle}>
                  <option value="">All</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="LGBTQIA+">LGBTQIA+</option>
                </select>
              </div>

              {/* Municipality */}
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <label style={{ fontSize: "9px", fontWeight: 700, color: GRAY, textTransform: "uppercase", letterSpacing: "0.05em" }}>Municipality</label>
                <select value={enrListFilter.municipality} onChange={e => setEnrListFilter(f => ({ ...f, municipality: e.target.value, barangay: "" }))} style={selStyle}>
                  <option value="">All</option>
                  {municipalities.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              {/* Barangay */}
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <label style={{ fontSize: "9px", fontWeight: 700, color: GRAY, textTransform: "uppercase", letterSpacing: "0.05em" }}>Barangay</label>
                <select value={enrListFilter.barangay} onChange={e => setEnrListFilter(f => ({ ...f, barangay: e.target.value }))} style={selStyle}>
                  <option value="">All</option>
                  {barangays.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>

              {/* Program */}
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <label style={{ fontSize: "9px", fontWeight: 700, color: GRAY, textTransform: "uppercase", letterSpacing: "0.05em" }}>Program</label>
                <select value={enrListFilter.program} onChange={e => setEnrListFilter(f => ({ ...f, program: e.target.value, section: "" }))} style={selStyle}>
                  <option value="">All</option>
                  {programs.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              {/* Block / Section */}
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <label style={{ fontSize: "9px", fontWeight: 700, color: GRAY, textTransform: "uppercase", letterSpacing: "0.05em" }}>Block / Section</label>
                <select value={enrListFilter.section} onChange={e => setEnrListFilter(f => ({ ...f, section: e.target.value }))} style={selStyle}>
                  <option value="">All</option>
                  {sections.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* Clear filters */}
              {(enrListFilter.school_year || enrListFilter.sex || enrListFilter.municipality || enrListFilter.barangay || enrListFilter.program || enrListFilter.section) && (
                <button type="button" onClick={() => setEnrListFilter({ school_year: "", sex: "", municipality: "", barangay: "", program: "", section: "" })}
                  style={{ padding: "5px 10px", border: `1px solid ${BORDER}`, borderRadius: "6px", fontSize: "11px", background: WHITE, cursor: "pointer", color: "#EF4444", marginTop: "10px" }}>
                  Clear
                </button>
              )}

              <span style={{ fontSize: "11px", color: GRAY, marginLeft: "auto", marginTop: "10px" }}>{filtered.length} record(s)</span>
              <button type="button" onClick={() => setEnrPrintOpen(true)} disabled={filtered.length === 0}
                style={{ padding: "6px 14px", border: "none", borderRadius: "6px", fontSize: "11px", fontWeight: 700, background: filtered.length === 0 ? "#9CA3AF" : DARK_GREEN, color: WHITE, cursor: filtered.length === 0 ? "default" : "pointer", marginTop: "10px" }}>
                🖨 Print
              </button>
            </div>

            {/* Table */}
            <div style={{ border: `1px solid ${BORDER}`, borderRadius: "8px", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                <thead>
                  <tr style={{ background: DARK_GREEN, color: WHITE }}>
                    {["Student ID#", "Last Name", "First Name", "Middle Name", "Sex", "Program"].map(h => (
                      <th key={h} style={{ padding: "9px 12px", textAlign: "left", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {!enrListLoaded ? (
                    <tr><td colSpan={6} style={{ padding: "24px", textAlign: "center", color: GRAY }}>Loading…</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={6} style={{ padding: "24px", textAlign: "center", color: GRAY }}>No records found.</td></tr>
                  ) : filtered.map((r, i) => (
                    <tr key={`${r.id}-${i}`} style={{ background: i % 2 === 0 ? WHITE : "#f9f9f6", borderBottom: `1px solid ${BORDER}` }}>
                      <td style={{ padding: "7px 12px", fontFamily: "monospace", color: DARK_GREEN, whiteSpace: "nowrap" }}>{r.student?.student_number || "—"}</td>
                      <td style={{ padding: "7px 12px", fontWeight: 600 }}>{r.student?.last_name || "—"}</td>
                      <td style={{ padding: "7px 12px" }}>{r.student?.first_name || "—"}</td>
                      <td style={{ padding: "7px 12px", color: GRAY }}>{r.student?.middle_name || "—"}</td>
                      <td style={{ padding: "7px 12px" }}>{r.student?.gender || "—"}</td>
                      <td style={{ padding: "7px 12px", color: GRAY }}>{r.student?.course || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── ENROLLMENT LIST PRINT PORTAL (8.5×13) ── */}
            {enrPrintOpen && createPortal(
              (() => {
                const activeFilters = [
                  enrListFilter.school_year && `School Year: ${enrListFilter.school_year}`,
                  enrListFilter.program && `Program: ${enrListFilter.program}`,
                  enrListFilter.section && `Block/Section: ${enrListFilter.section}`,
                  enrListFilter.sex && `Sex: ${enrListFilter.sex}`,
                  enrListFilter.municipality && `Municipality: ${enrListFilter.municipality}`,
                  enrListFilter.barangay && `Barangay: ${enrListFilter.barangay}`,
                ].filter(Boolean);
                const TD = { border: "1px solid #000", padding: "3px 7px", fontSize: "9pt", fontFamily: '"Times New Roman",Times,serif', verticalAlign: "middle" };
                const TH = { ...TD, background: "#3d6e01", color: "#fff", fontWeight: 700, fontSize: "8pt", textTransform: "uppercase", letterSpacing: "0.3px", textAlign: "left" };
                return (
                  <div id="enr-portal-root" style={{ position: "fixed", inset: 0, background: WHITE, zIndex: 2147483646, display: "flex", flexDirection: "column" }}>
                    <div className="no-print" style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: DARK_GREEN, flexShrink: 0 }}>
                      <span style={{ fontWeight: 800, fontSize: 13, color: WHITE }}>Enrollment List — {filtered.length} record(s)</span>
                      <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                        <button type="button" onClick={() => setEnrPrintOpen(false)} style={{ padding: "7px 16px", background: "rgba(255,255,255,0.15)", border: "1.5px solid rgba(255,255,255,0.4)", borderRadius: 6, fontSize: 12, fontWeight: 600, color: WHITE, cursor: "pointer" }}>← Back</button>
                        <button type="button" onClick={() => window.print()} style={{ padding: "7px 20px", background: WHITE, color: DARK_GREEN, border: "none", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>🖨 Print </button>
                      </div>
                    </div>

                    <div id="enr-scroll" style={{ flex: 1, overflowY: "auto", background: "#e5e7eb", padding: "24px 16px" }}>
                      <style>{`
                        @media print {
                          @page { size: 8.5in 13in portrait; margin: 0.35in; }
                          html, body { background: #fff !important; height: auto !important; margin: 0 !important; padding: 0 !important; }
                          body > * { display: none !important; }
                          body > #enr-portal-root { display: block !important; position: static !important; height: auto !important; overflow: visible !important; }
                          #enr-portal-root .no-print { display: none !important; }
                          #enr-scroll { position: static !important; overflow: visible !important; height: auto !important; background: #fff !important; padding: 0 !important; }
                          #enr-print-area { position: static !important; width: 100% !important; min-height: 0 !important; box-shadow: none !important; margin: 0 !important; padding: 0 !important; }
                          #enr-print-area, #enr-print-area * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                          #enr-print-area table { page-break-inside: auto; }
                          #enr-print-area thead { display: table-header-group !important; }
                          #enr-print-area tr { page-break-inside: avoid !important; }
                        }
                      `}</style>

                      <div id="enr-print-area" style={{ width: "816px", minHeight: "1181px", margin: "0 auto", background: WHITE, padding: "24px 40px", boxSizing: "border-box", fontFamily: '"Times New Roman",Times,serif', color: "#000", boxShadow: "0 4px 24px rgba(0,0,0,0.18)" }}>

                        {/* HEADER — logos on both sides, centered institution block */}
                        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "4px", tableLayout: "fixed" }}>
                          <tbody><tr>
                            <td style={{ width: "110px", verticalAlign: "middle", textAlign: "center" }}>
                              <img src={alangalangLogo} alt="" style={{ width: 84, height: 84, objectFit: "contain" }} />
                            </td>
                            <td style={{ textAlign: "center", verticalAlign: "middle", userSelect: "none", pointerEvents: "none", fontFamily: '"Times New Roman",Times,serif' }}>
                              <div style={{ fontSize: "12.5pt", lineHeight: 1.2 }}>Republic of the Philippines</div>
                              <div style={{ fontSize: "16pt", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.5px", lineHeight: 1.15 }}>Community College of Alangalang</div>
                              <div style={{ fontSize: "12.5pt", lineHeight: 1.2 }}>Alangalang, Leyte</div>
                            </td>
                            <td style={{ width: "110px", verticalAlign: "middle", textAlign: "center" }}>
                              <img src={ccaLogo} alt="" style={{ width: 84, height: 84, objectFit: "contain" }} />
                            </td>
                          </tr></tbody>
                        </table>

                        {/* Document title */}
                        <div style={{ textAlign: "center", fontSize: "15pt", fontWeight: 900, letterSpacing: "2px", textTransform: "uppercase", fontFamily: '"Times New Roman",Times,serif', margin: "4px 0 2px" }}>Official Enrollment List</div>

                        {/* Thick divider */}
                        <div style={{ borderTop: "2.5px solid #000", borderBottom: "1px solid #000", height: "3px", marginBottom: "6px", marginTop: "2px" }} />

                        {/* Filter summary */}
                        {activeFilters.length > 0 && (
                          <div style={{ fontSize: "9pt", fontFamily: '"Times New Roman",Times,serif', marginBottom: "6px", textAlign: "center" }}>
                            {activeFilters.join("  •  ")}
                          </div>
                        )}

                        {/* Enrollment table */}
                        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "2px" }}>
                          <thead>
                            <tr>
                              <th style={{ ...TH, width: "34px", textAlign: "center" }}>No.</th>
                              <th style={{ ...TH, width: "120px" }}>Student ID#</th>
                              <th style={TH}>Last Name</th>
                              <th style={TH}>First Name</th>
                              <th style={TH}>Middle Name</th>
                              <th style={{ ...TH, width: "44px", textAlign: "center" }}>Sex</th>
                              <th style={TH}>Program</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filtered.map((r, i) => (
                              <tr key={`p-${r.id}-${i}`}>
                                <td style={{ ...TD, textAlign: "center" }}>{i + 1}</td>
                                <td style={TD}>{r.student?.student_number || ""}</td>
                                <td style={{ ...TD, fontWeight: 600, textTransform: "uppercase" }}>{r.student?.last_name || ""}</td>
                                <td style={{ ...TD, textTransform: "uppercase" }}>{r.student?.first_name || ""}</td>
                                <td style={{ ...TD, textTransform: "uppercase" }}>{r.student?.middle_name || ""}</td>
                                <td style={{ ...TD, textAlign: "center" }}>{(r.student?.gender || "").charAt(0).toUpperCase()}</td>
                                <td style={TD}>{r.student?.course || ""}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        <div style={{ fontSize: "8pt", fontStyle: "italic", marginTop: "8px", display: "flex", justifyContent: "space-between", fontFamily: '"Times New Roman",Times,serif' }}>
                          <span>Total: {filtered.length} enrolled student(s)</span>
                          <span>Date Printed: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })(),
              document.body
            )}
          </div>
        );
      })()}

      {/* ── GRADUATE STUDENTS ── */}
      {activeTab === "reports" && reportsSubTab === "graduate_students" && (() => {
        const allGrads = students.filter(s => s.graduation_status === "graduated");
        // Build a set of school years from enrollments for graduated students
        const gradIds = new Set(allGrads.map(s => s.id));
        const schoolYears = [...new Set(
          allEnrollments.filter(e => gradIds.has(e.student_id)).map(e => `${e.year_enrolled}-${parseInt(e.year_enrolled)+1}`)
        )].sort().reverse();
        // For school_year filter: keep only grads who have an enrollment in that SY
        const gradIdsInSY = gradFilter.school_year.trim()
          ? new Set(allEnrollments.filter(e => `${e.year_enrolled}-${parseInt(e.year_enrolled)+1}`.includes(gradFilter.school_year.trim()) && gradIds.has(e.student_id)).map(e => e.student_id))
          : null;
        const municipalities = [...new Set(allGrads.map(s => s.municipality).filter(Boolean))].sort();
        const barangays = [...new Set(
          allGrads.filter(s => !gradFilter.municipality || s.municipality === gradFilter.municipality).map(s => s.barangay).filter(Boolean)
        )].sort();
        const programs = [...new Set(allGrads.map(s => s.course).filter(Boolean))].sort();
        const sections = [...new Set(
          allGrads.filter(s => !gradFilter.program || s.course === gradFilter.program).map(s => s.section).filter(Boolean)
        )].sort();
        const filtered = allGrads.filter(s => {
          if (gradIdsInSY && !gradIdsInSY.has(s.id)) return false;
          if (gradFilter.sex && (s.gender || "").toLowerCase() !== gradFilter.sex.toLowerCase()) return false;
          if (gradFilter.municipality && s.municipality !== gradFilter.municipality) return false;
          if (gradFilter.barangay && s.barangay !== gradFilter.barangay) return false;
          if (gradFilter.program && s.course !== gradFilter.program) return false;
          if (gradFilter.section && s.section !== gradFilter.section) return false;
          return true;
        });
        const selStyle = { padding: "5px 10px", border: `1px solid ${BORDER}`, borderRadius: "6px", fontSize: "11px", background: WHITE, cursor: "pointer" };
        const anyFilter = gradFilter.school_year || gradFilter.sex || gradFilter.municipality || gradFilter.barangay || gradFilter.program || gradFilter.section;
        return (
          <div style={{ marginTop: "12px" }}>
            {/* Filter bar */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "12px", alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontSize: "13px", fontWeight: 800, color: DARK_GREEN, marginRight: "4px" }}>Graduate Students</span>

              {/* School Year */}
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <label style={{ fontSize: "9px", fontWeight: 700, color: GRAY, textTransform: "uppercase", letterSpacing: "0.05em" }}>School Year</label>
                <input
                  type="text"
                  value={gradFilter.school_year}
                  onChange={e => setGradFilter(f => ({ ...f, school_year: e.target.value }))}
                  placeholder="e.g. 2028-2029"
                  style={{ ...selStyle, width: "130px", outline: "none" }}
                />
              </div>

              {/* Sex */}
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <label style={{ fontSize: "9px", fontWeight: 700, color: GRAY, textTransform: "uppercase", letterSpacing: "0.05em" }}>Sex</label>
                <select value={gradFilter.sex} onChange={e => setGradFilter(f => ({ ...f, sex: e.target.value }))} style={selStyle}>
                  <option value="">All</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="LGBTQIA+">LGBTQIA+</option>
                </select>
              </div>

              {/* Municipality */}
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <label style={{ fontSize: "9px", fontWeight: 700, color: GRAY, textTransform: "uppercase", letterSpacing: "0.05em" }}>Municipality</label>
                <select value={gradFilter.municipality} onChange={e => setGradFilter(f => ({ ...f, municipality: e.target.value, barangay: "" }))} style={selStyle}>
                  <option value="">All</option>
                  {municipalities.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              {/* Barangay */}
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <label style={{ fontSize: "9px", fontWeight: 700, color: GRAY, textTransform: "uppercase", letterSpacing: "0.05em" }}>Barangay</label>
                <select value={gradFilter.barangay} onChange={e => setGradFilter(f => ({ ...f, barangay: e.target.value }))} style={selStyle}>
                  <option value="">All</option>
                  {barangays.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>

              {/* Program */}
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <label style={{ fontSize: "9px", fontWeight: 700, color: GRAY, textTransform: "uppercase", letterSpacing: "0.05em" }}>Program</label>
                <select value={gradFilter.program} onChange={e => setGradFilter(f => ({ ...f, program: e.target.value, section: "" }))} style={selStyle}>
                  <option value="">All</option>
                  {programs.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              {/* Block / Section */}
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <label style={{ fontSize: "9px", fontWeight: 700, color: GRAY, textTransform: "uppercase", letterSpacing: "0.05em" }}>Block / Section</label>
                <select value={gradFilter.section} onChange={e => setGradFilter(f => ({ ...f, section: e.target.value }))} style={selStyle}>
                  <option value="">All</option>
                  {sections.map(sec => <option key={sec} value={sec}>{sec}</option>)}
                </select>
              </div>

              {anyFilter && (
                <button type="button" onClick={() => setGradFilter({ school_year: "", sex: "", municipality: "", barangay: "", program: "", section: "" })}
                  style={{ padding: "5px 10px", border: `1px solid ${BORDER}`, borderRadius: "6px", fontSize: "11px", background: WHITE, cursor: "pointer", color: "#EF4444", marginTop: "10px" }}>
                  Clear
                </button>
              )}
              <span style={{ fontSize: "11px", color: GRAY, marginLeft: "auto", marginTop: "10px" }}>{filtered.length} student(s)</span>
              <button type="button" onClick={() => setGradPrintOpen(true)} disabled={filtered.length === 0}
                style={{ padding: "6px 14px", border: "none", borderRadius: "6px", fontSize: "11px", fontWeight: 700, background: filtered.length === 0 ? "#9CA3AF" : DARK_GREEN, color: WHITE, cursor: filtered.length === 0 ? "default" : "pointer", marginTop: "10px" }}>
                🖨 Print 
              </button>
            </div>

            {/* Table */}
            <div style={{ border: `1px solid ${BORDER}`, borderRadius: "8px", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                <thead>
                  <tr style={{ background: DARK_GREEN, color: WHITE }}>
                    {["ID Number", "Name", "Program", "Year Level", "Section", "Actions"].map(h => (
                      <th key={h} style={{ padding: "9px 12px", textAlign: h === "Actions" ? "center" : "left", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={6} style={{ padding: "24px", textAlign: "center", color: GRAY }}>No graduate students yet. Mark students as graduated from the Student Registration tab.</td></tr>
                  ) : filtered.map((s, i) => (
                    <tr key={s.id} style={{ background: i % 2 === 0 ? WHITE : "#f9f9f6", borderBottom: `1px solid ${BORDER}` }}>
                      <td style={{ padding: "7px 12px", fontFamily: "monospace", color: DARK_GREEN, whiteSpace: "nowrap" }}>{s.student_number || "—"}</td>
                      <td style={{ padding: "7px 12px", fontWeight: 600, whiteSpace: "nowrap" }}>{s.last_name}, {s.first_name} {s.middle_name || ""}</td>
                      <td style={{ padding: "7px 12px", color: GRAY, fontSize: "11px" }}>{s.course || "—"}</td>
                      <td style={{ padding: "7px 12px" }}>{s.year_level || "—"}</td>
                      <td style={{ padding: "7px 12px" }}>{s.section || "—"}</td>
                      <td style={{ padding: "7px 10px", textAlign: "center", whiteSpace: "nowrap" }}>
                        {/* View Credentials */}
                        <button type="button" title="View Credentials" onClick={() => setGradViewStudent(s)}
                          style={{ padding: "4px 8px", border: `1px solid ${DARK_GREEN}`, borderRadius: "5px", background: "#eaf2d9", color: DARK_GREEN, cursor: "pointer", fontSize: "13px", marginRight: "6px" }}>
                          👁
                        </button>
                        {/* Undo / Remove from graduates */}
                        <button type="button" title="Undo — return to student list" disabled={markingGrad === s.id}
                          onClick={async () => {
                            if (!window.confirm(`Remove ${s.first_name} ${s.last_name} from graduates and return them to the student list?`)) return;
                            setMarkingGrad(s.id);
                            try {
                              const res = await fetch(`${import.meta.env.VITE_API_URL}/api/erd/students/${s.id}/graduate`, {
                                method: "PUT",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ graduation_status: null }),
                              });
                              if (res.ok) await fetchBaselineDirectory();
                            } catch (_) {}
                            setMarkingGrad(null);
                          }}
                          style={{ padding: "4px 8px", border: "1px solid #EF4444", borderRadius: "5px", background: "#FEF2F2", color: "#EF4444", cursor: markingGrad === s.id ? "not-allowed" : "pointer", fontSize: "13px", fontWeight: 700 }}>
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── GRADUATE STUDENTS PRINT PORTAL (8.5×13) ── */}
            {gradPrintOpen && createPortal(
              (() => {
                const activeFilters = [
                  gradFilter.school_year && `School Year: ${gradFilter.school_year}`,
                  gradFilter.program && `Program: ${gradFilter.program}`,
                  gradFilter.section && `Block/Section: ${gradFilter.section}`,
                  gradFilter.sex && `Sex: ${gradFilter.sex}`,
                  gradFilter.municipality && `Municipality: ${gradFilter.municipality}`,
                  gradFilter.barangay && `Barangay: ${gradFilter.barangay}`,
                ].filter(Boolean);
                const TD = { border: "1px solid #000", padding: "3px 7px", fontSize: "9pt", fontFamily: '"Times New Roman",Times,serif', verticalAlign: "middle" };
                const TH = { ...TD, background: "#3d6e01", color: "#fff", fontWeight: 700, fontSize: "8pt", textTransform: "uppercase", letterSpacing: "0.3px", textAlign: "left" };
                return (
                  <div id="grad-portal-root" style={{ position: "fixed", inset: 0, background: WHITE, zIndex: 2147483646, display: "flex", flexDirection: "column" }}>
                    <div className="no-print" style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: DARK_GREEN, flexShrink: 0 }}>
                      <span style={{ fontWeight: 800, fontSize: 13, color: WHITE }}>Graduate Students — {filtered.length} student(s)</span>
                      <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                        <button type="button" onClick={() => setGradPrintOpen(false)} style={{ padding: "7px 16px", background: "rgba(255,255,255,0.15)", border: "1.5px solid rgba(255,255,255,0.4)", borderRadius: 6, fontSize: 12, fontWeight: 600, color: WHITE, cursor: "pointer" }}>← Back</button>
                        <button type="button" onClick={() => window.print()} style={{ padding: "7px 20px", background: WHITE, color: DARK_GREEN, border: "none", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>🖨 Print </button>
                      </div>
                    </div>

                    <div id="grad-scroll" style={{ flex: 1, overflowY: "auto", background: "#e5e7eb", padding: "24px 16px" }}>
                      <style>{`
                        @media print {
                          @page { size: 8.5in 13in portrait; margin: 0.35in; }
                          html, body { background: #fff !important; height: auto !important; margin: 0 !important; padding: 0 !important; }
                          body > * { display: none !important; }
                          body > #grad-portal-root { display: block !important; position: static !important; height: auto !important; overflow: visible !important; }
                          #grad-portal-root .no-print { display: none !important; }
                          #grad-scroll { position: static !important; overflow: visible !important; height: auto !important; background: #fff !important; padding: 0 !important; }
                          #grad-print-area { position: static !important; width: 100% !important; min-height: 0 !important; box-shadow: none !important; margin: 0 !important; padding: 0 !important; }
                          #grad-print-area, #grad-print-area * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                          #grad-print-area table { page-break-inside: auto; }
                          #grad-print-area thead { display: table-header-group !important; }
                          #grad-print-area tr { page-break-inside: avoid !important; }
                        }
                      `}</style>

                      <div id="grad-print-area" style={{ width: "816px", minHeight: "1181px", margin: "0 auto", background: WHITE, padding: "24px 40px", boxSizing: "border-box", fontFamily: '"Times New Roman",Times,serif', color: "#000", boxShadow: "0 4px 24px rgba(0,0,0,0.18)" }}>

                        {/* HEADER (Transcript-of-Records style) */}
                        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "2px", tableLayout: "fixed" }}>
                          <tbody>
                            <tr>
                              <td style={{ width: "130px", verticalAlign: "middle", textAlign: "center", paddingRight: "6px" }}>
                                <div style={{ display: "flex", gap: "4px", alignItems: "center", justifyContent: "center" }}>
                                  <img src={alangalangLogo} alt="" style={{ width: 70, height: 70, objectFit: "contain" }} />
                                  <img src={ccaLogo} alt="" style={{ width: 80, height: 80, objectFit: "contain" }} />
                                </div>
                              </td>
                              <td style={{ textAlign: "center", verticalAlign: "middle" }}>
                                <div style={{ fontSize: "15pt", fontWeight: 900, textTransform: "uppercase", letterSpacing: "1px", lineHeight: 1.1, fontFamily: '"Times New Roman",Times,serif', marginLeft: "50px" }}>Community College of Alangalang</div>
                              </td>
                              <td style={{ width: "185px", verticalAlign: "top", paddingLeft: "36px", fontSize: "8pt", lineHeight: 1.7, fontFamily: '"Times New Roman",Times,serif' }}>
                                <div style={{ fontWeight: 900, fontSize: "8.5pt", textTransform: "uppercase", paddingLeft: "20px" }}>Office of the Registrar</div>
                                <div style={{ paddingLeft: "20px" }}>Community College of Alangalang</div>
                                <div style={{ paddingLeft: "20px" }}>Alangalang, Leyte</div>
                                <div style={{ paddingLeft: "20px" }}>communitycollegeofalangalang@gmail.com</div>
                              </td>
                            </tr>
                            <tr>
                              <td colSpan={3} style={{ position: "relative", height: "44px" }}>
                                <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                                  <div style={{ fontSize: "44px", fontWeight: 900, letterSpacing: "-1px", fontFamily: 'Algerian, "Times New Roman", Times, serif', whiteSpace: "nowrap", transform: "scaleX(0.68)", transformOrigin: "center center" }}>OFFICIAL LIST OF GRADUATES</div>
                                </div>
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        {/* Thick divider */}
                        <div style={{ borderTop: "2.5px solid #000", borderBottom: "1px solid #000", height: "3px", marginBottom: "6px", marginTop: "0px" }} />

                        {/* Filter summary */}
                        {activeFilters.length > 0 && (
                          <div style={{ fontSize: "9pt", fontFamily: '"Times New Roman",Times,serif', marginBottom: "6px", textAlign: "center" }}>
                            {activeFilters.join("  •  ")}
                          </div>
                        )}

                        {/* Graduates table */}
                        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "2px" }}>
                          <thead>
                            <tr>
                              <th style={{ ...TH, width: "34px", textAlign: "center" }}>No.</th>
                              <th style={{ ...TH, width: "120px" }}>ID Number</th>
                              <th style={TH}>Name (Last, First, Middle)</th>
                              <th style={TH}>Program</th>
                              <th style={{ ...TH, width: "90px" }}>Year Level</th>
                              <th style={{ ...TH, width: "70px" }}>Section</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filtered.map((s, i) => (
                              <tr key={`gp-${s.id}-${i}`}>
                                <td style={{ ...TD, textAlign: "center" }}>{i + 1}</td>
                                <td style={TD}>{s.student_number || ""}</td>
                                <td style={{ ...TD, fontWeight: 600, textTransform: "uppercase" }}>{[s.last_name, s.first_name, s.middle_name].filter(Boolean).join(", ")}</td>
                                <td style={TD}>{s.course || ""}</td>
                                <td style={TD}>{s.year_level || ""}</td>
                                <td style={TD}>{s.section || ""}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        <div style={{ fontSize: "8pt", fontStyle: "italic", marginTop: "8px", display: "flex", justifyContent: "space-between", fontFamily: '"Times New Roman",Times,serif' }}>
                          <span>Total: {filtered.length} graduate(s)</span>
                          <span>Date Printed: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })(),
              document.body
            )}
          </div>
        );
      })()}

      {/* ── CANDIDATES FOR GRADUATION ── */}
      {activeTab === "reports" && reportsSubTab === "candidates_graduation" && (() => {
        const q = candSearch.trim().toLowerCase();
        const results = q
          ? students.filter(s => s.graduation_status !== "graduated" &&
              `${s.first_name || ""} ${s.last_name || ""} ${s.middle_name || ""} ${s.student_number || ""} ${s.course || ""}`.toLowerCase().includes(q)
            ).slice(0, 30)
          : [];
        const openForm = async (s) => {
          setCandFormStudent(s);
          setCandGrades([]);
          try {
            const gRes = await fetch(`${import.meta.env.VITE_API_URL}/api/erd/tor-subjects/${s.id}`);
            if (gRes.ok) setCandGrades(await gRes.json());
          } catch(_) {}
        };
        // Clicking a name shows the form inline in the right panel (like the TOR).
        const selectPreview = async (s) => {
          setCandPreview(s);
          setCandGrades([]);
          try {
            const gRes = await fetch(`${import.meta.env.VITE_API_URL}/api/erd/tor-subjects/${s.id}`);
            if (gRes.ok) setCandGrades(await gRes.json());
          } catch(_) {}
        };
        const list = (students || [])
          .filter(s => s.graduation_status !== "graduated")
          .filter(s => {
            if (!q) return true;
            return `${s.first_name || ""} ${s.last_name || ""} ${s.middle_name || ""} ${s.student_number || ""}`.toLowerCase().includes(q);
          });
        return (
          <div style={{ marginTop: "12px", display: "flex", gap: "12px", minHeight: "520px" }}>
            {/* Left: student picker */}
            <div style={{ width: "260px", flexShrink: 0, border: `1px solid ${BORDER}`, borderRadius: "10px", overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "8px 12px", background: DARK_GREEN, color: WHITE, fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Select Student
              </div>
              <div style={{ padding: "6px 8px", borderBottom: `1px solid ${BORDER}` }}>
                <input type="text" value={candSearch} onChange={e => setCandSearch(e.target.value)}
                  placeholder="🔍 Search name or ID…"
                  style={{ width: "100%", padding: "5px 8px", fontSize: "10px", border: `1px solid ${BORDER}`, borderRadius: "5px", outline: "none", boxSizing: "border-box" }} />
              </div>
              <div style={{ flex: 1, overflowY: "auto" }}>
                {list.map(s => {
                  const sel = candPreview?.id === s.id;
                  return (
                    <div key={s.id} onClick={() => selectPreview(s)}
                      style={{ padding: "7px 10px", borderBottom: `1px solid #F3F4F6`, cursor: "pointer", background: sel ? "#eaf2d9" : "transparent", display: "flex", flexDirection: "column", gap: "1px" }}
                      onMouseEnter={e => { if (!sel) e.currentTarget.style.background = LIGHT_GRAY; }}
                      onMouseLeave={e => { if (!sel) e.currentTarget.style.background = "transparent"; }}>
                      <span style={{ fontSize: "9px", fontWeight: 700, color: BLUE, fontFamily: "monospace", letterSpacing: "0.03em" }}>{s.student_number || "—"}</span>
                      <span style={{ fontSize: "11px", fontWeight: sel ? 800 : 500, color: "#111827" }}>{s.last_name}, {s.first_name} {s.middle_name || ""}</span>
                    </div>
                  );
                })}
                {list.length === 0 && (
                  <div style={{ padding: "20px", textAlign: "center", color: GRAY, fontSize: "11px" }}>No students found.</div>
                )}
              </div>
            </div>

            {/* Right: candidate form preview / action */}
            <div style={{ flex: 1, border: `1px solid ${BORDER}`, borderRadius: "10px", overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "8px 14px", background: DARK_GREEN, color: WHITE, fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span>Records of Candidates for Graduation</span>
                {candPreview && (
                  <button type="button" onClick={() => openForm(candPreview)}
                    style={{ padding: "5px 14px", background: WHITE, color: DARK_GREEN, border: "none", borderRadius: "5px", fontWeight: 800, fontSize: "11px", cursor: "pointer" }}>
                    🖨 Print 
                  </button>
                )}
              </div>
              {!candPreview ? (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "10px", color: GRAY }}>
                  <span style={{ fontSize: "36px" }}>🎓</span>
                  <span style={{ fontSize: "13px" }}>Select a student to generate the form</span>
                </div>
              ) : (
                <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
                  <CandidateGradForm student={candPreview} grades={candGrades} user={user} signName={registrarSignName} inline />
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── RECORDS OF CANDIDATES FOR GRADUATION FORM ── */}
      <CandidateGradForm student={candFormStudent} grades={candGrades} user={user} signName={registrarSignName} onClose={() => setCandFormStudent(null)} />

      {/* ── GRADUATE CREDENTIALS MODAL ── */}
      {gradViewStudent && createPortal(
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2147483647, isolation: "isolate" }}>
          <div style={{ background: WHITE, borderRadius: "12px", width: "100%", maxWidth: "520px", maxHeight: "90vh", overflowY: "auto", padding: "0", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            {/* Header */}
            <div style={{ padding: "14px 20px", background: DARK_GREEN, color: WHITE, borderRadius: "12px 12px 0 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: "14px", fontWeight: 800, letterSpacing: "0.03em" }}>Student Credentials</div>
                <div style={{ fontSize: "11px", opacity: 0.8, marginTop: "2px" }}>{gradViewStudent.last_name}, {gradViewStudent.first_name} {gradViewStudent.middle_name || ""}</div>
              </div>
              <button type="button" onClick={() => setGradViewStudent(null)}
                style={{ background: "rgba(255,255,255,0.2)", border: "none", color: WHITE, borderRadius: "6px", padding: "4px 10px", cursor: "pointer", fontSize: "16px", fontWeight: 700 }}>✕</button>
            </div>
            {/* Body */}
            <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
              {/* Photo + basic */}
              <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
                <div style={{ width: "80px", height: "80px", borderRadius: "8px", border: `1px solid ${BORDER}`, overflow: "hidden", flexShrink: 0, background: "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {gradViewStudent.profile_picture
                    ? <img src={gradViewStudent.profile_picture} alt="Photo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <span style={{ fontSize: "32px" }}>👤</span>}
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
                  <div style={{ fontSize: "16px", fontWeight: 800, color: "#111827" }}>{gradViewStudent.last_name}, {gradViewStudent.first_name} {gradViewStudent.middle_name || ""}</div>
                  <div style={{ fontSize: "12px", color: BLUE, fontFamily: "monospace", fontWeight: 700 }}>{gradViewStudent.student_number || "No ID"}</div>
                  <div style={{ fontSize: "11px", color: GRAY }}>{gradViewStudent.course || "—"}</div>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginTop: "4px" }}>
                    <span style={{ padding: "2px 10px", background: "#D1FAE5", color: "#065F46", borderRadius: "99px", fontSize: "10px", fontWeight: 700 }}>🎓 Graduated</span>
                    <span style={{ fontSize: "11px", color: GRAY }}>{gradViewStudent.year_level || "—"} | {gradViewStudent.section || "—"}</span>
                  </div>
                </div>
              </div>

              {/* Info grid */}
              {[
                ["Sex",          gradViewStudent.gender      || "—"],
                ["Email",        gradViewStudent.email       || "—"],
                ["Mobile",       gradViewStudent.mobile      || "—"],
                ["Birthday",     gradViewStudent.birthdate   || "—"],
                ["Place of Birth", gradViewStudent.place_of_birth || "—"],
                ["Barangay",     gradViewStudent.barangay    || "—"],
                ["Municipality", gradViewStudent.municipality|| "—"],
                ["Province",     gradViewStudent.province    || "—"],
                ["Religion",     gradViewStudent.religion    || "—"],
                ["Citizenship",  gradViewStudent.citizenship || "—"],
                ["Civil Status", gradViewStudent.status      || "—"],
              ].map(([label, value]) => (
                <div key={label} style={{ display: "flex", gap: "8px", fontSize: "12px", borderBottom: `1px solid #F3F4F6`, paddingBottom: "6px" }}>
                  <span style={{ width: "130px", flexShrink: 0, fontWeight: 700, color: GRAY }}>{label}</span>
                  <span style={{ color: "#111827" }}>{value}</span>
                </div>
              ))}

              {/* Family background */}
              {(gradViewStudent.father_last || gradViewStudent.mother_last) && (
                <div style={{ background: "#F9FBF7", borderRadius: "8px", padding: "10px 14px" }}>
                  <div style={{ fontSize: "11px", fontWeight: 800, color: DARK_GREEN, marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Family Background</div>
                  {gradViewStudent.father_last && (
                    <div style={{ fontSize: "12px", marginBottom: "4px" }}>
                      <span style={{ fontWeight: 700, color: GRAY, marginRight: "8px" }}>Father:</span>
                      {gradViewStudent.father_last}, {gradViewStudent.father_first} {gradViewStudent.father_middle || ""}
                    </div>
                  )}
                  {gradViewStudent.mother_last && (
                    <div style={{ fontSize: "12px" }}>
                      <span style={{ fontWeight: 700, color: GRAY, marginRight: "8px" }}>Mother:</span>
                      {gradViewStudent.mother_last}, {gradViewStudent.mother_first} {gradViewStudent.mother_middle || ""}
                    </div>
                  )}
                </div>
              )}

              {/* TOR button — navigate to TOR preview */}
              <div style={{ background: "#EFF6FF", borderRadius: "8px", padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
                <div>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "#1D4ED8" }}>Transcript of Records</div>
                  <div style={{ fontSize: "11px", color: GRAY, marginTop: "2px" }}>View &amp; print academic transcript in the TOR preview</div>
                </div>
                <button type="button"
                  onClick={async () => {
                    const s = gradViewStudent;
                    // Load TOR data then open the TOR print overlay directly
                    setCandFormMode(false);
                    setTorPrintStudent(s);
                    setTorHonorableDate(""); setTorCourseDisplay(""); setTorOrNo(""); setTorDstOrNo(""); setTorDateIssued("");
                    setTorGrades([]); setTorEnrollments([]);
                    try {
                      const [gRes, eRes] = await Promise.all([
                        fetch(`${import.meta.env.VITE_API_URL}/api/erd/tor-subjects/${s.id}`),
                        fetch(`${import.meta.env.VITE_API_URL}/api/erd/enrollments?student_id=${s.id}`)
                      ]);
                      if (gRes.ok) setTorGrades(await gRes.json());
                      if (eRes.ok) setTorEnrollments(await eRes.json());
                    } catch(_) {}
                    // Open full-screen TOR preview overlay (no tab navigation)
                    setShowTorPrint(true);
                    setGradViewStudent(null);
                  }}
                  style={{ padding: "8px 16px", background: "#1D4ED8", color: WHITE, border: "none", borderRadius: "6px", fontWeight: 700, fontSize: "12px", cursor: "pointer", whiteSpace: "nowrap" }}>
                  📄 View TOR
                </button>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "4px" }}>
                <button type="button" onClick={() => setGradViewStudent(null)}
                  style={{ padding: "8px 20px", border: `1px solid ${BORDER}`, borderRadius: "6px", background: WHITE, cursor: "pointer", fontSize: "13px", fontWeight: 600 }}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── TRANSCRIPT OF RECORDS PRINT PORTAL ── */}
      {showTorPrint && torPrintStudent && createPortal(
        <div style={{ position:"fixed", inset:0, background:WHITE, zIndex:2147483646, display:"flex", flexDirection:"column" }}>

          {/* Toolbar */}
          <div className="no-print" style={{ display:"flex", alignItems:"center", gap:"8px", padding:"10px 16px", borderBottom:`1px solid ${BORDER}`, background:DARK_GREEN, flexShrink:0 }}>
            <span style={{ fontWeight:800, fontSize:"13px", color:WHITE }}>
              {torPrintStudent.last_name}, {torPrintStudent.first_name} — {candFormMode ? "Records of Candidates for Graduation" : "Transcript of Records"}
            </span>
            <div style={{ marginLeft:"auto", display:"flex", gap:"8px" }}>
              <button type="button" onClick={() => { setShowTorPrint(false); setCandFormMode(false); }}
                style={{ padding:"7px 16px", background:"rgba(255,255,255,0.15)", border:"1.5px solid rgba(255,255,255,0.4)", borderRadius:"6px", fontSize:"12px", fontWeight:600, color:WHITE, cursor:"pointer" }}>← Back</button>
              <button type="button" onClick={async () => {
                setLoadingTor(true);
                try {
                  const [gradesRes, enrollRes] = await Promise.all([
                    fetch(`${import.meta.env.VITE_API_URL}/api/erd/tor-subjects/${torPrintStudent.id}`),
                    fetch(`${import.meta.env.VITE_API_URL}/api/erd/enrollments?student_id=${torPrintStudent.id}`),
                  ]);
                  setTorGrades(gradesRes.ok ? await gradesRes.json() : []);
                  setTorEnrollments(enrollRes.ok ? await enrollRes.json() : []);
                } catch { setTorGrades([]); setTorEnrollments([]); }
                setLoadingTor(false);
                setTimeout(() => {
                  const p1 = document.getElementById("tor-print-area");
                  const gradePages = Array.from(document.querySelectorAll(".tor-grade-page"));
                  const mp = document.createElement("div");
                  mp.id = "tor-mp-container";
                  if (p1) { const c = p1.cloneNode(true); c.id="tor-mp-p1"; mp.appendChild(c); }
                  gradePages.forEach((pg, i) => { const c = pg.cloneNode(true); c.id="tor-mp-gp"+i; mp.appendChild(c); });
                  document.body.appendChild(mp);
                  const cleanup = () => { if(document.body.contains(mp)) document.body.removeChild(mp); window.removeEventListener("afterprint",cleanup); };
                  window.addEventListener("afterprint", cleanup);
                  window.print();
                }, 350);
              }}
                style={{ padding:"7px 20px", background:WHITE, color:DARK_GREEN, border:"none", borderRadius:"6px", fontSize:"12px", fontWeight:700, cursor:"pointer" }}>🖨 Print </button>
            </div>
          </div>

          <div id="tor-pages-wrapper" style={{ flex: 1, overflowY: "auto", background: "#e5e7eb", padding: "36px 16px 16px" }}>
            <style>{`
              @media print {
                @page { size: 8.5in 13in portrait; margin: 0; }
                body * { visibility: hidden !important; }
                #tor-mp-container, #tor-mp-container * {
                  visibility: visible !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                  color-adjust: exact !important;
                }
                #tor-mp-container {
                  position: absolute !important;
                  top: 0 !important; left: 0 !important;
                  width: 816px !important;
                  background: white !important;
                }
                #tor-mp-p1 {
                  position: relative !important;
                  width: 816px !important;
                  box-sizing: border-box !important;
                  box-shadow: none !important;
                  margin: 0 !important;
                  padding: 25px 48px 0 !important;
                  break-after: page !important;
                  page-break-after: always !important;
                  min-height: 1056px !important;
                }
                [id^="tor-mp-gp"] {
                  position: relative !important;
                  width: 816px !important;
                  box-sizing: border-box !important;
                  box-shadow: none !important;
                  margin: 0 !important;
                  padding: 38px 48px !important;
                  break-before: page !important;
                  page-break-before: always !important;
                }
                #tor-mp-p1 textarea::placeholder,
                [id^="tor-mp-gp"] textarea::placeholder,
                [id^="tor-mp-gp"] input::placeholder { color: transparent !important; }
              }
            `}</style>
            <div id="tor-print-area" style={{
              background: WHITE,
              position: "relative",
              width: "816px",        /* 8.5in @ 96dpi */
              minHeight: "1056px",   /* approx 11in */
              margin: "20px auto 0",
              padding: "38px 48px",
              boxSizing: "border-box",
              fontFamily: '"Times New Roman", Times, serif',
              fontSize: "9.5pt",
              color: "#000",
              boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
              transformOrigin: "top center",
            }}>
              {/* ── WATERMARK ── */}
              <div style={{ position:"absolute", top:0, left:0, right:0, bottom:0, display:"flex", alignItems:"center", justifyContent:"center", pointerEvents:"none", zIndex:0, overflow:"hidden" }}>
                <img 
                  src={ccaLogo} 
                  alt="" 
                  style={{ width:"1000px", height:"1000px", objectFit:"contain", opacity:0.10 }} 
                  />
              </div>
              <style>{`
                .pvw-td  { border:1px solid #333; padding:1px 5px; vertical-align:top; font-family:"Times New Roman",Times,serif; font-size:8.5pt; }
                .pvw-th  { border:1px solid #333; padding:1px 5px; font-weight:700; font-size:7.5pt; background:#e8e8e8; text-align:center; font-family:"Times New Roman",Times,serif; }
                .pvw-hdr { border:1px solid #333; background:#ddd; text-align:center; font-weight:900; font-size:8pt; letter-spacing:.5px; text-transform:uppercase; padding:2px 4px; font-family:"Times New Roman",Times,serif; }
                .pvw-row { padding:2px 6px; border-bottom:1px solid #ddd; display:flex; gap:4px; font-family:"Times New Roman",Times,serif; }
                @media print { .tor-valid-for-select { display:none !important; } .tor-valid-for-text { display:block !important; } }
              `}</style>

              {/* HEADER */}
              <table style={{ width:"100%", borderCollapse:"collapse", marginBottom:"2px", tableLayout:"fixed" }}>
                <tbody><tr>
                  <td style={{ width:"130px", verticalAlign:"middle", textAlign:"center", paddingRight:"6px" }}>
                    <div style={{ display:"flex", gap:"4px", alignItems:"center", justifyContent:"center" }}>
                      <img src={alangalangLogo} alt="" style={{ width:70, height:70, objectFit:"contain" }} />
                      <img src={ccaLogo}        alt="" style={{ width:80, height:80, objectFit:"contain" }} />
                    </div>
                  </td>
                  <td style={{ textAlign:"center", verticalAlign:"middle", userSelect:"none", pointerEvents:"none" }}>
                    <div style={{ fontSize:"15pt", fontWeight:900, textTransform:"uppercase", letterSpacing:"1px", lineHeight:1.1, fontFamily:'"Times New Roman",Times,serif', marginLeft:"50px" }}>Community College of Alangalang</div>
                  </td>
                  <td style={{ width:"185px", verticalAlign:"top", paddingLeft:"36px", fontSize:"8pt", lineHeight:1.7, fontFamily:'"Times New Roman",Times,serif', userSelect:"none", pointerEvents:"none" }}>
                    <div style={{ fontWeight:900, fontSize:"8.5pt", textTransform:"uppercase", paddingLeft:"20px" }}>Office of the Registrar</div>
                    <div style={{ paddingLeft:"20px" }}>Community College of Alangalang</div>
                    <div style={{ paddingLeft:"20px" }}>Alangalang, Leyte</div>
                    <div style={{ paddingLeft:"20px" }}>communitycollegeofalangalang@gmail.com</div>
                  </td>
                </tr>
                <tr>
                  <td colSpan={3} style={{ position:"relative", height:"44px", userSelect:"none", pointerEvents:"none" }}>
                    <div style={{ position:"absolute", top:0, left:0, width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden" }}>
                      <div style={{ fontSize: candFormMode ? "33px" : "50px", fontWeight:900, letterSpacing:"-1px", fontFamily:'Algerian, "Times New Roman", Times, serif', whiteSpace:"nowrap", transform:"scaleX(0.68)", transformOrigin:"center center" }}>{candFormMode ? "RECORDS OF CANDIDATES FOR GRADUATION" : "OFFICIAL TRANSCRIPT OF RECORDS"}</div>
                    </div>
                  </td>
                </tr>
                </tbody>
              </table>

              {/* Thick divider */}
              <div style={{ borderTop:"2.5px solid #000", borderBottom:"1px solid #000", height:"3px", marginBottom:"3px", marginTop:"0px" }} />

              {/* NAME ROW */}
              <table style={{ width:"100%", borderCollapse:"collapse", marginBottom:"4px", userSelect:"none", pointerEvents:"none" }}>
                <tbody><tr>
                  <td style={{ width:"220px", padding:"2px 6px" }}>
                    <div style={{ fontSize:"16pt", fontWeight:900, letterSpacing:"1px", lineHeight:1.1, fontFamily:'"Times New Roman",Times,serif' }}>{(torPrintStudent.last_name||"").toUpperCase()}</div>
                    <div style={{ fontStyle:"italic", fontSize:"8pt", color:"#555" }}>Last Name</div>
                  </td>
                  <td style={{ width:"22%", padding:"2px 8px 2px 33px" }}>
                    <div style={{ fontSize:"12pt", fontWeight:800, fontFamily:'"Times New Roman",Times,serif' }}>{(torPrintStudent.first_name||"").toUpperCase()}</div>
                    <div style={{ fontStyle:"italic", fontSize:"8pt", color:"#555" }}>First Name</div>
                  </td>
                  <td style={{ width:"22%", padding:"2px 8px 2px 28px" }}>
                    <div style={{ fontSize:"12pt", fontWeight:800, fontFamily:'"Times New Roman",Times,serif' }}>{(torPrintStudent.middle_name||"").toUpperCase()||"—"}</div>
                    <div style={{ fontStyle:"italic", fontSize:"8pt", color:"#555" }}>Middle Name</div>
                  </td>
                  <td style={{ padding:"2px 8px 2px 28px" }}>
                    <div style={{ fontSize:"8.5pt", fontFamily:'"Times New Roman",Times,serif' }}>Student No. <span style={{ fontWeight:900, fontFamily:"monospace", fontSize:"9pt" }}>{torPrintStudent.student_number||"—"}</span></div>
                  </td>
                </tr></tbody>
              </table>

              {/* MAIN TWO-COLUMN */}
              <table style={{ width:"100%", borderCollapse:"separate", borderSpacing:"5px 0" }}>
                <tbody><tr style={{ verticalAlign:"top" }}>

                  {/* LEFT: Photo + Personal Data */}
                  <td style={{ width:"200px", border:"1px solid #333", padding:0, userSelect:"none", pointerEvents:"none" }}>
                    <div style={{ width:"100%", height:"185px", borderBottom:"1px solid #333", background:"#f5f5f5", overflow:"hidden", position:"relative", zIndex:1 }}>
                      {torPrintStudent.profile_picture
                        ? <img src={torPrintStudent.profile_picture} alt="Photo" style={{ width:"100%", height:"100%", objectFit:"cover", objectPosition:"center top" }} />
                        : <div style={{ textAlign:"center", color:"#aaa", fontSize:"8pt", fontFamily:'"Times New Roman",Times,serif' }}><div style={{ fontSize:"26pt", lineHeight:1 }}>👤</div><div>2×2 Photo</div></div>
                      }
                    </div>
                    <div className="pvw-hdr" style={{ borderLeft:"none", borderRight:"none" }}>Personal Data</div>
                    {[
                      ["Sex:",          torPrintStudent.gender||"—"],
                      ["Religion:",     torPrintStudent.religion||"—"],
                      ["Citizenship:",  torPrintStudent.citizenship||"Filipino"],
                      ["Date of Birth:", torPrintStudent.birthdate
                        ? new Date(torPrintStudent.birthdate+"T00:00:00").toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})
                        : "—"],
                      ["Place of Birth:", torPrintStudent.place_of_birth||"—"],
                      ["Civil Status:", torPrintStudent.status||"—"],
                      ["Home Address:", [torPrintStudent.barangay,torPrintStudent.municipality,torPrintStudent.province].filter(Boolean).join(", ")||"—"],
                    ].map(([lbl,val])=>(
                      <div key={lbl} className="pvw-row">
                        <span style={{ fontSize:"8pt", fontWeight:700, minWidth:"88px", flexShrink:0 }}>{lbl}</span>
                        <span style={{ fontSize:"8.5pt" }}>{val}</span>
                      </div>
                    ))}
                    <div className="pvw-row" style={{ flexDirection:"column" }}>
                      <span style={{ fontSize:"8pt", fontWeight:700 }}>Parents:</span>
                      <div style={{ marginLeft:"8px" }}>
                        <div style={{ fontSize:"8pt" }}>Father: {[torPrintStudent.father_first,torPrintStudent.father_middle,torPrintStudent.father_last].filter(Boolean).join(" ")||"—"}</div>
                        <div style={{ fontSize:"8pt" }}>Mother: {[torPrintStudent.mother_first,torPrintStudent.mother_middle,torPrintStudent.mother_last].filter(Boolean).join(" ")||"—"}</div>
                      </div>
                    </div>
                    <div className="pvw-row"><span style={{ fontSize:"8pt", fontWeight:700, minWidth:"88px" }}>Parent's Address:</span><span style={{ fontSize:"8pt" }}>{torPrintStudent.parents_address||"—"}</span></div>
                    <div className="pvw-row"><span style={{ fontSize:"8pt", fontWeight:700, minWidth:"88px" }}>Spouse:</span><span style={{ fontSize:"8pt" }}>{torPrintStudent.spouse_name||"—"}</span></div>
                    <div className="pvw-row" style={{ borderBottom:"none" }}><span style={{ fontSize:"8pt", fontWeight:700, minWidth:"88px" }}>Spouse Address:</span><span style={{ fontSize:"8pt" }}>{torPrintStudent.spouse_address||"—"}</span></div>
                  </td>

                  {/* RIGHT: Educational Background — enhanced */}
                  <td style={{ padding:0, verticalAlign:"top", border:"1px solid #333" }}>

                    {/* ── EDUCATIONAL BACKGROUND ── */}
                    <div className="pvw-hdr" style={{ borderLeft:"none", borderRight:"none", borderTop:"none", background:"#2c4a1e", color:"#fff", fontSize:"8pt", letterSpacing:"1.5px" }}>Educational Background</div>
                    <table style={{ width:"100%", borderCollapse:"collapse" }}>
                      <thead>
                        <tr>
                          <th className="pvw-th" style={{ width:"19%" }}>Level</th>
                          <th className="pvw-th">Name of School</th>
                          <th className="pvw-th">Address</th>
                          <th className="pvw-th" style={{ width:"14%" }}>Year</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          ["Elementary", torPrintStudent.elem_school, torPrintStudent.elem_address, torPrintStudent.elem_year],
                          ["Secondary",  torPrintStudent.hs_school,   torPrintStudent.hs_address,   torPrintStudent.hs_year],
                          ["College",    torPrintStudent.col_school,   torPrintStudent.col_address,  torPrintStudent.col_year],
                        ].map(([lvl,school,addr,yr])=>(
                          <tr key={lvl}>
                            <td className="pvw-td" style={{ fontWeight:700, fontSize:"7.5pt", textAlign:"center" }}>{lvl}</td>
                            <td className="pvw-td" style={{ color:"#000", fontWeight:600, fontSize:"8pt" }}>{school||"—"}</td>
                            <td className="pvw-td" style={{ color:"#000", fontSize:"7.5pt" }}>{addr||"—"}</td>
                            <td className="pvw-td" style={{ textAlign:"center", fontSize:"8pt", fontWeight:700, color:"#000" }}>{yr||"—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* ── ENTRANCE CREDENTIALS ── */}
                    <div className="pvw-hdr" style={{ borderLeft:"none", borderRight:"none", background:"#2c4a1e", color:"#fff", fontSize:"8pt", letterSpacing:"1.5px" }}>Entrance Credentials to College</div>
                    <div style={{ padding:"6px 10px", minHeight:"32px", fontSize:"8.5pt", fontFamily:'"Times New Roman",Times,serif', color:"#333", lineHeight:1.6 }}>
                      {torPrintStudent.scholastic_notes||<span style={{ color:"#aaa", fontStyle:"italic" }}>—</span>}
                    </div>

                    {/* ── OTHER UPDATED INFORMATION ── */}
                    <div className="pvw-hdr" style={{ borderLeft:"none", borderRight:"none", borderTop:"none", background:"#2c4a1e", color:"#fff", fontSize:"8pt", letterSpacing:"1.5px" }}>Other Updated Information</div>
                    <textarea placeholder="Type here..." onInput={e=>{ e.target.style.height="auto"; e.target.style.height=e.target.scrollHeight+"px"; }} style={{ width:"100%", padding:"6px 10px", border:"none", outline:"none", resize:"none", overflow:"hidden", fontSize:"8.5pt", fontFamily:'"Times New Roman",Times,serif', color:"#333", boxSizing:"border-box", background:"transparent", minHeight:"90px" }} />

                    {/* ── HONORABLE DISMISSAL ── */}
                    <div className="pvw-hdr" style={{ borderLeft:"none", borderRight:"none", borderTop:"none", background:"#2c4a1e", color:"#fff", fontSize:"8pt", letterSpacing:"1.5px" }}>Granted Honorable Dismissal Effective:</div>
                    <input value={torHonorableDate} onChange={e=>setTorHonorableDate(e.target.value)} placeholder="—" style={{ width:"100%", padding:"6px 10px", border:"none", borderBottom:"1px solid #ddd", outline:"none", fontSize:"8.5pt", fontFamily:'"Times New Roman",Times,serif', boxSizing:"border-box", background:"transparent", color:"#333" }} />

                    {/* ── VALID ONLY FOR ── */}
                    <div className="pvw-hdr" style={{ borderLeft:"none", borderRight:"none", borderTop:"none", background:"#2c4a1e", color:"#fff", fontSize:"8pt", letterSpacing:"1.5px", marginTop:"48px" }}>Valid Only For:</div>
                    <div className="tor-valid-for-select" style={{ padding:"6px 10px", textAlign:"center" }}>
                      <select value={torCourseDisplay} onChange={e=>setTorCourseDisplay(e.target.value)} style={{ border:"1px solid #aaa", outline:"none", fontSize:"8.5pt", fontFamily:'"Times New Roman",Times,serif', fontWeight:800, background:"#fff", color:"#1a3a6e", cursor:"pointer", padding:"2px 8px", borderRadius:"2px", width:"80%" }}>
                        <option value="">—</option>
                        <option value="Employment">Employment</option>
                        <option value="Board Examination">Board Examination</option>
                        <option value="Civil Service">Civil Service</option>
                        <option value="Personal Copy">Personal Copy</option>
                        <option value="Further Studies">Further Studies</option>
                      </select>
                    </div>
                    <div className="tor-valid-for-text" style={{ display:"none", padding:"4px 10px", fontSize:"9pt", fontFamily:'"Times New Roman",Times,serif', fontWeight:800, color:"#1a3a6e", textAlign:"center" }}>{torCourseDisplay||"—"}</div>

                  </td>
                </tr></tbody>
              </table>

              {/* CONTINUATION NOTE */}
              {torGrades && torGrades.length > 0 && (
                <div style={{ textAlign:"center", fontSize:"8pt", fontFamily:'"Times New Roman",Times,serif', fontStyle:"italic", marginTop:"16px", borderTop:"1px solid #aaa", paddingTop:"6px", color:"#444", letterSpacing:"1px" }}>
                  —— CONTINUATION ON NEXT PAGE ——
                </div>
              )}

              {/* FOOTER NOTE */}
              <div style={{ marginTop:"10px", borderTop:"1.5px solid #555", paddingTop:"4px", fontSize:"7.5pt", lineHeight:1.7, fontStyle:"italic", fontFamily:'"Times New Roman",Times,serif' }}>
                Note: This transcript is considered original when it bears the dry embossed seal of the College and the original signature of the Registrar. Any erasure or alteration made on this copy renders the whole transcript invalid.
              </div>
              <div style={{ marginTop:"33px", fontSize:"7.5pt", fontFamily:'"Times New Roman",Times,serif', fontStyle:"italic" }}>College Seal</div>

              {/* SEAL + SIGNATURE */}
              <div style={{ textAlign:"right", marginTop:"14px", marginRight:"35px" }}>
                <div style={{ height:"36px" }} />
                <div style={{ display:"inline-block", minWidth:"180px", textAlign:"center" }}>
                  <div style={{ borderBottom:"1.5px solid #333", paddingBottom:"2px", minHeight:"13px", fontWeight:800, fontSize:"9pt", textTransform:"uppercase", fontFamily:'"Times New Roman",Times,serif' }}>{registrarSignName}</div><div style={{ fontWeight:900, fontSize:"10pt", textTransform:"uppercase", letterSpacing:"0.5px", fontFamily:'"Times New Roman",Times,serif' }}>REGISTRAR</div>
                </div>
              </div>
              {/* PAGE NUMBER bottom edge */}
              <div style={{ position:"absolute", bottom:"12px", left:"48px", fontSize:"8pt", fontFamily:'"Times New Roman",Times,serif', fontStyle:"italic" }}>Page <u>1</u> of <u>{torGrades && torGrades.length > 0 ? (() => {
          const ks = new Set();
          torGrades.forEach(g => {
            const sem=String(g.semester||"1").trim();
            const yl=String(g.year_level||"");
            const ylk=yl==="1st Year"?"1":yl==="2nd Year"?"2":yl==="3rd Year"?"3":yl==="4th Year"?"4":"9";
            const sk=(sem==="1"||sem==="1st Semester")?"1":(sem==="2"||sem==="2nd Semester")?"2":"9";
            ks.add(`${ylk}|${g.year_start||""}|${g.year_end||""}|${sk}|${sem}`);
          });
          return 1 + Math.ceil(ks.size / 5);
        })() : 1}</u> pages</div>

            </div>{/* end white page */}

          {/* ── PAGE 2: GRADES ── */}
          {torGrades && torGrades.length > 0 && (() => {
            const GC = { padding:"0 4px", lineHeight:"1.25", fontSize:"11px", fontFamily:'"Times New Roman",Times,serif', verticalAlign:"middle" };
            const GH = { ...GC, fontWeight:700, background:"#2c4a1e", color:"#fff", fontSize:"11px", textAlign:"center" };
            const semAbbr = s => { const v=String(s||'').trim(); return v==='1'||v==='1st Semester'?'1st SEM':v==='2'||v==='2nd Semester'?'2nd SEM':v||'—'; };
            const groups = {};
            torGrades.forEach(g => {
              const sem = String(g.semester || '1').trim();
              const ys  = g.year_start || "";
              const ye  = g.year_end   || "";
              const yl  = String(g.year_level || "");
              const ylk = yl==="1st Year"?"1":yl==="2nd Year"?"2":yl==="3rd Year"?"3":yl==="4th Year"?"4":"9";
              const sk  = (sem==="1"||sem==="1st Semester") ? "1" : (sem==="2"||sem==="2nd Semester") ? "2" : "9";
              const key = `${ylk}|${ys}|${ye}|${sk}|${sem}`;
              if(!groups[key]) groups[key] = { sem, ys, ye, yl, rows:[] };
              groups[key].rows.push(g);
            });
            const sortedKeys = Object.keys(groups).sort();
            const GROUPS_PER_PAGE = 4;
            const chunks = [];
            for (let i = 0; i < sortedKeys.length; i += GROUPS_PER_PAGE)
              chunks.push(sortedKeys.slice(i, i + GROUPS_PER_PAGE));
            const totalPages = 1 + chunks.length;
            const PageHeader = () => (
              <>
                <table style={{ width:"100%", borderCollapse:"collapse", marginBottom:"2px", tableLayout:"fixed" }}>
                  <tbody><tr>
                    <td style={{ width:"130px", verticalAlign:"middle", textAlign:"center", paddingRight:"6px" }}>
                      <div style={{ display:"flex", gap:"4px", alignItems:"center", justifyContent:"center" }}>
                        <img src={alangalangLogo} alt="" style={{ width:70, height:70, objectFit:"contain" }} />
                        <img src={ccaLogo}        alt="" style={{ width:80, height:80, objectFit:"contain" }} />
                      </div>
                    </td>
                    <td style={{ textAlign:"center", verticalAlign:"middle" }}>
                      <div style={{ fontSize:"15pt", fontWeight:900, textTransform:"uppercase", letterSpacing:"1px", lineHeight:1.1, fontFamily:'"Times New Roman",Times,serif', marginLeft:"50px" }}>Community College of Alangalang</div>
                    </td>
                    <td style={{ width:"185px", verticalAlign:"top", paddingLeft:"36px", fontSize:"8pt", lineHeight:1.7, fontFamily:'"Times New Roman",Times,serif' }}>
                      <div style={{ fontWeight:900, fontSize:"8.5pt", textTransform:"uppercase", paddingLeft:"20px" }}>Office of the Registrar</div>
                      <div style={{ paddingLeft:"20px" }}>Community College of Alangalang</div>
                      <div style={{ paddingLeft:"20px" }}>Alangalang, Leyte</div>
                      <div style={{ paddingLeft:"20px" }}>communitycollegeofalangalang@gmail.com</div>
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={3} style={{ position:"relative", height:"44px" }}>
                      <div style={{ position:"absolute", top:0, left:0, width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden" }}>
                        <div style={{ fontSize: candFormMode ? "33px" : "50px", fontWeight:900, letterSpacing:"-1px", fontFamily:'Algerian, "Times New Roman", Times, serif', whiteSpace:"nowrap", transform:"scaleX(0.68)", transformOrigin:"center center" }}>{candFormMode ? "RECORDS OF CANDIDATES FOR GRADUATION" : "OFFICIAL TRANSCRIPT OF RECORDS"}</div>
                      </div>
                    </td>
                  </tr>
                  </tbody>
                </table>
                <div style={{ borderTop:"2.5px solid #000", borderBottom:"1px solid #000", height:"3px", marginBottom:"6px" }} />
              </>
            );
            const renderPageFooter = () => (
              <>
                <div style={{ marginTop:"4px", fontSize:"7.5pt", fontFamily:'"Times New Roman",Times,serif', fontStyle:"italic" }}>College Seal</div>
                <div style={{ marginTop:"2px", display:"flex", flexDirection:"column" }}>
                  {[
                    ["O.R. No.", torOrNo, setTorOrNo],
                    ["DST O.R. No.", torDstOrNo, setTorDstOrNo],
                    ["Date Issued", torDateIssued, setTorDateIssued],
                  ].map(([label, val, setter]) => (
                    <div key={label} style={{ display:"flex", alignItems:"center", fontSize:"7.5pt", fontFamily:'"Times New Roman",Times,serif', lineHeight:"1.2", margin:"0", padding:"0" }}>
                      <span style={{ fontWeight:700, whiteSpace:"nowrap" }}>{label}&nbsp;:&nbsp;</span>
                      <input value={val} onChange={e=>setter(e.target.value)}
                        ref={el => { if (el) el.scrollIntoView = () => {}; }}
                        maxLength={50}
                        style={{ width:"220px", border:"none", outline:"none", fontSize:"7.5pt", fontFamily:'"Times New Roman",Times,serif', background:"transparent", padding:"0 2px" }} />
                    </div>
                  ))}
                </div>
              </>
            );
            const renderPageSignature = (pageNum) => (
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", marginTop:"4px", gap:"20px", alignItems:"flex-end" }}>
                <div style={{ fontSize:"8pt", fontFamily:'"Times New Roman",Times,serif', fontStyle:"italic" }}>
                  Page <u>{pageNum}</u> of <u>{totalPages}</u> pages
                </div>
                <div style={{ textAlign:"right", marginRight:"35px" }}>
                  <div style={{ height:"36px" }} />
                  <div style={{ display:"inline-block", minWidth:"180px", textAlign:"center" }}>
                    <div style={{ borderBottom:"1.5px solid #333", paddingBottom:"2px", minHeight:"13px", fontWeight:800, fontSize:"9pt", textTransform:"uppercase", fontFamily:'"Times New Roman",Times,serif' }}>{registrarSignName}</div><div style={{ fontWeight:900, fontSize:"10pt", textTransform:"uppercase", letterSpacing:"0.5px", fontFamily:'"Times New Roman",Times,serif' }}>REGISTRAR</div>
                  </div>
                </div>
              </div>
            );
            return chunks.map((chunkKeys, chunkIdx) => (
              <div key={chunkIdx} className="tor-grade-page" style={{
                background: "white",
                position: "relative",
                width: "816px",
                minHeight: "1056px",
                margin: "24px auto 0",
                padding: "38px 48px",
                boxSizing: "border-box",
                fontFamily: '"Times New Roman", Times, serif',
                fontSize: "11px",
                color: "#000",
                boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
              }}>
                {/* Watermark */}
                <div style={{ position:"absolute", top:0, left:0, right:0, bottom:0, display:"flex", alignItems:"center", justifyContent:"center", pointerEvents:"none", zIndex:2, overflow:"hidden" }}>
                  <img src={ccaLogo} alt="" style={{ width:"1000px", height:"1000px", objectFit:"contain", opacity:0.10 }} />
                </div>
                <div style={{ position:"relative", zIndex:1 }}>
                  <PageHeader />
                  {/* GRADES for this page */}
                  <div>
                    {chunkKeys.map((key, gIdx) => {
                      const { sem, ys, ye, yl, rows } = groups[key];
                      const syStr = ys && ye ? `${ys}-${ye}` : ys||ye||"";
                      const ylLabel = yl ? yl.toUpperCase() : "";
                      const hdr = `${semAbbr(sem)}${syStr ? " "+syStr : ""}${ylLabel ? " - "+ylLabel : ""} - ${(torPrintStudent.course||"").toUpperCase()}`;
                      return (
                        <div key={key} style={{ marginBottom:"3px" }}>
                          <table style={{ width:"100%", borderCollapse:"collapse", tableLayout:"fixed" }}>
                            <colgroup>
                              <col style={{ width:"22%" }}/><col/><col style={{ width:"10%" }}/><col style={{ width:"10%" }}/><col style={{ width:"10%" }}/>
                            </colgroup>
                            {gIdx === 0 && <thead>
                              <tr>
                                <th style={{ ...GH, textAlign:"left", paddingLeft:"6px" }}>Course Code</th>
                                <th style={{ ...GH, textAlign:"left", paddingLeft:"81.5px" }}>Descriptive Title</th>
                                <th style={GH}>Grades</th>
                                <th style={GH}>Re-Exam</th>
                                <th style={GH}>Credits</th>
                              </tr>
                            </thead>}
                            <tbody>
                              <tr>
                                <td colSpan={5} style={{ background:"#3d6e01", color:"#fff", padding:"2px 8px", fontWeight:700, fontSize:"11px", fontFamily:'"Times New Roman",Times,serif', letterSpacing:"0.5px" }}>
                                  {hdr}
                                </td>
                              </tr>
                              {rows.map((g,i) => (
                                <tr key={i} style={{ background:"#fff" }}>
                                  <td style={{ ...GC, textAlign:"left", paddingLeft:"6px" }}>{g.subject_code||"—"}</td>
                                  <td style={{ ...GC, textAlign:"left", paddingLeft:"6px", whiteSpace:"normal", wordBreak:"break-word" }}>{g.subject_title||"—"}</td>
                                  <td style={{ ...GC, textAlign:"center", fontWeight:700, color:parseFloat(g.grade)>3.0?"#C62828":"#000" }}>{g.grade!=null?g.grade:""}</td>
                                  <td style={{ ...GC, textAlign:"center", color:"#999" }}>—</td>
                                  <td style={{ ...GC, textAlign:"center", fontWeight:600 }}>{g.units||"—"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );
                    })}
                  </div>
                  {/* Continuation / closed marker */}
                  <div style={{ textAlign:"center", fontSize:"6pt", fontWeight:400, fontFamily:'"Times New Roman",Times,serif', letterSpacing:"0.5px", color:"#555", borderTop:"1px solid #aaa", borderBottom:"1px solid #aaa", padding:"1px 0", margin:"4px 0 1px" }}>
                    {chunkIdx < chunks.length - 1
                      ? "—— CONTINUATION ON NEXT PAGE ——"
                      : "—— TRANSCRIPT CLOSED ——"}
                  </div>
                  {/* Note immediately below marker */}
                  <div style={{ marginTop:"3px", fontSize:"7.5pt", lineHeight:1.7, fontStyle:"italic", fontFamily:'"Times New Roman",Times,serif' }}>
                    Note: This transcript is considered original when it bears the dry embossed seal of the College and the original signature of the Registrar. Any erasure or alteration made on this copy renders the whole transcript invalid.
                  </div>
                  {renderPageFooter()}
                  {/* Grading system block — last page only */}
                  {chunkIdx === chunks.length - 1 && (
                    <div style={{ marginTop:"8px", fontFamily:'"Times New Roman",Times,serif' }}>
                      {/* Green full-width header */}
                      <div style={{ background:"#2c4a1e", color:"#fff", fontWeight:900, fontSize:"8pt", textTransform:"uppercase", textAlign:"center", letterSpacing:"1.5px", padding:"3px 6px", marginBottom:"6px" }}>Grading System</div>
                      <div style={{ fontSize:"7pt", lineHeight:1.7 }}>
                        1.00 Excellent;&nbsp; 1.25 Highly Outstanding;&nbsp; 1.50 Outstanding;&nbsp; 1.75 Very Good;&nbsp; 2.00 Good;&nbsp; 2.25 Very Satisfactory;&nbsp; 2.50 Satisfactory;&nbsp; 2.75 Fair;&nbsp; 3.00 Passing;&nbsp; 5.00 Failure;&nbsp; INC Incomplete;&nbsp; DR Dropped;&nbsp; Audit;&nbsp; US Unsatisfactory;&nbsp; In Progress
                      </div>
                      <div style={{ fontSize:"7pt", marginTop:"3px" }}>
                        <span style={{ fontWeight:700 }}>Credits: </span>1 unit of credit is 1 hour lecture or 3 hours laboratory each week for 1 semester of 18 weeks.
                      </div>
                      <div style={{ display:"flex", gap:"4px", alignItems:"baseline", marginTop:"1px", fontSize:"7pt" }}>
                        <span style={{ fontWeight:700, whiteSpace:"nowrap" }}>Remarks:</span>
                        <input ref={el => { if (el) el.scrollIntoView = () => {}; }}
                          style={{ flex:1, border:"none", borderBottom:"1px solid #555", outline:"none", fontSize:"7pt", fontFamily:'"Times New Roman",Times,serif', background:"transparent", padding:"0 2px" }} />
                      </div>
                      <div style={{ fontSize:"6pt", fontStyle:"italic", marginTop:"1px" }}>
                        Note:This transcript is considered original when it bears the dry embossed seal of the college and the original signature of the Registrar. Any erasure or alteration made on this copy renders the whole transcript invalid.
                      </div>
                    </div>
                  )}
                  {renderPageSignature(chunkIdx + 2)}
                </div>
              </div>
            ));
          })()}

          </div>

        </div>
        ,
        document.body
      )}


      {/* ── MODALS ── */}

      {/* Subject modal */}
      {showSubjectModal && createPortal(
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2147483647, isolation: "isolate" }}>
          <form onSubmit={handleSubjectSubmit} style={{ background: WHITE, borderRadius: "10px", width: "100%", maxWidth: "420px", padding: "20px", display: "flex", flexDirection: "column", gap: "12px", boxSizing: "border-box", overflow: "hidden" }}>
            <h3 style={{ margin: 0, color: DARK_GREEN, fontSize: "15px", fontWeight: 800 }}>{editingSubjectId ? "✏️ Edit Subject" : "➕ Add Subject"}</h3>
            {[["Subject Code *","subject_code","text","e.g. CR121"],["Subject Title *","subject_title","text","e.g. Criminal Law"]].map(([lbl,key,type,ph])=>(
              <div key={key} style={{ display:"flex",flexDirection:"column",gap:"4px" }}>
                <label style={{ fontSize:"11px",fontWeight:700,color:GRAY }}>{lbl}</label>
                <input type={type} value={subjectForm[key]} onChange={e=>setSubjectForm({...subjectForm,[key]:e.target.value})} required placeholder={ph} style={{ padding:"8px",border:`1px solid ${BORDER}`,borderRadius:"6px" }} />
              </div>
            ))}
            <div style={{ display:"flex",gap:"10px",width:"100%",boxSizing:"border-box" }}>
              <div style={{ display:"flex",flexDirection:"column",gap:"4px",flex:1,minWidth:0 }}>
                <label style={{ fontSize:"11px",fontWeight:700,color:GRAY }}>LEC Hours</label>
                <input type="number" min="0" value={subjectForm.lec_hours} onChange={e=>setSubjectForm({...subjectForm,lec_hours:e.target.value})} style={{ padding:"8px",border:`1px solid ${BORDER}`,borderRadius:"6px",width:"100%",boxSizing:"border-box" }} />
              </div>
              <div style={{ display:"flex",flexDirection:"column",gap:"4px",flex:1,minWidth:0 }}>
                <label style={{ fontSize:"11px",fontWeight:700,color:GRAY }}>LAB Hours</label>
                <input type="number" min="0" value={subjectForm.lab_hours} onChange={e=>setSubjectForm({...subjectForm,lab_hours:e.target.value})} style={{ padding:"8px",border:`1px solid ${BORDER}`,borderRadius:"6px",width:"100%",boxSizing:"border-box" }} />
              </div>
              <div style={{ display:"flex",flexDirection:"column",gap:"4px",flex:1,minWidth:0 }}>
                <label style={{ fontSize:"11px",fontWeight:700,color:GRAY }}>Credit Units *</label>
                <input type="number" min="0" value={subjectForm.units} onChange={e=>setSubjectForm({...subjectForm,units:e.target.value})} required style={{ padding:"8px",border:`1px solid ${BORDER}`,borderRadius:"6px",width:"100%",boxSizing:"border-box" }} />
              </div>
            </div>
            <div style={{ display:"flex",flexDirection:"column",gap:"4px" }}>
              <label style={{ fontSize:"11px",fontWeight:700,color:GRAY }}>Pre-Requisite</label>
              <input type="text" value={subjectForm.pre_requisite} onChange={e=>setSubjectForm({...subjectForm,pre_requisite:e.target.value})} placeholder="e.g. None or COMP1" style={{ padding:"8px",border:`1px solid ${BORDER}`,borderRadius:"6px" }} />
            </div>
            <div style={{ display:"flex",flexDirection:"column",gap:"4px" }}>
              <label style={{ fontSize:"11px",fontWeight:700,color:GRAY }}>Course *</label>
              <select value={subjectForm.course} onChange={e=>setSubjectForm({...subjectForm,course:e.target.value})} style={{ padding:"8px",border:`1px solid ${BORDER}`,borderRadius:"6px",background:WHITE }}>
                <option value="">— Select Course —</option>
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

      {showStudentModal && createPortal(
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2147483647, isolation: "isolate" }}>
          <form onSubmit={handleStudentSubmit} style={{ background: WHITE, borderRadius: "10px", width: "100%", maxWidth: "400px", padding: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <h3 style={{ margin: 0, color: DARK_GREEN, fontSize: "15px", fontWeight: 800 }}>{editingStudentId ? "Edit Student" : "Enroll New Student"}</h3>
            {[["First Name *","first_name"],["Middle Name","middle_name"],["Last Name *","last_name"],["Student Number","student_number"]].map(([lbl,key])=>(
              <div key={key} style={{ display:"flex",flexDirection:"column",gap:"4px" }}>
                <label style={{ fontSize:"11px",fontWeight:700,color:GRAY }}>{lbl}</label>
                <input type="text" value={studentForm[key]} onChange={e=>setStudentForm({...studentForm,[key]:e.target.value})} required={lbl.includes("*")} style={{ padding:"8px",border:`1px solid ${BORDER}`,borderRadius:"6px" }} />
              </div>
            ))}
            <div style={{ display:"flex",flexDirection:"column",gap:"4px" }}>
              <label style={{ fontSize:"11px",fontWeight:700,color:GRAY }}>Course *</label>
              <select value={studentForm.course} onChange={e=>setStudentForm({...studentForm,course:e.target.value})} style={{ padding:"8px",border:`1px solid ${BORDER}`,borderRadius:"6px",background:WHITE }}>
                {courses.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ display:"flex",flexDirection:"column",gap:"4px" }}>
              <label style={{ fontSize:"11px",fontWeight:700,color:GRAY }}>Sex *</label>
              <select value={studentForm.gender} onChange={e=>setStudentForm({...studentForm,gender:e.target.value})} style={{ padding:"8px",border:`1px solid ${BORDER}`,borderRadius:"6px",background:WHITE }}>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="LGBTQIA+">LGBTQIA+</option>
              </select>
            </div>
            <div style={{ display:"flex",gap:"10px" }}>
              <div style={{ display:"flex",flexDirection:"column",gap:"4px",flex:1 }}>
                <label style={{ fontSize:"11px",fontWeight:700,color:GRAY }}>Year Level *</label>
                <select value={studentForm.year_level} onChange={e=>setStudentForm({...studentForm,year_level:e.target.value})} style={{ padding:"8px",border:`1px solid ${BORDER}`,borderRadius:"6px",background:WHITE }}>
                  {YEAR_LEVELS.map(y=><option key={y} value={y}>{y}</option>)}
                </select>
              </div>

              <div style={{ display:"flex",flexDirection:"column",gap:"4px",flex:1 }}>
                <label style={{ fontSize:"11px",fontWeight:700,color:GRAY }}>Section</label>
                <select value={studentForm.section} onChange={e=>setStudentForm({...studentForm,section:e.target.value})} style={{ padding:"8px",border:`1px solid ${BORDER}`,borderRadius:"6px",background:WHITE }}>
                  <option value="">— None —</option>
                  {sections.map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display:"flex",gap:"8px",justifyContent:"flex-end",marginTop:"4px" }}>
              <button type="button" onClick={()=>setShowStudentModal(false)} style={{ padding:"8px 16px",border:`1px solid ${BORDER}`,borderRadius:"6px",background:WHITE,cursor:"pointer",fontSize:"13px" }}>Cancel</button>
              <button type="submit" style={{ padding:"8px 16px",background:DARK_GREEN,color:WHITE,border:"none",borderRadius:"6px",fontWeight:700,cursor:"pointer",fontSize:"13px" }}>
                {editingStudentId ? "Save Changes" : "Enroll"}
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}


      {studentQr && createPortal(
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2147483647, isolation: "isolate" }}>
          <div style={{ background: WHITE, borderRadius: "12px", width: "100%", maxWidth: "340px", padding: "24px", display: "flex", flexDirection: "column", alignItems: "center", gap: "14px", textAlign: "center" }}>
            <div style={{ fontSize: "28px" }}>✅</div>
            <h3 style={{ margin: 0, color: DARK_GREEN, fontSize: "15px", fontWeight: 800 }}>Student Enrolled</h3>
            <div style={{ fontSize: "12px", color: GRAY }}>Scan or print this QR code for the student's ID.</div>
            <img src={qrImageUrl(studentQr.payload, 200)} alt="Student QR code" width={200} height={200}
              style={{ border: `1px solid ${BORDER}`, borderRadius: "8px" }} />
            <div style={{ fontSize: "13px", fontWeight: 700, color: "#111827" }}>{studentQr.name}</div>
            <div style={{ fontSize: "12px", fontFamily: "monospace", color: BLUE }}>{studentQr.studentNumber || "—"}</div>
            <div style={{ display: "flex", gap: "8px", marginTop: "6px", width: "100%" }}>
              <button type="button" onClick={() => setStudentQr(null)}
                style={{ flex: 1, padding: "8px 14px", border: `1px solid ${BORDER}`, borderRadius: "6px", background: WHITE, cursor: "pointer", fontWeight: 600 }}>
                Close
              </button>
              <button type="button" onClick={() => { const w=window.open("","_blank"); w.document.write('<img src="' + qrImageUrl(studentQr.payload,300) + '" style="width:300px;height:300px;"/>'); w.print(); w.close(); }}
                style={{ flex: 1, padding: "8px 14px", border: "none", borderRadius: "6px", background: DARK_GREEN, color: WHITE, cursor: "pointer", fontWeight: 600 }}>
                Print QR
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// ── Records of Candidates for Graduation — printable form (8.5×13) ──
const CAND_GROUPS = ["Ia", "Ib", "Ic", "II", "III", "IV", "Va", "Vb", "PF"];
const CAND_LEGEND = [
  ["Ia", "General Courses"], ["Ib", "Elective Courses"], ["Ic", "Mandated Courses"],
  ["II", "Additional GE Courses"], ["III", "Physical Education"], ["IV", "ROTC"],
  ["Va", "Professional Courses - Core Courses"], ["Vb", "Professional Courses - Major Courses"],
  ["PF", "Pathfit"],
];

// ── Free Higher Education & Voluntary Contribution Form (Application Form) ──
function ApplicationForm({ student, onClose, inline = false }) {
  if (!student) return null;
  const full = (a, b, c) => [a, b, c].filter(Boolean).join(" ");
  const val = () => "" || " ";
  const cbox = (on) => <span style={{ display: "inline-block", width: 11, height: 11, border: "1px solid #000", borderRadius: "50%", marginRight: 4, lineHeight: "10px", textAlign: "center", fontSize: 8, verticalAlign: "middle" }}>{on ? "✓" : ""}</span>;
  const CELL = { border: "1px solid #000", padding: "3px 6px", fontSize: "8.5pt", verticalAlign: "top", fontFamily: '"Times New Roman", Times, serif' };
  const SUB = { fontSize: "6.5pt", color: "#333", fontStyle: "italic" };
  // Application Form prints BLANK — filled in by hand. Values below are empty.
  const age = "";
  const nameLGM = "";
  const addr = "";
  const fatherName = "";
  const motherName = "";
  const sq = (on) => <span style={{ display: "inline-block", width: 10, height: 10, border: "1px solid #000", margin: "0 2px 0 4px", verticalAlign: "middle", textAlign: "center", lineHeight: "9px", fontSize: 8 }}>{on ? "✓" : ""}</span>;
  const BAR = { background: "#3d6e01", color: "#fff", border: "1px solid #2d5201", fontWeight: 800, fontSize: "8.5pt", padding: "1px 6px", margin: "4px 0 2px" };
  const ROW = { display: "flex", alignItems: "flex-end", gap: 6, margin: "1px 0", fontSize: "8pt" };
  const FILL = { flex: 1, borderBottom: "1px solid #000", minHeight: "10px", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden" };
  const LBL = { whiteSpace: "nowrap" };
  const yl = student.year_level || "";       // used by hidden legacy markup
  const g = (student.gender || "").toLowerCase();

  const inner = (
    <div id="app-portal-root" style={inline
      ? { position: "relative", background: WHITE, display: "flex", flexDirection: "column", border: `1px solid ${BORDER}`, borderRadius: 10, overflow: "hidden", marginTop: 12 }
      : { position: "fixed", inset: 0, background: WHITE, zIndex: 2147483646, display: "flex", flexDirection: "column" }}>
      <div className="no-print" style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: DARK_GREEN, flexShrink: 0 }}>
        <span style={{ fontWeight: 800, fontSize: 13, color: WHITE }}>{student.last_name ? `${student.last_name}, ${student.first_name} — ` : ""}Enrollment Form</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          {!inline && <button type="button" onClick={onClose} style={{ padding: "7px 16px", background: "rgba(255,255,255,0.15)", border: "1.5px solid rgba(255,255,255,0.4)", borderRadius: 6, fontSize: 12, fontWeight: 600, color: WHITE, cursor: "pointer" }}>← Back</button>}
          <button type="button" onClick={() => {
            // Full-screen: #app-portal-root is already a body child → print directly.
            // Inline: it's nested, so clone it to <body> first (print CSS targets body > #app-portal-root).
            if (!inline) { window.print(); return; }
            const src = document.getElementById("app-portal-root");
            if (!src) { window.print(); return; }
            const clone = src.cloneNode(true);
            document.body.appendChild(clone);
            const cleanup = () => { if (document.body.contains(clone)) document.body.removeChild(clone); window.removeEventListener("afterprint", cleanup); };
            window.addEventListener("afterprint", cleanup);
            setTimeout(() => window.print(), 60);
          }} style={{ padding: "7px 20px", background: WHITE, color: DARK_GREEN, border: "none", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>🖨 Print </button>
        </div>
      </div>

      <div id="app-scroll" style={{ flex: 1, overflowY: "auto", background: "#e5e7eb", padding: "24px 16px" }}>
        <style>{`
          .app-fixed-footer { display: none; }
          @media print {
            @page { size: 8.5in 13in portrait; margin: 0; }
            html, body { background: #fff !important; height: auto !important; margin: 0 !important; padding: 0 !important; }
            body > * { display: none !important; }
            body > #app-portal-root { display: block !important; position: static !important; height: auto !important; overflow: visible !important; }
            #app-portal-root .no-print { display: none !important; }
            #app-scroll { position: static !important; overflow: visible !important; height: auto !important; background: #fff !important; padding: 0 !important; }
            #app-form-area { position: static !important; width: 100% !important; min-height: 0 !important; box-shadow: none !important; margin: 0 !important; padding: 0.3in 0.4in 0.5in !important; }
            .app-fixed-footer {
              display: flex !important; position: fixed; left: 0.4in; right: 0.4in; bottom: 0.08in;
              align-items: center; justify-content: center; gap: 16px;
              font-size: 7.5pt; font-family: 'Times New Roman', Times, serif; color: #333;
              border-top: 1px solid #999; padding-top: 3px;
              -webkit-print-color-adjust: exact; print-color-adjust: exact;
            }
            .app-fixed-footer .fi { display: inline-flex; align-items: center; gap: 5px; white-space: nowrap; }
            #app-form-area, #app-form-area * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            #app-form-area table { page-break-inside: auto; }
            #app-form-area tr { page-break-inside: avoid !important; }
            .app-page-break { break-before: page !important; page-break-before: always !important; }
            .awm-screen { display: none !important; }
            .awm-print { display: block !important; }
          }
        `}</style>

        <div id="app-form-area" style={{ position: "relative", width: "816px", minHeight: "1248px", margin: "0 auto", background: WHITE, padding: "24px 40px", boxSizing: "border-box", fontFamily: '"Times New Roman", Times, serif', fontSize: "9pt", color: "#000", boxShadow: "0 4px 24px rgba(0,0,0,0.18)" }}>

          {/* Watermark (screen): clipped to the sheet */}
          <div className="awm-screen" aria-hidden="true" style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: 0, pointerEvents: "none" }}>
            <img src={ccaLogo} alt="" style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 1000, height: 1000, objectFit: "contain", maxWidth: "none", opacity: 0.10 }} />
          </div>
          {/* Watermark (print only): fixed so it repeats on every page */}
          <div className="awm-print" aria-hidden="true" style={{ display: "none", position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 0, pointerEvents: "none" }}>
            <img src={ccaLogo} alt="" style={{ width: 1000, height: 1000, objectFit: "contain", maxWidth: "none", opacity: 0.10 }} />
          </div>

          {/* Fixed contact footer — repeats at the bottom of every printed page */}
          <div className="app-fixed-footer">
            <span className="fi"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/></svg>communitycollegeofalangalang@gmail.com</span>
            <span className="fi"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>09758876966</span>
            <span className="fi"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>communitycollegealangalang.com</span>
          </div>

          {/* Header (Transcript-of-Records style) */}
          <table style={{ width: "100%", borderCollapse: "collapse" }}><tbody><tr>
            <td style={{ width: 160, textAlign: "center", verticalAlign: "middle" }}>
              <img src={alangalangLogo} alt="" style={{ width: 65, height: 65, objectFit: "contain" }} />
            </td>
            <td style={{ textAlign: "center", verticalAlign: "middle" }}>
              <div style={{ fontSize: "12pt", fontFamily: '"Times New Roman",Times,serif' }}>Republic of the Philippines</div>
              <div style={{ fontSize: "15pt", fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.5, lineHeight: 1.1, whiteSpace: "nowrap" }}>Community College of Alangalang</div>
              <div style={{ fontSize: "12pt", fontFamily: '"Times New Roman",Times,serif' }}>Alangalang, Leyte</div>
              <div style={{ fontSize: "11pt", fontWeight: 800, marginTop: 5, letterSpacing: 0.5 }}>ENROLLMENT FORM</div>
            </td>
            <td style={{ width: 160, textAlign: "center", verticalAlign: "middle" }}>
              <img src={ccaLogo} alt="" style={{ width: 85, height: 85, objectFit: "contain" }} />
            </td>
          </tr></tbody></table>
          <div style={{ borderTop: "2px solid #000", margin: "6px 0 8px" }} />

          {/* ===================== PAGE 1 ===================== */}
          <div style={{ ...BAR, background: "#3d6e01", fontStyle: "italic", fontWeight: 700, fontSize: "7.5pt" }}>For Admission Processor Only</div>
          <div style={ROW}><span style={LBL}>Course Admitted to:</span><span style={FILL}></span></div>
          <div style={ROW}><span style={LBL}>Course Applied For: 1st Choice</span><span style={FILL}>{val(student.course)}</span><span style={{ ...LBL, flex: "0 0 82px" }}>Student Type:</span><span style={{ ...FILL, flex: "0 0 140px" }}></span></div>
          <div style={ROW}><span style={{ ...LBL, marginLeft: 96 }}>2nd Choice</span><span style={FILL}></span><span style={{ ...LBL, flex: "0 0 82px" }}>LRN:</span><span style={{ ...FILL, flex: "0 0 140px" }}></span></div>

          <div style={BAR}>Personal Information:</div>
          <div style={{ display: "flex", gap: 28 }}>
            <div style={{ flex: 1 }}>
              <div style={ROW}><span style={LBL}>Name:</span><span style={FILL}>{nameLGM.toUpperCase()}</span></div>
              <div style={{ ...SUB, textAlign: "center", marginBottom: 2 }}>(Last Name, Given Name Middle Name)</div>
              <div style={ROW}><span style={LBL}>Present Address:</span><span style={FILL}>{addr}</span></div>
              <div style={ROW}><span style={LBL}>Permanent Address:</span><span style={FILL}>{addr}</span></div>
              <div style={ROW}><span style={LBL}>Date of Birth:</span><span style={{ ...FILL, flex: "0 0 100px" }}>{val(student.birthdate)}</span><span style={LBL}>Age:</span><span style={{ ...FILL, flex: "0 0 34px" }}>{age}</span><span style={LBL}>Sex:</span><span style={{ ...FILL, flex: "0 0 50px" }}></span><span style={LBL}>Civil Status:</span><span style={{ ...FILL, flex: "0 0 55px" }}></span></div>
              <div style={ROW}><span style={LBL}>Place of Birth:</span><span style={FILL}>{val(student.place_of_birth)}</span></div>
              <div style={ROW}><span style={LBL}>Religion:</span><span style={FILL}>{val(student.religion)}</span><span style={LBL}>Nationality:</span><span style={FILL}>{val(student.citizenship)}</span></div>
              <div style={ROW}><span style={LBL}>Mobile Numbers:</span><span style={FILL}>{val(student.mobile)}</span><span style={LBL}>Email Add:</span><span style={FILL}>{val(student.email)}</span></div>
            </div>
            <div style={{ width: 150, height: 150, flexShrink: 0, marginTop: 7, border: "1px solid #000", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", fontSize: "7pt", padding: 4, boxSizing: "border-box" }}>PHOTO 2 X 2<br />White background, with NAME TAG</div>
          </div>

          <div style={BAR}>Family Background:</div>
          <div style={ROW}><span style={LBL}>Father's Name:</span><span style={FILL}>{fatherName.toUpperCase()}</span><span style={LBL}>Age:</span><span style={{ ...FILL, flex: "0 0 34px" }}></span><span style={LBL}>Birthplace:</span><span style={{ ...FILL, flex: "0 0 110px" }}></span></div>
          <div style={ROW}><span style={LBL}>Educational Attainment:</span><span style={FILL}></span><span style={LBL}>Contact Number:</span><span style={{ ...FILL, flex: "0 0 110px" }}></span></div>
          <div style={ROW}><span style={LBL}>Occupation:</span><span style={FILL}></span><span style={LBL}>Place of Work:</span><span style={{ ...FILL, flex: "0 0 130px" }}></span></div>
          <div style={ROW}><span style={LBL}>Living {sq(false)} Deceased {sq(false)}</span><span style={LBL}>Cause of Death:</span><span style={FILL}></span></div>
          <div style={ROW}><span style={LBL}>Living with the Family? Yes {sq(false)} No {sq(false)} Abroad {sq(false)} Separated {sq(false)}</span></div>
          <div style={ROW}><span style={LBL}>Mother's Name:</span><span style={FILL}>{motherName.toUpperCase()}</span><span style={LBL}>Age:</span><span style={{ ...FILL, flex: "0 0 34px" }}></span><span style={LBL}>Birthplace:</span><span style={{ ...FILL, flex: "0 0 110px" }}></span></div>
          <div style={ROW}><span style={LBL}>Educational Attainment:</span><span style={FILL}></span><span style={LBL}>Contact Number:</span><span style={{ ...FILL, flex: "0 0 110px" }}></span></div>
          <div style={ROW}><span style={LBL}>Occupation:</span><span style={FILL}></span><span style={LBL}>Place of Work:</span><span style={{ ...FILL, flex: "0 0 130px" }}></span></div>
          <div style={ROW}><span style={LBL}>Living {sq(false)} Deceased {sq(false)}</span><span style={LBL}>Cause of Death:</span><span style={FILL}></span></div>
          <div style={ROW}><span style={LBL}>Living with the Family? Yes {sq(false)} No {sq(false)} Abroad {sq(false)} Separated {sq(false)}</span></div>

          <div style={{ ...BAR, background: "#3d6e01", fontStyle: "italic", fontWeight: 700, fontSize: "7.5pt" }}>For Married Applicant Only</div>
          <div style={ROW}><span style={LBL}>Spouse's Name:</span><span style={FILL}></span><span style={LBL}>Age:</span><span style={{ ...FILL, flex: "0 0 34px" }}></span><span style={LBL}>Birthplace:</span><span style={{ ...FILL, flex: "0 0 110px" }}></span></div>
          <div style={ROW}><span style={LBL}>Educational Attainment:</span><span style={FILL}></span><span style={LBL}>Contact Number:</span><span style={{ ...FILL, flex: "0 0 110px" }}></span></div>
          <div style={ROW}><span style={LBL}>Occupation:</span><span style={FILL}></span><span style={LBL}>Place of Work:</span><span style={{ ...FILL, flex: "0 0 130px" }}></span></div>
          <div style={ROW}><span style={LBL}>Living {sq(false)} Deceased {sq(false)}</span><span style={LBL}>Cause of Death:</span><span style={FILL}></span></div>
          <div style={ROW}><span style={LBL}>Living with the Family? Yes {sq(false)} No {sq(false)} Abroad {sq(false)} Separated {sq(false)}</span></div>
          <div style={ROW}><span style={LBL}>Number of Dependents/Children:</span><span style={FILL}></span></div>

          <div style={ROW}><span style={LBL}>Birth Order: Only Child {sq(false)} Eldest {sq(false)} Middle {sq(false)} Youngest {sq(false)} Others:</span><span style={FILL}></span></div>
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 4, fontSize: "7.5pt" }}><tbody>
            <tr>
              <th style={{ ...CELL, background: "#3d6e01", color: "#fff", textAlign: "left", width: "40%" }}>Name of Siblings (Eldest to Youngest)</th>
              <th style={{ ...CELL, background: "#3d6e01", color: "#fff", width: 34 }}>Age</th>
              <th style={{ ...CELL, background: "#3d6e01", color: "#fff", width: 46 }}>Sex (M/F)</th>
              <th style={{ ...CELL, background: "#3d6e01", color: "#fff", width: 70 }}>Civil Status</th>
              <th style={{ ...CELL, background: "#3d6e01", color: "#fff" }}>Educational Attainment</th>
            </tr>
            {[0, 1, 2, 3].map(i => <tr key={i}><td style={{ ...CELL, height: 13 }}></td><td style={CELL}></td><td style={CELL}></td><td style={CELL}></td><td style={CELL}></td></tr>)}
          </tbody></table>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: "7pt", fontStyle: "italic" }}><span>Continued on page 2</span><span>Date Printed: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })} &nbsp; Page 1 of 2</span></div>

          {/* ===================== PAGE 2 ===================== */}
          <div className="app-page-break" style={{ marginTop: 20 }} />
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "7.5pt" }}><tbody>
            <tr>
              <th style={{ ...CELL, background: "#3d6e01", color: "#fff", textAlign: "left", width: "40%" }}>Name of Siblings (Eldest to Youngest)</th>
              <th style={{ ...CELL, background: "#3d6e01", color: "#fff", width: 34 }}>Age</th>
              <th style={{ ...CELL, background: "#3d6e01", color: "#fff", width: 46 }}>Sex (M/F)</th>
              <th style={{ ...CELL, background: "#3d6e01", color: "#fff", width: 70 }}>Civil Status</th>
              <th style={{ ...CELL, background: "#3d6e01", color: "#fff" }}>Educational Attainment</th>
            </tr>
            {[0, 1, 2, 3].map(i => <tr key={i}><td style={{ ...CELL, height: 13 }}></td><td style={CELL}></td><td style={CELL}></td><td style={CELL}></td><td style={CELL}></td></tr>)}
          </tbody></table>

          <div style={ROW}><span style={LBL}>Housing Condition: {sq(false)} Owned {sq(false)} Rented {sq(false)} Shared with grandparents or relatives {sq(false)} Rent to Own</span></div>
          <div style={ROW}><span style={LBL}>Family's Monthly Income:</span><span style={FILL}></span></div>
          <div style={ROW}><span style={LBL}>Language / Dialect spoken at home:</span><span style={FILL}></span></div>

          <div style={BAR}>Educational Background:</div>
          <div style={{ fontWeight: 700, fontSize: "8pt", marginTop: 2 }}>Elementary</div>
          <div style={ROW}><span style={LBL}>Name of School</span><span style={FILL}></span><span style={LBL}>Year Graduated</span><span style={{ ...FILL, flex: "0 0 78px" }}></span></div>
          <div style={ROW}><span style={LBL}>Address</span><span style={FILL}></span><span style={LBL}>Awards / Honor</span><span style={{ ...FILL, flex: "0 0 120px" }}></span></div>
          <div style={{ fontWeight: 700, fontSize: "8pt", marginTop: 2 }}>Junior High School</div>
          <div style={ROW}><span style={LBL}>Name of School</span><span style={FILL}></span><span style={LBL}>Year Graduated</span><span style={{ ...FILL, flex: "0 0 78px" }}></span></div>
          <div style={ROW}><span style={LBL}>Address</span><span style={FILL}></span><span style={LBL}>Awards / Honor</span><span style={{ ...FILL, flex: "0 0 120px" }}></span></div>
          <div style={{ fontWeight: 700, fontSize: "8pt", marginTop: 2 }}>Senior High School</div>
          <div style={ROW}><span style={LBL}>Name of School</span><span style={FILL}></span><span style={LBL}>Year Graduated</span><span style={{ ...FILL, flex: "0 0 78px" }}></span></div>
          <div style={ROW}><span style={LBL}>Address</span><span style={FILL}></span><span style={LBL}>Awards / Honor</span><span style={{ ...FILL, flex: "0 0 120px" }}></span></div>
          <div style={ROW}><span style={LBL}>Track and Strand</span><span style={FILL}></span><span style={LBL}>GWA G11</span><span style={{ ...FILL, flex: "0 0 56px" }}></span><span style={LBL}>G12</span><span style={{ ...FILL, flex: "0 0 56px" }}></span></div>
          <div style={{ fontWeight: 700, fontSize: "8pt", marginTop: 2 }}>College (For Transferee / Second Courser)</div>
          <div style={ROW}><span style={LBL}>Name of School</span><span style={FILL}></span><span style={LBL}>Inclusive Year/s</span><span style={{ ...FILL, flex: "0 0 90px" }}></span></div>
          <div style={ROW}><span style={LBL}>Address</span><span style={FILL}></span><span style={LBL}>Awards / Honor</span><span style={{ ...FILL, flex: "0 0 120px" }}></span></div>
          <div style={ROW}><span style={LBL}>Course</span><span style={FILL}></span><span style={LBL}>GWA</span><span style={{ ...FILL, flex: "0 0 70px" }}></span></div>

          <div style={ROW}><span style={LBL}>Are you the first person in your family to attend college? No {sq(false)} Yes {sq(false)}</span></div>
          <div style={ROW}><span style={LBL}>How many members of your family had attended college?</span><span style={FILL}></span></div>
          <div style={{ fontSize: "8pt", margin: "3px 0" }}>How do you see yourself five years after graduation?</div>
          <div style={{ borderBottom: "1px solid #000", minHeight: 13, margin: "9px 0" }}></div>
          <div style={{ borderBottom: "1px solid #000", minHeight: 13, margin: "9px 0" }}></div>

          <div style={BAR}>Health Conditions:</div>
          <div style={ROW}><span style={LBL}>Are you a Person With Disability (PWD)? If yes, kindly specify. No {sq(false)} Yes {sq(false)}</span><span style={FILL}></span></div>
          <div style={ROW}><span style={LBL}>Have you ever been hospitalized? If yes, for what reason? No {sq(false)} Yes {sq(false)}</span><span style={FILL}></span></div>
          <div style={ROW}><span style={LBL}>In case of emergency, please contact</span><span style={FILL}></span><span style={LBL}>Relation:</span><span style={{ ...FILL, flex: "0 0 100px" }}></span></div>
          <div style={ROW}><span style={LBL}>Address:</span><span style={FILL}></span><span style={LBL}>Contact No.:</span><span style={{ ...FILL, flex: "0 0 110px" }}></span></div>

          <div style={{ fontSize: "8pt", marginTop: 12 }}>I hereby certify that the above information is true and correct.</div>
          <div style={{ ...ROW, marginTop: 26 }}><span style={LBL}>Signature:</span><span style={FILL}></span><span style={LBL}>Date:</span><span style={{ ...FILL, flex: "0 0 120px" }}></span></div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6, fontSize: "7pt", fontStyle: "italic" }}><span>Date Printed: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })} &nbsp; Page 2 of 2</span></div>

          {/* --- legacy body kept hidden (never rendered) --- */}
          <div style={{ display: "none" }} aria-hidden="true">
          <table><tbody>
            <tr>
              <td style={CELL}><div style={SUB}>Year Level</div>{cbox(yl.includes("1st"))}1st {cbox(yl.includes("2nd"))}2nd {cbox(yl.includes("3rd"))}3rd {cbox(yl.includes("4th"))}4th {cbox(yl.includes("5th"))}5th</td>
              <td style={CELL}><div style={SUB}>Student Number</div><b>{val(student.student_number)}</b></td>
              <td style={CELL}><div style={SUB}>Year / Course</div><b>{val(student.course)}</b></td>
              <td style={CELL}><div style={SUB}>Learner Reference No.</div>&nbsp;</td>
            </tr>
            <tr>
              <td style={CELL} colSpan={2}><div style={SUB}>Name (Last, First, Middle)</div><b>{full(student.last_name, student.first_name, student.middle_name).toUpperCase() || " "}</b></td>
              <td style={CELL}><div style={SUB}>Semester &amp; S.Y.</div>&nbsp;</td>
              <td style={CELL}><div style={SUB}>Date of Birth</div><b>{val(student.birthdate)}</b></td>
            </tr>
            <tr>
              <td style={CELL}><div style={SUB}>Sex</div>{cbox(g === "male")}Male &nbsp;{cbox(g === "female")}Female</td>
              <td style={CELL}><div style={SUB}>Place of Birth</div><b>{val(student.place_of_birth)}</b></td>
              <td style={CELL}><div style={SUB}>Civil Status</div>{cbox(false)}Single {cbox(false)}Married {cbox(false)}Widowed</td>
              <td style={CELL}><div style={SUB}>No. of Academic Units</div>&nbsp;</td>
            </tr>
            <tr>
              <td style={CELL}><div style={SUB}>Citizenship</div><b>{val(student.citizenship || "Filipino")}</b></td>
              <td style={CELL}><div style={SUB}>Type of Disability (if any)</div>&nbsp;</td>
              <td style={CELL} colSpan={2}><div style={SUB}>Indigenous People Affiliation (if any)</div>&nbsp;</td>
            </tr>
            <tr>
              <td style={CELL} colSpan={2}><div style={SUB}>Mobile Number</div><b>{val(student.mobile)}</b></td>
              <td style={CELL} colSpan={2}><div style={SUB}>E-Mail Address</div><b>{val(student.email)}</b></td>
            </tr>
            <tr><td style={CELL} colSpan={4}><div style={SUB}>Father's Name (Last, First, Middle)</div><b>{full(student.father_last, student.father_first, student.father_middle).toUpperCase() || " "}</b></td></tr>
            <tr><td style={CELL} colSpan={4}><div style={SUB}>Mother's Maiden Name (Last, First, Middle)</div><b>{full(student.mother_last, student.mother_first, student.mother_middle).toUpperCase() || " "}</b></td></tr>
            <tr>
              <td style={CELL} colSpan={2}><div style={SUB}>Permanent Address (Barangay)</div><b>{val(student.barangay)}</b></td>
              <td style={CELL}><div style={SUB}>City / Municipality</div><b>{val(student.municipality)}</b></td>
              <td style={CELL}><div style={SUB}>Province / Zip</div><b>{[student.province, student.zip_code].filter(Boolean).join(" ") || " "}</b></td>
            </tr>
            <tr><td style={CELL} colSpan={4}><div style={SUB}>Parent/Guardian Mobile Number</div><b>{val(student.parents_mobile || student.guardian_mobile)}</b></td></tr>
          </tbody></table>

          {/* Certification */}
          <div style={{ fontSize: "8pt", lineHeight: 1.5, marginTop: 8, textAlign: "justify" }}>
            <p style={{ margin: "0 0 6px", textIndent: 24 }}>By signing below, I CERTIFY that the above information are correct and true and that I give my consent to the collection and processing of my personal data in accordance with the needs and requirements of the college.</p>
            <p style={{ margin: "0 0 6px", textIndent: 24 }}>I CERTIFY FURTHER that I am cognizant of and aware of the provisions in RA 10931 (Universal Access to Quality Tertiary Education Act) and all the benefits and responsibilities under the Act. I voluntarily avail of the Free Higher Education benefits and privileges and abide with the return service obligation inherent thereto.</p>
            <div style={{ margin: "6px 0" }}>{cbox(false)} I am voluntarily contributing an amount of ________ (Php ____) for the academic period ________.</div>
            <div style={{ margin: "6px 0" }}>{cbox(false)} I am not having my voluntary contribution for the academic period ________.</div>
          </div>

          {/* Conforme */}
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 14, fontSize: "8pt" }}><tbody>
            <tr>
              <td style={{ width: 80, verticalAlign: "bottom" }}>Conforme:</td>
              <td style={{ verticalAlign: "bottom", padding: "0 20px" }}>
                <div style={{ borderBottom: "1px solid #000", textAlign: "center", fontWeight: 700, paddingTop: 14 }}>{full(student.first_name, student.middle_name, student.last_name).toUpperCase()}</div>
                <div style={{ textAlign: "center", ...SUB }}>Name and Signature of Student</div>
              </td>
              <td style={{ verticalAlign: "bottom", width: 150 }}>
                <div style={{ borderBottom: "1px solid #000", paddingTop: 14 }}>&nbsp;</div>
                <div style={{ textAlign: "center", ...SUB }}>Date Signed</div>
              </td>
            </tr>
            <tr>
              <td />
              <td style={{ verticalAlign: "bottom", padding: "16px 20px 0" }}>
                <div style={{ borderBottom: "1px solid #000", paddingTop: 14 }}>&nbsp;</div>
                <div style={{ textAlign: "center", ...SUB }}>Name and Signature of Parent/Guardian</div>
              </td>
              <td style={{ verticalAlign: "bottom", width: 150 }}>
                <div style={{ borderBottom: "1px solid #000", paddingTop: 14 }}>&nbsp;</div>
                <div style={{ textAlign: "center", ...SUB }}>Date Signed</div>
              </td>
            </tr>
          </tbody></table>

          <div style={{ fontSize: "8pt", marginTop: 12 }}>Subscribed and sworn to before me this ____ day of __________ for purposes of availing the Free Higher Education.</div>
          <div style={{ fontSize: "8pt", marginTop: 10 }}>ID No.: <b>{val(student.student_number)}</b></div>

          {/* Issued by */}
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 18, fontSize: "8pt" }}><tbody>
            <tr>
              <td style={{ width: 80 }}>Issued by:</td>
              <td style={{ padding: "0 20px" }}>
                <div style={{ borderBottom: "1px solid #000", textAlign: "center", fontWeight: 700, paddingTop: 12 }}>&nbsp;</div>
                <div style={{ textAlign: "center", ...SUB }}>Admission Officer</div>
              </td>
              <td>
                <div style={{ borderBottom: "1px solid #000", textAlign: "center", fontWeight: 700, paddingTop: 12 }}>&nbsp;</div>
                <div style={{ textAlign: "center", ...SUB }}>Administering Officer</div>
              </td>
            </tr>
            <tr><td style={{ paddingTop: 8 }}>Issued at:</td><td style={{ paddingTop: 8, fontWeight: 700 }} colSpan={2}>COMMUNITY COLLEGE OF ALANGALANG</td></tr>
          </tbody></table>

          {/* Acknowledgment */}
          <div style={{ textAlign: "center", fontWeight: 800, letterSpacing: 1, marginTop: 16, fontSize: "9pt" }}>ACKNOWLEDGMENT</div>
          <div style={{ borderTop: "1px solid #000", marginTop: 2 }} />
          <div style={{ fontSize: "8pt", marginTop: 8 }}>This is to acknowledge receipt of the Free Higher Education and Voluntary Contribution form of <b>{full(student.first_name, student.middle_name, student.last_name)}</b>.</div>
          <div style={{ marginTop: 34 }}>
            <div style={{ display: "inline-block", textAlign: "center" }}>
              <div style={{ borderTop: "1px solid #000", width: 260, fontWeight: 800, paddingTop: 2 }}>CAMILLE KESSEY E. RELATORRES, MICB</div>
              <div style={SUB}>Registrar</div>
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
  return inline ? inner : createPortal(inner, document.body);
}

const FOLIO_PAGE_PX = 1181; // printable height of an 8.5x13 page (13in - 0.7in margins @96dpi)

function CandidateGradForm({ student, grades, user = {}, signName = "", onClose, inline = false }) {
  const areaRef = useRef(null);
  const [pageCount, setPageCount] = useState(1);
  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const measure = () => setPageCount(Math.max(1, Math.ceil((el.scrollHeight - 60) / FOLIO_PAGE_PX)));
    measure();
    const t = setTimeout(measure, 350); // re-measure after fonts/images settle
    return () => clearTimeout(t);
  }, [student, grades]);

  if (!student) return null;

  const groups = {};
  (grades || []).forEach(g => {
    const key = `${g.year_start}|${g.semester}`;
    if (!groups[key]) groups[key] = { year_start: parseInt(g.year_start) || 0, semester: parseInt(g.semester) || 0, rows: [] };
    groups[key].rows.push(g);
  });
  const orderedKeys = Object.keys(groups).sort((a, b) =>
    (groups[a].year_start - groups[b].year_start) || (groups[a].semester - groups[b].semester)
  );

  const fullName = `${student.first_name || ""} ${student.middle_name || ""} ${student.last_name || ""}`.replace(/\s+/g, " ").trim();
  const age = student.birthdate ? Math.floor((Date.now() - new Date(student.birthdate)) / (365.25 * 864e5)) : "";
  const guardian = student.guardian_name
    || [student.father_first, student.father_middle, student.father_last].filter(Boolean).join(" ")
    || [student.mother_first, student.mother_middle, student.mother_last].filter(Boolean).join(" ") || "";
  const address = [student.barangay, student.municipality, student.province].filter(Boolean).join(", ");
  const semLabel = (n) => n === 1 ? "1st Sem" : n === 2 ? "2nd Sem" : `Sem ${n}`;

  // Signatory: registrar/administrator sign with their own name; registrar_staff (and
  // anyone else) sign with the actual Registrar's name passed in via signName.
  const loggedName = [user.first_name, user.middle_name, user.last_name].filter(Boolean).join(" ").trim();
  const canSign = user.role === "registrar" || user.role === "administrator";
  const registrarName = (signName && signName.trim())
    ? signName.trim()
    : (canSign && (loggedName || user.username))
      ? (loggedName || user.username)
      : "CAMILLE KESSEY E. RELATORRES";

  const grandTotals = {}; CAND_GROUPS.forEach(g => grandTotals[g] = 0);
  let grandCredits = 0;

  // Resolve a subject's classification (its "description") to a group code (Ia..Vb),
  // accepting either the code itself or the full label, with loose spacing/case.
  const normLabel = (v) => (v || "").toLowerCase().replace(/\s*-\s*/g, "-").replace(/\s+/g, " ").trim();
  const resolveGroup = (raw) => {
    const v = (raw || "").trim();
    if (!v) return null;
    if (CAND_GROUPS.includes(v)) return v;
    const n = normLabel(v);
    for (const [code, label] of CAND_LEGEND) {
      if (normLabel(label) === n || code.toLowerCase() === v.toLowerCase()) return code;
    }
    return null;
  };

  // Build one <tr> group per semester block
  const semBlocks = orderedKeys.map(k => {
    const grp = groups[k];
    const semTotals = {}; CAND_GROUPS.forEach(g => semTotals[g] = 0);
    let semCredits = 0;
    const rows = [];
    rows.push(
      <tr key={k + "-h"}><td className="cf-sem" colSpan={3 + CAND_GROUPS.length}>{semLabel(grp.semester)} {grp.year_start}-{grp.year_start + 1} — {(student.course || "").toUpperCase()}</td></tr>
    );
    grp.rows.forEach((r, ri) => {
      const credits = parseInt(r.units) || 0;
      const cc = resolveGroup(r.class_code);
      semCredits += credits; grandCredits += credits;
      if (cc) { semTotals[cc] += credits; grandTotals[cc] += credits; }
      rows.push(
        <tr key={k + "-" + ri}>
          <td className="cf-td">{r.subject_code ? r.subject_code + "  " : ""}{r.subject_title}</td>
          <td className="cf-td" style={{ textAlign: "center" }}>{r.grade ?? ""}</td>
          <td className="cf-td" style={{ textAlign: "center" }}>{credits || ""}</td>
          {CAND_GROUPS.map(g => <td key={g} className="cf-td" style={{ textAlign: "center" }}>{cc === g ? credits : ""}</td>)}
        </tr>
      );
    });
    rows.push(
      <tr key={k + "-s"} style={{ background: "#fff" }}>
        <td className="cf-td" style={{ textAlign: "right", fontWeight: 700 }}>Sub-total</td>
        <td className="cf-td" />
        <td className="cf-td" style={{ textAlign: "center", fontWeight: 700 }}>{semCredits || ""}</td>
        {CAND_GROUPS.map(g => <td key={g} className="cf-td" />)}
      </tr>
    );
    return rows;
  });

  const Field = ({ label, value, min = 130 }) => (
    <span style={{ display: "inline-flex", alignItems: "baseline", gap: 4, marginRight: 16, marginBottom: 3 }}>
      <span style={{ fontSize: "7.5pt", color: "#333" }}>{label}:</span>
      <span style={{ borderBottom: "1px solid #000", minWidth: min, display: "inline-block", padding: "0 4px", fontWeight: 600, fontSize: "8.5pt" }}>{value || " "}</span>
    </span>
  );

  const inner = (
    <div id="cand-portal-root" style={inline
      ? { position: "relative", flex: 1, minHeight: 0, background: WHITE, display: "flex", flexDirection: "column" }
      : { position: "fixed", inset: 0, background: WHITE, zIndex: 2147483646, display: "flex", flexDirection: "column" }}>
      {/* Toolbar (full-screen only) */}
      {!inline && (
      <div className="no-print" style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: DARK_GREEN, flexShrink: 0 }}>
        <span style={{ fontWeight: 800, fontSize: 13, color: WHITE }}>{student.last_name}, {student.first_name} — Records of Candidates for Graduation</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button type="button" onClick={onClose} style={{ padding: "7px 16px", background: "rgba(255,255,255,0.15)", border: "1.5px solid rgba(255,255,255,0.4)", borderRadius: 6, fontSize: 12, fontWeight: 600, color: WHITE, cursor: "pointer" }}>← Back</button>
          <button type="button" onClick={() => window.print()} style={{ padding: "7px 20px", background: WHITE, color: DARK_GREEN, border: "none", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>🖨 Print </button>
        </div>
      </div>
      )}

      <div id="cand-scroll" style={{ flex: 1, overflowY: "auto", background: "#e5e7eb", padding: "24px 16px" }}>
        <style>{`
          @media print {
            @page { size: 8.5in 13in portrait; margin: 0.35in; }
            html, body { background: #fff !important; height: auto !important; margin: 0 !important; padding: 0 !important; }
            /* Hide everything except the form portal so there is no leading/trailing blank space */
            body > * { display: none !important; }
            body > #cand-portal-root { display: block !important; position: static !important; height: auto !important; overflow: visible !important; }
            #cand-portal-root .no-print { display: none !important; }
            #cand-scroll { position: static !important; overflow: visible !important; height: auto !important; background: #fff !important; padding: 0 !important; }
            #cand-form-area { position: static !important; width: 100% !important; min-height: 0 !important; box-shadow: none !important; margin: 0 !important; padding: 0 !important; overflow: visible !important; }
            .wm-screen { display: none !important; }
            .wm-print { display: block !important; }
            #cand-form-area, #cand-form-area * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            #cand-form-area table { page-break-inside: auto; }
            #cand-form-area thead { display: table-row-group !important; }
            #cand-form-area tr { page-break-inside: avoid !important; }
            .cf-block { page-break-inside: avoid !important; break-inside: avoid !important; }
          }
          .cf-td  { border: 1px solid #333; padding: 1px 4px; font-size: 8pt; font-family: "Times New Roman", Times, serif; vertical-align: top; }
          .cf-th  { border: 1px solid #333; padding: 2px 4px; font-size: 7pt; font-weight: 700; text-align: center; background: #3d6e01; color: #fff; font-family: "Times New Roman", Times, serif; }
          .cf-sem { border: 1px solid #333; background: #fff; font-weight: 700; font-size: 8pt; padding: 2px 4px; font-family: "Times New Roman", Times, serif; }
        `}</style>

        <div ref={areaRef} id="cand-form-area" style={{ position: "relative", width: "816px", minHeight: "1056px", margin: "0 auto", background: WHITE, padding: "30px 42px", boxSizing: "border-box", fontFamily: '"Times New Roman", Times, serif', fontSize: "9pt", color: "#000", boxShadow: "0 4px 24px rgba(0,0,0,0.18)" }}>

          {/* Folio page-cut guides (screen only) */}
          {Array.from({ length: Math.max(0, pageCount - 1) }).map((_, i) => (
            <div key={i} className="no-print" aria-hidden="true"
              style={{ position: "absolute", left: 0, right: 0, top: 30 + (i + 1) * FOLIO_PAGE_PX, borderTop: "2px dashed #d62828", pointerEvents: "none", zIndex: 5 }}>
              <span style={{ position: "absolute", right: 8, top: 0, transform: "translateY(-50%)", fontSize: "10px", fontWeight: 800, color: "#fff", background: "#d62828", padding: "1px 8px", borderRadius: "4px", whiteSpace: "nowrap" }}>✂ Folio page {i + 2}</span>
            </div>
          ))}

          {/* Watermark (screen): clipped to the sheet so it never touches the nav/margins */}
          <div className="wm-screen" aria-hidden="true" style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: 0, pointerEvents: "none" }}>
            <img src={ccaLogo} alt="" style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 1000, height: 1000, objectFit: "contain", maxWidth: "none", opacity: 0.10 }} />
          </div>
          {/* Watermark (print only): fixed so it repeats on every page without clipping content */}
          <div className="wm-print" aria-hidden="true" style={{ display: "none", position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 0, pointerEvents: "none" }}>
            <img src={ccaLogo} alt="" style={{ width: 1000, height: 1000, objectFit: "contain", maxWidth: "none", opacity: 0.10 }} />
          </div>

          {/* Header */}
          <table style={{ width: "100%", borderCollapse: "collapse" }}><tbody><tr>
            <td style={{ width: 160, textAlign: "center", verticalAlign: "middle" }}>
              <img src={alangalangLogo} alt="" style={{ width: 65, height: 65, objectFit: "contain" }} />
            </td>
            <td style={{ textAlign: "center", verticalAlign: "middle" }}>
              <div style={{ fontSize: "12pt" }}>Republic of the Philippines</div>
              <div style={{ fontSize: "15pt", fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.5, lineHeight: 1.1, whiteSpace: "nowrap" }}>Community College of Alangalang</div>
              <div style={{ fontSize: "12pt" }}>Alangalang, Leyte</div>
              <div style={{ fontSize: "15pt", fontWeight: 800, marginTop: 6, letterSpacing: 0.5, whiteSpace: "nowrap" }}>RECORDS OF CANDIDATES FOR GRADUATION</div>
              <div style={{ fontSize: "8pt", fontStyle: "italic" }}>College Department</div>
            </td>
            <td style={{ width: 160, textAlign: "center", verticalAlign: "middle" }}>
              <img src={ccaLogo} alt="" style={{ width: 85, height: 85, objectFit: "contain" }} />
            </td>
          </tr></tbody></table>
          <div style={{ borderTop: "2px solid #000", margin: "6px 0 8px" }} />

          {/* Personal info */}
          <div style={{ lineHeight: 1.9 }}>
            <Field label="Name of Candidate" value={fullName.toUpperCase()} min={260} />
            <Field label="Sex" value={student.gender} min={70} />
            <br />
            <Field label="Date of Birth" value={student.birthdate || ""} min={130} />
            <Field label="Age" value={age} min={40} />
            <Field label="Place of Birth" value={student.place_of_birth} min={200} />
            <br />
            <Field label="Parent/Guardian" value={guardian} min={230} />
            <Field label="Address" value={address} min={250} />
          </div>

          {/* Preliminary education */}
          <div style={{ textAlign: "center", fontWeight: 700, fontSize: "8pt", background: "#3d6e01", color: "#fff", border: "1px solid #333", padding: "1px 0", margin: "8px 0 4px" }}>RECORD OF PRELIMINARY EDUCATION</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}><tbody>
            <tr>
              <td className="cf-td" style={{ width: "50%" }}>
                <div style={{ fontWeight: 700, fontSize: "7.5pt" }}>ELEMENTARY — Course Completed</div>
                <div>{student.elem_school || " "}</div>
                <div style={{ fontSize: "7.5pt", color: "#333" }}>{[student.elem_address, student.elem_year].filter(Boolean).join(" · ")}</div>
              </td>
              <td className="cf-td" style={{ width: "50%" }}>
                <div style={{ fontWeight: 700, fontSize: "7.5pt" }}>HIGH SCHOOL — Course Completed</div>
                <div>{student.hs_school || " "}</div>
                <div style={{ fontSize: "7.5pt", color: "#333" }}>{[student.hs_address, student.hs_year].filter(Boolean).join(" · ")}</div>
              </td>
            </tr>
          </tbody></table>

          {/* Degree / graduation */}
          <div style={{ marginTop: 8, lineHeight: 1.9 }}>
            <Field label="Candidate for the Degree" value={(student.course || "").toUpperCase()} min={300} />
            <Field label="Date of Graduation" value="" min={150} />
          </div>

          {/* College record — single table; header auto-repeats each printed page,
              and each semester block is kept whole (never split across pages). */}
          <div style={{ textAlign: "center", fontWeight: 800, fontSize: "9pt", margin: "8px 0 3px", letterSpacing: 1 }}>COLLEGE RECORD</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ display: "table-row-group" }}>
              <tr>
                <th className="cf-th" rowSpan={2} style={{ textAlign: "left", verticalAlign: "middle" }}>NUMBER AND DESCRIPTIVE TITLE</th>
                <th className="cf-th" rowSpan={2} style={{ width: 34, verticalAlign: "middle" }}>Rating</th>
                <th className="cf-th" rowSpan={2} style={{ width: 34, verticalAlign: "middle" }}>Credits</th>
                <th className="cf-th" colSpan={CAND_GROUPS.length}>CREDITS BY GROUP</th>
              </tr>
              <tr>
                {CAND_GROUPS.map(g => <th key={g} className="cf-th" style={{ width: 22 }}>{g}</th>)}
              </tr>
            </thead>
            {semBlocks.length === 0 ? (
              <tbody><tr><td className="cf-td" colSpan={3 + CAND_GROUPS.length} style={{ textAlign: "center", padding: 12 }}>No academic records found for this student.</td></tr></tbody>
            ) : (
              <>
                {semBlocks.map((block, bi) => (
                  <tbody key={bi} className="cf-block">{block}</tbody>
                ))}
                <tbody>
                  <tr style={{ background: "#fff" }}>
                    <td className="cf-td" style={{ textAlign: "right", fontWeight: 800 }}>TOTAL</td>
                    <td className="cf-td" />
                    <td className="cf-td" style={{ textAlign: "center", fontWeight: 800 }}>{grandCredits || ""}</td>
                    {CAND_GROUPS.map(g => <td key={g} className="cf-td" style={{ textAlign: "center", fontWeight: 800 }}>{grandTotals[g] || ""}</td>)}
                  </tr>
                </tbody>
              </>
            )}
          </table>

          {/* Registrar certification footer */}
          <div style={{ marginTop: 16, fontSize: "8.5pt" }}>
            <div style={{ textAlign: "center", fontWeight: 800, letterSpacing: 1, marginBottom: 8 }}>CERTIFICATE OF THE REGISTRAR</div>
            <div style={{ lineHeight: 1.9, textAlign: "justify" }}>
              <span style={{ marginLeft: 30 }}>I hereby certify that the foregoing records of </span>
              <span style={{ borderBottom: "1px solid #000", fontWeight: 700, padding: "0 50px" }}>{fullName.toUpperCase()}</span>
              <span> have been verified by me, and that true copies of the official records substantiating the same are kept in the files of our school; also certify that this student has enrolled in this institution on (date) </span>
              <span style={{ borderBottom: "1px solid #000", fontWeight: 700, padding: "0 12px" }}>{student.year_enrolled ? `${new Date().toLocaleString("en-US", { month: "long" })} ${student.year_enrolled}` : "     "}</span>
              <span> of the current school year.</span>
            </div>

            {/* Two-column block: date + legend (left), registrar + units (right) */}
            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 22, tableLayout: "fixed" }}><tbody>
              <tr>
                <td style={{ width: "50%", verticalAlign: "bottom", paddingRight: 20 }}>
                  <div style={{ borderBottom: "1px solid #000", width: 210, textAlign: "center", fontWeight: 600, marginLeft: 10 }}>
                    {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                  </div>
                  <div style={{ width: 210, textAlign: "center", fontSize: "7.5pt", marginLeft: 10 }}>(date)</div>
                </td>
                <td style={{ width: "50%", verticalAlign: "bottom", textAlign: "center" }}>
                  <div style={{ fontWeight: 800, fontSize: "10pt", letterSpacing: 0.3 }}>{registrarName.toUpperCase()}</div>
                  <div style={{ borderTop: "1px solid #000", fontSize: "8pt", width: 250, margin: "0 auto", paddingTop: 1 }}>School Registrar</div>
                </td>
              </tr>
              <tr>
                <td colSpan={2} style={{ paddingTop: 12, paddingLeft: 15 }}>
                  <table style={{ borderCollapse: "collapse", fontSize: "7.5pt", lineHeight: 1.25 }}><tbody>
                    <tr>
                      <td colSpan={2} style={{ fontWeight: 800, paddingBottom: 2 }}>DESCRIPTION</td>
                      <td style={{ textAlign: "center", fontWeight: 700, padding: "0 12px 2px", whiteSpace: "nowrap" }}>UNITS REQUIRED</td>
                      <td style={{ textAlign: "center", fontWeight: 700, padding: "0 12px 2px", whiteSpace: "nowrap" }}>UNITS EARNED</td>
                    </tr>
                    {CAND_LEGEND.map(([c, l], i) => (
                      <tr key={c}>
                        <td style={{ fontWeight: 700, paddingRight: 8, verticalAlign: "top" }}>{c}</td>
                        <td style={{ paddingRight: 20 }}>{l}</td>
                        <td style={{ textAlign: "center" }}>&nbsp;</td>
                        <td style={{ textAlign: "center" }}>{grandTotals[CAND_GROUPS[i]] || ""}</td>
                      </tr>
                    ))}
                    <tr>
                      <td colSpan={2} style={{ textAlign: "right", fontWeight: 800, paddingRight: 8, paddingTop: 2 }}>Total</td>
                      <td style={{ textAlign: "center" }}>&nbsp;</td>
                      <td style={{ textAlign: "center", fontWeight: 800, paddingTop: 2 }}>{CAND_GROUPS.reduce((s, g) => s + (grandTotals[g] || 0), 0) || ""}</td>
                    </tr>
                  </tbody></table>
                </td>
              </tr>
            </tbody></table>
          </div>
        </div>
      </div>
    </div>
  );
  return inline ? inner : createPortal(inner, document.body);
}

// ── STUDENT EVALUATION FORM (curriculum checklist w/ grades + GWA per sem) ──
function StudentEvaluationForm({ students = [], registrarName = "" }) {
  const [search, setSearch] = useState("");
  const [sel, setSel]       = useState(null);
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(false);

  const pick = async (s) => {
    setSel(s); setGrades([]); setLoading(true);
    try {
      const r = await fetch(`${import.meta.env.VITE_API_URL}/api/erd/tor-subjects/${s.id}`);
      if (r.ok) setGrades(await r.json());
    } catch (_) {}
    setLoading(false);
  };

  const ylOrder = { "1st Year": 1, "2nd Year": 2, "3rd Year": 3, "4th Year": 4 };
  const groups = {};
  (grades || []).forEach(g => {
    const yl  = String(g.year_level || "");
    const sem = String(g.semester || "1").trim();
    const sk  = (sem === "1" || sem === "1st Semester") ? "1" : (sem === "2" || sem === "2nd Semester") ? "2" : "9";
    const key = `${ylOrder[yl] || 9}|${g.year_start || ""}|${sk}`;
    if (!groups[key]) groups[key] = { yl, sk, year_start: g.year_start, year_end: g.year_end, rows: [] };
    groups[key].rows.push(g);
  });
  const sortedKeys = Object.keys(groups).sort();
  const semLabel = sk => sk === "1" ? "1st SEM" : sk === "2" ? "2nd SEM" : "—";
  const fmtGrade = v => (v === null || v === undefined || v === "") ? "" : Number(v).toFixed(2);
  const gwaOf = rows => {
    let ws = 0, u = 0;
    rows.forEach(r => { const g = parseFloat(r.grade), un = parseFloat(r.units); if (!isNaN(g) && !isNaN(un)) { ws += g * un; u += un; } });
    return u > 0 ? (ws / u).toFixed(2) : "—";
  };
  const unitsOf = rows => rows.reduce((s, r) => s + (parseFloat(r.units) || 0), 0);

  const program = (sel?.course || "").toUpperCase();
  const effAY = sortedKeys.length ? (() => { const first = groups[sortedKeys[0]]; return first.year_start ? `${first.year_start}` : ""; })() : "";

  const doPrint = () => {
    const area = document.getElementById("eval-print-area");
    if (!area) return;
    const mp = document.createElement("div");
    mp.id = "eval-mp";
    const c = area.cloneNode(true);
    c.id = "eval-mp-page";
    mp.appendChild(c);
    document.body.appendChild(mp);
    const cleanup = () => { if (document.body.contains(mp)) document.body.removeChild(mp); window.removeEventListener("afterprint", cleanup); };
    window.addEventListener("afterprint", cleanup);
    window.print();
  };

  const GC = { border: "1px solid #333", padding: "2px 6px", fontSize: "8.5pt", fontFamily: TNR, verticalAlign: "middle" };
  const GH = { ...GC, fontWeight: 700, background: "#2c4a1e", color: "#fff", textAlign: "center", fontSize: "8pt", textTransform: "uppercase", letterSpacing: "0.3px" };

  return (
    <div style={{ marginTop: "12px", display: "flex", gap: "12px", minHeight: "520px" }}>
      {/* Left: student picker */}
      <div style={{ width: "260px", flexShrink: 0, border: `1px solid ${BORDER}`, borderRadius: "10px", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "8px 12px", background: DARK_GREEN, color: WHITE, fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em" }}>Select Student</div>
        <div style={{ padding: "6px 8px", borderBottom: `1px solid ${BORDER}` }}>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search name or ID…"
            style={{ width: "100%", padding: "5px 8px", fontSize: "10px", border: `1px solid ${BORDER}`, borderRadius: "5px", outline: "none", boxSizing: "border-box" }} />
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {(students || []).filter(s => {
            if (!search.trim()) return true;
            const q = search.toLowerCase();
            return (s.last_name || "").toLowerCase().includes(q) || (s.first_name || "").toLowerCase().includes(q) || (s.student_number || "").toLowerCase().includes(q);
          }).map(s => {
            const active = sel?.id === s.id;
            return (
              <div key={s.id} onClick={() => pick(s)}
                style={{ padding: "7px 10px", borderBottom: `1px solid #F3F4F6`, cursor: "pointer", background: active ? "#eaf2d9" : "transparent", display: "flex", flexDirection: "column", gap: "1px" }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = LIGHT_GRAY; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}>
                <span style={{ fontSize: "9px", fontWeight: 700, color: BLUE, fontFamily: "monospace" }}>{s.student_number || "—"}</span>
                <span style={{ fontSize: "11px", fontWeight: active ? 800 : 500, color: "#111827" }}>{s.last_name}, {s.first_name} {s.middle_name || ""}</span>
              </div>
            );
          })}
          {(students || []).length === 0 && <div style={{ padding: "20px", textAlign: "center", color: GRAY, fontSize: "11px" }}>No students found.</div>}
        </div>
      </div>

      {/* Right: preview */}
      <div style={{ flex: 1, border: `1px solid ${BORDER}`, borderRadius: "10px", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "8px 14px", background: DARK_GREEN, color: WHITE, fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span>Student Evaluation Form</span>
          {sel && <button type="button" onClick={doPrint} style={{ padding: "5px 14px", background: WHITE, color: DARK_GREEN, border: "none", borderRadius: "5px", fontWeight: 800, fontSize: "11px", cursor: "pointer" }}>🖨 Print </button>}
        </div>

        {!sel ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "10px", color: GRAY }}>
            <span style={{ fontSize: "36px" }}>📋</span>
            <span style={{ fontSize: "13px" }}>Select a student to generate the Evaluation Form</span>
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: "auto", background: "#e5e7eb", padding: "24px 16px" }}>
            <style>{`
              @media print {
                @page { size: 8.5in 13in portrait; margin: 0; }
                body * { visibility: hidden !important; }
                #eval-mp, #eval-mp * { visibility: visible !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                #eval-mp { position: absolute !important; top: 0 !important; left: 0 !important; width: 816px !important; background: #fff !important; }
                #eval-mp-page { box-shadow: none !important; margin: 0 !important; width: 816px !important; min-height: 12.9in !important; padding: 30px 46px !important; box-sizing: border-box !important; }
                #eval-mp-page table { page-break-inside: auto; }
                #eval-mp-page tr { page-break-inside: avoid !important; }
                #eval-mp-page thead { display: table-header-group !important; }
              }
            `}</style>

            <div id="eval-print-area" style={{ width: "816px", minHeight: "1181px", margin: "0 auto", background: WHITE, padding: "30px 46px", boxSizing: "border-box", fontFamily: TNR, fontSize: "9pt", color: "#000", boxShadow: "0 4px 24px rgba(0,0,0,0.18)", position: "relative" }}>
              {/* Watermark */}
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
                <img src={ccaLogo} alt="" style={{ width: "900px", height: "900px", objectFit: "contain", opacity: 0.08 }} />
              </div>
              <div style={{ position: "relative", zIndex: 1 }}>
                {/* HEADER — copied from TOR preview */}
                <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "2px", tableLayout: "fixed" }}>
                  <tbody>
                    <tr>
                      <td style={{ width: "130px", verticalAlign: "middle", textAlign: "center" }}>
                        <img src={alangalangLogo} alt="" style={{ width: 75, height: 75, objectFit: "contain" }} />
                      </td>
                      <td style={{ textAlign: "center", verticalAlign: "middle" }}>
                        <div style={{ fontSize: "12pt", fontFamily: TNR }}>Republic of the Philippines</div>
                        <div style={{ fontSize: "15pt", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.5px", lineHeight: 1.1, fontFamily: TNR, whiteSpace: "nowrap" }}>Community College of Alangalang</div>
                        <div style={{ fontSize: "12pt", fontFamily: TNR }}>Alangalang, Leyte</div>
                      </td>
                      <td style={{ width: "130px", verticalAlign: "middle", textAlign: "center" }}>
                        <img src={ccaLogo} alt="" style={{ width: 80, height: 80, objectFit: "contain" }} />
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={3} style={{ position: "relative", height: "44px" }}>
                        <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                          <div style={{ fontSize: "42px", fontWeight: 900, letterSpacing: "-1px", fontFamily: 'Algerian, "Times New Roman", Times, serif', whiteSpace: "nowrap", transform: "scaleX(0.68)", transformOrigin: "center center" }}>STUDENT EVALUATION FORM</div>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <div style={{ borderTop: "2.5px solid #000", borderBottom: "1px solid #000", height: "3px", marginBottom: "6px" }} />

                {/* Program / student meta */}
                <div style={{ textAlign: "center", fontWeight: 900, fontSize: "11pt", textTransform: "uppercase", letterSpacing: "0.3px" }}>{program || "—"}</div>
                {effAY && <div style={{ textAlign: "center", fontSize: "8.5pt", fontStyle: "italic", marginBottom: "4px" }}>Effective Academic Year {effAY}</div>}
                <table style={{ width: "100%", fontSize: "9pt", fontFamily: TNR, margin: "4px 0 8px" }}><tbody>
                  <tr>
                    <td style={{ width: "60%" }}><b>Name:</b> {[sel.last_name, sel.first_name, sel.middle_name].filter(Boolean).join(", ").toUpperCase()}</td>
                    <td><b>Student ID:</b> {sel.student_number || "—"}</td>
                  </tr>
                  <tr>
                    <td><b>Program:</b> {sel.course || "—"}</td>
                    <td><b>Year Level:</b> {sel.year_level || "—"}</td>
                  </tr>
                </tbody></table>

                {/* Per-semester evaluation tables */}
                {sortedKeys.length === 0 ? (
                  <div style={{ textAlign: "center", color: "#666", fontStyle: "italic", padding: "24px", fontSize: "9pt" }}>
                    {loading ? "Loading subjects…" : "No subjects/grades on record for this student."}
                  </div>
                ) : sortedKeys.map(key => {
                  const gr = groups[key];
                  return (
                    <div key={key} style={{ marginBottom: "10px", pageBreakInside: "avoid" }}>
                      <div style={{ background: "#3d6e01", color: "#fff", fontWeight: 800, fontSize: "8.5pt", padding: "2px 8px", textTransform: "uppercase", letterSpacing: "0.3px" }}>
                        {semLabel(gr.sk)} — {gr.yl}{program ? ` — ${program}` : ""}
                      </div>
                      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                        <colgroup>
                          <col style={{ width: "18%" }} /><col /><col style={{ width: "12%" }} /><col style={{ width: "10%" }} />
                        </colgroup>
                        <thead>
                          <tr>
                            <th style={GH}>Course Code</th>
                            <th style={{ ...GH, textAlign: "left" }}>Descriptive Title</th>
                            <th style={GH}>Grade</th>
                            <th style={GH}>Units</th>
                          </tr>
                        </thead>
                        <tbody>
                          {gr.rows.map((r, i) => (
                            <tr key={i}>
                              <td style={{ ...GC, textAlign: "left", fontWeight: 700 }}>{r.subject_code || ""}</td>
                              <td style={{ ...GC, textAlign: "left" }}>{r.subject_title || ""}</td>
                              <td style={{ ...GC, textAlign: "center" }}>{fmtGrade(r.grade)}</td>
                              <td style={{ ...GC, textAlign: "center" }}>{r.units ?? ""}</td>
                            </tr>
                          ))}
                          <tr>
                            <td style={{ ...GC, textAlign: "right", fontWeight: 800, background: "#f2f9e8" }} colSpan={2}>GWA: {gwaOf(gr.rows)}</td>
                            <td style={{ ...GC, textAlign: "right", fontWeight: 800, background: "#f2f9e8" }}>Total</td>
                            <td style={{ ...GC, textAlign: "center", fontWeight: 800, background: "#f2f9e8" }}>{unitsOf(gr.rows)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  );
                })}

                {/* Signature */}
                <div style={{ marginTop: "30px", display: "flex", justifyContent: "flex-end" }}>
                  <div style={{ textAlign: "center", minWidth: "220px" }}>
                    <div style={{ borderBottom: "1.5px solid #333", paddingBottom: "2px", minHeight: "14px", fontWeight: 800, fontSize: "9pt", textTransform: "uppercase", fontFamily: TNR }}>{registrarName}</div>
                    <div style={{ fontWeight: 900, fontSize: "9pt", textTransform: "uppercase", letterSpacing: "0.5px", fontFamily: TNR }}>College Registrar</div>
                  </div>
                </div>
              </div>
              <TorContactFooter />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── TOR page contact footer (pinned to the bottom of every printed page) ──
function TorContactFooter() {
  const ic = { display: "inline-flex", alignItems: "center", gap: "5px", whiteSpace: "nowrap" };
  return (
    <div style={{ position: "absolute", left: "48px", right: "48px", bottom: "2px", borderTop: "1px solid #999", paddingTop: "3px", display: "flex", alignItems: "center", justifyContent: "center", gap: "16px", fontSize: "7.5pt", fontFamily: '"Times New Roman",Times,serif', color: "#333" }}>
      <span style={ic}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/></svg>communitycollegeofalangalang@gmail.com</span>
      <span style={ic}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>09758876966</span>
      <span style={ic}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>communitycollegealangalang.com</span>
    </div>
  );
}
