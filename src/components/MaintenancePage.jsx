import maintenanceVideo from "../assets/System Under Maintenance.mp4";

const DARK_GREEN = "#3d6e01";

export default function MaintenancePage({ onLogout }) {
  return (
    <div style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh", overflow: "hidden", background: "#0d2817" }}>
      {/* Fullscreen maintenance video — 'contain' keeps the yellow/black border visible */}
      <video src={maintenanceVideo} autoPlay loop muted playsInline
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }} />

      {/* Log out button overlaid on the video */}
      {onLogout && (
        <button onClick={onLogout}
          style={{ position: "absolute", bottom: "36px", left: "50%", transform: "translateX(-50%)", padding: "11px 26px", background: DARK_GREEN, color: "#fff", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 700, cursor: "pointer", boxShadow: "0 6px 18px rgba(0,0,0,0.35)", zIndex: 2 }}>
          Log out
        </button>
      )}
    </div>
  );
}
