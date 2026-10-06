from datetime import date, datetime, time

import base64
import io
import secrets

import qrcode
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import Attendance, AttendanceType, Activity, DailyReport, RandomItem, ReportStatus, Schedule, Store, User, UserRole
from app.reports import HARI_ID, generate_report_text, now_wib, upsert_draft
from app.schemas import (
    AttendanceOut,
    DailyReportOut,
    DailyReportSend,
    DailyReportUpdate,
    RandomItemCreate,
    RandomItemOut,
    RandomItemUpdate,
    ScheduleCreate,
    ScheduleOut,
    StoreCreate,
    StoreOut,
    StoreUpdate,
    UserCreate,
    UserOut,
    UserUpdate,
)
from app.security import hash_password, require_admin, get_current_user
from app.telegram import send_telegram_message

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])


@router.get("/attendances", response_model=list[AttendanceOut])
def list_attendances(
    date_from: date | None = None,
    date_to: date | None = None,
    user_id: int | None = None,
    db: Session = Depends(get_db),
):
    q = (
        db.query(Attendance)
        .options(joinedload(Attendance.random_item), joinedload(Attendance.user))
        .order_by(Attendance.waktu.desc())
    )
    if date_from:
        q = q.filter(Attendance.waktu >= datetime.combine(date_from, datetime.min.time()))
    if date_to:
        q = q.filter(Attendance.waktu <= datetime.combine(date_to, datetime.max.time()))
    if user_id:
        q = q.filter(Attendance.user_id == user_id)
    return q.limit(500).all()


@router.get("/daily-report", response_model=DailyReportOut)
def preview_daily_report(date: date | None = Query(default=None), db: Session = Depends(get_db)):
    target = date or now_wib().date()
    return upsert_draft(db, target)


@router.put("/daily-report", response_model=DailyReportOut)
def update_daily_report(
    payload: DailyReportUpdate,
    date: date | None = Query(default=None),
    db: Session = Depends(get_db),
):
    target = date or now_wib().date()
    report = upsert_draft(db, target)
    if report.status == ReportStatus.sent:
        raise HTTPException(status_code=400, detail="Laporan sudah terkirim")
    report.konten_text = payload.konten_text
    db.commit()
    db.refresh(report)
    return report


@router.post("/daily-report/send", response_model=DailyReportOut)
def send_daily_report(payload: DailyReportSend, db: Session = Depends(get_db)):
    target = payload.tanggal or now_wib().date()
    report = upsert_draft(db, target, payload.konten_text)
    result = send_telegram_message(report.konten_text)
    if not result.get("ok") and not result.get("skipped"):
        raise HTTPException(status_code=502, detail=f"Gagal kirim Telegram: {result.get('detail')}")
    if result.get("ok"):
        report.status = ReportStatus.sent
        report.sent_at = now_wib().replace(tzinfo=None)
        db.commit()
        db.refresh(report)
    return report


@router.get("/daily-reports", response_model=list[DailyReportOut])
def list_reports(db: Session = Depends(get_db)):
    return db.query(DailyReport).order_by(DailyReport.tanggal.desc()).limit(60).all()


@router.post("/daily-report/regenerate", response_model=DailyReportOut)
def regenerate_report(date: date | None = Query(default=None), db: Session = Depends(get_db)):
    target = date or now_wib().date()
    report = db.query(DailyReport).filter(DailyReport.tanggal == target).first()
    if report and report.status == ReportStatus.sent:
        raise HTTPException(status_code=400, detail="Laporan sudah terkirim")
    text = generate_report_text(db, target)
    return upsert_draft(db, target, text)


@router.get("/random-items", response_model=list[RandomItemOut])
def list_items(db: Session = Depends(get_db)):
    return db.query(RandomItem).order_by(RandomItem.nama_barang.asc()).all()


