from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models import (
    Contrato,
    DespesaContrato,
    DespesaVeiculo,
    DespesaLoja,
    Cliente,
)
from app.services.pdf_service import PDFService
from app.services.export_service import ExportService
from app.services.activity_logger import log_activity


router = APIRouter(prefix="/financeiro", tags=["Financeiro"])


class DespesaContratoCreate(BaseModel):
    contrato_id: int
    tipo: str
    descricao: str
    valor: float


class DespesaVeiculoCreate(BaseModel):
    veiculo_id: int
    descricao: str
    valor: float
    km: Optional[float] = None
    pneu: bool = False


class DespesaLojaCreate(BaseModel):
    mes: int
    ano: int
    descricao: str
    valor: float


@router.get("/")
def list_financeiro(
    page: int = 1,
    limit: int = 50,
    tipo: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get paginated financial records (consolidated view)."""
    records = []

    # Add Contratos as receitas
    contratos = db.query(Contrato).all()
    for c in contratos:
        cliente = db.query(Cliente).filter(Cliente.id == c.cliente_id).first() if c.cliente_id else None
        cliente_nome = cliente.nome if cliente else "Desconhecido"
        record = {
            "id": f"c-{c.id}",
            "data": c.data_criacao,
            "tipo": "receita",
            "categoria": "Locação",
            "descricao": f"Contrato #{c.numero} - {cliente_nome}",
            "valor": float(c.valor_total) if c.valor_total else 0.0,
            "status": "pago" if c.status == "finalizado" else "pendente",
        }
        records.append(record)

    # Add DespesaContrato as despesas
    despesas_contrato = db.query(DespesaContrato).all()
    for d in despesas_contrato:
        record = {
            "id": f"dc-{d.id}",
            "data": d.data_criacao if hasattr(d, 'data_criacao') else datetime.now(),
            "tipo": "despesa",
            "categoria": d.tipo if hasattr(d, 'tipo') else "Contrato",
            "descricao": d.descricao,
            "valor": float(d.valor) if d.valor else 0.0,
            "status": "pago",
        }
        records.append(record)

    # Add DespesaVeiculo as despesas
    despesas_veiculo = db.query(DespesaVeiculo).all()
    for d in despesas_veiculo:
        record = {
            "id": f"dv-{d.id}",
            "data": d.data_criacao if hasattr(d, 'data_criacao') else datetime.now(),
            "tipo": "despesa",
            "categoria": "Veículo",
            "descricao": d.descricao,
            "valor": float(d.valor) if d.valor else 0.0,
            "status": "pago",
        }
        records.append(record)

    # Add DespesaLoja as despesas
    despesas_loja = db.query(DespesaLoja).all()
    for d in despesas_loja:
        record = {
            "id": f"dl-{d.id}",
            "data": d.data_criacao if hasattr(d, 'data_criacao') else datetime.now(),
            "tipo": "despesa",
            "categoria": "Loja",
            "descricao": d.descricao,
            "valor": float(d.valor) if d.valor else 0.0,
            "status": "pago",
        }
        records.append(record)

    # Filter by tipo
    if tipo:
        records = [r for r in records if r["tipo"] == tipo]

    # Filter by status
    if status:
        records = [r for r in records if r["status"] == status]

    # Sort by data descending
    records.sort(key=lambda x: x["data"], reverse=True)

    # Paginate
    total = len(records)
    start = (page - 1) * limit
    end = start + limit
    paginated = records[start:end]

    return {
        "data": paginated,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit,
    }


@router.get("/resumo")
def get_resumo(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get financial summary."""
    total_receita = sum(
        float(c.valor_total) for c in db.query(Contrato).all() if c.valor_total
    )
    total_despesa_contrato = sum(
        float(d.valor) for d in db.query(DespesaContrato).all() if d.valor
    )
    total_despesa_veiculo = sum(
        float(d.valor) for d in db.query(DespesaVeiculo).all() if d.valor
    )
    total_despesa_loja = sum(
        float(d.valor) for d in db.query(DespesaLoja).all() if d.valor
    )

    total_despesa = (
        total_despesa_contrato + total_despesa_veiculo + total_despesa_loja
    )
    lucro = total_receita - total_despesa

    return {
        "total_receita": total_receita,
        "total_despesa": total_despesa,
        "lucro": lucro,
        "despesa_contrato": total_despesa_contrato,
        "despesa_veiculo": total_despesa_veiculo,
        "despesa_loja": total_despesa_loja,
    }


@router.post("/despesa-contrato")
def criar_despesa_contrato(
    despesa: DespesaContratoCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None,
):
    """Create expense for contract."""
    contrato = db.query(Contrato).filter(
        Contrato.id == despesa.contrato_id
    ).first()
    if not contrato:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Contrato não encontrado"
        )

    db_despesa = DespesaContrato(
        contrato_id=despesa.contrato_id,
        tipo=despesa.tipo,
        descricao=despesa.descricao,
        valor=despesa.valor,
        responsavel=current_user.email,
    )
    db.add(db_despesa)
    db.commit()
    db.refresh(db_despesa)
    log_activity(db, current_user, "CRIAR", "DespesaContrato", f"Despesa de contrato criada: {despesa.descricao}", db_despesa.id, request)
    return db_despesa


