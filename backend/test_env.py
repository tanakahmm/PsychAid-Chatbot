from dotenv import load_dotenv
import os

def verify_env():
    # Clear any existing env vars
    if "GROQ_API_KEY" in os.environ:
        del os.environ["GROQ_API_KEY"]
    
    # Load fresh
    load_dotenv(override=True)
    api_key = os.getenv("GROQ_API_KEY")
    
    print("\nEnvironment Check:")
    print("-----------------")
    print(f"API Key exists: {bool(api_key)}")
    print(f"API Key starts with: {api_key[:10] if api_key else 'None'}")
    print(f"API Key length: {len(api_key) if api_key else 0}")
    print(f"Full API Key: {api_key}")
    print("-----------------\n")
    
    return bool(api_key and api_key.startswith("gsk_"))

if __name__ == "__main__":
    is_valid = verify_env()
    print(f"Environment is {'valid' if is_valid else 'invalid'}") 