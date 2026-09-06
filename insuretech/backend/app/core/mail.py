import asyncio
from html import escape

import httpx

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class EmailDeliveryError(RuntimeError):
  """Raised when the email provider cannot send a message."""

  def __init__(self, message: str, status_code: int | None = None):
    super().__init__(message)
    self.status_code = status_code


class BrevoEmailService:
  """Centralized Brevo HTTPS API email delivery service."""

  _endpoint = "https://api.brevo.com/v3/smtp/email"

  async def send_email(
    self,
    subject: str,
    recipients: list[str],
    html: str,
    reply_to: list[str] | None = None,
  ) -> None:
    self._validate_settings()
    payload = {
      "sender": {
        "name": settings.MAIL_FROM_NAME,
        "email": settings.MAIL_FROM,
      },
      "to": [{"email": recipient} for recipient in recipients],
      "subject": subject,
      "htmlContent": html,
    }
    if reply_to:
      payload["replyTo"] = {"email": reply_to[0]}

    logger.info(
      "Sending transactional email provider=brevo from=%s recipients=%s",
      settings.MAIL_FROM,
      recipients,
    )

    await asyncio.wait_for(
      self._post(payload),
      timeout=settings.MAIL_TIMEOUT_SECONDS,
    )
    logger.info("Transactional email sent provider=brevo recipients=%s", recipients)

  @staticmethod
  def _validate_settings() -> None:
    if settings.MAIL_PROVIDER.lower() != "brevo":
      raise EmailDeliveryError("MAIL_PROVIDER must be set to brevo")

    if not settings.BREVO_API_KEY:
      raise EmailDeliveryError("BREVO_API_KEY is required for Brevo email delivery")

    if not settings.MAIL_FROM:
      raise EmailDeliveryError("MAIL_FROM is required for email delivery")

  async def _post(self, payload: dict) -> None:
    async with httpx.AsyncClient(timeout=settings.MAIL_TIMEOUT_SECONDS) as client:
      response = await client.post(
        self._endpoint,
        headers={
          "accept": "application/json",
          "api-key": settings.BREVO_API_KEY,
          "content-type": "application/json",
        },
        json=payload,
      )

    if response.status_code >= 400:
      provider_message = self._provider_message(response)
      logger.error(
        "Brevo email API rejected request status=%s error=%s",
        response.status_code,
        provider_message,
      )
      raise EmailDeliveryError(
        f"Brevo rejected request ({response.status_code}): {provider_message}",
        status_code=response.status_code,
      )

  @staticmethod
  def _provider_message(response: httpx.Response) -> str:
    try:
      data = response.json()
    except ValueError:
      return "Brevo returned a non-JSON error response"

    message = data.get("message") or data.get("error") or data.get("code")
    if not message:
      return "Brevo returned an unrecognized error response"
    return str(message)[:500]


email_service = BrevoEmailService()


async def _send_email(
  subject: str,
  recipients: list[str],
  html: str,
  reply_to: list[str] | None = None,
) -> bool:
  """Send a transactional email and convert provider errors to a boolean result."""

  try:
    await email_service.send_email(subject, recipients, html, reply_to=reply_to)
    return True
  except asyncio.TimeoutError:
    logger.error(
      "Brevo email sending timed out after %s seconds recipients=%s",
      settings.MAIL_TIMEOUT_SECONDS,
      recipients,
    )
    return False
  except EmailDeliveryError as exc:
    logger.error(
      "Brevo email sending failed status=%s recipients=%s error=%s",
      exc.status_code,
      recipients,
      exc,
    )
    return False
  except httpx.HTTPError as exc:
    logger.error(
      "Brevo email HTTP request failed recipients=%s error=%s",
      recipients,
      exc.__class__.__name__,
    )
    return False


async def send_reset_password_email(
  email: str,
  reset_url: str
) -> bool:
  safe_reset_url = escape(reset_url, quote=True)
  html = f"""
    <h2>Reset Password</h2>

    <p>
        Click the button below to reset your password.
    </p>

    <a href="{safe_reset_url}">
        Reset Password
    </a>

    <p>
        This link expires in 5 minutes.
    </p>
    """

  return await _send_email("Reset Password", [email], html)


async def send_verification_email(email: str, otp: str) -> bool:
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

  return await _send_email(f"{settings.PROJECT_NAME} Verification Code", [email], html)


async def send_contact_email(name: str, email: str, message: str) -> bool:
  safe_name = escape(name)
  safe_email = escape(email)
  safe_message = escape(message)

  html = f"""
    <h2>New Contact Form Submission</h2>
    <table style="border-collapse:collapse;width:100%;max-width:600px;">
      <tr><td style="padding:8px;font-weight:bold;">Name:</td><td style="padding:8px;">{safe_name}</td></tr>
      <tr><td style="padding:8px;font-weight:bold;">Email:</td><td style="padding:8px;">{safe_email}</td></tr>
      <tr><td style="padding:8px;font-weight:bold;">Message:</td><td style="padding:8px;">{safe_message}</td></tr>
    </table>
    """

  return await _send_email(
    f"Contact Form: {safe_name}",
    [settings.MAIL_FROM],
    html,
    reply_to=[email],
  )
