"""
SWARAKSHA — Automated Email Dispatcher & Forensic Report Generator

Uses Python standard libraries (smtplib, email.mime) to generate and send
branded HTML forensic security reports to users after face and video scans.
"""

import os
import sys
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime, timezone
from typing import Dict, Any, Optional, Tuple

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import config


def generate_report_html(report_data: Dict[str, Any], user_email: str) -> str:
    """
    Generates a responsive HTML forensic security report.
    """
    report_type = report_data.get("report_type", "SECURITY_SCAN")
    action_verdict = report_data.get("action_verdict", "REVIEW_REQUIRED")
    summary = report_data.get("summary", "Analysis completed.")
    details = report_data.get("details", {}) or {}
    report_id = report_data.get("id", "SW-" + datetime.utcnow().strftime("%Y%m%d%H%M%S"))
    created_at = report_data.get("created_at", datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"))

    is_threat = action_verdict in ("BLOCK", "POTENTIAL_AI_MANIPULATION")
    is_clear = action_verdict in ("ALLOW", "NO_THREAT_DETECTED")

    if is_threat:
        badge_color = "#DC2626"
        badge_bg = "#FEF2F2"
        badge_border = "#F87171"
        badge_text = "🚨 THREAT ALERT — POTENTIAL DEEPFAKE / MISUSE DETECTED"
        card_accent = "#DC2626"
    elif is_clear:
        badge_color = "#16A34A"
        badge_bg = "#F0FDF4"
        badge_border = "#86EFAC"
        badge_text = "✅ CLEAR — NO MANIPULATION DETECTED"
        card_accent = "#16A34A"
    else:
        badge_color = "#D97706"
        badge_bg = "#FFFBEB"
        badge_border = "#FCD34D"
        badge_text = "⚠️ REVIEW RECOMMENDED"
        card_accent = "#D97706"

    # Extract metrics
    faces_detected = details.get("faces_detected", 0)
    identity_info = details.get("identity", {})
    ai_info = details.get("ai_analysis", {})
    metadata_forensics = details.get("metadata_forensics", {})

    meta_flags_html = ""
    if metadata_forensics and metadata_forensics.get("flags"):
        flags = metadata_forensics.get("flags", [])
        items = "".join([f"<li style='margin-bottom:4px;color:#4B5563;'>{flag}</li>" for flag in flags])
        meta_flags_html = f"""
        <div style="margin-top:16px;padding:14px;background:#F9FAFB;border-radius:8px;border:1px solid #E5E7EB;">
            <strong style="color:#374151;font-size:13px;">Metadata & Forensics Flags ({metadata_forensics.get('confidence', 'none').upper()} confidence):</strong>
            <ul style="margin:8px 0 0 16px;padding:0;font-size:13px;">
                {items}
            </ul>
        </div>
        """

    html = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>SWARAKSHA Security Report #{report_id}</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background-color:#F3F4F6;color:#1F2937;">
  <div style="max-width:600px;margin:24px auto;background:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1),0 2px 4px -1px rgba(0,0,0,0.06);border:1px solid #E5E7EB;">
    
    <!-- Brand Header -->
    <div style="background:linear-gradient(135deg, #4A1D96 0%, #6D28D9 100%);padding:24px 32px;color:#FFFFFF;">
      <div style="font-size:22px;font-weight:800;letter-spacing:1px;margin-bottom:4px;">🛡️ SWARAKSHA</div>
      <div style="font-size:13px;color:#DDD6FE;">AI Facial Identity Protection & Deepfake Defense System</div>
    </div>

    <div style="padding:28px 32px;">
      <!-- Report Header -->
      <div style="display:flex;justify-content:space-between;margin-bottom:20px;font-size:12px;color:#6B7280;border-bottom:1px solid #F3F4F6;padding-bottom:12px;">
        <div><strong>Report ID:</strong> #{report_id}</div>
        <div><strong>Timestamp:</strong> {created_at}</div>
      </div>

      <!-- Verdict Banner -->
      <div style="background:{badge_bg};border:1px solid {badge_border};border-left:5px solid {card_accent};padding:16px;border-radius:8px;margin-bottom:24px;">
        <div style="font-size:14px;font-weight:700;color:{badge_color};margin-bottom:4px;">{badge_text}</div>
        <div style="font-size:13px;color:#374151;line-height:1.5;">{summary}</div>
      </div>

      <!-- Scan Overview -->
      <div style="margin-bottom:24px;">
        <h3 style="font-size:15px;color:#111827;margin:0 0 12px 0;text-transform:uppercase;letter-spacing:0.5px;">Scan Summary</h3>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <tr style="border-bottom:1px solid #F3F4F6;">
            <td style="padding:8px 0;color:#6B7280;">Recipient / User:</td>
            <td style="padding:8px 0;font-weight:600;color:#111827;text-align:right;">{user_email}</td>
          </tr>
          <tr style="border-bottom:1px solid #F3F4F6;">
            <td style="padding:8px 0;color:#6B7280;">Scan Category:</td>
            <td style="padding:8px 0;font-weight:600;color:#111827;text-align:right;">{report_type.replace('_', ' ')}</td>
          </tr>
          <tr style="border-bottom:1px solid #F3F4F6;">
            <td style="padding:8px 0;color:#6B7280;">Final Action Verdict:</td>
            <td style="padding:8px 0;font-weight:700;color:{card_accent};text-align:right;">{action_verdict}</td>
          </tr>
          {f'''<tr style="border-bottom:1px solid #F3F4F6;">
            <td style="padding:8px 0;color:#6B7280;">Protected Identity Detected:</td>
            <td style="padding:8px 0;font-weight:600;color:#111827;text-align:right;">{"YES" if identity_info.get("protected_identity_detected") else "NO"}</td>
          </tr>''' if identity_info else ''}
          {f'''<tr style="border-bottom:1px solid #F3F4F6;">
            <td style="padding:8px 0;color:#6B7280;">AI Deepfake Score:</td>
            <td style="padding:8px 0;font-weight:600;color:#111827;text-align:right;">{round(ai_info.get("aggregate_score", 0)*100, 1)}%</td>
          </tr>''' if ai_info and "aggregate_score" in ai_info else ''}
        </table>
      </div>

      <!-- Forensics section -->
      {meta_flags_html}

      <!-- Security Notice -->
      <div style="margin-top:28px;padding-top:20px;border-top:1px solid #E5E7EB;text-align:center;">
        <p style="font-size:12px;color:#6B7280;margin:0 0 16px 0;">This security report was generated automatically by SWARAKSHA AI Agent Protection Node.</p>
      </div>
    </div>

    <!-- Footer -->
    <div style="background:#F9FAFB;padding:16px 32px;font-size:11px;color:#9CA3AF;text-align:center;border-top:1px solid #E5E7EB;">
      SWARAKSHA Cyber Protection Protocol &bull; Dual-Layer AI Defense Engine
    </div>

  </div>
</body>
</html>"""
    return html


def _send_email_smtp(
    to_email: str,
    subject: str,
    plain_body: str,
    html_body: str,
    smtp_host: Optional[str] = None,
    smtp_port: Optional[int] = None,
    smtp_user: Optional[str] = None,
    smtp_password: Optional[str] = None,
    smtp_use_tls: Optional[bool] = None
) -> Tuple[bool, str]:
    """
    Core SMTP transport function supporting TLS (587) and SSL (465).
    """
    host = smtp_host or config.SMTP_HOST or "smtp.gmail.com"
    port = smtp_port or config.SMTP_PORT or 587
    user = smtp_user or config.SMTP_USER or ""
    pwd = smtp_password or config.SMTP_PASSWORD or ""
    from_email = config.SMTP_FROM_EMAIL or user or "notifications@swaraksha.ai"
    from_name = config.SMTP_FROM_NAME or "SWARAKSHA Cyber Defense"
    use_tls = config.SMTP_USE_TLS if smtp_use_tls is None else smtp_use_tls

    if not user or not pwd:
        msg = (
            f"[EMAIL] [NOTICE] SMTP credentials (SMTP_USER/SMTP_PASSWORD) are not configured in .env file.\n"
            f"  - Recipient: {to_email}\n"
            f"  - Subject: {subject}\n"
            f"  To receive live emails in your Gmail inbox, add SMTP_USER=your_email@gmail.com and SMTP_PASSWORD=your_app_password to .env"
        )
        print(msg)
        return False, "SMTP credentials not configured in .env. Please set SMTP_USER and SMTP_PASSWORD."

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{from_name} <{from_email}>"
        msg["To"] = to_email

        msg.attach(MIMEText(plain_body, "plain"))
        msg.attach(MIMEText(html_body, "html"))

        print(f"[EMAIL] Connecting to SMTP server {host}:{port} as {user}...")

        if port == 465:
            server = smtplib.SMTP_SSL(host, port, timeout=20)
        else:
            server = smtplib.SMTP(host, port, timeout=20)
            if use_tls:
                server.starttls()

        server.login(user, pwd)
        server.sendmail(from_email, [to_email], msg.as_string())
        server.quit()

        print(f"[EMAIL] [OK] Successfully delivered email to {to_email}")
        return True, f"Email delivered successfully to {to_email}"
    except smtplib.SMTPAuthenticationError as e:
        err_msg = (
            f"SMTP Authentication Error: {e.smtp_error.decode() if isinstance(e.smtp_error, bytes) else e.smtp_error}. "
            "If using Gmail, make sure to generate an App Password (https://myaccount.google.com/apppasswords) rather than your standard account password."
        )
        print(f"[EMAIL] [ERROR] {err_msg}")
        return False, err_msg
    except Exception as e:
        err_msg = f"SMTP Transmission Failed: {e}"
        print(f"[EMAIL] [ERROR] {err_msg}")
        return False, err_msg


def send_report_email(to_email: str, report_data: Dict[str, Any]) -> bool:
    """
    Sends an automated forensic scan report to the user's email address.
    """
    if not to_email or "@" not in to_email:
        print(f"[EMAIL] Skipped: invalid recipient '{to_email}'")
        return False

    report_type = report_data.get("report_type", "SECURITY_SCAN")
    action_verdict = report_data.get("action_verdict", "INFO")
    subject = f"[SWARAKSHA] {action_verdict}: {report_type.replace('_', ' ').title()} Forensic Report"

    html_content = generate_report_html(report_data, to_email)
    plain_text = f"SWARAKSHA Security Report\n\nVerdict: {action_verdict}\nSummary: {report_data.get('summary')}\nReport ID: {report_data.get('id')}\nDate: {report_data.get('created_at')}"

    success, message = _send_email_smtp(
        to_email=to_email,
        subject=subject,
        plain_body=plain_text,
        html_body=html_content
    )
    return success


def send_test_email(
    to_email: str,
    smtp_host: Optional[str] = None,
    smtp_port: Optional[int] = None,
    smtp_user: Optional[str] = None,
    smtp_password: Optional[str] = None,
    smtp_use_tls: Optional[bool] = None
) -> Tuple[bool, str]:
    """
    Sends an immediate verification test email to confirm SMTP settings.
    """
    subject = "[SWARAKSHA] Test Email & SMTP Verification"
    plain_text = "This is a test email from SWARAKSHA AI Protection Platform to verify that your SMTP email settings are functioning properly."
    html_text = f"""<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;padding:20px;background:#F3F4F6;">
  <div style="max-width:500px;margin:auto;background:#fff;padding:24px;border-radius:10px;border:1px solid #E5E7EB;">
    <h2 style="color:#6D28D9;margin-top:0;">🛡️ SWARAKSHA Email Active</h2>
    <p style="color:#374151;font-size:14px;line-height:1.5;">
      Your automated email notifications are <strong>properly configured and operational</strong>!
    </p>
    <p style="color:#6B7280;font-size:13px;">
      Registered user reports from Face Scans and Video Lab will be delivered directly to <strong>{to_email}</strong>.
    </p>
    <div style="margin-top:16px;padding:10px;background:#F0FDF4;border-radius:6px;border:1px solid #86EFAC;color:#16A34A;font-size:12px;font-weight:600;">
      ✓ SMTP Verification Successful
    </div>
  </div>
</body>
</html>"""

    return _send_email_smtp(
        to_email=to_email,
        subject=subject,
        plain_body=plain_text,
        html_body=html_text,
        smtp_host=smtp_host,
        smtp_port=smtp_port,
        smtp_user=smtp_user,
        smtp_password=smtp_password,
        smtp_use_tls=smtp_use_tls
    )
