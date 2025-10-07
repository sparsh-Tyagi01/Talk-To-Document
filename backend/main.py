# import os
# import uuid
# from typing import List, Optional
# from fastapi import FastAPI, UploadFile, File, HTTPException
# from pydantic import BaseModel
# from fastapi.responses import JSONResponse
# from fastapi.middleware.cors import CORSMiddleware
# from pypdf import PdfReader
# import docx
# import aiofiles
# import torch
# from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
# from datetime import datetime
# from dotenv import load_dotenv

# # Load .env if exists
# load_dotenv()

# UPLOAD_DIR = "./uploads"
# os.makedirs(UPLOAD_DIR, exist_ok=True)

# app = FastAPI(title="Talk-to-Document Backend")

# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# # ---------------- Text Utilities ----------------

# def read_pdf_text(path: str) -> str:
#     reader = PdfReader(path)
#     texts = []
#     for page in reader.pages:
#         texts.append(page.extract_text() or "")
#     return "\n".join(texts)

# def read_docx_text(path: str) -> str:
#     doc = docx.Document(path)
#     return "\n".join([p.text for p in doc.paragraphs])

# async def save_upload_file(upload_file: UploadFile, dest_path: str):
#     async with aiofiles.open(dest_path, "wb") as out_file:
#         while True:
#             chunk = await upload_file.read(1024*1024)
#             if not chunk:
#                 break
#             await out_file.write(chunk)
#     await upload_file.close()

# def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200) -> List[str]:
#     if not text:
#         return []
#     text = text.replace("\r\n", "\n")
#     chunks = []
#     start = 0
#     while start < len(text):
#         end = start + chunk_size
#         chunks.append(text[start:end].strip())
#         if end >= len(text):
#             break
#         start = end - overlap
#     return chunks

# def make_doc_id() -> str:
#     return str(uuid.uuid4())

# # ---------------- Model ----------------

# MODEL_NAME = "google/flan-t5-small"
# tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
# model = AutoModelForSeq2SeqLM.from_pretrained(MODEL_NAME)
# device = torch.device("cpu")
# model.to(device)

# def chat_with_context(question: str, context_chunks: List[str]) -> str:
#     """
#     Concatenate context chunks and send them as input to flan-t5-small
#     """
#     context_text = "\n\n".join(context_chunks)
#     input_text = f"Answer the question based on the context below:\nContext:\n{context_text}\nQuestion: {question}"

#     inputs = tokenizer(input_text, return_tensors="pt", truncation=True, max_length=1024)
#     inputs = {k: v.to(device) for k, v in inputs.items()}

#     outputs = model.generate(**inputs, max_length=200)
#     answer = tokenizer.decode(outputs[0], skip_special_tokens=True)
#     return answer

# # ---------------- In-memory storage ----------------
# # For simplicity, storing chunks in memory (can later switch to Chroma DB)
# DOCUMENTS = {}  # doc_id -> {"title": str, "chunks": List[str]}

# # ---------------- API Routes ----------------

# @app.post("/upload")
# async def upload_document(file: UploadFile = File(...), title: Optional[str] = None):
#     filename = file.filename.lower()
#     allowed = (".pdf", ".docx", ".txt")
#     if not any(filename.endswith(ext) for ext in allowed):
#         raise HTTPException(status_code=400, detail="Only PDF, DOCX, TXT allowed")

#     doc_id = make_doc_id()
#     saved_path = os.path.join(UPLOAD_DIR, f"{doc_id}_{file.filename}")
#     await save_upload_file(file, saved_path)

#     # Extract text
#     try:
#         if filename.endswith(".pdf"):
#             text = read_pdf_text(saved_path)
#         elif filename.endswith(".docx"):
#             text = read_docx_text(saved_path)
#         else:
#             async with aiofiles.open(saved_path, "r", encoding="utf-8", errors="ignore") as f:
#                 text = await f.read()
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Text extraction failed: {str(e)}")

#     if not text.strip():
#         raise HTTPException(status_code=400, detail="No extractable text found")

#     chunks = chunk_text(text)
#     DOCUMENTS[doc_id] = {"title": title or file.filename, "chunks": chunks}

#     return {"status": "success", "doc_id": doc_id, "title": title or file.filename, "num_chunks": len(chunks)}

# @app.get("/documents")
# def list_documents():
#     return {"documents": [{"doc_id": k, "title": v["title"]} for k, v in DOCUMENTS.items()]}

# class ChatRequest(BaseModel):
#     question: str
#     doc_id: Optional[str] = None
#     top_k: int = 4

# @app.post("/chat")
# def chat(req: ChatRequest):
#     question = req.question
#     doc_id = req.doc_id
#     top_k = req.top_k
#     if not question.strip():
#         raise HTTPException(status_code=400, detail="Question is required")
#     # Select chunks
#     if doc_id:
#         doc = DOCUMENTS.get(doc_id)
#         if not doc:
#             raise HTTPException(status_code=404, detail="Document not found")
#         chunks = doc["chunks"][:top_k]
#     else:
#         # use chunks from all docs
#         chunks = []
#         for d in DOCUMENTS.values():
#             chunks.extend(d["chunks"])
#         chunks = chunks[:top_k]
#     answer = chat_with_context(question, chunks)
#     return {"question": question, "answer": answer, "context_chunks": chunks}

# @app.get("/health")
# def health():
#     return {"status": "ok", "time": datetime.utcnow().isoformat()}


# if __name__ == "__main__":
#     import uvicorn
#     uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

