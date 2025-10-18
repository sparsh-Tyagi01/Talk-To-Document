from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
import os
from dotenv import load_dotenv
import shutil
from pypdf import PdfReader
import docx
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import HuggingFaceBgeEmbeddings
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.prompts import ChatPromptTemplate

load_dotenv()

os.environ["GOOGLE_API_KEY"] = os.getenv("GOOGLE_API_KEY")

app = FastAPI(title="Talk To Document backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_methods=['*'],
    allow_headers=['*']
)

class Question(BaseModel):
    user_input : str

upload_dir = "./uploads"
os.makedirs(upload_dir, exist_ok=True)

def pdf_read(path:str) -> str:
    reader = PdfReader(path)
    texts = []
    for pages in reader.pages:
        texts.append(pages.extract_text() or "")
    
    return "\n".join(texts)

def doc_read(path:str) -> str:
    doc = docx.Document(path)
    return "\n".join([p.text for p in doc.paragraphs])

def create_chunks(text:str):
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size = 500,
        chunk_overlap = 200,
        separators = ["/n/n", "/n", " ", ""]
    )

    docs = text_splitter.create_documents([text])
    return docs

def store_in_chroma(chunks):
    persist_directory = './chroma_db'
    embedding_model = HuggingFaceBgeEmbeddings(model_name="BAAI/bge-small-en")
    vectorstore = Chroma.from_documents(documents=chunks, embedding=embedding_model, persist_directory=persist_directory)
    vectorstore.persist()   

def generate_chunks(user_input):
    persist_directory = './chroma_db'
    embedding_model = HuggingFaceBgeEmbeddings(model_name="BAAI/bge-small-en")
    vectorstore = Chroma(
        persist_directory=persist_directory,
        embedding_function=embedding_model
    )

    retriever = vectorstore.as_retriever(search_kwars={"k":3})

    relevent_docs = retriever.invoke(user_input)

    content = "/n---/n".join([doc.page_content for doc in relevent_docs])
    return content

@app.post('/api/uploads')
def upload_file(file: UploadFile = File(...)):
    allowed = (".pdf", ".docx", ".txt")
    if not any(file.filename.endswith(ext) for ext in allowed):
        raise HTTPException(status_code=400, detail="Only .pdf, .docx, .txt are allowed")

    file_path = os.path.join(upload_dir, file.filename.lower())

    with open(file_path, 'wb') as buffer:
        shutil.copyfileobj(file.file,buffer)

    try:
        if(file.filename.endswith(".pdf")):
            text = pdf_read(file_path)
        elif(file.filename.endswith(".docx")):
            text  = doc_read(file_path)
        else:
            raise HTTPException(status_code=400, detail="Incorrect file format")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Text extraction failed {str(e)}")
    
    if not text.strip():
        raise HTTPException(status_code=400, detail="No extrable text found.")

    chunks = create_chunks(text)
    store_in_chroma(chunks)

    return {"status": "success", "title": file.filename, "num_chunks": len(chunks)}

@app.post('/api/chat')
def ask_query(req:Question):
    user_input = req.user_input
    context = generate_chunks(user_input)

    llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0.0)

    template =f"""
    You are a helpful assistant. Answer the user's question ONLY based on the context provided below.
    If the answer is not found in the context, clearly state that the information is not available in the document.

    CONTEXT:
    {context}

    QUESTION: {user_input}
    """

    prompt = ChatPromptTemplate.from_template(template)

    chain = prompt | llm

    response = chain.invoke({"context": context, "question": user_input})

    final_answer = response.content
    return {final_answer}

@app.delete("/api/delete/{filename}")
def delete_file(filename:str):
    file_path = os.path.join(upload_dir, filename)

    if os.path.exists(file_path):
        os.remove(file_path)
    else:
        raise HTTPException(status_code=404, detail="File not found")
    
    persist_directory = "./chroma_db"
    if os.path.exists(persist_directory):
        shutil.rmtree(persist_directory)
    
    return {"message": "Deleted successfully"}

@app.get("/api/files")
def getFiles():
    files = os.listdir(upload_dir)
    return {"files":files}

@app.get("/api/files/{filename}")
def openFile(filename:str):
    file_path = os.path.join(upload_dir, filename)
    if not os.path.exists(file_path):
        return {"error": "file not found"}
    return FileResponse(file_path)