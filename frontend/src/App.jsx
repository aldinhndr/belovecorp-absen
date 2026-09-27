import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { getStoredUser } from "./api/client";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Absen from "./pages/Absen";
import Kegiatan from "./pages/Kegiatan";
import Riwayat from "./pages/Riwayat";
import Jadwal from "./pages/Jadwal";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminItems from "./pages/admin/Items";
import AdminUsers from "./pages/admin/Users";
import AdminReport from "./pages/admin/Report";
import AdminSchedules from "./pages/admin/Schedules";
import AdminWorkHours from "./pages/admin/WorkHours";

function RequireAuth({ children, admin }) {
  const user = getStoredUser();
  if (!user) return <Navigate to="/login" replace />;
  if (admin && user.role !== "admin") return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const navigate = useNavigate();
  
  // Handle redirect from /login if already authenticated
  const storedUser = getStoredUser();
  if (storedUser) {
    // If we're on /login page but already authenticated, redirect to appropriate page
    if (window.location.pathname === '/login') {
      navigate(storedUser.role === "admin" ? "/admin" : "/", { replace: true });
    }
    // If we're on /admin or /admin/* pages but not admin, redirect to / (only once)
    if (storedUser.role !== "admin" && window.location.pathname.startsWith("/admin")) {
      navigate("/", { replace: true });
    }
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<Absen />} />
        <Route path="/kegiatan" element={<Kegiatan />} />
        <Route path="/jadwal" element={<Jadwal />} />
        <Route path="/riwayat" element={<Riwayat />} />
        <Route
          path="/admin"
          element={
            <RequireAuth admin>
              <AdminDashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/items"
          element={
            <RequireAuth admin>
              <AdminItems />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/users"
          element={
            <RequireAuth admin>
              <AdminUsers />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/laporan"
          element={
            <RequireAuth admin>
              <AdminReport />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/jadwal"
          element={
            <RequireAuth admin>
              <AdminSchedules />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/rekap-jam-kerja"
          element={
            <RequireAuth admin>
              <AdminWorkHours />
            </RequireAuth>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
