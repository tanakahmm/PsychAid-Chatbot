import logging
from datetime import datetime
from typing import List, Optional
from fastapi import HTTPException
from bson import ObjectId
from database import get_database

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MoodService:
    def __init__(self):
        self.db = get_database()
        logger.info("MoodService initialized")

    async def save_mood_entry(self, user_id: str, mood_data: dict) -> dict:
        """Save a mood entry."""
        try:
            # Create mood entry document
            mood_doc = {
                "user_id": ObjectId(user_id),
                "mood": mood_data["mood"],
                "note": mood_data.get("note", ""),
                "timestamp": datetime.utcnow()
            }
            
            # Insert into database
            result = await self.db.mood_history.insert_one(mood_doc)
            
            # Convert ObjectId to string for response
            response_doc = {
                "_id": str(result.inserted_id),
                "user_id": str(user_id),
                "mood": mood_doc["mood"],
                "note": mood_doc["note"],
                "timestamp": mood_doc["timestamp"].isoformat()
            }
            
            logger.info(f"Saved mood entry for user {user_id}")
            return response_doc
            
        except Exception as e:
            logger.error(f"Error saving mood entry: {str(e)}")
            raise

    async def get_mood_history(self, user_id: str, limit: int = 10) -> list:
        """Get mood history for a user."""
        try:
            cursor = self.db.mood_history.find(
                {"user_id": ObjectId(user_id)}
            ).sort("timestamp", -1).limit(limit)
            
            mood_history = await cursor.to_list(None)
            
            # Convert ObjectIds to strings
            for entry in mood_history:
                entry["_id"] = str(entry["_id"])
                entry["user_id"] = str(entry["user_id"])
                entry["timestamp"] = entry["timestamp"].isoformat()
            
            return mood_history
            
        except Exception as e:
            logger.error(f"Error getting mood history: {str(e)}")
            raise

    async def get_child_mood_history(self, child_id: str) -> list:
        """Get mood history for a child."""
        try:
            cursor = self.db.mood_history.find(
                {"user_id": ObjectId(child_id)}
            ).sort("timestamp", -1)
            
            mood_history = await cursor.to_list(None)
            
            # Convert ObjectIds to strings
            for entry in mood_history:
                entry["_id"] = str(entry["_id"])
                entry["user_id"] = str(entry["user_id"])
                entry["timestamp"] = entry["timestamp"].isoformat()
            
            logger.info(f"Retrieved {len(mood_history)} mood entries for child {child_id}")
            return mood_history
            
        except Exception as e:
            logger.error(f"Error getting child mood history: {str(e)}", exc_info=True)
            raise

    async def get_latest_mood(self, user_id: str) -> dict:
        """Get the latest mood entry for a user."""
        try:
            latest_mood = await self.db.mood_history.find_one(
                {"user_id": ObjectId(user_id)},
                sort=[("timestamp", -1)]
            )
            return latest_mood
            
        except Exception as e:
            logger.error(f"Error getting latest mood: {str(e)}")
            raise

    async def delete_mood_history(self, user_id: str) -> bool:
        """Delete all mood entries for a user."""
        try:
            result = await self.db.mood_history.delete_many({"user_id": ObjectId(user_id)})
            logger.info(f"Deleted {result.deleted_count} mood entries for user {user_id}")
            return result.deleted_count > 0
        except Exception as e:
            logger.error(f"Error deleting mood history: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to delete mood history") 