@router.post("/despesa-veiculo")
def criar_despesa_veiculo(
    despesa: DespesaVeiculoCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None,
):
    """Create expense for vehicle."""
    db_despesa = DespesaVeiculo(
        veiculo_id=despesa.veiculo_id,
        descricao=despesa.descricao,
        valor=despesa.valor,
        km=despesa.km,
        pneu=despesa.pneu,
    )
    db.add(db_despesa)
    db.commit()
    db.refresh(db_despesa)
    log_activity(db, current_user, "CRIAR", "DespesaVeiculo", f"Despesa de veículo criada: {despesa.descricao}", db_despesa.id, request)
    return db_despesa


@router.post("/despesa-loja")
def criar_despesa_loja(
    despesa: DespesaLojaCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None,
):
    """Create shop expense."""
    db_despesa = DespesaLoja(
        mes=despesa.mes,
        ano=despesa.ano,
        descricao=despesa.descricao,
        valor=despesa.valor,
    )
    db.add(db_despesa)
    db.commit()
    db.refresh(db_despesa)
    log_activity(db, current_user, "CRIAR", "DespesaLoja", f"Despesa de loja criada: {despesa.descricao}", db_despesa.id, request)
    return db_despesa


@router.delete("/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_registro_financeiro(
    record_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None,
):
    """Delete a financial record by composite id (e.g. c-1, dc-5, dv-3, dl-2)."""
    parts = record_id.split("-", 1)
    if len(parts) != 2:
        raise HTTPException(status_code=400, detail="ID invalido")

    prefix, id_str = parts
    try:
        real_id = int(id_str)
    except ValueError:
        raise HTTPException(status_code=400, detail="ID invalido")

    if prefix == "dc":
        obj = db.query(DespesaContrato).filter(DespesaContrato.id == real_id).first()
    elif prefix == "dv":
        obj = db.query(DespesaVeiculo).filter(DespesaVeiculo.id == real_id).first()
    elif prefix == "dl":
        obj = db.query(DespesaLoja).filter(DespesaLoja.id == real_id).first()
    elif prefix == "c":
        # Deleting a contrato from financeiro - delete dependents first
        from app.models import Quilometragem, ProrrogacaoContrato, CheckinCheckout, Multa, UsoVeiculoEmpresa
        contrato = db.query(Contrato).filter(Contrato.id == real_id).first()
        if not contrato:
            raise HTTPException(status_code=404, detail="Registro nao encontrado")
        db.query(Quilometragem).filter(Quilometragem.contrato_id == real_id).delete(synchronize_session=False)
        db.query(DespesaContrato).filter(DespesaContrato.contrato_id == real_id).delete(synchronize_session=False)
        db.query(ProrrogacaoContrato).filter(ProrrogacaoContrato.contrato_id == real_id).delete(synchronize_session=False)
        db.query(CheckinCheckout).filter(CheckinCheckout.contrato_id == real_id).delete(synchronize_session=False)
        db.query(Multa).filter(Multa.contrato_id == real_id).delete(synchronize_session=False)
        db.query(UsoVeiculoEmpresa).filter(UsoVeiculoEmpresa.contrato_id == real_id).delete(synchronize_session=False)
        obj = contrato
    else:
        raise HTTPException(status_code=400, detail="Tipo de registro desconhecido")

    if not obj:
        raise HTTPException(status_code=404, detail="Registro nao encontrado")

    db.delete(obj)
    db.commit()
    log_activity(db, current_user, "EXCLUIR", "Financeiro", f"Registro financeiro {record_id} excluído", real_id, request)


@router.get("/faturamento")
def get_faturamento(
    mes: Optional[int] = None,
    ano: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get billing information."""
    query = db.query(Contrato)

    if mes and ano:
        from sqlalchemy import and_

        start = datetime(ano, mes, 1)
        if mes == 12:
            end = datetime(ano + 1, 1, 1)
        else:
            end = datetime(ano, mes + 1, 1)

        query = query.filter(and_(Contrato.data_criacao >= start, Contrato.data_criacao < end))

    contratos = query.all()
    total = sum(float(c.valor_total) for c in contratos if c.valor_total)

    return {"total_faturamento": total, "quantidade_contratos": len(contratos)}


@router.get("/relatorio")
def get_relatorio_avancado(
    data_inicio: str,
    data_fim: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get advanced financial report."""
    try:
        inicio = datetime.strptime(data_inicio, "%Y-%m-%d")
        fim = datetime.strptime(data_fim, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Formato de data inválido"
        )

    contratos = db.query(Contrato).filter(
        Contrato.data_criacao.between(inicio, fim)
    ).all()

    return {
        "periodo": {"inicio": data_inicio, "fim": data_fim},
        "total_contratos": len(contratos),
        "total_receita": sum(
            float(c.valor_total) for c in contratos if c.valor_total
        ),
        "contratos": contratos,
    }


@router.get("/exportar/xlsx")
def exportar_contratos_xlsx(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Export contracts to XLSX."""
    buffer = ExportService.export_contratos_xlsx(db)
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=contratos.xlsx"},
    )


@router.get("/exportar/csv")
def exportar_contratos_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Export contracts to CSV."""
    buffer = ExportService.export_contratos_csv(db)
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=contratos.csv"},
    )


@router.get("/relatorio-pdf")
def get_relatorio_pdf(
    data_inicio: str,
    data_fim: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate financial report PDF."""
    pdf_buffer = PDFService.generate_relatorio_financeiro_pdf(db, data_inicio, data_fim)
    return StreamingResponse(
        iter([pdf_buffer.getvalue()]),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=relatorio_financeiro_{data_inicio}_{data_fim}.pdf"},
    )
