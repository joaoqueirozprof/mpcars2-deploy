from celery import Celery
from celery.schedules import crontab
from app.core.config import settings

celery = Celery("mpcars2", broker=settings.REDIS_URL, backend=settings.REDIS_URL)

celery.conf.beat_schedule = {
    "gerar-alertas-diarios": {
        "task": "app.tasks.alertas.gerar_alertas_diarios",
        "schedule": crontab(hour=7, minute=0),
    },
}

celery.conf.timezone = "America/Fortaleza"
celery.autodiscover_tasks(["app.tasks"])
