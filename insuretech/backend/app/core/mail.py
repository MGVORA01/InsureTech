import asyncio

from fastapi_mail import ConnectionConfig, FastMail, MessageSchema

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

conf = ConnectionConfig(
    MAIL_USERNAME=settings.MAIL_USERNAME,
    MAIL_PASSWORD=settings.MAIL_PASSWORD,
    MAIL_FROM=settings.MAIL_FROM,
    MAIL_PORT=settings.MAIL_PORT,
    MAIL_SERVER=settings.MAIL_SERVER,
    MAIL_STARTTLS=settings.MAIL_STARTTLS,
    MAIL_SSL_TLS=settings.MAIL_SSL_TLS,
    USE_CREDENTIALS=True,
)


async def _send_message(message: MessageSchema) -> None:
  logger.info(
    "Sending email via %s:%s starttls=%s ssl_tls=%s from=%s recipients=%s",
    settings.MAIL_SERVER,
    settings.MAIL_PORT,
    settings.MAIL_STARTTLS,
    settings.MAIL_SSL_TLS,
    settings.MAIL_FROM,
    message.recipients,
  )
  try:
    await asyncio.wait_for(
      FastMail(conf).send_message(message),
      timeout=settings.MAIL_TIMEOUT_SECONDS,
    )
    logger.info("Email sent successfully to %s", message.recipients)
  except asyncio.TimeoutError:
    logger.exception(
      "Email sending timed out after %s seconds to %s",
      settings.MAIL_TIMEOUT_SECONDS,
      message.recipients,
    )
    raise
  except Exception:
    logger.exception("Email sending failed to %s", message.recipients)
    raise


async def send_reset_password_email(
  email: str,
  reset_url: str
):
  html = f"""
    <h2>Reset Password</h2>

    <p>
        Click the button below to reset your password.
    </p>

    <a href="{reset_url}">
        Reset Password
    </a>

    <p>
        This link expires in 5 minutes.
    </p>
    """

  message = MessageSchema(
    subject="Reset Password",
    recipients=[email],
    body=html,
    subtype="html"
  )

  await _send_message(message)


async def send_verification_email(email: str, otp: str):
  html = f"""
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{settings.PROJECT_NAME} Verification Code</title>
  </head>
  <body style="margin:0;padding:0;background:#f3f6fb;font-family:Inter,-apple-system,system-ui,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f3f6fb;min-width:100%;">
      <tr>
        <td align="center" style="padding:24px 0;">
          <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 24px 70px rgba(15, 23, 42, 0.08);">
            <tr>
              <td style="background:#0d7377;padding:32px 28px;">
                <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;line-height:1.1;">Verify your email address</h1>
                <p style="margin:12px 0 0;color:rgba(255,255,255,0.88);font-size:15px;line-height:1.6;">Thanks for choosing {settings.PROJECT_NAME}. Enter the code below to confirm your email and finish setting up your account.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 28px;">
                <p style="margin:0 0 16px;color:#102a45;font-size:15px;line-height:1.75;">Your verification code is:</p>
                <div style="margin:0 auto 24px auto;max-width:240px;padding:24px 0;border-radius:18px;background:linear-gradient(135deg, #0d7377 0%, #1a3a5c 100%);text-align:center;">
                  <p style="margin:0;color:#c5f1e6;font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Verification code</p>
                  <p style="margin:14px 0 0;color:#ffffff;font-size:42px;font-weight:800;letter-spacing:0.16em;">{otp}</p>
                </div>
                <p style="margin:0;color:#475569;font-size:14px;line-height:1.75;">This code expires in {settings.EMAIL_OTP_EXPIRE_MINUTES} minutes. If you did not request this, you can ignore this email.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 28px;">
                <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                  <tr>
                    <td style="padding-top:20px;color:#94a3b8;font-size:13px;line-height:1.7;">Need help? Reply to this message or visit the {settings.PROJECT_NAME} dashboard.</td>
                    <td align="right" style="padding-top:20px;color:#0d7377;font-size:18px;font-weight:700;">{settings.PROJECT_NAME}</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  """

  message = MessageSchema(
    subject=f"{settings.PROJECT_NAME} Verification Code",
    recipients=[email],
    body=html,
    subtype="html"
  )

  await _send_message(message)


async def send_contact_email(name: str, email: str, message: str):
  html = f"""
    <h2>New Contact Form Submission</h2>
    <table style="border-collapse:collapse;width:100%;max-width:600px;">
      <tr><td style="padding:8px;font-weight:bold;">Name:</td><td style="padding:8px;">{name}</td></tr>
      <tr><td style="padding:8px;font-weight:bold;">Email:</td><td style="padding:8px;">{email}</td></tr>
      <tr><td style="padding:8px;font-weight:bold;">Message:</td><td style="padding:8px;">{message}</td></tr>
    </table>
    """

  msg = MessageSchema(
    subject=f"Contact Form: {name}",
    recipients=[settings.MAIL_FROM],
    body=html,
    subtype="html",
  )

  await _send_message(msg)
