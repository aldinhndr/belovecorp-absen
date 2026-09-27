from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session, joinedload

from app.config import settings
from app.models import Activity, DailyReport, ReportStatus, User, UserRole


HARI_ID = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"]
BULAN_ID = [
    "",
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
]


def tz() -> ZoneInfo:
    return ZoneInfo(settings.timezone)


def now_wib() -> datetime:
    return datetime.now(tz())


def day_range(target: date) -> tuple[datetime, datetime]:
    start = datetime.combine(target, time.min).replace(tzinfo=tz())
    end = datetime.combine(target, time.max).replace(tzinfo=tz())
    return start.replace(tzinfo=None), end.replace(tzinfo=None)


def format_tanggal(target: date) -> str:
    return f"{HARI_ID[target.weekday()]}, {target.day} {BULAN_ID[target.month]} {target.year}"


def _unique_descriptions(items: list[Activity]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for item in items:
        text = " ".join(item.deskripsi.split())
        if not text:
            continue
        key = text.casefold()
        if key in seen:
            continue
        seen.add(key)
        result.append(text)
    return result


def generate_report_text(db: Session, target: date, days: int = 1) -> str:
    employees = (
        db.query(User)
        .filter(User.role == UserRole.karyawan, User.is_active.is_(True))
        .order_by(User.nama.asc())
        .all()
    )
    span = max(1, days)
    dates = [target - timedelta(days=offset) for offset in range(span - 1, -1, -1)]
    start, _ = day_range(dates[0])
    _, end = day_range(dates[-1])
    activities = (
        db.query(Activity)
        .options(joinedload(Activity.user))
        .filter(Activity.waktu >= start, Activity.waktu <= end)
        .order_by(Activity.waktu.asc())
        .all()
    )
    by_day_user: dict[date, dict[int, list[Activity]]] = {d: {} for d in dates}
    for act in activities:
        day = act.waktu.date() if isinstance(act.waktu, datetime) else act.waktu
        if day not in by_day_user:
            continue
        by_day_user[day].setdefault(act.user_id, []).append(act)

    blocks: list[str] = []
    for day in dates:
        lines = [format_tanggal(day)]
        if not employees:
            lines.append("Activity:")
            lines.append("- Belum ada karyawan aktif.")
        else:
            any_activity = False
            for emp in employees:
                user_acts = _unique_descriptions(by_day_user[day].get(emp.id, []))
                if user_acts:
                    any_activity = True
                    lines.append("")
                    lines.append(f"{emp.nama}")
                    lines.append("Activity:")
                    for desc in user_acts:
                        lines.append(f"- {desc}")
            if not any_activity:
                lines.append("Activity:")
                lines.append("- (tidak ada log kegiatan)")
        blocks.append("\n".join(lines))
    return "\n\n".join(blocks)


def upsert_draft(db: Session, target: date, konten: str | None = None) -> DailyReport:
    report = db.query(DailyReport).filter(DailyReport.tanggal == target).first()
    text = konten if konten is not None else generate_report_text(db, target)
    if report:
        if report.status != ReportStatus.sent:
            report.konten_text = text
        db.commit()
        db.refresh(report)
        return report
    report = DailyReport(tanggal=target, konten_text=text, status=ReportStatus.draft)
    db.add(report)
    db.commit()
    db.refresh(report)
    return report
