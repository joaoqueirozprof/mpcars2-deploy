from sqlalchemy import Column, Integer, String, Boolean, DateTime, func
from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    nome = Column(String, nullable=False)
    perfil = Column(String, default="admin")
    ativo = Column(Boolean, default=True)
    data_cadastro = Column(DateTime, server_default=func.now())
