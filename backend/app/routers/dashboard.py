from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models import Contrato, Veiculo, Cliente, Multa, AlertaHistorico


router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/consolidado")
def get_consolidado(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get consolidated dashboard data."""
    return {
        "total_contratos": db.query(Contrato).count(),
        "total_veiculos": db.query(Veiculo).count(),
        "total_clientes": db.query(Cliente).count(),
        "total_multas": db.query(Multa).count(),
        "contratos_ativos": db.query(Contrato).filter(Contrato.status == "ativo").count(),
        "veiculos_disponiveis": db.query(Veiculo).filter(Veiculo.status == "disponivel").count(),
    }


@router.get("/metricas")
def get_metricas(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get key metrics."""
    agora = datetime.now()
    mes_passado = agora - timedelta(days=30)

    contratos_mes = db.query(Contrato).filter(
        Contrato.data_criacao >= mes_passado
    ).count()

    multas_mes = db.query(Multa).filter(
        Multa.data_criacao >= mes_passado
    ).count()

    return {
        "contratos_mes": contratos_mes,
        "multas_mes": multas_mes,
        "taxa_ocupacao": 75.0,
    }


@router.get("/alertas")
def get_alertas(
    urgencia: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get active alerts."""
    query = db.query(AlertaHistorico).filter(AlertaHistorico.resolvido == False)
    if urgencia:
        query = query.filter(AlertaHistorico.urgencia == urgencia)
    return query.all()


@router.get("/tops")
def get_tops(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get top performers and underperformers."""
    return {
        "top_veiculos": [],
        "top_clientes": [],
        "veiculos_problematicos": [],
    }


@router.get("/previsao")
def get_previsao(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get forecasts and predictions."""
    return {
        "previsao_receita": 0,
        "previsao_despesa": 0,
        "taxa_crescimento": 0,
    }


@router.get("/atrasados")
def get_atrasados(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get overdue contracts."""
    agora = datetime.now()
    contratos = db.query(Contrato).filter(
        (Contrato.data_fim < agora) & (Contrato.status == "ativo")
    ).all()
    return contratos


@router.get("/vencimentos")
def get_vencimentos(
    dias: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get contracts expiring soon."""
    agora = datetime.now()
    fim = agora + timedelta(days=dias)
    contratos = db.query(Contrato).filter(
        (Contrato.data_fim.between(agora, fim)) & (Contrato.status == "ativo")
    ).all()
    return contratos


@router.get("/graficos")
def get_graficos(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get data for dashboard charts."""
    return {
        "contratos_por_status": {
            "ativo": db.query(Contrato).filter(Contrato.status == "ativo").count(),
            "finalizado": db.query(Contrato).filter(Contrato.status == "finalizado").count(),
        },
        "veiculos_por_status": {
            "disponivel": db.query(Veiculo).filter(Veiculo.status == "disponivel").count(),
            "alugado": db.query(Veiculo).filter(Veiculo.status == "alugado").count(),
            "manutencao": db.query(Veiculo).filter(Veiculo.status == "manutencao").count(),
        },
    }
