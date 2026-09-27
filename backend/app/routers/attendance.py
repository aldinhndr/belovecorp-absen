import uuid
from datetime import date, timedelta
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session, joinedload

from app.config import settings
from app.database import get_db
from app.geo import haversine_m, reverse_geocode
from app.models import Attendance, AttendanceType, RandomItem, Schedule, User, UserRole
from app.reports import HARI_ID, day_range, now_wib
from app.schemas import AttendanceOut, RandomItemOut
from app.security import get_current_user

router = APIRouter(tags=["attendance"])

ALLOWED_TYPES = {"image/jpeg": ".jpg", "image/png": ".png", "image/jpg": ".jpg"}


@router.get("/random-item/next", response_model=RandomItemOut)
def next_random_item(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    item = (
        db.query(RandomItem)
        .filter(RandomItem.aktif.is_(True))
        .order_by(RandomItem.id)
        .all()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Belum ada barang random aktif")
    from random import choice

    return choice(item)


def _save_photo(file: UploadFile) -> str:
    content_type = (file.content_type or "").lower()
    ext = ALLOWED_TYPES.get(content_type)
    if not ext:
        raise HTTPException(status_code=400, detail="Foto harus JPG atau PNG")
    data = file.file.read()
    max_bytes = settings.max_photo_mb * 1024 * 1024
    if len(data) > max_bytes:
        raise HTTPException(status_code=400, detail=f"Ukuran foto maks {settings.max_photo_mb}MB")
    if len(data) == 0:
        raise HTTPException(status_code=400, detail="Foto kosong")
    filename = f"{uuid.uuid4().hex}{ext}"
    dest: Path = settings.upload_path / filename
    dest.write_bytes(data)
    return filename


@router.post("/attendance", response_model=AttendanceOut, status_code=status.HTTP_201_CREATED)
def submit_attendance(
    tipe: AttendanceType = Form(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    random_item_id: int = Form(...),
    qr_token: str | None = Form(default=None),
    foto: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = db.query(RandomItem).filter(RandomItem.id == random_item_id, RandomItem.aktif.is_(True)).first()
    if not item:
        raise HTTPException(status_code=400, detail="Barang random tidak valid")
    if item.qr_token:
        scanned = (qr_token or "").replace("belove_absen_qr:", "").strip()
        if scanned != item.qr_token:
            raise HTTPException(status_code=400, detail="QR Code tidak sesuai barang yang diminta")

    now = now_wib().replace(tzinfo=None)
    start, end = day_range(now.date())

    # Validasi Jadwal Kerja (Khusus Karyawan, Admin Bebas)
    if current_user.role == UserRole.karyawan:
        day_name = HARI_ID[now.weekday()]
        sch = db.query(Schedule).filter(
            Schedule.user_id == current_user.id,
            Schedule.day_of_week == day_name,
        ).first()

        if not sch:
            raise HTTPException(
                status_code=400,
                detail=f"Anda tidak memiliki jadwal kerja hari ini ({day_name}). Silakan lapor ke Admin."
            )

        now_time = now.time()
        st_dt = datetime.combine(now.date(), sch.start_time)
        et_dt = datetime.combine(now.date(), sch.end_time)

        # Toleransi 1 jam
        if tipe == AttendanceType.masuk:
            earliest = (st_dt - timedelta(hours=1)).time()
            latest = (st_dt + timedelta(hours=1)).time()
            if not (earliest <= now_time <= latest):
                st_str = sch.start_time.strftime("%H:%M")
                raise HTTPException(
                    status_code=400,
                    detail=f"Absen masuk di luar toleransi (Jadwal: {st_str}, Toleransi 1 jam). Terlambat/terlalu cepat? Silakan lapor Admin."
                )
        elif tipe == AttendanceType.pulang:
            earliest = (et_dt - timedelta(hours=1)).time()
            latest = (et_dt + timedelta(hours=1)).time()
            if not (earliest <= now_time <= latest):
                et_str = sch.end_time.strftime("%H:%M")
                raise HTTPException(
                    status_code=400,
                    detail=f"Absen pulang di luar toleransi (Jadwal pulang: {et_str}, Toleransi 1 jam). Silakan lapor Admin."
                )

    existing = (
        db.query(Attendance)
        .filter(
            Attendance.user_id == current_user.id,
            Attendance.tipe == tipe,
            Attendance.waktu >= start,
            Attendance.waktu <= end,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail=f"Sudah absen {tipe.value} hari ini")

    jarak = None
    di_luar = False
    if current_user.store:
        jarak = haversine_m(
            latitude, longitude, current_user.store.latitude, current_user.store.longitude
        )
        if jarak > current_user.store.radius_meter:
            raise HTTPException(
                status_code=400,
                detail=f"Lokasi absen di luar jangkauan (Jarak: {round(jarak)}m. Maks: {current_user.store.radius_meter}m)."
            )

    foto_path = _save_photo(foto)
    alamat = reverse_geocode(latitude, longitude)

    record = Attendance(
        user_id=current_user.id,
        tipe=tipe,
        waktu=now,
        latitude=latitude,
        longitude=longitude,
        alamat=alamat,
        foto_path=foto_path,
        random_item_id=item.id,
        jarak_meter=jarak,
        di_luar_radius=di_luar,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    record = (
        db.query(Attendance)
        .options(joinedload(Attendance.random_item), joinedload(Attendance.user))
        .filter(Attendance.id == record.id)
        .first()
    )
    return record


@router.get("/attendance/me", response_model=list[AttendanceOut])
def my_attendance(
    date_from: date | None = None,
    date_to: date | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = (
        db.query(Attendance)
        .options(joinedload(Attendance.random_item))
        .filter(Attendance.user_id == current_user.id)
        .order_by(Attendance.waktu.desc())
    )
    if date_from:
        start, _ = day_range(date_from)
        q = q.filter(Attendance.waktu >= start)
    if date_to:
        _, end = day_range(date_to)
        q = q.filter(Attendance.waktu <= end)
    return q.limit(100).all()
