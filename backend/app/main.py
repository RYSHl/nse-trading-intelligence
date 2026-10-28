import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.core.config import settings
from backend.app.database.session import Base, engine
from backend.app.api.endpoints import router as api_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("nse-trading-intelligence")

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=(
        "Production-grade Algorithmic Trading Intelligence Platform for the National Stock Exchange of India (NSE). "
        "Provides market scanning, indicator calculations, rule-based signals, institutional risk management, "
        "event-driven backtesting, and persistent paper trading."
    ),
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routes
app.include_router(api_router, prefix="/api")

@app.on_event("startup")
async def startup_event():
    logger.info("Initializing NSE Trading Intelligence Platform...")
    Base.metadata.create_all(bind=engine)
    from sqlalchemy import text
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE paper_positions ADD COLUMN entry_fees FLOAT DEFAULT 0.0"))
            conn.commit()
        except Exception:
            pass
    logger.info("Database schemas and seed items verified.")

@app.get("/")
def root():
    return {
        "platform": settings.PROJECT_NAME,
        "market": "NSE",
        "status": "ONLINE",
        "api_docs": "/docs",
        "health_check": "/api/health"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
