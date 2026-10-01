import { useEffect, useState } from "react";
import { api } from "../../api/client";

const empty = { nama: "", email: "", password: "", role: "karyawan", store_id: "" };

export default function AdminUsers() {
  const [rows, setRows] = useState([]);
  const [stores, setStores] = useState([]);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");
  const [editId, setEditId] = useState(null);

  const load = async () => {
    try {
      setRows(await api.users());
      setStores(await api.stores());
    } catch (e) {
      setError(e.message);
    }
  };
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.createUser({ ...form, store_id: form.store_id ? Number(form.store_id) : null });
      setForm(empty);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Hapus karyawan ini beserta semua data absen & jadwalnya?")) return;
    setError("");
    try {
      await api.deleteUser(id);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const karyawan = rows.filter((u) => u.role === "karyawan");
  const admins = rows.filter((u) => u.role === "admin");

  return (
    <div className="stack gap-5">
      {/* Form tambah */}
      <div className="card">
        <h2 className="mb-4 text-xl font-bold">Tambah Karyawan</h2>
        <form onSubmit={submit} className="stack">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="label">Nama</label>
              <input className="field" placeholder="Nama lengkap" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} required />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="field" placeholder="email@domain.com" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div>
              <label className="label">Password</label>
              <input className="field" placeholder="Min. 6 karakter" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            </div>
            <div>
              <label className="label">Role</label>
              <select className="field" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="karyawan">Karyawan</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="label">Toko</label>
              <select className="field" value={form.store_id} onChange={(e) => setForm({ ...form, store_id: e.target.value })}>
                <option value="">Pilih toko</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>{s.nama}</option>
                ))}
              </select>
            </div>
          </div>
          {error && <div className="error">{error}</div>}
          <div>
            <button className="btn">Tambah karyawan</button>
          </div>
        </form>
      </div>

      {/* Tabel karyawan */}
      <div className="card overflow-hidden p-0">
        <div className="flex items-center justify-between px-5 py-4">
          <h3 className="font-bold">Karyawan <span className="ml-1 rounded-full bg-stone-100 px-2 py-0.5 text-xs text-muted">{karyawan.length}</span></h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-y border-line bg-stone-50">
                <th className="px-5 py-3 font-semibold text-muted">Nama</th>
                <th className="px-5 py-3 font-semibold text-muted">Email</th>
                <th className="px-5 py-3 font-semibold text-muted">Toko</th>
                <th className="px-5 py-3 font-semibold text-muted">Status</th>
                <th className="px-5 py-3 font-semibold text-muted">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {karyawan.map((u) => (
                <tr key={u.id} className="border-t border-line hover:bg-stone-50/50">
                  <td className="px-5 py-3 font-medium">{u.nama}</td>
                  <td className="px-5 py-3 text-muted">{u.email}</td>
                  <td className="px-5 py-3 text-muted">{u.store?.nama || "—"}</td>
                  <td className="px-5 py-3">
                    <span className={`badge text-[10px] ${u.is_active ? "badge-ok" : "bg-stone-100 text-muted"}`}>
                      {u.is_active ? "Aktif" : "Nonaktif"}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className={`btn text-xs py-1.5 px-3 ${u.is_active ? "btn-secondary" : "btn-secondary"}`}
                        onClick={() => api.updateUser(u.id, { is_active: !u.is_active }).then(load)}
                      >
                        {u.is_active ? "Nonaktifkan" : "Aktifkan"}
                      </button>
                      <button
                        type="button"
                        className="btn text-xs py-1.5 px-3 bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                        onClick={() => handleDelete(u.id)}
                      >
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {karyawan.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-6 text-center muted">Belum ada karyawan.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tabel admin */}
      <div className="card overflow-hidden p-0">
        <div className="px-5 py-4">
          <h3 className="font-bold">Admin <span className="ml-1 rounded-full bg-stone-100 px-2 py-0.5 text-xs text-muted">{admins.length}</span></h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-y border-line bg-stone-50">
                <th className="px-5 py-3 font-semibold text-muted">Nama</th>
                <th className="px-5 py-3 font-semibold text-muted">Email</th>
                <th className="px-5 py-3 font-semibold text-muted">Status</th>
                <th className="px-5 py-3 font-semibold text-muted">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((u) => (
                <tr key={u.id} className="border-t border-line hover:bg-stone-50/50">
                  <td className="px-5 py-3 font-medium">{u.nama}</td>
                  <td className="px-5 py-3 text-muted">{u.email}</td>
                  <td className="px-5 py-3">
                    <span className={`badge text-[10px] ${u.is_active ? "badge-ok" : "bg-stone-100 text-muted"}`}>
                      {u.is_active ? "Aktif" : "Nonaktif"}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className={`btn text-xs py-1.5 px-3 ${u.is_active ? "btn-secondary" : "btn-secondary"}`}
                        onClick={() => api.updateUser(u.id, { is_active: !u.is_active }).then(load)}
                      >
                        {u.is_active ? "Nonaktifkan" : "Aktifkan"}
                      </button>
                      <button
                        type="button"
                        className="btn text-xs py-1.5 px-3 bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                        onClick={() => handleDelete(u.id)}
                      >
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
