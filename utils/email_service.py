"""
SmartLamppost v4.0 - Email and SMS service utilities
"""

import os
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger(__name__)

# Email configuration (from environment variables)
SMTP_SERVER = os.environ.get('SMTP_SERVER', 'smtp.gmail.com')
SMTP_PORT = int(os.environ.get('SMTP_PORT', '587'))
SMTP_USER = os.environ.get('SMTP_USER', '')
SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', '')
EMAIL_FROM = os.environ.get('EMAIL_FROM', 'noreply@smartlamppost.com')

# SMS configuration (placeholder)
SMS_API_URL = os.environ.get('SMS_API_URL', '')
SMS_API_KEY = os.environ.get('SMS_API_KEY', '')

# 2FA settings
CODIGO_2FA_EXPIRACAO_MINUTOS = 10
CODIGO_2FA_TAMANHO = 6
MAX_TENTATIVAS_2FA = 3


def enviar_email_2fa(email, codigo, nome_usuario=''):
    """Send a 2FA verification code by email."""
    if not SMTP_USER or not SMTP_PASSWORD:
        logger.info("[2FA EMAIL] Code for %s: %s (SMTP not configured)", email, codigo)
        return True

    try:
        msg = MIMEMultipart()
        msg['From'] = EMAIL_FROM
        msg['To'] = email
        msg['Subject'] = 'SmartLamppost - Código de Verificação'

        corpo = f"""
        Olá{' ' + nome_usuario if nome_usuario else ''},

        O seu código de verificação é: {codigo}

        Este código expira em {CODIGO_2FA_EXPIRACAO_MINUTOS} minutos.

        Se não solicitou este código, ignore este email.

        Cumprimentos,
        Equipa SmartLamppost
        """

        msg.attach(MIMEText(corpo, 'plain', 'utf-8'))

        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(msg)

        return True
    except Exception as e:
        logger.error("[2FA EMAIL] Error sending email: %s", e)
        return False


def enviar_sms_2fa(telefone, codigo):
    """Send a 2FA verification code by SMS."""
    if not SMS_API_URL or not SMS_API_KEY:
        logger.info("[2FA SMS] Code for %s: %s (SMS not configured)", telefone, codigo)
        return True

    try:
        import urllib.request
        import urllib.parse

        dados = {
            'api_key': SMS_API_KEY,
            'to': telefone,
            'message': f'SmartLamppost - Código: {codigo}'
        }

        req = urllib.request.Request(
            SMS_API_URL,
            data=urllib.parse.urlencode(dados).encode(),
            method='POST'
        )

        with urllib.request.urlopen(req, timeout=10) as response:
            return response.status == 200

    except Exception as e:
        logger.error("[2FA SMS] Error sending SMS: %s", e)
        return False


def enviar_email_reset_password(email, token, nome_usuario=''):
    """Send a password reset email."""
    if not SMTP_USER or not SMTP_PASSWORD:
        logger.info("[RESET PASSWORD] Token for %s: %s (SMTP not configured)", email, token)
        return True

    try:
        msg = MIMEMultipart()
        msg['From'] = EMAIL_FROM
        msg['To'] = email
        msg['Subject'] = 'SmartLamppost - Redefinir Password'

        corpo = f"""
        Olá{' ' + nome_usuario if nome_usuario else ''},

        Foi solicitada a redefinição da sua password.

        Use o seguinte código para criar uma nova password: {token}

        Este código expira em 30 minutos.

        Se não solicitou esta alteração, ignore este email.

        Cumprimentos,
        Equipa SmartLamppost
        """

        msg.attach(MIMEText(corpo, 'plain', 'utf-8'))

        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(msg)

        return True
    except Exception as e:
        logger.error("[RESET PASSWORD] Error sending email: %s", e)
        return False
