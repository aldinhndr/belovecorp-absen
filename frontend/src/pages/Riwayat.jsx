import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import Calendar, { dateKey } from "../components/Calendar";

const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

function fmtTime(dt) {
  return new Date(dt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

// --- Icons ---
const CheckIcon = ({ className = "h-3 w-3" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className} strokeWidth={3}>
    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const AlertIcon = ({ className = "h-3 w-3" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className} strokeWidth={2.4}>
    <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const XIcon = ({ className = "h-3 w-3" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className} strokeWidth={3}>
    <path d="M6 6l12 12M6 18L18 6" strokeLinecap="round" />
  </svg>
);
const InIcon = ({ className = "h-4 w-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className} strokeWidth={1.8}>
    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const OutIcon = ({ className = "h-4 w-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className} strokeWidth={1.8}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const CalendarIcon = ({ className = "h-4 w-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className} strokeWidth={1.8}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
  </svg>
);
const ActivityIcon = ({ className = "h-4 w-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className} strokeWidth={1.8}>
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// --- Attendance card (dry) ---
function AttendanceCard({ variant, time, data }) {
  const isIn = variant === "masuk";
  const Icon = isIn ? InIcon : OutIcon;
  const label = isIn ? "Absen Masuk" : "Absen Pulang";
  const gradient = isIn
    ? "from-[#Cf8085] to-[#663532]"
    : "from-[#663532] to-[#472220]";
  const softBg = isIn ? "bg-[#EBC5C4]/40" : "bg-[#663532]/10";
  const textColor = isIn ? "text-[#663532]" : "text-[#472220]";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-neutral-100 bg-white p-3.5 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)]">
      {/* Accent bar */}
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${gradient}`} />

      <div className="flex items-center gap-2">
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${softBg} ${textColor}`}>
          <Icon className="h-3.5 w-3.5" />
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
          {label}
        </span>
      </div>

      <div className={`mt-2 text-xl font-bold tabular-nums ${time ? "text-neutral-900" : "text-neutral-300"}`}>
        {time || "—"}
      </div>

      <div className="mt-2">
        {data ? (
          data.di_luar_radius ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-amber-100">
              <AlertIcon /> Luar radius
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#EBC5C4]/40 px-2 py-0.5 text-[10px] font-semibold text-[#663532] ring-1 ring-[#EBC5C4]">
              <CheckIcon /> Berhasil
            </span>
          )
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-500">
            <XIcon /> Belum absen
          </span>
        )}
      </div>

      {data?.random_item?.nama_barang && (
        <div className="mt-2 truncate rounded-lg bg-neutral-50 px-2 py-1 text-[11px] text-neutral-600">
          <span className="font-medium text-neutral-400">Barang:</span> {data.random_item.nama_barang}
        </div>
      )}
    </div>
  );
}

export default function Riwayat() {
  const today = useMemo(() => new Date(), []);
  const [selected, setSelected] = useState(today);
  const [attendances, setAttendances] = useState([]);
  const [activities, setActivities] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([api.myAttendance(), api.myActivities()])
      .then(([att, act]) => {
        setAttendances(att);
        setActivities(act);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const attByDate = useMemo(() => {
    const map = {};
    attendances.forEach((a) => {
      const key = dateKey(new Date(a.waktu));
      (map[key] ||= []).push(a);
    });
    return map;
  }, [attendances]);

  const actByDate = useMemo(() => {
    const map = {};
    activities.forEach((a) => {
      const key = dateKey(new Date(a.waktu));
      (map[key] ||= []).push(a);
    });
    return map;
  }, [activities]);

  const markedDates = useMemo(() => {
    const dates = new Set(Object.keys(attByDate));
    return new Set([...dates].filter(date => attByDate[date].length > 0));
  }, [attByDate]);

  const selectedKey = dateKey(selected);
  const selectedAtt = attByDate[selectedKey] || [];
  const selectedAct = actByDate[selectedKey] || [];
  const masuk = selectedAtt.find((a) => a.tipe === "masuk");
  const pulang = selectedAtt.find((a) => a.tipe === "pulang");

  const isToday =
    selected.getDate() === today.getDate() &&
    selected.getMonth() === today.getMonth() &&
    selected.getFullYear() === today.getFullYear();

  return (
    <div className="flex flex-col gap-4 pb-4">
      {/* ===== Calendar card ===== */}
      <Calendar value={selected} onChange={setSelected} markedDates={markedDates} maxDate={today} />

      {error && (
        <div className="flex items-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
          <AlertIcon className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* ===== Detail card ===== */}
      <div className="rounded-2xl border border-neutral-100 bg-white p-4 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.08)] sm:p-5">
        {/* Header tanggal */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#Cf8085] to-[#663532] text-white shadow-sm shadow-[#663532]/30">
              <CalendarIcon className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                {isToday ? "Hari ini" : "Tanggal dipilih"}
              </p>
              <h3 className="text-sm font-semibold tracking-tight text-neutral-900">
                {HARI[selected.getDay()]}, {selected.getDate()} {BULAN[selected.getMonth()]}{" "}
                {selected.getFullYear()}
              </h3>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-neutral-400">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            Memuat data...
          </div>
        ) : (
          <>
            {/* Absen grid */}
            <div className="grid grid-cols-2 gap-3">
              <AttendanceCard variant="masuk" time={masuk ? fmtTime(masuk.waktu) : null} data={masuk} />
              <AttendanceCard variant="pulang" time={pulang ? fmtTime(pulang.waktu) : null} data={pulang} />
            </div>

            {/* Kegiatan */}
            <div className="mt-5">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EBC5C4]/40 text-[#663532]">
                    <ActivityIcon className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                    Kegiatan
                  </span>
                </div>
                <span className="rounded-full bg-[#EBC5C4]/40 px-2.5 py-0.5 text-[10px] font-bold text-[#663532]">
                  {selectedAct.length}
                </span>
              </div>

              {selectedAct.length === 0 ? (
                <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50/50 p-5 text-center">
                  <p className="text-xs text-neutral-400">Tidak ada kegiatan tercatat.</p>
                </div>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {selectedAct.map((it) => (
                    <li
                      key={it.id}
                      className="flex items-start gap-3 rounded-xl border border-neutral-100 bg-white p-3 transition-colors hover:border-[#EBC5C4] hover:bg-[#EBC5C4]/20"
                    >
                      <span className="mt-0.5 inline-flex shrink-0 items-center rounded-lg bg-neutral-100 px-2 py-1 text-[11px] font-bold tabular-nums text-neutral-700">
                        {fmtTime(it.waktu)}
                      </span>
                      <span className="pt-0.5 text-sm leading-snug text-neutral-800">
                        {it.deskripsi}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}