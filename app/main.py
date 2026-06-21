"""DORMANT FastAPI app factory (ADR-0057). Serves the committed artifacts read-only (+ optionally the built SPA).
Run only when the backend lane is activated:  uvicorn app.main:app --reload"""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from .config import Settings, origins
from .routers import content


def create_app() -> FastAPI:
    s = Settings()
    app = FastAPI(title="product (dormant API)", version="0.01.000")
    app.add_middleware(GZipMiddleware, minimum_size=1024)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins(s) or ["*"],
        allow_methods=["GET"],
        allow_headers=["*"],
    )
    app.include_router(content.router)

    @app.get("/health")
    @app.get("/healthz")
    def health() -> dict:
        return {"status": "ok"}

    return app


app = create_app()
