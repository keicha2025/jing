from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import fitz  # PyMuPDF
import os
import uuid
import subprocess

app = FastAPI()

# Enable CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "temp_files"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.post("/flatten/python")
async def flatten_python(file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    
    task_id = str(uuid.uuid4())
    input_path = os.path.join(UPLOAD_DIR, f"{task_id}_input.pdf")
    output_path = os.path.join(UPLOAD_DIR, f"{task_id}_output.pdf")
    
    try:
        with open(input_path, "wb") as f:
            f.write(await file.read())
        
        # PyMuPDF Flattening
        doc = fitz.open(input_path)
        for page in doc:
            # Applying redactions is one way to flatten "annotations"
            # For general flattening, we can also use page.get_displaylist().get_pixmap() 
            # but that turns it into a full raster image, which might reduce quality.
            # Here we follow the user's suggestion for apply_redactions or static fields.
            for annot in page.annots():
                annot.set_flags(fitz.ANNOT_FLAG_PRINT)
        
        # Save with flattening
        doc.save(output_path, flatten=True)
        doc.close()
        
        return FileResponse(output_path, filename=f"flattened_{file.filename}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/flatten/ghostscript")
async def flatten_ghostscript(file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    
    task_id = str(uuid.uuid4())
    input_path = os.path.join(UPLOAD_DIR, f"{task_id}_input.pdf")
    output_path = os.path.join(UPLOAD_DIR, f"{task_id}_output.pdf")
    
    try:
        with open(input_path, "wb") as f:
            f.write(await file.read())
        
        # Ghostscript Command
        gs_cmd = [
            "gs",
            "-dNoOutputPause",
            "-dBATCH",
            "-dNOPAUSE",
            "-sDEVICE=pdfwrite",
            "-dShowAnnots=false",
            f"-sOutputFile={output_path}",
            input_path
        ]
        
        result = subprocess.run(gs_cmd, capture_output=True, text=True)
        if result.returncode != 0:
            raise Exception(f"Ghostscript error: {result.stderr}")
        
        return FileResponse(output_path, filename=f"flattened_{file.filename}")
    except FileNotFoundError:
        raise HTTPException(status_code=501, detail="Ghostscript is not installed on the server.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
