#!/usr/bin/env python3
"""Gera PDF da arquitetura de e-mails de recuperação — App Spy / SafelinkSpy."""

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm, cm
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
    KeepTogether,
    HRFlowable,
    Flowable,
    ListFlowable,
    ListItem,
)

OUT = Path(__file__).resolve().parents[1] / "docs" / "architecture" / "email-recovery-architecture.pdf"

# ── Palette ──────────────────────────────────────────────────────────────────
NAVY = colors.HexColor("#0f172a")
SLATE = colors.HexColor("#334155")
MUTED = colors.HexColor("#64748b")
LIGHT = colors.HexColor("#f1f5f9")
BORDER = colors.HexColor("#cbd5e1")
WHITE = colors.white

BLUE = colors.HexColor("#2563eb")
BLUE_BG = colors.HexColor("#dbeafe")
GREEN = colors.HexColor("#059669")
GREEN_BG = colors.HexColor("#d1fae5")
AMBER = colors.HexColor("#d97706")
AMBER_BG = colors.HexColor("#fef3c7")
RED = colors.HexColor("#dc2626")
RED_BG = colors.HexColor("#fee2e2")
PURPLE = colors.HexColor("#7c3aed")
PURPLE_BG = colors.HexColor("#ede9fe")
TEAL = colors.HexColor("#0d9488")
TEAL_BG = colors.HexColor("#ccfbf1")


