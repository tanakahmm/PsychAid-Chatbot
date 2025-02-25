from dotenv import load_dotenv
import os

def verify_api():
    # Force reload environment variables
    load_dotenv(override=True)
    api_key = os.getenv("GROQ_API_KEY")
    
    # Print full key for debugging (be careful with this in production)
    print(f"Full API Key: {api_key}")
    
    if not api_key or api_key.startswith("your_"):
        print("Error: Invalid API key format detected")
        return False
        
    try:
        from langchain_groq import ChatGroq
        from langchain.schema import HumanMessage
        
        client = ChatGroq(
            groq_api_key=api_key,
            model_name="llama-3.3-70b-versatile"
        )
        
        response = client.invoke([HumanMessage(content="Say hello!")])
        print("Test successful! Response:", response.content)
        return True
    except Exception as e:
        print("Test failed:", str(e))
        return False

if __name__ == "__main__":
    verify_api() 