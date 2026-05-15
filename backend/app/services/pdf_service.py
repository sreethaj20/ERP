from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image
from reportlab.lib.units import inch
from reportlab.lib import colors
import os
from datetime import datetime

import io
from app.services.storage_service import storage_service

class PDFService:
    def __init__(self, base_path: str = "documents"):
        self.sub_dir = base_path

    async def generate_offer_letter(self, data: dict) -> str:
        """Generates an offer letter PDF and saves it to storage."""
        filename = f"offer_{data.get('candidate_id', 'new')}_{datetime.now().strftime('%Y%m%d%H%M%S')}.pdf"
        
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        styles = getSampleStyleSheet()
        story = []

        # Title
        title_style = ParagraphStyle(
            'TitleStyle',
            parent=styles['Heading1'],
            fontSize=18,
            spaceAfter=20,
            alignment=1 # Center
        )
        story.append(Paragraph("EMPLOYMENT OFFER LETTER", title_style))
        story.append(Spacer(1, 0.2 * inch))

        # Body
        body_style = styles['Normal']
        story.append(Paragraph(f"Date: {datetime.now().strftime('%B %d, %Y')}", body_style))
        story.append(Spacer(1, 0.2 * inch))
        
        story.append(Paragraph(f"Dear {data.get('name', 'Candidate')},", body_style))
        story.append(Spacer(1, 0.2 * inch))
        
        text = (
            f"We are pleased to offer you the position of <b>{data.get('designation', 'Employee')}</b> "
            f"at Antigravity HRMS. We were impressed with your skills and experience and believe "
            f"you will be a valuable addition to our team."
        )
        story.append(Paragraph(text, body_style))
        story.append(Spacer(1, 0.2 * inch))

        details = [
            f"<b>Position:</b> {data.get('designation')}",
            f"<b>Department:</b> {data.get('department')}",
            f"<b>Joining Date:</b> {data.get('joining_date')}",
            f"<b>Annual CTC:</b> {data.get('salary', 'As discussed')} L.P.A",
        ]
        
        for d in details:
            story.append(Paragraph(d, body_style))
            story.append(Spacer(1, 0.1 * inch))

        story.append(Spacer(1, 0.3 * inch))
        story.append(Paragraph("Sincerely,", body_style))
        story.append(Spacer(1, 0.1 * inch))
        story.append(Paragraph("<b>HR Management Team</b>", body_style))
        story.append(Paragraph("Antigravity HRMS Portel", body_style))

        doc.build(story)
        pdf_content = buffer.getvalue()
        buffer.close()
        
        path, _ = await storage_service.save_content(pdf_content, filename, sub_dir=self.sub_dir)
        return path

    async def generate_relieving_letter(self, data: dict) -> str:
        """Generates a relieving letter PDF and saves it to storage."""
        filename = f"relieving_{data.get('employee_id', 'emp')}_{datetime.now().strftime('%Y%m%d%H%M%S')}.pdf"
        
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        styles = getSampleStyleSheet()
        story = []

        # Title
        title_style = ParagraphStyle(
            'TitleStyle',
            parent=styles['Heading1'],
            fontSize=18,
            spaceAfter=20,
            alignment=1 # Center
        )
        story.append(Paragraph("RELIEVING LETTER", title_style))
        story.append(Spacer(1, 0.2 * inch))

        # Body
        body_style = styles['Normal']
        story.append(Paragraph(f"Date: {datetime.now().strftime('%B %d, %Y')}", body_style))
        story.append(Spacer(1, 0.2 * inch))
        
        story.append(Paragraph(f"To Whom It May Concern,", body_style))
        story.append(Spacer(1, 0.2 * inch))
        
        text = (
            f"This is to certify that <b>{data.get('name', 'Employee')}</b> (Employee ID: {data.get('employee_id')}) "
            f"was employed with Antigravity HRMS from <b>{data.get('joining_date', 'N/A')}</b> to <b>{data.get('exit_date', 'N/A')}</b>. "
            f"They were serving as <b>{data.get('designation', 'Employee')}</b> in the <b>{data.get('department', 'N/A')}</b> department."
        )
        story.append(Paragraph(text, body_style))
        story.append(Spacer(1, 0.2 * inch))

        story.append(Paragraph(
            "During their tenure, we found them to be diligent and hardworking. "
            "We wish them all the best in their future endeavors.", 
            body_style
        ))

        story.append(Spacer(1, 0.3 * inch))
        story.append(Paragraph("For Antigravity HRMS,", body_style))
        story.append(Spacer(1, 0.1 * inch))
        story.append(Paragraph("<b>Authorized Signatory</b>", body_style))
        story.append(Paragraph("HR Management Team", body_style))

        doc.build(story)
        pdf_content = buffer.getvalue()
        buffer.close()
        
        path, _ = await storage_service.save_content(pdf_content, filename, sub_dir=self.sub_dir)
        return path

pdf_service = PDFService()
