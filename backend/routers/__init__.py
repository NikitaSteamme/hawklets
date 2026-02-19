"""
Роутеры Hawklets API
"""

from .auth import router as auth_router
from .exercises import router as exercises_router
from .templates import router as templates_router

__all__ = [
    "auth_router",
    "exercises_router",
    "templates_router"
]