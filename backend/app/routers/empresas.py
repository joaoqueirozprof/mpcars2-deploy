from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models import Empresa, MotoristaEmpresa, Cliente


router = APIRouter(prefix="/empresas", tags=["Empresas"])


class EmpresaBase(BaseModel):
    nome: str
    cnpj: str
    razao_social: str
    endereco: Optional[str] = None
    cidade: Optional[str] = None
    estado: Optional[str] = None
    cep: Optional[str] = None
    telefone: Optional[str] = None
    email: Optional[str] = None
    contato_principal: Optional[str] = None


class EmpresaCreate(EmpresaBase):
    pass


class EmpresaUpdate(BaseModel):
    nome: Optional[str] = None
    razao_social: Optional[str] = None
    endereco: Optional[str] = None
    telefone: Optional[str] = None
    email: Optional[str] = None
    contato_principal: Optional[str] = None
    ativo: Optional[bool] = None


class EmpresaResponse(EmpresaBase):
    id: int
    ativo: bool
    data_cadastro: datetime

    class Config:
        from_attributes = True


class MotoristaEmpresaResponse(BaseModel):
    id: int
    empresa_id: int
    cliente_id: int
    cargo: Optional[str] = None
    ativo: bool
    data_vinculo: datetime

    class Config:
        from_attributes = True


@router.get("/", response_model=List[EmpresaResponse])
def list_empresas(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all companies."""
    empresas = db.query(Empresa).offset(skip).limit(limit).all()
    return empresas


@router.post("/", response_model=EmpresaResponse)
def create_empresa(
    empresa: EmpresaCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new company."""
    existing = db.query(Empresa).filter(Empresa.cnpj == empresa.cnpj).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="CNPJ já cadastrado"
        )

    db_empresa = Empresa(**empresa.model_dump())
    db.add(db_empresa)
    db.commit()
    db.refresh(db_empresa)
    return db_empresa


@router.get("/{empresa_id}", response_model=EmpresaResponse)
def get_empresa(
    empresa_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific company."""
    empresa = db.query(Empresa).filter(Empresa.id == empresa_id).first()
    if not empresa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Empresa não encontrada"
        )
    return empresa


@router.put("/{empresa_id}", response_model=EmpresaResponse)
def update_empresa(
    empresa_id: int,
    empresa_data: EmpresaUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a company."""
    empresa = db.query(Empresa).filter(Empresa.id == empresa_id).first()
    if not empresa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Empresa não encontrada"
        )

    update_data = empresa_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(empresa, key, value)

    db.commit()
    db.refresh(empresa)
    return empresa


@router.delete("/{empresa_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_empresa(
    empresa_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a company."""
    empresa = db.query(Empresa).filter(Empresa.id == empresa_id).first()
    if not empresa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Empresa não encontrada"
        )
    db.delete(empresa)
    db.commit()


@router.get("/{empresa_id}/motoristas", response_model=List[MotoristaEmpresaResponse])
def get_empresa_motoristas(
    empresa_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get drivers associated with a company."""
    motoristas = db.query(MotoristaEmpresa).filter(
        MotoristaEmpresa.empresa_id == empresa_id
    ).all()
    return motoristas


@router.post("/{empresa_id}/motoristas")
def add_empresa_motorista(
    empresa_id: int,
    cliente_id: int,
    cargo: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a driver to a company."""
    empresa = db.query(Empresa).filter(Empresa.id == empresa_id).first()
    if not empresa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Empresa não encontrada"
        )

    cliente = db.query(Cliente).filter(Cliente.id == cliente_id).first()
    if not cliente:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Cliente não encontrado"
        )

    motorista = MotoristaEmpresa(
        empresa_id=empresa_id, cliente_id=cliente_id, cargo=cargo
    )
    db.add(motorista)
    db.commit()
    db.refresh(motorista)
    return motorista


@router.get("/{empresa_id}/performance")
def get_empresa_performance(
    empresa_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get performance metrics for a company."""
    empresa = db.query(Empresa).filter(Empresa.id == empresa_id).first()
    if not empresa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Empresa não encontrada"
        )

    return {
        "empresa_id": empresa_id,
        "total_motoristas": db.query(MotoristaEmpresa).filter(
            MotoristaEmpresa.empresa_id == empresa_id
        ).count(),
        "motoristas_ativos": db.query(MotoristaEmpresa).filter(
            (MotoristaEmpresa.empresa_id == empresa_id)
            & (MotoristaEmpresa.ativo == True)
        ).count(),
    }


@router.get("/{empresa_id}/faturamento")
def get_empresa_faturamento(
    empresa_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get billing information for a company."""
    from app.models import Contrato

    contratos = db.query(Contrato).filter(
        Contrato.cliente_id.in_(
            db.query(Cliente.id).filter(Cliente.empresa_id == empresa_id)
        )
    ).all()

    total_faturamento = sum(
        float(c.valor_total) for c in contratos if c.valor_total
    )

    return {
        "empresa_id": empresa_id,
        "total_contratos": len(contratos),
        "total_faturamento": total_faturamento,
    }
