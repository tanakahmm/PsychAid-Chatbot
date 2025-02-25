from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.document_loaders import PyPDFLoader, DirectoryLoader
from langchain_chroma import Chroma
from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_groq import ChatGroq
import os
from dotenv import load_dotenv
import logging

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv(override=True)
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

if not GROQ_API_KEY:
    raise ValueError("GROQ_API_KEY not found in environment variables")

def initialize_llm():
    try:
        llm = ChatGroq(
            temperature=0,
            groq_api_key=GROQ_API_KEY,
            model_name="llama-3.3-70b-versatile"
        )
        logger.info(f"LLM initialized with API key: {GROQ_API_KEY[:10]}...")
        return llm
    except Exception as e:
        logger.error(f"Error initializing LLM: {str(e)}")
        raise

def create_vector_db():
    # Make sure the data directory exists
    if not os.path.exists("data"):
        os.makedirs("data")
        print("Please add your PDF files to the 'data' directory")
        return None

    loader = DirectoryLoader("data/", glob="*.pdf", loader_cls=PyPDFLoader)
    documents = loader.load()
    
    if not documents:
        print("No PDF files found in data directory")
        return None

    text_splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
    texts = text_splitter.split_documents(documents)
    
    embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
    
    vector_db = Chroma.from_documents(
        documents=texts,
        embedding=embeddings,
        persist_directory="./chroma_db"
    )
    return vector_db

def setup_qa_chain(vector_db, llm):
    if not vector_db:
        return None
        
    retriever = vector_db.as_retriever()
    prompt_templates = """You are a compassionate mental health chatbot. Respond thoughtfully to the following question:
    {context}
    User: {question}
    Chatbot: """
    
    PROMPT = PromptTemplate(template=prompt_templates, input_variables=["context", "question"])

    qa_chain = RetrievalQA.from_chain_type(
        llm=llm,
        chain_type="stuff",
        retriever=retriever,
        chain_type_kwargs={"prompt": PROMPT},
        return_source_documents=False
    )
    return qa_chain

def main():
    print("Initializing Chatbot.........")
    llm = initialize_llm()

    db_path = "chroma_db/"
    
    if not os.path.exists(db_path):
        vector_db = create_vector_db()
    else:
        try:
            embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
            vector_db = Chroma(persist_directory=db_path, embedding_function=embeddings)
        except Exception as e:
            print(f"Error loading existing database: {e}")
            return

    qa_chain = setup_qa_chain(vector_db, llm)
    if not qa_chain:
        print("Failed to initialize QA chain")
        return

    print("Chatbot is ready! Type 'exit' to end the conversation.")
    
    while True:
        query = input("\nHuman: ")
        if query.lower() == "exit":
            print("Chatbot: Take Care of yourself, Goodbye!")
            break
        try:
            response = qa_chain.run(query)
            print(f"Chatbot: {response}")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    main()