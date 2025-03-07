import logging
from datetime import datetime
from typing import Optional, List
from fastapi import HTTPException
from bson import ObjectId
from database import get_database
from langchain_groq import ChatGroq
from langchain.schema import HumanMessage, SystemMessage

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ChatService:
    def __init__(self, api_key: str):
        self.chat = ChatGroq(
            groq_api_key=api_key,
            model_name="mixtral-8x7b-32768",
            temperature=0.7,
            max_tokens=1024
        )
        logger.info("ChatService initialized")

    async def get_response(self, user_id: str, message: str, user_type: str) -> str:
        """Get a response from the chat model."""
        try:
            # Create system message based on user type
            system_message = (
                "You are a supportive mental health assistant. "
                "Provide empathetic, helpful responses while maintaining professional boundaries. "
                "If the user is in crisis, encourage them to seek professional help."
            )

            # Create messages
            messages = [
                SystemMessage(content=system_message),
                HumanMessage(content=message)
            ]

            # Get response from model
            response = await self.chat.ainvoke(messages)
            return response.content

        except Exception as e:
            logger.error(f"Error getting chat response: {str(e)}")
            return "I apologize, but I'm having trouble processing your message. Please try again."

    async def public_chat(self, message: str) -> str:
        """Handle public chat messages."""
        try:
            system_message = (
                "You are a supportive mental health assistant. "
                "Provide general information and support while maintaining professional boundaries. "
                "If the user is in crisis, encourage them to seek professional help."
            )

            messages = [
                SystemMessage(content=system_message),
                HumanMessage(content=message)
            ]

            response = await self.chat.ainvoke(messages)
            return response.content

        except Exception as e:
            logger.error(f"Error in public chat: {str(e)}")
            return "I apologize, but I'm having trouble processing your message. Please try again."

    async def save_chat_message(self, user_id: str, message: str, response: str):
        """Save chat message to database."""
        try:
            chat_doc = {
                "user_id": ObjectId(user_id),
                "message": message,
                "response": response,
                "timestamp": datetime.utcnow()
            }
            await self.db.chat_history.insert_one(chat_doc)
            logger.info(f"Saved chat message for user {user_id}")
        except Exception as e:
            logger.error(f"Error saving chat message: {str(e)}")
            raise

    def _get_system_message(self, user_type: str) -> str:
        """Get appropriate system message based on user type."""
        base_message = "You are a supportive mental health chatbot. Provide empathetic, helpful responses while maintaining appropriate boundaries."
        
        if user_type == "student":
            return base_message + "\nYou are speaking with a student. Focus on providing emotional support, stress management techniques, and academic-related guidance."
        elif user_type == "parent":
            return base_message + "\nYou are speaking with a parent. Focus on providing guidance about supporting their child's mental health and academic well-being."
        else:
            return base_message + "\nYou are speaking with a general user. Provide general mental health support and guidance."

    async def get_chat_history(self, user_id: str, limit: int = 10) -> List[dict]:
        """Get chat history for a user."""
        try:
            cursor = self.db.chat_messages.find(
                {"user_id": ObjectId(user_id)}
            ).sort("timestamp", -1).limit(limit)
            
            messages = []
            async for msg in cursor:
                messages.append({
                    "message": msg["message"],
                    "response": msg["response"],
                    "timestamp": msg["timestamp"]
                })
            
            return list(reversed(messages))  # Return in chronological order
            
        except Exception as e:
            logger.error(f"Error getting chat history: {str(e)}")
            return []

    async def delete_chat_history(self, user_id: str) -> bool:
        """Delete all chat history for a user."""
        try:
            result = await self.db.chat_messages.delete_many(
                {"user_id": ObjectId(user_id)}
            )
            logger.info(f"Deleted {result.deleted_count} messages for user {user_id}")
            return result.deleted_count > 0
        except Exception as e:
            logger.error(f"Error deleting chat history: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail="Failed to delete chat history"
            ) 