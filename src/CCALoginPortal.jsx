import { useState } from "react";
import ccaLogo      from "./assets/cca_logo.jpg";
import alangSeal    from "./assets/Alangalang.png";
import ccaBg        from "./assets/cca_bg.png";

const GREEN      = "#3A7D3A";
const DARK_GREEN = "#2D6A2D";
const GOLD       = "#D4A017";
const NAVY       = "#1B3A6B";
const WHITE      = "#FFFFFF";
const GRAY       = "#6B7280";
const BORDER     = "#D1D5DB";

/* ─────────────────────────────────────────────────────────
   ROOT — switches between landing and login
───────────────────────────────────────────────────────── */
export default function CCALoginPortal({ onLogin }) {
  const [view, setView] = useState("landing");
  return view === "landing"
    ? <LandingPage onGoLogin={() => setView("login")} />
    : <LoginPage   onLogin={onLogin} onBack={() => setView("landing")} />;
}

/* ─────────────────────────────────────────────────────────
   LANDING PAGE  (mirrors eLGU layout)
───────────────────────────────────────────────────────── */
function LandingPage({ onGoLogin }) {
  return (
    <div style={{
      height: "100vh",
      overflow: "hidden",
      background: WHITE,
      backgroundColor: "#FFFFFF",
      fontFamily: "system-ui, sans-serif",
      display: "flex",
      flexDirection: "column",
      position: "relative",
      overflowX: "hidden",
    }}>



      {/* Accent stripe top */}
      <div style={{ position:"absolute",top:0,left:0,right:0,height:4,background:`linear-gradient(90deg,${DARK_GREEN},${GOLD},${GREEN})`,zIndex:3 }} />

      {/* Dot grids both sides */}
      <DotPattern />

      {/* ── NAV BAR ───────────────────────────────────────── */}
      <nav style={{
        position: "relative", zIndex: 2,
        display: "flex", alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 36px",
        background: "#FFFFFF",
        borderBottom: "none",
        boxShadow: "none",
      }}>
        {/* Left branding */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/* Seal with gold ring */}
          <img src={alangSeal} alt="Seal"
            style={{ width: 60, height: 60, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
          {/* Text block */}
          <div style={{ borderLeft: "3px solid " + GOLD, paddingLeft: 14 }}>
            <div style={{
              fontWeight: 900, fontSize: 20, color: DARK_GREEN,
              lineHeight: 1.15, letterSpacing: 0.3,
              textShadow: "0 1px 2px rgba(0,0,0,0.07)",
            }}>
              Municipality of Alangalang
            </div>
            <div style={{
              fontFamily: "'Times New Roman', Times, serif",
              fontStyle: "italic", fontSize: 15,
              color: "#111827", marginTop: 2, fontWeight: 600,
            }}>
              Leyte
            </div>
          </div>
        </div>

        {/* Right — LOGIN only */}
        <button
          onClick={onGoLogin}
          style={{
            padding: "9px 30px",
            background: GREEN,
            color: WHITE,
            border: "none",
            borderRadius: 4,
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: 1,
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(58,125,58,0.30)",
            transition: "background 0.15s",
          }}
          onMouseOver={e => e.currentTarget.style.background = DARK_GREEN}
          onMouseOut={e  => e.currentTarget.style.background = GREEN}
        >
          LOGIN
        </button>
      </nav>

      {/* Content spacer — background image centered between nav and footer */}
      <div style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundImage: `url(${ccaBg})`,
        backgroundSize: "80%",
        backgroundPosition: "center 55%",
        backgroundRepeat: "no-repeat",
      }} />

      {/* Footer — eLGU-style full-width */}
      <footer style={{
        position: "relative", zIndex: 2,
        marginTop: "auto",
        background: "rgba(255,255,255,0.92)",
        backdropFilter: "blur(8px)",
        borderTop: "3px solid " + GREEN,
      }}>
        {/* Main footer content — Logo | Mission | Vision | Class Hours+Address | Contact */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "140px 1fr 1fr 1fr 1fr",
          gap: "0",
          padding: "14px 48px",
          alignItems: "start",
        }}>

          {/* Col 1 — CCA Logo */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, paddingRight: 20, borderRight: "1px solid " + BORDER }}>
            <img src={ccaLogo} alt="CCA Logo"
              style={{ width: 160, height: 160, borderRadius: "50%", objectFit: "cover", border: "none" }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 10, color: GRAY, marginTop: 2 }}>Data Privacy Statement</div>
              <div style={{ fontSize: 10, color: GRAY, marginTop: 2 }}>Terms of Service</div>
            </div>
          </div>

          {/* Col 2 — Mission */}
          <div style={{ padding: "0 20px", borderRight: "1px solid " + BORDER }}>
            <div style={{ fontWeight: 800, fontSize: 11, color: "#111827", marginBottom: 5 }}>MISSION:</div>
            <div style={{ fontSize: 10, color: "#374151", lineHeight: 1.6 }}>
              Community College of Alangalang commits to develop lifelong learners and values-driven professionals through student-centered and gender-responsive education, promoting excellence in the fields of education, health, environmental sustainability, security, management, accounting, information communication and technology. It upholds quality through competent, qualified, and values-oriented faculty and administrators, while delivering technology-driven, innovative, outcomes-based, and research-based programs that provide accessible and responsive education to effectively address local, national, and global challenges.
            </div>
          </div>

          {/* Col 3 — Vision */}
          <div style={{ padding: "0 20px", borderRight: "1px solid " + BORDER }}>
            <div style={{ fontWeight: 800, fontSize: 11, color: "#111827", marginBottom: 5 }}>VISION:</div>
            <div style={{ fontSize: 10, color: "#374151", lineHeight: 1.6 }}>
              An inclusive, values-driven community college promoting quality education fostering sustainable development and transformative social change.
            </div>
          </div>

          {/* Col 4 — Class Hours + Address */}
          <div style={{ padding: "0 20px", borderRight: "1px solid " + BORDER }}>
            <div style={{ fontWeight: 800, fontSize: 11, color: "#111827", marginBottom: 5 }}>CLASS HOURS:</div>
            <div style={{ fontSize: 10, color: "#374151", marginBottom: 2 }}>Monday – Friday</div>
            <div style={{ fontSize: 10, color: "#374151", fontWeight: 700, marginBottom: 10 }}>07:00AM – 05:00PM</div>
            <div style={{ fontWeight: 800, fontSize: 11, color: "#111827", marginBottom: 5 }}>ADDRESS:</div>
            <div style={{ fontSize: 10, color: "#374151", lineHeight: 1.6 }}>
              Community College of Alangalang,<br />Leyte, Philippines
            </div>
          </div>

          {/* Col 5 — Contact Information */}
          <div style={{ padding: "0 0 0 20px" }}>
            <div style={{ fontWeight: 800, fontSize: 11, color: "#111827", marginBottom: 5 }}>CONTACT INFORMATION:</div>
            <div style={{ fontSize: 10, color: GRAY, fontWeight: 700 }}>Mobile Number:</div>
            <div style={{ fontSize: 10, color: "#374151", marginBottom: 2 }}>+63-(0)919-065-1703</div>
            <div style={{ fontSize: 10, color: "#374151", marginBottom: 8 }}>+63-(0)920-975-0584</div>
            <div style={{ fontSize: 10, color: GRAY, fontWeight: 700 }}>Email:</div>
            <div style={{ fontSize: 10, color: GREEN }}>communitycollegeofalangalang@gmail.com</div>
            <div style={{ fontSize: 10, color: GRAY, fontWeight: 700 }}>Facebook Page:</div>
            <div style={{ fontSize: 10, color: GREEN }}>Community College of Alangalang</div>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{
          borderTop: "1px solid " + BORDER,
          padding: "10px 48px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          background: DARK_GREEN,
        }}>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.85)", fontWeight: 600 }}>
            © {new Date().getFullYear()} Community College of Alangalang — All Rights Reserved
          </span>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.65)" }}>
            Developed by CCA - Education Management Information System
          </span>
        </div>
      </footer>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   DOT GRID PATTERN  (both sides)
