import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { showToast, showConfirm } from "../components/Toast";

const GOLD       = "#F5A800";
const GREEN      = "#2E7D32";
const DARK_GREEN = "#1B5E20";
const WHITE      = "#FFFFFF";
const GRAY       = "#6B7280";
const LIGHT_GRAY = "#F9FAFB";
const BORDER     = "#E5E7EB";
const RED        = "#DC2626";
const BLUE       = "#1E88E5";

const GENDERS    = ["Male", "Female"];
const SUFFIXES   = ["", "Jr.", "Sr.", "II", "III", "IV"];
const PAGE_SIZES = [10, 25, 50, 100];

const EMPTY_FORM = {
  lastName: "", firstName: "", middleName: "", suffix: "",
  gender: "Male", email: "", username: "", password: "",
  roles: ["faculty"], idNo: "", designation: "", status: "Active",
  profilePicture: "", signature: ""
};

function roleBadge(r) {
  const rl = r.toLowerCase();
  if (rl === "administrator") return { bg: "#FFF8E1", color: GOLD,      border: "#FFE082" };
  if (rl === "faculty")       return { bg: "#E8F5E9", color: GREEN,     border: "#A5D6A7" };
  if (rl === "registrar")     return { bg: "#F3E5F5", color: "#8E24AA", border: "#CE93D8" };
  return                             { bg: "#F3F4F6", color: "#374151", border: BORDER    };
}

function avatarColor(roles) {
  const rl = (Array.isArray(roles) ? (roles[0] || "") : (roles || "")).toLowerCase();
  if (rl === "administrator") return { bg: "#FFF3CD", color: "#B8860B" };
  if (rl === "registrar")     return { bg: "#F3E5F5", color: "#8E24AA" };
  return                             { bg: "#E8F5E9", color: DARK_GREEN };
}

function fullName(u) {
  const parts = [u.firstName, u.middleName ? u.middleName.charAt(0) + "." : "", u.lastName, u.suffix].filter(Boolean);
  return parts.join(" ").toUpperCase();
}

