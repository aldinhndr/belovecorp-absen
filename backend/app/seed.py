import secrets

from sqlalchemy.orm import Session

from datetime import time

from app.config import settings
from app.models import RandomItem, Schedule, Store, User, UserRole
from app.security import hash_password


DEFAULT_ITEMS = [
    "Tissue",
    "Sabun cuci piring",
    "Minyak goreng",
    "Gula pasir",
    "Kopi sachet",
    "Air mineral 600ml",
    "Indomie goreng",
    "Teh celup",
    "Sikat gigi",
    "Sabun mandi",
]


def seed_if_empty(db: Session) -> None:
    store = db.query(Store).first()
    if not store:
        store = Store(
            nama="Belove Store Pusat",
            latitude=-5.3790617,
            longitude=105.2457338,
            radius_meter=150,
        )
        db.add(store)
        db.flush()

    admin_email = settings.admin_email.strip().lower()
    admin = db.query(User).filter(User.email == admin_email).first()
    if not admin:
        db.add(
            User(
                nama=settings.admin_name,
                email=admin_email,
                password_hash=hash_password(settings.admin_password),
                role=UserRole.admin,
                store_id=store.id,
                is_active=True,
            )
        )

    demo = db.query(User).filter(User.email == "karyawan@belovecorp.com").first()
    if not demo:
        db.add(
            User(
                nama="Karyawan Demo",
                email="karyawan@belovecorp.com",
                password_hash=hash_password("karyawan123"),
                role=UserRole.karyawan,
                store_id=store.id,
                is_active=True,
            )
        )

    if db.query(RandomItem).count() == 0:
        for name in DEFAULT_ITEMS:
            db.add(RandomItem(nama_barang=name, qr_token=secrets.token_hex(16), aktif=True))

    for item in db.query(RandomItem).filter(RandomItem.qr_token.is_(None)).all():
        item.qr_token = secrets.token_hex(16)

    # Seed Joy & Nabila if not exists
    joy = db.query(User).filter(User.email == "joy@belovecorp.com").first()
    if not joy:
        joy = User(
            nama="Joy",
            email="joy@belovecorp.com",
            password_hash=hash_password("joy123"),
            role=UserRole.karyawan,
            store_id=store.id,
            is_active=True,
        )
        db.add(joy)
        db.flush()

        joy_schedules = [
            ("Senin", time(8, 0), time(10, 0)),
            ("Selasa", time(12, 0), time(18, 0)),
            ("Rabu", time(11, 0), time(17, 0)),
            ("Kamis", time(13, 0), time(18, 0)),
            ("Jumat", time(13, 0), time(14, 0)),
        ]
        for day, st, et in joy_schedules:
            db.add(Schedule(user_id=joy.id, day_of_week=day, start_time=st, end_time=et))

    nabila = db.query(User).filter(User.email == "nabila@belovecorp.com").first()
    if not nabila:
        nabila = User(
            nama="Nabila",
            email="nabila@belovecorp.com",
            password_hash=hash_password("nabila123"),
            role=UserRole.karyawan,
            store_id=store.id,
            is_active=True,
        )
        db.add(nabila)
        db.flush()

        nabila_schedules = [
            ("Selasa", time(13, 0), time(17, 0)),
            ("Rabu", time(15, 0), time(18, 0)),
            ("Kamis", time(8, 0), time(12, 0)),
            ("Sabtu", time(13, 0), time(17, 0)),
        ]
        for day, st, et in nabila_schedules:
            db.add(Schedule(user_id=nabila.id, day_of_week=day, start_time=st, end_time=et))

    db.commit()
