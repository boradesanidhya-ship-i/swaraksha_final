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
from typing import Dict, Any, Optional

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
        badge_text = "🚨 THREAT ALERT — POTENTIAL DEEPFAKE DETECTED"
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
        <div style="margin-top:16px;padding:12px;background:#F9FAFB;border-radius:8px;border:1px solid #E5E7EB;">
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
        <div><strong>Date:</strong> {created_at}</div>
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
            <td style="padding:8px 0;color:#6B7280;">User Account:</td>
            <td style="padding:8px 0;font-weight:600;color:#111827;text-align:right;">{user_email}</td>
          </tr>
          <tr style="border-bottom:1px solid #F3F4F6;">
            <td style="padding:8px 0;color:#6B7280;">Scan Category:</td>
            <td style="padding:8px 0;font-weight:600;color:#111827;text-align:right;">{report_type.replace('_', ' ')}</td>
          </tr>
          <tr style="border-bottom:1px solid #F3F4F6;">
            <td style="padding:8px 0;color:#6B7280;">Final Action:</td>
            <td style="padding:8px 0;font-weight:700;color:{card_accent};text-align:right;">{action_verdict}</td>
          </tr>
          {f'''<tr style="border-bottom:1px solid #F3F4F6;">
            <td style="padding:8px 0;color:#6B7280;">Protected Identity Detected:</td>
            <td style="padding:8px 0;font-weight:600;color:#111827;text-align:right;">{"YES" if identity_info.get("protected_identity_detected") else "NO"}</td>
          </tr>''' if identity_info else ''}
          {f'''<tr style="border-bottom:1px solid #F3F4F6;">
            <td style="padding:8px 0;color:#6B7280;">AI Synthesis Confidence:</td>
            <td style="padding:8px 0;font-weight:600;color:#111827;text-align:right;">{round(ai_info.get("aggregate_score", 0)*100, 1)}%</td>
          </tr>''' if ai_info and "aggregate_score" in ai_info else ''}
        </table>
      </div>

      <!-- Forensics section -->
      {meta_flags_html}

      <!-- Call to Action -->
      <div style="margin-top:28px;padding-top:20px;border-top:1px solid #E5E7EB;text-align:center;">
        <p style="font-size:12px;color:#6B7280;margin:0 0 16px 0;">This forensic report was automatically generated by your active SWARAKSHA AI agent monitoring node.</p>
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


def send_report_email(to_email: str, report_data: Dict[str, Any]) -> bool:
    """
    Sends an automated forensic scan report to the user's email address.
    """
    if not to_email or "@" not in to_email:
        print(f"[EMAIL] Skipped: invalid email recipient '{to_email}'")
        return False

    report_type = report_data.get("report_type", "SECURITY_SCAN")
    action_verdict = report_data.get("action_verdict", "INFO")
    subject = f"[SWARAKSHA] {action_verdict}: {report_type.replace('_', ' ').title()} Forensic Report"

    html_content = generate_report_html(report_data, to_email)

    # Check if SMTP credentials are configured
    if not config.SMTP_USER or not config.SMTP_PASSWORD:
        print(f"[EMAIL] [SIMULATION] SMTP credentials not set in environment. Mocking email delivery to {to_email}:")
        print(f"  Subject: {subject}")
        print(f"  Verdict: {action_verdict}")
        print(f"  Recipient: {to_email}")
        return True

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{config.SMTP_FROM_NAME} <{config.SMTP_FROM_EMAIL}>"
        msg["To"] = to_email

        # Attach plain text fallback + HTML
        plain_text = f"SWARAKSHA Security Report\n\nVerdict: {action_verdict}\nSummary: {report_data.get('summary')}\nReport ID: {report_data.get('id')}\nDate: {report_data.get('created_at')}"
        msg.attach(MIMEText(plain_text, "plain"))
        msg.attach(MIMEText(html_content, "html"))

        print(f"[EMAIL] Connecting to SMTP server {config.SMTP_HOST}:{config.SMTP_PORT}...")
        server = smtplib.SMTP(config.SMTP_HOST, config.SMTP_PORT, timeout=15)
        if config.SMTP_USE_TLS:
            server.starttls()
        server.login(config.SMTP_USER, config.SMTP_PASSWORD)
        server.sendmail(config.SMTP_FROM_EMAIL, [to_email], msg.as_string())
        server.quit()

        print(f"[EMAIL] [OK] Successfully sent forensic report to {to_email}")
        return True
    except Exception as e:
        print(f"[EMAIL] [ERROR] Failed to send email to {to_email}: {e}")
        return False
