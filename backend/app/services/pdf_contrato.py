"""
PDF Contract Generation Service for MPCARS Rental System

This module provides ReportLab-based PDF generation for rental contracts,
matching the physical MPCARS contract form exactly.
"""

from io import BytesIO
from datetime import datetime
from decimal import Decimal

from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm, mm
from reportlab.lib import colors

from app.models import Contrato, Cliente, Veiculo, Configuracao


class PDFContratoService:
    """Service for generating rental contract PDFs using ReportLab"""

    # Page dimensions
    PAGE_WIDTH, PAGE_HEIGHT = A4  # 210mm x 297mm
    MARGIN = 0.5 * cm

    # Colors
    COLOR_HEADER_BG = colors.HexColor("#3B5998")  # Blue
    COLOR_DARK_BG = colors.HexColor("#333333")    # Dark
    COLOR_LIGHT_BG = colors.HexColor("#F0F0F0")   # Light
    COLOR_TEXT = colors.HexColor("#000000")       # Black
    COLOR_TEXT_LIGHT = colors.HexColor("#FFFFFF") # White

    # Fonts
    FONT_REGULAR = "Helvetica"
    FONT_BOLD = "Helvetica-Bold"

    # Font sizes
    SIZE_TITLE = 18
    SIZE_SUBTITLE = 12
    SIZE_BLOCK_TITLE = 10
    SIZE_LABEL = 8
    SIZE_VALUE = 9
    SIZE_FOOTER = 7

    # Positions (in cm from top)
    COL1_X = 0.5 * cm
    COL2_X = 10.5 * cm
    COL_WIDTH = 9.5 * cm

    @staticmethod
    def generate_contrato_pdf(db, contrato_id):
        """
        Generate a rental contract PDF

        Args:
            db: Database session
            contrato_id: ID of the contract to generate

        Returns:
            BytesIO buffer containing the PDF
        """
        # Fetch contract and related data
        contrato = db.query(Contrato).filter(Contrato.id == contrato_id).first()
        if not contrato:
            raise ValueError(f"Contract {contrato_id} not found")

        cliente = contrato.cliente
        veiculo = contrato.veiculo

        # Create PDF buffer
        buffer = BytesIO()
        c = canvas.Canvas(buffer, pagesize=A4)

        service = PDFContratoService()

        # Generate pages
        service._draw_page1(c, contrato, cliente, veiculo)
        c.showPage()

        service._draw_page2(c, contrato)
        c.showPage()

        c.save()
        buffer.seek(0)
        return buffer

    # ==================== PAGE 1 ====================

    def _draw_page1(self, c, contrato, cliente, veiculo):
        """Draw page 1 (contract form front)"""
        y = self.PAGE_HEIGHT - self.MARGIN

        # Header
        y = self._draw_header(c, y)

        # Two-column layout
        # Left column starts at COL1_X, right column at COL2_X

        # Left column
        y_left = y - 1 * cm
        y_left = self._draw_locatario_block(c, y_left, cliente)
        y_left = self._draw_identificacao_block(c, y_left, cliente)
        y_left = self._draw_carro_block(c, y_left, veiculo)
        y_left = self._draw_vistoria_block(c, y_left, veiculo, contrato)

        # Right column
        y_right = y - 1 * cm
        y_right = self._draw_quilometragem_block(c, y_right, contrato)
        y_right = self._draw_valores_block(c, y_right, contrato)
        y_right = self._draw_cartoes_block(c, y_right, contrato)

        # Footer - use the lower of the two columns
        y_footer = min(y_left, y_right) - 0.5 * cm
        self._draw_page1_footer(c, y_footer)

    def _draw_header(self, c, y):
        """Draw page header"""
        # Title
        c.setFont(self.FONT_BOLD, self.SIZE_TITLE)
        c.drawCentredString(self.PAGE_WIDTH / 2, y - 0.8 * cm, "CONTRATO DE LOCAÇÃO")

        # Subtitle
        c.setFont(self.FONT_REGULAR, self.SIZE_LABEL)
        c.drawCentredString(
            self.PAGE_WIDTH / 2,
            y - 1.3 * cm,
            "CNPJ: 32.471.526/0001-53 | Tel: 84 99911-0504"
        )

        return y - 1.8 * cm

    def _draw_locatario_block(self, c, y, cliente):
        """Draw LOCATÁRIO block"""
        y = self._draw_block_title(c, y, "LOCATÁRIO - RENTER")

        field_data = [
            ("NOME DO CLIENTE", cliente.nome),
            ("ENDEREÇO", cliente.endereco_residencial),
            ("CIDADE", cliente.cidade_residencial),
            ("TELEFONE", cliente.telefone),
            ("E-MAIL", cliente.email),
        ]

        y = self._draw_two_column_fields(c, y, field_data, self.COL1_X, self.COL_WIDTH)

        return y

    def _draw_identificacao_block(self, c, y, cliente):
        """Draw IDENTIFICAÇÃO block"""
        y = self._draw_block_title(c, y, "IDENTIFICAÇÃO")

        field_data = [
            ("CPF/CNPJ", cliente.cpf),
            ("CNH", cliente.numero_cnh),
            ("CATEGORIA", cliente.categoria_cnh),
            ("VALIDADE", self._format_date(cliente.validade_cnh)),
            ("RG", cliente.rg),
        ]

        y = self._draw_two_column_fields(c, y, field_data, self.COL1_X, self.COL_WIDTH)

        return y

    def _draw_carro_block(self, c, y, veiculo):
        """Draw CARRO block"""
        y = self._draw_block_title(c, y, "CARRO / CAR")

        marca_modelo = f"{veiculo.marca} {veiculo.modelo}"

        # Two fields on same line
        self._draw_field_label(c, y, "MARCA/TIPO", self.COL1_X)
        self._draw_field_value(c, y, marca_modelo, self.COL1_X + 3.5 * cm)

        self._draw_field_label(c, y, "PLACA", self.COL2_X)
        self._draw_field_value(c, y, veiculo.placa, self.COL2_X + 1.5 * cm)

        y -= 0.6 * cm

        return y

    def _draw_vistoria_block(self, c, y, veiculo, contrato):
        """Draw VISTORIA VEÍCULO block"""
        y = self._draw_block_title(c, y, "VISTORIA VEÍCULO", dark=True)

        # Fuel level subtitle
        c.setFont(self.FONT_REGULAR, self.SIZE_LABEL)
        c.drawString(self.COL1_X + 0.2 * cm, y - 0.35 * cm, "COMBUSTÍVEL DE SAÍDA")
        y -= 0.6 * cm

        # Fuel level grid
        fuel_options = ["RES.", "1/8", "1/4", "3/8", "1/2", "5/8", "3/4", "7/8", "CHEIO"]
        y = self._draw_fuel_grid(c, y, fuel_options, contrato.combustivel_saida)

        y -= 0.3 * cm

        # Checklist items
        checklist_items = [
            ("MACACO", veiculo.checklist_item_1),
            ("ESTEPE", veiculo.checklist_item_2),
            ("FERRAM.", veiculo.checklist_item_3),
            ("TRIÂNGULO", veiculo.checklist_item_4),
            ("DOCUMENTO", veiculo.checklist_item_5),
            ("EXTINTOR", veiculo.checklist_item_6),
            ("CALOTAS", veiculo.checklist_item_7),
            ("TAPETES", veiculo.checklist_item_8),
            ("TOCA-FITAS", veiculo.checklist_item_9),
            ("CD PLAYER", veiculo.checklist_item_10),
        ]

        y = self._draw_checklist(c, y, checklist_items)

        # Observações
        c.setFont(self.FONT_REGULAR, self.SIZE_LABEL)
        c.drawString(self.COL1_X + 0.2 * cm, y - 0.35 * cm, "Observações:")
        y -= 0.35 * cm

        # Two blank lines
        line_height = 0.4 * cm
        c.line(self.COL1_X + 0.2 * cm, y, self.COL1_X + 9 * cm, y)
        y -= line_height
        c.line(self.COL1_X + 0.2 * cm, y, self.COL1_X + 9 * cm, y)
        y -= line_height

        # Assinatura
        c.setFont(self.FONT_REGULAR, self.SIZE_LABEL)
        c.drawString(self.COL1_X + 0.2 * cm, y - 0.35 * cm, "Assinatura do Cliente: _______________")
        y -= 0.8 * cm

        return y

    def _draw_quilometragem_block(self, c, y, contrato):
        """Draw QUILOMETRAGEM block"""
        y = self._draw_block_title(c, y, "QUILOMETRAGEM", x_pos=self.COL2_X)

        # Grid 2x4
        data = [
            ("DATA SAÍDA", self._format_date(contrato.data_inicio)),
            ("DATA ENTRADA", ""),
            ("HORA SAÍDA", contrato.hora_saida or ""),
            ("HORA ENTRADA", ""),
            ("KM SAÍDA", str(contrato.km_inicial)),
            ("KM ENTRADA", ""),
            ("KM LIVRES", str(contrato.km_livres) if contrato.km_livres else ""),
            ("KM TOTAL", ""),
        ]

        y = self._draw_grid_2x4(c, y, data, self.COL2_X)

        return y

    def _draw_valores_block(self, c, y, contrato):
        """Draw TABELA DE VALORES block"""
        y = self._draw_block_title(c, y, "TABELA DE VALORES", x_pos=self.COL2_X)

        # Calculate values
        qtd_diarias = contrato.qtd_diarias or 0
        valor_diaria = contrato.valor_diaria or Decimal(0)
        valor_hora_extra = contrato.valor_hora_extra or Decimal(0)
        valor_km_excedente = contrato.valor_km_excedente or Decimal(0)

        total_diaria = qtd_diarias * valor_diaria

        # Placeholder values for avarias and desconto
        avarias = Decimal(0)
        desconto = Decimal(0)

        total_final = total_diaria + avarias - desconto

        rows = [
            ("DIÁRIA", str(qtd_diarias), self._format_currency(valor_diaria), self._format_currency(total_diaria)),
            ("HORA EXTRA", "", self._format_currency(valor_hora_extra), ""),
            ("KM EXCEDENTE", "", self._format_currency(valor_km_excedente), ""),
            ("SUB-TOTAL", "-", "-", self._format_currency(total_diaria)),
            ("AVARIAS", "-", "-", ""),
            ("DESCONTO", "-", "-", ""),
            ("TOTAL R$", "-", "-", self._format_currency(total_final)),
        ]

        y = self._draw_valores_table(c, y, rows)

        return y

    def _draw_cartoes_block(self, c, y, contrato):
        """Draw CARTÕES DE CRÉDITO block"""
        c.setFont(self.FONT_BOLD, self.SIZE_BLOCK_TITLE)
        c.drawCentredString(self.PAGE_WIDTH / 2, y - 0.3 * cm, "CARTÕES DE CRÉDITO")
        y -= 0.6 * cm

        # Bandeiras
        bandeiras = ["AMERICAN EXPRESS", "SOLO", "HIPER", "HIPER CARD", "VISA", "DINER'S"]

        x_start = self.COL2_X
        x_spacing = 1.5 * cm

        for i, bandeira in enumerate(bandeiras):
            x = x_start + (i % 3) * x_spacing
            y_checkbox = y
            if i >= 3:
                y_checkbox -= 0.4 * cm

            # Checkbox
            is_checked = (contrato.cartao_bandeira and contrato.cartao_bandeira.upper() == bandeira.upper())
            self._draw_checkbox(c, x, y_checkbox, is_checked)

            # Label
            c.setFont(self.FONT_REGULAR, self.SIZE_LABEL)
            c.drawString(x + 0.25 * cm, y_checkbox - 0.05 * cm, bandeira)

        y -= 1 * cm

        # Card details
        field_data = [
            ("NOME", contrato.cartao_titular or ""),
            ("Nº", self._mask_card_number(contrato.cartao_numero)),
            ("CÓD.", contrato.cartao_codigo or ""),
            ("PRÉ/AUT. + VAL. + R$", self._format_currency(contrato.cartao_preautorizacao) if contrato.cartao_preautorizacao else ""),
        ]

        c.setFont(self.FONT_REGULAR, self.SIZE_LABEL)
        for label, value in field_data:
            c.drawString(self.COL2_X + 0.2 * cm, y - 0.3 * cm, f"{label}:")
            c.setFont(self.FONT_REGULAR, self.SIZE_VALUE)
            c.drawString(self.COL2_X + 2 * cm, y - 0.3 * cm, value)
            c.setFont(self.FONT_REGULAR, self.SIZE_LABEL)
            y -= 0.4 * cm

        return y

    def _draw_page1_footer(self, c, y):
        """Draw page 1 footer"""
        # Dark bar
        c.setFillColor(self.COLOR_DARK_BG)
        c.rect(0, y - 0.8 * cm, self.PAGE_WIDTH, 0.8 * cm, fill=1)

        # Text
        c.setFont(self.FONT_BOLD, self.SIZE_LABEL)
        c.setFillColor(self.COLOR_TEXT_LIGHT)
        c.drawCentredString(
            self.PAGE_WIDTH / 2,
            y - 0.5 * cm,
            "EVENTUAIS MULTAS SERÃO COBRADAS POSTERIORMENTE, DECLARO-ME CIENTE DO CONTEÚDO DESTE CONTRATO"
        )

        # Signature line
        c.setFillColor(self.COLOR_TEXT)
        c.setFont(self.FONT_REGULAR, self.SIZE_LABEL)
        c.drawString(self.COL1_X + 0.2 * cm, y - 1.3 * cm, "Assinatura do Cliente _______________")

    # ==================== PAGE 2 ====================

    def _draw_page2(self, c, contrato):
        """Draw page 2 (contract clauses)"""
        y = self.PAGE_HEIGHT - self.MARGIN

        # Header
        c.setFont(self.FONT_BOLD, self.SIZE_TITLE)
        c.drawCentredString(self.PAGE_WIDTH / 2, y - 0.8 * cm, "CONTRATO DE LOCAÇÃO")
        y -= 1.3 * cm

        # Clauses
        clauses = [
            "Caracterizado no anverso deste documento, nos quadros respectivos, O(A) LOCATÁRIO(A) recebe e aceita com pleno conhecimento o referido veículo e respectivos acessórios, conforme relação em anexo e se obriga a indenizar totalmente a LOCADORA no momento da entrega do veículo, pelos acessórios eventualmente faltante, ao preço vigente no mercado.",

            "O preço de aluguel do veículo locado será declarado no anverso deste contrato calculado com base na tabela de tarifas da LOCADORA da qual O LOCATÁRIO(A) tem pleno conhecimento.",

            "O prazo de vigência do presente contrato está indicado no quadro respectivo, devendo o(a) LOCATÁRIO(A) efetuar a devolução do veículo no dia, hora e local estipulado.",

            "Findo o prazo contratual deverá o(a) LOCATÁRIO(A) restituir o veículo a LOCADORA, no mesmo estado em que recebeu.",

            "A não devolução do veículo locado por parte do(a) LOCATÁRIO(A), implicará na prática de apropriação indébita.",

            "Todas e quaisquer despesas que se fizerem necessárias, para retomada e posse do veículo locado, serão por conta exclusiva do(a) LOCATÁRIO(A).",

            "A LOCADORA poderá propor contra o(a) LOCATÁRIO(A) as competentes ações cíveis que se fizerem necessárias.",

            "O veículo locado destinar-se-á único e exclusivo ao transporte de pessoas.",

            "O(A) LOCATÁRIO(A) se obriga não utilizar o veículo locado em outro Estado sem o consentimento por escrito da LOCADORA.",

            "São obrigações do(a) LOCATÁRIO(A): conduzir o veículo munido da documentação legal; não fazer uso para fins lucrativos; não sub-locar; obedecer as leis de trânsito.",

            "No caso de acidente ou desaparecimento do veículo locado, o(a) LOCATÁRIO(A) se obriga a comunicar imediatamente às AUTORIDADES competentes.",

            "Se durante o prazo de locação, ocorrer algum defeito no hodômetro, o(a) LOCATÁRIO(A) se compromete a avisar de imediato a LOCADORA.",

            "A LOCADORA não se responsabiliza pelos objetos pessoais esquecidos pelo(a) LOCATÁRIO(A) no interior do veículo.",

            "Este contrato se encerra: por haver expirado o prazo fixado; por acordo entre as partes; por rescisão; por perdas ou defeitos que inutilizem o veículo.",

            "Dar-se-á a rescisão deste contrato, na hipótese do não cumprimento das obrigações por parte do(a) LOCATÁRIO(A).",
        ]

        c.setFont(self.FONT_REGULAR, self.SIZE_LABEL)

        for idx, clause_text in enumerate(clauses, 1):
            # Clause number and text
            wrapped_text = self._wrap_text(clause_text, 100)

            c.drawString(self.MARGIN + 0.2 * cm, y - 0.3 * cm, f"{idx})")
            y -= 0.3 * cm

            # Draw wrapped text
            x_indent = self.MARGIN + 0.5 * cm
            for line in wrapped_text:
                c.drawString(x_indent, y, line)
                y -= 0.25 * cm

            y -= 0.15 * cm

            # Check if we need a new page
            if y < 3 * cm:
                c.showPage()
                y = self.PAGE_HEIGHT - self.MARGIN

        # Signature lines
        y -= 0.5 * cm

        sig_line_y = y
        sig_line_length = 3 * cm

        # Left column
        c.line(self.MARGIN + 0.2 * cm, sig_line_y, self.MARGIN + 0.2 * cm + sig_line_length, sig_line_y)
        c.setFont(self.FONT_REGULAR, self.SIZE_LABEL)
        c.drawString(self.MARGIN + 0.5 * cm, sig_line_y - 0.4 * cm, "LOCATÁRIO")

        # Right column
        c.line(self.PAGE_WIDTH / 2 + 0.5 * cm, sig_line_y, self.PAGE_WIDTH / 2 + 0.5 * cm + sig_line_length, sig_line_y)
        c.drawString(self.PAGE_WIDTH / 2 + 1 * cm, sig_line_y - 0.4 * cm, "LOCADORA")

        # Witness 1 line
        sig_line_y -= 1.2 * cm
        c.line(self.MARGIN + 0.2 * cm, sig_line_y, self.MARGIN + 0.2 * cm + sig_line_length, sig_line_y)
        c.drawString(self.MARGIN + 0.5 * cm, sig_line_y - 0.4 * cm, "TESTEMUNHA 1")

        # Witness 2 line
        c.line(self.PAGE_WIDTH / 2 + 0.5 * cm, sig_line_y, self.PAGE_WIDTH / 2 + 0.5 * cm + sig_line_length, sig_line_y)
        c.drawString(self.PAGE_WIDTH / 2 + 1 * cm, sig_line_y - 0.4 * cm, "TESTEMUNHA 2")

        # Footer with generation date/time
        footer_y = self.MARGIN
        c.setFont(self.FONT_REGULAR, self.SIZE_FOOTER)
        now = datetime.now()
        footer_text = f"Documento gerado em {now.strftime('%d/%m/%Y')} às {now.strftime('%H:%M')}"
        c.drawCentredString(self.PAGE_WIDTH / 2, footer_y, footer_text)

    # ==================== HELPER METHODS ====================

    def _draw_block_title(self, c, y, title, x_pos=None, dark=False):
        """Draw a block title with background"""
        if x_pos is None:
            x_pos = self.COL1_X

        bg_color = self.COLOR_DARK_BG if dark else self.COLOR_HEADER_BG
        text_color = self.COLOR_TEXT_LIGHT if dark else self.COLOR_TEXT_LIGHT

        # Background rectangle
        c.setFillColor(bg_color)
        c.rect(x_pos, y - 0.4 * cm, self.COL_WIDTH, 0.4 * cm, fill=1)

        # Title text
        c.setFont(self.FONT_BOLD, self.SIZE_BLOCK_TITLE)
        c.setFillColor(text_color)
        c.drawString(x_pos + 0.15 * cm, y - 0.32 * cm, title)

        c.setFillColor(self.COLOR_TEXT)

        return y - 0.6 * cm

    def _draw_field_label(self, c, y, label, x):
        """Draw a field label"""
        c.setFont(self.FONT_BOLD, self.SIZE_LABEL)
        c.drawString(x + 0.2 * cm, y - 0.3 * cm, label)

    def _draw_field_value(self, c, y, value, x):
        """Draw a field value with underline"""
        c.setFont(self.FONT_REGULAR, self.SIZE_VALUE)
        c.drawString(x, y - 0.3 * cm, str(value))

        # Underline
        c.line(x - 0.1 * cm, y - 0.38 * cm, x + 3 * cm, y - 0.38 * cm)

    def _draw_two_column_fields(self, c, y, field_data, x_pos, col_width):
        """Draw fields in two columns"""
        row_height = 0.5 * cm

        for i, (label, value) in enumerate(field_data):
            row = i // 2
            col = i % 2

            x = x_pos + col * (col_width / 2)
            y_pos = y - row * row_height

            self._draw_field_label(c, y_pos, label, x)
            self._draw_field_value(c, y_pos, value, x + 2.5 * cm)

        rows_needed = (len(field_data) + 1) // 2
        return y - rows_needed * row_height - 0.2 * cm

    def _draw_grid_2x4(self, c, y, data, x_pos):
        """Draw a 2x4 grid with labels and values"""
        col_width = self.COL_WIDTH / 2
        row_height = 0.5 * cm

        for i, (label, value) in enumerate(data):
            row = i // 2
            col = i % 2

            x = x_pos + col * col_width
            y_pos = y - row * row_height

            self._draw_field_label(c, y_pos, label, x)
            self._draw_field_value(c, y_pos, value, x + 2 * cm)

        return y - 4 * row_height - 0.2 * cm

    def _draw_fuel_grid(self, c, y, options, selected):
        """Draw fuel level grid"""
        cell_width = self.COL_WIDTH / len(options)
        row_height = 0.5 * cm

        # SAÍDA row
        c.setFont(self.FONT_REGULAR, self.SIZE_LABEL)
        c.drawString(self.COL1_X + 0.2 * cm, y - 0.3 * cm, "SAÍDA")

        for i, option in enumerate(options):
            x = self.COL1_X + 1.2 * cm + i * cell_width

            # Draw cell border
            c.rect(x, y - row_height, cell_width - 0.05 * cm, row_height)

            # Draw option text
            c.setFont(self.FONT_REGULAR, 6)
            c.drawCentredString(x + cell_width / 2 - 0.025 * cm, y - 0.32 * cm, option)

            # Check if this option is selected
            if selected and str(selected).lower() == option.lower():
                # Draw checkmark or filled cell
                c.setFillColor(self.COLOR_LIGHT_BG)
                c.rect(x, y - row_height, cell_width - 0.05 * cm, row_height, fill=1)
                c.setFillColor(self.COLOR_TEXT)
                c.setFont(self.FONT_BOLD, 8)
                c.drawCentredString(x + cell_width / 2 - 0.025 * cm, y - 0.32 * cm, "✓")

        y -= row_height

        # ENTRADA row
        c.setFont(self.FONT_REGULAR, self.SIZE_LABEL)
        c.drawString(self.COL1_X + 0.2 * cm, y - 0.3 * cm, "ENTRADA")

        for i, option in enumerate(options):
            x = self.COL1_X + 1.2 * cm + i * cell_width
            c.rect(x, y - row_height, cell_width - 0.05 * cm, row_height)

            c.setFont(self.FONT_REGULAR, 6)
            c.drawCentredString(x + cell_width / 2 - 0.025 * cm, y - 0.32 * cm, option)

        return y - row_height - 0.2 * cm

    def _draw_checklist(self, c, y, items):
        """Draw checklist with items in 2 columns"""
        col1_x = self.COL1_X + 0.2 * cm
        col2_x = self.COL1_X + 5 * cm
        row_height = 0.35 * cm

        for i, (label, is_checked) in enumerate(items):
            row = i // 2
            col = i % 2

            x = col1_x if col == 0 else col2_x
            y_pos = y - row * row_height

            # Checkbox
            self._draw_checkbox(c, x, y_pos, is_checked)

            # Label
            c.setFont(self.FONT_REGULAR, self.SIZE_LABEL)
            c.drawString(x + 0.25 * cm, y_pos - 0.05 * cm, label)

        rows_needed = (len(items) + 1) // 2
        return y - rows_needed * row_height - 0.2 * cm

    def _draw_checkbox(self, c, x, y, is_checked):
        """Draw a checkbox"""
        box_size = 0.15 * cm
        c.rect(x, y - box_size, box_size, box_size)

        if is_checked:
            c.setFont(self.FONT_BOLD, 8)
            c.drawString(x + 0.02 * cm, y - 0.12 * cm, "✓")

    def _draw_valores_table(self, c, y, rows):
        """Draw the values table"""
        col_widths = [3.5 * cm, 1.5 * cm, 2 * cm, 2 * cm]
        row_height = 0.4 * cm

        x_start = self.COL2_X

        # Header
        headers = ["DISCRIMINAÇÃO", "QUANT.", "PREÇO UNIT.", "PREÇO TOTAL"]

        for col_idx, header in enumerate(headers):
            x = x_start + sum(col_widths[:col_idx])
            c.setFont(self.FONT_BOLD, self.SIZE_LABEL)
            c.drawString(x + 0.1 * cm, y - 0.28 * cm, header)

        y -= row_height

        # Rows
        for row_idx, row_data in enumerate(rows):
            for col_idx, value in enumerate(row_data):
                x = x_start + sum(col_widths[:col_idx])
                c.setFont(self.FONT_REGULAR, self.SIZE_LABEL)
                c.drawString(x + 0.1 * cm, y - 0.28 * cm, str(value))

            y -= row_height

        return y - 0.2 * cm

    # ==================== FORMATTING METHODS ====================

    @staticmethod
    def _format_date(date_obj):
        """Format date as DD/MM/AAAA"""
        if not date_obj:
            return ""
        if hasattr(date_obj, 'strftime'):
            return date_obj.strftime("%d/%m/%Y")
        return str(date_obj)

    @staticmethod
    def _format_currency(value):
        """Format currency as R$ X.XXX,XX"""
        if not value:
            return ""

        if isinstance(value, Decimal):
            value = float(value)

        return f"R$ {value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")

    @staticmethod
    def _mask_card_number(card_number):
        """Mask card number to show only last 4 digits"""
        if not card_number:
            return ""

        card_str = str(card_number)
        if len(card_str) >= 4:
            return "**** **** **** " + card_str[-4:]
        return card_str

    @staticmethod
    def _wrap_text(text, max_width_chars=100):
        """Wrap text to specified width in characters"""
        words = text.split()
        lines = []
        current_line = []

        for word in words:
            if len(" ".join(current_line + [word])) <= max_width_chars:
                current_line.append(word)
            else:
                if current_line:
                    lines.append(" ".join(current_line))
                current_line = [word]

        if current_line:
            lines.append(" ".join(current_line))

        return lines
