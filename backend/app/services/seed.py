from sqlalchemy.orm import Session
from datetime import datetime
from app.models.user import User
from app.models import Configuracao, IpvaAliquota
from app.core.security import get_password_hash


def seed_database(db: Session):
    """Seed the database with initial data."""

    # Check if admin user already exists
    admin_exists = db.query(User).filter(User.email == "admin@mpcars.com").first()
    if not admin_exists:
        admin_user = User(
            email="admin@mpcars.com",
            hashed_password=get_password_hash("123456"),
            nome="Administrador",
            perfil="admin",
            ativo=True,
        )
        db.add(admin_user)
        db.commit()

    # Check if configurations already exist
    config_count = db.query(Configuracao).count()
    if config_count == 0:
        configurations = [
            Configuracao(chave="empresa_nome", valor="MPCARS Aluguel de Veículos"),
            Configuracao(chave="empresa_cnpj", valor="00.000.000/0000-00"),
            Configuracao(chave="empresa_telefone", valor="(11) 99999-9999"),
            Configuracao(chave="empresa_email", valor="contato@mpcars.com"),
            Configuracao(chave="valor_diaria_padrao", valor="150.00"),
            Configuracao(chave="km_limite_manutencao", valor="5000"),
            Configuracao(chave="dias_alerta_vencimento", valor="30"),
            Configuracao(chave="taxa_multa_atraso", valor="50.00"),
            Configuracao(chave="percentual_caucao", valor="10"),
            Configuracao(chave="sistema_versao", valor="2.0.0"),
            Configuracao(chave="timezone", valor="America/Sao_Paulo"),
        ]
        db.add_all(configurations)
        db.commit()

    # Check if IPVA aliquotas already exist
    ipva_count = db.query(IpvaAliquota).count()
    if ipva_count == 0:
        # 8 states × 4 vehicle types
        states = ["SP", "RJ", "MG", "BA", "SC", "PR", "RS", "DF"]
        types = ["Automovel", "Moto", "Utilitario", "Caminhao"]

        ipva_rates = {
            "SP": {"Automovel": 4.0, "Moto": 1.5, "Utilitario": 2.0, "Caminhao": 2.5},
            "RJ": {"Automovel": 3.5, "Moto": 1.0, "Utilitario": 2.0, "Caminhao": 2.5},
            "MG": {"Automovel": 3.5, "Moto": 1.5, "Utilitario": 2.0, "Caminhao": 2.5},
            "BA": {"Automovel": 3.0, "Moto": 1.5, "Utilitario": 2.0, "Caminhao": 2.5},
            "SC": {"Automovel": 3.5, "Moto": 1.5, "Utilitario": 2.0, "Caminhao": 2.5},
            "PR": {"Automovel": 3.5, "Moto": 1.5, "Utilitario": 2.0, "Caminhao": 2.5},
            "RS": {"Automovel": 3.5, "Moto": 1.5, "Utilitario": 2.0, "Caminhao": 2.5},
            "DF": {"Automovel": 4.5, "Moto": 2.0, "Utilitario": 2.5, "Caminhao": 3.0},
        }

        ipva_records = []
        for state in states:
            for vehicle_type in types:
                aliquota = IpvaAliquota(
                    estado=state,
                    tipo_veiculo=vehicle_type,
                    aliquota=ipva_rates[state][vehicle_type],
                    descricao=f"Alíquota IPVA {state} - {vehicle_type}",
                )
                ipva_records.append(aliquota)

        db.add_all(ipva_records)
        db.commit()
