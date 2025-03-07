from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List
from datetime import datetime
from enum import Enum
from bson import ObjectId

class UserType(str, Enum):
    STUDENT = "student"
    PARENT = "parent"

class PyObjectId(str):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v, handler=None):
        if isinstance(v, ObjectId):
            return str(v)
        if isinstance(v, str):
            return v
        return v

class UserBase(BaseModel):
    email: EmailStr
    name: str
    last_name: str
    user_type: str

class UserCreate(UserBase):
    password: str
    child_email: Optional[EmailStr] = None

    @validator('user_type')
    def validate_user_type(cls, v):
        if v.lower() not in ['parent', 'student']:
            raise ValueError('User type must be either "parent" or "student"')
        return v.lower()

    @validator('child_email')
    def validate_child_email(cls, v, values):
        if values.get('user_type') == 'parent' and not v:
            raise ValueError('Child email is required for parent signup')
        if values.get('user_type') == 'student' and v:
            raise ValueError('Child email should not be provided for student signup')
        if v and v == values.get('email'):
            raise ValueError('Child email cannot be the same as parent email')
        return v

    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        return v

    @validator('name', 'last_name')
    def validate_names(cls, v):
        if len(v.strip()) < 2:
            raise ValueError('Name must be at least 2 characters long')
        return v.strip()

class User(UserBase):
    id: Optional[PyObjectId] = Field(alias="_id")
    hashed_password: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    linked_children: List[PyObjectId] = []
    linked_parent: Optional[PyObjectId] = None

    class Config:
        json_encoders = {
            ObjectId: str
        }
        populate_by_name = True
        arbitrary_types_allowed = True

class MoodEntry(BaseModel):
    mood: str
    note: Optional[str] = None
    timestamp: Optional[datetime] = None

    class Config:
        json_schema_extra = {
            "example": {
                "mood": "happy",
                "note": "Feeling good today",
                "timestamp": "2024-03-04T18:14:49.187Z"
            }
        }

class UserLogin(BaseModel):
    email: EmailStr
    password: str
    user_type: str

class ChatRequest(BaseModel):
    text: str

class ChatMessage(BaseModel):
    message: str
    response: str
    timestamp: datetime = datetime.utcnow() 