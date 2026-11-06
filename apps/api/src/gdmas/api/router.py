from fastapi import APIRouter
from gdmas.api.routes import earthquakes, statistics

api_router = APIRouter()
api_router.include_router(earthquakes.router)
api_router.include_router(statistics.router)

