import uvicorn
from main import app
from dotenv import load_dotenv

load_dotenv()

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=80)
