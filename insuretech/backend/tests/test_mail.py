from unittest.mock import AsyncMock

import pytest

from app.core import mail
from app.core.exceptions import BadRequestException
import app.modules.auth.repository as auth_repo
from app.modules.auth.schemas import ForgotPasswordRequest
from app.modules.auth.service import Service


@pytest.mark.asyncio
async def test_forgot_password_raises_error_for_unknown_email(monkeypatch):
    monkeypatch.setattr(auth_repo, "get_user_by_email", AsyncMock(return_value=None))

    with pytest.raises(BadRequestException, match="User with this email does not exist"):
        await Service.forgot_password_service(
            ForgotPasswordRequest(email="unknown@example.com"),
            AsyncMock(),
        )


@pytest.mark.asyncio
async def test_brevo_email_service_uses_configured_sender(monkeypatch):
    captured_payload = {}

    async def fake_post(self, payload):
        captured_payload.update(payload)

    monkeypatch.setattr(mail.settings, "MAIL_PROVIDER", "brevo")
    monkeypatch.setattr(mail.settings, "BREVO_API_KEY", "test_api_key")
    monkeypatch.setattr(mail.settings, "MAIL_FROM", "aiinsuretech@gmail.com")
    monkeypatch.setattr(mail.settings, "MAIL_FROM_NAME", "AI InsureTech")
    monkeypatch.setattr(mail.settings, "MAIL_TIMEOUT_SECONDS", 20)
    monkeypatch.setattr(mail.BrevoEmailService, "_post", fake_post)

    service = mail.BrevoEmailService()
    await service.send_email(
        "Test subject",
        ["user@example.com"],
        "<p>Hello</p>",
        reply_to=["reply@example.com"],
    )

    assert captured_payload["sender"] == {
        "name": "AI InsureTech",
        "email": "aiinsuretech@gmail.com",
    }
    assert captured_payload["to"] == [{"email": "user@example.com"}]
    assert captured_payload["replyTo"] == {"email": "reply@example.com"}


@pytest.mark.asyncio
async def test_send_email_returns_false_when_brevo_key_missing(monkeypatch):
    monkeypatch.setattr(mail.settings, "MAIL_PROVIDER", "brevo")
    monkeypatch.setattr(mail.settings, "BREVO_API_KEY", "")
    monkeypatch.setattr(mail.settings, "MAIL_FROM", "aiinsuretech@gmail.com")

    sent = await mail._send_email(
        "Test subject",
        ["user@example.com"],
        "<p>Hello</p>",
    )

    assert sent is False
