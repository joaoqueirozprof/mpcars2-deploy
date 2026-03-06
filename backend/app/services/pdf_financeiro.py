"""
Financial Report PDF Generation Service
Generates comprehensive financial reports using ReportLab with data from database.
"""

from datetime import datetime, timedelta, date
from decimal import Decimal
from io import BytesIO
from typing import Optional, Dict, List, Tuple

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm, inch
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer,
    PageBreak, Image, KeepTogether
)
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT

from app.models import (
    Contrato, Cliente, Veiculo, DespesaVeiculo, DespesaLoja,
    Seguro, ParcelaSeguro, IpvaRegistro, Multa, Configuracao
)


class PDFFinanceiroService:
    """Service for generating financial reports in PDF format."""

    # Color definitions
    COLOR_PRIMARY = colors.HexColor("#3B5998")
    COLOR_POSITIVE = colors.HexColor("#27AE60")
    COLOR_NEGATIVE = colors.HexColor("#E74C3C")
    COLOR_HEADER_BG = colors.HexColor("#F8F9FA")
    COLOR_ROW_ALT = colors.HexColor("#FFFFFF")
    COLOR_ROW_ALT_2 = colors.HexColor("#F5F5F5")
    COLOR_BORDER = colors.HexColor("#E0E0E0")

    # Font sizes
    FONT_TITLE = 24
    FONT_SECTION = 16
    FONT_SUBSECTION = 12
    FONT_BODY = 10
    FONT_SMALL = 8

    @staticmethod
    def _format_currency(value: Optional[Decimal]) -> str:
        """Format value as Brazilian currency."""
        if value is None:
            return "R$ 0,00"
        try:
            value = Decimal(str(value))
            formatted = f"{value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
            return f"R$ {formatted}"
        except (ValueError, TypeError):
            return "R$ 0,00"

    @staticmethod
    def _format_date(date_obj) -> str:
        """Format date as DD/MM/YYYY."""
        if date_obj is None:
            return "N/A"
        try:
            if isinstance(date_obj, str):
                date_obj = datetime.strptime(date_obj, "%Y-%m-%d").date()
            return date_obj.strftime("%d/%m/%Y")
        except (ValueError, AttributeError):
            return "N/A"

    @staticmethod
    def _parse_date(date_str: str) -> datetime:
        """Parse date string from YYYY-MM-DD format to datetime."""
        return datetime.strptime(date_str, "%Y-%m-%d")

    @staticmethod
    def _get_date_range(data_inicio: str, data_fim: str) -> Tuple[datetime, datetime]:
        """Get start and end datetimes for database queries."""
        data_inicio_dt = PDFFinanceiroService._parse_date(data_inicio)
        data_fim_dt = PDFFinanceiroService._parse_date(data_fim)
        # End of day for fim
        data_fim_dt = data_fim_dt.replace(hour=23, minute=59, second=59)
        return data_inicio_dt, data_fim_dt

    @staticmethod
    def _create_styles() -> Dict:
        """Create and return style definitions."""
        styles = getSampleStyleSheet()

        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=PDFFinanceiroService.FONT_TITLE,
            textColor=PDFFinanceiroService.COLOR_PRIMARY,
            spaceAfter=12,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        )

        section_style = ParagraphStyle(
            'CustomSection',
            parent=styles['Heading2'],
            fontSize=PDFFinanceiroService.FONT_SECTION,
            textColor=PDFFinanceiroService.COLOR_PRIMARY,
            spaceAfter=10,
            spaceBefore=10,
            fontName='Helvetica-Bold',
            borderPadding=5,
            backColor=PDFFinanceiroService.COLOR_HEADER_BG
        )

        normal_style = ParagraphStyle(
            'CustomNormal',
            parent=styles['Normal'],
            fontSize=PDFFinanceiroService.FONT_BODY,
            alignment=TA_CENTER
        )

        return {
            'title': title_style,
            'section': section_style,
            'normal': normal_style,
            'heading': styles['Heading3']
        }

    @staticmethod
    def _get_resumo_consolidado(db, data_inicio: str, data_fim: str) -> Dict:
        """Calculate consolidated summary data."""
        data_inicio_dt, data_fim_dt = PDFFinanceiroService._get_date_range(data_inicio, data_fim)

        # Total revenue from finalized contracts
        receita_total = db.query(Contrato).filter(
            Contrato.status == 'finalizado',
            Contrato.data_fim >= data_inicio_dt,
            Contrato.data_fim <= data_fim_dt
        ).with_entities(Contrato.valor_total).all()

        receita_total = sum([r[0] or Decimal('0') for r in receita_total])

        # Calculate total expenses
        despesa_veiculo = db.query(DespesaVeiculo).filter(
            DespesaVeiculo.data >= data_inicio_dt,
            DespesaVeiculo.data <= data_fim_dt
        ).with_entities(DespesaVeiculo.valor).all()

        despesa_loja = db.query(DespesaLoja).all()
        despesa_loja_total = Decimal('0')
        data_inicio_date = PDFFinanceiroService._parse_date(data_inicio).date()
        data_fim_date = PDFFinanceiroService._parse_date(data_fim).date()

        for despesa in despesa_loja:
            # DespesaLoja uses mes/ano, construct a date from those fields
            if hasattr(despesa, 'mes') and hasattr(despesa, 'ano'):
                despesa_date = date(despesa.ano, despesa.mes, 1)
                if data_inicio_date <= despesa_date <= data_fim_date:
                    despesa_loja_total += despesa.valor or Decimal('0')

        parcela_seguro = db.query(ParcelaSeguro).filter(
            ParcelaSeguro.data_pagamento >= data_inicio_dt,
            ParcelaSeguro.data_pagamento <= data_fim_dt,
            ParcelaSeguro.status == 'pago'
        ).with_entities(ParcelaSeguro.valor).all()

        ipva_registros = db.query(IpvaRegistro).filter(
            IpvaRegistro.data_pagamento >= data_inicio_dt,
            IpvaRegistro.data_pagamento <= data_fim_dt
        ).with_entities(IpvaRegistro.valor_ipva).all()

        multas = db.query(Multa).filter(
            Multa.data_pagamento >= data_inicio_dt,
            Multa.data_pagamento <= data_fim_dt
        ).with_entities(Multa.valor).all()

        despesa_total = (
            sum([d[0] or Decimal('0') for d in despesa_veiculo]) +
            despesa_loja_total +
            sum([p[0] or Decimal('0') for p in parcela_seguro]) +
            sum([i[0] or Decimal('0') for i in ipva_registros]) +
            sum([m[0] or Decimal('0') for m in multas])
        )

        lucro = receita_total - despesa_total
        margem = (lucro / receita_total * 100) if receita_total > 0 else Decimal('0')

        return {
            'receita_total': receita_total,
            'despesa_total': despesa_total,
            'lucro': lucro,
            'margem': margem
        }

    @staticmethod
    def _get_receitas_detalhadas(db, data_inicio: str, data_fim: str) -> List:
        """Get detailed revenue data from finalized contracts."""
        data_inicio_dt, data_fim_dt = PDFFinanceiroService._get_date_range(data_inicio, data_fim)

        contratos = db.query(Contrato).filter(
            Contrato.status == 'finalizado',
            Contrato.data_fim >= data_inicio_dt,
            Contrato.data_fim <= data_fim_dt
        ).all()

        dados = []
        for contrato in contratos:
            cliente_nome = contrato.cliente.nome if contrato.cliente else "N/A"
            veiculo_info = "N/A"
            if contrato.veiculo:
                veiculo_info = f"{contrato.veiculo.placa} {contrato.veiculo.modelo}"

            # Calculate days
            if contrato.qtd_diarias:
                qtd_diarias = contrato.qtd_diarias
            elif contrato.data_inicio and contrato.data_fim:
                qtd_diarias = (contrato.data_fim.date() - contrato.data_inicio.date()).days
            else:
                qtd_diarias = 0

            dados.append({
                'id': str(contrato.id),
                'cliente': cliente_nome,
                'veiculo': veiculo_info,
                'data_inicio': PDFFinanceiroService._format_date(contrato.data_inicio),
                'data_finalizacao': PDFFinanceiroService._format_date(contrato.data_fim),
                'qtd_diarias': str(qtd_diarias),
                'valor_total': contrato.valor_total or Decimal('0')
            })

        return dados

    @staticmethod
    def _get_despesas_veiculo(db, data_inicio: str, data_fim: str) -> List:
        """Get vehicle expenses."""
        data_inicio_dt, data_fim_dt = PDFFinanceiroService._get_date_range(data_inicio, data_fim)

        despesas = db.query(DespesaVeiculo).filter(
            DespesaVeiculo.data >= data_inicio_dt,
            DespesaVeiculo.data <= data_fim_dt
        ).all()

        dados = []
        for despesa in despesas:
            veiculo_info = "N/A"
            if despesa.veiculo:
                veiculo_info = f"{despesa.veiculo.placa} {despesa.veiculo.modelo}"

            dados.append({
                'veiculo': veiculo_info,
                'tipo': despesa.tipo or "N/A",
                'descricao': despesa.descricao or "N/A",
                'data': PDFFinanceiroService._format_date(despesa.data),
                'valor': despesa.valor or Decimal('0')
            })

        return dados

    @staticmethod
    def _get_despesas_loja(db, data_inicio: str, data_fim: str) -> List:
        """Get shop expenses filtered by date range using mes/ano fields."""
        data_inicio_date = PDFFinanceiroService._parse_date(data_inicio).date()
        data_fim_date = PDFFinanceiroService._parse_date(data_fim).date()

        despesas = db.query(DespesaLoja).all()

        dados = []
        for despesa in despesas:
            # Use mes/ano fields for filtering (consistent with _get_resumo_consolidado)
            if hasattr(despesa, 'mes') and hasattr(despesa, 'ano') and despesa.mes and despesa.ano:
                despesa_date = date(despesa.ano, despesa.mes, 1)
                if data_inicio_date <= despesa_date <= data_fim_date:
                    dados.append({
                        'categoria': despesa.categoria or "N/A",
                        'descricao': despesa.descricao or "N/A",
                        'data': f"{despesa.mes:02d}/{despesa.ano}",
                        'valor': despesa.valor or Decimal('0')
                    })

        return dados

    @staticmethod
    def _get_despesas_seguros(db, data_inicio: str, data_fim: str) -> List:
        """Get insurance expenses."""
        data_inicio_dt, data_fim_dt = PDFFinanceiroService._get_date_range(data_inicio, data_fim)

        parcelas = db.query(ParcelaSeguro).filter(
            ParcelaSeguro.data_pagamento >= data_inicio_dt,
            ParcelaSeguro.data_pagamento <= data_fim_dt,
            ParcelaSeguro.status == 'pago'
        ).all()

        dados = []
        for parcela in parcelas:
            apolice = "N/A"
            if parcela.seguro:
                apolice = parcela.seguro.numero_apolice or "N/A"

            dados.append({
                'apolice': apolice,
                'vencimento': PDFFinanceiroService._format_date(parcela.vencimento),
                'valor': parcela.valor or Decimal('0')
            })

        return dados

    @staticmethod
    def _get_despesas_ipva(db, data_inicio: str, data_fim: str) -> List:
        """Get IPVA expenses."""
        data_inicio_dt, data_fim_dt = PDFFinanceiroService._get_date_range(data_inicio, data_fim)

        ipvas = db.query(IpvaRegistro).filter(
            IpvaRegistro.data_pagamento >= data_inicio_dt,
            IpvaRegistro.data_pagamento <= data_fim_dt
        ).all()

        dados = []
        for ipva in ipvas:
            veiculo_info = "N/A"
            if ipva.veiculo:
                veiculo_info = ipva.veiculo.placa

            dados.append({
                'veiculo': veiculo_info,
                'ano_ref': str(ipva.ano_referencia or "N/A"),
                'valor': ipva.valor_ipva or Decimal('0'),
                'data_pagamento': PDFFinanceiroService._format_date(ipva.data_pagamento)
            })

        return dados

    @staticmethod
    def _get_despesas_multas(db, data_inicio: str, data_fim: str) -> List:
        """Get fines/multas expenses."""
        data_inicio_dt, data_fim_dt = PDFFinanceiroService._get_date_range(data_inicio, data_fim)

        multas = db.query(Multa).filter(
            Multa.data_pagamento >= data_inicio_dt,
            Multa.data_pagamento <= data_fim_dt
        ).all()

        dados = []
        for multa in multas:
            veiculo_info = "N/A"
            if multa.veiculo:
                veiculo_info = multa.veiculo.placa

            dados.append({
                'veiculo': veiculo_info,
                'tipo': getattr(multa, 'tipo', 'Multa'),
                'descricao': multa.descricao or "N/A",
                'valor': multa.valor or Decimal('0'),
                'data_pagamento': PDFFinanceiroService._format_date(multa.data_pagamento)
            })

        return dados

    @staticmethod
    def _create_header(data_inicio: str, data_fim: str) -> List:
        """Create PDF header section."""
        styles = PDFFinanceiroService._create_styles()
        elements = []

        # Title
        titulo = Paragraph("RELATÓRIO FINANCEIRO", styles['title'])
        elements.append(titulo)
        elements.append(Spacer(1, 0.2 * cm))

        # Period
        data_inicio_fmt = PDFFinanceiroService._format_date(data_inicio)
        data_fim_fmt = PDFFinanceiroService._format_date(data_fim)
        periodo = Paragraph(
            f"<b>Período:</b> {data_inicio_fmt} a {data_fim_fmt}",
            ParagraphStyle('period', parent=styles['normal'], fontSize=11)
        )
        elements.append(periodo)

        # Generation timestamp
        agora = datetime.now()
        data_hora = agora.strftime("%d/%m/%Y às %H:%M")
        gerado = Paragraph(
            f"<b>Gerado em</b> {data_hora}",
            ParagraphStyle('generated', parent=styles['normal'], fontSize=9, textColor=colors.grey)
        )
        elements.append(gerado)
        elements.append(Spacer(1, 0.5 * cm))

        return elements

    @staticmethod
    def _create_resumo_consolidado(resumo: Dict) -> List:
        """Create consolidated summary section."""
        styles = PDFFinanceiroService._create_styles()
        elements = []

        # Section title
        titulo = Paragraph("RESUMO CONSOLIDADO", styles['section'])
        elements.append(titulo)
        elements.append(Spacer(1, 0.3 * cm))

        # Create 4 cards
        receita_total = resumo['receita_total']
        despesa_total = resumo['despesa_total']
        lucro = resumo['lucro']
        margem = resumo['margem']

        card_data = [
            ("RECEITA TOTAL", PDFFinanceiroService._format_currency(receita_total), colors.HexColor("#3498DB")),
            ("DESPESA TOTAL", PDFFinanceiroService._format_currency(despesa_total), colors.HexColor("#E67E22")),
            ("LUCRO / PREJUÍZO", PDFFinanceiroService._format_currency(lucro),
             PDFFinanceiroService.COLOR_POSITIVE if lucro >= 0 else PDFFinanceiroService.COLOR_NEGATIVE),
            ("MARGEM (%)", f"{margem:.1f}%", PDFFinanceiroService.COLOR_PRIMARY)
        ]

        # Create card table
        card_cells = []
        for label, value, color in card_data:
            cell_content = f"<b><font color='#{color.hexval()}'>{label}</font></b><br/><font size=14>{value}</font>"
            card_cells.append(Paragraph(cell_content, styles['normal']))

        cards_table = Table([card_cells], colWidths=[4 * cm, 4 * cm, 4 * cm, 4 * cm])
        cards_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F8F9FA")),
            ('BORDER', (0, 0), (-1, -1), 1, PDFFinanceiroService.COLOR_BORDER),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('PADDING', (0, 0), (-1, -1), 15),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ]))

        elements.append(cards_table)
        elements.append(Spacer(1, 0.5 * cm))

        return elements

    @staticmethod
    def _create_receitas_detalhadas(dados: List) -> List:
        """Create detailed revenues section."""
        styles = PDFFinanceiroService._create_styles()
        elements = []

        # Section title
        titulo = Paragraph("RECEITAS — CONTRATOS FINALIZADOS NO PERÍODO", styles['section'])
        elements.append(titulo)
        elements.append(Spacer(1, 0.2 * cm))

        if not dados:
            elements.append(Paragraph("Nenhum registro encontrado", styles['normal']))
            elements.append(Spacer(1, 0.3 * cm))
            return elements

        # Build table
        table_data = [[
            Paragraph("<b>#</b>", styles['normal']),
            Paragraph("<b>Cliente</b>", styles['normal']),
            Paragraph("<b>Veículo</b>", styles['normal']),
            Paragraph("<b>Data de Saída</b>", styles['normal']),
            Paragraph("<b>Data de Devolução</b>", styles['normal']),
            Paragraph("<b>Diárias</b>", styles['normal']),
            Paragraph("<b>Valor Total</b>", styles['normal'])
        ]]

        total_valor = Decimal('0')
        for idx, item in enumerate(dados):
            total_valor += item['valor_total']
            row_color = PDFFinanceiroService.COLOR_ROW_ALT if idx % 2 == 0 else PDFFinanceiroService.COLOR_ROW_ALT_2

            table_data.append([
                Paragraph(item['id'], styles['normal']),
                Paragraph(item['cliente'][:30], styles['normal']),
                Paragraph(item['veiculo'], styles['normal']),
                Paragraph(item['data_inicio'], styles['normal']),
                Paragraph(item['data_finalizacao'], styles['normal']),
                Paragraph(item['qtd_diarias'], ParagraphStyle('right', parent=styles['normal'], alignment=TA_RIGHT)),
                Paragraph(PDFFinanceiroService._format_currency(item['valor_total']),
                         ParagraphStyle('right', parent=styles['normal'], alignment=TA_RIGHT))
            ])

        # Total row
        table_data.append([
            Paragraph("<b>TOTAL</b>", styles['normal']),
            Paragraph("", styles['normal']),
            Paragraph("", styles['normal']),
            Paragraph("", styles['normal']),
            Paragraph("", styles['normal']),
            Paragraph("", styles['normal']),
            Paragraph(f"<b>{PDFFinanceiroService._format_currency(total_valor)}</b>",
                     ParagraphStyle('right', parent=styles['normal'], alignment=TA_RIGHT))
        ])

        table = Table(table_data, colWidths=[0.8*cm, 2*cm, 2.2*cm, 1.8*cm, 1.8*cm, 1.2*cm, 1.8*cm])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), PDFFinanceiroService.COLOR_HEADER_BG),
            ('TEXTCOLOR', (0, 0), (-1, 0), PDFFinanceiroService.COLOR_PRIMARY),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, PDFFinanceiroService.COLOR_BORDER),
            ('ROWBACKGROUNDS', (0, 1), (-1, -2), [PDFFinanceiroService.COLOR_ROW_ALT, PDFFinanceiroService.COLOR_ROW_ALT_2]),
            ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor("#E8E8E8")),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
            ('ALIGN', (5, 0), (6, -1), 'RIGHT'),
            ('RIGHTPADDING', (0, 0), (-1, -1), 5),
            ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ]))

        elements.append(table)
        elements.append(Spacer(1, 0.5 * cm))

        return elements

    @staticmethod
    def _create_despesas_section(titulo: str, dados: List, columns: List) -> List:
        """Create a generic expenses section."""
        styles = PDFFinanceiroService._create_styles()
        elements = []

        titulo_para = Paragraph(titulo, styles['section'])
        elements.append(titulo_para)
        elements.append(Spacer(1, 0.2 * cm))

        if not dados:
            elements.append(Paragraph("Nenhum registro encontrado", styles['normal']))
            elements.append(Spacer(1, 0.3 * cm))
            return elements

        # Build table
        table_data = [[Paragraph(f"<b>{col}</b>", styles['normal']) for col in columns]]

        total_valor = Decimal('0')
        for idx, item in enumerate(dados):
            total_valor += item.get('valor', Decimal('0'))
            row_color = PDFFinanceiroService.COLOR_ROW_ALT if idx % 2 == 0 else PDFFinanceiroService.COLOR_ROW_ALT_2

            row = []
            for col in columns:
                key = col.lower().replace(' ', '_').replace('/', '_').replace('(', '').replace(')', '')
                if key == 'valor' or key == 'valor_pagamento':
                    value = PDFFinanceiroService._format_currency(item.get(key.replace('_pagamento', ''), Decimal('0')))
                    row.append(Paragraph(value, ParagraphStyle('right', parent=styles['normal'], alignment=TA_RIGHT)))
                else:
                    value = str(item.get(key, "N/A"))[:40]
                    row.append(Paragraph(value, styles['normal']))

            table_data.append(row)

        # Total row
        if len(columns) > 1:
            total_row = [Paragraph(f"<b>TOTAL</b>", styles['normal'])]
            for i in range(len(columns) - 1):
                total_row.append(Paragraph("", styles['normal']))
            total_row.append(Paragraph(f"<b>{PDFFinanceiroService._format_currency(total_valor)}</b>",
                                      ParagraphStyle('right', parent=styles['normal'], alignment=TA_RIGHT)))
            table_data.append(total_row)

        col_widths = [None] * len(columns)
        col_widths[-1] = 1.8 * cm

        table = Table(table_data, colWidths=col_widths)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), PDFFinanceiroService.COLOR_HEADER_BG),
            ('TEXTCOLOR', (0, 0), (-1, 0), PDFFinanceiroService.COLOR_PRIMARY),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN', (-1, 0), (-1, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, PDFFinanceiroService.COLOR_BORDER),
            ('ROWBACKGROUNDS', (0, 1), (-1, -2), [PDFFinanceiroService.COLOR_ROW_ALT, PDFFinanceiroService.COLOR_ROW_ALT_2]),
            ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor("#E8E8E8")),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 5),
            ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ]))

        elements.append(table)
        elements.append(Spacer(1, 0.3 * cm))

        return elements

    @staticmethod
    def _create_despesas_detalhadas(db, data_inicio: str, data_fim: str) -> List:
        """Create detailed expenses section."""
        styles = PDFFinanceiroService._create_styles()
        elements = []

        # Section title
        titulo = Paragraph("DESPESAS POR CATEGORIA", styles['section'])
        elements.append(titulo)
        elements.append(Spacer(1, 0.3 * cm))

        # 3.1 - Despesas de Veículos
        titulo_subsecao = Paragraph("3.1 DESPESAS DE VEÍCULOS", styles['heading'])
        elements.append(titulo_subsecao)
        despesas_veiculo = PDFFinanceiroService._get_despesas_veiculo(db, data_inicio, data_fim)
        elements.extend(PDFFinanceiroService._create_despesas_section(
            "",
            despesas_veiculo,
            ["Veículo", "Tipo", "Descrição", "Data", "Valor"]
        ))

        # 3.2 - Despesas da Loja
        titulo_subsecao = Paragraph("3.2 DESPESAS DA LOJA", styles['heading'])
        elements.append(titulo_subsecao)
        despesas_loja = PDFFinanceiroService._get_despesas_loja(db, data_inicio, data_fim)
        elements.extend(PDFFinanceiroService._create_despesas_section(
            "",
            despesas_loja,
            ["Categoria", "Descrição", "Data", "Valor"]
        ))

        # 3.3 - Seguros
        titulo_subsecao = Paragraph("3.3 SEGUROS", styles['heading'])
        elements.append(titulo_subsecao)
        despesas_seguros = PDFFinanceiroService._get_despesas_seguros(db, data_inicio, data_fim)
        elements.extend(PDFFinanceiroService._create_despesas_section(
            "",
            despesas_seguros,
            ["Apólice", "Vencimento", "Valor"]
        ))

        # 3.4 - IPVA
        titulo_subsecao = Paragraph("3.4 IPVA", styles['heading'])
        elements.append(titulo_subsecao)
        despesas_ipva = PDFFinanceiroService._get_despesas_ipva(db, data_inicio, data_fim)
        elements.extend(PDFFinanceiroService._create_despesas_section(
            "",
            despesas_ipva,
            ["Veículo", "Ano Ref", "Valor", "Data Pagamento"]
        ))

        # 3.5 - Multas
        titulo_subsecao = Paragraph("3.5 MULTAS", styles['heading'])
        elements.append(titulo_subsecao)
        despesas_multas = PDFFinanceiroService._get_despesas_multas(db, data_inicio, data_fim)
        elements.extend(PDFFinanceiroService._create_despesas_section(
            "",
            despesas_multas,
            ["Veículo", "Tipo", "Descrição", "Valor", "Data Pagamento"]
        ))

        return elements

    @staticmethod
    def _create_comparativo_despesas(db, data_inicio: str, data_fim: str) -> List:
        """Create expenses comparison section."""
        styles = PDFFinanceiroService._create_styles()
        elements = []

        # Section title
        titulo = Paragraph("COMPARATIVO DE DESPESAS POR CATEGORIA", styles['section'])
        elements.append(titulo)
        elements.append(Spacer(1, 0.2 * cm))

        # Collect data
        despesas_veiculo = PDFFinanceiroService._get_despesas_veiculo(db, data_inicio, data_fim)
        despesas_loja = PDFFinanceiroService._get_despesas_loja(db, data_inicio, data_fim)
        despesas_seguros = PDFFinanceiroService._get_despesas_seguros(db, data_inicio, data_fim)
        despesas_ipva = PDFFinanceiroService._get_despesas_ipva(db, data_inicio, data_fim)
        despesas_multas = PDFFinanceiroService._get_despesas_multas(db, data_inicio, data_fim)

        totais = {
            'Veículos': sum([d['valor'] for d in despesas_veiculo], Decimal('0')),
            'Loja': sum([d['valor'] for d in despesas_loja], Decimal('0')),
            'Seguros': sum([d['valor'] for d in despesas_seguros], Decimal('0')),
            'IPVA': sum([d['valor'] for d in despesas_ipva], Decimal('0')),
            'Multas': sum([d['valor'] for d in despesas_multas], Decimal('0'))
        }

        total_despesas = sum(totais.values())

        if total_despesas == 0:
            elements.append(Paragraph("Nenhum registro encontrado", styles['normal']))
            elements.append(Spacer(1, 0.3 * cm))
            return elements

        # Build table with visual bars
        table_data = [[
            Paragraph("<b>Categoria</b>", styles['normal']),
            Paragraph("<b>Total (R$)</b>", styles['normal']),
            Paragraph("<b>% do Total</b>", styles['normal']),
            Paragraph("<b>Barra Visual</b>", styles['normal'])
        ]]

        from reportlab.platypus import Spacer as TableSpacer
        for categoria, valor in totais.items():
            percentual = float(valor / total_despesas * 100) if total_despesas > 0 else 0.0

            # Create visual bar
            bar_width = max(0.01 * cm, percentual / 100.0 * 3 * cm)
            bar_table = Table([[Spacer(bar_width, 0.3 * cm)]])
            bar_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (0, 0), PDFFinanceiroService.COLOR_PRIMARY),
                ('BORDER', (0, 0), (0, 0), 0.5, PDFFinanceiroService.COLOR_BORDER),
            ]))

            table_data.append([
                Paragraph(f"<b>{categoria}</b>", styles['normal']),
                Paragraph(PDFFinanceiroService._format_currency(valor),
                         ParagraphStyle('right', parent=styles['normal'], alignment=TA_RIGHT)),
                Paragraph(f"{percentual:.1f}%",
                         ParagraphStyle('right', parent=styles['normal'], alignment=TA_RIGHT)),
                bar_table
            ])

        table = Table(table_data, colWidths=[2*cm, 2*cm, 1.8*cm, 3*cm])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), PDFFinanceiroService.COLOR_HEADER_BG),
            ('TEXTCOLOR', (0, 0), (-1, 0), PDFFinanceiroService.COLOR_PRIMARY),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('ALIGN', (2, 0), (2, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, PDFFinanceiroService.COLOR_BORDER),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [PDFFinanceiroService.COLOR_ROW_ALT, PDFFinanceiroService.COLOR_ROW_ALT_2]),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('RIGHTPADDING', (0, 0), (-1, -1), 5),
            ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ]))

        elements.append(table)
        elements.append(Spacer(1, 0.5 * cm))

        return elements

    @staticmethod
    def generate_relatorio_financeiro_pdf(db, data_inicio: str, data_fim: str) -> BytesIO:
        """
        Generate complete financial report PDF.

        Args:
            db: Database session
            data_inicio: Start date in YYYY-MM-DD format
            data_fim: End date in YYYY-MM-DD format

        Returns:
            BytesIO buffer containing the PDF
        """
        # Create BytesIO buffer
        buffer = BytesIO()

        # Create PDF document
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=0.8 * cm,
            leftMargin=0.8 * cm,
            topMargin=1 * cm,
            bottomMargin=1 * cm
        )

        # Build document elements
        elements = []

        # Header
        elements.extend(PDFFinanceiroService._create_header(data_inicio, data_fim))

        # Resumo Consolidado
        resumo = PDFFinanceiroService._get_resumo_consolidado(db, data_inicio, data_fim)
        elements.extend(PDFFinanceiroService._create_resumo_consolidado(resumo))

        # Page break
        elements.append(PageBreak())

        # Receitas Detalhadas
        receitas = PDFFinanceiroService._get_receitas_detalhadas(db, data_inicio, data_fim)
        elements.extend(PDFFinanceiroService._create_receitas_detalhadas(receitas))

        # Despesas Detalhadas
        elements.extend(PDFFinanceiroService._create_despesas_detalhadas(db, data_inicio, data_fim))

        # Page break before comparativo
        elements.append(PageBreak())

        # Comparativo de Despesas
        elements.extend(PDFFinanceiroService._create_comparativo_despesas(db, data_inicio, data_fim))

        # Build PDF
        doc.build(elements)

        # Reset buffer position
        buffer.seek(0)

        return buffer
