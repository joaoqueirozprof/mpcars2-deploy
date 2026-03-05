from io import BytesIO
from datetime import datetime
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate,
    Table,
    TableStyle,
    Paragraph,
    Spacer,
    PageBreak,
)
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from sqlalchemy.orm import Session
from app.models import (
    Contrato,
    Cliente,
    Veiculo,
    DespesaContrato,
    Quilometragem,
    CheckinCheckout,
)


class PDFService:
    """Service for generating PDF reports."""

    @staticmethod
    def generate_contrato_pdf(db: Session, contrato_id: int) -> BytesIO:
        """Generate PDF for a contract."""
        contrato = db.query(Contrato).filter(Contrato.id == contrato_id).first()
        if not contrato:
            raise ValueError("Contrato não encontrado")

        cliente = db.query(Cliente).filter(Cliente.id == contrato.cliente_id).first()
        veiculo = db.query(Veiculo).filter(Veiculo.id == contrato.veiculo_id).first()
        despesas = db.query(DespesaContrato).filter(
            DespesaContrato.contrato_id == contrato_id
        ).all()
        quilometragem = db.query(Quilometragem).filter(
            Quilometragem.contrato_id == contrato_id
        ).all()

        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        story = []
        styles = getSampleStyleSheet()

        # Title
        title_style = ParagraphStyle(
            "CustomTitle",
            parent=styles["Heading1"],
            fontSize=24,
            textColor=colors.HexColor("#1f2937"),
            spaceAfter=30,
            alignment=TA_CENTER,
        )
        story.append(Paragraph("CONTRATO DE ALUGUEL DE VEÍCULO", title_style))
        story.append(Spacer(1, 12))

        # Contract info
        info_data = [
            ["Número do Contrato:", str(contrato.numero)],
            ["Data de Criação:", contrato.data_criacao.strftime("%d/%m/%Y")],
            ["Status:", contrato.status],
            ["Valor Total:", f"R$ {float(contrato.valor_total):.2f}"],
        ]

        info_table = Table(info_data, colWidths=[2 * inch, 4 * inch])
        info_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#e5e7eb")),
                    ("TEXTCOLOR", (0, 0), (-1, -1), colors.black),
                    ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                    ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 10),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
                    ("GRID", (0, 0), (-1, -1), 1, colors.black),
                ]
            )
        )
        story.append(info_table)
        story.append(Spacer(1, 20))

        # Client info
        story.append(Paragraph("INFORMAÇÕES DO CLIENTE", styles["Heading2"]))
        client_data = [
            ["Nome:", cliente.nome],
            ["CPF:", cliente.cpf],
            ["Telefone:", cliente.telefone or "N/A"],
            ["Email:", cliente.email or "N/A"],
        ]
        client_table = Table(client_data, colWidths=[2 * inch, 4 * inch])
        client_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#e5e7eb")),
                    ("TEXTCOLOR", (0, 0), (-1, -1), colors.black),
                    ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                    ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 10),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
                    ("GRID", (0, 0), (-1, -1), 1, colors.black),
                ]
            )
        )
        story.append(client_table)
        story.append(Spacer(1, 20))

        # Vehicle info
        story.append(Paragraph("INFORMAÇÕES DO VEÍCULO", styles["Heading2"]))
        vehicle_data = [
            ["Placa:", veiculo.placa],
            ["Marca/Modelo:", f"{veiculo.marca} {veiculo.modelo}"],
            ["Ano:", str(veiculo.ano)],
            ["Combustível:", veiculo.combustivel or "N/A"],
        ]
        vehicle_table = Table(vehicle_data, colWidths=[2 * inch, 4 * inch])
        vehicle_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#e5e7eb")),
                    ("TEXTCOLOR", (0, 0), (-1, -1), colors.black),
                    ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                    ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 10),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
                    ("GRID", (0, 0), (-1, -1), 1, colors.black),
                ]
            )
        )
        story.append(vehicle_table)
        story.append(Spacer(1, 20))

        # Rental period
        story.append(Paragraph("PERÍODO DE ALUGUEL", styles["Heading2"]))
        period_data = [
            ["Data Início:", contrato.data_inicio.strftime("%d/%m/%Y %H:%M")],
            ["Data Fim:", contrato.data_fim.strftime("%d/%m/%Y %H:%M")],
            ["KM Inicial:", f"{contrato.km_inicial:.2f}" if contrato.km_inicial else "N/A"],
            ["KM Final:", f"{contrato.km_final:.2f}" if contrato.km_final else "N/A"],
        ]
        period_table = Table(period_data, colWidths=[2 * inch, 4 * inch])
        period_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#e5e7eb")),
                    ("TEXTCOLOR", (0, 0), (-1, -1), colors.black),
                    ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                    ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 10),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
                    ("GRID", (0, 0), (-1, -1), 1, colors.black),
                ]
            )
        )
        story.append(period_table)
        story.append(Spacer(1, 20))

        # Pricing
        story.append(Paragraph("VALORES", styles["Heading2"]))
        pricing_data = [
            ["Descrição", "Valor"],
            ["Diária", f"R$ {float(contrato.valor_diaria):.2f}"],
            ["Valor Total", f"R$ {float(contrato.valor_total):.2f}"],
        ]
        pricing_table = Table(pricing_data, colWidths=[3 * inch, 3 * inch])
        pricing_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1f2937")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 10),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
                    ("GRID", (0, 0), (-1, -1), 1, colors.black),
                ]
            )
        )
        story.append(pricing_table)
        story.append(Spacer(1, 20))

        # Additional expenses if any
        if despesas:
            story.append(Paragraph("DESPESAS ADICIONAIS", styles["Heading2"]))
            expense_data = [["Tipo", "Descrição", "Valor"]]
            for despesa in despesas:
                expense_data.append(
                    [
                        despesa.tipo or "N/A",
                        despesa.descricao or "N/A",
                        f"R$ {float(despesa.valor):.2f}" if despesa.valor else "N/A",
                    ]
                )
            expense_table = Table(expense_data, colWidths=[1.5 * inch, 2.5 * inch, 2 * inch])
            expense_table.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1f2937")),
                        ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                        ("FONTSIZE", (0, 0), (-1, -1), 9),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
                        ("GRID", (0, 0), (-1, -1), 1, colors.black),
                    ]
                )
            )
            story.append(expense_table)
            story.append(Spacer(1, 20))

        # Footer
        story.append(Spacer(1, 30))
        footer_text = f"Documento gerado em {datetime.now().strftime('%d/%m/%Y às %H:%M:%S')}"
        story.append(
            Paragraph(
                footer_text,
                ParagraphStyle(
                    "Footer",
                    parent=styles["Normal"],
                    fontSize=9,
                    textColor=colors.grey,
                    alignment=TA_CENTER,
                ),
            )
        )

        doc.build(story)
        buffer.seek(0)
        return buffer

    @staticmethod
    def generate_relatorio_financeiro_pdf(
        db: Session, data_inicio: str, data_fim: str
    ) -> BytesIO:
        """Generate financial report PDF."""
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        story = []
        styles = getSampleStyleSheet()

        # Title
        title_style = ParagraphStyle(
            "CustomTitle",
            parent=styles["Heading1"],
            fontSize=20,
            textColor=colors.HexColor("#1f2937"),
            spaceAfter=20,
            alignment=TA_CENTER,
        )
        story.append(Paragraph("RELATÓRIO FINANCEIRO", title_style))
        story.append(Spacer(1, 12))

        # Period info
        period_para = Paragraph(
            f"Período: {data_inicio} a {data_fim}",
            ParagraphStyle(
                "Period",
                parent=styles["Normal"],
                fontSize=11,
                textColor=colors.HexColor("#4b5563"),
                alignment=TA_CENTER,
            ),
        )
        story.append(period_para)
        story.append(Spacer(1, 20))

        # Summary table placeholder
        summary_data = [
            ["Métrica", "Valor"],
            ["Total de Receitas", "R$ 0,00"],
            ["Total de Despesas", "R$ 0,00"],
            ["Lucro Líquido", "R$ 0,00"],
        ]
        summary_table = Table(summary_data, colWidths=[3 * inch, 3 * inch])
        summary_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1f2937")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 11),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
                    ("GRID", (0, 0), (-1, -1), 1, colors.black),
                ]
            )
        )
        story.append(summary_table)
        story.append(Spacer(1, 30))

        # Footer
        footer_text = f"Relatório gerado em {datetime.now().strftime('%d/%m/%Y às %H:%M:%S')}"
        story.append(
            Paragraph(
                footer_text,
                ParagraphStyle(
                    "Footer",
                    parent=styles["Normal"],
                    fontSize=9,
                    textColor=colors.grey,
                    alignment=TA_CENTER,
                ),
            )
        )

        doc.build(story)
        buffer.seek(0)
        return buffer

    @staticmethod
    def generate_nf_pdf(db: Session, relatorio_id: int) -> BytesIO:
        """Generate NF (Nota Fiscal) PDF."""
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        story = []
        styles = getSampleStyleSheet()

        # Title
        title_style = ParagraphStyle(
            "CustomTitle",
            parent=styles["Heading1"],
            fontSize=18,
            textColor=colors.HexColor("#1f2937"),
            spaceAfter=20,
            alignment=TA_CENTER,
        )
        story.append(Paragraph("RELATÓRIO DE USO - NOTA FISCAL", title_style))
        story.append(Spacer(1, 12))

        # Document info
        doc_data = [
            ["Número do Relatório:", str(relatorio_id)],
            ["Data de Emissão:", datetime.now().strftime("%d/%m/%Y")],
        ]
        doc_table = Table(doc_data, colWidths=[2.5 * inch, 3.5 * inch])
        doc_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#e5e7eb")),
                    ("TEXTCOLOR", (0, 0), (-1, -1), colors.black),
                    ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                    ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 10),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
                    ("GRID", (0, 0), (-1, -1), 1, colors.black),
                ]
            )
        )
        story.append(doc_table)
        story.append(Spacer(1, 20))

        # Usage summary
        story.append(Paragraph("RESUMO DE USO", styles["Heading2"]))
        usage_data = [
            ["Descrição", "Valor"],
            ["KM Percorrida", "0 km"],
            ["KM Excedente", "0 km"],
            ["Valor Total Extra", "R$ 0,00"],
        ]
        usage_table = Table(usage_data, colWidths=[3 * inch, 3 * inch])
        usage_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1f2937")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 10),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
                    ("GRID", (0, 0), (-1, -1), 1, colors.black),
                ]
            )
        )
        story.append(usage_table)
        story.append(Spacer(1, 30))

        # Footer
        footer_text = f"NF gerado em {datetime.now().strftime('%d/%m/%Y às %H:%M:%S')}"
        story.append(
            Paragraph(
                footer_text,
                ParagraphStyle(
                    "Footer",
                    parent=styles["Normal"],
                    fontSize=9,
                    textColor=colors.grey,
                    alignment=TA_CENTER,
                ),
            )
        )

        doc.build(story)
        buffer.seek(0)
        return buffer
