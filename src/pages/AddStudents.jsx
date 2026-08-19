import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { processProfileImage } from "../utils/image";
import QRCode from "qrcode";
import { showToast, showConfirm } from "../components/Toast";
import ccaLogo        from "../assets/cca_logo.jpg";
import ccaBg          from "../assets/cca_bg.png";
import alangalangLogo from "../assets/Alangalang.png";

const GREEN      = "#3d6e01";
const DARK_GREEN = "#3d6e01";
const WHITE      = "#FFFFFF";
const GRAY       = "#6B7280";
const BORDER     = "#E5E7EB";
const LIGHT_GRAY = "#F9FAFB";
const BLUE       = "#1E88E5";
const RED        = "#DC2626";

const YEAR_LEVELS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
const TNR        = '"Times New Roman", Times, serif';

// Normalize a stored day value (full names like "MONDAY,TUESDAY" or already
// abbreviated "M,T,W") into deduped, ordered short labels e.g. "M/T/WED".
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

const formatSchoolId = (id) => `CCA-2026-${String(id).padStart(4, "0")}`;

// Offline-capable QR code rendered onto a <canvas> using the "qrcode" package.
// Usage: <QRCanvas data="..." size={200} />
function QRCanvas({ data, size = 200 }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (!canvasRef.current || !data) return;
    QRCode.toCanvas(canvasRef.current, data, {
      width: size,
      margin: 2,
      color: { dark: "#000000", light: "#ffffff" },
    }).catch(console.error);
  }, [data, size]);
  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      style={{ borderRadius: "8px", border: "1px solid #E5E7EB", display: "block", margin: "0 auto" }}
    />
  );
}

// Helper: generate a QR data URL (for print windows) — fully offline
async function qrDataUrl(data, size = 240) {
  return QRCode.toDataURL(data, { width: size, margin: 2 });
}