def styles():
    base = getSampleStyleSheet()
    s = {
        "cover_title": ParagraphStyle(
            "cover_title",
            parent=base["Title"],
            fontName="Helvetica-Bold",
            fontSize=26,
            leading=32,
            textColor=NAVY,
            alignment=TA_CENTER,
            spaceAfter=8,
        ),
        "cover_sub": ParagraphStyle(
            "cover_sub",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=12,
            leading=16,
            textColor=MUTED,
            alignment=TA_CENTER,
            spaceAfter=6,
        ),
        "h1": ParagraphStyle(
            "h1",
            parent=base["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=16,
            leading=20,
            textColor=NAVY,
            spaceBefore=4,
            spaceAfter=10,
        ),
        "h2": ParagraphStyle(
            "h2",
            parent=base["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=12.5,
            leading=16,
            textColor=NAVY,
            spaceBefore=12,
            spaceAfter=6,
        ),
        "h3": ParagraphStyle(
            "h3",
            parent=base["Heading3"],
            fontName="Helvetica-Bold",
            fontSize=10.5,
            leading=13,
            textColor=SLATE,
            spaceBefore=8,
            spaceAfter=4,
        ),
        "body": ParagraphStyle(
            "body",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=9.5,
            leading=13.5,
            textColor=SLATE,
            alignment=TA_JUSTIFY,
            spaceAfter=6,
        ),
        "body_left": ParagraphStyle(
            "body_left",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=9.5,
            leading=13.5,
            textColor=SLATE,
            alignment=TA_LEFT,
            spaceAfter=4,
        ),
        "small": ParagraphStyle(
            "small",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=8,
            leading=11,
            textColor=MUTED,
        ),
        "cell": ParagraphStyle(
            "cell",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=8,
            leading=10.5,
            textColor=SLATE,
        ),
        "cell_b": ParagraphStyle(
            "cell_b",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=8,
            leading=10.5,
            textColor=NAVY,
        ),
        "th": ParagraphStyle(
            "th",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=8,
            leading=10.5,
            textColor=WHITE,
        ),
        "badge": ParagraphStyle(
            "badge",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=8.5,
            leading=11,
            textColor=NAVY,
            alignment=TA_CENTER,
        ),
        "mono": ParagraphStyle(
            "mono",
            parent=base["Normal"],
            fontName="Courier",
            fontSize=7.5,
            leading=10,
            textColor=SLATE,
        ),
        "caption": ParagraphStyle(
            "caption",
            parent=base["Normal"],
            fontName="Helvetica-Oblique",
            fontSize=8,
            leading=10,
            textColor=MUTED,
            alignment=TA_CENTER,
            spaceBefore=4,
            spaceAfter=10,
        ),
        "footer": ParagraphStyle(
            "footer",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=7.5,
            leading=9,
            textColor=MUTED,
            alignment=TA_CENTER,
        ),
    }
    return s


class BoxFlow(Flowable):
    """Rounded colored callout box with title + body paragraphs."""

    def __init__(self, title, lines, width, bg, accent, title_color=None):
        super().__init__()
        self.title = title
        self.lines = lines
        self.box_width = width
        self.bg = bg
        self.accent = accent
        self.title_color = title_color or accent
        self._h = 0

    def wrap(self, availWidth, availHeight):
        # rough height estimate
        line_h = 11
        self._h = 22 + len(self.lines) * line_h + 10
        return self.box_width, self._h

    def draw(self):
        c = self.canv
        w, h = self.box_width, self._h
        c.setFillColor(self.bg)
        c.setStrokeColor(self.accent)
        c.setLineWidth(1.2)
        c.roundRect(0, 0, w, h, 5, fill=1, stroke=1)
        # left accent bar
        c.setFillColor(self.accent)
        c.rect(0, 0, 4, h, fill=1, stroke=0)
        c.setFillColor(self.title_color)
        c.setFont("Helvetica-Bold", 9)
        c.drawString(12, h - 14, self.title)
        c.setFillColor(SLATE)
        c.setFont("Helvetica", 8)
        y = h - 28
        for line in self.lines:
            c.drawString(12, y, line)
            y -= 11


class ArchitectureDiagram(Flowable):
    """Main funnel → sequences architecture diagram."""

    def __init__(self, width):
        super().__init__()
        self.box_width = width
        self._h = 195

    def wrap(self, availWidth, availHeight):
        return self.box_width, self._h

    def draw(self):
        c = self.canv
        w = self.box_width
        h = self._h

        # background
        c.setFillColor(LIGHT)
        c.setStrokeColor(BORDER)
        c.roundRect(0, 0, w, h, 6, fill=1, stroke=1)

        def box(x, y, bw, bh, fill, stroke, text, fs=7.5, bold=True):
            c.setFillColor(fill)
            c.setStrokeColor(stroke)
            c.setLineWidth(1)
            c.roundRect(x, y, bw, bh, 4, fill=1, stroke=1)
            c.setFillColor(NAVY if fill != NAVY else WHITE)
            c.setFont("Helvetica-Bold" if bold else "Helvetica", fs)
            # multi-line center
            lines = text.split("\n")
            total = len(lines) * (fs + 2)
            ty = y + bh / 2 + total / 2 - fs
            for line in lines:
                c.drawCentredString(x + bw / 2, ty, line)
                ty -= fs + 2

        def arrow(x1, y1, x2, y2, color=MUTED):
            c.setStrokeColor(color)
            c.setFillColor(color)
            c.setLineWidth(1.2)
            c.line(x1, y1, x2, y2)
            # simple arrow head
            import math
            ang = math.atan2(y2 - y1, x2 - x1)
            size = 5
            c.line(x2, y2, x2 - size * math.cos(ang - 0.4), y2 - size * math.sin(ang - 0.4))
            c.line(x2, y2, x2 - size * math.cos(ang + 0.4), y2 - size * math.sin(ang + 0.4))

        # Top: Front funnel
        box(w / 2 - 70, h - 38, 140, 28, NAVY, NAVY, "FUNIL FRONT (HTML)", fs=8.5)
        arrow(w / 2, h - 38, w / 2, h - 52)

        # Three trigger boxes
        tw = (w - 40) / 3
        gap = 10
        x0 = 12
        y_trig = h - 95
        box(x0, y_trig, tw, 36, BLUE_BG, BLUE, "step5\nnome + e-mail", fs=7.5)
        box(x0 + tw + gap, y_trig, tw, 36, AMBER_BG, AMBER, "step6 / backredirect\nclicou checkout", fs=7.5)
        box(x0 + 2 * (tw + gap), y_trig, tw, 36, RED_BG, RED, "PerfectPay\ncancel / recusado", fs=7.5)

        # arrows down
        for i in range(3):
            cx = x0 + i * (tw + gap) + tw / 2
            arrow(cx, y_trig, cx, y_trig - 14)

        # Sequence boxes
        y_seq = y_trig - 58
        box(x0, y_seq, tw, 40, BLUE_BG, BLUE, "RECOVERY\n4 e-mails · $39→$29\n~3,5 dias", fs=7)
        box(x0 + tw + gap, y_seq, tw, 40, AMBER_BG, AMBER, "CART ABANDONED\n7 e-mails · $29→$19,50\n~8 dias", fs=7)
        box(x0 + 2 * (tw + gap), y_seq, tw, 40, RED_BG, RED, "CANCEL / CARD\n7 e-mails · $39→$29\n~8 dias", fs=7)

        # Purchase stop bar
        y_stop = 12
        box(12, y_stop, w - 24, 26, GREEN_BG, GREEN, "COMPROU → Mark Purchased (STOP todas as sequências) + Welcome 5 e-mails", fs=7.5)


class SequenceTimeline(Flowable):
    """Horizontal-ish timeline of emails as stacked steps."""

    def __init__(self, width, steps, accent, accent_bg):
        """
        steps: list of dicts {label, wait, price, note}
        """
        super().__init__()
        self.box_width = width
        self.steps = steps
        self.accent = accent
        self.accent_bg = accent_bg
        self.row_h = 22
        self._h = 16 + len(steps) * self.row_h + 8

    def wrap(self, availWidth, availHeight):
        return self.box_width, self._h

    def draw(self):
        c = self.canv
        w = self.box_width
        h = self._h
        c.setFillColor(colors.HexColor("#fafafa"))
        c.setStrokeColor(BORDER)
        c.roundRect(0, 0, w, h, 4, fill=1, stroke=1)

        y = h - 14
        for i, st in enumerate(self.steps):
            # circle
            cy = y - 4
            c.setFillColor(self.accent)
            c.circle(14, cy, 6, fill=1, stroke=0)
            c.setFillColor(WHITE)
            c.setFont("Helvetica-Bold", 6.5)
            c.drawCentredString(14, cy - 2.2, str(i + 1))

            # connector line
            if i < len(self.steps) - 1:
                c.setStrokeColor(self.accent)
                c.setLineWidth(1.5)
                c.line(14, cy - 6, 14, cy - self.row_h + 6)

            # text
            c.setFillColor(NAVY)
            c.setFont("Helvetica-Bold", 8)
            c.drawString(28, cy - 1, st["label"])

            c.setFillColor(MUTED)
            c.setFont("Helvetica", 7.5)
            c.drawString(78, cy - 1, st["wait"])

            # price pill
            price = st["price"]
            pw = c.stringWidth(price, "Helvetica-Bold", 7.5) + 10
            px = w - 12 - pw
            c.setFillColor(self.accent_bg)
            c.setStrokeColor(self.accent)
            c.setLineWidth(0.6)
            c.roundRect(px, cy - 6, pw, 13, 3, fill=1, stroke=1)
            c.setFillColor(self.accent)
            c.setFont("Helvetica-Bold", 7.5)
            c.drawCentredString(px + pw / 2, cy - 2.5, price)

            # note
            if st.get("note"):
                c.setFillColor(MUTED)
                c.setFont("Helvetica", 7)
                c.drawString(160, cy - 1, st["note"])

            y -= self.row_h


class StackDiagram(Flowable):
    """Vertical stack: Front → API → n8n → Sheets/Resend."""

    def __init__(self, width):
        super().__init__()
        self.box_width = width
        self._h = 175

    def wrap(self, availWidth, availHeight):
        return self.box_width, self._h

    def draw(self):
        c = self.canv
        w = self.box_width
        h = self._h

        layers = [
            (NAVY, WHITE, "Front (HTML funil): step5 · step6 · backredirect"),
            (BLUE, WHITE, "Next.js API: /api/leads/capture · /api/leads/cart-abandon · /api/webhooks/perfectpay"),
            (PURPLE, WHITE, "lib/analytics/n8nNotify.ts  (best-effort, não quebra o funil)"),
            (TEAL, WHITE, "n8n Cloud webhooks: lead · cart-abandoned · order-cancelled · mark-purchased · welcome"),
            (AMBER, NAVY, "Google Sheets (Leads | Cart Abandoned | Cancel Leads)  +  Resend (App Spy <noreply@…>)"),
        ]

        layer_h = 26
        gap = 6
        total = len(layers) * layer_h + (len(layers) - 1) * gap
        y = h - (h - total) / 2 - layer_h

        for i, (bg, fg, text) in enumerate(layers):
            c.setFillColor(bg)
            c.setStrokeColor(bg)
            c.roundRect(10, y, w - 20, layer_h, 5, fill=1, stroke=0)
            c.setFillColor(fg)
            c.setFont("Helvetica-Bold", 8)
            c.drawCentredString(w / 2, y + 9, text)
            if i < len(layers) - 1:
                c.setStrokeColor(MUTED)
                c.setLineWidth(1)
                cx = w / 2
                c.line(cx, y, cx, y - gap)
            y -= layer_h + gap


def make_table(headers, rows, col_widths, st):
    data = [[Paragraph(h, st["th"]) for h in headers]]
    for row in rows:
        data.append(
            [
                Paragraph(cell, st["cell_b"] if i == 0 else st["cell"])
                for i, cell in enumerate(row)
            ]
        )
    t = Table(data, colWidths=col_widths, repeatRows=1)
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), NAVY),
                ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
                ("BACKGROUND", (0, 1), (-1, -1), WHITE),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, LIGHT]),
                ("GRID", (0, 0), (-1, -1), 0.4, BORDER),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    return t


