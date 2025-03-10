from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta
import os
import logging
from langchain_groq import ChatGroq
from langchain.schema import HumanMessage, SystemMessage
from dotenv import load_dotenv
from services.auth_service import AuthService
from services.mood_service import MoodService
from services.chat_service import ChatService
from models import UserCreate, MoodEntry, UserLogin
from database import connect_to_mongo, close_mongo_connection, get_database
from bson import ObjectId
from passlib.context import CryptContext
from services.progress_service import ProgressService
from services.achievement_service import AchievementService
from services.exercise_service import ExerciseService

# Enhanced logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv(override=True)
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key")

# Initialize services
auth_service = None
mood_service = None
chat_service = None
progress_service = None
achievement_service = None
exercise_service = None

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
    expose_headers=["*"]
)

# Service dependencies
async def get_auth_service() -> AuthService:
    if auth_service is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication service not initialized"
        )
    return auth_service

async def get_mood_service() -> MoodService:
    if mood_service is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Mood service not initialized"
        )
    return mood_service

async def get_chat_service() -> ChatService:
    if chat_service is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Chat service not initialized"
        )
    return chat_service

async def get_progress_service() -> ProgressService:
    if progress_service is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Progress service not initialized"
        )
    return progress_service

async def get_achievement_service() -> AchievementService:
    if achievement_service is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Achievement service not initialized"
        )
    return achievement_service

async def get_exercise_service() -> ExerciseService:
    if exercise_service is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Exercise service not initialized"
        )
    return exercise_service

@app.on_event("startup")
async def startup_db_client():
    """Initialize database connection and services on startup."""
    try:
        # Connect to MongoDB first
        await connect_to_mongo()
        
        # Initialize services after database connection
        global auth_service, mood_service, chat_service, progress_service, achievement_service, exercise_service
        auth_service = AuthService()
        mood_service = MoodService()
        chat_service = ChatService(GROQ_API_KEY)
        progress_service = ProgressService()
        achievement_service = AchievementService()
        exercise_service = ExerciseService()
        
        logger.info("Database connection and services initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize application: {str(e)}")
        # Close any partial connections
        await close_mongo_connection()
        raise

@app.on_event("shutdown")
async def shutdown_db_client():
    """Close database connection on shutdown."""
    try:
        await close_mongo_connection()
        logger.info("Database connection closed successfully")
    except Exception as e:
        logger.error(f"Error during shutdown: {str(e)}")

# Models
class UserLogin(BaseModel):
    email: str
    password: str
    user_type: str

class UserCreate(BaseModel):
    email: str
    password: str
    name: str
    last_name: str
    user_type: str
    child_email: Optional[str] = None

class ChatRequest(BaseModel):
    text: str

class MoodEntry(BaseModel):
    mood: str
    note: Optional[str]
    timestamp: datetime

class Resource(BaseModel):
    id: str
    title: str
    description: str
    type: str
    duration: Optional[int]
    content: Optional[str]

class Doctor(BaseModel):
    name: str
    specialty: str
    phone: str
    email: str

# Add User model
class User(BaseModel):
    id: str
    email: str
    name: str
    user_type: str
    linked_children: Optional[List[str]] = []

# Mock database (replace with real database in production)
mood_entries = []
resources = [
    {
        "id": "1",
        "title": "Basic Meditation",
        "description": "A simple meditation exercise for beginners",
        "type": "meditation",
        "duration": 10,
    },
    {
        "id": "2",
        "title": "Deep Breathing",
        "description": "Learn deep breathing techniques for stress relief",
        "type": "breathing",
        "duration": 5,
    },
]

emergency_contacts = [
    {
        "name": "Dr. Sarah Johnson",
        "specialty": "Psychiatrist",
        "phone": "+1-555-0123",
        "email": "sarah.johnson@example.com"
    },
    {
        "name": "Dr. Michael Chen",
        "specialty": "Clinical Psychologist",
        "phone": "+1-555-0124",
        "email": "michael.chen@example.com"
    },
    {
        "name": "Dr. Emily Williams",
        "specialty": "Mental Health Specialist",
        "phone": "+1-555-0125",
        "email": "emily.williams@example.com"
    }
]

