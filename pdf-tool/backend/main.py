from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import os
import uuid
import subprocess
import shutil

app = FastAPI()

# Enable CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "temp_files"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.post("/flatten/ghostscript")
async def flatten_ghostscript(file: UploadFile = File(...), quality: str = "medium", dpi: int = 300):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    
    temp_input = os.path.join(UPLOAD_DIR, f"temp_gs_in_{uuid.uuid4()}.pdf")
    temp_output = os.path.join(UPLOAD_DIR, f"temp_gs_out_{uuid.uuid4()}.pdf")
    
    try:
        with open(temp_input, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        quality_presets = {
            "low": "/screen",
            "medium": "/ebook",
            "high": "/prepress"
        }
        preset = quality_presets.get(quality, "/prepress")

        # Command for Ghostscript flattening
        # Using higher resolution settings for images to ensure "Ultra" is meaningful
        gs_cmd = [
            "gs",
            "-dSAFER",
            "-dBATCH",
            "-dNOPAUSE",
            "-dNOPROMPT",
            "-sDEVICE=pdfwrite",
            f"-dPDFSETTINGS={preset}",
            f"-r{dpi}",
            "-dColorImageResolution=600",
            "-dGrayImageResolution=600",
            "-dMonoImageResolution=1200",
            f"-sOutputFile={temp_output}",
            temp_input,
        ]
        
        result = subprocess.run(gs_cmd, capture_output=True, text=True)
        if result.returncode != 0:
            raise Exception(f"Ghostscript error: {result.stderr}")
        
        return FileResponse(temp_output, filename=f"flattened_{file.filename}")
    except FileNotFoundError:
        raise HTTPException(status_code=501, detail="Ghostscript is not installed on the server.")
    except Exception as e:
        print(f"Error during GS flattening: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/compress/ghostscript")
async def compress_ghostscript(file: UploadFile = File(...), quality: str = "medium"):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    
    temp_input = os.path.join(UPLOAD_DIR, f"temp_comp_in_{uuid.uuid4()}.pdf")
    temp_output = os.path.join(UPLOAD_DIR, f"temp_comp_out_{uuid.uuid4()}.pdf")
    
    try:
        with open(temp_input, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        quality_presets = {
            "extreme": "/screen",
            "recommended": "/ebook",
            "high": "/prepress"
        }
        preset = quality_presets.get(quality, "/ebook")

        gs_cmd = [
            "gs",
            "-dSAFER",
            "-dBATCH",
            "-dNOPAUSE",
            "-dNOPROMPT",
            "-sDEVICE=pdfwrite",
            f"-dPDFSETTINGS={preset}",
            f"-sOutputFile={temp_output}",
            temp_input,
        ]
        
        result = subprocess.run(gs_cmd, capture_output=True, text=True)
        if result.returncode != 0:
            raise Exception(f"Ghostscript error: {result.stderr}")
        
        return FileResponse(temp_output, filename=f"compressed_{file.filename}")
    except Exception as e:
        print(f"Error during GS compression: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
