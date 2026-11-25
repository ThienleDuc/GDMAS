from fastapi import APIRouter

from gdmas.api.routes import (
    ai_settings,
    analysis,
    clusters,
    earthquakes,
    events,
    patterns,
    predictions,
    statistics,
    stream,
    system,
)

api_router = APIRouter()
api_router.include_router(earthquakes.router)
api_router.include_router(statistics.router)
api_router.include_router(stream.router)
api_router.include_router(events.router)
api_router.include_router(patterns.router)
api_router.include_router(system.router)
api_router.include_router(predictions.router)
api_router.include_router(analysis.router)
api_router.include_router(clusters.router)
api_router.include_router(ai_settings.router)
