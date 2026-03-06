import os
import uuid
import shutil
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Request
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import date
from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.pagination import paginate
from app.models.user import User
from app.models import (
    Veiculo, DespesaVeiculo, Contrato, DespesaOperacional,
    Seguro, ParcelaSeguro, IpvaRegistro, Reserva, Multa, Manutencao,
    UsoVeiculoEmpresa, RelatorioNF, DespesaNF, Quilometragem,
    DespesaContrato, ProrrogacaoContrato, CheckinCheckout,
)
from app.services.activity_logger import log_activity


UPLOAD_DIR = "/app/uploads/veiculos"
os.makedirs(UPLOAD_DIR, exist_ok=True)

router = APIRouter(prefix="/veiculos", tags=["Veiculos"])


class VeiculoBase(BaseModel):
    placa: str
    marca: str
    modelo: str
    ano: Optional[int] = None
    cor: Optional[str] = None
    chassis: Optional[str] = None
    renavam: Optional[str] = None
    combustivel: Optional[str] = None
    capacidade_tanque: Optional[float] = None
    km_atual: Optional[float] = 0
    data_aquisicao: Optional[date] = None
    valor_aquisicao: Optional[float] = None


class VeiculoCreate(VeiculoBase):
    pass


class VeiculoUpdate(BaseModel):
    placa: Optional[str] = None
    marca: Optional[str] = None
    modelo: Optional[str] = None
    ano: Optional[int] = None
    cor: Optional[str] = None
    chassis: Optional[str] = None
    renavam: Optional[str] = None
    combustivel: Optional[str] = None
    capacidade_tanque: Optional[float] = None
    km_atual: Optional[float] = None
    data_aquisicao: Optional[date] = None
    valor_aquisicao: Optional[float] = None
    status: Optional[str] = None
    ativo: Optional[bool] = None


class VeiculoResponse(BaseModel):
    id: int
    placa: str
    marca: str
    modelo: str
    ano: Optional[int] = None
    cor: Optional[str] = None
    chassis: Optional[str] = None
    renavam: Optional[str] = None
    combustivel: Optional[str] = None
    capacidade_tanque: Optional[float] = None
    km_atual: Optional[float] = 0
    data_aquisicao: Optional[date] = None
    valor_aquisicao: Optional[float] = None
    status: str = "disponivel"
    foto_url: Optional[str] = None
    ativo: bool = True

    class Config:
        from_attributes = True


