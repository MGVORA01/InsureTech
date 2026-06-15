from fastapi import FastAPI

from app.api.v1.router import API_router

app = FastAPI()

app.include_router(API_router, prefix="/api/v1")
