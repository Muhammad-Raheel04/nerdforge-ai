# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import logging

from .config import settings
from .database import init_db
from .api import attacks

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize database
try:
    init_db()
    logger.info("✅ Database initialized successfully")
except Exception as e:
    logger.warning(f"⚠️ Database initialization warning: {e}")

app = FastAPI(
    title="NerdForge AI",
    version="1.0.0",
    description="Autonomous AI Security Operations Center"
)

# CORS configuration - origins come from the CORS_ORIGINS env var so the
# deployed frontend (Railway/Vercel/etc.) can be added without a code change.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

print(app.user_middleware)

# Include routers
app.include_router(attacks.router)

@app.get("/")
async def root():
    return {
        "message": "Welcome to NerdForge AI!",
        "version": "1.0.0",
        "status": "operational",
        "docs": "/docs",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "NerdForge AI Backend",
        "database": "connected",
        "timestamp": datetime.now().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=settings.PORT,
        reload=settings.DEBUG
    )
