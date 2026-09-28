import { useEffect, useMemo, useState } from "react";
import { api, photoUrl } from "../../api/client";

const HARI = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const BULAN = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];

function today() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function sevenDaysAgo() {
  const d = new Date();
  d.setDate(d.getDate() - 6);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function fmtDate(iso) {
  const d = new Date(`${iso}T00:00:00`);
  return `${HARI[d.getDay()]}, ${d.getDate()} ${BULAN[d.getMonth()]}`;
}
function fmtTime(dt) {
  return new Date(dt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

export default function AdminDashboard() {
  const [from, setFrom] = useState(sevenDaysAgo());
  const [to, setTo] = useState(today());
  const [rows, setRows] = useState([]);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [expandRow, setExpandRow] = useState(null);

  const load = async () => {
    setError("");
    setLoading(true);
    try {
      const [att, usr] = await Promise.all([
        api.adminAttendances(`?date_from=${from}&date_to=${to}`),
        api.users(),
      ]);
      setRows(att);
      setUsers(usr);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const stats = useMemo(() => {
    const karyawan = users.filter((u) => u.role === "karyawan" && u.is_active);
    const totalMasuk = rows.filter((r) => r.tipe === "masuk").length;
    const totalPulang = rows.filter((r) => r.tipe === "pulang").length;
    const luarRadius = rows.filter((r) => r.di_luar_radius).length;
    return { karyawan: karyawan.length, totalMasuk, totalPulang, luarRadius };
  }, [rows, users]);

  const grouped = useMemo(() => {
    const map = {};
    rows.forEach((r) => {
      const day = String(r.waktu).slice(0, 10);
      (map[day] ||= []).push(r);
    });
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  }, [rows]);

  return (
    <div className="stack gap-5">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Karyawan Aktif", value: stats.karyawan, color: "bg-emerald-50 text-emerald-700" },
          { label: "Absen Masuk", value: stats.totalMasuk, color: "bg-sky-50 text-sky-700" },
          { label: "Absen Pulang", value: stats.totalPulang, color: "bg-violet-50 text-violet-700" },
          { label: "Luar Radius", value: stats.luarRadius, color: "bg-amber-50 text-amber-700" },
        ].map((s) => (
          <div key={s.label} className={`rounded-2xl p-4 ${s.color}`}>
            <div className="text-3xl font-bold">{s.value}</div>
            <div className="mt-1 text-xs font-semibold opacity-80">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="card">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="label">Dari</label>
            <input className="field w-auto" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="label">Sampai</label>
            <input className="field w-auto" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <button type="button" className="btn px-6" onClick={load} disabled={loading}>
            {loading ? "Memuat..." : "Filter"}
          </button>
        </div>
        {error && <div className="error mt-2">{error}</div>}
      </div>

      {/* Data per hari */}
      {grouped.length === 0 && !loading && (
        <div className="card muted text-center py-8">Tidak ada data absensi di rentang ini.</div>
      )}
      {grouped.map(([day, dayRows]) => {
        const isOpen = expandRow === day;
        const masukCount = dayRows.filter((r) => r.tipe === "masuk").length;
        const pulangCount = dayRows.filter((r) => r.tipe === "pulang").length;
        const luarCount = dayRows.filter((r) => r.di_luar_radius).length;
        return (
          <div key={day} className="card overflow-hidden p-0">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-stone-50 transition-colors"
              onClick={() => setExpandRow(isOpen ? null : day)}
            >
              <div>
                <div className="font-bold">{fmtDate(day)}</div>
                <div className="muted text-xs mt-0.5">{day}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="badge badge-ok text-[10px]">{masukCount} masuk</span>
                <span className="badge badge-warn text-[10px]">{pulangCount} pulang</span>
                {luarCount > 0 && <span className="badge badge-danger text-[10px]">{luarCount} luar</span>}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={`h-4 w-4 text-muted shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}>
                  <path d="M6 9l6 6 6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </button>

            {isOpen && (
              <div className="overflow-x-auto border-t border-line">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-stone-50">
                      <th className="px-4 py-2.5 font-semibold text-muted">Foto</th>
                      <th className="px-4 py-2.5 font-semibold text-muted">Karyawan</th>
                      <th className="px-4 py-2.5 font-semibold text-muted">Tipe</th>
                      <th className="px-4 py-2.5 font-semibold text-muted">Waktu</th>
                      <th className="px-4 py-2.5 font-semibold text-muted">Barang</th>
                      <th className="px-4 py-2.5 font-semibold text-muted">Lokasi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dayRows.map((r) => (
                      <tr key={r.id} className="border-t border-line align-top hover:bg-stone-50/50">
                        <td className="px-4 py-3">
                          <a href={photoUrl(r.foto_path)} target="_blank" rel="noreferrer">
                            <img className="thumb" src={photoUrl(r.foto_path)} alt="" />
                          </a>
                        </td>
                        <td className="px-4 py-3 font-medium">{r.user?.nama || r.user_id}</td>
                        <td className="px-4 py-3">
                          <span className={`badge text-[10px] ${r.tipe === "masuk" ? "badge-ok" : "badge-warn"}`}>
                            {r.tipe}
                          </span>
                        </td>
                        <td className="px-4 py-3 tabular-nums text-muted">{fmtTime(r.waktu)}</td>
                        <td className="px-4 py-3">{r.random_item?.nama_barang || "—"}</td>
                        <td className="px-4 py-3">
                          <div className="muted max-w-[220px] truncate">{r.alamat || `${r.latitude}, ${r.longitude}`}</div>
                          {r.di_luar_radius && (
                            <span className="badge badge-danger mt-1 text-[10px]">
                              ⚠ Luar radius {Math.round(r.jarak_meter || 0)}m
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
