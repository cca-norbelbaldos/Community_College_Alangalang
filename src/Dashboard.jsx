import { useState, useEffect, useRef } from "react";
import Overview from "./Overview";
import UserManagementModule from "./UserManagementModule";
import RolesManagementModule from "./RolesManagementModule";
import CourseManagement from "./CourseManagement";
import AddStudents from "./AddStudents";
import Faculty from "./Faculty";
import Registrar from "./Registrar";
import Announcements from "./Announcement";
import AssignedSubject from "./AssignedSubject";
import Designation from "./designation";
import AccountSettings from "./AccountSettings";

const GOLD       = "#F5A800";
const GREEN      = "#2E7D32";
const DARK_GREEN = "#1B5E20";
const WHITE      = "#FFFFFF";
const GRAY       = "#6B7280";
const LIGHT_GRAY = "#F9FAFB";
const BORDER     = "#E5E7EB";
const PURPLE     = "#6366F1";
const LIGHT_PURPLE = "rgba(99,102,241,0.12)";

import ccaLogo from "./assets/cca_logo.jpg";

// ── Simple flat nav icons (replacing the old emoji set) ──────────────────────
const svgIconProps = { width: 15, height: 15, viewBox: "0 0 24 24", fill: "none", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };
const ICON_HOME = (
  <svg {...svgIconProps} stroke="#60A5FA"><path d="M3 11l9-8 9 8" /><path d="M5 10v9a1 1 0 0 0 1 1h3v-6h6v6h3a1 1 0 0 0 1-1v-9" /></svg>
);
const ICON_LAYERS = (
  <svg {...svgIconProps} stroke="#A78BFA"><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></svg>
);
const ICON_PERSON = (
  <svg {...svgIconProps} stroke="#CBD5E1"><circle cx="12" cy="7" r="4" /><path d="M5 21v-2a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v2" /></svg>
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

// Main nav items (no User Management, no System Controls here)
const MAIN_NAV = [
  { label: "Overview Workspace",  icon: ICON_HOME,     featureKey: "feat_overview",      alwaysFor: ["administrator", "faculty"] },
  { label: "Student List",        icon: ICON_LAYERS,   featureKey: "feat_student_list",  alwaysFor: ["administrator"] },
  { label: "Faculty Hub",         icon: ICON_PERSON,   featureKey: "feat_faculty_mgmt",  alwaysFor: ["administrator"] },
  { label: "Registrar Console",   icon: ICON_DOCUMENT, featureKey: "feat_registrar_mgmt",alwaysFor: ["administrator"] },
  { label: "Create Announcement", icon: ICON_BELL,     featureKey: "feat_announcements",  alwaysFor: ["administrator"] },

  { label: "Class Schedule",      icon: ICON_CLOCK,    featureKey: "feat_class_sched",    alwaysFor: ["faculty"] },
];

// Admin Settings dropdown items
const ADMIN_SETTINGS_ITEMS = [
  { label: "Users", icon: ICON_USERS, component: "UserManagement" },
  { label: "Roles", icon: ICON_TAG, component: "Roles" },
  { label: "Courses", icon: ICON_CAP, component: "Courses" },
  { label: "Designation", icon: ICON_IDCARD, component: "Designation" },
];

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
  student:       { label: "Student List",        icon: ICON_LAYERS },
};

