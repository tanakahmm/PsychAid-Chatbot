from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Float, Enum
from sqlalchemy.orm import relationship
import enum
from app.database import Base  # Updated import

class UserType(enum.Enum):
    STUDENT = "student"
    PARENT = "parent"

class User(Base):
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    user_type = Column(Enum(UserType), nullable=False)
    
    # Relationships
    mood_entries = relationship("MoodEntry", back_populates="user")
    children = relationship("ParentChildRelation", back_populates="parent", foreign_keys="ParentChildRelation.parent_id")
    parents = relationship("ParentChildRelation", back_populates="child", foreign_keys="ParentChildRelation.child_id")

class ParentChildRelation(Base):
    __tablename__ = 'parent_child_relations'
    
    id = Column(Integer, primary_key=True)
    parent_id = Column(Integer, ForeignKey('users.id'))
    child_id = Column(Integer, ForeignKey('users.id'))
    
    parent = relationship("User", back_populates="children", foreign_keys=[parent_id])
    child = relationship("User", back_populates="parents", foreign_keys=[child_id])

class MoodEntry(Base):
    __tablename__ = 'mood_entries'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    timestamp = Column(DateTime, nullable=False)
    score = Column(Float, nullable=False)
    message = Column(String)
    
    user = relationship("User", back_populates="mood_entries") 