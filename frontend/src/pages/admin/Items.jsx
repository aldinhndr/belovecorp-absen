import { useEffect, useState } from "react";
import { api } from "../../api/client";

export default function AdminItems() {
  const [rows, setRows] = useState([]);
  const [nama, setNama] = useState("");
  const [error, setError] = useState("");
  const [qrImage, setQrImage] = useState({});

  const load = () => api.items().then(setRows).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const add = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.createItem({ nama_barang: nama, aktif: true });
      setNama("");
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  const generateQr = async (itemId) => {
    try {
      await api.generateReportItemQr(itemId);
      await load();
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => {
    rows.forEach((r) => {
      if (!r.qr_token || qrImage[r.id]) return;
      api
        .getReportItemQr(r.id)
        .then((data) => setQrImage((prev) => ({ ...prev, [r.id]: data.qr_image_base64 })))
        .catch(() => {});
    });
  }, [rows]);

  const downloadQr = (itemId, namaBarang) => {
    if (!qrImage[itemId]) return;
    const link = document.createElement("a");
    link.href = qrImage[itemId];
    link.download = `QR-${namaBarang}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const aktif = rows.filter((r) => r.aktif);
  const nonaktif = rows.filter((r) => !r.aktif);

  return (
    <div className="stack gap-5">
      <div className="card">
        <h2 className="mb-4 text-xl font-bold">Tambah Barang Random</h2>
        <form onSubmit={add} className="flex gap-3">
          <input className="field" value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Nama barang" required />
          <button className="btn shrink-0">Tambah</button>
        </form>
        {error && <div className="error mt-2">{error}</div>}
      </div>

      <div className="card overflow-hidden p-0">
        <div className="px-5 py-4">
          <h3 className="font-bold">
            Daftar Barang
            <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">{aktif.length} aktif</span>
            {nonaktif.length > 0 && (
              <span className="ml-1 rounded-full bg-stone-100 px-2 py-0.5 text-xs text-muted">{nonaktif.length} nonaktif</span>
            )}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-y border-line bg-stone-50">
                <th className="px-5 py-3 font-semibold text-muted">Nama Barang</th>
                <th className="px-5 py-3 font-semibold text-muted">QR Code</th>
                <th className="px-5 py-3 font-semibold text-muted">Status</th>
                <th className="px-5 py-3 font-semibold text-muted">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-line hover:bg-stone-50/50">
                  <td className="px-5 py-3 font-medium">{r.nama_barang}</td>
                  <td className="px-5 py-3">
                    {qrImage[r.id] ? (
                      <div className="flex items-center gap-3">
                        <img src={qrImage[r.id]} alt="QR" className="h-14 w-14 rounded border border-line p-0.5" />
                        <button type="button" className="btn btn-secondary text-xs py-1.5 px-3" onClick={() => downloadQr(r.id, r.nama_barang)}>
                          Download
                        </button>
                      </div>
                    ) : r.qr_token ? (
                      <span className="muted text-xs">Memuat QR...</span>
                    ) : (
                      <button type="button" className="btn btn-secondary text-xs py-1.5 px-3" onClick={() => generateQr(r.id)}>
                        Generate QR
                      </button>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`badge text-[10px] ${r.aktif ? "badge-ok" : "bg-stone-100 text-muted"}`}>
                      {r.aktif ? "Aktif" : "Nonaktif"}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex gap-2">
                      <button type="button" className="btn btn-secondary text-xs py-1.5 px-3" onClick={() => api.updateItem(r.id, { aktif: !r.aktif }).then(load)}>
                        {r.aktif ? "Nonaktifkan" : "Aktifkan"}
                      </button>
                      <button type="button" className="btn btn-danger text-xs py-1.5 px-3" onClick={() => { if (confirm(`Hapus "${r.nama_barang}"?`)) api.deleteItem(r.id).then(load); }}>
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={4} className="px-5 py-6 text-center muted">Belum ada barang.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
