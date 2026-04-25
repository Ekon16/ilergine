from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from core.config import settings
from core.database import init_db
from api.v1.auth.routes import router as auth_router
from api.v1.pacientes.routes import router as pacientes_router
from api.v1.ws.consultas import router as consultas_router
from tasks.purge_audio import purge_old_audio


scheduler = AsyncIOScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()

    scheduler.add_job(
        purge_old_audio,
        trigger=CronTrigger(hour=0, minute=0),
        id="purge_audio",
        name="Purga diaria de audios a medianoche",
        replace_existing=True,
    )
    scheduler.start()

    yield

    scheduler.shutdown(wait=False)


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api/v1")
app.include_router(pacientes_router, prefix="/api/v1")
app.include_router(consultas_router, prefix="/api/v1")


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": settings.APP_NAME, "version": settings.APP_VERSION}
