from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session
from datetime import datetime
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models import Contrato, RelatorioNF
from app.services.pdf_service import PDFService
from app.services.export_service import ExportService


router = APIRouter(prefix="/relatorios", tags=["Relatórios"])


@router.get("/contrato/{contrato_id}/pdf")
def get_relatorio_contrato_pdf(
    contrato_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate contract PDF report."""
    contrato = db.query(Contrato).filter(Contrato.id == contrato_id).first()
    if not contrato:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Contrato não encontrado"
        )

    pdf_buffer = PDFService.generate_contrato_pdf(db, contrato_id)
    return FileResponse(
        iter([pdf_buffer.getvalue()]),
        media_type="application/pdf",
        filename=f"contrato_{contrato.numero}.pdf",
    )


@router.get("/financeiro/pdf")
def get_relatorio_financeiro_pdf(
    data_inicio: str,
    data_fim: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate financial report PDF."""
    try:
        datetime.strptime(data_inicio, "%Y-%m-%d")
        datetime.strptime(data_fim, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Formato de data inválido"
        )

    pdf_buffer = PDFService.generate_relatorio_financeiro_pdf(
        db, data_inicio, data_fim
    )
    return FileResponse(
        iter([pdf_buffer.getvalue()]),
        media_type="application/pdf",
        filename=f"relatorio_financeiro_{data_inicio}_{data_fim}.pdf",
    )


@router.get("/nf/{relatorio_id}/pdf")
def get_relatorio_nf_pdf(
    relatorio_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate NF (Nota Fiscal) PDF report."""
    relatorio = db.query(RelatorioNF).filter(RelatorioNF.id == relatorio_id).first()
    if not relatorio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Relatório NF não encontrado"
        )

    pdf_buffer = PDFService.generate_nf_pdf(db, relatorio_id)
    return FileResponse(
        iter([pdf_buffer.getvalue()]),
        media_type="application/pdf",
        filename=f"nf_relatorio_{relatorio_id}.pdf",
    )


@router.get("/contratos/xlsx")
def export_contratos_xlsx(
    status_filter: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Export contracts to XLSX."""
    filters = {}
    if status_filter:
        filters["status"] = status_filter

    buffer = ExportService.export_contratos_xlsx(db, filters)
    return FileResponse(
        iter([buffer.getvalue()]),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename="contratos.xlsx",
    )


@router.get("/contratos/csv")
def export_contratos_csv(
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


@router.get("/veiculos/xlsx")
def export_veiculos_xlsx(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Export vehicles to XLSX."""
    buffer = ExportService.export_veiculos_xlsx(db)
    return FileResponse(
        iter([buffer.getvalue()]),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename="veiculos.xlsx",
    )


@router.get("/clientes/xlsx")
def export_clientes_xlsx(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Export clients to XLSX."""
    buffer = ExportService.export_clientes_xlsx(db)
    return FileResponse(
        iter([buffer.getvalue()]),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename="clientes.xlsx",
    )


@router.get("/despesas/xlsx")
def export_despesas_xlsx(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Export expenses to XLSX."""
    buffer = ExportService.export_despesas_xlsx(db)
    return FileResponse(
        iter([buffer.getvalue()]),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename="despesas.xlsx",
    )