@app.get("/test")
async def test_endpoint():
    return {"status": "ok", "message": "Backend server is running"}

@app.post("/chat")
async def chat(
    request: ChatRequest,
    token: str = Depends(oauth2_scheme),
    auth_service: AuthService = Depends(get_auth_service),
    chat_service: ChatService = Depends(get_chat_service)
):
    try:
        # Get current user from token
        current_user = await auth_service.get_current_user(token)
        if not current_user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Get response from chat service
        response = await chat_service.get_response(
            user_id=str(current_user.id),
            message=request.text,
            user_type=current_user.user_type
        )

        return {"response": response}

    except HTTPException as e:
        logger.error(f"HTTP error in chat: {str(e.detail)}")
        raise
    except Exception as e:
        logger.error(f"Error in chat: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process chat message: {str(e)}"
        )

@app.post("/chat/public")
async def public_chat(request: ChatRequest, chat_service: ChatService = Depends(get_chat_service)):
    try:
        response = await chat_service.public_chat(request.text)
        return {"response": response}
    except Exception as e:
        logger.error(f"Error in public chat: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process public chat message: {str(e)}"
        )

@app.post("/chat/mood")
async def mood_chat(
    request: ChatRequest,
    token: str = Depends(oauth2_scheme),
    auth_service: AuthService = Depends(get_auth_service),
    chat_service: ChatService = Depends(get_chat_service),
    mood_service: MoodService = Depends(get_mood_service)
):
    try:
        user_id = await auth_service.get_current_user(token)
        
        # Get user's latest mood
        mood_history = await mood_service.get_mood_history(user_id, limit=1)
        if not mood_history:
            raise HTTPException(status_code=404, detail="No mood entry found")
            
        latest_mood = mood_history[0]
        
        # Enhance chat message with mood context
        enhanced_message = f"Current mood: {latest_mood['mood']}. {request.text}"
        
        # Get response from chat service
        response = await chat_service.get_response(
            user_id=user_id,
            message=enhanced_message,
            user_type="student"  # Mood chat is always for students
        )
        
        return {
            "response": response,
            "mood_context": {
                "mood": latest_mood["mood"],
                "timestamp": latest_mood["timestamp"].isoformat()
            }
        }
        
    except HTTPException as e:
        logger.error(f"HTTP error in mood chat: {str(e.detail)}")
        raise
    except Exception as e:
        logger.error(f"Error in mood chat: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process mood chat message: {str(e)}"
        )

@app.post("/auth/signup")
async def signup(user_data: UserCreate, auth_service: AuthService = Depends(get_auth_service)):
    try:
        logger.info(f"Received signup request for email: {user_data.email}")

        # Validate user type
        if user_data.user_type not in ['parent', 'student']:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Invalid user type. Must be either 'parent' or 'student'"
            )

        # Additional validation for parent signup
        if user_data.user_type == 'parent':
            if not user_data.child_email:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Child email is required for parent signup"
                )
            
            # Check if child email exists and is a student account
            child = await auth_service.get_user_by_email(user_data.child_email)
            if not child:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Child account with email {user_data.child_email} not found"
                )
            if child.get('user_type') != 'student':
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="The provided email does not belong to a student account"
                )
        
        # Create user
        user = await auth_service.create_user(user_data)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create user"
            )

        # Create access token
        access_token = auth_service.create_access_token(
            data={"user_id": str(user["_id"])}
        )

        logger.info(f"Successfully created user: {user['email']}")
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": str(user["_id"]),
                "email": user["email"],
                "name": user["name"],
                "user_type": user["user_type"],
                "linked_children": user.get("linked_children", [])
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected signup error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@app.post("/auth/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    try:
        if not auth_service:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Authentication service not initialized"
            )

        # Extract email and user type from username (format: email:user_type)
        try:
            email, user_type = form_data.username.split(':')
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username should be in format email:user_type"
            )
        
        # Log login attempt
        logger.info(f"Login attempt for {email} ({user_type})")
        
        # Authenticate user
        user = await auth_service.authenticate_user(email.strip(), form_data.password, user_type)
        if not user:
            logger.warning(f"Authentication failed for {email} ({user_type})")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email, password, or user type",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Create access and refresh tokens
        access_token = auth_service.create_access_token(
            data={"user_id": user.id}
        )
        refresh_token = auth_service.create_refresh_token(
            data={"user_id": user.id}
        )

        # Get user's linked children if they exist
        linked_children = user.linked_children if hasattr(user, 'linked_children') else []

        logger.info(f"Login successful for {email} ({user_type})")
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "email": user.email,
                "name": user.name,
                "last_name": user.last_name,
                "user_type": user.user_type,
                "linked_children": linked_children
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed: {str(e)}"
        )

