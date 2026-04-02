import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

import Login from "./pages/Login.jsx";
import Signup from "./pages/signup.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Inventory from "./pages/Inventory.jsx";
import Udhaar from "./pages/Udhaar.jsx";
import Transactions from "./pages/Transactions.jsx";
import Loan from "./pages/Loan.jsx";
import SettingsPage from "./pages/Settings.jsx";
import Layout from "./components/sidebar.jsx";
function CommingSoon({ title }) {
  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>{title}</h1>
      <p style={{ color: "#64748b" }}>Page not implemented yet.</p>
    </div>
  );
}
function NotFound() {
  return <CommingSoon title="Not Found" />
}

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Default */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Auth (no sidebar) */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Main app (with sidebar) */}
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/udhaar" element={<Udhaar />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/loans" element={<Loan />} />
          <Route path="/settings" element={<SettingsPage />} />

          {/* Back-compat redirects */}
          <Route path="/loan" element={<Navigate to="/loans" replace />} />
          <Route path="/transaction" element={<Navigate to="/transactions" replace />} />
          <Route path="/setting" element={<Navigate to="/settings" replace />} />
        </Route>

        {/* 404 */}
        <Route path='*' element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App