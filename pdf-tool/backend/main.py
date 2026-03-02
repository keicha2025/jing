from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import os
import uuid
import subprocess
import shutil
import fitz  # PyMuPDF

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
async def flatten_ghostscript(
    file: UploadFile = File(...),
    quality: str = Query("medium"),
    dpi: int = Query(300),
):
    """
    True rasterization flatten using PyMuPDF:
    1. Render each page to a high-DPI image (rasterizes ALL text/fonts/vectors)
    2. Re-assemble the images into a new clean PDF

    This guarantees font styles are preserved as pixels, not glyph references.
    """
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    temp_input = os.path.join(UPLOAD_DIR, f"temp_gs_in_{uuid.uuid4()}.pdf")
    temp_output = os.path.join(UPLOAD_DIR, f"temp_gs_out_{uuid.uuid4()}.pdf")

    try:
        with open(temp_input, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Quality presets — map to DPI for rasterization
        quality_dpi = {
            "low": 72,
            "medium": 150,
            "high": 300,
        }
        # Use the DPI from the query param, but also respect quality preset
        render_dpi = dpi if dpi > 0 else quality_dpi.get(quality, 300)

        # Open source PDF
        src_doc = fitz.open(temp_input)
        out_doc = fitz.open()  # new empty PDF

        for page in src_doc:
            # Render page to pixmap (rasterize everything: text, vectors, images)
            mat = fitz.Matrix(render_dpi / 72, render_dpi / 72)
            pix = page.get_pixmap(matrix=mat, alpha=False)

            # Create a new page with the same dimensions as the original
            rect = page.rect
            new_page = out_doc.new_page(width=rect.width, height=rect.height)

            # Convert pixmap to PNG bytes and insert as full-page image
            img_bytes = pix.tobytes("png")
            new_page.insert_image(rect, stream=img_bytes)

        out_doc.save(temp_output, garbage=4, deflate=True, deflate_images=True)
        out_doc.close()
        src_doc.close()

        return FileResponse(
            temp_output,
            filename=f"flattened_{file.filename}",
            media_type="application/pdf",
        )
    except Exception as e:
        print(f"Error during rasterization flatten: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Cleanup input file (output will be cleaned after response)
        if os.path.exists(temp_input):
            try:
                os.remove(temp_input)
            except:
                pass


@app.post("/compress/ghostscript")
async def compress_ghostscript(
    file: UploadFile = File(...), quality: str = "medium"
):
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
            "high": "/prepress",
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

        return FileResponse(
            temp_output,
            filename=f"compressed_{file.filename}",
            media_type="application/pdf",
        )
    except Exception as e:
        print(f"Error during GS compression: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
