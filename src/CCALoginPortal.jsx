import { useState } from "react";
import ccaFullLogo from "./assets/cca_logo_t.png";
import alangSeal from "./assets/alangalang_seal.png";

const GREEN      = "#3d6e01";
const DARK_GREEN = "#2c4a1e";
const GOLD       = "#F5A800";
const WHITE      = "#FFFFFF";
const GRAY       = "#6B7280";
const LIGHT_GRAY = "#9CA3AF";
const BORDER     = "#E5E7EB";
const LINK       = "#2563EB";

export default function CCALoginPortal({ onLogin }) {
  const [view,     setView]     = useState("choose");   // "choose" | "login" | "reset"
  const [userType, setUserType] = useState("Employee"); // "Student" | "Employee"
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [focusU,   setFocusU]   = useState(false);
  const [focusP,   setFocusP]   = useState(false);
  const [dark,     setDark]     = useState(() => {
    try { return localStorage.getItem("cca_dark") === "1"; } catch { return false; }
  });

  const toggleDark = () => setDark(d => {
    const next = !d;
    try { localStorage.setItem("cca_dark", next ? "1" : "0"); } catch {}
    return next;
  });

  // Theme palette — switches with dark mode
  const t = dark ? {
    pageBg: "radial-gradient(1200px 600px at 50% -10%, #0b1220 0%, #0f172a 45%, #111827 100%)",
    card: "#1e293b", border: "#374151", text: "#F1F5F9", muted: "#94A3B8",
    label: "#CBD5E1", inputBg: "#0f172a", footerPage: "#94A3B8",
  } : {
    pageBg: "radial-gradient(1200px 600px at 50% -10%, #eef6df 0%, #f6faf0 45%, #ffffff 100%)",
    card: WHITE, border: BORDER, text: "#1f2937", muted: LIGHT_GRAY,
    label: "#374151", inputBg: WHITE, footerPage: "#9CA3AF",
  };

  const pick = (type) => { setUserType(type); setError(""); setView("login"); };
  const back = () => { setView("choose"); setError(""); setUsername(""); setPassword(""); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) { setError("Please fill in both fields."); return; }
    setLoading(true); setError("");
    try {
      // Students authenticate against erd_student_user; employees against erd_users.
      const endpoint = userType === "Student" ? "/api/erd/auth/student-login" : "/api/erd/auth/login";
      const res  = await fetch(`${import.meta.env.VITE_API_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok && data.id) { onLogin(data); }
      else { setError(data.message || "Invalid credentials. Please try again."); }
    } catch { setError("Unable to reach the server. Check your connection."); }
    finally { setLoading(false); }
  };

  return (
    <>
    <style>{`
      @keyframes fadeUp   { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
      @keyframes spin     { to{transform:rotate(360deg)} }
      @keyframes errShake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-6px)} 40%{transform:translateX(6px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(4px)} }
      .cca-card    { animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) both; }
      /* Moving light that travels along the card's border (all four edges) */
      @keyframes cardGlowSpin { to { transform: translate(-50%,-50%) rotate(360deg); } }
      .card-shell { position: relative; width: 100%; max-width: 354px; border-radius: 18px; }
      /* the border-ring frame: only a thin stroke shows, on every edge */
      .card-light {
        position: absolute; inset: 0; border-radius: 18px; z-index: 3; pointer-events: none;
        padding: 2.5px; overflow: hidden;
        -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
        -webkit-mask-composite: xor;
                mask-composite: exclude;
      }
      .card-light-halo { z-index: 2; padding: 3.5px; }
      .card-light-halo .card-light-inner { filter: blur(4px); }
      /* the spinning gradient underneath the mask; the lit arc = travelling light */
      .card-light-inner {
        position: absolute; top: 50%; left: 50%;
        width: 620px; height: 620px; transform: translate(-50%,-50%);
        background: conic-gradient(
          transparent 0deg, transparent 210deg,
          ${GREEN} 250deg, ${GOLD} 300deg, #fff8c4 322deg, ${GOLD} 342deg,
          ${GREEN} 356deg, transparent 360deg);
        animation: cardGlowSpin 4s linear infinite;
        will-change: transform;
      }
      .role-btn    { transition: border-color 0.18s, box-shadow 0.18s, transform 0.12s, background 0.18s; }
      .role-btn:hover  { border-color:${GREEN}!important; box-shadow:0 6px 18px rgba(61,110,1,0.14); transform:translateY(-2px); background:#f7fbef; }
      .role-btn:active { transform:translateY(0); }
      .role-btn:hover .role-ico { color:${GREEN}; }
      .link-btn:hover  { text-decoration:underline; }
      .signin-btn:hover:not(:disabled){ box-shadow:0 8px 22px rgba(27,94,32,0.32); transform:translateY(-2px); }
      .signin-btn:active:not(:disabled){ transform:translateY(0); }
      .pw-eye:hover{ color:${GREEN}!important; }
    `}</style>

    <div style={{
      position:"relative",
      height:"100vh", width:"100vw", overflow:"hidden",
      display:"flex", alignItems:"center", justifyContent:"center",
      background: t.pageBg,
      fontFamily:"system-ui,-apple-system,'Segoe UI',sans-serif",
      padding:"24px", boxSizing:"border-box",
      transition:"background 0.3s ease",
    }}>
      {/* ── Centered card (with animated glow border) ── */}
      <div className="card-shell">
      <div className="card-light card-light-halo" aria-hidden="true"><div className="card-light-inner" /></div>
      <div className="card-light" aria-hidden="true"><div className="card-light-inner" /></div>
      <div className="cca-card" style={{
        position:"relative", zIndex:1, boxSizing:"border-box",
        width:"100%", maxWidth:354, height: view === "choose" ? 464 : 514,
        background: t.card,
        borderRadius:18,
        border:`1px solid ${t.border}`,
        boxShadow: dark ? "0 20px 60px rgba(0,0,0,0.5)" : "0 20px 60px rgba(17,24,39,0.10), 0 2px 8px rgba(17,24,39,0.04)",
        padding:"20px 22px 94px",
        overflow:"hidden",
        display:"flex", flexDirection:"column",
        transition:"background 0.3s ease, border-color 0.3s ease",
      }}>

        {/* College logo */}
        <div style={{ display:"flex", justifyContent:"center", marginBottom:8, marginTop:0 }}>
          <img src={ccaFullLogo} alt="Community College of Alangalang" style={{ width:"100%", maxWidth:280, height:"auto", objectFit:"contain" }} />
        </div>

        {view === "choose" && (
          <>
            <h1 style={{ textAlign:"center", fontSize:40, fontWeight:800, color:t.text, margin:"18px 0 4px", fontFamily:'"Times New Roman", Times, serif' }}>Account Login</h1>
            <p style={{ textAlign:"center", fontSize:12, color:t.muted, margin:"10px 0 16px" }}>Login to manage your CCA-PORTAL Account</p>

            <button className="role-btn" onClick={()=>pick("Student")} style={{ ...roleBtnStyle, marginTop:10, background:t.card, border:`1.5px solid ${t.border}`, color:t.text }}>
              <GradCapIcon />
              <span style={roleLabel}>Login as Student</span>
            </button>

            <button className="role-btn" onClick={()=>pick("Employee")} style={{ ...roleBtnStyle, marginTop:11, background:t.card, border:`1.5px solid ${t.border}`, color:t.text }}>
              <BriefcaseIcon />
              <span style={roleLabel}>Login as Employee</span>
            </button>

          </>
        )}

        {view === "login" && (
          <>
            <h1 style={{ textAlign:"center", fontSize:40, fontWeight:800, color:t.text, margin:"15px 0 6px", lineHeight:1.2, fontFamily:'"Times New Roman", Times, serif' }}>Account Login</h1>
            <p style={{ textAlign:"center", fontSize:12, color:t.muted, margin:"10px 0 10px" }}>Login to manage your CCA-PORTAL Account</p>

            <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", marginTop:-5 }}>
              {error && (
                <div style={{ marginBottom:14, padding:"9px 12px", background:"#FEF2F2", border:"1px solid #FCA5A5", borderRadius:9, color:"#991B1B", fontSize:12, fontWeight:600, display:"flex", alignItems:"center", gap:7, animation:"errShake 0.38s ease" }}>
                  <span>⚠️</span><span>{error}</span>
                </div>
              )}

              {/* ID Number */}
              <div style={{ marginBottom:8 }}>
                <label style={{ ...labelStyle, color:t.label }}>{userType === "Employee" ? "Username" : `${userType} ID Number`} <span style={{ color:"#EF4444" }}>*</span></label>
                <input type="text" autoComplete="username" placeholder={userType === "Employee" ? "Username" : `${userType} ID`} value={username}
                  onChange={e=>{setUsername(e.target.value);setError("");}}
                  onFocus={()=>setFocusU(true)} onBlur={()=>setFocusU(false)}
                  style={{ ...cleanInput(focusU), background:t.inputBg, color:t.text, border:`1.5px solid ${focusU ? GREEN : t.border}` }} disabled={loading} />
              </div>

              {/* Password */}
              <div>
                <label style={{ ...labelStyle, color:t.label }}>Password <span style={{ color:"#EF4444" }}>*</span></label>
                <div style={{ position:"relative" }}>
                  <input type={showPw?"text":"password"} autoComplete="current-password" placeholder="Your password" value={password}
                    onChange={e=>{setPassword(e.target.value);setError("");}}
                    onFocus={()=>setFocusP(true)} onBlur={()=>setFocusP(false)}
                    style={{ ...cleanInput(focusP), paddingRight:42, background:t.inputBg, color:t.text, border:`1.5px solid ${focusP ? GREEN : t.border}` }} disabled={loading} />
                  <button type="button" className="pw-eye" onClick={()=>setShowPw(p=>!p)} tabIndex={-1}
                    style={{ position:"absolute", right:13, top:"50%", transform:"translateY(-50%)", border:"none", background:"none", cursor:"pointer", color:LIGHT_GRAY, padding:"2px 4px", lineHeight:1 }}>
                    {showPw
                      ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    }
                  </button>
                </div>
              </div>

              <button type="submit" className="signin-btn" disabled={loading} style={{
                marginTop:10, width:"100%", padding:"8px",
                background: loading ? LIGHT_GRAY : `linear-gradient(135deg,${DARK_GREEN},${GREEN})`,
                color:WHITE, border:"none", borderRadius:9,
                fontSize:12, fontWeight:800, letterSpacing:0.3,
                cursor: loading?"not-allowed":"pointer",
                boxShadow: loading?"none":"0 4px 12px rgba(27,94,32,0.26)",
                transition:"all 0.2s ease",
                display:"flex", alignItems:"center", justifyContent:"center", gap:8,
              }}>
                {loading
                  ? <><span style={{ width:13,height:13,borderRadius:"50%",border:"2px solid rgba(255,255,255,0.35)",borderTopColor:WHITE,display:"inline-block",animation:"spin 0.75s linear infinite" }} />Signing in...</>
                  : `Login as ${userType} →`
                }
              </button>
            </form>

            <div style={{ textAlign:"center", marginTop:8 }}>
              <button className="link-btn" onClick={back} style={{ ...linkStyle, color:GRAY }}>← Back</button>
            </div>
          </>
        )}

        {view === "reset" && (
          <>
            <h1 style={{ textAlign:"center", fontSize:23, fontWeight:800, color:t.text, margin:"0 0 6px" }}>Reset Password</h1>
            <p style={{ textAlign:"center", fontSize:13, color:t.muted, lineHeight:1.6, margin:"0 0 24px" }}>
              To reset your account password, please contact the Registrar / IT Support Office.
              Bring a valid ID for verification.
            </p>
            <div style={{ textAlign:"center" }}>
              <button className="link-btn" onClick={()=>setView("choose")} style={linkStyle}>← Back to login</button>
            </div>
          </>
        )}

        {/* Footer — Developed by (fixed to card bottom) */}
        <div style={{ position:"absolute", left:22, right:22, bottom:14, paddingTop:12, borderTop:`1px solid ${t.border}`, display:"flex", flexDirection:"column", alignItems:"center", gap:5 }}>
          <img src={alangSeal} alt="Alangalang Seal" style={{ width:52, height:52, objectFit:"contain" }} />
          <span style={{ fontSize:10, color:t.muted }}>Developed by IT Support Office</span>
        </div>
      </div>
      </div>

      {/* ── Page footer ── */}
      <div style={{ position:"absolute", bottom:16, left:0, right:0, textAlign:"center", color:t.footerPage, fontSize:10, lineHeight:1.7, pointerEvents:"none" }}>
        <div>CCA SYSTEM &nbsp;|&nbsp; Data Privacy Statement</div>
        <div>CCA PORTAL v1 — Copyright © 2026 Community College of Alangalang. All Rights Reserved.</div>
      </div>

      {/* ── Dark-mode toggle (bottom-right) ── */}
      <button onClick={toggleDark} title={dark ? "Switch to light mode" : "Switch to dark mode"}
        style={{
          position:"absolute", bottom:16, right:20, width:30, height:30, borderRadius:"50%",
          border:`1px solid ${t.border}`, background:t.card, color:t.text, cursor:"pointer",
          display:"flex", alignItems:"center", justifyContent:"center",
          boxShadow:"0 4px 12px rgba(0,0,0,0.15)", transition:"all 0.2s ease",
        }}>
        {dark
          ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
          : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
        }
      </button>
    </div>
    </>
  );
}

/* ── Shared styles ── */
const roleBtnStyle = {
  width:"100%", padding:"10px 16px",
  display:"flex", alignItems:"center", justifyContent:"center", gap:9,
  background:WHITE, border:`1.5px solid ${BORDER}`, borderRadius:10,
  cursor:"pointer", color:"#1f2937",
};
const roleLabel = { fontSize:13, fontWeight:700, letterSpacing:0.2 };
const linkStyle = {
  border:"none", background:"none", cursor:"pointer",
  color:LINK, fontSize:12.5, fontWeight:700, fontFamily:"inherit", padding:0,
};
const inputStyle = {
  width:"100%", padding:"10px 12px 10px 38px", border:"none",
  borderRadius:10, fontSize:13, color:"#111827", background:"transparent",
  outline:"none", boxSizing:"border-box", fontFamily:"inherit",
};
const labelStyle = {
  display:"block", fontSize:11, fontWeight:600, color:"#374151",
  marginBottom:4, marginLeft:2,
};
const cleanInput = (focused) => ({
  width:"100%", padding:"7px 13px", borderRadius:18,
  border:`1.5px solid ${focused ? GREEN : BORDER}`,
  fontSize:12, color:"#111827", background:WHITE,
  outline:"none", boxSizing:"border-box", fontFamily:"inherit",
  boxShadow: focused ? `0 0 0 3px rgba(61,110,1,0.12)` : "none",
  transition:"border-color 0.2s, box-shadow 0.2s",
});
const fieldWrap = (focused, val) => ({
  position:"relative",
  border:`1.6px solid ${focused ? GREEN : val ? DARK_GREEN : BORDER}`,
  borderRadius:11, background:WHITE,
  boxShadow: focused ? `0 0 0 3px rgba(61,110,1,0.12)` : "none",
  transition:"border-color 0.2s, box-shadow 0.2s",
});
const fieldIcon = (focused) => ({
  position:"absolute", left:13, top:"50%", transform:"translateY(-50%)",
  pointerEvents:"none", color: focused ? GREEN : LIGHT_GRAY, transition:"color 0.2s",
});

/* ── Icons ── */
function GradCapIcon() {
  return (
    <span className="role-ico" style={{ color:GREEN, display:"flex", transition:"color 0.18s" }}>
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 10 12 5 2 10l10 5 10-5Z"/><path d="M6 12v5c0 1 2.5 2.5 6 2.5s6-1.5 6-2.5v-5"/>
      </svg>
    </span>
  );
}
function BriefcaseIcon() {
  return (
    <span className="role-ico" style={{ color:GREEN, display:"flex", transition:"color 0.18s" }}>
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
      </svg>
    </span>
  );
}
