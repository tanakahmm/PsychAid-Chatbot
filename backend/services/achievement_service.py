from typing import List, Dict, Any
from bson import ObjectId
from datetime import datetime
from database import get_database
import logging

logger = logging.getLogger(__name__)

class AchievementService:
    def __init__(self):
        self.db = get_database()
        self.achievements_collection = self.db.achievements

    async def get_user_achievements(self, user_id: str) -> List[Dict[str, Any]]:
        try:
            achievements = await self.achievements_collection.find(
                {"user_id": user_id}
            ).sort("timestamp", -1).to_list(length=None)
            
            # Convert ObjectId to string for JSON serialization
            for achievement in achievements:
                achievement["_id"] = str(achievement["_id"])
                achievement["user_id"] = str(achievement["user_id"])
            
            return achievements
        except Exception as e:
            logger.error(f"Error getting achievements for user {user_id}: {str(e)}")
            return []

    async def create_achievement(self, user_id: str, achievement_data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            achievement = {
                "user_id": ObjectId(user_id),
                "title": achievement_data["title"],
                "description": achievement_data["description"],
                "category": achievement_data["category"],
                "duration": achievement_data.get("duration", 0),
                "timestamp": datetime.utcnow().isoformat(),
                "exerciseId": achievement_data.get("exerciseId")
            }
            
            result = await self.achievements_collection.insert_one(achievement)
            achievement["_id"] = str(result.inserted_id)
            achievement["user_id"] = str(achievement["user_id"])
            
            return achievement
        except Exception as e:
            logger.error(f"Error creating achievement for user {user_id}: {str(e)}")
            raise

    async def check_and_create_achievements(self, user_id: str, exercise_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Check and create achievements based on completed exercises."""
        try:
            category = exercise_data.get("category", "")
            duration = exercise_data.get("duration", 0)
            
            # Get user's existing achievements in this category
            existing_achievements = await self.achievements_collection.find({
                "user_id": ObjectId(user_id),
                "category": category
            }).to_list(length=None)
            
            total_duration = sum(ach.get("duration", 0) for ach in existing_achievements)
            total_sessions = len(existing_achievements)
            
            new_achievements = []
            
            # Category-specific achievements
            if category == "meditation":
                if total_duration == 0:
                    new_achievements.append({
                        "title": "Meditation Beginner",
                        "description": "Completed your first meditation session",
                        "category": category,
                        "duration": duration
                    })
                elif total_duration >= 60 and total_duration - duration < 60:
                    new_achievements.append({
                        "title": "Meditation Explorer",
                        "description": "Completed 1 hour of meditation",
                        "category": category,
                        "duration": duration
                    })
                elif total_duration >= 300 and total_duration - duration < 300:
                    new_achievements.append({
                        "title": "Meditation Master",
                        "description": "Completed 5 hours of meditation",
                        "category": category,
                        "duration": duration
                    })
            
            elif category == "anxiety-management":
                if total_sessions == 0:
                    new_achievements.append({
                        "title": "Anxiety Fighter",
                        "description": "Started your anxiety management journey",
                        "category": category,
                        "duration": duration
                    })
                elif total_sessions >= 5 and total_sessions - 1 < 5:
                    new_achievements.append({
                        "title": "Anxiety Warrior",
                        "description": "Completed 5 anxiety management exercises",
                        "category": category,
                        "duration": duration
                    })
            
            elif category == "sleep-hygiene":
                if total_duration == 0:
                    new_achievements.append({
                        "title": "Sleep Seeker",
                        "description": "Started improving your sleep habits",
                        "category": category,
                        "duration": duration
                    })
                elif total_duration >= 120 and total_duration - duration < 120:
                    new_achievements.append({
                        "title": "Sleep Master",
                        "description": "Completed 2 hours of sleep hygiene exercises",
                        "category": category,
                        "duration": duration
                    })
            
            elif category == "stress-relief":
                if total_sessions == 0:
                    new_achievements.append({
                        "title": "Stress Reliever",
                        "description": "Started managing your stress",
                        "category": category,
                        "duration": duration
                    })
                elif total_sessions >= 10 and total_sessions - 1 < 10:
                    new_achievements.append({
                        "title": "Stress Management Expert",
                        "description": "Completed 10 stress relief exercises",
                        "category": category,
                        "duration": duration
                    })
            
            elif category == "self-care":
                if total_duration == 0:
                    new_achievements.append({
                        "title": "Self-Care Starter",
                        "description": "Started your self-care journey",
                        "category": category,
                        "duration": duration
                    })
                elif total_duration >= 180 and total_duration - duration < 180:
                    new_achievements.append({
                        "title": "Self-Care Champion",
                        "description": "Dedicated 3 hours to self-care",
                        "category": category,
                        "duration": duration
                    })
            
            # Create all new achievements
            created_achievements = []
            for achievement_data in new_achievements:
                achievement_data["exerciseId"] = exercise_data.get("_id")
                created = await self.create_achievement(user_id, achievement_data)
                created_achievements.append(created)
            
            return created_achievements
            
        except Exception as e:
            logger.error(f"Error checking achievements for user {user_id}: {str(e)}")
            return [] 

    async def get_child_achievements(self, child_id: str) -> List[Dict[str, Any]]:
        """Get achievements for a child user."""
        try:
            achievements = await self.achievements_collection.find(
                {"user_id": ObjectId(child_id)}
            ).sort("timestamp", -1).to_list(length=None)
            
            # Convert ObjectId to string for JSON serialization
            for achievement in achievements:
                achievement["_id"] = str(achievement["_id"])
                achievement["user_id"] = str(achievement["user_id"])
            
            logger.info(f"Retrieved {len(achievements)} achievements for child {child_id}")
            return achievements
        except Exception as e:
            logger.error(f"Error getting achievements for child {child_id}: {str(e)}", exc_info=True)
            return [] 