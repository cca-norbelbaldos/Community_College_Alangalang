import { useEffect, useState } from "react";
import { showToast } from "../components/Toast";

const GOLD       = "#F5A800";
const GREEN      = "#2E7D32";
const DARK_GREEN = "#1B5E20";
const WHITE      = "#FFFFFF";
const GRAY       = "#6B7280";
const LIGHT_GRAY = "#F9FAFB";
const BORDER     = "#E5E7EB";

export default function SystemControls({ onConfigUpdated }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

  // Configuration split state matrix 
  const [features, setFeatures] = useState({
    feat_overview: true,
    feat_student_list: true,
    feat_faculty_mgmt: true,
    feat_registrar_mgmt: true,
    feat_announcements: true,
  });

  const [roleVisibility, setRoleVisibility] = useState({
    student_announcements: true,
    faculty_announcements: true,
  });

  // 1. LOADING SYSTEM CONFIG MATRIX FROM DATABASE
  useEffect(() => {
    const fetchCurrentConfig = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/erd/system-config`);
        if (res.ok) {
          const data = await res.json();
          if (data.featureFlags) setFeatures(data.featureFlags);
          if (data.roleVisibility) setRoleVisibility(data.roleVisibility);
        }
      } catch (err) {
        console.error("Configuration payload extraction error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCurrentConfig();
  }, []);

  const handleFeatureToggle = (key) => {
    setFeatures(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleVisibilityToggle = (key) => {
    setRoleVisibility(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // 2. DISPATCH MODIFICATIONS TO COMPLIANCE CLUSTER
  const handleSaveConfig = async () => {
    if (saving) return;
    setSaving(true);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/erd/system-config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featureFlags: features, roleVisibility }),
      });

      if (res.ok) {
        showToast("System configuration saved!", "success");
        if (typeof onConfigUpdated === "function") {
          onConfigUpdated();
        }
      } else {
        showToast("Failed to save system configuration.", "error");
      }
    } catch (err) {
      console.error("Transmission layout runtime crash:", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: "20px", color: GRAY, fontSize: "14px" }}>🔄 Synchronizing configuration layout registers...</div>;
  }

  return (
    <div style={{ fontFamily: "system-ui", display: "flex", flexDirection: "column", gap: "24px" }}>
      
      <div>
        <h3 style={{ color: DARK_GREEN, margin: "0 0 4px 0", fontWeight: 800 }}>⚙️ System Control Array</h3>
        <p style={{ margin: 0, fontSize: "12px", color: GRAY, fontWeight: 600 }}>
          Manage global environment flags and functional accessibility criteria.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px" }}>
        
        {/* LEFT COLUMN: COMPONENT ROUTE MANAGER */}
        <div style={{ border: `1px solid ${BORDER}`, borderRadius: "8px", padding: "18px", background: WHITE }}>
          <h4 style={{ margin: "0 0 14px 0", fontSize: "14px", color: DARK_GREEN, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Modular Feature Flags
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <ToggleRow label="Overview Landing Space" checked={features.feat_overview} onChange={() => handleFeatureToggle("feat_overview")} />
            <ToggleRow label="Student Enrollment Roster" checked={features.feat_student_list} onChange={() => handleFeatureToggle("feat_student_list")} />
            <ToggleRow label="Faculty Profile Matrix" checked={features.feat_faculty_mgmt} onChange={() => handleFeatureToggle("feat_faculty_mgmt")} />
            <ToggleRow label="Registrar Transcript Ledger" checked={features.feat_registrar_mgmt} onChange={() => handleFeatureToggle("feat_registrar_mgmt")} />
            <ToggleRow label="Bulletin Announcement Broadcaster" checked={features.feat_announcements} onChange={() => handleFeatureToggle("feat_announcements")} />
          </div>
        </div>

        {/* RIGHT COLUMN: USER CLEARANCE CRITERIA */}
        <div style={{ border: `1px solid ${BORDER}`, borderRadius: "8px", padding: "18px", background: WHITE }}>
          <h4 style={{ margin: "0 0 14px 0", fontSize: "14px", color: DARK_GREEN, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Role Visibility Modifiers
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <ToggleRow label="Expose Announcements to Student Accounts" checked={roleVisibility.student_announcements} onChange={() => handleVisibilityToggle("student_announcements")} />
            <ToggleRow label="Expose Announcements to Faculty Accounts" checked={roleVisibility.faculty_announcements} onChange={() => handleVisibilityToggle("faculty_announcements")} />
          </div>
        </div>

      </div>

      {/* FOOTER ACTIONS BAR */}
      <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: "16px", display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={handleSaveConfig}
          disabled={saving}
          style={{
            padding: "10px 24px", background: DARK_GREEN, color: WHITE, border: "none",
            borderRadius: "6px", fontWeight: 700, fontSize: "13px", cursor: saving ? "not-allowed" : "pointer"
          }}
        >
          {saving ? "⏳ Committing Schema..." : "💾 Save Global Policy Configuration"}
        </button>
      </div>

    </div>
  );
}

/* HELPER COMPONENT FOR STANDARDIZED TOGGLES */
function ToggleRow({ label, checked, onChange }) {
  return (
    <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", padding: "6px 0" }}>
      <span style={{ fontSize: "13px", fontWeight: 600, color: "#374151" }}>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        style={{
          width: "40px", height: "20px", accentColor: GREEN, cursor: "pointer"
        }}
      />
    </label>
  );
}