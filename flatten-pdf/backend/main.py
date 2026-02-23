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
async def flatten_python(file: UploadFile = File(...), dpi: int = 150):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    
    task_id = str(uuid.uuid4())
    input_path = os.path.join(UPLOAD_DIR, f"{task_id}_input.pdf")
    output_path = os.path.join(UPLOAD_DIR, f"{task_id}_output.pdf")
    
    try:
        with open(input_path, "wb") as f:
            f.write(await file.read())
        
        # Open source
        src = fitz.open(input_path)
        # Create output
        doc = fitz.open()
        
        # Rasterize each page for perfect flattening
        # zoom factor: 1.0 is 72 dpi
        zoom = dpi / 72
        mat = fitz.Matrix(zoom, zoom)
        
        for page in src:
            pix = page.get_pixmap(matrix=mat)
            new_page = doc.new_page(width=page.rect.width, height=page.rect.height)
            new_page.insert_image(new_page.rect, pixmap=pix)
        
        doc.save(output_path)
        doc.close()
        src.close()
        
        return FileResponse(output_path, filename=f"flattened_{file.filename}")
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/flatten/ghostscript")
async def flatten_ghostscript(file: UploadFile = File(...), quality: str = "prepress"):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    
    task_id = str(uuid.uuid4())
    input_path = os.path.join(UPLOAD_DIR, f"{task_id}_input.pdf")
    output_path = os.path.join(UPLOAD_DIR, f"{task_id}_output.pdf")
    
    # quality map for GS
    # /screen (72dpi), /ebook (150dpi), /printer (300dpi), /prepress (300dpi high color)
    gs_quality = f"/default"
    if quality == "low": gs_quality = "/screen"
    elif quality == "medium": gs_quality = "/ebook"
    elif quality == "high": gs_quality = "/prepress"

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
            f"-dPDFSETTINGS={gs_quality}",
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
