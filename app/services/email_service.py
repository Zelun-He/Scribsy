"""Deliver password-reset email through HTTPS (Resend) or authenticated SMTP."""
import logging
import os
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr
from html import escape

import requests

logger = logging.getLogger(__name__)


class EmailService:
    def __init__(self):
        self.resend_api_key = os.getenv('RESEND_API_KEY', '').strip()
        self.smtp_server = os.getenv('SMTP_SERVER', 'smtp.gmail.com').strip()
        self.smtp_port = int(os.getenv('SMTP_PORT', '587'))
        self.sender_email = os.getenv('SMTP_USERNAME', '').strip()
        self.sender_password = os.getenv('SMTP_PASSWORD', '')
        self.sender_name = os.getenv('SMTP_SENDER_NAME', 'Scribsy').strip()
        self.email_from = os.getenv('EMAIL_FROM', '').strip()

    def is_configured(self) -> bool:
        if self.resend_api_key:
            return bool(self.email_from)
        return bool(self.sender_email and self.sender_password)

    def send_password_reset_email(self, user_email: str, username: str,
                                  reset_token: str, reset_url: str) -> bool:
        if not self.is_configured():
            logger.error('Password reset email provider is not configured')
            return False
        # Never log the recipient, credentials, reset URL, or token.
        safe_name, safe_url = escape(username), escape(reset_url, quote=True)
        subject = 'Reset your Scribsy password'
        text_body = (
            f'Hello {username},\n\n'
            f'Use this link to choose a new Scribsy password:\n{reset_url}\n\n'
            'This link expires in 1 hour and can only be used once. '
            'Only the most recent reset link will work.\n\n'
            'If you did not request this, ignore this email. Your password has not changed.'
        )
        html_body = f'''<html lang="en"><head><title>Reset your Scribsy password</title></head><body style="font-family:Arial,sans-serif;color:#0f1a24;line-height:1.6">
          <div style="max-width:560px;margin:0 auto;padding:32px">
          <h2>Reset your Scribsy password</h2><p>Hello {safe_name},</p>
          <p>Use the button below to choose a new password.</p>
          <p style="margin:28px 0"><a href="{safe_url}" style="background:#214bdc;color:#fff;padding:14px 22px;border-radius:6px;text-decoration:none">Reset password</a></p>
          <p>This link expires in 1 hour and can only be used once. Only the most recent reset link will work.</p>
          <p>If you did not request this, ignore this email. Your password has not changed.</p>
          <p style="font-size:13px">Or copy this link into your browser:<br><a href="{safe_url}">{safe_url}</a></p>
          </div></body></html>'''
        return self._send_email(user_email, subject, text_body, html_body)

    def _send_email(self, recipient_email: str, subject: str, text_body: str, html_body: str) -> bool:
        try:
            if self.resend_api_key:
                response = requests.post(
                    'https://api.resend.com/emails',
                    headers={'Authorization': f'Bearer {self.resend_api_key}'},
                    json={'from': self.email_from, 'to': [recipient_email],
                          'subject': subject, 'text': text_body, 'html': html_body},
                    timeout=10, allow_redirects=False,
                )
                if not 200 <= response.status_code < 300:
                    logger.error('Reset email provider rejected request (HTTP %s)', response.status_code)
                    return False
                return bool(response.json().get('id'))

            message = MIMEMultipart('alternative')
            message['Subject'] = subject
            message['From'] = self.email_from or formataddr((self.sender_name, self.sender_email))
            message['To'] = recipient_email
            message.attach(MIMEText(text_body, 'plain', 'utf-8'))
            message.attach(MIMEText(html_body, 'html', 'utf-8'))
            context = ssl.create_default_context()
            if self.smtp_port == 465:
                connection = smtplib.SMTP_SSL(self.smtp_server, self.smtp_port, timeout=10, context=context)
            else:
                connection = smtplib.SMTP(self.smtp_server, self.smtp_port, timeout=10)
            with connection as server:
                if self.smtp_port != 465:
                    server.starttls(context=context)
                server.login(self.sender_email, self.sender_password)
                refused = server.send_message(message)
            return not refused
        except Exception as exc:
            logger.error('Reset email delivery failed (%s)', type(exc).__name__)
            return False


email_service = EmailService()
