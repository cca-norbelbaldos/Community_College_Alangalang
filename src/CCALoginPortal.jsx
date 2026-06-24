import { useState } from "react";
import ccaLogo from "./assets/cca_logo.jpg";
import alangalangSeal from "../src/assets/Alangalang.png"; 

const GREEN = "#2E7D32";
const DARK_GREEN = "#1B5E20";
const LIGHT_GREEN = "#E8F5E9";
const GOLD = "#F5A800";
const WHITE = "#FFFFFF";
const GRAY = "#6B7280";
const LIGHT_GRAY = "#F3F4F6";
const BORDER = "#D1D5DB";
const RED = "#DC2626";

const inputStyle = {
  width: "100%",
  padding: "10px 13px",
  border: `1.5px solid ${BORDER}`,
  borderRadius: 8,
  fontSize: 14,
  color: "#111827",
  background: WHITE,
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.2s",
};

const btnPrimary = {
  width: "100%",
  padding: "11px",
  background: GREEN,
  color: WHITE,
  border: "none",
  borderRadius: 8,
  fontSize: 15,
  fontWeight: 700,
  cursor: "pointer",
  marginTop: 12,
  letterSpacing: 0.3,
};

const Label = ({ children }) => (
  <label style={{ fontSize: 12, fontWeight: 600, color: GRAY, marginBottom: 5, display: "block", textTransform: "uppercase", letterSpacing: "0.5px" }}>
    {children}
  </label>
);

export default function CCALoginPortal({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Please fill out all operational security fields.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/erd/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok && data.id) {
        onLogin(data);
      } else {
        setError(data.message || "Invalid credentials. Gateway access denied.");
      }
    } catch (err) {
      console.error(err);
      setError("Network connection failure. Failed to reach verification gateway.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      background: "#F3F4F6",
      fontFamily: "system-ui, -apple-system, sans-serif"
    }}>
      <div style={{
        width: "100%",
        maxWidth: 420,
        background: WHITE,
        borderRadius: 16,
        boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)",
        overflow: "hidden"
      }}>
        {/* Header Branding Container */}
        <div style={{
          background: `linear-gradient(135deg, ${DARK_GREEN} 0%, ${GREEN} 60%, ${GOLD} 100%)`,
          padding: "26px 36px 20px",
          textAlign: "center",
          color: WHITE,
        }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
            <img src={ccaLogo} alt="CCA Logo" style={{
              width: 82,
              height: 82,
              borderRadius: "50%",
              objectFit: "cover",
              border: "3px solid rgba(255,255,255,0.5)",
              boxShadow: "0 3px 12px rgba(0,0,0,0.2)"
            }} />
          </div>
          <div style={{ fontSize: 10, letterSpacing: 3, textTransform: "uppercase", opacity: 0.8, marginBottom: 3 }}>
            Community College of
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: 1.2 }}>ALANGALANG</div>
          <div style={{
            display: "inline-block", marginTop: 10,
            background: "rgba(255,255,255,0.18)",
            borderRadius: 20, padding: "4px 16px", fontSize: 12, fontWeight: 600,
          }}>
            Portal Access
          </div>
        </div>

        {/* Login Form Inputs Workspace */}
        <div style={{ padding: "32px 32px 24px" }}>
          <form onSubmit={handleFormSubmit}>
            
            {error && (
              <div style={{
                marginBottom: 16, padding: "10px 14px", background: "#FEF2F2",
                border: `1px solid ${RED}40`, borderRadius: 8, color: RED,
                fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: "8px"
              }}>
                ⚠️ {error}
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <Label>Username</Label>
              <input
                type="text"
                placeholder="Username..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <Label>Password</Label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                style={inputStyle}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                ...btnPrimary,
                background: loading ? GRAY : GREEN,
                cursor: loading ? "not-allowed" : "pointer"
              }}
            >
              {loading ? "⚡ Verifying Gateway..." : "LOGIN"}
            </button>

            {/* Bottom Branding Workspace - Developer Credit and Alangalang Seal */}
            <div style={{
              marginTop: 24,
              paddingTop: 16,
              borderTop: "1px solid #E5E7EB",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "12px"
            }}>
              <span style={{ 
                fontSize: 13, 
                fontWeight: 600, 
                color: GRAY, 
                letterSpacing: "0.2px"
              }}>
                Developed by:
              </span>
              <img 
                src={alangalangSeal} 
                alt="Municipality of Alangalang Seal" 
                style={{ width: 62, height: 62, objectFit: "contain" }} 
              />
            </div>

            <div style={{ marginTop: 16, textAlign: "center", fontSize: 11, color: GRAY, fontWeight: 500 }}>
              Protected under active campus system database compliance.
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}