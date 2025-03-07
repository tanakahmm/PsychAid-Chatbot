import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from bson import ObjectId
import os
from models import UserCreate, User
from database import get_database

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Constants
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

class AuthService:
    def __init__(self):
        self.pwd_context = pwd_context
        self.secret_key = os.getenv("SECRET_KEY")
        if not self.secret_key:
            raise ValueError("SECRET_KEY not found in environment variables")
        
        # Get database instance
        self.db = get_database()
        if self.db is None:
            raise ValueError("Database not initialized")
            
        logger.info("AuthService initialized")

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash."""
        return self.pwd_context.verify(plain_password, hashed_password)

    def get_password_hash(self, password: str) -> str:
        """Generate password hash."""
        return self.pwd_context.hash(password)

    async def create_user(self, user_data: UserCreate) -> dict:
        """Create a new user."""
        try:
            # Check if user already exists
            existing_user = await self.db.users.find_one({"email": user_data.email})
            if existing_user:
                raise ValueError("Email already registered")

            # Hash password
            hashed_password = self.get_password_hash(user_data.password)
            
            # Create user document
            user_doc = {
                "email": user_data.email,
                "hashed_password": hashed_password,
                "name": user_data.name,
                "last_name": user_data.last_name,
                "user_type": user_data.user_type,
                "created_at": datetime.utcnow(),
                "linked_children": []
            }

            # Insert user
            result = await self.db.users.insert_one(user_doc)
            user_doc["_id"] = result.inserted_id

            # If parent, link to child
            if user_data.user_type == "parent" and user_data.child_email:
                child = await self.db.users.find_one({"email": user_data.child_email})
                if child and child["user_type"] == "student":
                    await self.db.users.update_one(
                        {"_id": result.inserted_id},
                        {"$push": {"linked_children": child["_id"]}}
                    )
                    await self.db.users.update_one(
                        {"_id": child["_id"]},
                        {"$set": {"linked_parent": result.inserted_id}}
                    )
            
            return user_doc

        except Exception as e:
            logger.error(f"Error creating user: {str(e)}")
            raise

    async def authenticate_user(self, email: str, password: str, user_type: str) -> Optional[User]:
        """Authenticate a user."""
        try:
            # Find user by email and user type
            user = await self.db.users.find_one({
                "email": email,
                "user_type": user_type
            })
            
            if not user:
                logger.warning(f"User not found: {email} ({user_type})")
                return None

            # Verify password
            if not self.verify_password(password, user["hashed_password"]):
                logger.warning(f"Invalid password for user: {email}")
                return None

            # Convert MongoDB document to User model
            user["id"] = str(user["_id"])
            if "linked_children" in user:
                user["linked_children"] = [str(child_id) for child_id in user["linked_children"]]
            if "linked_parent" in user and user["linked_parent"]:
                user["linked_parent"] = str(user["linked_parent"])

            return User(**user)

        except Exception as e:
            logger.error(f"Authentication error: {str(e)}")
            return None

    def create_access_token(self, data: dict) -> str:
        """Create JWT access token."""
        try:
            to_encode = data.copy()
            expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
            to_encode.update({"exp": expire})
            encoded_jwt = jwt.encode(to_encode, self.secret_key, algorithm=ALGORITHM)
            return encoded_jwt
        except Exception as e:
            logger.error(f"Error creating access token: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Could not create access token"
            )

    def create_refresh_token(self, data: dict) -> str:
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, self.secret_key, algorithm=ALGORITHM)
        return encoded_jwt

    async def verify_refresh_token(self, refresh_token: str) -> Optional[Dict[str, Any]]:
        try:
            payload = jwt.decode(refresh_token, self.secret_key, algorithms=[ALGORITHM])
            user_id = payload.get("user_id")
            if user_id is None:
                return None

            user = await self.get_user_by_id(user_id)
            if user is None:
                return None

            return user
        except JWTError:
            return None

    async def get_current_user(self, token: str) -> Optional[User]:
        """Get current user from token."""
        try:
            if not token:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="No authentication token provided",
                    headers={"WWW-Authenticate": "Bearer"},
                )

            payload = jwt.decode(token, self.secret_key, algorithms=[ALGORITHM])
            user_id = payload.get("user_id")
            if user_id is None:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            
            user = await self.get_user_by_id(user_id)
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="User not found",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            
            return user
                
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired",
                headers={"WWW-Authenticate": "Bearer"},
            )
        except jwt.JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )

    async def get_user_by_id(self, user_id: str) -> Optional[User]:
        """Get user by ID."""
        try:
            # Convert string ID to ObjectId
            if isinstance(user_id, str):
                user_id = ObjectId(user_id)
            elif isinstance(user_id, User):
                user_id = ObjectId(user_id.id)
            
            user = await self.db.users.find_one({"_id": user_id})
            if user:
                # Convert MongoDB document to User model
                user["id"] = str(user["_id"])
                if "linked_children" in user:
                    user["linked_children"] = [str(child_id) for child_id in user["linked_children"]]
                if "linked_parent" in user and user["linked_parent"]:
                    user["linked_parent"] = str(user["linked_parent"])
                return User(**user)
            return None
        except Exception as e:
            logger.error(f"Error fetching user by ID: {str(e)}")
            return None

    async def get_user_by_email(self, email: str) -> Optional[dict]:
        return await self.db.users.find_one({"email": email})

    async def update_user(self, user_id: str, update_data: dict) -> Optional[dict]:
        try:
            result = await self.db.users.update_one(
                {"_id": ObjectId(user_id)},
                {"$set": update_data}
            )
            if result.modified_count == 0:
                return None
            return await self.db.users.find_one({"_id": ObjectId(user_id)})
        except Exception as e:
            logger.error(f"Error updating user: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update user"
            )

    async def delete_user(self, user_id: str) -> bool:
        try:
            result = await self.db.users.delete_one({"_id": ObjectId(user_id)})
            return result.deleted_count > 0
        except Exception as e:
            logger.error(f"Error deleting user: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete user"
            )

    async def change_password(self, user_id: str, old_password: str, new_password: str) -> bool:
        user = await self.db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        if not self.verify_password(old_password, user["hashed_password"]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Incorrect password"
            )

        hashed_password = self.get_password_hash(new_password)
        result = await self.db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"hashed_password": hashed_password}}
        )
        return result.modified_count > 0

    async def get_linked_children(self, parent_id: str) -> list:
        try:
            parent = await self.db.users.find_one({"_id": ObjectId(parent_id)})
            if not parent or parent.get("user_type") != "parent":
                return []

            children = []
            for child_id in parent.get("linked_children", []):
                child = await self.db.users.find_one({"_id": ObjectId(child_id)})
                if child:
                    children.append({
                        "id": str(child["_id"]),
                        "name": f"{child['name']} {child['last_name']}",
                        "email": child["email"]
                    })
            return children

        except Exception as e:
            logger.error(f"Error fetching linked children: {str(e)}")
            return [] 