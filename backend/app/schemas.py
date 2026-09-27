from datetime import date, datetime, time

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models import AttendanceType, ReportStatus, UserRole


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenUser(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nama: str
    email: str
    role: UserRole
    store_id: int | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: TokenUser


class StoreBase(BaseModel):
    nama: str
    latitude: float
    longitude: float
    radius_meter: int = 150


class StoreCreate(StoreBase):
    pass


class StoreUpdate(BaseModel):
    nama: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    radius_meter: int | None = None


class StoreOut(StoreBase):
    model_config = ConfigDict(from_attributes=True)

    id: int


class UserCreate(BaseModel):
    nama: str
    email: EmailStr
    password: str = Field(min_length=6)
    role: UserRole = UserRole.karyawan
    store_id: int | None = None
    is_active: bool = True


class UserUpdate(BaseModel):
    nama: str | None = None
    email: EmailStr | None = None
    password: str | None = Field(default=None, min_length=6)
    role: UserRole | None = None
    store_id: int | None = None
    is_active: bool | None = None


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nama: str
    email: str
    role: UserRole
    store_id: int | None
    is_active: bool
    created_at: datetime | None = None
    store: StoreOut | None = None


class RandomItemCreate(BaseModel):
    nama_barang: str
    aktif: bool = True


class RandomItemUpdate(BaseModel):
    nama_barang: str | None = None
    aktif: bool | None = None


class RandomItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nama_barang: str
    qr_token: str | None = None
    aktif: bool


class AttendanceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    tipe: AttendanceType
    waktu: datetime
    latitude: float
    longitude: float
    alamat: str | None
    foto_path: str
    random_item_id: int | None
    jarak_meter: float | None
    di_luar_radius: bool
    random_item: RandomItemOut | None = None
    user: TokenUser | None = None


class ActivityCreate(BaseModel):
    deskripsi: str = Field(min_length=1)
    tanggal: date | None = None


class ActivityUpdate(BaseModel):
    deskripsi: str = Field(min_length=1)


class ActivityOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    deskripsi: str
    waktu: datetime


class DailyReportOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tanggal: date
    konten_text: str
    sent_at: datetime | None
    status: ReportStatus


class DailyReportUpdate(BaseModel):
    konten_text: str


class DailyReportSend(BaseModel):
    tanggal: date | None = None
    konten_text: str | None = None


class ScheduleCreate(BaseModel):
    user_id: int
    day_of_week: str
    start_time: str
    end_time: str


class ScheduleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    day_of_week: str
    start_time: time
    end_time: time
    user: TokenUser | None = None
