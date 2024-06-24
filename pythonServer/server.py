from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import shutil
import zipfile
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"Hello": "World"}


def hex_dump(data):
    return ' '.join(f'{byte:02x}' for byte in data)


BASE_UPLOAD_DIRECTORY = "uploaded_files"

# Ensure the base upload directory exists
if not os.path.exists(BASE_UPLOAD_DIRECTORY):
    os.makedirs(BASE_UPLOAD_DIRECTORY)

@app.post("/upload")
async def upload_file(
    file: UploadFile = File(...), 
    unique_id: str = Form(...), 
    node_id: str = Form(...)
):
    try:
        # Create the nested directory structure
        upload_path = os.path.join(BASE_UPLOAD_DIRECTORY, unique_id, node_id)
        os.makedirs(upload_path, exist_ok=True)
        
        file_location = os.path.join(upload_path, file.filename)
        with open(file_location, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        return {"message": f"File '{file.filename}' uploaded successfully to '{upload_path}'"}
    except Exception as e:
        return {"message": str(e)}



if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)