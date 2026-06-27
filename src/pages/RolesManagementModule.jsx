import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const GREEN      = "#2E7D32";
const DARK_GREEN = "#1B5E20";
const WHITE      = "#FFFFFF";
const GRAY       = "#6B7280";
const LIGHT_GRAY = "#F9FAFB";
const BORDER     = "#E5E7EB";
const RED        = "#DC2626";
const GOLD       = "#F5A800";

// These 4 are blocked server-side. We still show the delete button so the user
// can try — the server will respond with a friendly error if they attempt to
// delete a protected role, which we surface in the confirmation modal.
const SERVER_PROTECTED = ["administrator", "faculty", "student", "registrar"];

// Mirrors Dashboard.jsx's MAIN_NAV featureKeys — this is the checklist of
// dashboard sections an admin can grant/revoke per role. Keep labels/icons in
// sync with Dashboard.jsx so what the admin sees here matches what shows up
// in the sidebar once granted.
const SVG = (d, vb="0 0 24 24") => (
  <svg width="15" height="15" viewBox={vb} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
);

const DASHBOARD_FEATURES = [
  { key: "feat_overview",       label: "Overview Workspace",  icon: SVG(<><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></>) },
  { key: "feat_student_list",   label: "Student List",        icon: SVG(<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>) },
  { key: "feat_faculty_mgmt",   label: "Faculty Hub",         icon: SVG(<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>) },
  { key: "feat_registrar_mgmt", label: "Registrar Console",   icon: SVG(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/></>) },
  { key: "feat_announcements",  label: "Create Announcement", icon: SVG(<><path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3z"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></>) },
  { key: "feat_class_sched",    label: "Class Schedule",      icon: SVG(<><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>) },
];

export default function RolesManagementModule() {
  const [roles, setRoles]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newRole, setNewRole]     = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null); // role object to delete
  const [permRole, setPermRole]           = useState(null); // role object currently editing permissions for
  const [checkedFeatures, setCheckedFeatures] = useState([]); // feature_keys checked in the permissions modal
  const [permLoading, setPermLoading]     = useState(false);
  const [permSaving, setPermSaving]       = useState(false);
  const [permError, setPermError]         = useState("");
  const [permSaved, setPermSaved]         = useState(false);

  useEffect(() => { fetchRoles(); }, []);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/erd/roles`);
      if (res.ok) {
        const data = await res.json();
        setRoles(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to load roles:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRole = async (e) => {
    e.preventDefault();
    const trimmed = newRole.trim().toLowerCase().replace(/\s+/g, "_");
    if (!trimmed) { setError("Role name cannot be empty."); return; }
    if (trimmed.length < 2) { setError("Role name must be at least 2 characters."); return; }
    if (!/^[a-z0-9_]+$/.test(trimmed)) { setError("Only lowercase letters, numbers, and underscores allowed."); return; }

    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/erd/roles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_type: trimmed }),
      });
      if (res.ok) {
        setShowModal(false);
        setNewRole("");
        fetchRoles();
      } else {
        const data = await res.json();
        setError(data.message || "Failed to create role.");
      }
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setSubmitting(false);
    }
  };

  const [deleteError, setDeleteError] = useState("");

  const handleDelete = async (role) => {
    setDeleteError("");
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/erd/roles/${role.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setDeleteConfirm(null);
        setDeleteError("");
        fetchRoles();
      } else {
        const data = await res.json();
        setDeleteError(data.message || "Failed to delete role.");
      }
    } catch {
      setDeleteError("Couldn't reach the server.");
    }
  };

  const openPermissions = async (role) => {
    setPermRole(role);
    setPermError("");
    setPermSaved(false);
    setPermLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/erd/roles/${role.id}/permissions`);
      if (res.ok) {
        const data = await res.json();
        setCheckedFeatures(Array.isArray(data.feature_keys) ? data.feature_keys : []);
      } else {
        setCheckedFeatures([]);
      }
    } catch {
      setPermError("Couldn't reach the server.");
      setCheckedFeatures([]);
    } finally {
      setPermLoading(false);
    }
  };

  const toggleFeature = (key) => {
    setCheckedFeatures((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const savePermissions = async () => {
    if (!permRole) return;
    setPermSaving(true);
    setPermError("");
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/erd/roles/${permRole.id}/permissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feature_keys: checkedFeatures }),
      });
      if (res.ok) {
        setPermSaved(true);
        setTimeout(() => setPermSaved(false), 2000);
      } else {
        const data = await res.json();
        setPermError(data.message || "Failed to save permissions.");
      }
    } catch {
      setPermError("Couldn't reach the server.");
    } finally {
      setPermSaving(false);
    }
  };


  const roleColor = (name) => {
    switch (name) {
      case "administrator": return { bg: "#FFF8E1", color: GOLD };
      case "faculty":       return { bg: "#E8F5E9", color: GREEN };
      case "student":       return { bg: "#E3F2FD", color: "#1E88E5" };
      case "registrar":     return { bg: "#F3E5F5", color: "#8E24AA" };
      default:              return { bg: "#F3F4F6", color: "#374151" };
    }
  };

  return (
    <div style={{ fontFamily: "system-ui, sans-serif" }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", gap: "16px" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "#111827" }}>Role Management</h2>
          <p style={{ margin: "4px 0 0", fontSize: "13px", color: GRAY }}>
            Add or remove roles. Roles marked <strong>System</strong> are protected and cannot be deleted.
          </p>
        </div>
        <button
          onClick={() => { setNewRole(""); setError(""); setShowModal(true); }}
          style={{ padding: "10px 20px", background: DARK_GREEN, color: WHITE, border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", whiteSpace: "nowrap" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Role
        </button>
      </div>

      {/* ── Info banner ── */}
      <div style={{ padding: "12px 16px", background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: "8px", fontSize: "13px", color: "#166534", marginBottom: "24px", display: "flex", gap: "10px", alignItems: "flex-start" }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <span>
          Roles created here are automatically available in the <strong>Edit User</strong> modal under <strong>Admin Settings → Users</strong>.
          Deleting a role removes it from all user assignment options instantly.
        </span>
      </div>

      {/* ── Roles grid ── */}
      {loading ? (
        <BellLoader />
      ) : roles.length === 0 ? (
        <div style={{ padding: "48px", textAlign: "center", color: GRAY, fontSize: "14px", background: WHITE, borderRadius: "12px", border: `1px solid ${BORDER}` }}>
          No roles found. Add one to get started.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "16px" }}>
          {roles.map((role) => {
            const { bg, color } = roleColor(role.user_type);
            const isProtected = SERVER_PROTECTED.includes(role.user_type);
            return (
              <div
                key={role.id}
                style={{
                  background: WHITE, border: `1px solid ${BORDER}`, borderRadius: "12px",
                  padding: "20px", display: "flex", alignItems: "center", justifyContent: "space-between",
                  gap: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "14px", minWidth: 0 }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{
                      fontSize: "13px", fontWeight: 800, color, background: bg,
                      padding: "3px 10px", borderRadius: "12px", textTransform: "uppercase",
                      letterSpacing: "0.4px", display: "inline-block", maxWidth: "100%",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
                    }}>
                      {role.user_type}
                    </div>
                    <div style={{ fontSize: "11px", color: GRAY, marginTop: "4px" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        {isProtected
                          ? <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg> System role</>
                          : <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg> Custom role</>
                        }
                      </span>
                    </div>
                  </div>
                </div>

                {/* Manage which dashboard sections this role can view */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                  <button
                    onClick={() => openPermissions(role)}
                    title="Manage dashboard view permissions"
                    style={{
                      width: 32, height: 32, borderRadius: "6px",
                      border: `1px solid ${BORDER}`, background: "#EEF2FF",
                      color: "#4338CA", cursor: "pointer", fontSize: "14px",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all 0.15s"
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </button>

                  <button
                    onClick={() => { setDeleteError(""); setDeleteConfirm(role); }}
                    title="Delete role"
                    style={{
                      width: 32, height: 32, borderRadius: "6px",
                      border: `1px solid ${BORDER}`,
                      background: "#FFEBEE", color: RED,
                      cursor: "pointer", fontSize: "14px",
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      transition: "all 0.15s"
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add Role Modal ── */}
      {showModal && createPortal(
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2147483647, padding: "16px" }}>
          <form onSubmit={handleAddRole} style={{ background: WHITE, borderRadius: "12px", width: "100%", maxWidth: "440px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.15)", overflow: "hidden" }}>
            <div style={{ padding: "24px 28px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h3 style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "#111827" }}>ADD ROLE</h3>
              <button type="button" onClick={() => setShowModal(false)} style={{ border: "none", background: "transparent", fontSize: "20px", color: "#111827", cursor: "pointer", padding: "4px" }}>✕</button>
            </div>

            <div style={{ padding: "20px 28px 28px", display: "flex", flexDirection: "column", gap: "18px" }}>
              {error && (
                <div style={{ padding: "10px 14px", background: "#FEF2F2", border: "1px solid #FEE2E2", borderRadius: "6px", color: RED, fontSize: "12px", fontWeight: 600 }}>
                  {error}
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "14px", fontWeight: 700, color: "#111827" }}>Role Name</label>
                <input
                  type="text"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  placeholder="e.g. dean, coordinator"
                  style={{ padding: "10px 12px", border: `1px solid ${BORDER}`, borderRadius: "6px", fontSize: "14px", background: LIGHT_GRAY, outline: "none" }}
                  autoFocus
                />
                <div style={{ fontSize: "11px", color: GRAY }}>
                  Lowercase letters, numbers, underscores only. Spaces will be converted to underscores.
                </div>
              </div>

              <button type="submit" disabled={submitting}
                style={{ width: "100%", padding: "14px", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 700, color: WHITE, background: DARK_GREEN, cursor: submitting ? "not-allowed" : "pointer", textTransform: "uppercase" }}>
                {submitting ? "Creating..." : "Create Role"}
              </button>
              <button type="button" onClick={() => setShowModal(false)}
                style={{ width: "100%", padding: "10px", border: "none", background: "transparent", color: GRAY, fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteConfirm && createPortal(
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2147483647, padding: "16px" }}>
          <div style={{ background: WHITE, borderRadius: "12px", width: "100%", maxWidth: "400px", padding: "28px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.15)" }}>
            <div style={{ textAlign: "center", marginBottom: "12px", color: RED }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
            </div>
            <h3 style={{ margin: "0 0 8px", textAlign: "center", fontSize: "18px", fontWeight: 800, color: "#111827" }}>Delete Role?</h3>
            <p style={{ margin: "0 0 16px", textAlign: "center", fontSize: "13px", color: GRAY }}>
              You're about to delete the <strong style={{ color: RED, textTransform: "uppercase" }}>{deleteConfirm.user_type}</strong> role.
              It will immediately disappear from the <strong>Edit User</strong> role options and the sidebar for any user assigned this role.
              This cannot be undone.
            </p>
            {deleteError && (
              <div style={{ padding: "10px 14px", background: "#FEF2F2", border: "1px solid #FEE2E2", borderRadius: "6px", color: RED, fontSize: "12px", fontWeight: 600, marginBottom: "16px", textAlign: "center" }}>
                {deleteError}
              </div>
            )}
            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={() => { setDeleteConfirm(null); setDeleteError(""); }}
                style={{ flex: 1, padding: "12px", border: `1px solid ${BORDER}`, borderRadius: "8px", background: WHITE, color: "#374151", fontSize: "14px", fontWeight: 700, cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                style={{ flex: 1, padding: "12px", border: "none", borderRadius: "8px", background: RED, color: WHITE, fontSize: "14px", fontWeight: 700, cursor: "pointer" }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Permissions Modal: checklist of dashboard sections this role can view ── */}
      {permRole && createPortal(
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2147483647, padding: "16px" }}>
          <div style={{ background: WHITE, borderRadius: "12px", width: "100%", maxWidth: "460px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.15)", overflow: "hidden" }}>
            <div style={{ padding: "24px 28px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#111827" }}>Dashboard Permissions</h3>
                <p style={{ margin: "4px 0 0", fontSize: "12px", color: GRAY }}>
                  For role <strong style={{ textTransform: "uppercase", color: DARK_GREEN }}>{permRole.user_type}</strong>
                </p>
              </div>
              <button type="button" onClick={() => setPermRole(null)} style={{ border: "none", background: "transparent", fontSize: "20px", color: "#111827", cursor: "pointer", padding: "4px" }}>✕</button>
            </div>

            <div style={{ padding: "20px 28px 28px", display: "flex", flexDirection: "column", gap: "14px" }}>
              <p style={{ margin: 0, fontSize: "12px", color: GRAY, lineHeight: 1.5 }}>
                Check a section to let this role see it on their dashboard sidebar. For example, checking
                <strong> Student List</strong> instantly gives anyone with this role access to the Student List page.
              </p>

              {permError && (
                <div style={{ padding: "10px 14px", background: "#FEF2F2", border: "1px solid #FEE2E2", borderRadius: "6px", color: RED, fontSize: "12px", fontWeight: 600 }}>
                  {permError}
                </div>
              )}

              {permLoading ? (
                <div style={{ padding: "24px", textAlign: "center", color: GRAY, fontSize: "13px" }}>Loading permissions…</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {DASHBOARD_FEATURES.map((feat) => {
                    const checked = checkedFeatures.includes(feat.key);
                    return (
                      <label
                        key={feat.key}
                        style={{
                          display: "flex", alignItems: "center", gap: "12px",
                          padding: "10px 12px", borderRadius: "8px",
                          border: `1px solid ${checked ? GREEN : BORDER}`,
                          background: checked ? "#F0FDF4" : LIGHT_GRAY,
                          cursor: "pointer", transition: "all 0.15s"
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleFeature(feat.key)}
                          style={{ width: 16, height: 16, accentColor: GREEN, cursor: "pointer" }}
                        />
                        <span style={{ fontSize: "15px" }}>{feat.icon}</span>
                        <span style={{ fontSize: "13px", fontWeight: 700, color: "#111827", flex: 1 }}>{feat.label}</span>
                      </label>
                    );
                  })}
                </div>
              )}

              {permSaved && (
                <div style={{ padding: "10px 14px", background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: "6px", color: "#166534", fontSize: "12px", fontWeight: 600, textAlign: "center" }}>
                  Permissions saved
                </div>
              )}

              <div style={{ display: "flex", gap: "12px", marginTop: "4px" }}>
                <button
                  onClick={() => setPermRole(null)}
                  style={{ flex: 1, padding: "12px", border: `1px solid ${BORDER}`, borderRadius: "8px", background: WHITE, color: "#374151", fontSize: "14px", fontWeight: 700, cursor: "pointer" }}
                >
                  Close
                </button>
                <button
                  onClick={savePermissions}
                  disabled={permSaving || permLoading}
                  style={{
                    flex: 1, padding: "12px", border: "none", borderRadius: "8px",
                    background: DARK_GREEN, color: WHITE, fontSize: "14px", fontWeight: 700,
                    cursor: (permSaving || permLoading) ? "not-allowed" : "pointer"
                  }}
                >
                  {permSaving ? "Saving..." : "Save Permissions"}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

function BellLoader() {
  const GOLD = "#F5A800";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "14px", padding: "56px 0" }}>
      <style>{`
        @keyframes bell-swing {
          0%, 100% { transform: rotate(0deg); }
          15% { transform: rotate(14deg); }
          30% { transform: rotate(-11deg); }
          45% { transform: rotate(8deg); }
          60% { transform: rotate(-5deg); }
          75% { transform: rotate(2deg); }
          90% { transform: rotate(-1deg); }
        }
        @keyframes bell-glow {
          0%, 100% { opacity: 0.18; transform: scale(0.9); }
          50% { opacity: 0.4; transform: scale(1.05); }
        }
      `}</style>
      <div style={{ position: "relative", width: 56, height: 56, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "absolute", width: 56, height: 56, borderRadius: "50%", background: GOLD, animation: "bell-glow 1.6s ease-in-out infinite" }} />
        <svg width="34" height="34" viewBox="0 0 24 24" fill={GOLD} style={{ position: "relative", transformOrigin: "50% 8%", animation: "bell-swing 1.4s ease-in-out infinite" }}>
          <path d="M12 2.5a1 1 0 0 1 1 1v.6a6.5 6.5 0 0 1 5.5 6.4v3.1c0 1 .4 1.9 1.1 2.6l.4.4c.5.5.1 1.4-.6 1.4H4.6c-.7 0-1.1-.9-.6-1.4l.4-.4c.7-.7 1.1-1.6 1.1-2.6v-3.1A6.5 6.5 0 0 1 11 4.1v-.6a1 1 0 0 1 1-1z" />
          <path d="M9.5 19.5a2.5 2.5 0 0 0 5 0h-5z" />
        </svg>
      </div>
      <div style={{ fontSize: "13px", fontWeight: 600, color: "#6B7280" }}>Loading roles…</div>
    </div>
  );
}