export default function UserManagementModule() {
  const [users,          setUsers]          = useState([]);
  const [availableRoles, setAvailableRoles] = useState(["faculty", "registrar", "administrator"]);
  const [availableDesignations, setAvailableDesignations] = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [submitting,     setSubmitting]     = useState(false);
  const [search,         setSearch]         = useState("");
  const [page,           setPage]           = useState(1);
  const [pageSize,       setPageSize]       = useState(10);
  const [showModal,      setShowModal]      = useState(false);
  const [editingId,      setEditingId]      = useState(null);
  const [form,           setForm]           = useState(EMPTY_FORM);
  const [error,          setError]          = useState("");
  const [openMenuId,     setOpenMenuId]     = useState(null);

  useEffect(() => {
    fetchUserDirectory();
    fetchAvailableRoles();
    fetchAvailableDesignations();
  }, []);

  // Note: click-outside to close the dropdown is handled inside DropdownMenu itself.
  // Do NOT add a top-level mousedown handler here — portal buttons live in document.body
  // and would appear "outside" any ref in the table, causing the dropdown to close
  // before onClick fires on Edit/Delete.

  const fetchAvailableRoles = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/erd/roles`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setAvailableRoles(data.map(r => r.user_type).filter(r => r.toLowerCase() !== "student"));
        }
      }
    } catch (err) { console.error("Failed to load roles:", err); }
  };

  const fetchAvailableDesignations = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/erd/designations`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setAvailableDesignations(data);
      }
    } catch (err) { console.error("Failed to load designations:", err); }
  };

  const normalizeUser = (u) => ({
    id:             u.id          ?? u.user_id    ?? u.userId,
    lastName:       u.lastName    ?? u.last_name  ?? u.lastname  ?? u.surname    ?? "",
    firstName:      u.firstName   ?? u.first_name ?? u.firstname ?? u.given_name ?? "",
    middleName:     u.middleName  ?? u.middle_name ?? u.middlename ?? "",
    suffix:         u.suffix      ?? "",
    gender:         u.gender      ?? "",
    email:          u.email       ?? "",
    username:       u.username    ?? u.user_name  ?? "",
    roles:          u.roles       ?? (u.role ? [u.role] : []),
    idNo:           u.idNo        ?? u.id_no      ?? u.id_number ?? u.idNumber ?? "",
    designation:    u.designation ?? u.position   ?? "",
    status:         u.status      ?? "Active",
    profilePicture: u.profile_picture ?? u.profilePicture ?? "",
    signature:      u.signature ?? "",
  });

  const fetchUserDirectory = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/erd/users`);
      if (res.ok) {
        const data = await res.json();
        setUsers(Array.isArray(data) ? data.map(normalizeUser) : []);
      }
    } catch (err) { console.error("Failed to load users:", err); }
    finally { setLoading(false); }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const toggleRole = (role) => {
    setForm(prev => {
      const has = prev.roles.includes(role);
      return { ...prev, roles: has ? prev.roles.filter(r => r !== role) : [...prev.roles, role] };
    });
  };

  const openCreateModal = () => {
    setEditingId(null); setForm(EMPTY_FORM); setError(""); setShowModal(true);
  };

  const openEditModal = (user) => {
    setEditingId(user.id);
    const n = normalizeUser(user);
    setForm({
      lastName: n.lastName, firstName: n.firstName, middleName: n.middleName,
      suffix: n.suffix, gender: n.gender || "Male", email: n.email,
      username: n.username, password: "",
      roles: n.roles.length > 0 ? n.roles : ["faculty"],
      idNo: n.idNo, designation: n.designation, status: n.status,
      profilePicture: n.profilePicture || "",
      signature: n.signature || ""
    });
    setError(""); setShowModal(true); setOpenMenuId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.roles || form.roles.length === 0) { setError("Select at least one role."); return; }
    setSubmitting(true); setError("");

    const url    = editingId
      ? `${import.meta.env.VITE_API_URL}/api/erd/users/${editingId}`
      : `${import.meta.env.VITE_API_URL}/api/erd/users`;
    const method = editingId ? "PUT" : "POST";

    const payload = {
      username: form.username, roles: form.roles, status: form.status,
      first_name: form.firstName, middle_name: form.middleName, last_name: form.lastName,
      suffix: form.suffix, gender: form.gender, email: form.email,
      id_no: form.idNo, designation: form.designation,
      profile_picture: form.profilePicture || undefined,
      signature: form.signature || undefined
    };
    if (form.password || !editingId) payload.password = form.password;

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast(editingId ? "User updated successfully!" : "User added successfully!", "success");
        setShowModal(false); setForm(EMPTY_FORM); fetchUserDirectory();
      }
      else { const d = await res.json(); setError(d.message || "Failed to save user."); }
    } catch (err) { console.error(err); setError("Could not reach the server."); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => {
    setOpenMenuId(null);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/erd/users/${id}`, { method: "DELETE" });
      if (res.ok) { showToast("User deleted.", "info"); fetchUserDirectory(); }
      else { const d = await res.json(); showToast(d.message || "Failed to delete user.", "error"); }
    } catch { showToast("Could not reach the server.", "error"); }
  };

  const requestDelete = (u) => {
    const name = [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username || "this user";
    setOpenMenuId(null);
    showConfirm({
      message: `Delete ${name}? This cannot be undone.`,
      confirmLabel: "Delete",
      icon: "🗑️",
      onConfirm: () => handleDelete(u.id),
    });
  };

  const filteredUsers = users.filter(u => {
    const roleArr = Array.isArray(u.roles)
      ? u.roles.map(r => r.toLowerCase())
      : [(u.role || "").toLowerCase()];
    // Exclude pure-student accounts AND users with no role at all
    // (legacy enrollments that pre-date the erd_user_roles table)
    if (roleArr.every(r => r === "student") || roleArr.every(r => r === "")) return false;
    const rolesStr = roleArr.join(" ");
    const matchStr = [u.lastName, u.firstName, u.middleName, u.suffix, u.gender,
                      u.email, u.username, rolesStr, u.idNo, u.designation, u.status]
      .join(" ").toLowerCase();
    return matchStr.includes(search.toLowerCase());
  });

  const totalPages  = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedUsers  = filteredUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const goToPage    = (p) => setPage(Math.min(Math.max(1, p), totalPages));

  return (
    <div style={{ fontFamily: "system-ui, sans-serif" }}>

      {/* Top bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", gap: "16px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{ padding: "10px 16px", border: `1px solid ${BORDER}`, borderRadius: "8px", fontSize: "14px", outline: "none", width: "280px", boxSizing: "border-box" }}
          />
          <span style={{ fontSize: "13px", color: GRAY, whiteSpace: "nowrap" }}>
            {filteredUsers.length} user{filteredUsers.length !== 1 ? "s" : ""}
          </span>
        </div>
        <button type="button" onClick={openCreateModal}
          style={{ padding: "10px 20px", background: DARK_GREEN, color: WHITE, border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
          + Add User
        </button>
      </div>

      {/* Table */}
      <div style={{ background: WHITE, borderRadius: "12px", border: `1px solid ${BORDER}`, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ background: LIGHT_GRAY, borderBottom: `1px solid ${BORDER}` }}>
              <Th>Identity Profile</Th>
              <Th>Username</Th>
              <Th>Role</Th>
              <Th>ID No.</Th>
              <Th>Designation</Th>
              <Th align="center">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6"><BellLoader /></td></tr>
            ) : pagedUsers.length === 0 ? (
              <tr><td colSpan="6" style={{ padding: "40px", textAlign: "center", color: GRAY, fontSize: "14px" }}>No users matched your search.</td></tr>
            ) : (
              pagedUsers.map((u) => {
                const av   = avatarColor(u.roles);
                const init = (u.firstName?.charAt(0) || u.lastName?.charAt(0) || "?").toUpperCase();
                const name = fullName(u);
                return (
                  <tr key={u.id} style={{ borderBottom: `1px solid ${BORDER}` }}>

                    {/* Identity Profile */}
                    <td style={{ padding: "14px 18px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        {u.profilePicture ? (
                          <img src={u.profilePicture} alt={name}
                            style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", border: `2px solid ${BORDER}`, flexShrink: 0 }} />
                        ) : (
                          <div style={{
                            width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                            background: av.bg, color: av.color,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: "16px", fontWeight: 800
                          }}>
                            {init}
                          </div>
                        )}
                        <div>
                          <div style={{ fontSize: "13px", fontWeight: 700, color: "#111827" }}>{name}</div>
                          {u.email && <div style={{ fontSize: "11px", color: GRAY, marginTop: "2px" }}>{u.email}</div>}
                        </div>
                      </div>
                    </td>

                    {/* Username */}
                    <td style={{ padding: "14px 18px", fontSize: "13px", color: BLUE, fontWeight: 600 }}>
                      {u.username || "-"}
                    </td>

                    {/* Role badges */}
                    <td style={{ padding: "14px 18px" }}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                        {(Array.isArray(u.roles) ? u.roles : []).map((r, idx) => {
                          const s = roleBadge(r);
                          return (
                            <span key={idx} style={{
                              padding: "3px 10px", background: s.bg, color: s.color,
                              border: `1px solid ${s.border}`, borderRadius: "20px",
                              fontWeight: 700, fontSize: "11px", textTransform: "uppercase", whiteSpace: "nowrap"
                            }}>{r}</span>
                          );
                        })}
                        {(!u.roles || u.roles.length === 0) && <span style={{ fontSize: "12px", color: GRAY }}>-</span>}
                      </div>
                    </td>

                    {/* ID No. */}
                    <td style={{ padding: "14px 18px", fontSize: "13px", color: "#111827" }}>
                      {u.idNo || "-"}
                    </td>

                    {/* Designation */}
                    <td style={{ padding: "14px 18px", fontSize: "13px", color: "#111827" }}>
                      {u.designation || "-"}
                    </td>

                    {/* 3-dot Actions */}
                    <td style={{ padding: "14px 18px", textAlign: "center", position: "relative" }}>
                      <div style={{ display: "inline-block", position: "relative" }}>
                        <button
                          type="button"
                          onClick={() => setOpenMenuId(openMenuId === u.id ? null : u.id)}
                          style={{
                            width: 32, height: 32, border: `1px solid ${BORDER}`, borderRadius: "6px",
                            background: openMenuId === u.id ? LIGHT_GRAY : WHITE,
                            cursor: "pointer", fontSize: "18px", color: GRAY,
                            display: "flex", alignItems: "center", justifyContent: "center"
                          }}>
                          ...
                        </button>

                        {openMenuId === u.id && createPortal(
                          <DropdownMenu
                            onClose={() => setOpenMenuId(null)}
                            onEdit={() => openEditModal(u)}
                            onDelete={() => requestDelete(u)}
                            uid={u.id}
                          />,
                          document.body
                        )}
                      </div>
                      <span data-uid={u.id} style={{ position: "absolute", right: 18, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "16px 18px", borderTop: `1px solid ${BORDER}` }}>
          <PageNavBtn onClick={() => goToPage(1)}               disabled={currentPage === 1}>{"<<"}</PageNavBtn>
          <PageNavBtn onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}>{"<"}</PageNavBtn>

          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
            .reduce((acc, p, idx, arr) => {
              if (idx > 0 && p - arr[idx - 1] > 1) acc.push("ellipsis-" + p);
              acc.push(p);
              return acc;
            }, [])
            .map(p =>
              typeof p === "string"
                ? <span key={p} style={{ color: GRAY, fontSize: "13px", padding: "0 4px" }}>...</span>
                : (
                  <button key={p} type="button" onClick={() => goToPage(p)}
                    style={{
                      width: 32, height: 32, borderRadius: "50%", border: "none",
                      background: p === currentPage ? "#E8EAF6" : "transparent",
                      color: p === currentPage ? "#3F51B5" : GRAY,
                      fontWeight: p === currentPage ? 700 : 500,
                      fontSize: "13px", cursor: "pointer"
                    }}>{p}</button>
                )
            )}

          <PageNavBtn onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}>{">"}</PageNavBtn>
          <PageNavBtn onClick={() => goToPage(totalPages)}       disabled={currentPage === totalPages}>{">>"}</PageNavBtn>

          <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
            style={{ marginLeft: "12px", padding: "6px 10px", border: `1px solid ${BORDER}`, borderRadius: "6px", fontSize: "13px", background: WHITE, color: GRAY, cursor: "pointer" }}>
            {PAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showModal && createPortal(
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2147483647, padding: "16px" }}>
          <form onSubmit={handleSubmit} style={{ background: WHITE, borderRadius: "12px", width: "100%", maxWidth: "640px", maxHeight: "90vh", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.15)", overflow: "hidden", display: "flex", flexDirection: "column" }}>

            <div style={{ padding: "24px 28px 0 28px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <h3 style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "#111827" }}>
                {editingId ? "EDIT USER" : "ADD USER"}
              </h3>
              <button type="button" onClick={() => setShowModal(false)}
                style={{ border: "none", background: "transparent", fontSize: "20px", color: "#111827", cursor: "pointer", lineHeight: 1, padding: "4px" }}>
                X
              </button>
            </div>

            <div style={{ padding: "20px 28px 28px 28px", display: "flex", flexDirection: "column", gap: "20px", overflowY: "auto" }}>
              {error && (
                <div style={{ padding: "10px 14px", background: "#FEF2F2", border: `1px solid #FEE2E2`, borderRadius: "6px", color: RED, fontSize: "12px", fontWeight: 600 }}>
                  {error}
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                <Field label="Lastname">
                  <input type="text" name="lastName" value={form.lastName} onChange={handleInputChange} required style={plainInputStyle} />
                </Field>
                <Field label="Firstname">
                  <input type="text" name="firstName" value={form.firstName} onChange={handleInputChange} required style={plainInputStyle} />
                </Field>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px" }}>
                <Field label="Middlename" optional>
                  <input type="text" name="middleName" value={form.middleName} onChange={handleInputChange} style={plainInputStyle} />
                </Field>
                <Field label="Suffix" optional>
                  <select name="suffix" value={form.suffix} onChange={handleInputChange} style={plainInputStyle}>
                    {SUFFIXES.map(s => <option key={s} value={s}>{s || "None"}</option>)}
                  </select>
                </Field>
                <Field label="Gender">
                  <select name="gender" value={form.gender} onChange={handleInputChange} style={plainInputStyle}>
                    {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </Field>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                <Field label="Email">
                  <input type="email" name="email" value={form.email} onChange={handleInputChange} required style={plainInputStyle} />
                </Field>
                <Field label="Username">
                  <input type="text" name="username" value={form.username} onChange={handleInputChange} required style={plainInputStyle} />
                </Field>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                <Field label={editingId ? "Password (leave blank to keep)" : "Password"}>
                  <input type="password" name="password" value={form.password} onChange={handleInputChange}
                    required={!editingId} placeholder={editingId ? "leave blank to keep" : "Enter a password"} style={plainInputStyle} />
                </Field>
                <Field label="Status">
                  <select name="status" value={form.status} onChange={handleInputChange} style={plainInputStyle}>
                    <option value="Active">Active</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </Field>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                <Field label="ID No.">
                  <input type="text" name="idNo" value={form.idNo} onChange={handleInputChange} style={plainInputStyle} />
                </Field>
                <Field label="Designation" optional>
                  <select name="designation" value={form.designation} onChange={handleInputChange} style={plainInputStyle}>
                    <option value="">None</option>
                    {availableDesignations.map(d => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
                    {/* Preserve a legacy/free-text value that no longer matches a managed designation,
                        so editing this user doesn't silently wipe it out. */}
                    {form.designation && !availableDesignations.some(d => d.name === form.designation) && (
                      <option value={form.designation}>{form.designation}</option>
                    )}
                  </select>
                </Field>
              </div>

              {/* Profile Picture */}
              <div>
                <div style={{ fontSize: "15px", fontWeight: 700, color: "#111827", marginBottom: "4px" }}>Profile Picture</div>
                <div style={{ fontSize: "12px", color: GRAY, marginBottom: "12px" }}>Click the avatar to upload a photo (max 2 MB).</div>
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <div
                    onClick={() => document.getElementById("ppic-" + (editingId || "new")).click()}
                    style={{
                      width: 72, height: 72, borderRadius: "50%", cursor: "pointer",
                      overflow: "hidden", border: `2px dashed ${BORDER}`,
                      background: LIGHT_GRAY, flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center"
                    }}
                  >
                    {form.profilePicture ? (
                      <img src={form.profilePicture} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="Preview" />
                    ) : (
                      <div style={{ textAlign: "center", color: GRAY }}>
                        <div style={{ fontSize: "20px" }}>+</div>
                        <div style={{ fontSize: "9px", marginTop: "2px" }}>Photo</div>
                      </div>
                    )}
                  </div>
                  <input
                    id={"ppic-" + (editingId || "new")}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      if (file.size > 2 * 1024 * 1024) { showToast("Image must be under 2 MB.", "warning"); return; }
                      const reader = new FileReader();
                      reader.onload = (ev) => setForm(prev => ({ ...prev, profilePicture: ev.target.result }));
                      reader.readAsDataURL(file);
                    }}
                  />
                  {form.profilePicture && (
                    <button type="button"
                      onClick={() => setForm(prev => ({ ...prev, profilePicture: "" }))}
                      style={{ fontSize: "12px", color: RED, background: "#FEF2F2", border: "1px solid #FEE2E2", borderRadius: "6px", padding: "6px 12px", cursor: "pointer", fontWeight: 600 }}>
                      Remove
                    </button>
                  )}
                </div>
              </div>

              {/* Signature */}
              <div>
                <div style={{ fontSize: "15px", fontWeight: 700, color: "#111827", marginBottom: "4px" }}>Signature</div>
                <div style={{ fontSize: "12px", color: GRAY, marginBottom: "12px" }}>
                  Upload an e-signature (max 2 MB). Used for "Signature over Printed Name" on printed documents like the Transcript of Record.
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <div
                    onClick={() => document.getElementById("sig-" + (editingId || "new")).click()}
                    style={{
                      width: 160, height: 70, borderRadius: "8px", cursor: "pointer",
                      overflow: "hidden", border: `2px dashed ${BORDER}`,
                      background: LIGHT_GRAY, flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center"
                    }}
                  >
                    {form.signature ? (
                      <img src={form.signature} style={{ width: "100%", height: "100%", objectFit: "contain" }} alt="Signature preview" />
                    ) : (
                      <div style={{ textAlign: "center", color: GRAY }}>
                        <div style={{ fontSize: "20px" }}>+</div>
                        <div style={{ fontSize: "9px", marginTop: "2px" }}>Signature</div>
                      </div>
                    )}
                  </div>
                  <input
                    id={"sig-" + (editingId || "new")}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      if (file.size > 2 * 1024 * 1024) { showToast("Image must be under 2 MB.", "warning"); return; }
                      const reader = new FileReader();
                      reader.onload = (ev) => setForm(prev => ({ ...prev, signature: ev.target.result }));
                      reader.readAsDataURL(file);
                    }}
                  />
                  {form.signature && (
                    <button type="button"
                      onClick={() => setForm(prev => ({ ...prev, signature: "" }))}
                      style={{ fontSize: "12px", color: RED, background: "#FEF2F2", border: "1px solid #FEE2E2", borderRadius: "6px", padding: "6px 12px", cursor: "pointer", fontWeight: 600 }}>
                      Remove
                    </button>
                  )}
                </div>
              </div>

              {/* Role */}
              <div>
                <div style={{ fontSize: "15px", fontWeight: 700, color: "#111827", marginBottom: "4px" }}>Role</div>
                <div style={{ fontSize: "12px", color: GRAY, marginBottom: "14px" }}>Select one or more roles for this account.</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "28px" }}>
                  {availableRoles.map((r) => (
                    <RoleToggle key={r} label={r} checked={form.roles.includes(r)} onChange={() => toggleRole(r)} />
                  ))}
                </div>
              </div>
            </div>

            <div style={{ padding: "0 28px 28px 28px", flexShrink: 0 }}>
              <button type="submit" disabled={submitting}
                style={{ width: "100%", padding: "14px", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 700, color: WHITE, background: DARK_GREEN, cursor: submitting ? "not-allowed" : "pointer", textTransform: "uppercase" }}>
                {submitting ? "Saving..." : editingId ? "Save Changes" : "Add User"}
              </button>
              <button type="button" onClick={() => setShowModal(false)}
                style={{ width: "100%", marginTop: "10px", padding: "10px", border: "none", background: "transparent", color: GRAY, fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}
    </div>
  );
}

/* ─── Helpers ──────────────────────────────────────────────── */

const plainInputStyle = {
  padding: "10px 12px", border: `1px solid ${BORDER}`, borderRadius: "6px",
  fontSize: "14px", background: LIGHT_GRAY, width: "100%", boxSizing: "border-box", outline: "none"
};

function Field({ label, optional, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <label style={{ fontSize: "14px", fontWeight: 700, color: "#111827" }}>
        {label}
        {optional && <span style={{ fontWeight: 400, color: GRAY, fontSize: "13px" }}> (optional)</span>}
      </label>
      {children}
    </div>
  );
}

function Th({ children, align = "left" }) {
  return (
    <th style={{ padding: "12px 18px", fontSize: "11px", fontWeight: 700, color: GRAY, textTransform: "uppercase", textAlign: align, whiteSpace: "nowrap" }}>
      {children}
    </th>
  );
}

function DropdownMenu({ onClose, onEdit, onDelete, uid }) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const anchor = document.querySelector(`[data-uid="${uid}"]`);
    if (anchor) {
      const rect = anchor.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.left - 120 });
    }
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [uid, onClose]);

  const itemStyle = {
    display: "block", width: "100%", textAlign: "left",
    padding: "10px 14px", fontSize: "13px", background: "none",
    border: "none", cursor: "pointer", color: "#111827", fontWeight: 600
  };

  const hoverOn  = (e) => { e.currentTarget.style.background = LIGHT_GRAY; };
  const hoverOff = (e) => { e.currentTarget.style.background = "none"; };

  return (
    <div ref={ref} style={{
      position: "fixed", top: pos.top, left: pos.left, zIndex: 2147483647,
      background: WHITE, border: `1px solid ${BORDER}`, borderRadius: "8px",
      boxShadow: "0 8px 24px rgba(0,0,0,0.12)", minWidth: "140px", overflow: "hidden"
    }}>
      <button type="button" style={itemStyle} onMouseEnter={hoverOn} onMouseLeave={hoverOff} onClick={onEdit}>
        Edit
      </button>
      <button type="button" style={{ ...itemStyle, color: RED, borderTop: `1px solid ${BORDER}` }} onMouseEnter={hoverOn} onMouseLeave={hoverOff} onClick={onDelete}>
        Delete
      </button>
    </div>
  );
}

function BellLoader() {
  return (
    <div style={{ padding: "40px", textAlign: "center", color: GRAY, fontSize: "14px" }}>
      Loading users...
    </div>
  );
}

function PageNavBtn({ onClick, disabled, children }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      style={{
        width: 32, height: 32, border: `1px solid ${BORDER}`, borderRadius: "6px",
        background: disabled ? LIGHT_GRAY : WHITE,
        color: disabled ? "#D1D5DB" : GRAY,
        cursor: disabled ? "default" : "pointer",
        fontSize: "13px", fontWeight: 700,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 0
      }}>
      {children}
    </button>
  );
}

function RoleToggle({ label, checked, onChange }) {
  const s = roleBadge(label);
  return (
    <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        style={{ width: 16, height: 16, cursor: "pointer", accentColor: s.color }}
      />
      <span style={{
        padding: "4px 12px", borderRadius: "20px",
        background: checked ? s.bg : "#F3F4F6",
        color: checked ? s.color : GRAY,
        border: `1px solid ${checked ? s.border : BORDER}`,
        fontSize: "12px", fontWeight: 700, textTransform: "uppercase",
        transition: "all 0.15s"
      }}>
        {label}
      </span>
    </label>
  );
}