import { useState, useEffect, useRef } from "react";
import Overview from "./pages/Overview";
import UserManagementModule from "./pages/UserManagementModule";
import RolesManagementModule from "./pages/RolesManagementModule";
import CourseManagement from "./pages/CourseManagement";
import AddStudents from "./pages/AddStudents";
import Faculty from "./pages/Faculty";
import Registrar from "./pages/Registrar";
import Announcements from "./pages/Announcement";
import AssignedSubject from "./pages/AssignedSubject";
import Designation from "./pages/Designation";
import AccountSettings from "./pages/AccountSettings";
import SubjectCatalog from "./pages/SubjectCatalog";
import FacultyGrades from "./pages/FacultyGrades";
import StudentPortal from "./pages/StudentPortal";
import DatesToRemember from "./pages/DatesToRemember";
import ClassSchedule from "./pages/ClassSchedule";
import Library, { LibraryPlaceholder, LibrarySearch, Acquisition, Circulation, CheckInOut, LibraryPurposeSettings } from "./pages/Library";
import { DentalCheckup } from "./pages/Clinic";

const GOLD       = "#F5A800";
const GREEN      = "#3d6e01";
const DARK_GREEN = "#3d6e01";
const WHITE      = "#FFFFFF";
const GRAY       = "#6B7280";
const LIGHT_GRAY = "#F9FAFB";
const BORDER     = "#E5E7EB";
const PURPLE     = "#6366F1";
const LIGHT_PURPLE = "rgba(99,102,241,0.12)";

import ccaLogo from "./assets/cca_logo_t.png";
import ccaLogoSvg from "./assets/cca_logo.svg";

// ── Simple flat nav icons (replacing the old emoji set) ──────────────────────
const svgIconProps = { width: 15, height: 15, viewBox: "0 0 24 24", fill: "none", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };
const ICON_HOME = (
  <svg {...svgIconProps} stroke="#60A5FA"><path d="M3 11l9-8 9 8" /><path d="M5 10v9a1 1 0 0 0 1 1h3v-6h6v6h3a1 1 0 0 0 1-1v-9" /></svg>
);
const ICON_LAYERS = (
  <svg {...svgIconProps} stroke="#A78BFA"><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></svg>
);
const ICON_SUBJECT = (
  <svg {...svgIconProps} width={13} height={13} stroke="#22D3EE"><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></svg>
);
const ICON_PERSON = (
  <svg {...svgIconProps} stroke="#3d6e01"><circle cx="12" cy="7" r="4" /><path d="M5 21v-2a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v2" /></svg>
);
const ICON_DOCUMENT = (
  <svg {...svgIconProps} stroke="#34D399"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><polyline points="14 3 14 8 19 8" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="16" y2="17" /></svg>
);
const ICON_BELL = (
  <svg {...svgIconProps} stroke="#FBBF24"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
);
const ICON_CLOCK = (
  <svg {...svgIconProps} stroke="#22D3EE"><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 16 14" /></svg>
);
const ICON_USERS = (
  <svg {...svgIconProps} width={13} height={13} stroke="#A78BFA"><circle cx="9" cy="8" r="3" /><path d="M2 20v-1a5 5 0 0 1 5-5h2" /><circle cx="17" cy="10" r="2.5" /><path d="M15.5 14.2A4 4 0 0 1 22 18v2" /></svg>
);
const ICON_TAG = (
  <svg {...svgIconProps} width={13} height={13} stroke="#F472B6"><path d="M20.59 13.41L13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></svg>
);
const ICON_CAP = (
  <svg {...svgIconProps} width={13} height={13} stroke="#818CF8"><path d="M22 10L12 5 2 10l10 5 10-5z" /><path d="M6 12.5V17c0 1.5 2.5 3 6 3s6-1.5 6-3v-4.5" /></svg>
);
const ICON_IDCARD = (
  <svg {...svgIconProps} width={13} height={13} stroke="#FB923C"><rect x="2" y="5" width="20" height="14" rx="2" /><circle cx="8" cy="12" r="2" /><line x1="13" y1="10" x2="18" y2="10" /><line x1="13" y1="14" x2="17" y2="14" /></svg>
);
const ICON_GEAR = (
  <svg {...svgIconProps} stroke="#FBBF24"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
);
const ICON_ACCOUNT = (
  <svg {...svgIconProps} stroke="#38BDF8"><circle cx="12" cy="8" r="4" /><path d="M4 21v-1a8 8 0 0 1 16 0v1" /></svg>
);
const ICON_LIBRARY = (
  <svg {...svgIconProps} stroke="#4ADE80"><path d="M4 19V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14" /><path d="M4 19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2" /><line x1="9" y1="7" x2="15" y2="7" /><line x1="9" y1="11" x2="15" y2="11" /></svg>
);

// Main nav items (no User Management, no System Controls here)
const MAIN_NAV = [
  { label: "Overview Workspace",  icon: ICON_HOME,     featureKey: "feat_overview",      alwaysFor: ["administrator", "faculty", "registrar_staff", "college_administrator", "registrar"] },
  { label: "Student List",        icon: ICON_LAYERS,   featureKey: "feat_student_list",  alwaysFor: ["administrator"] },
  { label: "Faculty",             icon: ICON_PERSON,   featureKey: "feat_faculty_mgmt",  alwaysFor: ["administrator"] },
  { label: "Registrar",           icon: ICON_DOCUMENT, featureKey: "feat_registrar_mgmt",alwaysFor: ["administrator", "registrar_staff"] },
  { label: "Grade",               icon: ICON_SUBJECT,  featureKey: "feat_grade",             alwaysFor: ["faculty", "administrator"] },
  { label: "Student User",        icon: ICON_CAP,      featureKey: "feat_student_portal",    alwaysFor: ["student", "administrator"] },
  { label: "Create Announcement", icon: ICON_BELL,     featureKey: "feat_announcements",  alwaysFor: ["administrator"] },
];

// Admin Settings dropdown items
const ADMIN_SETTINGS_ITEMS = [
  { label: "Users",       icon: ICON_USERS,   component: "UserManagement" },
  { label: "Roles",       icon: ICON_TAG,     component: "Roles" },
  { label: "System",      icon: ICON_CAP,     component: "Courses" },
  { label: "Designation", icon: ICON_IDCARD,  component: "Designation" },
  { label: "Subjects",    icon: ICON_SUBJECT, component: "Subjects" },
  { label: "Class Assignment", icon: ICON_SUBJECT, component: "ClassAssignment" },
];