// ── Full Student Information Sheet modal (same layout as Registrar SI form) ──
function StudentSIFormModal({ student, courses = [], onClose, onUpdated, activeSchoolYear }) {
  const TNR = '"Times New Roman", Times, serif';

  const deriveSY = (sn) => {
    if (activeSchoolYear) return activeSchoolYear;
    const yr = (sn || "").split("-")[0].trim();
    if (yr.length === 4 && /^\d{4}$/.test(yr)) return `${yr}-${parseInt(yr)+1}`;
    const now = new Date();
    const y = now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1;
    return `${y}-${y+1}`;
  };

  const [form, setForm] = useState({
    school_year:    deriveSY(student.student_number),
    student_number: student.student_number || "",
    classification: student.classification || "",
    last_name:      student.last_name  || "",
    first_name:     student.first_name || "",
    middle_name:    student.middle_name || "",
    religion:       student.religion || "",
    gender:         student.gender || "Male",
    status:         student.status || "",
    citizenship:    student.citizenship || "Filipino",
    acr_no:         student.acr_no || "",
    barangay:       student.barangay || "",
    municipality:   student.municipality || "ALANGALANG",
    province:       student.province || "LEYTE",
    zip_code:       student.zip_code || "",
    email:          student.email || "",
    mobile:         student.mobile || "",
    birthdate:      student.birthdate ? student.birthdate.split("T")[0] : "",
    place_of_birth: student.place_of_birth || "",
    father_last:    student.father_last || "",
    father_first:   student.father_first || "",
    father_middle:  student.father_middle || "",
    father_occupation: student.father_occupation || "",
    mother_last:    student.mother_last || "",
    mother_first:   student.mother_first || "",
    mother_middle:  student.mother_middle || "",
    mother_occupation: student.mother_occupation || "",
    parents_address: student.parents_address || "",
    parents_mobile:  student.parents_mobile || "",
    guardian_name:   student.guardian_name || "",
    guardian_relationship: student.guardian_relationship || "",
    guardian_address: student.guardian_address || "",
    guardian_mobile:  student.guardian_mobile || "",
    spouse_name:      student.spouse_name || "",
    spouse_occupation: student.spouse_occupation || "",
    spouse_address:   student.spouse_address || "",
    spouse_mobile:    student.spouse_mobile || "",
    elem_school:  student.elem_school  || "",
    elem_address: student.elem_address || "",
    elem_year:    student.elem_year    || "",
    elem_honors:  student.elem_honors  || "",
    hs_school:    student.hs_school    || "",
    hs_address:   student.hs_address   || "",
    hs_year:      student.hs_year      || "",
    hs_honors:    student.hs_honors    || "",
    col_school:   student.col_school   || "",
    col_address:  student.col_address  || "",
    col_year:     student.col_year     || "",
    col_honors:   student.col_honors   || "",
    scholastic_notes: student.scholastic_notes || "",
    course:       student.course     || "",
    year_level:   student.year_level || "1st Year",
    section:      student.section    || "",
    year_enrolled: student.year_enrolled || "",
  });
  const [saving, setSaving] = useState(false);
  // Configurable scholastic-requirements checklist (managed in System).
  const [reqOptions, setReqOptions] = useState([]);
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/erd/scholastic-requirements?t=${Date.now()}`, { cache: "no-store" })
      .then(r => r.ok ? r.json() : [])
      .then(d => setReqOptions(Array.isArray(d) ? d.map(x => x.name) : []))
      .catch(() => setReqOptions([]));
  }, []);

  // When activeSchoolYear arrives async, push it into the form
  useEffect(() => {
    if (activeSchoolYear) {
      setForm(prev => ({ ...prev, school_year: activeSchoolYear }));
    }
  }, [activeSchoolYear]);

  const f  = (key) => form[key] ?? "";
  const sf = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const ci = (extra={}) => ({
    width: "100%", padding: "4px 6px", border: "none", outline: "none",
    fontSize: "12px", boxSizing: "border-box", background: "transparent",
    fontFamily: TNR, color: "#000", ...extra,
  });
  const rlc = (w = "110px") => ({
    background: WHITE, color: "#000", padding: "5px 8px",
    fontSize: "10px", fontWeight: 700, letterSpacing: "0.03em",
    textTransform: "uppercase", width: w, flexShrink: 0,
    display: "flex", alignItems: "center", whiteSpace: "pre-wrap",
    borderRight: `1px solid ${BORDER}`, fontFamily: TNR,
  });
  const fc = (flex=1) => ({
    flex, minWidth: 0, display: "flex", flexDirection: "column",
    borderRight: `1px solid ${BORDER}`,
  });
  const bl = () => ({
    fontSize: "9px", fontWeight: 700, color: "#000", background: "#F3F4F6",
    padding: "2px 6px", letterSpacing: "0.04em", textTransform: "uppercase",
    borderBottom: `1px solid ${BORDER}`, fontFamily: TNR,
  });

  const handleUpdate = async () => {
    if (saving) return;
    if (!form.last_name.trim() || !form.first_name.trim()) {
      showToast("First name and last name are required.", "error"); return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/erd/students/${student.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: form.first_name, middle_name: form.middle_name, last_name: form.last_name,
          student_number: form.student_number, course: form.course,
          year_level: form.year_level, section: form.section,
          year_enrolled: form.year_enrolled, gender: form.gender,
          email: form.email, mobile: form.mobile, birthdate: form.birthdate,
          place_of_birth: form.place_of_birth, barangay: form.barangay,
          municipality: form.municipality, province: form.province,
          zip_code: form.zip_code, religion: form.religion,
          citizenship: form.citizenship, status: form.status,
          acr_no: form.acr_no, classification: form.classification,
          father_last: form.father_last, father_first: form.father_first,
          father_middle: form.father_middle, father_occupation: form.father_occupation,
          mother_last: form.mother_last, mother_first: form.mother_first,
          mother_middle: form.mother_middle, mother_occupation: form.mother_occupation,
          parents_address: form.parents_address, parents_mobile: form.parents_mobile,
          guardian_name: form.guardian_name, guardian_relationship: form.guardian_relationship,
          guardian_address: form.guardian_address, guardian_mobile: form.guardian_mobile,
          spouse_name: form.spouse_name, spouse_occupation: form.spouse_occupation,
          spouse_address: form.spouse_address, spouse_mobile: form.spouse_mobile,
          elem_school: form.elem_school, elem_address: form.elem_address,
          elem_year: form.elem_year, elem_honors: form.elem_honors,
          hs_school: form.hs_school, hs_address: form.hs_address,
          hs_year: form.hs_year, hs_honors: form.hs_honors,
          col_school: form.col_school, col_address: form.col_address,
          col_year: form.col_year, col_honors: form.col_honors,
          scholastic_notes: form.scholastic_notes,
        }),
      });
      if (res.ok) {
        showToast("Student information updated.", "success");
        onUpdated && onUpdated();
        onClose();
      } else {
        showToast("Failed to update student.", "error");
      }
    } catch { showToast("Network error.", "error"); }
    finally { setSaving(false); }
  };

  return createPortal(
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2147483647, padding: "20px" }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: WHITE, borderRadius: "12px", width: "100%", maxWidth: "1200px", maxHeight: "92vh", overflowY: "auto", boxShadow: "0 8px 40px rgba(0,0,0,0.25)", fontFamily: TNR }}>

        {/* Modal header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px", borderBottom: `1px solid ${BORDER}`, background: "#F3F4F6", position: "sticky", top: 0, zIndex: 10 }}>
          <div style={{ fontSize: "13px", fontWeight: 800, color: DARK_GREEN, fontFamily: TNR, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Student Information Sheet
          </div>
          <button type="button" onClick={onClose}
            style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: GRAY }}>✕</button>
        </div>

        {/* Form body */}
        <div style={{ margin: "16px", border: `1px solid ${BORDER}`, borderRadius: "4px", overflow: "hidden" }}>

          {/* ROW 1 */}
          <div style={{ display: "flex", borderBottom: `1px solid ${BORDER}` }}>
            <div style={fc(1.4)}><div style={bl()}>School Year</div><input style={ci({ cursor: "default", color: DARK_GREEN, fontWeight: 700 })} readOnly value={f("school_year")} placeholder="e.g. 2026-2027" /></div>
            <div style={fc(1.2)}><div style={bl()}>ID Number</div><input style={ci({ cursor: "default", color: DARK_GREEN, fontWeight: 700, letterSpacing: "0.03em" })} readOnly value={f("student_number")} /></div>
            <div style={fc(2)}>
              <div style={bl()}>Program Code</div>
              <select style={ci({ cursor: "pointer" })} value={f("course")} onChange={e => sf("course", e.target.value)}>
                <option value="">— Select Program Code —</option>
                {courses.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={fc(1)}><div style={bl()}>Block Number</div><input style={ci()} value={f("section")} onChange={e => sf("section", e.target.value)} placeholder="e.g. Block 1" /></div>
            <div style={{ ...fc(1.5), borderRight: "none" }}>
              <div style={bl()}>Classification</div>
              <select style={ci({ cursor: "pointer" })} value={f("classification")} onChange={e => sf("classification", e.target.value)}>
                {["","New","Old","Transferee","Returnee","Cross-Enrollee","Graduate"].map(v => <option key={v} value={v}>{v||"—"}</option>)}
              </select>
            </div>
          </div>

          {/* ROW 2: Name / Demographics */}
          <div style={{ display: "flex", borderBottom: `1px solid ${BORDER}` }}>
            <div style={fc(1.5)}><div style={bl()}>Family Name</div><input style={ci()} value={f("last_name")} onChange={e => sf("last_name", e.target.value)} /></div>
            <div style={fc(1.5)}><div style={bl()}>First Name</div><input style={ci()} value={f("first_name")} onChange={e => sf("first_name", e.target.value)} /></div>
            <div style={fc(1.2)}><div style={bl()}>Middle Name</div><input style={ci()} value={f("middle_name")} onChange={e => sf("middle_name", e.target.value)} /></div>
            <div style={fc(1)}><div style={bl()}>Religion</div><input style={ci()} value={f("religion")} onChange={e => sf("religion", e.target.value)} /></div>
            <div style={fc(0.8)}><div style={bl()}>Gender</div>
              <select style={ci({ cursor: "pointer" })} value={f("gender")} onChange={e => sf("gender", e.target.value)}>
                <option>Male</option><option>Female</option><option>LGBTQIA+</option>
              </select>
            </div>
            <div style={fc(0.9)}><div style={bl()}>Status</div>
              <select style={ci({ cursor: "pointer" })} value={f("status")} onChange={e => sf("status", e.target.value)}>
                {["","Single","Married","Widowed","Separated"].map(v => <option key={v} value={v}>{v||"—"}</option>)}
              </select>
            </div>
            <div style={fc(0.9)}><div style={bl()}>Citizenship</div><input style={ci()} value={f("citizenship")} onChange={e => sf("citizenship", e.target.value)} /></div>
            <div style={{ ...fc(1.2), borderRight: "none" }}><div style={bl()}>ACR No. (if foreign)</div><input style={ci()} value={f("acr_no")} onChange={e => sf("acr_no", e.target.value)} /></div>
          </div>

          {/* ROW 3: Address / Contact */}
          <div style={{ display: "flex", borderBottom: `1px solid ${BORDER}` }}>
            <div style={fc(1.2)}><div style={bl()}>Barangay</div><input style={ci()} value={f("barangay")} onChange={e => sf("barangay", e.target.value)} /></div>
            <div style={fc(1.2)}><div style={bl()}>Municipality</div><input style={ci()} value={f("municipality")} onChange={e => sf("municipality", e.target.value)} /></div>
            <div style={fc(1)}><div style={bl()}>Province</div><input style={ci()} value={f("province")} onChange={e => sf("province", e.target.value)} /></div>
            <div style={fc(0.7)}><div style={bl()}>Zip Code</div><input style={ci()} value={f("zip_code")} onChange={e => sf("zip_code", e.target.value)} /></div>
            <div style={fc(1.5)}><div style={bl()}>E-mail Address</div><input style={ci()} type="email" value={f("email")} onChange={e => sf("email", e.target.value)} /></div>
            <div style={fc(1)}><div style={bl()}>Mobile #</div><input style={ci()} value={f("mobile")} onChange={e => sf("mobile", e.target.value)} /></div>
            <div style={fc(1)}><div style={bl()}>Birthdate</div><input style={ci()} type="date" value={f("birthdate")} onChange={e => sf("birthdate", e.target.value)} /></div>
            <div style={{ ...fc(1.2), borderRight: "none" }}><div style={bl()}>Place of Birth</div><input style={ci()} value={f("place_of_birth")} onChange={e => sf("place_of_birth", e.target.value)} /></div>
          </div>

          {/* FATHER */}
          <div style={{ display: "flex", borderBottom: `1px solid ${BORDER}` }}>
            <div style={rlc()}>{"Father's\nName"}</div>
            <div style={fc(1)}><div style={bl()}>Last Name</div><input style={ci()} value={f("father_last")} onChange={e => sf("father_last", e.target.value)} placeholder="Last Name..." /></div>
            <div style={fc(1)}><div style={bl()}>First Name</div><input style={ci()} value={f("father_first")} onChange={e => sf("father_first", e.target.value)} placeholder="First Name" /></div>
            <div style={fc(1)}><div style={bl()}>Middle Name</div><input style={ci()} value={f("father_middle")} onChange={e => sf("father_middle", e.target.value)} placeholder="Middle Name" /></div>
            <div style={{ ...fc(2), borderRight: "none" }}><div style={bl()}>Father's Occupation / Profession</div><input style={ci()} value={f("father_occupation")} onChange={e => sf("father_occupation", e.target.value)} /></div>
          </div>

          {/* MOTHER */}
          <div style={{ display: "flex", borderBottom: `1px solid ${BORDER}` }}>
            <div style={rlc()}>{"Mother's\nName"}</div>
            <div style={fc(1)}><div style={bl()}>Last Name</div><input style={ci()} value={f("mother_last")} onChange={e => sf("mother_last", e.target.value)} placeholder="Last Name..." /></div>
            <div style={fc(1)}><div style={bl()}>First Name</div><input style={ci()} value={f("mother_first")} onChange={e => sf("mother_first", e.target.value)} placeholder="First Name" /></div>
            <div style={fc(1)}><div style={bl()}>Middle Name</div><input style={ci()} value={f("mother_middle")} onChange={e => sf("mother_middle", e.target.value)} placeholder="Middle Name" /></div>
            <div style={{ ...fc(2), borderRight: "none" }}><div style={bl()}>Mother's Occupation / Profession</div><input style={ci()} value={f("mother_occupation")} onChange={e => sf("mother_occupation", e.target.value)} /></div>
          </div>

          {/* PARENTS ADDRESS */}
          <div style={{ display: "flex", borderBottom: `1px solid ${BORDER}` }}>
            <div style={{ padding: "4px 8px", fontSize: "10px", fontWeight: 700, color: "#000", textTransform: "uppercase", letterSpacing: "0.03em", flexShrink: 0, width: "200px", display: "flex", alignItems: "center", fontFamily: TNR, background: "#F3F4F6", borderRight: `1px solid ${BORDER}` }}>Complete Address of Parents</div>
            <input style={ci({ flex: 1, borderRight: `1px solid ${BORDER}` })} value={f("parents_address")} onChange={e => sf("parents_address", e.target.value)} />
            <div style={{ padding: "4px 8px", fontSize: "10px", fontWeight: 700, color: "#000", textTransform: "uppercase", letterSpacing: "0.03em", flexShrink: 0, display: "flex", alignItems: "center", fontFamily: TNR, background: "#F3F4F6", borderRight: `1px solid ${BORDER}` }}>Mobile No.</div>
            <input style={ci({ width: "130px", flexShrink: 0 })} value={f("parents_mobile")} onChange={e => sf("parents_mobile", e.target.value)} />
          </div>

          {/* GUARDIAN */}
          <div style={{ display: "flex", borderBottom: `1px solid ${BORDER}` }}>
            <div style={fc(2)}><div style={bl()}>Name of Guardian</div><input style={ci()} value={f("guardian_name")} onChange={e => sf("guardian_name", e.target.value)} /></div>
            <div style={{ ...fc(1.5), borderRight: "none" }}><div style={bl()}>Relationship</div><input style={ci()} value={f("guardian_relationship")} onChange={e => sf("guardian_relationship", e.target.value)} /></div>
          </div>

          {/* GUARDIAN ADDRESS */}
          <div style={{ display: "flex", borderBottom: `1px solid ${BORDER}` }}>
            <div style={{ padding: "4px 8px", fontSize: "10px", fontWeight: 700, color: "#000", textTransform: "uppercase", letterSpacing: "0.03em", flexShrink: 0, width: "200px", display: "flex", alignItems: "center", fontFamily: TNR, background: "#F3F4F6", borderRight: `1px solid ${BORDER}` }}>Complete Address of Guardian</div>
            <input style={ci({ flex: 1, borderRight: `1px solid ${BORDER}` })} value={f("guardian_address")} onChange={e => sf("guardian_address", e.target.value)} />
            <div style={{ padding: "4px 8px", fontSize: "10px", fontWeight: 700, color: "#000", textTransform: "uppercase", letterSpacing: "0.03em", flexShrink: 0, display: "flex", alignItems: "center", fontFamily: TNR, background: "#F3F4F6", borderRight: `1px solid ${BORDER}` }}>Mobile No.</div>
            <input style={ci({ width: "130px", flexShrink: 0 })} value={f("guardian_mobile")} onChange={e => sf("guardian_mobile", e.target.value)} />
          </div>

          {/* SPOUSE */}
          <div style={{ display: "flex", borderBottom: `1px solid ${BORDER}` }}>
            <div style={fc(2)}><div style={bl()}>Name of Spouse</div><input style={ci()} value={f("spouse_name")} onChange={e => sf("spouse_name", e.target.value)} /></div>
            <div style={{ ...fc(3), borderRight: "none" }}><div style={bl()}>Spouse's Occupation / Profession / Place of Work</div><input style={ci()} value={f("spouse_occupation")} onChange={e => sf("spouse_occupation", e.target.value)} /></div>
          </div>

          {/* SPOUSE ADDRESS */}
          <div style={{ display: "flex", borderBottom: `1px solid ${BORDER}` }}>
            <div style={{ padding: "4px 8px", fontSize: "10px", fontWeight: 700, color: "#000", textTransform: "uppercase", letterSpacing: "0.03em", flexShrink: 0, width: "200px", display: "flex", alignItems: "center", fontFamily: TNR, background: "#F3F4F6", borderRight: `1px solid ${BORDER}` }}>Complete Address of Spouse</div>
            <input style={ci({ flex: 1, borderRight: `1px solid ${BORDER}` })} value={f("spouse_address")} onChange={e => sf("spouse_address", e.target.value)} />
            <div style={{ padding: "4px 8px", fontSize: "10px", fontWeight: 700, color: "#000", textTransform: "uppercase", letterSpacing: "0.03em", flexShrink: 0, display: "flex", alignItems: "center", fontFamily: TNR, background: "#F3F4F6", borderRight: `1px solid ${BORDER}` }}>Mobile No.</div>
            <input style={ci({ width: "130px", flexShrink: 0 })} value={f("spouse_mobile")} onChange={e => sf("spouse_mobile", e.target.value)} />
          </div>

          {/* SCHOLASTIC RECORD */}
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

          {/* SCHOLASTIC REQUIREMENTS */}
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

          {/* Footer */}
          <div style={{ padding: "10px 14px", background: "#F3F4F6", borderTop: `1px solid ${BORDER}`, display: "flex", justifyContent: "flex-end", gap: "8px" }}>
            <button type="button" onClick={onClose}
              style={{ padding: "6px 18px", background: WHITE, border: `1px solid ${BORDER}`, borderRadius: "6px", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: TNR }}>
              Close
            </button>
            <button type="button" onClick={handleUpdate} disabled={saving}
              style={{ padding: "6px 24px", background: DARK_GREEN, color: WHITE, border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: 700, cursor: "pointer", fontFamily: TNR, opacity: saving ? 0.7 : 1 }}>
              {saving ? "Updating..." : "💾 Update"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Student Info Card (view modal content) ──────────────────────────────────
function StudentInfoCard({ student, enrollments, subjects, assignedSubjectIds = new Set(), user = {}, onSaved, canManageEnrollment = false, onDeleteEnrollment, courses = [], onUpdated, activeSchoolYear }) {
  const [expandedId, setExpandedId] = useState(null);
  const [showSIForm, setShowSIForm] = useState(false);
  const [showCOR, setShowCOR]           = useState(false);
  const [showCORPicker, setShowCORPicker] = useState(false);
  const [corSchedule, setCorSchedule]   = useState([]);
  const [corSemester, setCorSemester]   = useState("");
  // grades keyed by enrollment uid
  const [gradeMap, setGradeMap]     = useState({});
  const [savingMap, setSavingMap]   = useState({});
  const [loadingMap, setLoadingMap] = useState({});

  const isAdmin = user?.role === "administrator";
  // Grade permissions by role. Registrar + registrar_staff can INPUT grades;
  // only registrar (and admin) can DELETE grades — registrar_staff cannot.
  const _gradeRoles = Array.isArray(user?.roles) && user.roles.length
    ? user.roles.map(r => String(r).toLowerCase())
    : [String(user?.role || "").toLowerCase()];
  const isRegistrar      = _gradeRoles.includes("registrar");
  const isRegistrarStaff = _gradeRoles.some(r => r.includes("registrar_staff") || r.includes("registrar staff"));
  const canGrade       = isAdmin || isRegistrar || isRegistrarStaff; // may input grades on any subject
  const canDeleteGrade = isAdmin || isRegistrar;                     // may delete grades (NOT staff)
  // College Registrar signatory:
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
  const isGraduated = student.graduation_status === 'graduated';
  // Grades are locked for graduated students; admins can always edit
  const graduationLocked = isGraduated && !isAdmin;

  const fullName = `${student.first_name || ""} ${student.middle_name ? student.middle_name.charAt(0) + "." : ""} ${student.last_name || ""}`.replace(/\s+/g, " ").trim();

  const semToNum = (s) => s.includes("2nd") ? 2 : 1;

  const loadGrades = async (uid, studentId, yearLevel, semester) => {
    if (gradeMap[uid]) return; // already loaded
    setLoadingMap(p => ({ ...p, [uid]: true }));
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/erd/grades/${studentId}`);
      if (res.ok) {
        const all = await res.json();
        // filter by semester number matching this enrollment
        const semNum = semToNum(semester);
        const filtered = all.filter(g => parseInt(g.semester) === semNum);
        setGradeMap(p => ({ ...p, [uid]: filtered }));
      }
    } catch (_) {}
    setLoadingMap(p => ({ ...p, [uid]: false }));
  };

  const updateGrade = (uid, subjectId, field, value) => {
    setGradeMap(prev => {
      const list = prev[uid] || [];
      const idx  = list.findIndex(g => g.subject_id === subjectId);
      if (idx !== -1) {
        const next = [...list];
        next[idx] = { ...next[idx], [field]: value };
        return { ...prev, [uid]: next };
      }
      return { ...prev, [uid]: [...list, { subject_id: subjectId, [field]: value, student_id: student.id }] };
    });
  };

  const saveGrades = async (uid, enr) => {
    setSavingMap(p => ({ ...p, [uid]: true }));
    const list = gradeMap[uid] || [];
    const semNum = semToNum(enr.semester);
    const payload = list.map(g => ({
      subject_id: g.subject_id,
      grade:    g.grade !== "" && g.grade !== undefined ? parseFloat(g.grade) : null,
      remarks:  g.remarks || (g.grade ? (parseFloat(g.grade) <= 3.0 ? "PASSED" : "FAILED") : ""),
      semester: semNum,
      year_start: parseInt(enr.year_enrolled),
      year_end:   parseInt(enr.year_enrolled) + 1,
    }));
    let success = false;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/erd/grades/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_id: student.id, grades: payload }),
      });
      success = res.ok;
    } catch (_) {}
    setSavingMap(p => ({ ...p, [uid]: false }));

    if (success) {
      // Lock the rows that were just graded so they go read-only immediately —
      // they'll show as fully "saved" with real ids next time this loads from the server.
      setGradeMap(prev => {
        const prevList = prev[uid] || [];
        const next = prevList.map(g =>
          payload.some(p => p.subject_id === g.subject_id) ? { ...g, _justSaved: true } : g
        );
        return { ...prev, [uid]: next };
      });
      // Collapse this enrollment section — grades are now locked.
      // Clicking it again will re-expand it as read-only.
      setExpandedId(null);
      onSaved && onSaved();
    }
  };

  // Admin-only: delete a saved grade record, which unlocks that subject for editing again.
  const deleteGrade = async (uid, g) => {
    if (!g.id) return;
    showConfirm({
      message: "Delete this saved grade? The subject will become editable again.",
      confirmLabel: "Delete",
      icon: "🗑️",
      onConfirm: async () => {
        try {
          await fetch(`${import.meta.env.VITE_API_URL}/api/erd/grades/${g.id}`, { method: "DELETE" });
          showToast("Grade deleted.", "info");
        } catch (_) {}
        setGradeMap(prev => {
          const list = prev[uid] || [];
          const idx  = list.findIndex(gr => gr.subject_id === g.subject_id);
          if (idx === -1) return prev;
          const next = [...list];
          next[idx] = { ...next[idx], id: undefined, grade: "", remarks: "", _justSaved: false };
          return { ...prev, [uid]: next };
        });
      },
    });
  };

  // subjects for this student's course
  const courseSubjects = (subjects || []).filter(s => s.course === student.course);

  const generateIdCard = async () => {
    const toB64 = async (url) => {
      try {
        const blob = await (await fetch(url)).blob();
        return await new Promise(res => { const r = new FileReader(); r.onloadend = () => res(r.result); r.readAsDataURL(blob); });
      } catch { return ""; }
    };
    const [logoB64, bgB64] = await Promise.all([toB64(ccaLogo), toB64(ccaBg)]);
    const win = window.open("", "_blank", "width=440,height=760");
    if (!win) return;
    const sn = student.student_number || "—";
    const photoEl = student.profile_picture
      ? `<img src="${student.profile_picture}" style="width:100%;height:100%;object-fit:cover;display:block;border-radius:8px;"/>`
      : `<svg viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg" style="width:60px;height:76px;opacity:0.55">
           <circle cx="50" cy="36" r="24" fill="#8a9a8a"/>
           <path d="M2 118 C2 80 98 80 98 118 Z" fill="#8a9a8a"/>
         </svg>`;

    win.document.write(`<!DOCTYPE html><html><head>
<meta charset="utf-8"/>
<title>Student ID — ${fullName}</title>
<link href="https://fonts.googleapis.com/css2?family=Libre+Barcode+39&family=Inter:wght@400;600;700;800;900&display=swap" rel="stylesheet"/>
<style>
@page { size: 2.125in 3.375in; margin: 0; }
*{box-sizing:border-box;margin:0;padding:0;}
body{
  font-family:'Inter',system-ui,sans-serif;
  background:radial-gradient(ellipse at 40% 40%,#7a7a7a,#444);
  min-height:100vh;
  display:flex;flex-direction:column;
  align-items:center;justify-content:center;
  padding:28px 20px;gap:18px;
}

/* ── CARD  (CR80 portrait: 2.125" × 3.375" → display at ~153 dpi) ── */
.card{
  width:325px;
  height:516px;
  border-radius:16px;
  overflow:hidden;
  position:relative;
  background:#fff;
  box-shadow:0 0 0 1px rgba(255,255,255,0.2),0 4px 14px rgba(0,0,0,0.3),0 22px 62px rgba(0,0,0,0.55);
  flex-shrink:0;
}

/* ── LANYARD ── */
.lanyard{
  position:absolute;top:-1px;left:50%;
  transform:translateX(-50%);
  width:42px;height:21px;
  background:#fff;border-radius:0 0 20px 20px;
  z-index:30;
  display:flex;align-items:center;justify-content:center;
  box-shadow:inset 0 -2px 5px rgba(0,0,0,0.1);
}
.lanyard-hole{
  width:26px;height:13px;border-radius:8px;
  background:#dce8dc;border:2.5px solid #b8ccb8;
}

/* ── WHITE HEADER ── */
.header{
  position:absolute;top:0;left:0;right:0;height:130px;
  background:#fff;
  display:flex;align-items:center;
  padding:20px 14px 10px;gap:10px;z-index:10;
}
.logo{width:82px;height:82px;object-fit:contain;flex-shrink:0;}
.hinfo{flex:1;}
.h-of{font-size:9px;font-weight:700;color:#3d6e01;letter-spacing:0.5px;text-transform:uppercase;}
.h-nm{font-size:23px;font-weight:900;color:#3d6e01;line-height:1.05;letter-spacing:-0.5px;text-transform:uppercase;}
.h-gl{height:2.5px;background:linear-gradient(90deg,#F4B400,#c89800);border-radius:2px;margin:5px 0 4px;}
.h-tg{font-size:8px;font-weight:800;color:#F4B400;letter-spacing:2.5px;text-transform:uppercase;}

/* ── GREEN BODY (fills everything below header) ── */
.body{
  position:absolute;
  top:128px;left:0;right:0;bottom:0;   /* 516-128 = 388px tall */
  background:linear-gradient(175deg,#3d6e01 0%,#1f3800 60%,#182e00 100%);
  overflow:hidden;
}

/* Building watermark — upper-RIGHT quadrant */
.bldg{
  position:absolute;top:0;right:0;
  width:200px;height:175px;
  ${bgB64 ? `background:url('${bgB64}') right top/cover no-repeat;` : ''}
  opacity:0.18;
  mask-image:linear-gradient(to left,rgba(0,0,0,1) 20%,rgba(0,0,0,0.6) 55%,transparent 90%);
  -webkit-mask-image:linear-gradient(to left,rgba(0,0,0,1) 20%,rgba(0,0,0,0.6) 55%,transparent 90%);
}

/* "STUDENT" vertical — far LEFT strip, behind photo */
.vert{
  position:absolute;top:0;left:0;width:46px;
  bottom:82px;                   /* stop at barcode */
  display:flex;align-items:center;justify-content:center;
  z-index:2;overflow:hidden;
}
.vert-text{
  writing-mode:vertical-rl;
  transform:rotate(180deg);
  font-size:52px;font-weight:900;
  color:rgba(255,255,255,0.17);
  letter-spacing:8px;
  user-select:none;line-height:1;white-space:nowrap;
}

/* Photo — LEFT-aligned in green area (left:52px so it overlaps STUDENT strip) */
.photo-wrap{
  position:absolute;
  top:14px;left:52px;
  width:122px;height:152px;
  border-radius:10px;
  border:3px solid #3d6e01;
  background:#9aaa9a;
  overflow:hidden;
  display:flex;align-items:center;justify-content:center;
  box-shadow:0 5px 18px rgba(0,0,0,0.42),0 0 0 1px rgba(255,255,255,0.1);
  z-index:5;
}

/* Gold diagonal wave — just below photo */
/* rendered inline as <svg> in HTML */

/* Student info — centered, below wave */
.info{
  position:absolute;
  top:200px;left:0;right:0;
  text-align:center;z-index:5;
  padding:0 14px;
}
.sname{font-size:18px;font-weight:900;color:#fff;text-transform:uppercase;letter-spacing:0.4px;line-height:1.2;text-shadow:0 1px 5px rgba(0,0,0,0.35);}
.scourse{font-size:9px;font-weight:700;color:#F4B400;text-transform:uppercase;letter-spacing:0.5px;margin-top:3px;}
.sdiv{height:1px;background:rgba(244,180,0,0.42);margin:8px auto;width:70%;}
.sid{font-size:20px;font-weight:900;color:#fff;letter-spacing:2px;text-shadow:0 1px 4px rgba(0,0,0,0.3);}
.sidlabel{font-size:7.5px;font-weight:700;color:#F4B400;letter-spacing:3px;text-transform:uppercase;margin-top:2px;}

/* Barcode — white strip at bottom */
.barcode{
  position:absolute;bottom:0;left:0;right:0;
  height:82px;
  background:#fff;
  border-top:3px solid #F4B400;
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  padding:4px 8px 8px;z-index:10;
}
.bc{font-family:'Libre Barcode 39',cursive;font-size:52px;line-height:1;color:#111;letter-spacing:3px;}
.bc-num{font-size:8.5px;color:#444;letter-spacing:2.5px;margin-top:-2px;}

/* Print button */
.pbtn{
  padding:12px 38px;
  background:linear-gradient(135deg,#3d6e01,#182e00);
  color:#fff;border:none;border-radius:10px;
  font-weight:800;cursor:pointer;font-size:14px;
  font-family:inherit;letter-spacing:0.5px;
  box-shadow:0 4px 14px rgba(0,0,0,0.35);
}
.pbtn:hover{opacity:0.9;}
@media print{
  .pbtn{display:none;}
  body{background:none;padding:0;min-height:unset;}
  .card{width:2.125in;height:3.375in;border-radius:0;box-shadow:none;}
}
</style></head><body>

<div class="card">

  <!-- Lanyard slot -->
  <div class="lanyard"><div class="lanyard-hole"></div></div>

  <!-- White header -->
  <div class="header">
    ${logoB64
      ? `<img src="${logoB64}" class="logo"/>`
      : `<div class="logo" style="background:#c0d4c0;border-radius:50%;"></div>`}
    <div class="hinfo">
      <div class="h-of">Community College of</div>
      <div class="h-nm">Alangalang</div>
      <div class="h-gl"></div>
      <div class="h-tg">Learn &bull; Grow &bull; Serve</div>
    </div>
  </div>

  <!-- Green body -->
  <div class="body">

    <!-- Building — upper right watermark -->
    <div class="bldg"></div>

    <!-- STUDENT — vertical left-edge watermark -->
    <div class="vert"><div class="vert-text">STUDENT</div></div>

    <!-- Photo — left-aligned -->
    <div class="photo-wrap">${photoEl}</div>

    <!-- Gold wave — just below photo bottom (14+152=166px) -->
    <svg style="position:absolute;top:168px;left:0;width:100%;overflow:visible;z-index:4;"
         height="24" viewBox="0 0 325 24"
         xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
      <!-- main gold band -->
      <path d="M 0 20 Q 82 3 166 11 Q 244 19 325 3 L 325 16 Q 244 32 166 24 Q 82 16 0 33 Z"
            fill="#F4B400"/>
      <!-- darker thin highlight above -->
      <path d="M 0 12 Q 82 -3 166 4 Q 244 11 325 -3 L 325 3 Q 244 17 166 10 Q 82 3 0 19 Z"
            fill="#c89000" opacity="0.5"/>
    </svg>

    <!-- Student info -->
    <div class="info">
      <div class="sname">${fullName}</div>
      <div class="scourse">${student.course || "—"}</div>
      <div class="sdiv"></div>
      <div class="sid">${sn}</div>
      <div class="sidlabel">Student ID Number</div>
    </div>

    <!-- Barcode -->
    <div class="barcode">
      <div class="bc">*${sn}*</div>
      <div class="bc-num">${sn}</div>
    </div>

  </div>
</div>

<button class="pbtn" onclick="window.print()">🖨️ Print ID Card</button>
</body></html>`);
    win.document.close();
  };

  return (
    <div style={{ background: WHITE, borderRadius: "10px", overflow: "hidden" }}>
      {/* Action toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", background: WHITE, borderBottom: `1px solid ${BORDER}`, flexWrap: "wrap" }}>
        {isGraduated && (
          <span style={{ background: "#7C3AED", color: "#fff", fontSize: "11px", fontWeight: 800, borderRadius: "5px", padding: "3px 10px" }}>🎓 GRADUATED</span>
        )}
        <button type="button" onClick={() => setShowSIForm(true)}
          style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 14px", background: DARK_GREEN, color: WHITE, border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><polyline points="14 3 14 8 19 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/></svg>
          Student Information
        </button>
        <button type="button" onClick={() => setShowCORPicker(true)}
          style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 14px", background: WHITE, color: DARK_GREEN, border: `1px solid ${BORDER}`, borderRadius: "6px", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6M9 13h6M9 17h4"/></svg>
          Certificate of Registration
        </button>
        <button type="button" onClick={generateIdCard}
          style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 14px", background: WHITE, color: DARK_GREEN, border: `1px solid ${BORDER}`, borderRadius: "6px", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>
          🪪 Generate ID Card
        </button>
      </div>

      {/* SI Form modal */}
      {showSIForm && (
        <StudentSIFormModal
          student={student}
          courses={courses}
          onClose={() => setShowSIForm(false)}
          onUpdated={onUpdated}
          activeSchoolYear={activeSchoolYear}
        />
      )}

      {/* COR enrollment picker */}
      {showCORPicker && createPortal(
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2147483647 }}>
          <div style={{ background: WHITE, borderRadius: "12px", width: "560px", maxHeight: "80vh", display: "flex", flexDirection: "column", boxShadow: "0 8px 40px rgba(0,0,0,0.3)", overflow: "hidden" }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: `1px solid ${BORDER}` }}>
              <div>
                <div style={{ fontSize: "15px", fontWeight: 800, color: DARK_GREEN }}>Certificate of Registration</div>
                <div style={{ fontSize: "12px", color: GRAY, marginTop: "2px" }}>Select an enrollment to print its COR</div>
              </div>
              <button type="button" onClick={() => setShowCORPicker(false)}
                style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: GRAY, lineHeight: 1, padding: "4px 8px" }}>✕</button>
            </div>

            {/* Enrollment list */}
            <div style={{ overflowY: "auto", padding: "8px 0" }}>
              {enrollments.length === 0 ? (
                <div style={{ padding: "40px", textAlign: "center", color: GRAY, fontSize: "13px" }}>No enrollment records found.</div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ background: "#f5f3ea", borderBottom: `2px solid ${BORDER}` }}>
                      <th style={{ padding: "10px 20px", textAlign: "left", fontWeight: 700, color: DARK_GREEN, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em" }}>#</th>
                      <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 700, color: DARK_GREEN, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Year Level</th>
                      <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 700, color: DARK_GREEN, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Semester</th>
                      <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 700, color: DARK_GREEN, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em" }}>School Year</th>
                      <th style={{ padding: "10px 16px", textAlign: "center", fontWeight: 700, color: DARK_GREEN, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enrollments.map((enr, idx) => (
                      <tr key={enr.id ?? idx}
                        onClick={async () => {
                          const sem = enr.semester || "";
                          const termNum = sem.toLowerCase().includes("1st") ? "1"
                            : sem.toLowerCase().includes("2nd") ? "2"
                            : sem.toLowerCase().includes("summer") ? "S"
                            : sem || "—";
                          setCorSemester(termNum);
                          setCorSchedule([]);
                          setShowCORPicker(false);
                          setShowCOR(true);
                          if (student.course && enr.year_level && student.section) {
                            try {
                              const params = new URLSearchParams({
                                course: student.course,
                                year_level: enr.year_level,
                                section: student.section,
                                ...(sem ? { semester: sem } : {}),
                                fallback: "1",
                              });
                              const res = await fetch(`${import.meta.env.VITE_API_URL}/api/erd/class-schedule?${params}`);
                              if (res.ok) setCorSchedule(await res.json());
                            } catch (_) {}
                          }
                        }}
                        style={{ borderBottom: `1px solid ${BORDER}`, cursor: "pointer", transition: "background 0.12s" }}
                        onMouseEnter={e => e.currentTarget.style.background = "#f2f9e8"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        <td style={{ padding: "13px 20px", color: GRAY, fontWeight: 600, fontSize: "12px" }}>{idx + 1}</td>
                        <td style={{ padding: "13px 16px", fontWeight: 700, color: "#111827" }}>{enr.year_level}</td>
                        <td style={{ padding: "13px 16px", color: "#374151" }}>{enr.semester}</td>
                        <td style={{ padding: "13px 16px", color: GRAY }}>S.Y. {enr.year_enrolled}–{parseInt(enr.year_enrolled) + 1}</td>
                        <td style={{ padding: "13px 16px", textAlign: "center" }}>
                          <span style={{ fontSize: "11px", padding: "3px 12px", borderRadius: "4px", background: "#eaf2d9", color: GREEN, fontWeight: 700, letterSpacing: "0.04em" }}>ENROLLED</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Certificate of Registration modal */}
      {showCOR && createPortal(
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 2147483647, overflowY: "auto", padding: "16px" }}>
          <div style={{ background: WHITE, borderRadius: "8px", width: "816px", flexShrink: 0, boxShadow: "0 8px 40px rgba(0,0,0,0.3)" }}>

            {/* Modal toolbar */}
            <div className="no-print" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 16px", borderBottom: `1px solid ${BORDER}` }}>
              <span style={{ fontWeight: 700, fontSize: "13px", color: DARK_GREEN }}>Certificate of Registration — Preview</span>
              <div style={{ display: "flex", gap: "8px" }}>
                <button type="button" onClick={() => window.print()}
                  style={{ padding: "5px 14px", background: DARK_GREEN, color: WHITE, border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>
                  🖨 Print (Folio)
                </button>
                <button type="button" onClick={() => setShowCOR(false)}
                  style={{ padding: "5px 10px", background: WHITE, border: `1px solid ${BORDER}`, borderRadius: "6px", fontSize: "12px", cursor: "pointer" }}>
                  ✕
                </button>
              </div>
            </div>

            {/* Print CSS — folio, exact colors, fits at 100% */}
            <style>{`
              @media print {
                @page { size: 8.5in 13in; margin: 0; }
                body * { visibility: hidden !important; }
                #cor-printable, #cor-printable * {
                  visibility: visible !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                  color-adjust: exact !important;
                }
                #cor-printable {
                  position: fixed !important;
                  top: 0 !important;
                  left: 0 !important;
                  width: 8.5in !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                .no-print { display: none !important; }
              }
              #cor-printable * {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            `}</style>

            {/* Certificate — 2 copies */}
            {(() => {
              const s = student;
              const today = new Date().toLocaleDateString("en-PH", { month: "2-digit", day: "2-digit", year: "numeric" });
              const sy = `${new Date().getFullYear()}-${new Date().getFullYear()+1}`;
              const BLANK_ROWS = 10;
              const rows = [...corSchedule];
              while (rows.length < BLANK_ROWS) rows.push(null);

              /* Base cell styles */
              const C = { border: "1px solid #444", padding: "1px 2px", fontSize: "7pt", fontFamily: TNR, textAlign: "center", verticalAlign: "middle", lineHeight: "1.05" };
              const H = { ...C, fontWeight: 700, background: "#e8e8e8", fontSize: "6.5pt", padding: "1px 2px", WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" };

              const OneCopy = ({ label }) => (
                <div style={{ fontFamily: TNR, padding: "33px 28px 6px 28px", position: "relative" }}>
                  {/* Watermark centered within this copy */}
                  <img
                    src={ccaLogo}
                    alt=""
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      width: "500px",
                      height: "500px",
                      objectFit: "contain",
                      opacity: 0.1,
                      pointerEvents: "none",
                      zIndex: 0,
                      WebkitPrintColorAdjust: "exact",
                      printColorAdjust: "exact",
                    }}
                  />
                  {/* School header — logos absolute left, text truly centered full-width */}
                  <div style={{ position: "relative", minHeight: "60px", display: "flex", alignItems: "center", marginBottom: "2px" }}>
                    <div style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", display: "flex", alignItems: "center" }}>
                      <img src={alangalangLogo} alt="Alangalang" style={{ width: "70px", height: "70px", objectFit: "contain", marginTop: "-15px" }} />
                    </div>
                    <div style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <img src={ccaLogo} alt="CCA" style={{ width: "75px", height: "75px", objectFit: "contain", marginTop: "-18px" }} />
                      <div style={{ fontSize: "6.5pt", color: "#555", fontStyle: "italic", marginTop: "-2px" }}>{label}</div>
                    </div>
                    <div style={{ width: "100%", textAlign: "center" }}>
                      <div style={{ fontSize: "8pt", fontFamily: TNR }}>Republic of the Philippines</div>
                      <div style={{ fontSize: "14pt", fontWeight: 900, fontFamily: TNR, textTransform: "uppercase", letterSpacing: "0.5px", lineHeight: 1.1, whiteSpace: "nowrap" }}>Community College of Alangalang</div>
                      <div style={{ fontSize: "8pt", fontFamily: TNR }}>Alangalang, Leyte</div>
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
                      <td style={C}>{s.student_number || "—"}</td><td style={C}>{s.last_name || "—"}</td>
                      <td style={C}>{s.first_name || "—"}</td><td style={C}>{s.middle_name || "—"}</td>
                      <td style={C}>{s.gender || "—"}</td><td style={C}>{sy}</td>
                      <td style={C}>{corSemester || "—"}</td><td style={C}>{s.year_level || "—"}</td>
                    </tr></tbody>
                  </table>

                  {/* Date + Program */}
                  <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "2px", tableLayout: "fixed" }}>
                    <colgroup><col style={{ width: "18%" }} /><col /></colgroup>
                    <thead><tr><th style={H}>DATE OF REGISTRATION</th><th style={H}>PROGRAM</th></tr></thead>
                    <tbody><tr><td style={C}>{today}</td><td style={C}>{s.course || "—"}</td></tr></tbody>
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
                      <div style={{ borderBottom: "1px solid #333", marginBottom: "2px", height: "22px", display: "flex", alignItems: "flex-end", justifyContent: "center", fontWeight: 800, fontSize: "8pt", fontFamily: TNR, textTransform: "uppercase" }}>{registrarSignName}</div>
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

              return (
                <div id="cor-printable" style={{ background: WHITE }}>
                  <div style={{ position: "relative", zIndex: 1 }}>
                    <OneCopy label="Student's Copy" />
                    <div style={{ borderTop: "2px dashed #999", margin: "16px 14px 16px 14px" }} />
                    <OneCopy label="School's Copy" />
                  </div>
                </div>
              );
            })()}
          </div>
        </div>,
        document.body
      )}

      {/* Enrollment history */}
      <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: "8px" }}>
        <div style={{ fontSize: "11px", fontWeight: 700, color: GRAY, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "2px" }}>Enrollment Records</div>
        {enrollments.length === 0 ? (
          <div style={{ padding: "32px", textAlign: "center", color: GRAY, fontSize: "14px", background: LIGHT_GRAY, borderRadius: "10px", border: `1px dashed ${BORDER}` }}>
            No enrollment records yet.
          </div>
        ) : (
          enrollments.map((enr, idx) => {
            const uid = enr.id ?? `idx-${idx}`;
            const isOpen = expandedId === uid;
            const grades = gradeMap[uid] || [];
            const isLoading = loadingMap[uid];
            const isSaving  = savingMap[uid];

            // subjects filtered to this semester
            const semNum = semToNum(enr.semester);
            const semSubjects = courseSubjects.filter(s => parseInt(s.semester) === semNum && (s.year_level === enr.year_level || !s.year_level));

            return (
              <div key={uid} style={{ border: `1px solid ${BORDER}`, borderRadius: "10px", overflow: "hidden" }}>
                {/* Accordion header */}
                <div
                  onClick={() => {
                    const next = isOpen ? null : uid;
                    setExpandedId(next);
                    if (next) loadGrades(uid, student.id, enr.year_level, enr.semester);
                  }}
                  style={{ width: "100%", boxSizing: "border-box", display: "flex", alignItems: "center", gap: "10px", padding: "11px 16px", background: isOpen ? "#f2f9e8" : WHITE, border: "none", cursor: "pointer", textAlign: "left", borderBottom: isOpen ? `1px solid ${BORDER}` : "none" }}>
                  <span style={{ fontSize: "12px", color: isOpen ? GREEN : GRAY, display: "inline-block", transform: isOpen ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s", flexShrink: 0 }}>▶</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: "13px", color: "#111827" }}>{enr.year_level} — {enr.semester}</div>
                    <div style={{ fontSize: "11px", color: GRAY, marginTop: "1px" }}>S.Y. {enr.year_enrolled}–{parseInt(enr.year_enrolled) + 1}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                    <span style={{ fontSize: "11px", padding: "3px 10px", borderRadius: "20px", background: "#eaf2d9", color: GREEN, fontWeight: 700, whiteSpace: "nowrap" }}>✓ ENROLLED</span>
                    {canManageEnrollment && (
                      <button type="button"
                        onClick={(e) => { e.stopPropagation(); onDeleteEnrollment && onDeleteEnrollment(enr); }}
                        title="Delete this enrollment record — use if it was enrolled by mistake"
                        style={{ background: "#FEE2E2", border: `1px solid #FCA5A5`, borderRadius: "7px", cursor: "pointer", fontSize: "13px", color: RED, padding: "6px 10px", lineHeight: 1, flexShrink: 0 }}>
                        🗑️
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded: enrollment info + grade sheet */}
                {isOpen && graduationLocked && (
                  <div style={{ margin: "8px 16px", padding: "8px 14px", background: "#F5F3FF", border: "1px solid #DDD6FE", borderRadius: "6px", fontSize: "11px", color: "#6D28D9", fontWeight: 700 }}>
                    🎓 This student has graduated — grades are locked. Contact an Administrator to make changes.
                  </div>
                )}
                {isOpen && (
                  <div style={{ background: LIGHT_GRAY, borderTop: `1px solid ${BORDER}` }}>
                    {/* Enrollment detail strip */}
                    <div style={{ padding: "10px 16px 10px 42px", display: "grid", gridTemplateColumns: "130px 1fr 130px 1fr", gap: "4px 16px", fontSize: "12px", borderBottom: `1px solid ${BORDER}` }}>
                      <span style={{ color: GRAY, fontWeight: 700 }}>Year Enrolled</span><span>{enr.year_enrolled}</span>
                      <span style={{ color: GRAY, fontWeight: 700 }}>School Year</span><span>S.Y. {enr.year_enrolled}–{parseInt(enr.year_enrolled) + 1}</span>
                      <span style={{ color: GRAY, fontWeight: 700 }}>Year Level</span><span>{enr.year_level}</span>
                      <span style={{ color: GRAY, fontWeight: 700 }}>Semester</span><span>{enr.semester}</span>
                      <span style={{ color: GRAY, fontWeight: 700 }}>Status</span><span style={{ color: GREEN, fontWeight: 700 }}>ENROLLED</span>
                    </div>

                    {/* Grade sheet */}
                    <div style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                        <div>
                          <div style={{ fontSize: "13px", fontWeight: 800, color: DARK_GREEN }}>
                            {student.first_name} {student.last_name}
                          </div>
                          <div style={{ fontSize: "11px", color: GRAY }}>Grade Sheet — {enr.year_level} {enr.semester}</div>
                        </div>
                        <button type="button" onClick={() => saveGrades(uid, enr)} disabled={isSaving}
                          style={{ padding: "7px 16px", background: GREEN, color: WHITE, border: "none", borderRadius: "6px", fontWeight: 700, fontSize: "12px", cursor: "pointer" }}>
                          {isSaving ? "⏳ Saving..." : "💾 Save Grades"}
                        </button>
                      </div>

                      {isLoading ? (
                        <div style={{ padding: "20px", textAlign: "center", color: GRAY, fontSize: "12px" }}>⏳ Loading grades...</div>
                      ) : semSubjects.length === 0 ? (
                        <div style={{ padding: "16px", textAlign: "center", color: GRAY, fontSize: "12px", border: `1px dashed ${BORDER}`, borderRadius: "6px" }}>
                          No subjects found for {enr.year_level} {enr.semester}.
                        </div>
                      ) : (
                        <div style={{ background: WHITE, borderRadius: "8px", border: `1px solid ${BORDER}`, overflow: "hidden" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                            <thead>
                              <tr style={{ background: LIGHT_GRAY, fontSize: "11px", color: GRAY, textTransform: "uppercase" }}>
                                <th style={{ padding: "9px 12px", borderBottom: `1px solid ${BORDER}` }}>Code</th>
                                <th style={{ padding: "9px 12px", borderBottom: `1px solid ${BORDER}` }}>Subject</th>
                                <th style={{ padding: "9px 12px", borderBottom: `1px solid ${BORDER}` }}>Units</th>
                                <th style={{ padding: "9px 12px", borderBottom: `1px solid ${BORDER}` }}>Grade (1.00–5.00)</th>
                                <th style={{ padding: "9px 12px", borderBottom: `1px solid ${BORDER}` }}>Remarks</th>
                              </tr>
                            </thead>
                            <tbody>
                              {semSubjects.map(sub => {
                                const g = grades.find(gr => gr.subject_id === sub.id) || {};
                                const isAssigned = assignedSubjectIds.has(sub.id);
                                const isLocked   = !!g.id || !!g._justSaved;
                                const canEdit    = canGrade ? (!isLocked && !graduationLocked) : (isAssigned && !isLocked && !graduationLocked);
                                const remarksPlaceholder = graduationLocked ? "🎓 Graduated — locked" : isLocked ? "🔒 Saved" : (!canGrade && !isAssigned) ? "🔒 Not assigned" : "PASSED / FAILED";
                                const lockReason = isLocked
                                  ? "Grade already saved — delete it to edit again"
                                  : (!canGrade && !isAssigned)
                                    ? "You are not assigned to teach this subject"
                                    : "";
                                return (
                                  <tr key={sub.id} style={{ borderBottom: `1px solid ${BORDER}`, opacity: (canGrade || isAssigned) ? 1 : 0.6 }}>
                                    <td style={{ padding: "9px 12px", fontSize: "12px", fontWeight: 700, color: BLUE }}>{sub.subject_code || sub.id}</td>
                                    <td style={{ padding: "9px 12px", fontSize: "12px" }}>{sub.subject_title}</td>
                                    <td style={{ padding: "9px 12px", fontSize: "12px" }}>{sub.units}</td>
                                    <td style={{ padding: "9px 12px" }}>
                                      <input type="number" step="0.25" min="1.0" max="5.0" placeholder="0.00"
                                        value={g.grade || ""}
                                        disabled={!canEdit}
                                        title={lockReason}
                                        onChange={e => updateGrade(uid, sub.id, "grade", e.target.value)}
                                        style={{ width: "80px", padding: "4px 8px", fontSize: "12px", border: `1px solid ${BORDER}`, borderRadius: "4px", background: canEdit ? WHITE : LIGHT_GRAY, color: canEdit ? "#111827" : GRAY, cursor: canEdit ? "text" : "not-allowed" }} />
                                    </td>
                                    <td style={{ padding: "9px 12px" }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                        <input type="text" placeholder={remarksPlaceholder}
                                          value={g.remarks || ""}
                                          disabled={!canEdit}
                                          title={lockReason}
                                          onChange={e => updateGrade(uid, sub.id, "remarks", e.target.value)}
                                          style={{ width: "130px", padding: "4px 8px", fontSize: "12px", border: `1px solid ${BORDER}`, borderRadius: "4px", background: canEdit ? WHITE : LIGHT_GRAY, color: canEdit ? "#111827" : GRAY, cursor: canEdit ? "text" : "not-allowed" }} />
                                        {canDeleteGrade && g.id && (
                                          <button type="button" onClick={() => deleteGrade(uid, g)}
                                            title="Delete saved grade"
                                            style={{ background: "none", border: "none", cursor: "pointer", fontSize: "13px", color: RED, padding: "2px" }}>
                                            🗑️
                                          </button>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function AddStudents({ user = {} }) {
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [coursesList, setCoursesList] = useState([]);
  const [userRolesMap, setUserRolesMap] = useState({}); // users_id -> roles[]
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [filterCourse,  setFilterCourse]  = useState("");
  const [filterYear,    setFilterYear]    = useState("");
  const [filterSection, setFilterSection] = useState("");
  const [filterClassification, setFilterClassification] = useState(""); // Regular / Irregular
  const [photoPreview,  setPhotoPreview]  = useState(null); // { src, name } — enlarged photo

  // Subjects the CURRENTLY LOGGED-IN user is assigned to teach (erd_subject_load).
  // Grade inputs in the Student List view are locked unless the subject is in here.
  const [assignedSubjectIds, setAssignedSubjectIds] = useState(new Set());

  // 3-dot dropdown
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });

  // Enroll modal
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [enrollTarget, setEnrollTarget] = useState(null);
  const [activeSchoolYear, setActiveSchoolYear] = useState(null);
  const [enrollForm, setEnrollForm] = useState({ school_year: "", year_enrolled: new Date().getFullYear(), year_level: "1st Year", semester: "1st Semester" });
  const [savingEnroll, setSavingEnroll] = useState(false);
  const [enrollQr, setEnrollQr] = useState(null); // set after a successful enrollment — shows the student's QR code
  const [qrStudent, setQrStudent] = useState(null); // { student } — shows QR modal from student list

  // View student info modal
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewStudent, setViewStudent] = useState(null);
  const [viewEnrollments, setViewEnrollments] = useState([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef(null);

  const handlePhotoUpload = async (file) => {
    if (!file || !viewStudent) return;
    setUploadingPhoto(true);
    try {
      const base64 = await processProfileImage(file); // crisp HD square
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/erd/students/${viewStudent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...viewStudent, profile_picture: base64 }),
      });
      if (res.ok) {
        const updated = { ...viewStudent, profile_picture: base64 };
        setViewStudent(updated);
        setStudents(prev => prev.map(s => s.id === viewStudent.id ? updated : s));
        showToast("Profile photo updated!", "success");
      } else { showToast("Failed to upload photo.", "error"); }
    } catch { showToast("Could not process image.", "error"); }
    setUploadingPhoto(false);
  };
  const [loadingEnrollments, setLoadingEnrollments] = useState(false);

  // local fallback store for enrollment records
  const [localEnrollments, setLocalEnrollments] = useState({});


  // Save confirmation toast, shown right before the View modal auto-closes.
  const [toast, setToast] = useState(null);
  const saveToastTimer = useRef(null);

  const handleGradesSaved = () => {
    setToast({ msg: "✅ Grades saved successfully. The record is now locked — only an administrator can delete a grade to edit it again." });
    if (saveToastTimer.current) clearTimeout(saveToastTimer.current);
    saveToastTimer.current = setTimeout(() => {
      setShowViewModal(false);
      setToast(null);
    }, 1800);
  };

  useEffect(() => { fetchStudentDirectory(); }, []);

  useEffect(() => {
    return () => { if (saveToastTimer.current) clearTimeout(saveToastTimer.current); };
  }, []);

  // Fetch active school year so enrollment forms auto-populate it
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/erd/school-years/active`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.school_year) setActiveSchoolYear(data.school_year); })
      .catch(() => {});
  }, []);

  // Load which subjects the current logged-in user is assigned to teach.
  useEffect(() => {
    if (!user?.id) { setAssignedSubjectIds(new Set()); return; }
    (async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/erd/faculty/assignments/${user.id}`);
        if (res.ok) {
          const rows = await res.json();
          setAssignedSubjectIds(new Set(rows.map(r => r.subject_id)));
        } else {
          setAssignedSubjectIds(new Set());
        }
      } catch (_) {
        setAssignedSubjectIds(new Set());
      }
    })();
  }, [user?.id]);

  useEffect(() => {
    if (openDropdownId === null) return;
    const close = () => setOpenDropdownId(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [openDropdownId]);

  const fetchStudentDirectory = async () => {
    setLoading(true);
    try {
      const [sRes, subRes, usersRes, cRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/api/erd/students`),
        fetch(`${import.meta.env.VITE_API_URL}/api/erd/subjects`),
        fetch(`${import.meta.env.VITE_API_URL}/api/erd/users`),
        fetch(`${import.meta.env.VITE_API_URL}/api/erd/courses`),
      ]);
      if (sRes.ok) setStudents(await sRes.json());
      if (subRes.ok) setSubjects(await subRes.json());
      if (cRes.ok) { const cd = await cRes.json(); setCoursesList(cd.map(c => c.course)); }
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        // Build a map of users_id -> roles[] for quick role lookup
        const rolesMap = {};
        usersData.forEach(u => {
          rolesMap[u.id] = Array.isArray(u.roles)
            ? u.roles.map(r => r.toLowerCase())
            : (u.role ? [u.role.toLowerCase()] : []);
        });
        setUserRolesMap(rolesMap);
      }
    } catch (err) {
      console.error("Failed to load student list:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleGraduate = async (student) => {
    const isCurrentlyGraduated = student.graduation_status === "graduated";
    const action = isCurrentlyGraduated ? null : "graduated";
    const msg = isCurrentlyGraduated
      ? `Revert ${student.first_name} ${student.last_name}'s graduation status?`
      : `Mark ${student.first_name} ${student.last_name} as GRADUATED? Grades will be locked for non-admins.`;
    showConfirm({
      message: msg,
      confirmLabel: isCurrentlyGraduated ? "Revert" : "Graduate",
      icon: "🎓",
      onConfirm: async () => {
        try {
          const res = await fetch(`${import.meta.env.VITE_API_URL}/api/erd/students/${student.id}/graduate`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ graduation_status: action }),
          });
          if (res.ok) {
            showToast(action === "graduated" ? `${student.first_name} ${student.last_name} marked as graduated.` : "Graduation status cleared.", "success");
            fetchStudentDirectory();
          } else {
            showToast("Failed to update graduation status.", "error");
          }
        } catch { showToast("Network error.", "error"); }
      },
    });
  };

  const fetchEnrollmentsForStudent = async (studentId) => {
    setLoadingEnrollments(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/erd/enrollments/${studentId}`);
      if (res.ok) {
        setViewEnrollments(await res.json());
        setLoadingEnrollments(false);
        return;
      }
    } catch (_) {}
    setViewEnrollments(localEnrollments[studentId] || []);
    setLoadingEnrollments(false);
  };

  const openViewModal = async (student) => {
    setViewStudent(student);
    setShowViewModal(true);
    await fetchEnrollmentsForStudent(student.id);
  };

  // Delete a single enrollment period record — for fixing a mistaken enrollment.
  // Real (server-persisted) records are deleted via the API; locally queued
  // records (id starting with "local-", used as an offline fallback) are just
  // dropped from client state.
  const deleteEnrollment = (enr) => {
    showConfirm({
      message: `Delete enrollment record — ${enr.year_level} — ${enr.semester}, S.Y. ${enr.year_enrolled}–${parseInt(enr.year_enrolled) + 1}? This cannot be undone.`,
      confirmLabel: "Delete",
      icon: "🗑️",
      onConfirm: async () => {
        if (enr.id && !String(enr.id).startsWith("local-")) {
          try {
            await fetch(`${import.meta.env.VITE_API_URL}/api/erd/enrollments/${enr.id}`, { method: "DELETE" });
            showToast("Enrollment record deleted.", "info");
          } catch (_) {}
        }
        setViewEnrollments(prev => prev.filter(e => e.id !== enr.id));
        const studentId = viewStudent?.id ?? enr.student_id;
        if (studentId != null) {
          setLocalEnrollments(prev => ({
            ...prev,
            [studentId]: (prev[studentId] || []).filter(e => e.id !== enr.id)
          }));
        }
      },
    });
  };

  const openEnrollModal = (student) => {
    setEnrollTarget(student);
    const _y = new Date().getMonth() >= 5 ? new Date().getFullYear() : new Date().getFullYear() - 1;
    const _sy = activeSchoolYear || `${_y}-${_y + 1}`;
    const _yr = parseInt((_sy || "").split("-")[0]) || _y;
    setEnrollForm({ school_year: _sy, year_enrolled: _yr, year_level: "1st Year", semester: "1st Semester" });
    setEnrollQr(null);
    setShowEnrollModal(true);
  };

  const closeEnrollModal = () => {
    setShowEnrollModal(false);
    setEnrollQr(null);
  };

  const handleEnrollSubmit = async (e) => {
    e.preventDefault();
    if (savingEnroll || !enrollTarget) return;
    setSavingEnroll(true);

    const newRecord = {
      id: `local-${Date.now()}`,
      student_id: enrollTarget.id,
      year_enrolled: enrollForm.year_enrolled,
      year_level: enrollForm.year_level,
      semester: enrollForm.semester
    };

    let success = false;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/erd/enrollments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRecord)
      });
      if (res.ok) {
        const saved = await res.json().catch(() => newRecord);
        newRecord.id = saved.id || newRecord.id;
        success = true;
      }
    } catch (_) {}

    setLocalEnrollments(prev => ({
      ...prev,
      [enrollTarget.id]: [...(prev[enrollTarget.id] || []), newRecord]
    }));

    if (viewStudent?.id === enrollTarget.id) {
      setViewEnrollments(prev => [...prev, newRecord]);
    }

    setSavingEnroll(false);

    if (success) {
      // Generate this student's enrollment QR code right away instead of
      // closing the modal — gives the registrar something to print/save on
      // the spot to confirm the enrollment just went through.
      const fullName = `${enrollTarget.last_name}, ${enrollTarget.first_name} ${enrollTarget.middle_name || ""}`.replace(/\s+/g, " ").trim();
      const payload = [
        "CCA-ENROLL",
        enrollTarget.student_number || "—",
        fullName,
        enrollForm.year_level,
        enrollForm.semester,
        `SY ${enrollForm.year_enrolled}-${parseInt(enrollForm.year_enrolled) + 1}`,
      ].join("|");
      setEnrollQr({ payload, name: fullName, studentNumber: enrollTarget.student_number, summary: `${enrollForm.year_level} — ${enrollForm.semester}, S.Y. ${enrollForm.year_enrolled}–${parseInt(enrollForm.year_enrolled) + 1}` });
    } else {
      closeEnrollModal();
    }
  };

  // GET /api/erd/students already JOINs erd_student→erd_users,
  // so every row is a genuine student record — no role cross-check needed.
  const studentsWithRole = students;

  // Only Administrator and Registrar may enroll students. Pull the current
  // user's full role list from userRolesMap (built from GET /api/erd/users,
  // which already includes the logged-in user) and fall back to the single
  // `user.role` field if that map hasn't loaded yet.
  const myRoles = userRolesMap[user?.id] && userRolesMap[user.id].length > 0
    ? userRolesMap[user.id]
    : (user?.role ? [user.role.toLowerCase()] : []);
  const canEnroll = myRoles.includes("administrator") || myRoles.includes("registrar");
  const canDeleteStudent = myRoles.includes("administrator") || myRoles.includes("registrar"); // admin + registrar may delete students

  const deleteStudentRecord = async (s) => {
    if (!window.confirm(`Delete ${s.first_name} ${s.last_name} (${s.student_number || "—"})?\n\nThis permanently removes the student from the database and cannot be undone.`)) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/erd/students/${s.id}`, { method: "DELETE" });
      if (res.ok) { setStudents(prev => prev.filter(x => x.id !== s.id)); }
      else alert("Failed to delete student.");
    } catch { alert("Failed to delete student. Is the backend running?"); }
  };

  // Derive unique filter options from loaded students
  const courseOptions  = [...new Set(students.map(s => s.course).filter(Boolean))].sort();
  const yearOptions    = ["1st Year","2nd Year","3rd Year","4th Year"];
  const sectionOptions = [...new Set(students.map(s => s.section).filter(Boolean))].sort();

  // Sort by ID number ascending (2026-0001, 0002, 0003 … present).
  const _snKey = (s) => {
    const m = String(s.student_number || "").match(/^(\d{4})-(\d+)/);
    return m ? parseInt(m[1], 10) * 1000000 + parseInt(m[2], 10) : Number.MAX_SAFE_INTEGER;
  };
  const filteredStudents = studentsWithRole.filter(s => {
    if (s.graduation_status === "graduated") return false;
    const matchSearch  = `${s.first_name} ${s.last_name} ${s.student_number} ${s.course}`.toLowerCase().includes(search.toLowerCase());
    const matchCourse  = !filterCourse  || s.course   === filterCourse;
    const matchYear    = !filterYear    || s.year_level === filterYear;
    const matchSection = !filterSection || s.section   === filterSection;
    // Regular / Irregular. New/Old are always Regular. Transferee/Returnee/Cross-Enrollee
    // start as Irregular and only become Regular once they've enrolled for a 2nd semester
    // AND have their grades recorded.
    const cls = (s.classification || "").trim().toLowerCase();
    const irregularBase = ["transferee", "returnee", "cross-enrollee", "cross enrollee"].includes(cls);
    const promotedRegular = irregularBase && s.enrolled_2nd_sem && s.has_grades;
    const isRegular   = ["new", "old"].includes(cls) || promotedRegular;
    const isIrregular = irregularBase && !promotedRegular;
    const matchClass  = !filterClassification
      || (filterClassification === "Regular"   && isRegular)
      || (filterClassification === "Irregular" && isIrregular);
    return matchSearch && matchCourse && matchYear && matchSection && matchClass;
  }).sort((a, b) => _snKey(a) - _snKey(b));

  return (
    <div style={{ fontFamily: "system-ui, sans-serif" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", gap: "10px", flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Search by name, ID, or course..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: "240px", padding: "6px 10px", border: `1px solid ${BORDER}`, borderRadius: "5px", fontSize: "12px", outline: "none", color: "#374151", background: WHITE }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <select value={filterCourse} onChange={e => setFilterCourse(e.target.value)}
            style={{ padding: "6px 10px", border: `1px solid ${BORDER}`, borderRadius: "5px", fontSize: "12px", color: "#374151", outline: "none", background: WHITE, cursor: "pointer" }}>
            <option value="">All Programs</option>
            {courseOptions.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
            style={{ padding: "6px 10px", border: `1px solid ${BORDER}`, borderRadius: "5px", fontSize: "12px", color: "#374151", outline: "none", background: WHITE, cursor: "pointer" }}>
            <option value="">All Year Levels</option>
            {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={filterSection} onChange={e => setFilterSection(e.target.value)}
            style={{ padding: "6px 10px", border: `1px solid ${BORDER}`, borderRadius: "5px", fontSize: "12px", color: "#374151", outline: "none", background: WHITE, cursor: "pointer" }}>
            <option value="">All Sections</option>
            {sectionOptions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filterClassification} onChange={e => setFilterClassification(e.target.value)}
            style={{ padding: "6px 10px", border: `1px solid ${BORDER}`, borderRadius: "5px", fontSize: "12px", color: "#374151", outline: "none", background: WHITE, cursor: "pointer" }}>
            <option value="">All Students</option>
            <option value="Regular">Regular</option>
            <option value="Irregular">Irregular</option>
          </select>
          {(filterCourse || filterYear || filterSection || filterClassification) && (
            <button type="button" onClick={() => { setFilterCourse(""); setFilterYear(""); setFilterSection(""); setFilterClassification(""); }}
              style={{ padding: "6px 10px", fontSize: "11px", background: WHITE, color: "#6B7280", border: `1px solid ${BORDER}`, borderRadius: "5px", cursor: "pointer" }}>
              Clear
            </button>
          )}
          <button type="button" onClick={fetchStudentDirectory} title="Refresh"
            style={{ padding: "6px 12px", background: WHITE, color: DARK_GREEN, border: `1px solid ${BORDER}`, borderRadius: "5px", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}>
            Refresh
          </button>
          <span style={{ fontSize: "11px", color: GRAY }}>
            {filteredStudents.length} of {studentsWithRole.length} student{studentsWithRole.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      

      {/* Table */}
      <div style={{ background: WHITE, borderRadius: "12px", border: `1px solid ${BORDER}`, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ background: "#f5f3ea", borderBottom: `1px solid ${BORDER}` }}>
              {["Student", "ID Number", "Program", "Section", "Address"].map(h => (
                <th key={h} style={{ padding: "9px 14px", fontSize: "10px", fontWeight: 700, color: DARK_GREEN, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
              ))}
              <th style={{ padding: "9px 14px", fontSize: "10px", fontWeight: 700, color: DARK_GREEN, textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" style={{ padding: "48px", textAlign: "center", color: GRAY, fontSize: "13px" }}>
                  Loading student directory...
                </td>
              </tr>
            ) : filteredStudents.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: "48px", textAlign: "center", color: GRAY, fontSize: "14px" }}>
                  {studentsWithRole.length === 0
                    ? "No students with the 'student' role found. Assign the student role via Admin Settings → Users to make them appear here."
                    : "No students matched your search."}
                </td>
              </tr>
            ) : (
              filteredStudents.map((s, idx) => {
                const fullName = [s.first_name, s.middle_name, s.last_name].filter(Boolean).join(" ");
                return (
                  <tr key={s.id} style={{ borderBottom: `1px solid ${BORDER}`, background: idx % 2 === 0 ? WHITE : LIGHT_GRAY }}>

                    {/* Identity */}
                    <td style={{ padding: "9px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        {s.profile_picture ? (
                          <img src={s.profile_picture} alt="Profile" title="Click to view photo"
                            onClick={(e) => { e.stopPropagation(); setPhotoPreview({ src: s.profile_picture, name: fullName }); }}
                            style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", border: `1px solid ${BORDER}`, cursor: "pointer", flexShrink: 0 }} />
                        ) : (
                          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#eaf2d9", color: GREEN, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "12px", flexShrink: 0 }}>
                            {s.first_name ? s.first_name.charAt(0).toUpperCase() : "S"}
                          </div>
                        )}
                        <div>
                          <div style={{ fontSize: "12px", fontWeight: 700, color: "#111827" }}>{fullName}</div>
                        </div>
                      </div>
                    </td>

                    {/* Student Number */}
                    <td style={{ padding: "9px 14px", fontFamily: "monospace", fontSize: "11px", color: "#374151" }}>
                      {s.student_number || formatSchoolId(s.id)}
                    </td>

                    {/* Course */}
                    <td style={{ padding: "9px 14px", fontSize: "12px", color: "#374151" }}>
                      {s.course || "—"}
                    </td>

                    {/* Block Number */}
                    <td style={{ padding: "9px 14px", fontSize: "11px", fontWeight: 600, color: "#4B5563" }}>
                      {s.graduation_status === "graduated"
                        ? <span style={{ background: "#7C3AED", color: "#fff", fontSize: "10px", fontWeight: 800, borderRadius: "4px", padding: "2px 8px" }}>🎓 GRADUATED</span>
                        : <span>{s.section || "—"}</span>}
                    </td>

                    {/* Address */}
                    <td style={{ padding: "9px 14px", fontSize: "11px", color: GRAY, maxWidth: "200px" }}>
                      <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {(() => {
                          const parts = [s.barangay, s.municipality, s.province].filter(Boolean);
                          return parts.length > 0
                            ? parts.join(", ")
                            : s.address
                              ? s.address
                              : "—";
                        })()}
                      </div>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: "9px 14px", textAlign: "right" }}>
                      <div style={{ position: "relative", display: "inline-block" }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (openDropdownId === s.id) { setOpenDropdownId(null); return; }
                            const rect = e.currentTarget.getBoundingClientRect();
                            setDropdownPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
                            setOpenDropdownId(s.id);
                          }}
                          style={{ width: "26px", height: "26px", display: "flex", alignItems: "center", justifyContent: "center", background: WHITE, border: `1px solid ${BORDER}`, borderRadius: "5px", cursor: "pointer", fontSize: "15px", fontWeight: 800, color: GRAY }}
                          title="Actions"
                        >⋮</button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Footer count */}
        {!loading && filteredStudents.length > 0 && (
          <div style={{ padding: "8px 14px", background: LIGHT_GRAY, borderTop: `1px solid ${BORDER}`, fontSize: "11px", color: GRAY }}>
            Showing {filteredStudents.length} of {studentsWithRole.length} students
          </div>
        )}
      </div>

      {/* ── PHOTO PREVIEW LIGHTBOX ── */}
      {photoPreview && createPortal(
        <div onClick={() => setPhotoPreview(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2147483647, padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: WHITE, borderRadius: 14, overflow: "hidden", maxWidth: "min(92vw, 460px)", boxShadow: "0 24px 60px rgba(0,0,0,0.5)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: DARK_GREEN, color: WHITE }}>
              <span style={{ fontSize: 13, fontWeight: 800 }}>{photoPreview.name}</span>
              <button onClick={() => setPhotoPreview(null)} style={{ background: "transparent", border: "none", color: WHITE, fontSize: 20, cursor: "pointer", lineHeight: 1 }}>×</button>
            </div>
            <img src={photoPreview.src} alt={photoPreview.name} style={{ display: "block", width: "100%", maxHeight: "78vh", objectFit: "contain", background: "#f3f4f6" }} />
          </div>
        </div>, document.body)}

      {/* ── FIXED 3-DOT DROPDOWN ── */}
      {openDropdownId !== null && createPortal((() => {
        const s = students.find(st => st.id === openDropdownId);
        if (!s) return null;
        return (
          <div onClick={() => setOpenDropdownId(null)} style={{ position: "fixed", inset: 0, zIndex: 2147483647 }}>
            <div onClick={e => e.stopPropagation()}
              style={{ position: "fixed", top: dropdownPos.top, right: dropdownPos.right, background: WHITE, border: `1px solid ${BORDER}`, borderRadius: "8px", boxShadow: "0 4px 20px rgba(0,0,0,0.15)", zIndex: 2147483647, minWidth: "210px", overflow: "hidden" }}>

              {/* Enroll option removed — enrollment is handled in Registrar > Student Registration */}

              {/* Graduate — admin/registrar only */}
              {canEnroll && (
                <button type="button"
                  onClick={() => { handleGraduate(s); setOpenDropdownId(null); }}
                  style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%", textAlign: "left", padding: "10px 14px", fontSize: "12px", background: "none", border: "none", cursor: "pointer", color: "#111827", fontWeight: 600, borderBottom: `1px solid ${BORDER}` }}
                  onMouseEnter={e => e.currentTarget.style.background = LIGHT_GRAY}
                  onMouseLeave={e => e.currentTarget.style.background = "none"}>
                  {s.graduation_status === "graduated"
                    ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/></svg>
                    : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M22 10L12 5 2 10l10 5 10-5z"/><path d="M6 12.5V17c0 1.5 2.5 3 6 3s6-1.5 6-3v-4.5"/></svg>
                  }
                  {s.graduation_status === "graduated" ? "Revert Graduation" : "Mark as Graduated"}
                </button>
              )}

              {/* View */}
              <button type="button"
                onClick={() => { openViewModal(s); setOpenDropdownId(null); }}
                style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%", textAlign: "left", padding: "10px 14px", fontSize: "12px", background: "none", border: "none", cursor: "pointer", color: "#111827", fontWeight: 600, borderBottom: `1px solid ${BORDER}` }}
                onMouseEnter={e => e.currentTarget.style.background = LIGHT_GRAY}
                onMouseLeave={e => e.currentTarget.style.background = "none"}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                View Student Info
              </button>

              {/* View QR — admin & registrar only */}
              {canEnroll && <button type="button"
                onClick={() => { setQrStudent(s); setOpenDropdownId(null); }}
                style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%", textAlign: "left", padding: "10px 14px", fontSize: "12px", background: "none", border: "none", cursor: "pointer", color: "#111827", fontWeight: 600 }}
                onMouseEnter={e => e.currentTarget.style.background = LIGHT_GRAY}
                onMouseLeave={e => e.currentTarget.style.background = "none"}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="3" height="3"/></svg>
                View Student QR
              </button>}

              {/* Delete — administrator + registrar */}
              {canDeleteStudent && <button type="button"
                onClick={() => { const stu = s; setOpenDropdownId(null); deleteStudentRecord(stu); }}
                style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%", textAlign: "left", padding: "10px 14px", fontSize: "12px", background: "none", border: "none", borderTop: `1px solid ${BORDER}`, cursor: "pointer", color: "#B91C1C", fontWeight: 700 }}
                onMouseEnter={e => e.currentTarget.style.background = "#FEF2F2"}
                onMouseLeave={e => e.currentTarget.style.background = "none"}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#B91C1C" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                Delete Student
              </button>}
            </div>
          </div>
        );
      })(), document.body)}

      {/* ── ENROLLMENT FORM MODAL (form, or QR success view once enrolled) ── */}
      {showEnrollModal && enrollTarget && createPortal(
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2147483647 }}
          onClick={closeEnrollModal}>
          {enrollQr ? (
            /* ── Success: QR code for the enrollment just saved ── */
            <div onClick={e => e.stopPropagation()}
              style={{ background: WHITE, borderRadius: "12px", width: "100%", maxWidth: "360px", padding: "24px", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", textAlign: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
              <div style={{ fontSize: "28px" }}>✅</div>
              <h3 style={{ margin: 0, color: DARK_GREEN, fontSize: "15px", fontWeight: 800 }}>Enrollment Saved</h3>
              <div style={{ fontSize: "12px", color: GRAY }}>{enrollQr.summary}</div>
              <QRCanvas data={enrollQr.payload} size={200} />
              <div style={{ fontSize: "13px", fontWeight: 700, color: "#111827" }}>{enrollQr.name}</div>
              <div style={{ fontSize: "12px", fontFamily: "monospace", color: BLUE }}>{enrollQr.studentNumber || "—"}</div>
              <div style={{ display: "flex", gap: "8px", marginTop: "6px", width: "100%" }}>
                <button type="button" onClick={closeEnrollModal}
                  style={{ flex: 1, padding: "8px 14px", border: `1px solid ${BORDER}`, borderRadius: "6px", background: WHITE, cursor: "pointer", fontWeight: 600 }}>
                  Done
                </button>
                <button type="button"
                  onClick={() => {
                    const win = window.open("", "_blank", "width=360,height=480");
                    if (!win) return;
                    qrDataUrl(enrollQr.payload, 240).then(dataUrl => {
                      win.document.write(`
                        <html><head><title>Enrollment QR — ${enrollQr.name}</title></head>
                        <body style="font-family:system-ui,sans-serif;text-align:center;padding:24px;">
                          <h3>${enrollQr.name}</h3>
                          <div style="color:#6B7280;font-size:12px;margin-bottom:4px;">${enrollQr.studentNumber || ""}</div>
                          <div style="color:#6B7280;font-size:12px;margin-bottom:12px;">${enrollQr.summary}</div>
                          <img src="${dataUrl}" width="240" height="240" />
                          <div style="margin-top:16px;"><button onclick="window.print()" style="padding:8px 18px;background:${DARK_GREEN};color:white;border:none;border-radius:6px;font-weight:700;cursor:pointer;">🖨️ Print</button></div>
                        </body></html>
                      `);
                      win.document.close();
                    });
                  }}
                  style={{ flex: 1, padding: "8px 14px", background: DARK_GREEN, color: WHITE, border: "none", borderRadius: "6px", fontWeight: 700, cursor: "pointer" }}>
                  🖨️ Print
                </button>
              </div>
            </div>
          ) : (
            /* ── Form: capture the enrollment period ── */
            <form onSubmit={handleEnrollSubmit} onClick={e => e.stopPropagation()}
              style={{ background: WHITE, borderRadius: "12px", width: "100%", maxWidth: "430px", padding: "24px", display: "flex", flexDirection: "column", gap: "14px", boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
              <h3 style={{ margin: 0, color: DARK_GREEN, fontSize: "15px", fontWeight: 800 }}>📋 Enrollment Record</h3>

              {/* Student info banner */}
              <div style={{ padding: "12px 14px", background: "#eaf2d9", borderRadius: "8px", borderLeft: `4px solid ${GREEN}` }}>
                <div style={{ fontSize: "14px", fontWeight: 800, color: "#111827" }}>
                  {enrollTarget.last_name}, {enrollTarget.first_name} {enrollTarget.middle_name || ""}
                </div>
                <div style={{ fontSize: "11px", color: GRAY, marginTop: "2px" }}>
                  {enrollTarget.student_number || "No student number"} · {enrollTarget.course}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "11px", fontWeight: 700, color: GRAY }}>School Year *</label>
                <input type="text" value={enrollForm.school_year} placeholder="e.g. 2026-2027"
                  onChange={e => {
                    const val = e.target.value;
                    const yr = parseInt((val || "").split("-")[0]) || new Date().getFullYear();
                    setEnrollForm({ ...enrollForm, school_year: val, year_enrolled: yr });
                  }}
                  required style={{ padding: "8px", border: `1px solid ${BORDER}`, borderRadius: "6px", fontSize: "13px" }} />
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: GRAY }}>Year Level *</label>
                  <select value={enrollForm.year_level} onChange={e => setEnrollForm({ ...enrollForm, year_level: e.target.value })}
                    style={{ padding: "8px", border: `1px solid ${BORDER}`, borderRadius: "6px", background: WHITE, fontSize: "13px" }}>
                    {YEAR_LEVELS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: GRAY }}>Semester *</label>
                  <select value={enrollForm.semester} onChange={e => setEnrollForm({ ...enrollForm, semester: e.target.value })}
                    style={{ padding: "8px", border: `1px solid ${BORDER}`, borderRadius: "6px", background: WHITE, fontSize: "13px" }}>
                    <option value="1st Semester">1st Semester</option>
                    <option value="2nd Semester">2nd Semester</option>
                  </select>
                </div>
              </div>

              {/* Summary preview */}
              <div style={{ padding: "10px 14px", background: LIGHT_GRAY, borderRadius: "6px", fontSize: "12px", color: "#374151", display: "flex", gap: "6px", alignItems: "center" }}>
                <span>📅</span>
                <span><strong>{enrollForm.year_level} — {enrollForm.semester}</strong>, S.Y. {enrollForm.year_enrolled}–{parseInt(enrollForm.year_enrolled) + 1}</span>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "4px" }}>
                <button type="button" onClick={closeEnrollModal} style={{ padding: "8px 16px", border: `1px solid ${BORDER}`, borderRadius: "6px", background: WHITE, cursor: "pointer", fontWeight: 600 }}>Cancel</button>
                <button type="submit" disabled={savingEnroll} style={{ padding: "8px 18px", background: DARK_GREEN, color: WHITE, border: "none", borderRadius: "6px", fontWeight: 700, cursor: "pointer" }}>
                  {savingEnroll ? "⏳ Saving..." : "💾 Save Enrollment"}
                </button>
              </div>
            </form>
          )}
        </div>,
        document.body
      )}

      {/* ── VIEW STUDENT INFO MODAL ── */}
      {showViewModal && viewStudent && createPortal(
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2147483647, padding: "16px" }}
          onClick={() => setShowViewModal(false)}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: WHITE, borderRadius: "16px", width: "100%", maxWidth: "1400px", height: "calc(100vh - 32px)", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.35)", overflow: "hidden" }}>

            {/* Modal header bar */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", background: "#F5F3EA", borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "#eaf2d9", border: `2px solid ${GREEN}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", overflow: "hidden", flexShrink: 0 }}>
                  {viewStudent.profile_picture ? <img src={viewStudent.profile_picture} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "👤"}
                </div>
                <div>
                  <div style={{ fontSize: "18px", fontWeight: 800, color: "#111827", letterSpacing: "0.01em" }}>
                    {(viewStudent.last_name || "").toUpperCase()}, {(viewStudent.first_name || "").toUpperCase()} {viewStudent.middle_name ? viewStudent.middle_name.toUpperCase() : ""}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "3px", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: DARK_GREEN, background: "#eaf2d9", borderRadius: "4px", padding: "2px 8px" }}>
                      {viewStudent.student_number || "—"}
                    </span>
                    <span style={{ fontSize: "12.5px", color: GRAY }}>
                      {viewStudent.course || "—"}{viewStudent.section ? ` · ${viewStudent.section}` : ""}
                    </span>
                  </div>
                </div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                <input ref={photoInputRef} type="file" accept="image/*" style={{ display:"none" }} onChange={e => { if(e.target.files[0]) handlePhotoUpload(e.target.files[0]); e.target.value=""; }} />
                <button type="button" onClick={() => photoInputRef.current?.click()} disabled={uploadingPhoto}
                  style={{ display:"flex", alignItems:"center", gap:"6px", padding:"8px 14px", borderRadius:"8px", background:DARK_GREEN, border:"none", fontSize:"12px", fontWeight:700, color:WHITE, cursor:uploadingPhoto?"not-allowed":"pointer", opacity:uploadingPhoto?0.7:1 }}>
                  📷 {uploadingPhoto ? "Uploading..." : "Upload Photo"}
                </button>
                <button type="button" onClick={() => setShowViewModal(false)}
                  style={{ width: "36px", height: "36px", borderRadius: "8px", background: LIGHT_GRAY, border: `1px solid ${BORDER}`, fontSize: "16px", cursor: "pointer", color: GRAY, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  ✕
                </button>
              </div>
            </div>

            {/* Scrollable content */}
            <div style={{ flex: 1, overflowY: "auto", background: "#F9FAFB" }}>
              {loadingEnrollments ? (
                <div style={{ padding: "60px", textAlign: "center", color: GRAY, fontSize: "15px" }}>⏳ Loading...</div>
              ) : (
                <StudentInfoCard student={viewStudent} enrollments={viewEnrollments} subjects={subjects} assignedSubjectIds={assignedSubjectIds} user={user} onSaved={handleGradesSaved} canManageEnrollment={canEnroll} onDeleteEnrollment={deleteEnrollment} courses={coursesList} activeSchoolYear={activeSchoolYear} />
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── STUDENT QR MODAL ── */}
      {qrStudent && createPortal(
        <div onClick={() => setQrStudent(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 2147483646, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: WHITE, borderRadius: "14px", padding: "28px 32px", maxWidth: "340px", width: "90%", textAlign: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.22)" }}>

            {/* CCA Logo */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "10px" }}>
              <img src={ccaLogo} alt="CCA Logo" style={{ width: "64px", height: "64px", objectFit: "contain" }} />
            </div>

            {/* Student Name & ID */}
            <div style={{ fontSize: "14px", fontWeight: 800, color: "#111827", marginBottom: "2px" }}>
              {[qrStudent.last_name, qrStudent.first_name, qrStudent.middle_name].filter(Boolean).join(", ").replace(/, ([^,]+)$/, " $1")}
            </div>
            <div style={{ fontSize: "11px", fontFamily: "monospace", color: BLUE, marginBottom: "16px" }}>
              {qrStudent.student_number || formatSchoolId(qrStudent.id)}
            </div>

            {/* QR Code — payload is JSON for easy attendance scanner parsing */}
            <QRCanvas
              data={JSON.stringify({
                school: "CCA",
                id: qrStudent.id,
                student_number: qrStudent.student_number || formatSchoolId(qrStudent.id),
                last_name: qrStudent.last_name || "",
                first_name: qrStudent.first_name || "",
                middle_name: qrStudent.middle_name || "",
                course: qrStudent.course || "",
                year_level: qrStudent.year_level || "",
                section: qrStudent.section || "",
                gender: qrStudent.gender || "",
              })}
              size={220}
            />

            {/* Section info below QR */}
            <div style={{ marginTop: "10px", fontSize: "11px", color: GRAY }}>
              {[qrStudent.course, qrStudent.year_level, qrStudent.section ? `Section ${qrStudent.section}` : null].filter(Boolean).join(" · ")}
            </div>
            <div style={{ marginTop: "4px", fontSize: "10px", color: GRAY, fontWeight: 600 }}>
              Community College of Alangalang
            </div>

            <div style={{ marginTop: "16px", display: "flex", gap: "8px", justifyContent: "center", flexWrap: "wrap" }}>
              <button type="button" onClick={() => setQrStudent(null)}
                style={{ padding: "8px 18px", border: `1px solid ${BORDER}`, borderRadius: "7px", background: WHITE, cursor: "pointer", fontSize: "12px", fontWeight: 600 }}>
                Close
              </button>

              {/* Regenerate QR — admin only, for when QR is not scanning */}
              {myRoles.includes("administrator") && (
                <button type="button"
                  onClick={() => {
                    // Re-set qrStudent to trigger a fresh re-render of QRCanvas with same data
                    setQrStudent(null);
                    setTimeout(() => setQrStudent({ ...qrStudent, _regenKey: Date.now() }), 80);
                    showToast("QR code regenerated.", "success");
                  }}
                  style={{ padding: "8px 14px", border: `1px solid #F59E0B`, borderRadius: "7px", background: "#FFFBEB", color: "#92400E", cursor: "pointer", fontSize: "12px", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.551 15a9 9 0 1 0 .49-3.5"/></svg>
                  Regenerate QR
                </button>
              )}
              <button type="button"
                onClick={() => {
                  const fullName = `${qrStudent.last_name || ""}, ${qrStudent.first_name || ""} ${qrStudent.middle_name || ""}`.trim();
                  const sn = qrStudent.student_number || formatSchoolId(qrStudent.id);
                  const info = [qrStudent.course, qrStudent.year_level, qrStudent.section ? `Section ${qrStudent.section}` : null].filter(Boolean).join(" · ");
                  const payload = JSON.stringify({
                    school: "CCA",
                    id: qrStudent.id,
                    student_number: sn,
                    last_name: qrStudent.last_name || "",
                    first_name: qrStudent.first_name || "",
                    middle_name: qrStudent.middle_name || "",
                    course: qrStudent.course || "",
                    year_level: qrStudent.year_level || "",
                    section: qrStudent.section || "",
                    gender: qrStudent.gender || "",
                  });
                  const w = window.open("", "_blank");
                  if (!w) return;
                  fetch(ccaLogo).then(r => r.blob()).then(blob => new Promise(res => {
                    const reader = new FileReader();
                    reader.onloadend = () => res(reader.result);
                    reader.readAsDataURL(blob);
                  })).then(logoDataUrl => {
                    return qrDataUrl(payload, 260).then(qrUrl => ({ logoDataUrl, qrUrl }));
                  }).then(({ logoDataUrl, qrUrl }) => {
                    w.document.write(`<!DOCTYPE html><html><head><title>Student ID — ${fullName}</title><style>
                      *{box-sizing:border-box;margin:0;padding:0}
                      body{font-family:'Segoe UI',sans-serif;background:#f3f4f6;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;min-height:100vh;padding:32px 20px;gap:20px}
                      .card{text-align:center;width:54mm;padding:4mm 3mm;border:1px solid #E5E7EB;border-radius:3mm;background:#fff;display:flex;flex-direction:column;align-items:center;gap:1.5mm;box-shadow:0 2px 12px rgba(0,0,0,0.12)}
                      .logo{width:13mm;height:13mm;object-fit:contain}
                      .name{font-size:6.5pt;font-weight:800;color:#111827;line-height:1.2}
                      .sn{font-family:monospace;font-size:5.5pt;color:#1E88E5}
                      .qr{display:block;width:36mm;height:36mm}
                      .info{font-size:5pt;color:#6B7280;line-height:1.4}
                      .school{font-size:5pt;font-weight:700;color:#374151}
                      .btn{padding:8px 22px;background:#3d6e01;color:#fff;border:none;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer}
                      @media print{.btn{display:none}body{background:#fff;padding:0}@page{size:54mm 85.6mm;margin:0}.card{box-shadow:none;border:none}}
                    </style></head><body>
                    <div class="card">
                      <img class="logo" src="${logoDataUrl}" alt="CCA"/>
                      <div class="name">${fullName}</div>
                      <div class="sn">${sn}</div>
                      <img class="qr" src="${qrUrl}"/>
                      <div class="info">${info}</div>
                      <div class="school">Community College of Alangalang</div>
                    </div>
                    <button class="btn" onclick="window.print()">🖨️ Print ID Card</button>
                    </body></html>`);
                    w.document.close();
                  });
                }}
                style={{ padding: "8px 14px", border: "none", borderRadius: "7px", background: DARK_GREEN, color: WHITE, cursor: "pointer", fontSize: "12px", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}>
                🖨️ Print ID Card
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── SAVE CONFIRMATION TOAST ── */}
      {toast && createPortal(
        <div style={{ position: "fixed", top: "24px", right: "24px", zIndex: 2147483647, maxWidth: "360px", padding: "14px 18px", background: DARK_GREEN, color: WHITE, borderRadius: "10px", fontSize: "13px", fontWeight: 600, boxShadow: "0 8px 24px rgba(0,0,0,0.25)", lineHeight: 1.4 }}>
          {toast.msg}
        </div>,
        document.body
      )}

    </div>
  );
}
