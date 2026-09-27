from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Activity, User
from app.reports import day_range, now_wib
from app.schemas import ActivityCreate, ActivityOut, ActivityUpdate
from app.security import get_current_user

router = APIRouter(prefix="/activities", tags=["activities"])


@router.post("", response_model=ActivityOut, status_code=201)
def create_activity(
    payload: ActivityCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.tanggal:
        start, _ = day_range(payload.tanggal)
        waktu = start.replace(hour=now_wib().hour, minute=now_wib().minute, second=now_wib().second)
    else:
        waktu = now_wib().replace(tzinfo=None)

    record = Activity(
        user_id=current_user.id,
        deskripsi=payload.deskripsi.strip(),
        waktu=waktu,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.put("/{activity_id}", response_model=ActivityOut)
def update_activity(
    activity_id: int,
    payload: ActivityUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = db.query(Activity).filter(
        Activity.id == activity_id,
        Activity.user_id == current_user.id,
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="Kegiatan tidak ditemukan")
    record.deskripsi = payload.deskripsi.strip()
    db.commit()
    db.refresh(record)
    return record


@router.get("/me", response_model=list[ActivityOut])
def my_activities(
    date: date | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    target = date or now_wib().date()
    start, end = day_range(target)
    return (
        db.query(Activity)
        .filter(
            Activity.user_id == current_user.id,
            Activity.waktu >= start,
            Activity.waktu <= end,
        )
        .order_by(Activity.waktu.asc())
        .all()
    )
