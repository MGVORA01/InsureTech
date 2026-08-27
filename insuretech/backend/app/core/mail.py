from fastapi_mail import (FastMail,MessageSchema,ConnectionConfig)

from app.core.config import settings

conf = ConnectionConfig(
    MAIL_USERNAME=settings.MAIL_USERNAME,
    MAIL_PASSWORD=settings.MAIL_PASSWORD,
    MAIL_FROM=settings.MAIL_FROM,
    MAIL_PORT=settings.MAIL_PORT,
    MAIL_SERVER=settings.MAIL_SERVER,
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True,
)


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

  fm = FastMail(conf)

  await fm.send_message(message)


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

  fm = FastMail(conf)
  await fm.send_message(msg)
