from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import os
import logging
from langchain_groq import ChatGroq
from langchain.schema import HumanMessage, SystemMessage
from dotenv import load_dotenv

# Enhanced logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv(override=True)
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

if not GROQ_API_KEY:
    raise ValueError("GROQ_API_KEY not found")

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Groq client
groq_client = ChatGroq(
    groq_api_key=GROQ_API_KEY,
    model_name="llama-3.3-70b-versatile"
)

# Models
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

@app.get("/test")
async def test():
    return {"status": "ok"}

@app.post("/chat")
async def chat(request: ChatRequest):
    logger.info(f"Received chat request: {request.text}")
    try:
        messages = [
            SystemMessage(content="You are a compassionate mental health chatbot. Help users with their mental well-being."),
            HumanMessage(content=request.text)
        ]
        
        response = groq_client.invoke(messages)
        return {"response": response.content}
    except Exception as e:
        logger.error(f"Error in chat endpoint: {e}")
        return {"error": str(e)}

@app.post("/mood")
async def save_mood(entry: MoodEntry):
    try:
        # Log the incoming mood entry
        logger.info(f"Received mood entry: {entry}")
        
        # Validate the mood
        if not entry.mood:
            raise HTTPException(status_code=400, detail="Mood cannot be empty")
            
        # Convert the mood to lowercase for consistency
        entry_dict = entry.dict()
        entry_dict['mood'] = entry_dict['mood'].lower()
        
        # Add the entry to the mood entries
        mood_entries.append(entry_dict)
        
        # Log the successful save
        logger.info(f"Successfully saved mood entry: {entry_dict}")
        
        return {
            "status": "success",
            "message": "Mood entry saved",
            "data": entry_dict
        }
    except Exception as e:
        logger.error(f"Error saving mood entry: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/mood/history")
async def get_mood_history():
    try:
        return {"entries": mood_entries}
    except Exception as e:
        logger.error(f"Error getting mood history: {e}")
        raise HTTPException(status_code=500, detail=str(e))

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)