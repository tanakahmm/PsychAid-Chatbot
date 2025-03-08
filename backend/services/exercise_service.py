from typing import List, Dict, Any, Tuple
from datetime import datetime
from database import get_database
from .achievement_service import AchievementService
import logging
from bson import ObjectId

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
            # Use provided ID if it exists, otherwise generate a new one
            exercise_id = exercise_data.get("_id") or str(ObjectId())
            
            # Create the exercise document
            exercise = {
                "_id": exercise_id,
                "user_id": user_id,
                "name": exercise_data["name"],
                "category": exercise_data.get("category", "meditation"),
                "duration": exercise_data.get("duration", 0),
                "completed": exercise_data.get("completed", True),
                "timestamp": exercise_data.get("timestamp", datetime.utcnow().isoformat()),
                "description": exercise_data.get("description", ""),
                "difficulty": exercise_data.get("difficulty", "beginner"),
                "steps": exercise_data.get("steps", [])
            }
            
            # Check if exercise already exists
            existing_exercise = await self.exercises_collection.find_one({"_id": exercise_id})
            if existing_exercise:
                # Update existing exercise
                await self.exercises_collection.update_one(
                    {"_id": exercise_id},
                    {"$set": exercise}
                )
                logger.info(f"Updated exercise {exercise_id} for user {user_id}")
            else:
                # Insert new exercise
                await self.exercises_collection.insert_one(exercise)
                logger.info(f"Created exercise {exercise_id} for user {user_id}")
            
            # Check for achievements if exercise is completed
            achievements = []
            if exercise["completed"]:
                try:
                    achievements = await self.achievement_service.check_and_create_achievements(
                        user_id,
                        exercise
                    )
                    logger.info(f"Created {len(achievements)} achievements for exercise {exercise_id}")
                except Exception as e:
                    logger.error(f"Error creating achievements: {str(e)}")
            
            return exercise, achievements
        except Exception as e:
            logger.error(f"Error creating exercise for user {user_id}: {str(e)}")
            raise

    async def get_exercise(self, exercise_id: str) -> Dict[str, Any]:
        try:
            exercise = await self.exercises_collection.find_one({"_id": exercise_id})
            return exercise
        except Exception as e:
            logger.error(f"Error getting exercise {exercise_id}: {str(e)}")
            return None

    async def update_exercise(self, exercise_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            result = await self.exercises_collection.find_one_and_update(
                {"_id": exercise_id},
                {"$set": update_data},
                return_document=True
            )
            return result
        except Exception as e:
            logger.error(f"Error updating exercise {exercise_id}: {str(e)}")
            raise 