@app.get("/auth/test")
async def test_auth(token: str = Depends(oauth2_scheme)):
    try:
        user_id = await auth_service.get_current_user(token)
        user = await auth_service.get_user_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return {
            "message": "Authentication successful",
            "user": {
                "id": str(user["_id"]),
                "name": user["name"],
                "email": user["email"],
                "user_type": user["user_type"]
            }
        }
    except Exception as e:
        logger.error(f"Authentication test failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=401, detail="Authentication failed")

@app.post("/mood")
async def save_mood(
    mood_data: dict,
    token: str = Depends(oauth2_scheme),
    auth_service: AuthService = Depends(get_auth_service),
    mood_service: MoodService = Depends(get_mood_service)
):
    try:
        # Get current user from token
        current_user = await auth_service.get_current_user(token)
        if not current_user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Validate required fields
        if not mood_data.get("mood"):
            raise HTTPException(status_code=400, detail="Mood is required")

        # Save mood entry using user ID
        saved_entry = await mood_service.save_mood_entry(str(current_user.id), mood_data)
        return saved_entry

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error saving mood: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/mood/history")
async def get_mood_history(
    token: str = Depends(oauth2_scheme),
    auth_service: AuthService = Depends(get_auth_service),
    mood_service: MoodService = Depends(get_mood_service)
):
    try:
        # Get current user from token
        current_user = await auth_service.get_current_user(token)
        if not current_user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Get user ID as string
        user_id = str(current_user.id)
        logger.info(f"Fetching mood history for user ID: {user_id}")
        
        # Get mood history
        history = await mood_service.get_mood_history(user_id)
        logger.info(f"Retrieved {len(history)} mood entries")
        return history
    except Exception as e:
        logger.error(f"Error getting mood history: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get mood history")

@app.get("/resources")
async def get_resources(type: Optional[str] = None):
    try:
        if type:
            filtered_resources = [r for r in resources if r["type"] == type]
            return {"resources": filtered_resources}
        return {"resources": resources}
    except Exception as e:
        logger.error(f"Error getting resources: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/resources/{resource_id}")
async def get_resource(resource_id: str):
    try:
        resource = next((r for r in resources if r["id"] == resource_id), None)
        if not resource:
            raise HTTPException(status_code=404, detail="Resource not found")
        return resource
    except Exception as e:
        logger.error(f"Error getting resource: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/emergency-contacts")
async def get_emergency_contacts():
    try:
        return {"contacts": emergency_contacts}
    except Exception as e:
        logger.error(f"Error getting emergency contacts: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/parent/{parent_id}/children")
async def get_children_progress(
    parent_id: str,
    auth_service: AuthService = Depends(get_auth_service),
    mood_service: MoodService = Depends(get_mood_service)
):
    try:
        # Get parent user
        parent = await auth_service.get_user_by_id(parent_id)
        if not parent or parent["user_type"] != "parent":
            raise HTTPException(status_code=404, detail="Parent not found")
        
        children_data = []
        for child_id in parent.get("linked_children", []):
            child = await auth_service.get_user_by_id(child_id)
            if child:
                # Get child's mood history
                mood_history = await mood_service.get_child_mood_history(str(child_id))
                
                # Get child's achievements
                db = get_database()
                achievements = await db.achievements.find({"user_id": ObjectId(child_id)}).to_list(None)
                
                # Calculate stats
                total_sessions = sum(1 for a in achievements if a.get("type") == "session")
                total_minutes = sum(a.get("duration", 0) for a in achievements)
                categories_used = len(set(a.get("category") for a in achievements))
                last_session = max((a.get("timestamp") for a in achievements if a.get("timestamp")), default=None)
                
                children_data.append({
                    "id": str(child["_id"]),
                    "name": f"{child['name']} {child['last_name']}",
                    "email": child["email"],
                    "mood_history": mood_history,
                    "stats": {
                        "totalSessions": total_sessions,
                        "totalMinutes": total_minutes,
                        "categoriesUsed": categories_used,
                        "lastSession": last_session
                    }
                })
        
        return {"children": children_data}
    except Exception as e:
        logger.error(f"Error getting children progress: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch children's progress")

@app.get("/auth/me")
async def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        user_id = await auth_service.get_current_user(token)
        user = await auth_service.get_user_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return {
            "id": str(user["_id"]),
            "email": user["email"],
            "name": user["name"],
            "user_type": user["user_type"],
            "linked_children": user.get("linked_children", [])
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail="Could not validate credentials")

@app.get("/users/linked-children")
async def get_linked_children(
    token: str = Depends(oauth2_scheme),
    auth_service: AuthService = Depends(get_auth_service)
):
    try:
        # Get current user from token
        logger.info("Starting get_linked_children endpoint")
        current_user = await auth_service.get_current_user(token)
        logger.info(f"Current user from token: {current_user}")
        
        if not current_user:
            logger.error("No current user found from token")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Check if user is a parent
        if current_user.user_type != "parent":
            logger.error(f"User {current_user.email} is not a parent")
            raise HTTPException(status_code=403, detail="Only parents can access linked children")
        
        logger.info(f"Fetching linked children for parent: {current_user.email}")
        
        children = []
        for child_id in current_user.linked_children or []:
            try:
                # Convert ObjectId to string if needed
                child_id_str = str(child_id) if isinstance(child_id, ObjectId) else child_id
                logger.info(f"Fetching child with ID: {child_id_str}")
                
                child = await auth_service.get_user_by_id(child_id_str)
                if child:
                    logger.info(f"Found child: {child.email}")
                    children.append({
                        "id": str(child.id),
                        "name": f"{child.name} {child.last_name}",
                        "email": child.email
                    })
                else:
                    logger.warning(f"Child not found for ID: {child_id_str}")
            except Exception as child_error:
                logger.error(f"Error fetching child {child_id}: {str(child_error)}")
                continue
        
        logger.info(f"Returning {len(children)} linked children")
        return {"children": children}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting linked children: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch linked children: {str(e)}"
        )

