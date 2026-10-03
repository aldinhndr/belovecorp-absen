import { useEffect, useMemo, useState } from "react";
import { api } from "../../api/client";

const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

function today() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function weekAgo() {
  const d = new Date();
  d.setDate(d.getDate() - 6);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function fmtTime(t) {
  if (!t || t === "-") return "—";
  return t.slice(0, 5);
}

function fmtDuration(min) {
  if (!min || min === 0) return "00:00";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function getWeekRange(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  const day = d.getDay();
  const start = new Date(d);
  start.setDate(d.getDate() - day);
  const end = new Date(d);
  end.setDate(d.getDate() + (6 - day));
  const pad = (n) => String(n).padStart(2, "0");
  return {
    start: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`,
    end: `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`,
    label: `${pad(start.getDate())} ${BULAN[start.getMonth()]} - ${pad(end.getDate())} ${BULAN[end.getMonth()]} ${start.getFullYear()}`
  };
}

function getMonthRange(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const pad = (n) => String(n).padStart(2, "0");
  return {
    start: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`,
    end: `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`,
    label: `${BULAN[d.getMonth()]} ${d.getFullYear()}`
  };
}

function SummaryCard({ label, value, color }) {
  return (
    <div className={`rounded-2xl p-4 ${color} text-white shadow-lg`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="mt-1 text-xs font-semibold opacity-80">{label}</div>
    </div>
  );
}

function UserRow({ user, onClick, isExpanded, viewMode }) {
  return (
    <>
      <tr key={user.user_id} className="hover:bg-stone-50/50 cursor-pointer" onClick={onClick}>
        <td className="px-5 py-3 font-medium">{user.nama}</td>
        <td className="px-5 py-3">{user.total_hari_kerja} hari</td>
        <td className="px-5 py-3 font-bold tabular-nums text-[#663532]">{fmtDuration(user.total_jam_kerja_menit)}</td>
        <td className="px-5 py-3 text-right">
          <button type="button" className="text-xs font-semibold text-[#Cf8085] hover:text-[#663532] flex items-center justify-end gap-1">
            {isExpanded ? "Tutup" : "Detail"} <svg className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 9l6 6 6-6" /></svg>
          </button>
        </td>
      </tr>
      {isExpanded && (
        <tr key={`expanded-${user.user_id}`}>
          <td colSpan={4} className="px-0 py-0 border-0 bg-stone-50/30">
            <div className="p-4 border-t border-line">
              {viewMode === "harian" && <DailyDetail user={user} />}
              {viewMode === "mingguan" && <WeeklyDetail user={user} />}
              {viewMode === "bulanan" && <MonthlyDetail user={user} />}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function DailyDetail({ user }) {
  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 mb-4">
        <SummaryCard label="Total Jam Kerja" value={fmtDuration(user.total_jam_kerja_menit)} color="bg-[#EBC5C4] text-[#663532]" />
        <SummaryCard label="Hari Kerja" value={`${user.total_hari_kerja} hari`} color="bg-[#Cf8085] text-white" />
      </div>
      <h4 className="text-lg font-bold text-[#663532] mb-3">Detail Harian</h4>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-stone-50">
              <th className="px-4 py-3 font-semibold text-neutral-600">Tanggal</th>
              <th className="px-4 py-3 font-semibold text-neutral-600">Shift</th>
              <th className="px-4 py-3 font-semibold text-neutral-600">Masuk</th>
              <th className="px-4 py-3 font-semibold text-neutral-600">Pulang</th>
              <th className="px-4 py-3 font-semibold text-neutral-600">Jadwal</th>
              <th className="px-4 py-3 font-semibold text-neutral-600">Durasi</th>
              <th className="px-4 py-3 font-semibold text-neutral-600">Aktivitas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {user.detail_harian.map((d, i) => (
              <tr key={i} className="hover:bg-stone-50/50">
                <td className="px-4 py-3 font-medium">{d.hari}, {new Date(d.tanggal).toLocaleDateString("id-ID", {day:"2-digit",month:"short"})}</td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#EBC5C4]/40 px-2 py-0.5 text-[10px] font-semibold text-[#663532] ring-1 ring-[#EBC5C4]">
                    Shift {d.shift || 1}
                  </span>
                </td>
                <td className="px-4 py-3">{fmtTime(d.masuk)}</td>
                <td className="px-4 py-3">{fmtTime(d.pulang)}</td>
                <td className="px-4 py-3 text-xs text-neutral-500">{d.jadwal_masuk} – {d.jadwal_pulang}</td>
                <td className="px-4 py-3 font-semibold text-[#663532]">{fmtDuration(d.durasi_menit)}</td>
                <td className="px-4 py-3">
                  {d.aktivitas.length === 0 ? (
                    <span className="text-neutral-400 text-xs">—</span>
                  ) : (
                    <ul className="space-y-1">
                      {d.aktivitas.map((a, idx) => (
                        <li key={idx} className="flex items-center gap-1 text-xs text-neutral-700">
                          <span className="text-[#Cf8085]">{a.waktu}</span>
                          <span>{a.deskripsi}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function WeeklyDetail({ user }) {
  const weeklyData = useMemo(() => {
    const weeks = {};
    user.detail_harian.forEach(d => {
      const date = new Date(`${d.tanggal}T00:00:00`);
      const weekKey = `${date.getFullYear()}-W${String(Math.ceil((date.getDate() + date.getDay()) / 7)).padStart(2, "0")}`;
      if (!weeks[weekKey]) {
        const weekRange = getWeekRange(d.tanggal);
        weeks[weekKey] = { ...weekRange, hari_kerja: 0, total_menit: 0, days: [] };
      }
      if (d.masuk !== "-") {
        weeks[weekKey].hari_kerja++;
        weeks[weekKey].total_menit += d.durasi_menit;
      }
      weeks[weekKey].days.push(d);
    });
    return Object.values(weeks).sort((a, b) => a.start.localeCompare(b.start));
  }, [user.detail_harian]);

  return (
    <div>
      <h4 className="text-lg font-bold text-[#663532] mb-3">Rekap Mingguan</h4>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-stone-50">
              <th className="px-4 py-3 font-semibold text-neutral-600">Minggu</th>
              <th className="px-4 py-3 font-semibold text-neutral-600">Hari Kerja</th>
              <th className="px-4 py-3 font-semibold text-neutral-600">Total Jam</th>
              <th className="px-4 py-3 font-semibold text-neutral-600">Rata-rata/Hari</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {weeklyData.map((w, i) => (
              <tr key={i} className="hover:bg-stone-50/50">
                <td className="px-4 py-3 font-medium">{w.label}</td>
                <td className="px-4 py-3">{w.hari_kerja} hari</td>
                <td className="px-4 py-3 font-bold text-[#663532]">{fmtDuration(w.total_menit)}</td>
                <td className="px-4 py-3 text-neutral-600">{w.hari_kerja > 0 ? fmtDuration(Math.round(w.total_menit / w.hari_kerja)) : "00:00"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MonthlyDetail({ user }) {
  const monthlyData = useMemo(() => {
    const months = {};
    user.detail_harian.forEach(d => {
      const date = new Date(`${d.tanggal}T00:00:00`);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (!months[monthKey]) {
        months[monthKey] = { label: `${BULAN[date.getMonth()]} ${date.getFullYear()}`, hari_kerja: 0, total_menit: 0, days: [] };
      }
      if (d.masuk !== "-") {
        months[monthKey].hari_kerja++;
        months[monthKey].total_menit += d.durasi_menit;
      }
      months[monthKey].days.push(d);
    });
    return Object.values(months).sort((a, b) => a.label.localeCompare(b.label));
  }, [user.detail_harian]);

  return (
    <div>
      <h4 className="text-lg font-bold text-[#663532] mb-3">Rekap Bulanan</h4>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-stone-50">
              <th className="px-4 py-3 font-semibold text-neutral-600">Bulan</th>
              <th className="px-4 py-3 font-semibold text-neutral-600">Hari Kerja</th>
              <th className="px-4 py-3 font-semibold text-neutral-600">Total Jam</th>
              <th className="px-4 py-3 font-semibold text-neutral-600">Rata-rata/Hari</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {monthlyData.map((m, i) => (
              <tr key={i} className="hover:bg-stone-50/50">
                <td className="px-4 py-3 font-medium">{m.label}</td>
                <td className="px-4 py-3">{m.hari_kerja} hari</td>
                <td className="px-4 py-3 font-bold text-[#663532]">{fmtDuration(m.total_menit)}</td>
                <td className="px-4 py-3 text-neutral-600">{m.hari_kerja > 0 ? fmtDuration(Math.round(m.total_menit / m.hari_kerja)) : "00:00"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AdminWorkHours() {
  const [from, setFrom] = useState(weekAgo());
  const [to, setTo] = useState(today());
  const [recap, setRecap] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedUserId, setExpandedUserId] = useState(null);
  const [viewMode, setViewMode] = useState("harian");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.workHoursRecap(`?date_from=${from}&date_to=${to}`);
      setRecap(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [from, to]);

  const summary = useMemo(() => ({
    totalUsers: recap.length,
    totalWorkHours: recap.reduce((s, u) => s + (u.total_jam_kerja_menit || 0), 0),
  }), [recap]);

  const handleToggleExpand = (user) => {
    setExpandedUserId(expandedUserId === user.user_id ? null : user.user_id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-neutral-500">
          <svg className="animate-spin h-6 w-6 text-[#Cf8085]" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          Memuat rekap jam kerja...
        </div>
      </div>
    );
  }

  return (
    <div className="stack gap-6">
      <div className="rounded-2xl bg-gradient-to-br from-[#Cf8085] via-[#Cf8085] to-[#663532] p-5 text-white shadow-[0_10px_30px_-10px_rgba(102,53,50,0.4)]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 ring-1 ring-white/20 backdrop-blur-sm mb-2">
              <svg className="h-3 w-3 text-[#EBC5C4]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#EBC5C4]">Rekap Jam Kerja</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight md:text-2xl">Rekap Jam Kerja & Aktivitas</h1>
            <p className="mt-1 text-xs text-[#EBC5C4]">Periode: {new Date(from).toLocaleDateString("id-ID")} – {new Date(to).toLocaleDateString("id-ID")}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <input type="date" className="field w-auto bg-white/10 text-white border-white/30 placeholder-white/50 focus:border-white focus:bg-white/20" value={from} onChange={(e) => setFrom(e.target.value)} />
            <span className="text-white/50 self-center">s/d</span>
            <input type="date" className="field w-auto bg-white/10 text-white border-white/30 placeholder-white/50 focus:border-white focus:bg-white/20" value={to} onChange={(e) => setTo(e.target.value)} />
            <button className="btn bg-white/15 hover:bg-white/25 text-white border border-white/30 px-4 py-2" onClick={load}>Tampilkan</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
        <SummaryCard label="Total Karyawan" value={summary.totalUsers} color="bg-[#Cf8085]" />
        <SummaryCard label="Total Jam Kerja" value={fmtDuration(summary.totalWorkHours)} color="bg-[#663532]" />
      </div>

      {error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600 border border-red-100">{error}</div>}

      <div className="card overflow-hidden p-0">
        <div className="px-5 py-4 bg-stone-50 border-b border-line flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h3 className="font-bold text-[#663532]">Rekap Per Karyawan</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500">{recap.length} karyawan</span>
            <div className="flex rounded-xl bg-neutral-100 p-1">
              {["harian", "mingguan", "bulanan"].map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${viewMode === mode ? "bg-white text-[#663532] shadow-sm" : "text-neutral-500 hover:text-[#663532]"}`}
                  onClick={() => { setViewMode(mode); setExpandedUserId(null); }}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-stone-50">
                <th className="px-5 py-3 font-semibold text-neutral-600">Nama</th>
                <th className="px-5 py-3 font-semibold text-neutral-600">Hari Kerja</th>
                <th className="px-5 py-3 font-semibold text-neutral-600">Total Jam Kerja</th>
                <th className="px-5 py-3 font-semibold text-neutral-600 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {recap.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-5 text-center text-xs text-neutral-400">Tidak ada data absensi di periode ini.</td>
                </tr>
              ) : (
                recap.map((u) => (
                  <UserRow
                    key={u.user_id}
                    user={u}
                    onClick={() => handleToggleExpand(u)}
                    isExpanded={expandedUserId === u.user_id}
                    viewMode={viewMode}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}