// ── Library sub-links (shared by the admin dropdown and the librarian sidebar) ──
const LIBRARY_LINKS = [
  { view: "Library Dashboard", label: "Dashboard",        icon: (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>) },
  { view: "Check In/Out",      label: "Check In/Out",     icon: (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>) },
  { view: "Library Search",    label: "Library Search",   icon: (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>) },
  { view: "Acquisition",       label: "Acquisition",      icon: (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8v13H3V8"/><path d="M1 3h22v5H1z"/><line x1="10" y1="12" x2="14" y2="12"/></svg>) },
  { view: "Circulation",       label: "Circulation",      icon: (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>) },
];
// Inventory Report is a nested dropdown with its own sub-items.
const ICON_INVENTORY = (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>);
const INVENTORY_LINKS = [
  { view: "Inventory Print", label: "Print", icon: (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>) },
];
const INVENTORY_VIEWS = ["Inventory Report", ...INVENTORY_LINKS.map(l => l.view)];
// Library Settings is a nested dropdown with its own sub-items.
const ICON_LIBRARY_SETTINGS = (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>);
const LIBRARY_SETTINGS_LINKS = [
  { view: "Library Purpose", label: "Purpose", icon: (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>) },
];
const LIBRARY_SETTINGS_VIEWS = ["Library Settings", ...LIBRARY_SETTINGS_LINKS.map(l => l.view)];
const LIBRARY_VIEWS = [...LIBRARY_LINKS.map(l => l.view), ...INVENTORY_VIEWS, ...LIBRARY_SETTINGS_VIEWS];

// Clinic dropdown (same pattern as Library).
const ICON_CLINIC = (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2h8v4h4v16H4V6h4z"/><line x1="12" y1="10" x2="12" y2="16"/><line x1="9" y1="13" x2="15" y2="13"/></svg>);
const CLINIC_LINKS = [
  { view: "Clinic Dashboard",     label: "Dashboard",            icon: (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>) },
  { view: "Emergency Referral",   label: "Emergency Referral",   icon: (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>) },
  { view: "First Aid",            label: "First Aid",            icon: (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6" width="18" height="14" rx="2"/><line x1="12" y1="10" x2="12" y2="16"/><line x1="9" y1="13" x2="15" y2="13"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>) },
  { view: "Disease Surveillance", label: "Disease Surveillance", icon: (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/><circle cx="12" cy="12" r="10" opacity="0"/></svg>) },
  { view: "Dental CheckUp",       label: "Dental CheckUp",       icon: (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5.5c-2-2-5-2-6 0-1.5 3 0 8 1 11 .5 1.5 1.5 1.5 2-.5.3-1.2.6-2 1-2s.7.8 1 2c.5 2 1.5 2 2 .5 1-3 2.5-8 1-11-1-2-4-2-6 0z"/></svg>) },
];
const CLINIC_VIEWS = CLINIC_LINKS.map(l => l.view);

// ── ROLE → NAV MAPPING ────────────────────────────────────────────────────────
// Custom roles can map to existing pages. Add new mappings here as needed.
// NOTE: "faculty" and "registrar" used to be hardcoded here, which meant they
// ALWAYS got Faculty Hub / Registrar Console regardless of what was checked
// in Roles Management's permissions checklist — that silently overrode the
// checklist. Visibility for those two is now driven entirely by alwaysFor
// (built-in defaults) + the permissions checklist below. Keep this map only
// for role-name aliases that have no MAIN_NAV featureKey of their own.
const ROLE_TO_NAV_MAP = {
  studentlist:   { label: "Student List",        icon: ICON_LAYERS },
  student_list:  { label: "Student List",        icon: ICON_LAYERS },
};

export default function Dashboard({ user, onLogout, setIsLoading }) {
  // Persist the active page across refreshes — read the last view from
  // sessionStorage on first mount, then keep it synced as the user navigates,
  // so reloading the tab leaves them on the same page instead of bouncing
  // back to Overview Workspace.
  const [activeView, setActiveView]       = useState(() => {
    const r = String(user?.role || "").toLowerCase();
    // Students always land on their own portal, never the admin overview.
    if (r === "student") return "Student User";
    // Library staff (library, library_staff, librarian, …) land on the Library Dashboard.
    if (r.includes("librar")) return "Library Dashboard";
    // Clinic staff (college_nurse, clinic, …) land on the Clinic Dashboard.
    if (r.includes("nurse") || r.includes("clinic")) return "Clinic Dashboard";
    try { return sessionStorage.getItem("cca_dashboard_active_view") || "Overview Workspace"; }
    catch { return "Overview Workspace"; }
  });
  const [sidebarOpen, setSidebarOpen]     = useState(() => (typeof window !== "undefined" ? window.innerWidth > 768 : true));
  const [adminOpen, setAdminOpen]         = useState(false);
  const [studentPortalOpen, setStudentPortalOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(() => String(user?.role || "").toLowerCase().includes("librar"));
  const [librarySettingsOpen, setLibrarySettingsOpen] = useState(false);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [clinicOpen, setClinicOpen] = useState(() => { const r = String(user?.role || "").toLowerCase(); return r.includes("nurse") || r.includes("clinic"); });
  const [myProfileOpen, setMyProfileOpen] = useState(true);
  const [metrics, setMetrics]             = useState({ students: 0, faculty: 0, announcements: 0, systemAccounts: 0 });
  const [features, setFeatures]           = useState({ feat_overview: 1, feat_student_list: 1, feat_faculty_mgmt: 1, feat_registrar_mgmt: 1, feat_announcements: 1 });
  const [loading, setLoading]             = useState(true);
  const [userRoles, setUserRoles]         = useState([]); // full role list for current user
  const [rolePermissions, setRolePermissions] = useState({}); // { roleName: [featureKey, ...] } from Roles Management checklist
  const [systemUsers,    setSystemUsers]    = useState([]);
  const [showUsersPanel, setShowUsersPanel] = useState(false);
  const accountsCardRef = useRef(null);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef(null);
  const [myProfilePic, setMyProfilePic] = useState(null);
  const [studentProfile, setStudentProfile] = useState(null);
  const [studentMenuOpen, setStudentMenuOpen] = useState(false);
  const studentMenuRef = useRef(null);
  const [todayEvents, setTodayEvents] = useState([]);
  const [notifOpen, setNotifOpen]     = useState(false);
  const [dark, setDark] = useState(() => { try { return localStorage.getItem("cca_dark") === "1"; } catch { return false; } });
  useEffect(() => { try { localStorage.setItem("cca_dark", dark ? "1" : "0"); } catch {} }, [dark]);
  const [maintOn, setMaintOn] = useState(false);
  const [maintSaving, setMaintSaving] = useState(false);
  const toggleMaint = async () => {
    const next = !maintOn;
    setMaintSaving(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/erd/maintenance`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ on: next ? 1 : 0 }),
      });
      if (res.ok) setMaintOn(next);
    } catch {}
    setMaintSaving(false);
  };
  // seenCount persists across refreshes via sessionStorage.
  // Red dot + repeating sound active whenever todayEvents.length > seenCount.
  const [seenCount, setSeenCount] = useState(() => {
    try { return parseInt(sessionStorage.getItem("cca_notif_seen_count") || "0", 10); }
    catch { return 0; }
  });
  const seenCountRef  = useRef(seenCount); // ref so interval closure always reads latest value
  const audioCtxRef   = useRef(null);      // shared AudioContext, unlocked on first user click
  const notifRef      = useRef(null);

  // Unlock AudioContext on the very first click anywhere — after that,
  // background interval calls can play sound without browser blocking it.
  useEffect(() => {
    const unlock = () => {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtxRef.current.state === "suspended") audioCtxRef.current.resume();
      document.removeEventListener("click", unlock, true);
    };
    document.addEventListener("click", unlock, true);
    return () => document.removeEventListener("click", unlock, true);
  }, []);

  // Keep seenCountRef in sync with state so interval closure sees latest value
  useEffect(() => { seenCountRef.current = seenCount; }, [seenCount]);

  const playDing = () => {
    try {
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === "suspended") ctx.resume();
      [[880,0],[1046,150],[1318,300]].forEach(([freq, delay]) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = "sine"; osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.18, ctx.currentTime + delay/1000);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay/1000 + 0.6);
        osc.start(ctx.currentTime + delay/1000);
        osc.stop(ctx.currentTime + delay/1000 + 0.65);
      });
    } catch(_) {}
  };

  const isAdmin = user?.role === "administrator";

  // ── Close account dropdown when clicking outside it ───────────────────────
  useEffect(() => {
    if (!accountMenuOpen) return;
    const handler = (e) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target)) setAccountMenuOpen(false);
      if (studentMenuRef.current && !studentMenuRef.current.contains(e.target)) setStudentMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [accountMenuOpen, studentMenuOpen]);

  // ── Fetch current user's full role list ──────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    fetch(`${import.meta.env.VITE_API_URL}/api/erd/users`)
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        const me = Array.isArray(data) ? data.find(u => u.id === user.id) : null;
        if (me?.roles) setUserRoles(me.roles.map(r => r.toLowerCase()));
        else if (user.role) setUserRoles([user.role.toLowerCase()]);
        if (me?.profile_picture) setMyProfilePic(me.profile_picture);
      })
      .catch(() => { if (user.role) setUserRoles([user.role.toLowerCase()]); });
  }, [user?.id]);

  // ── Maintenance flag (admins) ──────────────────────────────────────────────
  useEffect(() => {
    if (!isAdmin) return;
    fetch(`${import.meta.env.VITE_API_URL}/api/erd/maintenance`)
      .then(r => r.ok ? r.json() : { on: 0 })
      .then(d => setMaintOn(!!d.on))
      .catch(() => {});
  }, [isAdmin]);

  // ── Students: load avatar from their student record (not in erd_users) ──────
  useEffect(() => {
    const sid = user?.student_id;
    if (!sid) return;
    fetch(`${import.meta.env.VITE_API_URL}/api/erd/student/profile/${sid}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) { setStudentProfile(data); if (data.profile_picture) setMyProfilePic(data.profile_picture); } })
      .catch(() => {});
  }, [user?.student_id]);

  // ── PRESENCE HEARTBEAT ─────────────────────────────────────────────────────
  // Pings the backend every ~20s (and immediately on mount) while this user
  // has the dashboard open, so the System Accounts "online" dot reflects who
  // is actually signed in right now instead of just who has an active
  // (non-suspended) account.
  useEffect(() => {
    if (!user?.id) return;
    const sendHeartbeat = () => {
      fetch(`${import.meta.env.VITE_API_URL}/api/erd/users/${user.id}/heartbeat`, { method: "POST" }).catch(() => {});
    };
    sendHeartbeat();
    const hbInterval = setInterval(sendHeartbeat, 20000);
    return () => clearInterval(hbInterval);
  }, [user?.id]);

  // Today-event notifications — plays ding every 60s while there are unread events.
  // Sound stops automatically once the user clicks the bell (seenCount catches up).
  // AudioContext is unlocked by the first-click listener above, so this works in background.
  useEffect(() => {
    const _t = new Date();
    const todayStr = `${_t.getFullYear()}-${String(_t.getMonth()+1).padStart(2,"0")}-${String(_t.getDate()).padStart(2,"0")}`;
    const check = () => {
      fetch(`${import.meta.env.VITE_API_URL}/api/erd/announcements`)
        .then(r => r.ok ? r.json() : [])
        .then(data => {
          if (!Array.isArray(data)) return;
          const events = data.filter(a => a.event_date && String(a.event_date).substring(0,10) === todayStr);
          setTodayEvents(events);
          if (events.length === 0) {
            // No events — reset so red dot reappears if events come back later
            setSeenCount(0);
            seenCountRef.current = 0;
            try { sessionStorage.setItem("cca_notif_seen_count", "0"); } catch {}
          } else if (events.length > seenCountRef.current) {
            // Unread events exist — play ding (AudioContext already unlocked by user's first click)
            playDing();
          }
        }).catch(()=>{});
    };
    const onDeleted = () => check();
    window.addEventListener("announcement-deleted", onDeleted);
    check();
    const iv = setInterval(check, 60000);
    return () => { clearInterval(iv); window.removeEventListener("announcement-deleted", onDeleted); };
  }, []);

  useEffect(() => {
    if (!notifOpen) return;
    const h = (e) => { if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [notifOpen]);

  // ── NEW ADDITION: TRIGGERS TRANSPARENT BELL LOADER EVERY TIME PAGE WORKSPACE CHANGES ──
  useEffect(() => {
    if (setIsLoading) {
      setIsLoading(true);
      const timer = setTimeout(() => { setIsLoading(false); }, 450);
      return () => clearTimeout(timer);
    }
  }, [activeView, setIsLoading]);

  // Keep sessionStorage in sync so a refresh re-opens the same page.
  useEffect(() => {
    try { sessionStorage.setItem("cca_dashboard_active_view", activeView); } catch {}
  }, [activeView]);

  const fetchPortalData = async () => {
    try {
      const metricsRes = await fetch(`${import.meta.env.VITE_API_URL}/api/erd/dashboard-metrics`);
      if (metricsRes.ok) {
        const metricsData = await metricsRes.json();
        const updatedMetrics = { students: 0, faculty: 0, announcements: 0 };
        metricsData.forEach(item => {
          if (item.label.includes("Students")) updatedMetrics.students = item.value;
          if (item.label.includes("Faculty"))  updatedMetrics.faculty  = item.value;
          if (item.label.includes("Bulletins"))updatedMetrics.announcements = item.value;
        });
        setMetrics(updatedMetrics);
      }
      // Count non-student users for System Accounts metric + store user list for panel
      const usersRes = await fetch(`${import.meta.env.VITE_API_URL}/api/erd/users`);
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        const nonStudents = Array.isArray(usersData) ? usersData.filter(u => {
          const roleArr = Array.isArray(u.roles) ? u.roles.map(r => r.toLowerCase()) : [(u.role || "").toLowerCase()];
          if (roleArr.length === 0 || roleArr.every(r => r === "student") || roleArr.every(r => r === "")) return false;
          return true;
        }) : [];
        setSystemUsers(nonStudents);
        setMetrics(prev => ({ ...prev, systemAccounts: nonStudents.length }));
      }
      const systemRes = await fetch(`${import.meta.env.VITE_API_URL}/api/erd/system-config`);
      if (systemRes.ok) {
        const systemData = await systemRes.json();
        if (systemData?.features) setFeatures(systemData.features);
      }
      const rolePermsRes = await fetch(`${import.meta.env.VITE_API_URL}/api/erd/role-permissions`);
      if (rolePermsRes.ok) {
        const rolePermsData = await rolePermsRes.json();
        setRolePermissions(rolePermsData || {});
      }
    } catch (err) {
      console.error("Dashboard sync failure:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortalData();
    const interval = setInterval(fetchPortalData, 10000);
    return () => clearInterval(interval);
  }, []);

  // ── Build visible nav ─────────────────────────────────────────────────────
  // Start with the static MAIN_NAV items this role always sees
  const _roleLc = String(user?.role || "").toLowerCase();
  const isLibrary = _roleLc.includes("librar");
  const isClinic = _roleLc.includes("nurse") || _roleLc.includes("clinic");
  // Delete permissions: librarian can delete, library_staff cannot (add only); nurse can delete.
  const libCanDelete = isAdmin || _roleLc === "librarian";
  const clinicCanDelete = isAdmin || _roleLc.includes("nurse");
  const visibleNav = MAIN_NAV.filter(link => link.alwaysFor.some(r => r.toLowerCase() === _roleLc));

  // Then add any MAIN_NAV items granted via the Roles Management permissions
  // checklist for ANY role this user holds (their primary role, plus any
  // extra roles in userRoles). This is what makes "check Student List for
  // faculty in Roles Management" actually show Student List in the sidebar
  // for users with the faculty role, even though it's not in alwaysFor.
  const allMyRoleNames = new Set([
    ...(user?.role ? [user.role.toLowerCase()] : []),
    ...userRoles,
  ]);
  const grantedFeatureKeys = new Set();
  allMyRoleNames.forEach(roleName => {
    (rolePermissions[roleName] || []).forEach(key => grantedFeatureKeys.add(key));
  });
  MAIN_NAV.forEach(link => {
    if (
      link.featureKey &&
      grantedFeatureKeys.has(link.featureKey) &&
      !visibleNav.some(v => v.label === link.label)
    ) {
      visibleNav.push(link);
    }
  });

  // Then inject any extra nav items granted by ADDITIONAL custom roles
  const extraNavLabels = new Set(visibleNav.map(n => n.label));
  userRoles.forEach(role => {
    const mapped = ROLE_TO_NAV_MAP[role];
    if (mapped && !extraNavLabels.has(mapped.label)) {
      extraNavLabels.add(mapped.label);
      visibleNav.push({ label: mapped.label, icon: mapped.icon, featureKey: null, alwaysFor: [] });
    }
  });

  // Admin settings sub-views
  const adminSubViews = ["Users", "Roles", "System", "Designation", "Subjects", "Class Assignment"];

  const activeLabel = adminSubViews.includes(activeView) ? activeView : activeView;
  const activeIcon  = activeView === "Users" ? ICON_USERS
    : activeView === "Roles" ? ICON_TAG
    : activeView === "Courses" ? ICON_CAP
    : activeView === "Designation" ? ICON_IDCARD
    : activeView === "Account Settings" ? ICON_ACCOUNT
    : visibleNav.find(n => n.label === activeView)?.icon || ICON_HOME;

  const navBtnStyle = (label) => ({
    display: "flex", alignItems: "center", gap: "8px", width: "100%",
    padding: "8px 12px",
    background: activeView === label ? DARK_GREEN : "transparent",
    border: "none", borderRadius: "8px",
    color: activeView === label ? WHITE : DARK_GREEN,
    fontSize: "12px", fontWeight: 400,
    textAlign: "left", cursor: "pointer", transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)", whiteSpace: "nowrap"
  });

  // Generic nested dropdown for library sub-groups (Inventory Report, Library Settings).
  const renderLibraryGroup = ({ variant, title, icon, groupViews, links, open, setOpen }) => {
    const active = groupViews.includes(activeView);
    const parentStyle = variant === "sub"
      ? { display: "flex", alignItems: "center", gap: "8px", width: "100%", padding: "7px 12px",
          background: active ? DARK_GREEN : "transparent", border: "none",
          borderLeft: `2px solid ${active ? DARK_GREEN : "rgba(61,110,1,0.3)"}`, borderRadius: "0 8px 8px 0",
          color: active ? WHITE : DARK_GREEN, fontSize: "11px", fontWeight: active ? 700 : 400,
          textAlign: "left", cursor: "pointer", transition: "all 0.2s", whiteSpace: "nowrap" }
      : { ...navBtnStyle(title), background: active ? DARK_GREEN : "transparent", color: active ? WHITE : DARK_GREEN,
          marginTop: "2px", justifyContent: sidebarOpen ? "flex-start" : "center", gap: sidebarOpen ? "8px" : 0, padding: sidebarOpen ? "8px 12px" : "10px 0" };
    return (
      <div style={{ marginTop: variant === "sub" ? 0 : "2px" }}>
        <button
          onClick={() => { if (!sidebarOpen) { setSidebarOpen(true); setOpen(true); return; } setOpen(o => !o); }}
          title={!sidebarOpen ? title : undefined}
          style={parentStyle}
          className="nav-interactive-btn"
        >
          <span style={{ fontSize: "13px", display: "flex" }}>{icon}</span>
          {sidebarOpen && <span style={{ flex: 1, textAlign: "left" }}>{title}</span>}
          {sidebarOpen && <span style={{ fontSize: "10px", display: "inline-block", transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>}
        </button>
        {sidebarOpen && open && (
          <div style={{ marginTop: "2px", marginLeft: "12px", display: "flex", flexDirection: "column", gap: "2px" }}>
            {links.map(item => (
              <button
                key={item.view}
                onClick={() => setActiveView(item.view)}
                style={{
                  display: "flex", alignItems: "center", gap: "8px", width: "100%", padding: "7px 12px",
                  background: activeView === item.view ? DARK_GREEN : "transparent", border: "none",
                  borderLeft: `2px solid ${activeView === item.view ? DARK_GREEN : "rgba(61,110,1,0.3)"}`, borderRadius: "0 8px 8px 0",
                  color: activeView === item.view ? WHITE : DARK_GREEN, fontSize: "11px", fontWeight: activeView === item.view ? 700 : 400,
                  textAlign: "left", cursor: "pointer", transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)", whiteSpace: "nowrap"
                }}
                className="subnav-interactive-btn"
              >
                <span style={{ display: "flex" }}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };
  const renderInventory = (variant) => renderLibraryGroup({ variant, title: "Inventory Report", icon: ICON_INVENTORY, groupViews: INVENTORY_VIEWS, links: INVENTORY_LINKS, open: inventoryOpen, setOpen: setInventoryOpen });

  // Library Settings dropdown (nested). variant "top" for librarian nav, "sub" for admin accordion.
  const renderLibrarySettings = (variant) => {
    const active = LIBRARY_SETTINGS_VIEWS.includes(activeView);
    const parentStyle = variant === "sub"
      ? { display: "flex", alignItems: "center", gap: "8px", width: "100%", padding: "7px 12px",
          background: active ? DARK_GREEN : "transparent", border: "none",
          borderLeft: `2px solid ${active ? DARK_GREEN : "rgba(61,110,1,0.3)"}`, borderRadius: "0 8px 8px 0",
          color: active ? WHITE : DARK_GREEN, fontSize: "11px", fontWeight: active ? 700 : 400,
          textAlign: "left", cursor: "pointer", transition: "all 0.2s", whiteSpace: "nowrap" }
      : { ...navBtnStyle("Library Settings"), background: active ? DARK_GREEN : "transparent", color: active ? WHITE : DARK_GREEN,
          marginTop: "2px", justifyContent: sidebarOpen ? "flex-start" : "center", gap: sidebarOpen ? "8px" : 0, padding: sidebarOpen ? "8px 12px" : "10px 0" };
    return (
      <div style={{ marginTop: variant === "sub" ? 0 : "2px" }}>
        <button
          onClick={() => { if (!sidebarOpen) { setSidebarOpen(true); setLibrarySettingsOpen(true); return; } setLibrarySettingsOpen(o => !o); }}
          title={!sidebarOpen ? "Library Settings" : undefined}
          style={parentStyle}
          className="nav-interactive-btn"
        >
          <span style={{ fontSize: "13px", display: "flex" }}>{ICON_LIBRARY_SETTINGS}</span>
          {sidebarOpen && <span style={{ flex: 1, textAlign: "left" }}>Library Settings</span>}
          {sidebarOpen && <span style={{ fontSize: "10px", display: "inline-block", transition: "transform 0.2s", transform: librarySettingsOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>}
        </button>
        {sidebarOpen && librarySettingsOpen && (
          <div style={{ marginTop: "2px", marginLeft: "12px", display: "flex", flexDirection: "column", gap: "2px" }}>
            {LIBRARY_SETTINGS_LINKS.map(item => (
              <button
                key={item.view}
                onClick={() => setActiveView(item.view)}
                style={{
                  display: "flex", alignItems: "center", gap: "8px", width: "100%", padding: "7px 12px",
                  background: activeView === item.view ? DARK_GREEN : "transparent", border: "none",
                  borderLeft: `2px solid ${activeView === item.view ? DARK_GREEN : "rgba(61,110,1,0.3)"}`, borderRadius: "0 8px 8px 0",
                  color: activeView === item.view ? WHITE : DARK_GREEN, fontSize: "11px", fontWeight: activeView === item.view ? 700 : 400,
                  textAlign: "left", cursor: "pointer", transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)", whiteSpace: "nowrap"
                }}
                className="subnav-interactive-btn"
              >
                <span style={{ display: "flex" }}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={(dark && _roleLc === "student") ? "cca-dark-root" : undefined} style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", background: "#F3F4F6", fontFamily: "system-ui, sans-serif" }}>

      {/* Dynamic Hover and Keyframe Stylesheet Injection */}
      <style>{`
        html, body, #root { max-width: 100%; overflow-x: hidden; }
        *, *::before, *::after { box-sizing: border-box; }

        /* ── Mobile: sidebar overlays content instead of squishing it ── */
        @media (max-width: 768px) {
          .app-sidebar {
            position: fixed !important;
            top: 50px; left: 0; bottom: 0;
            z-index: 300;
            box-shadow: 6px 0 22px rgba(0,0,0,0.28);
            transition: transform 0.25s ease !important;
          }
          .app-sidebar.app-sidebar-collapsed { transform: translateX(-110%); box-shadow: none; }
          .cca-mobile-backdrop {
            position: fixed; inset: 50px 0 0 0; z-index: 250;
            background: rgba(0,0,0,0.35);
          }
        }
        @media (min-width: 769px) { .cca-mobile-backdrop { display: none; } }

        /* Dark mode — softened invert: dark-gray (not pure black) + lower contrast so
           it's easy on the eyes. Media is re-inverted so photos/logos stay true. */
        .cca-dark-root { filter: invert(0.95) hue-rotate(180deg) contrast(1.04); background: #16171a !important; }
        .cca-dark-root img, .cca-dark-root video, .cca-dark-root .no-invert, .cca-dark-root [data-noinvert] { filter: invert(0.95) hue-rotate(180deg) contrast(0.96); }

        /* Smooth page component slide-fade entry animation */
        .animated-content-wrapper {
          animation: mainWorkspaceFadeIn 0.35s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        @keyframes mainWorkspaceFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Nav Interactive Sidebar Hover effects */
        .nav-interactive-btn {
          position: relative;
        }
        .nav-interactive-btn:hover {
          background: rgba(61,110,1,0.10) !important;
          transform: translateX(3px);
        }
        .nav-interactive-btn:active {
          transform: translateX(1px);
        }

        /* Dropdown nested list items */
        .subnav-interactive-btn:hover {
          background: rgba(61,110,1,0.08) !important;
          padding-left: 18px !important;
          color: ${DARK_GREEN} !important;
        }

        /* Metric card container hover enhancements */
        .interactive-metric-card {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
          cursor: default;
        }
        .interactive-metric-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 20px -8px rgba(0, 0, 0, 0.12), 0 4px 4px -2px rgba(0, 0, 0, 0.04) !important;
          border-color: rgba(46, 125, 50, 0.25) !important;
        }
        .interactive-metric-card:hover .metric-icon-circle {
          transform: scale(1.08) rotate(3deg);
        }

        /* Sidebar Hamburger Toggle interaction */
        .hamburger-toggle-btn {
          transition: all 0.2s ease;
        }
        .hamburger-toggle-btn:hover {
          background-color: #F3F4F6 !important;
          border-color: ${GREEN} !important;
          transform: scale(1.02);
        }

        /* Secure Logout button interaction */
        .logout-btn-action {
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
        .logout-btn-action:hover {
          background: #B91C1C !important;
          box-shadow: 0 4px 12px rgba(220, 38, 38, 0.25);
          transform: translateY(-1px);
        }
      `}</style>

      {/* ── TOP NAVBAR (full width, fixed above everything; sidebar sits below it) ── */}
      {/* Top navbar with hamburger + account menu */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", height: "50px", minHeight: "50px", maxHeight: "50px", padding: "0 18px", background: WHITE, borderBottom: `1px solid ${BORDER}`, flexShrink: 0, zIndex: 100, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            onClick={() => setSidebarOpen(o => !o)}
            title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
            style={{ width: "36px", height: "36px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "5px", background: "none", border: `1px solid ${BORDER}`, borderRadius: "8px", cursor: "pointer", padding: "0", flexShrink: 0 }}
            className="hamburger-toggle-btn"
          >
            <span style={{ display: "block", width: "16px", height: "2px", background: DARK_GREEN, borderRadius: "2px" }} />
            <span style={{ display: "block", width: "16px", height: "2px", background: DARK_GREEN, borderRadius: "2px" }} />
            <span style={{ display: "block", width: "16px", height: "2px", background: DARK_GREEN, borderRadius: "2px" }} />
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <img src={ccaLogo} alt="CCA" style={{ width: "100px", height: "100px", objectFit: "contain", borderRadius: "4px", flexShrink: 0 }} />
          </div>
        </div>

        {/* Right side: dark toggle + bell + avatar grouped together */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>

        {/* Dark mode toggle — students only (employees always use light mode) */}
        {_roleLc === "student" && (
        <button
          onClick={() => setDark(d => !d)}
          title={dark ? "Switch to light mode" : "Switch to dark mode"}
          style={{ width: "34px", height: "34px", borderRadius: "50%", background: "none", border: "none", outline: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: DARK_GREEN }}
        >
          {dark ? (
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
          ) : (
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          )}
        </button>
        )}

        {/* Notification bell */}
        <div ref={notifRef} style={{ position: "relative" }}>
          <button
            onClick={() => {
              setNotifOpen(o => !o);
              // Mark all current events as seen — stops the repeating ding
              setSeenCount(todayEvents.length);
              seenCountRef.current = todayEvents.length;
              try { sessionStorage.setItem("cca_notif_seen_count", String(todayEvents.length)); } catch {}
            }}
            title={todayEvents.length > 0 ? `${todayEvents.length} event(s) today` : "No events today"}
            style={{ width: "34px", height: "34px", borderRadius: "50%", background: "none", border: "none", outline: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", cursor: "pointer", position: "relative", flexShrink: 0 }}
          >
            🔔
            {todayEvents.length > seenCount && (
              <span style={{ position: "absolute", top: "2px", right: "2px", width: "8px", height: "8px", borderRadius: "50%", background: "#DC2626", border: "2px solid white" }} />
            )}
          </button>
          {notifOpen && (
            <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 500, width: "280px", background: "white", borderRadius: "12px", border: `1px solid ${BORDER}`, boxShadow: "0 12px 32px rgba(0,0,0,0.16)", overflow: "hidden" }}>
              <div style={{ padding: "10px 14px", borderBottom: `1px solid ${BORDER}`, fontSize: "10px", fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                🔔 Today's Events
              </div>
              {todayEvents.length === 0 ? (
                <div style={{ padding: "18px 14px", textAlign: "center", fontSize: "12px", color: "#6B7280" }}>No events scheduled for today.</div>
              ) : (
                <div style={{ maxHeight: "260px", overflowY: "auto" }}>
                  {todayEvents.map(ev => (
                    <div key={ev.id} style={{ padding: "12px 14px", borderBottom: `1px solid ${BORDER}`, background: "#FFFDE7" }}>
                      <div style={{ fontSize: "12px", fontWeight: 800, color: "#3d6e01" }}>📅 {ev.title}</div>
                      <div style={{ fontSize: "11px", color: "#6B7280", marginTop: "2px" }}>{ev.department || "General"}</div>
                      {ev.body && <div style={{ fontSize: "11px", color: "#374151", marginTop: "4px", lineHeight: 1.4 }}>{ev.body.length > 80 ? ev.body.substring(0,80)+"…" : ev.body}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Account avatar + dropdown — hidden for students (they use the sidebar chip) */}
        {_roleLc !== "student" && (
        <div ref={accountMenuRef} style={{ position: "relative" }}>
          <button
            onClick={() => setAccountMenuOpen(o => !o)}
            title="Account"
            style={{ width: "38px", height: "38px", borderRadius: "50%", background: DARK_GREEN, color: WHITE, border: `2px solid ${DARK_GREEN}`, boxShadow: "0 0 0 2px #ffffff, 0 1px 3px rgba(0,0,0,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: 700, cursor: "pointer", flexShrink: 0, padding: 0, overflow: "hidden" }}
          >
            {myProfilePic ? (
              <img
                src={myProfilePic}
                alt="Profile"
                style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top", borderRadius: "50%", display: "block", imageRendering: "auto" }}
                onError={() => setMyProfilePic(null)}
              />
            ) : (
              "👤"
            )}
          </button>

          {accountMenuOpen && (
            <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 500, width: "200px", background: WHITE, borderRadius: "12px", border: `1px solid ${BORDER}`, boxShadow: "0 12px 32px rgba(0,0,0,0.16)", overflow: "hidden", animation: "mainWorkspaceFadeIn 0.18s ease" }}>
              <div style={{ padding: "10px 14px", borderBottom: `1px solid ${BORDER}`, fontSize: "10px", fontWeight: 700, color: GRAY, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Account
              </div>
              <button
                onClick={() => { setActiveView("Account Settings"); setAccountMenuOpen(false); }}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", background: "none", border: "none", textAlign: "left", fontSize: "13px", fontWeight: 600, color: DARK_GREEN, cursor: "pointer" }}
                className="subnav-interactive-btn"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                Settings
              </button>
              <button
                onClick={() => { setAccountMenuOpen(false); onLogout(); }}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", background: "none", border: "none", borderTop: `1px solid ${BORDER}`, textAlign: "left", fontSize: "13px", fontWeight: 600, color: "#DC2626", cursor: "pointer" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                Log out
              </button>
            </div>
          )}
        </div>
        )}
        </div>{/* end right-side bell+avatar group */}
      </div>

      {/* ── BODY ROW: sidebar (below the navbar) + main content ── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

      {/* Mobile backdrop — tap to close the sidebar (hidden on desktop via CSS) */}
      {sidebarOpen && <div className="cca-mobile-backdrop" onClick={() => setSidebarOpen(false)} />}

      {/* ── SIDEBAR ── */}
      <div className={"app-sidebar" + (sidebarOpen ? "" : " app-sidebar-collapsed")} style={{
        width: sidebarOpen ? (_roleLc === "student" ? "234px" : "230px") : "64px",
        minWidth: sidebarOpen ? (_roleLc === "student" ? "234px" : "230px") : "64px",
        background: "#ffffff",
        display: "flex", flexDirection: "column",
        borderRight: `1px solid #ffffff`,
        overflow: "hidden",
        transition: "width 0.25s ease, min-width 0.25s ease",
        flexShrink: 0,
        position: "relative",
      }}>
        {/* Mascot watermark at bottom */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, top: 0, pointerEvents: "none", overflow: "hidden", zIndex: 0, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <img src={ccaLogoSvg} alt="" style={{ width: "700px", opacity: 0.35, display: "block", marginBottom: "-55px", marginLeft: "27px" }} />
        </div>
        {/* Decorative floating icons */}
        {sidebarOpen && (
          <>
            <div style={{ position: "absolute", bottom: "230px", right: "18px", fontSize: "32px", opacity: 0.18, pointerEvents: "none", zIndex: 0, transform: "rotate(-10deg)" }}>📚</div>
            <div style={{ position: "absolute", bottom: "170px", left: "14px", fontSize: "26px", opacity: 0.15, pointerEvents: "none", zIndex: 0, transform: "rotate(12deg)" }}>⚙️</div>
          </>
        )}
        {/* Nav links */}
        <div style={{ flex: 1, padding: "12px 8px", display: "flex", flexDirection: "column", gap: "4px", overflowY: "auto", position: "relative", zIndex: 1 }}>

          {/* Main nav items — icon-only, centered, when collapsed. Library staff see only the Library section. */}
          {!isLibrary && !isClinic && visibleNav.map(link => (
            /* Admins access "Student User" via the Student Portal dropdown below */
            (link.label === "Student User" && _roleLc !== "student") ? null :
            <button
              key={link.label}
              onClick={() => setActiveView(link.label)}
              title={!sidebarOpen ? link.label : undefined}
              style={{
                ...navBtnStyle(link.label),
                justifyContent: sidebarOpen ? "flex-start" : "center",
                gap: sidebarOpen ? "8px" : 0,
                padding: sidebarOpen ? "8px 12px" : "10px 0",
              }}
              className="nav-interactive-btn"
            >
              <span style={{ fontSize: "13px" }}>{link.icon}</span>
              {sidebarOpen && <span>{link.label === "Student User" && _roleLc === "student" ? "Dashboard" : link.label}</span>}
            </button>
          ))}

          {/* Library staff see the Library sections directly (no dropdown, no overview). */}
          {isLibrary && LIBRARY_LINKS.map(item => (
            <button
              key={item.view}
              onClick={() => setActiveView(item.view)}
              title={!sidebarOpen ? item.label : undefined}
              style={{
                ...navBtnStyle(item.view),
                marginTop: "2px",
                justifyContent: sidebarOpen ? "flex-start" : "center",
                gap: sidebarOpen ? "8px" : 0,
                padding: sidebarOpen ? "8px 12px" : "10px 0",
              }}
              className="nav-interactive-btn"
            >
              <span style={{ fontSize: "13px", display: "flex" }}>{item.icon}</span>
              {sidebarOpen && <span>{item.label}</span>}
            </button>
          ))}

          {isLibrary && renderInventory("top")}
          {isLibrary && renderLibrarySettings("top")}

          {/* Clinic staff see the Clinic sections directly (no dropdown). */}
          {isClinic && CLINIC_LINKS.map(item => (
            <button
              key={item.view}
              onClick={() => setActiveView(item.view)}
              title={!sidebarOpen ? item.label : undefined}
              style={{
                ...navBtnStyle(item.view),
                marginTop: "2px",
                justifyContent: sidebarOpen ? "flex-start" : "center",
                gap: sidebarOpen ? "8px" : 0,
                padding: sidebarOpen ? "8px 12px" : "10px 0",
              }}
              className="nav-interactive-btn"
            >
              <span style={{ fontSize: "13px", display: "flex" }}>{item.icon}</span>
              {sidebarOpen && <span>{item.label}</span>}
            </button>
          ))}

          {/* Library accordion — administrator only (below Create Announcement) */}
          {isAdmin && (
            <div style={{ marginTop: "4px" }}>
              <button
                onClick={() => {
                  if (!sidebarOpen) { setSidebarOpen(true); setLibraryOpen(true); return; }
                  setLibraryOpen(o => !o);
                }}
                title={!sidebarOpen ? "Library" : undefined}
                style={{
                  display: "flex", alignItems: "center", gap: sidebarOpen ? "8px" : 0, width: "100%",
                  justifyContent: sidebarOpen ? "flex-start" : "center",
                  padding: sidebarOpen ? "8px 12px" : "10px 0",
                  background: LIBRARY_VIEWS.includes(activeView) ? DARK_GREEN : "transparent",
                  border: "none", borderRadius: "8px",
                  color: LIBRARY_VIEWS.includes(activeView) ? WHITE : DARK_GREEN,
                  fontSize: "12px", fontWeight: 400,
                  textAlign: "left", cursor: "pointer", transition: "all 0.2s", whiteSpace: "nowrap"
                }}
                className="nav-interactive-btn"
              >
                <span style={{ fontSize: "13px", display: "flex" }}>{ICON_LIBRARY}</span>
                {sidebarOpen && <span style={{ flex: 1 }}>Library</span>}
                {sidebarOpen && (
                  <span style={{ fontSize: "11px", transition: "transform 0.2s", display: "inline-block", transform: libraryOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
                )}
              </button>

              {sidebarOpen && libraryOpen && (
                <div style={{ marginTop: "2px", marginLeft: "12px", display: "flex", flexDirection: "column", gap: "2px" }}>
                  {LIBRARY_LINKS.map(item => (
                    <button
                      key={item.view}
                      onClick={() => setActiveView(item.view)}
                      style={{
                        display: "flex", alignItems: "center", gap: "8px", width: "100%",
                        padding: "7px 12px",
                        background: activeView === item.view ? DARK_GREEN : "transparent",
                        border: "none",
                        borderLeft: `2px solid ${activeView === item.view ? DARK_GREEN : "rgba(61,110,1,0.3)"}`,
                        borderRadius: "0 8px 8px 0",
                        color: activeView === item.view ? WHITE : DARK_GREEN, fontSize: "11px",
                        fontWeight: activeView === item.view ? 700 : 400,
                        textAlign: "left", cursor: "pointer", transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)", whiteSpace: "nowrap"
                      }}
                      className="subnav-interactive-btn"
                    >
                      <span style={{ display: "flex" }}>{item.icon}</span>
                      <span>{item.label}</span>
                    </button>
                  ))}
                  {renderInventory("sub")}
                  {renderLibrarySettings("sub")}
                </div>
              )}
            </div>
          )}

          {/* Clinic accordion — administrator only (clinic staff see direct items above) */}
          {isAdmin && (
            renderLibraryGroup({ variant: "top", title: "Clinic", icon: ICON_CLINIC, groupViews: CLINIC_VIEWS, links: CLINIC_LINKS, open: clinicOpen, setOpen: setClinicOpen })
          )}

          {/* My Profile accordion — only for students */}
          {_roleLc === "student" && (
            <div style={{ marginTop: "4px" }}>
              <button
                onClick={() => {
                  if (!sidebarOpen) { setSidebarOpen(true); setMyProfileOpen(true); return; }
                  setMyProfileOpen(o => !o);
                }}
                title={!sidebarOpen ? "My Profile" : undefined}
                style={{
                  display: "flex", alignItems: "center", gap: sidebarOpen ? "8px" : 0, width: "100%",
                  justifyContent: sidebarOpen ? "flex-start" : "center",
                  padding: sidebarOpen ? "8px 12px" : "10px 0",
                  background: ["Personal Information", "Educational Background", "Family Background"].includes(activeView) ? DARK_GREEN : "transparent",
                  border: "none", borderRadius: "8px",
                  color: ["Personal Information", "Educational Background", "Family Background"].includes(activeView) ? WHITE : DARK_GREEN,
                  fontSize: "12px", fontWeight: 400,
                  textAlign: "left", cursor: "pointer", transition: "all 0.2s", whiteSpace: "nowrap"
                }}
                className="nav-interactive-btn"
              >
                <span style={{ fontSize: "13px", display: "flex" }}>{ICON_ACCOUNT}</span>
                {sidebarOpen && <span style={{ flex: 1 }}>My Profile</span>}
                {sidebarOpen && (
                  <span style={{ fontSize: "11px", transition: "transform 0.2s", display: "inline-block", transform: myProfileOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
                )}
              </button>

              {sidebarOpen && myProfileOpen && (
                <div style={{ marginTop: "2px", marginLeft: "12px", display: "flex", flexDirection: "column", gap: "2px" }}>
                  {["Personal Information", "Educational Background", "Family Background"].map(label => (
                    <button
                      key={label}
                      onClick={() => setActiveView(label)}
                      style={{
                        display: "flex", alignItems: "center", gap: "8px", width: "100%", padding: "7px 12px",
                        background: activeView === label ? DARK_GREEN : "transparent",
                        border: "none",
                        borderLeft: `2px solid ${activeView === label ? DARK_GREEN : "rgba(61,110,1,0.3)"}`,
                        borderRadius: "0 8px 8px 0",
                        color: activeView === label ? WHITE : DARK_GREEN, fontSize: "11px",
                        fontWeight: activeView === label ? 700 : 400,
                        textAlign: "left", cursor: "pointer", transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)", whiteSpace: "nowrap"
                      }}
                      className="subnav-interactive-btn"
                    >
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Grades — standalone item for students */}
          {_roleLc === "student" && (
            <button
              onClick={() => setActiveView("My Grades")}
              title={!sidebarOpen ? "Grades" : undefined}
              style={{
                display: "flex", alignItems: "center", gap: sidebarOpen ? "8px" : 0, width: "100%", marginTop: "4px",
                justifyContent: sidebarOpen ? "flex-start" : "center",
                padding: sidebarOpen ? "8px 12px" : "10px 0",
                background: activeView === "My Grades" ? DARK_GREEN : "transparent",
                border: "none", borderRadius: "8px",
                color: activeView === "My Grades" ? WHITE : DARK_GREEN,
                fontSize: "12px", fontWeight: 400, textAlign: "left", cursor: "pointer", transition: "all 0.2s", whiteSpace: "nowrap"
              }}
              className="nav-interactive-btn"
            >
              <span style={{ fontSize: "13px", display: "flex" }}>{ICON_SUBJECT}</span>
              {sidebarOpen && <span>Grades</span>}
            </button>
          )}

          {/* Class Schedule — standalone item for students */}
          {_roleLc === "student" && (
            <button
              onClick={() => setActiveView("Class Schedule")}
              title={!sidebarOpen ? "Class Schedule" : undefined}
              style={{
                display: "flex", alignItems: "center", gap: sidebarOpen ? "8px" : 0, width: "100%", marginTop: "4px",
                justifyContent: sidebarOpen ? "flex-start" : "center",
                padding: sidebarOpen ? "8px 12px" : "10px 0",
                background: activeView === "Class Schedule" ? DARK_GREEN : "transparent",
                border: "none", borderRadius: "8px",
                color: activeView === "Class Schedule" ? WHITE : DARK_GREEN,
                fontSize: "12px", fontWeight: 400, textAlign: "left", cursor: "pointer", transition: "all 0.2s", whiteSpace: "nowrap"
              }}
              className="nav-interactive-btn"
            >
              <span style={{ fontSize: "13px", display: "flex" }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></span>
              {sidebarOpen && <span>Class Schedule</span>}
            </button>
          )}

          {/* Admin Settings accordion — only for administrator */}
          {isAdmin && (
            <div style={{ marginTop: "4px" }}>
              {/* Accordion toggle — collapsed rail shows just the gear icon;
                  clicking it while collapsed re-expands the sidebar so the
                  submenu has somewhere to render. */}
              <button
                onClick={() => {
                  if (!sidebarOpen) { setSidebarOpen(true); setAdminOpen(true); return; }
                  setAdminOpen(o => !o);
                }}
                title={!sidebarOpen ? "Admin Settings" : undefined}
                style={{
                  display: "flex", alignItems: "center", gap: sidebarOpen ? "8px" : 0, width: "100%",
                  justifyContent: sidebarOpen ? "flex-start" : "center",
                  padding: sidebarOpen ? "8px 12px" : "10px 0",
                  background: adminSubViews.includes(activeView)
                    ? DARK_GREEN : "transparent",
                  border: "none", borderRadius: "8px",
                  color: adminSubViews.includes(activeView) ? WHITE : DARK_GREEN,
                  fontSize: "12px", fontWeight: 600,
                  textAlign: "left", cursor: "pointer", transition: "all 0.2s", whiteSpace: "nowrap"
                }}
                className="nav-interactive-btn"
              >
                <span style={{ fontSize: "13px", display: "flex" }}>{ICON_GEAR}</span>
                {sidebarOpen && <span style={{ flex: 1 }}>Admin Settings</span>}
                {sidebarOpen && (
                  <span style={{
                    fontSize: "11px", transition: "transform 0.2s", display: "inline-block",
                    transform: adminOpen ? "rotate(180deg)" : "rotate(0deg)"
                  }}>▼</span>
                )}
              </button>

              {/* Dropdown items */}
              {sidebarOpen && adminOpen && (
                <div style={{ marginTop: "2px", marginLeft: "12px", display: "flex", flexDirection: "column", gap: "2px" }}>
                  {ADMIN_SETTINGS_ITEMS.map(item => (
                    <button
                      key={item.label}
                      onClick={() => setActiveView(item.label)}
                      style={{
                        display: "flex", alignItems: "center", gap: "8px", width: "100%",
                        padding: "7px 12px",
                        background: activeView === item.label ? DARK_GREEN : "transparent",
                        border: "none",
                        borderLeft: `2px solid ${activeView === item.label ? DARK_GREEN : "rgba(61,110,1,0.3)"}`,
                        borderRadius: "0 8px 8px 0",
                        color: activeView === item.label ? WHITE : DARK_GREEN, fontSize: "11px",
                        fontWeight: activeView === item.label ? 700 : 400,
                        textAlign: "left", cursor: "pointer", transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)", whiteSpace: "nowrap"
                      }}
                      className="subnav-interactive-btn"
                    >
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Student Portal accordion — administrator only (same icon as Admin Settings) */}
          {isAdmin && (
            <div style={{ marginTop: "4px" }}>
              <button
                onClick={() => {
                  if (!sidebarOpen) { setSidebarOpen(true); setStudentPortalOpen(true); return; }
                  setStudentPortalOpen(o => !o);
                }}
                title={!sidebarOpen ? "Student Portal" : undefined}
                style={{
                  display: "flex", alignItems: "center", gap: sidebarOpen ? "8px" : 0, width: "100%",
                  justifyContent: sidebarOpen ? "flex-start" : "center",
                  padding: sidebarOpen ? "8px 12px" : "10px 0",
                  background: activeView === "Student User" ? DARK_GREEN : "transparent",
                  border: "none", borderRadius: "8px",
                  color: activeView === "Student User" ? WHITE : DARK_GREEN,
                  fontSize: "12px", fontWeight: 400,
                  textAlign: "left", cursor: "pointer", transition: "all 0.2s", whiteSpace: "nowrap"
                }}
                className="nav-interactive-btn"
              >
                <span style={{ fontSize: "13px", display: "flex" }}>{ICON_GEAR}</span>
                {sidebarOpen && <span style={{ flex: 1 }}>Student Portal</span>}
                {sidebarOpen && (
                  <span style={{ fontSize: "11px", transition: "transform 0.2s", display: "inline-block", transform: studentPortalOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
                )}
              </button>

              {sidebarOpen && studentPortalOpen && (
                <div style={{ marginTop: "2px", marginLeft: "12px", display: "flex", flexDirection: "column", gap: "2px" }}>
                  <button
                    onClick={() => setActiveView("Student User")}
                    style={{
                      display: "flex", alignItems: "center", gap: "8px", width: "100%",
                      padding: "7px 12px",
                      background: activeView === "Student User" ? DARK_GREEN : "transparent",
                      border: "none",
                      borderLeft: `2px solid ${activeView === "Student User" ? DARK_GREEN : "rgba(61,110,1,0.3)"}`,
                      borderRadius: "0 8px 8px 0",
                      color: activeView === "Student User" ? WHITE : DARK_GREEN, fontSize: "11px",
                      fontWeight: activeView === "Student User" ? 700 : 400,
                      textAlign: "left", cursor: "pointer", transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)", whiteSpace: "nowrap"
                    }}
                    className="subnav-interactive-btn"
                  >
                    <span>{ICON_CAP}</span>
                    <span>Student User</span>
                  </button>
                  <button
                    onClick={() => setActiveView("Dates to Remember")}
                    style={{
                      display: "flex", alignItems: "center", gap: "8px", width: "100%",
                      padding: "7px 12px",
                      background: activeView === "Dates to Remember" ? DARK_GREEN : "transparent",
                      border: "none",
                      borderLeft: `2px solid ${activeView === "Dates to Remember" ? DARK_GREEN : "rgba(61,110,1,0.3)"}`,
                      borderRadius: "0 8px 8px 0",
                      color: activeView === "Dates to Remember" ? WHITE : DARK_GREEN, fontSize: "11px",
                      fontWeight: activeView === "Dates to Remember" ? 700 : 400,
                      textAlign: "left", cursor: "pointer", transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)", whiteSpace: "nowrap"
                    }}
                    className="subnav-interactive-btn"
                  >
                    <span>📅</span>
                    <span>Dates to Remember</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Maintenance Mode — administrator only; toggle sits beside the label */}
          {isAdmin && (
            <div
              title={!sidebarOpen ? "Maintenance Mode" : undefined}
              style={{
                display: "flex", alignItems: "center", marginTop: "4px",
                justifyContent: sidebarOpen ? "space-between" : "center",
                gap: "8px", padding: sidebarOpen ? "8px 12px" : "10px 0",
                borderRadius: "8px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                <span style={{ fontSize: "13px", display: "flex" }}>🛠</span>
                {sidebarOpen && <span style={{ fontSize: "12px", color: DARK_GREEN, fontWeight: 400, whiteSpace: "nowrap" }}>Maintenance Mode</span>}
              </div>
              {sidebarOpen && (
                <button onClick={toggleMaint} disabled={maintSaving} title="Toggle maintenance mode"
                  style={{ position: "relative", width: "46px", height: "22px", borderRadius: "11px", border: "none", cursor: maintSaving ? "default" : "pointer", background: maintOn ? "#DC2626" : "#9CA3AF", flexShrink: 0, transition: "background 0.2s" }}>
                  <span style={{ position: "absolute", top: 0, bottom: 0, display: "flex", alignItems: "center", fontSize: "7px", fontWeight: 800, color: WHITE, left: maintOn ? "7px" : "auto", right: maintOn ? "auto" : "6px" }}>{maintOn ? "ON" : "OFF"}</span>
                  <span style={{ position: "absolute", top: "3px", left: maintOn ? "calc(100% - 19px)" : "3px", width: "16px", height: "16px", borderRadius: "50%", background: WHITE, transition: "left 0.2s", boxShadow: "0 1px 2px rgba(0,0,0,0.3)" }} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Student profile chip pinned to the bottom of the sidebar ── */}
        {_roleLc === "student" && (
          <div ref={studentMenuRef} style={{ position: "relative", zIndex: 3, padding: "8px", borderTop: `1px solid ${BORDER}`, background: "#ffffff" }}>
            {studentMenuOpen && (
              <div style={{ position: "absolute", bottom: "calc(100% - 2px)", left: 8, right: 8, background: WHITE, borderRadius: "12px", border: `1px solid ${BORDER}`, boxShadow: "0 -10px 28px rgba(0,0,0,0.16)", overflow: "hidden", zIndex: 30, animation: "mainWorkspaceFadeIn 0.16s ease" }}>
                <div style={{ padding: "9px 14px", borderBottom: `1px solid ${BORDER}`, fontSize: "10px", fontWeight: 700, color: GRAY, textTransform: "uppercase", letterSpacing: "0.5px" }}>Account</div>
                <button
                  onClick={() => { setActiveView("Account Settings"); setStudentMenuOpen(false); }}
                  className="subnav-interactive-btn"
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", background: "none", border: "none", textAlign: "left", fontSize: "13px", fontWeight: 600, color: DARK_GREEN, cursor: "pointer" }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                  Settings
                </button>
                <button
                  onClick={() => { setStudentMenuOpen(false); onLogout(); }}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", background: "none", border: "none", borderTop: `1px solid ${BORDER}`, textAlign: "left", fontSize: "13px", fontWeight: 600, color: "#DC2626", cursor: "pointer" }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                  Log out
                </button>
              </div>
            )}
            <button
              onClick={() => { if (!sidebarOpen) { setSidebarOpen(true); setStudentMenuOpen(true); return; } setStudentMenuOpen(o => !o); }}
              title={!sidebarOpen ? "Account" : undefined}
              style={{
                display: "flex", alignItems: "center", gap: sidebarOpen ? "10px" : 0, width: "100%",
                justifyContent: sidebarOpen ? "flex-start" : "center",
                padding: sidebarOpen ? "8px 10px" : "8px 0",
                background: studentMenuOpen ? "#F3F4F6" : "#ffffff",
                border: `1px solid ${BORDER}`, borderRadius: "12px", cursor: "pointer", transition: "background 0.15s",
              }}
            >
              <span style={{ width: "32px", height: "32px", borderRadius: "50%", overflow: "hidden", background: DARK_GREEN, color: WHITE, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "12px", fontWeight: 700 }}>
                {myProfilePic
                  ? <img src={myProfilePic} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : `${(studentProfile?.first_name || "?").charAt(0)}${(studentProfile?.last_name || "").charAt(0)}`}
              </span>
              {sidebarOpen && (
                <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                  <div style={{ fontSize: "11px", fontWeight: 800, color: "#1f2937", textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", letterSpacing: "-0.1px" }}>
                    {[studentProfile?.first_name || user?.first_name, studentProfile?.last_name || user?.last_name].filter(Boolean).join(" ") || user?.username || "Student"}
                  </div>
                  <div style={{ fontSize: "10px", color: GRAY }}>{studentProfile?.student_number || user?.student_number || ""}</div>
                </div>
              )}
              {sidebarOpen && <span style={{ color: GRAY, fontSize: "15px", lineHeight: 1, flexShrink: 0 }}>›</span>}
            </button>
          </div>
        )}

      </div>

      {/* ── MAIN CONTENT ── */}
      <div style={{ flex: 1, overflowY: "auto", minWidth: 0 }}>
        <div style={{ padding: "12px" }} className="animated-content-wrapper">

          {/* Students landing on the home view see their own portal, not the admin overview */}
          {activeView === "Overview Workspace" && _roleLc === "student" && (
            <StudentPortal user={user} onNavigate={setActiveView} />
          )}

          {/* ── OVERVIEW WORKSPACE (no card wrapper, fits full width) ── */}
          {activeView === "Overview Workspace" && !loading && _roleLc !== "student" && (
            <>
              {/* Metric cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "12px", marginBottom: "16px" }}>
                <MetricCard label="Registered Students" value={metrics.students} desc="Active profiles"    icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1E88E5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10L12 5 2 10l10 5 10-5z"/><path d="M6 12.5V17c0 1.5 2.5 3 6 3s6-1.5 6-3v-4.5"/></svg>} color="#1E88E5" />
                <MetricCard label="Faculty Instructors"  value={metrics.faculty}  desc="Teaching positions" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="7" r="4"/><path d="M5 21v-2a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v2"/></svg>} color={GREEN} />
                <MetricCard label="System Bulletins"     value={metrics.announcements} desc="Live announcements" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>} color={GOLD} />
                <SystemAccountsCard
                  count={metrics.systemAccounts}
                  users={systemUsers}
                  open={showUsersPanel}
                  onToggle={() => setShowUsersPanel(o => !o)}
                  onClose={() => setShowUsersPanel(false)}
                  cardRef={accountsCardRef}
                />
              </div>
              {/* Overview content directly on background — no card */}
              <Overview user={user} />
            </>
          )}

          {/* ── ALL OTHER VIEWS (white card wrapper) ── */}
          {activeView !== "Overview Workspace" && (
            <div style={{ background: WHITE, borderRadius: "12px", border: `1px solid ${BORDER}`, boxShadow: "0 1px 3px rgba(0,0,0,0.05)", padding: "16px", minHeight: "400px" }}>
              {loading ? (
                <div style={{ padding: "40px", textAlign: "center", color: GRAY }}>Loading...</div>
              ) : (
                <>
                  {activeView === "Student List"        && <AddStudents user={user} />}
                  {activeView === "Faculty"             && <Faculty />}
                  {activeView === "Registrar"           && <Registrar user={user} />}
                  {activeView === "Grade"               && <FacultyGrades user={user} />}
                  {activeView === "Student User"        && <StudentPortal user={user} onNavigate={setActiveView} />}
                  {activeView === "Dates to Remember"  && <DatesToRemember />}
                  {activeView === "Personal Information"   && <StudentPortal user={user} section="personal"  onNavigate={setActiveView} />}
                  {activeView === "Educational Background" && <StudentPortal user={user} section="education" onNavigate={setActiveView} />}
                  {activeView === "Family Background"      && <StudentPortal user={user} section="family"    onNavigate={setActiveView} />}
                  {activeView === "My Grades"             && <StudentPortal user={user} section="grades" />}
                  {activeView === "Class Schedule"        && <StudentPortal user={user} section="schedule" />}
                  {activeView === "Create Announcement" && (
                    <Announcements user={user} onPosted={() => {
                      fetchPortalData();
                      setActiveView("Overview Workspace");
                    }} />
                  )}
                  {activeView === "Users"             && <UserManagementModule />}
                  {activeView === "Roles"             && <RolesManagementModule />}
                  {activeView === "System"             && <CourseManagement />}
                  {activeView === "Designation"        && <Designation />}
                  {activeView === "Subjects"            && <SubjectCatalog />}
                  {activeView === "Class Assignment"    && <ClassSchedule isAdmin={true} user={user} />}
                  {activeView === "Account Settings"    && <AccountSettings user={user} />}
                  {activeView === "Library Dashboard"  && <Library />}
                  {activeView === "Check In/Out"       && <CheckInOut canDelete={libCanDelete} />}
                  {activeView === "Library Search"     && <LibrarySearch canDelete={libCanDelete} />}
                  {activeView === "Acquisition"        && <Acquisition />}
                  {activeView === "Circulation"        && <Circulation canDelete={libCanDelete} />}
                  {activeView === "Library Settings"    && <LibraryPlaceholder title="Library Settings" desc="Choose a settings section." icon="⚙️" />}
                  {activeView === "Library Purpose"     && <LibraryPurposeSettings canDelete={libCanDelete} />}
                  {activeView === "Inventory Report"   && <LibraryPlaceholder title="Inventory Report" desc="Choose a report section." icon="📊" />}
                  {activeView === "Inventory Print"    && <LibraryPlaceholder title="Print" desc="Print the library inventory." icon="🖨" />}
                  {activeView === "Clinic Dashboard"     && <LibraryPlaceholder title="Clinic Dashboard" desc="Clinic overview." icon="🏥" />}
                  {activeView === "Emergency Referral"   && <LibraryPlaceholder title="Emergency Referral" desc="Emergency referrals." icon="🚑" />}
                  {activeView === "First Aid"            && <LibraryPlaceholder title="First Aid" desc="First aid records." icon="➕" />}
                  {activeView === "Disease Surveillance" && <LibraryPlaceholder title="Disease Surveillance" desc="Monitor disease reports." icon="🦠" />}
                  {activeView === "Dental CheckUp"       && <DentalCheckup canDelete={clinicCanDelete} />}
                </>
              )}
            </div>
          )}

        </div>
      </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, desc, icon, color }) {
  return (
    <div 
      style={{ background: WHITE, border: `1px solid ${BORDER}`, borderLeft: `4px solid ${color}`, borderRadius: "10px", padding: "14px", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}
      className="interactive-metric-card"
    >
      <div>
        <div style={{ fontSize: "10px", fontWeight: 700, color: GRAY, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "3px" }}>{label}</div>
        <div style={{ fontSize: "20px", fontWeight: 800, color: "#111827", marginBottom: "2px" }}>{value}</div>
        <div style={{ fontSize: "10px", color: GRAY }}>{desc}</div>
      </div>
      <div 
        style={{ fontSize: "20px", width: "38px", height: "38px", background: `${color}10`, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", transition: "transform 0.3s ease" }}
        className="metric-icon-circle"
      >
        {icon}
      </div>
    </div>
  );
}

// ── System Accounts Clickable Card with Facebook-style User Dropdown ──────────
function SystemAccountsCard({ count, users, open, onToggle, onClose, cardRef }) {
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (cardRef.current && !cardRef.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose, cardRef]);

  const av = (roles) => {
    const r = (Array.isArray(roles) ? (roles[0] || "") : (roles || "")).toLowerCase();
    if (r === "administrator") return { bg: "#FFF8E1", color: "#B8860B" };
    if (r === "registrar")     return { bg: "#F3E5F5", color: "#8E24AA" };
    if (r === "faculty")       return { bg: "#eaf2d9", color: "#3d6e01" };
    return                            { bg: "#E3F2FD", color: "#1E88E5" };
  };
  const init    = (u) => ((u.first_name || u.firstName || u.username || "?").charAt(0)).toUpperCase();
  const name    = (u) => [`${u.first_name || u.firstName || ""}`, `${u.last_name || u.lastName || ""}`].filter(Boolean).join(" ").toUpperCase() || u.username || "Unknown";
  const getRoles= (u) => Array.isArray(u.roles) ? u.roles : (u.role ? [u.role] : []);
  const pic     = (u) => u.profile_picture || u.profilePicture || null;
  // "Online" reflects real presence (a heartbeat seen recently), not just an
  // active/non-suspended account — previously this always showed green for
  // every active account, even users who weren't actually signed in.
  const ONLINE_THRESHOLD_MS = 60 * 1000; // heartbeats fire every ~20s, so 60s allows for a couple of missed pings
  const active  = (u) => {
    if ((u.status || "").toLowerCase() === "suspended") return false;
    if (!u.last_seen) return false;
    const diffMs = Date.now() - new Date(u.last_seen).getTime();
    return diffMs >= 0 && diffMs < ONLINE_THRESHOLD_MS;
  };

  const BORDER_C = "#E5E7EB";
  const GRAY_C   = "#6B7280";
  const WHITE_C  = "#FFFFFF";
  const LIGHT_C  = "#F9FAFB";
  const PURPLE_C = "#6366F1";

  const roleBadgeStyle = (r) => {
    const rl = (r || "").toLowerCase();
    if (rl === "administrator") return { bg: "#FFF8E1", color: "#B8860B" };
    if (rl === "registrar")     return { bg: "#F3E5F5", color: "#8E24AA" };
    if (rl === "faculty")       return { bg: "#eaf2d9", color: "#3d6e01" };
    return                             { bg: "#F3F4F6", color: "#374151" };
  };

  return (
    <div ref={cardRef} style={{ position: "relative" }}>
      {/* Clickable card */}
      <div
        onClick={onToggle}
        style={{
          background: WHITE_C,
          border: `1px solid ${open ? PURPLE_C : BORDER_C}`,
          borderLeft: `4px solid ${PURPLE_C}`,
          borderRadius: "10px", padding: "14px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          boxShadow: open ? `0 4px 14px rgba(99,102,241,0.18)` : "0 1px 2px rgba(0,0,0,0.04)",
          cursor: "pointer", transition: "all 0.2s ease", userSelect: "none"
        }}
        className="interactive-metric-card"
      >
        <div>
          <div style={{ fontSize: "10px", fontWeight: 700, color: GRAY_C, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "3px" }}>
            System Accounts
          </div>
          <div style={{ fontSize: "20px", fontWeight: 800, color: "#111827", marginBottom: "2px" }}>{count}</div>
          <div style={{ fontSize: "10px", color: GRAY_C }}>
            Active portal users {open ? "▲" : "▾"}
          </div>
        </div>
        <div
          style={{ fontSize: "20px", width: "38px", height: "38px", background: "rgba(99,102,241,0.1)", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", transition: "transform 0.3s ease" }}
          className="metric-icon-circle"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3"/><path d="M2 20v-1a5 5 0 0 1 5-5h2"/><circle cx="17" cy="10" r="2.5"/><path d="M15.5 14.2A4 4 0 0 1 22 18v2"/></svg>
        </div>
      </div>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 500,
          width: "300px", background: WHITE_C,
          borderRadius: "14px", border: `1px solid ${BORDER_C}`,
          boxShadow: "0 12px 40px rgba(0,0,0,0.16)",
          overflow: "hidden", animation: "mainWorkspaceFadeIn 0.18s ease"
        }}>
          {/* Panel header */}
          <div style={{
            padding: "12px 16px", background: "#F5F3FF",
            borderBottom: `1px solid ${BORDER_C}`,
            display: "flex", justifyContent: "space-between", alignItems: "center"
          }}>
            <span style={{ fontSize: "13px", fontWeight: 800, color: "#111827" }}>🔐 Portal Users</span>
            <span style={{ fontSize: "11px", color: GRAY_C, background: WHITE_C, padding: "2px 8px", borderRadius: "10px", fontWeight: 600, border: `1px solid ${BORDER_C}` }}>
              {count} accounts
            </span>
          </div>

          {/* Stacked avatar preview strip */}
          {users.length > 0 && (
            <div style={{ padding: "10px 16px 0 16px", display: "flex", alignItems: "center", gap: "4px" }}>
              {users.slice(0, 6).map((u, i) => {
                const p = pic(u);
                return (
                  <div key={u.id || i} style={{ width: "26px", height: "26px", borderRadius: "50%", border: "2px solid white", marginLeft: i > 0 ? "-8px" : 0, background: av(getRoles(u)).bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 700, color: av(getRoles(u)).color, overflow: "hidden", flexShrink: 0 }}>
                    {p ? <img src={p} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : init(u)}
                  </div>
                );
              })}
              {users.length > 6 && <span style={{ fontSize: "10px", color: GRAY_C, marginLeft: "6px" }}>+{users.length - 6} more</span>}
            </div>
          )}

          {/* User list — online accounts only */}
          <div style={{ maxHeight: "280px", overflowY: "auto" }}>
            {users.filter(u => active(u)).length === 0 ? (
              <div style={{ padding: "20px", textAlign: "center", fontSize: "12px", color: GRAY_C }}>No one is online right now.</div>
            ) : users.filter(u => active(u)).map((u, i) => {
              const roleList = getRoles(u);
              const p = pic(u);
              const isOnline = active(u);
              return (
                <div key={u.id || i} style={{ padding: "10px 16px", display: "flex", alignItems: "center", gap: "10px", borderBottom: `1px solid ${BORDER_C}`, background: i % 2 === 0 ? WHITE_C : LIGHT_C }}>
                  {/* Avatar */}
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    <div style={{ width: "34px", height: "34px", borderRadius: "50%", background: av(roleList).bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 800, color: av(roleList).color, overflow: "hidden" }}>
                      {p ? <img src={p} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} /> : init(u)}
                    </div>
                    {/* Online indicator */}
                    <span style={{ position: "absolute", bottom: 0, right: 0, width: "9px", height: "9px", borderRadius: "50%", background: isOnline ? "#22C55E" : "#D1D5DB", border: "1.5px solid white" }} />
                  </div>
                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "12px", fontWeight: 700, color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name(u)}</div>
                    <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginTop: "2px" }}>
                      {roleList.map(r => {
                        const rb = roleBadgeStyle(r);
                        return (
                          <span key={r} style={{ fontSize: "9px", fontWeight: 700, background: rb.bg, color: rb.color, padding: "1px 6px", borderRadius: "8px", textTransform: "capitalize" }}>{r}</span>
                        );
                      })}
                    </div>
                  </div>
                  {/* Status */}
                  <span style={{ fontSize: "9px", fontWeight: 700, color: isOnline ? "#16A34A" : GRAY_C, whiteSpace: "nowrap" }}>
                    {isOnline ? "● Online" : "○ Offline"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