@app.get("/parent/child/{child_id}/mood/history")
async def get_child_mood_history(
    child_id: str,
    token: str = Depends(oauth2_scheme),
    auth_service: AuthService = Depends(get_auth_service),
    mood_service: MoodService = Depends(get_mood_service)
):
    """Get mood history for a child."""
    try:
        # Get current user from token
        current_user = await auth_service.get_current_user(token)
        if not current_user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Verify user is a parent
        if current_user.user_type != "parent":
            raise HTTPException(
                status_code=403,
                detail="Only parents can access child mood history"
            )
        
        # Verify child is linked to parent
        child_id_str = str(child_id)
        if child_id_str not in [str(child_id) for child_id in current_user.linked_children]:
            raise HTTPException(
                status_code=403,
                detail="Child not linked to parent"
            )
        
        # Get child's mood history
        logger.info(f"Fetching mood history for child: {child_id_str}")
        entries = await mood_service.get_child_mood_history(child_id_str)
        logger.info(f"Found {len(entries)} mood entries for child")
        return entries
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting child mood history: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to get child mood history"
        )

@app.get("/parent/child/{child_id}/achievements")
async def get_child_achievements(
    child_id: str,
    token: str = Depends(oauth2_scheme),
    auth_service: AuthService = Depends(get_auth_service),
    achievement_service: AchievementService = Depends(get_achievement_service)
):
    """Get achievements for a child."""
    try:
        # Get current user from token
        current_user = await auth_service.get_current_user(token)
        if not current_user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Verify user is a parent
        if current_user.user_type != "parent":
            raise HTTPException(
                status_code=403,
                detail="Only parents can access child achievements"
            )
        
        # Verify child is linked to parent
        child_id_str = str(child_id)
        if child_id_str not in [str(child_id) for child_id in current_user.linked_children]:
            raise HTTPException(
                status_code=403,
                detail="Child not linked to parent"
            )
        
        # Get achievements using the achievement service
        achievements = await achievement_service.get_child_achievements(child_id)
        
        # Calculate statistics
        stats = {
            "total_sessions": len(achievements),
            "total_minutes": sum(achievement.get("duration", 0) for achievement in achievements),
            "categories_used": list(set(achievement.get("category") for achievement in achievements)),
            "last_session": achievements[0].get("timestamp") if achievements else None
        }
        
        return {
            "achievements": achievements,
            "stats": stats
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting child achievements: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to get child achievements"
        )

