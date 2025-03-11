from main import app

# Remove the uvicorn run part as Vercel will handle that
from dotenv import load_dotenv
load_dotenv()