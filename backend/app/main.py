from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import Base, SessionLocal, engine, ensure_schema
from app.routers import activities, admin, attendance, auth, schedules
from app.scheduler import start_scheduler
from app.seed import seed_if_empty


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    ensure_schema()
    db = SessionLocal()
    try:
        seed_if_empty(db)
    finally:
        db.close()
    start_scheduler()
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=str(settings.upload_path)), name="uploads")
app.include_router(auth.router)
app.include_router(attendance.router)
app.include_router(activities.router)
app.include_router(schedules.router)
app.include_router(admin.router)


@app.get("/health")
def health():
    return {"status": "ok", "app": settings.app_name}
