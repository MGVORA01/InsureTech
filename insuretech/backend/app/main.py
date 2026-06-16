# app/main.py

from fastapi import FastAPI
from app.core.logging import setup_logging
from app.core.exceptions import register_exception_handlers
from app.core.middleware import setup_middleware

setup_logging()

app = FastAPI()
setup_middleware(app)
register_exception_handlers(app)

@app.get("/")
def health():
    return {"status": "ok"}