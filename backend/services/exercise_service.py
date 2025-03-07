from typing import List, Dict, Any, Tuple
from datetime import datetime
from database import get_database
from .achievement_service import AchievementService
import logging

logger = logging.getLogger(__name__)

class ExerciseService:
    def __init__(self):
        self.db = get_database()
        self.exercises_collection = self.db.exercises
        self.achievement_service = AchievementService()

    async def get_user_exercises(self, user_id: str) -> List[Dict[str, Any]]:
        try:
            exercises = await self.exercises_collection.find(
                {"user_id": user_id}
            ).sort("timestamp", -1).to_list(length=None)
            
            return exercises
        except Exception as e:
            logger.error(f"Error getting exercises for user {user_id}: {str(e)}")
            return []

    async def create_exercise(self, user_id: str, exercise_data: Dict[str, Any]) -> Tuple[Dict[str, Any], List[Dict[str, Any]]]:
        try:
            exercise = {
                "_id": exercise_data["_id"],  # Use the provided ID
                "user_id": user_id,
                "name": exercise_data["name"],
                "category": exercise_data["category"],
                "duration": exercise_data.get("duration", 0),
                "completed": exercise_data.get("completed", False),
                "timestamp": datetime.utcnow().isoformat()
            }
            
            await self.exercises_collection.insert_one(exercise)
            
            # Check for achievements if exercise is completed
            achievements = []
            if exercise.get("completed"):
                achievements = await self.achievement_service.check_and_create_achievements(
                    user_id,
                    exercise
                )
            
            return exercise, achievements
        except Exception as e:
            logger.error(f"Error creating exercise for user {user_id}: {str(e)}")
            raise

    async def complete_exercise(self, user_id: str, exercise_id: str) -> Tuple[Dict[str, Any], List[Dict[str, Any]]]:
        try:
            # Update exercise
            result = await self.exercises_collection.find_one_and_update(
                {"_id": exercise_id, "user_id": user_id},
                {"$set": {"completed": True}},
                return_document=True
            )
            
            if not result:
                raise Exception("Exercise not found or not owned by user")
            
            # Check for achievements
            achievements = await self.achievement_service.check_and_create_achievements(
                user_id,
                result
            )
            
            return result, achievements
        except Exception as e:
            logger.error(f"Error completing exercise {exercise_id} for user {user_id}: {str(e)}")
            raise 