@app.get("/parent/child/{child_id}/category/{category}")
async def get_child_category_stats(
    child_id: str,
    category: str,
    auth: AuthService = Depends(get_auth_service)
):
    try:
        current_user = await auth.get_current_user()
        # Verify parent has access to this child
        parent = await auth.get_user_by_id(current_user)
        if not parent or parent["user_type"] != "parent" or child_id not in parent.get("linked_children", []):
            raise HTTPException(status_code=403, detail="Not authorized to access this child's data")
        
        db = get_database()
        achievements = await db.achievements.find({
            "user_id": ObjectId(child_id),
            "category": category
        }).to_list(None)
        
        return {
            "totalSessions": sum(1 for a in achievements if a.get("type") == "session"),
            "totalMinutes": sum(a.get("duration", 0) for a in achievements),
            "lastSession": max((a.get("timestamp") for a in achievements if a.get("timestamp")), default=None)
        }
    except Exception as e:
        logger.error(f"Error getting child category stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch child's category statistics")

# Add new endpoint for therapeutic exercises
@app.get("/therapeutic-exercises")
async def get_therapeutic_exercises(category: Optional[str] = None):
    exercises = {
        "breathing": [
            {
                "id": "box-breathing",
                "name": "Box Breathing",
                "description": "A simple breathing technique to reduce stress and anxiety",
                "steps": [
                    "Inhale for 4 seconds",
                    "Hold for 4 seconds",
                    "Exhale for 4 seconds",
                    "Hold for 4 seconds"
                ],
                "duration": 5,
                "difficulty": "beginner"
            },
            {
                "id": "4-7-8-breathing",
                "name": "4-7-8 Breathing",
                "description": "A calming breathing exercise for better sleep and anxiety relief",
                "steps": [
                    "Inhale through nose for 4 seconds",
                    "Hold breath for 7 seconds",
                    "Exhale through mouth for 8 seconds"
                ],
                "duration": 10,
                "difficulty": "intermediate"
            }
        ],
        "mindfulness": [
            {
                "id": "body-scan",
                "name": "Body Scan Meditation",
                "description": "A mindfulness exercise to reduce tension and stress",
                "steps": [
                    "Find a comfortable position",
                    "Focus on your breath",
                    "Slowly scan your body from toes to head",
                    "Notice any sensations without judgment"
                ],
                "duration": 15,
                "difficulty": "beginner"
            }
        ],
        "cbt": [
            {
                "id": "thought-record",
                "name": "Thought Record Exercise",
                "description": "A CBT technique to identify and challenge negative thoughts",
                "steps": [
                    "Identify the situation",
                    "Note your automatic thoughts",
                    "Record your emotions",
                    "Challenge your thoughts",
                    "Find balanced thinking"
                ],
                "duration": 20,
                "difficulty": "intermediate"
            }
        ]
    }
    
    if category:
        return {"exercises": exercises.get(category, [])}
    return {"exercises": exercises}

