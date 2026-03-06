"""
PDF Generation Service for MPCARS NF (Nota Fiscal de Uso de Veículo)
Uses ReportLab to generate professional PDF reports.
"""

from datetime import datetime
from io import BytesIO
from decimal import Decimal

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm, mm
from reportlab.lib.colors import HexColor, black, white
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

from app.models import UsoVeiculoEmpresa, Empresa, Veiculo, DespesaNF


class PDFNFService:
    """Service for generating Nota Fiscal de Uso de Veículo PDFs"""

    # Color constants
    HEADER_COLOR = HexColor("#3B5998")  # Professional blue
    ALT_ROW_COLOR = HexColor("#F5F5F5")  # Light gray
    TOTAL_BG_COLOR = HexColor("#E8F4F8")  # Light blue
    BORDER_COLOR = HexColor("#CCCCCC")  # Light border

    @staticmethod
    def generate_nf_pdf(db, uso_id: int) -> BytesIO:
        """
        Generate PDF for Nota Fiscal de Uso de Veículo.

        Args:
            db: SQLAlchemy database session
            uso_id: ID of UsoVeiculoEmpresa record

        Returns:
            BytesIO buffer containing the PDF

        Raises:
            ValueError: If uso_id not found or required data is missing
        """
        # Fetch data from database
        uso = db.query(UsoVeiculoEmpresa).filter(
            UsoVeiculoEmpresa.id == uso_id
        ).first()

        if not uso:
            raise ValueError(f"UsoVeiculoEmpresa with ID {uso_id} not found")

        empresa = db.query(Empresa).filter(Empresa.id == uso.empresa_id).first()
        if not empresa:
            raise ValueError(f"Empresa with ID {uso.empresa_id} not found")

        veiculo = db.query(Veiculo).filter(Veiculo.id == uso.veiculo_id).first()
        if not veiculo:
            raise ValueError(f"Veiculo with ID {uso.veiculo_id} not found")

        despesas = db.query(DespesaNF).filter(DespesaNF.uso_id == uso_id).all()

        # Create PDF buffer
        buffer = BytesIO()

        # Create document
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=15 * mm,
            leftMargin=15 * mm,
            topMargin=15 * mm,
            bottomMargin=15 * mm,
        )

        # Build story
        story = []

        # Add header
        story.extend(PDFNFService._build_header())

        # Add sections
        story.extend(PDFNFService._build_empresa_section(empresa))
        story.append(Spacer(1, 0.5 * cm))

        story.extend(PDFNFService._build_veiculo_section(veiculo))
        story.append(Spacer(1, 0.5 * cm))

        story.extend(PDFNFService._build_periodo_quilometragem_section(uso))
        story.append(Spacer(1, 0.5 * cm))

        story.extend(PDFNFService._build_despesas_section(despesas))
        story.append(Spacer(1, 0.5 * cm))

        # Calculate totals
        km_percorrida = PDFNFService._calculate_km_percorrida(uso)
        km_excedente = PDFNFService._calculate_km_excedente(uso, km_percorrida)
        valor_km_extra = PDFNFService._calculate_valor_km_extra(uso, km_excedente)
        subtotal_despesas = PDFNFService._calculate_subtotal_despesas(despesas)
        total_geral = valor_km_extra + subtotal_despesas

        story.extend(
            PDFNFService._build_totais_section(
                km_excedente, valor_km_extra, subtotal_despesas, total_geral
            )
        )
        story.append(Spacer(1, 0.8 * cm))

        # Add footer
        story.extend(PDFNFService._build_footer())

        # Build PDF
        doc.build(story)
        buffer.seek(0)

        return buffer

    @staticmethod
    def _build_header() -> list:
        """Build header section with title and company info"""
        styles = getSampleStyleSheet()
        story = []

        # Title
        title_style = ParagraphStyle(
            "CustomTitle",
            parent=styles["Heading1"],
            fontSize=20,
            textColor=PDFNFService.HEADER_COLOR,
            spaceAfter=6,
            alignment=TA_CENTER,
            fontName="Helvetica-Bold",
        )
        story.append(Paragraph("NOTA FISCAL DE USO DE VEÍCULO", title_style))

        # Company info
        info_style = ParagraphStyle(
            "CompanyInfo",
            parent=styles["Normal"],
            fontSize=10,
            textColor=black,
            spaceAfter=3,
            alignment=TA_CENTER,
        )
        story.append(
            Paragraph(
                "CNPJ: 32.471.526/0001-53 | Tel: 84 99911-0504",
                info_style,
            )
        )

        # Generation timestamp
        timestamp = datetime.now().strftime("%d/%m/%Y às %H:%M")
        story.append(
            Paragraph(
                f"<i>Gerado em {timestamp}</i>",
                info_style,
            )
        )

        story.append(Spacer(1, 0.4 * cm))

        return story

    @staticmethod
    def _build_section_header(title: str) -> list:
        """Build a section header"""
        styles = getSampleStyleSheet()
        story = []

        header_style = ParagraphStyle(
            "SectionHeader",
            parent=styles["Heading2"],
            fontSize=12,
            textColor=white,
            backColor=PDFNFService.HEADER_COLOR,
            spaceAfter=6,
            leftIndent=6,
            fontName="Helvetica-Bold",
        )

        story.append(Paragraph(title, header_style))

        return story

    @staticmethod
    def _build_empresa_section(empresa: Empresa) -> list:
        """Build empresa (lessee) information section"""
        story = PDFNFService._build_section_header("1. EMPRESA LOCATÁRIA")

        data = [
            ["Razão Social", empresa.razao_social or "N/A"],
            ["CNPJ", PDFNFService._format_cnpj(empresa.cnpj or "")],
            ["Responsável", empresa.contato_principal or "N/A"],
            ["Telefone", empresa.telefone or "N/A"],
            ["E-mail", empresa.email or "N/A"],
        ]

        table = Table(data, colWidths=[3 * cm, 12 * cm])
        table.setStyle(PDFNFService._get_table_style())

        story.append(table)

        return story

    @staticmethod
    def _build_veiculo_section(veiculo: Veiculo) -> list:
        """Build vehicle information section"""
        story = PDFNFService._build_section_header("2. VEÍCULO UTILIZADO")

        data = [
            ["Placa", veiculo.placa or "N/A"],
            ["Marca", veiculo.marca or "N/A"],
            ["Modelo", veiculo.modelo or "N/A"],
            ["Ano", str(veiculo.ano) if veiculo.ano else "N/A"],
            ["Cor", veiculo.cor or "N/A"],
        ]

        table = Table(data, colWidths=[3 * cm, 12 * cm])
        table.setStyle(PDFNFService._get_table_style())

        story.append(table)

        return story

    @staticmethod
    def _build_periodo_quilometragem_section(uso: UsoVeiculoEmpresa) -> list:
        """Build usage period and mileage section"""
        story = PDFNFService._build_section_header(
            "3. PERÍODO DE USO E QUILOMETRAGEM"
        )

        km_percorrida = PDFNFService._calculate_km_percorrida(uso)
        km_excedente = PDFNFService._calculate_km_excedente(uso, km_percorrida)
        valor_km_extra = PDFNFService._calculate_valor_km_extra(uso, km_excedente)

        data = [
            ["Data de Início", PDFNFService._format_date(uso.data_inicio)],
            ["Data de Fim", PDFNFService._format_date(uso.data_fim)],
            ["KM Inicial", PDFNFService._format_number(uso.km_inicial or 0)],
            ["KM Final", PDFNFService._format_number(uso.km_final or 0)],
            ["KM Percorrida", PDFNFService._format_number(km_percorrida)],
            ["KM de Referência (franquia)", PDFNFService._format_number(getattr(uso, 'km_referencia', None) or 0)],
            ["KM Excedente", PDFNFService._format_number(km_excedente)],
            ["Valor por KM Extra", PDFNFService._format_currency(getattr(uso, 'valor_km_extra', None) or Decimal(0))],
            ["Valor Total KM Extra", PDFNFService._format_currency(valor_km_extra)],
        ]

        table = Table(data, colWidths=[3 * cm, 12 * cm])
        table.setStyle(PDFNFService._get_table_style())

        story.append(table)

        return story

    @staticmethod
    def _build_despesas_section(despesas: list) -> list:
        """Build expenses section"""
        story = PDFNFService._build_section_header("4. DESPESAS DO PERÍODO")

        # Header row
        data = [
            ["Tipo", "Descrição", "Data", "Valor (R$)"]
        ]

        # Expense rows
        subtotal = Decimal(0)
        for idx, despesa in enumerate(despesas):
            row_color = (
                PDFNFService.ALT_ROW_COLOR if idx % 2 == 1 else white
            )
            data.append([
                getattr(despesa, 'tipo', 'Geral') or "Geral",
                despesa.descricao or "N/A",
                PDFNFService._format_date(despesa.data) if despesa.data else "N/A",
                PDFNFService._format_currency(despesa.valor or Decimal(0)),
            ])
            subtotal += despesa.valor or Decimal(0)

        # Subtotal row
        data.append([
            "",
            "",
            "SUBTOTAL DESPESAS",
            PDFNFService._format_currency(subtotal),
        ])

        colWidths = [2.5 * cm, 7.5 * cm, 2.5 * cm, 2.5 * cm]
        table = Table(data, colWidths=colWidths)

        # Custom style for expenses table
        table_style = [
            ("BACKGROUND", (0, 0), (-1, 0), PDFNFService.HEADER_COLOR),
            ("TEXTCOLOR", (0, 0), (-1, 0), white),
            ("ALIGN", (0, 0), (-1, -1), "LEFT"),
            ("ALIGN", (3, 0), (3, -1), "RIGHT"),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 10),
            ("BOTTOMPADDING", (0, 0), (-1, 0), 6),
            ("TOPPADDING", (0, 0), (-1, 0), 6),
            ("BACKGROUND", (0, -1), (-1, -1), PDFNFService.ALT_ROW_COLOR),
            ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
            ("GRID", (0, 0), (-1, -1), 1, PDFNFService.BORDER_COLOR),
            ("ROWBACKGROUNDS", (0, 1), (-1, -2), [white, PDFNFService.ALT_ROW_COLOR]),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]

        table.setStyle(TableStyle(table_style))
        story.append(table)

        return story

    @staticmethod
    def _build_totais_section(
        km_excedente: Decimal,
        valor_km_extra: Decimal,
        subtotal_despesas: Decimal,
        total_geral: Decimal,
    ) -> list:
        """Build totals section"""
        story = PDFNFService._build_section_header("5. TOTAIS")

        data = [
            ["KM Extra (excedente × valor)", PDFNFService._format_currency(valor_km_extra)],
            ["Subtotal Despesas", PDFNFService._format_currency(subtotal_despesas)],
            ["TOTAL GERAL A PAGAR", PDFNFService._format_currency(total_geral)],
        ]

        colWidths = [10 * cm, 5 * cm]
        table = Table(data, colWidths=colWidths)

        table_style = [
            ("ALIGN", (0, 0), (0, -1), "LEFT"),
            ("ALIGN", (1, 0), (1, -1), "RIGHT"),
            ("FONTNAME", (0, 0), (-1, 1), "Helvetica"),
            ("FONTSIZE", (0, 0), (-1, 1), 10),
            ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
            ("FONTSIZE", (0, -1), (-1, -1), 12),
            ("BACKGROUND", (0, -1), (-1, -1), PDFNFService.TOTAL_BG_COLOR),
            ("GRID", (0, 0), (-1, -1), 1, PDFNFService.BORDER_COLOR),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ]

        table.setStyle(TableStyle(table_style))
        story.append(table)

        return story

    @staticmethod
    def _build_footer() -> list:
        """Build footer section"""
        styles = getSampleStyleSheet()
        story = []

        footer_style = ParagraphStyle(
            "Footer",
            parent=styles["Normal"],
            fontSize=9,
            textColor=HexColor("#666666"),
            alignment=TA_CENTER,
            spaceAfter=12,
        )

        story.append(
            Paragraph(
                "<i>Este documento é uma nota fiscal de uso interno. "
                "Para fins contábeis, solicite nota fiscal formal.</i>",
                footer_style,
            )
        )

        # Signature line
        story.append(Spacer(1, 0.6 * cm))
        story.append(
            Paragraph(
                "_" * 80,
                ParagraphStyle(
                    "Line",
                    parent=styles["Normal"],
                    fontSize=9,
                    alignment=TA_CENTER,
                ),
            )
        )
        story.append(
            Paragraph(
                "Assinatura do Responsável",
                ParagraphStyle(
                    "Signature",
                    parent=styles["Normal"],
                    fontSize=9,
                    alignment=TA_CENTER,
                ),
            )
        )

        return story

    @staticmethod
    def _get_table_style() -> TableStyle:
        """Get standard table style"""
        return TableStyle([
            ("BACKGROUND", (0, 0), (0, -1), PDFNFService.HEADER_COLOR),
            ("TEXTCOLOR", (0, 0), (0, -1), white),
            ("ALIGN", (0, 0), (-1, -1), "LEFT"),
            ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 10),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("GRID", (0, 0), (-1, -1), 1, PDFNFService.BORDER_COLOR),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [white, PDFNFService.ALT_ROW_COLOR]),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ])

    @staticmethod
    def _calculate_km_percorrida(uso: UsoVeiculoEmpresa) -> Decimal:
        """Calculate total kilometers traveled"""
        km_inicial = Decimal(uso.km_inicial or 0)
        km_final = Decimal(uso.km_final or 0)
        return max(Decimal(0), km_final - km_inicial)

    @staticmethod
    def _calculate_km_excedente(
        uso: UsoVeiculoEmpresa, km_percorrida: Decimal
    ) -> Decimal:
        """Calculate excess kilometers beyond reference"""
        km_referencia = Decimal(getattr(uso, 'km_referencia', None) or 0)
        return max(Decimal(0), km_percorrida - km_referencia)

    @staticmethod
    def _calculate_valor_km_extra(
        uso: UsoVeiculoEmpresa, km_excedente: Decimal
    ) -> Decimal:
        """Calculate total cost for excess kilometers"""
        valor_km_extra = Decimal(getattr(uso, 'valor_km_extra', None) or 0)
        return km_excedente * valor_km_extra

    @staticmethod
    def _calculate_subtotal_despesas(despesas: list) -> Decimal:
        """Calculate total expenses"""
        return sum(
            Decimal(d.valor or 0) for d in despesas
        )

    @staticmethod
    def _format_date(date_obj) -> str:
        """Format date as DD/MM/AAAA"""
        if not date_obj:
            return "N/A"
        if isinstance(date_obj, str):
            return date_obj
        return date_obj.strftime("%d/%m/%Y")

    @staticmethod
    def _format_currency(value: Decimal) -> str:
        """Format value as R$ X.XXX,XX"""
        if not value:
            value = Decimal(0)
        value = Decimal(str(value))
        # Format with 2 decimal places
        formatted = f"{value:,.2f}".replace(",", ".")
        # Replace last dot with comma for Brazilian format
        parts = formatted.rsplit(".", 1)
        if len(parts) == 2:
            return f"R$ {parts[0].replace('.', ',')},{parts[1]}"
        return f"R$ {formatted}"

    @staticmethod
    def _format_number(value) -> str:
        """Format number with thousand separators"""
        if not value:
            value = 0
        value = Decimal(str(value))
        return f"{value:,.0f}".replace(",", ".")

    @staticmethod
    def _format_cnpj(cnpj: str) -> str:
        """Format CNPJ as XX.XXX.XXX/XXXX-XX"""
        cnpj = str(cnpj or "").replace(".", "").replace("/", "").replace("-", "")
        if len(cnpj) == 14:
            return f"{cnpj[0:2]}.{cnpj[2:5]}.{cnpj[5:8]}/{cnpj[8:12]}-{cnpj[12:14]}"
        return cnpj
