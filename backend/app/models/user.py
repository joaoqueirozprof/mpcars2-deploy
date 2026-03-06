from sqlalchemy import Column, Integer, String, Boolean, DateTime, func, JSON
from app.core.database import Base


ALL_PAGES = [
    "dashboard", "clientes", "veiculos", "contratos", "empresas",
    "financeiro", "seguros", "ipva", "multas", "manutencoes",
    "reservas", "despesas-loja", "relatorios", "configuracoes", "usuarios"
]


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    nome = Column(String, nullable=False)
    perfil = Column(String, default="admin")
    ativo = Column(Boolean, default=True)
    permitted_pages = Column(JSON, default=list)
    data_cadastro = Column(DateTime, server_default=func.now())


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, nullable=True)
    usuario_nome = Column(String)
    usuario_email = Column(String)
    acao = Column(String)  # LOGIN, CRIAR, EDITAR, EXCLUIR, VISUALIZAR
    recurso = Column(String)  # clientes, veiculos, contratos, etc.
    recurso_id = Column(Integer, nullable=True)
    descricao = Column(String)
    ip_address = Column(String)
    timestamp = Column(DateTime, server_default=func.now())