@router.post("/random-items/{item_id}/generate-qr", response_model=RandomItemOut)
def generate_item_qr(item_id: int, db: Session = Depends(get_db)):
    item = db.query(RandomItem).filter(RandomItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item tidak ditemukan")

    if not item.qr_token:
        item.qr_token = secrets.token_hex(16)
        db.commit()
        db.refresh(item)
    return item


@router.get("/random-items/{item_id}/qr", response_class=JSONResponse)
def get_item_qr_image(item_id: int, db: Session = Depends(get_db)):
    item = db.query(RandomItem).filter(RandomItem.id == item_id).first()
    if not item or not item.qr_token:
        raise HTTPException(status_code=404, detail="Item atau QR token tidak ditemukan")

    qr_data = f"belove_absen_qr:{item.qr_token}"
    qr_img = qrcode.make(qr_data)
    buffer = io.BytesIO()
    qr_img.save(buffer, format="PNG")
    img_str = base64.b64encode(buffer.getvalue()).decode("utf-8")

    return JSONResponse(content={
        "qr_data": qr_data,
        "qr_image_base64": f"data:image/png;base64,{img_str}"
    })


@router.post("/random-items", response_model=RandomItemOut, status_code=201)
def create_item(payload: RandomItemCreate, db: Session = Depends(get_db)):
    item = RandomItem(
        nama_barang=payload.nama_barang,
        qr_token=secrets.token_hex(16),
        aktif=payload.aktif,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/random-items/{item_id}", response_model=RandomItemOut)
def update_item(item_id: int, payload: RandomItemUpdate, db: Session = Depends(get_db)):
    item = db.query(RandomItem).filter(RandomItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item tidak ditemukan")
    if payload.nama_barang is not None:
        item.nama_barang = payload.nama_barang
    if payload.aktif is not None:
        item.aktif = payload.aktif
    db.commit()
    db.refresh(item)
    return item


@router.delete("/random-items/{item_id}", status_code=204)
def delete_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(RandomItem).filter(RandomItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item tidak ditemukan")
    db.delete(item)
    db.commit()


@router.get("/stores", response_model=list[StoreOut])
def list_stores(db: Session = Depends(get_db)):
    return db.query(Store).order_by(Store.nama.asc()).all()


@router.post("/stores", response_model=StoreOut, status_code=201)
def create_store(payload: StoreCreate, db: Session = Depends(get_db)):
    store = Store(**payload.model_dump())
    db.add(store)
    db.commit()
    db.refresh(store)
    return store


@router.put("/stores/{store_id}", response_model=StoreOut)
def update_store(store_id: int, payload: StoreUpdate, db: Session = Depends(get_db)):
    store = db.query(Store).filter(Store.id == store_id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Toko tidak ditemukan")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(store, key, value)
    db.commit()
    db.refresh(store)
    return store


@router.delete("/stores/{store_id}", status_code=204)
def delete_store(store_id: int, db: Session = Depends(get_db)):
    store = db.query(Store).filter(Store.id == store_id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Toko tidak ditemukan")
    db.delete(store)
    db.commit()


@router.get("/users", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db)):
    return db.query(User).options(joinedload(User.store)).order_by(User.nama.asc()).all()


@router.post("/users", response_model=UserOut, status_code=201)
def create_user(payload: UserCreate, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="Email sudah terdaftar")
    if payload.store_id and not db.query(Store).filter(Store.id == payload.store_id).first():
        raise HTTPException(status_code=400, detail="Toko tidak ditemukan")
    user = User(
        nama=payload.nama,
        email=email,
        password_hash=hash_password(payload.password),
        role=payload.role,
        store_id=payload.store_id,
        is_active=payload.is_active,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return db.query(User).options(joinedload(User.store)).filter(User.id == user.id).first()


@router.put("/users/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Karyawan tidak ditemukan")
    
    data = payload.model_dump(exclude_unset=True)
    if "is_active" in data and not data["is_active"] and current_user.id == user_id:
        raise HTTPException(status_code=400, detail="Tidak dapat menonaktifkan akun sendiri")
    if "password" in data:
        pwd = data.pop("password")
        if pwd:
            user.password_hash = hash_password(pwd)
    if "email" in data and data["email"] != user.email:
        if db.query(User).filter(User.email == data["email"], User.id != user_id).first():
            raise HTTPException(status_code=400, detail="Email sudah terdaftar")
    for key, value in data.items():
        setattr(user, key, value)
    db.commit()
    return db.query(User).options(joinedload(User.store)).filter(User.id == user_id).first()


@router.delete("/users/{user_id}", status_code=204)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Karyawan tidak ditemukan")
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="Tidak dapat menghapus akun sendiri")
    
    try:
        # Hapus semua relasi dulu agar bisa dihapus (cascade delete manual)
        db.query(Attendance).filter(Attendance.user_id == user_id).delete()
        db.query(Activity).filter(Activity.user_id == user_id).delete()
        db.query(Schedule).filter(Schedule.user_id == user_id).delete()
        
        db.delete(user)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Gagal hapus user: {str(e)}")
    return None

# --- SCHEDULES ---
@router.get("/schedules", response_model=list[ScheduleOut])
def list_schedules(user_id: int | None = None, db: Session = Depends(get_db)):
    q = db.query(Schedule).options(joinedload(Schedule.user))
    if user_id:
        q = q.filter(Schedule.user_id == user_id)
    return q.order_by(Schedule.user_id.asc(), Schedule.id.asc()).all()


@router.post("/schedules", response_model=ScheduleOut, status_code=201)
def create_schedule(payload: ScheduleCreate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == payload.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")

    try:
        sh, sm = map(int, payload.start_time.split(":"))
        eh, em = map(int, payload.end_time.split(":"))
        st = datetime.strptime(f"{sh:02d}:{sm:02d}", "%H:%M").time()
        et = datetime.strptime(f"{eh:02d}:{em:02d}", "%H:%M").time()
    except Exception:
        raise HTTPException(status_code=400, detail="Format jam harus HH:MM (misal 08:00)")

    record = Schedule(
        user_id=payload.user_id,
        day_of_week=payload.day_of_week,
        start_time=st,
        end_time=et,
    )
    db.add(record)
    db.commit()
    return db.query(Schedule).options(joinedload(Schedule.user)).filter(Schedule.id == record.id).first()


@router.delete("/schedules/{schedule_id}", status_code=204)
def delete_schedule(schedule_id: int, db: Session = Depends(get_db)):
    sch = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    if not sch:
        raise HTTPException(status_code=404, detail="Jadwal tidak ditemukan")
    db.delete(sch)
    db.commit()


# --- ABSEN MANUAL BY ADMIN ---
@router.post("/attendance/manual", response_model=AttendanceOut, status_code=201)
def manual_attendance(
    user_id: int = Query(...),
    tipe: AttendanceType = Query(...),
    tanggal: date | None = Query(default=None),
    jam: str = Query(default="08:00"),
    db: Session = Depends(get_db),
):
    user = db.query(User).options(joinedload(User.store)).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")

    target_date = tanggal or now_wib().date()
    try:
        hh, mm = map(int, jam.split(":"))
        waktu = datetime.combine(target_date, datetime.min.time()).replace(hour=hh, minute=mm)
    except Exception:
        raise HTTPException(status_code=400, detail="Format jam salah. Gunakan HH:MM")

    item = db.query(RandomItem).filter(RandomItem.aktif.is_(True)).first()
    item_id = item.id if item else None

    lat = user.store.latitude if user.store else -5.3790617
    lng = user.store.longitude if user.store else 105.2457338

    record = Attendance(
        user_id=user.id,
        tipe=tipe,
        waktu=waktu,
        latitude=lat,
        longitude=lng,
        alamat="Input Manual Admin",
        foto_path="manual.png",
        random_item_id=item_id,
        jarak_meter=0,
        di_luar_radius=False,
    )
    db.add(record)
    db.commit()
    return db.query(Attendance).options(joinedload(Attendance.random_item), joinedload(Attendance.user)).filter(Attendance.id == record.id).first()


# --- REKAP JAM KERJA & AKTIVITAS ---
@router.get("/work-hours-recap", response_model=list[dict])
def work_hours_recap(
    date_from: date = Query(...),
    date_to: date = Query(...),
    user_id: int | None = Query(None),
    db: Session = Depends(get_db),
):
    # Get all active karyawan
    karyawan_q = db.query(User).filter(User.role == UserRole.karyawan, User.is_active.is_(True))
    if user_id:
        karyawan_q = karyawan_q.filter(User.id == user_id)
    karyawan_list = karyawan_q.all()

    # Get all attendances in range
    start_dt = datetime.combine(date_from, time.min)
    end_dt = datetime.combine(date_to, time.max)
    attendances = (
        db.query(Attendance)
        .options(joinedload(Attendance.user), joinedload(Attendance.random_item))
        .filter(
            Attendance.waktu >= start_dt,
            Attendance.waktu <= end_dt,
        )
        .order_by(Attendance.waktu.asc())
        .all()
    )

    # Get all activities in range
    activities = (
        db.query(Activity)
        .options(joinedload(Activity.user))
        .filter(
            Activity.waktu >= start_dt,
            Activity.waktu <= end_dt,
        )
        .order_by(Activity.waktu.asc())
        .all()
    )

    # Get schedules for tolerance checking
    schedules = db.query(Schedule).all()
    sched_map = {(s.user_id, s.day_of_week): s for s in schedules}

    # Group attendances by user
    att_by_user = {}
    for att in attendances:
        att_by_user.setdefault(att.user_id, []).append(att)

    # Group activities by user
    act_by_user = {}
    for act in activities:
        act_by_user.setdefault(act.user_id, []).append(act)

    result = []
    for user in karyawan_list:
        user_att = att_by_user.get(user.id, [])
        user_act = act_by_user.get(user.id, [])

        # Pair masuk/pulang per hari per shift
        by_day_shift = {}
        for att in user_att:
            day_key = att.waktu.date()
            shift_key = att.shift_index
            by_day_shift.setdefault((day_key, shift_key), {"masuk": None, "pulang": None})
            if att.tipe == AttendanceType.masuk:
                by_day_shift[(day_key, shift_key)]["masuk"] = att
            else:
                by_day_shift[(day_key, shift_key)]["pulang"] = att

        daily_details = []
        total_minutes = 0
        total_overtime_minutes = 0
        total_late_minutes = 0

        for (day_key, shift_key), pair in sorted(by_day_shift.items()):
            day_name = HARI_ID[day_key.weekday()]
            schedule = sched_map.get((user.id, day_name))

            masuk = pair.get("masuk")
            pulang = pair.get("pulang")

            masuk_time = masuk.waktu.time() if masuk else None
            pulang_time = pulang.waktu.time() if pulang else None

            # Cek jadwal
            scheduled_start = schedule.start_time if schedule else None
            scheduled_end = schedule.end_time if schedule else None

            # Hitung late (keterlambatan masuk)
            late_minutes = 0
            if masuk and scheduled_start:
                masuk_dt = datetime.combine(day_key, masuk_time)
                sched_start_dt = datetime.combine(day_key, scheduled_start)
                diff = (masuk_dt - sched_start_dt).total_seconds() / 60
                if diff > 60:  # lebih dari 1 jam toleransi
                    late_minutes = int(diff)

            # Hitung durasi kerja (handle overnight shift)
            work_minutes = 0
            if masuk and pulang:
                diff_seconds = (pulang.waktu - masuk.waktu).total_seconds()
                if diff_seconds < 0:
                    diff_seconds += 24 * 3600
                work_minutes = int(diff_seconds / 60)

# Hitung overtime (lebih dari jam keluar jadwal + 1 jam toleransi) - handle overnight
            overtime_minutes = 0
            if pulang and scheduled_end:
                pulang_dt = datetime.combine(day_key, pulang_time)
                sched_end_dt = datetime.combine(day_key, scheduled_end)
                if pulang_dt < masuk.waktu:
                    pulang_dt += timedelta(days=1)
                diff = (pulang_dt - sched_end_dt).total_seconds() / 60
                if diff > 60:
                    overtime_minutes = int(diff)

            total_minutes += work_minutes
            total_overtime_minutes += overtime_minutes
            total_late_minutes += late_minutes

            # Ambil aktivitas hari itu
            day_activities = [
                {"waktu": act.waktu.time(), "deskripsi": act.deskripsi}
                for act in user_act
                if act.waktu.date() == day_key
            ]

            daily_details.append({
                "tanggal": day_key.isoformat(),
                "hari": day_name,
                "shift": shift_key + 1,
                "masuk": masuk_time.strftime("%H:%M") if masuk_time else "-",
                "pulang": pulang_time.strftime("%H:%M") if pulang_time else "-",
                "jadwal_masuk": scheduled_start.strftime("%H:%M") if scheduled_start else "-",
                "jadwal_pulang": scheduled_end.strftime("%H:%M") if scheduled_end else "-",
                "durasi_jam": round(work_minutes / 60, 2),
                "durasi_menit": work_minutes,
                "keterlambatan_menit": late_minutes,
                "lembur_menit": overtime_minutes,
                "aktivitas": day_activities,
                "masuk_di_luar_radius": masuk.di_luar_radius if masuk else False,
                "pulang_di_luar_radius": pulang.di_luar_radius if pulang else False,
            })

        # Total jam format HH:MM
        total_hours = total_minutes // 60
        total_mins = total_minutes % 60
        overtime_hours = total_overtime_minutes // 60
        overtime_mins = total_overtime_minutes % 60

        result.append({
            "user_id": user.id,
            "nama": user.nama,
            "email": user.email,
            "total_hari_kerja": len([d for d in daily_details if d["masuk"] != "-"]),
            "total_jam_kerja": f"{total_hours:02d}:{total_mins:02d}",
            "total_jam_kerja_menit": total_minutes,
            "total_lembur": f"{overtime_hours:02d}:{overtime_mins:02d}",
            "total_lembur_menit": total_overtime_minutes,
            "total_keterlambatan_menit": total_late_minutes,
            "rata_rata_jam_per_hari": round(total_minutes / max(len([d for d in daily_details if d["masuk"] != "-"]), 1), 2) if total_minutes > 0 else 0,
            "detail_harian": daily_details,
        })

    return result
