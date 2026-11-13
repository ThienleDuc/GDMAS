from fastapi import APIRouter

from gdmas.api.routes import earthquakes, patterns, statistics, stream

api_router = APIRouter()
api_router.include_router(earthquakes.router)
api_router.include_router(statistics.router)
api_router.include_router(stream.router)
api_router.include_router(patterns.router)
