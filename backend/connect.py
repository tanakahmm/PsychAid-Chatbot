from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from langchain_groq import ChatGroq
import os
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

if not GROQ_API_KEY:
    raise ValueError("GROQ_API_KEY not found in environment")

# Initialize the LLM
llm = ChatGroq(
    temperature=0,
    groq_api_key=GROQ_API_KEY,
    model_name="llama-3.3-70b-versatile"
)

class Query(BaseModel):
    text: str

async def chat(query: Query):
    try:
        response = llm.invoke(query.text)
        return {"response": response.content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))