import { useEffect, useState, useRef } from "react";

const GREEN      = "#2E7D32";
const DARK_GREEN = "#1B5E20";
const WHITE      = "#FFFFFF";
const GRAY       = "#6B7280";
const LIGHT_GRAY = "#F9FAFB";
const BORDER     = "#E5E7EB";
const RED        = "#DC2626";

export default function AccountSettings({ user }) {
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [pwSaving, setPwSaving]   = useState(false);
  const [message, setMessage]     = useState({ type: "", text: "" });
  const [pwMessage, setPwMessage] = useState({ type: "", text: "" });

  const [form, setForm] = useState({
    id: null, username: "", first_name: "", middle_name: "", last_name: "",
    suffix: "", email: "", gender: "", id_no: "", designation: "",
    status: "Active", roles: [],
  });

  const [newPassword, setNewPassword]         = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profilePic, setProfilePic]           = useState(null);
  const [picSaving, setPicSaving]             = useState(false);
  const picInputRef = useRef(null);

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    fetch(`${import.meta.env.VITE_API_URL}/api/erd/users`)
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        const me = Array.isArray(data) ? data.find(u => u.id === user.id) : null;
        if (me) {
          if (me.profile_picture) setProfilePic(me.profile_picture);
          setForm({
            id: me.id, username: me.username || "", first_name: me.first_name || "",
            middle_name: me.middle_name || me.middlename || "", last_name: me.last_name || "",
            suffix: me.suffix || "", email: me.email || "", gender: me.gender || "",
            id_no: me.id_no || "", designation: me.designation || "",
            status: me.status || "Active", roles: me.roles || [],
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.id]);

  const handleChange = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const handlePicChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !form.id) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target.result;
      setProfilePic(dataUrl);
      setPicSaving(true);
      try {
        await fetch(`${import.meta.env.VITE_API_URL}/api/erd/users/${form.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: form.username, first_name: form.first_name, middle_name: form.middle_name,
            last_name: form.last_name, suffix: form.suffix, email: form.email,
            gender: form.gender, id_no: form.id_no, designation: form.designation,
            status: form.status, roles: form.roles, profile_picture: dataUrl,
          }),
        });
      } catch {} finally { setPicSaving(false); }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!form.id) return;
    setSaving(true);
    setMessage({ type: "", text: "" });
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/erd/users/${form.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: form.username, first_name: form.first_name, middle_name: form.middle_name,
          last_name: form.last_name, suffix: form.suffix, email: form.email,
          gender: form.gender, id_no: form.id_no, designation: form.designation,
          status: form.status, roles: form.roles,
        }),
      });
      if (res.ok) {
        setMessage({ type: "success", text: "Profile updated successfully." });
      } else {
        const data = await res.json().catch(() => ({}));
        setMessage({ type: "error", text: data.message || "Failed to update profile." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error." });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!form.id) return;
    setPwMessage({ type: "", text: "" });
    if (!newPassword || newPassword.length < 4) {
      setPwMessage({ type: "error", text: "Password must be at least 4 characters." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwMessage({ type: "error", text: "Passwords do not match." });
      return;
    }
    setPwSaving(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/erd/users/${form.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: form.username, password: newPassword,
          first_name: form.first_name, middle_name: form.middle_name,
          last_name: form.last_name, suffix: form.suffix, email: form.email,
          gender: form.gender, id_no: form.id_no, designation: form.designation,
          status: form.status, roles: form.roles,
        }),
      });
      if (res.ok) {
        setPwMessage({ type: "success", text: "Password updated successfully." });
        setNewPassword("");
        setConfirmPassword("");
      } else {
        const data = await res.json().catch(() => ({}));
        setPwMessage({ type: "error", text: data.message || "Failed to update password." });
      }
    } catch {
      setPwMessage({ type: "error", text: "Network error." });
    } finally {
      setPwSaving(false);
    }
  };

  const handleResetPassword = () => {
    setNewPassword("");
    setConfirmPassword("");
    setPwMessage({ type: "", text: "" });
  };

  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: GRAY, fontSize: "13px" }}>
        ⏳ Loading account...
      </div>
    );
  }

  const fieldStyle = { width: "100%", padding: "10px 14px", border: `1px solid ${BORDER}`, borderRadius: "8px", fontSize: "13px", outline: "none", boxSizing: "border-box" };
  const labelStyle = { display: "block", marginBottom: "6px", fontSize: "12px", fontWeight: 600, color: "#374151" };
  const fullName = [form.first_name, form.last_name].filter(Boolean).join(" ") || form.username;

  return (
    <div style={{ fontFamily: "system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px" }}>
        <div style={{ position: "relative", flexShrink: 0 }}>
          <div onClick={() => picInputRef.current?.click()}
            style={{ width: "72px", height: "72px", borderRadius: "50%", overflow: "hidden", cursor: "pointer", border: `2px solid ${BORDER}`, boxShadow: "0 2px 8px rgba(0,0,0,0.10)", background: "#E8F5E9", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}
            title="Click to change photo"
            onMouseEnter={e => { const ov = e.currentTarget.querySelector(".pic-overlay"); if(ov) ov.style.opacity=1; }}
            onMouseLeave={e => { const ov = e.currentTarget.querySelector(".pic-overlay"); if(ov) ov.style.opacity=0; }}>
            {profilePic ? (
              <img src={profilePic} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <span style={{ fontSize: "28px", fontWeight: 800, color: DARK_GREEN }}>
                {(form.first_name || form.username || "?").charAt(0).toUpperCase()}
              </span>
            )}
            <div className="pic-overlay" style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.38)", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0, transition: "opacity 0.15s", fontSize: "18px" }}>📷</div>
          </div>
          {picSaving && <div style={{ position: "absolute", bottom: 1, right: 1, background: DARK_GREEN, color: WHITE, borderRadius: "50%", width: "18px", height: "18px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px" }}>⏳</div>}
          <input ref={picInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePicChange} />
        </div>
        <div>
          <div style={{ fontSize: "16px", fontWeight: 800, color: "#111827" }}>{fullName.toUpperCase()}</div>
          <div style={{ fontSize: "11px", color: GRAY, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            {(Array.isArray(form.roles) && form.roles.length > 0 ? form.roles.join(", ") : (user?.role || ""))}
          </div>
          <div style={{ fontSize: "10px", color: GRAY, marginTop: "3px" }}>Click photo to change</div>
        </div>
      </div>

      {/* Personal information */}
      <form onSubmit={handleSaveProfile}>
        <h4 style={{ margin: "0 0 14px", fontSize: "12px", fontWeight: 700, color: GRAY, textTransform: "uppercase", letterSpacing: "0.5px" }}>
          Personal Information
        </h4>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "14px", marginBottom: "18px" }}>
          <div>
            <label style={labelStyle}>Last name</label>
            <input style={fieldStyle} value={form.last_name} onChange={handleChange("last_name")} />
          </div>
          <div>
            <label style={labelStyle}>First name</label>
            <input style={fieldStyle} value={form.first_name} onChange={handleChange("first_name")} />
          </div>
          <div>
            <label style={labelStyle}>Middle name</label>
            <input style={fieldStyle} value={form.middle_name} onChange={handleChange("middle_name")} />
          </div>
          <div>
            <label style={labelStyle}>Suffix</label>
            <input style={fieldStyle} value={form.suffix} onChange={handleChange("suffix")} />
          </div>
          <div>
            <label style={labelStyle}>Username</label>
            <input style={fieldStyle} value={form.username} onChange={handleChange("username")} />
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input type="email" style={fieldStyle} value={form.email} onChange={handleChange("email")} />
          </div>
        </div>

        {message.text && (
          <div style={{ marginBottom: "14px", padding: "10px 14px", borderRadius: "6px", fontSize: "12px", fontWeight: 600, background: message.type === "success" ? "#E8F5E9" : "#FEF2F2", color: message.type === "success" ? DARK_GREEN : RED }}>
            {message.type === "success" ? "✅ " : "⚠️ "}{message.text}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          style={{ padding: "10px 22px", background: DARK_GREEN, color: WHITE, border: "none", borderRadius: "8px", fontWeight: 700, fontSize: "13px", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}
        >
          {saving ? "Saving..." : "💾 Save Changes"}
        </button>
      </form>

      <div style={{ height: "1px", background: BORDER, margin: "28px 0" }} />

      {/* Change password */}
      <form onSubmit={handleChangePassword}>
        <h4 style={{ margin: "0 0 14px", fontSize: "12px", fontWeight: 700, color: GRAY, textTransform: "uppercase", letterSpacing: "0.5px" }}>
          Change Password
        </h4>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "14px", marginBottom: "14px", maxWidth: "500px" }}>
          <div>
            <label style={labelStyle}>New password</label>
            <input type="password" style={fieldStyle} placeholder="Password..." value={newPassword} onChange={e => setNewPassword(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Confirm password</label>
            <input type="password" style={fieldStyle} placeholder="Confirm..." value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
          </div>
        </div>

        {pwMessage.text && (
          <div style={{ marginBottom: "14px", padding: "10px 14px", borderRadius: "6px", fontSize: "12px", fontWeight: 600, background: pwMessage.type === "success" ? "#E8F5E9" : "#FEF2F2", color: pwMessage.type === "success" ? DARK_GREEN : RED }}>
            {pwMessage.type === "success" ? "✅ " : "⚠️ "}{pwMessage.text}
          </div>
        )}

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            type="button"
            onClick={handleResetPassword}
            style={{ padding: "10px 20px", background: WHITE, color: RED, border: `1px solid ${BORDER}`, borderRadius: "8px", fontWeight: 700, fontSize: "13px", cursor: "pointer" }}
          >
            Reset
          </button>
          <button
            type="submit"
            disabled={pwSaving}
            style={{ padding: "10px 22px", background: DARK_GREEN, color: WHITE, border: "none", borderRadius: "8px", fontWeight: 700, fontSize: "13px", cursor: pwSaving ? "not-allowed" : "pointer", opacity: pwSaving ? 0.7 : 1 }}
          >
            {pwSaving ? "Updating..." : "🔒 Update Password"}
          </button>
        </div>
      </form>
    </div>
  );
}