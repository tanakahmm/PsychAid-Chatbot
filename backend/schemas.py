from pydantic import BaseModel
from typing import Optional
from enum import Enum

class UserType(str, Enum):
    STUDENT = "student"
    PARENT = "parent"

class UserBase(BaseModel):
    email: str
    first_name: str
    last_name: str
    user_type: UserType

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: str
    password: str
    user_type: UserType

class User(UserBase):
    id: int

    class Config:
        orm_mode = True 