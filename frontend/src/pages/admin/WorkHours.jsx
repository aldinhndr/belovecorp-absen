import { useEffect, useMemo, useState } from "react";
import { api } from "../../api/client";

const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

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

function SummaryCard({ label, value, color }) {
  return (
    <div className={`rounded-2xl p-4 ${color} text-white shadow-lg`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="mt-1 text-xs font-semibold opacity-80">{label}</div>
    </div>
  );
}

function UserRow({ user, onClick }) {
  return (
    <tr key={user.user_id} className="hover:bg-stone-50/50 cursor-pointer" onClick={onClick}>
      <td className="px-5 py-3 font-medium">{user.nama}</td>
      <td className="px-5 py-3">{user.total_hari_kerja} hari</td>
      <td className="px-5 py-3 font-bold tabular-nums text-[#663532]">{fmtDuration(user.total_jam_kerja_menit)}</td>
      <td className="px-5 py-3">
        <span className={`badge ${user.total_lembur_menit > 0 ? "bg-emerald-100 text-emerald-700" : "bg-stone-100 text-stone-500"}`}>
          {fmtDuration(user.total_lembur_menit)}
        </span>
      </td>
      <td className="px-5 py-3">
        <span className={`badge ${user.total_keterlambatan_menit > 0 ? "bg-amber-100 text-amber-700" : "bg-stone-100 text-stone-500"}`}>
          {fmtDuration(user.total_keterlambatan_menit)}
        </span>
      </td>
      <td className="px-5 py-3 text-neutral-600">{user.rata_rata_jam_per_hari} jam</td>
      <td className="px-5 py-3 text-right">
        <button type="button" className="text-xs font-semibold text-[#Cf8085] hover:text-[#663532]">Detail →</button>
      </td>
    </tr>
  );
}

function DetailModal({ selectedUser, onClose }) {
  if (!selectedUser) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-gradient-to-r from-[#Cf8085] to-[#663532] text-white px-6 py-4 rounded-t-3xl flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold">{selectedUser.nama}</h3>
            <p className="text-xs text-[#EBC5C4]">{selectedUser.email}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-full bg-white/20 hover:bg-white/30 text-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <SummaryCard label="Total Jam Kerja" value={fmtDuration(selectedUser.total_jam_kerja_menit)} color="bg-[#EBC5C4] text-[#663532]" />
            <SummaryCard label="Total Lembur" value={fmtDuration(selectedUser.total_lembur_menit)} color="bg-emerald-100 text-emerald-700" />
            <SummaryCard label="Total Keterlambatan" value={fmtDuration(selectedUser.total_keterlambatan_menit)} color="bg-amber-100 text-amber-700" />
            <SummaryCard label="Hari Kerja" value={`${selectedUser.total_hari_kerja} hari`} color="bg-[#Cf8085] text-white" />
          </div>

          <h4 className="text-lg font-bold text-[#663532] mb-3">Detail Harian</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-stone-50">
                  <th className="px-4 py-3 font-semibold text-neutral-600">Tanggal</th>
                  <th className="px-4 py-3 font-semibold text-neutral-600">Masuk</th>
                  <th className="px-4 py-3 font-semibold text-neutral-600">Pulang</th>
                  <th className="px-4 py-3 font-semibold text-neutral-600">Jadwal</th>
                  <th className="px-4 py-3 font-semibold text-neutral-600">Durasi</th>
                  <th className="px-4 py-3 font-semibold text-neutral-600">Late/OT</th>
                  <th className="px-4 py-3 font-semibold text-neutral-600">Aktivitas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {selectedUser.detail_harian.map((d, i) => (
                  <tr key={i} className="hover:bg-stone-50/50">
                    <td className="px-4 py-3 font-medium">{d.hari}, {new Date(d.tanggal).toLocaleDateString("id-ID", {day:"2-digit",month:"short"})}</td>
                    <td className="px-4 py-3">{fmtTime(d.masuk)}</td>
                    <td className="px-4 py-3">{fmtTime(d.pulang)}</td>
                    <td className="px-4 py-3 text-xs text-neutral-500">{d.jadwal_masuk} – {d.jadwal_pulang}</td>
                    <td className="px-4 py-3 font-semibold text-[#663532]">{fmtDuration(d.durasi_menit)}</td>
                    <td className="px-4 py-3 text-xs">
                      {d.keterlambatan_menit > 0 && <span className="badge bg-amber-100 text-amber-700">Late {d.keterlambatan_menit}m</span>}
                      {d.lembur_menit > 0 && <span className="badge bg-emerald-100 text-emerald-700 ml-1">OT {d.lembur_menit}m</span>}
                      {d.keterlambatan_menit === 0 && d.lembur_menit === 0 && <span className="text-neutral-400">—</span>}
                    </td>
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
  const [showDetail, setShowDetail] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

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
    totalLate: recap.reduce((s, u) => s + (u.total_keterlambatan_menit || 0), 0),
    totalOvertime: recap.reduce((s, u) => s + (u.total_lembur_menit || 0), 0),
  }), [recap]);

  const fmtDuration = (min) => {
    if (!min || min === 0) return "00:00";
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  const fmtTime = (t) => (!t || t === "-") ? "—" : t.slice(0, 5);

  const handleOpenDetail = (user) => {
    setSelectedUser(user);
    setShowDetail(true);
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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard label="Total Karyawan" value={summary.totalUsers} color="bg-[#Cf8085]" />
        <SummaryCard label="Total Jam Kerja" value={fmtDuration(summary.totalWorkHours)} color="bg-[#663532]" />
        <SummaryCard label="Total Keterlambatan" value={fmtDuration(summary.totalLate)} color="bg-amber-500" />
        <SummaryCard label="Total Lembur" value={fmtDuration(summary.totalOvertime)} color="bg-emerald-500" />
      </div>

      {error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600 border border-red-100">{error}</div>}

      <div className="card overflow-hidden p-0">
        <div className="px-5 py-4 bg-stone-50 border-b border-line flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h3 className="font-bold text-[#663532]">Rekap Per Karyawan</h3>
          <span className="text-xs text-neutral-500">{recap.length} karyawan</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-stone-50">
                <th className="px-5 py-3 font-semibold text-neutral-600">Nama</th>
                <th className="px-5 py-3 font-semibold text-neutral-600">Hari Kerja</th>
                <th className="px-5 py-3 font-semibold text-neutral-600">Total Jam Kerja</th>
                <th className="px-5 py-3 font-semibold text-neutral-600">Lembur</th>
                <th className="px-5 py-3 font-semibold text-neutral-600">Keterlambatan</th>
                <th className="px-5 py-3 font-semibold text-neutral-600">Rata-rata/Hari</th>
                <th className="px-5 py-3 font-semibold text-neutral-600 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {recap.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-5 text-center text-xs text-neutral-400">Tidak ada data absensi di periode ini.</td>
                </tr>
              ) : (
                recap.map((u) => (
                  <UserRow key={u.user_id} user={u} onClick={() => handleOpenDetail(u)} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showDetail && <DetailModal selectedUser={selectedUser} onClose={() => setShowDetail(false)} />}
    </div>
  );
}