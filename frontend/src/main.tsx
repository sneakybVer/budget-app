import React from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom"
import Progress from "./pages/Progress"
import Forecast from "./pages/Forecast"
import Settings from "./pages/Settings"
import "./styles.css"

function App() {
  return (
    <BrowserRouter>
      <header className="topbar">
        <span className="topbar-brand">Savings Tracker</span>
        <nav>
          <NavLink to="/progress" className={({ isActive }) => isActive ? "active" : ""}>
            Progress
          </NavLink>
          <NavLink to="/forecast" className={({ isActive }) => isActive ? "active" : ""}>
            Forecast
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => isActive ? "active" : ""}>
            Settings
          </NavLink>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Progress />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/forecast" element={<Forecast />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}

createRoot(document.getElementById("root")!).render(<App />)
