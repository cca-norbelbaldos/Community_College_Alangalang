import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import LoginPortal from "./CCALoginPortal";
import Dashboard from "./Dashboard";
import AppLoader from "./components/Apploader";
import ToastManager from "./components/Toast";

export default function App() {
  const [user, setUser] = useState(() => {
    const saved = sessionStorage.getItem("cca_user");
    return saved ? JSON.parse(saved) : null;
  });

  // Global loading state
  const [isLoading, setIsLoading] = useState(true);

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
    setUser(userData);
    
    setTimeout(() => setIsLoading(false), 450);
  };

  const handleLogout = () => {
    setIsLoading(true);
    sessionStorage.removeItem("cca_user");
    setUser(null);
    
    setTimeout(() => setIsLoading(false), 450);
  };

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