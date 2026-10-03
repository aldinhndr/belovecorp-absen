import { useEffect, useMemo, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { api } from "../api/client";

const todayKey = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const SHIFTS = [0, 1, 2, 3];
const STEP = { PERMISSION: "permission", SCAN: "scan", PHOTO: "photo", PREVIEW: "preview", DONE: "done" };

function shiftLabel(shift) {
  return `Shift ${shift + 1}`;
}

function tipeLabel(tipe) {
  return tipe === "masuk" ? "Masuk" : "Pulang";
}

function tabKey(shift, tipe) {
  return `${shift}-${tipe}`;
}

function formatTime(t) {
  if (!t) return "";
  return t.slice(0, 5);
}

function getCurrentShift(schedules) {
  if (!schedules || schedules.length === 0) return 0;
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();
  
  // Find the shift that matches current time (within 2 hours of start)
  for (let i = 0; i < schedules.length; i++) {
    const s = schedules[i];
    const start = s.start_time;
    const [sh, sm] = start.split(":").map(Number);
    const startMinutes = sh * 60 + sm;
    const diff = currentTime - startMinutes;
    if (diff >= -120 && diff <= 120) { // within 2 hours
      return i;
    }
  }
  // Default to first shift that hasn't started yet
  for (let i = 0; i < schedules.length; i++) {
    const s = schedules[i];
    const start = s.start_time;
    const [sh, sm] = start.split(":").map(Number);
    const startMinutes = sh * 60 + sm;
    if (currentTime < startMinutes + 120) return i;
  }
  return 0;
}

// Class yang dipakai berulang
const BTN_PRIMARY =
  "rounded-2xl bg-gradient-to-br from-[#Cf8085] to-[#663532] font-semibold text-white shadow-[0_10px_30px_-10px_rgba(102,53,50,0.55)] transition-all duration-200 hover:shadow-[0_14px_36px_-10px_rgba(102,53,50,0.65)] active:scale-[0.98] disabled:opacity-60";
const BTN_GHOST =
  "rounded-2xl border border-neutral-200 bg-white text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 active:scale-[0.98]";
const ICON_BOX = "flex h-7 w-7 items-center justify-center rounded-lg bg-[#EBC5C4]/40 text-[#663532]";

const Check = ({ c = "h-4 w-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={c} strokeWidth={2.6}>
    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const Alert = ({ c = "h-4 w-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={c} strokeWidth={2}>
    <path d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const Flip = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-3.5 w-3.5" strokeWidth={1.9}>
    <path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ErrBox = ({ children }) =>
  children ? (
    <div className="flex items-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
      <Alert c="h-4 w-4 shrink-0" />
      {children}
    </div>
  ) : null;

const FlipBtn = ({ onClick }) => (
  <button type="button" onClick={onClick} className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-neutral-600 ring-1 ring-neutral-200 hover:bg-neutral-50">
    <Flip /> Balik
  </button>
);

export default function Absen() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const qrRef = useRef(null);

  const [item, setItem] = useState(null);
  const [shift, setShift] = useState(0);
  const [tipe, setTipe] = useState("masuk");
  const [coords, setCoords] = useState(null);
  const [geoStatus, setGeoStatus] = useState("idle");
  const [camStatus, setCamStatus] = useState("idle");
  const [photo, setPhoto] = useState(null);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState({});
  const [step, setStep] = useState(STEP.PERMISSION);
  const [facing, setFacing] = useState("environment");
  const [schedules, setSchedules] = useState([]);

  useEffect(() => {
    api.nextItem().then(setItem).catch(() => {});
    api.myAttendance().then((rows) => {
      const key = todayKey(), map = {};
      rows.forEach((r) => {
        if (String(r.waktu).slice(0, 10) === key) {
          map[tabKey(r.shift_index || 0, r.tipe)] = true;
        }
      });
      setDone(map);
    }).catch(() => {});
    api.mySchedules().then(setSchedules).catch(() => setSchedules([]));
    return () => { stopStream(); stopQr(); };
  }, []);

  // Determine today's schedules
  const todaySchedules = useMemo(() => {
    const today = new Date();
    const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const todayName = dayNames[today.getDay()];
    return schedules.filter(s => s.day_of_week === todayName).sort((a, b) => a.start_time.localeCompare(b.start_time));
  }, [schedules]);

  // Auto-select shift based on current time
  useEffect(() => {
    if (todaySchedules.length > 0 && step === STEP.PERMISSION) {
      const suggestedShift = getCurrentShift(todaySchedules);
      setShift(suggestedShift);
    }
  }, [todaySchedules, step]);

  const stopStream = () => { streamRef.current?.getTracks().forEach((t) => t.stop()); streamRef.current = null; };
  const stopQr = async () => { if (qrRef.current) { try { await qrRef.current.stop(); } catch {} qrRef.current = null; } };

  const requestPermissions = async () => {
    setError("");
    let geoOk = false, camOk = false;
    setGeoStatus("loading");
    await new Promise((resolve) => navigator.geolocation.getCurrentPosition(
      (pos) => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGeoStatus("ok"); geoOk = true; resolve(); },
      () => { setGeoStatus("denied"); resolve(); },
      { enableHighAccuracy: true, timeout: 15000 }
    ));
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      s.getTracks().forEach((t) => t.stop());
      setCamStatus("ok"); camOk = true;
    } catch { setCamStatus("denied"); }
    if (geoOk && camOk) setStep(STEP.SCAN);
  };

  const startQr = async () => {
    await stopQr(); stopStream(); setError("");
    const q = new Html5Qrcode("qr-box"); qrRef.current = q;
    try {
      await q.start({ facingMode: facing }, { fps: 12, qrbox: { width: 240, height: 240 }, aspectRatio: 1.0 },
        (decoded) => {
          if (decoded === `belove_absen_qr:${item?.qr_token}`) stopQr().then(() => { setStep(STEP.PHOTO); startPhoto(); });
          else setError("QR tidak sesuai barang yang diminta.");
        }, () => {});
    } catch { setError("Tidak bisa akses kamera untuk scan QR."); }
  };

  const startPhoto = async () => {
    stopStream(); setError(""); setPhoto(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facing } }, audio: false });
      streamRef.current = s;
      if (videoRef.current) videoRef.current.srcObject = s;
    } catch { setError("Tidak bisa akses kamera untuk foto."); }
  };

  const flipCam = async () => {
    const next = facing === "environment" ? "user" : "environment";
    setFacing(next);
    if (step === STEP.SCAN) { await stopQr(); setTimeout(startQr, 100); }
    else if (step === STEP.PHOTO) { stopStream(); setTimeout(startPhoto, 100); }
  };

  const capture = () => {
    const v = videoRef.current, c = canvasRef.current;
    if (!v || !c) return;
    c.width = v.videoWidth || 720; c.height = v.videoHeight || 960;
    c.getContext("2d").drawImage(v, 0, 0);
    c.toBlob((blob) => { setPhoto(blob); stopStream(); setStep(STEP.PREVIEW); }, "image/jpeg", 0.85);
  };

  const retake = () => { setPhoto(null); setStep(STEP.PHOTO); startPhoto(); };

  const submit = async () => {
    setError(""); setMsg("");
    if (!coords) return setError("Lokasi belum tersedia.");
    if (!item) return setError("Barang random belum tersedia.");
    if (!photo) return setError("Foto wajib diambil.");
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries({ tipe, latitude: coords.lat, longitude: coords.lng, random_item_id: item.id, qr_token: item.qr_token, shift_index: shift })
        .forEach(([k, v]) => fd.append(k, v));
      fd.append("foto", photo, "absen.jpg");
      const res = await api.submitAttendance(fd);
      setDone((d) => ({ ...d, [tabKey(shift, tipe)]: true }));
      setPhoto(null); setStep(STEP.DONE);
      setMsg(res.di_luar_radius
        ? `Absen ${tipe} ${shiftLabel(shift)} tersimpan, namun Anda di luar radius toko (${Math.round(res.jarak_meter)} m).`
        : `Absen ${tipe} ${shiftLabel(shift)} berhasil tersimpan.`);
      setItem(await api.nextItem());
    } catch (err) { setError(err.message); setStep(STEP.PREVIEW); }
    finally { setLoading(false); }
  };

  const restart = () => { setError(""); setMsg(""); setPhoto(null); setStep(STEP.SCAN); setTimeout(startQr, 100); };
  const getNextAction = () => {
    for (const s of scheduledShifts) {
      if (!done[tabKey(s, "masuk")]) return `Absen Masuk ${todaySchedules[s] ? `${formatTime(todaySchedules[s].start_time)}–${formatTime(todaySchedules[s].end_time)}` : shiftLabel(s)}`;
      if (!done[tabKey(s, "pulang")]) return `Absen Pulang ${todaySchedules[s] ? `${formatTime(todaySchedules[s].start_time)}–${formatTime(todaySchedules[s].end_time)}` : shiftLabel(s)}`;
    }
    return "Absen selanjutnya";
  };

  useEffect(() => { if (step === STEP.SCAN && item) startQr(); }, [step, item]);
  useEffect(() => { if (step === STEP.PHOTO) startPhoto(); }, [step]);

  const scheduledShifts = todaySchedules.length > 0 ? todaySchedules.map((_, i) => i) : SHIFTS;
  const allDone = scheduledShifts.every(s => done[tabKey(s, "masuk")] && done[tabKey(s, "pulang")]);

  const gpsDot = geoStatus === "ok"
    ? "bg-[#Cf8085] shadow-[0_0_0_3px_rgba(207,128,133,0.25)]"
    : geoStatus === "denied" ? "bg-red-500"
    : geoStatus === "loading" ? "animate-pulse bg-amber-400" : "bg-neutral-300";
  const gpsText = geoStatus === "ok"
    ? `GPS aktif · ${coords?.lat?.toFixed(5)}, ${coords?.lng?.toFixed(5)}`
    : geoStatus === "denied" ? "GPS ditolak — lokasi tidak tercatat"
    : geoStatus === "loading" ? "Mengambil lokasi..." : "GPS belum aktif";

  const stepIdx = { [STEP.SCAN]: 0, [STEP.PHOTO]: 1, [STEP.PREVIEW]: 2, [STEP.DONE]: 3 }[step] ?? 0;
  const stepLabels = ["Scan", "Foto", "Kirim"];

  return (
    <div className="flex min-h-dvh flex-col bg-neutral-50 font-sans text-neutral-900">
      {/* ===== Header ===== */}
      <div className="px-5 pt-5 pb-3">
        <div className="mb-1 flex items-baseline justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Absensi</h1>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
            {allDone ? "Selesai" : "Berlangsung"}
          </span>
        </div>
        <p className="text-sm text-neutral-500">Lengkapi scan QR dan foto barang untuk absen.</p>

        {item && (
          <div className="relative mt-4 overflow-hidden rounded-2xl bg-gradient-to-br from-[#Cf8085] via-[#Cf8085] to-[#663532] px-4 py-3.5 text-white shadow-[0_10px_30px_-10px_rgba(102,53,50,0.5)]">
            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10" />
            <div className="pointer-events-none absolute -bottom-12 -left-6 h-28 w-28 rounded-full bg-white/5" />
            <div className="relative flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 ring-1 ring-white/25 backdrop-blur-sm">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5" strokeWidth={1.7}>
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M3.27 6.96 12 12.01l8.73-5.05M12 22.08V12" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#EBC5C4]">Barang wajib difoto</div>
                <div className="truncate text-base font-bold leading-tight">{item.nama_barang}</div>
              </div>
            </div>
          </div>
        )}
      </div>

{/* ===== Tabs ===== */}
      <div className="mx-5 mb-4 flex gap-1.5 rounded-2xl bg-white p-1.5 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)] ring-1 ring-neutral-100 flex-wrap">
        {todaySchedules.length > 0 ? (
          todaySchedules.map((s, idx) => (
            <div key={`shift-${idx}`} className="flex flex-1 min-w-[140px] gap-1">
              {["masuk", "pulang"].map((t) => {
                const key = tabKey(idx, t);
                const active = shift === idx && tipe === t;
                const isCurrentShift = getCurrentShift(todaySchedules) === idx;
                return (
                  <button key={key} type="button"
                    onClick={() => { setShift(idx); setTipe(t); if (step === STEP.DONE) setStep(STEP.SCAN); }}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-all duration-200 ${
                      active ? "bg-gradient-to-br from-[#Cf8085] to-[#663532] text-white shadow-sm shadow-[#663532]/30"
                             : isCurrentShift ? "bg-[#EBC5C4]/30 text-[#663532] ring-1 ring-[#EBC5C4]"
                             : "text-neutral-500 hover:bg-[#EBC5C4]/40 hover:text-[#663532]"
                    }`}>
                    <span className="flex items-center gap-1">
                      <span className="hidden sm:inline font-medium">{formatTime(s.start_time)} – {formatTime(s.end_time)}</span>
                      {t === "masuk" ? "Masuk" : "Pulang"}
                    </span>
                    {done[key] && (
                      <span className={`flex h-4 w-4 items-center justify-center rounded-full ${active ? "bg-white/25" : "bg-[#EBC5C4] text-[#663532]"}`}>
                        <Check c={`h-2.5 w-2.5 ${active ? "text-white" : ""}`} />
                      </span>
                    )}
                    {isCurrentShift && !done[key] && !active && (
                      <span className="flex h-3 w-3 items-center justify-center rounded-full bg-[#Cf8085] text-white text-[8px]">●</span>
                    )}
                  </button>
                );
              })}
            </div>
          ))
        ) : (
          <div className="flex-1 text-center py-4 text-neutral-500 text-sm">
            Tidak ada jadwal shift hari ini
          </div>
        )}
      </div>

      {/* ===== GPS status ===== */}
      <div className="mx-5 mb-4 flex items-center gap-2 rounded-xl border border-neutral-100 bg-white px-3.5 py-2.5 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)]">
        <span className={`h-2 w-2 rounded-full ${gpsDot}`} />
        <span className="text-xs font-medium text-neutral-600">{gpsText}</span>
      </div>

      {/* ===== STEP: PERMISSION ===== */}
      {step === STEP.PERMISSION && (
        <div className="mx-5 flex flex-1 flex-col items-center justify-center gap-6 pb-10">
          <div className="flex w-full max-w-sm gap-3">
            {[
              { label: "Kamera", status: camStatus, icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-7 w-7" strokeWidth={1.6}>
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              )},
              { label: "Lokasi GPS", status: geoStatus, icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-7 w-7" strokeWidth={1.6}>
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              )},
            ].map(({ label, status, icon }) => {
              const tone = status === "ok"
                ? { ring: "ring-[#EBC5C4]", bg: "bg-[#EBC5C4]/40", text: "text-[#663532]", dot: "bg-[#Cf8085]", label: "Diizinkan" }
                : status === "denied"
                ? { ring: "ring-red-200", bg: "bg-red-50", text: "text-red-600", dot: "bg-red-500", label: "Ditolak" }
                : { ring: "ring-neutral-200", bg: "bg-neutral-50", text: "text-neutral-400", dot: "bg-neutral-300", label: "Belum" };
              return (
                <div key={label} className={`flex flex-1 flex-col items-center gap-2 rounded-2xl ${tone.bg} px-4 py-5 ring-1 ${tone.ring}`}>
                  <span className={tone.text}>{icon}</span>
                  <span className="text-xs font-semibold text-neutral-700">{label}</span>
                  <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide ${tone.text}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
                    {tone.label}
                  </span>
                </div>
              );
            })}
          </div>

          <p className="max-w-xs text-center text-sm leading-relaxed text-neutral-500">
            Izinkan akses <strong className="text-neutral-800">kamera</strong> dan <strong className="text-neutral-800">lokasi GPS</strong> saat popup muncul.
          </p>

          <div className="w-full max-w-sm"><ErrBox>{error}</ErrBox></div>

          <button type="button" onClick={requestPermissions} disabled={geoStatus === "loading"}
            className={`w-full max-w-xs px-6 py-4 text-base ${BTN_PRIMARY}`}>
            {geoStatus === "loading" ? "Meminta izin..." : "Izinkan Kamera & GPS"}
          </button>

          {(camStatus === "denied" || geoStatus === "denied") && (
            <p className="max-w-xs text-center text-xs leading-relaxed text-neutral-400">
              Jika ditolak, buka <strong>Pengaturan browser → Izin situs</strong> dan aktifkan kamera/lokasi manual.
            </p>
          )}
        </div>
      )}

      {/* ===== STEP: SCAN ===== */}
      {step === STEP.SCAN && (
        <div className="mx-5 flex flex-1 flex-col gap-4 pb-10">
          <div className="flex items-center gap-2">
            {stepLabels.map((label, i) => (
              <div key={label} className="flex flex-1 items-center gap-2">
                <div className="flex flex-1 flex-col items-center gap-1.5">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold transition-all duration-300 ${
                    stepIdx > i ? "bg-gradient-to-br from-[#Cf8085] to-[#663532] text-white shadow-sm shadow-[#663532]/40"
                    : stepIdx === i ? "bg-[#663532] text-white ring-4 ring-[#663532]/10"
                    : "bg-neutral-100 text-neutral-400"
                  }`}>
                    {stepIdx > i ? <Check c="h-3.5 w-3.5" /> : i + 1}
                  </div>
                  <span className={`text-[10px] font-semibold uppercase tracking-wider ${
                    stepIdx === i ? "text-[#663532]" : stepIdx > i ? "text-[#Cf8085]" : "text-neutral-400"
                  }`}>{label}</span>
                </div>
                {i < stepLabels.length - 1 && (
                  <div className={`h-0.5 flex-1 rounded-full ${stepIdx > i ? "bg-[#Cf8085]" : "bg-neutral-100"}`} />
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
              <span className={ICON_BOX}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-3.5 w-3.5" strokeWidth={1.7}>
                  <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" />
                  <path d="M14 14h3v3h-3zM21 14v3M21 21h-3M14 21h3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              Scan QR barang
            </div>
            <FlipBtn onClick={flipCam} />
          </div>

          <div className="relative overflow-hidden rounded-3xl bg-neutral-900 shadow-[0_10px_40px_-12px_rgba(0,0,0,0.4)]" style={{ aspectRatio: "1/1" }}>
            <div id="qr-box" className="h-full w-full" />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="relative h-52 w-52">
                <span className="absolute left-0 top-0 h-8 w-8 rounded-tl-2xl border-l-[3px] border-t-[3px] border-[#Cf8085]" />
                <span className="absolute right-0 top-0 h-8 w-8 rounded-tr-2xl border-r-[3px] border-t-[3px] border-[#Cf8085]" />
                <span className="absolute bottom-0 left-0 h-8 w-8 rounded-bl-2xl border-b-[3px] border-l-[3px] border-[#Cf8085]" />
                <span className="absolute bottom-0 right-0 h-8 w-8 rounded-br-2xl border-b-[3px] border-r-[3px] border-[#Cf8085]" />
              </div>
            </div>
          </div>

          <ErrBox>{error}</ErrBox>

          <p className="text-center text-xs text-neutral-500">
            Arahkan kamera ke QR Code pada barang <strong className="text-neutral-800">{item?.nama_barang}</strong>
          </p>
        </div>
      )}

      {/* ===== STEP: PHOTO ===== */}
      {step === STEP.PHOTO && (
        <div className="mx-5 flex flex-1 flex-col gap-4 pb-32">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
              <span className={ICON_BOX}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-3.5 w-3.5" strokeWidth={1.6}>
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </span>
              Foto barang
            </div>
            <FlipBtn onClick={flipCam} />
          </div>

          <div className="relative overflow-hidden rounded-3xl bg-neutral-900 shadow-[0_10px_40px_-12px_rgba(0,0,0,0.4)]" style={{ aspectRatio: "3/4" }}>
            <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
            <div className="pointer-events-none absolute inset-6 rounded-2xl border border-dashed border-white/30" />
          </div>

          <ErrBox>{error}</ErrBox>
          <canvas ref={canvasRef} hidden />

          <div className="fixed inset-x-0 bottom-0 z-10 flex justify-center pb-[calc(28px+env(safe-area-inset-bottom,0px))]">
            <button type="button" onClick={capture} aria-label="Ambil foto"
              className="flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-[0_8px_30px_-6px_rgba(0,0,0,0.35)] ring-4 ring-white/60 transition-transform active:scale-90">
              <span className="h-14 w-14 rounded-full bg-gradient-to-br from-[#Cf8085] to-[#663532] shadow-inner" />
            </button>
          </div>
        </div>
      )}

      {/* ===== STEP: PREVIEW ===== */}
      {step === STEP.PREVIEW && photo && (
        <div className="mx-5 flex flex-1 flex-col gap-4 pb-10">
          <div className="relative overflow-hidden rounded-3xl shadow-[0_10px_40px_-12px_rgba(0,0,0,0.3)]" style={{ aspectRatio: "3/4" }}>
            <img src={URL.createObjectURL(photo)} alt="preview" className="h-full w-full object-cover" />
            <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-[#Cf8085]" />
              Pratinjau
            </div>
          </div>

          <ErrBox>{error}</ErrBox>

          <div className="flex gap-3">
            <button type="button" onClick={retake} className={`flex-1 px-4 py-4 text-sm ${BTN_GHOST}`}>
              Foto Ulang
            </button>
            <button type="button" onClick={submit} disabled={loading} className={`flex-1 px-4 py-4 text-sm ${BTN_PRIMARY}`}>
              {loading ? "Menyimpan..." : `Kirim Absen ${tipe}`}
            </button>
          </div>
        </div>
      )}

      {/* ===== STEP: DONE ===== */}
      {step === STEP.DONE && (
        <div className="mx-5 flex flex-1 flex-col items-center justify-center gap-6 pb-10 text-center">
          <div className="relative">
            <div className="absolute inset-0 animate-ping rounded-full bg-[#Cf8085]/30" />
            <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-[#Cf8085] to-[#663532] text-white shadow-[0_12px_36px_-8px_rgba(102,53,50,0.6)]">
              <Check c="h-11 w-11" />
            </div>
          </div>

          <div className="max-w-xs">
            <h2 className="text-xl font-bold tracking-tight text-neutral-900">Absen berhasil!</h2>
            <p className="mt-2 text-sm leading-relaxed text-neutral-500">{msg}</p>
          </div>

          {!allDone ? (
            <button type="button" onClick={restart} className={`px-8 py-3.5 text-sm ${BTN_PRIMARY}`}>
              {getNextAction()}
            </button>
          ) : (
            <div className="inline-flex items-center gap-2 rounded-full bg-[#EBC5C4]/40 px-4 py-2 text-xs font-semibold text-[#663532] ring-1 ring-[#EBC5C4]">
              <Check c="h-3.5 w-3.5" />
              Semua shift absen selesai hari ini
            </div>
          )}
        </div>
      )}
    </div>
  );
}