───────────────────────────────────────────────────────── */
function DotGrid({ side }) {
  const dots = [];
  const cols = 18, rows = 26, gap = 24;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = c - cols / 2, cy = r - rows / 2;
      const dist = Math.sqrt(cx * cx * 0.6 + cy * cy);
      if (dist > 9) continue;
      const opacity = Math.max(0.05, 0.20 - dist * 0.018);
      dots.push(
        <circle
          key={`${r}-${c}`}
          cx={c * gap} cy={r * gap} r={2.5}
          fill={GOLD} opacity={opacity}
        />
      );
    }
  }
  const w = cols * gap, h = rows * gap;
  return (
    <svg
      style={{
        position: "absolute",
        [side]: 0,
        top: "50%",
        transform: "translateY(-50%)",
        width: 460, height: 640,
        zIndex: 1, pointerEvents: "none",
        opacity: 0.85,
      }}
      viewBox={`0 0 ${w} ${h}`}
    >
      {dots}
    </svg>
  );
}

function DotPattern() {
  return (
    <>
      <DotGrid side="left" />
      <DotGrid side="right" />
    </>
  );
}

/* ─────────────────────────────────────────────────────────
   LOGIN PAGE  (existing polished card)
───────────────────────────────────────────────────────── */
function LoginPage({ onLogin, onBack }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [focusU,   setFocusU]   = useState(false);
  const [focusP,   setFocusP]   = useState(false);

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
    width: "100%", padding: "11px 42px 11px 38px",
    border: `1.5px solid ${focused ? GREEN : BORDER}`,
    borderRadius: 10, fontSize: 14, color: "#111827",
    background: WHITE, outline: "none", boxSizing: "border-box",
    boxShadow: focused ? "0 0 0 3px rgba(46,125,50,0.13)" : "none",
    fontFamily: "inherit", transition: "border-color 0.18s, box-shadow 0.18s",
  });

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      minHeight: "100vh",
      background: `linear-gradient(145deg, #E8F5E9 0%, #F3F4F6 50%, #FFF8E1 100%)`,
      fontFamily: "system-ui, sans-serif", padding: 16,
      position: "relative", overflow: "hidden",
    }}>

      {/* Back button */}
      <button
        onClick={onBack}
        style={{
          position: "absolute", top: 20, left: 24,
          background: "none", border: "1px solid #D1D5DB",
          borderRadius: 6, padding: "6px 14px",
          fontSize: 13, color: GRAY, cursor: "pointer",
          display: "flex", alignItems: "center", gap: 6,
          fontFamily: "inherit", fontWeight: 600,
        }}
      >← Back</button>

      {/* Blobs */}
      <div style={{ position:"absolute",top:"-100px",left:"-100px",width:340,height:340,borderRadius:"50%",background:"rgba(46,125,50,0.06)",pointerEvents:"none" }} />
      <div style={{ position:"absolute",bottom:"-120px",right:"-80px",width:400,height:400,borderRadius:"50%",background:"rgba(245,168,0,0.05)",pointerEvents:"none" }} />

      <style>{`
        @keyframes cardEntrance { from{opacity:0;transform:translateY(28px) scale(0.97)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes errorShake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-6px)} 40%{transform:translateX(6px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(4px)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        .login-submit-btn:hover:not(:disabled){ background:linear-gradient(135deg,#1B5E20,#155218)!important; box-shadow:0 6px 22px rgba(27,94,32,0.38)!important; transform:translateY(-1px)!important; }
        .login-submit-btn:active:not(:disabled){ transform:translateY(0)!important; }
        .pw-toggle-btn:hover{ color:#2E7D32!important; }
      `}</style>

      {/* Card */}
      <div style={{
        width:"100%", maxWidth:420,
        background:WHITE, borderRadius:20,
        boxShadow:"0 24px 64px -12px rgba(0,0,0,0.15)",
        overflow:"hidden",
        animation:"cardEntrance 0.42s cubic-bezier(0.34,1.56,0.64,1) forwards",
        position:"relative", zIndex:1,
      }}>

        {/* Header */}
        <div style={{
          background:`linear-gradient(135deg,${DARK_GREEN} 0%,${GREEN} 55%,#43A047 85%,#4CAF50 100%)`,
          padding:"30px 36px 24px", textAlign:"center", color:WHITE,
          position:"relative", overflow:"hidden",
        }}>
          <div style={{ position:"absolute",top:"-30px",right:"-30px",width:180,height:180,borderRadius:"50%",background:"rgba(255,255,255,0.06)",pointerEvents:"none" }} />
          <div style={{ display:"flex",justifyContent:"center",marginBottom:14 }}>
            <div style={{ width:88,height:88,borderRadius:"50%",border:"3px solid rgba(255,255,255,0.55)",boxShadow:"0 4px 22px rgba(0,0,0,0.22),0 0 0 6px rgba(255,255,255,0.08)",overflow:"hidden",background:WHITE }}>
              <img src={ccaLogo} alt="CCA" style={{ width:"100%",height:"100%",objectFit:"cover" }} />
            </div>
          </div>
          <div style={{ fontSize:10,letterSpacing:4,textTransform:"uppercase",opacity:0.75,marginBottom:4 }}>Community College of</div>
          <div style={{ fontSize:22,fontWeight:800,letterSpacing:1.5 }}>ALANGALANG</div>
          <div style={{ display:"inline-flex",alignItems:"center",gap:6,marginTop:12,background:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.22)",borderRadius:20,padding:"5px 16px",fontSize:11,fontWeight:700,letterSpacing:0.5 }}>
            <span style={{ width:7,height:7,borderRadius:"50%",background:"#4ADE80",display:"inline-block",boxShadow:"0 0 6px #4ADE80" }} />
            Student Information System
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding:"28px 32px 32px" }}>
          <div style={{ marginBottom:20,fontSize:15,fontWeight:700,color:"#111827",textAlign:"center" }}>Sign in to your account</div>

          {error && (
            <div style={{ marginBottom:16,padding:"10px 14px",background:"#FEF2F2",border:"1px solid #FCA5A5",borderRadius:8,color:"#991B1B",fontSize:13,fontWeight:600,display:"flex",alignItems:"center",gap:8,animation:"errorShake 0.38s ease" }}>
              <span>⚠️</span><span>{error}</span>
            </div>
          )}

          <div style={{ marginBottom:16 }}>
            <label style={{ display:"block",fontSize:12,fontWeight:700,color:GRAY,marginBottom:6,letterSpacing:0.3 }}>USERNAME</label>
            <div style={{ position:"relative" }}>
              <span style={{ position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",fontSize:15,pointerEvents:"none" }}>👤</span>
              <input type="text" autoComplete="username" value={username}
                onChange={e=>{setUsername(e.target.value);setError("");}}
                onFocus={()=>setFocusU(true)} onBlur={()=>setFocusU(false)}
                placeholder="Enter your username" style={inputStyle(focusU)} disabled={loading} />
            </div>
          </div>

          <div style={{ marginBottom:24 }}>
            <label style={{ display:"block",fontSize:12,fontWeight:700,color:GRAY,marginBottom:6,letterSpacing:0.3 }}>PASSWORD</label>
            <div style={{ position:"relative" }}>
              <span style={{ position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",fontSize:15,pointerEvents:"none" }}>🔒</span>
              <input type={showPw?"text":"password"} autoComplete="current-password" value={password}
                onChange={e=>{setPassword(e.target.value);setError("");}}
                onFocus={()=>setFocusP(true)} onBlur={()=>setFocusP(false)}
                placeholder="Enter your password" style={inputStyle(focusP)} disabled={loading} />
              <button type="button" className="pw-toggle-btn" onClick={()=>setShowPw(p=>!p)} tabIndex={-1}
                style={{ position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",border:"none",background:"none",cursor:"pointer",fontSize:16,color:"#9CA3AF",padding:"2px 4px",lineHeight:1,transition:"color 0.15s" }}>
                {showPw?"🙈":"👁️"}
              </button>
            </div>
          </div>

          <button type="submit" className="login-submit-btn" disabled={loading} style={{
            width:"100%", padding:"13px",
            background:loading?"#9CA3AF":`linear-gradient(135deg,${DARK_GREEN} 0%,${GREEN} 100%)`,
            color:WHITE, border:"none", borderRadius:10, fontSize:15, fontWeight:800,
            cursor:loading?"not-allowed":"pointer",
            boxShadow:loading?"none":"0 4px 14px rgba(27,94,32,0.28)",
            transition:"background 0.18s,box-shadow 0.18s,transform 0.12s",
            display:"flex", alignItems:"center", justifyContent:"center", gap:8, letterSpacing:0.5,
          }}>
            {loading ? (
              <><span style={{ width:16,height:16,borderRadius:"50%",border:"2.5px solid rgba(255,255,255,0.35)",borderTopColor:WHITE,display:"inline-block",animation:"spin 0.75s linear infinite" }} />Signing in...</>
            ) : "Sign In"}
          </button>
        </form>

        {/* Footer */}
        <div style={{ padding:"14px 32px 20px",textAlign:"center",borderTop:`1px solid ${BORDER}`,background:"#FAFAFA" }}>
          <span style={{ fontSize:11,color:"#9CA3AF" }}>© {new Date().getFullYear()} Community College of Alangalang &nbsp;·&nbsp; All rights reserved</span>
        </div>
      </div>
    </div>
  );
}
