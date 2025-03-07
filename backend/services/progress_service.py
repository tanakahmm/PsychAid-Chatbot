import logging
from datetime import datetime, timedelta
from typing import List, Optional, Dict
from fastapi import HTTPException
from bson import ObjectId
from database import get_database

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ProgressService:
    def __init__(self):
        self.db = get_database()
        logger.info("ProgressService initialized")

    async def save_progress(self, user_id: str, progress_data: dict) -> dict:
        """Save progress data for therapy activities."""
        try:
            # Create progress document with enhanced mental health metrics
            progress_doc = {
                "user_id": ObjectId(user_id),
                "type": progress_data["type"],
                "category": progress_data.get("category", "general"),
                "duration": progress_data.get("duration", 0),
                "mood_before": progress_data.get("mood_before"),
                "mood_after": progress_data.get("mood_after"),
                "engagement_level": progress_data.get("engagement_level", 0),  # 1-5 scale
                "notes": progress_data.get("notes", ""),
                "timestamp": datetime.utcnow()
            }
            
            # Insert into database
            result = await self.db.progress.insert_one(progress_doc)
            
            # Convert ObjectId to string for response
            response_doc = {
                "_id": str(result.inserted_id),
                "user_id": str(user_id),
                **progress_doc,
                "timestamp": progress_doc["timestamp"].isoformat()
            }
            
            logger.info(f"Saved progress for user {user_id}")
            return response_doc
            
        except Exception as e:
            logger.error(f"Error saving progress: {str(e)}")
            raise

    async def get_progress(self, user_id: str, category: Optional[str] = None) -> dict:
        """Get comprehensive progress statistics for a user."""
        try:
            query = {"user_id": ObjectId(user_id)}
            if category:
                query["category"] = category

            # Get all progress entries
            cursor = self.db.progress.find(query)
            entries = await cursor.to_list(None)

            # Calculate basic statistics
            total_sessions = len(entries)
            total_minutes = sum(entry.get("duration", 0) for entry in entries)
            categories_used = len(set(entry.get("category", "general") for entry in entries))
            
            # Calculate mood improvement statistics
            mood_improvements = []
            for entry in entries:
                if entry.get("mood_before") and entry.get("mood_after"):
                    mood_improvements.append(entry["mood_after"] - entry["mood_before"])
            
            avg_mood_improvement = sum(mood_improvements) / len(mood_improvements) if mood_improvements else 0
            
            # Calculate engagement statistics
            avg_engagement = sum(entry.get("engagement_level", 0) for entry in entries) / total_sessions if total_sessions > 0 else 0
            
            # Get latest session
            latest_session = None
            if entries:
                latest_entry = max(entries, key=lambda x: x.get("timestamp", datetime.min))
                latest_session = {
                    "type": latest_entry.get("type"),
                    "category": latest_entry.get("category"),
                    "duration": latest_entry.get("duration"),
                    "mood_before": latest_entry.get("mood_before"),
                    "mood_after": latest_entry.get("mood_after"),
                    "engagement_level": latest_entry.get("engagement_level"),
                    "notes": latest_entry.get("notes"),
                    "timestamp": latest_entry.get("timestamp").isoformat()
                }

            # Get weekly progress
            weekly_progress = await self._get_weekly_progress(entries)

            return {
                "total_sessions": total_sessions,
                "total_minutes": total_minutes,
                "categories_used": categories_used,
                "latest_session": latest_session,
                "mood_improvement": {
                    "average": avg_mood_improvement,
                    "total_improvements": len(mood_improvements)
                },
                "engagement": {
                    "average": avg_engagement,
                    "total_sessions": total_sessions
                },
                "weekly_progress": weekly_progress
            }

        except Exception as e:
            logger.error(f"Error getting progress: {str(e)}")
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

    async def get_progress_by_category(self, user_id: str, category: str) -> Dict:
        """Get category-specific progress for a user."""
        try:
            entries = await self.db.progress.find({
                "user_id": ObjectId(user_id),
                "category": category
            }).to_list(None)

            if not entries:
                return {
                    "total_sessions": 0,
                    "total_minutes": 0,
                    "last_session": None
                }

            total_sessions = len(entries)
            total_minutes = sum(entry.get("duration", 0) for entry in entries)
            last_session = max(
                (entry.get("timestamp") for entry in entries),
                default=None
            )

            # Convert datetime to ISO format string if it exists
            if last_session:
                last_session = last_session.isoformat()

            return {
                "total_sessions": total_sessions,
                "total_minutes": total_minutes,
                "last_session": last_session
            }
        except Exception as e:
            logger.error(f"Error getting progress by category: {str(e)}")
            raise 