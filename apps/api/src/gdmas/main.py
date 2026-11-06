from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from gdmas.core.config import settings

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
    docs_url=f"{settings.API_V1_PREFIX}/docs",
)

if settings.CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


@app.get("/")
def root():
    return {"status": "ok", "project": settings.PROJECT_NAME, "version": "0.1.0"}


@app.get("/health")
def health():
    return {"status": "healthy"}

