from datetime import datetime, timedelta
from sqlalchemy import text
from app.celery_app import celery
from app.core.database import SessionLocal


@celery.task(name="app.tasks.alertas.gerar_alertas_diarios")
def gerar_alertas_diarios():
    db = SessionLocal()
    try:
        now = datetime.now()
        future_30 = now + timedelta(days=30)
        alertas = []

        # CNH vencendo (30 dias)
        rows = db.execute(text(
            "SELECT id, nome, cnh_validade FROM clientes WHERE cnh_validade BETWEEN :now AND :future"
        ), {"now": now.date(), "future": future_30.date()}).fetchall()
        for r in rows:
            alertas.append({
                "tipo_alerta": "CNH vencendo",
                "urgencia": "atencao",
                "entidade_tipo": "cliente",
                "entidade_id": r[0],
                "titulo": f"CNH de {r[1]} vence em breve",
                "descricao": f"Validade: {r[2]}"
            })

        # CNH vencida
        rows = db.execute(text(
            "SELECT id, nome, cnh_validade FROM clientes WHERE cnh_validade < :now AND cnh_validade IS NOT NULL"
        ), {"now": now.date()}).fetchall()
        for r in rows:
            alertas.append({
                "tipo_alerta": "CNH vencida",
                "urgencia": "critico",
                "entidade_tipo": "cliente",
                "entidade_id": r[0],
                "titulo": f"CNH de {r[1]} VENCIDA",
                "descricao": f"Venceu em: {r[2]}"
            })

        # Contratos atrasados
        rows = db.execute(text(
            "SELECT c.id, cl.nome, c.data_prevista_devolucao FROM contratos c "
            "JOIN clientes cl ON cl.id = c.cliente_id "
            "WHERE c.status = 'Ativo' AND c.data_prevista_devolucao < :now"
        ), {"now": now.date()}).fetchall()
        for r in rows:
            alertas.append({
                "tipo_alerta": "Contrato atrasado",
                "urgencia": "critico",
                "entidade_tipo": "contrato",
                "entidade_id": r[0],
                "titulo": f"Contrato #{r[0]} de {r[1]} atrasado",
                "descricao": f"Devolução prevista: {r[2]}"
            })

        # Seguros vencendo
        rows = db.execute(text(
            "SELECT id, seguradora, data_vencimento FROM seguros "
            "WHERE status = 'Ativo' AND data_vencimento BETWEEN :now AND :future"
        ), {"now": now.date(), "future": future_30.date()}).fetchall()
        for r in rows:
            alertas.append({
                "tipo_alerta": "Seguro vencendo",
                "urgencia": "atencao",
                "entidade_tipo": "seguro",
                "entidade_id": r[0],
                "titulo": f"Seguro {r[1]} vence em breve",
                "descricao": f"Vencimento: {r[2]}"
            })

        # IPVA vencendo
        rows = db.execute(text(
            "SELECT id, ano_referencia, data_vencimento FROM ipva_registros "
            "WHERE status = 'Pendente' AND data_vencimento BETWEEN :now AND :future"
        ), {"now": now.date(), "future": future_30.date()}).fetchall()
        for r in rows:
            alertas.append({
                "tipo_alerta": "IPVA vencendo",
                "urgencia": "atencao",
                "entidade_tipo": "ipva",
                "entidade_id": r[0],
                "titulo": f"IPVA {r[1]} vence em breve",
                "descricao": f"Vencimento: {r[2]}"
            })

        # Manutenção atrasada
        rows = db.execute(text(
            "SELECT id, descricao, data_proxima FROM manutencoes "
            "WHERE status = 'Agendada' AND data_proxima < :now"
        ), {"now": now.date()}).fetchall()
        for r in rows:
            alertas.append({
                "tipo_alerta": "Manutenção atrasada",
                "urgencia": "critico",
                "entidade_tipo": "manutencao",
                "entidade_id": r[0],
                "titulo": f"Manutenção atrasada: {r[1]}",
                "descricao": f"Data prevista: {r[2]}"
            })

        # Manutenção por KM
        rows = db.execute(text(
            "SELECT m.id, m.descricao, v.km_atual, m.km_proxima FROM manutencoes m "
            "JOIN veiculos v ON v.id = m.veiculo_id "
            "WHERE m.status != 'Concluída' AND m.km_proxima IS NOT NULL AND v.km_atual >= m.km_proxima"
        )).fetchall()
        for r in rows:
            alertas.append({
                "tipo_alerta": "Manutenção por KM",
                "urgencia": "atencao",
                "entidade_tipo": "manutencao",
                "entidade_id": r[0],
                "titulo": f"KM atingido para: {r[1]}",
                "descricao": f"KM atual: {r[2]}, KM previsto: {r[3]}"
            })

        # Insert alertas
        for a in alertas:
            db.execute(text(
                "INSERT INTO alertas_historico (tipo_alerta, urgencia, entidade_tipo, entidade_id, "
                "titulo, descricao, data_criacao, resolvido) "
                "VALUES (:tipo_alerta, :urgencia, :entidade_tipo, :entidade_id, "
                ":titulo, :descricao, :now, false)"
            ), {**a, "now": now})

        db.commit()
        return f"Gerados {len(alertas)} alertas"
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()
