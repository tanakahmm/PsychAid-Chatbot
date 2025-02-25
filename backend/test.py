import os
from dotenv import load_dotenv

# Clear any existing env vars
if "GROQ_API_KEY" in os.environ:
    del os.environ["GROQ_API_KEY"]

# Load fresh
load_dotenv(override=True)
api_key = os.getenv("GROQ_API_KEY")
print(f"API Key loaded: {api_key}") 