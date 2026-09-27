from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import Schedule, User
from app.schemas import ScheduleOut
from app.security import get_current_user

router = APIRouter(prefix="/schedules", tags=["schedules"])


@router.get("", response_model=list[ScheduleOut])
def list_all_schedules(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return (
        db.query(Schedule)
        .options(joinedload(Schedule.user))
        .order_by(Schedule.user_id.asc(), Schedule.id.asc())
        .all()
    )


@router.get("/me", response_model=list[ScheduleOut])
def my_schedules(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Schedule)
        .options(joinedload(Schedule.user))
        .filter(Schedule.user_id == current_user.id)
        .order_by(Schedule.id.asc())
        .all()
    )
