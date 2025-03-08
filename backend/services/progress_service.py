import logging
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from fastapi import HTTPException
from bson import ObjectId
from database import get_database

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ProgressService:
    def __init__(self):
        self.db = get_database()
        self.progress_collection = self.db.progress
        self.category_progress_collection = self.db.category_progress
        logger.info("ProgressService initialized")

    async def save_progress(self, progress_data: dict) -> dict:
        """
        Save user progress for exercises, meditation, or mindfulness activities.
        """
        try:
            # Validate required fields
            required_fields = ['user_id', 'type', 'category', 'duration']
            missing_fields = [field for field in required_fields if field not in progress_data]
            if missing_fields:
                logger.error(f"Missing required fields: {missing_fields}")
                raise HTTPException(
                    status_code=422,
                    detail=f"Missing required fields: {', '.join(missing_fields)}"
                )

            # Convert user_id to ObjectId
            try:
                user_id_obj = ObjectId(progress_data['user_id'])
            except Exception as e:
                logger.error(f"Invalid user_id format: {progress_data['user_id']}")
                raise HTTPException(
                    status_code=422,
                    detail=f"Invalid user_id format: {str(e)}"
                )

            # Validate type
            valid_types = ['exercise', 'meditation', 'mindfulness']
            if progress_data['type'] not in valid_types:
                logger.error(f"Invalid type: {progress_data['type']}")
                raise HTTPException(
                    status_code=422,
                    detail=f"Invalid type. Must be one of: {', '.join(valid_types)}"
                )

            # Ensure duration is non-negative
            try:
                duration = max(0, float(progress_data.get('duration', 0)))
            except (ValueError, TypeError):
                logger.error(f"Invalid duration value: {progress_data.get('duration')}")
                raise HTTPException(
                    status_code=422,
                    detail="Invalid duration value"
                )

            # Prepare progress entry
            progress_entry = {
                'user_id': user_id_obj,
                'type': progress_data['type'],
                'category': progress_data['category'],
                'duration': duration,
                'timestamp': progress_data.get('timestamp', datetime.now().isoformat()),
            }

            if 'exercise_id' in progress_data:
                progress_entry['exercise_id'] = progress_data['exercise_id']

            # Insert progress entry
            result = await self.progress_collection.insert_one(progress_entry)
            if not result.inserted_id:
                logger.error("Failed to insert progress entry")
                raise HTTPException(
                    status_code=500,
                    detail="Failed to save progress entry"
                )

            # Update category progress
            await self._update_category_progress(
                user_id_obj,
                progress_data['category'],
                duration,
                progress_entry['timestamp']
            )

            logger.info(f"Progress saved successfully: {result.inserted_id}")
            return {
                "status": "success",
                "message": "Progress saved successfully",
                "progress_id": str(result.inserted_id),
                "type": progress_entry['type'],
                "category": progress_entry['category'],
                "duration": progress_entry['duration']
            }

        except HTTPException as e:
            logger.error(f"HTTP error in save_progress: {str(e)}")
            raise e
        except Exception as e:
            logger.error(f"Error in save_progress: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to save progress: {str(e)}"
            )

    async def _update_category_progress(self, user_id: ObjectId, category: str, duration: float, timestamp: str):
        """Update the category progress collection with the new progress entry."""
        try:
            logger.info(f"Updating category progress for user {user_id}, category {category}")
            
            # Find existing category progress
            category_progress = await self.category_progress_collection.find_one({
                "user_id": user_id,
                "category": category
            })

            logger.info(f"Existing category progress found: {category_progress is not None}")

            if category_progress:
                # Update existing category progress
                update_result = await self.category_progress_collection.update_one(
                    {"_id": category_progress["_id"]},
                    {
                        "$inc": {
                            "total_sessions": 1,
                            "total_minutes": duration
                        },
                        "$set": {
                            "last_session": timestamp
                        }
                    }
                )
                logger.info(f"Updated existing category progress. Modified count: {update_result.modified_count}")
            else:
                # Create new category progress
                insert_result = await self.category_progress_collection.insert_one({
                    "user_id": user_id,
                    "category": category,
                    "total_sessions": 1,
                    "total_minutes": duration,
                    "last_session": timestamp
                })
                logger.info(f"Created new category progress with ID: {insert_result.inserted_id}")

            # Verify the update
            updated_progress = await self.category_progress_collection.find_one({
                "user_id": user_id,
                "category": category
            })
            logger.info(f"Verified category progress after update: {updated_progress}")

        except Exception as e:
            logger.error(f"Error updating category progress: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to update category progress: {str(e)}"
            )

    async def get_progress(self, user_id: str) -> Dict[str, Any]:
        try:
            # Convert string user_id to ObjectId
            user_id_obj = ObjectId(user_id)
            logger.info(f"Getting progress for user: {user_id}")

            # Get all category progress for the user
            categories = await self.category_progress_collection.find({
                "user_id": user_id_obj
            }).to_list(None)
            
            logger.info(f"Found {len(categories)} categories for user {user_id}")
            
            # Calculate totals
            total_sessions = sum(cat.get("total_sessions", 0) for cat in categories)
            total_minutes = sum(cat.get("total_minutes", 0) for cat in categories)
            
            # Format categories for frontend
            formatted_categories = [{
                "category": cat["category"],
                "totalSessions": cat.get("total_sessions", 0),
                "totalMinutes": cat.get("total_minutes", 0),
                "lastSession": cat.get("last_session")
            } for cat in categories]
            
            logger.info(f"Progress data for user {user_id}: {total_sessions} sessions, {total_minutes} minutes")
            return {
                "categories": formatted_categories,
                "total_sessions": total_sessions,
                "total_minutes": total_minutes
            }
            
        except Exception as e:
            logger.error(f"Error getting overall progress for user {user_id}: {str(e)}")
            raise

    async def _get_weekly_progress(self, entries: List[dict]) -> List[dict]:
        """Calculate weekly progress statistics."""
        if not entries:
            return []

        # Sort entries by timestamp
        sorted_entries = sorted(entries, key=lambda x: x.get("timestamp", datetime.min))
        
        # Group entries by week
        weekly_data = []
        current_week = None
        week_entries = []
        
        for entry in sorted_entries:
            entry_date = entry.get("timestamp", datetime.min)
            week_start = entry_date - timedelta(days=entry_date.weekday())
            
            if current_week != week_start:
                if week_entries:
                    weekly_data.append(self._calculate_week_stats(week_entries))
                current_week = week_start
                week_entries = []
            
            week_entries.append(entry)
        
        if week_entries:
            weekly_data.append(self._calculate_week_stats(week_entries))
        
        return weekly_data

    def _calculate_week_stats(self, week_entries: List[dict]) -> dict:
        """Calculate statistics for a week's worth of entries."""
        total_sessions = len(week_entries)
        total_minutes = sum(entry.get("duration", 0) for entry in week_entries)
        avg_engagement = sum(entry.get("engagement_level", 0) for entry in week_entries) / total_sessions if total_sessions > 0 else 0
        
        mood_improvements = []
        for entry in week_entries:
            if entry.get("mood_before") and entry.get("mood_after"):
                mood_improvements.append(entry["mood_after"] - entry["mood_before"])
        
        return {
            "week_start": week_entries[0].get("timestamp", datetime.min).isoformat(),
            "total_sessions": total_sessions,
            "total_minutes": total_minutes,
            "average_engagement": avg_engagement,
            "mood_improvements": len(mood_improvements),
            "average_mood_improvement": sum(mood_improvements) / len(mood_improvements) if mood_improvements else 0
        }

    async def get_child_progress(self, child_id: str) -> Dict:
        """Get progress data for a specific child."""
        try:
            # Get all progress entries for the child
            progress_entries = await self.db.progress.find({
                "user_id": ObjectId(child_id)
            }).to_list(None)

            if not progress_entries:
                return {
                    "totalSessions": 0,
                    "totalMinutes": 0,
                    "categoriesUsed": 0,
                    "lastSession": None
                }

            # Calculate statistics
            total_sessions = len(progress_entries)
            total_minutes = sum(entry.get("duration", 0) for entry in progress_entries)
            categories_used = len(set(entry.get("category") for entry in progress_entries))
            last_session = max(
                (entry.get("timestamp") for entry in progress_entries),
                default=None
            )

            return {
                "totalSessions": total_sessions,
                "totalMinutes": total_minutes,
                "categoriesUsed": categories_used,
                "lastSession": last_session
            }
        except Exception as e:
            logger.error(f"Error getting child progress: {str(e)}")
            raise

    async def get_child_category_stats(self, child_id: str, category: str) -> Dict:
        """Get category-specific progress for a child."""
        try:
            entries = await self.db.progress.find({
                "user_id": ObjectId(child_id),
                "category": category
            }).to_list(None)

            if not entries:
                return {
                    "totalSessions": 0,
                    "totalMinutes": 0,
                    "lastSession": None
                }

            total_sessions = len(entries)
            total_minutes = sum(entry.get("duration", 0) for entry in entries)
            last_session = max(
                (entry.get("timestamp") for entry in entries),
                default=None
            )

            return {
                "totalSessions": total_sessions,
                "totalMinutes": total_minutes,
                "lastSession": last_session
            }
        except Exception as e:
            logger.error(f"Error getting child category stats: {str(e)}")
            raise

    async def get_child_mood_history(self, child_id: str) -> List[Dict]:
        """Get mood history for a specific child."""
        try:
            entries = await self.db.mood_entries.find({
                "user_id": ObjectId(child_id)
            }).sort("timestamp", -1).to_list(None)
            return entries
        except Exception as e:
            logger.error(f"Error getting child mood history: {str(e)}")
            raise

    async def get_progress_by_category(self, user_id: str, category: str) -> Dict[str, Any]:
        """Get category-specific progress for a user."""
        try:
            # Validate inputs
            if not user_id or not category:
                logger.error(f"Invalid input - user_id: {user_id}, category: {category}")
                return {
                    "total_sessions": 0,
                    "total_minutes": 0,
                    "last_session": None
                }

            # Convert string user_id to ObjectId
            try:
                user_id_obj = ObjectId(user_id)
            except Exception as e:
                logger.error(f"Invalid user_id format: {user_id}, error: {str(e)}")
                return {
                    "total_sessions": 0,
                    "total_minutes": 0,
                    "last_session": None
                }

            logger.info(f"Getting progress for category {category} and user: {user_id}")
            
            # Find category progress
            try:
                category_progress = await self.category_progress_collection.find_one({
                    "user_id": user_id_obj,
                    "category": category
                })
                logger.info(f"Found category progress: {category_progress}")
            except Exception as e:
                logger.error(f"Database error while fetching category progress: {str(e)}")
                return {
                    "total_sessions": 0,
                    "total_minutes": 0,
                    "last_session": None
                }
            
            if not category_progress:
                logger.info(f"No progress found for user {user_id} in category {category}")
                return {
                    "total_sessions": 0,
                    "total_minutes": 0,
                    "last_session": None
                }
                
            result = {
                "total_sessions": category_progress.get("total_sessions", 0),
                "total_minutes": category_progress.get("total_minutes", 0),
                "last_session": category_progress.get("last_session")
            }
            logger.info(f"Returning progress data: {result}")
            return result
            
        except Exception as e:
            logger.error(f"Error getting progress for user {user_id} and category {category}: {str(e)}", exc_info=True)
            return {
                "total_sessions": 0,
                "total_minutes": 0,
                "last_session": None
            } 