@router.get("/")
def list_veiculos(
    page: int = 1,
    limit: int = 1000,
    search: Optional[str] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all vehicles with pagination."""
    query = db.query(Veiculo)
    return paginate(
        query=query,
        page=page,
        limit=limit,
        search=search,
        search_fields=["placa", "marca", "modelo", "cor"],
        model=Veiculo,
        status_filter=status_filter,
    )


@router.get("/search", response_model=List[VeiculoResponse])
def search_veiculos(
    q: str = "",
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Search vehicles by plate, brand, or model."""
    query = db.query(Veiculo)

    if q:
        query = query.filter(
            (Veiculo.placa.ilike(f"%{q}%"))
            | (Veiculo.marca.ilike(f"%{q}%"))
            | (Veiculo.modelo.ilike(f"%{q}%"))
        )

    if status:
        query = query.filter(Veiculo.status == status)

    return query.all()


@router.get("/km/{veiculo_id}")
def get_veiculo_km(
    veiculo_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get current kilometers of a vehicle."""
    veiculo = db.query(Veiculo).filter(Veiculo.id == veiculo_id).first()
    if not veiculo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Veiculo nao encontrado"
        )
    return {"veiculo_id": veiculo_id, "km_atual": veiculo.km_atual}


@router.get("/status/{veiculo_id}")
def get_veiculo_status(
    veiculo_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get vehicle status."""
    veiculo = db.query(Veiculo).filter(Veiculo.id == veiculo_id).first()
    if not veiculo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Veiculo nao encontrado"
        )
    return {"veiculo_id": veiculo_id, "status": veiculo.status}


@router.get("/analise-financeira/{veiculo_id}")
def get_veiculo_financial_analysis(
    veiculo_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get financial analysis for a vehicle."""
    veiculo = db.query(Veiculo).filter(Veiculo.id == veiculo_id).first()
    if not veiculo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Veiculo nao encontrado"
        )

    despesas = db.query(DespesaVeiculo).filter(
        DespesaVeiculo.veiculo_id == veiculo_id
    ).all()
    total_despesas = sum(float(d.valor) for d in despesas if d.valor)

    return {
        "veiculo_id": veiculo_id,
        "valor_aquisicao": float(veiculo.valor_aquisicao) if veiculo.valor_aquisicao else 0,
        "total_despesas": total_despesas,
        "valor_liquido": (float(veiculo.valor_aquisicao) - total_despesas) if veiculo.valor_aquisicao else -total_despesas,
    }


@router.get("/foto/{veiculo_id}")
def get_veiculo_foto(
    veiculo_id: int,
    db: Session = Depends(get_db),
):
    """Serve vehicle photo file."""
    veiculo = db.query(Veiculo).filter(Veiculo.id == veiculo_id).first()
    if not veiculo or not veiculo.foto_url:
        raise HTTPException(status_code=404, detail="Foto nao encontrada")

    file_path = os.path.join(UPLOAD_DIR, veiculo.foto_url)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Arquivo de foto nao encontrado")

    return FileResponse(file_path)


@router.post("/{veiculo_id}/foto")
async def upload_veiculo_foto(
    veiculo_id: int,
    foto: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None,
):
    """Upload a photo for a vehicle."""
    veiculo = db.query(Veiculo).filter(Veiculo.id == veiculo_id).first()
    if not veiculo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Veiculo nao encontrado"
        )

    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if foto.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tipo de arquivo nao permitido. Use JPEG, PNG, WebP ou GIF.",
        )

    # Validate file size (max 10MB)
    contents = await foto.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Arquivo muito grande. Maximo 10MB.",
        )

    # Delete old photo if exists
    if veiculo.foto_url:
        old_path = os.path.join(UPLOAD_DIR, veiculo.foto_url)
        if os.path.exists(old_path):
            os.remove(old_path)

    # Save new photo
    ext = os.path.splitext(foto.filename or "photo.jpg")[1] or ".jpg"
    filename = f"veiculo_{veiculo_id}_{uuid.uuid4().hex[:8]}{ext}"
    file_path = os.path.join(UPLOAD_DIR, filename)

    with open(file_path, "wb") as f:
        f.write(contents)

    # Update database
    veiculo.foto_url = filename
    db.commit()
    db.refresh(veiculo)
    log_activity(db, current_user, "EDITAR", "Veiculo", f"Foto do veículo {veiculo.placa} atualizada", veiculo_id, request)

    return {
        "message": "Foto enviada com sucesso",
        "foto_url": filename,
        "veiculo_id": veiculo_id,
    }


@router.delete("/{veiculo_id}/foto")
def delete_veiculo_foto(
    veiculo_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None,
):
    """Delete a vehicle photo."""
    veiculo = db.query(Veiculo).filter(Veiculo.id == veiculo_id).first()
    if not veiculo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Veiculo nao encontrado"
        )

    if veiculo.foto_url:
        file_path = os.path.join(UPLOAD_DIR, veiculo.foto_url)
        if os.path.exists(file_path):
            os.remove(file_path)
        veiculo.foto_url = None
        db.commit()
        log_activity(db, current_user, "EXCLUIR", "Veiculo", f"Foto do veículo {veiculo.placa} removida", veiculo_id, request)

    return {"message": "Foto removida com sucesso"}


@router.post("/", response_model=VeiculoResponse)
def create_veiculo(
    veiculo: VeiculoCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None,
):
    """Create a new vehicle."""
    existing = db.query(Veiculo).filter(Veiculo.placa == veiculo.placa).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Placa ja cadastrada"
        )

    db_veiculo = Veiculo(**veiculo.model_dump())
    db.add(db_veiculo)
    db.commit()
    db.refresh(db_veiculo)
    log_activity(db, current_user, "CRIAR", "Veiculo", f"Veículo {db_veiculo.placa} criado", db_veiculo.id, request)
    return db_veiculo


@router.get("/{veiculo_id}", response_model=VeiculoResponse)
def get_veiculo(
    veiculo_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific vehicle."""
    veiculo = db.query(Veiculo).filter(Veiculo.id == veiculo_id).first()
    if not veiculo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Veiculo nao encontrado"
        )
    return veiculo


@router.put("/{veiculo_id}", response_model=VeiculoResponse)
def update_veiculo(
    veiculo_id: int,
    veiculo_data: VeiculoUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None,
):
    """Update a vehicle."""
    veiculo = db.query(Veiculo).filter(Veiculo.id == veiculo_id).first()
    if not veiculo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Veiculo nao encontrado"
        )

    update_data = veiculo_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(veiculo, key, value)

    db.commit()
    db.refresh(veiculo)
    log_activity(db, current_user, "EDITAR", "Veiculo", f"Veículo {veiculo.placa} editado", veiculo_id, request)
    return veiculo


