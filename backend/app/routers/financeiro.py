from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse, StreamingResponse
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
)
from app.services.pdf_service import PDFService
from app.services.export_service import ExportService


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
    return db_despesa


@router.post("/despesa-veiculo")
def criar_despesa_veiculo(
    despesa: DespesaVeiculoCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
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
    return db_despesa


@router.post("/despesa-loja")
def criar_despesa_loja(
    despesa: DespesaLojaCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
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
    return db_despesa


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

        query = query.filter(
            and_(
                Contrato.data_criacao >= datetime(ano, mes, 1),
                Contrato.data_criacao < datetime(ano, mes + 1, 1)
                if mes < 12
                else datetime(ano + 1, 1, 1),
            )
        )

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
    return FileResponse(
        iter([buffer.getvalue()]),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename="contratos.xlsx",
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
    return FileResponse(
        iter([pdf_buffer.getvalue()]),
        media_type="application/pdf",
        filename=f"relatorio_financeiro_{data_inicio}_{data_fim}.pdf",
    )
