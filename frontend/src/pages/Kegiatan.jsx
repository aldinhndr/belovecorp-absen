import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import Calendar, { dateKey as toDateKey } from "../components/Calendar";

const HARI_SINGKAT = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const BULAN_SINGKAT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

const isSameDay = (a, b) => toDateKey(a) === toDateKey(b);
const fmtTime = (dt) => new Date(dt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

function compactLabel(d, today) {
  if (isSameDay(d, today)) return "Hari ini";
  const y = new Date(today); y.setDate(y.getDate() - 1);
  if (isSameDay(d, y)) return "Kemarin";
  return `${HARI_SINGKAT[d.getDay()]}, ${d.getDate()} ${BULAN_SINGKAT[d.getMonth()]}`;
}

const BTN_PRIMARY =
  "rounded-2xl bg-gradient-to-br from-[#Cf8085] to-[#663532] text-sm font-semibold text-white shadow-[0_10px_30px_-10px_rgba(102,53,50,0.55)] transition-all duration-200 hover:shadow-[0_14px_36px_-10px_rgba(102,53,50,0.65)] active:scale-[0.98] disabled:opacity-50 disabled:hover:shadow-none";
const BTN_GHOST =
  "rounded-2xl border border-neutral-200 bg-white text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 active:scale-[0.98] disabled:opacity-40";

const Alert = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-4 w-4 shrink-0" strokeWidth={2}>
    <path d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const ErrBox = ({ children }) =>
  children ? (
    <div className="flex items-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
      <Alert /> {children}
    </div>
  ) : null;

export default function Kegiatan() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [text, setText] = useState("");
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const isToday = isSameDay(selectedDate, now);
  const dateKey = toDateKey(selectedDate);

  // ===== Panggilan API — TIDAK DIUBAH =====
  const load = (date) => {
    setError("");
    api
      .myActivities(toDateKey(date))
      .then(setItems)
      .catch((e) => setError(e.message));
  };

  useEffect(() => {
    load(selectedDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateKey]);

  useEffect(() => {
    if (!calendarOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [calendarOpen]);

  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setLoading(true); setError("");
    try {
      await api.addActivity(text.trim(), dateKey);
      setText("");
      await load(selectedDate);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const startEdit = (it) => { setEditingId(it.id); setEditText(it.deskripsi); };
  const cancelEdit = () => { setEditingId(null); setEditText(""); };

  const saveEdit = async (id) => {
    if (!editText.trim()) return;
    setSavingEdit(true); setError("");
    try {
      await api.updateActivity(id, { deskripsi: editText.trim() });
      cancelEdit();
      await load(selectedDate);
    } catch (err) { setError(err.message); }
    finally { setSavingEdit(false); }
  };

  const pickDate = (date) => {
    setSelectedDate(date);
    setCalendarOpen(false);
    cancelEdit();
  };

  const preview = useMemo(() => {
    const seen = new Set();
    return items.map((it) => it.deskripsi.trim()).filter((d) => {
      const k = d.toLowerCase();
      if (!d || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }, [items]);

  // Ringkasan chip tanggal untuk tombol kalender
  const dayNum = selectedDate.getDate();
  const monthShort = BULAN_SINGKAT[selectedDate.getMonth()];

  return (
    <div className="flex flex-col gap-4 pb-4">
      {/* ===== Top bar — lebih informatif ===== */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#663532]">
            Log Kegiatan
          </p>
          <p className="mt-0.5 truncate text-lg font-bold tracking-tight text-neutral-900">
            {compactLabel(selectedDate, now)}
          </p>
          <p className="mt-0.5 text-xs text-neutral-400">
            {items.length} entri tercatat
          </p>
        </div>

        {/* Tombol kalender: menampilkan tanggal aktual, bukan label generik */}
        <button
          type="button"
          onClick={() => setCalendarOpen(true)}
          aria-label="Pilih tanggal"
          className={`group flex shrink-0 items-center gap-2.5 rounded-2xl border px-3 py-2.5 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)] transition-all duration-200 active:scale-95 ${
            isToday
              ? "border-[#EBC5C4] bg-[#EBC5C4]/40 hover:bg-[#EBC5C4]/60"
              : "border-neutral-100 bg-white hover:border-[#EBC5C4] hover:bg-[#EBC5C4]/20"
          }`}
        >
          <div className="flex h-9 w-9 flex-col items-center justify-center rounded-xl bg-gradient-to-br from-[#Cf8085] to-[#663532] text-white shadow-sm shadow-[#663532]/30">
            <span className="text-[9px] font-bold uppercase leading-none tracking-wider text-[#EBC5C4]">
              {monthShort}
            </span>
            <span className="text-sm font-bold leading-tight">
              {dayNum}
            </span>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            className={`transition-colors ${isToday ? "text-[#663532]" : "text-neutral-400 group-hover:text-[#663532]"}`}>
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* ===== Form tambah ===== */}
      <form
        onSubmit={submit}
        className="rounded-2xl border border-neutral-100 bg-white p-4 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.08)]"
      >
        <textarea
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Contoh: Potong patch sablon..."
          className="min-h-[6.5rem] w-full resize-none rounded-xl border border-neutral-200 bg-neutral-50/50 px-3.5 py-3 text-sm leading-relaxed text-neutral-900 placeholder-neutral-400 transition-all duration-200 focus:border-[#Cf8085] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#Cf8085]/15"
        />
        <div className="mt-3">
          <ErrBox>{error}</ErrBox>
        </div>
        <button type="submit" disabled={loading || !text.trim()} className={`mt-3 w-full py-3.5 ${BTN_PRIMARY}`}>
          {loading ? "Menyimpan..." : "Tambah kegiatan"}
        </button>
      </form>

      {/* ===== Timeline ===== */}
      {items.length > 0 && (
        <div className="rounded-2xl border border-neutral-100 bg-white p-4 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.08)] sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EBC5C4]/40 text-[#663532]">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-3.5 w-3.5" strokeWidth={1.8}>
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                Timeline Kegiatan
              </span>
            </div>
            <span className="rounded-full bg-[#EBC5C4]/40 px-2.5 py-0.5 text-[10px] font-bold text-[#663532]">
              {items.length}
            </span>
          </div>

          <ul className="relative m-0 list-none space-y-3 p-0 before:absolute before:bottom-1 before:left-[3.1rem] before:top-1 before:w-px before:bg-neutral-100">
            {items.map((it) => {
              const isEditing = editingId === it.id;
              return (
                <li key={it.id} className="relative flex items-start gap-3">
                  <div className="w-11 shrink-0 pt-2 text-right text-[11px] font-bold tabular-nums text-neutral-500">
                    {fmtTime(it.waktu)}
                  </div>
                  <span className="relative mt-3 h-2 w-2 shrink-0 rounded-full bg-gradient-to-br from-[#Cf8085] to-[#663532] ring-4 ring-white" />

                  {isEditing ? (
                    <div className="flex-1 space-y-2">
                      <textarea
                        rows={2}
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        autoFocus
                        className="w-full resize-none rounded-xl border border-[#EBC5C4] bg-white px-3 py-2.5 text-sm text-neutral-900 focus:border-[#Cf8085] focus:outline-none focus:ring-2 focus:ring-[#Cf8085]/15"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => saveEdit(it.id)} disabled={savingEdit} className={`py-2.5 ${BTN_PRIMARY}`}>
                          {savingEdit ? "Menyimpan..." : "Simpan"}
                        </button>
                        <button type="button" onClick={cancelEdit} className={`py-2.5 ${BTN_GHOST}`}>
                          Batal
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => startEdit(it)}
                      className="group flex flex-1 items-start justify-between gap-2 rounded-xl border border-transparent px-3 py-2 text-left transition-all duration-200 hover:border-[#EBC5C4] hover:bg-[#EBC5C4]/20 active:scale-[0.99]"
                    >
                      <span className="text-sm leading-snug text-neutral-800">{it.deskripsi}</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                        className="mt-0.5 shrink-0 text-neutral-300 transition-colors group-hover:text-[#663532]">
                        <path d="M12 20h9" strokeLinecap="round" />
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* ===== Calendar bottom-sheet — dirapikan ===== */}
      {calendarOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center"
          onClick={() => setCalendarOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header sheet */}
            <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#663532]">
                  Pilih Tanggal
                </p>
                <p className="mt-0.5 text-sm font-bold text-neutral-900">
                  {compactLabel(selectedDate, now)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCalendarOpen(false)}
                aria-label="Tutup"
                className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 6l12 12M6 18L18 6" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {/* Drag handle untuk mobile */}
            <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-neutral-200 sm:hidden" />

            {/* Calendar */}
            <div className="px-4 pt-4">
              <Calendar
                value={selectedDate}
                onChange={pickDate}
                maxDate={now}
                className="border-0 p-0 shadow-none"
              />
            </div>

            {/* Aksi */}
            <div className="grid grid-cols-2 gap-2 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4 sm:pb-4">
              <button
                type="button"
                onClick={() => pickDate(new Date())}
                disabled={isToday}
                className={`py-2.5 text-[#663532] hover:bg-[#EBC5C4]/20 disabled:text-neutral-400 disabled:hover:bg-white ${BTN_GHOST}`}
              >
                Hari ini
              </button>
              <button
                type="button"
                onClick={() => setCalendarOpen(false)}
                className={`py-2.5 ${BTN_PRIMARY}`}
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}