# Add new endpoint for mood tracking insights
@app.get("/mood/insights")
async def get_mood_insights(
    auth: AuthService = Depends(get_auth_service),
    mood: MoodService = Depends(get_mood_service)
):
    try:
        current_user = await auth.get_current_user()
        mood_history = await mood.get_mood_history(current_user)
        
        # Calculate insights
        total_entries = len(mood_history)
        if total_entries == 0:
            return {"message": "No mood entries found"}
            
        mood_counts = {}
        for entry in mood_history:
            mood_counts[entry["mood"]] = mood_counts.get(entry["mood"], 0) + 1
            
        # Calculate most common mood
        most_common_mood = max(mood_counts.items(), key=lambda x: x[1])[0]
        
        # Calculate mood trends
        mood_trend = []
        for entry in mood_history:
            mood_trend.append({
                "date": entry["timestamp"],
                "mood": entry["mood"]
            })
            
        return {
            "total_entries": total_entries,
            "mood_distribution": mood_counts,
            "most_common_mood": most_common_mood,
            "mood_trend": mood_trend,
            "last_updated": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting mood insights: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate mood insights")

# Add new endpoint for personalized recommendations
@app.get("/recommendations")
async def get_personalized_recommendations(
    auth: AuthService = Depends(get_auth_service),
    mood: MoodService = Depends(get_mood_service)
):
    try:
        current_user = await auth.get_current_user()
        mood_history = await mood.get_mood_history(current_user)
        
        if not mood_history:
            return {"message": "No mood history available for recommendations"}
            
        # Get recent mood
        recent_mood = mood_history[-1]["mood"]
        
        # Generate recommendations based on mood
        recommendations = {
            "happy": [
                {
                    "type": "activity",
                    "title": "Gratitude Journal",
                    "description": "Write down three things you're grateful for today",
                    "duration": 10
                },
                {
                    "type": "exercise",
                    "title": "Mindful Walking",
                    "description": "Take a mindful walk in nature",
                    "duration": 20
                }
            ],
            "sad": [
                {
                    "type": "activity",
                    "title": "Self-Compassion Exercise",
                    "description": "Write a compassionate letter to yourself",
                    "duration": 15
                },
                {
                    "type": "exercise",
                    "title": "Gentle Stretching",
                    "description": "Do some gentle stretches to release tension",
                    "duration": 10
                }
            ],
            "anxious": [
                {
                    "type": "activity",
                    "title": "Grounding Exercise",
                    "description": "Practice the 5-4-3-2-1 grounding technique",
                    "duration": 5
                },
                {
                    "type": "exercise",
                    "title": "Deep Breathing",
                    "description": "Practice deep breathing exercises",
                    "duration": 10
                }
            ],
            "angry": [
                {
                    "type": "activity",
                    "title": "Emotion Journal",
                    "description": "Write about your feelings in a journal",
                    "duration": 15
                },
                {
                    "type": "exercise",
                    "title": "Progressive Muscle Relaxation",
                    "description": "Practice progressive muscle relaxation",
                    "duration": 15
                }
            ]
        }
        
        return {
            "current_mood": recent_mood,
            "recommendations": recommendations.get(recent_mood, []),
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting personalized recommendations: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate recommendations")

# Add progress endpoints
@app.post("/progress")
async def save_progress(
    progress_data: dict,
    token: str = Depends(oauth2_scheme),
    auth_service: AuthService = Depends(get_auth_service),
    progress_service: ProgressService = Depends(get_progress_service)
):
    try:
        # Get current user from token
        current_user = await auth_service.get_current_user(token)
        if not current_user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Log the incoming data
        logger.info(f"Saving progress for user {current_user.id}: {progress_data}")

        # Validate required fields
        if not progress_data.get("type"):
            raise HTTPException(status_code=400, detail="Progress type is required")

        # Save progress entry
        saved_entry = await progress_service.save_progress(progress_data)
        
        # Log success
        logger.info(f"Progress saved successfully: {saved_entry}")
        return saved_entry

    except HTTPException as e:
        logger.error(f"HTTP error in save_progress: {str(e.detail)}")
        raise e
    except Exception as e:
        logger.error(f"Error saving progress: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/progress")
async def get_progress(
    category: Optional[str] = None,
    token: str = Depends(oauth2_scheme),
    auth_service: AuthService = Depends(get_auth_service),
    progress_service: ProgressService = Depends(get_progress_service)
):
    try:
        # Get current user from token
        current_user = await auth_service.get_current_user(token)
        if not current_user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Log the user ID we're using
        user_id = str(current_user.id)
        logger.info(f"Getting progress for user ID: {user_id}")

        # Get progress data
        if category:
            progress_data = await progress_service.get_progress_by_category(user_id, category)
        else:
            progress_data = await progress_service.get_progress(user_id)

        # Log the response
        logger.info(f"Progress data retrieved: {progress_data}")
        return progress_data

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting progress: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/progress/category/{category}")
async def get_progress_by_category(
    category: str,
    userId: Optional[str] = None,
    token: str = Depends(oauth2_scheme),
    auth_service: AuthService = Depends(get_auth_service),
    progress_service: ProgressService = Depends(get_progress_service)
):
    try:
        # Get current user from token
        current_user = await auth_service.get_current_user(token)
        if not current_user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Log the request details
        logger.info(f"Getting progress for category {category}, userId: {userId}, current_user: {current_user.id}")

        # If userId is provided, verify parent access
        target_user_id = userId
        if userId:
            # Get current user's data
            user_data = await auth_service.get_user_by_id(str(current_user.id))
            if not user_data or user_data.get("user_type") != "parent":
                logger.error(f"User {current_user.id} is not a parent")
                raise HTTPException(status_code=403, detail="Only parents can access child progress")
            
            # Convert linked_children to list of strings if they're ObjectIds
            linked_children = [str(child_id) for child_id in user_data.get("linked_children", [])]
            
            # Verify child is linked to parent
            if userId not in linked_children:
                logger.error(f"Child {userId} not linked to parent {current_user.id}")
                raise HTTPException(status_code=403, detail="Not authorized to access this child's progress")
        else:
            target_user_id = str(current_user.id)

        # Get progress data
        logger.info(f"Fetching progress data for user {target_user_id}, category {category}")
        progress_data = await progress_service.get_progress_by_category(target_user_id, category)
        
        # Log the response
        logger.info(f"Progress data retrieved: {progress_data}")
        
        # Return default structure if no data found
        if not progress_data:
            return {
                "total_sessions": 0,
                "total_minutes": 0,
                "last_session": None
            }
            
        return progress_data

    except HTTPException as e:
        logger.error(f"HTTP error in get_progress_by_category: {str(e.detail)}")
        raise
    except Exception as e:
        logger.error(f"Error getting progress by category: {str(e)}", exc_info=True)
        return {
            "total_sessions": 0,
            "total_minutes": 0,
            "last_session": None
        }

@app.get("/progress/child/{child_id}")
async def get_child_progress(
    child_id: str,
    token: str = Depends(oauth2_scheme),
    auth_service: AuthService = Depends(get_auth_service),
    progress_service: ProgressService = Depends(get_progress_service)
):
    """Get progress data for a specific child."""
    try:
        # Get current user from token
        current_user = await auth_service.get_current_user(token)
        if not current_user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Get user data
        user_data = await auth_service.get_user_by_id(current_user)
        if not user_data or user_data["user_type"] != "parent":
            raise HTTPException(status_code=403, detail="Only parents can access child progress")
        
        # Verify child is linked to parent
        child = await auth_service.get_user_by_id(child_id)
        if not child or child_id not in user_data.get("linked_children", []):
            raise HTTPException(status_code=404, detail="Child not found or not linked to parent")

        progress_data = await progress_service.get_child_progress(child_id)
        return progress_data
    except Exception as e:
        logger.error(f"Error getting child progress: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get child progress")

@app.get("/progress/child/{child_id}/category/{category}")
async def get_child_category_stats(
    child_id: str,
    category: str,
    token: str = Depends(oauth2_scheme),
    auth_service: AuthService = Depends(get_auth_service),
    progress_service: ProgressService = Depends(get_progress_service)
):
    """Get category-specific progress for a child."""
    try:
        # Get current user from token
        current_user = await auth_service.get_current_user(token)
        if not current_user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Get user data
        user_data = await auth_service.get_user_by_id(current_user)
        if not user_data or user_data["user_type"] != "parent":
            raise HTTPException(status_code=403, detail="Only parents can access child progress")
        
        # Verify child is linked to parent
        child = await auth_service.get_user_by_id(child_id)
        if not child or child_id not in user_data.get("linked_children", []):
            raise HTTPException(status_code=404, detail="Child not found or not linked to parent")

        stats = await progress_service.get_child_category_stats(child_id, category)
        return stats
    except Exception as e:
        logger.error(f"Error getting child category stats: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get child category stats")

@app.get("/mood/child/{child_id}")
async def get_child_mood_history(
    child_id: str,
    token: str = Depends(oauth2_scheme),
    auth_service: AuthService = Depends(get_auth_service),
    progress_service: ProgressService = Depends(get_progress_service)
):
    """Get mood history for a specific child."""
    try:
        # Get current user from token
        current_user = await auth_service.get_current_user(token)
        if not current_user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Get user data
        user_data = await auth_service.get_user_by_id(current_user)
        if not user_data or user_data["user_type"] != "parent":
            raise HTTPException(status_code=403, detail="Only parents can access child mood history")
        
        # Verify child is linked to parent
        child = await auth_service.get_user_by_id(child_id)
        if not child or child_id not in user_data.get("linked_children", []):
            raise HTTPException(status_code=404, detail="Child not found or not linked to parent")

        entries = await progress_service.get_child_mood_history(child_id)
        return entries
    except Exception as e:
        logger.error(f"Error getting child mood history: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get child mood history")

@app.get("/achievements")
async def get_achievements(
    token: str = Depends(oauth2_scheme),
    auth_service: AuthService = Depends(get_auth_service),
    achievement_service: AchievementService = Depends(get_achievement_service)
):
    try:
        current_user = await auth_service.get_current_user(token)
        if not current_user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        user_id = str(current_user.id)
        logger.info(f"Fetching achievements for user ID: {user_id}")
        
        achievements = await achievement_service.get_user_achievements(user_id)
        logger.info(f"Retrieved {len(achievements)} achievements")
        return achievements
    except Exception as e:
        logger.error(f"Error getting achievements: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get achievements")

@app.get("/exercises")
async def get_exercises(
    token: str = Depends(oauth2_scheme),
    auth_service: AuthService = Depends(get_auth_service),
    exercise_service: ExerciseService = Depends(get_exercise_service)
):
    try:
        current_user = await auth_service.get_current_user(token)
        if not current_user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        user_id = str(current_user.id)
        logger.info(f"Fetching exercises for user ID: {user_id}")
        
        exercises = await exercise_service.get_user_exercises(user_id)
        logger.info(f"Retrieved {len(exercises)} exercises")
        return exercises
    except Exception as e:
        logger.error(f"Error getting exercises: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get exercises")

# Add refresh token endpoint
@app.post("/auth/refresh")
async def refresh_token(
    refresh_data: dict,
    auth_service: AuthService = Depends(get_auth_service)
):
    try:
        refresh_token = refresh_data.get("refresh_token")
        if not refresh_token:
            raise HTTPException(
                status_code=400,
                detail="Refresh token is required"
            )

        # Verify refresh token and get user
        user = await auth_service.verify_refresh_token(refresh_token)
        if not user:
            raise HTTPException(
                status_code=401,
                detail="Invalid refresh token"
            )

        # Create new access token
        access_token = auth_service.create_access_token(
            data={"user_id": str(user.id)}
        )

        return {
            "access_token": access_token,
            "token_type": "bearer"
        }
    except Exception as e:
        logger.error(f"Error refreshing token: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to refresh token"
        )
    
@app.get("/backendHealth")
async def backend_health():
    return {"status": "OK"}

@app.post("/exercises")
async def create_exercise(
    exercise_data: dict,
    token: str = Depends(oauth2_scheme),
    auth_service: AuthService = Depends(get_auth_service),
    exercise_service: ExerciseService = Depends(get_exercise_service)
):
    """Create a new exercise and mark it as completed."""
    try:
        # Get current user from token
        current_user = await auth_service.get_current_user(token)
        if not current_user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Set user_id in exercise data
        exercise_data["user_id"] = str(current_user.id)

        # Create and complete exercise
        exercise, achievements = await exercise_service.create_exercise(
            str(current_user.id),
            exercise_data
        )

        return {
            "exercise": exercise,
            "achievements": achievements,
            "message": "Exercise completed successfully"
        }

    except Exception as e:
        logger.error(f"Error creating exercise: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create exercise: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="debug")