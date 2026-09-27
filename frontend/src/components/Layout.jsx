import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { clearSession, getStoredUser } from "../api/client";
import logoBelove from "../assets/belovecorp.png";

const NAV_LINKS = [
  { to: "/", label: "Absen", end: true },
  { to: "/kegiatan", label: "Kegiatan" },
  { to: "/jadwal", label: "Jadwal" },
  { to: "/riwayat", label: "Riwayat" },
];

const ADMIN_LINKS = [
  { to: "/admin", label: "Dashboard", end: true },
  { to: "/admin/laporan", label: "Laporan" },
  { to: "/admin/rekap-jam-kerja", label: "Rekap Jam" },
  { to: "/admin/jadwal", label: "Jadwal" },
  { to: "/admin/items", label: "Barang" },
  { to: "/admin/users", label: "Karyawan" },
];

const TAB_ICONS = {
  "/": (
    <path d="M4 11.5 12 4l8 7.5M6 10v9a1 1 0 0 0 1 1h4v-6h2v6h4a1 1 0 0 0 1-1v-9" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  ),
  "/kegiatan": (
    <path d="M8 4h8a2 2 0 0 1 2 2v14l-6-3-6 3V6a2 2 0 0 1 2-2Z" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  ),
  "/riwayat": (
    <path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5M12 8v5l3 2" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  ),
  "/admin": (
    <path d="M4 21V9l8-6 8 6v12h-5v-7H9v7H4Z" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  ),
  "/jadwal": (
    <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  ),
  "/admin/jadwal": (
    <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  ),
  "/admin/rekap-jam-kerja": (
    <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  ),
  "/admin/laporan": (
    <path d="M9 17V9m3 8V5m3 12v-6M5 21h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2Z" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  ),
  "/admin/items": (
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z M3.27 6.96 12 12.01l8.73-5.05 M12 22.08V12" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  ),
  "/admin/users": (
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  ),
};

function TabIcon({ to }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5">
      {TAB_ICONS[to] || <circle cx="12" cy="12" r="8" strokeWidth="1.8" />}
    </svg>
  );
}

export default function Layout() {
  const user = getStoredUser();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = user?.role === "admin";
  const inAdminArea = isAdmin && location.pathname.startsWith("/admin");

  // Bottom nav: kalau di area admin → tampilkan menu admin.
  // Kalau user biasa / admin di luar area admin → menu biasa.
  const bottomLinks = inAdminArea
    ? ADMIN_LINKS
    : isAdmin
    ? [...NAV_LINKS, { to: "/admin", label: "Admin", end: false }]
    : NAV_LINKS;

  const initial = user?.nama?.trim()?.[0]?.toUpperCase() || "?";
  const hour = new Date().getHours();
  const greeting =
    hour < 11 ? "Selamat pagi" : hour < 15 ? "Selamat siang" : hour < 18 ? "Selamat sore" : "Selamat malam";

  const logout = () => {
    clearSession();
    navigate("/login");
  };

  const maxW = inAdminArea ? "max-w-screen-lg" : "max-w-[480px]";

  return (
    <div className={`mx-auto min-h-dvh ${maxW} bg-neutral-50 pb-28 font-sans text-neutral-900`}>
      {/* ===== Header — 1 baris, minimalis ===== */}
      <div className="relative overflow-hidden rounded-b-[28px] bg-gradient-to-br from-[#Cf8085] via-[#Cf8085] to-[#663532] px-4 pb-6 pt-[calc(16px+env(safe-area-inset-top,0px))] text-white shadow-[0_10px_30px_-10px_rgba(102,53,50,0.45)]">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-40 w-40 rounded-full bg-white/5" />

        <div className="relative flex items-center justify-between gap-3">
          {/* Kiri: avatar + greeting */}
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-base font-bold text-[#663532] shadow-md shadow-[#663532]/20 ring-2 ring-white/30">
              {initial}
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#EBC5C4]">
                {greeting}
              </div>
              <div className="truncate text-[1.05rem] font-bold leading-tight text-white">
                {user?.nama}
              </div>
            </div>
          </div>

          {/* Kanan: logo + logout */}
          <div className="flex shrink-0 items-center gap-2">
            <img
              src={logoBelove}
              alt="Belove Corp"
              className="h-6 w-auto object-contain brightness-0 invert"
            />
            <button
              type="button"
              onClick={logout}
              aria-label="Keluar"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-white/20 backdrop-blur-sm transition-all duration-200 hover:bg-white/25 active:scale-95"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-4 w-4" strokeWidth={1.8}>
                <path
                  d="M15 17l5-5-5-5M20 12H9M12 19H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ===== Page content ===== */}
      <div className="px-4 pb-4 pt-5">
        <Outlet />
      </div>

      {/* ===== Bottom navigation ===== */}
      <div className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[480px] px-3 pb-[calc(10px+env(safe-area-inset-bottom,0px))] pt-2">
        <div className="rounded-2xl border border-neutral-100 bg-white/95 shadow-[0_-4px_24px_-8px_rgba(0,0,0,0.12)] backdrop-blur-lg">
          <div className="flex justify-around">
            {bottomLinks.map(({ to, label, end }) => {
              const active =
                to === "/" || to === "/admin"
                  ? location.pathname === to
                  : location.pathname.startsWith(to);
              return (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className="group flex flex-1 flex-col items-center gap-1 px-1 py-2"
                >
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200 ${
                      active
                        ? "bg-gradient-to-br from-[#Cf8085] to-[#663532] text-white shadow-md shadow-[#663532]/30"
                        : "text-neutral-400 group-hover:bg-[#EBC5C4]/40 group-hover:text-[#663532]"
                    }`}
                  >
                    <TabIcon to={to} />
                  </span>
                  <span
                    className={`text-[0.65rem] font-semibold transition-colors ${
                      active ? "text-[#663532]" : "text-neutral-400 group-hover:text-[#663532]"
                    }`}
                  >
                    {label}
                  </span>
                </NavLink>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}