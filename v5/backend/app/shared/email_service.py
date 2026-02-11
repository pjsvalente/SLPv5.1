"""
SmartLamppost v5.0 - Email and SMS notification service
Includes: 2FA, password reset, maintenance alerts, and general notifications
"""

import os
import smtplib
import logging
from datetime import datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from typing import List, Optional, Dict, Any

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


# =========================================================================
# NOTIFICATION EMAIL FUNCTIONS
# =========================================================================

def enviar_email_generico(
    destinatarios: List[str],
    assunto: str,
    corpo_html: str,
    corpo_texto: Optional[str] = None,
    anexos: Optional[List[Dict[str, Any]]] = None
) -> bool:
    """
    Send a generic email notification.

    Args:
        destinatarios: List of email addresses
        assunto: Email subject
        corpo_html: HTML body content
        corpo_texto: Plain text body (optional, derived from HTML if not provided)
        anexos: List of attachments [{'nome': 'file.pdf', 'dados': bytes, 'tipo': 'application/pdf'}]

    Returns:
        bool: True if sent successfully
    """
    if not SMTP_USER or not SMTP_PASSWORD:
        logger.info("[EMAIL] Would send to %s: %s (SMTP not configured)", destinatarios, assunto)
        return True

    try:
        msg = MIMEMultipart('alternative')
        msg['From'] = EMAIL_FROM
        msg['To'] = ', '.join(destinatarios)
        msg['Subject'] = assunto

        # Plain text version
        if corpo_texto:
            msg.attach(MIMEText(corpo_texto, 'plain', 'utf-8'))

        # HTML version
        msg.attach(MIMEText(corpo_html, 'html', 'utf-8'))

        # Add attachments
        if anexos:
            for anexo in anexos:
                part = MIMEBase('application', 'octet-stream')
                part.set_payload(anexo['dados'])
                encoders.encode_base64(part)
                part.add_header(
                    'Content-Disposition',
                    f"attachment; filename={anexo['nome']}"
                )
                msg.attach(part)

        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(msg)

        logger.info("[EMAIL] Sent to %s: %s", destinatarios, assunto)
        return True

    except Exception as e:
        logger.error("[EMAIL] Error sending to %s: %s", destinatarios, e)
        return False


