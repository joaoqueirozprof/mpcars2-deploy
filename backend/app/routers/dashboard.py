from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func as sqlfunc
from datetime import datetime, timedelta
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models import Contrato, Veiculo, Cliente, Multa, AlertaHistorico, DespesaContrato, DespesaVeiculo, DespesaLoja


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

    # Calculate real occupancy rate
    total_veiculos = db.query(Veiculo).filter(Veiculo.ativo == True).count()
    alugados = db.query(Veiculo).filter(Veiculo.status == "alugado").count()
    taxa_ocupacao = round((alugados / total_veiculos * 100), 1) if total_veiculos > 0 else 0.0

    # Revenue this month
    receita_mes = sum(
        float(c.valor_total or 0) for c in db.query(Contrato).filter(
            Contrato.data_criacao >= mes_passado
        ).all()
    )

    return {
        "contratos_mes": contratos_mes,
        "multas_mes": multas_mes,
        "taxa_ocupacao": taxa_ocupacao,
        "receita_mes": receita_mes,
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
    # Top vehicles by number of contracts
    veiculos = db.query(Veiculo).filter(Veiculo.ativo == True).all()
    top_veiculos = []
    for v in veiculos:
        n_contratos = db.query(Contrato).filter(Contrato.veiculo_id == v.id).count()
        receita = sum(float(c.valor_total or 0) for c in db.query(Contrato).filter(Contrato.veiculo_id == v.id).all())
        top_veiculos.append({"placa": v.placa, "marca_modelo": "{} {}".format(v.marca, v.modelo), "contratos": n_contratos, "receita": receita})
    top_veiculos.sort(key=lambda x: x["receita"], reverse=True)

    # Top clients by total spent
    clientes = db.query(Cliente).filter(Cliente.ativo == True).all()
    top_clientes = []
    for cl in clientes:
        n_contratos = db.query(Contrato).filter(Contrato.cliente_id == cl.id).count()
        total_gasto = sum(float(c.valor_total or 0) for c in db.query(Contrato).filter(Contrato.cliente_id == cl.id).all())
        if n_contratos > 0:
            top_clientes.append({"nome": cl.nome, "contratos": n_contratos, "total_gasto": total_gasto})
    top_clientes.sort(key=lambda x: x["total_gasto"], reverse=True)

    # Problematic vehicles (in maintenance)
    veiculos_problematicos = [{"placa": v.placa, "marca_modelo": "{} {}".format(v.marca, v.modelo), "status": v.status} for v in veiculos if v.status == "manutencao"]

    return {
        "top_veiculos": top_veiculos[:5],
        "top_clientes": top_clientes[:5],
        "veiculos_problematicos": veiculos_problematicos,
    }


@router.get("/previsao")
def get_previsao(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get forecasts and predictions based on recent data."""
    agora = datetime.now()
    mes_atual_inicio = agora.replace(day=1, hour=0, minute=0, second=0)
    mes_passado_inicio = (mes_atual_inicio - timedelta(days=1)).replace(day=1)

    # Current month revenue
    receita_mes_atual = sum(float(c.valor_total or 0) for c in db.query(Contrato).filter(Contrato.data_criacao >= mes_atual_inicio).all())
    # Last month revenue
    receita_mes_passado = sum(float(c.valor_total or 0) for c in db.query(Contrato).filter(Contrato.data_criacao >= mes_passado_inicio, Contrato.data_criacao < mes_atual_inicio).all())

    # Current month expenses
    despesa_mes_atual = (
        sum(float(d.valor or 0) for d in db.query(DespesaContrato).filter(DespesaContrato.data_registro >= mes_atual_inicio).all()) +
        sum(float(d.valor or 0) for d in db.query(DespesaVeiculo).filter(DespesaVeiculo.data >= mes_atual_inicio).all())
    )

    # Growth rate
    taxa_crescimento = 0.0
    if receita_mes_passado > 0:
        taxa_crescimento = round(((receita_mes_atual - receita_mes_passado) / receita_mes_passado) * 100, 1)

    # Active contracts revenue (future guaranteed)
    contratos_ativos = db.query(Contrato).filter(Contrato.status == "ativo").all()
    previsao_receita = sum(float(c.valor_total or 0) for c in contratos_ativos)

    return {
        "previsao_receita": previsao_receita,
        "receita_mes_atual": receita_mes_atual,
        "receita_mes_passado": receita_mes_passado,
        "despesa_mes_atual": despesa_mes_atual,
        "taxa_crescimento": taxa_crescimento,
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
