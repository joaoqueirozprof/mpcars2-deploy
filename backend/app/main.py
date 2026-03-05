from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine, Base
from app.models import (  # noqa - Import all models
    Empresa,
    Cliente,
    Veiculo,
    Contrato,
    Quilometragem,
    DespesaContrato,
    ProrrogacaoContrato,
    MotoristaEmpresa,
    DespesaVeiculo,
    DespesaLoja,
    DespesaOperacional,
    Seguro,
    ParcelaSeguro,
    IpvaAliquota,
    IpvaRegistro,
    Reserva,
    CheckinCheckout,
    Multa,
    Manutencao,
    UsoVeiculoEmpresa,
    RelatorioNF,
    DespesaNF,
    Documento,
    Configuracao,
    AuditLog,
    AlertaHistorico,
)
from app.models.user import User
from app.routers import (
    auth,
    clientes,
    veiculos,
    contratos,
    empresas,
    dashboard,
    financeiro,
    configuracoes,
    seguros,
    multas,
    manutencoes,
    reservas,
    relatorios,
    ipva,
)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="2.0.0",
    description="MPCARS - Sistema de Gerenciamento de Aluguel de Veículos",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    """Create tables and seed database on startup."""
    Base.metadata.create_all(bind=engine)
    from app.services.seed import seed_database
    from app.core.database import SessionLocal

    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()


@app.get("/health")
def health():
    """Health check endpoint."""
    return {"status": "ok", "version": "2.0.0"}


# Include routers
app.include_router(auth.router, prefix=settings.API_V1_PREFIX, tags=["Auth"])
app.include_router(clientes.router, prefix=settings.API_V1_PREFIX, tags=["Clientes"])
app.include_router(veiculos.router, prefix=settings.API_V1_PREFIX, tags=["Veículos"])
app.include_router(contratos.router, prefix=settings.API_V1_PREFIX, tags=["Contratos"])
app.include_router(empresas.router, prefix=settings.API_V1_PREFIX, tags=["Empresas"])
app.include_router(dashboard.router, prefix=settings.API_V1_PREFIX, tags=["Dashboard"])
app.include_router(financeiro.router, prefix=settings.API_V1_PREFIX, tags=["Financeiro"])
app.include_router(configuracoes.router, prefix=settings.API_V1_PREFIX, tags=["Configurações"])
app.include_router(seguros.router, prefix=settings.API_V1_PREFIX, tags=["Seguros"])
app.include_router(multas.router, prefix=settings.API_V1_PREFIX, tags=["Multas"])
app.include_router(manutencoes.router, prefix=settings.API_V1_PREFIX, tags=["Manutenções"])
app.include_router(reservas.router, prefix=settings.API_V1_PREFIX, tags=["Reservas"])
app.include_router(relatorios.router, prefix=settings.API_V1_PREFIX, tags=["Relatórios"])
app.include_router(ipva.router, prefix=settings.API_V1_PREFIX, tags=["IPVA"])

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
