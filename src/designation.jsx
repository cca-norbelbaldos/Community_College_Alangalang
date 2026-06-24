import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const GREEN      = "#2E7D32";
const DARK_GREEN = "#1B5E20";
const WHITE      = "#FFFFFF";
const GRAY       = "#6B7280";
const LIGHT_GRAY = "#F9FAFB";
const BORDER     = "#E5E7EB";
const RED        = "#DC2626";

const EMPTY_FORM = { name: "", description: "" };

export default function Designation() {
  const [designations, setDesignations] = useState([]);
  const [loading,       setLoading]      = useState(true);
  const [submitting,    setSubmitting]   = useState(false);
  const [search,        setSearch]       = useState("");
  const [showModal,     setShowModal]    = useState(false);
  const [editingId,     setEditingId]    = useState(null);
  const [form,          setForm]         = useState(EMPTY_FORM);
  const [error,         setError]        = useState("");

  useEffect(() => {
    fetchDesignations();
  }, []);

  const fetchDesignations = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/erd/designations`);
      if (res.ok) {
        const data = await res.json();
        setDesignations(Array.isArray(data) ? data : []);
      }
    } catch (err) { console.error("Failed to load designations:", err); }
    finally { setLoading(false); }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const openCreateModal = () => {
    setEditingId(null); setForm(EMPTY_FORM); setError(""); setShowModal(true);
  };

  const openEditModal = (d) => {
    setEditingId(d.id);
    setForm({ name: d.name || "", description: d.description || "" });
    setError(""); setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError("Name is required."); return; }
    setSubmitting(true); setError("");

    const url    = editingId
      ? `${import.meta.env.VITE_API_URL}/api/erd/designations/${editingId}`
      : `${import.meta.env.VITE_API_URL}/api/erd/designations`;
    const method = editingId ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, description: form.description })
      });
      if (res.ok) { setShowModal(false); setForm(EMPTY_FORM); fetchDesignations(); }
      else { const d = await res.json(); setError(d.message || "Failed to save designation."); }
    } catch (err) { console.error(err); setError("Could not reach the server."); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this designation? This cannot be undone.")) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/erd/designations/${id}`, { method: "DELETE" });
      if (res.ok) fetchDesignations();
      else { const d = await res.json(); alert(d.message || "Failed to delete designation."); }
    } catch (err) { console.error(err); }
  };

  const filteredDesignations = designations.filter(d =>
    [d.name, d.description].join(" ").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ fontFamily: "system-ui, sans-serif" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", gap: "16px", flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: "0 0 4px 0", fontSize: "24px", fontWeight: 800, color: "#111827" }}>Designation</h2>
          <p style={{ margin: 0, fontSize: "13px", color: GRAY }}>
            Manage organizational positions or titles assigned to users within the system.
          </p>
        </div>
        <button type="button" onClick={openCreateModal}
          style={{ padding: "10px 20px", background: "#6366F1", color: WHITE, border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
          Add Designation
        </button>
      </div>

      {/* Search */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "12px" }}>
        <input
          type="text"
          placeholder="Search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: "10px 16px", border: `1px solid ${BORDER}`, borderRadius: "8px", fontSize: "14px", outline: "none", width: "240px", boxSizing: "border-box" }}
        />
      </div>

      {/* Table */}
      <div style={{ background: WHITE, borderRadius: "12px", border: `1px solid ${BORDER}`, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ background: LIGHT_GRAY, borderBottom: `1px solid ${BORDER}` }}>
              <Th>Name</Th>
              <Th>Description</Th>
              <Th align="right">Action</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="3" style={{ padding: "40px", textAlign: "center", color: GRAY, fontSize: "14px" }}>Loading designations...</td></tr>
            ) : filteredDesignations.length === 0 ? (
              <tr><td colSpan="3" style={{ padding: "40px", textAlign: "center", color: GRAY, fontSize: "14px" }}>No designations found.</td></tr>
            ) : (
              filteredDesignations.map((d) => (
                <tr key={d.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <td style={{ padding: "14px 18px", fontSize: "13px", color: "#111827" }}>{d.name}</td>
                  <td style={{ padding: "14px 18px", fontSize: "13px", color: "#374151" }}>{d.description || "-"}</td>
                  <td style={{ padding: "14px 18px", textAlign: "right" }}>
                    <button type="button" onClick={() => openEditModal(d)}
                      title="Edit"
                      style={{ border: "none", background: "none", cursor: "pointer", color: GREEN, fontSize: "16px", marginRight: "10px" }}>
                      ✎
                    </button>
                    <button type="button" onClick={() => handleDelete(d.id)}
                      title="Delete"
                      style={{ border: "none", background: "none", cursor: "pointer", color: RED, fontSize: "16px" }}>
                      🗑
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Modal */}
      {showModal && createPortal(
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2147483647, padding: "16px" }}>
          <form onSubmit={handleSubmit} style={{ background: WHITE, borderRadius: "12px", width: "100%", maxWidth: "480px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.15)", overflow: "hidden" }}>

            <div style={{ padding: "24px 28px 0 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h3 style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "#111827" }}>
                {editingId ? "EDIT DESIGNATION" : "ADD DESIGNATION"}
              </h3>
              <button type="button" onClick={() => setShowModal(false)}
                style={{ border: "none", background: "transparent", fontSize: "20px", color: "#111827", cursor: "pointer", lineHeight: 1, padding: "4px" }}>
                X
              </button>
            </div>

            <div style={{ padding: "20px 28px 28px 28px", display: "flex", flexDirection: "column", gap: "20px" }}>
              {error && (
                <div style={{ padding: "10px 14px", background: "#FEF2F2", border: `1px solid #FEE2E2`, borderRadius: "6px", color: RED, fontSize: "12px", fontWeight: 600 }}>
                  {error}
                </div>
              )}

              <Field label="Name">
                <input type="text" name="name" value={form.name} onChange={handleInputChange} required style={plainInputStyle} />
              </Field>
              <Field label="Description" optional>
                <input type="text" name="description" value={form.description} onChange={handleInputChange} style={plainInputStyle} />
              </Field>
            </div>

            <div style={{ padding: "0 28px 28px 28px" }}>
              <button type="submit" disabled={submitting}
                style={{ width: "100%", padding: "14px", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 700, color: WHITE, background: DARK_GREEN, cursor: submitting ? "not-allowed" : "pointer", textTransform: "uppercase" }}>
                {submitting ? "Saving..." : editingId ? "Save Changes" : "Add Designation"}
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