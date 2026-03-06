from sqlalchemy.orm import Session
from fastapi import Request
from app.models.user import ActivityLog


def log_activity(
    db: Session,
    user,
    acao: str,
    recurso: str,
    descricao: str,
    recurso_id: int = None,
    request: Request = None,
):
    """Log a user activity to the database."""
    ip = None
    if request:
        ip = request.client.host if request.client else None

    log = ActivityLog(
        usuario_id=user.id if user else None,
        usuario_nome=user.nome if user else "Sistema",
        usuario_email=user.email if user else None,
        acao=acao,
        recurso=recurso,
        recurso_id=recurso_id,
        descricao=descricao,
        ip_address=ip,
    )
    db.add(log)
    db.commit()
    return log
