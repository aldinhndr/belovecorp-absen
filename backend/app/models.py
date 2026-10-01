from datetime import date, datetime, time
from enum import Enum as PyEnum

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    Time,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class UserRole(str, PyEnum):
    karyawan = "karyawan"
    admin = "admin"


class AttendanceType(str, PyEnum):
    masuk = "masuk"
    pulang = "pulang"


class ReportStatus(str, PyEnum):
    draft = "draft"
    sent = "sent"


class Store(Base):
    __tablename__ = "stores"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nama: Mapped[str] = mapped_column(String(150), nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    radius_meter: Mapped[int] = mapped_column(Integer, default=150, nullable=False)

    users: Mapped[list["User"]] = relationship(back_populates="store")


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nama: Mapped[str] = mapped_column(String(150), nullable=False)
    email: Mapped[str] = mapped_column(String(191), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, values_callable=lambda x: [e.value for e in x]),
        default=UserRole.karyawan,
        nullable=False,
    )
    store_id: Mapped[int | None] = mapped_column(ForeignKey("stores.id"), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    store: Mapped["Store | None"] = relationship(back_populates="users")
    attendances: Mapped[list["Attendance"]] = relationship(back_populates="user")
    activities: Mapped[list["Activity"]] = relationship(back_populates="user")


class RandomItem(Base):
    __tablename__ = "random_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nama_barang: Mapped[str] = mapped_column(String(150), nullable=False)
    qr_token: Mapped[str | None] = mapped_column(String(64), unique=True, nullable=True)
    aktif: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class Attendance(Base):
    __tablename__ = "attendances"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    tipe: Mapped[AttendanceType] = mapped_column(
        Enum(AttendanceType, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
    )
    waktu: Mapped[datetime] = mapped_column(DateTime, nullable=False, index=True)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    alamat: Mapped[str | None] = mapped_column(Text, nullable=True)
    foto_path: Mapped[str] = mapped_column(String(255), nullable=False)
    random_item_id: Mapped[int | None] = mapped_column(ForeignKey("random_items.id"))
    jarak_meter: Mapped[float | None] = mapped_column(Float, nullable=True)
    di_luar_radius: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    user: Mapped["User"] = relationship(back_populates="attendances")
    random_item: Mapped["RandomItem | None"] = relationship()


class Activity(Base):
    __tablename__ = "activities"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    deskripsi: Mapped[str] = mapped_column(Text, nullable=False)
    waktu: Mapped[datetime] = mapped_column(DateTime, nullable=False, index=True)

    user: Mapped["User"] = relationship(back_populates="activities")


class Schedule(Base):
    __tablename__ = "schedules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    day_of_week: Mapped[str] = mapped_column(String(12), nullable=False)
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)
    user: Mapped["User"] = relationship()


class DailyReport(Base):
    __tablename__ = "daily_reports"
    __table_args__ = (UniqueConstraint("tanggal", name="uq_daily_reports_tanggal"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tanggal: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    konten_text: Mapped[str] = mapped_column(Text, nullable=False)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    status: Mapped[ReportStatus] = mapped_column(
        Enum(ReportStatus, values_callable=lambda x: [e.value for e in x]),
        default=ReportStatus.draft,
        nullable=False,
    )
