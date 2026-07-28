import { useState, useEffect, useRef } from "react";
import ccaLogo   from "./assets/cca_logo.svg";
import alangSeal from "./assets/Alangalang.png";

const GREEN      = "#3d6e01";
const DARK_GREEN = "#3d6e01";
const GOLD       = "#F5A800";
const WHITE      = "#FFFFFF";
const GRAY       = "#6B7280";
const BORDER     = "#D1D5DB";

/* ── Animated floating orbs for the left panel ─────────── */
const ORBS = [
  { w:220, h:220, top:"8%",   left:"10%",  dur:"7s",  del:"0s",   op:0.07 },
  { w:140, h:140, top:"65%",  left:"5%",   dur:"9s",  del:"1.5s", op:0.06 },
  { w:180, h:180, top:"45%",  left:"68%",  dur:"8s",  del:"0.8s", op:0.05 },
  { w:90,  h:90,  top:"80%",  left:"55%",  dur:"6s",  del:"2s",   op:0.09 },
  { w:60,  h:60,  top:"15%",  left:"75%",  dur:"5s",  del:"1s",   op:0.10 },
  { w:110, h:110, top:"30%",  left:"2%",   dur:"10s", del:"0.3s", op:0.06 },
];

export default function CCALoginPortal({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [focusU,   setFocusU]   = useState(false);
  const [focusP,   setFocusP]   = useState(false);
  // Show "Back to Time Attendance" only when the user actually arrived here FROM
  // the Time Attendance system; otherwise show "Go to Time Attendance". Uses the
  // document referrer so it works even though the two systems are different origins.
  const TA_URL = import.meta.env.VITE_TIME_ATTENDANCE_URL;
  const cameFromTA = (() => {
    try {
      if (!TA_URL || !document.referrer) return false;
      return new URL(document.referrer).host === new URL(TA_URL).host;
    } catch { return false; }
  })();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) { setError("Please fill in both fields."); return; }
    setLoading(true); setError("");
    try {
      const res  = await fetch(`${import.meta.env.VITE_API_URL}/api/erd/auth/login`, {
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

  const inputStyle = (focused) => ({
    width: "100%", padding: "11px 42px 11px 40px",
    border: `1.5px solid ${focused ? GREEN : BORDER}`,
    borderRadius: 8, fontSize: 13, color: "#111827",
    background: focused ? "#f2f9e8" : WHITE,
    outline: "none", boxSizing: "border-box",
    boxShadow: focused ? `0 0 0 3px rgba(46,125,50,0.13)` : "none",
    fontFamily: "inherit", transition: "border-color 0.2s, box-shadow 0.2s, background 0.2s",
  });

  return (
    <>
    <style>{`
      /* ── entrance ── */
      @keyframes slideInLeft  { from{opacity:0;transform:translateX(-40px)} to{opacity:1;transform:translateX(0)} }
      @keyframes slideInRight { from{opacity:0;transform:translateX(40px)}  to{opacity:1;transform:translateX(0)} }
      @keyframes fadeUp       { from{opacity:0;transform:translateY(20px)}  to{opacity:1;transform:translateY(0)} }
      /* ── continuous ── */
      @keyframes orbFloat     { 0%,100%{transform:translateY(0px) scale(1)} 50%{transform:translateY(-18px) scale(1.04)} }
      @keyframes shimmer      { 0%{background-position:-200% center} 100%{background-position:200% center} }
      @keyframes spin         { to{transform:rotate(360deg)} }
      @keyframes errorShake   { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-6px)} 40%{transform:translateX(6px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(4px)} }
      @keyframes pulseDot     { 0%,100%{opacity:0.6;transform:scale(1)} 50%{opacity:1;transform:scale(1.3)} }
      @keyframes lineGrow     { from{width:0} to{width:500px} }
      /* ── classes ── */
      .cca-left    { animation: slideInLeft  0.7s cubic-bezier(0.22,1,0.36,1) both; }
      .cca-right   { animation: slideInRight 0.7s 0.12s cubic-bezier(0.22,1,0.36,1) both; }
      .cca-tag     { animation: fadeUp 0.6s 0.5s both; }
      .cca-name1   { animation: fadeUp 0.6s 0.3s both; }
      .cca-name2   { animation: fadeUp 0.6s 0.4s both; }
      .cca-line    { animation: lineGrow 0.8s 0.6s cubic-bezier(0.22,1,0.36,1) both; }
      .form-field  { animation: fadeUp 0.5s both; }
      .login-btn:hover:not(:disabled){ background:${DARK_GREEN}!important; box-shadow:0 8px 24px rgba(27,94,32,0.42)!important; transform:translateY(-2px)!important; }
      .login-btn:active:not(:disabled){ transform:translateY(0)!important; }
      .pw-eye:hover{ color:${GREEN}!important; }
      .shimmer-bar {
        background: linear-gradient(90deg, ${GOLD} 0%, #ffe066 40%, ${GOLD} 60%, #c47f00 100%);
        background-size: 200% auto;
        animation: shimmer 2.4s linear infinite;
      }
    `}</style>

    <div style={{ display:"flex", height:"100vh", overflow:"hidden", fontFamily:"system-ui,-apple-system,sans-serif" }}>

      {/* ════════════ LEFT PANEL ════════════ */}
      <div className="cca-left" style={{
        flex: "0 0 65%",
        background: WHITE,
        display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
        position:"relative", overflow:"hidden", padding:"40px 60px",
      }}>

        {/* Animated orbs */}
        {ORBS.map((o,i) => (
          <div key={i} style={{
            position:"absolute", top:o.top, left:o.left,
            width:o.w, height:o.h, borderRadius:"50%",
            background:"rgba(46,125,50,0.07)",
            animation:`orbFloat ${o.dur} ${o.del} ease-in-out infinite`,
            pointerEvents:"none",
          }} />
        ))}

        {/* Dot grid */}
        <DotPattern />

        {/* ── Main brand block ── */}
        <div style={{ display:"flex",flexDirection:"column",alignItems:"center",position:"relative",zIndex:2,marginTop:"-230px" }}>
          <img src={ccaLogo} alt="CCA" style={{ width:220,height:220,objectFit:"contain",filter:"drop-shadow(0 8px 24px rgba(0,0,0,0.12))" }} />
          <div style={{ marginTop:-20,textAlign:"center" }}>
            <div className="cca-name1" style={{ fontSize:38,letterSpacing:10,textTransform:"uppercase",color:GRAY,fontWeight:700,marginBottom:12 }}>Community College of</div>
            <div className="cca-name2" style={{ fontSize:112,fontWeight:900,color:GOLD,letterSpacing:4,textTransform:"uppercase",textShadow:"0 2px 12px rgba(0,0,0,0.10)",lineHeight:1 }}>Alangalang</div>
            <div className="cca-line shimmer-bar" style={{ height:4,width:500,borderRadius:2,margin:"18px auto 0" }} />

            {/* Core values */}
            <div style={{ marginTop:64, display:"inline-flex", alignItems:"center", gap:0 }}>
              {["Innovation","Integrity","Inclusivity","Excellence"].map((val, i, arr) => (
                <span key={val} style={{ display:"flex", alignItems:"center" }}>
                  <span style={{
                    fontSize:13, fontWeight:700, color:DARK_GREEN,
                    letterSpacing:2, textTransform:"uppercase",
                    padding:"0 20px",
                  }}
                  onMouseOver={e => e.currentTarget.style.color = GOLD}
                  onMouseOut={e  => e.currentTarget.style.color = DARK_GREEN}
                  >{val}</span>
                  {i < arr.length - 1 && (
                    <span style={{ width:1, height:18, background:GOLD, opacity:0.7, display:"inline-block" }} />
                  )}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ════════════ RIGHT PANEL ════════════ */}
      <div className="cca-right" style={{
        flex: 1,
        background: `linear-gradient(160deg, #eaf2d9 0%, #f1f8e9 50%, #ffffff 100%)`,
        display:"flex", flexDirection:"column",
        alignItems:"stretch", justifyContent:"stretch",
        position:"relative", minWidth:0, overflow:"hidden",
      }}>

        {/* Decorative blobs */}
        <div style={{ position:"absolute",top:"-40px",right:"-40px",width:180,height:180,borderRadius:"50%",background:"rgba(46,125,50,0.06)",pointerEvents:"none" }} />
        <div style={{ position:"absolute",bottom:"-60px",left:"-30px",width:200,height:200,borderRadius:"50%",background:"rgba(245,168,0,0.05)",pointerEvents:"none" }} />

        {/* Dot pattern */}
        <div style={{ position:"absolute",inset:0,backgroundImage:`radial-gradient(circle, rgba(46,125,50,0.07) 1.2px, transparent 1.2px)`,backgroundSize:"22px 22px",pointerEvents:"none" }} />

        {/* Full-height glassmorphism card */}
        <div style={{
          flex:1,
          background:"rgba(255,255,255,0.75)",
          backdropFilter:"blur(18px)",
          WebkitBackdropFilter:"blur(18px)",
          border:"none",
          borderLeft:"1px solid rgba(255,255,255,0.90)",
          boxShadow:"-4px 0 24px rgba(27,94,32,0.07)",
          padding:"0 32px",
          position:"relative", zIndex:1,
          display:"flex", flexDirection:"column", justifyContent:"center",
        }}>

          {/* Top shimmer accent */}
          <div style={{ position:"absolute",top:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${GOLD},${GREEN},${GOLD})`,backgroundSize:"200% auto",animation:"shimmer 2.4s linear infinite" }} />

          {/* Heading */}
          <div style={{ textAlign:"center",marginBottom:20 }}>
            <div style={{ fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase",color:GREEN,marginBottom:5,whiteSpace:"nowrap" }}>Education Management Information System</div>
            <div style={{ fontSize:20,fontWeight:900,color:DARK_GREEN,marginBottom:3,letterSpacing:0.3 }}>Welcome Back 👋</div>
            <div style={{ fontSize:11,color:GRAY }}>Sign in to continue to your account</div>
          </div>

          <form onSubmit={handleSubmit} style={{ display:"flex",flexDirection:"column",gap:0,width:"100%",maxWidth:280,margin:"0 auto" }}>

            {error && (
              <div style={{ marginBottom:12,padding:"8px 12px",background:"#FEF2F2",border:"1px solid #FCA5A5",borderRadius:7,color:"#991B1B",fontSize:11,fontWeight:600,display:"flex",alignItems:"center",gap:7,animation:"errorShake 0.38s ease" }}>
                <span>⚠️</span><span>{error}</span>
              </div>
            )}

            {/* Username — floating label box */}
            <div style={{ marginBottom:20, position:"relative" }}>
              <div style={{
                position:"relative",
                border:`1.8px solid ${focusU ? GREEN : username ? DARK_GREEN : BORDER}`,
                borderRadius:10,
                background: WHITE,
                transition:"border-color 0.2s, box-shadow 0.2s",
                boxShadow: focusU ? `0 0 0 3px rgba(46,125,50,0.13)` : "none",
              }}>
                {/* Floating label */}
                <label style={{
                  position:"absolute", left:36, top:"50%",
                  transform: (focusU || username) ? "translateY(-50%) scale(0.82)" : "translateY(-50%)",
                  top: (focusU || username) ? 0 : "50%",
                  transformOrigin:"left center",
                  fontSize:13, fontWeight:600,
                  color: focusU ? GREEN : username ? DARK_GREEN : "#9CA3AF",
                  pointerEvents:"none", transition:"all 0.18s ease",
                  background: WHITE, padding:"0 4px", lineHeight:1,
                  whiteSpace:"nowrap",
                }}>Username</label>
                {/* Icon */}
                <span style={{ position:"absolute",left:11,top:"50%",transform:"translateY(-50%)",pointerEvents:"none",color:focusU?GREEN:"#9CA3AF",transition:"color 0.2s" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                </span>
                <input type="text" autoComplete="username" value={username}
                  onChange={e=>{setUsername(e.target.value);setError("");}}
                  onFocus={()=>setFocusU(true)} onBlur={()=>setFocusU(false)}
                  style={{ width:"100%", padding:"14px 40px 6px 36px", border:"none", borderRadius:10, fontSize:13, color:"#111827", background:"transparent", outline:"none", boxSizing:"border-box", fontFamily:"inherit" }}
                  disabled={loading} />
              </div>
            </div>

            {/* Password — floating label box */}
            <div style={{ marginBottom:22, position:"relative" }}>
              <div style={{
                position:"relative",
                border:`1.8px solid ${focusP ? GREEN : password ? DARK_GREEN : BORDER}`,
                borderRadius:10,
                background: WHITE,
                transition:"border-color 0.2s, box-shadow 0.2s",
                boxShadow: focusP ? `0 0 0 3px rgba(46,125,50,0.13)` : "none",
              }}>
                {/* Floating label */}
                <label style={{
                  position:"absolute", left:36, top:"50%",
                  transform: (focusP || password) ? "translateY(-50%) scale(0.82)" : "translateY(-50%)",
                  top: (focusP || password) ? 0 : "50%",
                  transformOrigin:"left center",
                  fontSize:13, fontWeight:600,
                  color: focusP ? GREEN : password ? DARK_GREEN : "#9CA3AF",
                  pointerEvents:"none", transition:"all 0.18s ease",
                  background: WHITE, padding:"0 4px", lineHeight:1,
                  whiteSpace:"nowrap",
                }}>Password</label>
                {/* Lock icon */}
                <span style={{ position:"absolute",left:11,top:"50%",transform:"translateY(-50%)",pointerEvents:"none",color:focusP?GREEN:"#9CA3AF",transition:"color 0.2s" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
                </span>
                <input type={showPw?"text":"password"} autoComplete="current-password" value={password}
                  onChange={e=>{setPassword(e.target.value);setError("");}}
                  onFocus={()=>setFocusP(true)} onBlur={()=>setFocusP(false)}
                  style={{ width:"100%", padding:"14px 40px 6px 36px", border:"none", borderRadius:10, fontSize:13, color:"#111827", background:"transparent", outline:"none", boxSizing:"border-box", fontFamily:"inherit" }}
                  disabled={loading} />
                {/* Eye toggle */}
                <button type="button" className="pw-eye" onClick={()=>setShowPw(p=>!p)} tabIndex={-1}
                  style={{ position:"absolute",right:11,top:"50%",transform:"translateY(-50%)",border:"none",background:"none",cursor:"pointer",color:"#9CA3AF",padding:"2px 4px",lineHeight:1,transition:"color 0.15s" }}>
                  {showPw
                    ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
              </div>
            </div>

            <button type="submit" className="login-btn" disabled={loading} style={{
              width:"100%", padding:"11px",
              background: loading ? "#9CA3AF" : `linear-gradient(135deg,${DARK_GREEN},${GREEN})`,
              color:WHITE, border:"none", borderRadius:9,
              fontSize:13, fontWeight:800, letterSpacing:1,
              cursor: loading?"not-allowed":"pointer",
              boxShadow: loading?"none":"0 5px 18px rgba(27,94,32,0.32)",
              transition:"all 0.2s ease",
              display:"flex", alignItems:"center", justifyContent:"center", gap:8,
            }}>
              {loading
                ? <><span style={{ width:13,height:13,borderRadius:"50%",border:"2px solid rgba(255,255,255,0.35)",borderTopColor:WHITE,display:"inline-block",animation:"spin 0.75s linear infinite" }} />Signing in...</>
                : "Sign In →"
              }
            </button>

            {/* Go to / Back to Time Attendance System — URL via VITE_TIME_ATTENDANCE_URL */}
            {TA_URL && (
              <div style={{ display:"flex", justifyContent:"flex-end", width:"100%", marginTop:10 }}>
                <a href={TA_URL} style={{ display:"inline-flex", alignItems:"center", gap:6, fontSize:12, fontWeight:700, color:DARK_GREEN, textDecoration:"none", letterSpacing:0.3 }}>
                  {cameFromTA ? "← Back to Time Attendance" : "Go to Time Attendance"}
                  {!cameFromTA && (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                  )}
                </a>
              </div>
            )}

            {/* Developed by */}
            <div style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:8,marginTop:65,paddingTop:20,borderTop:`1px solid ${BORDER}` }}>
              <span style={{ fontSize:10,fontWeight:700,color:GRAY,letterSpacing:2,textTransform:"uppercase" }}>Developed by</span>
              <div style={{ display:"flex",alignItems:"center",gap:12 }}>
                <img src={alangSeal} alt="Alangalang Seal" style={{ width:48,height:48,borderRadius:"50%",objectFit:"cover",border:`2px solid ${BORDER}` }} />
                <div>
                  <div style={{ fontSize:15,fontWeight:800,color:DARK_GREEN,lineHeight:1.3 }}>Municipality of Alangalang</div>
                  <div style={{ fontSize:12,fontStyle:"italic",color:GRAY,lineHeight:1.3 }}>Leyte, Philippines</div>
                </div>
              </div>
            </div>
          </form>

          {/* Footer */}
          <div style={{ position:"absolute",bottom:14,left:0,right:0,textAlign:"center",fontSize:9,color:"#9CA3AF" }}>
            © {new Date().getFullYear()} Community College of Alangalang — All rights reserved
          </div>

          {/* Bottom shimmer accent */}
          <div style={{ position:"absolute",bottom:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${GREEN},${GOLD},${GREEN})`,backgroundSize:"200% auto",animation:"shimmer 2.4s linear infinite reverse" }} />
        </div>
      </div>

    </div>
    </>
  );
}

/* ── Dot grid ───────────────────────────────────────────── */
function DotGrid({ side }) {
  const dots = [];
  const cols = 16, rows = 24, gap = 26;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = c - cols / 2, cy = r - rows / 2;
      const dist = Math.sqrt(cx * cx * 0.5 + cy * cy);
      if (dist > 9) continue;
      const opacity = Math.max(0.02, 0.14 - dist * 0.014);
      dots.push(<circle key={`${r}-${c}`} cx={c * gap} cy={r * gap} r={2.2} fill={GREEN} opacity={opacity} />);
    }
  }
  const w = cols * gap, h = rows * gap;
  return (
    <svg style={{ position:"absolute",[side]:0,top:"50%",transform:"translateY(-50%)",width:430,height:640,zIndex:1,pointerEvents:"none" }} viewBox={`0 0 ${w} ${h}`}>
      {dots}
    </svg>
  );
}
function DotPattern() { return <><DotGrid side="left" /><DotGrid side="right" /></>; }
