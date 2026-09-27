from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from app.config import settings
from app.database import SessionLocal
from app.models import DailyReport, ReportStatus
from app.reports import now_wib, upsert_draft
from app.telegram import send_telegram_message


scheduler = BackgroundScheduler(timezone=settings.timezone)


def run_daily_report_job() -> None:
    db = SessionLocal()
    try:
        target = now_wib().date()
        report = upsert_draft(db, target)
        if report.status == ReportStatus.sent:
            return
        result = send_telegram_message(report.konten_text)
        if result.get("ok"):
            report.status = ReportStatus.sent
            report.sent_at = now_wib().replace(tzinfo=None)
            db.commit()
    finally:
        db.close()


def start_scheduler() -> None:
    if scheduler.running:
        return
    scheduler.add_job(
        run_daily_report_job,
        CronTrigger(hour=settings.report_hour, minute=settings.report_minute),
        id="daily_report",
        replace_existing=True,
    )
    scheduler.start()
