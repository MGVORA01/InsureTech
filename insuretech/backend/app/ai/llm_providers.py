from groq import Groq
from app.core.config import settings

_client = None


def get_client() -> Groq:
    global _client
    if _client is None:
        if not settings.GROQ_API_KEY:
            raise ValueError("GROQ_API_KEY not set in .env")
        _client = Groq(api_key=settings.GROQ_API_KEY)
    return _client


def generate_response(
    system_prompt: str,
    user_prompt: str,
    model: str = "llama-3.1-8b-instant",
    temperature: float = 0.1,
    messages: list[dict] | None = None,
) -> str:
    client = get_client()
    if messages is not None:
        msgs = messages
    else:
        msgs = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]
    response = client.chat.completions.create(
        model=model,
        messages=msgs,
        temperature=temperature,
    )
    return response.choices[0].message.content
