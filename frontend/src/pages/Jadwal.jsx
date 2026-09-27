import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";

const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

const CalendarIcon = ({ className = "h-4 w-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className} strokeWidth={1.8}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
  </svg>
);

const ClockIcon = ({ className = "h-4 w-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className} strokeWidth={1.8}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const UserIcon = ({ className = "h-4 w-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className} strokeWidth={1.8}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

function fmtTime(tStr) {
  if (!tStr) return "";
  return tStr.slice(0, 5);
}

function calcHours(st, et) {
  if (!st || !et) return 0;
  const [sh, sm] = st.split(":").map(Number);
  const [eh, em] = et.split(":").map(Number);
  const diff = (eh * 60 + em) - (sh * 60 + sm);
  return Math.max(0, Math.round(diff / 60));
}

function ScheduleCard({ orang }) {
  const initial = orang.nama.charAt(0).toUpperCase();
  return (
    <article className="overflow-hidden rounded-2xl border border-neutral-100 bg-white shadow-[0_8px_40px_-12px_rgba(0,0,0,0.08)]">
      {/* Header orang */}
      <div className="flex items-center gap-3 bg-gradient-to-r from-[#Cf8085] to-[#663532] px-4 py-3.5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/95 text-base font-bold text-[#663532] ring-2 ring-white/40">
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#EBC5C4]">
            Jadwal Masuk
          </div>
          <div className="truncate text-lg font-bold leading-tight text-white">
            {orang.nama}
          </div>
        </div>
        <div className="shrink-0 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold text-white ring-1 ring-white/20">
          {orang.totalJam} jam / minggu
        </div>
      </div>

      {/* Baris jadwal */}
      <ul className="divide-y divide-neutral-100">
        {orang.jadwal.map((j, i) => (
          <li
            key={`${j.hari}-${i}`}
            className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[#EBC5C4]/15"
          >
            <span className="inline-flex w-24 shrink-0 items-center justify-center rounded-lg bg-[#EBC5C4]/40 px-2 py-1.5 text-[11px] font-bold text-[#663532]">
              {j.hari}
            </span>
            <span className="flex-1 text-sm font-semibold tabular-nums text-neutral-800">
              {fmtTime(j.mulai)} – {fmtTime(j.selesai)}
            </span>
            <span className="shrink-0 text-[11px] font-medium text-neutral-400 tabular-nums">
              ({j.jam} jam)
            </span>
          </li>
        ))}
      </ul>
    </article>
  );
}

export default function Jadwal() {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.schedules()
      .then(setSchedules)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const today = useMemo(() => {
    const d = new Date();
    return HARI[d.getDay()];
  }, []);

  // Grouping schedules by user
  const groupedList = useMemo(() => {
    const map = {};
    schedules.forEach((s) => {
      const uName = s.user?.nama || `User #${s.user_id}`;
      if (!map[uName]) map[uName] = { nama: uName, jadwal: [], totalJam: 0 };
      const hrs = calcHours(s.start_time, s.end_time);
      map[uName].jadwal.push({
        hari: s.day_of_week,
        mulai: s.start_time,
        selesai: s.end_time,
        jam: hrs,
      });
      map[uName].totalJam += hrs;
    });
    return Object.values(map);
  }, [schedules]);

  // Cari yang jadwalnya hari ini
  const todayList = useMemo(() => {
    return groupedList.flatMap((o) =>
      o.jadwal
        .filter((j) => j.hari === today)
        .map((j) => ({ nama: o.nama, ...j }))
    );
  }, [groupedList, today]);

  return (
    <div className="flex flex-col gap-5 pb-4">
      {/* ===== Hero ===== */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#Cf8085] via-[#Cf8085] to-[#663532] p-5 text-white shadow-[0_10px_30px_-10px_rgba(102,53,50,0.5)]">
        <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-40 w-40 rounded-full bg-white/5" />

        <div className="relative flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h1 className="mt-3 text-xl font-bold tracking-tight leading-tight md:text-2xl">
              Tim BeloveCorp
            </h1>
            <p className="mt-1 text-xs text-[#EBC5C4]">
              Belovecorp Indonesia · {groupedList.length} orang
            </p>
          </div>

          <div className="shrink-0 rounded-2xl bg-white/95 p-2.5 text-center shadow-md shadow-[#663532]/20">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#8c5d5b]">
              Hari ini
            </div>
            <div className="mt-0.5 text-base font-bold leading-tight text-[#663532]">
              {today}
            </div>
          </div>
        </div>
      </div>

      {/* ===== Yang masuk hari ini ===== */}
      <div className="rounded-2xl border border-neutral-100 bg-white p-4 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.08)]">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EBC5C4]/40 text-[#663532]">
              <ClockIcon className="h-3.5 w-3.5" />
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
              Jadwal hari ini
            </span>
          </div>
          <span className="rounded-full bg-[#EBC5C4]/40 px-2.5 py-0.5 text-[10px] font-bold text-[#663532]">
            {todayList.length}
          </span>
        </div>

        {loading ? (
          <div className="p-4 text-center text-xs text-neutral-400">Memuat jadwal...</div>
        ) : todayList.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50/50 p-5 text-center">
            <p className="text-xs text-neutral-400">
              Tidak ada jadwal masuk untuk hari {today}.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {todayList.map((t, i) => (
              <li
                key={`${t.nama}-${i}`}
                className="flex items-center gap-3 rounded-xl border border-neutral-100 bg-white p-3"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#Cf8085] to-[#663532] text-xs font-bold text-white shadow-sm shadow-[#663532]/30">
                  {t.nama.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-neutral-900">{t.nama}</div>
                  <div className="text-[11px] text-neutral-500">{t.hari}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-sm font-bold tabular-nums text-[#663532]">
                    {fmtTime(t.mulai)} – {fmtTime(t.selesai)}
                  </div>
                  <div className="text-[10px] font-medium text-neutral-400">
                    {t.jam} jam
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ===== Daftar semua jadwal ===== */}
      <div>
        <div className="mb-3 flex items-center gap-2 px-1">
          <UserIcon className="h-3.5 w-3.5 text-[#663532]" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
            Semua jadwal
          </span>
        </div>
        {groupedList.length === 0 && !loading ? (
          <div className="rounded-2xl border border-dashed border-neutral-200 bg-white p-6 text-center text-xs text-neutral-400">
            Belum ada jadwal yang diatur oleh Admin.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {groupedList.map((o) => (
              <ScheduleCard key={o.nama} orang={o} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
