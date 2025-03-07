import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import logging
from typing import Optional

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# MongoDB connection
client = None
db = None

# Collections
users = None
mood_entries = None
chat_history = None
achievements = None

async def connect_to_mongo():
    """Connect to MongoDB."""
    global client, db, users, mood_entries, chat_history, achievements
    try:
        # Get MongoDB URL from environment
        mongodb_url = os.getenv("MONGODB_URL")
        if not mongodb_url:
            raise ValueError("MONGODB_URL not found in environment variables")

        # Connect to MongoDB
        client = AsyncIOMotorClient(
            mongodb_url,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=5000,
            socketTimeoutMS=5000,
            retryWrites=True,
            retryReads=True,
            maxPoolSize=50,
            minPoolSize=10
        )
        
        # Test the connection
        await client.admin.command('ping')
        
        # Get database
        db = client[os.getenv("DATABASE_NAME", "psychaid_db")]
        
        # Initialize collections
        users = db.users
        mood_entries = db.mood_history
        chat_history = db.chat_history
        achievements = db.achievements
        
        # Create indexes
        await users.create_index("email", unique=True)
        await chat_history.create_index([("user_id", 1), ("timestamp", -1)])
        await mood_entries.create_index([("user_id", 1), ("timestamp", -1)])
        
        logger.info("Successfully connected to MongoDB")
        
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {str(e)}")
        raise

async def close_mongo_connection():
    """Close MongoDB connection."""
    global client, db, users, mood_entries, chat_history, achievements
    if client:
        client.close()
        db = None
        users = None
        mood_entries = None
        chat_history = None
        achievements = None
        logger.info("MongoDB connection closed")

def get_database():
    """Get database instance."""
    if db is None:
        raise Exception("Database not initialized. Call connect_to_mongo() first.")
    return db

# Export the functions and collections
__all__ = [
    "connect_to_mongo",
    "close_mongo_connection",
    "get_database",
    "users",
    "mood_entries",
    "chat_history",
    "achievements"
] 