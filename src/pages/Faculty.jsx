import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { showToast, showConfirm } from "../components/Toast";

const GREEN      = "#3d6e01";
const DARK_GREEN = "#3d6e01";
const WHITE      = "#FFFFFF";
const GRAY       = "#6B7280";
const LIGHT_GRAY = "#F9FAFB";
const BORDER     = "#E5E7EB";
const RED        = "#DC2626";


// Faculty records are synced from the shared Users table (role = "faculty").
// Normalize whichever key casing/shape the API returns so the table always
// has consistent fields to render, regardless of whether the record came
// fresh off a user creation or from the dedicated faculty endpoint.
const normalizeFaculty = (u) => ({
  id:          u.id          ?? u.user_id    ?? u.userId,
  lastName:    u.lastName    ?? u.last_name  ?? u.lastname  ?? "",
  firstName:   u.firstName   ?? u.first_name ?? u.firstname ?? "",
  middleName:  u.middleName  ?? u.middle_name ?? u.middlename ?? "",
  email:       u.email       ?? "",
  username:    u.username    ?? u.user_name  ?? "",
  roles:       u.roles       ?? (u.role ? [u.role] : []),
  idNo:        u.idNo        ?? u.id_no      ?? u.id_number ?? u.idNumber ?? "",
  designation: u.designation ?? u.position   ?? u.department ?? "",
  status:      u.status      ?? "Active",
});

export default function Faculty() {
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [openMenuId, setOpenMenuId]   = useState(null);
  const [menuPosition, setMenuPosition] = useState(null);

  useEffect(() => {
    fetchInstructors();
  }, []);

  useEffect(() => {
    const closeMenu = () => { setOpenMenuId(null); setMenuPosition(null); };
    if (openMenuId !== null) {
      document.addEventListener("click", closeMenu);
      window.addEventListener("scroll", closeMenu, true);
      return () => {
        document.removeEventListener("click", closeMenu);
        window.removeEventListener("scroll", closeMenu, true);
      };
    }
  }, [openMenuId]);

  const fetchInstructors = async () => {
    setLoading(true);
    try {
      const [facultyRes, usersRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/api/erd/faculty`),
        fetch(`${import.meta.env.VITE_API_URL}/api/erd/users`)
      ]);

      const facultyData = facultyRes.ok ? await facultyRes.json() : [];
      const usersData = usersRes.ok ? await usersRes.json() : [];

      const facultyById = new Map(
        (Array.isArray(facultyData) ? facultyData : []).map(f => [String(f.id ?? f.user_id ?? f.userId), f])
      );

      // Base the hub on ALL users; merge in any faculty-specific fields
      // (designation, ID No., etc.) from the faculty endpoint when a matching
      // record exists. Every added user reflects here regardless of role.
      const normalized = (Array.isArray(usersData) ? usersData : []).map(u => {
        const fac = facultyById.get(String(u.id ?? u.user_id ?? u.userId));
        const base = { ...u };
        if (fac) {
          for (const key of Object.keys(fac)) {
            if (base[key] === undefined || base[key] === null || base[key] === "") {
              base[key] = fac[key];
            }
          }
        }
        return normalizeFaculty(base);
      });
      setInstructors(normalized);
    } catch (err) {
      console.error("Failed to fetch instructor cluster:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFaculty = (id) => {
    showConfirm({
      message: "Remove this instructor from the register? This cannot be undone.",
      confirmLabel: "Remove",
      icon: "🗑️",
      onConfirm: async () => {
        try {
          const res = await fetch(`${import.meta.env.VITE_API_URL}/api/erd/faculty/${id}`, { method: "DELETE" });
          if (res.ok) { showToast("Instructor removed.", "info"); fetchInstructors(); }
          else showToast("Failed to remove instructor.", "error");
        } catch { showToast("Network error.", "error"); }
      },
    });
  };

  const filteredInstructors = instructors.filter(i =>
    `${i.lastName} ${i.firstName} ${i.middleName} ${i.email} ${i.username} ${i.designation}`.toLowerCase().includes(search.toLowerCase())
  );

  const thStyle = {
    padding: "16px 20px",
    fontSize: "11px",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.4px",
    color: GRAY,
    whiteSpace: "nowrap"
  };

  const tdStyle = {
    padding: "14px 20px",
    fontSize: "13px",
    color: "#111827",
    borderTop: `1px solid ${BORDER}`,
    whiteSpace: "nowrap"
  };

  return (
    <div style={{ fontFamily: "system-ui, sans-serif" }}>

      {/* SEARCH BAR */}
      <div style={{ marginBottom: "16px" }}>
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: "100%", maxWidth: "320px", padding: "8px 12px", border: `1px solid ${BORDER}`, borderRadius: "6px", fontSize: "13px", boxSizing: "border-box", outline: "none" }}
        />
      </div>

      {/* FACULTY TABLE */}
      <div style={{ background: WHITE, borderRadius: "12px", border: `1px solid ${BORDER}`, boxShadow: "0 1px 3px rgba(0,0,0,0.02)", overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ background: LIGHT_GRAY }}>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>Username</th>
                <th style={thStyle}>ID No.</th>
                <th style={thStyle}>Designation</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ ...tdStyle, textAlign: "center", color: GRAY, padding: "32px" }}>Loading directory index...</td>
                </tr>
              ) : filteredInstructors.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ ...tdStyle, textAlign: "center", color: GRAY, padding: "32px" }}>No profiles active.</td>
                </tr>
              ) : (
                filteredInstructors.map(i => {
                  const isMenuOpen = openMenuId === i.id;
                  return (
                    <tr key={i.id}>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>
                        {[i.lastName, i.firstName].filter(Boolean).join(", ")}{i.middleName ? ` ${i.middleName.charAt(0)}.` : ""}
                        {!i.lastName && !i.firstName ? "—" : ""}
                      </td>
                      <td style={tdStyle}>{i.email || "—"}</td>
                      <td style={tdStyle}>{i.username || "—"}</td>
                      <td style={tdStyle}>{i.idNo || "—"}</td>
                      <td style={tdStyle}>{i.designation || "—"}</td>
                      <td style={{ ...tdStyle, textAlign: "right", position: "relative" }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isMenuOpen) {
                              setOpenMenuId(null);
                              setMenuPosition(null);
                            } else {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setMenuPosition({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
                              setOpenMenuId(i.id);
                            }
                          }}
                          style={{ background: "none", border: "none", cursor: "pointer", fontSize: "16px", padding: "4px 8px", borderRadius: "6px", color: GRAY, lineHeight: 1 }}
                          title="Actions"
                        >⋮</button>

                        {isMenuOpen && menuPosition && createPortal(
                          <div
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              position: "fixed", top: menuPosition.top, right: menuPosition.right, zIndex: 2147483647,
                              background: WHITE, border: `1px solid ${BORDER}`, borderRadius: "8px",
                              boxShadow: "0 8px 16px rgba(0,0,0,0.1)", minWidth: "180px", overflow: "hidden",
                              textAlign: "left"
                            }}
                          >
                            <button
                              onClick={() => { setOpenMenuId(null); setMenuPosition(null); handleDeleteFaculty(i.id); }}
                              style={{ width: "100%", padding: "10px 14px", background: "none", border: "none", cursor: "pointer", fontSize: "13px", color: RED, display: "flex", alignItems: "center", gap: "8px" }}
                            >🗑️ Delete</button>
                          </div>,
                          document.body
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}