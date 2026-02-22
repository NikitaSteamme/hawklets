from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import APIKeyHeader
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import sys

# Импорт роутеров
# Add parent directory to sys.path to allow both absolute and relative imports
current_dir = Path(__file__).parent
parent_dir = current_dir.parent
if str(parent_dir) not in sys.path:
    sys.path.insert(0, str(parent_dir))

try:
    from backend.routers import auth, exercises, templates
except ImportError:
    # If backend.routers doesn't work, try direct import
    try:
        from routers import auth, exercises, templates
    except ImportError:
        # Last resort: try relative import
        from .routers import auth, exercises, templates

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# API Key configuration
API_KEY_NAME = "X-API-Key"
API_KEY = os.getenv("API_KEY", "default-api-key-change-in-production")

# Security scheme for OpenAPI docs
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=False)

async def verify_api_key(api_key_header: str = Depends(api_key_header)):
    """Verify API key from request header"""
    if not api_key_header:
        raise HTTPException(
            status_code=401,
            detail="API key is missing"
        )
    
    if api_key_header != API_KEY:
        raise HTTPException(
            status_code=401,
            detail="Invalid API key"
        )
    
    return api_key_header

# Create the main app without a prefix
app = FastAPI(
    title="Hawklets API",
    description="API for Hawklets fitness tracking application",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    dependencies=[Depends(verify_api_key)]  # Apply to all endpoints
)

# Database dependency (for future use)
async def get_database():
    """Dependency to get database connection"""
    return db

# Create a router with the /api prefix and API key dependency
api_router = APIRouter(prefix="/api", dependencies=[Depends(verify_api_key)])

# Подключаем роутеры
api_router.include_router(auth.router)
api_router.include_router(exercises.router)
api_router.include_router(templates.router)

# Define Models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")  # Ignore MongoDB's _id field
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

# Waitlist Models
class WaitlistCreate(BaseModel):
    name: Optional[str] = None
    email: EmailStr

class Waitlist(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: Optional[str] = None
    email: EmailStr
    status: str = "pending"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Hawklets API", "version": "1.0.0"}

@api_router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "services": {
            "mongodb": "connected" if client else "disconnected",
            "api": "running"
        }
    }

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    
    # Convert to dict and serialize datetime to ISO string for MongoDB
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    _ = await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    # Exclude MongoDB's _id field from the query results
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    
    # Convert ISO string timestamps back to datetime objects
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    
    return status_checks

# Waitlist endpoints
@api_router.post("/waitlist")
async def add_to_waitlist(input: WaitlistCreate):
    """Add a user to the waitlist"""
    try:
        # Check if email already exists
        existing = await db.waitlist.find_one({"email": input.email})
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        # Create waitlist entry
        waitlist_entry = Waitlist(**input.model_dump())
        
        # Convert to dict and serialize datetime to ISO string for MongoDB
        doc = waitlist_entry.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        
        await db.waitlist.insert_one(doc)
        
        return {
            "success": True,
            "message": "Successfully added to waitlist",
            "data": {
                "id": waitlist_entry.id,
                "email": waitlist_entry.email,
                "name": waitlist_entry.name
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        # Log full exception traceback for easier debugging
        logger.exception("Error adding to waitlist")
        raise HTTPException(status_code=500, detail="Failed to add to waitlist")

@api_router.get("/waitlist")
async def get_waitlist():
    """Get all waitlist entries (admin endpoint)"""
    try:
        # Exclude MongoDB's _id field from the query results
        waitlist = await db.waitlist.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
        
        # Convert ISO string timestamps back to datetime objects
        for entry in waitlist:
            if isinstance(entry['created_at'], str):
                entry['created_at'] = datetime.fromisoformat(entry['created_at'])
        
        return {
            "success": True,
            "count": len(waitlist),
            "data": [Waitlist(**entry) for entry in waitlist]
        }
    except Exception as e:
        logger.error(f"Error fetching waitlist: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch waitlist")

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    await client.close()