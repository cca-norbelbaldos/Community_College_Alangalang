import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import LoginPortal from "./CCALoginPortal";
import Dashboard from "./Dashboard";
import AppLoader from "./components/Apploader";
import ToastManager, { showToast } from "./components/Toast";
import MaintenancePage from "./components/MaintenancePage";

// Auto-logout after this many milliseconds of no activity.
const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export default function App() {
  const [user, setUser] = useState(() => {
    const saved = sessionStorage.getItem("cca_user");
    return saved ? JSON.parse(saved) : null;
  });

  // Global loading state
  const [isLoading, setIsLoading] = useState(true);

  // Maintenance mode — when ON, every non-administrator sees the maintenance screen.
  const [maintenance, setMaintenance] = useState(false);
  useEffect(() => {
    let active = true;
    const check = () => {
      fetch(`${import.meta.env.VITE_API_URL}/api/erd/maintenance`)
        .then(r => r.ok ? r.json() : { on: 0 })
        .then(d => { if (active) setMaintenance(!!d.on); })
        .catch(() => {});
    };
    check();
    const iv = setInterval(check, 15000);
    return () => { active = false; clearInterval(iv); };
  }, []);

  const isAdmin = String(user?.role || "").toLowerCase() === "administrator";

  // Trigger loader on initialization refresh (Optimized to be faster)
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 450); 
    return () => clearTimeout(timer);
  }, []);

  const handleLogin = (userData) => {
    setIsLoading(true);
    sessionStorage.setItem("cca_user", JSON.stringify(userData));
    // Always land on Overview after login — clear any previously stored page
    sessionStorage.removeItem("cca_dashboard_active_view");
    setUser(userData);

    setTimeout(() => setIsLoading(false), 450);
  };

  const handleLogout = () => {
    setIsLoading(true);
    sessionStorage.removeItem("cca_user");
    setUser(null);

    setTimeout(() => setIsLoading(false), 450);
  };

  // Session timeout — auto-logout after 5 minutes of no activity.
  useEffect(() => {
    if (!user) return;
    let timer;
    const logoutForIdle = () => {
      showToast("You've been logged out due to 5 minutes of inactivity.", "warning");
      handleLogout();
    };
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(logoutForIdle, IDLE_TIMEOUT_MS);
    };
    const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"];
    events.forEach(e => window.addEventListener(e, reset, { passive: true }));
    reset(); // start the countdown
    return () => { clearTimeout(timer); events.forEach(e => window.removeEventListener(e, reset)); };
  }, [user]);

  // Not logged in layout (paints screen, overlays transparent loader if active)
  if (!user) {
    return (
      <BrowserRouter>
        <div style={{ position: "relative", minHeight: "100vh" }}>
          {isLoading && <AppLoader />}
          <ToastManager />
          <Routes>
            <Route path="*" element={<LoginPortal onLogin={handleLogin} />} />
          </Routes>
        </div>
      </BrowserRouter>
    );
  }

  // Maintenance mode — non-administrators are locked out until it's turned off.
  if (maintenance && !isAdmin) {
    return (
      <div style={{ position: "relative", minHeight: "100vh" }}>
        <ToastManager />
        <MaintenancePage onLogout={handleLogout} />
      </div>
    );
  }

  // Logged in layout (paints dashboard, overlays transparent loader if active)
  return (
    <BrowserRouter>
      <div style={{ position: "relative", minHeight: "100vh" }}>
        {isLoading && <AppLoader />}
        <ToastManager />
        <Routes>
          <Route
            path="*"
            element={
              <Dashboard 
                user={user} 
                onLogout={handleLogout} 
                setIsLoading={setIsLoading} 
              />
            }
          />
        </Routes>
      </div>
    </BrowserRouter>
  );
}