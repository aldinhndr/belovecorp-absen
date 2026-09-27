import { useEffect, useState } from "react";
import { api } from "../../api/client";

const HARI = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

export default function AdminSchedules() {
  const [users, setUsers] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  // Form Jadwal
  const [userId, setUserId] = useState("");
  const [day, setDay] = useState("Senin");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("17:00");
  const [submitting, setSubmitting] = useState(false);

  // Form Absen Manual Admin
  const [manualUser, setManualUser] = useState("");
  const [manualType, setManualType] = useState("masuk");
  const [manualDate, setManualDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [manualTime, setManualTime] = useState("08:00");
  const [manualSubmitting, setManualSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [uRes, sRes] = await Promise.all([api.users(), api.adminSchedules()]);
      setUsers(uRes);
      setSchedules(sRes);
      if (uRes.length > 0 && !userId) setUserId(uRes[0].id);
      if (uRes.length > 0 && !manualUser) setManualUser(uRes[0].id);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveSchedule = async (e) => {
    e.preventDefault();
    setError("");
    setMsg("");
    setSubmitting(true);
    try {
      await api.saveSchedule({
        user_id: Number(userId),
        day_of_week: day,
        start_time: startTime,
        end_time: endTime,
      });
      setMsg("Jadwal berhasil disimpan!");
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSchedule = async (id) => {
    if (!confirm("Hapus jadwal ini?")) return;
    try {
      await api.deleteSchedule(id);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleManualAttendance = async (e) => {
    e.preventDefault();
    setError("");
    setMsg("");
    setManualSubmitting(true);
    try {
      const query = `?user_id=${manualUser}&tipe=${manualType}&tanggal=${manualDate}&jam=${manualTime}`;
      await api.manualAttendance(query);
      setMsg("Absen manual berhasil disimpan!");
    } catch (err) {
      setError(err.message);
    } finally {
      setManualSubmitting(false);
    }
  };

  return (
    <div className="stack gap-6">
      {/* Alert Messages */}
      {error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600 border border-red-100">{error}</div>}
      {msg && <div className="rounded-xl bg-green-50 p-4 text-sm text-green-700 border border-green-100">{msg}</div>}

      <div className="grid gap-6 md:grid-cols-2">
        {/* ===== Form Tambah/Update Jadwal ===== */}
        <div className="card stack">
          <h2 className="text-lg font-bold text-[#663532]">Pengaturan Jadwal Kerja</h2>
          <form onSubmit={handleSaveSchedule} className="stack gap-3">
            <div>
              <label className="label">Karyawan</label>
              <select className="field" value={userId} onChange={(e) => setUserId(e.target.value)}>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nama} ({u.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Hari</label>
              <select className="field" value={day} onChange={(e) => setDay(e.target.value)}>
                {HARI.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Jam Mulai</label>
                <input
                  type="time"
                  className="field"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="label">Jam Selesai</label>
                <input
                  type="time"
                  className="field"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <button className="btn mt-2" disabled={submitting}>
              {submitting ? "Menyimpan..." : "Simpan Jadwal"}
            </button>
          </form>
        </div>

        {/* ===== Form Input Absen Manual Admin ===== */}
        <div className="card stack bg-neutral-50/50">
          <h2 className="text-lg font-bold text-[#663532]">Bantu Absen Manual (Karyawan Lupa Absen)</h2>
          <p className="text-xs text-neutral-500">
            Gunakan fitur ini jika karyawan lupa/terlambat di luar toleransi, agar status kehadiran tetap tercatat.
          </p>
          <form onSubmit={handleManualAttendance} className="stack gap-3">
            <div>
              <label className="label">Karyawan</label>
              <select className="field" value={manualUser} onChange={(e) => setManualUser(e.target.value)}>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nama}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Tipe Absen</label>
                <select className="field" value={manualType} onChange={(e) => setManualType(e.target.value)}>
                  <option value="masuk">Masuk</option>
                  <option value="pulang">Pulang</option>
                </select>
              </div>
              <div>
                <label className="label">Tanggal</label>
                <input
                  type="date"
                  className="field"
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="label">Jam Absen</label>
              <input
                type="time"
                className="field"
                value={manualTime}
                onChange={(e) => setManualTime(e.target.value)}
                required
              />
            </div>

            <button className="btn bg-[#Cf8085] hover:bg-[#663532] mt-2" disabled={manualSubmitting}>
              {manualSubmitting ? "Proses..." : "Simpan Absen Manual"}
            </button>
          </form>
        </div>
      </div>

      {/* ===== Daftar Jadwal ===== */}
      <div className="card overflow-hidden p-0">
        <div className="px-5 py-4 bg-stone-50 border-b border-line">
          <h3 className="font-bold text-[#663532]">Daftar Semua Jadwal Karyawan</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-stone-50/50">
                <th className="px-5 py-3 font-semibold text-neutral-600">Karyawan</th>
                <th className="px-5 py-3 font-semibold text-neutral-600">Hari</th>
                <th className="px-5 py-3 font-semibold text-neutral-600">Jam Kerja</th>
                <th className="px-5 py-3 font-semibold text-neutral-600 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-5 text-center text-xs text-neutral-400">
                    Memuat data...
                  </td>
                </tr>
              ) : schedules.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-5 text-center text-xs text-neutral-400">
                    Belum ada jadwal yang diatur.
                  </td>
                </tr>
              ) : (
                schedules.map((s) => (
                  <tr key={s.id} className="hover:bg-stone-50/50">
                    <td className="px-5 py-3.5 font-medium">{s.user?.nama || `User #${s.user_id}`}</td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex rounded-lg bg-[#EBC5C4]/40 px-2.5 py-1 text-xs font-bold text-[#663532]">
                        {s.day_of_week}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-semibold tabular-nums text-neutral-800">
                      {s.start_time?.slice(0, 5)} – {s.end_time?.slice(0, 5)}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        type="button"
                        className="btn btn-danger text-xs py-1 px-3"
                        onClick={() => handleDeleteSchedule(s.id)}
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
