from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from pydantic import BaseModel, EmailStr
from datetime import datetime, date
from app.core.database import get_db
from app.core.deps import get_admin_user, get_current_user
from app.core.security import get_password_hash
from app.models.user import User, ActivityLog, ALL_PAGES
from app.services.activity_logger import log_activity

router = APIRouter(prefix="/usuarios", tags=["Usuários"])


# === Schemas ===

class UsuarioCreate(BaseModel):
    email: EmailStr
    password: str
    nome: str
    perfil: str = "user"
    permitted_pages: List[str] = []


class UsuarioUpdate(BaseModel):
    nome: Optional[str] = None
    email: Optional[EmailStr] = None
    perfil: Optional[str] = None
    permitted_pages: Optional[List[str]] = None


class UsuarioResponse(BaseModel):
    id: int
    email: str
    nome: str
    perfil: str
    ativo: bool
    permitted_pages: List[str]
    data_cadastro: Optional[datetime] = None

    class Config:
        from_attributes = True


class ResetSenhaRequest(BaseModel):
    nova_senha: str


class ActivityLogResponse(BaseModel):
    id: int
    usuario_id: Optional[int] = None
    usuario_nome: Optional[str] = None
    usuario_email: Optional[str] = None
    acao: Optional[str] = None
    recurso: Optional[str] = None
    recurso_id: Optional[int] = None
    descricao: Optional[str] = None
    ip_address: Optional[str] = None
    timestamp: Optional[datetime] = None

    class Config:
        from_attributes = True


# === Endpoints ===

@router.get("/", response_model=List[UsuarioResponse])
def listar_usuarios(
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """List all users (admin only)."""
    users = db.query(User).order_by(User.id).all()
    result = []
    for u in users:
        result.append({
            "id": u.id,
            "email": u.email,
            "nome": u.nome,
            "perfil": u.perfil,
            "ativo": u.ativo,
            "permitted_pages": u.permitted_pages or (ALL_PAGES if u.perfil == "admin" else []),
            "data_cadastro": u.data_cadastro,
        })
    return result


@router.post("/", response_model=UsuarioResponse, status_code=status.HTTP_201_CREATED)
def criar_usuario(
    data: UsuarioCreate,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """Create a new user (admin only)."""
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email já cadastrado",
        )

    # Validate pages
    valid_pages = [p for p in data.permitted_pages if p in ALL_PAGES]

    new_user = User(
        email=data.email,
        hashed_password=get_password_hash(data.password),
        nome=data.nome,
        perfil=data.perfil,
        ativo=True,
        permitted_pages=valid_pages,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    log_activity(db, admin, "CRIAR", "usuarios", f"Criou usuário: {new_user.nome} ({new_user.email})", new_user.id, request)

    return {
        "id": new_user.id,
        "email": new_user.email,
        "nome": new_user.nome,
        "perfil": new_user.perfil,
        "ativo": new_user.ativo,
        "permitted_pages": new_user.permitted_pages or [],
        "data_cadastro": new_user.data_cadastro,
    }


@router.put("/{usuario_id}", response_model=UsuarioResponse)
def atualizar_usuario(
    usuario_id: int,
    data: UsuarioUpdate,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """Update user info and permissions (admin only)."""
    user = db.query(User).filter(User.id == usuario_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    changes = []
    if data.nome is not None and data.nome != user.nome:
        changes.append(f"nome: {user.nome} → {data.nome}")
        user.nome = data.nome
    if data.email is not None and data.email != user.email:
        existing = db.query(User).filter(User.email == data.email, User.id != usuario_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email já em uso")
        changes.append(f"email: {user.email} → {data.email}")
        user.email = data.email
    if data.perfil is not None and data.perfil != user.perfil:
        changes.append(f"perfil: {user.perfil} → {data.perfil}")
        user.perfil = data.perfil
    if data.permitted_pages is not None:
        valid_pages = [p for p in data.permitted_pages if p in ALL_PAGES]
        user.permitted_pages = valid_pages
        changes.append(f"permissões atualizadas ({len(valid_pages)} páginas)")

    db.commit()
    db.refresh(user)

    if changes:
        log_activity(db, admin, "EDITAR", "usuarios", f"Editou usuário {user.nome}: {', '.join(changes)}", user.id, request)

    return {
        "id": user.id,
        "email": user.email,
        "nome": user.nome,
        "perfil": user.perfil,
        "ativo": user.ativo,
        "permitted_pages": user.permitted_pages or [],
        "data_cadastro": user.data_cadastro,
    }


@router.patch("/{usuario_id}/toggle", response_model=UsuarioResponse)
def toggle_usuario(
    usuario_id: int,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """Activate/deactivate a user (admin only)."""
    user = db.query(User).filter(User.id == usuario_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Não é possível desativar a si mesmo")

    user.ativo = not user.ativo
    db.commit()
    db.refresh(user)

    status_text = "ativou" if user.ativo else "desativou"
    log_activity(db, admin, "EDITAR", "usuarios", f"{status_text.capitalize()} usuário: {user.nome}", user.id, request)

    return {
        "id": user.id,
        "email": user.email,
        "nome": user.nome,
        "perfil": user.perfil,
        "ativo": user.ativo,
        "permitted_pages": user.permitted_pages or [],
        "data_cadastro": user.data_cadastro,
    }


@router.post("/{usuario_id}/reset-senha")
def reset_senha(
    usuario_id: int,
    data: ResetSenhaRequest,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """Admin resets another user's password."""
    user = db.query(User).filter(User.id == usuario_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    user.hashed_password = get_password_hash(data.nova_senha)
    db.commit()

    log_activity(db, admin, "EDITAR", "usuarios", f"Resetou senha do usuário: {user.nome}", user.id, request)

    return {"status": "Senha alterada com sucesso"}


@router.get("/logs", response_model=List[ActivityLogResponse])
def listar_logs(
    usuario_id: Optional[int] = Query(None),
    acao: Optional[str] = Query(None),
    recurso: Optional[str] = Query(None),
    data_inicio: Optional[str] = Query(None),
    data_fim: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """List activity logs with filters (admin only)."""
    query = db.query(ActivityLog).order_by(desc(ActivityLog.timestamp))

    if usuario_id:
        query = query.filter(ActivityLog.usuario_id == usuario_id)
    if acao:
        query = query.filter(ActivityLog.acao == acao)
    if recurso:
        query = query.filter(ActivityLog.recurso == recurso)
    if data_inicio:
        try:
            dt = datetime.strptime(data_inicio, "%Y-%m-%d")
            query = query.filter(ActivityLog.timestamp >= dt)
        except ValueError:
            pass
    if data_fim:
        try:
            dt = datetime.strptime(data_fim, "%Y-%m-%d")
            dt = dt.replace(hour=23, minute=59, second=59)
            query = query.filter(ActivityLog.timestamp <= dt)
        except ValueError:
            pass

    logs = query.offset(offset).limit(limit).all()
    return logs


@router.get("/pages-list")
def listar_paginas(
    current_user: User = Depends(get_current_user),
):
    """List all available page slugs."""
    return {"pages": ALL_PAGES}
