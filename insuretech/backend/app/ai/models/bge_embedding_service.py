import hashlib
import math
import re


EMBEDDING_DIMENSION = 768
TOKEN_PATTERN = re.compile(r"[a-zA-Z0-9]+")


def _hash_token(token: str) -> int:
    digest = hashlib.blake2b(token.encode("utf-8"), digest_size=8).digest()
    return int.from_bytes(digest, byteorder="big", signed=False)


def generate_embedding(text: str) -> list[float]:
    vector = [0.0] * EMBEDDING_DIMENSION
    tokens = TOKEN_PATTERN.findall((text or "").lower())
    if not tokens:
        return vector

    for token in tokens:
        hashed = _hash_token(token)
        index = hashed % EMBEDDING_DIMENSION
        sign = 1.0 if (hashed >> 1) & 1 else -1.0
        vector[index] += sign

    norm = math.sqrt(sum(value * value for value in vector))
    if norm == 0:
        return vector
    return [value / norm for value in vector]


def generate_embeddings_batch(texts: list[str]) -> list[list[float]]:
    return [generate_embedding(text) for text in texts]
