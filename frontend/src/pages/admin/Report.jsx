import { useEffect, useMemo, useState } from "react";
import { api } from "../../api/client";

const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

function today() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatLong(iso) {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return `${HARI[d.getDay()]}, ${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
}

function shiftIso(iso, days) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function weekAround(iso) {
  return Array.from({ length: 7 }, (_, i) => shiftIso(iso, i - 3));
}

function parseReport(text) {
  if (!text?.trim()) return [];
  const chunks = text.trim().split(/\n\s*\n+/);
  const days = [];
  let current = null;
  for (const raw of chunks) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const lines = trimmed.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;
    const firstLine = lines[0];
    const looksLikeHeader = /^(Senin|Selasa|Rabu|Kamis|Jumat|Sabtu|Minggu),\s*\d+/i.test(firstLine);
    if (looksLikeHeader) {
      if (current) days.push(current);
      current = { header: firstLine, users: [] };
      const rest = lines.slice(1);
      foldLinesIntoUsers(rest, current.users);
    } else {
      if (!current) current = { header: formatLong(today()), users: [] };
      foldLinesIntoUsers(lines, current.users);
    }
  }
  if (current) days.push(current);
  return days;
}

function foldLinesIntoUsers(lines, users) {
  let cur = null;
  const flush = () => {
    if (cur) users.push(cur);
  };
  for (const line of lines) {
    if (line.toLowerCase() === "activity:") continue;
    if (line.startsWith("- ")) {
      const item = line.slice(2).trim();
      if (!cur) cur = { name: "Laporan", items: [] };
      cur.items.push(item);
    } else if (!line.includes(",") && !line.startsWith("-")) {
      if (cur && cur.items.length) flush();
      cur = { name: line, items: [] };
    }
  }
  if (cur) flush();
  if (users.length === 0 && lines.length > 0) {
    const items = lines.filter((l) => l.startsWith("- ")).map((l) => l.slice(2).trim());
    if (items.length) users.push({ name: "Laporan", items });
  }
}

// Class reusable
const BTN_PRIMARY =
  "rounded-2xl bg-gradient-to-br from-[#Cf8085] to-[#663532] text-sm font-semibold text-white shadow-[0_10px_30px_-10px_rgba(102,53,50,0.55)] transition-all duration-200 hover:shadow-[0_14px_36px_-10px_rgba(102,53,50,0.65)] active:scale-[0.98] disabled:opacity-50 disabled:hover:shadow-none";
const BTN_GHOST =
  "rounded-2xl border border-neutral-200 bg-white text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 active:scale-[0.98] disabled:opacity-40";

export default function AdminReport() {
  const [date, setDate] = useState(today());
  const [report, setReport] = useState(null);
  const [text, setText] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [mode, setMode] = useState("preview");
  const [busy, setBusy] = useState(false);

  const days = useMemo(() => parseReport(text), [text]);

  const load = async (target = date) => {
    setError("");
    setMsg("");
    try {
      const data = await api.adminReport(target);
      setReport(data);
      setText(data.konten_text);
      setDate(data.tanggal);
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    setBusy(true);
    setError("");
    try {
      const data = await api.updateReport(text, date);
      setReport(data);
      setMsg("Draft disimpan");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const regenerate = async () => {
    setBusy(true);
    setError("");
    try {
      const data = await api.regenerateReport(date);
      setReport(data);
      setText(data.konten_text);
      setMsg("Laporan digenerate ulang dari log kegiatan");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setMsg("Teks laporan disalin");
    } catch {
      setError("Gagal menyalin teks");
    }
  };

  return (
    <div className="flex flex-col gap-5 pb-4">
      {/* ===== Hero card ===== */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#Cf8085] via-[#Cf8085] to-[#663532] p-5 text-white shadow-[0_10px_30px_-10px_rgba(102,53,50,0.5)] md:p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-40 w-40 rounded-full bg-white/5" />

        <div className="relative flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-lg">
            <h1 className="mt-3 text-xl font-bold tracking-tight leading-tight md:text-2xl">
              {formatLong(date)}
            </h1>
            <p className="mt-1 text-xs text-[#EBC5C4]">
              Format kirim: hari, tanggal, lalu daftar Activity.
            </p>
          </div>
        </div>
      </div>

      {/* ===== Week picker ===== */}
      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {weekAround(date).map((iso) => {
          const active = iso === date;
          const d = new Date(`${iso}T00:00:00`);
          return (
            <button
              key={iso}
              type="button"
              className={`flex min-w-[78px] flex-col items-center rounded-2xl border px-3 py-2.5 transition-all duration-200 ${
                active
                  ? "border-[#663532] bg-gradient-to-br from-[#Cf8085] to-[#663532] text-white shadow-md shadow-[#663532]/30"
                  : "border-neutral-100 bg-white text-neutral-700 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)] hover:border-[#EBC5C4] hover:bg-[#EBC5C4]/20"
              }`}
              onClick={() => load(iso)}
            >
              <span
                className={`text-[10px] font-semibold uppercase tracking-wider ${
                  active ? "text-[#EBC5C4]" : "text-neutral-400"
                }`}
              >
                {formatLong(iso).split(",")[0].slice(0, 3)}
              </span>
              <strong className="text-lg font-bold leading-tight">{d.getDate()}</strong>
            </button>
          );
        })}
      </div>

      {/* ===== Main card ===== */}
      <div className="rounded-2xl border border-neutral-100 bg-white p-4 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.08)] sm:p-5">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <input
              className="rounded-xl border border-neutral-200 bg-neutral-50/50 px-3 py-2.5 text-sm text-neutral-900 transition-all focus:border-[#Cf8085] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#Cf8085]/15"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              title="Pilih tanggal"
            />
            <button className={`px-4 py-2.5 ${BTN_GHOST}`} onClick={() => load(date)} type="button">
              Muat
            </button>
            <button
              className={`px-4 py-2.5 ${BTN_GHOST}`}
              type="button"
              onClick={regenerate}
              disabled={busy}
            >
              Generate ulang
            </button>
          </div>

          <div className="flex self-start rounded-2xl bg-neutral-100 p-1 sm:self-auto">
            {[
              { key: "preview", label: "Jurnal" },
              { key: "edit", label: "Edit teks" },
            ].map(({ key, label }) => (
              <button
                key={key}
                type="button"
                className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-200 ${
                  mode === key
                    ? "bg-white text-[#663532] shadow-sm"
                    : "text-neutral-500 hover:text-[#663532]"
                }`}
                onClick={() => setMode(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="mt-4">
          {mode === "preview" ? (
            days.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#EBC5C4] bg-[#EBC5C4]/20 py-10 text-center">
                <p className="text-sm font-semibold text-[#663532]">Belum ada isi laporan</p>
                <p className="mt-1 text-xs text-[#8c5d5b]">
                  Generate ulang dari log kegiatan untuk melihat pratinjau.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {days.map((day, idx) => (
                  <article
                    key={`${day.header}-${idx}`}
                    className="overflow-hidden rounded-2xl border border-neutral-100 bg-white shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)]"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 bg-gradient-to-r from-[#663532] to-[#472220] px-4 py-3">
                      <h3 className="text-sm font-bold tracking-tight text-white">{day.header}</h3>
                      <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-semibold text-white ring-1 ring-white/20">
                        {day.users.length ? `${day.users.length} karyawan` : "Tanpa aktivitas"}
                      </span>
                    </div>

                    {day.users.length === 0 ? (
                      <div className="px-4 py-6 text-center text-xs text-neutral-400">
                        — tidak ada log kegiatan —
                      </div>
                    ) : (
                      <div className="divide-y divide-neutral-100">
                        {day.users.map((u) => (
                          <div key={u.name} className="px-4 py-3">
                            <div className="mb-2 flex items-center gap-2.5">
                              <div className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-[#Cf8085] to-[#663532] text-[11px] font-bold text-white shadow-sm shadow-[#663532]/30">
                                {u.name.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-sm font-semibold text-neutral-900">{u.name}</span>
                              <span className="ml-auto rounded-full bg-[#EBC5C4]/40 px-2 py-0.5 text-[10px] font-bold text-[#663532]">
                                {u.items.length} kegiatan
                              </span>
                            </div>
                            <div className="ml-9 space-y-1">
                              {u.items.map((item, i) => (
                                <div key={`${item}-${i}`} className="flex items-start gap-2 text-[13px] text-neutral-700">
                                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#Cf8085]" />
                                  <span>{item}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )
          ) : (
            <div className="relative">
              <textarea
                rows={16}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={"Jumat, 25 September 2026\nActivity:\n- Potong patch sablon"}
                className="min-h-[320px] w-full resize-y rounded-2xl border border-neutral-200 bg-neutral-50/50 px-4 py-3 font-sans text-sm leading-relaxed text-neutral-900 placeholder-neutral-400 transition-all duration-200 focus:border-[#Cf8085] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#Cf8085]/15"
              />
              {text && (
                <button
                  type="button"
                  onClick={() => setText("")}
                  title="Kosongkan"
                  className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-lg bg-white text-neutral-500 ring-1 ring-neutral-200 transition-colors hover:bg-neutral-50 hover:text-neutral-800"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12H20L19 7M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3M9 7h6m0 0L9 21M9 7l6 0" />
                  </svg>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Messages */}
        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-4 w-4 shrink-0" strokeWidth={2}>
              <path d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {error}
          </div>
        )}
        {msg && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-4 w-4 shrink-0" strokeWidth={2.6}>
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {msg}
          </div>
        )}

        {/* Actions */}
        <div className="mt-5 grid grid-cols-2 gap-2 border-t border-neutral-100 pt-4">
          <button className={`py-3 ${BTN_GHOST}`} onClick={save} type="button" disabled={busy}>
            {busy ? "Menyimpan..." : "Simpan"}
          </button>
          <button className={`py-3 ${BTN_PRIMARY}`} onClick={copyText} type="button">
            Salin teks
          </button>
        </div>
      </div>
    </div>
  );
}