def enviar_alerta_manutencao(
    destinatarios: List[str],
    ativo_ref: str,
    ativo_localizacao: str,
    tipo_alerta: str,
    data_proxima: str,
    descricao: str = '',
    tenant_name: str = 'SmartLamppost'
) -> bool:
    """
    Send maintenance alert notification.

    Args:
        destinatarios: List of admin/technician emails
        ativo_ref: Asset reference number
        ativo_localizacao: Asset location
        tipo_alerta: 'inspecao_proxima', 'manutencao_proxima', 'garantia_expirar'
        data_proxima: Date of upcoming event
        descricao: Additional description
        tenant_name: Tenant organization name
    """
    alertas = {
        'inspecao_proxima': {
            'titulo': 'Inspeção Agendada',
            'cor': '#f59e0b',
            'icone': '🔍'
        },
        'manutencao_proxima': {
            'titulo': 'Manutenção Agendada',
            'cor': '#3b82f6',
            'icone': '🔧'
        },
        'garantia_expirar': {
            'titulo': 'Garantia a Expirar',
            'cor': '#ef4444',
            'icone': '⚠️'
        },
        'manutencao_atrasada': {
            'titulo': 'Manutenção Atrasada',
            'cor': '#dc2626',
            'icone': '🚨'
        }
    }

    alerta = alertas.get(tipo_alerta, alertas['manutencao_proxima'])

    corpo_html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: {alerta['cor']}; color: white; padding: 20px; border-radius: 8px 8px 0 0; }}
            .content {{ background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px; }}
            .field {{ margin-bottom: 12px; }}
            .label {{ font-weight: 600; color: #64748b; font-size: 12px; text-transform: uppercase; }}
            .value {{ font-size: 16px; color: #1e293b; }}
            .footer {{ margin-top: 20px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; }}
            .btn {{ display: inline-block; padding: 10px 20px; background: #1e40af; color: white; text-decoration: none; border-radius: 6px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2 style="margin: 0;">{alerta['icone']} {alerta['titulo']}</h2>
            </div>
            <div class="content">
                <div class="field">
                    <div class="label">Ativo</div>
                    <div class="value">{ativo_ref}</div>
                </div>
                <div class="field">
                    <div class="label">Localização</div>
                    <div class="value">{ativo_localizacao or 'Não especificada'}</div>
                </div>
                <div class="field">
                    <div class="label">Data Prevista</div>
                    <div class="value">{data_proxima}</div>
                </div>
                {f'<div class="field"><div class="label">Observações</div><div class="value">{descricao}</div></div>' if descricao else ''}
                <div class="footer">
                    <p>Este alerta foi gerado automaticamente pelo sistema {tenant_name}.</p>
                    <p>Para desativar estes alertas, aceda às Definições da sua conta.</p>
                </div>
            </div>
        </div>
    </body>
    </html>
    """

    assunto = f"[{tenant_name}] {alerta['titulo']} - {ativo_ref}"

    return enviar_email_generico(destinatarios, assunto, corpo_html)


def enviar_notificacao_intervencao(
    destinatarios: List[str],
    intervencao_id: int,
    tipo: str,
    ativo_ref: str,
    tecnico_nome: str,
    status: str,
    descricao: str = '',
    tenant_name: str = 'SmartLamppost'
) -> bool:
    """
    Send intervention status notification.

    Args:
        destinatarios: List of emails to notify
        intervencao_id: Intervention ID
        tipo: Intervention type (preventiva, corretiva, etc.)
        ativo_ref: Asset reference
        tecnico_nome: Assigned technician name
        status: Current status (pendente, em_curso, concluida, cancelada)
        descricao: Work description
        tenant_name: Tenant organization name
    """
    status_cores = {
        'pendente': '#f59e0b',
        'em_curso': '#3b82f6',
        'concluida': '#22c55e',
        'cancelada': '#6b7280'
    }

    status_labels = {
        'pendente': 'Pendente',
        'em_curso': 'Em Curso',
        'concluida': 'Concluída',
        'cancelada': 'Cancelada'
    }

    cor = status_cores.get(status, '#6b7280')
    status_label = status_labels.get(status, status)

    corpo_html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: #1e40af; color: white; padding: 20px; border-radius: 8px 8px 0 0; }}
            .status-badge {{ display: inline-block; padding: 4px 12px; background: {cor}; color: white; border-radius: 20px; font-size: 14px; }}
            .content {{ background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px; }}
            .field {{ margin-bottom: 12px; }}
            .label {{ font-weight: 600; color: #64748b; font-size: 12px; text-transform: uppercase; }}
            .value {{ font-size: 16px; color: #1e293b; }}
            .footer {{ margin-top: 20px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2 style="margin: 0;">🔧 Intervenção #{intervencao_id}</h2>
                <span class="status-badge">{status_label}</span>
            </div>
            <div class="content">
                <div class="field">
                    <div class="label">Tipo</div>
                    <div class="value">{tipo.replace('_', ' ').title()}</div>
                </div>
                <div class="field">
                    <div class="label">Ativo</div>
                    <div class="value">{ativo_ref}</div>
                </div>
                <div class="field">
                    <div class="label">Técnico Responsável</div>
                    <div class="value">{tecnico_nome or 'Não atribuído'}</div>
                </div>
                {f'<div class="field"><div class="label">Descrição</div><div class="value">{descricao}</div></div>' if descricao else ''}
                <div class="footer">
                    <p>Notificação automática do sistema {tenant_name}.</p>
                </div>
            </div>
        </div>
    </body>
    </html>
    """

    assunto = f"[{tenant_name}] Intervenção #{intervencao_id} - {status_label}"

    return enviar_email_generico(destinatarios, assunto, corpo_html)


def enviar_relatorio_diario(
    destinatarios: List[str],
    data: str,
    stats: Dict[str, Any],
    alertas: List[Dict[str, Any]],
    tenant_name: str = 'SmartLamppost'
) -> bool:
    """
    Send daily summary report.

    Args:
        destinatarios: Admin email addresses
        data: Report date
        stats: Statistics dict with keys like total_assets, interventions_today, etc.
        alertas: List of pending alerts
        tenant_name: Tenant organization name
    """
    alertas_html = ''
    if alertas:
        alertas_html = '<h3>⚠️ Alertas Pendentes</h3><ul>'
        for alerta in alertas[:10]:  # Limit to 10 alerts
            alertas_html += f"<li><strong>{alerta.get('tipo', 'Alerta')}</strong>: {alerta.get('descricao', '')} ({alerta.get('ativo_ref', '')})</li>"
        alertas_html += '</ul>'

    corpo_html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: #1e40af; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }}
            .content {{ background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px; }}
            .stats-grid {{ display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 20px; }}
            .stat-card {{ background: white; padding: 15px; border-radius: 8px; text-align: center; border: 1px solid #e2e8f0; }}
            .stat-value {{ font-size: 24px; font-weight: bold; color: #1e40af; }}
            .stat-label {{ font-size: 12px; color: #64748b; text-transform: uppercase; }}
            .footer {{ margin-top: 20px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2 style="margin: 0;">📊 Relatório Diário</h2>
                <p style="margin: 5px 0 0 0; opacity: 0.9;">{data}</p>
            </div>
            <div class="content">
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-value">{stats.get('total_assets', 0)}</div>
                        <div class="stat-label">Total Ativos</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">{stats.get('interventions_today', 0)}</div>
                        <div class="stat-label">Intervenções Hoje</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">{stats.get('open_interventions', 0)}</div>
                        <div class="stat-label">Intervenções Abertas</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">{stats.get('maintenance_due', 0)}</div>
                        <div class="stat-label">Manutenções Pendentes</div>
                    </div>
                </div>
                {alertas_html}
                <div class="footer">
                    <p>Relatório automático gerado por {tenant_name}.</p>
                    <p>Para alterar as preferências de notificação, aceda às Definições.</p>
                </div>
            </div>
        </div>
    </body>
    </html>
    """

    assunto = f"[{tenant_name}] Relatório Diário - {data}"

    return enviar_email_generico(destinatarios, assunto, corpo_html)