@router.patch("/{veiculo_id}", response_model=VeiculoResponse)
def patch_veiculo(
    veiculo_id: int,
    veiculo_data: VeiculoUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None,
):
    """Partially update a vehicle."""
    veiculo = db.query(Veiculo).filter(Veiculo.id == veiculo_id).first()
    if not veiculo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Veiculo nao encontrado"
        )

    update_data = veiculo_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(veiculo, key, value)

    db.commit()
    db.refresh(veiculo)
    log_activity(db, current_user, "EDITAR", "Veiculo", f"Veículo {veiculo.placa} editado", veiculo_id, request)
    return veiculo


@router.delete("/{veiculo_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_veiculo(
    veiculo_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None,
):
    """Delete a vehicle and all related records."""
    veiculo = db.query(Veiculo).filter(Veiculo.id == veiculo_id).first()
    if not veiculo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Veiculo nao encontrado"
        )

    # Delete photo file if exists
    if veiculo.foto_url:
        file_path = os.path.join(UPLOAD_DIR, veiculo.foto_url)
        if os.path.exists(file_path):
            os.remove(file_path)

    # Delete all dependent records (order matters due to FK chains)
    # First: get all contratos for this vehicle (they have their own dependents)
    contratos = db.query(Contrato).filter(Contrato.veiculo_id == veiculo_id).all()
    contrato_ids = [c.id for c in contratos]

    if contrato_ids:
        # Delete contrato dependents (including multas that reference contrato)
        db.query(Quilometragem).filter(Quilometragem.contrato_id.in_(contrato_ids)).delete(synchronize_session=False)
        db.query(DespesaContrato).filter(DespesaContrato.contrato_id.in_(contrato_ids)).delete(synchronize_session=False)
        db.query(ProrrogacaoContrato).filter(ProrrogacaoContrato.contrato_id.in_(contrato_ids)).delete(synchronize_session=False)
        db.query(CheckinCheckout).filter(CheckinCheckout.contrato_id.in_(contrato_ids)).delete(synchronize_session=False)
        db.query(Multa).filter(Multa.contrato_id.in_(contrato_ids)).delete(synchronize_session=False)
        db.query(UsoVeiculoEmpresa).filter(UsoVeiculoEmpresa.contrato_id.in_(contrato_ids)).delete(synchronize_session=False)
        # Delete contratos
        db.query(Contrato).filter(Contrato.veiculo_id == veiculo_id).delete(synchronize_session=False)

    # Delete seguro dependents first, then seguros
    seguros = db.query(Seguro).filter(Seguro.veiculo_id == veiculo_id).all()
    seguro_ids = [s.id for s in seguros]
    if seguro_ids:
        db.query(ParcelaSeguro).filter(ParcelaSeguro.seguro_id.in_(seguro_ids)).delete(synchronize_session=False)

    # Delete uso_veiculo_empresa dependents
    usos = db.query(UsoVeiculoEmpresa).filter(UsoVeiculoEmpresa.veiculo_id == veiculo_id).all()
    uso_ids = [u.id for u in usos]
    if uso_ids:
        db.query(RelatorioNF).filter(RelatorioNF.uso_id.in_(uso_ids)).delete(synchronize_session=False)

    # Delete all direct vehicle dependents
    db.query(DespesaVeiculo).filter(DespesaVeiculo.veiculo_id == veiculo_id).delete(synchronize_session=False)
    db.query(DespesaOperacional).filter(DespesaOperacional.veiculo_id == veiculo_id).delete(synchronize_session=False)
    db.query(Seguro).filter(Seguro.veiculo_id == veiculo_id).delete(synchronize_session=False)
    db.query(ParcelaSeguro).filter(ParcelaSeguro.veiculo_id == veiculo_id).delete(synchronize_session=False)
    db.query(IpvaRegistro).filter(IpvaRegistro.veiculo_id == veiculo_id).delete(synchronize_session=False)
    db.query(Reserva).filter(Reserva.veiculo_id == veiculo_id).delete(synchronize_session=False)
    db.query(Multa).filter(Multa.veiculo_id == veiculo_id).delete(synchronize_session=False)
    db.query(Manutencao).filter(Manutencao.veiculo_id == veiculo_id).delete(synchronize_session=False)
    db.query(DespesaNF).filter(DespesaNF.veiculo_id == veiculo_id).delete(synchronize_session=False)
    db.query(RelatorioNF).filter(RelatorioNF.veiculo_id == veiculo_id).delete(synchronize_session=False)
    db.query(UsoVeiculoEmpresa).filter(UsoVeiculoEmpresa.veiculo_id == veiculo_id).delete(synchronize_session=False)

    # Finally delete the vehicle
    db.delete(veiculo)
    db.commit()
    log_activity(db, current_user, "EXCLUIR", "Veiculo", f"Veículo {veiculo.placa} excluído", veiculo_id, request)
