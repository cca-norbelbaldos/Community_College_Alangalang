import { useState } from "react";
import ccaLogo from "./assets/cca_logo.jpg";

const GREEN      = "#2E7D32";
const DARK_GREEN = "#1B5E20";
const GOLD       = "#F5A800";
const WHITE      = "#FFFFFF";
const GRAY       = "#6B7280";
const BORDER     = "#D1D5DB";

export default function CCALoginPortal({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [focusU,   setFocusU]   = useState(false);
  const [focusP,   setFocusP]   = useState(false);

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Please fill in both username and password.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res  = await fetch(`${import.meta.env.VITE_API_URL}/api/erd/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok && data.id) {
        onLogin(data);
      } else {
        setError(data.message || "Invalid credentials. Please try again.");
      }
    } catch {
      setError("Unable to reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (focused) => ({
    width: "100%",
    padding: "11px 42px 11px 38px",
    border: `1.5px solid ${focused ? GREEN : BORDER}`,
    borderRadius: 10,
    fontSize: 14,
    color: "#111827",
    background: WHITE,
    outline: "none",
    boxSizing: "border-box",
    boxShadow: focused ? "0 0 0 3px rgba(46,125,50,0.13)" : "none",
    fontFamily: "inherit",
    transition: "border-color 0.18s ease, box-shadow 0.18s ease",
  });

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      background: `linear-gradient(145deg, #E8F5E9 0%, #F3F4F6 50%, #FFF8E1 100%)`,
      fontFamily: "'Inter', system-ui, sans-serif",
      padding: "16px",
      position: "relative",
      overflow: "hidden",
    }}>

      {/* Decorative blobs */}
      <div style={{
        position: "absolute", top: "-100px", left: "-100px",
        width: "340px", height: "340px", borderRadius: "50%",
        background: "rgba(46,125,50,0.06)", pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", bottom: "-120px", right: "-80px",
        width: "400px", height: "400px", borderRadius: "50%",
        background: "rgba(245,168,0,0.05)", pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", top: "50%", right: "8%",
        width: "180px", height: "180px", borderRadius: "50%",
        background: "rgba(46,125,50,0.04)", pointerEvents: "none",
        transform: "translateY(-50%)",
      }} />

      <style>{`
        @keyframes cardEntrance {
          from { opacity: 0; transform: translateY(28px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
        @keyframes errorShake {
          0%, 100% { transform: translateX(0); }
          20%       { transform: translateX(-6px); }
          40%       { transform: translateX(6px); }
          60%       { transform: translateX(-4px); }
          80%       { transform: translateX(4px); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .login-submit-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #1B5E20, #155218) !important;
          box-shadow: 0 6px 22px rgba(27,94,32,0.38) !important;
          transform: translateY(-1px) !important;
        }
        .login-submit-btn:active:not(:disabled) {
          transform: translateY(0) !important;
          box-shadow: 0 2px 8px rgba(27,94,32,0.25) !important;
        }
        .pw-toggle-btn:hover {
          color: #2E7D32 !important;
        }
      `}</style>

      {/* Login card */}
      <div style={{
        width: "100%",
        maxWidth: 420,
        background: WHITE,
        borderRadius: 20,
        boxShadow: "0 24px 64px -12px rgba(0,0,0,0.15), 0 4px 18px -4px rgba(0,0,0,0.07)",
        overflow: "hidden",
        animation: "cardEntrance 0.42s cubic-bezier(0.34,1.56,0.64,1) forwards",
        position: "relative",
        zIndex: 1,
      }}>

        {/* Header banner */}
        <div style={{
          background: `linear-gradient(135deg, ${DARK_GREEN} 0%, ${GREEN} 55%, #43A047 85%, #4CAF50 100%)`,
          padding: "30px 36px 24px",
          textAlign: "center",
          color: WHITE,
          position: "relative",
          overflow: "hidden",
        }}>
          {/* Glow spot */}
          <div style={{
            position: "absolute", top: "-30px", right: "-30px",
            width: "180px", height: "180px", borderRadius: "50%",
            background: "rgba(255,255,255,0.06)", pointerEvents: "none",
          }} />

          {/* Logo */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 14, position: "relative" }}>
            <div style={{
              width: 88, height: 88, borderRadius: "50%",
              border: "3px solid rgba(255,255,255,0.55)",
              boxShadow: "0 4px 22px rgba(0,0,0,0.22), 0 0 0 6px rgba(255,255,255,0.08)",
              overflow: "hidden",
              background: WHITE,
              flexShrink: 0,
            }}>
              <img src={ccaLogo} alt="CCA Logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          </div>

          <div style={{ fontSize: 10, letterSpacing: 4, textTransform: "uppercase", opacity: 0.75, marginBottom: 4 }}>
            Community College of
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: 1.5 }}>ALANGALANG</div>

          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            marginTop: 12,
            background: "rgba(255,255,255,0.15)",
            border: "1px solid rgba(255,255,255,0.22)",
            borderRadius: 20, padding: "5px 16px",
            fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: "50%", background: "#4ADE80",
              display: "inline-block", boxShadow: "0 0 6px #4ADE80",
            }} />
            Student Information System
          </div>
        </div>

        {/* Form body */}
        <form onSubmit={handleFormSubmit} style={{ padding: "28px 32px 32px" }}>
          <div style={{ marginBottom: 20, fontSize: 15, fontWeight: 700, color: "#111827", textAlign: "center" }}>
            Sign in to your account
          </div>

          {/* Error banner */}
          {error && (
            <div style={{
              marginBottom: 16,
              padding: "10px 14px",
              background: "#FEF2F2",
              border: "1px solid #FCA5A5",
              borderRadius: 8,
              color: "#991B1B",
              fontSize: 13,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 8,
              animation: "errorShake 0.38s ease",
            }}>
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Username */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: GRAY, marginBottom: 6, letterSpacing: 0.3 }}>
              USERNAME
            </label>
            <div style={{ position: "relative" }}>
              <span style={{
                position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
                fontSize: 15, pointerEvents: "none", userSelect: "none",
              }}>👤</span>
              <input
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError(""); }}
                onFocus={() => setFocusU(true)}
                onBlur={() => setFocusU(false)}
                placeholder="Enter your username"
                style={inputStyle(focusU)}
                disabled={loading}
              />
            </div>
          </div>

          {/* Password */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: GRAY, marginBottom: 6, letterSpacing: 0.3 }}>
              PASSWORD
            </label>
            <div style={{ position: "relative" }}>
              <span style={{
                position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
                fontSize: 15, pointerEvents: "none", userSelect: "none",
              }}>🔒</span>
              <input
                type={showPw ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                onFocus={() => setFocusP(true)}
                onBlur={() => setFocusP(false)}
                placeholder="Enter your password"
                style={inputStyle(focusP)}
                disabled={loading}
              />
              <button
                type="button"
                className="pw-toggle-btn"
                onClick={() => setShowPw(p => !p)}
                tabIndex={-1}
                style={{
                  position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                  border: "none", background: "none", cursor: "pointer",
                  fontSize: 16, color: "#9CA3AF", padding: "2px 4px",
                  lineHeight: 1, transition: "color 0.15s",
                }}
              >{showPw ? "🙈" : "👁️"}</button>
            </div>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            className="login-submit-btn"
            disabled={loading}
            style={{
              width: "100%",
              padding: "13px",
              background: loading
                ? "#9CA3AF"
                : `linear-gradient(135deg, ${DARK_GREEN} 0%, ${GREEN} 100%)`,
              color: WHITE,
              border: "none",
              borderRadius: 10,
              fontSize: 15,
              fontWeight: 800,
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: loading ? "none" : "0 4px 14px rgba(27,94,32,0.28)",
              transition: "background 0.18s, box-shadow 0.18s, transform 0.12s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              letterSpacing: 0.5,
            }}
          >
            {loading ? (
              <>
                <span style={{
                  width: 16, height: 16, borderRadius: "50%",
                  border: "2.5px solid rgba(255,255,255,0.35)",
                  borderTopColor: WHITE,
                  display: "inline-block",
                  animation: "spin 0.75s linear infinite",
                }} />
                Signing in...
              </>
            ) : "Sign In"}
          </button>
        </form>

        {/* Footer */}
        <div style={{
          padding: "14px 32px 20px",
          textAlign: "center",
          borderTop: `1px solid ${BORDER}`,
          background: "#FAFAFA",
        }}>
          <span style={{ fontSize: 11, color: "#9CA3AF" }}>
            © {new Date().getFullYear()} Community College of Alangalang &nbsp;·&nbsp; All rights reserved
          </span>
        </div>
      </div>
    </div>
  );
}
