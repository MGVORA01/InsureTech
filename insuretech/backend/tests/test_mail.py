import pytest

from app.core import mail


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