def hr():
    return HRFlowable(width="100%", thickness=0.6, color=BORDER, spaceBefore=4, spaceAfter=8)


def footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(BORDER)
    canvas.setLineWidth(0.5)
    canvas.line(18 * mm, 12 * mm, A4[0] - 18 * mm, 12 * mm)
    canvas.setFont("Helvetica", 7.5)
    canvas.setFillColor(MUTED)
    canvas.drawString(18 * mm, 7 * mm, "App Spy / SafelinkSpy — Arquitetura de e-mails de recuperação")
    canvas.drawRightString(A4[0] - 18 * mm, 7 * mm, f"Página {doc.page}")
    canvas.restoreState()


def build():
    st = styles()
    page_w = A4[0]
    margin = 16 * mm
    usable = page_w - 2 * margin

    doc = SimpleDocTemplate(
        str(OUT),
        pagesize=A4,
        leftMargin=margin,
        rightMargin=margin,
        topMargin=14 * mm,
        bottomMargin=16 * mm,
        title="Arquitetura de E-mails de Recuperação — App Spy",
        author="SafelinkSpy",
        subject="Recovery · Cart Abandoned · Cancel / Card Refused",
    )

    story = []

    # ── COVER ────────────────────────────────────────────────────────────────
    story.append(Spacer(1, 28 * mm))
    story.append(Paragraph("Arquitetura de E-mails<br/>de Recuperação", st["cover_title"]))
    story.append(Spacer(1, 4 * mm))
    story.append(Paragraph("App Spy / SafelinkSpy", st["cover_sub"]))
    story.append(Paragraph("Recovery · Cart Abandoned · Cancel / Card Refused · Welcome", st["cover_sub"]))
    story.append(Spacer(1, 6 * mm))
    story.append(hr())
    story.append(
        Paragraph(
            "Documento resumido: quem entra em cada sequência, quantos e-mails, timing, "
            "preços, triggers do funil, planilhas e regra de parada após compra.",
            st["body"],
        )
    )
    story.append(Spacer(1, 4 * mm))

    # overview boxes
    half = (usable - 6 * mm) / 2
    overview_data = [
        [
            BoxFlow(
                "3 sequências de recuperação",
                [
                    "1. Meio do funil (step5) — 4 e-mails",
                    "2. Checkout abandonado — 7 e-mails",
                    "3. Cartão recusado / cancel — 7 e-mails",
                ],
                half,
                BLUE_BG,
                BLUE,
            ),
            BoxFlow(
                "1 sequência pós-compra",
                [
                    "Welcome — 5 e-mails (só compradores)",
                    "Mark Purchased para TODAS as abas",
                    "Para recovery / cart / cancel na hora",
                ],
                half,
                GREEN_BG,
                GREEN,
            ),
        ]
    ]
    ot = Table(overview_data, colWidths=[half, half])
    ot.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 3)]))
    story.append(ot)
    story.append(Spacer(1, 6 * mm))

    story.append(Paragraph("1. Visão geral", st["h1"]))
    story.append(hr())
    story.append(
        Paragraph(
            "São <b>3 sequências de recuperação</b> (quem não comprou) + <b>1 de welcome</b> (quem comprou). "
            "Tudo roda em <b>n8n Cloud + Resend + Google Sheets</b>. Se a pessoa compra, o webhook PerfectPay "
            "marca <b>purchased=true</b> e <b>para qualquer sequência</b> em andamento.",
            st["body"],
        )
    )

    story.append(Paragraph("Tabela resumo", st["h2"]))
    story.append(
        make_table(
            ["Sequência", "Quem entra", "# e-mails", "Duração", "Preços"],
            [
                ["Recovery (funil)", "Lead no meio do funil (step5)", "4", "~3,5 dias", "$39 → $29"],
                ["Cart Abandoned", "Clicou checkout e sumiu", "7", "~8 dias", "$29 → $19,50"],
                ["Cancel / card refused", "Tentou pagar e foi recusado/cancelado", "7", "~8 dias", "$39 → $29"],
                ["Welcome (bônus)", "Comprou de fato", "5", "~3 dias", "Onboarding (sem preço)"],
            ],
            [usable * 0.22, usable * 0.32, usable * 0.12, usable * 0.14, usable * 0.20],
            st,
        )
    )

    story.append(PageBreak())

    # ── DIAGRAM ──────────────────────────────────────────────────────────────
    story.append(Paragraph("2. Diagrama da arquitetura", st["h1"]))
    story.append(hr())
    story.append(Paragraph("Do funil front até as sequências e a parada por compra:", st["body_left"]))
    story.append(Spacer(1, 3 * mm))
    story.append(ArchitectureDiagram(usable))
    story.append(Paragraph("Figura 1 — Entradas do funil e destinos de e-mail", st["caption"]))

    story.append(Paragraph("Stack técnica", st["h2"]))
    story.append(StackDiagram(usable))
    story.append(Paragraph("Figura 2 — Camadas: Front → API → n8n → Sheets / Resend", st["caption"]))

    story.append(Paragraph("Variáveis de ambiente (Vercel)", st["h2"]))
    story.append(
        make_table(
            ["Env", "Função"],
            [
                ["N8N_LEAD_WEBHOOK_URL", "Recovery 4 e-mails (meio do funil)"],
                ["N8N_CART_WEBHOOK_URL", "Cart Abandoned 7 e-mails"],
                ["N8N_CANCEL_WEBHOOK_URL", "Cancel / card refused 7 e-mails"],
                ["N8N_PURCHASE_WEBHOOK_URL", "Mark Purchased (STOP em todas as abas)"],
                ["N8N_WELCOME_WEBHOOK_URL", "Welcome 5 e-mails (compradores)"],
                ["N8N_WEBHOOK_SECRET", "Header x-webhook-secret (opcional)"],
            ],
            [usable * 0.40, usable * 0.60],
            st,
        )
    )

    story.append(PageBreak())

    # ── RECOVERY ─────────────────────────────────────────────────────────────
    story.append(Paragraph("3. Meio do funil — Recovery (4 e-mails)", st["h1"]))
    story.append(hr())
    story.append(
        Paragraph(
            "<b>Quem:</b> pessoa preenche nome + e-mail no <b>step5</b> e ainda não comprou. "
            "É o “meio do funil” — capturou lead, mas pode não chegar no checkout.",
            st["body"],
        )
    )
    story.append(Paragraph("<b>Trigger</b>", st["h3"]))
    story.append(
        Paragraph(
            "<font face='Courier' size='8'>step5.html → POST /api/leads/capture → N8N_LEAD_WEBHOOK_URL<br/>"
            "→ n8n: Append aba “Leads” → Wait → Get row (purchased?) → Resend</font>",
            st["body_left"],
        )
    )
    story.append(Paragraph("Timeline", st["h2"]))
    story.append(
        SequenceTimeline(
            usable,
            [
                {"label": "E1", "wait": "30 min", "price": "$39", "note": "Relatório pronto — unlock"},
                {"label": "E2", "wait": "+24 h", "price": "$39", "note": "Mensagens deletadas ainda locked"},
                {"label": "E3", "wait": "+48 h", "price": "$39", "note": "75% OFF ainda aberto"},
                {"label": "E4", "wait": "+72 h", "price": "$29", "note": "Last email — $10 off"},
            ],
            BLUE,
            BLUE_BG,
        )
    )
    story.append(Paragraph("Figura 3 — Sequência Recovery (total ≈ 3,5 dias)", st["caption"]))

    story.append(
        make_table(
            ["#", "Espera", "Preço", "Checkout / código", "Ideia do e-mail"],
            [
                ["E1", "30 min", "$39", "PPU38CQF005", "Relatório pronto, desbloqueia acesso"],
                ["E2", "+24 h", "$39", "PPU38CQF005", "Mensagens deletadas ainda bloqueadas"],
                ["E3", "+48 h", "$39", "PPU38CQF005", "75% OFF ainda aberto"],
                ["E4", "+72 h", "$29", "PPU38CQF019", "Last email — checkout mais barato"],
            ],
            [usable * 0.08, usable * 0.12, usable * 0.10, usable * 0.22, usable * 0.48],
            st,
        )
    )
    story.append(Spacer(1, 3 * mm))
    story.append(
        Paragraph(
            "<b>Planilha:</b> aba <b>Leads</b> · "
            "<b>From:</b> App Spy &lt;noreply@mysafelinkspy.com&gt; · "
            "<b>UTM:</b> utm_source=email &amp; utm_medium=recovery &amp; utm_campaign=e1|e2|e3|e4",
            st["small"],
        )
    )

    story.append(PageBreak())

    # ── CART ─────────────────────────────────────────────────────────────────
    story.append(Paragraph("4. Checkout abandonado — Cart (7 e-mails)", st["h1"]))
    story.append(hr())
    story.append(
        Paragraph(
            "<b>Quem:</b> clicou no botão de checkout (começou a compra) e <b>não pagou</b>. "
            "Não dispara só por ver a página — só no clique de “pagar / unlock”.",
            st["body"],
        )
    )
    story.append(Paragraph("<b>Trigger</b>", st["h3"]))
    story.append(
        Paragraph(
            "<font face='Courier' size='8'>step6.html (goCheckout $39)  ou  backredirect.html (claim $29)<br/>"
            "→ POST /api/leads/cart-abandon → N8N_CART_WEBHOOK_URL → n8n aba “Cart Abandoned”</font>",
            st["body_left"],
        )
    )
    story.append(Paragraph("Timeline", st["h2"]))
    story.append(
        SequenceTimeline(
            usable,
            [
                {"label": "A1", "wait": "15 min", "price": "$29", "note": "Gift / oferta especial"},
                {"label": "A2", "wait": "+24 h", "price": "$29", "note": "Mensagens ainda locked"},
                {"label": "A3", "wait": "+24 h", "price": "$29", "note": "Não deixe a verdade locked"},
                {"label": "A4", "wait": "+24 h", "price": "$19.50", "note": "Melhor oferta (drop)"},
                {"label": "A5", "wait": "+24 h", "price": "$19.50", "note": "Oferta ainda aberta"},
                {"label": "A6", "wait": "+48 h", "price": "$19.50", "note": "Last chance"},
                {"label": "A7", "wait": "+48 h", "price": "$19.50", "note": "Final notice"},
            ],
            AMBER,
            AMBER_BG,
        )
    )
    story.append(Paragraph("Figura 4 — Sequência Cart Abandoned (total ≈ 8 dias)", st["caption"]))

    story.append(
        make_table(
            ["#", "Espera", "Preço", "Checkout / código", "Ideia"],
            [
                ["A1", "15 min", "$29", "PPU38CQEKTG", "Gift from us to you"],
                ["A2", "+24 h", "$29", "PPU38CQEKTG", "Deleted messages still locked"],
                ["A3", "+24 h", "$29", "PPU38CQEKTG", "Don't leave the truth locked"],
                ["A4", "+24 h", "$19.50", "PPU38CQEO73", "Best offer — drop de preço"],
                ["A5", "+24 h", "$19.50", "PPU38CQEO73", "Oferta ainda aberta"],
                ["A6", "+48 h", "$19.50", "PPU38CQEO73", "Last chance"],
                ["A7", "+48 h", "$19.50", "PPU38CQEO73", "Final notice"],
            ],
            [usable * 0.08, usable * 0.12, usable * 0.12, usable * 0.22, usable * 0.46],
            st,
        )
    )
    story.append(Spacer(1, 3 * mm))
    story.append(
        Paragraph(
            "<b>Planilha:</b> aba <b>Cart Abandoned</b> (separada de Leads e Cancel Leads) · "
            "Webhook n8n: <font face='Courier'>/webhook/cart-abandoned</font>",
            st["small"],
        )
    )

    story.append(PageBreak())

    # ── CANCEL ───────────────────────────────────────────────────────────────
    story.append(Paragraph("5. Venda cancelada / cartão recusado — Cancel (7 e-mails)", st["h1"]))
    story.append(hr())
    story.append(
        Paragraph(
            "<b>Quem:</b> tentou comprar no PerfectPay e o pagamento <b>falhou / cancelou / recusou</b>. "
            "Fluxo: tentou comprar → rejeitou → e-mails com checkout (primeiro $39, depois $29 mais barato).",
            st["body"],
        )
    )
    story.append(Paragraph("<b>Trigger</b>", st["h3"]))
    story.append(
        Paragraph(
            "<font face='Courier' size='8'>PerfectPay postback → POST /api/webhooks/perfectpay<br/>"
            "→ se cancelado / recusado / rejected → notifyN8nCancel → N8N_CANCEL_WEBHOOK_URL<br/>"
            "→ n8n: aba “Cancel Leads” · path webhook: order-cancelled</font>",
            st["body_left"],
        )
    )
    story.append(Paragraph("Timeline", st["h2"]))
    story.append(
        SequenceTimeline(
            usable,
            [
                {"label": "C1", "wait": "15 min", "price": "$39", "note": "Problema com o pedido"},
                {"label": "C2", "wait": "+24 h", "price": "$39", "note": "Resultados ainda esperando"},
                {"label": "C3", "wait": "+24 h", "price": "$39", "note": "Relatório ainda locked"},
                {"label": "C4", "wait": "+24 h", "price": "$29", "note": "Oferta especial 25%"},
                {"label": "C5", "wait": "+24 h", "price": "$29", "note": "Desconto ainda disponível"},
                {"label": "C6", "wait": "+48 h", "price": "$29", "note": "Não perca o acesso"},
                {"label": "C7", "wait": "+48 h", "price": "$29", "note": "Final notice"},
            ],
            RED,
            RED_BG,
        )
    )
    story.append(Paragraph("Figura 5 — Sequência Cancel / Card Refused (total ≈ 8 dias)", st["caption"]))

    story.append(
        make_table(
            ["#", "Espera", "Preço", "Checkout / código", "Ideia"],
            [
                ["C1", "15 min", "$39", "PPU38CQEHD1", "We noticed an issue with your order"],
                ["C2", "+24 h", "$39", "PPU38CQEHD1", "Results still waiting"],
                ["C3", "+24 h", "$39", "PPU38CQEHD1", "Report still locked"],
                ["C4", "+24 h", "$29", "PPU38CQEKTG", "Special offer — drop de preço"],
                ["C5", "+24 h", "$29", "PPU38CQEKTG", "25% discount still available"],
                ["C6", "+48 h", "$29", "PPU38CQEKTG", "Don't lose access"],
                ["C7", "+48 h", "$29", "PPU38CQEKTG", "Final notice: incomplete order"],
            ],
            [usable * 0.08, usable * 0.12, usable * 0.10, usable * 0.22, usable * 0.48],
            st,
        )
    )
    story.append(Spacer(1, 3 * mm))
    story.append(
        Paragraph(
            "<b>Planilha:</b> aba <b>Cancel Leads</b> (separada do funil) · "
            "Progressão: C1–C3 ($39) problema de pagamento → C4–C7 ($29) oferta / urgência.",
            st["small"],
        )
    )

    story.append(PageBreak())

    # ── MENTAL FLOW ──────────────────────────────────────────────────────────
    story.append(Paragraph("6. Fluxo mental da jornada do lead", st["h1"]))
    story.append(hr())
    story.append(
        Paragraph(
            "O lead <b>não</b> recebe um único funil linear de 18 e-mails. Cada evento abre a "
            "<b>sua</b> sequência. Compra em qualquer momento interrompe todas.",
            st["body"],
        )
    )

    story.append(
        BoxFlow(
            "Jornada típica",
            [
                "1) Preenche e-mail no step5          → Recovery E1…E4  (30min → ~3,5 dias, $39→$29)",
                "2) Clica checkout e some             → Cart A1…A7      (15min → ~8 dias, $29→$19,50)",
                "3) Tenta pagar → REJEITADO           → Cancel C1…C7    (15min → ~8 dias, $39→$29)",
                "4) Ainda não comprou                 → e-mails seguem até o último ou até purchased",
                "5) PAGOU                             → Mark Purchased (STOP) + Welcome W1…W5",
            ],
            usable,
            LIGHT,
            NAVY,
            title_color=NAVY,
        )
    )
    story.append(Spacer(1, 4 * mm))

    story.append(Paragraph("Quantos e-mails cada lead recebe?", st["h2"]))
    story.append(
        make_table(
            ["Situação", "Máximo que recebe"],
            [
                ["Só capturou e-mail no step5 e sumiu", "até 4 (E1–E4)"],
                ["Clicou checkout e abandonou", "até 7 (A1–A7)"],
                ["Cartão recusado / cancel", "até 7 (C1–C7)"],
                ["Comprou no meio de qualquer sequência", "para na hora + até 5 welcome"],
                [
                    "Passou por mais de um evento (ex.: step5 + checkout + rejeitou)",
                    "pode entrar em mais de uma sequência (abas separadas); compra zera todas",
                ],
            ],
            [usable * 0.48, usable * 0.52],
            st,
        )
    )

    story.append(Paragraph("Regra de parada (antes de cada envio)", st["h2"]))
    story.append(
        Paragraph(
            "Antes de cada e-mail o n8n faz: <b>Get row → se purchased ≠ true → envia</b>. "
            "Se já comprou (webhook PerfectPay → Mark Purchased atualiza as abas "
            "<b>Leads</b>, <b>Cart Abandoned</b> e <b>Cancel Leads</b>), o próximo e-mail "
            "da sequência <b>não é enviado</b>.",
            st["body"],
        )
    )

    story.append(Paragraph("Welcome (pós-compra)", st["h2"]))
    story.append(
        make_table(
            ["#", "Quando", "Subject (resumo)"],
            [
                ["W1", "Imediato", "Welcome — your access is ready"],
                ["W2", "+3 horas", "Quick start: open your portal"],
                ["W3", "+1 dia", "Your report is waiting"],
                ["W4", "+2 dias", "Tip: check your dashboard alerts"],
                ["W5", "+3 dias", "You're all set"],
            ],
            [usable * 0.10, usable * 0.18, usable * 0.72],
            st,
        )
    )
    story.append(Spacer(1, 2 * mm))
    story.append(
        Paragraph(
            "Portal: https://en.safelinkspy.com · Reply-To: support@mysafelinkspy.com",
            st["small"],
        )
    )

    story.append(PageBreak())

    # ── SHEETS + FILES ───────────────────────────────────────────────────────
    story.append(Paragraph("7. Planilhas e arquivos do projeto", st["h1"]))
    story.append(hr())

    story.append(Paragraph("Google Sheet — App Spy · Leads Recovery", st["h2"]))
    story.append(
        make_table(
            ["Aba", "Workflow", "Uso"],
            [
                ["Leads", "Recovery 4 e-mails", "Lead abandonou no meio do funil (step5)"],
                ["Cart Abandoned", "Cart 7 e-mails", "Clicou checkout e não pagou"],
                ["Cancel Leads", "Cancel 7 e-mails", "Pagamento recusado / cancelado"],
            ],
            [usable * 0.22, usable * 0.28, usable * 0.50],
            st,
        )
    )
    story.append(Spacer(1, 2 * mm))
    story.append(
        Paragraph(
            "Colunas padrão: email · name · phone · purchased · visitor_id · "
            "utm_source · utm_medium · utm_campaign · created_at · status",
            st["small"],
        )
    )

    story.append(Paragraph("Arquivos-chave no repositório", st["h2"]))
    story.append(
        make_table(
            ["Área", "Caminhos"],
            [
                [
                    "Docs / HTML",
                    "docs/recovery-emails/ · docs/cart-abandon/ · docs/cancel-emails/ · docs/welcome-emails/",
                ],
                [
                    "Workflows n8n",
                    "docs/n8n/workflow-lead-recovery-4emails.json · workflow-cart-abandoned-7emails.json · "
                    "workflow-cancel-card-refused-7emails.json · workflow-welcome-purchase-5emails.json · "
                    "workflow-mark-purchased.json",
                ],
                [
                    "API / notify",
                    "app/api/leads/capture · cart-abandon · webhooks/perfectpay · lib/analytics/n8nNotify.ts",
                ],
                [
                    "Front triggers",
                    "public/step5.html (capture) · public/step6.html + backredirect.html (cart-abandon)",
                ],
            ],
            [usable * 0.20, usable * 0.80],
            st,
        )
    )

    story.append(Spacer(1, 6 * mm))
    story.append(Paragraph("8. Resumo em uma frase", st["h1"]))
    story.append(hr())

    summary_boxes = [
        BoxFlow("Meio do funil (step5)", ["4 e-mails em ~3,5 dias", "$39 → $29 no último"], (usable - 8 * mm) / 3, BLUE_BG, BLUE),
        BoxFlow("Checkout abandonado", ["7 e-mails em ~8 dias", "$29 → $19,50 a partir do A4"], (usable - 8 * mm) / 3, AMBER_BG, AMBER),
        BoxFlow("Cancel / recusado", ["7 e-mails em ~8 dias", "$39 → $29 a partir do C4"], (usable - 8 * mm) / 3, RED_BG, RED),
    ]
    bw = (usable - 8 * mm) / 3
    st_tbl = Table([[summary_boxes[0], summary_boxes[1], summary_boxes[2]]], colWidths=[bw, bw, bw])
    st_tbl.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 3),
            ]
        )
    )
    story.append(st_tbl)
    story.append(Spacer(1, 4 * mm))
    story.append(
        BoxFlow(
            "Compra",
            ["Para tudo (purchased=true nas abas) e entra no Welcome (5 e-mails de onboarding)."],
            usable,
            GREEN_BG,
            GREEN,
        )
    )

    story.append(Spacer(1, 8 * mm))
    story.append(hr())
    story.append(
        Paragraph(
            "Documento gerado a partir da implementação no repositório SafelinkSpy "
            "(n8n workflows, HTMLs de e-mail, rotas Next.js e PerfectPay webhook). "
            "Regenerar: <font face='Courier'>python scripts/build-email-architecture-pdf.py</font>",
            st["small"],
        )
    )

    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    print(f"OK → {OUT}")
    return OUT


if __name__ == "__main__":
    build()
