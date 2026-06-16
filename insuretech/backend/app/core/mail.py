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