export default function Dashboard({ user, onLogout, setIsLoading }) {
  // Persist the active page across refreshes — read the last view from
  // sessionStorage on first mount, then keep it synced as the user navigates,
  // so reloading the tab leaves them on the same page instead of bouncing
  // back to Overview Workspace.
  const [activeView, setActiveView]       = useState(() => {
    try { return sessionStorage.getItem("cca_dashboard_active_view") || "Overview Workspace"; }
    catch { return "Overview Workspace"; }
  });
  const [sidebarOpen, setSidebarOpen]     = useState(true);
  const [adminOpen, setAdminOpen]         = useState(false);
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
  const [todayEvents, setTodayEvents] = useState([]);
  const [notifOpen, setNotifOpen]     = useState(false);
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
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [accountMenuOpen]);

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
  const visibleNav = MAIN_NAV.filter(link => link.alwaysFor.includes(user?.role));

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
  const adminSubViews = ["Users", "Roles", "Courses", "Designation"];

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
    background: activeView === label ? "rgba(255,255,255,0.18)" : "transparent",
    border: "none", borderRadius: "6px", color: WHITE,
    fontSize: "12px", fontWeight: activeView === label ? 700 : 500,
    textAlign: "left", cursor: "pointer", transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)", whiteSpace: "nowrap"
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", background: "#F3F4F6", fontFamily: "system-ui, sans-serif" }}>
      
      {/* Dynamic Hover and Keyframe Stylesheet Injection */}
      <style>{`
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
          background: rgba(255, 255, 255, 0.1) !important;
          transform: translateX(4px);
        }
        .nav-interactive-btn:active {
          transform: translateX(1px);
        }

        /* Dropdown nested list items */
        .subnav-interactive-btn:hover {
          background: rgba(255, 255, 255, 0.08) !important;
          padding-left: 18px !important;
          color: ${GOLD} !important;
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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", padding: "10px 18px", background: WHITE, borderBottom: `1px solid ${BORDER}`, flexShrink: 0, zIndex: 100, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
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
          <div style={{ fontSize: "13px", fontWeight: 700, color: DARK_GREEN }}>Community College of Alangalang</div>
        </div>

        {/* Right side: bell + avatar grouped together */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>

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
                      <div style={{ fontSize: "12px", fontWeight: 800, color: "#1B5E20" }}>📅 {ev.title}</div>
                      <div style={{ fontSize: "11px", color: "#6B7280", marginTop: "2px" }}>{ev.department || "General"}</div>
                      {ev.body && <div style={{ fontSize: "11px", color: "#374151", marginTop: "4px", lineHeight: 1.4 }}>{ev.body.length > 80 ? ev.body.substring(0,80)+"…" : ev.body}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Account avatar + dropdown */}
        <div ref={accountMenuRef} style={{ position: "relative" }}>
          <button
            onClick={() => setAccountMenuOpen(o => !o)}
            title="Account"
            style={{ width: "34px", height: "34px", borderRadius: "50%", background: DARK_GREEN, color: WHITE, border: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: 700, cursor: "pointer", flexShrink: 0, padding: 0, overflow: "hidden" }}
          >
            {myProfilePic ? (
              <img
                src={myProfilePic}
                alt="Profile"
                style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
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
                ⚙️ Settings
              </button>
              <button
                onClick={() => { setAccountMenuOpen(false); onLogout(); }}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", background: "none", border: "none", borderTop: `1px solid ${BORDER}`, textAlign: "left", fontSize: "13px", fontWeight: 600, color: "#DC2626", cursor: "pointer" }}
              >
                ↩️ Log out
              </button>
            </div>
          )}
        </div>
        </div>{/* end right-side bell+avatar group */}
      </div>

      {/* ── BODY ROW: sidebar (below the navbar) + main content ── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

      {/* ── SIDEBAR ── */}
      <div style={{
        width: sidebarOpen ? "230px" : "64px",
        minWidth: sidebarOpen ? "230px" : "64px",
        background: DARK_GREEN, color: WHITE,
        display: "flex", flexDirection: "column",
        borderRight: `1px solid ${BORDER}`,
        overflow: "hidden",
        transition: "width 0.25s ease, min-width 0.25s ease",
        flexShrink: 0
      }}>
        {/* Nav links */}
        <div style={{ flex: 1, padding: "12px 8px", display: "flex", flexDirection: "column", gap: "4px", overflowY: "auto" }}>

          {/* Main nav items — icon-only, centered, when collapsed */}
          {visibleNav.map(link => (
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
              {sidebarOpen && <span>{link.label}</span>}
            </button>
          ))}

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
                    ? "rgba(255,255,255,0.15)" : "transparent",
                  border: "none", borderRadius: "6px", color: WHITE,
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
                        background: activeView === item.label ? "rgba(255,255,255,0.15)" : "transparent",
                        border: "none",
                        borderLeft: `2px solid ${activeView === item.label ? WHITE : "rgba(255,255,255,0.25)"}`,
                        borderRadius: "0 6px 6px 0",
                        color: WHITE, fontSize: "11px",
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
        </div>

      </div>

      {/* ── MAIN CONTENT ── */}
      <div style={{ flex: 1, overflowY: "auto", minWidth: 0 }}>
        <div style={{ padding: "16px" }} className="animated-content-wrapper">

          {/* ── OVERVIEW WORKSPACE (no card wrapper, fits full width) ── */}
          {activeView === "Overview Workspace" && !loading && (
            <>
              {/* Metric cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "12px", marginBottom: "16px" }}>
                <MetricCard label="Registered Students" value={metrics.students} desc="Active profiles"    icon="🎓" color="#1E88E5" />
                <MetricCard label="Faculty Instructors"  value={metrics.faculty}  desc="Teaching positions" icon="👩‍🏫" color={GREEN} />
                <MetricCard label="System Bulletins"     value={metrics.announcements} desc="Live announcements" icon="📢" color={GOLD} />
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
            <div style={{ background: WHITE, borderRadius: "12px", border: `1px solid ${BORDER}`, boxShadow: "0 1px 3px rgba(0,0,0,0.05)", padding: "24px", minHeight: "400px" }}>
              {loading ? (
                <div style={{ padding: "40px", textAlign: "center", color: GRAY }}>Loading...</div>
              ) : (
                <>
                  {activeView === "Student List"        && <AddStudents user={user} />}
                  {activeView === "Faculty Hub"         && <Faculty />}
                  {activeView === "Registrar Console"   && <Registrar user={user} />}
                  {activeView === "Create Announcement" && (
                    <Announcements user={user} onPosted={() => {
                      fetchPortalData();
                      setActiveView("Overview Workspace");
                    }} />
                  )}
                  {activeView === "Class Schedule"    && <AssignedSubject user={user} view="schedule" />}
                  {activeView === "Users"             && <UserManagementModule />}
                  {activeView === "Roles"             && <RolesManagementModule />}
                  {activeView === "Courses"           && <CourseManagement />}
                  {activeView === "Designation"        && <Designation />}
                  {activeView === "Account Settings"    && <AccountSettings user={user} />}
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
    if (r === "faculty")       return { bg: "#E8F5E9", color: "#2E7D32" };
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
    if (rl === "faculty")       return { bg: "#E8F5E9", color: "#2E7D32" };
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
          👥
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

          {/* User list */}
          <div style={{ maxHeight: "280px", overflowY: "auto" }}>
            {users.length === 0 ? (
              <div style={{ padding: "20px", textAlign: "center", fontSize: "12px", color: GRAY_C }}>No accounts found.</div>
            ) : users.map((u, i) => {
              const roleList = getRoles(u);
              const p = pic(u);
              const isOnline = active(u);
              return (
                <div key={u.id || i} style={{ padding: "10px 16px", display: "flex", alignItems: "center", gap: "10px", borderBottom: `1px solid ${BORDER_C}`, background: i % 2 === 0 ? WHITE_C : LIGHT_C }}>
                  {/* Avatar */}
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    <div style={{ width: "34px", height: "34px", borderRadius: "50%", background: av(roleList).bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 800, color: av(roleList).color, overflow: "hidden" }}>
                      {p ? <img src={p} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : init(u)}
                    </div>
                    <span style={{ position: "absolute", bottom: 0, right: 0, width: "9px", height: "9px", borderRadius: "50%", background: isOnline ? "#22C55E" : "#D1D5DB", border: "2px solid white" }} />
                  </div>
                  {/* Name + roles */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {name(u)}
                    </div>
                    <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginTop: "3px" }}>
                      {roleList.slice(0, 2).map((r, ri) => {
                        const bs = roleBadgeStyle(r);
                        return (
                          <span key={ri} style={{ fontSize: "10px", fontWeight: 700, padding: "1px 6px", borderRadius: "8px", background: bs.bg, color: bs.color, textTransform: "uppercase" }}>
                            {r}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  {/* Username */}
                  <div style={{ fontSize: "11px", color: GRAY_C, flexShrink: 0, maxWidth: "70px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    @{u.username || "—"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}