"""
Email service for sending verification emails
"""
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
import os
from app.config import settings
import logging

logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        self.smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.sender_email = os.getenv("SMTP_USERNAME", "")
        self.sender_password = os.getenv("SMTP_PASSWORD", "")
        self.sender_name = os.getenv("SMTP_SENDER_NAME", "Scribsy")
        
    def send_password_reset_email(self, user_email: str, username: str, reset_token: str, reset_url: str) -> bool:
        """
        Send password reset verification email
        """
        if not self.sender_email or not self.sender_password:
            logger.warning("SMTP credentials not configured, skipping email send")
            return False
            
        try:
            subject = "Password Reset Verification - Scribsy"
            
            # Create HTML email body
            html_body = f"""
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #2c3e50;">Password Reset Request</h2>
                    
                    <p>Hello {username},</p>
                    
                    <p>We received a request to reset your password for your Scribsy account. If you made this request, please click the button below to verify your identity and set a new password:</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{reset_url}" 
                           style="background-color: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                            Verify & Reset Password
                        </a>
                    </div>
                    
                    <p style="font-size: 14px; color: #666;">
                        This link will expire in 1 hour for security reasons.
                    </p>
                    
                    <p style="font-size: 14px; color: #666;">
                        If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
                    </p>
                    
                    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                    
                    <p style="font-size: 12px; color: #999;">
                        If the button doesn't work, you can copy and paste this link into your browser:<br>
                        <a href="{reset_url}" style="color: #3498db; word-break: break-all;">{reset_url}</a>
                    </p>
                    
                    <p style="font-size: 12px; color: #999;">
                        This is an automated message from Scribsy. Please do not reply to this email.
                    </p>
                </div>
            </body>
            </html>
            """
            
            # Create plain text version
            text_body = f"""
            Password Reset Request - Scribsy
            
            Hello {username},
            
            We received a request to reset your password for your Scribsy account. If you made this request, please visit the following link to verify your identity and set a new password:
            
            {reset_url}
            
            This link will expire in 1 hour for security reasons.
            
            If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
            
            This is an automated message from Scribsy. Please do not reply to this email.
            """
            
            return self._send_email(user_email, subject, text_body, html_body)
            
        except Exception as e:
            logger.error(f"Failed to send password reset email: {str(e)}")
            return False
    
    def _send_email(self, recipient_email: str, subject: str, text_body: str, html_body: str) -> bool:
        """
        Send email using SMTP
        """
        try:
            # Create message
            message = MIMEMultipart("alternative")
            message["Subject"] = subject
            message["From"] = f"{self.sender_name} <{self.sender_email}>"
            message["To"] = recipient_email
            
            # Add both plain text and HTML versions
            text_part = MIMEText(text_body, "plain")
            html_part = MIMEText(html_body, "html")
            
            message.attach(text_part)
            message.attach(html_part)
            
            # Create secure connection and send email
            context = ssl.create_default_context()
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls(context=context)
                server.login(self.sender_email, self.sender_password)
                server.send_message(message)
            
            logger.info(f"Password reset email sent successfully to {recipient_email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email to {recipient_email}: {str(e)}")
            return False

# Global email service instance
email_service = EmailService()
