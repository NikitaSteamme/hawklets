from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr, validator
from typing import List, Optional
import uuid
from datetime import datetime, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


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
    return {"message": "Hello World"}

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
        logger.error(f"Error adding to waitlist: {str(e)}")
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

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()